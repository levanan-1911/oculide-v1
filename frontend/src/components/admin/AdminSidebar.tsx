'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  UserCheck,
  Table2,
  FileCode2,
  Clock,
  Flag,
  BookOpen,
  Settings,
  ChevronRight,
  User,
  LogOut,
} from 'lucide-react';

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface AdminNavGroup {
  groupLabel: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    groupLabel: 'KHÔNG GIAN QUẢN TRỊ',
    items: [
      {
        id: 'overview',
        label: 'Tổng quan',
        href: '/admin',
        icon: LayoutGrid,
      },
    ],
  },
  {
    groupLabel: 'QUẢN LÝ ĐÀO TẠO',
    items: [
      {
        id: 'users',
        label: 'Người dùng & phân quyền',
        href: '/admin/users',
        icon: UserCheck,
      },
      {
        id: 'classes',
        label: 'Lớp & sinh viên',
        href: '/admin/classes',
        icon: Table2,
      },
      {
        id: 'questions',
        label: 'Đề & câu hỏi',
        href: '/admin/questions',
        icon: FileCode2,
      },
      {
        id: 'schedules',
        label: 'Lịch & phiên kiểm tra',
        href: '/admin/schedules',
        icon: Clock,
      },
    ],
  },
  {
    groupLabel: 'THEO DÕI & ĐÁNH GIÁ',
    items: [
      {
        id: 'monitoring',
        label: 'Giám sát & hỗ trợ',
        href: '/admin/monitoring',
        icon: Flag,
      },
      {
        id: 'reports',
        label: 'Kết quả & báo cáo',
        href: '/admin/reports',
        icon: BookOpen,
      },
    ],
  },
  {
    groupLabel: 'QUẢN TRỊ HỆ THỐNG',
    items: [
      {
        id: 'system',
        label: 'Hệ thống & nhật ký',
        href: '/admin/system',
        icon: Settings,
      },
    ],
  },
];

interface AdminSidebarProps {
  activeModule?: string;
  onSelectModule?: (moduleId: string) => void;
}

export default function AdminSidebar({
  activeModule,
  onSelectModule,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    role: string;
  }>({
    name: 'Long Phạm',
    email: 'long.pham@school.edu.vn',
    role: 'Quản trị viên',
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser({
          name: parsed.name || parsed.username || 'Long Phạm',
          email: parsed.email || 'long.pham@school.edu.vn',
          role:
            parsed.role === 'admin'
              ? 'Quản trị viên'
              : parsed.role === 'instructor'
              ? 'Giảng viên'
              : 'Người dùng',
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
      .join('') || 'LP';

  const currentActiveModule =
    activeModule ??
    (pathname.startsWith('/admin/users') || pathname.startsWith('/user-manager')
      ? 'users'
      : pathname.startsWith('/admin/classes') || pathname.startsWith('/admin/classes')
      ? 'classes'
      : pathname.startsWith('/admin/questions') || pathname.startsWith('/question-manager')
      ? 'questions'
      : pathname.startsWith('/admin/schedules') || pathname.startsWith('/schedule-manager')
      ? 'schedules'
      : pathname.startsWith('/admin/monitoring') || pathname.startsWith('/monitoring-manager')
      ? 'monitoring'
      : pathname.startsWith('/admin/reports') || pathname.startsWith('/report-manager')
      ? 'reports'
      : pathname.startsWith('/admin/system') || pathname.startsWith('/system-manager')
      ? 'system'
      : pathname.startsWith('/admin') || pathname === '/dashboard'
      ? 'overview'
      : '');

  const displayedNavGroups = ADMIN_NAV_GROUPS.map((group) => {
    if (currentUser.role === 'Giảng viên') {
      return {
        ...group,
        items: group.items
          .filter((item) => item.id !== 'users' && item.id !== 'system')
          .map((item) =>
            item.id === 'overview'
              ? { ...item, href: '/instructor/dashboard' }
              : item
          ),
      };
    }
    return group;
  }).filter((group) => group.items.length > 0);

  return (
    <aside className="sticky top-0 flex h-screen w-[256px] shrink-0 flex-col justify-between border-r border-slate-200/80 bg-white select-none z-30">
      {/* Phần trên: Logo + Danh sách Module cuộn độc lập */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-5 pb-4">
        {/* Brand Header */}
        <Link
          href={currentUser.role === 'Giảng viên' ? '/instructor/dashboard' : '/admin'}
          onClick={() => {
            if (onSelectModule) {
              onSelectModule('overview');
            }
          }}
          className="mb-6 flex items-center gap-3 px-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563eb] shadow-sm shadow-blue-500/20">
            <svg
              className="h-6 w-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="7.5"
                stroke="currentColor"
                strokeWidth="2.2"
              />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          </div>
          <span className="text-[22px] font-extrabold tracking-wide text-[#2563eb]">
            OCLIDE
          </span>
        </Link>

        {/* Các nhóm điều hướng */}
        <nav className="space-y-6">
          {displayedNavGroups.map((group) => (
            <div key={group.groupLabel} className="space-y-1.5">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {group.groupLabel}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    currentActiveModule !== ''
                      ? currentActiveModule === item.id
                      : pathname === item.href;

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => {
                        if (onSelectModule) {
                          onSelectModule(item.id);
                        }
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13.5px] transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#eff6ff] font-semibold text-[#2563eb]'
                          : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-[#2563eb]' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Phần dưới: Thẻ thông tin Quản trị viên */}
      <div ref={userMenuRef} className="relative shrink-0 p-4 border-t border-slate-100 bg-white">
        {isMenuOpen && (
          <div className="absolute bottom-[calc(100%+8px)] left-3 right-3 z-50 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl shadow-slate-900/10">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
              <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                {currentUser.role}
              </span>
            </div>

            <div className="mt-1.5 space-y-0.5 text-xs font-medium text-slate-700">
              <Link
                href="/admin/users"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-slate-50 hover:text-blue-600"
              >
                <User className="h-4 w-4 text-slate-400" />
                Hồ sơ & Phân quyền
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
          </div>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <span className="text-xs font-bold">⋮</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
