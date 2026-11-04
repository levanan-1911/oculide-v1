'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  CheckCircle2,
  ExternalLink,
  Sun,
  Moon,
  User,
  LogOut,
} from 'lucide-react';
import { studentNotifications } from './student-data';

interface StudentTopbarProps {
  title?: string;
}

export default function StudentTopbar({
  title = 'Không gian Sinh viên',
}: StudentTopbarProps) {
  const router = useRouter();

  // ── THEME & USER STATE ──
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: 'Nguyễn Văn Long',
    email: 'long.nv@school.edu.vn',
    studentCode: '2026-IT01',
    initials: 'SV',
  });

  // ── DROPDOWNS OPEN STATES ──
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Refs để bắt sự kiện click outside
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Khởi tạo Theme
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('oculide_theme') as 'dark' | 'light' | null;
    const initial = saved || 'dark';
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const applyTheme = (t: 'dark' | 'light') => {
    const html = document.documentElement;
    if (t === 'dark') {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('oculide_theme', next);
    applyTheme(next);
  };

  // Đọc thông tin người dùng từ localStorage nếu có
  useEffect(() => {
    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const u = JSON.parse(stored);
        const name = u.name || u.full_name || u.username || 'Nguyễn Văn Long';
        const email = u.email || 'long.nv@school.edu.vn';
        const studentCode = u.studentId || u.student_code || '2026-IT01';
        const parts = name.trim().split(' ');
        const initials =
          parts.length >= 2
            ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
            : name.slice(0, 2).toUpperCase();

        setUserProfile({
          name,
          email,
          studentCode,
          initials,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  // Xử lý click ra ngoài để đóng dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem('oculide_token');
      localStorage.removeItem('oculide_user');
      localStorage.removeItem('oculide_refresh_token');
    } catch {
      // ignore
    }
    router.push('/login');
  };

  const unreadCount = studentNotifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-20 flex h-[68px] w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-5 sm:px-8 dark:border-white/10 dark:bg-[#0d1017] select-none transition-colors">
      {/* Tiêu đề trang động & Badge sinh viên */}
      <div className="flex items-center gap-3">
        <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>

        <span className="hidden sm:inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
          Sinh viên
        </span>

        {/* Mã sinh viên hiển thị nhanh */}
        {userProfile.studentCode && (
          <span className="hidden md:inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600 dark:bg-white/5 dark:text-slate-400">
            MSSV: {userProfile.studentCode}
          </span>
        )}
      </div>

      {/* Cụm tìm kiếm + Đổi theme sáng/tối + thông báo + avatar xổ xuống bên phải */}
      <div className="flex items-center gap-3">
        <div className="relative hidden lg:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Tìm kiếm ca thi, bài nộp, đề..."
            className="h-9 w-[240px] xl:w-[280px] rounded-full border border-slate-200/70 bg-[#f4f7f9] pl-9 pr-4 text-xs text-slate-700 placeholder-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-[#141824] dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-blue-500"
          />
        </div>

        {/* Nút chuyển đổi giao diện Sáng / Tối trực tiếp */}
        {mounted ? (
          <button
            type="button"
            onClick={toggleTheme}
            title={
              theme === 'dark'
                ? 'Chuyển sang giao diện Sáng (Light)'
                : 'Chuyển sang giao diện Tối (Dark)'
            }
            aria-label="Chuyển đổi giao diện Sáng / Tối"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-all hover:scale-105 hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-[#141824] dark:text-amber-400 dark:hover:bg-[#1a2030] cursor-pointer"
          >
            {theme === 'dark' ? (
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
            aria-label="Thông báo sinh viên"
            onClick={() => {
              setIsNotifOpen((prev) => !prev);
              setIsProfileOpen(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb] transition-colors hover:bg-blue-100/80 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-[#0d1017]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Panel danh sách thông báo */}
          {isNotifOpen && (
            <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-3xl border border-slate-200/90 bg-white p-4 shadow-2xl shadow-slate-900/10 dark:border-white/10 dark:bg-[#0d1017] dark:text-white">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Thông báo kỳ thi
                  </h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                      {unreadCount} mới
                    </span>
                  )}
                </div>

                <Link
                  href="/student/schedule"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Xem lịch thi</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {studentNotifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
                    <p className="mt-2 font-bold text-slate-700 dark:text-slate-300">
                      Không có thông báo mới
                    </p>
                  </div>
                ) : (
                  studentNotifications.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 space-y-1 transition hover:bg-slate-100/70 dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {n.title}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                          {n.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* NÚT AVATAR SINH VIÊN VÀ DROPDOWN PROFILE (ĐỒNG BỘ 100% CHUẨN ADMIN & GV) */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setIsProfileOpen((prev) => !prev);
              setIsNotifOpen(false);
            }}
            aria-label="Tài khoản Sinh viên"
            title={`${userProfile.name} (Sinh viên)`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eff6ff] text-xs font-bold text-[#2563eb] transition-all hover:scale-105 hover:bg-blue-100/80 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/25 ring-2 ring-blue-500/20 cursor-pointer"
          >
            {userProfile.initials}
          </button>

          {/* DROPDOWN PROFILE USER MENU */}
          {isProfileOpen && (
            <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl transition-all dark:border-white/10 dark:bg-[#0f131d] text-xs">
              {/* Header profile info */}
              <div className="p-3 border-b border-slate-100 dark:border-white/10 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white shadow-sm">
                  {userProfile.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 dark:text-white truncate text-sm">
                    {userProfile.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {userProfile.email}
                  </p>
                  <span className="mt-1 inline-block rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    Sinh viên
                  </span>
                </div>
              </div>

              {/* Menu điều hướng */}
              <div className="py-1">
                <Link
                  href="/student/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5 transition"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  <span>Hồ sơ cá nhân</span>
                </Link>
              </div>

              {/* Divider & Nút Đăng xuất */}
              <div className="pt-1 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 transition cursor-pointer"
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
