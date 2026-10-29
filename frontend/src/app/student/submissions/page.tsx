"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  FileCode2,
  Clock3,
  CheckCircle2,
  XCircle,
  LoaderCircle,
  ChevronRight,
  Code2,
  ListFilter,
  TrendingUp,
  Cpu,
  HardDrive,
  ArrowRight,
} from "lucide-react";

type SubmissionStatus = "accepted" | "failed" | "pending";

type Submission = {
  id: string;
  problem: string;
  exam: string;
  language: string;
  submittedAt: string;
  status: SubmissionStatus;
  score: number | null;
  runtime: string;
  memory: string;
};

const sampleSubmissions: Submission[] = [
  {
    id: "SUB-1001",
    problem: "Tìm phần tử lớn nhất",
    exam: "Thực hành thuật toán cơ bản",
    language: "C++",
    submittedAt: "2026-10-27T09:30:00",
    status: "accepted",
    score: 100,
    runtime: "0.12s",
    memory: "12 MB",
  },
  {
    id: "SUB-1002",
    problem: "Sắp xếp mảng",
    exam: "Kiểm tra cấu trúc dữ liệu",
    language: "Java",
    submittedAt: "2026-10-27T10:15:00",
    status: "pending",
    score: null,
    runtime: "Đang chấm",
    memory: "—",
  },
  {
    id: "SUB-1003",
    problem: "Tính tổng dãy số",
    exam: "Bài luyện tập lập trình",
    language: "Python",
    submittedAt: "2026-10-26T14:20:00",
    status: "failed",
    score: 40,
    runtime: "0.18s",
    memory: "18 MB",
  },
  {
    id: "SUB-1004",
    problem: "Kiểm tra số nguyên tố",
    exam: "Thực hành thuật toán cơ bản",
    language: "C++",
    submittedAt: "2026-10-25T08:45:00",
    status: "accepted",
    score: 100,
    runtime: "0.09s",
    memory: "10 MB",
  },
];

const statusConfig: Record<
  SubmissionStatus,
  { label: string; className: string; icon: typeof CheckCircle2; spin?: boolean }
> = {
  accepted: {
    label: "Đạt",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
    icon: CheckCircle2,
  },
  failed: {
    label: "Chưa đạt",
    className: "bg-rose-50 text-rose-700 border border-rose-200/60",
    icon: XCircle,
  },
  pending: {
    label: "Đang chấm",
    className: "bg-amber-50 text-amber-700 border border-amber-200/60",
    icon: LoaderCircle,
    spin: true,
  },
};

