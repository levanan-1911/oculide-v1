'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Lock,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    name: string;
    email: string;
    username: string;
    role: string;
  }>({
    name: 'Người dùng',
    email: 'user@school.edu.vn',
    username: 'user01',
    role: 'student',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser({
          name: parsed.name || parsed.username || 'Người dùng',
          email: parsed.email || 'user@school.edu.vn',
          username: parsed.username || 'user01',
          role: parsed.role || 'student',
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Quản trị viên (Admin)', class: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'instructor':
        return { label: 'Giảng viên (Instructor)', class: 'bg-blue-50 text-blue-700 border-blue-200' };
      default:
        return { label: 'Sinh viên (Student)', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
  };

  const roleInfo = getRoleBadge(user.role);

  const getDashboardLink = () => {
    if (user.role === 'admin') return '/admin';
    if (user.role === 'instructor') return '/instructor/dashboard';
    return '/student/dashboard';
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại.' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Xác nhận mật khẩu mới không khớp.' });
      return;
    }

    setIsLoading(true);
    // Giả lập cập nhật mật khẩu
    setTimeout(() => {
      setIsLoading(false);
      setMessage({ type: 'success', text: 'Cập nhật mật khẩu thành công!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            href={getDashboardLink()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại Dashboard
          </Link>

          <span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold ${roleInfo.class}`}>
            {roleInfo.label}
          </span>
        </div>

        {/* Thông tin hồ sơ cá nhân */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-100">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-2xl font-black text-white shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{user.name}</h1>
              <p className="text-xs text-slate-500 mt-0.5">Tài khoản được cấp bởi Quản trị viên hệ thống</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</span>
              <p className="mt-1 font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                {user.email}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tên đăng nhập / MSSV</span>
              <p className="mt-1 font-semibold text-slate-800 text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                {user.username}
              </p>
            </div>
          </div>
        </div>

        {/* Form Đổi mật khẩu */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Đổi Mật Khẩu</h2>
              <p className="text-xs text-slate-500">Cập nhật mật khẩu để bảo vệ tài khoản cá nhân</p>
            </div>
          </div>

          {message && (
            <div
              className={`mt-5 flex items-center gap-2.5 rounded-xl border p-3.5 text-xs font-medium ${
                message.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="mt-5 space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-bold text-slate-700">Mật khẩu hiện tại</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Đang cập nhật...' : 'Lưu mật khẩu mới'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

