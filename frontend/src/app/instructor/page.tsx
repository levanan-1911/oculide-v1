'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BellRing,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  FileCode2,
  GraduationCap,
  LockKeyhole,
  Plus,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Table2,
  UserCheck,
  Users,
  Video,
} from 'lucide-react';
import { useMonitoring } from '@/components/instructor/monitoring/MonitoringContext';
import { INSTRUCTOR_ROOMS_STORAGE_KEY, RoomSession } from '@/components/instructor/classes/types';
import {
  DEFAULT_INSTRUCTOR_PROFILE_NAME,
  INSTRUCTOR_PROFILE_UPDATED_EVENT,
  readInstructorProfileIdentity,
} from '@/utils/instructorProfile';

interface TodaySessionItem {
  id: string;
  classCode: string;
  className: string;
  title: string;
  type: 'LAB' | 'EXAM';
  time: string;
  roomCode: string;
  pin: string;
  status: 'active' | 'waiting' | 'upcoming' | 'completed';
  totalStudents: number;
  attendedStudents: number;
  unattendedCount: number;
  isAiProctored: boolean;
  isSample?: boolean;
}

const INITIAL_TODAY_SESSIONS: TodaySessionItem[] = [
  {
    id: 'SES-01',
    classCode: 'CS101-A',
    className: 'Nhập môn Lập trình C/C++',
    title: 'Lab 03: Vòng lặp For/While & Mảng 1 chiều',
    type: 'LAB',
    time: '10:30 - 12:30 (Hôm nay)',
    roomCode: 'CS101-LAB3',
    pin: '883921',
    status: 'active',
    totalStudents: 48,
    attendedStudents: 46,
    unattendedCount: 2,
    isAiProctored: false,
    isSample: true,
  },
  {
    id: 'SES-02',
    classCode: 'PRJ301',
    className: 'Lập trình ứng dụng Java Web',
    title: 'Kiểm tra quá trình: Servlet & MVC Pattern',
    type: 'EXAM',
    time: '13:30 - 15:30 (Chiều nay)',
    roomCode: 'PRJ-KT01',
    pin: '901244',
    status: 'upcoming',
    totalStudents: 45,
    attendedStudents: 0,
    unattendedCount: 45,
    isAiProctored: true,
    isSample: true,
  },
  {
    id: 'SES-03',
    classCode: 'CSDL202',
    className: 'Cơ sở dữ liệu nâng cao',
    title: 'Thực hành: Truy vấn JOIN và Subquery',
    type: 'LAB',
    time: '15:45 - 17:15 (Chiều nay)',
    roomCode: 'CSDL-LAB2',
    pin: '418206',
    status: 'waiting',
    totalStudents: 38,
    attendedStudents: 12,
    unattendedCount: 26,
    isAiProctored: true,
    isSample: true,
  },
  {
    id: 'SES-04',
    classCode: 'SE220',
    className: 'Kiểm thử phần mềm',
    title: 'Kiểm tra giữa kỳ: Phân tích và thiết kế test case',
    type: 'EXAM',
    time: '08:00 - 10:00 (Ngày mai)',
    roomCode: 'SE220-KT01',
    pin: '761305',
    status: 'upcoming',
    totalStudents: 36,
    attendedStudents: 0,
    unattendedCount: 36,
    isAiProctored: true,
    isSample: true,
  },
];

const panelClass =
  'rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-white/10 dark:bg-[#121824]';
const mutedTextClass = 'text-slate-500 dark:text-slate-400';
const primaryTextClass = 'text-slate-900 dark:text-slate-100';

function mapRoomToDashboardSession(room: RoomSession): TodaySessionItem {
  return {
    id: room.id,
    classCode: room.classId,
    className: room.className,
    title: room.title,
    type: room.type === 'lab' ? 'LAB' : 'EXAM',
    time: `${room.durationMinutes} phút • Tạo hôm nay`,
    roomCode: room.id,
    pin: room.password,
    status:
      room.status === 'in_progress'
        ? 'active'
        : room.status === 'waiting'
          ? 'waiting'
          : room.status === 'ended'
            ? 'completed'
            : 'upcoming',
    totalStudents: room.attendees?.length ?? 0,
    attendedStudents:
      room.attendees?.filter((attendee) => attendee.status === 'in_exam').length ?? 0,
    unattendedCount:
      room.attendees?.filter((attendee) => attendee.status !== 'in_exam').length ?? 0,
    isAiProctored:
      Boolean(room.proctoringConfig?.aiFaceDetection) ||
      Boolean(room.proctoringConfig?.aiObjectDetection),
  };
}

