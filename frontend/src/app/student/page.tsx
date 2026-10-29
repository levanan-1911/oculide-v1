"use client";

import { useMemo, useState } from "react";
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
  PieChart,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { studentExams, type StudentExam } from "@/components/student/student-data";

type FilterStatus = "Tất cả" | "Sắp diễn ra" | "Đang diễn ra" | "Đã hoàn thành";

// Dữ liệu mẫu biểu đồ
const scoreHistory = [
  { exam: "Lập trình C++", score: 100, date: "15/10" },
  { exam: "Thuật toán cơ bản", score: 85, date: "18/10" },
  { exam: "Cấu trúc dữ liệu", score: 90, date: "22/10" },
  { exam: "OOP Java", score: 75, date: "25/10" },
  { exam: "Python Advance", score: 95, date: "28/10" },
];

const languageDistribution = [
  { name: "C++", percentage: 55, color: "bg-blue-600", count: "12 bài" },
  { name: "Python", percentage: 25, color: "bg-amber-500", count: "5 bài" },
  { name: "Java", percentage: 15, color: "bg-rose-500", count: "3 bài" },
  { name: "JavaScript", percentage: 5, color: "bg-emerald-500", count: "1 bài" },
];

const statusStyles: Record<string, string> = {
  "Sắp diễn ra": "bg-amber-50 text-amber-700 border-amber-200/80",
  "Đang diễn ra": "bg-emerald-50 text-emerald-700 border-emerald-200/80 animate-pulse",
  "Đã hoàn thành": "bg-slate-100 text-slate-600 border-slate-200",
};

