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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Gia hạn thời gian phòng thi
              </h2>
              <p className="text-xs text-slate-500">
                Phòng: <span className="font-mono font-bold text-blue-600">{roomCode}</span> • Còn lại: <span className="font-bold text-slate-700">{currentRemainingMinutes} phút</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Chọn số phút */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Thời gian cộng thêm: <strong className="text-blue-600 font-extrabold text-sm">+{minutes} phút</strong>
            </label>

            {/* Mốc chọn nhanh */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESET_MINUTES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`rounded-xl py-2 text-xs font-bold transition cursor-pointer ${
                    minutes === p
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  +{p}p
                </button>
              ))}
            </div>

            {/* Ô nhập tùy chỉnh số phút bất kỳ */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 shrink-0">Hoặc tự nhập số phút:</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  max="360"
                  value={customInput}
                  onChange={handleCustomChange}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  placeholder="Nhập số phút..."
                  required
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">
                  phút
                </span>
              </div>
            </div>
          </div>

          {/* Lý do gia hạn */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Lý do gia hạn (Tùy chọn)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Bù giờ sự cố mạng / Đề bài dài..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Checkbox gửi thông báo cho SV */}
          <label className="flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 cursor-pointer">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded text-blue-600 accent-blue-600"
            />
            <div className="text-xs">
              <p className="font-bold text-blue-900 flex items-center gap-1">
                <BellRing className="h-3.5 w-3.5 text-blue-600" />
                Phát thông báo đến tất cả sinh viên
              </p>
              <p className="text-slate-500 mt-0.5 text-[11px]">
                Màn hình làm bài của thí sinh sẽ nhận được pop-up thông báo gia hạn thời gian ngay lập tức.
              </p>
            </div>
          </label>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
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

