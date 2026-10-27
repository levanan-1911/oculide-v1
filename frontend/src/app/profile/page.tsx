'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Camera,
  Trash2,
  Phone,
  Building,
  Calendar,
  Clock,
  Laptop,
  Check,
  Save,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import InstructorSidebar from '@/components/instructor/InstructorSidebar';
import InstructorTopbar from '@/components/instructor/InstructorTopbar';
import StudentSidebar from '@/components/student/StudentSidebar';
import StudentTopbar from '@/components/student/StudentTopbar';

export default function ProfilePage() {
  const [role, setRole] = useState<'admin' | 'instructor' | 'student'>('admin');
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'activity'>('info');

  // Thông tin cá nhân
  const [name, setName] = useState('Phạm Văn Long');
  const [email, setEmail] = useState('long.pham@oculide.edu.vn');
  const [username, setUsername] = useState('ADMIN_01');
  const [phone, setPhone] = useState('0912 345 678');
  const [department, setDepartment] = useState('Khoa Công Nghệ Thông Tin - Đại học Duy Tân');
  const [joinDate] = useState('15/09/2026');
  const [avatar, setAvatar] = useState<string | null>(null);

  // Đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Cập nhật thông tin
  const [infoMsg, setInfoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Đọc thông tin từ localStorage khi tải trang
  useEffect(() => {
    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role) {
          const r = parsed.role.toLowerCase();
          if (r.includes('admin')) setRole('admin');
          else if (r.includes('instructor') || r.includes('giảng viên')) setRole('instructor');
          else setRole('student');
        }
        if (parsed.name) setName(parsed.name);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.username) setUsername(parsed.username);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.department) setDepartment(parsed.department);
      }

      const storedAvatar = localStorage.getItem('oculide_avatar');
      if (storedAvatar) {
        setAvatar(storedAvatar);
      }
    } catch {
      // ignore
    }
  }, []);

  // Xử lý upload ảnh đại diện (Preview & lưu local)
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Vui lòng chọn ảnh có dung lượng dưới 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatar(result);
      localStorage.setItem('oculide_avatar', result);
      setInfoMsg({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });
      setTimeout(() => setInfoMsg(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    localStorage.removeItem('oculide_avatar');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setInfoMsg({ type: 'success', text: 'Đã xóa ảnh đại diện.' });
    setTimeout(() => setInfoMsg(null), 3000);
  };

  // Lưu thông tin cá nhân
  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInfo(true);
    setInfoMsg(null);

    setTimeout(() => {
      setIsSavingInfo(false);
      try {
        const stored = localStorage.getItem('oculide_user');
        const userObj = stored ? JSON.parse(stored) : {};
        const updated = {
          ...userObj,
          name,
          email,
          phone,
          department,
        };
        localStorage.setItem('oculide_user', JSON.stringify(updated));
      } catch {
        // ignore
      }
      setInfoMsg({ type: 'success', text: 'Thông tin cá nhân đã được lưu thành công!' });
      setTimeout(() => setInfoMsg(null), 3000);
    }, 500);
  };

  // Đổi mật khẩu
  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới phải có tối thiểu 8 ký tự.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu xác nhận không trùng khớp.' });
      return;
    }

    setIsChangingPassword(true);
    setTimeout(() => {
      setIsChangingPassword(false);
      setPasswordMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 3500);
    }, 600);
  };

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'LP';

  const roleBadge =
    role === 'admin'
      ? { label: 'Quản trị viên Hệ thống', class: 'bg-purple-50 text-purple-700 border-purple-200' }
      : role === 'instructor'
      ? { label: 'Giảng viên', class: 'bg-blue-50 text-blue-700 border-blue-200' }
      : { label: 'Sinh viên', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

  // Khối nội dung chính Profile
  const profileBody = (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── CARD 1: HERO HEADER VỚI AVATAR TƯƠNG TÁC ── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-blue-50/60 blur-2xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Khối Avatar tròn */}
            <div className="relative group shrink-0">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={name}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-blue-100 shadow-md transition group-hover:opacity-90"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 text-2xl font-black text-white shadow-md ring-4 ring-blue-100">
                  {initials}
                </div>
              )}

              {/* Nút bấm Camera để upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Thay đổi ảnh đại diện"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-700 focus:outline-none cursor-pointer"
              >
                <Camera className="h-4 w-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Thông tin nhanh */}
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  {name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-bold ${roleBadge.class}`}
                >
                  <Shield className="h-3 w-3" />
                  {roleBadge.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Đang hoạt động
                </span>
              </div>

              <p className="mt-1.5 text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {email}
                </span>
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  ID: <strong className="font-mono text-slate-700">{username}</strong>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  {department}
                </span>
              </p>

              {/* Nút thao tác ảnh phụ */}
              {avatar && (
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    Xóa ảnh đại diện
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4">
          {[
            { id: 'info', label: 'Thông tin cá nhân', icon: User },
            { id: 'security', label: 'Bảo mật & Mật khẩu', icon: KeyRound },
            { id: 'activity', label: 'Hoạt động & Thống kê', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CARD 2: NỘI DUNG TỪNG TAB ── */}
      {activeTab === 'info' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Chi tiết tài khoản</h2>
              <p className="text-xs text-slate-500">Xem và cập nhật thông tin liên hệ của bạn trên hệ thống</p>
            </div>
          </div>

          {infoMsg && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${
                infoMsg.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{infoMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveInfo} className="mt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Họ và tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Email học tập / công tác</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Tên tài khoản / Mã định danh</label>
                <input
                  type="text"
                  value={username}
                  disabled
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Mã định danh do Quản trị viên chỉ định cố định</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Số điện thoại liên hệ</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700">Khoa / Bộ môn công tác</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingInfo}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {isSavingInfo ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form đổi mật khẩu */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Đổi Mật Khẩu</h2>
                <p className="text-xs text-slate-500">Thiết lập mật khẩu mới để bảo vệ tài khoản cá nhân</p>
              </div>
            </div>

            {passwordMsg && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-xl border p-3.5 text-xs font-semibold ${
                  passwordMsg.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu đang sử dụng"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự, bao gồm chữ và số"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới vừa gõ"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {isChangingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu mới'}
                </button>
              </div>
            </form>
          </div>

          {/* Thiết bị đăng nhập gần đây */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">Thiết bị đăng nhập</h3>
            <p className="text-xs text-slate-500 mt-0.5">Lịch sử thiết bị truy cập tài khoản</p>

            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-3">
                <Laptop className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Windows PC • Chrome</p>
                  <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Phiên hiện tại • Đà Nẵng, VN</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">IP: 118.69.182.20</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                <Laptop className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-700">macOS • Safari</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">2 ngày trước • Đà Nẵng, VN</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">IP: 14.238.102.15</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">Tổng quan hoạt động</h2>
          <p className="text-xs text-slate-500 mt-0.5">Thống kê dữ liệu gắn với vai trò của bạn trên nền tảng Oculide</p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {role === 'instructor' ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Lớp phụ trách</span>
                  <p className="mt-2 text-2xl font-black text-slate-900">4 lớp</p>
                  <p className="mt-1 text-xs text-blue-600">CS101, CS102, PRJ301, CSD201</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sinh viên quản lý</span>
                  <p className="mt-2 text-2xl font-black text-slate-900">182 SV</p>
                  <p className="mt-1 text-xs text-emerald-600">Điểm danh qua MSSV</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Đề thi & Lab</span>
                  <p className="mt-2 text-2xl font-black text-slate-900">14 bài</p>
                  <p className="mt-1 text-xs text-purple-600">Đã cấu hình Docker testcase</p>
                </div>
              </>
            ) : role === 'student' ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Lớp tham gia</span>
                  <p className="mt-2 text-2xl font-black text-slate-900">3 môn</p>
                  <p className="mt-1 text-xs text-blue-600">Học kỳ 1 2026-2027</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Bài Lab đã nộp</span>
                  <p className="mt-2 text-2xl font-black text-slate-900">8/10</p>
                  <p className="mt-1 text-xs text-emerald-600">Tỉ lệ đạt: 92% test cases</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cảnh báo AI</span>
                  <p className="mt-2 text-2xl font-black text-slate-900">0 vi phạm</p>
                  <p className="mt-1 text-xs text-emerald-600">Hồ sơ thi trong sạch</p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Toàn bộ lớp học</span>
                  <p className="mt-2 text-2xl font-black text-slate-900">128 lớp</p>
                  <p className="mt-1 text-xs text-blue-600">Đang hoạt động trong kỳ</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Người dùng hệ thống</span>
                  <p className="mt-2 text-2xl font-black text-slate-900">5.420</p>
                  <p className="mt-1 text-xs text-emerald-600">Sinh viên & Giảng viên</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Trạng thái hạ tầng</span>
                  <p className="mt-2 text-2xl font-black text-slate-900">99.98%</p>
                  <p className="mt-1 text-xs text-emerald-600">Docker Sandbox & LiveKit Online</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Render bọc ngoài theo đúng Role của người dùng (Admin / Giảng viên / Sinh viên)
  if (role === 'instructor') {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-[#f4f7f9] font-sans text-slate-800">
        <InstructorSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <InstructorTopbar title="Hồ sơ cá nhân" />
          <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-7">
            {profileBody}
          </main>
        </div>
      </div>
    );
  }

  if (role === 'student') {
    return (
      <div className="flex min-h-screen bg-[#f8fafc]">
        <StudentSidebar />
        <div className="flex flex-1 flex-col">
          <StudentTopbar />
          <main className="flex-1 px-4 py-6 sm:px-8">
            {profileBody}
          </main>
        </div>
      </div>
    );
  }

  // Mặc định hoặc Admin
  return (
    <div className="flex min-h-screen w-full bg-[#f4f7f9] text-slate-800">
      <AdminSidebar activeModule="profile" />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar title="Hồ sơ cá nhân" />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {profileBody}
        </main>
      </div>
    </div>
  );
}
