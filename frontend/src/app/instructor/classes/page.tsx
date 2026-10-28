import React, { Suspense } from 'react';
import InstructorClassManagerView from '@/components/instructor/classes/InstructorClassManagerView';

export default function InstructorClassesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs font-semibold text-slate-500">
          Đang tải danh sách lớp học...
        </div>
      }
    >
      <InstructorClassManagerView />
    </Suspense>
  );
} 
