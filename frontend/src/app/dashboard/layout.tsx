'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar, { ADMIN_NAV_GROUPS } from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Tìm tiêu đề Topbar tương ứng với route hiện tại
  const currentItem = ADMIN_NAV_GROUPS.flatMap((g) => g.items).find((item) =>
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.href)
  );

  const title = currentItem ? currentItem.label : 'Tổng quan quản trị';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f7f9] font-sans text-slate-800">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar title={title} />
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}

