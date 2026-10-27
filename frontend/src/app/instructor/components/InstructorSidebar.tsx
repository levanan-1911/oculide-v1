"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  ClipboardList,
  CalendarClock,
  Flag,
  BookOpen,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

const menuGroups = [
  {
    title: "QUẢN LÝ ĐÀO TẠO",
    items: [
      {
        label: "Lớp & sinh viên",
        href: "/instructor/class-manager",
        icon: LayoutGrid,
      },
      {
        label: "Đề & câu hỏi",
        href: "/instructor/questions",
        icon: ClipboardList,
      },
      {
        label: "Lịch & phiên kiểm tra",
        href: "/instructor/room",
        icon: CalendarClock,
      },
    ],
  },
  {
    title: "THEO DÕI & ĐÁNH GIÁ",
    items: [
      {
        label: "Giám sát & hỗ trợ",
        href: "/instructor/monitoring",
        icon: Flag,
      },
      {
        label: "Kết quả & báo cáo",
        href: "/instructor/results",
        icon: BookOpen,
      },
    ],
  },
];

type InstructorSidebarProps = {
  activePage?: "room" | "questions";
};

export default function InstructorSidebar({
  activePage,
}: InstructorSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/instructor") {
      return pathname === href;
    }

    if (href === "/instructor/questions") {
      return pathname.startsWith("/instructor/questions");
    }

    if (href === "/instructor/room") {
      return pathname.startsWith("/instructor/room");
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const commonLinkClass =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors";

  return (
    <aside className="hidden h-screen w-[236px] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white px-3 py-5 md:flex">
      <Link
        href="/instructor"
        className="flex items-center gap-3 px-2 pb-7"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <ShieldAlert className="h-5 w-5" />
        </span>
        <span className="text-xl font-extrabold tracking-tight text-blue-700">
          OCLIDE
        </span>
      </Link>

      <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        KHÔNG GIAN QUẢN TRỊ
      </p>

      <nav
        aria-label="Điều hướng giảng viên"
        className="mt-3 space-y-1"
      >
        <Link
          href="/instructor"
          aria-current={isActive("/instructor") ? "page" : undefined}
          className={`${commonLinkClass} ${
            isActive("/instructor")
              ? "bg-blue-50 font-semibold text-blue-700"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <LayoutGrid className="h-4 w-4 shrink-0" />
          <span>Tổng quan</span>
        </Link>

        {menuGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`${commonLinkClass} ${
                      active
                        ? "bg-blue-50 font-semibold text-blue-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-6">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            LP
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-slate-800">
              Long Phạm
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Quản trị viên
            </p>
          </div>

          <ChevronRight className="h-4 w-4 shrink-0 text-blue-600" />
        </div>
      </div>
    </aside>
  );
}