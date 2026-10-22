'use client';

import React from 'react';
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
        href: '/admin?module=users',
        icon: UserCheck,
      },
      {
        id: 'classes',
        label: 'Lớp & sinh viên',
        href: '/class-manager',
        icon: Table2,
      },
      {
        id: 'questions',
        label: 'Đề & câu hỏi',
        href: '/admin?module=questions',
        icon: FileCode2,
      },
      {
        id: 'schedules',
        label: 'Lịch & phiên kiểm tra',
        href: '/admin?module=schedules',
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
        href: '/admin?module=monitoring',
        icon: Flag,
      },
      {
        id: 'reports',
        label: 'Kết quả & báo cáo',
        href: '/admin?module=reports',
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
        href: '/admin?module=system',
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
  const currentActiveModule =
    activeModule ??
    (pathname === '/class-manager'
      ? 'classes'
      : pathname === '/admin'
      ? 'overview'
      : '');

  return (
    <aside className="flex h-screen w-[256px] shrink-0 flex-col justify-between border-r border-slate-200/80 bg-white select-none">
      {/* Phần trên: Logo + Danh sách Module */}
      <div className="flex flex-col overflow-y-auto px-4 pt-5 pb-4">
        {/* Brand Header: Icon mắt tròn trắng trên nền xanh + chữ OCLIDE */}
        <Link
          href="/admin"
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
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.groupLabel} className="space-y-1.5">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {group.groupLabel}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentActiveModule === item.id;
                  const itemClassName = `flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13.5px] transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#eff6ff] font-semibold text-[#2563eb]'
                      : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`;
                  const itemContents = (
                    <>
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-[#2563eb]' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </>
                  );

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => {
                        if (onSelectModule) {
                          onSelectModule(item.id);
                        }
                      }}
                      className={itemClassName}
                    >
                      {itemContents}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Phần dưới: Thẻ thông tin Quản trị viên */}
      <div className="p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl border border-blue-200/90 bg-[#f8faff] px-3.5 py-3 text-left transition-colors hover:bg-blue-50/60 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100/90 text-xs font-bold text-[#2563eb]">
              LP
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                Long Phạm
              </p>
              <p className="truncate text-xs text-slate-400">Quản trị viên</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#2563eb]" />
        </button>
      </div>
    </aside>
  );
}
