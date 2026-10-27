
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Code2,
  GraduationCap,
  Info,
  Monitor,
  ShieldCheck,
  Users,
  Wifi,
} from "lucide-react";

import StudentSidebar from "@/components/student/StudentSidebar";
import StudentTopbar from "@/components/student/StudentTopbar";
import { studentExams, type StudentExam } from "@/components/student/student-data";

interface PendingExam {
  roomCode: string;
  examId: string;
}

export default function StudentWaitingRoomPage() {
  const [exam, setExam] = useState<StudentExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomError, setRoomError] = useState("");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("oculide_student_pending_exam");

      if (!saved) {
        setRoomError(
          "Chưa có thông tin phòng thi. Vui lòng quay lại và tham gia phòng thi trước.",
        );
        return;
      }

      const pending = JSON.parse(saved) as Partial<PendingExam>;

      const matchedExam = studentExams.find(
        (item) =>
          item.id === pending.examId &&
          item.roomCode.toLowerCase() ===
            String(pending.roomCode ?? "").toLowerCase(),
      );

      if (!matchedExam) {
        setRoomError(
          "Không tìm thấy thông tin kỳ thi trong dữ liệu mẫu. Vui lòng kiểm tra lại phòng thi.",
        );
        return;
      }

      setExam(matchedExam);
    } catch {
      setRoomError("Không thể đọc thông tin phòng thi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <StudentSidebar />

      <div className="min-w-0 flex-1">
        <StudentTopbar />

       <main className="w-full space-y-6 px-5 py-6 sm:px-7 lg:px-8">
          <div>
            <Link
              href="/student/device-check"
              className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-blue-700"
            >
              <ArrowLeft size={16} />
              Quay lại kiểm tra thiết bị
            </Link>

            <h2 className="mt-4 text-2xl font-bold text-slate-900">
              Phòng chờ thi
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Vui lòng chờ giảng viên bắt đầu kỳ thi. Đồng hồ làm bài chưa
              được khởi động trong phòng chờ.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Đang tải thông tin phòng thi...
            </div>
          ) : roomError ? (
            <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 shrink-0 text-amber-600" size={22} />
                <div>
                  <h3 className="font-bold text-slate-900">
                    Chưa thể vào phòng chờ
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {roomError}
                  </p>
                  <Link
                    href="/student/exams"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Quay lại phòng thi
                  </Link>
                </div>
              </div>
            </section>
          ) : exam ? (
            <>
              <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-6 text-white sm:p-8">
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
                        <Clock3 size={15} />
                        ĐANG CHỜ BẮT ĐẦU
                      </div>

                      <h3 className="mt-4 text-2xl font-bold">
                        {exam.title}
                      </h3>

                      <p className="mt-2 text-sm text-blue-100">
                        {exam.subject} · {exam.instructor}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/20 bg-white/10 p-4 md:min-w-44">
                      <p className="text-xs text-blue-100">Mã phòng thi</p>
                      <p className="mt-1 text-xl font-bold">{exam.roomCode}</p>
                      <p className="mt-2 text-xs text-blue-100">
                        Thời lượng: {exam.duration} phút
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3 sm:p-6">
                  <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                    <CalendarDays
                      size={20}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <p className="text-xs text-slate-500">
                        Thời gian dự kiến
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {exam.startTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                    <Code2 size={20} className="mt-0.5 text-violet-600" />
                    <div>
                      <p className="text-xs text-slate-500">Hình thức</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        Thực hành lập trình
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                    <GraduationCap
                      size={20}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <p className="text-xs text-slate-500">Giảng viên</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {exam.instructor}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                  <div className="flex flex-col items-center py-5 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                      <Clock3 size={38} className="text-blue-600" />
                    </div>

                    <h3 className="mt-5 text-xl font-bold text-slate-900">
                      Vui lòng chờ giảng viên
                    </h3>

                    <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
                      Bạn đã đến giao diện phòng chờ. Khi giảng viên bắt đầu
                      bài thi, hệ thống sẽ thông báo và chuyển bạn sang không
                      gian lập trình.
                    </p>

                    <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                      Chờ tín hiệu bắt đầu thi
                    </div>

                    <div className="mt-6 grid w-full grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-4 text-left">
                        <p className="text-xs text-slate-500">
                          Đồng hồ làm bài
                        </p>
                        <p className="mt-2 text-lg font-bold text-slate-900">
                          Chưa bắt đầu
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Không tính thời gian trong phòng chờ
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4 text-left">
                        <p className="text-xs text-slate-500">
                          Trạng thái phòng
                        </p>
                        <p className="mt-2 text-lg font-bold text-slate-900">
                          Đang chờ
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Dữ liệu mẫu ở frontend
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <ShieldCheck size={21} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Trạng thái thiết bị
                        </h3>
                        <p className="text-xs text-slate-500">
                          Theo bước kiểm tra trước đó
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm text-slate-600">
                          <Monitor size={17} />
                          Webcam
                        </span>
                        <span className="text-xs font-medium text-emerald-700">
                          Đã kiểm tra
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm text-slate-600">
                          <Wifi size={17} />
                          Kết nối mạng
                        </span>
                        <span className="text-xs font-medium text-emerald-700">
                          Đã kiểm tra
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm text-slate-600">
                          <Monitor size={17} />
                          Chia sẻ màn hình
                        </span>
                        <span className="text-xs font-medium text-emerald-700">
                          Đã kiểm tra
                        </span>
                      </div>
                    </div>

                    <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                      Các nhãn trên chỉ minh họa giao diện. Trạng thái thực
                      tế cần được truyền từ Device Check và xác nhận bởi
                      Backend.
                    </p>

                    <Link
                      href="/student/device-check"
                      className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Kiểm tra lại thiết bị
                    </Link>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Bell size={20} />
                      <h3 className="font-bold">Thông báo giảng viên</h3>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-blue-900">
                      Vui lòng giữ trang này mở, duy trì kết nối Internet
                      và theo dõi thông báo trước khi bắt đầu làm bài.
                    </p>

                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/70 p-3">
                      <Users
                        size={17}
                        className="mt-0.5 shrink-0 text-blue-700"
                      />
                      <p className="text-xs leading-5 text-blue-800">
                        Thông báo trực tiếp và số lượng thí sinh sẽ được cập
                        nhật khi tích hợp dịch vụ thời gian thực.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-blue-600" />
                    <h3 className="font-bold text-slate-900">
                      Bạn đã ở trong phòng chờ
                    </h3>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Chưa có tín hiệu bắt đầu từ giảng viên. Không rời trang
                    nếu kỳ thi sắp bắt đầu.
                  </p>
                </div>

                <Link
                  href="/student"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Về tổng quan
                </Link>
              </section>
            </>
          ) : null}

          <footer className="border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
            Oculide · Online Programming Examination System
          </footer>
        </main>
      </div>
    </div>
  );
}
