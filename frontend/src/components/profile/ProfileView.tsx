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
import { fetchWithAuth } from '@/services/apiClient';
import { INSTRUCTOR_PROFILE_UPDATED_EVENT } from '@/utils/instructorProfile';

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
    tabParam === 'security' || (tabParam === 'activity' && role !== 'admin') ? (tabParam as any) : 'info'
  );

  useEffect(() => {
    if (tabParam === 'security' || tabParam === 'info' || (tabParam === 'activity' && role !== 'admin')) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam, role]);

  // Thông tin chung
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);

  // Trường chuyên biệt theo Role
  const [identifier, setIdentifier] = useState('');
  const [academicDegree, setAcademicDegree] = useState('');
  const [department, setDepartment] = useState('');
  const [office, setOffice] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [major, setMajor] = useState('');

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

// Chính sách mật khẩu tối thiểu 8 ký tự
const passwordRequirements = [
  {
    label: 'Tối thiểu 8 ký tự',
    met: newPassword.length >= 8,
  },
];

const isPasswordStrong = newPassword.length >= 8;

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

  // Thống kê hoạt động thực tế của Giảng viên từ CSDL
  const [instructorActivity, setInstructorActivity] = useState<{
    classesCount: number;
    templatesCount: number;
    roomsCount: number;
    totalStudentsCount: number;
    classesList: { code: string; name: string; students: number; status: string; room: string }[];
  }>({
    classesCount: 0,
    templatesCount: 0,
    roomsCount: 0,
    totalStudentsCount: 0,
    classesList: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Đọc thông tin từ Backend API /api/v1/auth/me (fallback localStorage)
  useEffect(() => {
    let isCancelled = false;

    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.full_name || parsed.name) setName(parsed.full_name || parsed.name);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone_number || parsed.phone) setPhone(parsed.phone_number || parsed.phone);
        if (parsed.user_code || parsed.student_id || parsed.username) {
          setIdentifier(parsed.user_code || parsed.student_id || parsed.username);
        }
        if (parsed.department) setDepartment(parsed.department);
        if (parsed.academic_rank) setAcademicDegree(parsed.academic_rank);
      }

      const storedAvatar = localStorage.getItem('oculide_avatar');
      if (storedAvatar) {
        setAvatar(storedAvatar);
      }
    } catch {
      // ignore
    }

    async function fetchRealProfileAndActivity() {
      try {
        const me = await fetchWithAuth<any>('/api/v1/auth/me');
        if (!isCancelled && me) {
          const fullName = me.full_name || me.username || name;
          setName(fullName);
          if (me.email) setEmail(me.email);
          if (me.phone_number) setPhone(me.phone_number);
          if (me.user_code || me.student_id || me.username) {
            setIdentifier(me.user_code || me.student_id || me.username);
          }
          if (me.department) setDepartment(me.department);
          if (me.academic_rank) setAcademicDegree(me.academic_rank);
          if (me.avatar_url) setAvatar(me.avatar_url);

          try {
            const stored = localStorage.getItem('oculide_user');
            const prev = stored ? JSON.parse(stored) : {};
            localStorage.setItem(
              'oculide_user',
              JSON.stringify({
                ...prev,
                ...me,
                name: fullName,
                full_name: fullName,
              })
            );
          } catch {
            // ignore
          }
        }
      } catch {
        // Fallback giữ nguyên dữ liệu localStorage
      }

      if (role === 'instructor') {
        try {
          const [classesRes, templatesRes, roomsRes] = await Promise.all([
            fetchWithAuth<any[]>('/api/v1/classes').catch(() => []),
            fetchWithAuth<any[]>('/api/v1/templates').catch(() => []),
            fetchWithAuth<any[]>('/api/v1/rooms').catch(() => []),
          ]);
          if (isCancelled) return;

          const classesArr = Array.isArray(classesRes) ? classesRes : [];
          const templatesArr = Array.isArray(templatesRes) ? templatesRes : [];
          const roomsArr = Array.isArray(roomsRes) ? roomsRes : [];

          const totalStudents = classesArr.reduce(
            (sum, cls) => sum + Number(cls.student_count ?? cls.enrolled_count ?? cls.students?.length ?? 0),
            0
          );

          const mappedClasses = classesArr.map((cls) => {
            const classRooms = roomsArr.filter(
              (r) =>
                r.class_code === (cls.class_code || cls.code) ||
                String(r.class_id) === String(cls.class_id || cls.id)
            );
            const activeRoom = classRooms.find(
              (r) => r.status === 'dang_dien_ra' || r.status === 'in_progress'
            );
            return {
              code: cls.class_code || cls.code || String(cls.id),
              name: cls.class_name || cls.name || 'Lớp học phần',
              students: Number(cls.student_count ?? cls.enrolled_count ?? cls.students?.length ?? 0),
              status: activeRoom ? 'Đang có ca thi' : 'Đang giảng dạy',
              room: activeRoom
                ? activeRoom.room_code
                : cls.semester || `${classRooms.length} phòng thi/lab`,
            };
          });

          setInstructorActivity({
            classesCount: classesArr.length,
            templatesCount: templatesArr.length,
            roomsCount: roomsArr.length,
            totalStudentsCount: totalStudents,
            classesList: mappedClasses,
          });
        } catch {
          // ignore
        }
      }
    }

    fetchRealProfileAndActivity();
    return () => {
      isCancelled = true;
    };
  }, [role]);

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
          localStorage.removeItem(getInstructorPasswordAttemptStorageKey());
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

  // Lưu thông tin cá nhân lên Backend API thật (/api/v1/auth/profile)
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInfo(true);
    setInfoMsg(null);

    try {
      const updatedUser = await fetchWithAuth<any>('/api/v1/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim(),
          student_id: identifier.trim(),
          department: department.trim(),
          academic_rank: role === 'instructor' ? academicDegree.trim() : undefined,
          phone_number: phone.trim(),
          avatar_url: avatar && !avatar.startsWith('data:') ? avatar : undefined,
        }),
      });

      try {
        const stored = localStorage.getItem('oculide_user');
        const userObj = stored ? JSON.parse(stored) : {};
        const merged = {
          ...userObj,
          ...(updatedUser || {}),
          name: updatedUser?.full_name || name.trim(),
          full_name: updatedUser?.full_name || name.trim(),
          email: updatedUser?.email || email.trim(),
          phone: updatedUser?.phone_number || phone.trim(),
          phone_number: updatedUser?.phone_number || phone.trim(),
          department: updatedUser?.department || department.trim(),
          academic_rank: updatedUser?.academic_rank || academicDegree.trim(),
        };
        localStorage.setItem('oculide_user', JSON.stringify(merged));
        window.dispatchEvent(new Event(INSTRUCTOR_PROFILE_UPDATED_EVENT));
        window.dispatchEvent(new Event('storage'));
      } catch {
        // ignore
      }

      setInfoMsg({ type: 'success', text: 'Thông tin hồ sơ đã được lưu vào hệ thống thành công!' });
      setTimeout(() => setInfoMsg(null), 3500);
    } catch (err: any) {
      const detail = err?.detail || err?.message || 'Không thể lưu thông tin hồ sơ lên máy chủ.';
      setInfoMsg({ type: 'error', text: typeof detail === 'string' ? detail : 'Lỗi cập nhật hồ sơ.' });
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Đổi mật khẩu thật qua Backend API (/api/v1/auth/change-password)
  const handlePasswordChange = async (e: React.FormEvent) => {
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
    const unmetRequirement = passwordRequirements.find((item) => !item.met);

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

    setIsChangingPassword(true);
    try {
      await fetchWithAuth('/api/v1/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (role === 'instructor') {
        try {
          localStorage.removeItem(getInstructorPasswordAttemptStorageKey());
        } catch {
          // ignore
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
        text: 'Đổi mật khẩu thành công!',
      });
      window.setTimeout(() => setPasswordMsg(null), 5000);
    } catch (err: any) {
      if (role === 'instructor') {
        const currentRec = readInstructorPasswordAttemptRecord();
        const nextAttempts = currentRec.failedAttempts + 1;
        const shouldLock = nextAttempts >= INSTRUCTOR_PASSWORD_MAX_ATTEMPTS;
        const nextLockUntil = shouldLock ? Date.now() + INSTRUCTOR_PASSWORD_LOCKOUT_MS : null;
        try {
          localStorage.setItem(
            getInstructorPasswordAttemptStorageKey(),
            JSON.stringify({ failedAttempts: nextAttempts, lockedUntil: nextLockUntil })
          );
        } catch {
          // ignore
        }
        setFailedCurrentPasswordAttempts(nextAttempts);
        setPasswordLockoutUntil(nextLockUntil);
        setLockoutClock(Date.now());
      }

      const detail =
        err?.detail || err?.message || 'Mật khẩu hiện tại không chính xác hoặc không thể đổi mật khẩu.';
      setPasswordMsg({
        type: 'error',
        text: typeof detail === 'string' ? detail : 'Đổi mật khẩu thất bại.',
      });
    } finally {
      setIsChangingPassword(false);
    }
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
          badgeClass: 'bg-slate-900/10 text-slate-900 border-slate-900/20 dark:text-slate-500',
          icon: GraduationCap,
          activityTabLabel: 'Hoạt động & Lớp phụ trách',
        }
      : role === 'admin'
      ? {
          title: 'Quản trị viên Hệ thống',
          idLabel: 'Mã Quản trị',
          badgeClass: 'bg-stone-800 text-stone-200 border-stone-600',
          icon: Shield,
          activityTabLabel: '',
        }
      : {
          title: 'Sinh viên',
          idLabel: 'Mã số sinh viên (MSSV)',
          badgeClass: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-white/10 dark:text-stone-200',
          icon: User,
          activityTabLabel: '',
        };

  const RoleIcon = roleMeta.icon;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── CARD 1: HERO HEADER VỚI AVATAR TƯƠNG TÁC ── */}
      <div className="relative overflow-hidden rounded-md border border-slate-300 bg-white p-6 dark:border-white/10 dark:bg-neutral-900 sm:p-7">
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Khối Avatar vuông cổ điển */}
            <div className="relative group shrink-0">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={name}
                  className="h-20 w-20 rounded-md object-cover border border-slate-300 dark:border-white/10 shadow-sm transition group-hover:opacity-90"
                />
              ) : (
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-md font-serif text-2xl font-bold text-white shadow-sm border border-slate-300 dark:border-white/10 ${
                    'bg-brand'
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
                className="system-primary-action absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 focus:outline-none cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
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
                <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 rounded border px-2.5 py-0.5 text-xs font-semibold ${roleMeta.badgeClass}`}
                >
                  <RoleIcon className="h-3.5 w-3.5" />
                  {roleMeta.title}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
                  {roleMeta.idLabel}: <strong className="font-mono text-slate-700 dark:text-slate-200">{identifier}</strong>
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
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
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
        <div className="mt-6 flex items-center gap-2 border-t border-slate-300 pt-4 dark:border-white/10">
          {[
            { id: 'info', label: 'Thông tin cá nhân', icon: User },
            { id: 'security', label: 'Bảo mật & Mật khẩu', icon: KeyRound },
            ...(role === 'instructor'
              ? [{ id: 'activity', label: roleMeta.activityTabLabel, icon: Table2 }]
              : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'system-primary-action shadow-none'
                    : 'border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]'
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
          className="rounded-md border border-slate-300 bg-white p-6 dark:border-white/10 dark:bg-neutral-900 sm:p-7"
        >
          <div className="mb-6 border-b border-slate-300 pb-4 dark:border-white/10">
            <h2 className="font-serif text-lg font-bold text-slate-900 dark:text-slate-100">
              Chi tiết thông tin tài khoản ({roleMeta.title})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cập nhật thông tin định danh và hồ sơ học thuật trong hệ thống Oculide.
            </p>
          </div>

          {infoMsg && (
            <div
              className={`mb-6 flex items-center gap-2 rounded-md p-3 text-xs font-semibold ${
                infoMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300'
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
              <label className="block font-mono text-xs font-semibold uppercase text-slate-500 mb-1.5 dark:text-slate-300">
                Họ và tên
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-semibold uppercase text-slate-500 mb-1.5 dark:text-slate-300">
                {roleMeta.idLabel}
              </label>
              <input
                type="text"
                value={identifier}
                disabled
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-mono font-bold text-slate-600 outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-semibold uppercase text-slate-500 mb-1.5 dark:text-slate-300">
                Email tài khoản
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-semibold uppercase text-slate-500 mb-1.5 dark:text-slate-300">
                Số điện thoại liên hệ
              </label>
              <input
                type="tel"
                value={phone}
                placeholder="Chưa cập nhật"
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
              />
            </div>

            {/* Trường đặc thù cho Giảng viên */}
            {role === 'instructor' && (
              <>
                <div>
                  <label className="block font-mono text-xs font-semibold uppercase text-slate-500 mb-1.5 dark:text-slate-300">
                    Học vị / Chức danh
                  </label>
                  <input
                    type="text"
                    value={academicDegree}
                    placeholder="Chưa cập nhật"
                    onChange={(e) => setAcademicDegree(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs font-semibold uppercase text-slate-500 mb-1.5 dark:text-slate-300">
                    Văn phòng bộ môn
                  </label>
                  <input
                    type="text"
                    value={office}
                    placeholder="Chưa cập nhật"
                    onChange={(e) => setOffice(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                  />
                </div>
              </>
            )}

            {/* Trường đặc thù cho Sinh viên */}
            {role === 'student' && (
              <>
                <div>
                  <label className="block font-mono text-xs font-semibold uppercase text-slate-500 mb-1.5 dark:text-slate-300">
                    Lớp sinh hoạt
                  </label>
                  <input
                    type="text"
                    value={studentClass}
                    placeholder="Chưa cập nhật"
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs font-semibold uppercase text-slate-500 mb-1.5 dark:text-slate-300">
                    Chuyên ngành đào tạo
                  </label>
                  <input
                    type="text"
                    value={major}
                    placeholder="Chưa cập nhật"
                    onChange={(e) => setMajor(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <label className="block font-mono text-xs font-semibold uppercase text-slate-500 mb-1.5 dark:text-slate-300">
                Khoa / Đơn vị quản lý
              </label>
              <input
                type="text"
                value={department}
                placeholder="Chưa cập nhật"
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="mt-7 flex items-center justify-end border-t border-slate-300 pt-4 dark:border-white/10">
            <button
              type="submit"
              disabled={isSavingInfo}
              className="system-primary-action inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
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
          className="rounded-md border border-slate-300 bg-white p-6 dark:border-white/10 dark:bg-neutral-900 sm:p-7"
        >
          <div className="mb-6 border-b border-slate-300 pb-4 dark:border-white/10">
            <h2 className="font-serif text-lg font-bold text-slate-900 dark:text-slate-100">
              Đổi mật khẩu tài khoản
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mật khẩu mới phải có ít nhất 12 ký tự, bao gồm chữ cái in hoa, chữ cái in thường, số và ký tự đặc biệt.
            </p>
          </div>

          {passwordMsg && (
            <div
              className={`mb-6 flex items-center gap-2 rounded-md p-3 text-xs font-semibold ${
                passwordMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300'
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
              className="mb-6 flex items-start gap-2 rounded-md border border-amber-200/80 bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
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
              <label className="mb-1.5 block font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-300">
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
                  className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 pr-10 text-xs text-slate-800 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                  placeholder="Nhập mật khẩu hiện tại"
                />

                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  disabled={isChangingPassword}
                  aria-label={
                    showCurrentPassword ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'
                  }
                  className="absolute right-3 top-2 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                  <p className="mt-1.5 font-mono text-[11px] text-amber-700 dark:text-amber-400" aria-live="polite">
                    Đã nhập sai {failedCurrentPasswordAttempts}/
                    {INSTRUCTOR_PASSWORD_MAX_ATTEMPTS} lần. Còn{' '}
                    {INSTRUCTOR_PASSWORD_MAX_ATTEMPTS -
                      failedCurrentPasswordAttempts}{' '}
                    lần thử.
                  </p>
                )}

              {/* Thông báo khóa */}
              {role === 'instructor' && isInstructorPasswordLocked && (
                <p className="mt-1.5 font-mono text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
                  Đã vượt quá số lần thử. Vui lòng chờ{' '}
                  {formatLockoutCountdown(lockoutSecondsRemaining)} (phút:giây).
                </p>
              )}
            </div>

            {/* Mật khẩu mới */}
            <div>
              <label className="mb-1.5 block font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-300">
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
                  className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 pr-10 text-xs text-slate-800 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                  placeholder="Nhập mật khẩu mới"
                />

                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  disabled={isChangingPassword}
                  aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                  className="absolute right-3 top-2 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Checklist chính sách mật khẩu áp dụng cho mọi role */}
              <div className="mt-2 rounded-md border border-slate-300 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Yêu cầu mật khẩu
                </p>

                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {passwordRequirements.map((requirement) => (
                    <li
                      key={requirement.label}
                      className={`flex items-center gap-1.5 text-[11px] ${
                        requirement.met
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : newPassword.length > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span aria-hidden="true" className="font-bold">
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
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
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
              <label className="mb-1.5 block font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-300">
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
                  className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 pr-10 text-xs text-slate-800 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
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
                  className="absolute right-3 top-2 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                  className={`mt-1.5 font-mono text-[11px] ${
                    confirmPassword === newPassword
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
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
                className="system-primary-action inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">Lớp phụ trách</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900/10 text-slate-900 dark:text-slate-500">
                      <Table2 className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{instructorActivity.classesCount} lớp</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">Học kỳ hiện tại</p>
                </div>

                <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">Đề thi đã soạn</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900/10 text-slate-900 dark:text-slate-500">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{instructorActivity.templatesCount} bộ đề</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">Trong ngân hàng câu hỏi</p>
                </div>

                <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">Ca Lab &amp; Thi</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{instructorActivity.roomsCount} ca</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">LiveKit SFU kích hoạt</p>
                </div>

                <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">Sinh viên quản lý</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900/10 text-slate-900 dark:text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{instructorActivity.totalStudentsCount} SV</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">Tổng {instructorActivity.classesCount} lớp</p>
                </div>
              </div>

              <div className="rounded-md border border-slate-300 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
                <div className="flex items-center justify-between border-b border-slate-300 pb-3.5 mb-4 dark:border-white/10">
                  <div>
                    <h3 className="font-serif text-sm font-bold text-slate-900 dark:text-slate-100">Danh sách lớp giảng dạy</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Truy cập nhanh danh sách sinh viên và cấu hình bài thi</p>
                  </div>
                  <Link
                    href="/instructor/classes"
                    className="inline-flex items-center gap-1.5 text-xs font-serif font-bold text-slate-900 hover:text-slate-800 dark:text-slate-500"
                  >
                    <span>Vào trang Quản lý lớp</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {instructorActivity.classesList.length === 0 ? (
                  <div className="rounded-md border border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.04]">
                    Chưa có lớp học phần nào được phân công hoặc tạo mới.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {instructorActivity.classesList.map((cls) => (
                      <div
                        key={cls.code}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-slate-300 bg-slate-50 p-3.5 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 px-2.5 shrink-0 items-center justify-center rounded border border-slate-300 bg-white font-mono text-xs font-bold text-slate-900 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-500">
                            {cls.code}
                          </div>
                          <div>
                            <p className="font-serif text-xs font-bold text-slate-900 dark:text-slate-100">{cls.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {cls.students} sinh viên • <span className="font-semibold text-slate-700 dark:text-slate-300">{cls.room}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {cls.status}
                          </span>
                          <Link
                            href={`/instructor/classes?class=${encodeURIComponent(cls.code)}`}
                            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200"
                          >
                            Chi tiết
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Hoạt động Sinh viên */}
          {role === 'student' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
                <span className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">Bài thi đã hoàn thành</span>
                <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">8 bài</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">Học kỳ 1 (2026–2027)</p>
              </div>
              <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
                <span className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">Điểm trung bình Lab</span>
                <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">8.6 / 10</p>
                <p className="mt-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Xếp loại: Giỏi</p>
              </div>
              <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
                <span className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">Điểm tín nhiệm AI</span>
                <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">98 / 100</p>
                <p className="mt-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Không vi phạm</p>
              </div>
              <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
                <span className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">Lịch thi sắp tới</span>
                <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">2 ca</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-900 dark:text-slate-500">Tuần này</p>
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
