"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Code2,
  Info,
  LoaderCircle,
  Lock,
  Radio,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Volume2,
} from "lucide-react";
import { fetchWithAuth } from "@/services/apiClient";

interface PendingExamSession {
  roomId?: number;
  roomCode?: string;
  examTitle?: string;
  subject?: string;
  duration?: number;
  status?: string;
}

export default function StudentWaitingRoomPage() {
  const router = useRouter();
  const [session, setSession] = useState<PendingExamSession | null>(null);
  const [studentProfile, setStudentProfile] = useState<{ name: string; studentId: string }>({
    name: "Sinh viên",
    studentId: "---",
  });

  const [roomStatus, setRoomStatus] = useState<string>("chua_mo");
  const [isLecturerUnlocked, setIsLecturerUnlocked] = useState(false);
  const [isRoomClosed, setIsRoomClosed] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  // Đọc dữ liệu phòng từ Session Storage & thông tin thí sinh từ Local Storage
  useEffect(() => {
    try {
      const savedData = sessionStorage.getItem("oculide_student_pending_exam");
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setSession(parsed);
        if (parsed.status === "dang_dien_ra") {
          setRoomStatus("dang_dien_ra");
          setIsLecturerUnlocked(true);
        }
      }
      const rawUser = localStorage.getItem("oculide_user");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        setStudentProfile({
          name: u.name || u.fullName || u.full_name || "Sinh viên",
          studentId: u.studentId || u.student_id || u.userCode || u.ma_dinh_danh || "---",
        });
      }
    } catch {
      // Giữ giá trị mặc định nếu không đọc được
    }
  }, []);

  // Polling 3 giây/lần kiểm tra trạng thái bắt đầu thi thật từ Giảng viên
  useEffect(() => {
    if (!session?.roomCode) return;

    let isCancelled = false;
    const pollRoomStatus = async () => {
      try {
        const res = await fetchWithAuth<{
          status: string;
          is_active: boolean;
          duration_minutes: number;
        }>(`/api/v1/rooms/${encodeURIComponent(session.roomCode!)}/student-status`);

        if (isCancelled) return;
        setRoomStatus(res.status);

        if (res.status === "dang_dien_ra") {
          setIsLecturerUnlocked(true);
        } else if (res.status === "da_dong" || res.status === "da_huy" || !res.is_active) {
          setIsRoomClosed(true);
          setIsLecturerUnlocked(false);
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời khi polling
      }
    };

    pollRoomStatus();
    const interval = setInterval(pollRoomStatus, 3000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [session?.roomCode]);

  // Tự động chuyển vào phòng thi khi Giảng viên đã bấm Bắt đầu
  useEffect(() => {
    if (!isLecturerUnlocked || isEntering) return;
    const autoTimer = setTimeout(() => {
      setIsEntering(true);
      router.push("/student/exam-room");
    }, 1500);
    return () => clearTimeout(autoTimer);
  }, [isLecturerUnlocked, isEntering, router]);

  // Xử lý Chuyển tiếp vào Màn hình Làm bài thi IDE
  const handleStartExam = () => {
    setIsEntering(true);
    setTimeout(() => {
      router.push("/student/exam-room");
    }, 500);
  };

  return (
    <main className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Navigation Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/student" className="hover:text-blue-600 transition">
                Sinh viên
              </Link>
              <span>/</span>
              <span className="text-blue-600 font-semibold">Phòng chờ thi</span>
            </nav>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Phòng chờ phát đề thi trực tuyến
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Thiết bị đã sẵn sàng. Vui lòng giữ nguyên màn hình trong khi chờ Giảng viên mở bài thi.
            </p>
          </div>

          <div className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 border border-blue-200/80">
            <Radio size={16} className="text-emerald-500 animate-pulse" />
            Trạng thái phòng: <b className="text-slate-900">Đang trực tuyến</b>
          </div>
        </header>

        {/* Layout 2 Cột */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* CỘT TRÁI: ĐỒNG HỒ ĐẾM NGƯỢC & NÚT VÀO THI (7/12) */}
          <section className="xl:col-span-7 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <Code2 size={22} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {session?.examTitle || "Kiểm tra Lập trình C++ & Thuật toán Cơ bản"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Môn học: <span className="font-semibold text-slate-700">{session?.subject || "PRJ301"}</span> · Mã phòng: <span className="font-mono font-semibold text-blue-600">{session?.roomCode || "OCL-C001"}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Khung Trạng Thái Phòng Chờ Thực Tế */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/60 via-slate-50 to-white p-8 text-center space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-blue-700 border border-blue-200/80 shadow-2xs">
                <Clock size={15} className="text-blue-600" />
                <span>TRẠNG THÁI ĐỒNG BỘ PHÒNG THI</span>
              </div>

              {isRoomClosed ? (
                <div className="space-y-3">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-xs">
                    <AlertCircle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-red-700">
                    Phòng thi đã kết thúc hoặc bị hủy
                  </h3>
                  <p className="text-xs text-slate-500">
                    Giảng viên đã đóng phòng chờ ({roomStatus}). Vui lòng liên hệ giảng viên hoặc tham gia phòng khác.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/student/join")}
                    className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-900 cursor-pointer"
                  >
                    Quay lại Cổng Tham Gia
                  </button>
                </div>
              ) : !isLecturerUnlocked ? (
                <div className="space-y-3">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100/80 text-blue-600 shadow-xs">
                    <LoaderCircle size={34} className="animate-spin" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Đang chờ Giảng viên điểm danh &amp; mở đề...
                  </h3>
                  <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                    Hệ thống tự động kiểm tra tín hiệu mỗi 3 giây. Ngay khi Giảng viên bấm <strong>Bắt Đầu</strong>, bạn sẽ được đưa vào phòng thi tự động.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 animate-fade-in">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 font-bold text-xl shadow-xs">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Giảng viên đã mở đề thi!
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đang chuyển bạn vào không gian làm bài trực tuyến Oculide...
                  </p>
                </div>
              )}

              {/* Tiến trình giảng viên */}
              <div className="w-full max-w-md pt-2">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1 font-medium">
                    <Radio size={13} className="text-emerald-500" /> Tín hiệu phòng thi
                  </span>
                  <span className="font-semibold text-slate-700">
                    {isLecturerUnlocked ? "Đã duyệt 100%" : "Đang chờ Giảng viên phát đề..."}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isLecturerUnlocked ? "bg-emerald-500 w-full" : "bg-blue-600 w-3/4 animate-pulse"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Nút Bắt Đầu Làm Bài Thi */}
            <div className="space-y-3">
              <button
                type="button"
                disabled={!isLecturerUnlocked || isEntering}
                onClick={handleStartExam}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {isEntering ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />
                    <span>Đang khởi tạo không gian IDE...</span>
                  </>
                ) : !isLecturerUnlocked ? (
                  <>
                    <Lock size={18} />
                    <span>Vui lòng chờ Giảng viên mở phòng thi...</span>
                  </>
                ) : (
                  <>
                    <span>BẮT ĐẦU LÀM BÀI THI NGAY</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-slate-400">
                Nhấn vào nút trên để vào giao diện IDE lập trình và bắt đầu tính giờ làm bài.
              </p>
            </div>
          </section>

          {/* CỘT PHẢI: XÁC THỰC AI & QUY CHẾ THI (5/12) */}
          <section className="xl:col-span-5 space-y-5">
            {/* Thẻ Thí sinh đã xác thực AI */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Thí sinh đã xác thực</h3>
                  <p className="text-xs text-slate-500">Hồ sơ khớp dữ liệu AI Proctoring</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-slate-50 p-3 space-y-1">
                  <span className="text-slate-400 text-[11px]">Họ và tên</span>
                  <p className="font-bold text-slate-800">{studentProfile.name}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 space-y-1">
                  <span className="text-slate-400 text-[11px]">Mã sinh viên</span>
                  <p className="font-mono font-bold text-blue-600">{studentProfile.studentId}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 space-y-1">
                  <span className="text-slate-400 text-[11px]">AI Face ID</span>
                  <p className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={13} /> Khớp 99.4%
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 space-y-1">
                  <span className="text-slate-400 text-[11px]">Thời lượng thi</span>
                  <p className="font-bold text-slate-800">{session?.duration || 60} phút</p>
                </div>
              </div>
            </div>

            {/* Quy chế thi quan trọng */}
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-900">
                <AlertCircle size={18} className="text-amber-600 shrink-0" />
                <h3 className="font-bold text-xs sm:text-sm">Quy chế giám sát AI cần lưu ý:</h3>
              </div>

              <ul className="space-y-2 text-xs text-amber-900/90 leading-relaxed list-disc pl-4">
                <li>
                  Không được rời khỏi màn hình làm bài thi. Hành vi <strong>Chuyển Tab</strong> sẽ bị AI ghi nhận tự động.
                </li>
                <li>
                  Hệ thống <strong>chặn hoàn toàn thao tác Dán code (Paste)</strong> từ bên ngoài.
                </li>
                <li>
                  Nếu vi phạm quá <strong>3 lần</strong>, bài thi sẽ bị <strong>Treo máy</strong> và bắt buộc phải có Giảng viên phê duyệt mới được làm tiếp.
                </li>
              </ul>
            </div>
          </section>
        </div>

        <footer className="pt-2 text-center text-xs text-slate-400">
          Oculide · Hệ thống thi lập trình trực tuyến
        </footer>
      </div>
    </main>
  );
}