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
} from "lucide-react";

import { currentStudent } from "@/components/student/student-data";

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

export default function StudentProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("info");

  // ─── 1. THÔNG TIN HỌC THUẬT & CÁ NHÂN (Editable & Locked) ─────────────────
  const [phone, setPhone] = useState("0912 345 678");
  const [secondaryEmail, setSecondaryEmail] = useState("minhanh.personal@gmail.com");
  const [preferredLang, setPreferredLang] = useState("C++20");
  const [bio, setBio] = useState("Sinh viên K27 ngành Kỹ thuật Phần mềm. Đam mê thuật toán & lập trình thi đấu ICPC.");
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoSaveSuccess, setInfoSaveSuccess] = useState(false);

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
      device: "Máy trạm Phòng Lab 402 - PC-18",
      browser: "Chrome 130 (Windows 11)",
      ip: currentStudent.ipAddress,
      location: "Khuôn viên Trường (Campus LAN)",
      lastActive: "Đang hoạt động (Hiện tại)",
      isCurrent: true,
    },
    {
      id: "SES-02",
      device: "Laptop cá nhân ThinkPad T14",
      browser: "Firefox 132 (Windows 11)",
      ip: "118.69.182.44",
      location: "Ký túc xá Đại học",
      lastActive: "2 giờ trước",
      isCurrent: false,
    },
  ]);

  // Load cấu hình đã lưu từ localStorage
  useEffect(() => {
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
  }, []);

  // Xử lý lưu thông tin liên lạc cá nhân
  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInfo(true);
    setTimeout(() => {
      setIsSavingInfo(false);
      setInfoSaveSuccess(true);
      setTimeout(() => setInfoSaveSuccess(false), 3000);
    }, 700);
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

  // Xử lý đổi mật khẩu
  const handleChangePassword = (e: React.FormEvent) => {
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
    setTimeout(() => {
      setIsSavingPass(false);
      setPassSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPassSuccess(false), 4000);
    }, 800);
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

  // Xóa các phiên đăng nhập khác
  const handleTerminateOtherSessions = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ─── 1. PROFILE HEADER CARD (Đồng bộ Dark & Light Mode) ─────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-6 shadow-sm transition">
        {/* Họa tiết trang trí nền */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-50/80 dark:bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar Container với Badge Sinh Trắc Học */}
          <div className="relative shrink-0">
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl sm:text-3xl shadow-md shadow-blue-500/20">
              SV
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
                {currentStudent.fullName}
              </h1>
              <span className="font-mono text-xs font-bold rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/30 px-2.5 py-0.5">
                {currentStudent.mssv}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/30">
                <ShieldCheck size={13} /> SSO Verified
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Chuyên ngành:{" "}
              <strong className="text-slate-700 dark:text-slate-200">
                {currentStudent.major}
              </strong>{" "}
              · Lớp:{" "}
              <strong className="text-slate-700 dark:text-slate-200">
                {currentStudent.className}
              </strong>
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-5 pt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Mail size={14} className="text-slate-400" /> {currentStudent.email}
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Globe size={14} className="text-emerald-500" /> {currentStudent.ipAddress}
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Fingerprint size={14} className="text-blue-500" /> {currentStudent.deviceFingerprint}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Navigation Tabs Bar (Chuẩn h-10/h-11, không White-on-White) ─ */}
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
            <span>Sinh trắc học AI & Thiết bị</span>
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
            <KeyRound size={15} />
            <span>Bảo mật & Đổi mật khẩu</span>
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
            <span>Năng lực lập trình & Thi cử</span>
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
            <SlidersHorizontal size={15} />
            <span>Cá nhân hóa môi trường thi</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: THÔNG TIN ĐỊNH DANH (SSO READ-ONLY + EDITABLE) ────────── */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Cột Trái: Hồ sơ trường cấp (Khóa SSO) */}
          <div className="xl:col-span-2 space-y-6">
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
                      value={currentStudent.mssv}
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
                      value={currentStudent.fullName}
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
                      value={currentStudent.email}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.04] px-3 font-mono text-slate-700 dark:text-slate-300 cursor-not-allowed select-all"
                    />
                    <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase text-[10px] tracking-wider">
                    Lớp sinh hoạt
                  </label>
                  <div className="relative">
                    <input
                      readOnly
                      value={currentStudent.className}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.04] px-3 font-semibold text-slate-800 dark:text-slate-200 cursor-not-allowed"
                    />
                    <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase text-[10px] tracking-wider">
                    Khoa / Ngành đào tạo
                  </label>
                  <div className="relative">
                    <input
                      readOnly
                      value={currentStudent.major}
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
                  <span>Thông tin liên lạc & Hồ sơ cá nhân</span>
                </h2>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Cho phép chỉnh sửa
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 text-xs">
                    Số điện thoại liên hệ khẩn cấp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Dùng khi Giám thị cần liên hệ khẩn cấp do sự cố mất kết nối thi.</p>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 text-xs">
                    Email phụ nhận thông báo
                  </label>
                  <input
                    type="email"
                    value={secondaryEmail}
                    onChange={(e) => setSecondaryEmail(e.target.value)}
                    placeholder="email.phu@gmail.com"
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Nhận bản sao kết quả bài thi và phúc khảo.</p>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 text-xs">
                    Ngôn ngữ lập trình sở trường
                  </label>
                  <select
                    value={preferredLang}
                    onChange={(e) => setPreferredLang(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  >
                    <option value="C++20">C++20 (GCC 13.2)</option>
                    <option value="Python 3.11">Python 3.11</option>
                    <option value="Java 17">Java 17 LTS</option>
                    <option value="C11">C11 Standard</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 text-xs">
                    Ghi chú cá nhân / Tiểu sử ngắn
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {infoSaveSuccess && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={15} /> Đã cập nhật thông tin thành công!
                  </span>
                )}
                {!infoSaveSuccess && <span />}

                <button
                  type="submit"
                  disabled={isSavingInfo}
                  className="h-10 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-95 disabled:opacity-50"
                >
                  {isSavingInfo ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>{isSavingInfo ? "Đang lưu..." : "Lưu thay đổi"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Cột Phải: Thẻ quy chế & Chú thích học thuật */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/10 p-5 space-y-3">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold text-xs">
                <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
                <span>Quy chuẩn Định danh Kỳ thi 2026</span>
              </div>
              <p className="text-xs text-blue-900/80 dark:text-blue-300/80 leading-relaxed">
                Hồ sơ sinh viên được xác thực duy nhất qua cổng Single Sign-On (SSO) của trường. Mọi hành vi thi hộ hoặc mượn tài khoản sẽ bị hệ thống AI đối soát khuôn mặt phát hiện tự động.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 shadow-sm space-y-3 text-xs">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Building2 size={16} className="text-slate-500" />
                <span>Đơn vị Đào tạo & Quản lý</span>
              </h3>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li className="flex justify-between">
                  <span>Khoa:</span>
                  <strong className="text-slate-900 dark:text-slate-100">Công nghệ Thông tin</strong>
                </li>
                <li className="flex justify-between">
                  <span>Cố vấn học tập:</span>
                  <strong className="text-slate-900 dark:text-slate-100">TS. Nguyễn Văn An</strong>
                </li>
                <li className="flex justify-between">
                  <span>Niên khóa:</span>
                  <strong className="text-slate-900 dark:text-slate-100">2023 - 2027 (K27)</strong>
                </li>
                <li className="flex justify-between">
                  <span>Trạng thái học vụ:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Đang học (Bình thường)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: SINH TRẮC HỌC AI & THIẾT BỊ (BIOMETRICS & DEVICE SENTINEL) */}
      {activeTab === "biometrics" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Box 1: Đăng ký & Đối soát Khuôn mặt AI */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Camera size={17} className="text-blue-600 dark:text-blue-400" />
                <span>Dữ liệu Sinh trắc học Khuôn mặt (AI Face Vector)</span>
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold">
                <CheckCircle2 size={12} /> Đã đăng ký
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Mô hình thị giác máy tính YOLOv8 & MediaPipe sử dụng vector 128 chiều trích xuất từ ảnh khuôn mặt này để liên tục xác thực bạn trong suốt thời gian làm bài thi.
            </p>

            {/* Khung Webcam xem trước hoặc ảnh mẫu hiện tại */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800">
              {isWebcamActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <div className="w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/40">
                    <Camera size={28} />
                  </div>
                  <p className="font-bold text-slate-200 text-xs">Ảnh khuôn mặt mẫu đối soát AI</p>
                  <p className="text-[11px] text-slate-400">Đã cập nhật ngày 28/10/2026</p>
                </div>
              )}

              {/* Lưới định vị khuôn mặt AR Overlay */}
              {isWebcamActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-44 h-56 rounded-full border-2 border-dashed border-emerald-400/80 animate-pulse flex items-center justify-center">
                    <span className="text-[10px] text-emerald-300 font-bold uppercase bg-black/60 px-2 py-0.5 rounded">
                      Căn giữa khuôn mặt
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Các nút thao tác Webcam */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleToggleWebcam}
                className="h-10 inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition"
              >
                <Camera size={14} />
                <span>{isWebcamActive ? "Tắt Webcam" : "Bật Webcam kiểm tra"}</span>
              </button>

              {isWebcamActive && (
                <button
                  type="button"
                  onClick={handleCaptureFace}
                  className="h-10 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 transition"
                >
                  <Check size={14} />
                  <span>Chụp ảnh làm mẫu AI</span>
                </button>
              )}
            </div>
          </div>

          {/* Box 2: Thông số Máy trạm & Vân tay thiết bị */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3 flex items-center gap-2">
                <Laptop size={17} className="text-blue-600 dark:text-blue-400" />
                <span>Dấu vân tay Máy trạm & Mạng thi</span>
              </h2>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Device Fingerprint:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{currentStudent.deviceFingerprint}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Địa chỉ IP Campus:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{currentStudent.ipAddress}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Trình duyệt & Hệ điều hành:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Chrome 130 / Windows 11 64-bit</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">Tỷ lệ tuân thủ quy chế AI:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">100% (An toàn tuyệt đối)</span>
                </div>
              </div>
            </div>

            {/* Box 3: Phiên đăng nhập hoạt động */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Fingerprint size={16} className="text-purple-600 dark:text-purple-400" />
                  <span>Phiên đăng nhập đang hoạt động</span>
                </h3>

                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={handleTerminateOtherSessions}
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    Đăng xuất các phiên khác
                  </button>
                )}
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

      {/* ─── TAB 3: BẢO MẬT & ĐỔI MẬT KHẨU (SECURITY & PASSCODE) ──────────── */}
      {activeTab === "security" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <form
            onSubmit={handleChangePassword}
            className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-7 shadow-sm space-y-5"
          >
            <div className="border-b border-slate-100 dark:border-white/5 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound size={18} className="text-blue-600 dark:text-blue-400" />
                <span>Đổi mật khẩu tài khoản & Mã PIN ca thi</span>
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Mật khẩu này được sử dụng để đăng nhập hệ thống và xác nhận tham gia ca thi trực tuyến.
              </p>
            </div>

            {passError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới của bạn.</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Mật khẩu hiện tại */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 text-xs">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu đang dùng"
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 pr-10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 text-xs">
                  Mật khẩu mới (Tối thiểu 8 ký tự)
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự gồm chữ hoa, thường và số"
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 pr-10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Thanh đo độ mạnh mật khẩu (Password Strength Meter) */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Độ mạnh mật khẩu:</span>
                      <strong
                        className={`font-bold ${
                          passwordStrength <= 25
                            ? "text-rose-500"
                            : passwordStrength <= 50
                            ? "text-amber-500"
                            : passwordStrength <= 75
                            ? "text-blue-500"
                            : "text-emerald-500"
                        }`}
                      >
                        {passwordStrength <= 25
                          ? "Yếu"
                          : passwordStrength <= 50
                          ? "Trung bình"
                          : passwordStrength <= 75
                          ? "Khá mạnh"
                          : "Rất mạnh"}
                      </strong>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength <= 25
                            ? "bg-rose-500"
                            : passwordStrength <= 50
                            ? "bg-amber-500"
                            : passwordStrength <= 75
                            ? "bg-blue-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 text-xs">
                  Xác nhận lại mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 pr-10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                className="h-11 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-95 disabled:opacity-50"
              >
                {isSavingPass ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <KeyRound size={14} />
                )}
                <span>{isSavingPass ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</span>
              </button>
            </div>
          </form>

          {/* Hộp quy chuẩn bảo mật tài khoản thi */}
          <div className="rounded-2xl border border-amber-200/80 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/10 p-5 space-y-2 text-xs text-amber-900 dark:text-amber-300">
            <h3 className="font-bold flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600" />
              <span>Chính sách phòng vệ tài khoản thi trực tuyến</span>
            </h3>
            <p className="leading-relaxed text-amber-900/80 dark:text-amber-300/80">
              Nhằm ngăn chặn hành vi brute-force mật khẩu phòng thi, tài khoản sẽ tự động khóa tạm thời 15 phút nếu nhập sai mật khẩu quá 5 lần liên tiếp.
            </p>
          </div>
        </div>
      )}

      {/* ─── TAB 4: NĂNG LỰC LẬP TRÌNH & THỐNG KÊ (CODING STATS & ACADEMICS) ─ */}
      {activeTab === "stats" && (
        <div className="space-y-6">
          {/* Lưới 4 Thẻ KPI Học Thuật */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 shadow-sm space-y-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Số ca thi đã tham gia</span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
                12 <span className="text-xs font-normal text-slate-400">buổi</span>
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} /> Hoàn thành 100%
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 shadow-sm space-y-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tỷ lệ bài nộp Đạt (AC)</span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                92.5%
              </p>
              <span className="text-[11px] text-slate-400">37 / 40 Test cases đúng</span>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 shadow-sm space-y-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Điểm trung bình tích lũy (GPA)</span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                8.8 <span className="text-xs font-normal text-slate-400">/ 10</span>
              </p>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Xếp loại: Giỏi</span>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 shadow-sm space-y-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Chỉ số vi phạm quy chế thi</span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                0.0%
              </p>
              <span className="text-[11px] text-slate-400">Không có cờ cảnh báo AI</span>
            </div>
          </div>

          {/* Phân bổ Ngôn ngữ lập trình & Danh sách bài làm gần nhất */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột 1: Phân bổ ngôn ngữ */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Code2 size={16} className="text-blue-600 dark:text-blue-400" />
                <span>Ngôn ngữ sử dụng thi đấu</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">C++20 (Chính)</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">70%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: "70%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">Python 3.11</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">20%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "20%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">Java 17 LTS</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400">10%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: "10%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Cột 2-3: Bài làm gần nhất với liên kết xem mã nguồn */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCode2 size={16} className="text-blue-600 dark:text-blue-400" />
                  <span>Bài nộp gần nhất (Có thể xem lại code)</span>
                </h3>
                <Link
                  href="/student/submissions"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Xem tất cả</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              {/* Card Bài nộp cb_111 mẫu */}
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm text-slate-900 dark:text-white">
                      cb_111: Tính tổng các số trong chuỗi
                    </strong>
                    <span className="rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 font-mono text-[10px] font-bold px-1.5 py-0.5">
                      4/5 AC (WA)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    C++20 • 31, Tháng 10, 2026, 20:51 • Tài nguyên: 0,004s, 1.82 MB
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/student/submissions/cb_111?tab=result"
                    className="h-9 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    <span>Xem kết quả</span>
                  </Link>

                  <Link
                    href="/student/submissions/cb_111?tab=code"
                    className="h-9 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs"
                  >
                    <Code2 size={13} />
                    <span>Xem code</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: CÁ NHÂN HÓA MÔI TRƯỜNG THI (IDE PREFERENCES) ─────────── */}
      {activeTab === "preferences" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-7 shadow-sm space-y-5">
            <div className="border-b border-slate-100 dark:border-white/5 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders size={18} className="text-blue-600 dark:text-blue-400" />
                <span>Cấu hình Trình soạn thảo Monaco Editor khi làm bài thi</span>
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Các tùy chọn này được lưu tự động trên thiết bị của bạn để tối ưu trải nghiệm gõ code khi thi.
              </p>
            </div>

            {prefSaveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>Đã lưu tùy biến môi trường thành công!</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Theme của Code Editor */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 text-xs">
                  Giao diện màu Monaco Editor
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditorTheme("vs-dark")}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      editorTheme === "vs-dark"
                        ? "border-blue-600 bg-blue-50/40 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold"
                        : "border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div>
                      <p className="font-bold">Dark Theme (vs-dark)</p>
                      <p className="text-[11px] text-slate-400">Giảm mỏi mắt khi thi ban đêm</p>
                    </div>
                    {editorTheme === "vs-dark" && <CheckCircle2 size={16} className="text-blue-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditorTheme("vs-light")}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      editorTheme === "vs-light"
                        ? "border-blue-600 bg-blue-50/40 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold"
                        : "border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div>
                      <p className="font-bold">Light Theme (vs-light)</p>
                      <p className="text-[11px] text-slate-400">Giao diện sáng tiêu chuẩn</p>
                    </div>
                    {editorTheme === "vs-light" && <CheckCircle2 size={16} className="text-blue-600" />}
                  </button>
                </div>
              </div>

              {/* Cỡ chữ & Tab size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 text-xs">
                    Cỡ chữ mã nguồn (Font size)
                  </label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value={12}>12 px (Nhỏ gọn)</option>
                    <option value={13}>13 px</option>
                    <option value={14}>14 px (Khuyến nghị)</option>
                    <option value={16}>16 px (Dễ nhìn)</option>
                    <option value={18}>18 px (Lớn)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 text-xs">
                    Độ rộng thụt dòng (Tab Spacing)
                  </label>
                  <select
                    value={tabSize}
                    onChange={(e) => setTabSize(Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f17] px-3 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value={2}>2 spaces (Google C++ / Web style)</option>
                    <option value={4}>4 spaces (Standard style)</option>
                  </select>
                </div>
              </div>

              {/* Tự động lưu bản nháp CodeDrafts */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Tự động lưu bài nháp (Auto-Save CodeDrafts)</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tự động đồng bộ mã nguồn lên cụm lưu trữ mỗi 30 giây để chống mất bài khi sập nguồn hoặc mất mạng.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSaveDrafts}
                  onChange={(e) => setAutoSaveDrafts(e.target.checked)}
                  className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSavePreferences}
                className="h-10 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-95"
              >
                <Save size={14} />
                <span>Lưu cấu hình IDE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
