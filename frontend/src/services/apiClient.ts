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
    const errorMsg = data.detail || res.statusText || 'Lỗi khi gọi API hệ thống';
    throw new Error(errorMsg);
  }

  return data as T;
}
