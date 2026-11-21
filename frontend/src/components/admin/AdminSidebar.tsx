'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  UserCheck,
  Table2,
  Clock,
  FileCode2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import BrandLogo from '@/components/common/BrandLogo';

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
        id: 'schedules',
        label: 'Lịch & phiên kiểm tra',
        href: '/admin/schedules',
        icon: Clock,
      },
      {
        id: 'questions',
        label: 'Ngân hàng đề & Đề cuối kỳ',
        href: '/admin/questions',
        icon: FileCode2,
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
      className={`sticky top-0 flex h-screen shrink-0 flex-col justify-between border-r border-slate-300 bg-white select-none z-30 dark:border-white/10 dark:bg-neutral-900 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[72px]' : 'w-[256px]'
        }`}
    >
      {/* Phần trên: Logo + Danh sách Module cuộn độc lập */}
      <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pt-5 pb-4 transition-all ${isCollapsed ? 'px-2' : 'px-4'
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
          className={`mb-6 flex items-center transition-all ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-2'
            }`}
        >
          <BrandLogo size={50} className="h-[50px] w-[50px] shrink-0 rounded-md object-cover shadow-sm" />
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="rounded border border-brand-300 bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
                ADMIN
              </span>
            </div>
          )}
        </Link>

        {/* Các nhóm điều hướng */}
        <nav className="space-y-5">
          {displayedNavGroups.map((group) => (
            <div key={group.groupLabel} className="space-y-1">
              {!isCollapsed ? (
                <p className="px-3 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#9F9690] truncate">
                  {group.groupLabel}
                </p>
              ) : (
                <div className="my-2 border-t border-slate-300 dark:border-white/5 mx-2" />
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
                      className={`flex w-full items-center rounded-md transition-all cursor-pointer ${isCollapsed
                        ? 'justify-center p-2.5'
                        : 'gap-3 px-3.5 py-2.5 text-left text-[13.5px]'
                        } ${isActive
                          ? 'system-selected-module font-semibold border-l-2'
                          : 'font-medium text-[#5A5555] dark:text-[#9F9690] hover:bg-slate-900/5 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white'
                        }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-[#9F9690]'
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
      <div className={`shrink-0 border-t border-slate-300 bg-white dark:border-white/10 dark:bg-neutral-900 transition-all ${isCollapsed ? 'p-2' : 'p-3'
        }`}>
        {mounted && (
          <button
            type="button"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Mở rộng menu Sidebar (Ctrl + B)' : 'Thu gọn menu Sidebar (Ctrl + B)'}
            aria-label={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            className={`flex w-full items-center rounded-md border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer ${isCollapsed
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
