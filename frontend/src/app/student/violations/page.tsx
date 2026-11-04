'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  CheckCircle2,
  Clock,
  Info,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

type ViolationStatus = 'pending' | 'rejected' | 'approved';

interface ViolationItem {
  id: number;
  examTitle: string;
  timestamp: string;
  type: string;
  typeName: string;
  duration: string;
  status: ViolationStatus;
  statusText: string;
  statusClass: string;
  evidenceNote: string;
}

const initialViolations: ViolationItem[] = [
  {
    id: 1,
    examTitle: 'PRJ301 • Kiểm Tra Giữa Kỳ Java OOP',
    timestamp: '27/10/2026 14:15:22',
    type: 'TAB_SWITCH',
    typeName: 'Rời khỏi cửa sổ thi (Chuyển Tab)',
    duration: '12 giây',
    status: 'pending',
    statusText: 'Đang chờ GV xem xét',
    statusClass: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
    evidenceNote: 'Hệ thống phát hiện mất tiêu điểm màn hình thi 12 giây.',
  },
  {
    id: 2,
    examTitle: 'CS101 • Thực Hành C++ Lab 02',
    timestamp: '20/10/2026 09:32:05',
    type: 'HEAD_POSE',
    typeName: 'Quay mặt khỏi camera > 10s',
    duration: '15 giây',
    status: 'rejected',
    statusText: 'Đã hủy (Không tính vi phạm)',
    statusClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10',
    evidenceNote: 'Giảng viên đã xác nhận sinh viên cúi xuống ghi nháp.',
  },
];

export default function StudentViolationsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredViolations = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return initialViolations.filter((v) => {
      const matchesSearch =
        !keyword ||
        v.examTitle.toLowerCase().includes(keyword) ||
        v.typeName.toLowerCase().includes(keyword) ||
        v.evidenceNote.toLowerCase().includes(keyword);

      const matchesStatus =
        filterStatus === 'all' || v.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [search, filterStatus]);

  const counts = useMemo(
    () => ({
      all: initialViolations.length,
      pending: initialViolations.filter((v) => v.status === 'pending').length,
      rejected: initialViolations.filter((v) => v.status === 'rejected').length,
      approved: initialViolations.filter((v) => v.status === 'approved').length,
    }),
    []
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Navigation & Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Link href="/student" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              Sinh viên
            </Link>
            <span>/</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">Nhật ký cảnh báo AI</span>
          </nav>

          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Nhật ký cảnh báo AI &amp; Vi phạm cá nhân
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Minh bạch toàn bộ sự kiện cảnh báo từ hệ thống AI giám sát webcam và màn hình.
          </p>
        </div>

        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 border border-blue-200/80 shadow-2xs dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/20">
          <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          Chính sách đạo đức AI Oculide
        </div>
      </header>

      {/* Banner Thông báo Đạo đức AI */}
      <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5 flex items-start gap-3.5 dark:border-blue-500/20 dark:bg-blue-950/20">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed space-y-1">
          <p>
            <strong className="font-bold">Lưu ý quan trọng:</strong> Hệ thống AI chỉ tự động ghi nhận các khoảnh khắc bất thường ở trạng thái tạm thời (<code className="rounded bg-white/80 dark:bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-bold border border-blue-200/60 dark:border-blue-500/30 text-blue-800 dark:text-blue-300">Chờ GV xem xét</code>).
          </p>
          <p className="text-blue-800/90 dark:text-blue-300/80">
            AI <strong>không bao giờ</strong> tự ý trừ điểm bài thi của bạn. Quyết định cuối cùng luôn do chính Giảng viên bộ môn xem xét bằng chứng video/ảnh chụp và phê duyệt.
          </p>
        </div>
      </div>

      {/* Thẻ Thống kê 3 Trạng thái */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#11141d]">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng số cờ cảnh báo AI</p>
            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">{counts.all}</p>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Toàn bộ lịch sử ca thi</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Camera size={22} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#11141d]">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Đang chờ Giảng viên duyệt</p>
            <p className="mt-2 text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums">{counts.pending}</p>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Chưa trừ điểm chính thức</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <ShieldAlert size={22} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#11141d]">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Đã miễn vi phạm (Đã hủy)</p>
            <p className="mt-2 text-3xl font-black text-slate-700 dark:text-slate-300 font-mono tabular-nums">{counts.rejected}</p>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">GV đã xác nhận hợp lệ</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </section>

      {/* Filter Controls */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5 dark:border-white/10 dark:bg-[#11141d]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Danh sách nhật ký vi phạm</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tìm kiếm và tra cứu chi tiết ảnh chụp bằng chứng AI</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên môn, loại hành vi..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs sm:text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                }`}
              >
                Tất cả ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('pending')}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                  filterStatus === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                }`}
              >
                Chờ xem xét ({counts.pending})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('rejected')}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                  filterStatus === 'rejected'
                    ? 'bg-slate-800 text-white dark:bg-white/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                }`}
              >
                Đã hủy ({counts.rejected})
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Table & Cards */}
      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-white/10 dark:bg-[#11141d]">
        {filteredViolations.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase font-semibold text-[11px] tracking-wider dark:bg-white/[0.03] dark:border-white/10 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-3.5">Ca thi / Bài Lab</th>
                    <th className="px-6 py-3.5">Thời gian ghi nhận</th>
                    <th className="px-6 py-3.5">Loại hành vi cảnh báo</th>
                    <th className="px-6 py-3.5">Thời lượng</th>
                    <th className="px-6 py-3.5">Trạng thái xử lý</th>
                    <th className="px-6 py-3.5 text-right">Ghi chú AI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredViolations.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white text-sm">
                        {item.examTitle}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">
                        {item.timestamp}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                        {item.typeName}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                        {item.duration}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${item.statusClass}`}
                        >
                          {item.statusText}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400 text-xs">
                        {item.evidenceNote}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="space-y-3 p-4 md:hidden">
              {filteredViolations.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200/80 p-4 space-y-2.5 dark:border-white/10 dark:bg-white/[0.02]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {item.examTitle}
                    </h3>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border ${item.statusClass}`}
                    >
                      {item.statusText}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {item.typeName} ({item.duration})
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/5 pt-2">
                    {item.evidenceNote}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-1 font-mono">
                    <span>{item.timestamp}</span>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="px-6 py-14 text-center">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
            <h3 className="mt-3 font-bold text-slate-900 dark:text-white text-sm">
              Không có cảnh báo vi phạm
            </h3>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Bạn có lịch sử thi rất tốt! Không có hành vi bất thường nào bị ghi nhận.
            </p>
          </div>
        )}
      </section>

      <footer className="pt-2 text-center text-xs text-slate-400 dark:text-slate-500">
        Oculide · Hệ thống thi lập trình trực tuyến
      </footer>
    </div>
  );
}
