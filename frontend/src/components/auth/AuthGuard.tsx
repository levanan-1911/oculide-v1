'use client';

import React, { useEffect, useState } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'instructor' | 'student')[];
}

function parseJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra sự tồn tại của token và thông tin người dùng trong localStorage
    const token = localStorage.getItem('oculide_token');
    const rawUser = localStorage.getItem('oculide_user');

    if (!token || !rawUser || isTokenExpired(token)) {
      // Chưa đăng nhập hoặc token đã hết hạn -> Xóa sạch và đá về login
      localStorage.removeItem('oculide_token');
      localStorage.removeItem('oculide_user');
      localStorage.removeItem('oculide_refresh_token');
      document.cookie = 'oculide_token=; path=/; max-age=0';
      document.cookie = 'oculide_role=; path=/; max-age=0';

      const currentPath = window.location.pathname;
      window.location.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    try {
      const user = JSON.parse(rawUser);
      const userRole = user.role?.toLowerCase();

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

      // Đảm bảo Cookie luôn đồng bộ với localStorage cho server-side middleware
      document.cookie = `oculide_token=${token}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `oculide_role=${userRole}; path=/; max-age=86400; SameSite=Lax`;

      // Xác thực thành công -> Cho phép hiển thị giao diện
      setIsAuthorized(true);
    } catch {
      localStorage.removeItem('oculide_token');
      localStorage.removeItem('oculide_user');
      localStorage.removeItem('oculide_refresh_token');
      document.cookie = 'oculide_token=; path=/; max-age=0';
      document.cookie = 'oculide_role=; path=/; max-age=0';
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
