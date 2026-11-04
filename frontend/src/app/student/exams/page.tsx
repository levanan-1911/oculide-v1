'use client';

import React, { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Code2,
  DoorOpen,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  GraduationCap,
  Info,
  KeyRound,
  Laptop,
  LoaderCircle,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
} from 'lucide-react';

import { studentExams, type StudentExam } from '@/components/student/student-data';

function ExamJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const codeParam = searchParams.get('code') || '';

  const [roomCode, setRoomCode] = useState(codeParam);
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [captchaChecked, setCaptchaChecked] = useState(false);

  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Thông tin sinh viên đăng nhập
  const studentInfo = {
    name: 'Nguyễn Văn Long',
    mssv: '2026-IT01',
    className: '21T_DT1',
    email: 'long.nv@school.edu.vn',
  };

  useEffect(() => {
    if (codeParam) {
      setRoomCode(codeParam);
    }
  }, [codeParam]);

  // Đếm ngược khóa form khi nhập sai quá 3 lần
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          setFailedAttempts(0);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const selectedExam = studentExams.find(
    (exam) => exam.roomCode.toLowerCase() === roomCode.trim().toLowerCase()
  );

  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (lockoutTimer > 0) {
      setError(
        `Hệ thống tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau ${lockoutTimer}s.`
      );
      return;
    }

    if (!roomCode.trim()) {
      setError('Vui lòng nhập Mã phòng thi.');
      return;
    }

    if (!passcode.trim()) {
      setError('Vui lòng nhập Mật khẩu phòng thi (6 chữ số).');
      return;
    }

    if (!captchaChecked) {
      setError('Vui lòng xác nhận kiểm tra an toàn thiết bị (Anti-Bot).');
      return;
    }

    if (!selectedExam) {
      handleFailedAttempt(
        'Mã phòng thi không tồn tại trong hệ thống. Vui lòng kiểm tra lại.'
      );
      return;
    }

    if (selectedExam.status === 'Đã hoàn thành') {
      setError('Ca thi này đã kết thúc. Không thể tham gia lại.');
      return;
    }

    if (passcode.trim() !== '123456') {
      handleFailedAttempt(
        'Mật khẩu phòng thi không chính xác (gồm 6 chữ số).'
      );
      return;
    }

    setJoining(true);

    const pendingSession = {
      roomCode: selectedExam.roomCode,
      examId: selectedExam.id,
      examTitle: selectedExam.title,
      subject: selectedExam.subject,
      duration: selectedExam.duration,
      studentInfo,
      passcode,
      joinedAt: new Date().toISOString(),
      securityVerification: {
        ipAddress: '172.16.20.105 (Campus Network)',
        deviceFingerprint: 'FP-OCULIDE-9982X',
        identityVerified: true,
      },
    };

    sessionStorage.setItem(
      'oculide_student_pending_exam',
      JSON.stringify(pendingSession)
    );

    setTimeout(() => {
      router.push('/student/device-check');
    }, 800);
  }

  function handleFailedAttempt(msg: string) {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);

    if (nextAttempts >= 3) {
      setLockoutTimer(60);
      setError('CẢNH BÁO BẢO MẬT: Nhập sai quá 3 lần. Form bị khóa tạm thời trong 60s!');
    } else {
      setError(`${msg} (Còn ${3 - nextAttempts} lần thử)`);
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Breadcrumb Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Link href="/student" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
            Sinh viên
          </Link>
          <span>/</span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold">Tham gia phòng thi</span>
        </nav>

        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Tham gia phòng Lab / Phòng thi
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Xác thực thông tin sinh viên và mã phòng thi bảo mật do Giảng viên cung cấp.
        </p>
      </div>

      {/* Banner Giám sát Bảo mật */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs dark:border-blue-500/20 dark:bg-blue-950/20 dark:text-blue-200">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <p className="font-bold">Hệ thống Giám sát Bảo mật Oculide Active</p>
            <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
              Ghi nhận địa chỉ IP, Dấu vân tay thiết bị và Mã định danh sinh viên thời gian thực.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] font-semibold bg-white/80 dark:bg-white/10 px-3 py-1.5 rounded-xl border border-blue-200/60 dark:border-blue-500/30 shrink-0">
          <Globe size={13} className="text-emerald-600 dark:text-emerald-400" />
          <span>IP: 172.16.20.105</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* CỘT FORM NHẬP BẢO MẬT (3/5) */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-7 xl:col-span-3 space-y-6 dark:border-white/10 dark:bg-[#11141d]">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                <DoorOpen size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Thông tin phòng &amp; Định danh
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mã phòng và Mật khẩu do Giảng viên trực tiếp cấp tại ca thi
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
              <Fingerprint size={13} /> SSO Verified
            </span>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            {/* MÃ PHÒNG (ROOM CODE) */}
            <div>
              <label
                htmlFor="roomCode"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Mã phòng (Room Code) <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <Code2
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="roomCode"
                  disabled={lockoutTimer > 0}
                  value={roomCode}
                  onChange={(event) => {
                    setRoomCode(event.target.value);
                    setError('');
                  }}
                  placeholder="VÍ DỤ: LAB-1848-01 HOẶC EXAM-1848-MID"
                  autoComplete="off"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs sm:text-sm font-mono uppercase tracking-wider text-slate-900 outline-none transition placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500"
                />
              </div>
            </div>

            {/* MẬT KHẨU PHÒNG (PASSCODE) */}
            <div>
              <label
                htmlFor="passcode"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Mật khẩu phòng (Passcode) <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <KeyRound
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="passcode"
                  disabled={lockoutTimer > 0}
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(event) => {
                    setPasscode(event.target.value);
                    setError('');
                  }}
                  placeholder="Nhập 6 chữ số mật khẩu phòng..."
                  autoComplete="off"
                  maxLength={10}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-11 text-xs sm:text-sm font-mono text-slate-900 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  aria-label={showPasscode ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPasscode ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <hr className="my-4 border-slate-100 dark:border-white/10" />

            {/* THÔNG TIN SINH VIÊN (LOCKED - CHỐNG MẠO DANH) */}
            <div className="space-y-3.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <UserCheck size={15} className="text-blue-600 dark:text-blue-400" /> Định danh Sinh viên (Khóa)
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Đã xác thực tài khoản</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Họ và tên</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{studentInfo.name}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Mã sinh viên</p>
                  <p className="font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">{studentInfo.mssv}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Lớp sinh hoạt</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{studentInfo.className}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Email trường cấp</p>
                  <p className="font-mono text-slate-600 dark:text-slate-400 truncate mt-0.5">{studentInfo.email}</p>
                </div>
              </div>
            </div>

            {/* CHECKBOX ANTI-BOT / DEVICE CHECK */}
            <div className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="antiBot"
                checked={captchaChecked}
                disabled={lockoutTimer > 0}
                onChange={(e) => {
                  setCaptchaChecked(e.target.checked);
                  setError('');
                }}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer dark:border-white/20 dark:bg-white/5"
              />
              <label htmlFor="antiBot" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Xác nhận thiết bị máy trạm an toàn &amp; Không sử dụng máy ảo (Anti-Bot)
              </label>
            </div>

            {/* HIỂN THỊ LỖI BẢO MẬT */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-700 leading-relaxed font-semibold dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400"
              >
                <ShieldAlert size={17} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* NÚT SUBMIT CHUẨN h-11 */}
            <button
              type="submit"
              disabled={joining || lockoutTimer > 0}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {joining ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  <span>Đang mã hóa thông tin truy cập...</span>
                </>
              ) : lockoutTimer > 0 ? (
                <>
                  <Lock size={16} />
                  <span>Form bị khóa ({lockoutTimer}s)</span>
                </>
              ) : (
                <>
                  <span>Tiếp tục Kiểm tra thiết bị AI</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </section>

        {/* CỘT CHI TIẾT KỲ THI & QUY CHẾ (2/5) */}
        <section className="space-y-5 xl:col-span-2">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 space-y-4 dark:border-white/10 dark:bg-[#11141d]">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-white/10">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
                <BookOpen size={19} />
              </div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                Thông tin phòng xem trước
              </h2>
            </div>

            {selectedExam ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <p className="text-slate-400 dark:text-slate-500">Tên ca thi</p>
                  <p className="mt-0.5 font-bold text-slate-900 dark:text-white text-sm">
                    {selectedExam.title}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400 dark:text-slate-500">Môn học</p>
                  <p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-300">
                    {selectedExam.subject}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 p-3">
                    <p className="text-slate-400 dark:text-slate-500 text-[11px]">Thời lượng</p>
                    <p className="mt-1 flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200 font-mono">
                      <Clock3 size={13} className="text-violet-600 dark:text-violet-400" />
                      {selectedExam.duration} phút
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 p-3">
                    <p className="text-slate-400 dark:text-slate-500 text-[11px]">Mã phòng</p>
                    <p className="mt-1 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {selectedExam.roomCode}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 p-3 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Trạng thái</span>
                  <span className="font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 text-[11px]">
                    {selectedExam.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center space-y-2">
                <BookOpen size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Chưa xác định phòng thi
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                  Nhập đúng Mã phòng hợp lệ để xem trước thông tin bài thi.
                </p>
              </div>
            )}
          </div>

          {/* ĐIỀU KIỆN AN NINH CA THI */}
          <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5 space-y-3 dark:border-blue-500/20 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
              <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-xs">Yêu cầu an ninh ca thi</h3>
            </div>

            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Xác thực AI Face ID chính chủ</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Cấp quyền Webcam &amp; Chia sẻ màn hình</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Ghi nhận vi phạm quá 3 lần sẽ bị Khóa máy</span>
              </li>
            </ul>
          </div>
        </section>
      </div>

      <footer className="pt-2 text-center text-xs text-slate-400 dark:text-slate-500">
        Oculide · Hệ thống thi lập trình trực tuyến
      </footer>
    </div>
  );
}

export default function StudentExamsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-xs text-slate-500 dark:text-slate-400">
          <LoaderCircle size={20} className="animate-spin text-blue-600 dark:text-blue-400 mr-2" />
          Đang tải cấu hình bảo mật phòng thi...
        </div>
      }
    >
      <ExamJoinContent />
    </Suspense>
  );
}
