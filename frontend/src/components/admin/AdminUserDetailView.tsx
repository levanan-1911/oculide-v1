'use client';

import React, { useState } from 'react';
import { ArrowLeft, Edit3, KeyRound, Lock, Unlock, CheckCircle2 } from 'lucide-react';
import { UserItem } from './AdminUsersView';

interface AdminUserDetailViewProps {
  user: UserItem;
  onBackToList: () => void;
  onToggleStatus?: (userId: number, newStatus: 'active' | 'locked') => void;
}

export default function AdminUserDetailView({
  user,
  onBackToList,
  onToggleStatus,
}: AdminUserDetailViewProps) {
  const [currentStatus, setCurrentStatus] = useState<'active' | 'locked'>(user.status);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Tạo chữ cái đầu cho avatar (ví dụ: Nguyễn Minh Anh -> NA)
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Xử lý Khóa / Mở khóa
  const handleToggleLock = () => {
    const newStatus = currentStatus === 'active' ? 'locked' : 'active';
    setCurrentStatus(newStatus);
    onToggleStatus?.(user.id, newStatus);
    setNoticeMessage(
      newStatus === 'locked'
        ? `Đã khóa tài khoản ${user.userCode} thành công.`
        : `Đã mở khóa tài khoản ${user.userCode} thành công.`
    );
    setTimeout(() => setNoticeMessage(null), 3000);
  };

  // Xử lý Đặt lại mật khẩu
  const handleResetPassword = () => {
    setNoticeMessage(`Đã gửi mật khẩu tạm mới đến email ${user.email}.`);
    setTimeout(() => setNoticeMessage(null), 3000);
  };

  return (
    <div className="mx-auto max-w-[1440px] font-sans text-slate-800">
      {/* ── HEADER: TIÊU ĐỀ + NÚT DANH SÁCH ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[26px]">
            Chi tiết tài khoản
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-[13.5px]">
            Thông tin định danh, quyền và lịch sử truy cập của tài khoản.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToList}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Danh sách</span>
        </button>
      </div>

      {/* Thông báo tác vụ (Toast) */}
      {noticeMessage && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs sm:text-sm font-semibold text-blue-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* ── THẺ TỔNG QUAN HỒ SƠ (PROFILE CARD) ── */}
      <div className="mt-6 flex flex-col justify-between gap-6 rounded-2xl border border-slate-200/75 bg-white p-6 sm:p-8 shadow-[0_2px_10px_rgba(15,23,42,0.02)] md:flex-row md:items-center">
        {/* Avatar + Thông tin định danh */}
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-lg font-black text-[#2563eb]">
            {getInitials(user.fullName)}
          </div>

          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {user.fullName}
            </h3>
            <p className="mt-1 text-xs sm:text-[13px] text-slate-500 font-medium">
              {user.userCode} • {user.email}
            </p>
            <p className="mt-1 text-xs sm:text-[13px] font-semibold">
              <span className="text-slate-700">{user.roleDisplay}</span>
              <span className="mx-1.5 text-slate-300">•</span>
              <span
                className={
                  currentStatus === 'active' ? 'text-emerald-600' : 'text-red-600'
                }
              >
                {currentStatus === 'active' ? 'Hoạt động' : 'Bị khóa'}
              </span>
            </p>
          </div>
        </div>

        {/* 3 Nút hành động nhanh */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
          >
            <Edit3 className="h-4 w-4 text-slate-500" />
            <span>Chỉnh sửa</span>
          </button>

          <button
            type="button"
            onClick={handleResetPassword}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
          >
            <KeyRound className="h-4 w-4 text-slate-500" />
            <span>Đặt lại mật khẩu</span>
          </button>

          <button
            type="button"
            onClick={handleToggleLock}
            className={`inline-flex h-10 items-center gap-2 rounded-xl border px-5 text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer ${
              currentStatus === 'active'
                ? 'border-slate-200/90 bg-white text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {currentStatus === 'active' ? (
              <>
                <Lock className="h-4 w-4 text-slate-500" />
                <span>Khóa</span>
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 text-emerald-600" />
                <span>Mở khóa</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── CỤM 3 THẺ CHI TIẾT (3 CỘT BÊN DƯỚI) ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Cột 1: Vai trò & phạm vi */}
        <div className="rounded-2xl border border-slate-200/75 bg-white p-6 sm:p-7 shadow-[0_2px_10px_rgba(15,23,42,0.02)] flex flex-col justify-between">
          <h4 className="text-base font-bold text-slate-900">
            Vai trò &amp; phạm vi
          </h4>

          <div className="mt-5 space-y-3.5 text-xs sm:text-[13.5px] text-slate-600">
            <p className="font-semibold text-slate-800">
              {user.role === 'instructor'
                ? 'Giảng viên/Giám thị'
                : user.role === 'student'
                ? 'Sinh viên'
                : 'Quản trị viên hệ thống'}
            </p>
            <p>
              {user.role === 'instructor'
                ? '3 lớp phụ trách'
                : 'Lớp sinh hoạt: SE1848'}
            </p>
            <p>
              {user.role === 'instructor'
                ? '5 lịch kiểm tra'
                : 'Đã tham gia 4 bài kiểm tra'}
            </p>
          </div>
        </div>

        {/* Cột 2: Lịch sử đăng nhập & hoạt động */}
        <div className="rounded-2xl border border-slate-200/75 bg-white p-6 sm:p-7 shadow-[0_2px_10px_rgba(15,23,42,0.02)] flex flex-col justify-between">
          <h4 className="text-base font-bold text-slate-900">
            Lịch sử đăng nhập &amp; hoạt động
          </h4>

          <div className="mt-5 space-y-3.5 text-xs sm:text-[13.5px] text-slate-600">
            <p>
              <span className="font-medium text-slate-500">Đăng nhập gần nhất: </span>
              <span className="font-semibold text-slate-800">{user.lastLogin}</span>
            </p>
            <p>
              <span className="font-medium text-slate-500">Hoạt động gần nhất: </span>
              <span className="font-semibold text-slate-800">Cập nhật lịch PRJ301-MID</span>
            </p>
            <p>
              <span className="font-medium text-slate-500">Thiết bị/IP: </span>
              <span className="font-semibold text-slate-800">Chrome • Windows 11 • 10.21.8.45</span>
            </p>
          </div>
        </div>

        {/* Cột 3: Bảo mật tài khoản */}
        <div className="rounded-2xl border border-slate-200/75 bg-white p-6 sm:p-7 shadow-[0_2px_10px_rgba(15,23,42,0.02)] flex flex-col justify-between">
          <h4 className="text-base font-bold text-slate-900">
            Bảo mật tài khoản
          </h4>

          <div className="mt-5 space-y-3.5 text-xs sm:text-[13.5px] text-slate-600">
            <p>
              <span className="font-medium text-slate-500">Đổi mật khẩu: </span>
              <span className="font-semibold text-slate-800">28/09/2026</span>
            </p>
            <p>
              <span className="font-medium text-slate-500">Đăng nhập sai: </span>
              <span className="font-semibold text-slate-800">0/5</span>
            </p>
            <p className="font-medium text-emerald-600">
              Không có phiên bất thường
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

