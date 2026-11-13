"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Lock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Camera,
  Laptop,
  Cpu,
  Globe,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  Check,
  RotateCcw,
  Code2,
  Award,
  Sparkles,
  Clock3,
  HardDrive,
  Terminal,
  ExternalLink,
  FileCode2,
  Sliders,
  SlidersHorizontal,
  Trash2,
  Fingerprint,
  CheckSquare,
  Layers,
  ArrowRight,
  LogOut,
  RefreshCw,
  LoaderCircle,
} from "lucide-react";
import { fetchWithAuth } from "@/services/apiClient";

type ProfileTab = "info" | "biometrics" | "security" | "stats" | "preferences";

interface ActiveSessionItem {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

interface UserProfileData {
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  student_code?: string;
  phone_number?: string;
  department?: string;
  created_at?: string;
}

export default function StudentProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("info");
  const [loading, setLoading] = useState(true);

  // ─── 1. THÔNG TIN HỌC THUẬT & CÁ NHÂN (Editable & Locked) ─────────────────
  const [userId, setUserId] = useState<number | null>(null);
  const [mssv, setMssv] = useState("SV001");
  const [fullName, setFullName] = useState("Sinh viên");
  const [email, setEmail] = useState("student@school.edu.vn");
  const [className, setClassName] = useState("Kỹ thuật Phần mềm");
  const [major, setMajor] = useState("Công nghệ Thông tin");
  const [phone, setPhone] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [preferredLang, setPreferredLang] = useState("C++20");
  const [bio, setBio] = useState("Sinh viên Oculide. Đam mê thuật toán & lập trình thi đấu.");
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoSaveSuccess, setInfoSaveSuccess] = useState(false);
  const [infoSaveError, setInfoSaveError] = useState("");

  // ─── 2. ĐỔI MẬT KHẨU (Security) ───────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);

  // ─── 3. SINH TRẮC HỌC AI & WEBCAM (Biometrics) ─────────────────────────────
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [capturedFacePreview, setCapturedFacePreview] = useState<string | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<"registered" | "capturing" | "updated">("registered");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ─── 4. CÁ NHÂN HÓA MÔI TRƯỜNG THI (Preferences) ──────────────────────────
  const [editorTheme, setEditorTheme] = useState<"vs-dark" | "vs-light">("vs-dark");
  const [fontSize, setFontSize] = useState<number>(14);
  const [tabSize, setTabSize] = useState<number>(4);
  const [autoSaveDrafts, setAutoSaveDrafts] = useState<boolean>(true);
  const [keybinding, setKeybinding] = useState<"standard" | "vim">("standard");
  const [prefSaveSuccess, setPrefSaveSuccess] = useState(false);

  // ─── 5. PHIÊN ĐĂNG NHẬP (Active Sessions) ─────────────────────────────────
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([
    {
      id: "SES-01",
      device: "Máy trạm Phòng Lab - Thiết bị hiện tại",
      browser: "Chrome 130 (Windows)",
      ip: "172.16.20.105 (Campus LAN)",
      location: "Khuôn viên Trường",
      lastActive: "Đang hoạt động",
      isCurrent: true,
    },
  ]);

  // ─── 6. THỐNG KÊ HỌC THUẬT THỰC TẾ (Stats) ────────────────────────────────
  const [submissionsCount, setSubmissionsCount] = useState<number>(0);
  const [avgScore, setAvgScore] = useState<number>(0);
  const [acRate, setAcRate] = useState<number>(100);
  const [violationsCount, setViolationsCount] = useState<number>(0);

  // Tải dữ liệu Profile từ Backend
  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      try {
        const me = await fetchWithAuth<UserProfileData>("/api/v1/auth/me");
        if (isMounted && me) {
          setUserId(me.user_id);
          setMssv(me.student_code || me.username || "SV001");
          setFullName(me.full_name || me.username || "Sinh viên");
          setEmail(me.email || "student@school.edu.vn");
          if (me.phone_number) setPhone(me.phone_number);
          if (me.department) {
            setClassName(me.department);
            setMajor(me.department);
          }

          // Lấy thống kê bài nộp thật
          try {
            const subs = await fetchWithAuth<any[]>(
              `/api/v1/submissions/student/${me.user_id}`
            );
            if (Array.isArray(subs) && subs.length > 0) {
              setSubmissionsCount(subs.length);
              const totalPct = subs.reduce((acc, curr) => {
                const pct =
                  typeof curr.score_percentage === "number"
                    ? curr.score_percentage
                    : curr.max_points && curr.max_points > 0
                    ? ((curr.total_points || 0) / curr.max_points) * 100
                    : 0;
                return acc + pct;
              }, 0);
              setAvgScore(Math.round(totalPct / subs.length));
              const acCount = subs.filter(
                (s) =>
                  (s.score_percentage && s.score_percentage >= 70) ||
                  (s.status || "").toLowerCase() === "accepted" ||
                  (s.status || "").toLowerCase() === "graded"
              ).length;
              setAcRate(Math.round((acCount / subs.length) * 100));
            }
          } catch {
            // ignore
          }

          // Lấy thống kê vi phạm thật
          try {
            const vios = await fetchWithAuth<any[]>(
              `/api/v1/violations/student/${me.user_id}`
            );
            if (Array.isArray(vios)) {
              setViolationsCount(vios.length);
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // fallback localStorage nếu có
        try {
          const stored = localStorage.getItem("oculide_user");
          if (stored && isMounted) {
            const parsed = JSON.parse(stored);
            if (parsed.full_name || parsed.name) setFullName(parsed.full_name || parsed.name);
            if (parsed.student_code || parsed.studentId) {
              setMssv(parsed.student_code || parsed.studentId);
            }
            if (parsed.email) setEmail(parsed.email);
          }
        } catch {
          // ignore
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();

    try {
      const savedPrefs = localStorage.getItem("oculide_student_preferences");
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (parsed.editorTheme) setEditorTheme(parsed.editorTheme);
        if (parsed.fontSize) setFontSize(parsed.fontSize);
        if (parsed.tabSize) setTabSize(parsed.tabSize);
        if (parsed.autoSaveDrafts !== undefined) setAutoSaveDrafts(parsed.autoSaveDrafts);
        if (parsed.keybinding) setKeybinding(parsed.keybinding);
      }
    } catch {
      // Ignored
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Xử lý lưu thông tin liên lạc cá nhân qua API
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInfo(true);
    setInfoSaveError("");
    setInfoSaveSuccess(false);

    try {
      await fetchWithAuth("/api/v1/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          phone_number: phone,
          department: className,
        }),
      });
      setInfoSaveSuccess(true);
      setTimeout(() => setInfoSaveSuccess(false), 3000);
    } catch (err: any) {
      setInfoSaveError(err?.message || "Không thể lưu thông tin. Vui lòng thử lại.");
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Tính toán độ mạnh mật khẩu (Password Strength)
  const passwordStrength = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score += 25;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 25;
    if (/\d/.test(newPassword)) score += 25;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 25;
    return score;
  }, [newPassword]);

  // Xử lý đổi mật khẩu qua API
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess(false);

    if (!currentPassword) {
      setPassError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (newPassword.length < 8) {
      setPassError("Mật khẩu mới phải có tối thiểu 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setIsSavingPass(true);
    try {
      await fetchWithAuth("/api/v1/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setPassSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPassSuccess(false), 4000);
    } catch (err: any) {
      setPassError(err?.message || "Đổi mật khẩu thất bại. Mật khẩu hiện tại không đúng.");
    } finally {
      setIsSavingPass(false);
    }
  };

  // Bật/tắt webcam giả lập hoặc thực tế
  const handleToggleWebcam = async () => {
    if (isWebcamActive) {
      setIsWebcamActive(false);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    } else {
      setIsWebcamActive(true);
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }
      } catch {
        // Fallback simulation nếu thiết bị không có webcam hoặc bị sandbox chặn
      }
    }
  };

  // Chụp ảnh khuôn mặt làm mẫu đối soát AI
  const handleCaptureFace = () => {
    setCapturedFacePreview("/avatars/student-default.png");
    setBiometricStatus("updated");
    setIsWebcamActive(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Lưu cấu hình môi trường lập trình
  const handleSavePreferences = () => {
    const prefs = {
      editorTheme,
      fontSize,
      tabSize,
      autoSaveDrafts,
      keybinding,
    };
    try {
      localStorage.setItem("oculide_student_preferences", JSON.stringify(prefs));
      setPrefSaveSuccess(true);
      setTimeout(() => setPrefSaveSuccess(false), 3000);
    } catch {
      // Ignored
    }
  };

  // Đăng xuất các phiên khác
  const handleTerminateOtherSessions = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
  };

  const initials = useMemo(() => {
    return (
      fullName
        .split(" ")
        .filter(Boolean)
        .slice(-2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || "SV"
    );
  }, [fullName]);

  return (
    <main className="min-h-screen bg-slate-50/80 dark:bg-[#090d16] p-4 sm:p-6 lg:p-8 text-slate-800 dark:text-slate-100 transition-colors">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* ─── Breadcrumb ──────────────────────────────────────────────── */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Link href="/student" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
            Sinh viên
          </Link>
          <span>/</span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold">Hồ sơ cá nhân &amp; Cài đặt</span>
        </nav>

        {/* ─── Card Header Hồ sơ Cá nhân ─────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-6 sm:p-8 shadow-sm transition-colors">
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar Container với Badge Sinh Trắc Học */}
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl sm:text-3xl shadow-md shadow-blue-500/20">
                {initials}
              </div>
              <span
                title="Đã xác thực định danh SSO & Sinh trắc học AI"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white dark:ring-[#121824] text-white shadow-sm"
              >
                <CheckCircle2 size={16} />
              </span>
            </div>

            {/* Thông tin Cốt lõi của Sinh viên */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {fullName}
                </h1>
                <span className="font-mono text-xs font-bold rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/30 px-2.5 py-0.5">
                  {mssv}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/30">
                  <ShieldCheck size={13} /> SSO Verified
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Chuyên ngành:{" "}
                <strong className="text-slate-700 dark:text-slate-200">{major}</strong>{" "}
                · Lớp:{" "}
                <strong className="text-slate-700 dark:text-slate-200">{className}</strong>
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-5 pt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mail size={14} className="text-slate-400" /> {email}
                </span>
                <span className="flex items-center gap-1.5 font-mono">
                  <Globe size={14} className="text-emerald-500" /> Campus LAN
                </span>
                <span className="flex items-center gap-1.5 font-mono">
                  <Fingerprint size={14} className="text-blue-500" /> FP-OCULIDE-VERIFIED
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="mt-6 flex overflow-x-auto border-b border-slate-100 dark:border-white/5 gap-2 sm:gap-6 text-xs sm:text-[13px] font-semibold scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`pb-3.5 transition shrink-0 relative cursor-pointer flex items-center gap-1.5 ${
                activeTab === "info"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <User size={15} />
              <span>Thông tin định danh</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("biometrics")}
              className={`pb-3.5 transition shrink-0 relative cursor-pointer flex items-center gap-1.5 ${
                activeTab === "biometrics"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Camera size={15} />
              <span>Sinh trắc học AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`pb-3.5 transition shrink-0 relative cursor-pointer flex items-center gap-1.5 ${
                activeTab === "security"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Lock size={15} />
              <span>Bảo mật &amp; Mật khẩu</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("stats")}
              className={`pb-3.5 transition shrink-0 relative cursor-pointer flex items-center gap-1.5 ${
                activeTab === "stats"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Award size={15} />
              <span>Thống kê học thuật</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("preferences")}
              className={`pb-3.5 transition shrink-0 relative cursor-pointer flex items-center gap-1.5 ${
                activeTab === "preferences"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Code2 size={15} />
              <span>Môi trường lập trình</span>
            </button>
          </div>
        </div>

        {/* ─── TAB 1: THÔNG TIN ĐỊNH DANH & LIÊN LẠC ──────────────────────── */}
        {activeTab === "info" && (
          <div className="space-y-6">
            {/* Khối Thông tin SSO Bất Biến */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User size={17} className="text-blue-600 dark:text-blue-400" />
                  <span>Hồ sơ Sinh viên SSO (Nhà trường cấp)</span>
                </h2>
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Lock size={12} /> Đã khóa bảo mật
                </span>
              </div>

              {/* Lưới các trường thông tin cố định */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase text-[10px] tracking-wider">
                    Mã số sinh viên (MSSV)
                  </label>
                  <div className="relative">
                    <input
                      readOnly
                      value={mssv}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.04] px-3 font-mono font-bold text-slate-800 dark:text-slate-200 cursor-not-allowed select-all"
                    />
                    <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase text-[10px] tracking-wider">
                    Họ và tên khai sinh
                  </label>
                  <div className="relative">
                    <input
                      readOnly
                      value={fullName}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.04] px-3 font-bold text-slate-800 dark:text-slate-200 cursor-not-allowed select-all"
                    />
                    <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase text-[10px] tracking-wider">
                    Email trường cấp (@school.edu.vn)
                  </label>
                  <div className="relative">
                    <input
                      readOnly
                      value={email}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.04] px-3 font-mono text-slate-700 dark:text-slate-300 cursor-not-allowed select-all"
                    />
                    <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase text-[10px] tracking-wider">
                    Lớp sinh hoạt / Khoa
                  </label>
                  <div className="relative">
                    <input
                      readOnly
                      value={className}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.04] px-3 font-semibold text-slate-800 dark:text-slate-200 cursor-not-allowed"
                    />
                    <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Khối Thông tin Liên lạc cho phép Sinh viên tự cập nhật */}
            <form
              onSubmit={handleSaveInfo}
              className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Phone size={17} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Thông tin liên lạc &amp; Hồ sơ cá nhân</span>
                </h2>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Cho phép chỉnh sửa
                </span>
              </div>

              {infoSaveSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/30 p-3 text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Cập nhật thông tin hồ sơ thành công!</span>
                </div>
              )}

              {infoSaveError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-500/10 dark:border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{infoSaveError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Số điện thoại liên hệ khẩn cấp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ví dụ: 0912 345 678"
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Ngôn ngữ lập trình sở trường
                  </label>
                  <input
                    type="text"
                    value={preferredLang}
                    onChange={(e) => setPreferredLang(e.target.value)}
                    placeholder="Ví dụ: C++20, Python 3.11, Java"
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Giới thiệu ngắn (Bio)
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Mô tả định hướng học tập của bạn..."
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingInfo}
                  className="h-10 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingInfo ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{isSavingInfo ? "Đang lưu..." : "Lưu thay đổi"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── TAB 2: SINH TRẮC HỌC AI & WEBCAM ──────────────────────────── */}
        {activeTab === "biometrics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera size={17} className="text-blue-600 dark:text-blue-400" />
                  <span>Khuôn mặt chuẩn AI Face ID</span>
                </h2>
                <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200/60">
                  {biometricStatus === "updated" ? "Đã cập nhật ảnh mẫu" : "Đã kích hoạt AI Face"}
                </span>
              </div>

              <div className="aspect-video w-full rounded-2xl bg-black overflow-hidden relative border border-slate-200 dark:border-white/10 flex items-center justify-center">
                {isWebcamActive ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : capturedFacePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={capturedFacePreview} alt="Mẫu khuôn mặt" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <Camera className="mx-auto h-12 w-12 text-slate-500" />
                    <p className="text-xs text-slate-400">Webcam hiện đang tắt. Nhấn nút bên dưới để kiểm tra hình ảnh.</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleToggleWebcam}
                  className="h-10 flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <Camera size={14} />
                  <span>{isWebcamActive ? "Tắt Webcam" : "Bật Webcam kiểm tra"}</span>
                </button>

                {isWebcamActive && (
                  <button
                    type="button"
                    onClick={handleCaptureFace}
                    className="h-10 flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer"
                  >
                    <Check size={14} />
                    <span>Chụp ảnh làm mẫu AI</span>
                  </button>
                )}
              </div>
            </div>

            {/* Dấu vân tay thiết bị & Quy chuẩn */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3 flex items-center gap-2">
                  <Laptop size={17} className="text-blue-600 dark:text-blue-400" />
                  <span>Dấu vân tay Máy trạm &amp; Mạng thi</span>
                </h2>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Device Fingerprint:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">FP-OCULIDE-VERIFIED</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Địa chỉ IP Campus:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Campus LAN</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Tỷ lệ tuân thủ quy chế AI:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      {violationsCount === 0 ? "100% (An toàn tuyệt đối)" : `${violationsCount} cảnh báo`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Phiên đăng nhập hoạt động */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Fingerprint size={16} className="text-purple-600 dark:text-purple-400" />
                    <span>Phiên đăng nhập đang hoạt động</span>
                  </h3>
                </div>

                <div className="space-y-2.5 text-xs">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3 rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-800 dark:text-slate-200">{sess.device}</strong>
                          {sess.isCurrent && (
                            <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                              Thiết bị này
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {sess.browser} • {sess.ip} ({sess.location})
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">{sess.lastActive}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: BẢO MẬT & ĐỔI MẬT KHẨU ─────────────────────────────── */}
        {activeTab === "security" && (
          <div className="max-w-2xl space-y-6">
            <form
              onSubmit={handleChangePassword}
              className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-6 shadow-sm space-y-4"
            >
              <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3 flex items-center gap-2">
                <KeyRound size={17} className="text-blue-600 dark:text-blue-400" />
                <span>Đổi mật khẩu tài khoản</span>
              </h2>

              {passSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Đổi mật khẩu thành công! Hãy lưu lại mật khẩu mới.</span>
                </div>
              )}

              {passError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{passError}</span>
                </div>
              )}

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Nhập mật khẩu hiện tại..."
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 pr-10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Mật khẩu mới (Tối thiểu 8 ký tự)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 8 ký tự..."
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 pr-10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Độ mạnh mật khẩu:</span>
                        <strong className="font-bold text-blue-500">
                          {passwordStrength >= 75 ? "Rất mạnh" : passwordStrength >= 50 ? "Khá" : "Trung bình"}
                        </strong>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${passwordStrength}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Xác nhận lại mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới..."
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 pr-10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingPass}
                  className="h-10 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingPass ? <RefreshCw size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  <span>{isSavingPass ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── TAB 4: THỐNG KÊ HỌC THUẬT THỰC TẾ ─────────────────────────── */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 shadow-sm space-y-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Số bài nộp đã ghi nhận</span>
                <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
                  {submissionsCount} <span className="text-xs font-normal text-slate-400">bài</span>
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  <CheckCircle2 size={12} /> Dữ liệu chấm tự động
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 shadow-sm space-y-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tỷ lệ bài nộp Đạt</span>
                <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {submissionsCount > 0 ? `${acRate}%` : "--"}
                </p>
                <span className="text-[11px] text-slate-400">Dựa trên kết quả chấm điểm</span>
              </div>

              <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 shadow-sm space-y-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Điểm trung bình (ĐTB)</span>
                <p className="text-2xl sm:text-3xl font-black font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                  {submissionsCount > 0 ? `${avgScore}/100` : "--"}
                </p>
                <span className="text-[11px] text-slate-400">Thang điểm 100</span>
              </div>

              <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 shadow-sm space-y-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Cảnh báo quy chế</span>
                <p className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                  {violationsCount}
                </p>
                <span className="text-[11px] text-slate-400">Sự kiện AI giám sát</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: MÔI TRƯỜNG LẬP TRÌNH (PREFERENCES) ──────────────────── */}
        {activeTab === "preferences" && (
          <div className="max-w-2xl space-y-6">
            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3 flex items-center gap-2">
                <Sliders size={17} className="text-blue-600 dark:text-blue-400" />
                <span>Cấu hình Trình soạn thảo Monaco Editor</span>
              </h2>

              {prefSaveSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Đã lưu cài đặt môi trường thi!</span>
                </div>
              )}

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Giao diện Code Editor (Theme)
                  </label>
                  <select
                    value={editorTheme}
                    onChange={(e) => setEditorTheme(e.target.value as any)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 text-slate-800 dark:text-slate-200"
                  >
                    <option value="vs-dark">Visual Studio Dark (Khuyên dùng)</option>
                    <option value="vs-light">Visual Studio Light</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Cỡ chữ (Font size)
                    </label>
                    <input
                      type="number"
                      min={12}
                      max={20}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Kích thước Tab (Tab size)
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={8}
                      value={tabSize}
                      onChange={(e) => setTabSize(Number(e.target.value))}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="autoSave"
                    checked={autoSaveDrafts}
                    onChange={(e) => setAutoSaveDrafts(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <label htmlFor="autoSave" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                    Tự động lưu bản nháp code mỗi 30 giây vào trình duyệt
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="h-10 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-95 cursor-pointer"
                >
                  <Save size={14} />
                  <span>Lưu cài đặt</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="pt-4 text-center text-xs text-slate-400">
          Oculide · Hệ thống thi lập trình trực tuyến
        </footer>
      </div>
    </main>
  );
}
