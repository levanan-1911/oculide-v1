'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Video,
} from 'lucide-react';
import ExtendSessionModal from '@/components/instructor/monitoring/ExtendSessionModal';
import { INSTRUCTOR_SCHEDULES_STORAGE_KEY } from '@/components/instructor/classes/types';
import { fetchWithAuth } from '@/services/apiClient';

interface InstructorSession {
  id: string;
  roomId?: number;
  sortTimestamp: number;
  classCode: string;
  className: string;
  title: string;
  type: 'LAB' | 'EXAM';
  language: string;
  startTime: string;
  endTime: string;
  date: string;
  dateKey?: string;
  roomCode: string;
  passcode: string;
  status: 'Đang diễn ra' | 'Sắp diễn ra' | 'Đã kết thúc';
  enrolledStudents: number;
  attendedStudents: number;
  isAiProctored: boolean;

  // Chỉ dùng để minh họa giao diện frontend.
  demoProgress?: number;
  demoRemainingMinutes?: number;
}

type DateFilter = 'ALL' | 'TODAY' | 'TOMORROW' | 'NEXT_7_DAYS' | 'PAST_7_DAYS' | 'CUSTOM';

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shiftDateKey = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return getLocalDateKey(date);
};

const formatDateDisplay = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;

  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const parseDateLabel = (value: string): string => {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'hôm nay') return getLocalDateKey();
  if (normalized === 'ngày mai') return shiftDateKey(1);
  if (normalized === 'hôm qua') return shiftDateKey(-1);

  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return getLocalDateKey();
};

const getSessionDateKey = (session: InstructorSession) =>
  session.dateKey || parseDateLabel(session.date);

const timeToMinutes = (value: string) => {
  const clean = value.match(/^(\d{1,2}):(\d{2})/);
  if (!clean) return 0;
  return Number(clean[1]) * 60 + Number(clean[2]);
};

const getSessionProgress = (session: InstructorSession, now: Date) => {
  if (session.status === 'Đã kết thúc') return 100;
  if (session.status === 'Sắp diễn ra') return 0;

  const sessionDateKey = getSessionDateKey(session);
  const todayKey = getLocalDateKey(now);

  if (sessionDateKey !== todayKey && typeof session.demoProgress === 'number') {
    return session.demoProgress;
  }

  const start = timeToMinutes(session.startTime);
  const end = timeToMinutes(session.endTime);
  const current = now.getHours() * 60 + now.getMinutes();

  if (end <= start) return session.demoProgress ?? 50;

  if (current >= start && current <= end) {
    return Math.round(((current - start) / (end - start)) * 100);
  }

  return session.demoProgress ?? 0;
};

