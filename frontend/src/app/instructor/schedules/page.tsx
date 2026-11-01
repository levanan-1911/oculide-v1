'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  Users,
  Video,
} from 'lucide-react';
import ExtendSessionModal from '@/components/instructor/monitoring/ExtendSessionModal';
import { INSTRUCTOR_SCHEDULES_STORAGE_KEY } from '@/components/instructor/classes/types';

interface InstructorSession {
  id: string;
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

type DateFilter = 'ALL' | 'TODAY' | 'TOMORROW' | 'NEXT_7_DAYS' | 'CUSTOM';

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

const INITIAL_SESSIONS: InstructorSession[] = [
  {
    id: 'SES-01',
    classCode: 'CS101-A',
    className: 'Nhập môn Lập trình C/C++',
    title: 'Lab 03: Vòng lặp For/While & Mảng 1 chiều',
    type: 'LAB',
    language: 'C++',
    startTime: '07:30',
    endTime: '09:50',
    date: 'Hôm nay',
    dateKey: getLocalDateKey(),
    roomCode: 'CS101-LAB3',
    passcode: '883921',
    status: 'Đang diễn ra',
    enrolledStudents: 48,
    attendedStudents: 46,
    isAiProctored: true,
    demoProgress: 68,
    demoRemainingMinutes: 42,
  },
  {
    id: 'SES-02',
    classCode: 'PRJ301',
    className: 'Lập trình ứng dụng Java Web',
    title: 'Kiểm tra quá trình: Servlet & MVC Pattern',
    type: 'EXAM',
    language: 'Java',
    startTime: '13:30',
    endTime: '15:00',
    date: 'Hôm nay',
    dateKey: getLocalDateKey(),
    roomCode: 'PRJ-KT01',
    passcode: '901244',
    status: 'Sắp diễn ra',
    enrolledStudents: 45,
    attendedStudents: 0,
    isAiProctored: true,
  },
  {
    id: 'SES-03',
    classCode: 'CSD201',
    className: 'Cấu trúc dữ liệu & Giải thuật',
    title: 'Lab 04: Cây nhị phân tìm kiếm (BST)',
    type: 'LAB',
    language: 'Python',
    startTime: '15:15',
    endTime: '17:35',
    date: 'Hôm nay',
    dateKey: getLocalDateKey(),
    roomCode: 'CSD-BST4',
    passcode: '128472',
    status: 'Sắp diễn ra',
    enrolledStudents: 42,
    attendedStudents: 0,
    isAiProctored: false,
  },
  {
    id: 'SES-04',
    classCode: 'CS102',
    className: 'Kỹ thuật Lập trình nâng cao',
    title: 'Lab 02: Con trỏ & Quản lý bộ nhớ động',
    type: 'LAB',
    language: 'C++',
    startTime: '08:00',
    endTime: '10:20',
    date: 'Hôm qua',
    dateKey: shiftDateKey(-1),
    roomCode: 'CS102-PTR',
    passcode: '451092',
    status: 'Đã kết thúc',
    enrolledStudents: 50,
    attendedStudents: 49,
    isAiProctored: true,
  },
];

function SessionDetailModal({
  session,
  onClose,
  onExtend,
}: {
  session: InstructorSession | null;
  onClose: () => void;
  onExtend: () => void;
}) {
  if (!session) return null;

  const now = new Date();
  const progress = getSessionProgress(session, now);
  const remainingMinutes = getRemainingMinutes(session, now);
  const attendance = getAttendanceSummary(session);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                {session.classCode}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                  session.status === 'Đang diễn ra'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : session.status === 'Sắp diễn ra'
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-slate-200 bg-slate-100 text-slate-600'
                }`}
              >
                {session.status}
              </span>
              {session.isAiProctored && (
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">
                  <ShieldCheck className="h-3 w-3" />
                  AI Proctor
                </span>
              )}
            </div>

            <h2 className="mt-2 text-lg font-black text-slate-900">{session.title}</h2>
            <p className="mt-1 text-xs text-slate-500">{session.className}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
            aria-label="Đóng chi tiết phiên"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Thời gian
            </p>
            <p className="mt-2 text-lg font-black text-slate-900">
              {session.startTime} - {session.endTime}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatDateDisplay(getSessionDateKey(session))}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Phòng & Ngôn ngữ
            </p>
            <p className="mt-2 font-mono text-sm font-black text-blue-700">{session.roomCode}</p>
            <p className="mt-1 text-xs text-slate-500">
              {session.language} • Passcode {session.passcode}
            </p>
          </div>
        </div>

        <div className="px-6 pb-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Tiến độ phiên
                </p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  {session.status === 'Đang diễn ra'
                    ? `Còn khoảng ${formatDuration(remainingMinutes)}`
                    : session.status === 'Sắp diễn ra'
                    ? `Bắt đầu sau khoảng ${formatDuration(remainingMinutes)}`
                    : 'Phiên đã kết thúc'}
                </p>
              </div>
              <span className="text-sm font-black text-slate-700">{progress}%</span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  session.status === 'Đang diễn ra'
                    ? 'bg-emerald-500'
                    : session.status === 'Sắp diễn ra'
                    ? 'bg-blue-500'
                    : 'bg-slate-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-6 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Tổng
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900">{session.enrolledStudents}</p>
            <p className="text-[11px] text-slate-500">SV đăng ký</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Đúng giờ
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-700">{attendance.onTime}</p>
            <p className="text-[11px] text-emerald-700">SV</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Đi muộn
            </p>
            <p className="mt-2 text-2xl font-black text-amber-700">{attendance.late}</p>
            <p className="text-[11px] text-amber-700">SV</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {session.status === 'Sắp diễn ra' ? 'Chưa vào' : 'Vắng'}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-700">
              {session.status === 'Sắp diễn ra' ? attendance.notArrived : attendance.absent}
            </p>
            <p className="text-[11px] text-slate-500">SV</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Users className="h-3.5 w-3.5" />
            <span>
              {session.attendedStudents}/{session.enrolledStudents} SV đã vào phòng
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {session.status === 'Đang diễn ra' && (
              <>
                <button
                  type="button"
                  onClick={onExtend}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Gia hạn
                </button>
                <Link
                  href={`/instructor/monitoring?room=${encodeURIComponent(session.roomCode)}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Video className="h-3.5 w-3.5" />
                  Giám sát ngay
                </Link>
              </>
            )}

            {session.status === 'Sắp diễn ra' && (
              <Link
                href={`/instructor/room/${encodeURIComponent(session.roomCode)}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                <Users className="h-3.5 w-3.5" />
                Vào phòng chờ
              </Link>
            )}

            {session.status === 'Đã kết thúc' && (
              <Link
                href="/instructor/reports"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Xem báo cáo
              </Link>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
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
  const [sessions, setSessions] = useState<InstructorSession[]>(INITIAL_SESSIONS);
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY);
      if (raw) {
        const storedSchedules: InstructorSession[] = JSON.parse(raw);

        if (Array.isArray(storedSchedules) && storedSchedules.length > 0) {
          setSessions((prev) => {
            const storedCodes = new Set(
              storedSchedules.map((s) => s.roomCode.toLowerCase())
            );

            const normalizedStored = storedSchedules.map((session) => ({
              ...session,
              dateKey: session.dateKey || parseDateLabel(session.date),
            }));

            const remaining = prev.filter(
              (p) => !storedCodes.has(p.roomCode.toLowerCase())
            );

            return [...normalizedStored, ...remaining];
          });
        }
      }
    } catch {
      // Fallback về dữ liệu demo.
    }
  }, []);

  // Đồng hồ UI để countdown/progress tự cập nhật.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

  const handleOpenRoomEarly = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, status: 'Đang diễn ra', demoProgress: 10, demoRemainingMinutes: 60 }
          : s
      )
    );

    try {
      const raw = localStorage.getItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY);

      if (raw) {
        const stored: InstructorSession[] = JSON.parse(raw);
        const updated = stored.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                status: 'Đang diễn ra' as const,
              }
            : s
        );

        localStorage.setItem(
          INSTRUCTOR_SCHEDULES_STORAGE_KEY,
          JSON.stringify(updated)
        );
      }
    } catch {
      // Fallback state vẫn được giữ.
    }

    showToast('Phòng thi đã được mở sớm thành công. Sinh viên đã có thể tham gia!');
  };

  const handleConfirmExtend = (minutes: number, reason: string, notify: boolean) => {
    if (!sessionToExtend) return;

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

  const conflictIds = useMemo(() => {
    const ids = new Set<string>();

    sessions.forEach((current, index) => {
      const currentDate = getSessionDateKey(current);
      const currentStart = timeToMinutes(current.startTime);
      const currentEnd = timeToMinutes(current.endTime);

      sessions.slice(index + 1).forEach((other) => {
        if (currentDate !== getSessionDateKey(other)) return;

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

      const sessionDate = getSessionDateKey(session);

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

      if (dateFilter === 'CUSTOM') {
        if (customStartDate && sessionDate < customStartDate) return false;
        if (customEndDate && sessionDate > customEndDate) return false;
      }

      return true;
    });
  }, [
    sessions,
    search,
    filterType,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  const groupedSessions = useMemo(() => {
    const groups = new Map<string, InstructorSession[]>();

    filteredSessions.forEach((session) => {
      const dateKey = getSessionDateKey(session);
      const group = groups.get(dateKey) ?? [];
      group.push(session);
      groups.set(dateKey, group);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, group]) => ({
        dateKey,
        label: formatDateDisplay(dateKey),
        sessions: group.sort(
          (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
        ),
      }));
  }, [filteredSessions]);

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
            Không gian Giảng viên
          </p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Lịch & Phiên Kiểm Tra Trực Tuyến
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Quản lý ca thực hành Lab, kích hoạt phòng thi và giám sát AI trực tiếp theo thời gian thực.
          </p>
        </div>

        <Link
          href="/instructor/room"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Tạo & Lên Lịch Phòng Mới</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tổng số ca
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <span className="text-xs font-semibold text-slate-600">tất cả phiên</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {stats.upcoming} sắp diễn ra • {stats.completed} đã kết thúc
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Đang diễn ra
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{stats.active}</span>
            <span className="text-xs font-semibold text-slate-600">phòng hoạt động</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {stats.totalAttended}/{stats.totalEnrolled} lượt tham gia trong toàn bộ danh sách
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tổng sinh viên
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.totalEnrolled}</span>
            <span className="text-xs font-semibold text-slate-600">lượt đăng ký</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Điểm danh tự động qua MSSV</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Giám sát AI
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {stats.aiEnabled}/{stats.total}
            </span>
            <span className="text-xs font-semibold text-amber-600">phiên bật AI</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Bắt tab & nhận diện khuôn mặt</p>
        </div>
      </div>

      {conflictIds.size > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-bold">Có xung đột lịch</p>
            <p className="mt-0.5 text-xs">
              Có {conflictIds.size} phiên đang bị trùng thời gian. Hãy mở Chi tiết phiên để kiểm tra.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo môn học, mã phòng, bài lab..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-xs outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'active', label: 'Đang diễn ra' },
              { id: 'upcoming', label: 'Sắp diễn ra' },
              { id: 'LAB', label: 'Thực hành Lab' },
              { id: 'EXAM', label: 'Kiểm tra' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as typeof filterType)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  filterType === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}

            <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

            <div className="relative flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="ALL">Tất cả ngày</option>
                <option value="TODAY">Hôm nay</option>
                <option value="TOMORROW">Ngày mai</option>
                <option value="NEXT_7_DAYS">7 ngày tới</option>
                <option value="CUSTOM">Tùy chọn ngày</option>
              </select>
            </div>
          </div>
        </div>

        {dateFilter === 'CUSTOM' && (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3 sm:flex-row sm:items-center">
            <span className="text-[11px] font-bold text-blue-700">Khoảng ngày:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
            />
            <span className="text-xs text-slate-400">→</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => {
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white"
            >
              Xóa ngày
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">Danh sách phiên</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Hiển thị {filteredSessions.length}/{sessions.length} phiên.
          </p>
        </div>
      </div>

      {groupedSessions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <CalendarDays className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">
            Không tìm thấy phiên phù hợp
          </p>
          <p className="mt-1 text-xs text-slate-400">
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
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedSessions.map((group) => (
            <section key={group.dateKey} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="space-y-4">
                {group.sessions.map((session) => {
                  const progress = getSessionProgress(session, now);
                  const remainingMinutes = getRemainingMinutes(session, now);
                  const hasConflict = conflictIds.has(session.id);

                  return (
                    <div
                      key={session.id}
                      className={`rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-md ${
                        session.status === 'Đang diễn ra'
                          ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                          : hasConflict
                          ? 'border-amber-300 ring-2 ring-amber-400/10'
                          : 'border-slate-200/90'
                      }`}
                    >
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col justify-between gap-4 xl:flex-row">
                          <div className="flex min-w-0 items-start gap-4">
                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${
                                session.type === 'LAB'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-purple-100 text-purple-700'
                              }`}
                            >
                              {session.type}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                                  {session.classCode}
                                </span>

                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                    session.status === 'Đang diễn ra'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : session.status === 'Sắp diễn ra'
                                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                                      : 'border-slate-200 bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {session.status === 'Đang diễn ra' && (
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                  )}
                                  {session.status}
                                </span>

                                {session.isAiProctored && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                    <ShieldCheck className="h-3 w-3" />
                                    AI Proctor
                                  </span>
                                )}

                                {hasConflict && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                    <AlertTriangle className="h-3 w-3" />
                                    Trùng lịch
                                  </span>
                                )}
                              </div>

                              <h3 className="mt-1 truncate text-base font-bold text-slate-900">
                                {session.title}
                              </h3>

                              <p className="mt-1 text-xs text-slate-500">{session.className}</p>

                              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  <strong className="text-slate-700">
                                    {session.startTime} - {session.endTime}
                                  </strong>
                                </span>

                                <span className="inline-flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  {formatDateDisplay(getSessionDateKey(session))}
                                </span>

                                <span className="inline-flex items-center gap-1.5">
                                  <Code2 className="h-3.5 w-3.5 text-slate-400" />
                                  {session.language}
                                </span>

                                <span className="inline-flex items-center gap-1.5">
                                  <Users className="h-3.5 w-3.5 text-slate-400" />
                                  <strong className="text-slate-800">
                                    {session.attendedStudents}/{session.enrolledStudents}
                                  </strong>{' '}
                                  SV
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-start gap-2 xl:justify-end">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500">Mã phòng:</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyToClipboard(session.roomCode, `code-${session.id}`)
                                  }
                                  className="inline-flex items-center gap-1 font-mono font-bold text-blue-600 hover:underline"
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
                                  className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 hover:underline"
                                  title="Bấm để sao chép"
                                >
                                  {session.passcode}
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>

                              {copiedCode?.startsWith(`code-${session.id}`) && (
                                <p className="mt-1 text-[9px] font-semibold text-emerald-600">
                                  Đã sao chép
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedSession(session)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Chi tiết
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-[11px] font-bold text-slate-600">
                                {session.status === 'Đang diễn ra'
                                  ? `Tiến độ • Còn khoảng ${formatDuration(remainingMinutes)}`
                                  : session.status === 'Sắp diễn ra'
                                  ? `Bắt đầu sau khoảng ${formatDuration(remainingMinutes)}`
                                  : 'Phiên đã kết thúc'}
                              </div>

                              <span className="text-[11px] font-black text-slate-700">
                                {progress}%
                              </span>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  session.status === 'Đang diễn ra'
                                    ? 'bg-emerald-500'
                                    : session.status === 'Sắp diễn ra'
                                    ? 'bg-blue-500'
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
                                <button
                                  type="button"
                                  onClick={() => setSessionToExtend(session)}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  Gia hạn
                                </button>

                                <Link
                                  href={`/instructor/monitoring?room=${encodeURIComponent(
                                    session.roomCode
                                  )}`}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700"
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
                                  )}`}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                >
                                  <Users className="h-3.5 w-3.5" />
                                  Vào phòng chờ
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => handleOpenRoomEarly(session.id)}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
                                >
                                  <Play className="h-3.5 w-3.5" />
                                  Mở phòng sớm
                                </button>
                              </>
                            ) : (
                              <Link
                                href="/instructor/reports"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Xem báo cáo
                              </Link>
                            )}
                          </div>
                        </div>
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
