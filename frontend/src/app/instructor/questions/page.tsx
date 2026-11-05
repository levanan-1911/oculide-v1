'use client';

import React, { Suspense } from 'react';
import InstructorQuestionsManagerView from '@/components/instructor/questions/InstructorQuestionsManagerView';

export default function InstructorQuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs font-semibold text-slate-500 dark:text-slate-400">
          Đang tải ngân hàng câu hỏi...
        </div>
      }
    >
      <InstructorQuestionsManagerView />
    </Suspense>
  );
}
