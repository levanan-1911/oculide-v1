import React, { Suspense } from 'react';
import InstructorCreateRoomView from '@/components/instructor/room/InstructorCreateRoomView';

export default function InstructorRoomBasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs font-semibold text-slate-500">
          Đang tải thiết lập phòng học...
        </div>
      }
    >
      <InstructorCreateRoomView />
    </Suspense>
  );
}
