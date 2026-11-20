/**
 * API Client tiện ích kết nối FastAPI Backend
 * Tự động gắn JWT Token từ localStorage và quản lý lỗi chuẩn hóa.
 */

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

  return {
    ...headers,
    ...extraHeaders,
  };
}

export async function fetchWithAuth<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = getAuthHeaders(options.headers || {});
  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('oculide_token');
        localStorage.removeItem('oculide_user');
        localStorage.removeItem('oculide_refresh_token');
        document.cookie = 'oculide_token=; path=/; max-age=0';
        document.cookie = 'oculide_role=; path=/; max-age=0';

        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login')) {
          window.location.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
        }
      }
    }
    let errorMsg = 'Lỗi khi gọi API hệ thống';
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
    const error = new Error(errorMsg);
    if (objectDetail) Object.assign(error, objectDetail);
    Object.assign(error, { status: res.status });
    throw error;
  }

  return data as T;
}
