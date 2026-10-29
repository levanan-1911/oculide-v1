"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  Code2,
  GraduationCap,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { studentExams, type ExamStatus, type StudentExam } from "@/components/student/student-data";

type FilterStatus = "Tất cả" | ExamStatus;

const filters: FilterStatus[] = [
  "Tất cả",
  "Sắp diễn ra",
  "Đang diễn ra",
  "Đã hoàn thành",
];

const statusStyles: Record<ExamStatus, string> = {
  "Sắp diễn ra": "bg-amber-50 text-amber-700 border-amber-200/80",
  "Đang diễn ra": "bg-emerald-50 text-emerald-700 border-emerald-200/80 animate-pulse",
  "Đã hoàn thành": "bg-slate-100 text-slate-600 border-slate-200",
};

export default function StudentSchedulePage() {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<FilterStatus>("Tất cả");

  const filteredExams = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return studentExams.filter((exam) => {
      const matchesKeyword =
        !normalizedKeyword ||
        exam.title.toLowerCase().includes(normalizedKeyword) ||
        exam.subject.toLowerCase().includes(normalizedKeyword) ||
        exam.instructor.toLowerCase().includes(normalizedKeyword) ||
        exam.roomCode.toLowerCase().includes(normalizedKeyword);

      const matchesStatus =
        status === "Tất cả" || exam.status === status;

      return matchesKeyword && matchesStatus;
    });
  }, [keyword, status]);

  const upcomingCount = useMemo(
    () => studentExams.filter((exam) => exam.status === "Sắp diễn ra").length,
    []
  );

  const ongoingCount = useMemo(
    () => studentExams.filter((exam) => exam.status === "Đang diễn ra").length,
    []
  );

  return (
    <main className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Header & Navigation */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/student" className="hover:text-blue-600 transition">
                Sinh viên
              </Link>
              <span>/</span>
              <span className="text-blue-600 font-semibold">Lịch thi</span>
            </nav>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Lịch thi của tôi
            </h1>

            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Theo dõi thời gian, trạng thái và thông tin các ca thi lập trình.
            </p>
          </div>

          <Link
            href="/student/exams"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 active:scale-[0.98]"
          >
            <Code2 size={18} />
            Vào phòng thi
            <ArrowRight size={16} />
          </Link>
        </section>

        {/* 3 Thẻ Thống Kê Tương Tác */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1: Tổng số */}
          <button
            type="button"
            onClick={() => setStatus("Tất cả")}
            className={`flex items-center justify-between rounded-2xl border p-5 text-left transition ${
              status === "Tất cả"
                ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-sm"
                : "border-slate-200/80 bg-white hover:border-slate-300"
            }`}
          >
            <div>
              <p className="text-xs font-medium text-slate-500">Tổng số kỳ thi</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{studentExams.length}</p>
              <p className="mt-1 text-[11px] text-slate-400">Danh sách bài thi cá nhân</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <BookOpen size={22} />
            </div>
          </button>

          {/* Card 2: Sắp diễn ra */}
          <button
            type="button"
            onClick={() => setStatus("Sắp diễn ra")}
            className={`flex items-center justify-between rounded-2xl border p-5 text-left transition ${
              status === "Sắp diễn ra"
                ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-sm"
                : "border-slate-200/80 bg-white hover:border-slate-300"
            }`}
          >
            <div>
              <p className="text-xs font-medium text-slate-500">Sắp diễn ra</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{upcomingCount}</p>
              <p className="mt-1 text-[11px] text-slate-400">Chuẩn bị trước giờ thi</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <CalendarDays size={22} />
            </div>
          </button>

          {/* Card 3: Đang diễn ra */}
          <button
            type="button"
            onClick={() => setStatus("Đang diễn ra")}
            className={`flex items-center justify-between rounded-2xl border p-5 text-left transition ${
              status === "Đang diễn ra"
                ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm"
                : "border-slate-200/80 bg-white hover:border-slate-300"
            }`}
          >
            <div>
              <p className="text-xs font-medium text-slate-500">Đang diễn ra</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{ongoingCount}</p>
              <p className="mt-1 text-[11px] text-slate-400">Có thể tham gia ngay</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Clock3 size={22} />
            </div>
          </button>
        </section>

        {/* Bảng Danh sách & Tìm kiếm */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {/* Controls Bar */}
          <div className="border-b border-slate-100 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Danh sách lịch thi
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Tìm kiếm và lọc các ca thi lập trình theo trạng thái
                </p>
              </div>

              {/* Ô tìm kiếm */}
              <div className="relative w-full lg:max-w-sm">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tìm tên bài thi, môn học, mã phòng..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-9 text-xs sm:text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
                {keyword && (
                  <button
                    type="button"
                    onClick={() => setKeyword("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100/80">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <SlidersHorizontal size={14} />
                  Lọc trạng thái:
                </span>

                {filters.map((f) => {
                  const count =
                    f === "Tất cả"
                      ? studentExams.length
                      : studentExams.filter((e) => e.status === f).length;

                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setStatus(f)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        status === f
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70"
                      }`}
                    >
                      {f}
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                          status === f
                            ? "bg-white/20 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {(keyword || status !== "Tất cả") && (
                <button
                  type="button"
                  onClick={() => {
                    setKeyword("");
                    setStatus("Tất cả");
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition"
                >
                  <RotateCcw size={12} /> Đặt lại lọc
                </button>
              )}
            </div>
          </div>

          {/* List Items */}
          <div className="divide-y divide-slate-100">
            {filteredExams.map((exam: StudentExam) => (
              <article
                key={exam.id}
                className="flex flex-col justify-between gap-4 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:p-6"
              >
                <div className="flex min-w-0 items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mt-0.5">
                    <Code2 size={21} />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                      {exam.title}
                    </h3>

                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span>{exam.subject}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <GraduationCap size={13} className="text-slate-400" />
                        {exam.instructor}
                      </span>
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-1">
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <CalendarDays size={13} className="text-blue-600" />
                        {exam.startTime}
                      </span>

                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Clock3 size={13} className="text-violet-600" />
                        {exam.duration} phút
                      </span>

                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-slate-400">Mã phòng:</span>
                        <code className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                          {exam.roomCode}
                        </code>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold border ${statusStyles[exam.status]}`}
                  >
                    {exam.status}
                  </span>

                  {exam.status !== "Đã hoàn thành" ? (
                    <Link
                      href={`/student/exams?code=${encodeURIComponent(exam.roomCode)}`}
                      className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
                    >
                      {exam.status === "Đang diễn ra"
                        ? "Vào phòng thi"
                        : "Xem chi tiết"}
                      <ArrowRight size={14} />
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">
                      Đã kết thúc
                    </span>
                  )}
                </div>
              </article>
            ))}

            {filteredExams.length === 0 && (
              <div className="px-5 py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Search size={22} />
                </div>
                <h3 className="mt-3 font-bold text-slate-800 text-sm">
                  Không tìm thấy kỳ thi phù hợp
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Hãy thử từ khóa khác hoặc bỏ các bộ lọc đang chọn.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setKeyword("");
                    setStatus("Tất cả");
                  }}
                  className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-slate-200 transition"
                >
                  <RotateCcw size={13} />
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500 flex items-center justify-between">
            <span>Hiển thị {filteredExams.length} / {studentExams.length} kỳ thi</span>
            <span className="text-[11px] text-slate-400">Dữ liệu được cập nhật tự động</span>
          </div>
        </section>

        <footer className="pt-2 text-center text-xs text-slate-400">
          Oculide · Hệ thống thi lập trình trực tuyến
        </footer>
      </div>
    </main>
  );
}