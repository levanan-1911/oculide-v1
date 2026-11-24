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
  BookOpen,
  GraduationCap,
  Layers,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";

type SubmissionStatus = "accepted" | "failed" | "pending";

type Submission = {
  id: string;
  problem: string;
  exam: string;
  roomId?: number;
  classId?: number;
  classCode?: string;
  className?: string;
  courseName?: string;
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
    exam: "Lab 04 - Xử lý chuỗi nâng cao",
    classCode: "INT202",
    className: "Lập trình Python",
    courseName: "INT202 - Lập trình Python (D21CQCN01-B)",
    language: "Python 3.10",
    submittedAt: "2026-10-31T20:51:00",
    status: "accepted",
    score: 100,
    runtime: "0.004s",
    memory: "1.82 MB",
  },
  {
    id: "SUB-1001",
    problem: "Tìm phần tử lớn nhất",
    exam: "Lab 01 - Cấu trúc dữ liệu cơ bản",
    classCode: "CS101",
    className: "Cấu trúc dữ liệu & Giải thuật",
    courseName: "CS101 - Cấu trúc dữ liệu & Giải thuật (D21CQCN02)",
    language: "C++",
    submittedAt: "2026-10-27T09:30:00",
    status: "accepted",
    score: 100,
    runtime: "0.12s",
    memory: "12 MB",
  },
  {
    id: "SUB-1002",
    problem: "Sắp xếp mảng QuickSort",
    exam: "Lab 01 - Cấu trúc dữ liệu cơ bản",
    classCode: "CS101",
    className: "Cấu trúc dữ liệu & Giải thuật",
    courseName: "CS101 - Cấu trúc dữ liệu & Giải thuật (D21CQCN02)",
    language: "C++",
    submittedAt: "2026-10-27T10:15:00",
    status: "failed",
    score: 50,
    runtime: "0.45s",
    memory: "14 MB",
  },
  {
    id: "SUB-1003",
    problem: "Tính tổng dãy số Fibonacci",
    exam: "Thi Giữa Kỳ - Thuật toán đệ quy",
    classCode: "CS101",
    className: "Cấu trúc dữ liệu & Giải thuật",
    courseName: "CS101 - Cấu trúc dữ liệu & Giải thuật (D21CQCN02)",
    language: "C++",
    submittedAt: "2026-10-26T14:20:00",
    status: "accepted",
    score: 100,
    runtime: "0.18s",
    memory: "18 MB",
  },
  {
    id: "SUB-1004",
    problem: "Kiểm tra số nguyên tố",
    exam: "Lab 02 - Hàm & Module",
    classCode: "INT202",
    className: "Lập trình Python",
    courseName: "INT202 - Lập trình Python (D21CQCN01-B)",
    language: "Python 3.10",
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
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
    icon: CheckCircle2,
  },
  failed: {
    label: "Chưa đạt",
    className: "bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30",
    icon: XCircle,
  },
  pending: {
    label: "Đang chấm",
    className: "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
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
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grouped" | "table">("grouped");
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
          class_id?: number;
          class_code?: string;
          class_name?: string;
          course_name?: string;
          question_id: number;
          question_title?: string;
          language: string;
          submitted_at: string;
          status: string;
          score_percentage?: number;
        }>>(`/api/v1/submissions/student/${me.user_id}`);
        if (cancelled || !Array.isArray(rows)) return;

        if (rows.length > 0) {
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

            const courseLabel = s.course_name || s.class_name || "Học phần thực hành";
            const classLabel = s.class_name || s.class_code || "Lớp học phần";

            return {
              id: String(s.submission_id),
              problem: s.question_title || `Câu hỏi #${s.question_id}`,
              exam: s.room_name || s.room_code || `Phiên #${s.room_id}`,
              roomId: s.room_id,
              classId: s.class_id,
              classCode: s.class_code || "CHUNG",
              className: classLabel,
              courseName: courseLabel,
              language: s.language,
              submittedAt: s.submitted_at,
              status: mappedStatus,
              score: s.status === "completed" ? Math.round(pct) : null,
              runtime: "—",
              memory: "—",
            };
          });
          setSubmissions(mapped);
        }
      } catch {
        // Giữ fallback sampleSubmissions nếu offline
      }
    }
    loadMySubmissions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Danh sách các Lớp học phần duy nhất để làm bộ lọc
  const availableClasses = useMemo(() => {
    const set = new Map<string, string>();
    submissions.forEach((s) => {
      const code = s.classCode || "CHUNG";
      const name = s.className || s.courseName || code;
      set.set(code, name);
    });
    return Array.from(set.entries()).map(([code, name]) => ({ code, name }));
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return submissions.filter((submission) => {
      const matchesSearch =
        !keyword ||
        submission.id.toLowerCase().includes(keyword) ||
        submission.problem.toLowerCase().includes(keyword) ||
        submission.exam.toLowerCase().includes(keyword) ||
        (submission.className && submission.className.toLowerCase().includes(keyword)) ||
        (submission.courseName && submission.courseName.toLowerCase().includes(keyword)) ||
        submission.language.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" || submission.status === statusFilter;

      const matchesClass =
        selectedClassFilter === "all" || (submission.classCode || "CHUNG") === selectedClassFilter;

      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [search, statusFilter, selectedClassFilter, submissions]);

  // Gom nhóm: Lớp học phần -> Phiên thi (Session)
  const groupedData = useMemo(() => {
    const classMap: Record<
      string,
      {
        classCode: string;
        className: string;
        courseName: string;
        sessions: Record<
          string,
          {
            examName: string;
            roomCode: string;
            submittedAt: string;
            submissions: Submission[];
            sessionAvg: number;
          }
        >;
      }
    > = {};

    filteredSubmissions.forEach((sub) => {
      const cKey = sub.classCode || "CHUNG";
      if (!classMap[cKey]) {
        classMap[cKey] = {
          classCode: cKey,
          className: sub.className || "Lớp học phần chung",
          courseName: sub.courseName || "Học phần thực hành",
          sessions: {},
        };
      }

      const sKey = sub.exam || "Phiên thi chung";
      if (!classMap[cKey].sessions[sKey]) {
        classMap[cKey].sessions[sKey] = {
          examName: sub.exam,
          roomCode: sub.exam,
          submittedAt: sub.submittedAt,
          submissions: [],
          sessionAvg: 0,
        };
      }

      classMap[cKey].sessions[sKey].submissions.push(sub);
    });

    // Tính điểm trung bình cho từng Phiên thi
    Object.values(classMap).forEach((cls) => {
      Object.values(cls.sessions).forEach((sess) => {
        const scored = sess.submissions.filter((s) => s.score !== null);
        const sum = scored.reduce((acc, cur) => acc + (cur.score ?? 0), 0);
        sess.sessionAvg = scored.length ? Math.round(sum / scored.length) : 0;
      });
    });

    return Object.values(classMap);
  }, [filteredSubmissions]);

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
            <span className="text-slate-900 dark:text-[#f0c2cf] font-semibold">Bài nộp &amp; Kết quả</span>
          </nav>

          <h1 className="mt-2 text-2xl font-serif font-bold tracking-tight text-[#2A282D] dark:text-white sm:text-3xl">
            Bài nộp &amp; Kết quả đánh giá
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#5A5555] dark:text-[#9F9690]">
            Kết quả được quản lý theo từng <strong>Lớp học phần</strong> và tổng kết điểm theo từng <strong>Phiên thi</strong>.
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

      {/* Thanh Tìm kiếm & Lọc trạng thái / Lớp học phần */}
      <section className="rounded-md border border-slate-300 bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-neutral-900 space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="font-serif text-base font-bold text-[#2A282D] dark:text-white">Bộ lọc bài nộp</h2>
            <p className="text-xs text-slate-500 dark:text-[#9F9690]">
              Tra cứu theo Lớp học phần, Phiên thi hoặc tên bài giải
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Chuyển chế độ xem */}
            <div className="flex items-center rounded-md border border-slate-300 bg-slate-50 p-1 dark:border-white/10 dark:bg-neutral-950">
              <button
                type="button"
                onClick={() => setViewMode("grouped")}
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  viewMode === "grouped"
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-white/10 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Xem theo Lớp học phần và Phiên thi"
              >
                <LayoutGrid size={14} />
                <span>Theo Lớp &amp; Phiên</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-white/10 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Xem danh sách bảng phẳng"
              >
                <TableIcon size={14} />
                <span>Bảng phẳng</span>
              </button>
            </div>

            <div className="relative sm:w-72">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tên bài, môn học, mã nộp..."
                aria-label="Tìm kiếm bài nộp"
                className="w-full rounded-md border border-slate-300 bg-slate-50 py-2 pl-9 pr-4 text-xs sm:text-sm text-[#2A282D] outline-none transition placeholder:text-slate-500 focus:border-slate-900 focus:bg-white dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:placeholder:text-[#9F9690] dark:focus:border-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Bộ lọc Lớp học phần & Trạng thái */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-300 dark:border-white/10">
          {/* Lọc theo Lớp học phần */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <GraduationCap size={15} className="text-slate-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 shrink-0">Lớp HP:</span>
            <button
              type="button"
              onClick={() => setSelectedClassFilter("all")}
              className={`shrink-0 rounded px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                selectedClassFilter === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-stone-300"
              }`}
            >
              Tất cả lớp
            </button>
            {availableClasses.map((cls) => (
              <button
                key={cls.code}
                type="button"
                onClick={() => setSelectedClassFilter(cls.code)}
                className={`shrink-0 rounded px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  selectedClassFilter === cls.code
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-stone-300"
                }`}
              >
                {cls.name}
              </button>
            ))}
          </div>

          {/* Lọc theo Trạng thái */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <ListFilter size={15} className="text-slate-500 shrink-0 mr-1" />
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`shrink-0 rounded px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  statusFilter === option.value
                    ? "bg-brand text-white"
                    : "bg-slate-100 text-[#5A5555] hover:bg-slate-200 dark:bg-white/5 dark:text-stone-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* NỘI DUNG CHÍNH: CHẾ ĐỘ XEM THEO LỚP HỌC PHẦN & PHIÊN THI */}
      {viewMode === "grouped" ? (
        <div className="space-y-6">
          {groupedData.length ? (
            groupedData.map((clsGroup) => (
              <section
                key={clsGroup.classCode}
                className="overflow-hidden rounded-md border border-slate-300 bg-white dark:border-white/10 dark:bg-neutral-900"
              >
                {/* Header Lớp học phần */}
                <div className="flex items-center justify-between border-b border-slate-300 bg-slate-50 p-4 sm:p-5 dark:border-white/10 dark:bg-neutral-950">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand text-white font-bold">
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <h2 className="font-serif text-base font-bold text-[#2A282D] dark:text-white">
                        {clsGroup.courseName}
                      </h2>
                      <p className="text-xs text-slate-500 font-mono">
                        Mã lớp HP: <span className="font-bold text-slate-900 dark:text-white">{clsGroup.classCode}</span> · {clsGroup.className}
                      </p>
                    </div>
                  </div>
                  <div className="rounded bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 border border-brand-200 dark:border-brand-500/20">
                    {Object.keys(clsGroup.sessions).length} phiên thi
                  </div>
                </div>

                {/* Danh sách các Phiên thi trong Lớp học phần */}
                <div className="p-4 sm:p-5 space-y-5">
                  {Object.values(clsGroup.sessions).map((sess) => (
                    <div
                      key={sess.examName}
                      className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900 space-y-3"
                    >
                      {/* Tiêu đề phiên & Điểm tổng kết phiên */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white">
                            <Layers size={14} />
                          </div>
                          <div>
                            <h3 className="font-serif text-sm font-bold text-[#2A282D] dark:text-white">
                              {sess.examName}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                              <Clock3 size={12} />
                              Thời gian: {formatDate(sess.submittedAt)}
                            </p>
                          </div>
                        </div>

                        {/* Điểm tổng kết phiên thi */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className="text-xs font-semibold text-slate-500">Điểm phiên:</span>
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded font-mono font-bold text-xs border ${
                            sess.sessionAvg >= 80
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
                              : sess.sessionAvg >= 50
                              ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30"
                              : "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30"
                          }`}>
                            {sess.sessionAvg} / 100
                          </span>
                        </div>
                      </div>

                      {/* Bảng chi tiết các câu nộp trong phiên */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-neutral-950 font-mono text-[10px] uppercase text-slate-500 border-b border-slate-200 dark:border-white/10">
                            <tr>
                              <th className="px-3 py-2 font-semibold">Câu hỏi bài giải</th>
                              <th className="px-3 py-2 font-semibold">Ngôn ngữ</th>
                              <th className="px-3 py-2 font-semibold">Trạng thái</th>
                              <th className="px-3 py-2 font-semibold">Điểm câu</th>
                              <th className="px-3 py-2 text-right font-semibold">Xem bài giải</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                            {sess.submissions.map((sub) => {
                              const config = statusConfig[sub.status];
                              const StatusIcon = config.icon;
                              return (
                                <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                                  <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">
                                    <p className="font-bold">{sub.problem}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">Mã bài nộp: {sub.id}</p>
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                    {sub.language}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold border ${config.className}`}>
                                      <StatusIcon size={12} className={config.spin ? "animate-spin" : ""} />
                                      {config.label}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                                    {sub.score === null ? "—" : `${sub.score}/100`}
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    <Link
                                      href={`/student/submissions/${sub.id}`}
                                      className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                                    >
                                      <span>Chi tiết</span>
                                      <ChevronRight size={13} />
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="rounded-md border border-slate-300 bg-white p-12 text-center dark:border-white/10 dark:bg-neutral-900">
              <FileCode2 size={32} className="mx-auto text-slate-400" />
              <h3 className="mt-3 font-serif font-semibold text-slate-900 dark:text-white text-sm">
                Không tìm thấy bài nộp nào
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Thử thay đổi từ khóa tìm kiếm hoặc chọn &quot;Tất cả lớp&quot;.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* BẢNG PHẲNG (TABLE VIEW) KHI NGƯỜI DÙNG MUỐN XEM TOÀN BỘ */
        <section className="overflow-hidden rounded-md border border-slate-300 bg-white dark:border-white/10 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-base font-bold text-[#2A282D] dark:text-white">Toàn bộ bài nộp</h2>
              <span className="rounded bg-slate-900/10 px-2 py-0.5 font-mono text-xs font-bold text-slate-900 dark:bg-slate-900/20 dark:text-[#f0c2cf]">
                {filteredSubmissions.length}
              </span>
            </div>
          </div>

          {filteredSubmissions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 dark:bg-neutral-950 text-[11px] font-mono uppercase tracking-wider text-slate-500 border-b border-slate-300 dark:border-white/10">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Bài lập trình</th>
                    <th className="px-5 py-3 font-semibold">Lớp học phần &amp; Phiên thi</th>
                    <th className="px-5 py-3 font-semibold">Ngôn ngữ</th>
                    <th className="px-5 py-3 font-semibold">Thời gian nộp</th>
                    <th className="px-5 py-3 font-semibold">Kết quả</th>
                    <th className="px-5 py-3 font-semibold">Điểm</th>
                    <th className="px-5 py-3 text-right font-semibold">Chi tiết</th>
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
                          <p className="mt-0.5 text-xs text-slate-500 font-mono">
                            Mã nộp: {submission.id}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {submission.className}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {submission.exam}
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
          ) : (
            <div className="px-6 py-14 text-center">
              <FileCode2 size={32} className="mx-auto text-slate-500" />
              <h3 className="mt-3 font-serif font-semibold text-[#2A282D] dark:text-white text-sm">
                Không tìm thấy bài nộp
              </h3>
            </div>
          )}
        </section>
      )}

      <footer className="pt-2 text-center font-mono text-xs text-slate-500">
        Oculide · Hệ thống thi lập trình trực tuyến chuẩn học thuật
      </footer>
    </div>
  );
}
