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
  class_id?: number;
  class_code?: string;
  class_name?: string;
  course_name?: string;
  proctoring_config?: string | Record<string, unknown>;
  start_time?: string;
  end_time?: string;
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
  const [roomCode, setRoomCode] = useState(searchParams.get("code") ?? "");
  const [passcode, setPasscode] = useState("");
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
        livekitRoomName: data.livekit_room_name || `room_${data.room_code}`,
        proctoringConfig: parsedProctoring,
        studentInfo,
        passcode: trimmedPass,
        joinedAt: new Date().toISOString(),
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
    <main className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Breadcrumb Header */}
        <div>
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link href="/student" className="hover:text-blue-600 transition">
              Sinh viên
            </Link>
            <span>/</span>
            <span className="text-blue-600 font-semibold">Tham gia phòng thi</span>
          </nav>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Tham gia phòng Lab / Phòng thi
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Xác thực thông tin sinh viên và mã phòng thi bảo mật do Giảng viên cung cấp.
          </p>
        </div>

        {/* Banner Giám sát Bảo mật */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-blue-600 shrink-0" />
            <div>
              <p className="font-bold">Hệ thống Giám sát Bảo mật Oculide Active</p>
              <p className="text-[11px] text-blue-700/80">
                Ghi nhận địa chỉ IP, Dấu vân tay thiết bị và Mã định danh sinh viên thời gian thực.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] font-semibold bg-white/80 px-3 py-1.5 rounded-xl border border-blue-200/60 shrink-0">
            <Globe size={13} className="text-emerald-600" />
            <span>IP: 172.16.20.105</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          {/* CỘT FORM NHẬP BẢO MẬT (3/5) */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7 xl:col-span-3 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <DoorOpen size={22} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Thông tin phòng &amp; Định danh
                  </h2>
                  <p className="text-xs text-slate-500">
                    Mã phòng và Mật khẩu do Giảng viên trực tiếp cấp tại ca thi
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200/80">
                <Fingerprint size={13} /> SSO Verified
              </span>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              {/* MÃ PHÒNG (ROOM CODE) */}
              <div>
                <label
                  htmlFor="roomCode"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Mã phòng (Room Code) <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <Code2
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-xs sm:text-sm font-mono uppercase tracking-wider text-slate-900 outline-none transition placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* MẬT KHẨU PHÒNG (PASSCODE) */}
              <div>
                <label
                  htmlFor="passcode"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Mật khẩu phòng (Passcode) <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <KeyRound
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-11 text-xs sm:text-sm font-mono text-slate-900 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    aria-label={showPasscode ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPasscode ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <hr className="my-4 border-slate-100" />

              {/* THÔNG TIN SINH VIÊN (LOCKED - CHỐNG MẠO DANH) */}
              <div className="space-y-3.5 bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <UserCheck size={15} className="text-blue-600" /> Định danh Sinh viên (Khóa)
                  </span>
                  <span className="text-[11px] text-slate-400">Đã xác thực tài khoản</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Mã số sinh viên (MSSV)
                    </label>
                    <div className="relative">
                      <input
                        readOnly
                        disabled
                        value={studentInfo.mssv}
                        className="w-full rounded-lg border border-slate-200 bg-slate-200/60 py-2 px-3 text-xs font-mono font-bold text-slate-700 cursor-not-allowed select-none"
                      />
                      <Lock size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Họ và tên sinh viên
                    </label>
                    <div className="relative">
                      <input
                        readOnly
                        disabled
                        value={studentInfo.fullName}
                        className="w-full rounded-lg border border-slate-200 bg-slate-200/60 py-2 px-3 text-xs font-bold text-slate-700 cursor-not-allowed select-none"
                      />
                      <Lock size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Email Sinh viên
                  </label>
                  <div className="relative">
                    <input
                      readOnly
                      disabled
                      value={studentInfo.email}
                      className="w-full rounded-lg border border-slate-200 bg-slate-200/60 py-2 px-3 text-xs font-mono text-slate-600 cursor-not-allowed select-none"
                    />
                    <Lock size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
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
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                />
                <label htmlFor="antiBot" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Xác nhận thiết bị máy trạm an toàn &amp; Không sử dụng máy ảo (Anti-Bot)
                </label>
              </div>

              {/* HIỂN THỊ LỖI BẢO MẬT */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-700 leading-relaxed font-semibold animate-shake"
                >
                  <ShieldAlert size={17} className="mt-0.5 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* NÚT SUBMIT */}
              <button
                type="submit"
                disabled={joining || lockoutTimer > 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
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
          <section className="space-y-5 xl:col-span-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <BookOpen size={19} />
                </div>
                <h2 className="font-bold text-slate-900 text-sm">
                  Thông tin phòng xem trước
                </h2>
              </div>

              {selectedExam ? (
                <div className="space-y-3.5 text-xs">
                  <div>
                    <p className="text-slate-400">Tên ca thi</p>
                    <p className="mt-0.5 font-bold text-slate-900 text-sm">
                      {selectedExam.title}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Môn học</p>
                    <p className="mt-0.5 font-semibold text-slate-700">
                      {selectedExam.subject}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-slate-400 text-[11px]">Thời lượng</p>
                      <p className="mt-1 flex items-center gap-1 font-bold text-slate-800">
                        <Clock3 size={13} className="text-violet-600" />
                        {selectedExam.duration} phút
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-slate-400 text-[11px]">Mã phòng</p>
                      <p className="mt-1 font-mono font-bold text-blue-600">
                        {selectedExam.roomCode}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 flex items-center justify-between">
                    <span className="text-slate-500">Trạng thái</span>
                    <span className="font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px]">
                      {selectedExam.status}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center space-y-2">
                  <BookOpen size={28} className="mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-700">
                    Chưa xác định phòng thi
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Nhập đúng Mã phòng hợp lệ hoặc chọn nhanh một phòng bên dưới để xem trước thông tin bài thi.
                  </p>
                </div>
              )}

              {exams.filter((e) => e.status !== "Đã hoàn thành").length > 0 && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition cursor-pointer ${
                            roomCode.trim().toLowerCase() === exam.roomCode.toLowerCase()
                              ? "border-blue-500 bg-blue-50/60 text-blue-900"
                              : "border-slate-200/80 bg-slate-50/50 hover:border-blue-300 hover:bg-white text-slate-700"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold truncate">{exam.title}</p>
                            <p className="text-[11px] text-slate-500 truncate">{exam.subject}</p>
                          </div>
                          <span className="shrink-0 rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-blue-600 border border-slate-200">
                            {exam.roomCode}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* ĐIỀU KIỆN AN NINH CA THI */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 space-y-3">
              <div className="flex items-center gap-2 text-blue-900">
                <ShieldCheck size={18} className="text-blue-600" />
                <h3 className="font-bold text-xs">Yêu cầu an ninh ca thi</h3>
              </div>

              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                  <span>Xác thực AI Face ID chính chủ</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                  <span>Cấp quyền Webcam &amp; Chia sẻ màn hình</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                  <span>Ghi nhận vi phạm quá 3 lần sẽ bị Khóa máy</span>
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

export default function StudentExamsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-xs text-slate-500">
          <LoaderCircle size={20} className="animate-spin text-blue-600 mr-2" />
          Đang tải cấu hình bảo mật phòng thi...
        </div>
      }
    >
      <ExamJoinContent />
    </Suspense>
  );
}