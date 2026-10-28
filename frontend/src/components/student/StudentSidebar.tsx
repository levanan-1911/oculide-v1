'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  CalendarDays,
  BookOpen,
  Code2,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  User,
  LogOut,
  Settings,
} from 'lucide-react';

export interface StudentNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface StudentNavGroup {
  groupLabel: string;
  items: StudentNavItem[];
}

export const STUDENT_NAV_GROUPS: StudentNavGroup[] = [
  {
    groupLabel: 'KHÔNG GIAN HỌC TẬP',
    items: [
      {
        id: 'overview',
        label: 'Tổng quan',
        href: '/student/dashboard',
        icon: LayoutGrid,
      },
      {
        id: 'schedule',
        label: 'Lịch thi & Lab',
        href: '/student/schedule',
        icon: CalendarDays,
      },
      {
        id: 'exams',
        label: 'Phòng thi & Bài tập',
        href: '/student/exams',
        icon: BookOpen,
      },
      {
        id: 'join',
        label: 'Tham gia phòng',
        href: '/student/join',
        icon: Code2,
      },
    ],
  },
  {
    groupLabel: 'THEO DÕI & THIẾT BỊ',
    items: [
      {
        id: 'violations',
        label: 'Báo cáo vi phạm AI',
        href: '/student/violations',
        icon: AlertTriangle,
      },
      {
        id: 'device-check',
        label: 'Kiểm tra thiết bị (AI)',
        href: '/student/device-check',
        icon: ShieldCheck,
      },
    ],
  },
];

export default function StudentSidebar({
  activeModule,
}: {
  activeModule?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    role: string;
  }>({
    name: 'Nguyễn Văn An',
    email: 'an.nv@school.edu.vn',
    role: 'Sinh viên',
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser({
          name: parsed.name || parsed.username || 'Nguyễn Văn An',
          email: parsed.email || 'an.nv@school.edu.vn',
          role: 'Sinh viên',
        });
      }
    } catch {
      // ignore
    }

    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    localStorage.removeItem('oculide_token');
    localStorage.removeItem('oculide_user');
    localStorage.removeItem('oculide_refresh_token');
    router.push('/login');
  }

  const initials =
    currentUser.name
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'SV';

  const currentActiveModule =
    activeModule ??
    (pathname.startsWith('/student/schedule')
      ? 'schedule'
      : pathname.startsWith('/student/exams')
      ? 'exams'
      : pathname.startsWith('/student/join')
      ? 'join'
      : pathname.startsWith('/student/violations')
      ? 'violations'
      : pathname.startsWith('/student/device-check')
      ? 'device-check'
      : pathname === '/student' || pathname === '/student/dashboard'
      ? 'overview'
      : '');

  return (
    <aside className="relative flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white font-sans text-slate-800 shadow-sm z-30 select-none">
      {/* Header Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
        <Link
          href="/student/dashboard"
          className="flex items-center gap-2.5 transition hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-slate-900">
                Oculide
              </span>
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                SV
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-600">
              Cổng Sinh Viên
            </p>
          </div>
        </Link>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <nav className="space-y-5">
          {STUDENT_NAV_GROUPS.map((group) => (
            <div key={group.groupLabel} className="space-y-1">
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {group.groupLabel}
              </h3>
              <div className="mt-1 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentActiveModule === item.id;

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        isActive
                          ? 'bg-[#eff6ff] text-[#2563eb]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? 'text-[#2563eb]' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isActive && (
                        <ChevronRight className="h-3.5 w-3.5 text-[#2563eb]" />
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
        className="relative shrink-0 p-4 border-t border-slate-100 bg-white"
      >
        {isMenuOpen && (
          <div className="absolute bottom-[calc(100%+8px)] left-3 right-3 z-50 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl shadow-slate-900/10">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-900 truncate">
                {currentUser.name}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {currentUser.email}
              </p>
              <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Sinh viên
              </span>
            </div>

            <div className="mt-1.5 space-y-0.5 text-xs font-medium text-slate-700">
              <Link
                href="/student/profile"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-slate-50 hover:text-blue-600"
              >
                <User className="h-4 w-4 text-slate-400" />
                Hồ sơ cá nhân
              </Link>
              <Link
                href="/reset-password"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-slate-50 hover:text-blue-600"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                Đổi mật khẩu
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-red-600 transition hover:bg-red-50 cursor-pointer"
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
          className="flex w-full items-center gap-3 rounded-2xl p-1.5 text-left transition hover:bg-slate-50 cursor-pointer"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-xs font-bold text-white shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">
              {currentUser.name}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {currentUser.email}
            </p>
          </div>
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <span className="text-[10px] font-bold">⋮</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
