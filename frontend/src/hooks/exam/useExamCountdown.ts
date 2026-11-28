import { useEffect } from 'react';

interface UseExamCountdownOptions {
  enabled: boolean;
  onTick: () => void;
}

/**
 * Custom hook quản lý đồng hồ đếm ngược phiên thi, tự động dọn dẹp interval khi unmount hoặc tạm dừng.
 */
export function useExamCountdown({ enabled, onTick }: UseExamCountdownOptions) {
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      onTick();
    }, 1000);
    return () => clearInterval(timer);
  }, [enabled, onTick]);
}
