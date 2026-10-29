'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Table2,
  Users,
  Code2,
  Clock,
  ArrowRight,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  Video,
  Send,
  Eye,
  Lock,
  Unlock,
  Sparkles,
  BookOpen,
  FileCode2,
  ChevronRight,
  BellRing,
  Activity,
  UserCheck,
  Radio,
} from 'lucide-react';
import { useMonitoring } from '@/components/instructor/monitoring/MonitoringContext';
import { INSTRUCTOR_ROOMS_STORAGE_KEY, RoomSession } from '@/components/instructor/classes/types';

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
}

const INITIAL_TODAY_SESSIONS: TodaySessionItem[] = [
  {
    id: 'SES-01',
    classCode: 'CS101-A',
    className: 'Nhập môn Lập trình C/C++',
    title: 'Lab 03: Vòng lặp For/While & Mảng 1 chiều',
    type: 'LAB',
    time: '08:00 - 10:00 (Hôm nay)',
    roomCode: 'CS101-LAB3',
    pin: '883921',
    status: 'active',
    totalStudents: 48,
    attendedStudents: 46,
    unattendedCount: 2,
    isAiProctored: false,
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
  },
];

export default function InstructorDashboardPage() {
  const [instructorName, setInstructorName] = useState('Thầy Nguyễn Văn Nam');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TodaySessionItem[]>(INITIAL_TODAY_SESSIONS);

  const { violations } = useMonitoring();

  const pendingViolations = violations.filter((v) => v.status === 'pending');
  const activeSession = sessions.find((s) => s.status === 'active');
  const activeCount = sessions.filter((s) => s.status === 'active').length;

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name || parsed.username) {
          setInstructorName(parsed.name || parsed.username);
        }
      }

      // Đọc các phòng ca học đã tạo từ localStorage để đồng bộ trạng thái
      const storedRooms = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
      if (storedRooms) {
        const parsedRooms: RoomSession[] = JSON.parse(storedRooms);
        if (parsedRooms.length > 0) {
          const dynamicSessions: TodaySessionItem[] = parsedRooms.map((r) => ({
            id: r.id,
            classCode: r.classId,
            className: r.className,
            title: r.title,
            type: (r.type === 'lab' ? 'LAB' : 'EXAM') as 'LAB' | 'EXAM',
            time: `${r.durationMinutes} phút • Tạo hôm nay`,
            roomCode: r.id,
            pin: r.password,
            status:
              r.status === 'in_progress'
                ? ('active' as const)
                : r.status === 'waiting'
                ? ('waiting' as const)
                : r.status === 'ended'
                ? ('completed' as const)
                : ('upcoming' as const),
            totalStudents: r.attendees?.length || 45,
            attendedStudents: r.attendees?.filter((a) => a.status === 'in_exam').length || 0,
            unattendedCount: r.attendees?.filter((a) => a.status !== 'in_exam').length || 0,
            isAiProctored:
              Boolean(r.proctoringConfig?.aiFaceDetection) ||
              Boolean(r.proctoringConfig?.aiObjectDetection),
          }));

          setSessions((prev) => {
            const dynamicRoomCodes = new Set(dynamicSessions.map((d) => d.roomCode.toLowerCase()));
            const remaining = prev.filter((p) => !dynamicRoomCodes.has(p.roomCode.toLowerCase()));
            return [...dynamicSessions, ...remaining];
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const showToast = (msg: string) => {
    setToastText(msg);
    setTimeout(() => setToastText(null), 3000);
  };

  const copyToClipboard = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Đã sao chép ${label}: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenEarly = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: 'active' as const } : s))
    );
    try {
      const storedRooms = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
      if (storedRooms) {
        const parsedRooms: RoomSession[] = JSON.parse(storedRooms);
        const updated = parsedRooms.map((r) =>
          r.id === sessionId ? { ...r, status: 'in_progress' as const } : r
        );
        localStorage.setItem(INSTRUCTOR_ROOMS_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {
      // ignore
    }
    showToast('Phòng học đã được mở thành công. Bạn đã có thể vào giám sát!');
  };

  return (
    <div className="space-y-5">
      {/* Toast thông báo góc dưới */}
      {toastText && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastText}</span>
        </div>
      )}

      {/* ── 1. BANNER CHỈ HUY TRỰC TIẾP (COMPACT HERO LIVE BAR) ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-5 sm:p-6 text-white shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-xs border border-white/20">
              <GraduationCap className="h-3.5 w-3.5 text-blue-200" />
              <span>Cổng Giảng Viên • Học kỳ 1 (2026-2027)</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Xin chào, {instructorName}!
            </h1>

            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Hôm nay bạn có <strong className="text-white font-semibold">{sessions.length} ca giảng dạy</strong> ({activeCount > 0 ? `${activeCount} ca đang mở giám sát` : 'chưa mở ca nào'}). Chế độ khóa màn hình &amp; camera AI đang sẵn sàng.
            </p>
          </div>

          {/* Hộp Trạng Thái Live Session Đang Giám Sát */}
          {activeSession ? (
            <div className="rounded-xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 shadow-xs md:min-w-[250px]">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Đang mở giám sát
                </span>
                <span className="font-mono text-xs font-bold bg-black/40 px-2 py-0.5 rounded text-white border border-white/15">
                  {activeSession.roomCode}
                </span>
              </div>

              <div className="text-xs text-blue-100 truncate">
                <span className="font-semibold text-white">{activeSession.classCode}</span> • {activeSession.title}
              </div>

              <div className="flex items-center justify-between gap-4 text-xs text-blue-100 border-t border-white/10 pt-2">
                <span>Chế độ: <strong className="text-white font-semibold">{activeSession.type === 'LAB' ? 'Lab Thực hành' : 'Bài Kiểm Tra'}</strong></span>
                <span>Sĩ số: <strong className="text-emerald-300 font-bold">{activeSession.attendedStudents}/{activeSession.totalStudents} SV</strong></span>
              </div>

              <Link
                href={`/instructor/monitoring?room=${encodeURIComponent(activeSession.roomCode)}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition cursor-pointer"
              >
                <Video className="h-3.5 w-3.5" />
                <span>Vào phòng Giám Sát LiveKit →</span>
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 shadow-xs md:min-w-[250px]">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Chưa có lớp nào mở
                </span>
                <span className="text-[11px] font-medium bg-black/30 px-2 py-0.5 rounded text-slate-200 border border-white/10">
                  Chưa kích hoạt
                </span>
              </div>

              <p className="text-xs text-blue-100/90 leading-snug">
                Chỉ có thể vào giám sát khi phòng học đã được mở.
              </p>

              <Link
                href="/instructor/classes"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 cursor-pointer mt-1"
              >
                <Radio className="h-3.5 w-3.5 text-blue-600" />
                <span>Chọn Lớp Để Mở Phòng →</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── 2. 4 THẺ KPI ĐỊNH HƯỚNG HÀNH ĐỘNG (ACTION-ORIENTED KPIS) ── */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Thẻ 1: Ca học hôm nay */}
        <Link
          href="/instructor/schedules"
          className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-blue-400 hover:shadow-sm cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ca dạy hôm nay
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900">{sessions.length}</span>
              <span className="text-xs font-medium text-slate-500">ca học phần</span>
            </div>
            <p className="mt-1 text-xs text-blue-600 font-medium flex items-center justify-between">
              <span>{activeCount} ca đang mở • {sessions.length - activeCount} ca chờ</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </p>
          </div>
        </Link>

        {/* Thẻ 2: Cảnh báo AI cần thẩm định */}
        <Link
          href="/instructor/reports"
          className={`group rounded-2xl border p-4 shadow-xs transition hover:shadow-sm cursor-pointer flex flex-col justify-between ${
            pendingViolations.length > 0
              ? 'border-amber-300 bg-amber-50/20 hover:border-amber-400'
              : 'border-slate-200/80 bg-white hover:border-blue-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cảnh báo AI cần duyệt
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                pendingViolations.length > 0
                  ? 'bg-amber-100 text-amber-700 animate-pulse'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-bold ${
                  pendingViolations.length > 0 ? 'text-amber-700' : 'text-slate-900'
                }`}
              >
                {pendingViolations.length || 3}
              </span>
              <span className="text-xs font-medium text-slate-500">thí sinh nghi vấn</span>
            </div>
            <p className="mt-1 text-xs text-amber-700 font-semibold flex items-center justify-between">
              <span>Cần thẩm định trước khi công bố</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </p>
          </div>
        </Link>

        {/* Thẻ 3: Bài thi chờ công bố điểm */}
        <Link
          href="/instructor/reports"
          className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-blue-400 hover:shadow-sm cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Chờ công bố điểm
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900">1</span>
              <span className="text-xs font-medium text-slate-500">bài thi đã nộp</span>
            </div>
            <p className="mt-1 text-xs text-indigo-600 font-medium flex items-center justify-between">
              <span>Lớp CS101 • Chờ GV mở điểm</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </p>
          </div>
        </Link>

        {/* Thẻ 4: Tỷ lệ chuyên cần vào phòng */}
        <Link
          href="/instructor/classes"
          className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-blue-400 hover:shadow-sm cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Điểm danh tự động (MSSV)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-emerald-600">95.8%</span>
              <span className="text-xs font-medium text-slate-500">(46/48 SV đúng giờ)</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium flex items-center justify-between">
              <span>2 sinh viên chưa vào phòng</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </p>
          </div>
        </Link>
      </div>

      {/* ── 3. KHU VỰC CHÍNH: LỊCH CA HỌC HÔM NAY + NHẮC VIỆC CẦN XỬ LÝ GẤP ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* CỘT TRÁI (2 Cột): DANH SÁCH CA HỌC HÔM NAY */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Lịch Thực Hành &amp; Kiểm Tra Trực Tiếp Hôm Nay
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các phiên máy tính đang mở và ca thi trực tuyến trong ngày
              </p>
            </div>
            <Link
              href="/instructor/schedules"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Xem toàn bộ <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {sessions.map((item) => {
              const isActive = item.status === 'active';
              const isWaiting = item.status === 'waiting';
              const isCompleted = item.status === 'completed';

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 transition space-y-2.5 ${
                    isActive
                      ? 'border-emerald-200/90 bg-emerald-50/20 hover:bg-emerald-50/35 border-l-4 border-l-emerald-500'
                      : isWaiting
                      ? 'border-amber-200/90 bg-amber-50/20 hover:bg-amber-50/35 border-l-4 border-l-amber-500'
                      : 'border-slate-200/80 bg-white hover:bg-slate-50/60 border-l-4 border-l-blue-500'
                  }`}
                >
                  {/* Hàng 1: Badge + Tên Lớp & Ca */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${
                          item.type === 'EXAM'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.type === 'EXAM' ? 'Bài Kiểm Tra' : 'Thực Hành Lab'}
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                          {item.classCode} • {item.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : isWaiting
                            ? 'bg-amber-100 text-amber-800'
                            : isCompleted
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-500 animate-ping'
                              : isWaiting
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        {isActive
                          ? 'Đang mở phòng'
                          : isWaiting
                          ? 'Đang ở phòng chờ'
                          : isCompleted
                          ? 'Đã kết thúc'
                          : 'Chưa mở phòng'}
                      </span>
                    </div>
                  </div>

                  {/* Hàng 2: Chi tiết Giờ, Mã Phòng, Mã PIN có nút Copy 1-Click */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-slate-50/80 border border-slate-200/60 px-3 py-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{item.time}</span>
                    </div>

                    <span className="text-slate-300 hidden sm:inline">•</span>

                    {/* Mã Phòng (Room Code) */}
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 text-[11px]">Phòng:</span>
                      <code className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                        {item.roomCode}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.roomCode, `${item.id}-room`, 'Mã phòng')}
                        className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5"
                        title="Copy mã phòng"
                      >
                        {copiedId === `${item.id}-room` ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>

                    <span className="text-slate-300 hidden sm:inline">•</span>

                    {/* Mã PIN Điểm Danh */}
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 text-[11px]">Mã PIN:</span>
                      <code className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                        {item.pin}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.pin, `${item.id}-pin`, 'Mã PIN')}
                        className="text-blue-600 hover:text-blue-800 cursor-pointer p-0.5"
                        title="Copy mã PIN cho sinh viên"
                      >
                        {copiedId === `${item.id}-pin` ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>

                    <span className="text-slate-300 hidden sm:inline">•</span>

                    {/* Điểm danh */}
                    <div>
                      Sĩ số:{' '}
                      <strong className="text-emerald-700 font-bold">
                        {item.attendedStudents}/{item.totalStudents} SV
                      </strong>
                    </div>
                  </div>

                  {/* Hàng 3: Các nút hành động thực tế - CHỈ CHO PHÉP VÀO GIÁM SÁT KHI LỚP ĐÃ MỞ */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-2">
                      {item.isAiProctored ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700">
                          <ShieldAlert className="h-3 w-3" />
                          Khóa toàn màn hình &amp; AI Camera
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700">
                          <ShieldCheck className="h-3 w-3" />
                          Chế độ Lab Thực hành (Tắt AI)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isActive ? (
                        /* ĐÃ MỞ: Cho phép vào phòng giám sát trực tiếp */
                        <Link
                          href={`/instructor/monitoring?room=${encodeURIComponent(item.roomCode)}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition cursor-pointer"
                        >
                          <Video className="h-3.5 w-3.5" />
                          <span>Vào Giám Sát</span>
                        </Link>
                      ) : isWaiting ? (
                        /* ĐANG Ở PHÒNG CHỜ: Chưa bắt đầu giám sát, chỉ có thể vào phòng chờ để điểm danh & bấm Bắt đầu */
                        <>
                          <span
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-400 border border-slate-200"
                            title="Phòng đang ở chế độ phòng chờ - bấm Vào Phòng Chờ để điểm danh và bắt đầu ca học trước khi giám sát"
                          >
                            <Lock className="h-3 w-3 text-slate-400" />
                            <span>Chưa mở giám sát</span>
                          </span>

                          <Link
                            href={`/instructor/room/${encodeURIComponent(item.roomCode)}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition cursor-pointer"
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span>Vào Phòng Chờ Điểm Danh</span>
                          </Link>
                        </>
                      ) : (
                        /* CHƯA MỞ: Khóa giám sát, cung cấp nút Setup/Mở phòng */
                        <>
                          <span
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-400 border border-slate-200"
                            title="Lớp chưa mở - Không thể vào phòng giám sát"
                          >
                            <Lock className="h-3 w-3 text-slate-400" />
                            <span>Chưa mở giám sát</span>
                          </span>

                          <Link
                            href={`/instructor/room?class=${encodeURIComponent(item.classCode.split('-')[0])}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                          >
                            <Radio className="h-3 w-3 text-blue-600 animate-pulse" />
                            <span>Mở Phòng (Setup)</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleOpenEarly(item.id)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            title="Kích hoạt nhanh để mở phòng và vào giám sát"
                          >
                            Mở phòng nhanh
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CỘT PHẢI (1 Cột): VIỆC CẦN XỬ LÝ GẤP & LỐI TẮT NHANH */}
        <div className="space-y-4">
          {/* Hộp 1: Việc Cần Xử Lý Ngay (Pending Action Items) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <BellRing className="h-3.5 w-3.5 text-amber-500" />
                <span>Việc cần xử lý ngay</span>
              </h2>
              <span className="rounded-full bg-amber-100 px-2 py-0.2 text-[10px] font-bold text-amber-800">
                3 việc
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Task 1: Duyệt vi phạm AI */}
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-2.5 space-y-1 border-l-4 border-l-red-500 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-[11px]">
                    Thẩm định cảnh báo AI (3 SV)
                  </span>
                  <span className="rounded bg-red-100 px-1.5 text-[9px] font-bold text-red-700">
                    Nghiêm trọng
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500">
                  Phát hiện điện thoại &amp; cố ý thoát màn hình ở phòng thi CS101.
                </p>
                <div className="pt-0.5 flex items-center justify-end">
                  <Link
                    href="/instructor/reports"
                    className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>Xem bằng chứng &amp; Duyệt</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>

              {/* Task 2: Công bố điểm */}
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-2.5 space-y-1 border-l-4 border-l-amber-500 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-[11px]">
                    Công bố điểm Lab 03 (CS101)
                  </span>
                  <span className="rounded bg-blue-100 px-1.5 text-[9px] font-bold text-blue-700">
                    Đã chấm
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500">
                  45/45 sinh viên đã nộp bài Docker Sandbox. Điểm đang được ẩn.
                </p>
                <div className="pt-0.5 flex items-center justify-end">
                  <Link
                    href="/instructor/reports"
                    className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>Mở công bố điểm</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>

              {/* Task 3: Kiểm tra đề thi ca chiều */}
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-2.5 space-y-1 border-l-4 border-l-blue-500 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-[11px]">
                    Kiểm tra đề thi OOP Java (PRJ301)
                  </span>
                  <span className="rounded bg-slate-200 px-1.5 text-[9px] font-bold text-slate-600">
                    13:30
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500">
                  Rà soát 5 test cases ẩn và mã PIN phòng thi trước giờ mở ca.
                </p>
                <div className="pt-0.5 flex items-center justify-end">
                  <Link
                    href="/instructor/questions"
                    className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>Kiểm tra đề</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Hộp 2: Lối Tắt Thao Tác Nhanh (Quick Shortcuts) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Lối Tắt Nhanh
            </h2>

            <div className="space-y-1.5">
              <Link
                href="/instructor/classes"
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Table2 className="h-3.5 w-3.5" />
                  </div>
                  <span>Lớp học &amp; Điểm danh MSSV</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>

              <Link
                href="/instructor/questions"
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <FileCode2 className="h-3.5 w-3.5" />
                  </div>
                  <span>Kho Đề Thi &amp; Docker Test Cases</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>

              <Link
                href="/instructor/schedules"
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <span>Lịch &amp; Gia Hạn Phòng Thi</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>

              <Link
                href="/instructor/reports"
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-amber-50 hover:text-amber-700"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                  <span>Thẩm Định AI &amp; Công Bố Điểm</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
