/**
/**
 * ipResolver.ts
 * Tiện ích nhận diện và bóc tách địa chỉ IP Public của client (mạng ngoài / Wi-Fi / 4G)
 * Giúp hiển thị chính xác IP thực tế (VD: 171.255.xxx.xx) thay vì loopback 127.0.0.1 trong môi trường Local Dev.
 */

const STORAGE_KEY_PUBLIC_IP = 'oculide_client_public_ip';

/**
 * Lấy IP đã lưu tạm trong sessionStorage (đồng bộ, nhanh chóng)
 */
export function getCachedClientPublicIp(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(STORAGE_KEY_PUBLIC_IP);
    if (cached && isValidPublicIp(cached)) {
      return cached;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Kiểm tra xem IP có phải là IP public hợp lệ (không phải localhost loopback)
 */
export function isValidPublicIp(ip?: string | null): boolean {
  if (!ip) return false;
  const clean = ip.trim().toLowerCase();
  return (
    clean !== '' &&
    clean !== '127.0.0.1' &&
    clean !== '::1' &&
    clean !== 'localhost' &&
    clean !== '0.0.0.0' &&
    clean !== 'null' &&
    clean !== 'undefined'
  );
}

/**
 * Tự động phân giải IP mạng ngoài của người dùng từ các nhà cung cấp IP uy tín
 * Kèm timeout ngắn 2000ms để không làm chậm trải nghiệm đăng nhập hay tải trang.
 */
export async function getClientPublicIp(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // 1. Kiểm tra cache trong session
  const cached = getCachedClientPublicIp();
  if (cached) return cached;

  // 2. Thử lấy từ api.ipify.org
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
      cache: 'force-cache',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.ip && isValidPublicIp(data.ip)) {
        sessionStorage.setItem(STORAGE_KEY_PUBLIC_IP, data.ip);
        return data.ip;
      }
    }
  } catch {
    // Dự phòng fallback
  }

  // 3. Dự phòng 2: ipinfo.io
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch('https://ipinfo.io/json', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.ip && isValidPublicIp(data.ip)) {
        sessionStorage.setItem(STORAGE_KEY_PUBLIC_IP, data.ip);
        return data.ip;
      }
    }
  } catch {
    // Không kết nối được internet ngoài
  }

  return null;
}

/**
 * Trả về Headers mang theo IP public để gửi kèm request login/API
 */
export async function getClientIpHeader(): Promise<Record<string, string>> {
  const ip = (await getClientPublicIp()) || getCachedClientPublicIp();
  if (ip && isValidPublicIp(ip)) {
    return { 'X-Client-Public-IP': ip };
  }
  return {};
}
