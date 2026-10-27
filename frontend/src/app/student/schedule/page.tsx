
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Code2,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import StudentSidebar from "@/components/student/StudentSidebar";
import StudentTopbar from "@/components/student/StudentTopbar";
import { studentExams, type ExamStatus } from "@/components/student/student-data";

type FilterStatus = "Tất cả" | ExamStatus;

const filters: FilterStatus[] = [
  "Tất cả",
  "Sắp diễn ra",
  "Đang diễn ra",
  "Đã hoàn thành",
];

const statusStyles: Record<ExamStatus, string> = {
  "Sắp diễn ra": "bg-amber-50 text-amber-700 ring-amber-600/20",
  "Đang diễn ra": "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "Đã hoàn thành": "bg-slate-100 text-slate-600 ring-slate-500/20",
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

  const upcomingCount = studentExams.filter(
    (exam) => exam.status === "Sắp diễn ra",
  ).length;

  const ongoingCount = studentExams.filter(
    (exam) => exam.status === "Đang diễn ra",
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <StudentSidebar />

      <div className="min-w-0 flex-1">
        <StudentTopbar />

        <main className="mx-auto max-w-[1600px] space-y-6 p-5 sm:p-8">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Sinh viên</span>
                <span>/</span>
                <span className="text-blue-700">Lịch thi</span>
              </div>

              <h2 className="mt-3 text-2xl font-bold text-slate-900">
                Lịch thi của tôi
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Theo dõi thời gian, trạng thái và thông tin các bài thi lập trình.
              </p>
            </div>

            <Link
              href="/student/exams"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Code2 size={18} />
              Vào phòng thi
              <ArrowRight size={16} />
            </Link>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Tổng số kỳ thi</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {studentExams.length}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Trong danh sách dữ liệu mẫu
              </p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-white p-5">
              <div className="flex items-center gap-2 text-amber-700">
                <CalendarDays size={18} />
                <p className="text-sm font-medium">Sắp diễn ra</p>
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {upcomingCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Chuẩn bị thiết bị trước giờ thi
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5">
              <div className="flex items-center gap-2 text-emerald-700">
                <Clock3 size={18} />
                <p className="text-sm font-medium">Đang diễn ra</p>
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {ongoingCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Kiểm tra trạng thái phòng thi
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Danh sách lịch thi
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Tìm kiếm và lọc kỳ thi theo trạng thái.
                  </p>
                </div>

                <div className="relative w-full lg:max-w-sm">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Tìm tên kỳ thi, môn học, giảng viên..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="mr-1 inline-flex items-center gap-1 text-sm text-slate-500">
                  <SlidersHorizontal size={16} />
                  Trạng thái:
                </span>

                {filters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatus(filter)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      status === filter
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredExams.map((exam) => (
                <article
                  key={exam.id}
                  className="flex flex-col justify-between gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:p-6"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Code2 size={23} />
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-900">
                        {exam.title}
                      </h4>

                      <p className="mt-1 text-sm text-slate-500">
                        {exam.subject} · {exam.instructor}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={14} />
                          {exam.startTime}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={14} />
                          {exam.duration} phút
                        </span>

                        <span>
                          Mã phòng:{" "}
                          <span className="font-semibold text-slate-700">
                            {exam.roomCode}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${statusStyles[exam.status]}`}
                    >
                      {exam.status}
                    </span>

                    {exam.status !== "Đã hoàn thành" ? (
                      <Link
                        href={`/student/exams?code=${encodeURIComponent(exam.roomCode)}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
                      >
                        {exam.status === "Đang diễn ra"
                          ? "Vào phòng thi"
                          : "Xem chi tiết"}
                        <ArrowRight size={15} />
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Đã kết thúc
                      </span>
                    )}
                  </div>
                </article>
              ))}

              {filteredExams.length === 0 && (
                <div className="px-5 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Search size={24} />
                  </div>
                  <h4 className="mt-4 font-semibold text-slate-800">
                    Không tìm thấy kỳ thi
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Hãy thử từ khóa khác hoặc chọn trạng thái khác.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setKeyword("");
                      setStatus("Tất cả");
                    }}
                    className="mt-4 text-sm font-semibold text-blue-700 hover:underline"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
              Hiển thị {filteredExams.length} / {studentExams.length} kỳ thi mẫu
            </div>
          </section>

          <p className="text-xs leading-5 text-slate-400">
            Lưu ý: Lịch thi hiện sử dụng dữ liệu mẫu ở frontend. Trạng thái và
            thời gian chính thức sẽ lấy từ API khi Backend được tích hợp.
          </p>
        </main>
      </div>
    </div>
  );
}
