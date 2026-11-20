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
  Settings,
  LogOut,
  Radio,
} from 'lucide-react';
import { useMonitoring } from './monitoring/MonitoringContext';
import { INSTRUCTOR_ROOMS_STORAGE_KEY, RoomSession } from '@/components/instructor/classes/types';
import { fetchWithAuth } from '@/services/apiClient';
import { INSTRUCTOR_PROFILE_UPDATED_EVENT } from '@/utils/instructorProfile';

interface InstructorTopbarProps {
  title?: string;
}

export default function InstructorTopbar({
  title = 'Tổng quan',
}: InstructorTopbarProps) {
  const router = useRouter();
  const [initials, setInitials] = useState('GV');
  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    role: string;
  }>({
    name: 'Thầy Nguyễn Văn Nam',
    email: 'nam.nv@school.edu.vn',
    role: 'Giảng viên',
  });

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  const { violations, reviewViolation } = useMonitoring();
  const [activeRunningRoom, setActiveRunningRoom] = useState<{ roomCode: string; remainingMinutes: number } | null>(null);

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

  useEffect(() => {
    let isCancelled = false;

    async function checkActiveRoom() {
      try {
        const rooms = await fetchWithAuth<any[]>('/api/v1/rooms');
        if (!isCancelled && Array.isArray(rooms)) {
          const running = rooms.find(
            (r) => r.status === 'dang_dien_ra' || r.status === 'in_progress'
          );
          if (running) {
            setActiveRunningRoom({
              roomCode: running.room_code || String(running.room_id),
              remainingMinutes: running.duration_minutes || 60,
            });
            return;
          }
          setActiveRunningRoom(null);
          return;
        }
      } catch {
        // Fallback localStorage nếu mất mạng
        try {
          const raw = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
          if (raw) {
            const rooms: RoomSession[] = JSON.parse(raw);
            const running = rooms.find((r) => r.status === 'in_progress');
            if (running && !isCancelled) {
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
      }
      if (!isCancelled) setActiveRunningRoom(null);
    }

    checkActiveRoom();
    window.addEventListener('storage', checkActiveRoom);
    const interval = setInterval(checkActiveRoom, 15000);
    return () => {
      isCancelled = true;
      window.removeEventListener('storage', checkActiveRoom);
      clearInterval(interval);
    };
  }, []);

  const pendingViolations = violations.filter((v) => v.status === 'pending');

  useEffect(() => {
    function syncUserProfile() {
      try {
        const stored = localStorage.getItem('oculide_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          const name = parsed.full_name || parsed.name || parsed.username || 'Thầy Nguyễn Văn Nam';
          const email = parsed.email || 'nam.nv@school.edu.vn';
          setUserProfile({
            name,
            email,
            role: 'Giảng viên',
          });
          const init =
            name
              .split(' ')
              .filter(Boolean)
              .slice(-2)
              .map((w: string) => w[0]?.toUpperCase())
              .join('') || 'GV';
          setInitials(init);
        }
      } catch {
        // ignore
      }
    }

    syncUserProfile();
    window.addEventListener('storage', syncUserProfile);
    window.addEventListener(INSTRUCTOR_PROFILE_UPDATED_EVENT, syncUserProfile);

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
      window.removeEventListener('storage', syncUserProfile);
      window.removeEventListener(INSTRUCTOR_PROFILE_UPDATED_EVENT, syncUserProfile);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('oculide_token');
    localStorage.removeItem('oculide_user');
    localStorage.removeItem('oculide_refresh_token');
    document.cookie = 'oculide_token=; path=/; max-age=0';
    document.cookie = 'oculide_role=; path=/; max-age=0';
    window.location.replace('/login');
  };

  return (
    <header className="flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-300 bg-white/95 px-6 lg:px-8 relative z-30 dark:border-white/10 dark:bg-neutral-900/95 transition-colors">
      {/* Tiêu đề bên trái & Tag trạng thái phiên đang giám sát */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="font-serif text-[17px] font-bold tracking-tight text-[#2A282D] dark:text-white truncate">
          {title}
        </h1>

        <span className="hidden sm:inline-flex items-center gap-1 rounded border border-brand-300 bg-brand-50 px-2 py-0.5 text-xs font-serif font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200 shrink-0">
          <GraduationCap className="h-3.5 w-3.5" />
          Giảng viên
        </span>

        {/* Tag chỉ báo phiên giám sát trực tiếp khi có phòng đang thực sự mở */}
        {activeRunningRoom && (
          <Link
            href={`/instructor/monitoring?room=${encodeURIComponent(activeRunningRoom.roomCode)}`}
            className="hidden md:inline-flex items-center gap-2 rounded-md border border-brand-300 bg-brand-50 px-3 py-1 text-xs font-serif font-bold text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200 dark:hover:bg-brand-500/20 shrink-0"
            title="Bấm để vào trực tiếp phòng giám sát LiveKit"
          >
            <span className="h-2 w-2 rounded-full bg-brand dark:bg-brand-300" />
            <span>Đang giám sát:</span>
            <span className="font-mono text-brand-700 dark:text-brand-200">{activeRunningRoom.roomCode}</span>
            <span className="font-mono text-[11px] font-medium text-slate-500 dark:text-[#9F9690]">({activeRunningRoom.remainingMinutes}p)</span>
          </Link>
        )}
      </div>

      {/* Cụm tìm kiếm + Đổi theme sáng/tối + thông báo + avatar bên phải */}
      <div className="flex items-center gap-3">
        <div className="relative hidden lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 dark:text-[#9F9690]" />
          <input
            type="text"
            placeholder="Tìm kiếm lớp học, bài lab, đề thi..."
            className="h-9 w-64 xl:w-72 rounded-md border border-slate-300 bg-slate-50 pl-9 pr-4 text-xs text-[#2A282D] placeholder:text-slate-500 focus:border-slate-900 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-neutral-950 dark:text-[#E8E6E8] dark:placeholder:text-[#9F9690] dark:focus:border-slate-800 transition-colors"
          />
        </div>

        {/* Nút chuyển đổi giao diện Sáng / Tối trực tiếp */}
        {mounted ? (
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng (Light)' : 'Chuyển sang giao diện Tối (Dark)'}
            aria-label="Chuyển đổi giao diện Sáng / Tối"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-[#2A282D] shadow-2xs transition-colors hover:bg-stone-50 dark:border-white/10 dark:bg-neutral-950 dark:text-amber-400 dark:hover:bg-white/5 cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-[#5A5555]" />
            )}
          </button>
        ) : (
          <div className="h-9 w-9 rounded-md bg-slate-50 dark:bg-white/5 opacity-50" />
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
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-brand-300 bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200 dark:hover:bg-brand-500/20 cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {pendingViolations.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 font-mono text-[9px] font-bold text-white ring-2 ring-white dark:ring-[#1C1820]">
                {pendingViolations.length}
              </span>
            )}
          </button>

          {/* Panel danh sách cảnh báo vi phạm */}
          {isNotifOpen && (
            <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-md border border-slate-300 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-neutral-900 dark:text-white">
              <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <h3 className="font-serif text-xs font-bold text-[#2A282D] dark:text-white">
                    Cảnh báo vi phạm phòng thi
                  </h3>
                </div>

                <Link
                  href="/instructor/monitoring"
                  onClick={() => setIsNotifOpen(false)}
                  className="font-serif text-[11px] font-bold text-brand-700 dark:text-brand-200 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Màn hình giám sát</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {violations.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-[#9F9690]">
                    Chưa ghi nhận sự cố vi phạm nào.
                  </div>
                ) : (
                  violations.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-md border border-slate-300 bg-slate-50 p-2.5 text-xs space-y-1.5 dark:border-white/5 dark:bg-white/[0.02]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#2A282D] dark:text-stone-100">
                          {v.studentName} ({v.studentId})
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {v.timestamp}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold text-slate-800 dark:text-[#e5a9b9] flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {v.type}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-300 dark:border-white/10">
                        <span className="text-[10px] text-slate-500 dark:text-[#9F9690] font-mono">
                          Phòng: {v.roomCode}
                        </span>
                        {v.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => reviewViolation(v.id, 'record')}
                            className="system-primary-action rounded bg-slate-900 px-2 py-0.5 text-[10px] font-serif font-bold text-white hover:bg-slate-800 cursor-pointer"
                          >
                            Lập biên bản
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 dark:text-[#9F9690]">
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

        {/* 4. NÚT AVATAR GIẢNG VIÊN VÀ DROPDOWN ĐỒNG BỘ VỚI ADMIN */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setIsProfileOpen((prev) => !prev);
              setIsNotifOpen(false);
            }}
            aria-label="Tài khoản giảng viên"
            title={`${userProfile.name} (Giảng viên)`}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-xs font-serif font-bold text-white shadow-2xs hover:bg-brand-600 cursor-pointer"
          >
            {initials}
          </button>

          {/* DROPDOWN PROFILE USER MENU */}
          {isProfileOpen && (
            <div className="absolute right-0 top-11 z-50 w-64 rounded-md border border-slate-300 bg-white p-1.5 shadow-xl transition-all dark:border-white/10 dark:bg-neutral-900 text-xs">
              {/* Header profile info */}
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
                  <span className="mt-1 inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-serif font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                    Giảng viên
                  </span>
                </div>
              </div>

              {/* Action items */}
              <div className="py-1">
                <Link
                  href="/instructor/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[#5A5555] hover:bg-slate-900/5 hover:text-slate-900 dark:text-[#9F9690] dark:hover:bg-white/5 dark:hover:text-white rounded-md transition"
                >
                  <User className="h-4 w-4 text-slate-500" />
                  <span>Hồ sơ cá nhân</span>
                </Link>

                <Link
                  href="/instructor/profile?tab=security"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[#5A5555] hover:bg-slate-900/5 hover:text-slate-900 dark:text-[#9F9690] dark:hover:bg-white/5 dark:hover:text-white rounded-md transition"
                >
                  <Settings className="h-4 w-4 text-slate-500" />
                  <span>Đổi mật khẩu</span>
                </Link>

                <Link
                  href="/instructor/monitoring"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[#5A5555] hover:bg-slate-900/5 hover:text-slate-900 dark:text-[#9F9690] dark:hover:bg-white/5 dark:hover:text-white rounded-md transition"
                >
                  <Radio className="h-4 w-4 text-slate-500" />
                  <span>Phòng giám sát thi</span>
                </Link>
              </div>

              {/* Logout button */}
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
