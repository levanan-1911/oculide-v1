"use client";

import { usePathname } from "next/navigation";
import StudentSidebar, { STUDENT_NAV_GROUPS } from "@/components/student/StudentSidebar";
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

  const currentItem = STUDENT_NAV_GROUPS.flatMap((g) => g.items).find((item) =>
    item.href === "/student"
      ? pathname === "/student" || pathname === "/student/dashboard"
      : pathname.startsWith(item.href)
  );

  const title = currentItem
    ? currentItem.label
    : pathname.startsWith("/student/device-check")
    ? "Kiểm tra thiết bị"
    : pathname.startsWith("/student/profile")
    ? "Hồ sơ sinh viên"
    : "Không gian Sinh viên";

  // Giao diện Dashboard chuẩn có Sidebar & Topbar đồng bộ với Admin và Giảng viên
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f7f9] dark:bg-[#090a0f] font-sans text-slate-800 dark:text-slate-100 transition-colors">
      <StudentSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <StudentTopbar title={title} />
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
