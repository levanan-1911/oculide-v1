
"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Code2,
  Play,
  ShieldCheck,
} from "lucide-react";

import StudentSidebar from "@/components/student/StudentSidebar";
import StudentTopbar from "@/components/student/StudentTopbar";
import StudentStatCard from "@/components/student/StudentStatCard";
import { studentExams } from "@/components/student/student-data";

const statusStyles = {
  "Sắp diễn ra": "bg-amber-50 text-amber-700 ring-amber-600/20",
  "Đang diễn ra": "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "Đã hoàn thành": "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export default function StudentDashboardPage() {
  const upcoming = studentExams.filter(
    (exam) => exam.status === "Sắp diễn ra",
  ).length;
  const ongoing = studentExams.filter(
    (exam) => exam.status === "Đang diễn ra",
  ).length;
  const completed = studentExams.filter(
    (exam) => exam.status === "Đã hoàn thành",
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <StudentSidebar />

      <div className="min-w-0 flex-1">
        <StudentTopbar />

        <main className="mx-auto max-w-[1600px] space-y-7 p-5 sm:p-8">
          <section className="flex flex-col justify-between gap-5 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 p-6 text-white shadow-sm sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-sm font-medium text-blue-100">
                STUDENT WORKSPACE
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                Xin chào, sinh viên!
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">
                Theo dõi lịch thi, chuẩn bị thiết bị và thực hiện bài thi lập
                trình trực tuyến trên Oculide.
              </p>
            </div>

            <Link
              href="/student/exams"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              <Code2 size={18} />
              Vào phòng thi
              <ArrowRight size={16} />
            </Link>
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Tổng quan kỳ thi
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Thống kê từ dữ liệu mẫu của sinh viên
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StudentStatCard
                title="Tổng số kỳ thi"
                value={studentExams.length}
                description="Kỳ thi trong danh sách mẫu"
                icon={BookOpen}
                iconColor="text-blue-700"
                iconBackground="bg-blue-50"
              />
              <StudentStatCard
                title="Sắp diễn ra"
                value={upcoming}
                description="Cần chuẩn bị trước giờ thi"
                icon={CalendarDays}
                iconColor="text-amber-700"
                iconBackground="bg-amber-50"
              />
              <StudentStatCard
                title="Đang diễn ra"
                value={ongoing}
                description="Kiểm tra thời gian và trạng thái"
                icon={Clock3}
                iconColor="text-emerald-700"
                iconBackground="bg-emerald-50"
              />
              <StudentStatCard
                title="Đã hoàn thành"
                value={completed}
                description="Các kỳ thi đã kết thúc"
                icon={CheckCircle2}
                iconColor="text-violet-700"
                iconBackground="bg-violet-50"
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Kỳ thi của tôi
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Danh sách kỳ thi lập trình được giao
                  </p>
                </div>

                <Link
                  href="/student/schedule"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  Xem lịch thi <ArrowRight size={15} />
                </Link>
              </div>

              <div className="space-y-3">
                {studentExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-slate-100 p-4 transition hover:border-blue-200 hover:bg-slate-50 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <Code2 size={21} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900">
                          {exam.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {exam.subject} · {exam.instructor}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={14} />
                            {exam.startTime}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock3 size={14} />
                            {exam.duration} phút
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[exam.status]}`}
                      >
                        {exam.status}
                      </span>

                      {exam.status !== "Đã hoàn thành" && (
                        <Link
                          href={`/student/exams?code=${exam.roomCode}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
                        >
                          {exam.status === "Đang diễn ra" ? (
                            <>
                              <Play size={15} /> Vào thi
                            </>
                          ) : (
                            "Chi tiết"
                          )}
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Chuẩn bị trước khi thi
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Checklist thiết bị
                    </p>
                  </div>
                </div>

                <ul className="mt-5 space-y-3 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />
                    Webcam hoạt động bình thường
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />
                    Kết nối Internet ổn định
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />
                    Sử dụng Chrome hoặc Edge
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />
                    Cho phép webcam và chia sẻ màn hình
                  </li>
                </ul>

                <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  Đây là checklist hướng dẫn. Việc kiểm tra quyền thiết bị
                  thực tế sẽ được triển khai ở màn hình Device Check.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div className="flex items-center gap-2 text-blue-800">
                  <Code2 size={20} />
                  <h2 className="font-bold">Lưu ý khi làm bài</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-blue-900">
                  Chỉ rời phòng thi sau khi đã nộp bài và nhận được trạng thái
                  xác nhận. Hãy kiểm tra mã nguồn đã lưu trước khi kết thúc.
                </p>
              </div>
            </div>
          </section>

          <footer className="border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
            Oculide · Online Programming Examination System
          </footer>
        </main>
      </div>
    </div>
  );
}
