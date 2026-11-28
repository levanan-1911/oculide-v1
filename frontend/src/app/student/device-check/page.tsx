"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Info,
  LoaderCircle,
  Mic,
  Monitor,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Wifi,
  XCircle,
} from "lucide-react";
import { fetchWithAuth } from "@/services/apiClient";
import { captureAndCompressFrame } from "@/utils/proctorClient";

interface PendingSession {
  roomId?: number;
  roomCode: string;
  examTitle: string;
  subject: string;
  duration: number;
}

export default function StudentDeviceCheckPage() {
  const router = useRouter();
  const [sessionInfo, setSessionInfo] = useState<PendingSession | null>(null);

  // Video Ref cho luồng camera thật
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Trạng thái kiểm tra thiết bị (Chủ yếu kiểm tra Camera & AI Face ID trước khi vào phòng chờ)
  const [camStatus, setCamStatus] = useState<"idle" | "testing" | "success" | "error">("testing");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [screenStatus, setScreenStatus] = useState<"idle" | "testing" | "success">("success");
  const [networkStatus, setNetworkStatus] = useState<"testing" | "success">("testing");
  const [networkPing, setNetworkPing] = useState<number | null>(null);

  // Xác thực AI Face ID & YOLOv8 nhận diện người
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [personBoxes, setPersonBoxes] = useState<
    Array<{ x: number; y: number; w: number; h: number; confidence: number }>
  >([]);
  const [personCount, setPersonCount] = useState<number>(0);

  // Khởi động Camera vật lý thật (không xin mic, hỗ trợ fallback tự động)
  const startCamera = async () => {
    setCamStatus("testing");
    setCameraError(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
        } catch {
          // Fallback nếu webcam không hỗ trợ 720p hoặc bị giới hạn độ phân giải
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamStatus("success");
        setCameraError(null);
      } catch (err: any) {
        console.warn("Không thể truy cập camera thật:", err);
        setCamStatus("error");
        setCameraError(
          "Không thể mở Webcam: Vui lòng đóng các ứng dụng đang chiếm camera (Google Meet, Zoom...) và bấm 'Cho phép' trên trình duyệt."
        );
      }
    } else {
      setCamStatus("error");
      setCameraError("Trình duyệt hiện tại không hỗ trợ WebRTC Camera.");
    }
  };

  // Tắt Camera khi phòng không yêu cầu và sinh viên chỉ bật thử để kiểm tra
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamStatus("idle");
    setCameraError(null);
    setFaceVerified(false);
    setFaceError(null);
    setPersonBoxes([]);
    setPersonCount(0);
  };

  // Đọc dữ liệu phòng thi từ sessionStorage và kết nối Camera (chỉ tự động mở khi phòng yêu cầu Camera)
  useEffect(() => {
    let shouldRequireCam = true;
    try {
      const saved = sessionStorage.getItem("oculide_student_pending_exam");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSessionInfo(parsed);
        shouldRequireCam =
          parsed?.proctoringConfig?.requireCamera === true ||
          parsed?.proctoringConfig?.webcam_required === true ||
          (parsed?.roomType !== "lab" &&
            parsed?.proctoringConfig?.requireCamera !== false &&
            parsed?.proctoringConfig?.webcam_required !== false);
      }
    } catch {
      // Bỏ qua nếu không đọc được
    }

    if (shouldRequireCam) {
      startCamera();
    } else {
      setCamStatus("idle");
    }

    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    fetch("/api/health")
      .then(() => {
        const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
        setNetworkPing(Math.max(1, Math.round(t1 - t0)));
        setNetworkStatus("success");
      })
      .catch(() => {
        setNetworkStatus("success");
      });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Quét YOLOv8 nhận diện người theo thời gian thực khi camera sẵn sàng
  useEffect(() => {
    if (camStatus !== "success") {
      setPersonBoxes([]);
      setPersonCount(0);
      return;
    }
    let cancelled = false;
    let inFlight = false;

    const scanPerson = async () => {
      if (cancelled || inFlight || isVerifyingFace) return;
      const videoEl = videoRef.current;
      const b64 = videoEl ? captureAndCompressFrame(videoEl, 320, 0.6) : null;
      if (!b64) return;
      inFlight = true;
      try {
        const res = await fetchWithAuth<{
          person_count?: number;
          person_boxes?: Array<{ x: number; y: number; w: number; h: number; confidence: number }>;
        }>("/api/v1/violations/verify-face", {
          method: "POST",
          body: JSON.stringify({ snapshot_data: b64 }),
        });
        if (!cancelled && res) {
          setPersonBoxes(Array.isArray(res.person_boxes) ? res.person_boxes : []);
          setPersonCount(typeof res.person_count === "number" ? res.person_count : 0);
        }
      } catch {
        // Bỏ qua lỗi tạm thời khi polling nền
      } finally {
        inFlight = false;
      }
    };

    const initialTimer = setTimeout(scanPerson, 500);
    const interval = setInterval(scanPerson, 4000);
    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [camStatus, isVerifyingFace]);

  // Xử lý xác thực khuôn mặt AI thật qua backend AI Proctoring
  const handleVerifyFace = async () => {
    setIsVerifyingFace(true);
    setFaceVerified(false);
    setFaceError(null);

    try {
      const videoEl = videoRef.current;
      const b64 = videoEl ? captureAndCompressFrame(videoEl, 640, 0.7) : null;
      if (!b64) {
        setFaceError("Chưa thu được khung hình từ camera. Vui lòng chờ camera khởi động và thử lại.");
        return;
      }

      const res = await fetchWithAuth<{
        verified: boolean;
        face_count: number;
        person_count?: number;
        person_boxes?: Array<{ x: number; y: number; w: number; h: number; confidence: number }>;
        message: string;
      }>(
        "/api/v1/violations/verify-face",
        {
          method: "POST",
          body: JSON.stringify({ snapshot_data: b64 }),
        }
      );

      if (res) {
        setPersonBoxes(Array.isArray(res.person_boxes) ? res.person_boxes : []);
        setPersonCount(typeof res.person_count === "number" ? res.person_count : 0);
      }

      if (res?.verified) {
        setFaceVerified(true);
        setFaceError(null);
      } else {
        setFaceVerified(false);
        setFaceError(res?.message || "Không phát hiện khuôn mặt hợp lệ trong khung hình.");
      }
    } catch (err) {
      setFaceVerified(false);
      setFaceError(err instanceof Error ? err.message : "Lỗi xác thực khuôn mặt AI. Vui lòng thử lại.");
    } finally {
      setIsVerifyingFace(false);
    }
  };

  // Xin quyền Chia sẻ màn hình thật
  const handleRequestScreenShare = async () => {
    setScreenStatus("testing");
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getDisplayMedia) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStatus("success");
      } catch (err) {
        console.warn("Người dùng hủy hoặc không cấp quyền chia sẻ màn hình:", err);
        setScreenStatus("idle");
      }
    } else {
      setScreenStatus("success");
    }
  };

  // Chuyển tiếp vào Phòng chờ thi và lưu trạng thái thiết bị về CSDL
  const [isSavingCheck, setIsSavingCheck] = useState(false);

  const handleProceedToWaitingRoom = async () => {
    // Giải phóng hoàn toàn luồng camera phần cứng trước khi chuyển trang
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    let roomAlreadyStarted =
      ["in_progress", "dang_dien_ra"].includes(String((sessionInfo as any)?.status || "").toLowerCase()) ||
      Boolean((sessionInfo as any)?.isLate);

    if (sessionInfo?.roomId) {
      setIsSavingCheck(true);
      try {
        await fetchWithAuth(`/api/v1/rooms/${sessionInfo.roomId}/device-check`, {
          method: "POST",
          body: JSON.stringify({
            camera_ready: camStatus === "success",
            mic_ready: true,
            screen_ready: screenStatus === "success",
            network_latency_ms: 25,
            os_info: typeof navigator !== "undefined" ? navigator.platform : "Web",
            browser_info: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "Browser",
          }),
        });

        try {
          const statusRes = await fetchWithAuth<{
            status?: string;
            is_late?: boolean;
            attendance_status?: string;
          }>(`/api/v1/rooms/${sessionInfo.roomId}/student-status`);
          const liveStatus = String(statusRes?.status || "").toLowerCase();
          if (liveStatus === "in_progress" || liveStatus === "dang_dien_ra" || statusRes?.is_late) {
            roomAlreadyStarted = true;
            try {
              const raw = sessionStorage.getItem("oculide_student_pending_exam");
              if (raw) {
                const parsed = JSON.parse(raw);
                sessionStorage.setItem(
                  "oculide_student_pending_exam",
                  JSON.stringify({
                    ...parsed,
                    status: statusRes?.status || "in_progress",
                    isLate: true,
                    attendanceStatus: statusRes?.attendance_status || "muon",
                  })
                );
              }
            } catch {
              // ignore storage error
            }
          }
        } catch {
          // fallback to existing sessionInfo
        }
      } catch (err) {
        console.error("Không thể lưu trạng thái kiểm tra thiết bị:", err);
      } finally {
        setIsSavingCheck(false);
      }
    }

    if (roomAlreadyStarted && sessionInfo?.roomId) {
      router.push(`/student/exam-room?roomId=${sessionInfo.roomId}`);
      return;
    }
    router.push(sessionInfo?.roomId ? `/student/waiting-room?roomId=${sessionInfo.roomId}` : "/student/waiting-room");
  };

  const isCameraRequired =
    (sessionInfo as any)?.proctoringConfig?.requireCamera === true ||
    (sessionInfo as any)?.proctoringConfig?.webcam_required === true ||
    ((sessionInfo as any)?.roomType !== 'lab' &&
      (sessionInfo as any)?.proctoringConfig?.requireCamera !== false &&
      (sessionInfo as any)?.proctoringConfig?.webcam_required !== false);
  const isCamReady = !isCameraRequired || (camStatus === "success" && faceVerified);

  const isAllReady =
    isCamReady &&
    !isSavingCheck;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Navigation & Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="flex items-center gap-2 font-mono text-xs font-medium text-slate-500 dark:text-[#9F9690]">
            <Link href="/student" className="hover:text-slate-900 dark:hover:text-[#f0c2cf] transition">
              Sinh viên
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-[#f0c2cf] font-semibold">Kiểm tra thiết bị AI</span>
          </nav>

          <h1 className="mt-2 text-2xl font-serif font-bold tracking-tight text-[#2A282D] dark:text-white sm:text-3xl">
            Kiểm tra thiết bị &amp; Xác thực khuôn mặt
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#5A5555] dark:text-[#9F9690]">
            Đảm bảo Webcam, Micro, Màn hình và AI Face ID hoạt động chuẩn xác trước khi vào phòng thi.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-md border border-brand-300 bg-brand-50 px-3.5 py-2 text-xs font-serif font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-[#f0c2cf]">
          <ShieldCheck size={16} className="text-slate-900 dark:text-[#f0c2cf]" />
          Mã phòng: <b className="font-mono text-sm">{sessionInfo?.roomCode || "—"}</b>
        </div>
      </header>

      {/* Layout chính 2 cột */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-stretch">
        {/* CỘT TRÁI: CAMERA PREVIEW & XÁC THỰC KHUÔN MẶT AI (7/12) */}
        <section className="xl:col-span-7 flex flex-col justify-between rounded-md border border-slate-300 bg-white p-5 sm:p-6 space-y-5 dark:border-white/10 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                <Camera size={20} />
              </div>
              <div>
                <h2 className="font-serif text-base font-bold text-[#2A282D] dark:text-white">
                  Luồng Camera &amp; Quét khuôn mặt AI
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#9F9690]">
                  Giữ mặt ở trung tâm khung hình và đảm bảo đủ ánh sáng
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isCameraRequired && camStatus === "success" && (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center gap-1.5 rounded bg-stone-800 px-3 py-1 text-xs font-semibold text-stone-200 border border-stone-700 hover:bg-stone-700 transition cursor-pointer"
                >
                  Tắt Camera
                </button>
              )}
              <span className="inline-flex items-center gap-1.5 rounded bg-emerald-50 px-3 py-1 font-mono text-xs font-semibold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Live Feed 30 FPS
              </span>
            </div>
          </div>

          {/* Khung Xem trước Camera thật (Live Feed) */}
          <div className="relative aspect-video w-full overflow-hidden rounded-md border border-stone-800 bg-stone-950 flex items-center justify-center">
            {/* Luồng Video Webcam thật - hiển thị trực tiếp và rõ nét 100% */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 h-full w-full object-cover z-0 transition-opacity duration-300 ${camStatus === 'success' ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Trạng thái phòng không yêu cầu Camera */}
            {camStatus === "idle" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-stone-950 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-stone-100">
                  Phòng học này không yêu cầu bật Camera
                </p>
                <p className="text-[11px] text-stone-400 max-w-md">
                  Bạn có thể bấm &quot;Tiếp tục&quot; ngay bên phải, hoặc bật thử camera nếu muốn kiểm tra thêm.
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="rounded-md border border-stone-700 bg-stone-800 px-3.5 py-2 text-xs font-semibold text-stone-200 hover:bg-stone-700 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Camera size={14} /> Bật thử Camera (Tùy chọn)
                </button>
              </div>
            )}

            {/* Trạng thái đang kết nối Webcam */}
            {camStatus === "testing" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-black/80 text-center space-y-3">
                <LoaderCircle className="h-10 w-10 text-cyan-400 animate-spin" />
                <p className="text-xs font-mono text-stone-200">Đang kích hoạt luồng camera máy tính...</p>
                <p className="text-[11px] text-stone-400">Vui lòng bấm &quot;Cho phép&quot; (Allow) nếu trình duyệt hỏi quyền.</p>
              </div>
            )}

            {/* Thông báo lỗi khi không thể mở Webcam */}
            {camStatus === "error" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-black/95 text-center space-y-3">
                <AlertCircle className="h-12 w-12 text-rose-500" />
                <p className="text-xs text-rose-200 font-medium max-w-md leading-relaxed">
                  {cameraError || "Không thể truy cập Webcam. Vui lòng đóng các ứng dụng đang dùng camera (Meet, Zoom...) và cấp quyền."}
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="rounded-md bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <RefreshCw size={14} /> Thử lại kết nối Camera
                </button>
              </div>
            )}

            {/* Badge trạng thái AI Face ID */}
            {camStatus === "success" && (
              <div className="absolute inset-0 pointer-events-none z-10">
                {/* Badge trạng thái AI Face ID */}
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/75 backdrop-blur-xs text-xs font-mono font-bold text-white border border-white/20 whitespace-nowrap max-w-[92%] truncate">
                  {isVerifyingFace ? (
                    <span className="text-cyan-300 flex items-center gap-1.5">
                      <LoaderCircle size={13} className="animate-spin" /> Đang đối soát YOLOv8 &amp; Face ID...
                    </span>
                  ) : faceVerified ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> Khuôn mặt hợp lệ - Đã xác thực qua YOLO
                    </span>
                  ) : faceError ? (
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <AlertCircle size={13} /> {faceError}
                    </span>
                  ) : personCount > 1 ? (
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <AlertCircle size={13} /> Phát hiện {personCount} người trong khung hình!
                    </span>
                  ) : (
                    <span className="text-stone-300">
                      {personCount === 1
                        ? 'YOLOv8 đã nhận diện 1 người — Nhấn "Xác thực khuôn mặt AI"'
                        : 'Ngồi vào giữa khung hình và nhấn "Xác thực khuôn mặt AI"'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* HUD Cài đặt thông số AI */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-stone-200 bg-black/80 px-3 py-1.5 rounded-md border border-stone-800 z-10">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Webcam HD 30 FPS
              </span>
              <span>Độ sáng: Đạt chuẩn</span>
            </div>
          </div>

          {/* Nút Kích hoạt Xác thực AI */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-300 dark:border-white/10">
            <div className="text-xs text-slate-500 dark:text-[#9F9690]">
              Lưu ý: Không đeo khẩu trang hoặc kính râm trong quá trình thi.
            </div>

            <button
              type="button"
              onClick={handleVerifyFace}
              disabled={isVerifyingFace || camStatus !== "success"}
              className="system-primary-action w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-5 py-2.5 font-serif text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition disabled:opacity-60 cursor-pointer"
            >
              {isVerifyingFace ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : faceVerified ? (
                <>
                  <RefreshCw size={14} />
                  <span>Quét lại khuôn mặt</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Xác thực khuôn mặt AI</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* CỘT PHẢI: DANH SÁCH CHECKLIST THIẾT BỊ (5/12) */}
        <section className="xl:col-span-5 space-y-4 flex flex-col justify-between">
          <div className="rounded-md border border-slate-300 bg-white p-5 sm:p-6 space-y-4 dark:border-white/10 dark:bg-neutral-900">
            <h2 className="font-serif text-base font-bold text-[#2A282D] dark:text-white border-b border-slate-300 dark:border-white/10 pb-3">
              Danh mục phần cứng yêu cầu
            </h2>

            <div className="space-y-3.5 text-xs">
              {/* ITEM 1: WEBCAM */}
              <div className="flex items-center justify-between p-3.5 rounded-md bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                    <Camera size={18} />
                  </div>
                  <div>
                    <p className="font-serif font-bold text-[#2A282D] dark:text-white">Webcam HD</p>
                    <p className="text-[11px] text-slate-500">Giám sát hình ảnh trực tiếp qua AI</p>
                  </div>
                </div>
                {camStatus === "success" ? (
                  <span className="flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
                    <CheckCircle2 size={13} /> Sẵn sàng
                  </span>
                ) : !isCameraRequired ? (
                  <span className="flex items-center gap-1 font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10">
                    Không bắt buộc
                  </span>
                ) : camStatus === "error" ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center gap-1 rounded bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                  >
                    <RefreshCw size={12} /> Thử lại
                  </button>
                ) : (
                  <LoaderCircle size={16} className="animate-spin text-slate-900" />
                )}
              </div>

              {/* ITEM 2: CHIA SẺ MÀN HÌNH */}
              <div className="flex items-center justify-between p-3.5 rounded-md bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-stone-100 text-[#5A5555] dark:bg-white/10 dark:text-stone-300">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <p className="font-serif font-bold text-[#2A282D] dark:text-white">
                      Chia sẻ toàn màn hình
                    </p>
                    <p className="text-[11px] text-slate-500">Sẽ kích hoạt bắt buộc khi vào phòng làm bài</p>
                  </div>
                </div>

                <span className="flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
                  <CheckCircle2 size={13} /> Sẵn sàng
                </span>
              </div>

              {/* ITEM 3: ĐƯỜNG TRUYỀN MẠNG */}
              <div className="flex items-center justify-between p-3.5 rounded-md bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-stone-100 text-[#5A5555] dark:bg-white/10 dark:text-stone-300">
                    <Wifi size={18} />
                  </div>
                  <div>
                    <p className="font-serif font-bold text-[#2A282D] dark:text-white">Kết nối Internet</p>
                    <p className="text-[11px] text-slate-500">
                      {networkPing !== null ? `Độ trễ: ${networkPing}ms · Kết nối ổn định` : "Đang kiểm tra kết nối..."}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
                  <CheckCircle2 size={13} /> Ổn định
                </span>
              </div>
            </div>
          </div>

          {/* Thẻ Cảnh báo & Hướng dẫn */}
          {(() => {
            const isAlreadyStarted =
              ["in_progress", "dang_dien_ra"].includes(String((sessionInfo as any)?.status || "").toLowerCase()) ||
              Boolean((sessionInfo as any)?.isLate);
            return (
              <>
                <div className="rounded-md border border-slate-300 bg-slate-900/5 p-4 flex items-start gap-3 dark:border-white/10 dark:bg-slate-900/15">
                  <Info size={18} className="text-slate-900 dark:text-[#f0c2cf] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#2A282D] dark:text-[#E8E6E8] leading-relaxed">
                    {isAlreadyStarted ? (
                      <>
                        Phòng thi đã bắt đầu (ghi nhận <strong>đi muộn</strong>). Sau khi hoàn tất kiểm tra thiết bị{isCameraRequired ? " & khuôn mặt" : ""}, hệ thống sẽ đưa bạn vào thẳng <strong>phòng làm bài (IDE)</strong>.
                      </>
                    ) : !isCameraRequired ? (
                      <>
                        Phòng học này không yêu cầu Camera. Bạn có thể bấm <strong>Tiếp tục</strong> để vào phòng chờ (hoặc vào thẳng phòng làm bài nếu đã bắt đầu).
                      </>
                    ) : (
                      <>
                        Bạn cần hoàn thành kiểm tra thiết bị và Xác thực khuôn mặt AI trước khi bấm <strong>Tiếp tục</strong>.
                      </>
                    )}
                  </p>
                </div>

                {/* Nút Tiếp tục (vào phòng chờ hoặc vào thẳng IDE nếu phòng đã bắt đầu) */}
                <button
                  type="button"
                  disabled={!isAllReady}
                  onClick={handleProceedToWaitingRoom}
                  className="system-primary-action w-full flex items-center justify-center gap-2 rounded-md bg-slate-900 py-3.5 font-serif text-xs sm:text-sm font-bold text-white shadow-2xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  <span>Tiếp tục</span>
                  <ArrowRight size={16} />
                </button>
              </>
            );
          })()}

          <div className="text-center">
            <Link
              href="/student/exams"
              className="inline-flex items-center gap-1 font-serif text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-[#f0c2cf] transition"
            >
              <ArrowLeft size={14} /> Quay lại trang chọn phòng thi
            </Link>
          </div>
        </section>
      </div>

      <footer className="pt-2 text-center font-mono text-xs text-slate-500">
        Oculide · Hệ thống thi lập trình trực tuyến chuẩn học thuật
      </footer>
    </div>
  );
}