"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  Code2,
  GraduationCap,
  LoaderCircle,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { fetchWithAuth } from "@/services/apiClient";
import {
  mapApiRoomToStudentExam,
  type ApiStudentRoom,
  type ExamStatus,
  type StudentExam,
} from "@/components/student/student-data";

type FilterStatus = "Tất cả" | ExamStatus;

const filters: FilterStatus[] = [
  "Tất cả",
  "Sắp diễn ra",
  "Đang diễn ra",
  "Đã kết thúc",
];

const statusStyles: Record<string, string> = {
  "Sắp diễn ra": "bg-slate-50 text-slate-700 border-slate-300 dark:bg-white/5 dark:text-slate-300 dark:border-white/10",
  "Đang diễn ra": "bg-slate-50 text-slate-700 border-slate-300 dark:bg-white/5 dark:text-slate-300 dark:border-white/10",
  "Đã kết thúc": "bg-stone-100 text-stone-600 border-stone-200 dark:bg-white/5 dark:text-stone-400 dark:border-white/10",
};

export default function StudentSchedulePage() {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<FilterStatus>("Tất cả");
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth<ApiStudentRoom[]>("/api/v1/rooms?limit=100");
      if (Array.isArray(data)) {
        setExams(data.map(mapApiRoomToStudentExam));
      } else {
        setExams([]);
      }
    } catch {
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const filteredExams = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return exams.filter((exam) => {
      const matchesKeyword =
        !normalizedKeyword ||
        exam.title.toLowerCase().includes(normalizedKeyword) ||
        exam.subject.toLowerCase().includes(normalizedKeyword) ||
        exam.instructor.toLowerCase().includes(normalizedKeyword) ||
        exam.roomCode.toLowerCase().includes(normalizedKeyword) ||
        (exam.classCode || "").toLowerCase().includes(normalizedKeyword);

      const matchesStatus =
        status === "Tất cả" ||
        exam.status === status ||
        (status === "Đã kết thúc" && (exam.status === "Đã kết thúc" || (exam.status as string) === "Đã hoàn thành"));

      return matchesKeyword && matchesStatus;
    });
  }, [keyword, status, exams]);

  const upcomingCount = useMemo(
    () => exams.filter((exam) => exam.status === "Sắp diễn ra").length,
    [exams]
  );

  const ongoingCount = useMemo(
    () => exams.filter((exam) => exam.status === "Đang diễn ra").length,
    [exams]
  );

  const completedCount = useMemo(
    () => exams.filter((exam) => exam.status === "Đã kết thúc" || exam.status === ("Đã hoàn thành" as any)).length,
    [exams]
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Header & Navigation */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <nav className="flex items-center gap-2 font-mono text-xs font-medium text-slate-500 dark:text-[#9F9690]">
            <Link href="/student" className="hover:text-slate-900 dark:hover:text-white transition">
              Sinh viên
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-semibold">Lịch thi</span>
          </nav>

          <h1 className="mt-2 text-2xl font-serif font-bold tracking-tight text-[#2A282D] dark:text-white sm:text-3xl">
            Lịch thi của tôi
          </h1>

          <p className="mt-1 text-xs sm:text-sm text-[#5A5555] dark:text-[#9F9690]">
            Theo dõi thời gian, trạng thái và thông tin các ca thi lập trình.
          </p>
        </div>

        <Link
          href="/student/exams"
          className="system-primary-action inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-serif font-bold text-white shadow-2xs transition hover:bg-slate-800"
        >
          <Code2 size={18} />
          Vào phòng thi
          <ArrowRight size={16} />
        </Link>
      </section>

      {/* 3 Thẻ Thống Kê Tương Tác */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        {/* Card 1: Tổng số */}
        <button
          type="button"
          onClick={() => setStatus("Tất cả")}
          className={`flex items-center justify-between rounded-md border p-5 text-left transition cursor-pointer ${
            status === "Tất cả"
              ? "border-brand bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10 ring-1 ring-brand"
              : "border-slate-300 bg-white hover:border-brand-300 dark:border-white/10 dark:bg-neutral-900 dark:hover:border-brand-500/40"
          }`}
        >
          <div>
            <p className="text-xs font-mono font-medium text-slate-500 dark:text-[#9F9690]">Tổng số kỳ thi</p>
            <p className="mt-2 text-3xl font-serif font-bold text-[#2A282D] dark:text-white">{exams.length}</p>
            <p className="mt-1 text-[11px] text-slate-500">Danh sách bài thi cá nhân</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
            <BookOpen size={22} />
          </div>
        </button>

        {/* Card 2: Sắp diễn ra */}
        <button
          type="button"
          onClick={() => setStatus("Sắp diễn ra")}
          className={`flex items-center justify-between rounded-md border p-5 text-left transition cursor-pointer ${
            status === "Sắp diễn ra"
              ? "border-brand bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10 ring-1 ring-brand"
              : "border-slate-300 bg-white hover:border-brand-300 dark:border-white/10 dark:bg-neutral-900 dark:hover:border-brand-500/40"
          }`}
        >
          <div>
            <p className="text-xs font-mono font-medium text-slate-500 dark:text-[#9F9690]">Sắp diễn ra</p>
            <p className="mt-2 text-3xl font-serif font-bold text-[#2A282D] dark:text-white">{upcomingCount}</p>
            <p className="mt-1 text-[11px] text-slate-500">Chuẩn bị trước giờ thi</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
            <CalendarDays size={22} />
          </div>
        </button>

        {/* Card 3: Đang diễn ra */}
        <button
          type="button"
          onClick={() => setStatus("Đang diễn ra")}
          className={`flex items-center justify-between rounded-md border p-5 text-left transition cursor-pointer ${
            status === "Đang diễn ra"
              ? "border-brand bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10 ring-1 ring-brand"
              : "border-slate-300 bg-white hover:border-brand-300 dark:border-white/10 dark:bg-neutral-900 dark:hover:border-brand-500/40"
          }`}
        >
          <div>
            <p className="text-xs font-mono font-medium text-slate-500 dark:text-[#9F9690]">Đang diễn ra</p>
            <p className="mt-2 text-3xl font-serif font-bold text-[#2A282D] dark:text-white">{ongoingCount}</p>
            <p className="mt-1 text-[11px] text-slate-500">Có thể tham gia ngay</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
            <Clock3 size={22} />
          </div>
        </button>

        {/* Card 4: Đã kết thúc */}
        <button
          type="button"
          onClick={() => setStatus("Đã kết thúc")}
          className={`flex items-center justify-between rounded-md border p-5 text-left transition cursor-pointer ${
            status === "Đã kết thúc"
              ? "border-brand bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10 ring-1 ring-brand"
              : "border-slate-300 bg-white hover:border-brand-300 dark:border-white/10 dark:bg-neutral-900 dark:hover:border-brand-500/40"
          }`}
        >
          <div>
            <p className="text-xs font-mono font-medium text-slate-500 dark:text-[#9F9690]">Đã kết thúc</p>
            <p className="mt-2 text-3xl font-serif font-bold text-[#2A282D] dark:text-white">{completedCount}</p>
            <p className="mt-1 text-[11px] text-slate-500">Lịch sử các ca thi</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
            <GraduationCap size={22} />
          </div>
        </button>
      </section>

      {/* Bảng Danh sách & Tìm kiếm */}
      <section className="overflow-hidden rounded-md border border-slate-300 bg-white dark:border-white/10 dark:bg-neutral-900">
        {/* Controls Bar */}
        <div className="border-b border-slate-300 dark:border-white/10 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-serif text-base font-bold text-[#2A282D] dark:text-white">
                Danh sách lịch thi
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-[#9F9690]">
                Tìm kiếm và lọc các ca thi lập trình theo trạng thái
              </p>
            </div>

            {/* Ô tìm kiếm */}
            <div className="relative w-full lg:max-w-sm">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm tên bài thi, môn học, mã phòng..."
                className="w-full rounded-md border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-9 text-xs sm:text-sm text-[#2A282D] outline-none transition placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:bg-white dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:placeholder:text-[#9F9690] dark:focus:border-[#1e293b]"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#2A282D] dark:hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-300 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 inline-flex items-center gap-1.5 font-mono text-xs font-medium text-slate-500">
                <SlidersHorizontal size={14} />
                Lọc trạng thái:
              </span>

              {filters.map((f) => {
                const count =
                  f === "Tất cả"
                    ? exams.length
                    : f === "Đã kết thúc"
                    ? exams.filter((e) => e.status === "Đã kết thúc" || (e.status as string) === "Đã hoàn thành").length
                    : exams.filter((e) => e.status === f).length;

                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStatus(f)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      status === f
                        ? "system-selected-module shadow-2xs"
                        : "bg-slate-50 text-[#5A5555] hover:bg-stone-200/70 dark:bg-white/5 dark:text-stone-300 dark:hover:bg-white/10"
                    }`}
                  >
                    {f}
                    <span
                      className={`rounded px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                        status === f
                          ? "bg-white/20 text-white"
                          : "bg-stone-200 text-[#5A5555] dark:bg-white/10 dark:text-stone-300"
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
                className="inline-flex items-center gap-1 text-xs font-serif font-bold text-[#0f172a] hover:underline dark:text-[#f0c2cf] transition cursor-pointer"
              >
                <RotateCcw size={12} /> Đặt lại lọc
              </button>
            )}
          </div>
        </div>

        {/* List Items */}
        <div className="divide-y divide-slate-300 dark:divide-white/10">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-16 text-xs text-slate-500">
              <LoaderCircle size={18} className="animate-spin text-slate-900 dark:text-white" />
              Đang tải lịch thi và thực hành từ hệ thống...
            </div>
          ) : (
            filteredExams.map((exam: StudentExam) => (
            <article
              key={exam.id}
              className="flex flex-col justify-between gap-4 p-5 transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02] sm:flex-row sm:items-center sm:p-6"
            >
              <div className="flex min-w-0 items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white mt-0.5">
                  <Code2 size={21} />
                </div>

                <div className="min-w-0 space-y-1">
                  <h3 className="font-serif font-bold text-[#2A282D] dark:text-white text-sm sm:text-base truncate">
                    {exam.title}
                  </h3>

                  <p className="text-xs text-[#5A5555] dark:text-[#9F9690] flex items-center gap-1.5">
                    <span>{exam.subject}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <GraduationCap size={13} className="text-slate-500" />
                      {exam.instructor}
                    </span>
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-1">
                    <span className="inline-flex items-center gap-1 font-mono text-[#5A5555] dark:text-stone-300">
                      <CalendarDays size={13} className="text-slate-900 dark:text-white" />
                      {exam.startTime}
                    </span>

                    <span className="inline-flex items-center gap-1 font-mono text-[#5A5555] dark:text-stone-300">
                      <Clock3 size={13} className="text-slate-900 dark:text-white" />
                      {exam.duration} phút
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-slate-500">Mã phòng:</span>
                      <code className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#2A282D] dark:border-white/10 dark:bg-white/5 dark:text-stone-300">
                        {exam.roomCode}
                      </code>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                <span
                  className={`inline-flex rounded px-2.5 py-1 text-xs font-serif font-semibold border ${statusStyles[exam.status]}`}
                >
                  {exam.status}
                </span>

                {exam.status !== "Đã kết thúc" ? (
                  <Link
                    href={`/student/exams?code=${encodeURIComponent(exam.roomCode)}`}
                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-serif font-bold text-[#0f172a] hover:underline dark:text-[#f0c2cf] transition"
                  >
                    {exam.status === "Đang diễn ra"
                      ? "Vào phòng thi"
                      : "Xem chi tiết"}
                    <ArrowRight size={14} />
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500 font-medium">
                    Đã kết thúc
                  </span>
                )}
              </div>
            </article>
          ))
          )}

          {!loading && filteredExams.length === 0 && (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-stone-100 text-slate-500 dark:bg-white/5">
                <Search size={22} />
              </div>
              <h3 className="mt-3 font-serif font-bold text-[#2A282D] dark:text-white text-sm">
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
                className="mt-3 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-serif text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
              >
                <RotateCcw size={13} />
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-neutral-950 px-5 py-3 text-xs text-slate-500 flex items-center justify-between">
          <span className="font-mono">Hiển thị {filteredExams.length} / {exams.length} kỳ thi</span>
          <span className="font-mono text-[11px] text-slate-500">Dữ liệu được cập nhật tự động</span>
        </div>
      </section>

      <footer className="pt-2 text-center font-mono text-xs text-slate-500">
        Oculide · Hệ thống thi lập trình trực tuyến chuẩn học thuật
      </footer>
    </div>
  );
}