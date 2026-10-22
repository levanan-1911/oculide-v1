'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit3,
  KeyRound,
  Lock,
  Unlock,
  CheckCircle2,
  X,
  Copy,
  Check,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { UserItem } from './AdminUsersView';

interface AdminUserDetailViewProps {
  user: UserItem;
  onBackToList: () => void;
  onToggleStatus?: (userId: number, newStatus: 'active' | 'locked') => void;
  onUpdateUser?: (updatedUser: UserItem) => void;
}

export default function AdminUserDetailView({
  user,
  onBackToList,
  onToggleStatus,
  onUpdateUser,
}: AdminUserDetailViewProps) {
  // Trạng thái cục bộ của user đang xem
  const [currentUser, setCurrentUser] = useState<UserItem>(user);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // ── MODAL 1: CHỈNH SỬA TÀI KHOẢN ──
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(user.fullName);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editUserCode, setEditUserCode] = useState(user.userCode);
  const [editRole, setEditRole] = useState<'admin' | 'instructor' | 'student'>(user.role);
  const [editDepartment, setEditDepartment] = useState(
    user.department || (user.role === 'instructor' ? 'Khoa Kỹ thuật phần mềm' : 'Lớp SE1848')
  );
  const [editStatus, setEditStatus] = useState<'active' | 'locked'>(user.status);

  // ── MODAL 2: ĐẶT LẠI MẬT KHẨU ──
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'confirm' | 'success'>('confirm');
  const [newTemporaryPassword, setNewTemporaryPassword] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // ── MODAL 3: KHÓA / MỞ KHÓA TÀI KHOẢN ──
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);

  // Tạo chữ cái đầu cho avatar (ví dụ: Nguyễn Minh Anh -> NA)
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const showToast = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 3500);
  };

  // ── XỬ LÝ: MỞ MODAL CHỈNH SỬA ──
  const handleOpenEdit = () => {
    setEditFullName(currentUser.fullName);
    setEditEmail(currentUser.email);
    setEditUserCode(currentUser.userCode);
    setEditRole(currentUser.role);
    setEditDepartment(
      currentUser.department ||
        (currentUser.role === 'instructor' ? 'Khoa Kỹ thuật phần mềm' : 'Lớp SE1848')
    );
    setEditStatus(currentUser.status);
    setIsEditModalOpen(true);
  };

  // ── XỬ LÝ: LƯU FORM CHỈNH SỬA ──
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim() || !editEmail.trim() || !editUserCode.trim()) {
      return;
    }

    const roleNameMap: Record<'admin' | 'instructor' | 'student', string> = {
      admin: 'Quản trị viên',
      instructor: 'Giảng viên',
      student: 'Sinh viên',
    };

    const updated: UserItem = {
      ...currentUser,
      fullName: editFullName.trim(),
      email: editEmail.trim(),
      userCode: editUserCode.trim(),
      role: editRole,
      roleDisplay: roleNameMap[editRole],
      status: editStatus,
      statusDisplay: editStatus === 'active' ? 'Hoạt động' : 'Bị khóa',
      department: editDepartment.trim(),
    };

    setCurrentUser(updated);
    onUpdateUser?.(updated);
    if (updated.status !== currentUser.status) {
      onToggleStatus?.(updated.id, updated.status);
    }

    setIsEditModalOpen(false);
    showToast(`Đã cập nhật thông tin tài khoản ${updated.userCode} thành công.`);
  };

  // ── XỬ LÝ: MỞ MODAL RESET MẬT KHẨU ──
  const handleOpenResetModal = () => {
    setResetStep('confirm');
    setIsCopied(false);
    setIsResetModalOpen(true);
  };

  // ── XỬ LÝ: XÁC NHẬN RESET MẬT KHẨU ──
  const handleConfirmReset = () => {
    // Sinh mật khẩu tạm ngẫu nhiên mạnh
    const randomChars = Math.random().toString(36).substring(2, 7);
    const generated = `Ocl@${new Date().getFullYear()}#${randomChars}`;
    setNewTemporaryPassword(generated);
    setResetStep('success');
    showToast(`Đã đặt lại mật khẩu tạm thời cho tài khoản ${currentUser.userCode}.`);
  };

  // Sao chép mật khẩu vào Clipboard
  const handleCopyPassword = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(newTemporaryPassword);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // ── XỬ LÝ: MỞ MODAL KHÓA / MỞ KHÓA ──
  const handleOpenLockModal = () => {
    setIsLockModalOpen(true);
  };

  // ── XỬ LÝ: XÁC NHẬN KHÓA / MỞ KHÓA ──
  const handleConfirmToggleLock = () => {
    const nextStatus = currentUser.status === 'active' ? 'locked' : 'active';
    const updated: UserItem = {
      ...currentUser,
      status: nextStatus,
      statusDisplay: nextStatus === 'active' ? 'Hoạt động' : 'Bị khóa',
    };

    setCurrentUser(updated);
    onUpdateUser?.(updated);
    onToggleStatus?.(currentUser.id, nextStatus);

    setIsLockModalOpen(false);
    showToast(
      nextStatus === 'locked'
        ? `Đã khóa tài khoản ${currentUser.userCode} thành công.`
        : `Đã mở khóa tài khoản ${currentUser.userCode} thành công.`
    );
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
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs sm:text-sm font-semibold text-blue-800 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* ── THẺ TỔNG QUAN HỒ SƠ (PROFILE CARD) ── */}
      <div className="mt-6 flex flex-col justify-between gap-6 rounded-2xl border border-slate-200/75 bg-white p-6 sm:p-8 shadow-[0_2px_10px_rgba(15,23,42,0.02)] md:flex-row md:items-center">
        {/* Avatar + Thông tin định danh */}
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-lg font-black text-[#2563eb]">
            {getInitials(currentUser.fullName)}
          </div>

          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {currentUser.fullName}
            </h3>
            <p className="mt-1 text-xs sm:text-[13px] text-slate-500 font-medium">
              {currentUser.userCode} • {currentUser.email}
            </p>
            <p className="mt-1 text-xs sm:text-[13px] font-semibold">
              <span className="text-slate-700">{currentUser.roleDisplay}</span>
              <span className="mx-1.5 text-slate-300">•</span>
              <span
                className={
                  currentUser.status === 'active' ? 'text-emerald-600' : 'text-red-600'
                }
              >
                {currentUser.statusDisplay}
              </span>
            </p>
          </div>
        </div>

        {/* 3 Nút hành động nhanh */}
        <div className="flex flex-wrap items-center gap-3">
          {/* NÚT 1: CHỈNH SỬA */}
          <button
            type="button"
            onClick={handleOpenEdit}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
          >
            <Edit3 className="h-4 w-4 text-slate-500" />
            <span>Chỉnh sửa</span>
          </button>

          {/* NÚT 2: ĐẶT LẠI MẬT KHẨU */}
          <button
            type="button"
            onClick={handleOpenResetModal}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
          >
            <KeyRound className="h-4 w-4 text-slate-500" />
            <span>Đặt lại mật khẩu</span>
          </button>

          {/* NÚT 3: KHÓA / MỞ KHÓA */}
          <button
            type="button"
            onClick={handleOpenLockModal}
            className={`inline-flex h-10 items-center gap-2 rounded-xl border px-5 text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer ${
              currentUser.status === 'active'
                ? 'border-slate-200/90 bg-white text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {currentUser.status === 'active' ? (
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
          <h4 className="text-base font-bold text-slate-900">Vai trò &amp; phạm vi</h4>

          <div className="mt-5 space-y-3.5 text-xs sm:text-[13.5px] text-slate-600">
            <p className="font-semibold text-slate-800">
              {currentUser.role === 'instructor'
                ? 'Giảng viên/Giám thị'
                : currentUser.role === 'student'
                ? 'Sinh viên'
                : 'Quản trị viên hệ thống'}
            </p>
            <p>
              {currentUser.department ||
                (currentUser.role === 'instructor'
                  ? 'Khoa Kỹ thuật phần mềm (3 lớp)'
                  : 'Lớp sinh hoạt: SE1848')}
            </p>
            <p>
              {currentUser.role === 'instructor'
                ? '5 lịch kiểm tra phụ trách'
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
              <span className="font-semibold text-slate-800">{currentUser.lastLogin}</span>
            </p>
            <p>
              <span className="font-medium text-slate-500">Hoạt động gần nhất: </span>
              <span className="font-semibold text-slate-800">
                {currentUser.role === 'instructor'
                  ? 'Cập nhật lịch PRJ301-MID'
                  : 'Nộp bài thi Lab 03'}
              </span>
            </p>
            <p>
              <span className="font-medium text-slate-500">Thiết bị/IP: </span>
              <span className="font-semibold text-slate-800">
                Chrome • Windows 11 • 10.21.8.45
              </span>
            </p>
          </div>
        </div>

        {/* Cột 3: Bảo mật tài khoản */}
        <div className="rounded-2xl border border-slate-200/75 bg-white p-6 sm:p-7 shadow-[0_2px_10px_rgba(15,23,42,0.02)] flex flex-col justify-between">
          <h4 className="text-base font-bold text-slate-900">Bảo mật tài khoản</h4>

          <div className="mt-5 space-y-3.5 text-xs sm:text-[13.5px] text-slate-600">
            <p>
              <span className="font-medium text-slate-500">Đổi mật khẩu: </span>
              <span className="font-semibold text-slate-800">28/09/2026</span>
            </p>
            <p>
              <span className="font-medium text-slate-500">Đăng nhập sai: </span>
              <span className="font-semibold text-slate-800">0/5</span>
            </p>
            <p className="font-medium text-emerald-600">Không có phiên bất thường</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: CHỈNH SỬA THÔNG TIN TÀI KHOẢN ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-2xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Chỉnh sửa tài khoản</h3>
                <p className="text-xs text-slate-500">
                  Cập nhật thông tin định danh và quyền của người dùng.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">
              {/* Họ và tên */}
              <div>
                <label className="block text-xs font-bold text-slate-700">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                />
              </div>

              {/* Email trường */}
              <div>
                <label className="block text-xs font-bold text-slate-700">Email trường *</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                />
              </div>

              {/* Mã CB / MSSV */}
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Mã cán bộ / MSSV *
                </label>
                <input
                  type="text"
                  required
                  value={editUserCode}
                  onChange={(e) => setEditUserCode(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                />
              </div>

              {/* Hàng 2 cột: Vai trò & Trạng thái */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Vai trò</label>
                  <select
                    value={editRole}
                    onChange={(e) =>
                      setEditRole(e.target.value as 'admin' | 'instructor' | 'student')
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 cursor-pointer"
                  >
                    <option value="instructor">Giảng viên</option>
                    <option value="student">Sinh viên</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Trạng thái</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'locked')}
                    className="mt-1.5 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 cursor-pointer"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="locked">Bị khóa</option>
                  </select>
                </div>
              </div>

              {/* Đơn vị / Lớp */}
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Đơn vị / Lớp sinh hoạt
                </label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  placeholder="Ví dụ: Khoa Kỹ thuật phần mềm hoặc Lớp SE1848"
                  className="mt-1.5 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                />
              </div>

              {/* Footer Modal Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#2563eb] px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#1d4ed8] cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: ĐẶT LẠI MẬT KHẨU ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-2xl">
            {resetStep === 'confirm' ? (
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  Xác nhận đặt lại mật khẩu?
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Mật khẩu hiện tại của tài khoản{' '}
                  <span className="font-bold text-slate-800">{currentUser.fullName}</span> (
                  <span className="font-semibold text-slate-700">{currentUser.userCode}</span>) sẽ bị
                  vô hiệu hóa ngay lập tức. Hệ thống sẽ cấp một mật khẩu tạm thời mới và kích
                  hoạt yêu cầu đổi mật khẩu ở lần đăng nhập tiếp theo.
                </p>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="rounded-xl bg-amber-600 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-amber-700 cursor-pointer"
                  >
                    Xác nhận đặt lại
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  Đặt lại mật khẩu thành công!
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Dưới đây là mật khẩu tạm mới cho {currentUser.userCode}:
                </p>

                {/* Khung hiển thị mật khẩu tạm có nút copy */}
                <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                  <span className="font-mono text-sm sm:text-base font-black tracking-wider text-emerald-900">
                    {newTemporaryPassword}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-xs hover:bg-emerald-50 cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="mt-3 text-[11.5px] text-slate-500">
                  * Hãy gửi mật khẩu này cho người dùng qua kênh an toàn. Người dùng bắt buộc
                  phải đổi mật khẩu ở lần đăng nhập tiếp theo.
                </p>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="rounded-xl bg-[#2563eb] px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#1d4ed8] cursor-pointer"
                  >
                    Hoàn tất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 3: KHÓA / MỞ KHÓA TÀI KHOẢN ── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {isLockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-2xl">
            {currentUser.status === 'active' ? (
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <ShieldAlert className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  Khóa tài khoản người dùng?
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Bạn có chắc chắn muốn khóa tài khoản{' '}
                  <span className="font-bold text-slate-800">{currentUser.fullName}</span> (
                  <span className="font-semibold text-slate-700">{currentUser.userCode}</span>)?
                  Người dùng này sẽ bị hủy mọi phiên làm việc hiện tại và không thể đăng nhập
                  vào hệ thống cho đến khi được mở khóa.
                </p>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsLockModalOpen(false)}
                    className="rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmToggleLock}
                    className="rounded-xl bg-red-600 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-red-700 cursor-pointer"
                  >
                    Xác nhận khóa tài khoản
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Unlock className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  Mở khóa tài khoản?
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Mở khóa tài khoản cho{' '}
                  <span className="font-bold text-slate-800">{currentUser.fullName}</span> (
                  <span className="font-semibold text-slate-700">{currentUser.userCode}</span>)?
                  Sau khi mở khóa, người dùng sẽ có thể đăng nhập và tiếp tục tham gia thi /
                  giảng dạy bình thường.
                </p>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsLockModalOpen(false)}
                    className="rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmToggleLock}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-700 cursor-pointer"
                  >
                    Xác nhận mở khóa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
