/**
 * API Client tiện ích kết nối FastAPI Backend
 * Tự động gắn JWT Token từ localStorage và quản lý lỗi chuẩn hóa.
 */

import { getCachedClientPublicIp } from '@/utils/ipResolver';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('oculide_token');
}

export function getAuthHeaders(extraHeaders: HeadersInit = {}): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const clientIp = getCachedClientPublicIp();
  if (clientIp) {
    headers['X-Client-Public-IP'] = clientIp;
  }

  return {
    ...headers,
    ...extraHeaders,
  };
}

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem('oculide_refresh_token');
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      if (!data?.access_token) return null;

      localStorage.setItem('oculide_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('oculide_refresh_token', data.refresh_token);
      }
      document.cookie = `oculide_token=${data.access_token}; path=/; SameSite=Lax`;
      const rawUser = localStorage.getItem('oculide_user');
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          if (parsed?.role) {
            document.cookie = `oculide_role=${String(parsed.role).toLowerCase()}; path=/; SameSite=Lax`;
          }
        } catch {}
      }
      return data.access_token as string;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function fetchWithAuth<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = getAuthHeaders(options.headers || {});
  let res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401 && !url.includes('/api/v1/auth/refresh') && !url.includes('/api/v1/auth/login')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = getAuthHeaders(options.headers || {});
      res = await fetch(url, {
        ...options,
        headers: retryHeaders,
      });
    }
  }

  let data: any = {};
  const contentLength = res.headers.get('content-length');
  if (res.status !== 204 && contentLength !== '0') {
    const rawText = await res.text();
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = {};
      }
    }
  }

  if (!res.ok) {
    const isMaintenanceKick =
      res.status === 503 &&
      data?.detail &&
      typeof data.detail === 'object' &&
      data.detail.code === 'MAINTENANCE_MODE';

    if (res.status === 403 && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/instructor') || currentPath.startsWith('/admin')) {
        try {
          const token = localStorage.getItem('oculide_token');
          if (token) {
            const meRes = await fetch('/api/v1/auth/me', {
              headers: { Authorization: `Bearer ${token}` },
              cache: 'no-store',
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              const freshRole = String(meData?.role || '').toLowerCase();
              if (freshRole) {
                localStorage.setItem('oculide_user', JSON.stringify(meData));
                document.cookie = `oculide_role=${freshRole}; path=/; SameSite=Lax`;
                const mismatchAdmin = currentPath.startsWith('/admin') && freshRole !== 'admin';
                const mismatchInstructor =
                  currentPath.startsWith('/instructor') && freshRole !== 'instructor' && freshRole !== 'admin';
                if (mismatchAdmin || mismatchInstructor) {
                  const target =
                    freshRole === 'admin'
                      ? '/admin/dashboard'
                      : freshRole === 'instructor'
                      ? '/instructor/dashboard'
                      : '/student/dashboard';
                  window.location.replace(target);
                }
              }
            }
          }
        } catch {}
      }
    }

    if (res.status === 401 || isMaintenanceKick) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('oculide_token');
        localStorage.removeItem('oculide_user');
        localStorage.removeItem('oculide_refresh_token');
        localStorage.removeItem('oculide_last_activity');
        document.cookie = 'oculide_token=; path=/; max-age=0';
        document.cookie = 'oculide_role=; path=/; max-age=0';

        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login')) {
          const reason = isMaintenanceKick ? 'maintenance' : 'token_expired';
          window.location.replace(`/login?reason=${reason}&redirect=${encodeURIComponent(currentPath)}`);
        }
      }
    }
    let errorMsg = 'Lỗi khi gọi API hệ thống';
    if (res.status === 429) {
      errorMsg = 'Bạn đã thao tác quá nhanh hoặc thử đăng nhập quá nhiều lần. Vui lòng đợi 1 phút rồi thử lại.';
    } else {
      const objectDetail =
        data.detail && typeof data.detail === 'object' && !Array.isArray(data.detail)
          ? data.detail
          : null;
      if (typeof data.detail === 'string') {
        errorMsg = data.detail;
      } else if (Array.isArray(data.detail)) {
        errorMsg = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      } else if (typeof objectDetail?.message === 'string') {
        errorMsg = objectDetail.message;
      } else if (data.message && typeof data.message === 'string') {
        errorMsg = data.message;
      } else if (res.statusText) {
        errorMsg = res.statusText;
      }
    }
    const objectDetail =
      data.detail && typeof data.detail === 'object' && !Array.isArray(data.detail)
        ? data.detail
        : null;
    const error = new Error(errorMsg);
    if (objectDetail) Object.assign(error, objectDetail);
    Object.assign(error, { status: res.status });
    throw error;
  }

  return data as T;
}
