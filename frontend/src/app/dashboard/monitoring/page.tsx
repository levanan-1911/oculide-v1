'use client';

import React from 'react';
import Link from 'next/link';

export default function DashboardMonitoringPage() {
  return (
    <div className="mx-auto max-w-[1440px]">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Module: Giám sát &amp; hỗ trợ
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Đường dẫn: <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-blue-600 font-mono">/dashboard/monitoring</code>. Khung điều hướng đã sẵn sàng để thiết kế giao diện chi tiết.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#2563eb] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
        >
          Quay lại trang Tổng quan
        </Link>
      </div>
    </div>
  );
}

