'use client';

import React from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { Clock } from 'lucide-react';

export default function ScheduleManagerPage() {
  return (
    <div className="flex min-h-screen w-full bg-[#f4f7f9] text-slate-800">
      <AdminSidebar activeModule="schedules" />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar title="Lịch & phiên kiểm tra" />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1440px]">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Clock className="h-7 w-7" />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-blue-600">Quản lý đào tạo</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Lịch &amp; phiên kiểm tra
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Đường dẫn chuẩn: <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-blue-600 font-mono">/schedule-manager</code>. Khung điều hướng đã sẵn sàng để thiết kế giao diện chi tiết.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
              >
                Quay lại trang Tổng quan
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

