'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface EditClassModalProps {
  editingClass: any | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  availableSemesters: string[];
  instructorsList: Array<{ user_id: number; full_name: string; username: string }>;
  editError: string | null;
}

export default function EditClassModal({
  editingClass,
  onClose,
  onSubmit,
  availableSemesters,
  instructorsList,
  editError,
}: EditClassModalProps) {
  useEffect(() => {
    if (!editingClass) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingClass, onClose]);

  if (!editingClass) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 p-4 sm:p-6 pt-12 sm:pt-16 pb-12 sm:pb-16 backdrop-blur-[2px] overflow-y-auto"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-class-title"
        className="my-auto w-full max-w-lg max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-8rem)] flex flex-col rounded-xl overflow-hidden bg-white p-6 shadow-2xl border border-slate-300 dark:bg-neutral-900 dark:border-white/10"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10 shrink-0">
          <h2 id="edit-class-title" className="text-base font-bold text-slate-900 dark:text-white">
            Chỉnh sửa lớp {editingClass.id}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Mã lớp *</label>
            <input
              name="classId"
              defaultValue={editingClass.id}
              required
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 uppercase dark:border-white/10 dark:bg-neutral-950 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Tên lớp *</label>
            <input
              name="className"
              defaultValue={editingClass.name}
              required
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Học kỳ *</label>
            <select
              name="semester"
              defaultValue={editingClass.semester}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white cursor-pointer"
            >
              {availableSemesters.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Giảng viên phụ trách</label>
              <span className="text-[10px] font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md dark:bg-rose-950/40">
                Admin phân công
              </span>
            </div>
            <select
              name="instructorId"
              defaultValue={editingClass.instructor_id ?? ''}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white cursor-pointer"
            >
              <option value="">-- Chưa phân công giảng viên --</option>
              {instructorsList.map((inst) => (
                <option key={inst.user_id} value={inst.user_id}>
                  {inst.full_name} ({inst.username})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Mã môn học</label>
              <input
                name="courseCode"
                defaultValue={editingClass.courseCode || ''}
                placeholder="VD: CMU-CS 316"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 uppercase dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Mã phân lớp</label>
              <input
                name="sectionCode"
                defaultValue={editingClass.sectionCode || ''}
                placeholder="VD: AIS, DDIS"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 uppercase dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Ngày bắt đầu *</label>
              <input
                type="date"
                name="startDate"
                required
                defaultValue={editingClass.startDate || '2026-09-01'}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Ngày kết thúc *</label>
              <input
                type="date"
                name="endDate"
                required
                defaultValue={editingClass.endDate || '2027-01-15'}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Số buổi học *</label>
              <input
                type="number"
                name="totalSessions"
                min={1}
                max={60}
                required
                defaultValue={editingClass.totalSessions || 15}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Giờ học (tín chỉ) *</label>
              <input
                type="number"
                name="creditHours"
                min={1}
                max={10}
                required
                defaultValue={editingClass.creditHours || 3}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3 text-xs dark:border-white/10 dark:bg-white/5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
              Quy chế tự động đóng lớp
            </span>
            <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Lớp học phần tự động chuyển sang trạng thái <strong>Đã kết thúc</strong> khi quá hạn ngày kết thúc. Quản trị viên không can thiệp đóng lớp thủ công.
            </p>
          </div>

          {editError && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {editError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="system-primary-action h-9 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 cursor-pointer"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
