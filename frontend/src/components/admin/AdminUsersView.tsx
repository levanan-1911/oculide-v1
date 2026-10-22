'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, UserPlus, Shield } from 'lucide-react';

export interface UserItem {
  id: number;
  userCode: string;
  fullName: string;
  email: string;
  role: 'admin' | 'instructor' | 'student';
  roleDisplay: string;
  status: 'active' | 'locked';
  statusDisplay: string;
  lastLogin: string;
}

// Dữ liệu mẫu tĩnh theo đúng 100% hình ảnh thiết kế
const INITIAL_USERS: UserItem[] = [
  {
    id: 1,
    userCode: 'GV0012',
    fullName: 'Nguyễn Minh Anh',
    email: 'minhanh@oclide.edu.vn',
    role: 'instructor',
    roleDisplay: 'Giảng viên',
    status: 'active',
    statusDisplay: 'Hoạt động',
    lastLogin: '16/10/2026 19:42',
  },
  {
    id: 2,
    userCode: 'SV184801',
    fullName: 'Trần Thu Bình',
    email: 'binhtt@oclide.edu.vn',
    role: 'student',
    roleDisplay: 'Sinh viên',
    status: 'active',
    statusDisplay: 'Hoạt động',
    lastLogin: '16/10/2026 19:37',
  },
  {
    id: 3,
    userCode: 'GV0026',
    fullName: 'Lê Hải Nam',
    email: 'namlh@oclide.edu.vn',
    role: 'instructor',
    roleDisplay: 'Giảng viên',
    status: 'locked',
    statusDisplay: 'Bị khóa',
    lastLogin: '15/10/2026 08:21',
  },
  {
    id: 4,
    userCode: 'SV184803',
    fullName: 'Phạm Minh Châu',
    email: 'chaupm@oclide.edu.vn',
    role: 'student',
    roleDisplay: 'Sinh viên',
    status: 'active',
    statusDisplay: 'Hoạt động',
    lastLogin: '16/10/2026 18:56',
  },
];

