'use client';

import React from 'react';
import { Bell, Search } from 'lucide-react';

interface AdminTopbarProps {
  title?: string;
}

export default function AdminTopbar({
  title = 'Tổng quan quản trị',
}: AdminTopbarProps) {
  return (
    <header className="flex h-[68px] w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-6 lg:px-8">
      {/* Tiêu đề thanh Topbar bên trái */}
      <h1 className="text-[17px] font-bold tracking-tight text-slate-900">
        {title}
      </h1>

      {/* Cụm tìm kiếm + thông báo + avatar bên phải */}
      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm lớp, lịch, tài khoản..."
            className="h-9 w-[260px] rounded-full border border-slate-200/70 bg-[#f4f7f9] pl-9 pr-4 text-xs text-slate-700 placeholder-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none md:w-[310px]"
          />
        </div>

        <button
          type="button"
          aria-label="Thông báo"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb] transition-colors hover:bg-blue-100/80 cursor-pointer"
        >
          <Bell className="h-4 w-4" />
        </button>

        <button
          type="button"
          aria-label="Tài khoản quản trị"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eff6ff] text-xs font-bold text-[#2563eb] transition-colors hover:bg-blue-100/80 cursor-pointer"
        >
          LP
        </button>
      </div>
    </header>
  );
}

