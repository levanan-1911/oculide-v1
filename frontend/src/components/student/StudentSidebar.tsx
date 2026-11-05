"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Code2,
  LayoutDashboard,
  LogOut,
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
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      if (onLogout) {
        await onLogout();
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem("oculide_token");
        localStorage.removeItem("oculide_user");
        localStorage.removeItem("oculide_refresh_token");
      }
      setIsMenuOpen(false);
      router.push("/login");
    } catch {
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0d1017] shadow-sm select-none transition-colors">
      {/* Brand Header */}
      <Link
        href="/student"
        className="flex h-16 items-center gap-3 border-b border-slate-100 dark:border-white/5 px-5 transition hover:opacity-90"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-md shadow-blue-500/20">
          <Code2 size={22} />
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Oculide
            </span>

            <span className="rounded-md border border-blue-100 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
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
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    className={`shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                      active
                        ? "text-white"
                        : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
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

      {/* Footer User Section */}
      <div className="space-y-2 border-t border-slate-100 dark:border-white/5 p-3">
        {/* AI System Status - Link trực tiếp tới kiểm tra thiết bị */}
        <Link
          href="/student/device-check"
          title="Kiểm tra Micro, Camera, Mạng trước khi thi"
          className="flex items-center justify-between rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-2.5 text-[11px] hover:bg-slate-100/70 dark:hover:bg-white/[0.05] transition"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>

            <span className="font-semibold text-slate-700 dark:text-slate-300">
              AI System
            </span>
          </div>

          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            Kiểm tra thiết bị →
          </span>
        </Link>

        {/* Student Profile Card & Menu */}
        <div className="rounded-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#121824]">
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-controls="student-profile-menu"
            className="flex w-full items-center justify-between rounded-xl p-2 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/20 text-xs font-bold text-blue-700 dark:text-blue-300">
                SV
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
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
              className="space-y-0.5 border-t border-slate-100 dark:border-white/5 p-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              <Link
                href="/student/profile"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-blue-600 dark:hover:text-blue-400"
              >
                <UserRound size={16} className="text-slate-400" />
                <span>Hồ sơ cá nhân</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer disabled:opacity-50"
              >
                <LogOut size={16} />
                <span>{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
