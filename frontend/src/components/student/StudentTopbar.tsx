"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  Sun,
  Moon,
  LogOut,
  User,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { studentNotifications } from "./student-data";

interface StudentTopbarProps {
  title?: string;
}

export default function StudentTopbar({
  title = "Tổng quan học tập",
}: StudentTopbarProps) {
  const router = useRouter();
  const [initials, setInitials] = useState("SV");
  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    studentId: string;
  }>({
    name: "Sinh viên",
    email: "student@school.edu.vn",
    studentId: "SV001",
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("oculide_theme") as "dark" | "light" | null;
    const initial = saved || "dark";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const applyTheme = (t: "dark" | "light") => {
    const html = document.documentElement;
    if (t === "dark") {
      html.classList.add("dark");
      html.setAttribute("data-theme", "dark");
    } else {
      html.classList.remove("dark");
      html.setAttribute("data-theme", "light");
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("oculide_theme", next);
    applyTheme(next);
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("oculide_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = parsed.full_name || parsed.name || parsed.username || "Sinh viên";
        const email = parsed.email || "student@school.edu.vn";
        const studentId = parsed.student_id || "SV001";
        setUserProfile({ name, email, studentId });
        const init = name
          .split(" ")
          .filter(Boolean)
          .slice(-2)
          .map((w: string) => w[0]?.toUpperCase())
          .join("") || "SV";
        setInitials(init);
      }
    } catch {
      // ignore
    }

    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("oculide_token");
    localStorage.removeItem("oculide_user");
    localStorage.removeItem("oculide_refresh_token");
    router.push("/login");
  };

  const unreadCount = studentNotifications.filter((n) => n.unread).length;

  return (
    <header className="flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 lg:px-8 relative z-30 backdrop-blur-md dark:border-white/10 dark:bg-[#0d1017]/80 transition-colors">
      {/* Tiêu đề bên trái & Badge Sinh viên */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white truncate">
          {title}
        </h1>

        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40 shrink-0">
          <GraduationCap className="h-3.5 w-3.5" />
          Sinh viên
        </span>
      </div>

      {/* Cụm tìm kiếm + Đổi theme sáng/tối + thông báo + avatar bên phải */}
      <div className="flex items-center gap-3">
        <div className="relative hidden lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Tìm kiếm ca thi, bài nộp..."
            className="h-9 w-64 xl:w-72 rounded-xl border border-slate-200/80 bg-slate-50/80 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 transition-all"
          />
        </div>

        {/* Nút chuyển đổi giao diện Sáng / Tối trực tiếp */}
        {mounted ? (
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Chuyển sang giao diện Sáng (Light)" : "Chuyển sang giao diện Tối (Dark)"}
            aria-label="Chuyển đổi giao diện Sáng / Tối"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-all hover:scale-105 hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-[#141824] dark:text-amber-400 dark:hover:bg-[#1a2030] cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 transition-transform rotate-0 hover:-rotate-12" />
            )}
          </button>
        ) : (
          <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-white/5 opacity-50" />
        )}

        {/* Chuông thông báo */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            aria-label="Thông báo cá nhân"
            onClick={() => {
              setShowNotifications((prev) => !prev);
              setIsProfileOpen(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb] transition-colors hover:bg-blue-100/80 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-[#0d1017] animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xl shadow-slate-900/10 dark:border-white/10 dark:bg-[#0d1017] dark:text-white">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Thông báo</p>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {unreadCount} mới
                </span>
              </div>

              <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {studentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-xl border border-slate-100 p-2.5 text-xs dark:border-white/5 dark:bg-white/[0.02]"
                  >
                    <div className="flex items-start gap-2">
                      {notification.unread && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Nút Avatar Sinh viên và Dropdown đồng bộ Admin */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setIsProfileOpen((prev) => !prev);
              setShowNotifications(false);
            }}
            aria-label="Tài khoản sinh viên"
            title={`${userProfile.name} (Sinh viên)`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eff6ff] text-xs font-bold text-[#2563eb] transition-all hover:scale-105 hover:bg-blue-100/80 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/25 ring-2 ring-blue-500/20 cursor-pointer"
          >
            {initials}
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl transition-all dark:border-white/10 dark:bg-[#0f131d] text-xs">
              <div className="p-3 border-b border-slate-100 dark:border-white/10 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white shadow-sm">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {userProfile.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {userProfile.email}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 font-mono">
                    {userProfile.studentId}
                  </span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/student/schedule"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5 rounded-xl transition"
                >
                  <GraduationCap className="h-4 w-4 text-slate-400" />
                  <span>Lịch thi của tôi</span>
                </Link>

                <Link
                  href="/student/submissions"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5 rounded-xl transition"
                >
                  <CheckCircle2 className="h-4 w-4 text-slate-400" />
                  <span>Kết quả làm bài</span>
                </Link>
              </div>

              <div className="border-t border-slate-100 dark:border-white/10 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 rounded-xl transition cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
