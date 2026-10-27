import React, { Suspense } from 'react';
import ClassManagerView from '@/components/admin/ClassManagerView';

export default function AdminClassesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f4f7f9] text-sm text-slate-500">
          Đang tải dữ liệu lớp học...
        </div>
      }
    >
      <ClassManagerView hideLayout={false} role="admin" />
    </Suspense>
  );
}
