import { useEffect } from 'react';
import { fetchWithAuth } from '@/services/apiClient';

interface UseAutoSaveDraftOptions {
  roomId: number | null;
  questionId: number | string | null | undefined;
  code: string;
  language: string;
  enabled: boolean;
}

/**
 * Custom hook tự động lưu nháp bài làm (debounce + AbortController) để tránh mất code khi F5/rớt mạng.
 */
export function useAutoSaveDraft({
  roomId,
  questionId,
  code,
  language,
  enabled,
}: UseAutoSaveDraftOptions) {
  useEffect(() => {
    if (!enabled || !roomId || !questionId || !code) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`exam_draft_${roomId}_${questionId}`, code);
      } catch {}
      fetchWithAuth('/api/v1/drafts', {
        method: 'POST',
        signal: controller.signal,
        body: JSON.stringify({
          room_id: roomId,
          question_id: Number(questionId),
          code_content: code,
          language,
        }),
      }).catch(() => {});
    }, 1500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [roomId, questionId, code, language, enabled]);
}
