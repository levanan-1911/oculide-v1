'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import InstructorSidebar, { INSTRUCTOR_NAV_GROUPS } from '@/components/instructor/InstructorSidebar';
import InstructorTopbar from '@/components/instructor/InstructorTopbar';

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Tìm tiêu đề tương ứng với route
  const currentItem = INSTRUCTOR_NAV_GROUPS.flatMap((g) => g.items).find((item) =>
    item.href === '/instructor/dashboard'
      ? pathname === '/instructor' || pathname === '/instructor/dashboard'
      : pathname.startsWith(item.href)
  );

  const title = currentItem ? currentItem.label : 'Không gian Giảng viên';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f7f9] font-sans text-slate-800">
      <InstructorSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <InstructorTopbar title={title} />
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}

