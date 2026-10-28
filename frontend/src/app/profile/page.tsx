'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Trang /profile đóng vai trò Smart Gateway Router.
 * Tự động kiểm tra vai trò người dùng và điều hướng về đúng không gian:
 * - Giảng viên: /instructor/profile
 * - Quản trị viên: /admin/profile
 * - Sinh viên: /student/profile
 */
export default function ProfileGatewayPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const user = JSON.parse(stored);
        const role = user.role?.toLowerCase() || '';

        if (role.includes('instructor') || role.includes('giảng viên')) {
          router.replace('/instructor/profile');
          return;
        }
        if (role.includes('student') || role.includes('sinh viên')) {
          router.replace('/student/profile');
          return;
        }
        if (role.includes('admin') || role.includes('quản trị')) {
          router.replace('/admin/profile');
          return;
        }
      }
    } catch {
      // ignore
    }
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7f9] text-xs font-semibold text-slate-500">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span>Đang chuyển hướng đến hồ sơ cá nhân...</span>
      </div>
    </div>
  );
}
