import React, { Suspense } from 'react';
import InstructorCreateRoomView from '@/components/instructor/room/InstructorCreateRoomView';

export default function InstructorRoomBasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-64 items-center justify-center bg-slate-50 text-xs font-semibold text-slate-500 dark:bg-[#0b0f17] dark:text-slate-400">
          Đang tải thiết lập phòng học...
        </div>
      }
    >
      <InstructorCreateRoomView />
    </Suspense>
  );
}
