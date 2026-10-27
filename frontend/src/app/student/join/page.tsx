  'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  KeyRound,
  LogIn,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  User,
  Mail,
  ShieldCheck,
  Code2,
  GraduationCap,
  Clock,
  Terminal,
  Calendar,
} from 'lucide-react';
import {
  ClassExam,
  ClassLab,
  ClassRow,
  StudentRow,
  getStoredClasses,
  saveStoredClasses,
} from '@/app/admin/classes/types';

interface JoinedSession {
  type: 'class' | 'lab' | 'exam';
  classRow: ClassRow;
  lab?: ClassLab;
  exam?: ClassExam;
}

function JoinClassContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [roomCode, setRoomCode] = useState(initialCode);
  const [passcode, setPasscode] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [joinedSession, setJoinedSession] = useState<JoinedSession | null>(null);
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);

  // Tự động điền thông tin nếu sinh viên đã có trong localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('oculide_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.email) setStudentEmail(parsed.email);
        if (parsed.name) setStudentName(parsed.name);
        if (parsed.studentId) setStudentId(parsed.studentId);
      }
    } catch {
      // ignore
    }
  }, []);

  function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg('');

    const trimmedCode = roomCode.trim().toUpperCase();
    const trimmedPass = passcode.trim();
    const trimmedId = studentId.trim().toUpperCase();
    const trimmedName = studentName.trim();
    const trimmedEmail = studentEmail.trim().toLowerCase();

    if (!trimmedCode) {
      setErrorMsg('Vui lòng nhập Mã phòng (Room Code).');
      return;
    }
    if (!trimmedPass) {
      setErrorMsg('Vui lòng nhập Mật khẩu phòng (Passcode).');
      return;
    }
    if (!trimmedId) {
      setErrorMsg('Vui lòng nhập Mã số sinh viên (MSSV).');
      return;
    }
    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập Họ và tên sinh viên.');
      return;
    }
    if (!trimmedEmail) {
      setErrorMsg('Vui lòng nhập Email sinh viên.');
      return;
    }

    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg('Email không đúng định dạng. Vui lòng kiểm tra lại.');
      return;
    }

    const currentClasses = getStoredClasses();

    // 1. Tìm xem mã phòng có thuộc về một bài Lab cụ thể không
    for (const c of currentClasses) {
      const targetLab = (c.labs || []).find(
        (l) =>
          (l.roomCode && l.roomCode.toUpperCase() === trimmedCode) ||
          l.id.toUpperCase() === trimmedCode
      );

      if (targetLab) {
        // Kiểm tra mật khẩu phòng Lab
        const expectedPass = targetLab.roomPassword || '123456';
        if (trimmedPass !== expectedPass) {
          setErrorMsg('Mật khẩu phòng Lab (Passcode) không chính xác.');
          return;
        }

        // Kiểm tra trạng thái lớp
        if (c.status === 'Chưa mở') {
          setErrorMsg(
            `Lớp "${c.id} - ${c.name}" hiện chưa được giảng viên mở. Bạn chưa thể vào phòng thực hành Lab.`
          );
          return;
        }

        // RÀNG BUỘC BẢO MẬT: Sinh viên trong lớp đó mới được dùng mã phòng để vào
        const isEnrolled = (c.students || []).some(
          (s) => s.id.toUpperCase() === trimmedId || s.email.toLowerCase() === trimmedEmail
        );

        if (!isEnrolled) {
          setErrorMsg(
            `Bạn (${trimmedId} - ${trimmedName}) không có tên trong danh sách sinh viên lớp ${c.id} (${c.name}). Chỉ sinh viên trong lớp mới có quyền truy cập bài Lab "${targetLab.title}".`
          );
          return;
        }

        setJoinedSession({
          type: 'lab',
          classRow: c,
          lab: targetLab,
        });
        return;
      }
    }

    // 2. Tìm xem mã phòng có thuộc về một bài Thi cụ thể không
    for (const c of currentClasses) {
      const targetExam = (c.exams || []).find(
        (e) =>
          (e.roomCode && e.roomCode.toUpperCase() === trimmedCode) ||
          e.id.toUpperCase() === trimmedCode
      );

      if (targetExam) {
        // Kiểm tra mật khẩu phòng thi
        const expectedPass = targetExam.roomPassword || '123456';
        if (trimmedPass !== expectedPass) {
          setErrorMsg('Mật khẩu phòng thi (Passcode) không chính xác.');
          return;
        }

        // Kiểm tra trạng thái lớp
        if (c.status === 'Chưa mở') {
          setErrorMsg(
            `Lớp "${c.id} - ${c.name}" hiện chưa được giảng viên mở. Bạn chưa thể vào phòng thi này.`
          );
          return;
        }

        // RÀNG BUỘC BẢO MẬT: Sinh viên trong lớp mới được phép vào thi
        const isEnrolled = (c.students || []).some(
          (s) => s.id.toUpperCase() === trimmedId || s.email.toLowerCase() === trimmedEmail
        );

        if (!isEnrolled) {
          setErrorMsg(
            `Bạn (${trimmedId} - ${trimmedName}) không có tên trong danh sách lớp ${c.id} (${c.name}). Chỉ sinh viên trong lớp mới có quyền làm bài thi "${targetExam.title}".`
          );
          return;
        }

        setJoinedSession({
          type: 'exam',
          classRow: c,
          exam: targetExam,
        });
        return;
      }
    }

    // 3. Tìm xem mã phòng có thuộc về Lớp học chung không
    const foundClass = currentClasses.find(
      (c) =>
        (c.roomCode && c.roomCode.toUpperCase() === trimmedCode) ||
        c.id.toUpperCase() === trimmedCode
    );

    if (foundClass) {
      const expectedPassword = foundClass.roomPassword || '123456';
      if (trimmedPass !== expectedPassword) {
        setErrorMsg('Mật khẩu phòng lớp học (Passcode) không chính xác.');
        return;
      }

      if (foundClass.status === 'Chưa mở') {
        setErrorMsg(
          `Lớp "${foundClass.id} - ${foundClass.name}" hiện đang ở trạng thái CHƯA MỞ. Giảng viên chưa cho phép sinh viên vào lớp.`
        );
        return;
      }

      const existingStudent = (foundClass.students || []).find(
        (s) => s.id.toUpperCase() === trimmedId || s.email.toLowerCase() === trimmedEmail
      );

      if (existingStudent) {
        setIsAlreadyEnrolled(true);
        setJoinedSession({
          type: 'class',
          classRow: foundClass,
        });
        return;
      }

      // Ghi danh sinh viên mới vào lớp
      const newStudent: StudentRow = {
        id: trimmedId,
        name: trimmedName,
        email: trimmedEmail,
        status: 'Đang học',
      };

      const updatedStudents = [...(foundClass.students || []), newStudent];
      const updatedClass: ClassRow = {
        ...foundClass,
        students: updatedStudents,
        studentCount: updatedStudents.length,
      };

      const updatedClasses = currentClasses.map((item) =>
        item.id === foundClass.id ? updatedClass : item
      );

      saveStoredClasses(updatedClasses);
      setIsAlreadyEnrolled(false);
      setJoinedSession({
        type: 'class',
        classRow: updatedClass,
      });
      return;
    }

    // Không tìm thấy bất kỳ phòng nào
    setErrorMsg(
      `Không tìm thấy phòng học, phòng lab hoặc phòng thi nào với mã "${trimmedCode}". Vui lòng kiểm tra lại với giảng viên.`
    );
  }

  function handleReset() {
    setJoinedSession(null);
    setIsAlreadyEnrolled(false);
    setErrorMsg('');
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f4f7f9] text-slate-800">
      {/* Header thanh lịch */}
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
              <span className="ml-2 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                Cổng tham gia phòng học & bài thi
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/login"
              className="font-semibold text-slate-600 hover:text-blue-600 transition"
            >
              Đăng nhập tài khoản
            </Link>
            <span className="text-slate-300">•</span>
            <Link
              href="/instructor/classes"
              className="font-semibold text-blue-600 hover:underline"
            >
              Dành cho Giảng viên
            </Link>
          </div>
        </div>
      </header>

      {/* Nội dung chính */}
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          {joinedSession ? (
            /* ── MÀN HÌNH THAM GIA THÀNH CÔNG ── */
            <div className="rounded-3xl border border-emerald-200/90 bg-white p-6 sm:p-8 shadow-xl shadow-emerald-900/5">
              <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-xs">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {joinedSession.type === 'lab'
                      ? 'Vào phòng buổi thực hành thành công!'
                      : joinedSession.type === 'exam'
                      ? 'Vào phòng thi lập trình thành công!'
                      : isAlreadyEnrolled
                      ? 'Bạn đã có tên trong lớp học này!'
                      : 'Tham gia lớp học thành công!'}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Xác thực định danh sinh viên hợp lệ • Sẵn sàng làm bài
                  </p>
                </div>
              </div>

              {/* TRƯỜNG HỢP 1: VÀO PHÒNG LAB CỤ THỂ */}
              {joinedSession.type === 'lab' && joinedSession.lab && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2.5 py-1 text-xs font-mono font-bold text-blue-700">
                        <Code2 className="h-3.5 w-3.5" />
                        Mã phòng: {joinedSession.lab.roomCode || roomCode}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        {joinedSession.lab.status}
                      </span>
                    </div>

                    <h3 className="mt-2 text-lg font-extrabold text-slate-900">
                      {joinedSession.lab.title}
                    </h3>

                    <p className="mt-1 text-xs text-slate-600 font-medium">
                      Lớp: <strong>{joinedSession.classRow.id}</strong> • {joinedSession.classRow.name}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-blue-200/60 pt-3 text-xs">
                      <div>
                        <span className="text-slate-500">Khung giờ thực hành:</span>
                        <p className="font-bold text-slate-800">
                          {joinedSession.lab.startTime || '07:30, 28/10/2026'} –{' '}
                          {joinedSession.lab.endTime ? joinedSession.lab.endTime.split(',')[0] : '09:50'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Thời lượng làm bài:</span>
                        <p className="font-bold text-amber-700">
                          {joinedSession.lab.durationMinutes || 120} phút
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Ngôn ngữ:</span>
                        <p className="font-bold text-slate-800">{joinedSession.lab.language}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Số đề trong bài lab:</span>
                        <p className="font-bold text-slate-800">{joinedSession.lab.questionCount} đề</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Sinh viên:</span>
                        <p className="font-bold text-slate-800">{studentName} ({studentId})</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Giám sát:</span>
                        <p className="font-bold text-blue-700">
                          {joinedSession.lab.isProctored ? '🛡️ Có giám sát phòng máy' : 'Tự do'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      alert(`Đang khởi động không gian lập trình IDE cho "${joinedSession.lab?.title}"!`);
                    }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 cursor-pointer"
                  >
                    <Code2 className="h-5 w-5" />
                    <span>Bắt đầu buổi thực hành ngay</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* TRƯỜNG HỢP 2: VÀO PHÒNG THI CỤ THỂ */}
              {joinedSession.type === 'exam' && joinedSession.exam && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2.5 py-1 text-xs font-mono font-bold text-purple-700">
                        <GraduationCap className="h-3.5 w-3.5" />
                        Mã phòng thi: {joinedSession.exam.roomCode || roomCode}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        {joinedSession.exam.status}
                      </span>
                    </div>

                    <h3 className="mt-2 text-lg font-extrabold text-slate-900">
                      {joinedSession.exam.title}
                    </h3>

                    <p className="mt-1 text-xs text-slate-600 font-medium">
                      Lớp: <strong>{joinedSession.classRow.id}</strong> • {joinedSession.classRow.name}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-purple-200/60 pt-3 text-xs">
                      <div>
                        <span className="text-slate-500">Hình thức:</span>
                        <p className="font-bold text-slate-800">{joinedSession.exam.type}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Thời gian làm bài:</span>
                        <p className="font-bold text-purple-700">{joinedSession.exam.durationMinutes} phút</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Sinh viên dự thi:</span>
                        <p className="font-bold text-slate-800">{studentName} ({studentId})</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Chế độ giám sát:</span>
                        <p className="font-bold text-blue-700">
                          {joinedSession.exam.isProctored ? '🛡️ Giám sát chống gian lận' : 'Tự do'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      alert(`Đang khởi động phòng thi bảo mật cho "${joinedSession.exam?.title}". Chúc bạn làm bài tốt!`);
                    }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 text-sm font-bold text-white shadow-lg shadow-purple-600/25 transition hover:bg-purple-700 cursor-pointer"
                  >
                    <GraduationCap className="h-5 w-5" />
                    <span>Vào phòng thi & Bắt đầu tính giờ</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* TRƯỜNG HỢP 3: VÀO LỚP HỌC CHUNG */}
              {joinedSession.type === 'class' && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-slate-200/90 bg-[#f8fafc] p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 font-mono">
                          {joinedSession.classRow.id}
                        </span>
                        <h3 className="mt-1.5 text-lg font-extrabold text-slate-900">
                          {joinedSession.classRow.name}
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {joinedSession.classRow.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs border-t border-slate-200/80 pt-3">
                      <div>
                        <p className="font-medium text-slate-400">Giảng viên:</p>
                        <p className="font-bold text-slate-800">{joinedSession.classRow.lecturer || 'Long Phạm'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-400">Học kỳ:</p>
                        <p className="font-bold text-slate-800">{joinedSession.classRow.semester}</p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-400">Thời gian khóa học:</p>
                        <p className="font-bold text-slate-800">
                          {joinedSession.classRow.startDate || '05/09/2026'} – {joinedSession.classRow.endDate || '15/01/2027'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-400">Sĩ số lớp hiện tại:</p>
                        <p className="font-bold text-slate-800">{joinedSession.classRow.students.length} sinh viên</p>
                      </div>
                    </div>
                  </div>

                  {/* Danh sách các bài Lab & Thi trong lớp */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Hoạt động học tập sẵn sàng ({joinedSession.classRow.labs?.length || 0} lab, {joinedSession.classRow.exams?.length || 0} bài thi)
                    </h4>

                    {(joinedSession.classRow.labs || []).length > 0 && (
                      <div className="space-y-2">
                        {joinedSession.classRow.labs?.map((lab) => (
                          <div
                            key={lab.id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs hover:border-blue-300 transition"
                          >
                            <div className="flex items-center gap-2.5">
                              <Code2 className="h-4 w-4 text-blue-600 shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-slate-900">{lab.title}</p>
                                <p className="text-[11px] text-slate-400 font-medium">
                                  Mã phòng: <strong className="text-blue-700 font-mono">{lab.roomCode}</strong> • {lab.language}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => alert(`Bắt đầu làm bài Lab: ${lab.title}`)}
                              className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer shrink-0"
                            >
                              Làm bài Lab
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {(joinedSession.classRow.exams || []).length > 0 && (
                      <div className="space-y-2">
                        {joinedSession.classRow.exams?.map((exam) => (
                          <div
                            key={exam.id}
                            className="flex items-center justify-between rounded-xl border border-purple-200 bg-white p-3 shadow-xs hover:border-purple-300 transition"
                          >
                            <div className="flex items-center gap-2.5">
                              <GraduationCap className="h-4 w-4 text-purple-600 shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-slate-900">{exam.title}</p>
                                <p className="text-[11px] text-slate-400 font-medium">
                                  Mã phòng: <strong className="text-purple-700 font-mono">{exam.roomCode}</strong> • {exam.durationMinutes} phút
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => alert(`Vào phòng thi: ${exam.title}`)}
                              className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition cursor-pointer shrink-0"
                            >
                              Vào thi
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Nút quay lại hoặc tham gia phòng khác */}
              <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Tham gia phòng khác
                </button>

                <Link
                  href="/student/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
                >
                  <span>Về trang Sinh viên</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            /* ── FORM NHẬP MÃ PHÒNG & MẬT KHẨU PHÒNG ── */
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/40">
              <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs">
                  <KeyRound className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Tham gia phòng Lab / Phòng thi
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Nhập mã phòng và mật khẩu do Giảng viên cung cấp để vào làm bài.
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <p className="font-semibold leading-relaxed">{errorMsg}</p>
                </div>
              )}

              <form onSubmit={handleJoin} className="mt-6 space-y-4">
                {/* Khối 1: Mã phòng & Mật khẩu phòng */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-3.5">
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
                      placeholder="Ví dụ: LAB-1848-01 hoặc EXAM-1848-MID"
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

                {/* Khối 2: Thông tin định danh của sinh viên */}
                <div className="space-y-3.5 pt-1">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      MÃ SỐ SINH VIÊN (MSSV) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={studentId}
                        onChange={(e) => {
                          setStudentId(e.target.value.toUpperCase());
                          setErrorMsg('');
                        }}
                        placeholder="Ví dụ: SE184801"
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-xs font-bold uppercase text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      HỌ VÀ TÊN SINH VIÊN <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={studentName}
                      onChange={(e) => {
                        setStudentName(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="Ví dụ: Nguyễn Minh Anh"
                      required
                      className="h-11 w-full rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      EMAIL SINH VIÊN <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={studentEmail}
                        onChange={(e) => {
                          setStudentEmail(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="Ví dụ: anh.nm@school.edu.vn"
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Email dùng để đối soát danh sách lớp và xác thực phiên làm bài thi.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] text-sm font-bold text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 cursor-pointer"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Tham gia phòng ngay</span>
                  </button>
                </div>
              </form>

              {/* Chú thích mã phòng mẫu cho người dùng tiện thử nghiệm */}
              <div className="mt-6 rounded-2xl border border-slate-100 bg-[#f8fafc] p-3.5 text-xs text-slate-500">
                <p className="font-bold text-slate-700 mb-1">Mã phòng mẫu có sẵn để thử nghiệm:</p>
                <div className="space-y-1 text-[11px]">
                  <p>
                    • <strong>Phòng Lab:</strong> Mã <code className="font-bold text-blue-700">LAB-1848-01</code> | Mật khẩu: <code className="font-bold text-purple-700">112233</code> (Dành cho SV lớp SE1848 như MSSV: <code className="text-slate-700 font-bold">SE184801</code>)
                  </p>
                  <p>
                    • <strong>Phòng Thi:</strong> Mã <code className="font-bold text-blue-700">EXAM-1848-MID</code> | Mật khẩu: <code className="font-bold text-purple-700">889900</code> (Dành cho SV lớp SE1848)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f4f7f9] text-sm text-slate-500">
          Đang tải trang tham gia phòng...
        </div>
      }
    >
      <JoinClassContent />
    </Suspense>
  );
}
