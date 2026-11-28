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
import {
  isRoomCurrentlyRunning,
} from '@/components/instructor/classes/types';
import { fetchWithAuth } from '@/services/apiClient';
import {
  DEFAULT_INSTRUCTOR_PROFILE_NAME,
  INSTRUCTOR_PROFILE_UPDATED_EVENT,
  readInstructorProfileIdentity,
} from '@/utils/instructorProfile';

interface TodaySessionItem {
  id: string;
  roomId?: number;
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
  pendingViolationsCount?: number;
  hasClass: boolean;
}

const panelClass =
  'rounded-md border border-slate-300 bg-white shadow-2xs dark:border-white/10 dark:bg-neutral-900 transition-colors';
const mutedTextClass = 'text-stone-500 dark:text-stone-400';
const primaryTextClass = 'text-stone-900 dark:text-stone-100';

function formatTimeDisplay(isoDateStr?: string): string {
  if (!isoDateStr) return 'Hôm nay';
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return 'Hôm nay';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${hours}:${minutes} (${day}/${month})`;
  } catch {
    return 'Hôm nay';
  }
}

function mapBackendRoomToDashboardSession(room: any, trustRunningStatus = true): TodaySessionItem {
  let status: TodaySessionItem['status'] = 'upcoming';
  const rawStatus = (room.status || '').toLowerCase();
  if (trustRunningStatus && isRoomCurrentlyRunning(room)) {
    status = 'active';
  } else if (rawStatus === 'dang_dien_ra' || rawStatus === 'in_progress') {
    status = 'completed';
  } else if (rawStatus === 'chua_mo' || rawStatus === 'waiting') {
    status = 'waiting';
  } else if (rawStatus === 'da_dong' || rawStatus === 'ended' || rawStatus === 'completed') {
    status = 'completed';
  } else {
    status = 'upcoming';
  }

  let proctoringCfg: any = null;
  if (room.proctoring_config) {
    try {
      proctoringCfg =
        typeof room.proctoring_config === 'string'
          ? JSON.parse(room.proctoring_config)
          : room.proctoring_config;
    } catch {
      // ignore
    }
  }

  const isAiProctored = Boolean(
    proctoringCfg?.aiFaceDetection || proctoringCfg?.aiObjectDetection
  );
  const duration = room.duration_minutes || 60;

  return {
    id: String(room.room_id || room.room_code),
    roomId: room.room_id,
    classCode: room.class_code || room.classId || 'Lớp HP',
    className: room.class_name || room.room_name || 'Phòng học',
    title: room.room_name,
    type: room.room_type === 'exam' ? 'EXAM' : 'LAB',
    time: `${duration} phút • ${formatTimeDisplay(room.start_time)}`,
    roomCode: room.room_code,
    pin: room.passcode || '------',
    status,
    totalStudents: room.total_students || 0,
    attendedStudents: room.attended_students || 0,
    unattendedCount: Math.max(0, (room.total_students || 0) - (room.attended_students || 0)),
    isAiProctored,
    pendingViolationsCount: room.pending_violations || 0,
    hasClass: room.class_id != null || Boolean(room.class_code || room.classId),
  };
}

export default function InstructorDashboardPage() {
  const [instructorName, setInstructorName] = useState(DEFAULT_INSTRUCTOR_PROFILE_NAME);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TodaySessionItem[]>([]);
  const [assignedClassCount, setAssignedClassCount] = useState(0);
  const [totalAssignedStudents, setTotalAssignedStudents] = useState(0);
  const [questionBankStats, setQuestionBankStats] = useState({ total: 0, lab: 0, exam: 0 });
  const [loading, setLoading] = useState(true);
  const { violations } = useMonitoring();

  const pendingViolations = useMemo(
    () => violations.filter((violation) => violation.status === 'pending'),
    [violations]
  );
  const totalPendingViolations = useMemo(
    () =>
      sessions.reduce((total, session) => total + (session.pendingViolationsCount || 0), 0) +
      pendingViolations.length,
    [sessions, pendingViolations]
  );
  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === 'active'),
    [sessions]
  );
  const visibleSessions = useMemo(
    () => sessions.filter((session) => session.status !== 'completed'),
    [sessions]
  );
  const lockSession = activeSessions[0];
  const activeSession = activeSessions.find((session) => session.hasClass);
  const hasActiveSessionConflict = activeSessions.length > 1;

  const showToast = useCallback((message: string) => {
    setToastText(message);
    window.setTimeout(() => setToastText(null), 3500);
  }, []);

  const loadRooms = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [data, classList, templateList] = await Promise.all([
        fetchWithAuth<any[]>('/api/v1/rooms'),
        fetchWithAuth<any[]>('/api/v1/classes').catch(() => []),
        fetchWithAuth<any[]>('/api/v1/templates').catch(() => null),
      ]);
      if (Array.isArray(classList)) {
        setAssignedClassCount(classList.length);
        setTotalAssignedStudents(
          classList.reduce((sum, cls) => sum + Number(cls.student_count || 0), 0)
        );
      }
      if (Array.isArray(templateList)) {
        const total = templateList.length;
        const lab = templateList.filter((t) => t?.type === 'lab').length;
        setQuestionBankStats({ total, lab, exam: total - lab });
      }
      if (Array.isArray(data)) {
        const mapped = data.map((room) => mapBackendRoomToDashboardSession(room));
        const statusPriority: Record<TodaySessionItem['status'], number> = {
          active: 0,
          waiting: 1,
          upcoming: 2,
          completed: 3,
        };
        mapped.sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);
        setSessions(mapped);
      }
    } catch {
      setSessions([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const syncInstructorName = () => {
      setInstructorName(readInstructorProfileIdentity().name);
    };

    syncInstructorName();
    window.addEventListener('storage', syncInstructorName);
    window.addEventListener(INSTRUCTOR_PROFILE_UPDATED_EVENT, syncInstructorName);

    loadRooms();
    const interval = window.setInterval(() => loadRooms(false), 10000);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', syncInstructorName);
      window.removeEventListener(INSTRUCTOR_PROFILE_UPDATED_EVENT, syncInstructorName);
    };
  }, [loadRooms]);

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
    async (sessionId: string) => {
      const selectedSession = sessions.find((session) => session.id === sessionId);
      if (!selectedSession) {
        showToast('Không tìm thấy thông tin phòng cần mở. Vui lòng tải lại trang.');
        return;
      }

      if (!selectedSession.roomId) {
        showToast('Không tìm thấy mã định danh phòng.');
        return;
      }

      try {
        await fetchWithAuth(`/api/v1/rooms/${selectedSession.roomId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'dang_dien_ra' }),
        });

        setSessions((previous) =>
          previous.map((session) =>
            session.id === sessionId ? { ...session, status: 'active' } : session
          )
        );
        showToast(`Phòng ${selectedSession.roomCode} đã được mở thành công.`);
      } catch (err: any) {
        const detailMsg =
          err?.detail?.message ||
          (typeof err?.detail === 'string' ? err?.detail : null) ||
          err?.message ||
          'Không thể mở phòng.';
        showToast(detailMsg);
      }
    },
    [sessions, showToast]
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      {toastText && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-md border border-slate-300 border-l-4 border-l-[#91040A] bg-white px-4 py-3 text-xs shadow-lg dark:border-white/10 dark:border-l-[#fca5a5] dark:bg-neutral-900"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-brand-50 text-brand-700 shrink-0 dark:bg-brand-500/10 dark:text-brand-200">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-serif text-xs font-bold text-[#2A282D] dark:text-white">Thông báo</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">{toastText}</p>
          </div>
        </aside>
      )}

      {/* Page heading - Đồng bộ hoàn hảo với Admin */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[22px] font-serif font-bold tracking-tight text-[#2A282D] dark:text-white">
            Tổng quan giảng dạy
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#a59fa3]">
            Xin chào, {instructorName}. Theo dõi lịch giảng dạy, tình trạng phòng và các công việc cần xử lý trong ngày.
          </p>
        </div>
        <Link
          href="/instructor/room"
          className="system-primary-action inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          <span>Tạo phòng mới</span>
        </Link>
      </section>

      {/* One-room monitoring status */}
      {activeSession ? (
        <section className="rounded-md border border-red-200 bg-red-50/80 p-4 sm:p-5 dark:border-red-500/30 dark:bg-red-500/10" aria-label="Phòng đang được giám sát">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1 text-[11px] font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-400" />
                  ĐANG GIÁM SÁT
                </span>
                <code className="rounded bg-white/80 px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums text-slate-800 dark:bg-white/5 dark:text-slate-200">
                  {activeSession.roomCode}
                </code>
                {hasActiveSessionConflict && (
                  <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
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
              <div className="rounded-md bg-white/80 px-3 py-2 text-xs dark:bg-white/5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sinh viên đã vào phòng</p>
                <p className="mt-0.5 font-mono text-lg font-extrabold tabular-nums text-slate-900 dark:text-slate-100">
                  {activeSession.attendedStudents}/{activeSession.totalStudents}
                </p>
              </div>
              <Link
                href={`/instructor/monitoring?room=${encodeURIComponent(activeSession.roomCode)}`}
                className="system-primary-action inline-flex h-11 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-red-700"
              >
                <Video className="h-4 w-4" />
                Vào phòng giám sát
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-md border border-brand/25 bg-brand-50/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-brand-500/30 dark:bg-brand-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-white dark:bg-brand-500/20 dark:text-brand-200">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">Chưa có phòng nào đang giám sát</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                Bạn có thể chuẩn bị nhiều phòng, nhưng chỉ kích hoạt giám sát cho một phòng tại một thời điểm.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* KPI cards - Chuẩn hóa đồng bộ 100% với phong cách cổ điển học thuật */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 items-stretch" aria-label="Tổng quan số liệu">
        {/* Card 1: Ngân hàng đề & câu hỏi */}
        <Link
          href="/instructor/questions"
          className="flex flex-col justify-between h-full rounded-md border border-slate-300 bg-white p-5 shadow-2xs transition-all hover:border-slate-900 dark:border-white/10 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-xs font-serif font-semibold text-stone-500 dark:text-stone-400">
              Ngân hàng đề &amp; câu hỏi
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-[30px] font-extrabold leading-none tracking-tight text-stone-900 dark:text-white font-mono">
              {questionBankStats.total}
            </span>
            <span className="text-xs font-serif font-semibold text-slate-900 dark:text-rose-300">
              {questionBankStats.lab} đề thực hành · {questionBankStats.exam} đề thi
            </span>
          </div>
        </Link>

        {/* Card 2: Cảnh báo AI chờ duyệt */}
        <Link
          href="/instructor/reports"
          className="flex flex-col justify-between h-full rounded-md border border-slate-300 bg-white p-5 shadow-2xs transition-all hover:border-slate-800 dark:border-white/10 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <span className="text-xs font-serif font-semibold text-stone-500 dark:text-stone-400">
              Cảnh báo AI chờ duyệt
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-[30px] font-extrabold leading-none tracking-tight text-stone-900 dark:text-white font-mono">
              {totalPendingViolations}
            </span>
            <span className="text-xs font-serif font-semibold text-slate-800 dark:text-rose-300">
              Cần giảng viên thẩm định
            </span>
          </div>
        </Link>

        {/* Card 3: Phòng đang giám sát */}
        <Link
          href="/instructor/monitoring"
          className="flex flex-col justify-between h-full rounded-md border border-slate-300 bg-white p-5 shadow-2xs transition-all hover:border-slate-900 dark:border-white/10 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-xs font-serif font-semibold text-stone-500 dark:text-stone-400">
              Phòng đang giám sát
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-[30px] font-extrabold leading-none tracking-tight text-stone-900 dark:text-white font-mono">
              {activeSessions.length}<span className="text-sm font-bold text-stone-400 font-mono">/1</span>
            </span>
            <span className="text-xs font-serif font-semibold text-slate-900 dark:text-rose-300">
              Giới hạn một phiên đồng thời
            </span>
          </div>
        </Link>

        {/* Card 4: Lớp học phần phụ trách */}
        <Link
          href="/instructor/classes"
          className="flex flex-col justify-between h-full rounded-md border border-slate-300 bg-white p-5 shadow-2xs transition-all hover:border-slate-900/40 dark:border-white/10 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-700 dark:bg-white/5 dark:text-slate-300 border border-slate-300 dark:border-white/10">
              <Table2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-serif font-semibold text-stone-500 dark:text-stone-400">
              Lớp học phần phụ trách
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-[30px] font-extrabold leading-none tracking-tight text-stone-900 dark:text-white font-mono">
              {assignedClassCount}
            </span>
            <span className="text-xs font-serif font-semibold text-slate-600 dark:text-slate-400">
              {totalAssignedStudents} sinh viên đang theo học
            </span>
          </div>
        </Link>
      </section>

      {/* Truy cập nhanh - Đặt nổi bật ngay dưới hàng KPI */}
      <section aria-label="Truy cập nhanh" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link
          href="/instructor/classes"
          className="group flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-brand/40 hover:bg-brand-50/40 hover:text-brand-700 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-brand-500/10 dark:hover:text-brand-200"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Table2 className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300" />
            <span className="truncate">Lớp &amp; sinh viên</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-700 dark:group-hover:text-brand-200" />
        </Link>
        <Link
          href="/instructor/questions"
          className="group flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-brand/40 hover:bg-brand-50/40 hover:text-brand-700 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-brand-500/10 dark:hover:text-brand-200"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <FileCode2 className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300" />
            <span className="truncate">Đề &amp; câu hỏi</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-700 dark:group-hover:text-brand-200" />
        </Link>
        <Link
          href="/instructor/schedules"
          className="group flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-brand/40 hover:bg-brand-50/40 hover:text-brand-700 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-brand-500/10 dark:hover:text-brand-200"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Clock3 className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300" />
            <span className="truncate">Lịch &amp; phiên kiểm tra</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-700 dark:group-hover:text-brand-200" />
        </Link>
        <Link
          href="/instructor/reports"
          className="group flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-brand/40 hover:bg-brand-50/40 hover:text-brand-700 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-brand-500/10 dark:hover:text-brand-200"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <BookOpen className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300" />
            <span className="truncate">Kết quả &amp; báo cáo</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-700 dark:group-hover:text-brand-200" />
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
            <Link href="/instructor/schedules" className="inline-flex h-9 items-center gap-1.5 self-start rounded px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 sm:self-center">
              Xem lịch đầy đủ <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex h-36 items-center justify-center text-xs font-semibold text-slate-400">
              Đang tải danh sách ca giảng dạy...
            </div>
          ) : visibleSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"><CalendarDays className="h-6 w-6" /></div>
              <h3 className={`mt-3 font-serif text-sm font-bold ${primaryTextClass}`}>
                {sessions.length > 0 ? 'Không có phòng cần theo dõi' : 'Chưa có ca giảng dạy'}
              </h3>
              <p className={`mt-1 max-w-sm text-xs leading-relaxed ${mutedTextClass}`}>
                {sessions.length > 0
                  ? 'Các phòng đã kết thúc được lưu trong tab Lịch sử.'
                  : 'Các phòng bạn tạo sẽ xuất hiện tại đây để tiện theo dõi và quản lý.'}
              </p>
              <Link
                href={sessions.length > 0 ? '/instructor/schedules' : '/instructor/room'}
                className="system-primary-action mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                {sessions.length > 0 ? <CalendarDays className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {sessions.length > 0 ? 'Xem lịch sử' : 'Tạo phòng đầu tiên'}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {visibleSessions.map((item) => {
                const isActive = item.status === 'active';
                const isCurrentActive = isActive && lockSession?.id === item.id;
                const isDuplicateActive = isActive && !isCurrentActive;
                const isWaiting = item.status === 'waiting';
                const isCompleted = item.status === 'completed';
                const isBlockedByActive = Boolean(lockSession) && !isActive && !isCompleted;

                const statusClass = 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300';

                return (
                  <article key={item.id} className="py-4 first:pt-4 last:pb-0">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:bg-white/10 dark:text-slate-300">
                              {item.type === 'EXAM' ? 'Kiểm tra' : 'Thực hành Lab'}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-bold ${statusClass}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                              {isCurrentActive ? 'Đang giám sát' : isDuplicateActive ? 'Trùng trạng thái giám sát' : isWaiting ? 'Đang chờ điểm danh' : isCompleted ? 'Đã kết thúc' : 'Chưa mở'}
                            </span>
                          </div>
                          <h3 className={`text-sm font-bold leading-relaxed ${primaryTextClass}`}>{item.classCode} · {item.title}</h3>
                          <p className={`mt-0.5 text-xs leading-relaxed ${mutedTextClass}`}>{item.className}</p>
                        </div>
                        <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs ${mutedTextClass}`}><Clock3 className="h-3.5 w-3.5" />{item.time}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-slate-50/80 px-3 py-2.5 text-xs dark:bg-white/[0.04]">
                        <div className="flex items-center gap-1.5">
                          <span className={mutedTextClass}>Mã phòng</span>
                          <code className="font-mono font-bold tabular-nums text-slate-800 dark:text-slate-200">{item.roomCode}</code>
                          <button type="button" onClick={() => copyToClipboard(item.roomCode, `${item.id}-room`, 'mã phòng')} aria-label={`Sao chép mã phòng ${item.roomCode}`} className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-500 transition hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white">
                            {copiedId === `${item.id}-room` ? <Check className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <span className="hidden h-4 w-px bg-slate-200 dark:bg-white/10 sm:block" />
                        <div className="flex items-center gap-1.5">
                          <span className={mutedTextClass}>PIN</span>
                          <code className="font-mono font-bold tabular-nums text-slate-800 dark:text-slate-200">{item.pin}</code>
                          <button type="button" onClick={() => copyToClipboard(item.pin, `${item.id}-pin`, 'mã PIN')} aria-label={`Sao chép PIN phòng ${item.roomCode}`} className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-500 transition hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white">
                            {copiedId === `${item.id}-pin` ? <Check className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <span className="hidden h-4 w-px bg-slate-200 dark:bg-white/10 sm:block" />
                        <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" /><span className={mutedTextClass}>Điểm danh</span><strong className="font-mono font-bold tabular-nums text-slate-800 dark:text-slate-200">{item.attendedStudents}/{item.totalStudents}</strong></div>
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          {item.isAiProctored ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                          {item.isAiProctored ? 'AI Proctoring' : 'Lab tiêu chuẩn'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className={`text-[11px] leading-relaxed ${mutedTextClass}`}>
                          {isBlockedByActive ? `Tạm khóa vì mỗi giảng viên chỉ có thể giám sát một phòng tại một thời điểm. Hãy kết thúc phòng ${lockSession?.roomCode} trước khi kích hoạt phiên này.` : isDuplicateActive ? 'Dữ liệu đang ghi nhận nhiều phòng cùng hoạt động; chỉ một phòng có thể được giám sát tại một thời điểm.' : isCurrentActive ? 'Đây là phòng giám sát duy nhất đang hoạt động.' : 'Có thể vào phòng chờ để điểm danh hoặc chuẩn bị cấu hình.'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          {isCurrentActive ? (
                            <Link href={`/instructor/monitoring?room=${encodeURIComponent(item.roomCode)}`} className="system-primary-action inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-slate-800 px-3 text-xs font-serif font-bold text-white transition hover:bg-slate-900"><Video className="h-3.5 w-3.5" />Vào giám sát</Link>
                          ) : isDuplicateActive ? (
                            <button type="button" disabled className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-md bg-stone-100 px-3 text-xs font-serif font-semibold text-stone-400 dark:bg-white/5 dark:text-stone-500"><LockKeyhole className="h-3.5 w-3.5" />Tạm khóa do trùng phiên</button>
                          ) : isWaiting ? (
                            <Link href={`/instructor/room/${encodeURIComponent(item.roomCode)}`} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-serif font-semibold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-brand-500/10 dark:hover:text-brand-200"><Users className="h-3.5 w-3.5" />Vào phòng chờ</Link>
                          ) : !isCompleted ? (
                            <>
                              <Link href={`/instructor/room?class=${encodeURIComponent(item.classCode.split('-')[0])}`} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-serif font-semibold text-stone-700 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-stone-200"><Radio className="h-3.5 w-3.5" />Thiết lập</Link>
                              <button type="button" onClick={() => handleOpenEarly(item.id)} disabled={isBlockedByActive} title={isBlockedByActive ? `Phòng ${lockSession?.roomCode} đang được giám sát` : 'Mở nhanh phòng này'} className="system-primary-action inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-serif font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500 dark:disabled:bg-white/10 dark:disabled:text-stone-500">
                                {isBlockedByActive ? <LockKeyhole className="h-3.5 w-3.5" /> : <Radio className="h-3.5 w-3.5" />}{isBlockedByActive ? 'Đang bị khóa' : 'Mở phòng nhanh'}
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-100 px-3 text-xs font-serif font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300 border border-slate-200 dark:border-white/10"><CheckCircle2 className="h-3.5 w-3.5" />Đã hoàn tất</span>
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
          {(() => {
            const waitingSessions = sessions.filter((s) => s.status === 'waiting');
            const realTasks: Array<{
              key: string;
              title: string;
              desc: string;
              badge: string;
              href: string;
              cta: string;
              tone: 'brand' | 'amber' | 'emerald';
            }> = [];

            if (activeSession) {
              realTasks.push({
                key: 'active-room',
                title: `Đang giám sát phòng ${activeSession.roomCode}`,
                desc: `${activeSession.attendedStudents}/${activeSession.totalStudents} sinh viên đã vào phòng ${activeSession.classCode}.`,
                badge: 'Đang Live',
                href: `/instructor/monitoring?room=${encodeURIComponent(activeSession.roomCode)}`,
                cta: 'Vào giám sát',
                tone: 'emerald',
              });
            }
            if (totalPendingViolations > 0) {
              realTasks.push({
                key: 'pending-violations',
                title: 'Thẩm định cảnh báo AI',
                desc: `Có ${totalPendingViolations} cảnh báo vi phạm đang chờ giảng viên xem xét và lập biên bản.`,
                badge: 'Ưu tiên cao',
                href: '/instructor/reports',
                cta: 'Xem cảnh báo',
                tone: 'brand',
              });
            }
            if (waitingSessions.length > 0) {
              realTasks.push({
                key: 'waiting-rooms',
                title: 'Phòng chờ đang mở điểm danh',
                desc: `Có ${waitingSessions.length} phòng đang ở trạng thái phòng chờ (${waitingSessions[0].roomCode}).`,
                badge: 'Sẵn sàng',
                href: `/instructor/room/${encodeURIComponent(waitingSessions[0].roomCode)}`,
                cta: 'Vào phòng chờ',
                tone: 'amber',
              });
            }

            return (
              <section className={`${panelClass} p-5 sm:p-6`}>
                <div className="flex items-center justify-between gap-2 border-b border-slate-300 pb-3 dark:border-white/10">
                  <div>
                    <h2 className="flex items-center gap-2 font-serif text-[16px] font-bold text-slate-900 dark:text-white">
                      <BellRing className="h-4 w-4 text-brand-700 dark:text-[#b4687d]" />
                      Việc cần xử lý
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">Tổng hợp tự động từ phòng thi &amp; cảnh báo AI</p>
                  </div>
                  <span className="rounded border border-brand/25 bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                    {realTasks.length} việc
                  </span>
                </div>
                <div className="space-y-3 pt-3">
                  {realTasks.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                      Không có công việc tồn đọng. Mọi ca thi và cảnh báo AI đã được xử lý.
                    </div>
                  ) : (
                    realTasks.map((t) => (
                      <div
                        key={t.key}
                        className={`rounded-md border border-slate-300 border-l-2 p-3 dark:border-white/10 ${
                          t.tone === 'brand'
                            ? 'border-l-brand bg-brand-50/30 dark:border-l-brand dark:bg-brand-500/5'
                            : t.tone === 'amber'
                            ? 'border-l-amber-500 bg-amber-50/30 dark:border-l-amber-400 dark:bg-amber-500/5'
                            : 'border-l-emerald-500 bg-emerald-50/30 dark:border-l-emerald-400 dark:bg-emerald-500/5'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className={`text-xs font-bold ${primaryTextClass}`}>{t.title}</h3>
                          <span
                            className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                              t.tone === 'brand'
                                ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300'
                                : t.tone === 'amber'
                                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300'
                            }`}
                          >
                            {t.badge}
                          </span>
                        </div>
                        <p className={`mt-1 text-xs leading-relaxed ${mutedTextClass}`}>{t.desc}</p>
                        <Link
                          href={t.href}
                          className="mt-2 inline-flex h-8 items-center gap-1 text-xs font-bold text-brand-700 hover:underline dark:text-[#e5a9b9]"
                        >
                          {t.cta} <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </section>
            );
          })()}
        </div>
      </section>
    </div>
  );
}
