"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  ClipboardCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
    groupLabel: "KHÔNG GIAN HỌC TẬP",
    items: [
      {
        id: "overview",
        label: "Tổng quan",
        href: "/student",
        icon: LayoutDashboard,
      },
      {
        id: "schedule",
        label: "Lịch thi của tôi",
        href: "/student/schedule",
        icon: CalendarDays,
      },
      {
        id: "exams",
        label: "Phòng thi & bài tập",
        href: "/student/exams",
        icon: BookOpen,
      },
      {
        id: "submissions",
        label: "Bài nộp & kết quả",
        href: "/student/submissions",
        icon: ClipboardCheck,
      },
      {
        id: "violations",
        label: "Cảnh báo vi phạm AI",
        href: "/student/violations",
        icon: ShieldAlert,
      },
    ],
  },
];

interface StudentSidebarProps {
  studentName?: string;
  studentCode?: string;
  activeModule?: string;
  onLogout?: () => void | Promise<void>;
}

export default function StudentSidebar({
  activeModule,
}: StudentSidebarProps) {
  const pathname = usePathname();

  // ── TRẠNG THÁI THU GỌN SIDEBAR (PERSIST VÀO LOCALSTORAGE) ──
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("oculide_student_sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("oculide_student_sidebar_collapsed", String(next));
      return next;
    });
  };

  // Hỗ trợ phím tắt Ctrl + B (hoặc Cmd + B) để thu gọn / mở rộng nhanh
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapse();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const currentActiveModule =
    activeModule ??
    (pathname === "/student"
      ? "overview"
      : pathname.startsWith("/student/schedule")
      ? "schedule"
      : pathname.startsWith("/student/exams") || pathname.startsWith("/student/exam")
      ? "exams"
      : pathname.startsWith("/student/submissions")
      ? "submissions"
      : pathname.startsWith("/student/violations")
      ? "violations"
      : "");

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col justify-between border-r border-slate-200/80 bg-white select-none z-30 dark:border-white/10 dark:bg-[#0d1017] transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-[72px]" : "w-[256px]"
      }`}
    >
      {/* Phần trên: Logo + Danh sách Module cuộn độc lập */}
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pt-5 pb-4 transition-all ${
          isCollapsed ? "px-2" : "px-4"
        }`}
      >
        {/* Brand Header */}
        <Link
          href="/student"
          title="Oculide LMS - Sinh viên"
          className={`mb-6 flex items-center transition-all ${
            isCollapsed ? "justify-center px-0" : "gap-3 px-2"
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
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[22px] font-extrabold tracking-wide text-[#2563eb] dark:text-blue-400 truncate">
                OCULIDE
              </span>
              <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40">
                SV
              </span>
            </div>
          )}
        </Link>

        {/* Các nhóm điều hướng */}
        <nav className="space-y-5">
          {STUDENT_NAV_GROUPS.map((group) => (
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
                    currentActiveModule !== ""
                      ? currentActiveModule === item.id
                      : pathname === item.href;

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex w-full items-center rounded-xl transition-all cursor-pointer ${
                        isCollapsed
                          ? "justify-center p-2.5"
                          : "gap-3 px-3.5 py-2.5 text-left text-[13.5px]"
                      } ${
                        isActive
                          ? "bg-[#eff6ff] font-semibold text-[#2563eb] dark:bg-blue-500/15 dark:text-blue-400 shadow-sm"
                          : "font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          isActive
                            ? "text-[#2563eb] dark:text-blue-400 scale-105"
                            : "text-slate-400 dark:text-slate-500"
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
      <div className="border-t border-slate-200/80 p-3 dark:border-white/10 transition-colors">
        <button
          type="button"
          onClick={toggleCollapse}
          title={isCollapsed ? "Mở rộng menu (Ctrl+B)" : "Thu gọn menu (Ctrl+B)"}
          aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          className={`flex w-full items-center rounded-xl py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white transition-all cursor-pointer ${
            isCollapsed ? "justify-center px-0" : "justify-between px-3"
          }`}
        >
          <div className="flex items-center gap-2">
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            )}
            {!isCollapsed && <span>Thu gọn menu</span>}
          </div>
          {!isCollapsed && (
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              Ctrl B
            </kbd>
          )}
        </button>
      </div>
    </aside>
  );
}
