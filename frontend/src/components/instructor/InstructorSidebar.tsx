'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Table2,
  FileCode2,
  Clock,
  Flag,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  User,
  LogOut,
  GraduationCap,
} from 'lucide-react';
import {
  DEFAULT_INSTRUCTOR_PROFILE_EMAIL,
  DEFAULT_INSTRUCTOR_PROFILE_NAME,
  getInstructorInitials,
  INSTRUCTOR_PROFILE_UPDATED_EVENT,
  readInstructorProfileIdentity,
} from '@/utils/instructorProfile';

export interface InstructorNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface InstructorNavGroup {
  groupLabel: string;
  items: InstructorNavItem[];
}

export const INSTRUCTOR_NAV_GROUPS: InstructorNavGroup[] = [
  {
    groupLabel: 'KHÔNG GIAN GIẢNG DẠY',
    items: [
      {
        id: 'overview',
        label: 'Tổng quan',
        href: '/instructor/dashboard',
        icon: LayoutGrid,
      },
      {
        id: 'classes',
        label: 'Lớp & Sinh viên',
        href: '/instructor/classes',
        icon: Table2,
      },
      {
        id: 'questions',
        label: 'Đề & Câu hỏi',
        href: '/instructor/questions',
        icon: FileCode2,
      },
      {
        id: 'schedules',
        label: 'Lịch & Phiên kiểm tra',
        href: '/instructor/schedules',
        icon: Clock,
      },
    ],
  },
  {
    groupLabel: 'THEO DÕI & ĐÁNH GIÁ',
    items: [
      {
        id: 'monitoring',
        label: 'Giám sát trực tiếp',
        href: '/instructor/monitoring',
        icon: Flag,
      },
      {
        id: 'reports',
        label: 'Kết quả & Báo cáo vi phạm',
        href: '/instructor/reports',
        icon: BookOpen,
      },
    ],
  },
];

export default function InstructorSidebar({
  activeModule,
}: {
  activeModule?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    role: string;
  }>({
    name: DEFAULT_INSTRUCTOR_PROFILE_NAME,
    email: DEFAULT_INSTRUCTOR_PROFILE_EMAIL,
    role: 'Giảng viên',
  });

  useEffect(() => {
    function handleSidebarShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setIsCollapsed((previous) => !previous);
      }
    }

    window.addEventListener('keydown', handleSidebarShortcut);
    return () => window.removeEventListener('keydown', handleSidebarShortcut);
  }, []);

  useEffect(() => {
    const syncInstructorIdentity = () => {
      const profile = readInstructorProfileIdentity();
      setCurrentUser({
        name: profile.name,
        email: profile.email,
        role: 'Giảng viên',
      });
    };

    syncInstructorIdentity();
    window.addEventListener('storage', syncInstructorIdentity);
    window.addEventListener(INSTRUCTOR_PROFILE_UPDATED_EVENT, syncInstructorIdentity);

    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('storage', syncInstructorIdentity);
      window.removeEventListener(INSTRUCTOR_PROFILE_UPDATED_EVENT, syncInstructorIdentity);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem('oculide_token');
    localStorage.removeItem('oculide_user');
    localStorage.removeItem('oculide_refresh_token');
    router.push('/login');
  }

  const initials = getInstructorInitials(currentUser.name);

  const currentActiveModule =
    activeModule ??
    (pathname.startsWith('/instructor/classes') || pathname.startsWith('/instructor/room')
      ? 'classes'
      : pathname.startsWith('/instructor/questions')
      ? 'questions'
      : pathname.startsWith('/instructor/schedules')
      ? 'schedules'
      : pathname.startsWith('/instructor/monitoring')
      ? 'monitoring'
      : pathname.startsWith('/instructor/reports')
      ? 'reports'
      : pathname.startsWith('/instructor/profile')
      ? 'profile'
      : 'overview');

  return (
    <aside className={`relative z-30 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white font-sans text-slate-800 shadow-sm transition-[width] duration-200 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 select-none ${isCollapsed ? 'w-[72px]' : 'w-[256px]'}`}>
      {/* Header Logo */}
      <div className={`flex shrink-0 items-center border-b border-slate-100 dark:border-white/10 ${isCollapsed ? 'h-20 flex-col justify-center gap-1 px-2' : 'h-16 justify-between px-5'}`}>
        <Link
          href="/instructor/dashboard"
          aria-label="Oculide - Tổng quan giảng viên"
          className="flex items-center gap-2.5 transition hover:opacity-90"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">Oculide</span>
                <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300">GV</span>
              </div>
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Cổng Giảng Viên</p>
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setIsCollapsed((previous) => !previous)}
          aria-label={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          title={isCollapsed ? 'Mở rộng (Ctrl+B)' : 'Thu gọn (Ctrl+B)'}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-blue-300"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className={`flex-1 overflow-y-auto py-4 ${isCollapsed ? 'px-2' : 'px-3'} space-y-5`}>
        <nav className="space-y-5" aria-label="Điều hướng giảng viên">
          {INSTRUCTOR_NAV_GROUPS.map((group) => (
            <div key={group.groupLabel} className="space-y-1">
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  {group.groupLabel}
                </h3>
              )}
              <div className="mt-1 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentActiveModule === item.id;

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      aria-label={isCollapsed ? item.label : undefined}
                      className={`group flex items-center rounded-xl py-2 text-xs font-semibold transition ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3'} ${
                        isActive
                          ? 'bg-[#eff6ff] text-[#2563eb] dark:bg-blue-500/15 dark:text-blue-300'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? 'text-[#2563eb] dark:text-blue-300' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </div>
                      {isActive && !isCollapsed && (
                        <ChevronRight className="h-3.5 w-3.5 text-[#2563eb] dark:text-blue-300" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User Card */}
      <div
        ref={userMenuRef}
        className={`relative shrink-0 border-t border-slate-100 bg-white dark:border-white/10 dark:bg-[#121824] ${isCollapsed ? 'p-2' : 'p-4'}`}
      >
        {isMenuOpen && (
          <div className={`absolute bottom-[calc(100%+8px)] z-50 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-[#121824] ${isCollapsed ? 'left-3 w-64' : 'left-3 right-3'}`}>
            <div className="px-3 py-2 border-b border-slate-100 dark:border-white/10">
              <p className="text-xs font-bold text-slate-900 truncate dark:text-slate-100">
                {currentUser.name}
              </p>
              <p className="text-[11px] text-slate-500 truncate dark:text-slate-400">
                {currentUser.email}
              </p>
              <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                Giảng viên
              </span>
            </div>

            <div className="mt-1.5 space-y-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
              <Link
                href="/instructor/profile"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-slate-50 hover:text-blue-600 dark:hover:bg-white/5 dark:hover:text-blue-300"
              >
                <User className="h-4 w-4 text-slate-400" />
                Hồ sơ cá nhân
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-red-600 transition hover:bg-red-50 cursor-pointer dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          title={isCollapsed ? `${currentUser.name} · Tài khoản` : undefined}
          aria-label="Mở menu tài khoản giảng viên"
          className={`flex w-full items-center rounded-xl p-1.5 text-left transition hover:bg-slate-50 cursor-pointer dark:hover:bg-white/5 ${isCollapsed ? 'justify-center' : 'gap-3'}`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm">{initials}</div>
          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{currentUser.name}</p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{currentUser.email}</p>
              </div>
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-500">
                <span className="text-[10px] font-bold">⋮</span>
              </div>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
