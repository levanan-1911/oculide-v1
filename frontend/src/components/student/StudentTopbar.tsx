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
  KeyRound,
  GraduationCap,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { fetchWithAuth } from "@/services/apiClient";
import type { ApiStudentRoom } from "./student-data";

interface StudentTopbarProps {
  title?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  type: "room" | "violation" | "system";
  href?: string;
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

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("oculide_theme") as "dark" | "light" | null;
    const initial = saved || "light";
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
    let isSubscribed = true;

    async function loadUserAndNotifications() {
      let currentUserId: number | null = null;
      try {
        const stored = localStorage.getItem("oculide_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          const name = parsed.full_name || parsed.fullName || parsed.name || parsed.username || "Sinh viên";
          const email = parsed.email || "student@school.edu.vn";
          const studentId =
            parsed.student_id ||
            parsed.identifier_code ||
            parsed.ma_dinh_danh ||
            parsed.student_code ||
            parsed.studentId ||
            parsed.userCode ||
            parsed.username ||
            "SV001";
          if (isSubscribed) {
            setUserProfile({ name, email, studentId });
            const init = name
              .split(" ")
              .filter(Boolean)
              .slice(-2)
              .map((w: string) => w[0]?.toUpperCase())
              .join("") || "SV";
            setInitials(init);
          }
          const idCandidate = Number(parsed.user_id || parsed.id);
          if (!Number.isNaN(idCandidate) && idCandidate > 0) currentUserId = idCandidate;
        }
      } catch {
        // ignore
      }

      try {
        const me = await fetchWithAuth<{
          user_id: number;
          full_name?: string;
          email?: string;
          username?: string;
          student_id?: string;
          identifier_code?: string;
          ma_dinh_danh?: string;
          student_code?: string;
        }>("/api/v1/auth/me");
        if (isSubscribed && me) {
          currentUserId = me.user_id;
          const name = me.full_name || me.username || "Sinh viên";
          const email = me.email || "student@school.edu.vn";
          const studentId =
            me.student_id ||
            me.identifier_code ||
            me.ma_dinh_danh ||
            me.student_code ||
            me.username ||
            "SV001";
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

      // Tải thông báo thực từ rooms và violations
      const notifs: NotificationItem[] = [];
      try {
        const rooms = await fetchWithAuth<ApiStudentRoom[]>("/api/v1/rooms?limit=5");
        if (Array.isArray(rooms)) {
          const ongoing = rooms.filter(
            (r) => (r.status || "").toLowerCase() === "dang_dien_ra"
          );
          ongoing.forEach((r) => {
            notifs.push({
              id: `room-${r.room_id}`,
              title: "Ca thi đang diễn ra",
              message: `Phòng "${r.room_name}" (${r.room_code}) đang mở. Bạn có thể tham gia ngay.`,
              time: "Hiện tại",
              unread: true,
              type: "room",
              href: `/student/exams?code=${r.room_code}`,
            });
          });

          const upcoming = rooms.filter(
            (r) => (r.status || "chua_mo").toLowerCase() === "chua_mo" && r.is_active !== false
          );
          if (upcoming.length > 0) {
            const first = upcoming[0];
            notifs.push({
              id: `upcoming-${first.room_id}`,
              title: "Lịch thi sắp tới",
              message: `Ca thi "${first.room_name}" dự kiến diễn ra. Hãy chuẩn bị thiết bị.`,
              time: "Sắp tới",
              unread: false,
              type: "room",
              href: "/student/schedule",
            });
          }
        }
      } catch {
        // ignore
      }

      if (currentUserId) {
        try {
          const vios = await fetchWithAuth<any[]>(
            `/api/v1/violations/student/${currentUserId}`
          );
          if (Array.isArray(vios) && vios.length > 0) {
            const pending = vios.filter((v) => (v.review_status || "pending") === "pending");
            if (pending.length > 0) {
              notifs.push({
                id: `vio-${pending[0].violation_id}`,
                title: "Nhật ký cảnh báo AI",
                message: `Bạn có ${pending.length} sự kiện cảnh báo đang chờ giảng viên xem xét.`,
                time: "Gần đây",
                unread: true,
                type: "violation",
                href: "/student/violations",
              });
            }
          }
        } catch {
          // ignore
        }
      }

      if (notifs.length === 0) {
        notifs.push({
          id: "sys-welcome",
          title: "Hệ thống an toàn",
          message: "Chào mừng bạn đến với Oculide. Hãy kiểm tra webcam và micro trước ca thi.",
          time: "Hôm nay",
          unread: false,
          type: "system",
          href: "/student/device-check",
        });
      }

      if (isSubscribed) {
        setNotifications(notifs);
      }
    }

    loadUserAndNotifications();

    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      isSubscribed = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem("oculide_token");
    if (token) {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        keepalive: true,
      }).catch(() => {});
    }
    localStorage.removeItem("oculide_token");
    localStorage.removeItem("oculide_user");
    localStorage.removeItem("oculide_refresh_token");
    localStorage.removeItem("oculide_last_activity");
    document.cookie = 'oculide_token=; path=/; max-age=0';
    document.cookie = 'oculide_role=; path=/; max-age=0';
    window.location.replace('/login');
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-300 bg-white/95 px-6 lg:px-8 relative z-30 dark:border-white/10 dark:bg-neutral-900/95 transition-colors">
      {/* Tiêu đề bên trái & Badge Sinh viên */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="font-serif text-[17px] font-bold tracking-tight text-[#2A282D] dark:text-white truncate">
          {title}
        </h1>

        <span className="hidden sm:inline-flex items-center gap-1 rounded border border-brand-300 bg-brand-50 px-2 py-0.5 text-xs font-serif font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-[#f0c2cf] shrink-0">
          <GraduationCap className="h-3.5 w-3.5" />
          Sinh viên
        </span>
      </div>

      {/* Cụm tìm kiếm + Đổi theme sáng/tối + thông báo + avatar bên phải */}
      <div className="flex items-center gap-3">
        <div className="relative hidden lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 dark:text-[#9F9690]" />
          <input
            type="text"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const target = (e.target as HTMLInputElement).value;
                if (target.trim()) {
                  router.push(`/student/schedule?q=${encodeURIComponent(target.trim())}`);
                }
              }
            }}
            placeholder="Tìm kiếm ca thi, bài nộp... (Enter)"
            className="h-9 w-64 xl:w-72 rounded-md border border-slate-300 bg-slate-50 pl-9 pr-4 text-xs text-[#2A282D] placeholder:text-slate-500 focus:border-slate-900 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-neutral-950 dark:text-[#E8E6E8] dark:placeholder:text-[#9F9690] dark:focus:border-slate-800 transition-colors"
          />
        </div>

        {/* Nút chuyển đổi giao diện Sáng / Tối trực tiếp */}
        {mounted ? (
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Chuyển sang giao diện Sáng (Light)" : "Chuyển sang giao diện Tối (Dark)"}
            aria-label="Chuyển đổi giao diện Sáng / Tối"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-[#2A282D] shadow-2xs transition-colors hover:bg-stone-50 dark:border-white/10 dark:bg-neutral-950 dark:text-amber-400 dark:hover:bg-white/5 cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-[#5A5555]" />
            )}
          </button>
        ) : (
          <div className="h-9 w-9 rounded-md bg-slate-50 dark:bg-white/5 opacity-50" />
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
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-brand-300 bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100 dark:border-white/10 dark:bg-brand-500/10 dark:text-[#f0c2cf] dark:hover:bg-brand-500/20 cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 font-mono text-[9px] font-bold text-white ring-2 ring-white dark:ring-[#1C1820]">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-md border border-slate-300 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-neutral-900 dark:text-white">
              <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-3">
                <p className="font-serif text-xs font-bold text-[#2A282D] dark:text-white">Thông báo học tập</p>
                <span className="rounded bg-brand-50 px-2 py-0.5 font-mono text-[10px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-[#f0c2cf]">
                  {unreadCount} mới
                </span>
              </div>

              <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.href || "#"}
                    onClick={() => setShowNotifications(false)}
                    className="block rounded-md border border-slate-300 p-2.5 text-xs transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/5"
                  >
                    <div className="flex items-start gap-2">
                      {notification.unread ? (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand dark:bg-[#e5a9b9]" />
                      ) : (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold text-[#2A282D] dark:text-stone-100">
                            {notification.title}
                          </p>
                          <span className="font-mono text-[10px] text-slate-500 shrink-0">
                            {notification.time}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#5A5555] dark:text-[#9F9690] leading-relaxed">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </Link>
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
            className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-xs font-serif font-bold text-white shadow-2xs hover:bg-brand-600 cursor-pointer"
          >
            {initials}
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-11 z-50 w-64 rounded-md border border-slate-300 bg-white p-1.5 shadow-xl transition-all dark:border-white/10 dark:bg-neutral-900 text-xs">
              <div className="p-3 border-b border-slate-300 dark:border-white/10 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-serif font-bold text-white shadow-xs">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#2A282D] dark:text-white truncate">
                    {userProfile.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-[#9F9690] truncate font-mono">
                    {userProfile.email}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-[#f0c2cf] font-mono">
                    {userProfile.studentId}
                  </span>
                </div>
              </div>

              {/* Menu xổ xuống đồng bộ: Thông tin cá nhân & Bảo mật & Mật khẩu */}
              <div className="py-1">
                <Link
                  href="/student/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[#5A5555] hover:bg-slate-900/5 hover:text-slate-900 dark:text-[#9F9690] dark:hover:bg-white/5 dark:hover:text-white rounded-md transition"
                >
                  <User className="h-4 w-4 text-slate-500" />
                  <span>Thông tin cá nhân</span>
                </Link>
              </div>

              <div className="border-t border-slate-300 dark:border-white/10 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-slate-800 hover:bg-slate-900/10 dark:text-[#e5a9b9] dark:hover:bg-white/5 rounded-md transition cursor-pointer"
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
