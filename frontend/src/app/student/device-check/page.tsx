'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

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
  const [camStatus, setCamStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [micStatus, setMicStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [screenStatus, setScreenStatus] = useState<'idle' | 'testing' | 'success'>('idle');
  const [networkStatus, setNetworkStatus] = useState<'testing' | 'success'>('testing');

  // Giả lập volume micro
  const [micVolume, setMicVolume] = useState(0);

  // Xác thực AI Face ID
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceScore, setFaceScore] = useState<number | null>(null);

  // Đọc dữ liệu phòng thi từ sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('oculide_student_pending_exam');
      if (saved) {
        setSessionInfo(JSON.parse(saved));
      }
    } catch {
      // Bỏ qua nếu không đọc được
    }

    // Tự động kiểm tra phần cứng ban đầu
    const timer = setTimeout(() => {
      setCamStatus('success');
      setMicStatus('success');
      setNetworkStatus('success');
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
    setScreenStatus('testing');
    setTimeout(() => {
      setScreenStatus('success');
    }, 1000);
  };

  // Chuyển tiếp vào Phòng chờ thi
  const handleProceedToWaitingRoom = () => {
    router.push('/student/waiting-room');
  };

  const isAllReady =
    camStatus === 'success' &&
    micStatus === 'success' &&
    screenStatus === 'success' &&
    faceVerified;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Navigation & Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Link href="/student" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              Sinh viên
            </Link>
            <span>/</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">Kiểm tra thiết bị AI</span>
          </nav>

          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Kiểm tra thiết bị &amp; Xác thực khuôn mặt
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Đảm bảo Webcam, Micro, Màn hình và AI Face ID hoạt động chuẩn xác trước khi vào phòng thi.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 border border-blue-200/80 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/20">
          <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400" />
          <span>Mã phòng:</span>
          <b className="font-mono text-sm">{sessionInfo?.roomCode || 'OCL-C001'}</b>
        </div>
      </header>

      {/* Layout chính 2 cột */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* CỘT TRÁI: CAMERA PREVIEW & XÁC THỰC KHUÔN MẶT AI (7/12) */}
        <section className="xl:col-span-7 flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-5 dark:border-white/10 dark:bg-[#11141d]">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                <Camera size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Khung hình Camera &amp; AI Biometrics
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nhận diện và khớp ảnh với hồ sơ sinh viên SSO
                </p>
              </div>
            </div>

            {faceVerified && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle2 size={14} /> Khớp {faceScore}%
              </span>
            )}
          </div>

          {/* Vùng Camera Giả lập */}
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            {/* Khung quét Face ID Animation */}
            <div className="relative flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
              <div
                className={`relative flex h-28 w-28 items-center justify-center rounded-2xl border-2 transition-all duration-300 ${
                  isVerifyingFace
                    ? 'border-blue-500 animate-pulse bg-blue-500/10'
                    : faceVerified
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-700 bg-slate-800/50'
                }`}
              >
                <ScanFace
                  size={48}
                  className={
                    isVerifyingFace
                      ? 'text-blue-400 animate-bounce'
                      : faceVerified
                      ? 'text-emerald-400'
                      : 'text-slate-400'
                  }
                />

                {/* 4 Góc định vị */}
                <span className="absolute -top-1 -left-1 h-3 w-3 border-t-2 border-l-2 border-blue-400" />
                <span className="absolute -top-1 -right-1 h-3 w-3 border-t-2 border-r-2 border-blue-400" />
                <span className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-blue-400" />
                <span className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-blue-400" />
              </div>

              <div className="text-white space-y-1">
                <p className="text-sm font-bold">
                  {isVerifyingFace
                    ? 'Đang phân tích điểm mốc khuôn mặt...'
                    : faceVerified
                    ? 'Xác thực sinh trắc học thành công!'
                    : 'Đặt khuôn mặt vào giữa khung hình'}
                </p>
                <p className="text-xs text-slate-400">
                  {faceVerified
                    ? 'Dữ liệu trùng khớp với ảnh thẻ sinh viên trên hệ thống.'
                    : 'Nhấn nút bên dưới để bắt đầu quét Face ID.'}
                </p>
              </div>
            </div>

            {/* Trạng thái Camera Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] text-white backdrop-blur font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE CAM: 1080p 30fps</span>
            </div>
          </div>

          {/* Nút Kích hoạt Xác thực AI */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/10">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Lưu ý: Không đeo khẩu trang hoặc kính râm trong quá trình thi.
            </div>

            <button
              type="button"
              onClick={handleVerifyFace}
              disabled={isVerifyingFace}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
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
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4 dark:border-white/10 dark:bg-[#11141d]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/10 pb-3">
              Danh mục phần cứng yêu cầu
            </h2>

            <div className="space-y-3.5 text-xs">
              {/* ITEM 1: WEBCAM */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    <Camera size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Webcam HD</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Tự động giám sát góc nghiêng</p>
                  </div>
                </div>
                {camStatus === 'success' ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                    <CheckCircle2 size={13} /> Sẵn sàng
                  </span>
                ) : (
                  <LoaderCircle size={16} className="animate-spin text-blue-600" />
                )}
              </div>

              {/* ITEM 2: MICROPHONE */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                    <Mic size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Microphone thu âm</p>
                    {/* Vạch âm lượng giả lập */}
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">Tín hiệu:</span>
                      <div className="h-1.5 w-16 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-200"
                          style={{ width: `${micVolume}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {micStatus === 'success' ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                    <CheckCircle2 size={13} /> Nhận âm thanh
                  </span>
                ) : (
                  <LoaderCircle size={16} className="animate-spin text-blue-600" />
                )}
              </div>

              {/* ITEM 3: CHIA SẺ MÀN HÌNH */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Chia sẻ toàn màn hình</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Giám sát chống chuyển Tab</p>
                  </div>
                </div>

                {screenStatus === 'success' ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                    <CheckCircle2 size={13} /> Đã chia sẻ
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestScreenShare}
                    className="rounded-xl bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 transition cursor-pointer"
                  >
                    {screenStatus === 'testing' ? 'Đang cấp quyền...' : 'Cấp quyền'}
                  </button>
                )}
              </div>

              {/* ITEM 4: ĐƯỜNG TRUYỀN MẠNG */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                    <Wifi size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Kết nối Internet</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Ping: 12ms · Tốc độ cao</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                  <CheckCircle2 size={13} /> Ổn định
                </span>
              </div>
            </div>
          </div>

          {/* Thẻ Cảnh báo & Hướng dẫn */}
          <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-4 flex items-start gap-3 dark:border-blue-500/20 dark:bg-blue-950/20">
            <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
              Bạn cần hoàn thành đủ 4 mục kiểm tra trên (bao gồm Xác thực khuôn mặt) trước khi hệ thống cho phép vào <strong>Phòng chờ thi</strong>.
            </p>
          </div>

          {/* Nút Tiến vào Phòng Chờ Thi chuẩn h-11 */}
          <button
            type="button"
            disabled={!isAllReady}
            onClick={handleProceedToWaitingRoom}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <span>Vào phòng chờ thi</span>
            <ArrowRight size={16} />
          </button>

          <div className="text-center">
            <Link
              href="/student/exams"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              <ArrowLeft size={14} /> Quay lại trang chọn phòng thi
            </Link>
          </div>
        </section>
      </div>

      <footer className="pt-2 text-center text-xs text-slate-400 dark:text-slate-500">
        Oculide · Hệ thống thi lập trình trực tuyến
      </footer>
    </div>
  );
}
