'use client';

import React, { useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  createModalRole: 'student' | 'instructor' | 'admin';
  setCreateModalRole: (role: 'student' | 'instructor' | 'admin') => void;
  createError: string | null;
}

export default function UserCreateModal({
  isOpen,
  onClose,
  onSubmit,
  createModalRole,
  setCreateModalRole,
  createError,
}: UserCreateModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 sm:p-6 pt-10 sm:pt-14 pb-10 sm:pb-14 backdrop-blur-[2px] overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-title"
        className="my-auto w-full max-w-lg rounded-xl overflow-hidden bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 p-6 shadow-2xl transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="create-user-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Tạo tài khoản người dùng mới
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Nhập thông tin tài khoản và cấp quyền truy cập ban đầu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Mã tài khoản <span className="text-red-500">*</span>
              <input
                name="userCode"
                required
                placeholder="VD: GV0035 hoặc SV184810"
                className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Vai trò hệ thống <span className="text-red-500">*</span>
              <select
                name="role"
                required
                value={createModalRole}
                onChange={(e) => setCreateModalRole(e.target.value as 'student' | 'instructor' | 'admin')}
                className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
              >
                <option value="student">Sinh viên</option>
                <option value="instructor">Giảng viên</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Họ và tên <span className="text-red-500">*</span>
            <input
              name="fullName"
              required
              placeholder="VD: Nguyễn Văn An"
              className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Địa chỉ Email <span className="text-red-500">*</span>
              <input
                name="email"
                type="email"
                required
                placeholder="VD: an.nv@oclide.edu.vn"
                className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Trạng thái kích hoạt
              <select
                name="status"
                defaultValue="active"
                className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
              >
                <option value="active">Hoạt động ngay</option>
                <option value="locked">Tạm khóa ban đầu</option>
              </select>
            </label>
          </div>

          {createModalRole === 'student' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Lớp sinh hoạt <span className="text-red-500">*</span>
                <input
                  name="lopSinhHoat"
                  required
                  placeholder="VD: K28-KTPM1 hoặc SE1801"
                  className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Khoa / Viện đào tạo
                <input
                  name="department"
                  defaultValue="Khoa Công nghệ thông tin"
                  placeholder="VD: Khoa Công nghệ thông tin"
                  className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
                />
              </label>
            </div>
          ) : createModalRole === 'instructor' ? (
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Khoa / Bộ môn giảng dạy <span className="text-red-500">*</span>
              <input
                name="department"
                required
                defaultValue="Khoa Công nghệ thông tin"
                placeholder="VD: Khoa Công nghệ thông tin hoặc Bộ môn KTPM"
                className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
              />
            </label>
          ) : (
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Đơn vị / Phòng ban công tác <span className="text-red-500">*</span>
              <input
                name="department"
                required
                defaultValue="Phòng Đào tạo & Khảo thí"
                placeholder="VD: Phòng Đào tạo & Khảo thí"
                className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
              />
            </label>
          )}

          <div className="rounded-md border border-brand-200 bg-brand-50/70 p-3.5 text-xs text-brand-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-400 shrink-0" />
              <span className="text-slate-900 dark:text-white">Bảo mật mật khẩu khởi tạo</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              Mật khẩu khởi tạo được hệ thống tự động sinh ngẫu nhiên an toàn và gửi trực tiếp qua email cho người dùng. Quản trị viên không cần xem hay nhập mật khẩu thủ công.
            </p>
          </div>

          {createError && (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {createError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-700 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="system-primary-action h-9 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-brand dark:hover:bg-brand-600 cursor-pointer"
            >
              Xác nhận tạo tài khoản
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
