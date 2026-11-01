'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Activity,
  FileCheck2,
  Server,
  AlertTriangle,
} from 'lucide-react';

export interface ProfileViewProps {
  role: 'admin' | 'instructor' | 'student';
}

// Giới hạn số lần nhập sai mật khẩu cho Giảng viên
const INSTRUCTOR_PASSWORD_MAX_ATTEMPTS = 5;
const INSTRUCTOR_PASSWORD_LOCKOUT_MS = 15 * 60 * 1000;

// Lưu trữ thông tin số lần nhập sai mật khẩu và thời gian khóa trong localStorage
type InstructorPasswordAttemptRecord = {
  failedAttempts: number;
  lockedUntil: number | null;
};
// Lấy khóa lưu trữ cho người dùng hiện tại
function getInstructorPasswordAttemptStorageKey(): string {
  let userScope = 'current-user';

  try {
    const rawUser = localStorage.getItem('oculide_user');
    const user = rawUser ? JSON.parse(rawUser) : null;

    userScope = String(
      user?.user_id ??
      user?.email ??
      user?.username ??
      userScope
    );
  } catch {
    // Dùng khóa mặc định nếu không đọc được thông tin người dùng.
  }

  return `oculide_instructor_password_attempts:${userScope}`;
}
// Đọc thông tin số lần nhập sai mật khẩu và thời gian khóa từ localStorage
function readInstructorPasswordAttemptRecord(): InstructorPasswordAttemptRecord {
  try {
    const key = getInstructorPasswordAttemptStorageKey();
    const raw = localStorage.getItem(key);

    if (!raw) {
      return { failedAttempts: 0, lockedUntil: null };
    }

    const record = JSON.parse(raw);

    const failedAttempts = Number.isFinite(record?.failedAttempts)
      ? Math.max(0, Math.floor(record.failedAttempts))
      : 0;

    const lockedUntil = Number.isFinite(record?.lockedUntil)
      ? record.lockedUntil
      : null;

    if (lockedUntil !== null && lockedUntil <= Date.now()) {
      localStorage.removeItem(key);

      return { failedAttempts: 0, lockedUntil: null };
    }

    return { failedAttempts, lockedUntil };
  } catch {
    return { failedAttempts: 0, lockedUntil: null };
  }
}

// Lưu thông tin số lần nhập sai mật khẩu và thời gian khóa vào localStorage
function formatLockoutCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds
  ).padStart(2, '0')}`;
}

function ProfileViewContent({ role }: ProfileViewProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'activity'>(
    tabParam === 'security' || tabParam === 'activity' ? tabParam : 'info'
  );

  useEffect(() => {
    if (tabParam === 'security' || tabParam === 'info' || tabParam === 'activity') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Thông tin chung
  const [name, setName] = useState(
    role === 'instructor'
      ? 'Phạm Văn Long'
      : role === 'admin'
      ? 'Quản trị viên Hệ thống'
      : 'Nguyễn Văn An'
  );
  const [email, setEmail] = useState(
    role === 'instructor'
      ? 'long.pham@oculide.edu.vn'
      : role === 'admin'
      ? 'admin@oculide.edu.vn'
      : 'an.nv@school.edu.vn'
  );
  const [phone, setPhone] = useState('0912 345 678');
  const [avatar, setAvatar] = useState<string | null>(null);

  // Trường chuyên biệt theo Role
  const [identifier, setIdentifier] = useState(
    role === 'instructor' ? 'GV2026_089' : role === 'admin' ? 'ADMIN_ROOT_01' : 'SE184801'
  );
  const [academicDegree, setAcademicDegree] = useState('Thạc sĩ Kỹ thuật Phần mềm');
  const [department, setDepartment] = useState('Khoa Công Nghệ Thông Tin');
  const [office, setOffice] = useState('Phòng 402 - Tòa A - Cơ sở Hòa Khánh');
  const [studentClass, setStudentClass] = useState('K27-SE01');
  const [major, setMajor] = useState('Kỹ thuật Phần mềm (Software Engineering)');

  // Đổi mật khẩu
  // Đổi mật khẩu
const [currentPassword, setCurrentPassword] = useState('');
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');

const [showCurrentPassword, setShowCurrentPassword] = useState(false);
const [showNewPassword, setShowNewPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

const [failedCurrentPasswordAttempts, setFailedCurrentPasswordAttempts] =
  useState(0);

const [passwordLockoutUntil, setPasswordLockoutUntil] =
  useState<number | null>(null);

const [lockoutClock, setLockoutClock] = useState(0);

const [passwordMsg, setPasswordMsg] = useState<{
  type: 'success' | 'error';
  text: string;
} | null>(null);

const [isChangingPassword, setIsChangingPassword] = useState(false);

// Chính sách mật khẩu áp dụng cho Admin, Instructor và Student
const passwordRequirements = [
  {
    label: 'Ít nhất 12 ký tự',
    met: newPassword.length >= 12,
  },
  {
    label: 'Có ít nhất 1 chữ hoa (A–Z)',
    met: /[A-Z]/.test(newPassword),
  },
  {
    label: 'Có ít nhất 1 chữ thường (a–z)',
    met: /[a-z]/.test(newPassword),
  },
  {
    label: 'Có ít nhất 1 chữ số (0–9)',
    met: /[0-9]/.test(newPassword),
  },
  {
    label: 'Có ít nhất 1 ký tự đặc biệt',
    met: /[!@#$%^&*()_+\-=[\]{};:'",.<>/?\\|`~]/.test(newPassword),
  },
];

