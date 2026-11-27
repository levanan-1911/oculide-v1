'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Table2,
  FileCode2,
  Clock,
  Flag,
  BookOpen,
  BarChart3,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import BrandLogo from '@/components/common/BrandLogo';

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
        label: 'Lớp & sinh viên',
        href: '/instructor/classes',
        icon: Table2,
      },
      {
        id: 'questions',
        label: 'Đề & câu hỏi',
        href: '/instructor/questions',
        icon: FileCode2,
      },
      {
        id: 'schedules',
        label: 'Lịch & phiên kiểm tra',
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
        label: 'Kết quả & báo cáo vi phạm',
        href: '/instructor/reports',
        icon: BookOpen,
      },
    ],
  },
];

interface InstructorSidebarProps {
  activeModule?: string;
  onSelectModule?: (moduleId: string) => void;
}

export default function InstructorSidebar({
  activeModule,
  onSelectModule,
}: InstructorSidebarProps) {
  const pathname = usePathname();

  // ── TRẠNG THÁI THU GỌN SIDEBAR (PERSIST VÀO LOCALSTORAGE) ──
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('oculide_instructor_sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('oculide_instructor_sidebar_collapsed', String(next));
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
    (pathname.startsWith('/instructor/classes')
      ? 'classes'
      : pathname.startsWith('/instructor/questions')
      ? 'questions'
      : pathname.startsWith('/instructor/schedules') || pathname.startsWith('/instructor/room')
      ? 'schedules'
      : pathname.startsWith('/instructor/monitoring')
      ? 'monitoring'
      : pathname.startsWith('/instructor/reports')
      ? 'reports'
      : pathname.startsWith('/instructor/profile')
      ? 'profile'
      : 'overview');

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col justify-between border-r border-slate-300 bg-white select-none z-30 dark:border-white/10 dark:bg-neutral-900 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[72px]' : 'w-[256px]'
      }`}
    >
      {/* Phần trên: Logo + Danh sách Module cuộn độc lập */}
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pt-5 pb-4 transition-all ${
          isCollapsed ? 'px-2' : 'px-4'
        }`}
      >
        {/* Brand Header */}
        <Link
          href="/instructor/dashboard"
          onClick={() => {
            if (onSelectModule) {
              onSelectModule('overview');
            }
          }}
          title="Oculide LMS - Giảng viên"
          className={`mb-6 flex items-center transition-all ${
            isCollapsed ? 'justify-center px-0' : 'gap-3 px-2'
          }`}
        >
          <BrandLogo size={50} className="h-[50px] w-[50px] shrink-0 rounded-md object-cover shadow-sm" />
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="rounded border border-brand-300 bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
                GV
              </span>
            </div>
          )}
        </Link>

        {/* Các nhóm điều hướng */}
        <nav className="space-y-5">
          {INSTRUCTOR_NAV_GROUPS.map((group) => (
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
                  const isActive = currentActiveModule === item.id;

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
                      className={`flex w-full items-center rounded-md transition-all cursor-pointer ${
                        isCollapsed
                          ? 'justify-center p-2.5'
                          : 'gap-3 px-3.5 py-2.5 text-left text-[13.5px]'
                      } ${
                        isActive
                          ? 'system-selected-module font-semibold border-l-2'
                          : 'font-medium text-[#5A5555] dark:text-[#9F9690] hover:bg-slate-900/5 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-500 dark:text-[#9F9690]'
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

      {/* Phần dưới: Nút thu gọn / mở rộng Sidebar đồng bộ Admin */}
      <div className="border-t border-slate-300 p-3 dark:border-white/10 transition-colors">
        <button
          type="button"
          onClick={toggleCollapse}
          title={isCollapsed ? 'Mở rộng menu (Ctrl+B)' : 'Thu gọn menu (Ctrl+B)'}
          aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          className={`flex w-full items-center rounded-md py-2 text-xs font-semibold text-[#5A5555] hover:bg-stone-50 hover:text-[#2A282D] dark:text-[#9F9690] dark:hover:bg-white/5 dark:hover:text-white transition-all cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : 'justify-between px-3'
          }`}
        >
          <div className="flex items-center gap-2">
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-slate-500 dark:text-[#9F9690]" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-slate-500 dark:text-[#9F9690]" />
            )}
            {!isCollapsed && <span>Thu gọn menu</span>}
          </div>
          {!isCollapsed && (
            <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-[#9F9690]">
              Ctrl B
            </kbd>
          )}
        </button>
      </div>
    </aside>
  );
}
