
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Code2,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldAlert,
  UserRound,
} from "lucide-react";

const mainNavigation = [
  {
    label: "Tổng quan",
    href: "/student",
    icon: LayoutDashboard,
  },
  {
    label: "Lịch thi của tôi",
    href: "/student/schedule",
    icon: CalendarDays,
  },
  {
    label: "Phòng thi",
    href: "/student/exams",
    icon: BookOpen,
  },
  {
    label: "Bài nộp & Kết quả",
    href: "/student/submissions",
    icon: ClipboardCheck,
  },
  {
    label: "Cảnh báo AI",
    href: "/student/violations",
    icon: ShieldAlert,
  },
];

interface StudentSidebarProps {
  studentName?: string;
  studentCode?: string;
  onLogout?: () => void | Promise<void>;
}

export default function StudentSidebar({
  studentName = "Sinh viên",
  studentCode = "",
  onLogout,
}: StudentSidebarProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!onLogout || isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await onLogout();
      setIsMenuOpen(false);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white shadow-sm select-none">
      {/* Brand Header */}
      <Link
        href="/student"
        className="flex h-16 items-center gap-3 border-b border-slate-100 px-5 transition hover:opacity-90"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-md shadow-blue-500/20">
          <Code2 size={22} />
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Oculide
            </span>

            <span className="rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
              STUDENT
            </span>
          </div>

          <p className="text-[11px] font-medium text-slate-400">
            Hệ thống thi lập trình
          </p>
        </div>
      </Link>

      {/* Main Navigation */}
      <div className="flex-1 space-y-6 overflow-y-auto px-3.5 py-4">
        <div>
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Không gian học tập
          </p>

          <nav className="space-y-1">
            {mainNavigation.map((item) => {
              const active =
                item.href === "/student"
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150 ${
                    active
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    size={18}
                    className={`shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                      active
                        ? "text-white"
                        : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />

                  <span className="truncate">{item.label}</span>

                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="space-y-2 border-t border-slate-100 p-3">
        {/* AI System Status - visual placeholder */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50 p-2.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-400" />
            </span>

            <span className="font-semibold text-slate-700">
              AI System
            </span>
          </div>

          <span className="text-[10px] font-medium text-slate-500">
            Chưa kiểm tra thiết bị
          </span>
        </div>

        {/* Student Profile */}
        <div className="rounded-xl border border-slate-100">
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-controls="student-profile-menu"
            className="flex w-full items-center justify-between rounded-xl p-2 text-left transition hover:bg-slate-50"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                SV
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-800">
                  {studentName}
                </p>

                {studentCode && (
                  <p className="truncate font-mono text-[10px] text-slate-400">
                    {studentCode}
                  </p>
                )}
              </div>
            </div>

            <ChevronDown
              size={16}
              className={`ml-1 shrink-0 text-slate-400 transition-transform ${
                isMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isMenuOpen && (
            <div
              id="student-profile-menu"
              className="space-y-0.5 border-t border-slate-100 p-1.5 text-xs font-medium text-slate-700"
            >
              <Link
                href="/student/profile"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition hover:bg-slate-50 hover:text-blue-600"
              >
                <UserRound size={16} className="text-slate-400" />
                Hồ sơ cá nhân
              </Link>

              <Link
                href="/student/profile?tab=security"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition hover:bg-slate-50 hover:text-blue-600"
              >
                <Settings size={16} className="text-slate-400" />
                Đổi mật khẩu
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={!onLogout || isLoggingOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LogOut size={16} />
                {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
              </button>
            </div>
          )}
        </div>

        {/* Settings */}
        <Link
          href="/student/profile?tab=settings"
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100/70 hover:text-slate-800"
        >
          <Settings size={16} className="text-slate-400" />
          <span>Cài đặt hệ thống</span>
        </Link>
      </div>
    </aside>
  );
}
