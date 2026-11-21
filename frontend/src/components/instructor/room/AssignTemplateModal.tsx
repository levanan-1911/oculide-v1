'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  FileCode2,
  Check,
  Search,
  BookOpen,
  Clock,
  Code2,
  Plus,
  AlertCircle,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { fetchWithAuth } from '@/services/apiClient';

export interface TemplateItem {
  id: string | number;
  code?: string;
  title: string;
  type?: string;
  category?: string;
  language?: string;
  durationMinutes?: number;
  duration_minutes?: number;
  questionCount?: number;
  question_count?: number;
  description?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  roomType: 'lab' | 'exam' | string;
  currentTemplateId?: string | number | null;
  currentTemplateTitle?: string | null;
  onSuccess: (template: {
    id: string;
    code?: string;
    title: string;
    language?: string;
    durationMinutes?: number;
  }) => void;
}

export default function AssignTemplateModal({
  isOpen,
  onClose,
  roomCode,
  roomType,
  currentTemplateId,
  currentTemplateTitle,
  onSuccess,
}: Props) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lab' | 'midterm' | 'final'>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | number | null>(
    currentTemplateId || null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Khởi tạo tab bộ lọc theo thể loại phòng
  useEffect(() => {
    if (isOpen) {
      if (roomType === 'lab') {
        setTypeFilter('lab');
      } else if (roomType === 'midterm') {
        setTypeFilter('midterm');
      } else if (roomType === 'final') {
        setTypeFilter('final');
      } else if (roomType === 'exam') {
        setTypeFilter('all');
      }
      setSelectedTemplateId(currentTemplateId || null);
      setErrorMessage(null);
      setSearchTerm('');
    }
  }, [isOpen, roomType, currentTemplateId]);

  // Nạp danh sách bộ đề từ API (100% CSDL SQL Server thật)
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    async function loadTemplates() {
      setIsLoading(true);
      try {
        // Ưu tiên nạp từ /api/v1/templates (đầy đủ các bộ đề trong ngân hàng)
        let list = await fetchWithAuth<any[]>('/api/v1/templates');
        if (!Array.isArray(list) || list.length === 0) {
          list = await fetchWithAuth<any[]>(`/api/v1/rooms/templates?room_type=${roomType}`);
        }
        if (isCancelled) return;

        const normalized: TemplateItem[] = (list || []).map((t: any) => ({
          id: t.id || t.template_id,
          code: t.code || t.template_code || `TPL-${t.id || t.template_id}`,
          title: t.title || `Bộ đề #${t.id || t.template_id}`,
          type: t.type || t.room_type || 'lab',
          category: t.category || (t.type === 'lab' ? 'Thực hành' : 'Thi'),
          language: t.language || 'C/C++/Java/Python',
          durationMinutes: t.durationMinutes || t.duration_minutes || 60,
          questionCount: t.questionCount || t.question_count || (Array.isArray(t.questions) ? t.questions.length : 1),
          description: t.description || 'Bộ đề thực hành / thi lập trình trên máy.',
        }));

        setTemplates(normalized);
      } catch (err: any) {
        if (!isCancelled) {
          setErrorMessage(err?.message || 'Không thể tải danh sách đề thi từ máy chủ');
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadTemplates();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, roomType]);

  // Bộ lọc theo từ khóa và loại đề
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      // Lọc theo search
      const s = searchTerm.trim().toLowerCase();
      const matchSearch =
        !s ||
        tpl.title.toLowerCase().includes(s) ||
        (tpl.code && tpl.code.toLowerCase().includes(s)) ||
        (tpl.language && tpl.language.toLowerCase().includes(s));

      if (!matchSearch) return false;

      // Lọc theo type
      if (typeFilter === 'all') return true;
      const t = String(tpl.type || '').toLowerCase();
      if (typeFilter === 'lab') {
        return t === 'lab' || t === 'practice';
      }
      if (typeFilter === 'midterm') {
        return t === 'midterm' || t === 'midterm_exam' || t === 'exam';
      }
      if (typeFilter === 'final') {
        return t === 'final' || t === 'final_exam' || t === 'exam' || t.includes('cuối') || t.includes('kết thúc');
      }
      return true;
    });
  }, [templates, searchTerm, typeFilter]);

  const handleConfirmAssign = async () => {
    if (!roomCode) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Gọi API Backend cập nhật template_id cho phòng vào SQL Server
      await fetchWithAuth(`/api/v1/rooms/by-code/${encodeURIComponent(roomCode)}/template`, {
        method: 'PATCH',
        body: JSON.stringify({
          template_id: selectedTemplateId ? String(selectedTemplateId) : null,
        }),
      });

      // 2. Tìm thông tin bộ đề vừa chọn
      const matched = templates.find(
        (t) => String(t.id) === String(selectedTemplateId) || String(t.code) === String(selectedTemplateId)
      );

      const updatedInfo = matched
        ? {
            id: String(matched.id),
            code: matched.code,
            title: matched.title,
            language: matched.language,
            durationMinutes: matched.durationMinutes,
          }
        : {
            id: '',
            title: 'Chưa gán đề (Tự do)',
            language: 'Tự do',
            durationMinutes: 60,
          };

      onSuccess(updatedInfo);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi gán đề cho phòng:', err);
      setErrorMessage(err?.detail || err?.message || 'Không thể gán đề thi cho phòng chờ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-slate-300 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900">
        {/* Header Modal */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-300 bg-slate-50/60 p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-white shadow-2xs">
              <FileCode2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white">
                Gán &amp; Đổi Đề Thi Cho Phòng Chờ
              </h3>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Mã phòng: <strong className="font-mono text-slate-800 dark:text-slate-200">{roomCode}</strong>
                {currentTemplateTitle && (
                  <span>
                    {' '}• Đề hiện tại: <strong className="text-slate-800 dark:text-slate-200">{currentTemplateTitle}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng hộp thoại"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nội dung chính */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm">
          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Dải bộ lọc & Thanh tìm kiếm */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Filter tabs */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`min-h-9 rounded-md px-3 text-xs font-semibold transition cursor-pointer ${
                  typeFilter === 'all'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-white hover:text-brand-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-brand-200'
                }`}
              >
                Tất cả ({templates.length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('lab')}
                className={`min-h-9 rounded-md px-3 text-xs font-semibold transition cursor-pointer ${
                  typeFilter === 'lab'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-white hover:text-brand-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-brand-200'
                }`}
              >
                Đề thực hành
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('midterm')}
                className={`min-h-9 rounded-md px-3 text-xs font-semibold transition cursor-pointer ${
                  typeFilter === 'midterm'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-white hover:text-brand-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-brand-200'
                }`}
              >
                Thi giữa kỳ
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('final')}
                className={`min-h-9 rounded-md px-3 text-xs font-semibold transition cursor-pointer ${
                  typeFilter === 'final'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-white hover:text-brand-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-brand-200'
                }`}
              >
                Thi cuối kỳ
              </button>
            </div>

            {/* Ô tìm kiếm */}
            <div className="relative w-full lg:w-72 lg:shrink-0">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên bộ đề, mã đề, ngôn ngữ..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-brand-400"
              />
            </div>
          </div>

          {/* Danh sách các bộ đề trong ngân hàng */}
          <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex h-36 items-center justify-center rounded-md border border-slate-200 bg-slate-50/40 text-slate-500 dark:border-white/10 dark:bg-white/[0.02]">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>Đang tải danh sách bộ đề từ CSDL SQL Server...</span>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-white/10 dark:text-slate-400">
                <FileCode2 className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-semibold">Không tìm thấy bộ đề phù hợp</p>
                <p className="text-[11px] mt-1 text-slate-400">
                  Thử tìm với từ khóa khác hoặc soạn bộ đề mới trong Ngân hàng đề.
                </p>
              </div>
            ) : (
              filteredTemplates.map((tpl) => {
                const isSelected =
                  String(selectedTemplateId) === String(tpl.id) ||
                  String(selectedTemplateId) === String(tpl.code);

                const typeBadge =
                  tpl.type === 'final' || tpl.type === 'final_exam'
                    ? 'Cuối kỳ'
                    : tpl.type === 'midterm'
                    ? 'Giữa kỳ'
                    : 'Thực hành';

                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedTemplateId(tpl.id);
                      }
                    }}
                    className={`rounded-lg border p-4 cursor-pointer transition flex items-start gap-3 select-none ${
                      isSelected
                        ? 'border-brand bg-brand-50 shadow-2xs dark:border-brand-400 dark:bg-brand-500/10'
                        : 'border-slate-300 bg-white hover:border-brand-300 hover:bg-brand-50/60 dark:border-white/10 dark:bg-neutral-950 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5'
                    }`}
                  >
                    {/* Radio input */}
                    <input
                      type="radio"
                      name="templateRadio"
                      checked={isSelected}
                      onChange={() => setSelectedTemplateId(tpl.id)}
                      className="mt-0.5 h-4 w-4 accent-brand cursor-pointer"
                    />

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400">
                            {tpl.code || `TPL-${tpl.id}`}
                          </span>
                          <span className="rounded bg-slate-200 dark:bg-white/10 px-1.5 py-0.2 text-[9.5px] font-mono font-bold text-slate-700 dark:text-slate-300">
                            {typeBadge}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {tpl.durationMinutes} phút
                        </span>
                      </div>

                      <h4 className="font-serif text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {tpl.title}
                      </h4>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                        {tpl.description}
                      </p>

                      <div className="flex items-center gap-3 pt-1 text-[10.5px] text-slate-600 dark:text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Code2 className="h-3 w-3 text-slate-400" />
                          {tpl.language || 'Đa ngôn ngữ'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3 text-slate-400" />
                          {tpl.questionCount} bài tập
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Tùy chọn gỡ đề / Chưa gán đề */}
            <div
              onClick={() => setSelectedTemplateId(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedTemplateId(null);
                }
              }}
              className={`rounded-lg border border-dashed p-4 cursor-pointer transition flex items-start gap-3 select-none ${
                selectedTemplateId === null
                  ? 'border-brand bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10'
                    : 'border-slate-300 bg-white hover:border-brand-300 hover:bg-brand-50/60 dark:border-white/10 dark:bg-neutral-950 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5'
              }`}
            >
              <input
                type="radio"
                name="templateRadio"
                checked={selectedTemplateId === null}
                onChange={() => setSelectedTemplateId(null)}
                className="mt-0.5 h-4 w-4 accent-brand cursor-pointer"
              />
              <div>
                <p className="font-serif text-xs font-bold text-slate-900 dark:text-white">
                  Chưa gán đề thi ngay (Chế độ phòng chờ tự do)
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sinh viên điểm danh vào phòng chờ trước, giảng viên có thể chọn gán đề sau bất cứ lúc nào trước khi bắt đầu.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-300 p-5 dark:border-white/10 bg-slate-50/60 dark:bg-white/5">
          <Link
            href="/instructor/questions"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Soạn đề thi mới trong Ngân hàng đề ↗</span>
          </Link>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-white/10 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmAssign}
              className="system-primary-action inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-5 text-sm font-semibold text-white shadow-2xs transition hover:bg-brand-800 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Xác nhận gán đề</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
