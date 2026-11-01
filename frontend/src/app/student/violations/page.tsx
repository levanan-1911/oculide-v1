"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  Clock,
  Info,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

type ViolationStatus = "pending" | "rejected" | "approved";

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
    examTitle: "PRJ301 • Kiểm Tra Giữa Kỳ Java OOP",
    timestamp: "27/10/2026 14:15:22",
    type: "TAB_SWITCH",
    typeName: "Rời khỏi cửa sổ thi (Chuyển Tab)",
    duration: "12 giây",
    status: "pending",
    statusText: "Đang chờ GV xem xét",
    statusClass: "bg-amber-50 text-amber-700 border-amber-200/80",
    evidenceNote: "Hệ thống phát hiện mất tiêu điểm màn hình thi 12 giây.",
  },
  {
    id: 2,
    examTitle: "CS101 • Thực Hành C++ Lab 02",
    timestamp: "20/10/2026 09:32:05",
    type: "HEAD_POSE",
    typeName: "Quay mặt khỏi camera > 10s",
    duration: "15 giây",
    status: "rejected",
    statusText: "Đã hủy (Không tính vi phạm)",
    statusClass: "bg-slate-100 text-slate-600 border-slate-200",
    evidenceNote: "Giảng viên đã xác nhận sinh viên cúi xuống ghi nháp.",
  },
];

export default function StudentViolationsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredViolations = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return initialViolations.filter((v) => {
      const matchesSearch =
        !keyword ||
        v.examTitle.toLowerCase().includes(keyword) ||
        v.typeName.toLowerCase().includes(keyword) ||
        v.evidenceNote.toLowerCase().includes(keyword);

      const matchesStatus =
        filterStatus === "all" || v.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [search, filterStatus]);

  const counts = useMemo(
    () => ({
      all: initialViolations.length,
      pending: initialViolations.filter((v) => v.status === "pending").length,
      rejected: initialViolations.filter((v) => v.status === "rejected").length,
      approved: initialViolations.filter((v) => v.status === "approved").length,
    }),
    []
  );

  return (
    <main className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Navigation & Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/student" className="hover:text-blue-600 transition">
                Sinh viên
              </Link>
              <span>/</span>
              <span className="text-blue-600 font-semibold">Nhật ký cảnh báo AI</span>
            </nav>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Nhật ký cảnh báo AI &amp; Vi phạm cá nhân
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Minh bạch toàn bộ sự kiện cảnh báo từ hệ thống AI giám sát webcam và màn hình.
            </p>
          </div>

          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 border border-blue-200/80 shadow-2xs">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            Chính sách đạo đức AI Oculide
          </div>
        </header>

        {/* Banner Thông báo Đạo đức AI */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5 flex items-start gap-3.5">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed space-y-1">
            <p>
              <strong className="font-bold">Lưu ý quan trọng:</strong> Hệ thống AI chỉ tự động ghi nhận các khoảnh khắc bất thường ở trạng thái tạm thời (<code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[11px] font-bold border border-blue-200/60 text-blue-800">Chờ GV xem xét</code>).
            </p>
            <p className="text-blue-800/90">
              AI <strong>không bao giờ</strong> tự ý trừ điểm bài thi của bạn. Quyết định cuối cùng luôn do chính Giảng viên bộ môn xem xét bằng chứng video/ảnh chụp và phê duyệt.
            </p>
          </div>
        </div>

        {/* Thẻ Thống Kê Tổng Quan */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-medium text-slate-500">Tổng ghi nhận cảnh báo</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{counts.all}</p>
              <p className="mt-1 text-[11px] text-slate-400">Tất cả bài thi</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldAlert size={22} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-medium text-slate-500">Đang chờ GV xem xét</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{counts.pending}</p>
              <p className="mt-1 text-[11px] text-slate-400">Trạng thái tạm thời</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock size={22} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-medium text-slate-500">Đã miễn vi phạm (Đã hủy)</p>
              <p className="mt-2 text-3xl font-bold text-slate-700">{counts.rejected}</p>
              <p className="mt-1 text-[11px] text-slate-400">GV đã xác nhận hợp lệ</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </section>

        {/* Filter Controls */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Danh sách nhật ký vi phạm</h2>
              <p className="text-xs text-slate-500">Tìm kiếm và tra cứu chi tiết ảnh chụp bằng chứng AI</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative sm:w-72">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm tên môn, loại hành vi..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    filterStatus === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Tất cả ({counts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("pending")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    filterStatus === "pending"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Chờ xem xét ({counts.pending})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("rejected")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    filterStatus === "rejected"
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Đã hủy ({counts.rejected})
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Table & Cards */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {filteredViolations.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase font-semibold text-[11px] tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Ca thi / Bài Lab</th>
                      <th className="px-6 py-3.5">Thời gian ghi nhận</th>
                      <th className="px-6 py-3.5">Loại hành vi cảnh báo</th>
                      <th className="px-6 py-3.5">Thời lượng</th>
                      <th className="px-6 py-3.5">Trạng thái xử lý</th>
                      <th className="px-6 py-3.5 text-right">Chi tiết Bằng chứng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredViolations.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                          {item.examTitle}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500">
                          {item.timestamp}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-800">
                            {item.typeName}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {item.evidenceNote}
                          </p>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-slate-700">
                          {item.duration}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.statusClass}`}
                          >
                            {item.statusText}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              alert(
                                `[BẰNG CHỨNG AI GHI NHẬN]\n\nCa thi: ${item.examTitle}\nThời gian: ${item.timestamp}\nHành vi: ${item.typeName}\nThời lượng: ${item.duration}\n\nGhi chú: ${item.evidenceNote}`
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Camera size={14} className="text-slate-400" />
                            Xem ảnh chụp
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="space-y-3 p-4 md:hidden">
                {filteredViolations.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200/80 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">
                        {item.examTitle}
                      </h3>
                      <span
                        className={`inline-block shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${item.statusClass}`}
                      >
                        {item.statusText}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-slate-800">{item.typeName}</p>
                      <p className="text-slate-500 text-[11px]">{item.evidenceNote}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                      <span className="font-mono">{item.timestamp}</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {item.duration}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          `[BẰNG CHỨNG AI GHI NHẬN]\n\nCa thi: ${item.examTitle}\nThời gian: ${item.timestamp}\nHành vi: ${item.typeName}\nThời lượng: ${item.duration}\n\nGhi chú: ${item.evidenceNote}`
                        )
                      }
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Camera size={14} className="text-slate-400" />
                      Xem ảnh chụp bằng chứng
                    </button>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="px-6 py-14 text-center">
              <ShieldAlert size={32} className="mx-auto text-slate-300" />
              <h3 className="mt-3 font-semibold text-slate-900 text-sm">
                Không tìm thấy ghi nhận cảnh báo
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Không có sự kiện vi phạm nào phù hợp với từ khóa hoặc bộ lọc.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterStatus("all");
                }}
                className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition"
              >
                <RotateCcw size={12} /> Xóa bộ lọc
              </button>
            </div>
          )}
        </section>

        <footer className="pt-2 text-center text-xs text-slate-400">
          Oculide · Hệ thống thi lập trình trực tuyến
        </footer>
      </div>
    </main>
  );
}