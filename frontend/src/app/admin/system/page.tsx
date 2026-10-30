'use client';

import React from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import AdminSystemView from '@/components/admin/system/AdminSystemView';

export default function SystemManagerPage() {
  return (
    <div className="flex min-h-screen w-full bg-[#f4f7f9] text-slate-800">
      <AdminSidebar activeModule="system" />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar title="Hệ thống & nhật ký" />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1440px]">
            <AdminSystemView />
          </div>
        </main>
      </div>
    </div>
  );
}
