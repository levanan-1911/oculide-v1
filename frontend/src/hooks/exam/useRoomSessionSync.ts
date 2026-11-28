import { useEffect } from 'react';
import { fetchWithAuth } from '@/services/apiClient';

interface UseRoomSessionSyncOptions {
  roomId: number | null;
  enabled: boolean;
  onRoomClosed: () => void;
}

/**
 * Custom hook polling trạng thái phòng thi với AbortController, tự hủy khi unmount.
 */
export function useRoomSessionSync({ roomId, enabled, onRoomClosed }: UseRoomSessionSyncOptions) {
  useEffect(() => {
    if (!roomId || !enabled) return;
    let cancelled = false;
    let activeController: AbortController | null = null;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    const interval = setInterval(async () => {
      if (cancelled) return;
      activeController?.abort();
      activeController = new AbortController();
      try {
        const res = await fetchWithAuth<any>(`/api/v1/rooms/${roomId}/status`, {
          signal: activeController.signal,
        });
        if (cancelled) return;
        const st = String(res?.status || '').toLowerCase();
        if (['da_dong', 'ended', 'completed', 'closed', 'da_ket_thuc'].includes(st) || res?.is_active === false) {
          clearInterval(interval);
          onRoomClosed();
          redirectTimer = setTimeout(() => {
            window.location.href = '/student/exams';
          }, 2500);
        }
      } catch {
        // Bỏ qua AbortError hoặc lỗi mạng tạm thời
      }
    }, 8000);

    return () => {
      cancelled = true;
      activeController?.abort();
      clearInterval(interval);
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [roomId, enabled, onRoomClosed]);
}
