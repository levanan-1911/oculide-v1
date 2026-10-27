
"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Code2,
  DoorOpen,
  Info,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import StudentSidebar from "@/components/student/StudentSidebar";
import StudentTopbar from "@/components/student/StudentTopbar";
import { studentExams } from "@/components/student/student-data";

function ExamJoinContent() {
  const searchParams = useSearchParams();

  const [roomCode, setRoomCode] = useState(
    searchParams.get("code") ?? "",
  );
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  const selectedExam = studentExams.find(
    (exam) =>
      exam.roomCode.toLowerCase() === roomCode.trim().toLowerCase(),
  );

  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!roomCode.trim()) {
      setError("Vui lòng nhập mã phòng thi.");
      return;
    }

    if (!passcode.trim()) {
      setError("Vui lòng nhập mã truy cập phòng thi.");
      return;
    }

    if (!selectedExam) {
      setError(
        "Không tìm thấy phòng thi trong dữ liệu mẫu. Hãy kiểm tra lại mã phòng.",
      );
      return;
    }

    if (selectedExam.status === "Đã hoàn thành") {
      setError("Phòng thi này đã kết thúc, bạn không thể tham gia.");
      return;
    }

    setJoining(true);

    // Mock frontend only: chưa xác thực passcode qua Backend.
    sessionStorage.setItem(
      "oculide_student_pending_exam",
      JSON.stringify({
        roomCode: selectedExam.roomCode,
        examId: selectedExam.id,
        passcode,
      }),
    );

    window.location.href = "/student/device-check";
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <StudentSidebar />

      <div className="min-w-0 flex-1">
        <StudentTopbar />

        <main className="w-full space-y-6 px-5 py-6 sm:px-7 lg:px-8">
          <div>
            <p className="text-sm text-slate-500">
              Sinh viên / Phòng thi
            </p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">
              Tham gia phòng thi
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Nhập thông tin phòng thi được giảng viên cung cấp để tiếp tục
              kiểm tra thiết bị trước giờ làm bài.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 xl:col-span-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <DoorOpen size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Thông tin tham gia
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Các trường có dấu * là bắt buộc
                  </p>
                </div>
              </div>

              <form onSubmit={handleJoin} className="mt-7 space-y-5">
                <div>
                  <label
                    htmlFor="roomCode"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Mã phòng thi <span className="text-red-500">*</span>
                  </label>

                  <div className="relative">
                    <Code2
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="roomCode"
                      value={roomCode}
                      onChange={(event) => {
                        setRoomCode(event.target.value);
                        setError("");
                      }}
                      placeholder="Ví dụ: OCL-C001"
                      autoComplete="off"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm uppercase outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="passcode"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Mã truy cập <span className="text-red-500">*</span>
                  </label>

                  <div className="relative">
                    <KeyRound
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="passcode"
                      type="password"
                      value={passcode}
                      onChange={(event) => {
                        setPasscode(event.target.value);
                        setError("");
                      }}
                      placeholder="Nhập mã truy cập do giảng viên cung cấp"
                      autoComplete="off"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700"
                  >
                    <Info size={18} className="mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={joining}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {joining ? "Đang chuyển trang..." : "Kiểm tra thiết bị"}
                  <ArrowRight size={17} />
                </button>

                <p className="text-center text-xs leading-5 text-slate-400">
                  Chuyển tiếp chỉ mô phỏng ở frontend. Backend sẽ xác thực
                  quyền tham gia và mã truy cập khi tích hợp.
                </p>
              </form>
            </section>

            <section className="space-y-5 xl:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <BookOpen size={21} />
                  </div>
                  <h3 className="font-bold text-slate-900">
                    Thông tin kỳ thi
                  </h3>
                </div>

                {selectedExam ? (
                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-xs text-slate-500">Tên kỳ thi</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedExam.title}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Môn học</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {selectedExam.subject}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Thời gian</p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                          <Clock3 size={15} />
                          {selectedExam.duration} phút
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Mã phòng</p>
                        <p className="mt-1 text-sm font-semibold text-blue-700">
                          {selectedExam.roomCode}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Trạng thái</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {selectedExam.status}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-5 text-center">
                    <BookOpen
                      size={28}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      Chưa có thông tin phòng thi
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Nhập mã phòng hợp lệ để xem thông tin kỳ thi mẫu.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <div className="flex items-center gap-2 text-emerald-800">
                  <ShieldCheck size={21} />
                  <h3 className="font-bold">Trước khi tham gia</h3>
                </div>

                <ul className="mt-4 space-y-3 text-sm leading-5 text-emerald-900">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                    Chuẩn bị webcam và kết nối Internet.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                    Dùng trình duyệt Chrome hoặc Edge.
                  </li>
                  <li className="flex items-start gap-2">
                    <LockKeyhole size={17} className="mt-0.5 shrink-0" />
                    Không chia sẻ mã truy cập cho người khác.
                  </li>
                </ul>
              </div>
            </section>
          </div>

          <div>
            <Link
              href="/student/schedule"
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              ← Quay lại lịch thi
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function StudentExamsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          Đang tải thông tin phòng thi...
        </div>
      }
    >
      <ExamJoinContent />
    </Suspense>
  );
}
