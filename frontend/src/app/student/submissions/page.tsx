"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchWithAuth } from "@/services/apiClient";
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
    id: "cb_111",
    problem: "Tính tổng các số trong chuỗi",
    exam: "Thực hành thuật toán nâng cao",
    language: "C++20",
    submittedAt: "2026-10-31T20:51:00",
    status: "failed",
    score: 80,
    runtime: "0.004s",
    memory: "1.82 MB",
  },
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
  const [submissions, setSubmissions] = useState<Submission[]>(sampleSubmissions);

  useEffect(() => {
    let cancelled = false;
    async function loadMySubmissions() {
      try {
        const me = await fetchWithAuth<{ user_id: number }>("/api/v1/auth/me");
        if (!me?.user_id || cancelled) return;
        const rows = await fetchWithAuth<Array<{
          submission_id: number;
          room_id: number;
          room_code?: string;
          room_name?: string;
          question_id: number;
          question_title?: string;
          language: string;
          submitted_at: string;
          status: string;
          score_percentage?: number;
        }>>(`/api/v1/submissions/student/${me.user_id}`);
        if (cancelled || !Array.isArray(rows)) return;

        const mapped: Submission[] = rows.map((s) => {
          const pct = s.score_percentage ?? 0;
          const mappedStatus: SubmissionStatus =
            s.status === "completed"
              ? pct >= 100
                ? "accepted"
                : "failed"
              : s.status === "failed"
              ? "failed"
              : "pending";
          return {
            id: String(s.submission_id),
            problem: s.question_title || `Câu hỏi #${s.question_id}`,
            exam: s.room_name || s.room_code || `Phòng #${s.room_id}`,
            language: s.language,
            submittedAt: s.submitted_at,
            status: mappedStatus,
            score: s.status === "completed" ? Math.round(pct) : null,
            runtime: "—",
            memory: "—",
          };
        });
        setSubmissions(mapped);
      } catch {
        // Giữ fallback sampleSubmissions nếu chưa đăng nhập hoặc offline
      }
    }
    loadMySubmissions();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSubmissions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return submissions.filter((submission) => {
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
  }, [search, statusFilter, submissions]);

  const counts = useMemo(
    () => ({
      all: submissions.length,
      accepted: submissions.filter((item) => item.status === "accepted").length,
      failed: submissions.filter((item) => item.status === "failed").length,
      pending: submissions.filter((item) => item.status === "pending").length,
    }),
    [submissions]
  );

  const averageScore = useMemo(() => {
    const scoredSubmissions = submissions.filter((item) => item.score !== null);
    if (!scoredSubmissions.length) return "—";
    const total = scoredSubmissions.reduce((sum, item) => sum + (item.score ?? 0), 0);
    return (total / scoredSubmissions.length).toFixed(1);
  }, [submissions]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Navigation & Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="flex items-center gap-2 font-mono text-xs font-medium text-slate-500 dark:text-[#9F9690]">
            <Link href="/student" className="hover:text-slate-900 dark:hover:text-[#f0c2cf] transition">
              Sinh viên
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-[#f0c2cf] font-semibold">Bài nộp của tôi</span>
          </nav>

          <h1 className="mt-2 text-2xl font-serif font-bold tracking-tight text-[#2A282D] dark:text-white sm:text-3xl">
            Bài nộp của tôi
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#5A5555] dark:text-[#9F9690]">
            Theo dõi kết quả chấm và lịch sử nộp bài lập trình cá nhân.
          </p>
        </div>

        <Link
          href="/student/exams"
          className="system-primary-action inline-flex shrink-0 items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-serif font-bold text-white shadow-2xs transition hover:bg-slate-800"
        >
          <Code2 size={17} />
          Đến phòng thi
          <ArrowRight size={15} />
        </Link>
      </header>

      {/* Thẻ Thống kê Thẻ Ngang */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 items-stretch">
        {[
          {
            label: "Tổng bài nộp",
            value: counts.all,
            sub: "Lịch sử đã nộp",
            icon: FileCode2,
            color: "bg-slate-900/10 text-slate-900 dark:bg-slate-900/20 dark:text-[#f0c2cf]",
          },
          {
            label: "Bài đạt (Accepted)",
            value: counts.accepted,
            sub: "Số bài hoàn thành",
            icon: CheckCircle2,
            color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
          },
          {
            label: "Bài chưa đạt",
            value: counts.failed,
            sub: "Cần tối ưu lại",
            icon: XCircle,
            color: "bg-slate-800/15 text-slate-800 dark:bg-slate-800/30 dark:text-[#e5a9b9]",
          },
          {
            label: "Điểm trung bình",
            value: `${averageScore}${averageScore !== "—" ? "/100" : ""}`,
            sub: "Tỉ lệ hoàn thành",
            icon: TrendingUp,
            color: "bg-stone-100 text-[#5A5555] dark:bg-white/10 dark:text-stone-300",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.label}
              className="flex items-center justify-between rounded-md border border-slate-300 bg-white p-5 dark:border-white/10 dark:bg-neutral-900"
            >
              <div>
                <p className="text-xs font-mono font-medium text-slate-500 dark:text-[#9F9690]">{stat.label}</p>
                <p className="mt-2 text-3xl font-serif font-bold text-[#2A282D] dark:text-white">{stat.value}</p>
                <p className="mt-1 text-[11px] text-slate-500">{stat.sub}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-md ${stat.color}`}>
                <Icon size={22} />
              </div>
            </article>
          );
        })}
      </section>

      {/* Thanh Tìm kiếm & Lọc trạng thái */}
      <section className="rounded-md border border-slate-300 bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="font-serif text-base font-bold text-[#2A282D] dark:text-white">Lịch sử bài nộp</h2>
            <p className="text-xs text-slate-500 dark:text-[#9F9690]">
              Tìm kiếm và lọc kết quả của từng lần gửi bài
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative sm:w-80">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tên bài, mã nộp, ngôn ngữ..."
                aria-label="Tìm kiếm bài nộp"
                className="w-full rounded-md border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#2A282D] outline-none transition placeholder:text-slate-500 focus:border-slate-900 focus:bg-white dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:placeholder:text-[#9F9690] dark:focus:border-slate-800"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <ListFilter
                size={16}
                className="shrink-0 text-slate-500 mr-1"
              />
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={`shrink-0 rounded-md px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                    statusFilter === option.value
                      ? "system-selected-module shadow-2xs"
                      : "bg-slate-50 text-[#5A5555] hover:bg-stone-200/70 dark:bg-white/5 dark:text-stone-300 dark:hover:bg-white/10"
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
      <section className="overflow-hidden rounded-md border border-slate-300 bg-white dark:border-white/10 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 p-5">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-base font-bold text-[#2A282D] dark:text-white">Danh sách bài nộp</h2>
            <span className="rounded bg-slate-900/10 px-2 py-0.5 font-mono text-xs font-bold text-slate-900 dark:bg-slate-900/20 dark:text-[#f0c2cf]">
              {filteredSubmissions.length}
            </span>
          </div>
        </div>

        {filteredSubmissions.length ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 dark:bg-neutral-950 text-[11px] font-mono uppercase tracking-wider text-slate-500 border-b border-slate-300 dark:border-white/10">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Bài lập trình</th>
                    <th className="px-5 py-3 font-semibold">Ngôn ngữ</th>
                    <th className="px-5 py-3 font-semibold">Thời gian nộp</th>
                    <th className="px-5 py-3 font-semibold">Kết quả</th>
                    <th className="px-5 py-3 font-semibold">Điểm</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Chi tiết
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 dark:divide-white/10">
                  {filteredSubmissions.map((submission) => {
                    const config = statusConfig[submission.status];
                    const StatusIcon = config.icon;

                    return (
                      <tr
                        key={submission.id}
                        className="transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-4">
                          <p className="font-serif font-bold text-[#2A282D] dark:text-white text-sm">
                            {submission.problem}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            <span className="font-mono text-slate-900 dark:text-[#f0c2cf] font-semibold">{submission.id}</span> · {submission.exam}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded bg-slate-50 dark:bg-white/5 px-2.5 py-1 font-mono text-xs font-semibold text-[#2A282D] dark:text-stone-300 border border-slate-300 dark:border-white/10">
                            <Code2 size={13} />
                            {submission.language}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-500">
                          {formatDate(submission.submittedAt)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 text-xs font-serif font-semibold border ${config.className}`}
                          >
                            <StatusIcon
                              size={13}
                              className={config.spin ? "animate-spin" : ""}
                            />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono font-bold text-[#2A282D] dark:text-white text-sm">
                            {submission.score === null
                              ? "—"
                              : `${submission.score}/100`}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/student/submissions/${submission.id}`}
                            aria-label={`Xem chi tiết bài nộp ${submission.id}`}
                            className="inline-flex rounded p-2 text-slate-500 transition hover:bg-slate-900/10 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
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
                    className="rounded-md border border-slate-300 p-4 transition active:bg-stone-50/50 dark:border-white/10 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-serif font-bold text-[#2A282D] dark:text-white text-sm">
                          {submission.problem}
                        </h3>
                        <p className="mt-0.5 font-mono text-xs text-slate-900 dark:text-[#f0c2cf] font-semibold">
                          {submission.id}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded px-2.5 py-0.5 text-xs font-serif font-semibold border ${config.className}`}
                      >
                        <StatusIcon
                          size={12}
                          className={config.spin ? "animate-spin" : ""}
                        />
                        {config.label}
                      </span>
                    </div>

                    <p className="text-xs text-[#5A5555] dark:text-stone-300">
                      {submission.exam}
                    </p>

                    <div className="flex items-center justify-end border-t border-slate-300 pt-2.5 text-xs text-slate-500 dark:border-white/10">
                      <span className="rounded bg-slate-50 dark:bg-white/5 px-2 py-0.5 font-mono font-semibold text-[#2A282D] dark:text-stone-300 text-[11px] border border-slate-300 dark:border-white/10">
                        {submission.language}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-300 dark:border-white/10 pt-2.5">
                      <p className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                        <Clock3 size={13} />
                        {formatDate(submission.submittedAt)}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#2A282D] dark:text-white text-sm">
                          {submission.score === null
                            ? "Chưa có điểm"
                            : `${submission.score}/100`}
                        </span>
                        <Link
                          href={`/student/submissions/${submission.id}`}
                          className="inline-flex rounded p-1 text-slate-500 hover:text-slate-900"
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
              className="mx-auto text-slate-500"
            />
            <h3 className="mt-3 font-serif font-semibold text-[#2A282D] dark:text-white text-sm">
              Không tìm thấy bài nộp
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Thử thay đổi từ khóa hoặc bộ lọc trạng thái.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="mt-4 rounded-md bg-slate-900/10 px-3.5 py-1.5 font-serif text-xs font-bold text-slate-900 hover:bg-slate-900/20 dark:bg-slate-900/20 dark:text-[#f0c2cf] transition cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </section>

      <footer className="pt-2 text-center font-mono text-xs text-slate-500">
        Oculide · Hệ thống thi lập trình trực tuyến chuẩn học thuật
      </footer>
    </div>
  );
}