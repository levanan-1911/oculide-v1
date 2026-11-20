'use client';

import React, { useState } from 'react';
import { Clock, Plus, X, Check, BellRing } from 'lucide-react';

interface ExtendSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  currentRemainingMinutes: number;
  onConfirm: (minutes: number, reason: string, notify: boolean) => void;
}

const PRESET_MINUTES = [5, 10, 15, 20, 30, 45, 60];

export default function ExtendSessionModal({
  isOpen,
  onClose,
  roomCode,
  currentRemainingMinutes,
  onConfirm,
}: ExtendSessionModalProps) {
  const [minutes, setMinutes] = useState<number>(15);
  const [customInput, setCustomInput] = useState<string>('15');
  const [reason, setReason] = useState<string>('');
  const [notify, setNotify] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSelectPreset = (val: number) => {
    setMinutes(val);
    setCustomInput(val.toString());
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setMinutes(parsed);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (minutes <= 0) return;
    onConfirm(minutes, reason, notify);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-md border border-slate-300 bg-white p-6 shadow-2xl transition-all dark:border-white/10 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-300 pb-4 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-rose-200">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                Gia hạn thời gian phòng thi
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Phòng: <span className="font-mono font-bold text-slate-900 dark:text-rose-300">{roomCode}</span> • Còn lại: <span className="font-mono font-bold text-stone-700 dark:text-stone-200">{currentRemainingMinutes} phút</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5 hover:text-stone-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Chọn số phút */}
          <div>
            <label className="block text-xs font-serif font-bold text-stone-700 dark:text-stone-300 mb-2">
              Thời gian cộng thêm: <strong className="text-slate-900 dark:text-rose-300 font-mono font-bold text-sm">+{minutes} phút</strong>
            </label>

            {/* Mốc chọn nhanh */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESET_MINUTES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`rounded-md py-2 text-xs font-mono font-bold transition cursor-pointer ${
                    minutes === p
                      ? 'system-selected-module shadow-2xs'
                      : 'border border-slate-300 bg-stone-50 text-stone-700 hover:bg-stone-100 dark:border-white/10 dark:bg-stone-900/50 dark:text-stone-300 dark:hover:bg-white/5'
                  }`}
                >
                  +{p}p
                </button>
              ))}
            </div>

            {/* Ô nhập tùy chỉnh số phút bất kỳ */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0">Hoặc tự nhập số phút:</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  max="360"
                  value={customInput}
                  onChange={handleCustomChange}
                  className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono font-bold text-stone-800 outline-none transition focus:border-brand-600 focus:ring-1 focus:ring-brand-600 dark:border-white/10 dark:bg-neutral-950 dark:text-stone-100"
                  placeholder="Nhập số phút..."
                  required
                />
                <span className="absolute right-3 top-2 text-xs text-stone-400 font-medium">
                  phút
                </span>
              </div>
            </div>
          </div>

          {/* Lý do gia hạn */}
          <div>
            <label className="block text-xs font-serif font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              Lý do gia hạn (Tùy chọn)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Bù giờ sự cố mạng / Đề bài dài..."
              className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-stone-800 outline-none transition focus:border-brand-600 focus:ring-1 focus:ring-brand-600 dark:border-white/10 dark:bg-neutral-950 dark:text-stone-100"
            />
          </div>

          {/* Checkbox gửi thông báo cho SV */}
          <label className="flex items-start gap-2.5 rounded-md border border-slate-900/20 bg-slate-900/5 p-3.5 cursor-pointer dark:bg-slate-900/15">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-brand"
            />
            <div className="text-xs">
              <p className="font-serif font-bold text-slate-900 dark:text-rose-200 flex items-center gap-1.5">
                <BellRing className="h-3.5 w-3.5 text-slate-900 dark:text-rose-300" />
                Phát thông báo đến tất cả sinh viên
              </p>
              <p className="text-stone-600 dark:text-stone-400 mt-0.5 text-[11px]">
                Màn hình làm bài của thí sinh sẽ nhận được pop-up thông báo gia hạn thời gian ngay lập tức.
              </p>
            </div>
          </label>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-300 pt-4 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition cursor-pointer dark:border-white/10 dark:text-stone-300 dark:hover:bg-white/5"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="system-primary-action inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-5 py-2 text-xs font-serif font-bold text-white shadow-2xs hover:bg-slate-800 transition cursor-pointer"
            >
              <Check className="h-4 w-4" />
              Xác nhận gia hạn (+{minutes}p)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

