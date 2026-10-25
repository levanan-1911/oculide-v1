'use client';

import React, { FormEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UploadCloud,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';

export type UserRole = 'instructor' | 'student' | 'admin';
export type UserStatus = 'active' | 'locked';

export interface UserRow {
  id: number;
  userCode: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  department: string;
  lastLogin: string;
  lastLoginIp?: string;
  lastPasswordChange?: string;
}

const INITIAL_USERS: UserRow[] = [
  {
    id: 1,
    userCode: 'GV0012',
    fullName: 'Nguyễn Minh Anh',
    email: 'minhanh@oclide.edu.vn',
    phone: '0912 345 678',
    role: 'instructor',
    status: 'active',
    department: 'Khoa Kỹ thuật phần mềm',
    lastLogin: '16/10/2026 19:42',
    lastLoginIp: '14.238.12.98 · Cầu Giấy, Hà Nội',
    lastPasswordChange: '10/09/2026',
  },
  {
    id: 2,
    userCode: 'SV184801',
    fullName: 'Trần Thu Bình',
    email: 'binhtt@oclide.edu.vn',
    phone: '0988 123 456',
    role: 'student',
    status: 'active',
    department: 'Lớp SE1848 - Khoa CNTT',
    lastLogin: '16/10/2026 19:37',
    lastLoginIp: '118.70.182.44 · Đống Đa, Hà Nội',
    lastPasswordChange: '01/10/2026',
  },
  {
    id: 3,
    userCode: 'GV0026',
    fullName: 'Lê Hải Nam',
    email: 'namlh@oclide.edu.vn',
    phone: '0903 889 911',
    role: 'instructor',
    status: 'locked',
    department: 'Bộ môn An toàn thông tin',
    lastLogin: '15/10/2026 08:21',
    lastLoginIp: '42.115.89.210 · Ba Đình, Hà Nội',
    lastPasswordChange: '15/08/2026',
  },
  {
    id: 4,
    userCode: 'SV184803',
    fullName: 'Phạm Minh Châu',
    email: 'chaupm@oclide.edu.vn',
    phone: '0977 654 321',
    role: 'student',
    status: 'active',
    department: 'Lớp SE1848 - Khoa CNTT',
    lastLogin: '16/10/2026 18:56',
    lastLoginIp: '27.72.61.15 · Thanh Xuân, Hà Nội',
    lastPasswordChange: '22/09/2026',
  },
  {
    id: 5,
    userCode: 'QT0001',
    fullName: 'Long Phạm',
    email: 'admin.long@oclide.edu.vn',
    phone: '0966 999 888',
    role: 'admin',
    status: 'active',
    department: 'Phòng Quản trị hệ thống',
    lastLogin: 'Hôm nay 20:45',
    lastLoginIp: '14.162.144.12 · Hà Nội',
    lastPasswordChange: '05/10/2026',
  },
];

export default function UserManagerPage() {
  const [users, setUsers] = useState<UserRow[]>(INITIAL_USERS);
  const [selectedUserId, setSelectedUserId] = useState<number>(INITIAL_USERS[0].id);

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('Tất cả vai trò');
  const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');

  // Thông báo Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState('');

  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editError, setEditError] = useState('');

  const [resettingUser, setResettingUser] = useState<UserRow | null>(null);
  const [resetStep, setResetStep] = useState<'confirm' | 'success'>('confirm');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const [togglingUser, setTogglingUser] = useState<UserRow | null>(null);
  const [lockReason, setLockReason] = useState('');

  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  }

  // Dữ liệu lọc
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return users.filter((u) => {
      const matchSearch =
        !query ||
        u.userCode.toLocaleLowerCase('vi').includes(query) ||
        u.fullName.toLocaleLowerCase('vi').includes(query) ||
        u.email.toLocaleLowerCase('vi').includes(query) ||
        u.department.toLocaleLowerCase('vi').includes(query);

      const matchRole =
        roleFilter === 'Tất cả vai trò' ||
        (roleFilter === 'Giảng viên' && u.role === 'instructor') ||
        (roleFilter === 'Sinh viên' && u.role === 'student') ||
        (roleFilter === 'Quản trị viên' && u.role === 'admin');

      const matchStatus =
        statusFilter === 'Tất cả trạng thái' ||
        (statusFilter === 'Hoạt động' && u.status === 'active') ||
        (statusFilter === 'Bị khóa' && u.status === 'locked');

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const selectedUser = useMemo(() => {
    return users.find((u) => u.id === selectedUserId) ?? users[0] ?? null;
  }, [users, selectedUserId]);

  // Thống kê KPI
  const instructorCount = useMemo(() => users.filter((u) => u.role === 'instructor').length, [users]);
  const activeStudentCount = useMemo(
    () => users.filter((u) => u.role === 'student' && u.status === 'active').length,
    [users]
  );
  const lockedCount = useMemo(() => users.filter((u) => u.status === 'locked').length, [users]);

  // Initials cho Avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // ── XỬ LÝ TẠO MỚI TÀI KHOẢN ──
  function handleCreateUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const userCode = String(formData.get('userCode') ?? '').trim().toUpperCase();
    const fullName = String(formData.get('fullName') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const role = String(formData.get('role') ?? 'student') as UserRole;
    const department = String(formData.get('department') ?? '').trim();
    const status = String(formData.get('status') ?? 'active') as UserStatus;

    if (!userCode || !fullName || !email) {
      setCreateError('Vui lòng điền đầy đủ mã tài khoản, họ tên và email.');
      return;
    }

    if (users.some((u) => u.userCode.toLocaleLowerCase('vi') === userCode.toLocaleLowerCase('vi'))) {
      setCreateError('Mã tài khoản này đã tồn tại trong hệ thống.');
      return;
    }

    const newUser: UserRow = {
      id: Date.now(),
      userCode,
      fullName,
      email,
      phone: phone || 'Chưa cập nhật',
      role,
      status,
      department: department || (role === 'instructor' ? 'Khoa CNTT' : 'Lớp mới'),
      lastLogin: 'Chưa đăng nhập',
      lastLoginIp: 'Chưa ghi nhận',
      lastPasswordChange: 'Hôm nay',
    };

    setUsers((prev) => [newUser, ...prev]);
    setSelectedUserId(newUser.id);
    setIsCreateModalOpen(false);
    setCreateError('');
    showToast(`Đã tạo thành công tài khoản ${newUser.userCode} - ${newUser.fullName}.`);
  }

  // ── XỬ LÝ LƯU CHỈNH SỬA TÀI KHOẢN ──
  function handleSaveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingUser) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const userCode = String(formData.get('userCode') ?? '').trim().toUpperCase();
    const fullName = String(formData.get('fullName') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const role = String(formData.get('role') ?? 'student') as UserRole;
    const department = String(formData.get('department') ?? '').trim();
    const status = String(formData.get('status') ?? 'active') as UserStatus;

    if (!userCode || !fullName || !email) {
      setEditError('Mã tài khoản, họ tên và email không được để trống.');
      return;
    }

    if (
      userCode.toLocaleLowerCase('vi') !== editingUser.userCode.toLocaleLowerCase('vi') &&
      users.some((u) => u.userCode.toLocaleLowerCase('vi') === userCode.toLocaleLowerCase('vi'))
    ) {
      setEditError('Mã tài khoản này đã trùng với tài khoản khác.');
      return;
    }

    const updated: UserRow = {
      ...editingUser,
      userCode,
      fullName,
      email,
      phone: phone || editingUser.phone,
      role,
      department: department || editingUser.department,
      status,
    };

    setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updated : u)));
    setEditingUser(null);
    setEditError('');
    showToast(`Đã cập nhật thông tin tài khoản ${updated.userCode}.`);
  }

  // ── XỬ LÝ ĐẶT LẠI MẬT KHẨU ──
  function openResetPasswordModal(userItem: UserRow) {
    setResettingUser(userItem);
    setResetStep('confirm');
    setIsCopied(false);
    setTemporaryPassword('');
  }

  function confirmResetPassword() {
    if (!resettingUser) return;
    const randomChars = Math.random().toString(36).substring(2, 7);
    const generated = `Ocl@${new Date().getFullYear()}#${randomChars}`;
    setTemporaryPassword(generated);
    setResetStep('success');
    showToast(`Đã tạo mật khẩu tạm mới cho tài khoản ${resettingUser.userCode}.`);
  }

  function handleCopyPassword() {
    if (navigator.clipboard && temporaryPassword) {
      navigator.clipboard.writeText(temporaryPassword);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }

  // ── XỬ LÝ KHÓA / MỞ KHÓA TÀI KHOẢN ──
  function openToggleStatusModal(userItem: UserRow) {
    setTogglingUser(userItem);
    setLockReason('');
  }

  function confirmToggleStatus() {
    if (!togglingUser) return;
    const newStatus: UserStatus = togglingUser.status === 'active' ? 'locked' : 'active';
    setUsers((prev) =>
      prev.map((u) => (u.id === togglingUser.id ? { ...u, status: newStatus } : u))
    );
    showToast(
      newStatus === 'locked'
        ? `Tài khoản ${togglingUser.userCode} đã được chuyển sang trạng thái Khóa.`
        : `Tài khoản ${togglingUser.userCode} đã được mở khóa thành công.`
    );
    setTogglingUser(null);
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f4f7f9] text-slate-800">
      {/* Sidebar quản trị */}
      <AdminSidebar activeModule="users" />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar trên cùng */}
        <AdminTopbar title="Quản lý người dùng & phân quyền" />

        {/* Thông báo Toast dạng nổi */}
        {toastMessage && (
          <aside
            role="status"
            aria-live="polite"
            className="fixed top-20 right-8 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-lg shadow-emerald-900/10 transition-all animate-in fade-in slide-in-from-top-4"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </aside>
        )}

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1440px]">
            {/* Header: Danh mục, Tiêu đề, Phụ đề, Nút hành động */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                  Quản lý đào tạo
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">
                  Người dùng &amp; phân quyền
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Quản lý danh sách tài khoản, vai trò và trạng thái hoạt động trên cùng một màn hình.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkImportOpen(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                  <span>Nhập Excel/CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreateError('');
                    setIsCreateModalOpen(true);
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tạo tài khoản</span>
                </button>
              </div>
            </div>

            {/* 4 Thẻ chỉ số KPI theo đúng giao diện chuẩn */}
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Tổng người dùng',
                  value: users.length,
                  icon: Users,
                  color: 'bg-blue-50 text-blue-600',
                },
                {
                  label: 'Giảng viên',
                  value: instructorCount,
                  icon: UserCheck,
                  color: 'bg-indigo-50 text-indigo-600',
                },
                {
                  label: 'Sinh viên hoạt động',
                  value: activeStudentCount,
                  icon: GraduationCap,
                  color: 'bg-emerald-50 text-emerald-600',
                },
                {
                  label: 'Đang bị khóa',
                  value: lockedCount,
                  icon: Lock,
                  color: 'bg-rose-50 text-rose-600',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.label}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30"
                  >
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-slate-500">{item.label}</p>
                      <p className="mt-0.5 text-2xl font-extrabold text-slate-900">{item.value}</p>
                    </div>
                  </article>
                );
              })}
            </section>

            {/* Khung lọc dữ liệu: Tìm kiếm + Vai trò + Trạng thái */}
            <section className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30 sm:p-6">
              <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_220px]">
                <label className="relative block">
                  <span className="sr-only">Tìm tài khoản</span>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo mã, họ tên hoặc email..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <SelectFilter
                  label="Lọc theo vai trò"
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={['Tất cả vai trò', 'Giảng viên', 'Sinh viên', 'Quản trị viên']}
                />
                <SelectFilter
                  label="Lọc theo trạng thái"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={['Tất cả trạng thái', 'Hoạt động', 'Bị khóa']}
                />
              </div>
            </section>

            {/* Bố cục 2 cột Master - Detail (Tương tự Lớp & Sinh viên) */}
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(380px,4fr)]">
              {/* CỘT TRÁI: DANH SÁCH BẢNG TÀI KHOẢN (MASTER) */}
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="font-bold text-slate-900">Danh sách tài khoản</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{filteredUsers.length} tài khoản phù hợp</p>
                  </div>
                  <Users className="h-5 w-5 text-slate-300" />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-5 py-3">Mã / Họ tên</th>
                        <th scope="col" className="px-4 py-3">Vai trò</th>
                        <th scope="col" className="px-4 py-3">Đơn vị / Lớp</th>
                        <th scope="col" className="px-4 py-3">Trạng thái</th>
                        <th scope="col" className="px-5 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((user) => {
                        const isSelected = selectedUserId === user.id;
                        return (
                          <tr
                            key={user.id}
                            onClick={() => setSelectedUserId(user.id)}
                            className={`transition-colors cursor-pointer ${
                              isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-bold text-slate-900">{user.userCode}</p>
                              <p className="mt-0.5 text-xs font-medium text-slate-700">{user.fullName}</p>
                              <p className="text-[11px] text-slate-400">{user.email}</p>
                            </td>

                            <td className="px-4 py-4">
                              <UserRoleBadge role={user.role} />
                            </td>

                            <td className="px-4 py-4 text-xs font-medium text-slate-600">
                              {user.department}
                            </td>

                            <td className="px-4 py-4">
                              <UserStatusBadge status={user.status} />
                            </td>

                            <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedUserId(user.id)}
                                  title="Xem chi tiết tài khoản"
                                  aria-label={`Xem tài khoản ${user.userCode}`}
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-600 text-white shadow-sm'
                                      : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                                  }`}
                                >
                                  <Eye className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditError('');
                                    setEditingUser(user);
                                  }}
                                  title="Chỉnh sửa tài khoản"
                                  aria-label={`Sửa tài khoản ${user.userCode}`}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-amber-50 hover:text-amber-600 cursor-pointer"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openToggleStatusModal(user)}
                                  title={user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                  aria-label={`${user.status === 'active' ? 'Khóa' : 'Mở khóa'} ${user.userCode}`}
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
                                    user.status === 'active'
                                      ? 'text-slate-500 hover:bg-rose-50 hover:text-rose-600'
                                      : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'
                                  }`}
                                >
                                  {user.status === 'active' ? (
                                    <Lock className="h-4 w-4" />
                                  ) : (
                                    <Unlock className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-14 text-center text-sm text-slate-400">
                            Không tìm thấy tài khoản người dùng phù hợp.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* CỘT PHẢI: CHI TIẾT TÀI KHOẢN (DETAIL VIEW) */}
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-slate-900">Chi tiết người dùng</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {selectedUser
                          ? `${selectedUser.userCode} · ${selectedUser.fullName}`
                          : 'Chọn một tài khoản để xem chi tiết'}
                      </p>
                    </div>
                    <Shield className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                  </div>
                </div>

                {selectedUser ? (
                  <div className="p-5 space-y-5">
                    {/* Hero Profile */}
                    <div className="flex items-center gap-4 rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-md shadow-blue-500/20">
                        {getInitials(selectedUser.fullName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-bold text-slate-900">
                            {selectedUser.fullName}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500">{selectedUser.email}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <UserRoleBadge role={selectedUser.role} />
                          <UserStatusBadge status={selectedUser.status} />
                        </div>
                      </div>
                    </div>

                    {/* Danh mục chi tiết */}
                    <div className="space-y-3 text-xs">
                      <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Thông tin định danh
                        </p>
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-500">Mã tài khoản</span>
                          <span className="font-bold text-slate-800">{selectedUser.userCode}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-500">Số điện thoại</span>
                          <span className="font-semibold text-slate-700">{selectedUser.phone || 'Chưa có'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Khoa / Đơn vị</span>
                          <span className="font-semibold text-slate-800 text-right">{selectedUser.department}</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Bảo mật &amp; Đăng nhập
                        </p>
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-500">Lần đăng nhập cuối</span>
                          <span className="font-semibold text-slate-700">{selectedUser.lastLogin}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-500">Địa chỉ IP</span>
                          <span className="font-mono text-[11px] text-slate-600">{selectedUser.lastLoginIp || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Đổi mật khẩu lần cuối</span>
                          <span className="font-semibold text-slate-700">{selectedUser.lastPasswordChange || 'Chưa ghi nhận'}</span>
                        </div>
                      </div>
                    </div>

                    {/* 3 Nút hành động nhanh */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEditError('');
                          setEditingUser(selectedUser);
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                      >
                        <Pencil className="h-4 w-4 text-slate-500" />
                        <span>Chỉnh sửa thông tin</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openResetPasswordModal(selectedUser)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 cursor-pointer"
                      >
                        <KeyRound className="h-4 w-4 text-amber-600" />
                        <span>Đặt lại mật khẩu</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openToggleStatusModal(selectedUser)}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition cursor-pointer ${
                          selectedUser.status === 'active'
                            ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {selectedUser.status === 'active' ? (
                          <>
                            <Lock className="h-4 w-4 text-rose-600" />
                            <span>Khóa tài khoản này</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="h-4 w-4 text-emerald-600" />
                            <span>Mở khóa tài khoản này</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="px-5 py-14 text-center text-sm text-slate-400">
                    Vui lòng chọn một người dùng từ bảng danh sách bên trái.
                  </p>
                )}
              </section>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Dữ liệu người dùng &amp; phân quyền hoạt động đồng bộ với hệ sinh thái xác thực Oculide.
            </p>
          </div>
        </main>
      </div>

      {/* ── MODAL 1: TẠO TÀI KHOẢN MỚI ── */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="create-user-title" className="text-lg font-bold text-slate-900">
                  Tạo tài khoản người dùng mới
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Nhập thông tin tài khoản và cấp quyền truy cập ban đầu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Đóng cửa sổ"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Mã tài khoản <span className="text-red-500">*</span>
                  <input
                    name="userCode"
                    required
                    placeholder="VD: GV0035 hoặc SV184810"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-700">
                  Vai trò hệ thống <span className="text-red-500">*</span>
                  <select
                    name="role"
                    required
                    defaultValue="student"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="student">Sinh viên</option>
                    <option value="instructor">Giảng viên</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs font-semibold text-slate-700">
                Họ và tên <span className="text-red-500">*</span>
                <input
                  name="fullName"
                  required
                  placeholder="VD: Nguyễn Văn An"
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Địa chỉ Email <span className="text-red-500">*</span>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="VD: an.nv@oclide.edu.vn"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-700">
                  Số điện thoại
                  <input
                    name="phone"
                    placeholder="VD: 0912 345 678"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Khoa / Lớp phụ trách
                  <input
                    name="department"
                    placeholder="VD: Khoa Kỹ thuật phần mềm"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-700">
                  Trạng thái kích hoạt
                  <select
                    name="status"
                    defaultValue="active"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="active">Hoạt động ngay</option>
                    <option value="locked">Tạm khóa ban đầu</option>
                  </select>
                </label>
              </div>

              {createError && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {createError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white transition hover:bg-blue-700 cursor-pointer"
                >
                  Xác nhận tạo tài khoản
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ── MODAL 2: NHẬP EXCEL / CSV ── */}
      {isBulkImportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsBulkImportOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="import-title" className="text-lg font-bold text-slate-900">
                  Nhập danh sách tài khoản bằng Excel / CSV
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Tải lên tệp danh sách để khởi tạo nhanh hàng loạt người dùng vào hệ thống.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkImportOpen(false)}
                aria-label="Đóng"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* File Dropzone */}
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-8 text-center transition hover:border-blue-400 hover:bg-blue-50/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-800">
                  Kéo thả tệp dữ liệu vào đây hoặc{' '}
                  <span className="text-blue-600 underline cursor-pointer">chọn từ máy tính</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Hỗ trợ định dạng .xlsx, .xls, .csv (Dung lượng tối đa: 10MB)
                </p>
              </div>

              {/* Tải mẫu Excel */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-3.5">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Tệp mẫu chuẩn Oculide_User_Template.xlsx</p>
                    <p className="text-[11px] text-slate-400">Bao gồm các cột: Mã, Họ tên, Email, Vai trò, Đơn vị</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Đang tải xuống tệp biểu mẫu mẫu Oculide...')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Tải tệp mẫu</span>
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsBulkImportOpen(false)}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkImportOpen(false);
                    showToast('Đã nhập thành công 42 tài khoản sinh viên từ tệp Excel mẫu.');
                  }}
                  className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                >
                  Bắt đầu xử lý nhập
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── MODAL 3: CHỈNH SỬA TÀI KHOẢN ── */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingUser(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="edit-user-title" className="text-lg font-bold text-slate-900">
                  Chỉnh sửa thông tin tài khoản
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Cập nhật thông tin cho tài khoản <strong className="text-slate-800">{editingUser.userCode}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                aria-label="Đóng"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Mã tài khoản <span className="text-red-500">*</span>
                  <input
                    name="userCode"
                    required
                    defaultValue={editingUser.userCode}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-700">
                  Vai trò hệ thống <span className="text-red-500">*</span>
                  <select
                    name="role"
                    required
                    defaultValue={editingUser.role}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="student">Sinh viên</option>
                    <option value="instructor">Giảng viên</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs font-semibold text-slate-700">
                Họ và tên <span className="text-red-500">*</span>
                <input
                  name="fullName"
                  required
                  defaultValue={editingUser.fullName}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Địa chỉ Email <span className="text-red-500">*</span>
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={editingUser.email}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-700">
                  Số điện thoại
                  <input
                    name="phone"
                    defaultValue={editingUser.phone}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Khoa / Lớp phụ trách
                  <input
                    name="department"
                    defaultValue={editingUser.department}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-700">
                  Trạng thái
                  <select
                    name="status"
                    defaultValue={editingUser.status}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="locked">Bị khóa</option>
                  </select>
                </label>
              </div>

              {editError && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {editError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ── MODAL 4: ĐẶT LẠI MẬT KHẨU (2-STEP) ── */}
      {resettingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setResettingUser(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-pass-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            {resetStep === 'confirm' ? (
              <>
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 id="reset-pass-title" className="text-lg font-bold text-slate-900">
                      Đặt lại mật khẩu
                    </h2>
                    <p className="text-xs text-slate-500">Cấp mật khẩu ngẫu nhiên tạm thời.</p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  Bạn có chắc chắn muốn đặt lại mật khẩu cho tài khoản{' '}
                  <strong className="font-bold text-slate-900">
                    {resettingUser.userCode} ({resettingUser.fullName})
                  </strong>
                  ? Mật khẩu cũ sẽ bị vô hiệu ngay lập tức.
                </p>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setResettingUser(null)}
                    className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={confirmResetPassword}
                    className="h-10 rounded-xl bg-amber-600 px-4 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer"
                  >
                    Tạo mật khẩu tạm
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Mật khẩu tạm đã được tạo</h2>
                    <p className="text-xs text-slate-500">Tài khoản: {resettingUser.userCode}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4">
                  <p className="text-xs text-slate-500">Mật khẩu tạm mới:</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <code className="text-base font-extrabold tracking-wider text-blue-700 font-mono">
                      {temporaryPassword}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm border border-blue-200 hover:bg-blue-50 cursor-pointer"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{isCopied ? 'Đã sao chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                  Người dùng sẽ nhận được yêu cầu đổi lại mật khẩu cá nhân ngay trong lần đăng nhập kế tiếp.
                </p>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setResettingUser(null)}
                    className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                  >
                    Hoàn tất
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* ── MODAL 5: KHÓA / MỞ KHÓA TÀI KHOẢN ── */}
      {togglingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setTogglingUser(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="toggle-status-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  togglingUser.status === 'active' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {togglingUser.status === 'active' ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
              </div>
              <div>
                <h2 id="toggle-status-title" className="text-lg font-bold text-slate-900">
                  {togglingUser.status === 'active' ? 'Xác nhận khóa tài khoản' : 'Xác nhận mở khóa tài khoản'}
                </h2>
                <p className="text-xs text-slate-500">Mã người dùng: {togglingUser.userCode}</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              {togglingUser.status === 'active' ? (
                <>
                  Bạn có chắc chắn muốn khóa tài khoản{' '}
                  <strong className="font-bold text-slate-900">
                    {togglingUser.fullName} ({togglingUser.userCode})
                  </strong>
                  ? Người dùng sẽ không thể đăng nhập hoặc tham gia phòng thi cho đến khi được mở khóa.
                </>
              ) : (
                <>
                  Bạn có chắc chắn muốn mở khóa tài khoản{' '}
                  <strong className="font-bold text-slate-900">
                    {togglingUser.fullName} ({togglingUser.userCode})
                  </strong>
                  ? Người dùng sẽ có thể đăng nhập bình thường vào hệ thống.
                </>
              )}
            </p>

            {togglingUser.status === 'active' && (
              <label className="mt-3 block text-xs font-semibold text-slate-700">
                Lý do khóa tài khoản (Tùy chọn)
                <input
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="VD: Vi phạm quy chế thi cử, theo yêu cầu phòng đào tạo..."
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </label>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTogglingUser(null)}
                className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmToggleStatus}
                className={`h-10 rounded-xl px-4 text-xs font-semibold text-white cursor-pointer ${
                  togglingUser.status === 'active'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {togglingUser.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ── CÁC THÀNH PHẦN PHỤ TRỢ (HELPER COMPONENTS) ──

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

function UserStatusBadge({ status }: { status: UserStatus }) {
  const isActive = status === 'active';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
        isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}
      />
      {isActive ? 'Hoạt động' : 'Bị khóa'}
    </span>
  );
}

function UserRoleBadge({ role }: { role: UserRole }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/60">
        Quản trị viên
      </span>
    );
  }
  if (role === 'instructor') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/60">
        Giảng viên
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60">
      Sinh viên
    </span>
  );
}