const filterOptions = [
  { label: "Tất cả", value: "all" },
  { label: "Đạt", value: "accepted" },
  { label: "Chưa đạt", value: "failed" },
  { label: "Đang chấm", value: "pending" },
] as const;

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function StudentSubmissionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SubmissionStatus>("all");

  const filteredSubmissions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return sampleSubmissions.filter((submission) => {
      const matchesSearch =
        !keyword ||
        submission.id.toLowerCase().includes(keyword) ||
        submission.problem.toLowerCase().includes(keyword) ||
        submission.exam.toLowerCase().includes(keyword) ||
        submission.language.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" || submission.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const counts = useMemo(
    () => ({
      all: sampleSubmissions.length,
      accepted: sampleSubmissions.filter((item) => item.status === "accepted").length,
      failed: sampleSubmissions.filter((item) => item.status === "failed").length,
      pending: sampleSubmissions.filter((item) => item.status === "pending").length,
    }),
    []
  );

  const averageScore = useMemo(() => {
    const scoredSubmissions = sampleSubmissions.filter((item) => item.score !== null);
    if (!scoredSubmissions.length) return "—";
    const total = scoredSubmissions.reduce((sum, item) => sum + (item.score ?? 0), 0);
    return (total / scoredSubmissions.length).toFixed(1);
  }, []);

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
              <span className="text-blue-600 font-semibold">Bài nộp của tôi</span>
            </nav>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Bài nộp của tôi
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Theo dõi kết quả chấm và lịch sử nộp bài lập trình cá nhân.
            </p>
          </div>

          <Link
            href="/student/exams"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 active:scale-[0.98]"
          >
            <Code2 size={17} />
            Đến phòng thi
            <ArrowRight size={15} />
          </Link>
        </header>

        {/* Thẻ Thống kê Thẻ Ngang */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Tổng bài nộp",
              value: counts.all,
              sub: "Lịch sử đã nộp",
              icon: FileCode2,
              color: "bg-blue-50 text-blue-600",
            },
            {
              label: "Bài đạt (Accepted)",
              value: counts.accepted,
              sub: "Số bài hoàn thành",
              icon: CheckCircle2,
              color: "bg-emerald-50 text-emerald-600",
            },
            {
              label: "Bài chưa đạt",
              value: counts.failed,
              sub: "Cần tối ưu lại",
              icon: XCircle,
              color: "bg-rose-50 text-rose-600",
            },
            {
              label: "Điểm trung bình",
              value: `${averageScore}${averageScore !== "—" ? "/100" : ""}`,
              sub: "Tỉ lệ hoàn thành",
              icon: TrendingUp,
              color: "bg-violet-50 text-violet-600",
            },
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <article
                key={stat.label}
                className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
              >
                <div>
                  <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{stat.sub}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                  <Icon size={22} />
                </div>
              </article>
            );
          })}
        </section>

        {/* Thanh Tìm kiếm & Lọc trạng thái */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Lịch sử bài nộp</h2>
              <p className="text-xs text-slate-500">
                Tìm kiếm và lọc kết quả của từng lần gửi bài
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative sm:w-80">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tên bài, mã nộp, ngôn ngữ..."
                  aria-label="Tìm kiếm bài nộp"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <ListFilter
                  size={16}
                  className="shrink-0 text-slate-400 mr-1"
                />
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      statusFilter === option.value
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Bảng Danh sách Bài nộp */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Danh sách bài nộp</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {filteredSubmissions.length}
              </span>
            </div>
          </div>

          {filteredSubmissions.length ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Bài lập trình</th>
                      <th className="px-5 py-3 font-semibold">Ngôn ngữ</th>
                      <th className="px-5 py-3 font-semibold">Thời gian nộp</th>
                      <th className="px-5 py-3 font-semibold">Hiệu năng</th>
                      <th className="px-5 py-3 font-semibold">Kết quả</th>
                      <th className="px-5 py-3 font-semibold">Điểm</th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Chi tiết
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map((submission) => {
                      const config = statusConfig[submission.status];
                      const StatusIcon = config.icon;

                      return (
                        <tr
                          key={submission.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-900 text-sm">
                              {submission.problem}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              <span className="font-mono text-slate-600 font-semibold">{submission.id}</span> · {submission.exam}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              <Code2 size={13} />
                              {submission.language}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500">
                            {formatDate(submission.submittedAt)}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1">
                                <Cpu size={12} className="text-slate-400" />
                                {submission.runtime}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <HardDrive size={12} className="text-slate-400" />
                                {submission.memory}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
                            >
                              <StatusIcon
                                size={13}
                                className={config.spin ? "animate-spin" : ""}
                              />
                              {config.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-bold text-slate-900 text-sm">
                              {submission.score === null
                                ? "—"
                                : `${submission.score}/100`}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/student/submissions/${submission.id}`}
                              aria-label={`Xem chi tiết bài nộp ${submission.id}`}
                              className="inline-flex rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                            >
                              <ChevronRight size={18} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="space-y-3 p-4 md:hidden">
                {filteredSubmissions.map((submission) => {
                  const config = statusConfig[submission.status];
                  const StatusIcon = config.icon;

                  return (
                    <article
                      key={submission.id}
                      className="rounded-xl border border-slate-200/80 p-4 transition active:bg-slate-50/50 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">
                            {submission.problem}
                          </h3>
                          <p className="mt-0.5 font-mono text-xs text-slate-500 font-semibold">
                            {submission.id}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
                        >
                          <StatusIcon
                            size={12}
                            className={config.spin ? "animate-spin" : ""}
                          />
                          {config.label}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500">
                        {submission.exam}
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1">
                            <Cpu size={12} className="text-slate-400" />
                            {submission.runtime}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <HardDrive size={12} className="text-slate-400" />
                            {submission.memory}
                          </span>
                        </div>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 text-[11px]">
                          {submission.language}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                        <p className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock3 size={13} />
                          {formatDate(submission.submittedAt)}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {submission.score === null
                              ? "Chưa có điểm"
                              : `${submission.score}/100`}
                          </span>
                          <Link
                            href={`/student/submissions/${submission.id}`}
                            className="inline-flex rounded-lg p-1 text-slate-400 hover:text-blue-600"
                            aria-label={`Xem bài nộp ${submission.id}`}
                          >
                            <ChevronRight size={18} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="px-6 py-14 text-center">
              <FileCode2
                size={32}
                className="mx-auto text-slate-300"
              />
              <h3 className="mt-3 font-semibold text-slate-900 text-sm">
                Không tìm thấy bài nộp
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Thử thay đổi từ khóa hoặc bộ lọc trạng thái.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="mt-4 rounded-lg bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition"
              >
                Xóa bộ lọc
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