export default function AdminUsersView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'instructor' | 'student'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'locked'>('all');

  // Lọc dữ liệu theo tìm kiếm, vai trò, trạng thái
  const filteredUsers = useMemo(() => {
    return INITIAL_USERS.filter((user) => {
      const matchSearch =
        searchTerm.trim() === '' ||
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchRole =
        selectedRole === 'all' || user.role === selectedRole;

      const matchStatus =
        selectedStatus === 'all' || user.status === selectedStatus;

      return matchSearch && matchRole && matchStatus;
    });
  }, [searchTerm, selectedRole, selectedStatus]);

  return (
    <div className="mx-auto max-w-[1440px] font-sans text-slate-800">
      {/* ── TIÊU ĐỀ TRANG VÀ 2 NÚT HÀNH ĐỘNG ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[26px]">
            Người dùng &amp; phân quyền
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-[13.5px]">
            Quản lý tài khoản, vai trò và phạm vi truy cập trên toàn hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
          >
            <Shield className="h-4 w-4 text-slate-500" />
            <span>Vai trò &amp; quyền</span>
          </button>

          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563eb] px-5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-blue-700 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tạo tài khoản</span>
          </button>
        </div>
      </div>

      {/* ── HÀNG 4 THẺ CHỈ SỐ KPI ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Thẻ 1: Tổng tài khoản */}
        <div className="rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)]">
          <p className="text-xs font-semibold text-slate-500">Tổng tài khoản</p>
          <p className="mt-3 text-[30px] font-extrabold leading-none tracking-tight text-slate-900">
            2.486
          </p>
        </div>

        {/* Thẻ 2: Giảng viên */}
        <div className="rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)]">
          <p className="text-xs font-semibold text-slate-500">Giảng viên</p>
          <p className="mt-3 text-[30px] font-extrabold leading-none tracking-tight text-slate-900">
            126
          </p>
        </div>

        {/* Thẻ 3: Sinh viên */}
        <div className="rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)]">
          <p className="text-xs font-semibold text-slate-500">Sinh viên</p>
          <p className="mt-3 text-[30px] font-extrabold leading-none tracking-tight text-slate-900">
            2.348
          </p>
        </div>

        {/* Thẻ 4: Đang bị khóa */}
        <div className="rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)]">
          <p className="text-xs font-semibold text-slate-500">Đang bị khóa</p>
          <p className="mt-3 text-[30px] font-extrabold leading-none tracking-tight text-slate-900">
            12
          </p>
        </div>
      </div>

      {/* ── BỘ LỌC VÀ TÌM KIẾM ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
        {/* Ô Tìm kiếm */}
        <div className="md:col-span-6">
          <label
            htmlFor="user-search"
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400"
          >
            TÌM KIẾM
          </label>
          <div className="relative">
            <input
              id="user-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nhập họ tên, email hoặc mã số..."
              className="h-10 w-full rounded-xl border border-slate-200/90 bg-white px-4 text-xs sm:text-sm text-slate-700 placeholder-slate-400 shadow-sm transition-colors focus:border-blue-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Lọc theo Vai trò */}
        <div className="md:col-span-3">
          <label
            htmlFor="user-role-filter"
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400"
          >
            VAI TRÒ
          </label>
          <div className="relative">
            <select
              id="user-role-filter"
              value={selectedRole}
              onChange={(e) =>
                setSelectedRole(e.target.value as 'all' | 'instructor' | 'student')
              }
              className="h-10 w-full appearance-none rounded-xl border border-slate-200/90 bg-white px-4 pr-9 text-xs sm:text-sm font-medium text-slate-700 shadow-sm transition-colors focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="instructor">Giảng viên</option>
              <option value="student">Sinh viên</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        {/* Lọc theo Trạng thái */}
        <div className="md:col-span-3">
          <label
            htmlFor="user-status-filter"
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400"
          >
            TRẠNG THÁI
          </label>
          <div className="relative">
            <select
              id="user-status-filter"
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as 'all' | 'active' | 'locked')
              }
              className="h-10 w-full appearance-none rounded-xl border border-slate-200/90 bg-white px-4 pr-9 text-xs sm:text-sm font-medium text-slate-700 shadow-sm transition-colors focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="locked">Bị khóa</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          </div>
        </div>
      </div>

      {/* ── BẢNG DANH SÁCH NGƯỜI DÙNG ── */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/75 bg-white shadow-[0_2px_10px_rgba(15,23_42,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 pl-6 pr-4">MÃ</th>
                <th className="py-3.5 px-4">HỌ TÊN / EMAIL</th>
                <th className="py-3.5 px-4">VAI TRÒ</th>
                <th className="py-3.5 px-4">TRẠNG THÁI</th>
                <th className="py-3.5 px-4">ĐĂNG NHẬP GẦN NHẤT</th>
                <th className="py-3.5 pl-4 pr-6 text-right">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-slate-50/60"
                  >
                    {/* Cột 1: Mã */}
                    <td className="py-4 pl-6 pr-4 font-bold text-slate-800">
                      {user.userCode}
                    </td>

                    {/* Cột 2: Họ tên / Email */}
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-900">{user.fullName}</p>
                      <p className="mt-0.5 text-xs text-slate-400 font-normal">
                        {user.email}
                      </p>
                    </td>

                    {/* Cột 3: Vai trò */}
                    <td className="py-4 px-4 font-medium text-slate-700">
                      {user.roleDisplay}
                    </td>

                    {/* Cột 4: Trạng thái */}
                    <td className="py-4 px-4 font-semibold text-slate-800">
                      {user.statusDisplay}
                    </td>

                    {/* Cột 5: Đăng nhập gần nhất */}
                    <td className="py-4 px-4 text-slate-600">
                      {user.lastLogin}
                    </td>

                    {/* Cột 6: Nút Chi tiết */}
                    <td className="py-4 pl-4 pr-6 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-xs text-slate-400"
                  >
                    Không tìm thấy người dùng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

