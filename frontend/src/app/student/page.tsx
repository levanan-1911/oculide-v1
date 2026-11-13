"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Code2,
  Filter,
  GraduationCap,
  LoaderCircle,
  PieChart,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { fetchWithAuth } from "@/services/apiClient";
import {
  mapApiRoomToStudentExam,
  type ApiStudentRoom,
  type StudentExam,
} from "@/components/student/student-data";

type FilterStatus = "Tất cả" | "Sắp diễn ra" | "Đang diễn ra" | "Đã hoàn thành";

interface ApiStudentSubmission {
  submission_id: number;
  room_id?: number;
  room_code?: string;
  room_name?: string;
  question_id: number;
  question_title?: string;
  language: string;
  submitted_at?: string;
  total_points?: number;
  max_points?: number;
  score_percentage?: number;
}

const LANGUAGE_META: Record<string, { label: string; color: string }> = {
  cpp: { label: "C++", color: "bg-blue-600" },
  "c++": { label: "C++", color: "bg-blue-600" },
  c: { label: "C", color: "bg-sky-500" },
  python: { label: "Python", color: "bg-amber-500" },
  py: { label: "Python", color: "bg-amber-500" },
  java: { label: "Java", color: "bg-rose-500" },
  javascript: { label: "JavaScript", color: "bg-emerald-500" },
  js: { label: "JavaScript", color: "bg-emerald-500" },
};

const statusStyles: Record<string, string> = {
  "Sắp diễn ra": "bg-amber-50 text-amber-700 border-amber-200/80",
  "Đang diễn ra": "bg-emerald-50 text-emerald-700 border-emerald-200/80 animate-pulse",
  "Đã hoàn thành": "bg-slate-100 text-slate-600 border-slate-200",
};

