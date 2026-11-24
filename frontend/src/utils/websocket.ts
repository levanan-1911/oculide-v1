/**
 * websocket.ts
 * Tiện ích phân giải địa chỉ kết nối WebSocket Backend thời gian thực cho Oculide
 * Tương thích linh hoạt trên:
 * 1. Môi trường Devtunnels (VD: https://xxx-3000.asse.devtunnels.ms -> wss://xxx-8000.asse.devtunnels.ms)
 * 2. Môi trường Localhost (VD: http://localhost:3000 -> ws://localhost:8000)
 * 3. Môi trường Tên miền chính thức (VD: https://oculide.id.vn -> wss://api.oculide.id.vn)
 * 4. Biến môi trường tùy biến (NEXT_PUBLIC_WS_URL)
 */

export function getWebSocketBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
  }

  const hostname = window.location.hostname;
  const host = window.location.host;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  // 1. Nếu đang truy cập qua Microsoft Devtunnels (cổng 3000 chuyển qua 8000 của Backend)
  if (host.includes('.devtunnels.ms')) {
    const devtunnelBackend = host.replace(/-3000\./, '-8000.');
    return `wss://${devtunnelBackend}`;
  }

  // 2. Nếu đang truy cập qua tên miền chính thức Oculide
  if (hostname === 'oculide.id.vn' || hostname === 'www.oculide.id.vn') {
    return 'wss://api.oculide.id.vn';
  }

  // 3. Nếu có cấu hình tùy chỉnh biến môi trường tường minh (ngoài tên miền mặc định)
  const configuredWs = process.env.NEXT_PUBLIC_WS_URL;
  if (configuredWs && !configuredWs.includes('api.oculide.id.vn')) {
    return configuredWs.replace(/\/$/, '');
  }

  // 4. Môi trường Localhost hoặc IP mạng nội bộ (127.0.0.1, LAN IP)
  return `${protocol}//${hostname}:8000`;
}

/**
 * Xây dựng URL kết nối WebSocket hoàn chỉnh tới phòng thi
 * @param roomId ID phòng thi (số nguyên từ cơ sở dữ liệu)
 * @param clientId Định danh kết nối (user_id của sinh viên hoặc proctor_user_id của giám thị)
 * @param token JWT Access Token xác thực
 */
export function buildRoomWebSocketUrl(
  roomId: number | string,
  clientId: string | number,
  token: string
): string {
  const base = getWebSocketBaseUrl();
  return `${base}/ws/${roomId}/${clientId}?token=${encodeURIComponent(token)}`;
}
