'use client';

import React from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { ShieldAlert, ArrowLeft, Clock } from 'lucide-react';

export default function AdminQuestionsPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f7f9] dark:bg-[#090a0f] font-sans text-slate-800 dark:text-slate-100 transition-colors">
      <AdminSidebar activeModule="dashboard" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar title="Quy chế khảo thí & Đề thi" />
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-7 flex items-center justify-center">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-lg dark:border-white/10 dark:bg-[#0d1017]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 mb-4">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Phân quyền chuyên môn Khảo thí
            </h2>
            <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ngân hàng đề thi, câu hỏi và bộ kiểm thử (test cases) là tài sản chuyên môn bảo mật của <strong>Giảng viên và Bộ môn</strong>. Quản trị viên không tham gia biên soạn hay chỉnh sửa nội dung đề thi.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/admin/schedules"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
              >
                <Clock className="h-4 w-4" />
                <span>Xem Lịch &amp; Phiên kiểm tra</span>
              </Link>
              <Link
                href="/admin/dashboard"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Về Bảng điều khiển</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
