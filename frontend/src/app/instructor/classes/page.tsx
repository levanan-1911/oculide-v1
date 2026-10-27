import React, { Suspense } from 'react';
import ClassManagerView from '@/components/admin/ClassManagerView';

export default function InstructorClassesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs font-semibold text-slate-500">
          Đang tải danh sách lớp học...
        </div>
      }
    >
      <ClassManagerView hideLayout={true} role="instructor" />
    </Suspense>
  );
} 
