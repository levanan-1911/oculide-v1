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
  BookOpen,
  Table2,
  GraduationCap,
  Save,
  Check,
  Eye,
  EyeOff,
  ArrowRight,
  Award,
  Layers,
} from 'lucide-react';

export default function InstructorProfilePage() {
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'teaching'>('info');

  // Thông tin Giảng viên
  const [name, setName] = useState('Phạm Văn Long');
  const [email, setEmail] = useState('long.pham@oculide.edu.vn');
  const [lecturerId, setLecturerId] = useState('GV2026_089');
  const [academicDegree, setAcademicDegree] = useState('Thạc sĩ Kỹ thuật Phần mềm');
  const [phone, setPhone] = useState('0912 345 678');
  const [department, setDepartment] = useState('Khoa Công Nghệ Thông Tin');
  const [office, setOffice] = useState('Phòng 402 - Tòa nhà A - Cơ sở Hòa Khánh');
  const [avatar, setAvatar] = useState<string | null>(null);

  // Đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
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
        if (parsed.name) setName(parsed.name);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.lecturerId) setLecturerId(parsed.lecturerId);
        if (parsed.academicDegree) setAcademicDegree(parsed.academicDegree);
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
          lecturerId,
          academicDegree,
          department,
          office,
        };
        localStorage.setItem('oculide_user', JSON.stringify(updated));
      } catch {
        // ignore
      }
      setInfoMsg({ type: 'success', text: 'Thông tin hồ sơ giảng viên đã được lưu thành công!' });
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
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Xác nhận mật khẩu mới không khớp.' });
      return;
    }

    setIsChangingPassword(true);
    setTimeout(() => {
      setIsChangingPassword(false);
      setPasswordMsg({ type: 'success', text: 'Đổi mật khẩu thành công! Hãy dùng mật khẩu mới trong lần đăng nhập tới.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 4000);
    }, 600);
  };

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'GV';

  return (
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
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-xs font-bold text-blue-700">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Giảng viên chính
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Đang giảng dạy
                </span>
              </div>

              <p className="mt-1.5 text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {email}
                </span>
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Mã GV: <strong className="font-mono text-slate-700">{lecturerId}</strong>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-slate-400" />
                  {academicDegree}
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
            { id: 'info', label: 'Thông tin giảng viên', icon: User },
            { id: 'security', label: 'Bảo mật & Mật khẩu', icon: KeyRound },
            { id: 'teaching', label: 'Hoạt động & Lớp phụ trách', icon: Table2 },
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
        <form
          onSubmit={handleSaveInfo}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8"
        >
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">
              Chi tiết hồ sơ giảng viên
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Thông tin được hiển thị trên hệ thống phòng Lab và bài thi lập trình
            </p>
          </div>

          {infoMsg && (
            <div
              className={`mb-6 flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
                infoMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {infoMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {infoMsg.text}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Họ và tên giảng viên
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mã Giảng viên / Cán bộ
              </label>
              <input
                type="text"
                value={lecturerId}
                onChange={(e) => setLecturerId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email cơ quan (Trường cấp)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Số điện thoại liên hệ
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                placeholder="0912 xxx xxx"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Học vị / Chức danh
              </label>
              <input
                type="text"
                value={academicDegree}
                onChange={(e) => setAcademicDegree(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                placeholder="Thạc sĩ, Tiến sĩ,..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Khoa / Bộ môn
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Văn phòng bộ môn / Phòng làm việc
              </label>
              <input
                type="text"
                value={office}
                onChange={(e) => setOffice(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="mt-7 flex items-center justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={isSavingInfo}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {isSavingInfo ? (
                <>Đang lưu...</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Lưu thay đổi hồ sơ
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <form
          onSubmit={handlePasswordChange}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8"
        >
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">
              Đổi mật khẩu tài khoản
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Nên dùng mật khẩu có độ dài tối thiểu 8 ký tự, kết hợp chữ số và ký tự đặc biệt
            </p>
          </div>

          {passwordMsg && (
            <div
              className={`mb-6 flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
                passwordMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {passwordMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {passwordMsg.text}
            </div>
          )}

          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-10 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  placeholder="Nhập mật khẩu hiện tại của bạn"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-10 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  placeholder="Tối thiểu 8 ký tự"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {isChangingPassword ? (
                  <>Đang cập nhật...</>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Cập nhật mật khẩu
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'teaching' && (
        <div className="space-y-6">
          {/* 4 Thẻ chỉ số hoạt động */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Lớp phụ trách</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Table2 className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">4 lớp</p>
              <p className="mt-1 text-[11px] text-slate-400">Học kỳ 1 (2026–2027)</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Đề thi đã soạn</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">12 bộ đề</p>
              <p className="mt-1 text-[11px] text-slate-400">Đang lưu trong ngân hàng</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Ca Lab &amp; Thi</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">18 ca</p>
              <p className="mt-1 text-[11px] text-emerald-600 font-semibold">LiveKit SFU kích hoạt</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Sinh viên quản lý</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <User className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">195 SV</p>
              <p className="mt-1 text-[11px] text-slate-400">Tổng sinh viên 4 lớp</p>
            </div>
          </div>

          {/* Danh sách lớp phụ trách */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Danh sách lớp giảng dạy</h3>
                <p className="text-xs text-slate-500 mt-0.5">Truy cập nhanh danh sách sinh viên và cấu hình bài thi</p>
              </div>
              <Link
                href="/instructor/classes"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                <span>Vào trang Quản lý lớp</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {[
                { code: 'CS101', name: 'Nhập môn Lập trình C/C++', students: 48, status: 'Đang diễn ra', room: 'LAB-A101' },
                { code: 'SE304', name: 'Đảm bảo Chất lượng & Kiểm thử', students: 52, status: 'Đang diễn ra', room: 'LAB-B204' },
                { code: 'PRO192', name: 'Lập trình Hướng đối tượng Java', students: 45, status: 'Đang diễn ra', room: 'LAB-C302' },
                { code: 'PRF192', name: 'Cơ sở Lập trình Nâng cao', students: 50, status: 'Sắp diễn ra', room: 'LAB-A102' },
              ].map((cls) => (
                <div
                  key={cls.code}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 font-mono text-xs font-bold text-blue-700">
                      {cls.code}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{cls.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {cls.students} sinh viên • Phòng: <span className="font-semibold text-slate-700">{cls.room}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      {cls.status}
                    </span>
                    <Link
                      href="/instructor/classes"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      Chi tiết
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
