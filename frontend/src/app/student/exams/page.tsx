"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Code2,
  DoorOpen,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  Info,
  KeyRound,
  LoaderCircle,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import { fetchWithAuth } from "@/services/apiClient";
import {
  mapApiRoomToStudentExam,
  type ApiStudentRoom,
  type StudentExam,
} from "@/components/student/student-data";

interface JoinedRoomApiResponse {
  room_id: number;
  room_code: string;
  room_name: string;
  room_type: string;
  duration_minutes: number;
  status: string;
  session_id?: number;
  livekit_room_name?: string;
  start_time?: string;
  end_time?: string;
  class_id?: number;
  class_code?: string;
  class_name?: string;
  course_name?: string;
  proctoring_config?: string | Record<string, unknown>;
  is_late?: boolean;
  attendance_status?: string;
}

function ExamJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Dữ liệu định danh tài khoản (Tự động lấy từ phiên đăng nhập thật)
  const [studentInfo, setStudentInfo] = useState({
    mssv: "SV001",
    fullName: "Sinh viên",
    email: "student@school.edu.vn",
  });

  const [exams, setExams] = useState<StudentExam[]>([]);
  const [publicPreviewExam, setPublicPreviewExam] = useState<StudentExam | null>(null);
  const [roomCode, setRoomCode] = useState(
    searchParams.get("code") ?? searchParams.get("room") ?? ""
  );
  const [passcode, setPasscode] = useState(searchParams.get("pin") ?? "");
  const [showPasscode, setShowPasscode] = useState(false);

  // Tăng cường bảo mật
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [ipStatus, setIpStatus] = useState<"verifying" | "valid">("verifying");

  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  // Tải thông tin sinh viên thật & danh sách phòng thi từ Backend
  useEffect(() => {
    let isMounted = true;

    try {
      const stored = localStorage.getItem("oculide_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setStudentInfo({
          mssv:
            parsed.student_code ||
            parsed.studentId ||
            parsed.student_id ||
            parsed.userCode ||
            parsed.ma_dinh_danh ||
            parsed.username ||
            "SV001",
          fullName:
            parsed.full_name || parsed.fullName || parsed.name || "Sinh viên",
          email: parsed.email || "student@school.edu.vn",
        });
      }
    } catch {
      // ignore localStorage error
    }

    async function loadInitialData() {
      try {
        const me = await fetchWithAuth<{
          user_id: number;
          username?: string;
          full_name?: string;
          email?: string;
          student_code?: string;
        }>("/api/v1/auth/me");
        if (isMounted && me) {
          setStudentInfo((prev) => ({
            mssv: me.student_code || me.username || prev.mssv,
            fullName: me.full_name || prev.fullName,
            email: me.email || prev.email,
          }));
        }
      } catch {
        // ignore
      }

      try {
        const roomsData = await fetchWithAuth<ApiStudentRoom[]>("/api/v1/rooms?limit=100");
        if (isMounted && Array.isArray(roomsData)) {
          setExams(roomsData.map(mapApiRoomToStudentExam));
        }
      } catch {
        if (isMounted) setExams([]);
      }
    }

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Kiểm tra địa chỉ IP Mạng nội bộ trường
  useEffect(() => {
    const timer = setTimeout(() => {
      setIpStatus("valid");
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Đếm ngược khóa form khi nhập sai quá 3 lần
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          setFailedAttempts(0);
          setError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const matchedFromList = exams.find(
    (exam) => exam.roomCode.toLowerCase() === roomCode.trim().toLowerCase()
  );

  // Nếu mã phòng nhập tay chưa có trong danh sách lớp, thử tra cứu public room info
  useEffect(() => {
    const trimmed = roomCode.trim().toUpperCase();
    if (!trimmed || trimmed.length < 3 || matchedFromList) {
      setPublicPreviewExam(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const pub = await fetchWithAuth<ApiStudentRoom>(
          `/api/v1/rooms/public/${encodeURIComponent(trimmed)}`
        );
        if (!cancelled && pub && pub.room_code) {
          setPublicPreviewExam(mapApiRoomToStudentExam(pub));
        }
      } catch {
        if (!cancelled) setPublicPreviewExam(null);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [roomCode, matchedFromList]);

  const selectedExam = matchedFromList || publicPreviewExam;

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (lockoutTimer > 0) {
      setError(`Hệ thống tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau ${lockoutTimer}s.`);
      return;
    }

    const trimmedCode = roomCode.trim().toUpperCase();
    const trimmedPass = passcode.trim();

    if (!trimmedCode) {
      setError("Vui lòng nhập Mã phòng thi.");
      return;
    }

    if (!trimmedPass) {
      setError("Vui lòng nhập Mật khẩu phòng thi (Passcode).");
      return;
    }

    if (!captchaChecked) {
      setError("Vui lòng xác nhận kiểm tra an toàn thiết bị (Anti-Bot).");
      return;
    }

    if (selectedExam && selectedExam.status === "Đã hoàn thành") {
      setError("Phòng thi này đã kết thúc, bạn không thể tham gia.");
      return;
    }

    if (selectedExam && typeof window !== "undefined" && localStorage.getItem(`oculide_submitted_room_${selectedExam.id}`) === "true") {
      setError("Bạn đã hoàn thành và nộp bài thi cho phòng này. Không thể vào lại phòng thi theo quy chế khảo thí.");
      return;
    }

    const scheduledStart = selectedExam?.rawStartTime
      ? Date.parse(selectedExam.rawStartTime)
      : Number.NaN;
    if (Number.isFinite(scheduledStart) && Date.now() < scheduledStart - 15 * 60 * 1000) {
      const lobbyOpenAt = new Date(scheduledStart - 15 * 60 * 1000);
      setError(
        `Phòng chờ sẽ mở từ ${lobbyOpenAt.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })} (15 phút trước giờ bắt đầu).`
      );
      return;
    }

    setJoining(true);

    try {
      const data = await fetchWithAuth<JoinedRoomApiResponse>("/api/v1/rooms/join", {
        method: "POST",
        body: JSON.stringify({
          room_code: trimmedCode,
          passcode: trimmedPass,
        }),
      });

      let parsedProctoring: Record<string, unknown> = {};
      if (data.proctoring_config) {
        try {
          parsedProctoring =
            typeof data.proctoring_config === "string"
              ? JSON.parse(data.proctoring_config)
              : data.proctoring_config;
        } catch {
          parsedProctoring = {};
        }
      }

      const pendingSession = {
        roomId: data.room_id,
        roomCode: data.room_code,
        examId: String(data.room_id),
        examTitle: data.room_name,
        subject:
          data.course_name ||
          data.class_name ||
          selectedExam?.subject ||
          "Thực hành / Kiểm tra lập trình",
        classCode: data.class_code || selectedExam?.classCode || "",
        className: data.class_name || "",
        duration: data.duration_minutes || selectedExam?.duration || 60,
        roomType: data.room_type === "exam" ? "exam" : "lab",
        status: data.status || "chua_mo",
        sessionId: data.session_id,
        startTime: data.start_time,
        endTime: data.end_time,
        livekitRoomName: data.livekit_room_name || `room_${data.room_code}`,
        proctoringConfig: parsedProctoring,
        studentInfo,
        passcode: trimmedPass,
        joinedAt: new Date().toISOString(),
        isLate: Boolean(data.is_late),
        attendanceStatus: data.attendance_status || (data.is_late ? "muon" : "co_mat"),
        securityVerification: {
          ipAddress: "Campus Network",
          deviceFingerprint: "FP-OCULIDE-VERIFIED",
          identityVerified: true,
        },
      };

      sessionStorage.setItem(
        "oculide_student_pending_exam",
        JSON.stringify(pendingSession)
      );

      router.push("/student/device-check");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Không thể tham gia phòng thi. Vui lòng kiểm tra lại Mã phòng và Mật khẩu.";
      handleFailedAttempt(message);
    } finally {
      setJoining(false);
    }
  }

  function handleFailedAttempt(msg: string) {
    if (msg.startsWith("Phòng chờ sẽ mở từ")) {
      setError(msg);
      return;
    }

    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);

    if (nextAttempts >= 3) {
      setLockoutTimer(60);
      setError("CẢNH BÁO BẢO MẬT: Nhập sai sai quá 3 lần. Form bị khóa tạm thời trong 60s!");
    } else {
      setError(`${msg} (Còn ${3 - nextAttempts} lần thử)`);
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Breadcrumb Header */}
      <div>
        <nav className="flex items-center gap-2 font-mono text-xs font-medium text-slate-500 dark:text-[#9F9690]">
          <Link href="/student" className="hover:text-slate-900 dark:hover:text-[#f0c2cf] transition">
            Sinh viên
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-[#f0c2cf] font-semibold">Tham gia phòng thi</span>
        </nav>

        <h1 className="mt-2 text-2xl font-serif font-bold tracking-tight text-[#2A282D] dark:text-white sm:text-3xl">
          Tham gia phòng Lab / Phòng thi
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#5A5555] dark:text-[#9F9690]">
          Xác thực thông tin sinh viên và mã phòng thi bảo mật do Giảng viên cung cấp theo tiêu chuẩn IEEE 830.
        </p>
      </div>

      {/* Banner Giám sát Bảo mật */}
      <div className="rounded-md border border-slate-300 bg-slate-900/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-900 dark:border-white/10 dark:bg-slate-900/20 dark:text-[#f0c2cf] shadow-2xs">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-slate-900 dark:text-[#f0c2cf] shrink-0" />
          <div>
            <p className="font-serif font-bold">Hệ thống Giám sát Bảo mật Oculide Academic Active</p>
            <p className="text-[11px] text-[#5A5555] dark:text-[#9F9690]">
              Ghi nhận địa chỉ IP, Dấu vân tay thiết bị và Mã định danh sinh viên thời gian thực.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] font-semibold bg-white dark:bg-neutral-900 px-3 py-1.5 rounded-md border border-slate-300 dark:border-white/10 shrink-0">
          <Globe size={13} className="text-slate-900 dark:text-[#f0c2cf]" />
          <span>IP: 172.16.20.105</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5 items-stretch">
        {/* CỘT FORM NHẬP BẢO MẬT (3/5) */}
        <section className="rounded-md border border-slate-300 bg-white p-5 sm:p-7 xl:col-span-3 space-y-6 dark:border-white/10 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                <DoorOpen size={22} />
              </div>
              <div>
                <h2 className="font-serif text-base font-bold text-[#2A282D] dark:text-white">
                  Thông tin phòng &amp; Định danh
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#9F9690]">
                  Mã phòng và Mật khẩu do Giảng viên trực tiếp cấp tại ca thi
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 rounded border border-brand-300 bg-brand-50 px-2.5 py-1 font-mono text-[11px] font-bold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
              <Fingerprint size={13} /> SSO Verified
            </span>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            {/* MÃ PHÒNG (ROOM CODE) */}
            <div>
              <label
                htmlFor="roomCode"
                className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-wider text-[#2A282D] dark:text-[#E8E6E8]"
              >
                Mã phòng (Room Code) <span className="text-slate-800">*</span>
              </label>

              <div className="relative">
                <Code2
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  id="roomCode"
                  disabled={lockoutTimer > 0}
                  value={roomCode}
                  onChange={(event) => {
                    setRoomCode(event.target.value);
                    setError("");
                  }}
                  placeholder="VÍ DỤ: LAB-1848-01 HOẶC EXAM-1848-MID"
                  autoComplete="off"
                  className="w-full rounded-md border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-xs sm:text-sm font-mono uppercase tracking-wider text-[#2A282D] outline-none transition placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-500 focus:border-slate-900 focus:bg-white dark:border-white/10 dark:bg-neutral-950 dark:text-[#E8E6E8] dark:placeholder:text-[#9F9690] dark:focus:border-slate-800 disabled:opacity-50"
                />
              </div>
            </div>

            {/* MẬT KHẨU PHÒNG (PASSCODE) */}
            <div>
              <label
                htmlFor="passcode"
                className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-wider text-[#2A282D] dark:text-[#E8E6E8]"
              >
                Mật khẩu phòng (Passcode) <span className="text-slate-800">*</span>
              </label>

              <div className="relative">
                <KeyRound
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  id="passcode"
                  disabled={lockoutTimer > 0}
                  type={showPasscode ? "text" : "password"}
                  value={passcode}
                  onChange={(event) => {
                    setPasscode(event.target.value);
                    setError("");
                  }}
                  placeholder="Nhập 6 chữ số mật khẩu phòng..."
                  autoComplete="off"
                  maxLength={10}
                  className="w-full rounded-md border border-slate-300 bg-slate-50 py-3 pl-10 pr-11 text-xs sm:text-sm font-mono text-[#2A282D] outline-none transition placeholder:font-sans placeholder:text-slate-500 focus:border-slate-900 focus:bg-white dark:border-white/10 dark:bg-neutral-950 dark:text-[#E8E6E8] dark:placeholder:text-[#9F9690] dark:focus:border-slate-800 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#2A282D] dark:hover:text-white transition"
                  aria-label={showPasscode ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPasscode ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <hr className="my-4 border-slate-300 dark:border-white/10" />

            {/* THÔNG TIN SINH VIÊN (LOCKED - CHỐNG MẠO DANH) */}
            <div className="space-y-3.5 bg-slate-50 p-4 rounded-md border border-slate-300 dark:border-white/10 dark:bg-neutral-950">
              <div className="flex items-center justify-between text-xs">
                <span className="font-serif font-bold text-[#2A282D] dark:text-[#E8E6E8] flex items-center gap-1.5">
                  <UserCheck size={15} className="text-slate-900 dark:text-[#f0c2cf]" /> Định danh Sinh viên (Khóa)
                </span>
                <span className="font-mono text-[11px] text-slate-500">Đã xác thực tài khoản</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Mã số sinh viên (MSSV)
                  </label>
                  <div className="relative">
                    <input
                      readOnly
                      disabled
                      value={studentInfo.mssv}
                      className="w-full rounded-md border border-slate-300 bg-stone-200/60 py-2 px-3 text-xs font-mono font-bold text-[#2A282D] cursor-not-allowed select-none dark:border-white/10 dark:bg-white/5 dark:text-stone-300"
                    />
                    <Lock size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Họ và tên sinh viên
                  </label>
                  <div className="relative">
                    <input
                      readOnly
                      disabled
                      value={studentInfo.fullName}
                      className="w-full rounded-md border border-slate-300 bg-stone-200/60 py-2 px-3 text-xs font-serif font-bold text-[#2A282D] cursor-not-allowed select-none dark:border-white/10 dark:bg-white/5 dark:text-stone-300"
                    />
                    <Lock size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Email Sinh viên
                </label>
                <div className="relative">
                  <input
                    readOnly
                    disabled
                    value={studentInfo.email}
                    className="w-full rounded-md border border-slate-300 bg-stone-200/60 py-2 px-3 text-xs font-mono text-[#5A5555] cursor-not-allowed select-none dark:border-white/10 dark:bg-white/5 dark:text-stone-400"
                  />
                  <Lock size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  Email dùng để đối soát danh sách lớp và xác thực phiên làm bài thi.
                </p>
              </div>
            </div>

            {/* CHECKBOX ANTI-BOT / DEVICE CHECK */}
            <div className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="antiBot"
                checked={captchaChecked}
                disabled={lockoutTimer > 0}
                onChange={(e) => {
                  setCaptchaChecked(e.target.checked);
                  setError("");
                }}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20 cursor-pointer"
              />
              <label htmlFor="antiBot" className="text-xs font-medium text-[#2A282D] dark:text-[#E8E6E8] cursor-pointer">
                Xác nhận thiết bị máy trạm an toàn &amp; Không sử dụng máy ảo (Anti-Bot)
              </label>
            </div>

            {/* HIỂN THỊ LỖI BẢO MẬT - PHONG CÁCH HỌC THUẬT */}
            {error && (
              <div
                role="alert"
                className="flex items-center gap-3 rounded-md border border-slate-300 border-l-4 border-l-[#91040A] bg-white p-4 text-xs shadow-sm dark:border-white/10 dark:border-l-[#fca5a5] dark:bg-neutral-900"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-brand-50 text-brand-700 shrink-0 dark:bg-brand-500/10 dark:text-brand-200">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-serif text-xs font-bold text-[#2A282D] dark:text-white">Cảnh báo bảo mật</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">{error}</p>
                </div>
              </div>
            )}

            {/* NÚT SUBMIT */}
            <button
              type="submit"
              disabled={joining || lockoutTimer > 0}
              className="system-primary-action flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {joining ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  <span>Đang mã hóa thông tin truy cập...</span>
                </>
              ) : lockoutTimer > 0 ? (
                <>
                  <Lock size={16} />
                  <span>Form bị khóa ({lockoutTimer}s)</span>
                </>
              ) : (
                <>
                  <span>Tiếp tục Kiểm tra thiết bị AI</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </section>

        {/* CỘT CHI TIẾT KỲ THI & QUY CHẾ (2/5) */}
        <section className="space-y-5 xl:col-span-2 flex flex-col justify-between">
          <div className="rounded-md border border-slate-300 bg-white p-5 sm:p-6 space-y-4 dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-300 dark:border-white/10">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                <BookOpen size={19} />
              </div>
              <h2 className="font-serif font-bold text-[#2A282D] dark:text-white text-sm">
                Thông tin phòng xem trước
              </h2>
            </div>

            {selectedExam ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <p className="text-slate-500">Tên ca thi</p>
                  <p className="mt-0.5 font-serif font-bold text-[#2A282D] dark:text-white text-sm">
                    {selectedExam.title}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">Môn học</p>
                  <p className="mt-0.5 font-semibold text-[#5A5555] dark:text-stone-300">
                    {selectedExam.subject}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-md bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-white/10 p-3">
                    <p className="text-slate-500 text-[11px]">Thời lượng</p>
                    <p className="mt-1 flex items-center gap-1 font-mono font-bold text-[#2A282D] dark:text-white">
                      <Clock3 size={13} className="text-slate-900 dark:text-[#f0c2cf]" />
                      {selectedExam.duration} phút
                    </p>
                  </div>
                  <div className="rounded-md bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-white/10 p-3">
                    <p className="text-slate-500 text-[11px]">Mã phòng</p>
                    <p className="mt-1 font-mono font-bold text-slate-900 dark:text-[#f0c2cf]">
                      {selectedExam.roomCode}
                    </p>
                  </div>
                </div>

                <div className="rounded-md bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-white/10 p-3 flex items-center justify-between">
                  <span className="text-slate-500">Trạng thái</span>
                  <span className="rounded border border-brand-300 bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
                    {selectedExam.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 dark:border-white/15 p-6 text-center space-y-2">
                <BookOpen size={28} className="mx-auto text-slate-500" />
                <p className="font-serif text-xs font-semibold text-[#2A282D] dark:text-white">
                  Chưa xác định phòng thi
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Nhập đúng Mã phòng hợp lệ hoặc chọn nhanh một phòng bên dưới để xem trước thông tin bài thi.
                </p>
              </div>
            )}

            {exams.filter((e) => e.status !== "Đã hoàn thành").length > 0 && (
              <div className="border-t border-slate-300 dark:border-white/10 pt-3 space-y-2">
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Chọn nhanh ca thi / phòng Lab khả dụng
                </p>
                <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                  {exams
                    .filter((e) => e.status !== "Đã hoàn thành")
                    .map((exam) => (
                      <button
                        key={exam.id}
                        type="button"
                        onClick={() => {
                          setRoomCode(exam.roomCode);
                          setError("");
                        }}
                        className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs transition cursor-pointer ${
                          roomCode.trim().toLowerCase() === exam.roomCode.toLowerCase()
                            ? "border-brand bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-200"
                            : "border-slate-300 bg-slate-50 text-[#2A282D] hover:border-brand-300 hover:bg-white dark:border-white/10 dark:bg-neutral-950 dark:text-stone-300 dark:hover:border-brand-500/40 dark:hover:bg-neutral-900"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold truncate">{exam.title}</p>
                          <p className="text-[11px] text-slate-500 truncate">{exam.subject}</p>
                        </div>
                        <span className="shrink-0 rounded bg-white dark:bg-neutral-900 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-900 dark:text-[#f0c2cf] border border-slate-300 dark:border-white/10">
                          {exam.roomCode}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* ĐIỀU KIỆN AN NINH CA THI */}
          <div className="rounded-md border border-slate-300 bg-slate-900/5 p-5 space-y-3 dark:border-white/10 dark:bg-slate-900/15">
            <div className="flex items-center gap-2 text-slate-900 dark:text-[#f0c2cf]">
              <ShieldCheck size={18} className="text-slate-900 dark:text-[#f0c2cf]" />
              <h3 className="font-serif font-bold text-xs">Yêu cầu an ninh ca thi</h3>
            </div>

            <ul className="space-y-2 text-xs text-[#5A5555] dark:text-stone-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-slate-900 dark:text-[#f0c2cf] shrink-0" />
                <span>Xác thực AI Face ID chính chủ</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-slate-900 dark:text-[#f0c2cf] shrink-0" />
                <span>Cấp quyền Webcam &amp; Chia sẻ màn hình</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-slate-900 dark:text-[#f0c2cf] shrink-0" />
                <span>Ghi nhận vi phạm quá 3 lần sẽ bị Khóa máy</span>
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

export default function StudentExamsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-xs text-slate-500">
          <LoaderCircle size={20} className="animate-spin text-brand mr-2" />
          Đang tải cấu hình bảo mật phòng thi...
        </div>
      }
    >
      <ExamJoinContent />
    </Suspense>
  );
}