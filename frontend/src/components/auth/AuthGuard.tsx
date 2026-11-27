'use client';

import React, { useEffect, useRef, useState } from 'react';
import { refreshAccessToken } from '@/services/apiClient';

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
  const [maintenanceWarning, setMaintenanceWarning] = useState<string | null>(null);
  const lastWarnedMinuteRef = useRef<number | null>(null);
  const warningTimerRef = useRef<number | null>(null);

  const triggerMaintenanceWarning = (minutesRemaining: number, startTime: string) => {
    const currentMinute = Math.floor(Date.now() / 60000);
    if (lastWarnedMinuteRef.current === currentMinute) return;
    lastWarnedMinuteRef.current = currentMinute;
    setMaintenanceWarning(
      `Hệ thống sẽ bắt đầu bảo trì sau khoảng ${minutesRemaining} phút nữa (lúc ${startTime}). Vui lòng lưu công việc đang thực hiện.`
    );
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current);
    }
    warningTimerRef.current = window.setTimeout(() => {
      setMaintenanceWarning(null);
    }, 5000);
  };

  useEffect(() => {
    // 1. Kiểm tra sự tồn tại của session cookie, token và thông tin người dùng
    const hasSessionCookie = document.cookie
      .split(';')
      .some((c) => c.trim().startsWith('oculide_token='));
    const token = localStorage.getItem('oculide_token');
    const rawUser = localStorage.getItem('oculide_user');

    if (!hasSessionCookie || !token || !rawUser || isTokenExpired(token)) {
      clearSessionAndRedirect();
      return;
    }

    // Kiểm tra thời gian treo máy không hoạt động (idle timeout 30 phút)
    const lastActivity = Number(localStorage.getItem('oculide_last_activity') || Date.now());
    if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
      clearSessionAndRedirect('idle_timeout');
      return;
    }

    let cancelled = false;

    const redirectByRole = (role: string) => {
      if (role === 'admin') {
        window.location.replace('/admin/dashboard');
      } else if (role === 'instructor') {
        window.location.replace('/instructor/dashboard');
      } else {
        window.location.replace('/student/dashboard');
      }
    };

    const verifyAndSyncSession = async () => {
      try {
        const localUser = JSON.parse(rawUser);
        let effectiveRole = (localUser.role || '').toLowerCase();

        try {
          const meRes = await fetch('/api/v1/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });
          if (cancelled) return;

          if (meRes.status === 401) {
            clearSessionAndRedirect();
            return;
          }

          if (meRes.ok) {
            const meData = await meRes.json();
            if (cancelled) return;
            const mergedUser = { ...localUser, ...meData };
            localStorage.setItem('oculide_user', JSON.stringify(mergedUser));
            if (meData?.role) {
              effectiveRole = String(meData.role).toLowerCase();
            }
          }
        } catch {
          // Nếu mạng tạm gián đoạn, dùng role cục bộ để không chặn oan
        }

        if (cancelled) return;

        // 2. Kiểm tra quyền hạn theo vai trò mới nhất từ Backend
        if (!effectiveRole || !allowedRoles.includes(effectiveRole as any)) {
          document.cookie = `oculide_role=${effectiveRole || ''}; path=/; SameSite=Lax`;
          redirectByRole(effectiveRole);
          return;
        }

        // Đảm bảo session cookie luôn đồng bộ với localStorage (tự xóa khi đóng trình duyệt)
        document.cookie = `oculide_token=${token}; path=/; SameSite=Lax`;
        document.cookie = `oculide_role=${effectiveRole}; path=/; SameSite=Lax`;

        // Cập nhật timestamp hoạt động ban đầu
        localStorage.setItem('oculide_last_activity', Date.now().toString());

        // Nếu không phải Admin, kiểm tra ngay trạng thái bảo trì hoặc cảnh báo trước 5 phút
        if (effectiveRole !== 'admin') {
          fetch('/api/v1/auth/maintenance-status', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((m) => {
              if (m?.maintenance_mode) {
                clearSessionAndRedirect('maintenance');
              } else if (m?.upcoming_maintenance && m?.minutes_remaining) {
                triggerMaintenanceWarning(m.minutes_remaining, m.maintenance_start_time || '');
              }
            })
            .catch(() => {});
        }

        // Xác thực thành công -> Cho phép hiển thị giao diện
        setIsAuthorized(true);
      } catch {
        clearSessionAndRedirect();
      }
    };

    verifyAndSyncSession();
    return () => {
      cancelled = true;
    };
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

    // Định kỳ 20 giây gửi heartbeat duy trì phiên, kiểm tra treo máy, token hết hạn và bảo trì
    const checkInterval = setInterval(async () => {
      const lastActivity = Number(localStorage.getItem('oculide_last_activity') || Date.now());
      if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
        clearSessionAndRedirect('idle_timeout');
        return;
      }

      const token = localStorage.getItem('oculide_token');
      if (!token) {
        clearSessionAndRedirect('token_expired');
        return;
      }

      if (isTokenExpired(token)) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          clearSessionAndRedirect('token_expired');
          return;
        }
      }

      const activeToken = localStorage.getItem('oculide_token');
      if (activeToken) {
        try {
          const hbRes = await fetch('/api/v1/auth/heartbeat', {
            method: 'POST',
            headers: { Authorization: `Bearer ${activeToken}` },
          });
          if (hbRes.status === 401) {
            const hbBody = await hbRes.json().catch(() => ({}));
            if (hbBody?.detail?.code === 'SESSION_REVOKED') {
              clearSessionAndRedirect('session_revoked');
              return;
            }
          }
        } catch {
          // ignore transient network errors
        }
      }

      try {
        const rawUser = localStorage.getItem('oculide_user');
        const role = rawUser ? String(JSON.parse(rawUser)?.role || '').toLowerCase() : '';
        if (role && role !== 'admin') {
          const res = await fetch('/api/v1/auth/maintenance-status', { cache: 'no-store' });
          if (res.ok) {
            const m = await res.json().catch(() => null);
            if (m?.maintenance_mode) {
              clearSessionAndRedirect('maintenance');
            } else if (m?.upcoming_maintenance && m?.minutes_remaining) {
              triggerMaintenanceWarning(m.minutes_remaining, m.maintenance_start_time || '');
            }
          }
        }
      } catch {
        // ignore network errors during periodic check
      }
    }, 20000);

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

  return (
    <>
      {maintenanceWarning && (
        <aside
          role="alert"
          aria-live="assertive"
          className="fixed top-5 right-5 z-[100] max-w-md rounded-md border border-amber-300 border-l-4 border-l-amber-600 bg-amber-50 px-4 py-3 text-xs text-amber-950 shadow-lg dark:border-amber-500/40 dark:border-l-amber-400 dark:bg-neutral-900 dark:text-amber-200"
        >
          <p className="font-serif font-bold">Thông báo bảo trì sắp diễn ra</p>
          <p className="mt-0.5 leading-relaxed">{maintenanceWarning}</p>
        </aside>
      )}
      {children}
    </>
  );
}