const isPasswordStrong =
  passwordRequirements.every((item) => item.met);

const isInstructorPasswordLocked =
  role === 'instructor' &&
  passwordLockoutUntil !== null &&
  passwordLockoutUntil > lockoutClock;

const lockoutSecondsRemaining = isInstructorPasswordLocked
  ? Math.max(
      0,
      Math.ceil((passwordLockoutUntil! - lockoutClock) / 1000)
    )
  : 0;

  // Cập nhật thông tin
  const [infoMsg, setInfoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Đọc thông tin từ localStorage khi tải component
  useEffect(() => {
    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) setName(parsed.name);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.username) setIdentifier(parsed.username);
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

  // Khôi phục số lần nhập sai và thời gian khóa.
useEffect(() => {
  if (role !== 'instructor') return;

  const record = readInstructorPasswordAttemptRecord();

  setFailedCurrentPasswordAttempts(record.failedAttempts);
  setPasswordLockoutUntil(record.lockedUntil);
  setLockoutClock(Date.now());
}, [role]);

// Cập nhật đồng hồ đếm ngược mỗi giây.
useEffect(() => {
  if (role !== 'instructor' || passwordLockoutUntil === null) {
    return;
  }

  const updateCountdown = () => {
    const now = Date.now();
    setLockoutClock(now);

    if (now >= passwordLockoutUntil) {
      try {
        localStorage.removeItem(
          getInstructorPasswordAttemptStorageKey()
        );
      } catch {
        // Vẫn cho phép mở khóa theo state trong component.
      }

      setFailedCurrentPasswordAttempts(0);
      setPasswordLockoutUntil(null);
      setPasswordMsg(null);
    }
  };

  updateCountdown();

  const intervalId = window.setInterval(updateCountdown, 1000);

  return () => window.clearInterval(intervalId);
}, [passwordLockoutUntil, role]);

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
      setInfoMsg({ type: 'success', text: 'Thông tin hồ sơ đã được lưu thành công!' });
      setTimeout(() => setInfoMsg(null), 3000);
    }, 500);
  };

  // Đổi mật khẩu
  const handlePasswordChange = (e: React.FormEvent) => {
  e.preventDefault();
  setPasswordMsg(null);

  // Kiểm tra trạng thái khóa của Instructor.
  if (role === 'instructor') {
    const savedRecord = readInstructorPasswordAttemptRecord();

    if (
      savedRecord.lockedUntil !== null &&
      savedRecord.lockedUntil > Date.now()
    ) {
      setFailedCurrentPasswordAttempts(savedRecord.failedAttempts);
      setPasswordLockoutUntil(savedRecord.lockedUntil);
      setLockoutClock(Date.now());

      setPasswordMsg({
        type: 'error',
        text: 'Thao tác đổi mật khẩu đang bị khóa. Vui lòng thử lại sau.',
      });

      return;
    }
  }

  if (!currentPassword) {
    setPasswordMsg({
      type: 'error',
      text: 'Vui lòng nhập mật khẩu hiện tại.',
    });
    return;
  }

  // Tất cả role phải đáp ứng đầy đủ chính sách mật khẩu mới.
  const unmetRequirement = passwordRequirements.find(
    (item) => !item.met
  );

  if (unmetRequirement) {
    setPasswordMsg({
      type: 'error',
      text: `Mật khẩu mới chưa đáp ứng yêu cầu: ${unmetRequirement.label}.`,
    });
    return;
  }

  if (newPassword === currentPassword) {
    setPasswordMsg({
      type: 'error',
      text: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
    });
    return;
  }

  if (newPassword !== confirmPassword) {
    setPasswordMsg({
      type: 'error',
      text: 'Xác nhận mật khẩu mới không khớp.',
    });
    return;
  }

  // CHẾ ĐỘ GIẢ LẬP TẠM THỜI: tất cả role dùng cùng luồng như Admin/Student.
  // Không gọi API và không thay đổi mật khẩu thật trong backend/database.
  setIsChangingPassword(true);

  window.setTimeout(() => {
    setIsChangingPassword(false);

    // Mô phỏng trạng thái thành công cho Instructor, đồng thời xóa bộ đếm cũ.
    if (role === 'instructor') {
      try {
        localStorage.removeItem(getInstructorPasswordAttemptStorageKey());
      } catch {
        // Bỏ qua nếu không thể truy cập localStorage.
      }
      setFailedCurrentPasswordAttempts(0);
      setPasswordLockoutUntil(null);
      setLockoutClock(Date.now());
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);

    setPasswordMsg({
      type: 'success',
      text: 'Đổi mật khẩu thành công! ',
    });

    window.setTimeout(() => setPasswordMsg(null), 5000);
  }, 600);
};

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || (role === 'instructor' ? 'GV' : role === 'admin' ? 'AD' : 'SV');

  const roleMeta =
    role === 'instructor'
      ? {
          title: 'Giảng viên',
          idLabel: 'Mã Giảng viên',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: GraduationCap,
          activityTabLabel: 'Hoạt động & Lớp phụ trách',
        }
      : role === 'admin'
      ? {
          title: 'Quản trị viên Hệ thống',
          idLabel: 'Mã Quản trị',
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: Shield,
          activityTabLabel: 'Hệ thống & Thống kê phiên',
        }
      : {
          title: 'Sinh viên',
          idLabel: 'Mã số sinh viên (MSSV)',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: User,
          activityTabLabel: 'Kết quả thi & Giám sát AI',
        };

  const RoleIcon = roleMeta.icon;

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
                <div
                  className={`flex h-24 w-24 items-center justify-center rounded-full text-2xl font-black text-white shadow-md ring-4 ring-blue-100 ${
                    role === 'instructor'
                      ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700'
                      : role === 'admin'
                      ? 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-800'
                      : 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-700'
                  }`}
                >
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
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-bold ${roleMeta.badgeClass}`}
                >
                  <RoleIcon className="h-3.5 w-3.5" />
                  {roleMeta.title}
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
                  {roleMeta.idLabel}: <strong className="font-mono text-slate-700">{identifier}</strong>
                </span>
                {role === 'instructor' && (
                  <span className="inline-flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-slate-400" />
                    {academicDegree}
                  </span>
                )}
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
            { id: 'activity', label: roleMeta.activityTabLabel, icon: Table2 },
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
              Chi tiết thông tin tài khoản ({roleMeta.title})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mật khẩu mới phải có ít nhất 12 ký tự, bao gồm chữ cái in hoa, chữ cái in thường, số và ký tự đặc biệt.
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
                Họ và tên
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
                {roleMeta.idLabel}
              </label>
              <input
                type="text"
                value={identifier}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email tài khoản
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
              />
            </div>

            {/* Trường đặc thù cho Giảng viên */}
            {role === 'instructor' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Học vị / Chức danh
                  </label>
                  <input
                    type="text"
                    value={academicDegree}
                    onChange={(e) => setAcademicDegree(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Văn phòng bộ môn
                  </label>
                  <input
                    type="text"
                    value={office}
                    onChange={(e) => setOffice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </>
            )}

            {/* Trường đặc thù cho Sinh viên */}
            {role === 'student' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Lớp sinh hoạt
                  </label>
                  <input
                    type="text"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chuyên ngành đào tạo
                  </label>
                  <input
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Khoa / Đơn vị quản lý
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
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
                  Lưu thay đổi
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
              Mật khẩu mới phải có ít nhất 12 ký tự, bao gồm chữ cái in hoa, chữ cái in thường, số và ký tự đặc biệt.
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

          {role === 'instructor' && isInstructorPasswordLocked && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

              <span>
                Bạn đã nhập sai mật khẩu hiện tại quá nhiều lần.
                Thao tác đổi mật khẩu đang bị khóa.
                <span className="mt-1 block font-bold">
                  Có thể thử lại sau{' '}
                  {formatLockoutCountdown(lockoutSecondsRemaining)} (phút:giây).
                </span>
              </span>
            </div>
          )}

          <div className="max-w-md space-y-4">
  {/* Mật khẩu hiện tại */}
  <div>
    <label className="mb-1.5 block text-xs font-bold text-slate-700">
      Mật khẩu hiện tại
    </label>

    <div className="relative">
      <input
        type={showCurrentPassword ? 'text' : 'password'}
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        disabled={
          role === 'instructor' &&
          (isInstructorPasswordLocked || isChangingPassword)
        }
        autoComplete="current-password"
        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-10 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:cursor-not-allowed disabled:bg-slate-50"
        placeholder="Nhập mật khẩu hiện tại"
      />

      <button
        type="button"
        onClick={() => setShowCurrentPassword((prev) => !prev)}
        disabled={isChangingPassword}
        aria-label={
          showCurrentPassword ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'
        }
        className="absolute right-3 top-2.5 cursor-pointer text-slate-400 hover:text-slate-600"
      >
        {showCurrentPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>

    {/* Hiển thị số lần thử còn lại */}
    {role === 'instructor' &&
      failedCurrentPasswordAttempts > 0 &&
      !isInstructorPasswordLocked && (
        <p className="mt-1.5 text-[11px] text-amber-700" aria-live="polite">
          Đã nhập sai {failedCurrentPasswordAttempts}/
          {INSTRUCTOR_PASSWORD_MAX_ATTEMPTS} lần. Còn{' '}
          {INSTRUCTOR_PASSWORD_MAX_ATTEMPTS -
            failedCurrentPasswordAttempts}{' '}
          lần thử.
        </p>
      )}

    {/* Thông báo khóa */}
    {role === 'instructor' && isInstructorPasswordLocked && (
      <p className="mt-1.5 text-xs font-semibold text-red-600" role="alert">
        Đã vượt quá số lần thử. Vui lòng chờ{' '}
        {formatLockoutCountdown(lockoutSecondsRemaining)} (phút:giây).
      </p>
    )}
  </div>

  {/* Mật khẩu mới */}
  <div>
    <label className="mb-1.5 block text-xs font-bold text-slate-700">
      Mật khẩu mới
    </label>

    <div className="relative">
      <input
        type={showNewPassword ? 'text' : 'password'}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        disabled={
          role === 'instructor' &&
          (isInstructorPasswordLocked || isChangingPassword)
        }
        autoComplete="new-password"
        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-10 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:cursor-not-allowed disabled:bg-slate-50"
        placeholder="Nhập mật khẩu mới"
      />

      <button
        type="button"
        onClick={() => setShowNewPassword((prev) => !prev)}
        disabled={isChangingPassword}
        aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
        className="absolute right-3 top-2.5 cursor-pointer text-slate-400 hover:text-slate-600"
      >
        {showNewPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>

    {/* Checklist chính sách mật khẩu áp dụng cho mọi role */}
    <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
        <p className="mb-2 text-[11px] font-bold text-slate-700">
          Yêu cầu mật khẩu
        </p>

        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {passwordRequirements.map((requirement) => (
            <li
              key={requirement.label}
              className={`flex items-center gap-1.5 text-[11px] ${
                requirement.met
                  ? 'text-emerald-700'
                  : newPassword.length > 0
                    ? 'text-red-600'
                    : 'text-slate-500'
              }`}
            >
              <span aria-hidden="true">
                {requirement.met ? '✓' : '○'}
              </span>
              <span>{requirement.label}</span>
            </li>
          ))}
        </ul>

        {newPassword.length > 0 && (
          <p
            className={`mt-2 text-[11px] font-semibold ${
              isPasswordStrong
                ? 'text-emerald-700'
                : 'text-slate-500'
            }`}
          >
            {isPasswordStrong
              ? 'Mật khẩu đã đáp ứng tất cả yêu cầu.'
              : 'Hãy đáp ứng đầy đủ các yêu cầu trên.'}
          </p>
        )}
    </div>
  </div>

  {/* Xác nhận mật khẩu mới */}
  <div>
    <label className="mb-1.5 block text-xs font-bold text-slate-700">
      Xác nhận mật khẩu mới
    </label>

    <div className="relative">
      <input
        type={showConfirmPassword ? 'text' : 'password'}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        disabled={
          role === 'instructor' &&
          (isInstructorPasswordLocked || isChangingPassword)
        }
        autoComplete="new-password"
        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-10 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:cursor-not-allowed disabled:bg-slate-50"
        placeholder="Nhập lại mật khẩu mới"
      />

      <button
        type="button"
        onClick={() => setShowConfirmPassword((prev) => !prev)}
        disabled={isChangingPassword}
        aria-label={
          showConfirmPassword
            ? 'Ẩn mật khẩu xác nhận'
            : 'Hiện mật khẩu xác nhận'
        }
        className="absolute right-3 top-2.5 cursor-pointer text-slate-400 hover:text-slate-600"
      >
        {showConfirmPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>

    {confirmPassword.length > 0 && (
      <p
        className={`mt-1.5 text-[11px] ${
          confirmPassword === newPassword
            ? 'text-emerald-700'
            : 'text-red-600'
        }`}
      >
        {confirmPassword === newPassword
          ? 'Mật khẩu xác nhận khớp.'
          : 'Mật khẩu xác nhận chưa khớp.'}
      </p>
    )}
  </div>

  {/* Nút cập nhật */}
  <div className="pt-2">
    <button
      type="submit"
      disabled={
        isChangingPassword ||
        (role === 'instructor' && isInstructorPasswordLocked)
      }
      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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

      {activeTab === 'activity' && (
        <div className="space-y-6">
          {/* Hoạt động Giảng viên */}
          {role === 'instructor' && (
            <>
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
                  <p className="mt-1 text-[11px] text-slate-400">Trong ngân hàng câu hỏi</p>
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
                  <p className="mt-1 text-[11px] text-slate-400">Tổng 4 lớp</p>
                </div>
              </div>

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
            </>
          )}

          {/* Hoạt động Admin */}
          {role === 'admin' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">Tổng tài khoản</span>
                <p className="mt-3 text-2xl font-black text-slate-900">1,248</p>
                <p className="mt-1 text-[11px] text-purple-600 font-semibold">Tất cả vai trò</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">Phiên thi đang mở</span>
                <p className="mt-3 text-2xl font-black text-slate-900">14 phòng</p>
                <p className="mt-1 text-[11px] text-emerald-600 font-semibold">LiveKit SFU active</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">Docker Sandbox</span>
                <p className="mt-3 text-2xl font-black text-slate-900">99.8%</p>
                <p className="mt-1 text-[11px] text-slate-400">Trạng thái chấm ổn định</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">Cảnh báo hệ thống</span>
                <p className="mt-3 text-2xl font-black text-slate-900">0 lỗi</p>
                <p className="mt-1 text-[11px] text-emerald-600 font-semibold">Hệ thống an toàn</p>
              </div>
            </div>
          )}

          {/* Hoạt động Sinh viên */}
          {role === 'student' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">Bài thi đã hoàn thành</span>
                <p className="mt-3 text-2xl font-black text-slate-900">8 bài</p>
                <p className="mt-1 text-[11px] text-slate-400">Học kỳ 1 (2026–2027)</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">Điểm trung bình Lab</span>
                <p className="mt-3 text-2xl font-black text-slate-900">8.6 / 10</p>
                <p className="mt-1 text-[11px] text-emerald-600 font-semibold">Xếp loại: Giỏi</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">Điểm tín nhiệm AI</span>
                <p className="mt-3 text-2xl font-black text-slate-900">98 / 100</p>
                <p className="mt-1 text-[11px] text-emerald-600 font-semibold">Không vi phạm</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <span className="text-xs font-semibold text-slate-500">Lịch thi sắp tới</span>
                <p className="mt-3 text-2xl font-black text-slate-900">2 ca</p>
                <p className="mt-1 text-[11px] text-blue-600 font-semibold">Tuần này</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfileView(props: ProfileViewProps) {
  return (
    <Suspense fallback={null}>
      <ProfileViewContent {...props} />
    </Suspense>
  );
}
