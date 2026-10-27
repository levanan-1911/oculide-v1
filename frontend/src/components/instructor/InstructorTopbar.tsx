'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Search, GraduationCap } from 'lucide-react';

interface InstructorTopbarProps {
  title?: string;
}

export default function InstructorTopbar({
  title = 'Không gian Giảng viên',
}: InstructorTopbarProps) {
  const [initials, setInitials] = useState('GV');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = parsed.name || parsed.username || 'Giảng viên';
        const init = name
          .split(' ')
          .filter(Boolean)
          .slice(-2)
          .map((w: string) => w[0]?.toUpperCase())
          .join('') || 'GV';
        setInitials(init);
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <header className="flex h-[68px] w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-6 lg:px-8">
      {/* Tiêu đề bên trái */}
      <div className="flex items-center gap-3">
        <h1 className="text-[17px] font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
          <GraduationCap className="h-3.5 w-3.5" />
          Giảng viên
        </span>
      </div>

      {/* Cụm tìm kiếm + thông báo + avatar bên phải */}
      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm lớp học, bài lab, đề thi..."
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

        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm"
        >
          {initials}
        </div>
      </div>
    </header>
  );
}

