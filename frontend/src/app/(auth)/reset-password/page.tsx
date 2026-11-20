'use client';

import React, { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import InstitutionalFooter from '@/components/common/InstitutionalFooter';
import BrandLogo from '@/components/common/BrandLogo';
import AuthShowcasePanel from '@/components/auth/AuthShowcasePanel';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';

function ResetPasswordFormContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const emailFromUrl = searchParams.get('email') || '';

  // ── THEME STATE ──
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  // ── FORM STATE ──
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Khởi tạo Theme đồng bộ
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('oculide_theme') as 'dark' | 'light' | null;
    const initial = saved || 'dark';
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const applyTheme = (t: 'dark' | 'light') => {
    const html = document.documentElement;
    if (t === 'dark') {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('oculide_theme', next);
    applyTheme(next);
  };

  // Tính toán độ mạnh mật khẩu (Password Strength)
  const strengthInfo = useMemo(() => {
    if (!password) return { score: 0, text: 'Chưa nhập', color: 'bg-slate-200 dark:bg-white/10' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) || /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, text: 'Yếu', color: 'bg-red-500 text-red-600' };
    if (score === 2) return { score: 2, text: 'Trung bình', color: 'bg-amber-500 text-amber-600' };
    if (score >= 3) return { score: 3, text: 'Mạnh', color: 'bg-emerald-600 text-emerald-600' };
    return { score: 1, text: 'Yếu', color: 'bg-red-500 text-red-600' };
  }, [password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    if (!tokenFromUrl) {
      setError('Liên kết khôi phục không hợp lệ hoặc thiếu mã xác thực (Token). Vui lòng kiểm tra lại đường link trong email.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenFromUrl,
          new_password: password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || 'Không thể cập nhật mật khẩu mới. Vui lòng thử lại.');
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật mật khẩu mới. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-neutral-950 dark:text-slate-300 transition-colors duration-200">
      {/* ── NÚT CHUYỂN ĐEN/TRẮNG ICON GÓC TRÊN BÊN PHẢI ── */}
      {mounted && (
        <div className="fixed top-4 right-4 z-50">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng (Light)' : 'Chuyển sang giao diện Tối (Dark)'}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-800 shadow-sm backdrop-blur-md transition-colors hover:bg-[#eae5e7] dark:border-white/15 dark:bg-neutral-900 dark:text-amber-300 dark:hover:bg-[#25202b] cursor-pointer"
            aria-label="Chuyển đổi giao diện Sáng / Tối"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-300" />
            ) : (
              <Moon className="h-4 w-4 text-slate-800" />
            )}
          </button>
        </div>
      )}

      {/* ── HEADER CHUẨN ĐỒNG BỘ VỚI LOGIN ── */}
      <header className="border-b border-slate-300 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/95 transition-colors">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo size={50} className="h-[50px] w-[50px] shrink-0 rounded-md object-cover shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded border border-brand-300 bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
                  NCKH 2026
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-[#a59fa3]">Thiết lập lại mật khẩu tài khoản</p>
            </div>
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:bg-[#eae5e7] dark:border-white/15 dark:bg-[#221e27] dark:text-slate-300 dark:hover:bg-[#2b2532] pr-3 mr-12"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại đăng nhập</span>
          </Link>
        </div>
      </header>

      {/* ── BỐ CỤC 12 CỘT CHUẨN XÁC ── */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          
          {/* CỘT TRÁI (7 CỘT): SHOWCASE NỀN TẢNG DÙNG CHUNG */}
          <div className="lg:col-span-7">
            <AuthShowcasePanel />
          </div>

          {/* CỘT PHẢI (5 CỘT): CARD THIẾT LẬP MẬT KHẨU MỚI */}
          <div className="lg:col-span-5">
            <div className="rounded-md border border-slate-300 bg-white p-7 sm:p-9 shadow-sm dark:border-white/10 dark:bg-neutral-900">
              
              {isSubmitted ? (
                /* ── GIAO DIỆN KHI ĐỔI THÀNH CÔNG ── */
                <div className="space-y-5 text-left">
                  <div className="flex h-14 w-14 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                  </div>

                  <div>
                    <span className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-2">
                      <ShieldCheck size={14} /> THÀNH CÔNG
                    </span>
                    <h2 className="text-2xl font-serif font-bold tracking-tight text-[#2A282D] dark:text-white sm:text-3xl">
                      Đổi mật khẩu thành công!
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-[#5a565e] dark:text-[#b0a7aa] leading-relaxed">
                      Mật khẩu của tài khoản {emailFromUrl ? <strong className="text-[#2A282D] dark:text-white">{emailFromUrl}</strong> : 'bạn'} đã được cập nhật thành công. Bạn có thể sử dụng mật khẩu mới này để đăng nhập ngay bây giờ.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/login"
                      className="system-primary-action inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-900 hover:bg-slate-800 px-4 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer"
                    >
                      <span>Đăng nhập ngay với mật khẩu mới</span>
                    </Link>
                  </div>
                </div>
              ) : (
                /* ── GIAO DIỆN FORM ĐẶT MẬT KHẨU MỚI ── */
                <>
                  <div className="mb-6 text-left">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-serif font-bold tracking-tight text-[#2A282D] dark:text-white sm:text-3xl">
                        Mật khẩu mới
                      </h2>
                      {emailFromUrl && (
                        <span className="rounded border border-brand-300 bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
                          {emailFromUrl}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs sm:text-sm font-normal text-slate-500 dark:text-[#a59fa3]">
                      Vui lòng thiết lập mật khẩu mới có độ bảo mật cao cho tài khoản.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 sm:text-sm">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                      <span className="leading-snug">{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate className="space-y-4 text-left">
                    
                    {/* Input 1: Mật khẩu mới */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="new-password"
                        className="block text-xs font-semibold text-slate-800 dark:text-slate-300 sm:text-sm"
                      >
                        Mật khẩu mới
                      </label>
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                          aria-hidden="true"
                        />
                        <input
                          id="new-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (error) setError('');
                          }}
                          placeholder="Tối thiểu 8 ký tự"
                          disabled={isSubmitting}
                          className="h-11 w-full rounded-md border border-slate-300 bg-slate-50 pl-10 pr-10 text-xs font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-500 focus:border-brand-600 disabled:cursor-not-allowed disabled:bg-[#f1edee] dark:border-white/15 dark:bg-[#221e27] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-400 sm:text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer p-0.5"
                          tabIndex={-1}
                          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Thanh đo độ mạnh mật khẩu */}
                      {password && (
                        <div className="pt-1 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 dark:text-[#a59fa3]">Độ mạnh:</span>
                            <span className={`font-bold ${strengthInfo.color.split(' ')[1]}`}>
                              {strengthInfo.text}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded bg-slate-50 dark:bg-white/10 overflow-hidden flex gap-1">
                            <div className={`h-full flex-1 rounded ${strengthInfo.score >= 1 ? strengthInfo.color.split(' ')[0] : 'bg-transparent'}`} />
                            <div className={`h-full flex-1 rounded ${strengthInfo.score >= 2 ? strengthInfo.color.split(' ')[0] : 'bg-transparent'}`} />
                            <div className={`h-full flex-1 rounded ${strengthInfo.score >= 3 ? strengthInfo.color.split(' ')[0] : 'bg-transparent'}`} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input 2: Xác nhận mật khẩu mới */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="confirm-password"
                        className="block text-xs font-semibold text-slate-800 dark:text-slate-300 sm:text-sm"
                      >
                        Xác nhận mật khẩu mới
                      </label>
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                          aria-hidden="true"
                        />
                        <input
                          id="confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (error) setError('');
                          }}
                          placeholder="Nhập lại mật khẩu mới"
                          disabled={isSubmitting}
                          className="h-11 w-full rounded-md border border-slate-300 bg-slate-50 pl-10 pr-10 text-xs font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-500 focus:border-brand-600 disabled:cursor-not-allowed disabled:bg-[#f1edee] dark:border-white/15 dark:bg-[#221e27] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-400 sm:text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer p-0.5"
                          tabIndex={-1}
                          aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="system-primary-action mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                          <span>Đang cập nhật...</span>
                        </>
                      ) : (
                        <span>Cập nhật mật khẩu mới</span>
                      )}
                    </button>
                  </form>

                  <div className="mt-6 pt-4 border-t border-slate-300 dark:border-white/10 text-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-200 sm:text-sm"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Quay lại trang Đăng nhập</span>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER CHUẨN XÁC TOÀN HỆ THỐNG ── */}
      <InstitutionalFooter />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-950 text-slate-500">Đang tải...</div>}>
      <ResetPasswordFormContent />
    </Suspense>
  );
}
