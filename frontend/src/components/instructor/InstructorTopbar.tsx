'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  GraduationCap,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Sun,
  Moon,
  User,
  LogOut,
} from 'lucide-react';
import { useMonitoring } from './monitoring/MonitoringContext';
import { INSTRUCTOR_ROOMS_STORAGE_KEY, RoomSession } from '@/components/instructor/classes/types';

interface InstructorTopbarProps {
  title?: string;
}

export default function InstructorTopbar({
  title = 'Không gian Giảng viên',
}: InstructorTopbarProps) {
  const router = useRouter();

  // ── THEME & USER STATE ──
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: 'Thầy Nguyễn Văn Nam',
    email: 'nam.nv@school.edu.vn',
    initials: 'GV',
  });

  // ── DROPDOWNS OPEN STATES ──
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Refs để bắt sự kiện click outside
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const { violations, reviewViolation } = useMonitoring();
  const [activeRunningRoom, setActiveRunningRoom] = useState<{ roomCode: string; remainingMinutes: number } | null>(null);

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

  // Quản lý phòng đang chạy
  useEffect(() => {
    function checkActiveRoom() {
      try {
        const raw = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
        if (raw) {
          const rooms: RoomSession[] = JSON.parse(raw);
          const running = rooms.find((r) => r.status === 'in_progress');
          if (running) {
            setActiveRunningRoom({
              roomCode: running.id,
              remainingMinutes: running.durationMinutes || 60,
            });
            return;
          }
        }
      } catch {
        // ignore
      }
      setActiveRunningRoom(null);
    }

    checkActiveRoom();
    window.addEventListener('storage', checkActiveRoom);
    const interval = setInterval(checkActiveRoom, 2500);
    return () => {
      window.removeEventListener('storage', checkActiveRoom);
      clearInterval(interval);
    };
  }, []);

  const pendingViolations = violations.filter((v) => v.status === 'pending');

  // Đọc dữ liệu User Profile và bắt sự kiện Click Outside
  useEffect(() => {
    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = parsed.name || parsed.fullName || parsed.username || 'Thầy Nguyễn Văn Nam';
        const email = parsed.email || 'nam.nv@school.edu.vn';
        const words = name.trim().split(' ').filter(Boolean);
        const initials =
          words.length >= 2
            ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase() || 'GV';

        setUserProfile({ name, email, initials });
      }
    } catch {
      // ignore
    }

    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Xử lý Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('oculide_token');
    localStorage.removeItem('oculide_user');
    localStorage.removeItem('oculide_refresh_token');
    router.push('/login');
  };

  return (
    <header className="flex h-[68px] w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-6 lg:px-8 relative z-30 dark:border-white/10 dark:bg-[#0d1017] transition-colors">
      {/* Tiêu đề bên trái & Tag trạng thái phiên đang giám sát */}
      <div className="flex items-center gap-3">
        <h1 className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>

        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40">
          <GraduationCap className="h-3.5 w-3.5" />
          Giảng viên
        </span>

        {/* Tag chỉ báo phiên giám sát trực tiếp khi có phòng đang thực sự mở */}
        {activeRunningRoom && (
          <Link
            href={`/instructor/monitoring?room=${encodeURIComponent(activeRunningRoom.roomCode)}`}
            className="hidden md:inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300"
            title="Bấm để vào trực tiếp phòng giám sát LiveKit"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Đang giám sát:</span>
            <span className="font-mono text-emerald-900 dark:text-emerald-200">{activeRunningRoom.roomCode}</span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">({activeRunningRoom.remainingMinutes}p)</span>
          </Link>
        )}
      </div>

      {/* Cụm tìm kiếm + Đổi theme sáng/tối + thông báo + avatar xổ xuống bên phải */}
      <div className="flex items-center gap-3">
        <div className="relative hidden lg:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Tìm kiếm lớp học, bài lab, đề thi..."
            className="h-9 w-[240px] xl:w-[280px] rounded-full border border-slate-200/70 bg-[#f4f7f9] pl-9 pr-4 text-xs text-slate-700 placeholder-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-[#141824] dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-blue-500"
          />
        </div>

        {/* Nút chuyển đổi giao diện Sáng / Tối trực tiếp */}
        {mounted ? (
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng (Light)' : 'Chuyển sang giao diện Tối (Dark)'}
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

        {/* Chuông thông báo & Dropdown thông báo vi phạm */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            aria-label="Thông báo vi phạm AI"
            onClick={() => {
              setIsNotifOpen((prev) => !prev);
              setIsProfileOpen(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb] transition-colors hover:bg-blue-100/80 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {pendingViolations.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-[#0d1017] animate-bounce">
                {pendingViolations.length}
              </span>
            )}
          </button>

          {/* Panel danh sách cảnh báo vi phạm */}
          {isNotifOpen && (
            <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-3xl border border-slate-200/90 bg-white p-4 shadow-2xl shadow-slate-900/10 dark:border-white/10 dark:bg-[#0d1017] dark:text-white">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Cảnh báo vi phạm phòng thi
                  </h3>
                </div>

                <Link
                  href="/instructor/monitoring"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Màn hình giám sát</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {violations.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
                    <p className="mt-2 font-bold text-slate-700 dark:text-slate-300">Không có vi phạm nào</p>
                  </div>
                ) : (
                  violations.slice(0, 5).map((v) => (
                    <div
                      key={v.id}
                      className={`rounded-2xl border p-3 text-xs space-y-1.5 transition ${
                        v.status === 'pending'
                          ? 'border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20'
                          : 'border-slate-100 bg-slate-50 opacity-70 dark:border-white/5 dark:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white truncate">
                          {v.studentName} ({v.studentId})
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                          {v.timestamp}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {v.type}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-white/10">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          Phòng: {v.roomCode}
                        </span>
                        {v.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => reviewViolation(v.id, 'record')}
                            className="rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-700 cursor-pointer"
                          >
                            Lập biên bản
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {v.status === 'recorded' ? '✓ Đã lập biên bản' : 'Đã bỏ qua'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* NÚT AVATAR GIẢNG VIÊN VÀ DROPDOWN PROFILE (ĐỒNG BỘ CHUẨN 100% NHƯ ADMIN) */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setIsProfileOpen((prev) => !prev);
              setIsNotifOpen(false);
            }}
            aria-label="Tài khoản Giảng viên"
            title={`${userProfile.name} (Giảng viên)`}
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
                  <span className="mt-1 inline-block rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400">
                    Giảng viên bộ môn
                  </span>
                </div>
              </div>

              {/* Menu điều hướng */}
              <div className="py-1">
                <Link
                  href="/instructor/profile"
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
