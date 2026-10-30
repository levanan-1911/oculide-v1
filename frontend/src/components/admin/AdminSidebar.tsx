'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  UserCheck,
  Table2,
  FileCode2,
  Clock,
  Flag,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
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
        href: '/admin/dashboard',
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

  // ── TRẠNG THÁI THU GỌN SIDEBAR (PERSIST VÀO LOCALSTORAGE) ──
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [currentUser, setCurrentUser] = useState<{
    role: string;
  }>({
    role: 'Quản trị viên',
  });

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('oculide_sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }

    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        let roleDisplay = 'Quản trị viên';
        if (parsed.role === 'admin') roleDisplay = 'Quản trị viên';
        else if (parsed.role === 'instructor' || parsed.role === 'teacher') roleDisplay = 'Giảng viên';
        else if (parsed.role === 'student') roleDisplay = 'Sinh viên';
        setCurrentUser({ role: roleDisplay });
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('oculide_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Hỗ trợ phím tắt Ctrl + B (hoặc Cmd + B) để thu gọn / mở rộng nhanh
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapse();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentActiveModule =
    activeModule ??
    (pathname.startsWith('/admin/users') 
      ? 'users'
      : pathname.startsWith('/admin/classes')
      ? 'classes'
      : pathname.startsWith('/admin/questions') 
      ? 'questions'
      : pathname.startsWith('/admin/schedules') 
      ? 'schedules'
      : pathname.startsWith('/admin/monitoring') 
      ? 'monitoring'
      : pathname.startsWith('/admin/reports') 
      ? 'reports'
      : pathname.startsWith('/admin/system') 
      ? 'system'
      : pathname.startsWith('/admin/dashboard') || pathname === '/admin' 
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
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col justify-between border-r border-slate-200/80 bg-white select-none z-30 dark:border-white/10 dark:bg-[#0d1017] transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[72px]' : 'w-[256px]'
      }`}
    >
      {/* Phần trên: Logo + Danh sách Module cuộn độc lập */}
      <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pt-5 pb-4 transition-all ${
        isCollapsed ? 'px-2' : 'px-4'
      }`}>
        {/* Brand Header */}
        <Link
          href={currentUser.role === 'Giảng viên' ? '/instructor/dashboard' : '/admin/dashboard'}
          onClick={() => {
            if (onSelectModule) {
              onSelectModule('overview');
            }
          }}
          title="Oculide LMS"
          className={`mb-6 flex items-center transition-all ${
            isCollapsed ? 'justify-center px-0' : 'gap-3 px-2'
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2563eb] shadow-sm shadow-blue-500/20">
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
          {!isCollapsed && (
            <span className="text-[22px] font-extrabold tracking-wide text-[#2563eb] dark:text-blue-400 truncate">
              OCULIDE
            </span>
          )}
        </Link>

        {/* Các nhóm điều hướng */}
        <nav className="space-y-5">
          {displayedNavGroups.map((group) => (
            <div key={group.groupLabel} className="space-y-1">
              {!isCollapsed ? (
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                  {group.groupLabel}
                </p>
              ) : (
                <div className="my-2 border-t border-slate-100 dark:border-white/5 mx-2" />
              )}
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
                      title={isCollapsed ? item.label : undefined}
                      className={`flex w-full items-center rounded-xl transition-all cursor-pointer ${
                        isCollapsed
                          ? 'justify-center p-2.5'
                          : 'gap-3 px-3.5 py-2.5 text-left text-[13.5px]'
                      } ${
                        isActive
                          ? 'bg-[#eff6ff] font-semibold text-[#2563eb] dark:bg-blue-500/15 dark:text-blue-400 shadow-sm'
                          : 'font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          isActive ? 'text-[#2563eb] dark:text-blue-400 scale-105' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Phần chân Sidebar: Nút Thu gọn / Mở rộng Sidebar */}
      <div className={`shrink-0 border-t border-slate-100 bg-white dark:border-white/10 dark:bg-[#0d1017] transition-all ${
        isCollapsed ? 'p-2' : 'p-3'
      }`}>
        {mounted && (
          <button
            type="button"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Mở rộng menu Sidebar (Ctrl + B)' : 'Thu gọn menu Sidebar (Ctrl + B)'}
            aria-label={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            className={`flex w-full items-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer ${
              isCollapsed
                ? 'h-10 justify-center'
                : 'h-10 justify-between px-3 text-xs font-semibold'
            }`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span className="truncate">Thu gọn menu</span>
                </>
              )}
            </div>
            {!isCollapsed && (
              <kbd className="hidden sm:inline-block rounded bg-slate-200/60 dark:bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 font-normal">
                Ctrl B
              </kbd>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
