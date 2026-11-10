'use client';

import React, { useEffect, useState } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'instructor' | 'student')[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra sự tồn tại của token và thông tin người dùng trong localStorage
    const token = localStorage.getItem('oculide_token');
    const rawUser = localStorage.getItem('oculide_user');

    if (!token || !rawUser) {
      // Chưa đăng nhập -> Đá về trang đăng nhập kèm redirect URL
      const currentPath = window.location.pathname;
      window.location.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    try {
      const user = JSON.parse(rawUser);
      const userRole = user.role;

      // 2. Kiểm tra quyền hạn theo vai trò (Role-Based Access Control)
      if (!userRole || !allowedRoles.includes(userRole)) {
        // Đăng nhập rồi nhưng không có quyền vào module này
        if (userRole === 'admin') {
          window.location.replace('/admin/dashboard');
        } else if (userRole === 'instructor') {
          window.location.replace('/instructor/dashboard');
        } else {
          window.location.replace('/student/dashboard');
        }
        return;
      }

      // Xác thực thành công -> Cho phép hiển thị giao diện
      setIsAuthorized(true);
    } catch {
      localStorage.removeItem('oculide_token');
      localStorage.removeItem('oculide_user');
      window.location.replace('/login');
    }
  }, [allowedRoles]);

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f4f7f9] dark:bg-[#090a0f]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