export default function StudentDashboardPage() {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("Tất cả");

  const counts = useMemo(
    () => ({
      all: studentExams.length,
      upcoming: studentExams.filter((e) => e.status === "Sắp diễn ra").length,
      ongoing: studentExams.filter((e) => e.status === "Đang diễn ra").length,
      completed: studentExams.filter((e) => e.status === "Đã hoàn thành").length,
    }),
    []
  );

  const filteredExams = useMemo(() => {
    if (activeFilter === "Tất cả") return studentExams;
    return studentExams.filter((exam) => exam.status === activeFilter);
  }, [activeFilter]);

  const avgScore = useMemo(() => {
    const total = scoreHistory.reduce((acc, curr) => acc + curr.score, 0);
    return Math.round(total / scoreHistory.length);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* Banner Chào mừng - Khung rộng max-w-[1600px] */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 p-6 text-white shadow-sm sm:p-8">
          <div className="relative z-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                <Sparkles size={13} className="text-blue-200" />
                STUDENT WORKSPACE
              </span>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Xin chào, sinh viên!
              </h1>
              <p className="max-w-2xl text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                Theo dõi tiến độ học tập, chuẩn bị thiết bị và tham gia các ca thi lập trình trực tuyến an toàn.
              </p>
            </div>

            <Link
              href="/student/exams"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-[0.98]"
            >
              <Code2 size={18} />
              Vào phòng thi
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* 1. THẺ THỐNG KÊ TƯƠNG TÁC (Tương tự Lịch thi) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Tổng quan kỳ thi</h2>
              <p className="text-xs text-slate-500">Nhấn vào từng thẻ để lọc nhanh danh sách bên dưới</p>
            </div>
            {activeFilter !== "Tất cả" && (
              <button
                type="button"
                onClick={() => setActiveFilter("Tất cả")}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition"
              >
                <RotateCcw size={12} /> Bỏ lọc ({activeFilter})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* Tất cả */}
            <button
              type="button"
              onClick={() => setActiveFilter("Tất cả")}
              className={`flex items-center justify-between rounded-2xl border p-5 text-left transition ${
                activeFilter === "Tất cả"
                  ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-sm"
                  : "border-slate-200/80 bg-white hover:border-slate-300"
              }`}
            >
              <div>
                <p className="text-xs font-medium text-slate-500">Tổng số kỳ thi</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{counts.all}</p>
                <p className="mt-1 text-[11px] text-slate-400">Danh sách bài thi cá nhân</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BookOpen size={22} />
              </div>
            </button>

            {/* Sắp diễn ra */}
            <button
              type="button"
              onClick={() => setActiveFilter("Sắp diễn ra")}
              className={`flex items-center justify-between rounded-2xl border p-5 text-left transition ${
                activeFilter === "Sắp diễn ra"
                  ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-sm"
                  : "border-slate-200/80 bg-white hover:border-slate-300"
              }`}
            >
              <div>
                <p className="text-xs font-medium text-slate-500">Sắp diễn ra</p>
                <p className="mt-2 text-3xl font-bold text-amber-600">{counts.upcoming}</p>
                <p className="mt-1 text-[11px] text-slate-400">Chuẩn bị trước giờ thi</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <CalendarDays size={22} />
              </div>
            </button>

            {/* Đang diễn ra */}
            <button
              type="button"
              onClick={() => setActiveFilter("Đang diễn ra")}
              className={`flex items-center justify-between rounded-2xl border p-5 text-left transition ${
                activeFilter === "Đang diễn ra"
                  ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm"
                  : "border-slate-200/80 bg-white hover:border-slate-300"
              }`}
            >
              <div>
                <p className="text-xs font-medium text-slate-500">Đang diễn ra</p>
                <p className="mt-2 text-3xl font-bold text-emerald-600">{counts.ongoing}</p>
                <p className="mt-1 text-[11px] text-slate-400">Có thể tham gia ngay</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Clock3 size={22} />
              </div>
            </button>

            {/* Đã hoàn thành */}
            <button
              type="button"
              onClick={() => setActiveFilter("Đã hoàn thành")}
              className={`flex items-center justify-between rounded-2xl border p-5 text-left transition ${
                activeFilter === "Đã hoàn thành"
                  ? "border-violet-500 bg-violet-50/40 ring-2 ring-violet-500/20 shadow-sm"
                  : "border-slate-200/80 bg-white hover:border-slate-300"
              }`}
            >
              <div>
                <p className="text-xs font-medium text-slate-500">Đã hoàn thành</p>
                <p className="mt-2 text-3xl font-bold text-violet-600">{counts.completed}</p>
                <p className="mt-1 text-[11px] text-slate-400">Bài thi đã nộp</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <CheckCircle2 size={22} />
              </div>
            </button>
          </div>
        </section>

        {/* 2. BIỂU ĐỒ THỐNG KÊ */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Biểu đồ điểm số */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Biểu đồ kết quả làm bài</h3>
                  <p className="text-xs text-slate-400">Điểm số 5 bài thi gần nhất</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200/60">
                <TrendingUp size={14} className="text-emerald-600" />
                ĐTB: <span className="text-blue-600 font-bold">{avgScore}/100</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="grid h-44 grid-cols-5 items-end gap-3 sm:gap-6 border-b border-slate-100 pb-2">
                {scoreHistory.map((item) => (
                  <div key={item.exam} className="group relative flex h-full flex-col justify-end items-center">
                    <div className="absolute -top-9 hidden rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md group-hover:block transition z-10 whitespace-nowrap">
                      {item.exam}: {item.score} điểm
                    </div>

                    <div className="w-full max-w-[42px] rounded-t-lg bg-slate-100 flex flex-col justify-end overflow-hidden">
                      <div
                        style={{ height: `${item.score}%` }}
                        className={`w-full transition-all duration-500 rounded-t-lg ${
                          item.score >= 90
                            ? "bg-emerald-500 group-hover:bg-emerald-600"
                            : item.score >= 70
                            ? "bg-blue-600 group-hover:bg-blue-700"
                            : "bg-amber-500 group-hover:bg-amber-600"
                        }`}
                      />
                    </div>
                    <span className="mt-2 text-[11px] font-medium text-slate-500 truncate max-w-full">
                      {item.date}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
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
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                  <PieChart size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ngôn ngữ nộp bài</h3>
                  <p className="text-xs text-slate-400">Tỷ lệ sử dụng trong các bài thi</p>
                </div>
              </div>

              <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
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
                      <span className="font-semibold text-slate-700">{lang.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{lang.count}</span>
                      <span className="font-bold text-slate-800">{lang.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <Award size={14} className="text-amber-500" /> Ngôn ngữ sở trường:
              </span>
              <span className="font-bold text-slate-900">C++ (55%)</span>
            </div>
          </div>
        </section>

        {/* 3. DANH SÁCH BÀI THI & CỘT TIỆN ÍCH */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          
          {/* Cột trái (2/3): Bảng bài thi */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  {activeFilter === "Tất cả" ? "Tất cả kỳ thi" : `Kỳ thi: ${activeFilter}`}
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {filteredExams.length}
                </span>
              </div>

              <Link
                href="/student/schedule"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                Xem lịch thi <ArrowRight size={14} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredExams.length > 0 ? (
                filteredExams.map((exam: StudentExam) => (
                  <article
                    key={exam.id}
                    className="flex flex-col justify-between gap-4 py-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mt-0.5">
                        <Code2 size={21} />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <h3 className="font-bold text-slate-900 text-sm truncate">
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

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-1">
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
                          {exam.status === "Đang diễn ra" ? (
                            <>
                              <Play size={13} /> Vào thi
                            </>
                          ) : (
                            "Chi tiết"
                          )}
                          <ArrowRight size={14} />
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">
                          Đã kết thúc
                        </span>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Không có kỳ thi nào ở trạng thái "{activeFilter}".
                </div>
              )}
            </div>
          </section>

          {/* Cột phải (1/3): Checklist & Quy chế */}
          <div className="space-y-5">
            {/* Checklist chuẩn bị */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Chuẩn bị trước khi thi
                  </h3>
                  <p className="text-xs text-slate-400">
                    Yêu cầu kỹ thuật bắt buộc
                  </p>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>Webcam hoạt động rõ nét và đủ ánh sáng</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>Kết nối Internet ổn định suốt ca thi</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>Sử dụng trình duyệt Chrome hoặc Edge</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>Sẵn sàng cấp quyền chia sẻ màn hình</span>
                </li>
              </ul>

              <Link
                href="/student/device-check"
                className="block text-center text-xs font-semibold text-blue-600 hover:text-blue-700 transition pt-1"
              >
                Kiểm tra thiết bị ngay →
              </Link>
            </section>

            {/* Thẻ lưu ý quy chế */}
            <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 space-y-2">
              <div className="flex items-center gap-2 text-blue-900">
                <Code2 size={18} className="text-blue-600" />
                <h3 className="font-bold text-xs">Lưu ý khi làm bài</h3>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                Chỉ nộp bài khi đã hoàn thành các câu hỏi. Hệ thống sẽ tự động ghi nhận nhật ký thao tác và vi phạm nếu chuyển tab/cửa sổ.
              </p>
            </section>
          </div>
        </div>

        <footer className="pt-2 text-center text-xs text-slate-400">
          Oculide · Hệ thống thi lập trình trực tuyến
        </footer>
      </div>
    </main>
  );
}