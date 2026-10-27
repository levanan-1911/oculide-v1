'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import AuthBrandPanel from '@/components/auth/AuthBrandPanel';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!normalizedEmail) {
      setError('Vui lòng nhập email trường của bạn.');
      return;
    }

    if (!isValidEmail) {
      setError('Email chưa đúng định dạng. Vui lòng kiểm tra lại.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || 'Không thể tiếp nhận yêu cầu khôi phục.');
      }

      setTemporaryPassword(data.temporary_password || '');
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
              <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-[#10203a]">
                Yêu cầu đã được tiếp nhận
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-[#6c7f9d]">
                Mật khẩu tạm đã được gửi đến <strong className="font-semibold text-[#10203a]">{email.trim()}</strong>.
                Hãy dùng mật khẩu tạm để đăng nhập và thiết lập mật khẩu mới.
              </p>
              {temporaryPassword && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-700">Mật khẩu tạm — môi trường phát triển</p>
                  <code className="mt-2 block break-all text-sm font-bold text-amber-950">
                    {temporaryPassword}
                  </code>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="mt-8 h-[46px] w-full rounded-lg border border-[#dde5f0] bg-white text-sm font-bold text-[#2468f2] transition hover:border-[#2468f2] hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                Gửi lại bằng email khác
              </button>
              <Link
                href="/login"
                className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#2468f2] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Quay lại đăng nhập
              </Link>
            </div>
          ) : (
            <>
              <header>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Khôi phục mật khẩu
                </h2>
                <p className="mt-1.5 text-xs font-normal text-slate-500 sm:text-sm">
                  Sử dụng email đã liên kết với tài khoản.
                </p>
              </header>

              <form onSubmit={handleSubmit} noValidate className="mt-[52px]">
                <label
                  htmlFor="school-email"
                  className="block text-[11px] font-bold uppercase tracking-[0.04em] text-[#6c7f9d]"
                >
                  Email trường
                </label>
                <div className="relative mt-2">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[#8ca0bd]"
                    aria-hidden="true"
                  />
                  <input
                    id="school-email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError('');
                    }}
                    autoComplete="email"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'email-error' : undefined}
                    disabled={isSubmitting}
                    placeholder="abcd@school.edu.vn"
                    className={`h-[46px] w-full rounded-lg border bg-white pl-11 pr-4 text-[13px] text-[#10203a] outline-none transition placeholder:text-[#9aabc2] focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 ${
                      error
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                        : 'border-[#dde5f0] focus:border-[#2468f2] focus:ring-blue-100'
                    }`}
                  />
                </div>
                {error && (
                  <p id="email-error" role="alert" className="mt-2 text-xs font-medium text-red-600">
                    {error}
                  </p>
                )}

                <div className="mt-10 rounded-lg border border-[#d8e3f5] bg-[#eaf1ff] px-[18px] py-[18px]">
                  <p className="text-xs font-semibold leading-5 text-[#2468f2]">
                    Mật khẩu tạm thời được gửi đến email trường.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#6c7f9d]">
                    Sau đó, đăng nhập bằng mật khẩu tạm để đặt mật khẩu mới.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-[52px] flex h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-[#2468f2] px-4 text-[13px] font-bold text-white shadow-sm shadow-blue-200 transition hover:bg-[#1758d8] focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-75"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Đang gửi yêu cầu...
                    </>
                  ) : (
                    'Gửi yêu cầu'
                  )}
                </button>
              </form>

              <nav className="mt-7 flex flex-col items-start gap-8 text-[13px]">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 font-bold text-[#2468f2] hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Quay lại đăng nhập
                </Link>
                <a
                  href="mailto:support@oculide.edu.vn?subject=Hỗ trợ khôi phục mật khẩu"
                  className="text-[#2468f2] hover:underline"
                >
                  Không truy cập được email? Liên hệ hỗ trợ
                </a>
              </nav>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
