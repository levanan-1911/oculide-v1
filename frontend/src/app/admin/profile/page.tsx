'use client';

import React from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import ProfileView from '@/components/profile/ProfileView';

export default function AdminProfilePage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f7f9] font-sans text-slate-800">
      <AdminSidebar activeModule="profile" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar title="Hồ sơ Quản trị viên" />
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-7">
          <ProfileView role="admin" />
        </main>
      </div>
    </div>
  );
}
