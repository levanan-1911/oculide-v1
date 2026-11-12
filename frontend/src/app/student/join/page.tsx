'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  KeyRound,
  LogIn,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  User,
  Mail,
  Code2,
  GraduationCap,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import { fetchWithAuth } from '@/services/apiClient';

interface JoinedRoomData {
  room_id: number;
  room_code: string;
  room_name: string;
  room_type: string;
  duration_minutes: number;
  status: string;
  session_id?: number;
  livekit_room_name?: string;
  class_id?: number;
  class_code?: string;
  class_name?: string;
  course_name?: string;
  proctoring_config?: string;
  start_time?: string;
  end_time?: string;
}

function JoinClassContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [roomCode, setRoomCode] = useState(initialCode);
  const [passcode, setPasscode] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinedRoom, setJoinedRoom] = useState<JoinedRoomData | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Lấy thông tin sinh viên từ phiên đăng nhập
  useEffect(() => {
    try {
      const token = localStorage.getItem('oculide_token');
      const storedUser = localStorage.getItem('oculide_user');
      if (token && storedUser) {
        setIsLoggedIn(true);
        const parsed = JSON.parse(storedUser);
        if (parsed.email) setStudentEmail(parsed.email);
        if (parsed.name || parsed.fullName || parsed.full_name) {
          setStudentName(parsed.name || parsed.fullName || parsed.full_name);
        }
        if (parsed.studentId || parsed.student_id || parsed.userCode || parsed.ma_dinh_danh) {
          setStudentId(parsed.studentId || parsed.student_id || parsed.userCode || parsed.ma_dinh_danh);
        }
      } else {
        setIsLoggedIn(false);
      }
    } catch {
      setIsLoggedIn(false);
    }
  }, []);

  async function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
    if (!token) {
      setErrorMsg('Bạn chưa đăng nhập. Thí sinh bắt buộc phải đăng nhập bằng Email trường trước khi tham gia phòng thi.');
      return;
    }

    const trimmedCode = roomCode.trim().toUpperCase();
    const trimmedPass = passcode.trim();

    if (!trimmedCode) {
      setErrorMsg('Vui lòng nhập Mã phòng (Room Code).');
      return;
    }
    if (!trimmedPass) {
      setErrorMsg('Vui lòng nhập Mật khẩu phòng (Passcode).');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await fetchWithAuth<JoinedRoomData>('/api/v1/rooms/join', {
        method: 'POST',
        body: JSON.stringify({
          room_code: trimmedCode,
          passcode: trimmedPass,
        }),
      });

      let parsedProctoring: Record<string, any> = {};
      if (data.proctoring_config) {
        try {
          parsedProctoring =
            typeof data.proctoring_config === 'string'
              ? JSON.parse(data.proctoring_config)
              : data.proctoring_config;
        } catch {
          parsedProctoring = {};
        }
      }

      const pendingSession = {
        roomId: data.room_id,
        roomCode: data.room_code,
        examTitle: data.room_name,
        subject: data.course_name || data.class_name || 'Thực hành / Kiểm tra lập trình',
        classCode: data.class_code || '',
        className: data.class_name || '',
        duration: data.duration_minutes || 60,
        roomType: data.room_type === 'exam' ? 'exam' : 'lab',
        status: data.status || 'chua_mo',
        sessionId: data.session_id,
        livekitRoomName: data.livekit_room_name || `room_${data.room_code}`,
        proctoringConfig: parsedProctoring,
      };

      sessionStorage.setItem('oculide_student_pending_exam', JSON.stringify(pendingSession));
      setJoinedRoom(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể tham gia phòng. Vui lòng kiểm tra lại Mã phòng và Mã PIN.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setJoinedRoom(null);
    setErrorMsg('');
  }

  const isProctored = (() => {
    if (!joinedRoom?.proctoring_config) return true;
    try {
      const cfg =
        typeof joinedRoom.proctoring_config === 'string'
          ? JSON.parse(joinedRoom.proctoring_config)
          : joinedRoom.proctoring_config;
      return Boolean(cfg.enableCamera ?? true);
    } catch {
      return true;
    }
  })();

  const isExam = joinedRoom?.room_type === 'exam';

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f4f7f9] text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white px-6 py-4 shadow-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563eb] shadow-sm shadow-blue-500/20">
              <svg
                className="h-6 w-6 text-white"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="2.2" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-[#2563eb]">
                OCULIDE
              </span>
              <span className="ml-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                Cổng tham gia phòng học & bài thi
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/student/dashboard"
              className="font-semibold text-slate-600 transition hover:text-blue-600"
            >
              Bảng điều khiển Sinh viên
            </Link>
            <span className="text-slate-300">•</span>
            <Link
              href="/login"
              className="font-semibold text-blue-600 hover:underline"
            >
              Đổi tài khoản
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8 sm:px-6 lg:py-12">
        <div className="mx-auto max-w-xl">
          {joinedRoom ? (
            /* MÀN HÌNH XÁC NHẬN THAM GIA THÀNH CÔNG */
            <div className="rounded-3xl border border-emerald-200/90 bg-white p-6 shadow-xl shadow-emerald-900/5 sm:p-8">
              <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-xs">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {isExam ? 'Xác nhận vào phòng thi thành công!' : 'Xác nhận vào phòng thực hành thành công!'}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Hệ thống đã ghi nhận điểm danh của bạn vào phòng chờ giảng viên
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div
                  className={`rounded-2xl border p-5 ${
                    isExam ? 'border-purple-200 bg-purple-50/50' : 'border-blue-200 bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs font-bold ${
                        isExam ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isExam ? <GraduationCap className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
                      Mã phòng: {joinedRoom.room_code}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                      {joinedRoom.status === 'dang_dien_ra' ? 'Đang diễn ra' : 'Đang mở phòng chờ'}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-extrabold text-slate-900">
                    {joinedRoom.room_name}
                  </h3>

                  {(joinedRoom.class_code || joinedRoom.class_name) && (
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      Lớp: <strong>{joinedRoom.class_code}</strong>
                      {joinedRoom.class_name ? ` — ${joinedRoom.class_name}` : ''}
                    </p>
                  )}

                  <div
                    className={`mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs ${
                      isExam ? 'border-purple-200/60' : 'border-blue-200/60'
                    }`}
                  >
                    <div>
                      <span className="text-slate-500">Hình thức:</span>
                      <p className="font-bold text-slate-800">
                        {isExam ? 'Bài thi Lập trình' : 'Buổi Thực hành (Lab)'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Thời lượng làm bài:</span>
                      <p className={`font-bold ${isExam ? 'text-purple-700' : 'text-blue-700'}`}>
                        {joinedRoom.duration_minutes} phút
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Thí sinh:</span>
                      <p className="font-bold text-slate-800">
                        {studentName || 'Sinh viên'} {studentId ? `(${studentId})` : ''}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Giám sát AI:</span>
                      <p className="inline-flex items-center gap-1 font-bold text-emerald-700">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {isProctored ? 'Có giám sát Camera/AI' : 'Chế độ mở'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push('/student/device-check')}
                  className={`flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white shadow-lg transition ${
                    isExam
                      ? 'bg-purple-600 shadow-purple-600/25 hover:bg-purple-700'
                      : 'bg-blue-600 shadow-blue-600/25 hover:bg-blue-700'
                  }`}
                >
                  <span>Tiếp tục Kiểm tra Thiết bị & Vào phòng chờ</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Đổi mã phòng khác
                </button>

                <Link
                  href="/student/waiting-room"
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Vào thẳng phòng chờ →
                </Link>
              </div>
            </div>
          ) : (
            /* FORM NHẬP MÃ PHÒNG */
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/40 sm:p-8">
              <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs">
                  <KeyRound className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Tham gia phòng Lab / Phòng thi
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Nhập mã phòng và mật khẩu PIN do Giảng viên cung cấp để vào phòng chờ.
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <p className="font-semibold leading-relaxed">{errorMsg}</p>
                </div>
              )}

              {!isLoggedIn && (
                <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🔒</span>
                    <p className="font-semibold leading-snug">
                      Hệ thống yêu cầu xác thực danh tính: Thí sinh phải đăng nhập tài khoản trường trước khi vào phòng thi.
                    </p>
                  </div>
                  <Link
                    href={`/login?redirect=/student/join${roomCode ? `?code=${roomCode}` : ''}`}
                    className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-center font-bold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    Đăng nhập ngay
                  </Link>
                </div>
              )}

              <form onSubmit={handleJoin} className="mt-6 space-y-4">
                {/* Khối 1: Mã phòng & Passcode */}
                <div className="space-y-3.5 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-blue-900">
                      MÃ PHÒNG (ROOM CODE) <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={roomCode}
                      onChange={(e) => {
                        setRoomCode(e.target.value.toUpperCase());
                        setErrorMsg('');
                      }}
                      placeholder="Ví dụ: CS316-EXAM-01"
                      required
                      className="h-11 w-full rounded-xl border border-blue-200 bg-white px-4 font-mono text-sm font-extrabold uppercase text-blue-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-blue-900">
                      MẬT KHẨU PHÒNG (PASSCODE) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={passcode}
                      onChange={(e) => {
                        setPasscode(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="Nhập 6 chữ số mật khẩu phòng..."
                      required
                      className="h-11 w-full rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Khối 2: Thông tin định danh (tự động từ phiên đăng nhập) */}
                <div className="space-y-3.5 pt-1">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      MÃ SỐ SINH VIÊN (MSSV)
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                        placeholder="Tự động điền từ tài khoản đăng nhập"
                        readOnly={Boolean(isLoggedIn && studentId)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 text-xs font-bold uppercase text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      HỌ VÀ TÊN SINH VIÊN
                    </label>
                    <input
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Tự động điền từ tài khoản đăng nhập"
                      readOnly={Boolean(isLoggedIn && studentName)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      EMAIL SINH VIÊN
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        placeholder="Tự động điền từ tài khoản đăng nhập"
                        readOnly={Boolean(isLoggedIn && studentEmail)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Hệ thống tự động đối soát tài khoản đang đăng nhập với danh sách lớp học phần trên máy chủ.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2563eb] text-sm font-bold text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        <span>Đang xác thực phòng...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4" />
                        <span>Xác thực & Tham gia ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-500">Đang tải...</div>}>
      <JoinClassContent />
    </Suspense>
  );
}
