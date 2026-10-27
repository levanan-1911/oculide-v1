'use client';

import React, { Suspense } from 'react';
import QuestionsManagerView from '@/components/admin/QuestionsManagerView';

export default function InstructorQuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs font-semibold text-slate-500">
          Đang tải ngân hàng câu hỏi...
        </div>
      }
    >
      <QuestionsManagerView />
    </Suspense>
  );
}

