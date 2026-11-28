'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search, Sparkles } from 'lucide-react';
import { fetchWithAuth } from '@/services/apiClient';

export interface SearchableUserItem {
  id: number;
  code: string;
  fullName: string;
  email: string;
  department: string;
  subInfo: string;
}

interface SearchableLecturerComboboxProps {
  valueId?: number | null;
  valueName?: string;
  onSelect: (lecturer: SearchableUserItem) => void;
  courseCodeHint?: string;
  placeholder?: string;
  ariaLabel?: string;
  required?: boolean;
}

function matchesCourseDepartment(dept: string, courseCode?: string): boolean {
  if (!courseCode || !dept) return false;
  const code = courseCode.trim().toUpperCase();
  const d = dept.toLowerCase();
  if (/^(CS|SE|IT|KTPM|CNTT)/.test(code)) {
    return d.includes('công nghệ thông tin') || d.includes('cntt') || d.includes('kỹ thuật phần mềm') || d.includes('khoa học máy tính');
  }
  if (/^(IS|HTTT)/.test(code)) {
    return d.includes('hệ thống thông tin') || d.includes('công nghệ thông tin');
  }
  if (/^(AI|DS)/.test(code)) {
    return d.includes('trí tuệ nhân tạo') || d.includes('khoa học dữ liệu') || d.includes('công nghệ thông tin');
  }
  return false;
}

export default function SearchableLecturerCombobox({
  valueId,
  valueName,
  onSelect,
  courseCodeHint,
  placeholder = 'Chọn giảng viên trong hệ thống...',
  ariaLabel = 'Chọn giảng viên',
  required = false,
}: SearchableLecturerComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [items, setItems] = useState<SearchableUserItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchableUserItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadLecturers = useCallback(
    async (targetPage: number, q: string, append: boolean) => {
      setIsLoading(true);
      try {
        const res = await fetchWithAuth<{
          items: SearchableUserItem[];
          has_more: boolean;
        }>(
          `/api/v1/users/search?role=LECTURER&q=${encodeURIComponent(q)}&limit=20&page=${targetPage}`
        );
        const fetched = Array.isArray(res?.items) ? res.items : [];
        setHasMore(Boolean(res?.has_more));
        setItems((prev) => {
          if (!append) return fetched;
          const seen = new Set(prev.map((x) => x.id));
          return [...prev, ...fetched.filter((x) => !seen.has(x.id))];
        });
      } catch {
        if (!append) setItems([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    loadLecturers(page, debouncedQuery, page > 1);
  }, [isOpen, page, debouncedQuery, loadLecturers]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const suggestedItems = useMemo(
    () => items.filter((item) => matchesCourseDepartment(item.department || item.subInfo, courseCodeHint)),
    [items, courseCodeHint]
  );
  const otherItems = useMemo(() => {
    const suggestedIds = new Set(suggestedItems.map((s) => s.id));
    return items.filter((item) => !suggestedIds.has(item.id));
  }, [items, suggestedItems]);

  const displayLabel = selectedItem
    ? `${selectedItem.fullName}${selectedItem.code ? ` (${selectedItem.code})` : ''}`
    : valueName || '';

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!isLoading && hasMore && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      setPage((p) => p + 1);
    }
  };

  const renderOption = (item: SearchableUserItem) => {
    const isSelected =
      (valueId != null && item.id === valueId) ||
      (!valueId && valueName && item.fullName === valueName);

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          setSelectedItem(item);
          onSelect(item);
          setIsOpen(false);
        }}
        className={`flex w-full items-start justify-between gap-2 rounded-md px-2.5 py-2 text-left transition cursor-pointer ${
          isSelected
            ? 'bg-brand-50/80 dark:bg-brand-500/15'
            : 'hover:bg-slate-100 dark:hover:bg-white/5'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
              {item.fullName}
            </span>
            <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
              {item.code}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
            {item.email}
            {item.department || item.subInfo ? ` • ${item.department || item.subInfo}` : ''}
          </p>
        </div>
        {isSelected && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700 dark:text-brand-300" />}
      </button>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          value={displayLabel}
          onChange={() => {}}
          required
          className="sr-only"
        />
      )}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 text-left text-xs font-medium text-slate-800 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white cursor-pointer"
      >
        <span className={`truncate ${displayLabel ? '' : 'text-slate-400 dark:text-slate-500'}`}>
          {displayLabel || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-lg border border-slate-300 bg-white shadow-xl dark:border-white/15 dark:bg-neutral-900">
          <div className="border-b border-slate-200 p-2 dark:border-white/10">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm tên (không dấu), mã GV hoặc email..."
                className="h-8 w-full rounded border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-900 outline-none focus:border-slate-500 focus:bg-white dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              />
            </div>
          </div>

          <div onScroll={handleScroll} className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {suggestedItems.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                  <Sparkles className="h-3 w-3" />
                  <span>Gợi ý theo môn {courseCodeHint?.toUpperCase()}</span>
                </div>
                {suggestedItems.map(renderOption)}
                {otherItems.length > 0 && (
                  <div className="my-1 border-t border-slate-200 dark:border-white/10" />
                )}
              </div>
            )}

            {otherItems.map(renderOption)}

            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Đang tải danh sách giảng viên...</span>
              </div>
            )}

            {!isLoading && items.length === 0 && (
              <div className="py-5 text-center text-xs text-slate-400">
                Không tìm thấy giảng viên phù hợp.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
