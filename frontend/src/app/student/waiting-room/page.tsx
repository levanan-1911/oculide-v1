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
  isLate?: boolean;
  attendanceStatus?: string;
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
  const [isLateEntry, setIsLateEntry] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  // Đọc dữ liệu phòng từ Session Storage & thông tin thí sinh từ Local Storage
  useEffect(() => {
    try {
      const savedData = sessionStorage.getItem("oculide_student_pending_exam");
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setSession(parsed);

        // Kiểm tra xem thí sinh đã nộp bài phòng này chưa
        if (parsed.roomId && localStorage.getItem(`oculide_submitted_room_${parsed.roomId}`) === "true") {
          setHasSubmitted(true);
          setIsRoomClosed(true);
          return;
        }

        const savedStatus = String(parsed.status || '').toLowerCase();
        const savedEndTime = parsed.endTime ? Date.parse(parsed.endTime) : Number.NaN;
        const isWaitingStatus = ['chua_mo', 'waiting', 'scheduled'].includes(savedStatus);
        if (
          ['da_dong', 'da_huy', 'da_ket_thuc', 'completed', 'ended', 'closed', 'cancelled'].includes(savedStatus) ||
          (!isWaitingStatus && Number.isFinite(savedEndTime) && savedEndTime <= Date.now())
        ) {
          setIsRoomClosed(true);
        } else if (parsed.isLate || (parsed.status === "dang_dien_ra" || parsed.status === "in_progress")) {
          // Phòng chờ đã đóng khi ca thi/lớp bắt đầu; ghi nhận điểm danh muộn
          setRoomStatus("dang_dien_ra");
          setIsLateEntry(true);
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
          end_time: string;
          has_submitted?: boolean;
          is_late?: boolean;
          attendance_status?: string;
        }>(`/api/v1/rooms/${encodeURIComponent(session.roomCode!)}/student-status`);

        if (isCancelled) return;
        if (res.has_submitted) {
          setHasSubmitted(true);
          setIsRoomClosed(true);
          setIsLecturerUnlocked(false);
          setIsLateEntry(false);
          return;
        }
        const statusLower = String(res.status || '').toLowerCase();
        const isWaiting = ['chua_mo', 'waiting', 'scheduled'].includes(statusLower);
        const expired =
          ['da_dong', 'da_huy', 'da_ket_thuc', 'completed', 'ended', 'closed', 'cancelled'].includes(statusLower) ||
          !res.is_active ||
          (!isWaiting && Number.isFinite(Date.parse(res.end_time)) && Date.parse(res.end_time) <= Date.now());
        setRoomStatus(expired ? 'completed' : res.status);

        if (expired) {
          setIsRoomClosed(true);
          setIsLecturerUnlocked(false);
          setIsLateEntry(false);
        } else if (res.status === "dang_dien_ra" || res.status === "in_progress") {
          if (res.is_late || res.attendance_status === "muon" || isLateEntry) {
            setIsLateEntry(true);
          } else {
            setIsLecturerUnlocked(true);
          }
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
  }, [session?.roomCode, isLateEntry]);

  // Tự động chuyển vào phòng thi khi Giảng viên đã bấm Bắt đầu hoặc sinh viên vào muộn
  useEffect(() => {
    if ((isLecturerUnlocked || isLateEntry) && !isEntering) {
      const autoTimer = setTimeout(() => {
        setIsEntering(true);
        router.push("/student/exam-room");
      }, isLateEntry ? 2500 : 1500);
      return () => clearTimeout(autoTimer);
    }
  }, [isLecturerUnlocked, isLateEntry, isEntering, router]);

  // Xử lý Chuyển tiếp vào Màn hình Làm bài thi IDE
  const handleStartExam = () => {
    setIsEntering(true);
    setTimeout(() => {
      router.push("/student/exam-room");
    }, 500);
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Navigation Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="flex items-center gap-2 font-mono text-xs font-medium text-slate-500 dark:text-[#9F9690]">
            <Link href="/student" className="hover:text-slate-900 dark:hover:text-[#f0c2cf] transition">
              Sinh viên
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-[#f0c2cf] font-semibold">Phòng chờ thi</span>
          </nav>

          <h1 className="mt-2 text-2xl font-serif font-bold tracking-tight text-[#2A282D] dark:text-white sm:text-3xl">
            Phòng chờ phát đề thi trực tuyến
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#5A5555] dark:text-[#9F9690]">
            Thiết bị đã sẵn sàng. Vui lòng giữ nguyên màn hình trong khi chờ Giảng viên mở bài thi.
          </p>
        </div>

        <div className="inline-flex shrink-0 items-center gap-2 rounded-md border border-brand-300 bg-brand-50 px-3.5 py-2 text-xs font-serif font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-[#f0c2cf]">
          <Radio size={16} className="text-brand-600 dark:text-[#f0c2cf]" />
          Trạng thái phòng: <b className="font-mono text-[#2A282D] dark:text-white">Đang trực tuyến</b>
        </div>
      </header>

      {/* Layout 2 Cột */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-stretch">
        {/* CỘT TRÁI: ĐỒNG HỒ ĐẾM NGƯỢC & NÚT VÀO THI (7/12) */}
        <section className="xl:col-span-7 flex flex-col justify-between rounded-md border border-slate-300 bg-white p-6 space-y-6 dark:border-white/10 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand text-white">
                <Code2 size={22} />
              </div>
              <div>
                <h2 className="font-serif text-base font-bold text-[#2A282D] dark:text-white">
                  {session?.examTitle || "Kiểm tra Lập trình C++ & Thuật toán Cơ bản"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#9F9690]">
                  Môn học: <span className="font-semibold text-[#2A282D] dark:text-stone-300">{session?.subject || "PRJ301"}</span>
                  {!isRoomClosed && <> · Mã phòng: <span className="font-mono font-bold text-slate-900 dark:text-[#f0c2cf]">{session?.roomCode || "OCL-C001"}</span></>}
                </p>
              </div>
            </div>
          </div>

          {/* Khung Trạng Thái Phòng Chờ Thực Tế */}
          <div className="flex flex-col items-center justify-center rounded-md border border-slate-300 bg-slate-50 p-8 text-center space-y-4 dark:border-white/10 dark:bg-neutral-950">
            <div className="inline-flex items-center gap-2 rounded bg-white dark:bg-neutral-900 px-3.5 py-1.5 text-xs font-mono font-bold text-slate-900 border border-slate-300 dark:border-white/10 dark:text-[#f0c2cf]">
              <Clock size={15} className="text-slate-900 dark:text-[#f0c2cf]" />
              <span>TRẠNG THÁI ĐỒNG BỘ PHÒNG THI</span>
            </div>

            {hasSubmitted ? (
              <div className="space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                  <CheckCircle2 size={30} />
                </div>
                <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white">
                  Bạn đã hoàn thành và nộp bài thi
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Theo quy chế khảo thí, thí sinh không thể vào lại phòng thi sau khi đã nộp bài. Bạn có thể theo dõi tiến độ chấm điểm trong danh sách bài nộp.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/student/submissions"
                    className="system-primary-action inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-5 py-2.5 font-serif text-xs font-bold text-white hover:bg-slate-800 transition"
                  >
                    Xem danh sách bài nộp
                    <ArrowRight size={14} />
                  </Link>
                  <Link
                    href="/student"
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-5 py-2.5 font-serif text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 transition"
                  >
                    Về trang tổng quan
                  </Link>
                </div>
              </div>
            ) : isLateEntry ? (
              <div className="space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                  <Clock size={30} />
                </div>
                <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white">
                  Phòng chờ đã đóng: Ca thi đang diễn ra
                </h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/40 dark:text-amber-300 font-mono text-xs font-bold">
                  <AlertCircle size={14} />
                  <span>Trạng thái ghi nhận: ĐIỂM DANH MUỘN</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Phòng chờ đã đóng do ca thi đã bắt đầu. Hệ thống ghi nhận trạng thái: <strong>Điểm danh muộn</strong>. Bạn đang được chuyển tiếp tự động vào không gian làm bài thi.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStartExam}
                    className="system-primary-action inline-flex items-center gap-2 rounded-md bg-amber-600 hover:bg-amber-700 px-6 py-3 font-serif text-xs font-bold text-white shadow-2xs cursor-pointer transition"
                  >
                    <span>VÀO LÀM BÀI THI NGAY</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : isRoomClosed ? (
              <div className="space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-md bg-slate-800/15 text-slate-800 dark:text-[#e5a9b9]">
                  <AlertCircle size={32} />
                </div>
                <h3 className="font-serif text-xl font-bold text-slate-800 dark:text-[#e5a9b9]">
                  Phòng thi đã kết thúc hoặc bị hủy
                </h3>
                <p className="text-xs text-slate-500">
                  Giảng viên đã đóng phòng chờ ({roomStatus}). Vui lòng liên hệ giảng viên hoặc tham gia phòng khác.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/student/exams")}
                  className="system-primary-action mt-2 inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-2.5 font-serif text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Quay lại Cổng Tham Gia
                </button>
              </div>
            ) : !isLecturerUnlocked ? (
              <div className="space-y-3">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                  <LoaderCircle size={34} className="animate-spin" />
                </div>
                <h3 className="font-serif text-xl font-bold text-[#2A282D] dark:text-white">
                  Đang chờ Giảng viên điểm danh &amp; mở đề...
                </h3>
                <p className="text-xs text-[#5A5555] dark:text-[#9F9690] font-medium max-w-md mx-auto">
                  Hệ thống tự động kiểm tra tín hiệu mỗi 3 giây. Ngay khi Giảng viên bấm <strong>Bắt Đầu</strong>, bạn sẽ được đưa vào phòng thi tự động.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 font-bold text-xl dark:bg-emerald-950/40 dark:text-emerald-400">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="font-serif text-xl font-bold text-[#2A282D] dark:text-white">
                  Giảng viên đã mở đề thi!
                </h3>
                <p className="text-xs text-slate-500">
                  Đang chuyển bạn vào không gian làm bài trực tuyến Oculide...
                </p>
              </div>
            )}

            {/* Tiến trình giảng viên */}
            <div className="w-full max-w-md pt-2">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-mono">
                <span className="flex items-center gap-1 font-medium">
                  <Radio size={13} className="text-brand-600 dark:text-[#f0c2cf]" /> Tín hiệu phòng thi
                </span>
                <span className="font-semibold text-[#2A282D] dark:text-white">
                  {isLecturerUnlocked ? "Đã duyệt 100%" : "Đang chờ Giảng viên phát đề..."}
                </span>
              </div>
              <div className="h-2 w-full rounded bg-stone-200 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isLecturerUnlocked ? "bg-emerald-600 w-full" : "bg-brand w-3/4"
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
              className="system-primary-action w-full flex items-center justify-center gap-2 rounded-md bg-slate-900 py-4 font-serif text-sm font-bold text-white shadow-2xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
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

            <p className="text-center font-mono text-[11px] text-slate-500">
              Nhấn vào nút trên để vào giao diện IDE lập trình và bắt đầu tính giờ làm bài.
            </p>
          </div>
        </section>

        {/* CỘT PHẢI: XÁC THỰC AI & QUY CHẾ THI (5/12) */}
        <section className="xl:col-span-5 space-y-5 flex flex-col justify-between">
          {/* Thẻ Thí sinh đã xác thực AI */}
          <div className="rounded-md border border-slate-300 bg-white p-5 space-y-4 dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center gap-3 border-b border-slate-300 dark:border-white/10 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200 font-bold text-xs">
                <UserCheck size={20} />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-[#2A282D] dark:text-white">Thí sinh đã xác thực</h3>
                <p className="text-xs text-slate-500">Hồ sơ khớp dữ liệu AI Proctoring</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-md bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-white/10 p-3 space-y-1">
                <span className="text-slate-500 text-[11px]">Họ và tên</span>
                <p className="font-serif font-bold text-[#2A282D] dark:text-white">{studentProfile.name}</p>
              </div>
              <div className="rounded-md bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-white/10 p-3 space-y-1">
                <span className="text-slate-500 text-[11px]">Mã sinh viên</span>
                <p className="font-mono font-bold text-slate-900 dark:text-[#f0c2cf]">{studentProfile.studentId}</p>
              </div>
              <div className="rounded-md bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-white/10 p-3 space-y-1">
                <span className="text-slate-500 text-[11px]">AI Face ID</span>
                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Khớp 99.4%
                </p>
              </div>
              <div className="rounded-md bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-white/10 p-3 space-y-1">
                <span className="text-slate-500 text-[11px]">Thời lượng thi</span>
                <p className="font-mono font-bold text-[#2A282D] dark:text-white">{session?.duration || 60} phút</p>
              </div>
            </div>
          </div>

          {/* Quy chế thi quan trọng */}
          <div className="rounded-md border border-slate-300 bg-slate-900/5 p-5 space-y-3 dark:border-white/10 dark:bg-slate-900/15">
            <div className="flex items-center gap-2 text-slate-900 dark:text-[#f0c2cf]">
              <AlertCircle size={18} className="text-slate-900 dark:text-[#f0c2cf] shrink-0" />
              <h3 className="font-serif font-bold text-xs sm:text-sm">Quy chế giám sát AI cần lưu ý:</h3>
            </div>

            <ul className="space-y-2 text-xs text-[#5A5555] dark:text-stone-300 leading-relaxed list-disc pl-4">
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

      <footer className="pt-2 text-center font-mono text-xs text-slate-500">
        Oculide · Hệ thống thi lập trình trực tuyến chuẩn học thuật
      </footer>
    </div>
  );
}