'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  ClipboardCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
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
    groupLabel: 'KHÔNG GIAN THI & HỌC TẬP',
    items: [
      {
        id: 'dashboard',
        label: 'Tổng quan',
        href: '/student',
        icon: LayoutDashboard,
      },
      {
        id: 'schedule',
        label: 'Lịch thi của tôi',
        href: '/student/schedule',
        icon: CalendarDays,
      },
      {
        id: 'exams',
        label: 'Phòng thi',
        href: '/student/exams',
        icon: BookOpen,
      },
    ],
  },
  {
    groupLabel: 'KẾT QUẢ & GIÁM SÁT',
    items: [
      {
        id: 'submissions',
        label: 'Bài nộp & Kết quả',
        href: '/student/submissions',
        icon: ClipboardCheck,
      },
      {
        id: 'violations',
        label: 'Cảnh báo AI',
        href: '/student/violations',
        icon: ShieldAlert,
      },
    ],
  },
];

export default function StudentSidebar() {
  const pathname = usePathname();

  // ── TRẠNG THÁI THU GỌN SIDEBAR (PERSIST VÀO LOCALSTORAGE) ──
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('oculide_student_sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsCollapsed((prev) => {
          const next = !prev;
          localStorage.setItem('oculide_student_sidebar_collapsed', String(next));
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('oculide_student_sidebar_collapsed', String(next));
      return next;
    });
  };

  const isItemActive = (href: string) => {
    if (href === '/student') {
      return pathname === '/student' || pathname === '/student/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`relative flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white font-sans text-slate-800 shadow-sm z-30 select-none dark:border-white/10 dark:bg-[#0d1017] dark:text-slate-200 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Header Logo */}
      <div
        className={`flex h-[68px] shrink-0 items-center border-b border-slate-100 dark:border-white/10 transition-all ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-5'
        }`}
      >
        <Link
          href="/student"
          className="flex items-center gap-2.5 transition hover:opacity-90"
          title="Oculide Sinh viên"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>
          {!isCollapsed && (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  OCULIDE
                </span>
                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40">
                  SV
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Cổng Sinh Viên
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <nav className="space-y-5">
          {STUDENT_NAV_GROUPS.map((group) => (
            <div key={group.groupLabel} className="space-y-1">
              {!isCollapsed ? (
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                  {group.groupLabel}
                </p>
              ) : (
                <div className="my-2 border-t border-slate-100 dark:border-white/5" />
              )}

              {group.items.map((item) => {
                const active = isItemActive(item.href);
                const IconComponent = item.icon;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center gap-3 rounded-xl transition-all duration-150 cursor-pointer ${
                      isCollapsed
                        ? 'h-11 justify-center px-0'
                        : 'h-11 px-3 text-xs font-semibold'
                    } ${
                      active
                        ? 'bg-[#eff6ff] text-[#2563eb] shadow-xs dark:bg-blue-500/15 dark:text-blue-400 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200'
                    }`}
                  >
                    <IconComponent
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        active
                          ? 'text-[#2563eb] dark:text-blue-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Phần chân Sidebar: Nút Thu gọn / Mở rộng Sidebar (Đồng bộ chuẩn 100% như Admin & Instructor) */}
      <div
        className={`shrink-0 border-t border-slate-100 bg-white dark:border-white/10 dark:bg-[#0d1017] transition-all ${
          isCollapsed ? 'p-2' : 'p-3'
        }`}
      >
        {mounted && (
          <button
            type="button"
            onClick={toggleCollapse}
            title={
              isCollapsed
                ? 'Mở rộng menu Sidebar (Ctrl + B)'
                : 'Thu gọn menu Sidebar (Ctrl + B)'
            }
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
