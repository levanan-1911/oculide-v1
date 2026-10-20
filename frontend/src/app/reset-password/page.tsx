'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import AuthBrandPanel from '@/components/auth/AuthBrandPanel';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasResetSession, setHasResetSession] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('oculide_token');
    const rawUser = localStorage.getItem('oculide_user');

    try {
      const user = rawUser ? JSON.parse(rawUser) : null;
      setHasResetSession(Boolean(token && user?.must_change_password));
    } catch {
      setHasResetSession(false);
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    const token = localStorage.getItem('oculide_token');
    if (!token) {
      setHasResetSession(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/auth/complete-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_password: password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || 'Không thể cập nhật mật khẩu mới.');
      }

      localStorage.removeItem('oculide_token');
      localStorage.removeItem('oculide_refresh_token');
      localStorage.removeItem('oculide_user');
      setPassword('');
      setConfirmPassword('');
      setIsSubmitted(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Không thể kết nối đến máy chủ. Vui lòng thử lại.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col bg-[#f4f7f9] font-sans text-slate-800 lg:flex-row">
      <AuthBrandPanel variant="detailed" />

      <section className="relative flex min-h-[620px] w-full items-center justify-center p-4 sm:p-8 lg:min-h-screen lg:w-[60%] lg:p-12">
        <div className="w-full max-w-[440px] rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60 transition-all sm:min-h-[662px] sm:p-10">
          {isSubmitted ? (
            <div className="flex min-h-[500px] flex-col justify-center">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Đặt mật khẩu thành công
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Mật khẩu tạm đã hết hiệu lực. Hãy đăng nhập lại bằng mật khẩu mới của bạn.
              </p>
              <Link
                href="/login"
                className="mt-8 flex h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                Đăng nhập bằng mật khẩu mới
              </Link>
            </div>
          ) : hasResetSession === false ? (
            <div className="flex min-h-[500px] flex-col justify-center">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <AlertCircle className="h-6 w-6" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Chưa có phiên khôi phục
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Bạn cần đăng nhập bằng mật khẩu tạm trước khi thiết lập mật khẩu mới.
              </p>
              <Link
                href="/login"
                className="mt-8 flex h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Quay lại đăng nhập
              </Link>
            </div>
          ) : (
            <>
              <header>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Thiết lập mật khẩu mới
                </h1>
                <p className="mt-1.5 text-xs font-normal text-slate-500 sm:text-sm">
                  Hoàn tất khôi phục trước khi tiếp tục sử dụng hệ thống.
                </p>
              </header>

              {error && (
                <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
                <PasswordField
                  id="new-password"
                  label="Mật khẩu mới"
                  value={password}
                  visible={showPassword}
                  disabled={isSubmitting}
                  onChange={setPassword}
                  onToggle={() => setShowPassword((current) => !current)}
                />
                <PasswordField
                  id="confirm-password"
                  label="Xác nhận mật khẩu mới"
                  value={confirmPassword}
                  visible={showConfirmPassword}
                  disabled={isSubmitting}
                  onChange={setConfirmPassword}
                  onToggle={() => setShowConfirmPassword((current) => !current)}
                />

                <div className="rounded-xl border border-blue-100 bg-blue-50/75 p-4 text-left">
                  <p className="text-xs font-semibold leading-5 text-blue-600">
                    Mật khẩu phải có ít nhất 8 ký tự.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Mật khẩu mới phải khác mật khẩu tạm thời.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || hasResetSession === null}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Đang lưu mật khẩu...</>
                  ) : (
                    'Lưu mật khẩu mới'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
};

function PasswordField({
  id,
  label,
  value,
  visible,
  disabled,
  onChange,
  onToggle,
}: PasswordFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700 sm:text-sm">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          autoComplete="new-password"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50"
        />
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 transition hover:text-slate-600"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
