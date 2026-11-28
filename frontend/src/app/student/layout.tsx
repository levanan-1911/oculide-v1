"use client";

import { usePathname } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
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
      <AuthGuard allowedRoles={["student"]}>
        <div className="min-h-screen w-full bg-slate-900 text-slate-100 overflow-hidden">
          {children}
        </div>
      </AuthGuard>
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
    <AuthGuard allowedRoles={["student"]}>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-neutral-950 font-sans text-[#2A282D] dark:text-[#E8E6E8] transition-colors">
        <StudentSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <StudentTopbar title={title} />
          <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-7">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
