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
  User,
  LogOut,
  Settings,
  GraduationCap,
} from 'lucide-react';

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
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    role: string;
  }>({
    name: 'Thầy Nguyễn Văn Nam',
    email: 'nam.nv@school.edu.vn',
    role: 'Giảng viên',
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser({
          name: parsed.name || parsed.username || 'Thầy Nguyễn Văn Nam',
          email: parsed.email || 'nam.nv@school.edu.vn',
          role: 'Giảng viên',
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
      .join('') || 'GV';

  const currentActiveModule =
    activeModule ??
    (pathname.startsWith('/instructor/classes')
      ? 'classes'
      : pathname.startsWith('/instructor/questions')
      ? 'questions'
      : pathname.startsWith('/instructor/schedules')
      ? 'schedules'
      : pathname.startsWith('/instructor/monitoring')
      ? 'monitoring'
      : pathname.startsWith('/instructor/reports')
      ? 'reports'
      : 'overview');

  return (
    <aside className="relative flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white font-sans text-slate-800 shadow-sm z-30 select-none">
      {/* Header Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
        <Link
          href="/instructor/dashboard"
          className="flex items-center gap-2.5 transition hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-slate-900">
                Oculide
              </span>
              <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                GV
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-600">
              Cổng Giảng Viên
            </p>
          </div>
        </Link>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <nav className="space-y-5">
          {INSTRUCTOR_NAV_GROUPS.map((group) => (
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
              <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                Giảng viên
              </span>
            </div>

            <div className="mt-1.5 space-y-0.5 text-xs font-medium text-slate-700">
              <Link
                href="/profile"
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
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

