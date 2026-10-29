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

interface PendingSession {
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

  // Chuyển tiếp vào Phòng chờ thi
  const handleProceedToWaitingRoom = () => {
    router.push("/student/waiting-room");
  };

  const isAllReady =
    camStatus === "success" &&
    micStatus === "success" &&
    screenStatus === "success" &&
    faceVerified;

  return (
    <main className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Navigation & Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/student" className="hover:text-blue-600 transition">
                Sinh viên
              </Link>
              <span>/</span>
              <span className="text-blue-600 font-semibold">Kiểm tra thiết bị AI</span>
            </nav>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Kiểm tra thiết bị &amp; Xác thực khuôn mặt
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Đảm bảo Webcam, Micro, Màn hình và AI Face ID hoạt động chuẩn xác trước khi vào phòng thi.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 border border-blue-200/80">
            <ShieldCheck size={16} className="text-blue-600" />
            Mã phòng: <b className="font-mono text-sm">{sessionInfo?.roomCode || "OCL-C001"}</b>
          </div>
        </header>

        {/* Layout chính 2 cột */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* CỘT TRÁI: CAMERA PREVIEW & XÁC THỰC KHUÔN MẶT AI (7/12) */}
          <section className="xl:col-span-7 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Camera size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Luồng Camera &amp; Quét khuôn mặt AI
                  </h2>
                  <p className="text-xs text-slate-500">
                    Giữ mặt ở trung tâm khung hình và đảm bảo đủ ánh sáng
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                Live Feed 30 FPS
              </span>
            </div>

            {/* Khung Xem trước Camera */}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 flex items-center justify-center shadow-inner">
              {/* Giả lập lưới quét AI Face Mesh */}
              <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

              {/* Tấm bìa camera giả lập */}
              <div className="relative flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-blue-400/60 bg-blue-500/10">
                  <ScanFace size={48} className={`text-blue-400 ${isVerifyingFace ? "animate-pulse" : ""}`} />
                  {isVerifyingFace && (
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping" />
                  )}
                </div>

                {isVerifyingFace ? (
                  <p className="text-xs font-mono font-bold text-blue-400 flex items-center gap-1.5">
                    <LoaderCircle size={14} className="animate-spin" />
                    Đang đối soát AI Face ID...
                  </p>
                ) : faceVerified ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                      <CheckCircle2 size={16} /> Khuôn mặt hợp lệ ({faceScore}%)
                    </p>
                    <p className="text-[11px] text-slate-400">Khớp dữ liệu thẻ sinh viên Oculide</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Nhấn nút bên dưới để tiến hành quét sinh trắc học khuôn mặt
                  </p>
                )}
              </div>

              {/* HUD Cài đặt thông số AI */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur-xs">
                <span>Độ phân giải: 1280x720</span>
                <span>Độ sáng: Đạt chuẩn</span>
              </div>
            </div>

            {/* Nút Kích hoạt Xác thực AI */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Lưu ý: Không đeo khẩu trang hoặc kính râm trong quá trình thi.
              </div>

              <button
                type="button"
                onClick={handleVerifyFace}
                disabled={isVerifyingFace}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
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
          <section className="xl:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Danh mục phần cứng yêu cầu
              </h2>

              <div className="space-y-3.5 text-xs">
                {/* ITEM 1: WEBCAM */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <Camera size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Webcam HD</p>
                      <p className="text-[11px] text-slate-500">Tự động giám sát góc nghiêng</p>
                    </div>
                  </div>
                  {camStatus === "success" ? (
                    <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 size={13} /> Sẵn sàng
                    </span>
                  ) : (
                    <LoaderCircle size={16} className="animate-spin text-blue-600" />
                  )}
                </div>

                {/* ITEM 2: MICROPHONE */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                      <Mic size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Microphone thu âm</p>
                      {/* Vạch âm lượng giả lập */}
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Tín hiệu:</span>
                        <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-200"
                            style={{ width: `${micVolume}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  {micStatus === "success" ? (
                    <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 size={13} /> Nhận âm thanh
                    </span>
                  ) : (
                    <LoaderCircle size={16} className="animate-spin text-blue-600" />
                  )}
                </div>

                {/* ITEM 3: CHIA SẺ MÀN HÌNH */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <Monitor size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Chia sẻ toàn màn hình</p>
                      <p className="text-[11px] text-slate-500">Giám sát chống chuyển Tab</p>
                    </div>
                  </div>

                  {screenStatus === "success" ? (
                    <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 size={13} /> Đã chia sẻ
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestScreenShare}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 transition"
                    >
                      {screenStatus === "testing" ? "Đang cấp quyền..." : "Cấp quyền"}
                    </button>
                  )}
                </div>

                {/* ITEM 4: ĐƯỜNG TRUYỀN MẠNG */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <Wifi size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Kết nối Internet</p>
                      <p className="text-[11px] text-slate-500">Ping: 12ms · Tốc độ cao</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 size={13} /> Ổn định
                  </span>
                </div>
              </div>
            </div>

            {/* Thẻ Cảnh báo & Hướng dẫn */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 flex items-start gap-3">
              <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900 leading-relaxed">
                Bạn cần hoàn thành đủ 4 mục kiểm tra trên (bao gồm Xác thực khuôn mặt) trước khi hệ thống cho phép vào <strong>Phòng chờ thi</strong>.
              </p>
            </div>

            {/* Nút Tiến vào Phòng Chờ Thi */}
            <button
              type="button"
              disabled={!isAllReady}
              onClick={handleProceedToWaitingRoom}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <span>Vào phòng chờ thi</span>
              <ArrowRight size={16} />
            </button>

            <div className="text-center">
              <Link
                href="/student/exams"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft size={14} /> Quay lại trang chọn phòng thi
              </Link>
            </div>
          </section>
        </div>

        <footer className="pt-2 text-center text-xs text-slate-400">
          Oculide · Hệ thống thi lập trình trực tuyến
        </footer>
      </div>
    </main>
  );
}