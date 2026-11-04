'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  FileCode2,
  HelpCircle,
  Laptop,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { studentExams, type StudentExam } from '@/components/student/student-data';

type FilterStatus = 'Tất cả' | 'Sắp diễn ra' | 'Đang diễn ra' | 'Đã hoàn thành';

// Dữ liệu mẫu biểu đồ
const scoreHistory = [
  { exam: 'Lập trình C++', score: 100, date: '15/10' },
  { exam: 'Thuật toán cơ bản', score: 85, date: '18/10' },
  { exam: 'Cấu trúc dữ liệu', score: 90, date: '22/10' },
  { exam: 'OOP Java', score: 75, date: '25/10' },
  { exam: 'Python Advance', score: 95, date: '28/10' },
];

const languageDistribution = [
  { name: 'C++', percentage: 55, color: 'bg-blue-600', count: '12 bài' },
  { name: 'Python', percentage: 25, color: 'bg-amber-500', count: '5 bài' },
  { name: 'Java', percentage: 15, color: 'bg-rose-500', count: '3 bài' },
  { name: 'JavaScript', percentage: 5, color: 'bg-emerald-500', count: '1 bài' },
];

const statusStyles: Record<string, string> = {
  'Sắp diễn ra':
    'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
  'Đang diễn ra':
    'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 animate-pulse',
  'Đã hoàn thành':
    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10',
};

