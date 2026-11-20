'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import InstitutionalFooter from '@/components/common/InstitutionalFooter';
import BrandLogo from '@/components/common/BrandLogo';
import AuthShowcasePanel from '@/components/auth/AuthShowcasePanel';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  Moon,
  Send,
  Sun,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  // ── THEME STATE ──
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  // ── FORM STATE ──
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Khởi tạo Theme đồng bộ với toàn hệ thống
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!normalizedEmail) {
      setError('Vui lòng nhập email trường hoặc tài khoản của bạn.');
      return;
    }

    if (!isValidEmail) {
      setError('Email không đúng định dạng. Vui lòng kiểm tra lại.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || 'Không thể tiếp nhận yêu cầu khôi phục. Vui lòng thử lại sau.');
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi yêu cầu khôi phục. Vui lòng thử lại sau.');
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
              <p className="text-[11px] font-medium text-slate-500 dark:text-[#a59fa3]">AI Proctoring &amp; Lab LMS</p>
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

      {/* ── BỐ CỤC 12 CỘT CHUẨN XÁC THEO HỆ THỐNG ── */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          
          {/* CỘT TRÁI (7 CỘT): SHOWCASE NỀN TẢNG DÙNG CHUNG VỚI LOGIN */}
          <div className="lg:col-span-7">
            <AuthShowcasePanel />
          </div>

          {/* CỘT PHẢI (5 CỘT): CARD KHÔI PHỤC MẬT KHẨU MATCH DESIGN LOGIN */}
          <div className="lg:col-span-5">
            <div className="rounded-md border border-slate-300 bg-white p-7 sm:p-9 shadow-sm dark:border-white/10 dark:bg-neutral-900">
              
              {isSubmitted ? (
                /* ── GIAO DIỆN KHI ĐÃ GỬI THÀNH CÔNG ── */
                <div className="space-y-5 text-left">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                    <Send className="h-6 w-6" aria-hidden="true" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-serif font-bold tracking-tight text-[#2A282D] dark:text-white sm:text-3xl">
                      Kiểm tra hộp thư của bạn
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-[#5a565e] dark:text-[#b0a7aa] leading-relaxed">
                      Chúng tôi đã gửi một liên kết khôi phục mật khẩu đến email{' '}
                      <strong className="font-bold text-slate-900 dark:text-[#e5a9b9]">{email.trim()}</strong>.
                    </p>
                  </div>

                  <div className="rounded-md border border-slate-300 bg-slate-50 p-3.5 text-xs text-slate-900 dark:border-white/10 dark:bg-[#221e27] dark:text-[#f0c2cf] leading-relaxed">
                    💡 <strong>Lưu ý:</strong> Liên kết có hiệu lực trong <strong>15 phút</strong>. Vui lòng kiểm tra cả mục Thư rác (Spam) nếu không thấy trong Hộp thư đến.
                  </div>

                  <div className="space-y-3 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSubmitted(false);
                        setEmail('');
                      }}
                      className="h-11 w-full rounded-md border border-slate-300 bg-white dark:bg-white/5 text-xs font-semibold text-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Gửi lại bằng email khác
                    </button>

                    <div className="text-center pt-1">
                      <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-200"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Quay lại trang Đăng nhập</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── GIAO DIỆN NHẬP FORM KHÔI PHỤC ── */
                <>
                  <div className="mb-6 text-left">
                    <h2 className="text-2xl font-serif font-bold tracking-tight text-[#2A282D] dark:text-white sm:text-3xl">
                      Khôi phục mật khẩu
                    </h2>
                    <p className="mt-1.5 text-xs sm:text-sm font-normal text-slate-500 dark:text-[#a59fa3]">
                      Nhập email tài khoản của bạn để nhận liên kết đổi mật khẩu mới.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 sm:text-sm">
                      <span className="leading-snug">{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate className="space-y-4 text-left">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="school-email"
                        className="block text-xs font-semibold text-slate-800 dark:text-slate-300 sm:text-sm"
                      >
                        Email trường hoặc tài khoản
                      </label>
                      <div className="relative">
                        <Mail
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                          aria-hidden="true"
                        />
                        <input
                          id="school-email"
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError('');
                          }}
                          placeholder="student@school.edu.vn"
                          disabled={isSubmitting}
                          className="h-11 w-full rounded-md border border-slate-300 bg-slate-50 pl-10 pr-4 text-xs font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-500 focus:border-brand-600 disabled:cursor-not-allowed disabled:bg-[#f1edee] dark:border-white/15 dark:bg-[#221e27] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-400 sm:text-sm"
                        />
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
                          <span>Đang gửi liên kết...</span>
                        </>
                      ) : (
                        <span>Gửi liên kết khôi phục</span>
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
