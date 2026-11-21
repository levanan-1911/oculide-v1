'use client';

import React, { Suspense } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import InstructorQuestionsManagerView from '@/components/instructor/questions/InstructorQuestionsManagerView';

export default function AdminQuestionsPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-neutral-950 font-sans text-slate-800 dark:text-slate-100 transition-colors">
      <AdminSidebar activeModule="questions" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar title="Ngân hàng đề thi & Quản lý Đề cuối kỳ" />
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-7">
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                Đang tải ngân hàng đề thi...
              </div>
            }
          >
            <InstructorQuestionsManagerView />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
