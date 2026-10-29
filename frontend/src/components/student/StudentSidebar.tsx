"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Code2,
  LayoutDashboard,
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

export default function StudentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white shadow-2xs select-none">
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
            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-100">
              STUDENT
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Hệ thống thi lập trình</p>
        </div>
      </Link>

      {/* Main Navigation Container */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 scrollbar-none">
        <div>
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Không gian học tập
          </p>

          <nav className="space-y-1">
            {mainNavigation.map((item) => {
              const active =
                item.href === "/student"
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

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
                      active ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>

                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-xs" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Area: Trạng thái vi thiết bị + Profile */}
      <div className="border-t border-slate-100 p-3 space-y-2">
        {/* Mini Health Strip */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/60 p-2.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-700">AI System</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[9px] font-bold">
            <span className="rounded bg-emerald-100/80 px-1.5 py-0.5 text-emerald-700">CAM ✓</span>
            <span className="rounded bg-emerald-100/80 px-1.5 py-0.5 text-emerald-700">MIC ✓</span>
          </div>
        </div>

        <Link
          href="/student/profile"
          className={`flex items-center justify-between rounded-xl p-2 transition ${
            pathname.startsWith("/student/profile")
              ? "bg-blue-50 border border-blue-100"
              : "hover:bg-slate-50 border border-transparent"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-xs">
              SV
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">Nguyễn Minh Anh</p>
              <p className="text-[10px] font-mono text-slate-400 truncate">SE184801</p>
            </div>
          </div>
          <UserRound size={16} className="text-slate-400 shrink-0 ml-1" />
        </Link>

        <button
          type="button"
          onClick={() => alert("Chức năng cài đặt hệ thống đang hoàn thiện.")}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100/70 hover:text-slate-800"
        >
          <Settings size={16} className="text-slate-400" />
          <span>Cài đặt hệ thống</span>
        </button>
      </div>
    </aside>
  );
}