export default function StudentDashboardPage() {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('Tất cả');

  const counts = useMemo(
    () => ({
      all: studentExams.length,
      upcoming: studentExams.filter((e) => e.status === 'Sắp diễn ra').length,
      ongoing: studentExams.filter((e) => e.status === 'Đang diễn ra').length,
      completed: studentExams.filter((e) => e.status === 'Đã hoàn thành').length,
    }),
    []
  );

  const filteredExams = useMemo(() => {
    if (activeFilter === 'Tất cả') return studentExams;
    return studentExams.filter((exam) => exam.status === activeFilter);
  }, [activeFilter]);

  const avgScore = useMemo(() => {
    const total = scoreHistory.reduce((acc, curr) => acc + curr.score, 0);
    return Math.round(total / scoreHistory.length);
  }, []);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Banner Chào mừng */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-6 text-white shadow-md sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Sparkles size={13} className="text-blue-200" />
              STUDENT WORKSPACE
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Xin chào, sinh viên!
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Theo dõi tiến độ học tập, chuẩn bị thiết bị và tham gia các ca thi lập trình trực tuyến an toàn.
            </p>
          </div>

          <Link
            href="/student/exams"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-bold text-blue-700 shadow-md transition hover:bg-blue-50 active:scale-[0.98] cursor-pointer"
          >
            <Code2 size={18} />
            <span>Vào phòng thi</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* 1. THẺ THỐNG KÊ TƯƠNG TÁC */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Tổng quan kỳ thi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhấn vào từng thẻ để lọc nhanh danh sách bên dưới
            </p>
          </div>
          {activeFilter !== 'Tất cả' && (
            <button
              type="button"
              onClick={() => setActiveFilter('Tất cả')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline transition cursor-pointer"
            >
              <RotateCcw size={12} /> Bỏ lọc ({activeFilter})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Tất cả */}
          <button
            type="button"
            onClick={() => setActiveFilter('Tất cả')}
            className={`flex items-center justify-between rounded-2xl border p-5 text-left transition-all cursor-pointer ${
              activeFilter === 'Tất cả'
                ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-sm dark:bg-blue-500/10 dark:border-blue-500/40'
                : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-[#11141d] dark:hover:border-white/20'
            }`}
          >
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Tổng số kỳ thi
              </p>
              <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                {counts.all}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Danh sách bài thi cá nhân
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
              <BookOpen size={22} />
            </div>
          </button>

          {/* Sắp diễn ra */}
          <button
            type="button"
            onClick={() => setActiveFilter('Sắp diễn ra')}
            className={`flex items-center justify-between rounded-2xl border p-5 text-left transition-all cursor-pointer ${
              activeFilter === 'Sắp diễn ra'
                ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-sm dark:bg-amber-500/10 dark:border-amber-500/40'
                : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-[#11141d] dark:hover:border-white/20'
            }`}
          >
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Sắp diễn ra
              </p>
              <p className="mt-2 text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {counts.upcoming}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Cần chuẩn bị thiết bị
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <Clock size={22} />
            </div>
          </button>

          {/* Đang diễn ra */}
          <button
            type="button"
            onClick={() => setActiveFilter('Đang diễn ra')}
            className={`flex items-center justify-between rounded-2xl border p-5 text-left transition-all cursor-pointer ${
              activeFilter === 'Đang diễn ra'
                ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm dark:bg-emerald-500/10 dark:border-emerald-500/40'
                : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-[#11141d] dark:hover:border-white/20'
            }`}
          >
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Đang mở phòng
              </p>
              <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {counts.ongoing}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Có thể vào thi ngay
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <Code2 size={22} />
            </div>
          </button>

          {/* Đã hoàn thành */}
          <button
            type="button"
            onClick={() => setActiveFilter('Đã hoàn thành')}
            className={`flex items-center justify-between rounded-2xl border p-5 text-left transition-all cursor-pointer ${
              activeFilter === 'Đã hoàn thành'
                ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-sm dark:bg-blue-500/10 dark:border-blue-500/40'
                : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-[#11141d] dark:hover:border-white/20'
            }`}
          >
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Đã hoàn thành
              </p>
              <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                {counts.completed}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Xem lại điểm & bài nộp
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <CheckCircle2 size={22} />
            </div>
          </button>
        </div>
      </section>

      {/* 2. KHU VỰC THỐNG KÊ CHI TIẾT & BIỂU ĐỒ */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lịch sử điểm số */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#11141d] lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Lịch sử điểm số gần đây
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Điểm trung bình hiện tại:{' '}
                  <span className="font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                    {avgScore} / 100
                  </span>
                </p>
              </div>
            </div>

            <Link
              href="/student/submissions"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Chi tiết →
            </Link>
          </div>

          <div className="pt-2">
            <div className="grid grid-cols-5 gap-3 items-end h-44 border-b border-slate-100 dark:border-white/10 pb-3">
              {scoreHistory.map((item, idx) => {
                const heightPercent = `${item.score}%`;
                const isTop = item.score >= 90;
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.score}đ
                    </span>
                    <div className="w-full max-w-[48px] rounded-t-lg bg-slate-100 dark:bg-white/5 relative flex items-end justify-center overflow-hidden h-full">
                      <div
                        style={{ height: heightPercent }}
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          isTop
                            ? 'bg-blue-600 dark:bg-blue-500'
                            : 'bg-blue-400 dark:bg-blue-600/70'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[80px] text-center">
                      {item.date}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              <span>5 bài thi gần nhất</span>
              <span>Thang điểm: 100</span>
            </div>
          </div>
        </div>

        {/* Phân bố ngôn ngữ */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#11141d] space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <FileCode2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Ngôn ngữ sử dụng
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thống kê bài làm Sandbox
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
              {languageDistribution.map((lang) => (
                <div
                  key={lang.name}
                  style={{ width: `${lang.percentage}%` }}
                  className={`${lang.color} transition-all`}
                  title={`${lang.name}: ${lang.percentage}%`}
                />
              ))}
            </div>

            <div className="space-y-2.5 pt-2">
              {languageDistribution.map((lang) => (
                <div key={lang.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${lang.color}`} />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {lang.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-400 dark:text-slate-500">
                      {lang.count}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {lang.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. DANH SÁCH BÀI THI & CARD HƯỚNG DẪN */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Danh sách bài thi (2 cột) */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Danh sách ca thi</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300 font-mono">
                {filteredExams.length}
              </span>
            </h2>

            <Link
              href="/student/schedule"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Xem toàn bộ lịch thi →
            </Link>
          </div>

          <div className="space-y-3">
            {filteredExams.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-[#11141d]">
                <BookOpen size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                  Không tìm thấy kỳ thi nào
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Không có ca thi nào phù hợp với bộ lọc &quot;{activeFilter}&quot;.
                </p>
              </div>
            ) : (
              filteredExams.map((exam) => (
                <div
                  key={exam.id}
                  className="group relative flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-slate-300 dark:border-white/10 dark:bg-[#11141d] dark:hover:border-white/20 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200/60 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/20 font-mono">
                        {exam.roomCode}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                          statusStyles[exam.status] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {exam.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                      {exam.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {exam.subject}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 dark:text-slate-500 pt-1 font-mono">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={13} /> {exam.startTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> {exam.duration} phút
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {exam.status === 'Đang diễn ra' ? (
                      <Link
                        href={`/student/exams?code=${exam.roomCode}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-500 active:scale-[0.98] cursor-pointer"
                      >
                        <span>Vào thi ngay</span>
                        <ArrowRight size={14} />
                      </Link>
                    ) : exam.status === 'Sắp diễn ra' ? (
                      <Link
                        href="/student/device-check"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                      >
                        <Laptop size={14} />
                        <span>Kiểm tra máy</span>
                      </Link>
                    ) : (
                      <Link
                        href="/student/submissions"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                      >
                        <span>Xem kết quả</span>
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cột phải: Khối nhắc nhở & Thiết bị */}
        <div className="space-y-4">
          {/* Card Thiết bị */}
          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3 dark:border-white/10 dark:bg-[#11141d]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                  Chuẩn bị thiết bị thi
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Yêu cầu kỹ thuật bắt buộc
                </p>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Webcam hoạt động rõ nét và đủ ánh sáng</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Kết nối Internet ổn định suốt ca thi</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Sử dụng trình duyệt Chrome hoặc Edge</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Sẵn sàng cấp quyền chia sẻ màn hình</span>
              </li>
            </ul>

            <Link
              href="/student/device-check"
              className="block text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline transition pt-1"
            >
              Kiểm tra thiết bị ngay →
            </Link>
          </section>

          {/* Thẻ lưu ý quy chế */}
          <section className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5 space-y-2 dark:border-blue-500/20 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
              <Code2 size={18} className="text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-xs">Lưu ý khi làm bài</h3>
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-200/90 leading-relaxed">
              Chỉ nộp bài khi đã hoàn thành các câu hỏi. Hệ thống sẽ tự động ghi nhận nhật ký thao tác và vi phạm nếu chuyển tab/cửa sổ.
            </p>
          </section>
        </div>
      </div>

      <footer className="pt-2 text-center text-xs text-slate-400 dark:text-slate-500">
        Oculide · Hệ thống thi lập trình trực tuyến
      </footer>
    </div>
  );
}
