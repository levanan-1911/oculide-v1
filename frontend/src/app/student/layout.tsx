"use client";

import { usePathname } from "next/navigation";
import StudentSidebar from "@/components/student/StudentSidebar";
import StudentTopbar from "@/components/student/StudentTopbar";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Nếu là trang phòng thi (exam-room) -> Tự động ẨN hoàn toàn Sidebar & Topbar
  const isExamRoom = pathname.includes("/exam-room");

  if (isExamRoom) {
    return (
      <div className="min-h-screen w-full bg-slate-900 text-slate-100 overflow-hidden">
        {children}
      </div>
    );
  }

  // Giao diện Dashboard chuẩn có Sidebar & Topbar cho các trang khác
  return (
    <div className="min-h-screen bg-slate-50 lg:flex font-sans">
      <StudentSidebar />
      <div className="min-w-0 flex-1 flex flex-col">
        <StudentTopbar />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}