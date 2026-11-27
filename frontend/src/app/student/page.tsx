"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  "Sắp diễn ra": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
  "Đang diễn ra": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
  "Đã hoàn thành": "bg-brand-50 text-brand-700 border-brand/20 dark:bg-brand-500/10 dark:text-[#f0c2cf] dark:border-brand-500/30",
};

export default function StudentDashboardPage() {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("Tất cả");
  const examListSectionRef = useRef<HTMLElement | null>(null);

  const handleSelectFilter = (nextFilter: FilterStatus) => {
    setActiveFilter(nextFilter);
    setTimeout(() => {
      examListSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };
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

  const submittedRoomIds = useMemo(
    () =>
      new Set(
        submissions
          .map((s) => s.room_id)
          .filter((id): id is number => typeof id === "number" && id > 0)
      ),
    [submissions]
  );

  const normalizedExams = useMemo(() => {
    return exams.map((e) => {
      const rId = Number((e as any).roomId ?? e.id);
      if (Number.isFinite(rId) && submittedRoomIds.has(rId)) {
        return { ...e, status: "Đã hoàn thành" as const };
      }
      return e;
    });
  }, [exams, submittedRoomIds]);

  const counts = useMemo(
    () => {
      const completedRooms = normalizedExams.filter((e) => e.status === "Đã hoàn thành").length;
      return {
        all: normalizedExams.length,
        upcoming: normalizedExams.filter((e) => e.status === "Sắp diễn ra").length,
        ongoing: normalizedExams.filter((e) => e.status === "Đang diễn ra").length,
        completed: Math.max(completedRooms, submittedRoomIds.size, submissions.length > 0 ? 1 : 0),
      };
    },
    [normalizedExams, submittedRoomIds.size, submissions.length]
  );

  const filteredExams = useMemo(() => {
    if (activeFilter === "Tất cả") return normalizedExams;
    return normalizedExams.filter((exam) => exam.status === activeFilter);
  }, [activeFilter, normalizedExams]);

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
            <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-300 bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-[#f0c2cf]">
              <GraduationCap className="h-3.5 w-3.5" />
              KHÔNG GIAN HỌC TẬP &amp; KHẢO THÍ
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-serif font-bold tracking-tight text-[#2A282D] dark:text-white sm:text-3xl">
            Xin chào, {studentName}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#a59fa3] sm:text-[13px]">
            Theo dõi tiến độ học phần, chuẩn bị thiết bị kiểm tra và tham gia phòng thi trực tuyến an toàn.
          </p>
        </div>

        <Link
          href="/student/exams"
          className="system-primary-action inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
        >
          <Code2 className="h-4 w-4" />
          Vào phòng thi
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* 1. THẺ THỐNG KÊ TƯƠNG TÁC (CÂN ĐỐI TUYỆT ĐỐI CẢ 4 THẺ) */}
      <section className="space-y-3" aria-label="Tổng quan kỳ thi">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-serif font-bold text-[#2A282D] dark:text-white uppercase tracking-wider">Tổng quan ca thi &amp; bài tập</h2>
            <p className="text-xs text-slate-500 dark:text-[#a59fa3]">Chọn thẻ bên dưới để lọc nhanh danh sách phòng thi tương ứng</p>
          </div>
          {activeFilter !== "Tất cả" && (
            <button
              type="button"
              onClick={() => setActiveFilter("Tất cả")}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 hover:underline dark:text-[#e5a9b9] transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Bỏ lọc ({activeFilter})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 items-stretch">
          {/* Thẻ 1: Tất cả */}
          <button
            type="button"
            onClick={() => handleSelectFilter("Tất cả")}
            className={`flex flex-col justify-between h-full rounded-md border p-5 text-left transition-colors cursor-pointer ${
              activeFilter === "Tất cả"
                ? "border-brand bg-brand-50 ring-1 ring-brand shadow-sm dark:bg-brand-500/10 dark:border-brand-500/40"
                : "border-slate-300 bg-white hover:border-[#b8b0b3] shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-[#f0c2cf]">
                  <BookOpen className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-[#5a565e] dark:text-[#b0a7aa]">
                  Tổng ca thi &amp; lab
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[28px] font-bold leading-none tracking-tight text-[#2A282D] dark:text-white font-mono">
                {counts.all}
              </span>
              <span className="text-xs font-semibold text-slate-900 dark:text-[#e5a9b9]">
                Toàn bộ danh sách
              </span>
            </div>
          </button>

          {/* Thẻ 2: Sắp diễn ra */}
          <button
            type="button"
            onClick={() => handleSelectFilter("Sắp diễn ra")}
            className={`flex flex-col justify-between h-full rounded-md border p-5 text-left transition-colors cursor-pointer ${
              activeFilter === "Sắp diễn ra"
                ? "border-brand bg-brand-50 ring-1 ring-brand shadow-sm dark:bg-brand-500/10 dark:border-brand-500/40"
                : "border-slate-300 bg-white hover:border-[#b8b0b3] shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-[#5a565e] dark:text-[#b0a7aa]">
                  Sắp diễn ra
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[28px] font-bold leading-none tracking-tight text-[#2A282D] dark:text-white font-mono">
                {counts.upcoming}
              </span>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Chuẩn bị thiết bị
              </span>
            </div>
          </button>

          {/* Thẻ 3: Đang diễn ra */}
          <button
            type="button"
            onClick={() => handleSelectFilter("Đang diễn ra")}
            className={`flex flex-col justify-between h-full rounded-md border p-5 text-left transition-colors cursor-pointer ${
              activeFilter === "Đang diễn ra"
                ? "border-brand bg-brand-50 ring-1 ring-brand shadow-sm dark:bg-brand-500/10 dark:border-brand-500/40"
                : "border-slate-300 bg-white hover:border-[#b8b0b3] shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <Clock3 className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-[#5a565e] dark:text-[#b0a7aa]">
                  Đang diễn ra
                </span>
              </div>
              {counts.ongoing > 0 && (
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
              )}
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[28px] font-bold leading-none tracking-tight text-[#2A282D] dark:text-white font-mono">
                {counts.ongoing}
              </span>
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Tham gia ngay
              </span>
            </div>
          </button>

          {/* Thẻ 4: Đã hoàn thành */}
          <button
            type="button"
            onClick={() => handleSelectFilter("Đã hoàn thành")}
            className={`flex flex-col justify-between h-full rounded-md border p-5 text-left transition-colors cursor-pointer ${
              activeFilter === "Đã hoàn thành"
                ? "border-brand bg-brand-50 ring-1 ring-brand shadow-sm dark:bg-brand-500/10 dark:border-brand-500/40"
                : "border-slate-300 bg-white hover:border-[#b8b0b3] shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-[#5a565e] dark:text-[#b0a7aa]">
                  Đã nộp bài
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[28px] font-bold leading-none tracking-tight text-[#2A282D] dark:text-white font-mono">
                {counts.completed}
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Xem lịch sử điểm
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* 2. BIỂU ĐỒ THỐNG KÊ (CÂN ĐỐI CHIỀU CAO CẢ 2 BOX CÙNG HÀNG) */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch">

        {/* Biểu đồ điểm số (2 cột) */}
        <div className="flex flex-col justify-between rounded-md border border-slate-300 bg-white p-5 lg:col-span-2 dark:border-white/10 dark:bg-neutral-900 transition-colors shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-slate-300 pb-3 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-[#f0c2cf]">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#2A282D] dark:text-white">Biểu đồ kết quả làm bài gần nhất</h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#a59fa3]">Điểm số phân bổ theo các lượt nộp bài gần đây</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 border border-slate-300 dark:bg-[#221e27] dark:border-white/10 dark:text-slate-300">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                ĐTB:{" "}
                <span className="text-slate-900 dark:text-[#e5a9b9] font-bold font-mono">
                  {avgScore !== null ? `${avgScore}/100` : "--/100"}
                </span>
              </div>
            </div>

            <div className="pt-4">
              {scoreHistory.length > 0 ? (
                <div className="grid h-44 grid-cols-5 items-end gap-3 sm:gap-6 border-b border-slate-300 pb-2 dark:border-white/10">
                  {scoreHistory.map((item) => (
                    <div key={item.id} className="group relative flex h-full flex-col justify-end items-center">
                      <div className="absolute -top-9 hidden rounded-md bg-[#2A282D] px-2.5 py-1 text-[11px] font-semibold text-white shadow-md group-hover:block transition z-10 whitespace-nowrap dark:bg-slate-800">
                        {item.exam}: {item.score} điểm
                      </div>

                      <div className="w-full max-w-[42px] h-full rounded-t bg-slate-50 dark:bg-white/5 flex flex-col justify-end overflow-hidden">
                        <div
                          style={{ height: `${Math.max(item.score, 6)}%` }}
                          className={`w-full rounded-t ${
                            item.score >= 90
                              ? "bg-emerald-700 dark:bg-emerald-600"
                              : item.score >= 70
                              ? "bg-slate-900 dark:bg-slate-800"
                              : "bg-amber-600"
                          }`}
                        />
                      </div>
                      <span className="mt-2 text-[11px] font-medium text-slate-500 dark:text-[#a59fa3] truncate max-w-full">
                        {item.date}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-44 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 dark:border-white/10 text-xs text-slate-500 dark:text-[#a59fa3]">
                  Chưa có lịch sử nộp bài chấm điểm.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-300 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-[#a59fa3]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-700" /> Xuất sắc (&ge;90)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand" /> Đạt yêu cầu (&ge;70)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-600" /> Cần cải thiện
            </span>
          </div>
        </div>

        {/* Biểu đồ Ngôn ngữ (1 cột) */}
        <div className="flex flex-col justify-between rounded-md border border-slate-300 bg-white p-5 dark:border-white/10 dark:bg-neutral-900 transition-colors shadow-sm">
          <div>
            <div className="flex items-center gap-2.5 border-b border-slate-300 pb-3 dark:border-white/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-[#f0c2cf]">
                <PieChart className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-serif font-bold text-[#2A282D] dark:text-white">Ngôn ngữ nộp bài</h3>
                <p className="text-[11px] text-slate-500 dark:text-[#a59fa3]">Tỷ lệ các bài giải đã nộp</p>
              </div>
            </div>

            {languageDistribution.length > 0 ? (
              <div className="pt-3">
                <div className="flex h-2.5 w-full overflow-hidden rounded bg-slate-50 dark:bg-white/10">
                  {languageDistribution.map((lang) => (
                    <div
                      key={lang.name}
                      style={{ width: `${lang.percentage}%` }}
                      className={`h-full ${lang.color}`}
                      title={`${lang.name}: ${lang.percentage}%`}
                    />
                  ))}
                </div>

                <div className="mt-5 space-y-2.5">
                  {languageDistribution.map((lang) => (
                    <div key={lang.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${lang.color}`} />
                        <span className="font-semibold text-slate-800 dark:text-slate-300">{lang.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-500 dark:text-[#a59fa3]">{lang.count}</span>
                        <span className="font-bold text-[#2A282D] dark:text-white">{lang.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex h-36 items-center justify-center rounded-md border border-dashed border-slate-300 dark:border-white/10 text-xs text-slate-500 dark:text-[#a59fa3]">
                Chưa có dữ liệu ngôn ngữ.
              </div>
            )}
          </div>

          <div className="mt-4 rounded-md bg-slate-50 p-3 border border-slate-300 flex items-center justify-between text-xs dark:bg-[#221e27] dark:border-white/10">
            <span className="text-[#5a565e] dark:text-[#b0a7aa] flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-amber-600" /> Ngôn ngữ chủ đạo:
            </span>
            <span className="font-bold text-[#2A282D] dark:text-white font-mono">{favoriteLanguage}</span>
          </div>
        </div>
      </section>

      {/* 3. DANH SÁCH BÀI THI & CỘT TIỆN ÍCH */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 items-start">
        
        {/* Cột trái (2/3): Bảng bài thi */}
        <section
          ref={examListSectionRef}
          className="scroll-mt-4 rounded-md border border-slate-300 bg-white p-5 sm:p-6 xl:col-span-2 space-y-4 dark:border-white/10 dark:bg-neutral-900 transition-colors shadow-sm"
        >
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-300 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-900 dark:text-[#e5a9b9]" />
              <h2 className="text-sm font-serif font-bold text-[#2A282D] dark:text-white uppercase tracking-wider">
                {activeFilter === "Tất cả" ? "Danh sách ca thi & phòng thực hành" : `Ca thi: ${activeFilter}`}
              </h2>
              <span className="rounded bg-slate-50 px-2 py-0.5 text-xs font-semibold text-[#5a565e] border border-slate-300 dark:border-white/10 dark:bg-white/10 dark:text-slate-300 font-mono">
                {filteredExams.length}
              </span>
            </div>

            <Link
              href="/student/schedule"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:underline dark:text-[#e5a9b9] transition-colors"
            >
              Lịch thi chi tiết <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-300 dark:divide-white/10">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500 dark:text-[#a59fa3]">
                <LoaderCircle className="h-4 w-4 animate-spin text-slate-900" />
                Đang nạp dữ liệu ca thi...
              </div>
            ) : filteredExams.length > 0 ? (
              filteredExams.map((exam: StudentExam) => (
                <article
                  key={exam.id}
                  className="flex flex-col justify-between gap-4 py-4 transition-colors hover:bg-[#FAF9F9] dark:hover:bg-white/[0.02] sm:flex-row sm:items-center px-2 rounded-md"
                >
                  <div className="flex min-w-0 items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-[#f0c2cf] mt-0.5">
                      <Code2 className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <h3 className="font-serif font-bold text-[#2A282D] dark:text-white text-sm truncate">
                        {exam.subject} - Lớp: {exam.classCode || "Chung"} (GV: {exam.instructor})
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-[#a59fa3] flex items-center gap-1.5">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{exam.title}</span>
                        <span>•</span>
                        <span>Phòng: {exam.roomCode}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-[#a59fa3] pt-1">
                        <span className="inline-flex items-center gap-1 text-[#5a565e] dark:text-[#b0a7aa] font-mono">
                          <CalendarDays className="h-3.5 w-3.5 text-slate-900 dark:text-[#e5a9b9]" />
                          {exam.startTime}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[#5a565e] dark:text-[#b0a7aa] font-mono">
                          <Clock3 className="h-3.5 w-3.5 text-slate-800 dark:text-[#d48b9f]" />
                          {exam.duration} phút
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-[#a59fa3]">Mã phòng:</span>
                          <code className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                            {exam.roomCode}
                          </code>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <span
                      className={`inline-flex rounded px-2.5 py-1 text-xs font-semibold border ${statusStyles[exam.status]}`}
                    >
                      {exam.status}
                    </span>

                    {exam.status !== "Đã hoàn thành" ? (
                      <Link
                        href={`/student/exams?code=${encodeURIComponent(exam.roomCode)}`}
                        className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-brand-700 hover:underline dark:text-[#e5a9b9] transition-colors"
                      >
                        {exam.status === "Đang diễn ra" ? (
                          <>
                            <Play className="h-3.5 w-3.5" /> Vào thi
                          </>
                        ) : (
                          "Chi tiết ca thi"
                        )}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-[#a59fa3] font-medium">
                        Đã kết thúc
                      </span>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-[#a59fa3]">
                Không có kỳ thi nào ở trạng thái &quot;{activeFilter}&quot;.
              </div>
            )}
          </div>
        </section>

        {/* Cột phải (1/3): Checklist & Quy chế */}
        <div className="space-y-5">
          {/* Checklist chuẩn bị */}
          <section className="rounded-md border border-slate-300 bg-white p-5 shadow-sm space-y-4 dark:border-white/10 dark:bg-neutral-900 transition-colors">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-300 dark:border-white/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-[#2A282D] dark:text-white text-xs uppercase tracking-wider">
                  Chuẩn bị trước ca thi
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-[#a59fa3]">
                  Yêu cầu kỹ thuật bắt buộc
                </p>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-[#5a565e] dark:text-[#b0a7aa]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                <span>Webcam hoạt động rõ nét và đủ ánh sáng</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                <span>Kết nối Internet ổn định suốt ca thi</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                <span>Sử dụng trình duyệt Chrome hoặc Edge</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                <span>Sẵn sàng cấp quyền chia sẻ màn hình</span>
              </li>
            </ul>

            <Link
              href="/student/device-check"
              className="block text-center text-xs font-semibold text-slate-900 hover:underline dark:text-[#e5a9b9] transition-colors pt-1"
            >
              Kiểm tra thiết bị ngay →
            </Link>
          </section>

          {/* Thẻ lưu ý quy chế */}
          <section className="rounded-md border border-slate-900/30 bg-slate-900/5 p-5 space-y-2 dark:border-slate-800/40 dark:bg-slate-800/15">
            <div className="flex items-center gap-2 text-slate-900 dark:text-[#e5a9b9]">
              <Code2 className="h-4 w-4" />
              <h3 className="font-serif font-bold text-xs uppercase tracking-wider">Lưu ý khi làm bài</h3>
            </div>
            <p className="text-xs text-[#5a565e] dark:text-slate-300 leading-relaxed">
              Mỗi lượt nộp sẽ được chạy thử qua bộ test case tự động. Hệ thống sẽ ghi nhận lịch sử vi phạm nếu phát hiện hành vi chuyển tab hoặc dán code từ bên ngoài.
            </p>
          </section>
        </div>
      </div>

      <footer className="pt-2 text-center text-xs text-slate-500 dark:text-[#a59fa3]">
        Oculide · Nền tảng Đánh giá Năng lực Lập trình Trực tuyến
      </footer>
    </div>
  );
}
