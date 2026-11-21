'use client';

import React, { useEffect, useState } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'instructor' | 'student')[];
}

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 phút tự động đăng xuất khi không thao tác
const TOKEN_COOKIE_MAX_AGE = 1800; // Cookie 30 phút

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

function clearSessionAndRedirect(reason?: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('oculide_token');
  localStorage.removeItem('oculide_user');
  localStorage.removeItem('oculide_refresh_token');
  localStorage.removeItem('oculide_last_activity');
  document.cookie = 'oculide_token=; path=/; max-age=0';
  document.cookie = 'oculide_role=; path=/; max-age=0';

  const currentPath = window.location.pathname;
  const reasonParam = reason ? `reason=${encodeURIComponent(reason)}` : '';
  const redirectParam = currentPath && !currentPath.includes('/login') ? `redirect=${encodeURIComponent(currentPath)}` : '';
  const query = [reasonParam, redirectParam].filter(Boolean).join('&');
  window.location.replace(`/login${query ? `?${query}` : ''}`);
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra sự tồn tại của token và thông tin người dùng trong localStorage
    const token = localStorage.getItem('oculide_token');
    const rawUser = localStorage.getItem('oculide_user');

    if (!token || !rawUser || isTokenExpired(token)) {
      clearSessionAndRedirect();
      return;
    }

    // Kiểm tra thời gian treo máy không hoạt động (idle timeout 30 phút)
    const lastActivity = Number(localStorage.getItem('oculide_last_activity') || Date.now());
    if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
      clearSessionAndRedirect('idle_timeout');
      return;
    }

    try {
      const user = JSON.parse(rawUser);
      const userRole = user.role?.toLowerCase();

      // 2. Kiểm tra quyền hạn theo vai trò (Role-Based Access Control)
      if (!userRole || !allowedRoles.includes(userRole)) {
        if (userRole === 'admin') {
          window.location.replace('/admin/dashboard');
        } else if (userRole === 'instructor') {
          window.location.replace('/instructor/dashboard');
        } else {
          window.location.replace('/student/dashboard');
        }
        return;
      }

      // Đảm bảo Cookie luôn đồng bộ với localStorage (max-age 1800 giây = 30 phút)
      document.cookie = `oculide_token=${token}; path=/; max-age=${TOKEN_COOKIE_MAX_AGE}; SameSite=Lax`;
      document.cookie = `oculide_role=${userRole}; path=/; max-age=${TOKEN_COOKIE_MAX_AGE}; SameSite=Lax`;

      // Cập nhật timestamp hoạt động ban đầu
      localStorage.setItem('oculide_last_activity', Date.now().toString());

      // Xác thực thành công -> Cho phép hiển thị giao diện
      setIsAuthorized(true);
    } catch {
      clearSessionAndRedirect();
    }
  }, [allowedRoles]);

  // Lắng nghe sự kiện thao tác của người dùng để reset thời gian treo máy
  useEffect(() => {
    if (!isAuthorized) return;

    let lastRecorded = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle cập nhật mỗi 5 giây một lần để tối ưu hiệu năng
      if (now - lastRecorded > 5000) {
        lastRecorded = now;
        localStorage.setItem('oculide_last_activity', now.toString());
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Định kỳ 15 giây kiểm tra một lần xem tài khoản có bị treo quá 30 phút hoặc token hết hạn không
    const checkInterval = setInterval(() => {
      const token = localStorage.getItem('oculide_token');
      if (!token || isTokenExpired(token)) {
        clearSessionAndRedirect('token_expired');
        return;
      }

      const lastActivity = Number(localStorage.getItem('oculide_last_activity') || Date.now());
      if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
        clearSessionAndRedirect('idle_timeout');
      }
    }, 15000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      clearInterval(checkInterval);
    };
  }, [isAuthorized]);

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