export default function StudentDashboardPage() {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("Tất cả");
  const [studentName, setStudentName] = useState<string>("sinh viên");
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [submissions, setSubmissions] = useState<ApiStudentSubmission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setLoading(true);
      let userId: number | null = null;

      try {
        const stored = localStorage.getItem("oculide_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          const name = parsed.full_name || parsed.fullName || parsed.name;
          if (name && isMounted) setStudentName(name);
          const idCandidate = Number(parsed.user_id || parsed.id);
          if (!Number.isNaN(idCandidate) && idCandidate > 0) {
            userId = idCandidate;
          }
        }
      } catch {
        // ignore localStorage parse error
      }

      try {
        const me = await fetchWithAuth<{
          user_id: number;
          full_name?: string;
        }>("/api/v1/auth/me");
        if (isMounted && me) {
          if (me.full_name) setStudentName(me.full_name);
          if (me.user_id) userId = me.user_id;
        }
      } catch {
        // ignore if auth/me fails
      }

      try {
        const roomsData = await fetchWithAuth<ApiStudentRoom[]>("/api/v1/rooms?limit=100");
        if (isMounted && Array.isArray(roomsData)) {
          setExams(roomsData.map(mapApiRoomToStudentExam));
        }
      } catch {
        if (isMounted) setExams([]);
      }

      if (userId) {
        try {
          const subsData = await fetchWithAuth<ApiStudentSubmission[]>(
            `/api/v1/submissions/student/${userId}`
          );
          if (isMounted && Array.isArray(subsData)) {
            setSubmissions(subsData);
          }
        } catch {
          if (isMounted) setSubmissions([]);
        }
      }

      if (isMounted) setLoading(false);
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const counts = useMemo(
    () => ({
      all: exams.length,
      upcoming: exams.filter((e) => e.status === "Sắp diễn ra").length,
      ongoing: exams.filter((e) => e.status === "Đang diễn ra").length,
      completed: exams.filter((e) => e.status === "Đã hoàn thành").length,
    }),
    [exams]
  );

  const filteredExams = useMemo(() => {
    if (activeFilter === "Tất cả") return exams;
    return exams.filter((exam) => exam.status === activeFilter);
  }, [activeFilter, exams]);

  const scoreHistory = useMemo(() => {
    return submissions.slice(0, 5).reverse().map((sub, idx) => {
      const pct =
        typeof sub.score_percentage === "number"
          ? Math.round(sub.score_percentage)
          : sub.max_points && sub.max_points > 0
          ? Math.round(((sub.total_points || 0) / sub.max_points) * 100)
          : 0;
      let dateStr = `#${idx + 1}`;
      if (sub.submitted_at) {
        const d = new Date(sub.submitted_at);
        if (!Number.isNaN(d.getTime())) {
          dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(
            d.getMonth() + 1
          ).padStart(2, "0")}`;
        }
      }
      return {
        id: sub.submission_id || idx,
        exam: sub.room_name || sub.question_title || `Bài nộp #${sub.submission_id}`,
        score: Math.max(0, Math.min(100, pct)),
        date: dateStr,
      };
    });
  }, [submissions]);

  const avgScore = useMemo(() => {
    if (submissions.length === 0) return null;
    const total = submissions.reduce((acc, sub) => {
      const pct =
        typeof sub.score_percentage === "number"
          ? sub.score_percentage
          : sub.max_points && sub.max_points > 0
          ? ((sub.total_points || 0) / sub.max_points) * 100
          : 0;
      return acc + pct;
    }, 0);
    return Math.round(total / submissions.length);
  }, [submissions]);

  const languageDistribution = useMemo(() => {
    if (submissions.length === 0) return [];
    const countsMap: Record<string, { name: string; color: string; count: number }> = {};
    for (const sub of submissions) {
      const rawLang = (sub.language || "cpp").toLowerCase().trim();
      const meta = LANGUAGE_META[rawLang] || {
        label: sub.language || "Khác",
        color: "bg-violet-500",
      };
      if (!countsMap[meta.label]) {
        countsMap[meta.label] = { name: meta.label, color: meta.color, count: 0 };
      }
      countsMap[meta.label].count += 1;
    }
    const total = submissions.length;
    return Object.values(countsMap)
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        name: item.name,
        color: item.color,
        count: `${item.count} bài`,
        percentage: Math.round((item.count / total) * 100),
      }));
  }, [submissions]);

  const favoriteLanguage = useMemo(() => {
    if (languageDistribution.length === 0) return "Chưa có dữ liệu";
    const top = languageDistribution[0];
    return `${top.name} (${top.percentage}%)`;
  }, [languageDistribution]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      
      {/* Tiêu đề trang & Nút hành động chính */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              <Sparkles className="h-3 w-3" />
              KHÔNG GIAN SINH VIÊN
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-[26px]">
            Xin chào, {studentName}!
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-[13.5px]">
            Theo dõi tiến độ học tập, chuẩn bị thiết bị và tham gia các ca thi lập trình trực tuyến an toàn.
          </p>
        </div>

        <Link
          href="/student/exams"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
        >
          <Code2 className="h-4 w-4" />
          Vào phòng thi
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* 1. THẺ THỐNG KÊ TƯƠNG TÁC (Đồng bộ chuẩn Admin) */}
      <section className="space-y-3" aria-label="Tổng quan kỳ thi">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Tổng quan kỳ thi</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Nhấn vào từng thẻ để lọc nhanh danh sách bên dưới</p>
          </div>
          {activeFilter !== "Tất cả" && (
            <button
              type="button"
              onClick={() => setActiveFilter("Tất cả")}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition"
            >
              <RotateCcw className="h-3 w-3" /> Bỏ lọc ({activeFilter})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Thẻ 1: Tất cả */}
          <button
            type="button"
            onClick={() => setActiveFilter("Tất cả")}
            className={`rounded-2xl border p-5 text-left transition-all cursor-pointer ${
              activeFilter === "Tất cả"
                ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-sm dark:bg-blue-500/10 dark:border-blue-500/40"
                : "border-slate-200/75 bg-white hover:border-slate-300 shadow-[0_2px_10px_rgba(15,23,42,0.02)] dark:border-white/10 dark:bg-[#0d1017] dark:hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb] dark:bg-blue-500/15 dark:text-blue-400">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Tổng số kỳ thi
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white font-mono">
                {counts.all}
              </span>
              <span className="text-xs font-semibold text-[#2563eb] dark:text-blue-400">
                Bài thi cá nhân
              </span>
            </div>
          </button>

          {/* Thẻ 2: Sắp diễn ra */}
          <button
            type="button"
            onClick={() => setActiveFilter("Sắp diễn ra")}
            className={`rounded-2xl border p-5 text-left transition-all cursor-pointer ${
              activeFilter === "Sắp diễn ra"
                ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-sm dark:bg-amber-500/10 dark:border-amber-500/40"
                : "border-slate-200/75 bg-white hover:border-slate-300 shadow-[0_2px_10px_rgba(15,23,42,0.02)] dark:border-white/10 dark:bg-[#0d1017] dark:hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fefce8] text-[#ca8a04] dark:bg-amber-500/15 dark:text-amber-400">
                <CalendarDays className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Sắp diễn ra
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white font-mono">
                {counts.upcoming}
              </span>
              <span className="text-xs font-semibold text-[#ca8a04] dark:text-amber-400">
                Chuẩn bị thi
              </span>
            </div>
          </button>

          {/* Thẻ 3: Đang diễn ra */}
          <button
            type="button"
            onClick={() => setActiveFilter("Đang diễn ra")}
            className={`rounded-2xl border p-5 text-left transition-all cursor-pointer ${
              activeFilter === "Đang diễn ra"
                ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm dark:bg-emerald-500/10 dark:border-emerald-500/40"
                : "border-slate-200/75 bg-white hover:border-slate-300 shadow-[0_2px_10px_rgba(15,23,42,0.02)] dark:border-white/10 dark:bg-[#0d1017] dark:hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#059669] dark:bg-emerald-500/15 dark:text-emerald-400">
                <Clock3 className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Đang diễn ra
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white font-mono">
                {counts.ongoing}
              </span>
              <span className="text-xs font-semibold text-[#059669] dark:text-emerald-400">
                Tham gia ngay
              </span>
            </div>
          </button>

          {/* Thẻ 4: Đã hoàn thành */}
          <button
            type="button"
            onClick={() => setActiveFilter("Đã hoàn thành")}
            className={`rounded-2xl border p-5 text-left transition-all cursor-pointer ${
              activeFilter === "Đã hoàn thành"
                ? "border-violet-500 bg-violet-50/40 ring-2 ring-violet-500/20 shadow-sm dark:bg-violet-500/10 dark:border-violet-500/40"
                : "border-slate-200/75 bg-white hover:border-slate-300 shadow-[0_2px_10px_rgba(15,23,42,0.02)] dark:border-white/10 dark:bg-[#0d1017] dark:hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5f3ff] text-[#7c3aed] dark:bg-violet-500/15 dark:text-violet-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Đã hoàn thành
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white font-mono">
                {counts.completed}
              </span>
              <span className="text-xs font-semibold text-[#7c3aed] dark:text-violet-400">
                Bài thi đã nộp
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* 2. BIỂU ĐỒ THỐNG KÊ */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Biểu đồ điểm số */}
        <div className="rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)] lg:col-span-2 space-y-4 dark:border-white/10 dark:bg-[#0d1017] transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb] dark:bg-blue-500/15 dark:text-blue-400">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Biểu đồ kết quả làm bài</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Điểm số 5 bài thi gần nhất</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200/60 dark:bg-white/5 dark:border-white/10 dark:text-slate-300">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ĐTB:{" "}
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {avgScore !== null ? `${avgScore}/100` : "--/100"}
              </span>
            </div>
          </div>

          <div className="pt-2">
            {scoreHistory.length > 0 ? (
              <div className="grid h-44 grid-cols-5 items-end gap-3 sm:gap-6 border-b border-slate-100 pb-2 dark:border-white/5">
                {scoreHistory.map((item) => (
                  <div key={item.id} className="group relative flex h-full flex-col justify-end items-center">
                    <div className="absolute -top-9 hidden rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md group-hover:block transition z-10 whitespace-nowrap dark:bg-slate-800">
                      {item.exam}: {item.score} điểm
                    </div>

                    <div className="w-full max-w-[42px] h-full rounded-t-lg bg-slate-100 dark:bg-white/5 flex flex-col justify-end overflow-hidden">
                      <div
                        style={{ height: `${Math.max(item.score, 6)}%` }}
                        className={`w-full transition-all duration-500 rounded-t-lg ${
                          item.score >= 90
                            ? "bg-emerald-500 group-hover:bg-emerald-600"
                            : item.score >= 70
                            ? "bg-blue-600 group-hover:bg-blue-700"
                            : "bg-amber-500 group-hover:bg-amber-600"
                        }`}
                      />
                    </div>
                    <span className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-full">
                      {item.date}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-xs text-slate-400 dark:text-slate-500">
                Chưa có lịch sử nộp bài chấm điểm.
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Xuất sắc (&ge;90)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Đạt (&ge;70)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Trung bình
              </span>
            </div>
          </div>
        </div>

        {/* Biểu đồ Ngôn ngữ */}
        <div className="rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)] space-y-4 flex flex-col justify-between dark:border-white/10 dark:bg-[#0d1017] transition-colors">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-white/5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f3ff] text-[#7c3aed] dark:bg-violet-500/15 dark:text-violet-400">
                <PieChart className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ngôn ngữ nộp bài</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Tỷ lệ sử dụng trong các bài thi</p>
              </div>
            </div>

            {languageDistribution.length > 0 ? (
              <>
                <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  {languageDistribution.map((lang) => (
                    <div
                      key={lang.name}
                      style={{ width: `${lang.percentage}%` }}
                      className={`h-full ${lang.color}`}
                      title={`${lang.name}: ${lang.percentage}%`}
                    />
                  ))}
                </div>

                <div className="mt-5 space-y-3">
                  {languageDistribution.map((lang) => (
                    <div key={lang.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${lang.color}`} />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{lang.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 dark:text-slate-500">{lang.count}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{lang.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-4 flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-xs text-slate-400 dark:text-slate-500">
                Chưa có bài nộp nào được ghi nhận.
              </div>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 flex items-center justify-between text-xs dark:bg-white/5 dark:border-white/10">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-amber-500" /> Ngôn ngữ sở trường:
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{favoriteLanguage}</span>
          </div>
        </div>
      </section>

      {/* 3. DANH SÁCH BÀI THI & CỘT TIỆN ÍCH */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        
        {/* Cột trái (2/3): Bảng bài thi */}
        <section className="rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)] sm:p-6 xl:col-span-2 space-y-4 dark:border-white/10 dark:bg-[#0d1017] transition-colors">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {activeFilter === "Tất cả" ? "Tất cả kỳ thi" : `Kỳ thi: ${activeFilter}`}
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {filteredExams.length}
              </span>
            </div>

            <Link
              href="/student/schedule"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition"
            >
              Xem lịch thi <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400 dark:text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin text-blue-600" />
                Đang tải danh sách kỳ thi và phòng thực hành...
              </div>
            ) : filteredExams.length > 0 ? (
              filteredExams.map((exam: StudentExam) => (
                <article
                  key={exam.id}
                  className="flex flex-col justify-between gap-4 py-4 transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02] sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb] dark:bg-blue-500/15 dark:text-blue-400 mt-0.5">
                      <Code2 className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {exam.title}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span>{exam.subject}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                          {exam.instructor}
                        </span>
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          {exam.startTime}
                        </span>

                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <Clock3 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                          {exam.duration} phút
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-slate-400 dark:text-slate-500">Mã phòng:</span>
                          <code className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
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
                        className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition"
                      >
                        {exam.status === "Đang diễn ra" ? (
                          <>
                            <Play className="h-3.5 w-3.5" /> Vào thi
                          </>
                        ) : (
                          "Chi tiết"
                        )}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        Đã kết thúc
                      </span>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                Không có kỳ thi nào ở trạng thái &quot;{activeFilter}&quot;.
              </div>
            )}
          </div>
        </section>

        {/* Cột phải (1/3): Checklist & Quy chế */}
        <div className="space-y-5">
          {/* Checklist chuẩn bị */}
          <section className="rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)] space-y-4 dark:border-white/10 dark:bg-[#0d1017] transition-colors">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-white/5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Chuẩn bị trước khi thi
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Yêu cầu kỹ thuật bắt buộc
                </p>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Webcam hoạt động rõ nét và đủ ánh sáng</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Kết nối Internet ổn định suốt ca thi</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Sử dụng trình duyệt Chrome hoặc Edge</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Sẵn sàng cấp quyền chia sẻ màn hình</span>
              </li>
            </ul>

            <Link
              href="/student/device-check"
              className="block text-center text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition pt-1"
            >
              Kiểm tra thiết bị ngay →
            </Link>
          </section>

          {/* Thẻ lưu ý quy chế */}
          <section className="rounded-2xl border border-blue-200/80 bg-blue-50/70 p-5 space-y-2 dark:border-blue-500/30 dark:bg-blue-500/10">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
              <Code2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-xs">Lưu ý khi làm bài</h3>
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              Chỉ nộp bài khi đã hoàn thành các câu hỏi. Hệ thống sẽ tự động ghi nhận nhật ký thao tác và vi phạm nếu chuyển tab/cửa sổ.
            </p>
          </section>
        </div>
      </div>

      <footer className="pt-2 text-center text-xs text-slate-400 dark:text-slate-600">
        Oculide · Hệ thống thi lập trình trực tuyến
      </footer>
    </div>
  );
}