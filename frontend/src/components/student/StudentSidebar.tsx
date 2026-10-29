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
  ShieldCheck,
  UserRound,
} from "lucide-react";

const navigation = [
  {
    label: "Tổng quan",
    href: "/student",
    icon: LayoutDashboard,
  },
  {
    label: "Lịch thi",
    href: "/student/schedule",
    icon: CalendarDays,
  },
  {
    label: "Phòng thi",
    href: "/student/exams",
    icon: BookOpen,
  },
  {
    label: "Bài nộp",
    href: "/student/submissions",
    icon: ClipboardCheck,
  },
  {
    label: "Trình lập trình",
    href: "/student/workspace",
    icon: Code2,
  },
];

export default function StudentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <Link
        href="/student"
        className="flex h-20 items-center gap-3 border-b border-slate-100 px-6"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Code2 size={23} />
        </div>
        <div>
          <p className="text-xl font-bold tracking-tight text-slate-900">
            Oculide
          </p>
          <p className="text-xs text-slate-500">Student Portal</p>
        </div>
      </Link>

      <div className="px-4 pt-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Không gian học tập
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => {
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
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto px-4 pb-5">
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <ShieldCheck size={22} className="text-blue-600" />
          <p className="mt-3 text-sm font-semibold text-slate-800">
            AI Proctoring
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Kiểm tra webcam và trạng thái giám sát trước khi vào thi.
          </p>
        </div>

        <Link
          href="/student/profile"
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
            pathname.startsWith("/student/profile")
              ? "bg-blue-50 text-blue-700"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <UserRound size={19} />
          Hồ sơ cá nhân
        </Link>

        <button
          type="button"
          onClick={() => alert("Cài đặt sẽ được phát triển ở bước sau.")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          <Settings size={19} />
          Cài đặt
        </button>
      </div>
    </aside>
  );
}