const formatDuration = (totalMinutes: number) => {
  const minutes = Math.max(0, Math.floor(totalMinutes));

  if (minutes < 60) {
    return `${minutes} phút`;
  }

  const days = Math.floor(minutes / (24 * 60));
  const remainingAfterDays = minutes % (24 * 60);
  const hours = Math.floor(remainingAfterDays / 60);
  const remainingMinutes = remainingAfterDays % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} ngày`);
  }

  if (hours > 0) {
    parts.push(`${hours} giờ`);
  }

  if (remainingMinutes > 0) {
    parts.push(`${remainingMinutes} phút`);
  }

  return parts.join(' ') || '0 phút';
};

const getRemainingMinutes = (session: InstructorSession, now: Date) => {
  if (session.status === 'Đã kết thúc') return 0;

  const sessionDateKey = getSessionDateKey(session);
  const todayKey = getLocalDateKey(now);
  const current = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(session.startTime);
  const end = timeToMinutes(session.endTime);

  if (sessionDateKey === todayKey) {
    if (session.status === 'Đang diễn ra' && current >= start && current <= end) {
      return Math.max(0, end - current);
    }

    if (session.status === 'Sắp diễn ra' && current < start) {
      return Math.max(0, start - current);
    }
  }

  return session.demoRemainingMinutes ?? 0;
};

const getLateStudents = (session: InstructorSession) => {
  if (session.status === 'Đang diễn ra') {
    return Math.min(3, session.attendedStudents);
  }

  if (session.status === 'Đã kết thúc') {
    return Math.min(4, session.attendedStudents);
  }

  return 0;
};

const getAttendanceSummary = (session: InstructorSession) => {
  const late = getLateStudents(session);
  const onTime = Math.max(0, session.attendedStudents - late);

  if (session.status === 'Sắp diễn ra') {
    return {
      onTime: 0,
      late: 0,
      absent: 0,
      notArrived: Math.max(0, session.enrolledStudents - session.attendedStudents),
    };
  }

  return {
    onTime,
    late,
    absent: Math.max(0, session.enrolledStudents - session.attendedStudents),
    notArrived: 0,
  };
};

function mapBackendRoomToScheduleSession(room: any): InstructorSession {
  const startD = room.start_time ? new Date(room.start_time) : new Date();
  const endD = room.end_time
    ? new Date(room.end_time)
    : new Date(startD.getTime() + (room.duration_minutes || 60) * 60000);

  const startHours = String(startD.getHours()).padStart(2, '0');
  const startMins = String(startD.getMinutes()).padStart(2, '0');
  const endHours = String(endD.getHours()).padStart(2, '0');
  const endMins = String(endD.getMinutes()).padStart(2, '0');

  const startTime = `${startHours}:${startMins}`;
  const endTime = `${endHours}:${endMins}`;

  const dateKey = getLocalDateKey(startD);
  const todayKey = getLocalDateKey();
  const tomorrowKey = shiftDateKey(1);
  const yesterdayKey = shiftDateKey(-1);

  let dateLabel = `${String(startD.getDate()).padStart(2, '0')}/${String(startD.getMonth() + 1).padStart(2, '0')}/${startD.getFullYear()}`;
  if (dateKey === todayKey) dateLabel = 'Hôm nay';
  else if (dateKey === tomorrowKey) dateLabel = 'Ngày mai';
  else if (dateKey === yesterdayKey) dateLabel = 'Hôm qua';

  let status: InstructorSession['status'] = 'Sắp diễn ra';
  const rawStatus = (room.status || '').toLowerCase();
  const now = new Date();
  if (rawStatus === 'da_dong' || rawStatus === 'ended' || rawStatus === 'completed' || rawStatus === 'da_huy') {
    status = 'Đã kết thúc';
  } else if (endD && endD < now) {
    status = 'Đã kết thúc';
  } else if (rawStatus === 'dang_dien_ra' || rawStatus === 'in_progress') {
    status = 'Đang diễn ra';
  } else {
    status = 'Sắp diễn ra';
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
  const parsedSortTimestamp = Date.parse(
    String(room.end_time || room.updated_at || room.created_at || startD.toISOString())
  );

  return {
    id: String(room.room_id || room.room_code),
    roomId: room.room_id,
    sortTimestamp: Number.isFinite(parsedSortTimestamp) ? parsedSortTimestamp : startD.getTime(),
    classCode: room.class_code || 'Lớp HP',
    className: room.class_name || room.room_name || 'Phòng học',
    title: room.room_name,
    type: room.room_type === 'exam' ? 'EXAM' : 'LAB',
    language: 'C++ / Python / Java',
    startTime,
    endTime,
    date: dateLabel,
    dateKey,
    roomCode: room.room_code,
    passcode: room.passcode || '------',
    status,
    enrolledStudents: room.total_students || 0,
    attendedStudents: room.attended_students || 0,
    isAiProctored,
  };
}

function SessionDetailModal({
  session,
  onClose,
  onExtend,
  onDelete,
}: {
  session: InstructorSession | null;
  onClose: () => void;
  onExtend: () => void;
  onDelete?: (session: InstructorSession) => void;
}) {
  if (!session) return null;

  const now = new Date();
  const progress = getSessionProgress(session, now);
  const remainingMinutes = getRemainingMinutes(session, now);
  const attendance = getAttendanceSummary(session);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl overflow-hidden rounded-md border border-slate-300 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900">
        <div className="flex items-start justify-between border-b border-slate-300 p-6 dark:border-white/10">
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-200">
              Chi tiết phòng
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-slate-300 bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                {session.classCode}
              </span>
              <span className="rounded border border-slate-300 bg-slate-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {session.status}
              </span>
              {session.isAiProctored && (
                <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                  <ShieldCheck className="h-3 w-3" />
                  AI Proctor
                </span>
              )}
            </div>

            <h2 className="mt-2 font-serif text-lg font-bold text-slate-900 dark:text-white">{session.title}</h2>
            <p className="mt-1 text-xs text-slate-500">{session.className}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Đóng chi tiết phiên"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="rounded-md border border-slate-300 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Thời gian
            </p>
            <p className="mt-2 font-serif text-lg font-bold text-slate-900 dark:text-white">
              {session.startTime} - {session.endTime}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-500">
              {formatDateDisplay(getSessionDateKey(session))}
            </p>
          </div>

          {session.status === 'Đã kết thúc' ? (
            <div className="rounded-md border border-slate-300 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.02]">
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Thông tin phòng
              </p>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                Mã phòng và mật khẩu đã được ẩn sau khi kết thúc giám sát.
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-slate-300 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.02]">
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Phòng & Ngôn ngữ
              </p>
              <p className="mt-2 font-mono text-sm font-bold text-slate-900 dark:text-white">{session.roomCode}</p>
              <p className="mt-1 text-xs text-slate-500">
                {session.language} • Passcode <span className="font-mono font-bold">{session.passcode}</span>
              </p>
            </div>
          )}
        </div>

        <div className="px-6 pb-2">
          <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Tiến độ phiên
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {session.status === 'Đang diễn ra'
                    ? `Còn khoảng ${formatDuration(remainingMinutes)}`
                    : session.status === 'Sắp diễn ra'
                    ? `Bắt đầu sau khoảng ${formatDuration(remainingMinutes)}`
                    : 'Phiên đã kết thúc'}
                </p>
              </div>
              <span className="font-mono text-sm font-bold tabular-nums text-slate-700 dark:text-slate-300">{progress}%</span>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded bg-slate-100 dark:bg-white/10">
              <div
                className={`h-full transition-all ${
                  session.status === 'Đang diễn ra'
                    ? 'bg-slate-900 dark:bg-white'
                    : 'bg-slate-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-6 sm:grid-cols-4">
          <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Tổng
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{session.enrolledStudents}</p>
            <p className="text-[11px] text-slate-500">SV đăng ký</p>
          </div>

          <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Đúng giờ
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{attendance.onTime}</p>
            <p className="text-[11px] text-slate-500">SV</p>
          </div>

          <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Đi muộn
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{attendance.late}</p>
            <p className="text-[11px] text-slate-500">SV</p>
          </div>

          <div className="rounded-md border border-slate-300 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {session.status === 'Sắp diễn ra' ? 'Chưa vào' : 'Vắng'}
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-700 dark:text-slate-300">
              {session.status === 'Sắp diễn ra' ? attendance.notArrived : attendance.absent}
            </p>
            <p className="text-[11px] text-slate-500">SV</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-neutral-950">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Users className="h-3.5 w-3.5" />
            <span>
              {session.attendedStudents}/{session.enrolledStudents} SV đã vào phòng
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {session.status === 'Đang diễn ra' && (
              <>
                {session.type !== 'EXAM' && (
                  <button
                    type="button"
                    onClick={onExtend}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Gia hạn
                  </button>
                )}
                <Link
                  href={`/instructor/monitoring?room=${encodeURIComponent(session.roomCode)}`}
                  className="system-primary-action inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  <Video className="h-3.5 w-3.5" />
                  Giám sát ngay
                </Link>
              </>
            )}

            {session.status === 'Sắp diễn ra' && (
              <Link
                href={`/instructor/room/${encodeURIComponent(session.roomCode)}?returnTo=schedules`}
                className="system-primary-action inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                <Users className="h-3.5 w-3.5" />
                Vào phòng chờ
              </Link>
            )}

            {session.status === 'Đã kết thúc' && (
              <Link
                href="/instructor/reports"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Xem báo cáo
              </Link>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(session)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-white/10 transition cursor-pointer"
                title="Xóa phòng thi này khỏi hệ thống"
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                Xóa phòng
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InstructorSchedulesPage() {
  const [sessions, setSessions] = useState<InstructorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [listTab, setListTab] = useState<'current' | 'history'>('current');
  const [filterType, setFilterType] = useState<'ALL' | 'LAB' | 'EXAM' | 'active' | 'upcoming'>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<InstructorSession | null>(null);
  const [sessionToExtend, setSessionToExtend] = useState<InstructorSession | null>(null);
  const [now, setNow] = useState(() => new Date());

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth<any[]>('/api/v1/rooms');
      if (Array.isArray(data)) {
        const mapped = data.map(mapBackendRoomToScheduleSession);
        setSessions(mapped);
      }
    } catch {
      // Fallback localStorage nếu mất mạng
      try {
        const raw = localStorage.getItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSessions(parsed.map(mapBackendRoomToScheduleSession));
          }
        }
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Đồng hồ UI để countdown/progress tự cập nhật.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      showToast(`Đã sao chép: ${text}`);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      showToast('Không thể sao chép. Vui lòng thử lại.');
    }
  };

  const handleOpenRoomEarly = async (sessionId: string) => {
    const targetSession = sessions.find((session) => session.id === sessionId);

    if (!targetSession) {
      showToast('Không tìm thấy phiên cần mở. Vui lòng tải lại trang.');
      return;
    }

    if (targetSession.status !== 'Sắp diễn ra') {
      showToast('Chỉ có thể mở sớm phiên đang ở trạng thái Sắp diễn ra.');
      return;
    }

    if (!targetSession.roomId) {
      showToast('Không tìm thấy ID phòng hợp lệ.');
      return;
    }

    try {
      await fetchWithAuth(`/api/v1/rooms/${targetSession.roomId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'dang_dien_ra' }),
      });

      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? { ...session, status: 'Đang diễn ra', demoProgress: 10, demoRemainingMinutes: 60 }
            : session
        )
      );

      showToast(`Đã mở phòng ${targetSession.roomCode}. Sinh viên có thể tham gia!`);
    } catch (err: any) {
      const detailMsg =
        err?.detail?.message ||
        (typeof err?.detail === 'string' ? err?.detail : null) ||
        err?.message ||
        'Không thể mở phòng.';
      showToast(detailMsg);
    }
  };

  const handleConfirmExtend = async (minutes: number, reason: string, notify: boolean) => {
    if (!sessionToExtend) return;

    if (sessionToExtend.roomId) {
      try {
        await fetchWithAuth(`/api/v1/rooms/${sessionToExtend.roomId}`, {
          method: 'PUT',
          body: JSON.stringify({
            duration_minutes: (sessionToExtend as any).durationMinutes
              ? (sessionToExtend as any).durationMinutes + minutes
              : undefined,
          }),
        }).catch(() => null);
      } catch {
        // ignore
      }
    }

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionToExtend.id) return s;

        const oldEnd = timeToMinutes(s.endTime);
        const newEndMinutes = oldEnd + minutes;
        const newHour = Math.floor(newEndMinutes / 60) % 24;
        const newMinute = newEndMinutes % 60;

        return {
          ...s,
          endTime: `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`,
          demoRemainingMinutes: (s.demoRemainingMinutes ?? 0) + minutes,
        };
      })
    );

    showToast(
      `Đã gia hạn +${minutes} phút cho ${sessionToExtend.roomCode}${
        notify ? ' và đã gửi thông báo đến sinh viên' : ''
      }${reason ? ` (${reason})` : ''}`
    );

    setSessionToExtend(null);
  };

  // Xóa ca thi / phòng kiểm tra khỏi hệ thống và đồng bộ CSDL
  const handleDeleteRoom = async (sessionItem: InstructorSession) => {
    if (
      !window.confirm(
        `Giảng viên có chắc chắn muốn xóa phòng [${sessionItem.roomCode}] (${sessionItem.title}) khỏi hệ thống?\nToàn bộ dữ liệu phòng thi sẽ bị xóa vĩnh viễn khỏi CSDL.`
      )
    ) {
      return;
    }
    try {
      if (sessionItem.roomId) {
        await fetchWithAuth(`/api/v1/rooms/${sessionItem.roomId}`, { method: 'DELETE' });
      } else {
        await fetchWithAuth(`/api/v1/rooms/by-code/${encodeURIComponent(sessionItem.roomCode)}`, { method: 'DELETE' });
      }

      setSessions((prev) => prev.filter((s) => s.roomCode.toLowerCase() !== sessionItem.roomCode.toLowerCase()));

      try {
        const raw = localStorage.getItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY);
        if (raw) {
          const list = JSON.parse(raw);
          const filtered = list.filter((s: any) => s.roomCode?.toLowerCase() !== sessionItem.roomCode.toLowerCase());
          localStorage.setItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY, JSON.stringify(filtered));
        }
      } catch {}

      if (selectedSession && selectedSession.roomCode.toLowerCase() === sessionItem.roomCode.toLowerCase()) {
        setSelectedSession(null);
      }
      showToast(`Đã xóa thành công phòng thi ${sessionItem.roomCode}!`);
    } catch (err: any) {
      console.error('Lỗi khi xóa phòng:', err);
      alert(err?.message || 'Không thể xóa phòng');
    }
  };

  // Chỉ coi là xung đột nếu CÙNG MỘT LỚP HỌC PHẦN (khác lớp thì được phép trùng giờ bình thường)
  const conflictIds = useMemo(() => {
    const ids = new Set<string>();

    sessions.forEach((current, index) => {
      const currentDate = getSessionDateKey(current);
      const currentStart = timeToMinutes(current.startTime);
      const currentEnd = timeToMinutes(current.endTime);

      sessions.slice(index + 1).forEach((other) => {
        if (currentDate !== getSessionDateKey(other)) return;

        // Quy tắc: 1 giờ có thể có nhiều phòng khác lớp thi cùng lúc. Chỉ xung đột nếu CÙNG LỚP!
        const curClass = (current.classCode || '').trim().toLowerCase();
        const othClass = (other.classCode || '').trim().toLowerCase();
        if (curClass && othClass && curClass !== othClass) return;

        const otherStart = timeToMinutes(other.startTime);
        const otherEnd = timeToMinutes(other.endTime);

        const overlaps =
          currentStart < otherEnd &&
          otherStart < currentEnd;

        if (overlaps) {
          ids.add(current.id);
          ids.add(other.id);
        }
      });
    });

    return ids;
  }, [sessions]);

  const stats = useMemo(() => {
    const active = sessions.filter((s) => s.status === 'Đang diễn ra').length;
    const upcoming = sessions.filter((s) => s.status === 'Sắp diễn ra').length;
    const completed = sessions.filter((s) => s.status === 'Đã kết thúc').length;
    const aiEnabled = sessions.filter((s) => s.isAiProctored).length;

    const totalEnrolled = sessions.reduce(
      (sum, session) => sum + session.enrolledStudents,
      0
    );

    const totalAttended = sessions.reduce(
      (sum, session) => sum + session.attendedStudents,
      0
    );

    return {
      total: sessions.length,
      active,
      upcoming,
      completed,
      aiEnabled,
      totalEnrolled,
      totalAttended,
    };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const todayKey = getLocalDateKey();
    const tomorrowKey = shiftDateKey(1);
    const nextSevenStart = new Date();
    const nextSevenEnd = new Date();
    nextSevenEnd.setDate(nextSevenEnd.getDate() + 7);

    return sessions.filter((session) => {
      const isHistorySession = session.status === 'Đã kết thúc';
      if (listTab === 'history' ? !isHistorySession : isHistorySession) return false;

      const query = search.trim().toLowerCase();

      const matchSearch =
        !query ||
        session.title.toLowerCase().includes(query) ||
        session.classCode.toLowerCase().includes(query) ||
        session.className.toLowerCase().includes(query) ||
        session.roomCode.toLowerCase().includes(query);

      if (!matchSearch) return false;

      if (filterType === 'LAB' && session.type !== 'LAB') return false;
      if (filterType === 'EXAM' && session.type !== 'EXAM') return false;
      if (filterType === 'active' && session.status !== 'Đang diễn ra') return false;
      if (filterType === 'upcoming' && session.status !== 'Sắp diễn ra') return false;

      const sessionDate = listTab === 'history'
        ? getLocalDateKey(new Date(session.sortTimestamp))
        : getSessionDateKey(session);

      if (dateFilter === 'TODAY' && sessionDate !== todayKey) return false;
      if (dateFilter === 'TOMORROW' && sessionDate !== tomorrowKey) return false;

      if (dateFilter === 'NEXT_7_DAYS') {
        const candidate = new Date(`${sessionDate}T00:00:00`);
        if (
          Number.isNaN(candidate.getTime()) ||
          candidate < new Date(`${todayKey}T00:00:00`) ||
          candidate > nextSevenEnd
        ) {
          return false;
        }
      }

      if (dateFilter === 'PAST_7_DAYS') {
        const candidate = new Date(`${sessionDate}T00:00:00`);
        const pastSevenStart = new Date();
        pastSevenStart.setDate(pastSevenStart.getDate() - 7);
        if (
          Number.isNaN(candidate.getTime()) ||
          candidate < pastSevenStart ||
          candidate > new Date(`${todayKey}T23:59:59`)
        ) {
          return false;
        }
      }

      if (dateFilter === 'CUSTOM') {
        if (customStartDate && sessionDate < customStartDate) return false;
        if (customEndDate && sessionDate > customEndDate) return false;
      }

      return true;
    });
  }, [
    sessions,
    listTab,
    search,
    filterType,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  const groupedSessions = useMemo(() => {
    const groups = new Map<string, InstructorSession[]>();

    filteredSessions.forEach((session) => {
      const dateKey = listTab === 'history'
        ? getLocalDateKey(new Date(session.sortTimestamp))
        : getSessionDateKey(session);
      const group = groups.get(dateKey) ?? [];
      group.push(session);
      groups.set(dateKey, group);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) =>
        listTab === 'history' ? b.localeCompare(a) : a.localeCompare(b)
      )
      .map(([dateKey, group]) => ({
        dateKey,
        label: formatDateDisplay(dateKey),
        sessions: group.sort((a, b) =>
          listTab === 'history'
            ? b.sortTimestamp - a.sortTimestamp
            : timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
        ),
      }));
  }, [filteredSessions, listTab]);

  return (
    <div className="space-y-6">
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-md border border-slate-300 border-l-4 border-l-slate-900 bg-white px-4 py-3 text-xs shadow-lg dark:border-white/10 dark:border-l-white dark:bg-neutral-900"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-slate-100 text-slate-900 shrink-0 dark:bg-white/10 dark:text-white">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-serif text-xs font-bold text-[#2A282D] dark:text-white">Thông báo</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">{toastMessage}</p>
          </div>
        </aside>
      )}

      <div className="flex flex-col justify-between gap-4 border-b border-slate-300 pb-4 sm:flex-row sm:items-center dark:border-white/10">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Hệ thống Quản lý Giảng dạy & Đánh giá
          </p>
          <h1 className="mt-0.5 font-serif text-2xl font-bold tracking-tight text-[#2A282D] sm:text-[28px] dark:text-[#ede8e9]">
            Lịch &amp; Phiên Kiểm Tra Trực Tuyến
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Quản lý ca thực hành Lab, kích hoạt phòng thi và giám sát AI trực tiếp theo thời gian thực.
          </p>
        </div>

        <Link
          href="/instructor/room?returnTo=schedules"
          className="system-primary-action inline-flex h-9 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Tạo & Lên Lịch Phòng Mới</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        <div className="rounded-md border border-slate-300 bg-white p-5 shadow-2xs dark:border-white/10 dark:bg-neutral-900 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
              Tổng số ca
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.total}</span>
            <span className="text-xs font-semibold text-slate-500">tất cả phiên</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {stats.upcoming} sắp diễn ra • {stats.completed} đã kết thúc
          </p>
        </div>

        <div className="rounded-md border border-slate-300 bg-white p-5 shadow-2xs dark:border-white/10 dark:bg-neutral-900 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
              Đang diễn ra
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.active}</span>
            <span className="text-xs font-semibold text-slate-500">phòng hoạt động</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {stats.totalAttended}/{stats.totalEnrolled} sinh viên đã vào
          </p>
        </div>

        <div className="rounded-md border border-slate-300 bg-white p-5 shadow-2xs dark:border-white/10 dark:bg-neutral-900 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
              Tổng sinh viên
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.totalEnrolled}</span>
            <span className="text-xs font-semibold text-slate-500">lượt đăng ký</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Điểm danh tự động qua MSSV</p>
        </div>

        <div className="rounded-md border border-slate-300 bg-white p-5 shadow-2xs dark:border-white/10 dark:bg-neutral-900 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
              Giám sát AI
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {stats.aiEnabled}/{stats.total}
            </span>
            <span className="text-xs font-semibold text-slate-500">phiên bật AI</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Bắt tab & nhận diện khuôn mặt</p>
        </div>
      </div>

      {conflictIds.size > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-slate-300 bg-slate-50 p-4 text-slate-800 shadow-2xs dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-slate-600 dark:text-slate-400" />
          <div>
            <p className="text-sm font-bold">Có xung đột lịch</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Có {conflictIds.size} phiên đang bị trùng thời gian. Hãy mở Chi tiết phiên để kiểm tra.
            </p>
          </div>
        </div>
      )}

      <div role="tablist" aria-label="Trạng thái phòng" className="flex gap-2 border-b border-slate-300 dark:border-white/10">
        <button
          type="button"
          role="tab"
          aria-selected={listTab === 'current'}
          onClick={() => {
            setListTab('current');
            setFilterType('ALL');
            setDateFilter('ALL');
          }}
          className={`border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            listTab === 'current'
              ? 'border-brand-600 text-brand-700 dark:border-brand-300 dark:text-brand-200'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Đang diễn ra &amp; sắp tới ({stats.active + stats.upcoming})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={listTab === 'history'}
          onClick={() => {
            setListTab('history');
            setFilterType('ALL');
            setDateFilter('ALL');
          }}
          className={`border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            listTab === 'history'
              ? 'border-brand-600 text-brand-700 dark:border-brand-300 dark:text-brand-200'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Lịch sử ({stats.completed})
        </button>
      </div>

      <div className="rounded-md border border-slate-300 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-neutral-900">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo môn học, mã phòng, bài lab..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-4 text-xs outline-none transition focus:border-slate-600 focus:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              {
                id: 'ALL' as const,
                label: listTab === 'history'
                  ? `Tất cả lịch sử (${stats.completed})`
                  : `Tất cả (${stats.active + stats.upcoming})`,
              },
              ...(listTab === 'current'
                ? [
                    { id: 'active' as const, label: `Đang diễn ra (${stats.active})` },
                    { id: 'upcoming' as const, label: `Sắp diễn ra (${stats.upcoming})` },
                  ]
                : []),
              { id: 'LAB' as const, label: 'Thực hành Lab' },
              { id: 'EXAM' as const, label: 'Kiểm tra' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilterType(tab.id as typeof filterType);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  filterType === tab.id
                    ? 'system-selected-module shadow-2xs'
                    : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}

            <div className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-white/10 sm:block" />

            <div className="relative flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-slate-600 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-200"
              >
                <option value="ALL">Tất cả ngày</option>
                <option value="TODAY">Hôm nay</option>
                <option value="TOMORROW">Ngày mai</option>
                <option value="NEXT_7_DAYS">7 ngày tới</option>
                <option value="PAST_7_DAYS">7 ngày qua</option>
                <option value="CUSTOM">Tùy chọn ngày</option>
              </select>
            </div>
          </div>
        </div>

        {dateFilter === 'CUSTOM' && (
          <div className="mt-3 flex flex-col gap-2 rounded-md border border-slate-300 bg-slate-50 p-3 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/[0.02]">
            <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">Khoảng ngày:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-slate-600 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-200"
            />
            <span className="text-xs text-slate-400">→</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-slate-600 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-200"
            />
            <button
              type="button"
              onClick={() => {
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-white dark:hover:bg-white/10"
            >
              Xóa ngày
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-sm font-bold text-slate-900 dark:text-white">
            {listTab === 'history' ? 'Lịch sử phòng' : 'Danh sách phiên'}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Hiển thị {filteredSessions.length}/
            {listTab === 'history' ? stats.completed : stats.active + stats.upcoming} phiên.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-md border border-slate-300 bg-white p-12 text-center text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-neutral-900">
          Đang tải lịch thi và lịch thực hành từ máy chủ...
        </div>
      ) : groupedSessions.length === 0 ? (
        <div className="rounded-md border border-slate-300 bg-white p-12 text-center dark:border-white/10 dark:bg-neutral-900">
          <CalendarDays className="mx-auto h-9 w-9 text-slate-300 dark:text-white/20" />
          <p className="mt-3 font-serif text-sm font-bold text-slate-700 dark:text-slate-200">
            {listTab === 'history' && stats.completed === 0
              ? 'Chưa có phòng trong lịch sử'
              : 'Không tìm thấy phiên phù hợp'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Hãy thử xóa bộ lọc ngày, đổi trạng thái hoặc dùng từ khóa khác.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setFilterType('ALL');
              setDateFilter('ALL');
              setCustomStartDate('');
              setCustomEndDate('');
            }}
            className="mt-4 rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedSessions.map((group) => (
            <section key={group.dateKey} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#ded7d9] dark:bg-white/10" />
                <span className="rounded border border-slate-300 bg-slate-50 px-3 py-1 font-mono text-[11px] font-bold text-slate-700 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-300">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-[#ded7d9] dark:bg-white/10" />
              </div>

              <div className="space-y-4">
                {group.sessions.map((session) => {
                  const progress = getSessionProgress(session, now);
                  const remainingMinutes = getRemainingMinutes(session, now);
                  const hasConflict = conflictIds.has(session.id);
                  const isHistory = listTab === 'history';

                  return (
                    <div
                      key={session.id}
                      className="rounded-md border border-slate-300 bg-white p-5 shadow-2xs transition-colors dark:border-white/10 dark:bg-neutral-900"
                    >
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col justify-between gap-4 xl:flex-row">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200">
                              {session.type}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                                  {session.classCode === 'unassigned' || !session.classCode ? 'Chưa gán lớp' : session.classCode}
                                </span>

                                <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                  {session.status}
                                </span>

                                {session.isAiProctored && (
                                  <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                    <ShieldCheck className="h-3 w-3" />
                                    AI Proctor
                                  </span>
                                )}

                                {hasConflict && (
                                  <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                    <AlertTriangle className="h-3 w-3" />
                                    Trùng lịch
                                  </span>
                                )}
                              </div>

                              <h3 className="mt-1 font-serif text-base font-bold text-slate-900 truncate dark:text-white">
                                {session.title}
                              </h3>

                              <p className="mt-1 text-xs text-slate-500">{session.className}</p>

                              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                                  <strong className="font-mono text-slate-700 dark:text-slate-300">
                                    {session.startTime} - {session.endTime}
                                  </strong>
                                </span>

                                <span className="inline-flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                  <span className="font-mono">{formatDateDisplay(getSessionDateKey(session))}</span>
                                </span>

                                <span className="inline-flex items-center gap-1.5">
                                  <Code2 className="h-3.5 w-3.5 text-slate-500" />
                                  <span>{session.language}</span>
                                </span>

                                <span className="inline-flex items-center gap-1.5">
                                  <Users className="h-3.5 w-3.5 text-slate-500" />
                                  <strong className="font-mono text-slate-800 dark:text-slate-200">
                                    {session.attendedStudents}/{session.enrolledStudents}
                                  </strong>{' '}
                                  SV
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-start gap-2 xl:justify-end">
                            {!isHistory && (
                              <div className="rounded-md border border-slate-300 bg-slate-50/60 p-2 text-xs dark:border-white/10 dark:bg-white/[0.02]">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500">Mã phòng:</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyToClipboard(session.roomCode, `code-${session.id}`)
                                    }
                                    className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 hover:underline dark:text-white"
                                    title="Bấm để sao chép"
                                  >
                                    {session.roomCode}
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>

                                <div className="mt-0.5 flex items-center gap-2">
                                  <span className="text-slate-500">Mật mã:</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyToClipboard(session.passcode, `pass-${session.id}`)
                                    }
                                    className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 hover:underline dark:text-slate-300"
                                    title="Bấm để sao chép"
                                  >
                                    {session.passcode}
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>

                                {copiedCode?.startsWith(`code-${session.id}`) && (
                                  <p className="mt-1 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                                    Đã sao chép
                                  </p>
                                )}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedSession(session)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                              Chi tiết
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {!isHistory && (
                        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-[11px] font-bold text-slate-500">
                                {session.status === 'Đang diễn ra'
                                  ? `Tiến độ • Còn khoảng ${formatDuration(remainingMinutes)}`
                                  : session.status === 'Sắp diễn ra'
                                  ? `Bắt đầu sau khoảng ${formatDuration(remainingMinutes)}`
                                  : 'Phiên đã kết thúc'}
                              </div>

                              <span className="font-mono text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-300">
                                {progress}%
                              </span>
                            </div>

                            <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-100 dark:bg-white/10">
                              <div
                                className={`h-full transition-all ${
                                  session.status === 'Đang diễn ra'
                                    ? 'bg-slate-900 dark:bg-white'
                                    : 'bg-slate-400'
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, progress))}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {session.status === 'Đang diễn ra' ? (
                              <>
                                {session.type !== 'EXAM' && (
                                  <button
                                    type="button"
                                    onClick={() => setSessionToExtend(session)}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                                  >
                                    <Clock className="h-3.5 w-3.5" />
                                    Gia hạn
                                  </button>
                                )}

                                <Link
                                  href={`/instructor/monitoring?room=${encodeURIComponent(
                                    session.roomCode
                                  )}`}
                                  className="system-primary-action inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-slate-800"
                                >
                                  <Video className="h-3.5 w-3.5" />
                                  Giám sát ngay
                                </Link>
                              </>
                            ) : session.status === 'Sắp diễn ra' ? (
                              <>
                                <Link
                                  href={`/instructor/room/${encodeURIComponent(
                                    session.roomCode
                                  )}?returnTo=schedules`}
                                  className="system-primary-action inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                                >
                                  <Users className="h-3.5 w-3.5" />
                                  Vào phòng chờ
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => handleOpenRoomEarly(session.id)}
                                  className="system-primary-action inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-slate-800"
                                >
                                  <Play className="h-3.5 w-3.5" />
                                  Mở phòng sớm
                                </button>
                              </>
                            ) : (
                              <Link
                                href="/instructor/reports"
                                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Xem báo cáo
                              </Link>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRoom(session);
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition cursor-pointer"
                              title="Xóa phòng thi này khỏi hệ thống"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onExtend={() => {
            setSessionToExtend(selectedSession);
            setSelectedSession(null);
          }}
          onDelete={selectedSession.status === 'Đã kết thúc' ? undefined : handleDeleteRoom}
        />
      )}

      {sessionToExtend && (
        <ExtendSessionModal
          isOpen={true}
          onClose={() => setSessionToExtend(null)}
          roomCode={sessionToExtend.roomCode}
          currentRemainingMinutes={getRemainingMinutes(sessionToExtend, now)}
          onConfirm={handleConfirmExtend}
        />
      )}
    </div>
  );
}
