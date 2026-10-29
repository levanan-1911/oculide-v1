"use client";

import { useState } from "react";
import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Code2,
  Cpu,
  Fingerprint,
  Globe,
  KeyRound,
  Laptop,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
} from "lucide-react";

import { currentStudent } from "@/components/student/student-data";

interface ProfileViewProps {
  role?: "student" | "instructor" | "admin";
}

export default function ProfileView({ role = "student" }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<"info" | "security" | "stats">("info");

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* PROFILE HEADER CARD */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        {/* Decorative Background */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-50/80 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar Container */}
          <div className="relative shrink-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-2xl shadow-md shadow-blue-500/20">
              SV
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white text-white">
              <CheckCircle2 size={14} />
            </span>
          </div>

          {/* Core Info */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {currentStudent.fullName}
              </h1>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200/60">
                {currentStudent.mssv}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                <UserCheck size={12} /> SSO Verified
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Chuyên ngành: <span className="font-semibold text-slate-700">{currentStudent.major}</span> · Lớp: <span className="font-semibold text-slate-700">{currentStudent.className}</span>
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Mail size={14} className="text-slate-400" /> {currentStudent.email}
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Globe size={14} className="text-emerald-500" /> {currentStudent.ipAddress}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex border-b border-slate-100 gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`pb-3 transition relative cursor-pointer ${
              activeTab === "info"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Thông tin định danh
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`pb-3 transition relative cursor-pointer ${
              activeTab === "security"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            An toàn thiết bị &amp; AI Log
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stats")}
            className={`pb-3 transition relative cursor-pointer ${
              activeTab === "stats"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Lịch sử thi &amp; Thống kê
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TAB 1: THÔNG TIN ĐỊNH DANH (SSO READ-ONLY) */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User size={18} className="text-blue-600" /> Hồ sơ sinh viên SSO
              </h2>
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Lock size={12} /> Thông tin được khóa bởi Nhà trường
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">
                  Mã số sinh viên (MSSV)
                </label>
                <div className="relative">
                  <input
                    readOnly
                    value={currentStudent.mssv}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100/70 py-2.5 px-3 font-mono font-bold text-slate-800 cursor-not-allowed"
                  />
                  <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">
                  Họ và tên đầy đủ
                </label>
                <div className="relative">
                  <input
                    readOnly
                    value={currentStudent.fullName}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100/70 py-2.5 px-3 font-bold text-slate-800 cursor-not-allowed"
                  />
                  <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">
                  Email trường cấp
                </label>
                <div className="relative">
                  <input
                    readOnly
                    value={currentStudent.email}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100/70 py-2.5 px-3 font-mono text-slate-700 cursor-not-allowed"
                  />
                  <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">
                  Lớp sinh hoạt
                </label>
                <div className="relative">
                  <input
                    readOnly
                    value={currentStudent.className}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100/70 py-2.5 px-3 font-semibold text-slate-800 cursor-not-allowed"
                  />
                  <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[10px]">
                  Ngành học / Khoa
                </label>
                <div className="relative">
                  <input
                    readOnly
                    value={currentStudent.major}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100/70 py-2.5 px-3 font-semibold text-slate-800 cursor-not-allowed"
                  />
                  <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                <ShieldCheck size={18} className="text-blue-600" />
                Xác thực danh tính AI Proctoring
              </div>
              <p className="text-xs text-blue-900/80 leading-relaxed">
                Hồ sơ sinh viên đã tích hợp dữ liệu sinh trắc học khuôn mặt AI. Khi tham gia phòng thi, hệ thống đối soát dữ liệu với ảnh thẻ sinh viên SSO.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 2: AN TOÀN THIẾT BỊ & AI LOG */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Laptop size={18} className="text-blue-600" /> Nhật ký máy trạm &amp; Thiết bị
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-slate-500 font-medium">Dấu vân tay thiết bị (Device Fingerprint):</span>
                <span className="font-mono font-bold text-blue-600">{currentStudent.deviceFingerprint}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-slate-500 font-medium">Địa chỉ IP ghi nhận:</span>
                <span className="font-mono font-bold text-slate-800">{currentStudent.ipAddress}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-slate-500 font-medium">Trình duyệt &amp; OS:</span>
                <span className="font-semibold text-slate-800">Chrome 130 / Windows 11</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Cpu size={18} className="text-emerald-600" /> Trạng thái AI Surveillance
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
                <span className="text-slate-700 font-semibold">Tỷ lệ tuân thủ quy chế thi (Clean Conduct):</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">100% (An toàn)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-slate-500 font-medium">Tổng số cảnh báo gian lận ghi nhận:</span>
                <span className="font-bold text-slate-800 font-mono">0 lần</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 3: THỐNG KÊ LỊCH SỬ THI */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "stats" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Award size={18} className="text-blue-600" /> Tổng quan kết quả học tập
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 space-y-1">
              <p className="text-slate-500">Số bài thi đã tham gia</p>
              <p className="text-2xl font-bold text-slate-900 font-mono">12</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 space-y-1">
              <p className="text-slate-500">Số Lab thành công</p>
              <p className="text-2xl font-bold text-blue-600 font-mono">12 / 12</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 space-y-1">
              <p className="text-slate-500">Chỉ số vi phạm quy chế</p>
              <p className="text-2xl font-bold text-emerald-600 font-mono">0.0%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}