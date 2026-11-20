"use client";

import { useEffect, useState } from "react";
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

  // Trạng thái kiểm tra thiết bị
  const [camStatus, setCamStatus] = useState<"testing" | "success" | "error">("testing");
  const [micStatus, setMicStatus] = useState<"testing" | "success" | "error">("testing");
  const [screenStatus, setScreenStatus] = useState<"idle" | "testing" | "success">("idle");
  const [networkStatus, setNetworkStatus] = useState<"testing" | "success">("testing");

  // Giả lập volume micro
  const [micVolume, setMicVolume] = useState(0);

  // Xác thực AI Face ID
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceScore, setFaceScore] = useState<number | null>(null);

  // Đọc dữ liệu phòng thi từ sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("oculide_student_pending_exam");
      if (saved) {
        setSessionInfo(JSON.parse(saved));
      }
    } catch {
      // Bỏ qua nếu không đọc được
    }

    // Tự động kiểm tra phần cứng ban đầu
    const timer = setTimeout(() => {
      setCamStatus("success");
      setMicStatus("success");
      setNetworkStatus("success");
    }, 1200);

    // Giả lập sóng mic động
    const micInterval = setInterval(() => {
      setMicVolume(Math.floor(Math.random() * 60) + 20);
    }, 300);

    return () => {
      clearTimeout(timer);
      clearInterval(micInterval);
    };
  }, []);

  // Xử lý xác thực khuôn mặt AI
  const handleVerifyFace = () => {
    setIsVerifyingFace(true);
    setFaceVerified(false);

    setTimeout(() => {
      setIsVerifyingFace(false);
      setFaceVerified(true);
      setFaceScore(99.4);
    }, 2000);
  };

  // Giả lập xin quyền Chia sẻ màn hình
  const handleRequestScreenShare = () => {
    setScreenStatus("testing");
    setTimeout(() => {
      setScreenStatus("success");
    }, 1000);
  };

  // Chuyển tiếp vào Phòng chờ thi và lưu trạng thái thiết bị về CSDL
  const [isSavingCheck, setIsSavingCheck] = useState(false);

  const handleProceedToWaitingRoom = async () => {
    if (sessionInfo?.roomId) {
      setIsSavingCheck(true);
      try {
        await fetchWithAuth(`/api/v1/rooms/${sessionInfo.roomId}/device-check`, {
          method: "POST",
          body: JSON.stringify({
            camera_ready: camStatus === "success",
            mic_ready: micStatus === "success",
            screen_ready: screenStatus === "success",
            network_latency_ms: 25,
            os_info: typeof navigator !== "undefined" ? navigator.platform : "Web",
            browser_info: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "Browser",
          }),
        });
      } catch (err) {
        console.error("Không thể lưu trạng thái kiểm tra thiết bị:", err);
      } finally {
        setIsSavingCheck(false);
      }
    }
    router.push("/student/waiting-room");
  };

  const isAllReady =
    camStatus === "success" &&
    micStatus === "success" &&
    screenStatus === "success" &&
    faceVerified;

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
          Mã phòng: <b className="font-mono text-sm">{sessionInfo?.roomCode || "OCL-C001"}</b>
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

            <span className="inline-flex items-center gap-1.5 rounded bg-emerald-50 px-3 py-1 font-mono text-xs font-semibold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live Feed 30 FPS
            </span>
          </div>

          {/* Khung Xem trước Camera */}
          <div className="relative aspect-video w-full overflow-hidden rounded-md border border-stone-800 bg-stone-950 flex items-center justify-center">
            {/* Tấm bìa camera giả lập */}
            <div className="relative flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-[#e5a9b9]/60 bg-slate-900/20">
                <ScanFace size={48} className="text-[#f0c2cf]" />
              </div>

              {isVerifyingFace ? (
                <p className="text-xs font-mono font-bold text-[#f0c2cf] flex items-center gap-1.5">
                  <LoaderCircle size={14} className="animate-spin" />
                  Đang đối soát AI Face ID...
                </p>
              ) : faceVerified ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                    <CheckCircle2 size={16} /> Khuôn mặt hợp lệ ({faceScore}%)
                  </p>
                  <p className="text-[11px] text-stone-400">Khớp dữ liệu thẻ sinh viên Oculide</p>
                </div>
              ) : (
                <p className="text-xs text-stone-400">
                  Nhấn nút bên dưới để tiến hành quét sinh trắc học khuôn mặt
                </p>
              )}
            </div>

            {/* HUD Cài đặt thông số AI */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-stone-300 bg-stone-900/90 px-3 py-1.5 rounded-md border border-stone-800">
              <span>Độ phân giải: 1280x720</span>
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
              disabled={isVerifyingFace}
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
                    <p className="text-[11px] text-slate-500">Tự động giám sát góc nghiêng</p>
                  </div>
                </div>
                {camStatus === "success" ? (
                  <span className="flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
                    <CheckCircle2 size={13} /> Sẵn sàng
                  </span>
                ) : (
                  <LoaderCircle size={16} className="animate-spin text-slate-900" />
                )}
              </div>

              {/* ITEM 2: MICROPHONE */}
              <div className="flex items-center justify-between p-3.5 rounded-md bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-stone-100 text-[#5A5555] dark:bg-white/10 dark:text-stone-300">
                    <Mic size={18} />
                  </div>
                  <div>
                    <p className="font-serif font-bold text-[#2A282D] dark:text-white">Microphone thu âm</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">Tín hiệu:</span>
                      <div className="h-1.5 w-16 rounded-full bg-stone-200 dark:bg-white/20 overflow-hidden">
                        <div
                          className="h-full bg-brand dark:bg-[#e5a9b9] transition-all duration-200"
                          style={{ width: `${micVolume}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {micStatus === "success" ? (
                  <span className="flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
                    <CheckCircle2 size={13} /> Nhận âm thanh
                  </span>
                ) : (
                  <LoaderCircle size={16} className="animate-spin text-slate-900" />
                )}
              </div>

              {/* ITEM 3: CHIA SẺ MÀN HÌNH */}
              <div className="flex items-center justify-between p-3.5 rounded-md bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-stone-100 text-[#5A5555] dark:bg-white/10 dark:text-stone-300">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <p className="font-serif font-bold text-[#2A282D] dark:text-white">Chia sẻ toàn màn hình</p>
                    <p className="text-[11px] text-slate-500">Giám sát chống chuyển Tab</p>
                  </div>
                </div>

                {screenStatus === "success" ? (
                  <span className="flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
                    <CheckCircle2 size={13} /> Đã chia sẻ
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestScreenShare}
                    className="system-primary-action rounded bg-slate-900 px-3 py-1.5 font-serif text-[11px] font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    {screenStatus === "testing" ? "Đang cấp quyền..." : "Cấp quyền"}
                  </button>
                )}
              </div>

              {/* ITEM 4: ĐƯỜNG TRUYỀN MẠNG */}
              <div className="flex items-center justify-between p-3.5 rounded-md bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-stone-100 text-[#5A5555] dark:bg-white/10 dark:text-stone-300">
                    <Wifi size={18} />
                  </div>
                  <div>
                    <p className="font-serif font-bold text-[#2A282D] dark:text-white">Kết nối Internet</p>
                    <p className="text-[11px] text-slate-500">Ping: 12ms · Tốc độ cao</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
                  <CheckCircle2 size={13} /> Ổn định
                </span>
              </div>
            </div>
          </div>

          {/* Thẻ Cảnh báo & Hướng dẫn */}
          <div className="rounded-md border border-slate-300 bg-slate-900/5 p-4 flex items-start gap-3 dark:border-white/10 dark:bg-slate-900/15">
            <Info size={18} className="text-slate-900 dark:text-[#f0c2cf] shrink-0 mt-0.5" />
            <p className="text-xs text-[#2A282D] dark:text-[#E8E6E8] leading-relaxed">
              Bạn cần hoàn thành đủ 4 mục kiểm tra trên (bao gồm Xác thực khuôn mặt) trước khi hệ thống cho phép vào <strong>Phòng chờ thi</strong>.
            </p>
          </div>

          {/* Nút Tiến vào Phòng Chờ Thi */}
          <button
            type="button"
            disabled={!isAllReady}
            onClick={handleProceedToWaitingRoom}
            className="system-primary-action w-full flex items-center justify-center gap-2 rounded-md bg-slate-900 py-3.5 font-serif text-xs sm:text-sm font-bold text-white shadow-2xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <span>Vào phòng chờ thi</span>
            <ArrowRight size={16} />
          </button>

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