export default function InstructorDashboardPage() {
  const [instructorName, setInstructorName] = useState(DEFAULT_INSTRUCTOR_PROFILE_NAME);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TodaySessionItem[]>(INITIAL_TODAY_SESSIONS);
  const { violations } = useMonitoring();

  const pendingViolations = useMemo(
    () => violations.filter((violation) => violation.status === 'pending'),
    [violations]
  );
  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === 'active'),
    [sessions]
  );
  const activeSession = activeSessions[0];
  const hasActiveSessionConflict = activeSessions.length > 1;

  const totalStudents = sessions.reduce((total, session) => total + session.totalStudents, 0);
  const attendedStudents = sessions.reduce(
    (total, session) => total + session.attendedStudents,
    0
  );
  const attendanceRate =
    totalStudents > 0 ? Math.round((attendedStudents / totalStudents) * 1000) / 10 : 0;

  useEffect(() => {
    const syncInstructorName = () => {
      setInstructorName(readInstructorProfileIdentity().name);
    };

    syncInstructorName();
    window.addEventListener('storage', syncInstructorName);
    window.addEventListener(INSTRUCTOR_PROFILE_UPDATED_EVENT, syncInstructorName);

    try {
      const storedRooms = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
      if (storedRooms) {
        const parsedRooms: unknown = JSON.parse(storedRooms);
        if (!Array.isArray(parsedRooms)) {
          throw new Error('Dữ liệu phòng không hợp lệ');
        }

        const storedSessions = (parsedRooms as RoomSession[]).map(mapRoomToDashboardSession);
        const hasStoredActiveSession = storedSessions.some(
          (session) => session.status === 'active'
        );
        const storedRoomCodes = new Set(
          storedSessions.map((session) => session.roomCode.toLowerCase())
        );

        // Giữ các phòng đã tạo trên máy và bổ sung lịch minh họa để Dashboard
        // không bị trống khi localStorage mới chỉ có một vài phòng.
        // Nếu đã có phòng thật đang giám sát, hạ lịch active minh họa xuống upcoming
        // để không tạo ra phiên giám sát thứ hai.
        const sampleSessions = INITIAL_TODAY_SESSIONS
          .filter((session) => !storedRoomCodes.has(session.roomCode.toLowerCase()))
          .map((session) =>
            hasStoredActiveSession && session.status === 'active'
              ? { ...session, status: 'upcoming' as const }
              : session
          );

        const statusPriority: Record<TodaySessionItem['status'], number> = {
          active: 0,
          waiting: 1,
          upcoming: 2,
          completed: 3,
        };

        setSessions(
          [...storedSessions, ...sampleSessions].sort(
            (first, second) => statusPriority[first.status] - statusPriority[second.status]
          )
        );
      }
    } catch {
      setToastText('Không thể đồng bộ dữ liệu Dashboard từ bộ nhớ trình duyệt.');
    }

    return () => {
      window.removeEventListener('storage', syncInstructorName);
      window.removeEventListener(INSTRUCTOR_PROFILE_UPDATED_EVENT, syncInstructorName);
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToastText(message);
    window.setTimeout(() => setToastText(null), 3500);
  }, []);

  const copyToClipboard = useCallback(
    async (text: string, id: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        showToast(`Đã sao chép ${label}.`);
        window.setTimeout(() => setCopiedId(null), 2000);
      } catch {
        showToast('Không thể sao chép. Vui lòng kiểm tra quyền truy cập clipboard.');
      }
    },
    [showToast]
  );

  const handleOpenEarly = useCallback(
    (sessionId: string) => {
      const selectedSession = sessions.find((session) => session.id === sessionId);
      if (!selectedSession) {
        showToast('Không tìm thấy thông tin phòng cần mở. Vui lòng tải lại trang.');
        return;
      }

      // Chặn dựa trên trạng thái đang hiển thị trên Dashboard.
      const currentActiveSession = sessions.find(
        (session) => session.status === 'active' && session.id !== sessionId
      );
      if (currentActiveSession) {
        showToast(
          `Không thể mở phòng ${selectedSession.roomCode}. Phòng ${currentActiveSession.roomCode} đang được giám sát.`
        );
        return;
      }

      // Đọc lại localStorage để tránh dùng trạng thái đã cũ.
      let storedRooms: RoomSession[] = [];
      try {
        const rawRooms = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
        if (rawRooms) {
          const parsedRooms: unknown = JSON.parse(rawRooms);
          if (!Array.isArray(parsedRooms)) {
            showToast('Dữ liệu phòng không hợp lệ. Không thể mở giám sát.');
            return;
          }
          storedRooms = parsedRooms as RoomSession[];
        }
      } catch {
        showToast('Không thể kiểm tra trạng thái phòng. Vui lòng thử lại.');
        return;
      }

      const activeStoredRoom = storedRooms.find(
        (room) =>
          room.status === 'in_progress' &&
          room.id.toLowerCase() !== selectedSession.roomCode.toLowerCase()
      );
      if (activeStoredRoom) {
        showToast(
          `Không thể mở phòng ${selectedSession.roomCode}. Phòng ${activeStoredRoom.id} đang được giám sát.`
        );
        return;
      }

      const selectedRoomExists = storedRooms.some(
        (room) => room.id.toLowerCase() === selectedSession.roomCode.toLowerCase()
      );
      if (selectedRoomExists) {
        const updatedRooms = storedRooms.map((room) =>
          room.id.toLowerCase() === selectedSession.roomCode.toLowerCase()
            ? { ...room, status: 'in_progress' as const }
            : room
        );
        try {
          localStorage.setItem(INSTRUCTOR_ROOMS_STORAGE_KEY, JSON.stringify(updatedRooms));
          window.dispatchEvent(new Event('storage'));
        } catch {
          showToast('Không thể lưu trạng thái phòng. Phòng chưa được mở.');
          return;
        }
      }

      setSessions((previous) =>
        previous.map((session) =>
          session.id === sessionId ? { ...session, status: 'active' } : session
        )
      );
      showToast(`Phòng ${selectedSession.roomCode} đã được mở. Bạn có thể vào giám sát.`);
    },
    [sessions, showToast]
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      {toastText && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] items-start gap-2.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-medium leading-normal text-white shadow-xl"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastText}</span>
        </div>
      )}

      {/* Page heading - Đồng bộ hoàn hảo với Admin */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-white">
            Tổng quan giảng dạy
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Xin chào, {instructorName}. Theo dõi lịch giảng dạy, tình trạng phòng và các công việc cần xử lý trong ngày.
          </p>
        </div>
        <Link
          href="/instructor/room"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Tạo phòng mới</span>
        </Link>
      </section>

      {/* One-room monitoring status */}
      {activeSession ? (
        <section className="rounded-2xl border border-red-200 bg-red-50/80 p-4 sm:p-5 dark:border-red-500/30 dark:bg-red-500/10" aria-label="Phòng đang được giám sát">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600 dark:bg-red-400" />
                  ĐANG GIÁM SÁT
                </span>
                <code className="rounded-lg bg-white/80 px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums text-slate-800 dark:bg-white/5 dark:text-slate-200">
                  {activeSession.roomCode}
                </code>
                {hasActiveSessionConflict && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    <AlertTriangle className="h-3 w-3" />
                    Dữ liệu có nhiều phiên đang mở
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold leading-relaxed text-slate-900 dark:text-slate-100 sm:text-base">
                  {activeSession.classCode} · {activeSession.title}
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {activeSession.className} · {activeSession.type === 'LAB' ? 'Thực hành Lab' : 'Bài kiểm tra'}
                </p>
              </div>
              <p className="text-xs leading-relaxed text-red-800 dark:text-red-300">
                Bạn chỉ có thể giám sát một phòng tại một thời điểm. Hãy kết thúc phiên hiện tại trước khi mở phòng khác.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:shrink-0">
              <div className="rounded-xl bg-white/80 px-3 py-2 text-xs dark:bg-white/5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sinh viên đã vào phòng</p>
                <p className="mt-0.5 font-mono text-lg font-extrabold tabular-nums text-slate-900 dark:text-slate-100">
                  {activeSession.attendedStudents}/{activeSession.totalStudents}
                </p>
              </div>
              <Link
                href={`/instructor/monitoring?room=${encodeURIComponent(activeSession.roomCode)}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-red-700"
              >
                <Video className="h-4 w-4" />
                Vào phòng giám sát
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-blue-500/30 dark:bg-blue-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Chưa có phòng nào đang giám sát</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Bạn có thể chuẩn bị nhiều phòng, nhưng chỉ kích hoạt giám sát cho một phòng tại một thời điểm.
              </p>
            </div>
          </div>
          <Link
            href="/instructor/room"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-white/5 dark:text-blue-300 dark:hover:bg-blue-500/10"
          >
            <Plus className="h-3.5 w-3.5" />
            Chuẩn bị phòng
          </Link>
        </section>
      )}

      {/* KPI cards - Chuẩn hóa đồng bộ 100% với Admin */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Tổng quan số liệu">
        {/* Card 1: Ca giảng dạy */}
        <Link
          href="/instructor/schedules"
          className="rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)] transition-all hover:border-blue-400 hover:shadow-md dark:border-white/10 dark:bg-[#0d1017] dark:hover:border-blue-500/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb] dark:bg-blue-500/15 dark:text-blue-400">
              <CalendarDays className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Ca giảng dạy
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white font-mono">
              {sessions.length}
            </span>
            <span className="text-xs font-semibold text-[#2563eb] dark:text-blue-400">
              Trong danh sách hiện tại
            </span>
          </div>
        </Link>

        {/* Card 2: Cảnh báo AI chờ duyệt */}
        <Link
          href="/instructor/reports"
          className="rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)] transition-all hover:border-amber-400 hover:shadow-md dark:border-white/10 dark:bg-[#0d1017] dark:hover:border-amber-500/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fffbeb] text-[#d97706] dark:bg-amber-500/15 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Cảnh báo AI chờ duyệt
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white font-mono">
              {pendingViolations.length}
            </span>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Cần giảng viên thẩm định
            </span>
          </div>
        </Link>

        {/* Card 3: Phòng đang giám sát */}
        <Link
          href="/instructor/monitoring"
          className="rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)] transition-all hover:border-red-400 hover:shadow-md dark:border-white/10 dark:bg-[#0d1017] dark:hover:border-red-500/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#059669] dark:bg-emerald-500/15 dark:text-emerald-400">
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Phòng đang giám sát
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white font-mono">
              {activeSessions.length}<span className="text-sm font-bold text-slate-400">/1</span>
            </span>
            <span className="text-xs font-semibold text-[#059669] dark:text-emerald-400">
              Giới hạn một phiên đồng thời
            </span>
          </div>
        </Link>

        {/* Card 4: Tỷ lệ điểm danh */}
        <Link
          href="/instructor/classes"
          className="rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)] transition-all hover:border-emerald-400 hover:shadow-md dark:border-white/10 dark:bg-[#0d1017] dark:hover:border-emerald-500/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0fdf4] text-[#16a34a] dark:bg-emerald-500/15 dark:text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tỷ lệ điểm danh
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white font-mono">
              {attendanceRate.toFixed(1)}%
            </span>
            <span className="text-xs font-semibold text-[#16a34a] dark:text-emerald-400">
              {attendedStudents}/{totalStudents} sinh viên đã vào
            </span>
          </div>
        </Link>
      </section>

      {/* Schedule list and task panel */}
      <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
        <div className={`${panelClass} min-w-0 p-5 sm:p-6 xl:col-span-2`}>
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">Lịch thực hành và kiểm tra</h2>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Theo dõi trạng thái phòng, điểm danh và thao tác giám sát.</p>
            </div>
            <Link href="/instructor/schedules" className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg px-2.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10 sm:self-center">
              Xem lịch đầy đủ <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"><CalendarDays className="h-6 w-6" /></div>
              <h3 className={`mt-3 text-sm font-bold ${primaryTextClass}`}>Chưa có ca giảng dạy</h3>
              <p className={`mt-1 max-w-sm text-xs leading-relaxed ${mutedTextClass}`}>Các phòng bạn tạo sẽ xuất hiện tại đây để tiện theo dõi và quản lý.</p>
              <Link href="/instructor/room" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700"><Plus className="h-4 w-4" />Tạo phòng đầu tiên</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {sessions.map((item) => {
                const isActive = item.status === 'active';
                const isCurrentActive = isActive && activeSession?.id === item.id;
                const isDuplicateActive = isActive && !isCurrentActive;
                const isWaiting = item.status === 'waiting';
                const isCompleted = item.status === 'completed';
                const isBlockedByActive = Boolean(activeSession) && !isActive && !isCompleted;

                const statusClass = isCurrentActive
                  ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                  : isDuplicateActive || isWaiting
                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                    : isCompleted
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300';

                return (
                  <article key={item.id} className="py-4 first:pt-4 last:pb-0">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${item.type === 'EXAM' ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'}`}>
                              {item.type === 'EXAM' ? 'Kiểm tra' : 'Thực hành Lab'}
                            </span>
                            {item.isSample && (
                              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                Lịch minh họa
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold ${statusClass}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isCurrentActive ? 'animate-pulse bg-red-600 dark:bg-red-400' : isWaiting || isDuplicateActive ? 'bg-amber-500' : isCompleted ? 'bg-emerald-600' : 'bg-blue-600'}`} />
                              {isCurrentActive ? 'Đang giám sát' : isDuplicateActive ? 'Trùng trạng thái giám sát' : isWaiting ? 'Đang chờ điểm danh' : isCompleted ? 'Đã kết thúc' : 'Chưa mở'}
                            </span>
                          </div>
                          <h3 className={`text-sm font-bold leading-relaxed ${primaryTextClass}`}>{item.classCode} · {item.title}</h3>
                          <p className={`mt-0.5 text-xs leading-relaxed ${mutedTextClass}`}>{item.className}</p>
                        </div>
                        <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs ${mutedTextClass}`}><Clock3 className="h-3.5 w-3.5" />{item.time}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-slate-50/80 px-3 py-2.5 text-xs dark:bg-white/[0.04]">
                        <div className="flex items-center gap-1.5">
                          <span className={mutedTextClass}>Mã phòng</span>
                          <code className="font-mono font-bold tabular-nums text-slate-800 dark:text-slate-200">{item.roomCode}</code>
                          <button type="button" onClick={() => copyToClipboard(item.roomCode, `${item.id}-room`, 'mã phòng')} aria-label={`Sao chép mã phòng ${item.roomCode}`} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-blue-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-blue-300">
                            {copiedId === `${item.id}-room` ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <span className="hidden h-4 w-px bg-slate-200 dark:bg-white/10 sm:block" />
                        <div className="flex items-center gap-1.5">
                          <span className={mutedTextClass}>PIN</span>
                          <code className="font-mono font-bold tabular-nums text-slate-800 dark:text-slate-200">{item.pin}</code>
                          <button type="button" onClick={() => copyToClipboard(item.pin, `${item.id}-pin`, 'mã PIN')} aria-label={`Sao chép PIN phòng ${item.roomCode}`} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-blue-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-blue-300">
                            {copiedId === `${item.id}-pin` ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <span className="hidden h-4 w-px bg-slate-200 dark:bg-white/10 sm:block" />
                        <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" /><span className={mutedTextClass}>Điểm danh</span><strong className="font-mono font-bold tabular-nums text-slate-800 dark:text-slate-200">{item.attendedStudents}/{item.totalStudents}</strong></div>
                        <span className={`inline-flex items-center gap-1 ${item.isAiProctored ? 'text-violet-700 dark:text-violet-300' : 'text-slate-500 dark:text-slate-400'}`}>
                          {item.isAiProctored ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                          {item.isAiProctored ? 'AI Proctoring' : 'Lab tiêu chuẩn'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className={`text-[11px] leading-relaxed ${mutedTextClass}`}>
                          {isBlockedByActive ? `Phòng ${activeSession?.roomCode} đang giám sát. Bạn vẫn có thể chuẩn bị phòng này nhưng chưa thể kích hoạt.` : isDuplicateActive ? 'Cần kiểm tra dữ liệu vì đang có hơn một phòng mang trạng thái giám sát.' : isCurrentActive ? 'Đây là phòng giám sát duy nhất đang hoạt động.' : 'Có thể vào phòng chờ để điểm danh hoặc chuẩn bị cấu hình.'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          {isCurrentActive ? (
                            <Link href={`/instructor/monitoring?room=${encodeURIComponent(item.roomCode)}`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700"><Video className="h-3.5 w-3.5" />Vào giám sát</Link>
                          ) : isDuplicateActive ? (
                            <button type="button" disabled className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-400 dark:bg-white/5 dark:text-slate-500"><LockKeyhole className="h-3.5 w-3.5" />Tạm khóa do trùng phiên</button>
                          ) : isWaiting ? (
                            <Link href={`/instructor/room/${encodeURIComponent(item.roomCode)}`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/15"><Users className="h-3.5 w-3.5" />Vào phòng chờ</Link>
                          ) : !isCompleted ? (
                            <>
                              <Link href={`/instructor/room?class=${encodeURIComponent(item.classCode.split('-')[0])}`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"><Radio className="h-3.5 w-3.5" />Thiết lập</Link>
                              <button type="button" onClick={() => handleOpenEarly(item.id)} disabled={isBlockedByActive} title={isBlockedByActive ? `Phòng ${activeSession?.roomCode} đang được giám sát` : 'Mở nhanh phòng này'} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-white/10 dark:disabled:text-slate-500">
                                {isBlockedByActive ? <LockKeyhole className="h-3.5 w-3.5" /> : <Radio className="h-3.5 w-3.5" />}{isBlockedByActive ? 'Đang bị khóa' : 'Mở phòng nhanh'}
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />Đã hoàn tất</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <section className={`${panelClass} p-5 sm:p-6`}>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-white/10">
              <div>
                <h2 className="flex items-center gap-2 text-[16px] font-bold text-slate-900 dark:text-white">
                  <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Việc cần xử lý
                </h2>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Các đầu việc cần giảng viên chú ý</p>
              </div>
              <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">3 việc</span>
            </div>
            <div className="space-y-3 pt-3">
              <div className="rounded-xl border-l-4 border-red-500 bg-slate-50/80 p-3 dark:bg-white/[0.04]">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className={`text-xs font-bold ${primaryTextClass}`}>Thẩm định cảnh báo AI</h3><span className="rounded-lg bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/10 dark:text-red-300">Ưu tiên cao</span></div>
                <p className={`mt-1 text-xs leading-relaxed ${mutedTextClass}`}>{pendingViolations.length} cảnh báo đang chờ giảng viên xem xét và xử lý.</p>
                <Link href="/instructor/reports" className="mt-2 inline-flex h-8 items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300">Xem cảnh báo <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
              <div className="rounded-xl border-l-4 border-amber-500 bg-slate-50/80 p-3 dark:bg-white/[0.04]">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className={`text-xs font-bold ${primaryTextClass}`}>Kiểm tra kết quả bài làm</h3><span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">Chờ xử lý</span></div>
                <p className={`mt-1 text-xs leading-relaxed ${mutedTextClass}`}>Kiểm tra kết quả chấm và trạng thái công bố điểm của các ca đã hoàn thành.</p>
                <Link href="/instructor/reports" className="mt-2 inline-flex h-8 items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300">Mở báo cáo <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
              <div className="rounded-xl border-l-4 border-blue-500 bg-slate-50/80 p-3 dark:bg-white/[0.04]">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className={`text-xs font-bold ${primaryTextClass}`}>Rà soát đề và test case</h3><span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">Chuẩn bị</span></div>
                <p className={`mt-1 text-xs leading-relaxed ${mutedTextClass}`}>Kiểm tra câu hỏi, test case công khai và test case ẩn trước khi mở ca.</p>
                <Link href="/instructor/questions" className="mt-2 inline-flex h-8 items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300">Mở ngân hàng câu hỏi <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
            </div>
          </section>

          <section className={`${panelClass} p-4 sm:p-5`}>
            <div className="border-b border-slate-100 pb-3 dark:border-white/10">
              <h2 className={`text-sm font-bold ${primaryTextClass}`}>Truy cập nhanh</h2>
              <p className={`mt-0.5 text-[11px] ${mutedTextClass}`}>Đi đến các khu vực thường dùng</p>
            </div>
            <div className="space-y-1.5 pt-3">
              <Link href="/instructor/classes" className="group flex min-h-10 items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"><span className="flex min-w-0 items-center gap-2.5"><Table2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" /><span className="truncate">Lớp học và điểm danh</span></span><ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" /></Link>
              <Link href="/instructor/questions" className="group flex min-h-10 items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"><span className="flex min-w-0 items-center gap-2.5"><FileCode2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" /><span className="truncate">Ngân hàng câu hỏi</span></span><ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" /></Link>
              <Link href="/instructor/schedules" className="group flex min-h-10 items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"><span className="flex min-w-0 items-center gap-2.5"><Clock3 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" /><span className="truncate">Lịch và phiên kiểm tra</span></span><ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" /></Link>
              <Link href="/instructor/reports" className="group flex min-h-10 items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"><span className="flex min-w-0 items-center gap-2.5"><BookOpen className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" /><span className="truncate">Kết quả và báo cáo</span></span><ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" /></Link>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
