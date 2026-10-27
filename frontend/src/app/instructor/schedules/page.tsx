'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Code2,
  Users,
  Video,
  Play,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Plus,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

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
  roomCode: string;
  passcode: string;
  status: 'Đang diễn ra' | 'Sắp diễn ra' | 'Đã kết thúc';
  enrolledStudents: number;
  attendedStudents: number;
  isAiProctored: boolean;
}

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
    roomCode: 'CS101-LAB3',
    passcode: '883921',
    status: 'Đang diễn ra',
    enrolledStudents: 48,
    attendedStudents: 46,
    isAiProctored: true,
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
    roomCode: 'CS102-PTR',
    passcode: '372109',
    status: 'Đã kết thúc',
    enrolledStudents: 47,
    attendedStudents: 45,
    isAiProctored: true,
  },
];

export default function InstructorSchedulesPage() {
  const [sessions, setSessions] = useState<InstructorSession[]>(INITIAL_SESSIONS);
  const [filterType, setFilterType] = useState<'all' | 'LAB' | 'EXAM' | 'active' | 'upcoming'>('all');
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    showToast(`Đã sao chép: ${text}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenRoomEarly = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: 'Đang diễn ra' } : s))
    );
    showToast('Phòng thi đã được mở sớm thành công. Sinh viên đã có thể tham gia!');
  };

  const handleExtendSession = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          endTime: s.endTime + ' (+15p)',
        };
      })
    );
    showToast('Đã gia hạn thêm 15 phút làm bài cho phòng thi!');
  };

  const filteredSessions = sessions.filter((s) => {
    const matchSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.classCode.toLowerCase().includes(search.toLowerCase()) ||
      s.roomCode.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    if (filterType === 'LAB') return s.type === 'LAB';
    if (filterType === 'EXAM') return s.type === 'EXAM';
    if (filterType === 'active') return s.status === 'Đang diễn ra';
    if (filterType === 'upcoming') return s.status === 'Sắp diễn ra';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center pb-4 border-b border-slate-200">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
            Không gian Giảng viên
          </p>
          <h1 className="mt-0.5 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Lịch & Phiên Kiểm Tra Trực Tuyến
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Quản lý ca thực hành Lab, kích hoạt phòng thi và giám sát AI trực tiếp theo thời gian thực.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/instructor/monitoring"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 cursor-pointer"
          >
            <Video className="h-3.5 w-3.5" />
            <span>Màn hình LiveKit</span>
          </Link>
        </div>
      </div>

      {/* Thẻ thống kê 4 cột */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Ca thi hôm nay
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">3</span>
            <span className="text-xs font-semibold text-slate-600">phiên kiểm tra</span>
          </div>
          <p className="mt-1 text-xs text-blue-600 font-medium">2 Lab • 1 Kiểm tra</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Phòng đang mở
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Play className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">1</span>
            <span className="text-xs font-bold text-emerald-600">CS101-LAB3</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">46/48 SV đã vào phòng</p>
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
            <span className="text-2xl font-black text-slate-900">135</span>
            <span className="text-xs font-semibold text-slate-600">sinh viên tham gia</span>
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
            <span className="text-2xl font-black text-slate-900">3/4</span>
            <span className="text-xs font-semibold text-amber-600 font-bold">phiên bật AI</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Bắt tab & nhận diện khuôn mặt</p>
        </div>
      </div>

      {/* Thanh tìm kiếm & bộ lọc */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã lớp, tên bài thi hoặc mã phòng..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'active', label: 'Đang diễn ra' },
            { id: 'upcoming', label: 'Sắp diễn ra' },
            { id: 'LAB', label: 'Bài Lab' },
            { id: 'EXAM', label: 'Thi / Kiểm tra' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id as any)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                filterType === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách các phiên thi / thực hành */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Clock className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-bold text-slate-700">Không tìm thấy ca kiểm tra nào</p>
            <p className="text-xs text-slate-400 mt-1">Hãy thử tìm kiếm với từ khóa khác</p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-md ${
                session.status === 'Đang diễn ra'
                  ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                  : 'border-slate-200/90'
              }`}
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                {/* Cột trái: Thông tin phiên */}
                <div className="flex items-start gap-4 min-w-0">
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
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-medium text-slate-500">
                        {session.className}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          session.status === 'Đang diễn ra'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : session.status === 'Sắp diễn ra'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {session.status === 'Đang diễn ra' && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        {session.status}
                      </span>
                      {session.isAiProctored && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                          <ShieldCheck className="h-3 w-3" />
                          AI Proctor
                        </span>
                      )}
                    </div>

                    <h3 className="mt-1 text-base font-bold text-slate-900 truncate">
                      {session.title}
                    </h3>

                    {/* Meta info */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <strong>{session.startTime} - {session.endTime}</strong> ({session.date})
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Code2 className="h-3.5 w-3.5 text-slate-400" />
                        Ngôn ngữ: <strong className="text-slate-700">{session.language}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        Điểm danh:{' '}
                        <strong className="text-slate-800">
                          {session.attendedStudents}/{session.enrolledStudents} SV
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cột phải: Mã phòng & Hành động */}
                <div className="flex flex-wrap items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                  {/* Khối mã phòng & passcode */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Mã phòng:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(session.roomCode, `code-${session.id}`)}
                        className="font-mono font-bold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
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
                        onClick={() => copyToClipboard(session.passcode, `pass-${session.id}`)}
                        className="font-mono font-bold text-slate-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        title="Bấm để sao chép"
                      >
                        {session.passcode}
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Nút hành động */}
                  {session.status === 'Đang diễn ra' ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleExtendSession(session.id)}
                        className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition cursor-pointer"
                      >
                        +15 Phút
                      </button>
                      <Link
                        href="/instructor/monitoring"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition cursor-pointer"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Giám sát ngay →
                      </Link>
                    </div>
                  ) : session.status === 'Sắp diễn ra' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenRoomEarly(session.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 transition cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Mở phòng sớm
                    </button>
                  ) : (
                    <Link
                      href="/instructor/reports"
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Xem báo cáo
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
