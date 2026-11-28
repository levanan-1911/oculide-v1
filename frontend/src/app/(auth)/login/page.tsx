'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import InstitutionalFooter from '@/components/common/InstitutionalFooter';
import BrandLogo from '@/components/common/BrandLogo';
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Sun,
  Moon,
  ShieldCheck,
  Server,
  Lock,
  GraduationCap,
  Clock3
} from 'lucide-react';
import { getClientIpHeader, getClientPublicIp } from '@/utils/ipResolver';

export default function LoginPage() {
  // ── THEME STATE ──
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [mounted, setMounted] = useState(false);

  // ── FORM STATE ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);
  const [isPermanentlyLocked, setIsPermanentlyLocked] = useState(false);

  useEffect(() => {
    if (lockoutSeconds === null) return;
    if (lockoutSeconds <= 0) {
      setLockoutSeconds(null);
      setErrorMessage(null);
      return;
    }
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => (prev !== null && prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);
  const [maintenanceInfo, setMaintenanceInfo] = useState<{
    isActive: boolean;
    message: string;
  }>({ isActive: false, message: '' });

  // Kiểm tra cờ bảo trì hệ thống trực tiếp từ API công khai của Backend
  useEffect(() => {
    fetch('/api/v1/system/public-config')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.maintenance_mode) {
          setMaintenanceInfo({
            isActive: true,
            message:
              data.maintenance_message ||
              'Hệ thống đang được bảo trì định kỳ bởi Trung tâm CNTT. Vui lòng quay lại sau ít phút.',
          });
        }
      })
      .catch(() => {});
  }, []);

  // Khởi tạo Theme & tiền xử lý IP Public ngầm
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('oculide_theme') as 'dark' | 'light' | null;
    const initial = saved || 'light';
    setTheme(initial);
    applyTheme(initial);

    // Tiền phân giải IP Public ngầm để sẵn sàng khi bấm Đăng nhập
    getClientPublicIp().catch(() => { });

    // Kiểm tra thông báo hết hạn phiên làm việc do treo máy
    const urlParams = new URLSearchParams(window.location.search);
    const logoutReason = urlParams.get('reason');
    if (logoutReason === 'idle_timeout') {
      setErrorMessage('Phiên làm việc đã tự động kết thúc do không có thao tác trong 30 phút. Vui lòng đăng nhập lại.');
      return;
    } else if (logoutReason === 'token_expired') {
      setErrorMessage('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    } else if (logoutReason === 'session_revoked') {
      setErrorMessage('Phiên làm việc đã được mở khóa hoặc kết thúc bởi Quản trị viên / Giám thị. Vui lòng đăng nhập lại.');
      return;
    } else if (logoutReason === 'maintenance') {
      setErrorMessage('Hệ thống đang được bảo trì định kỳ. Chỉ Quản trị viên mới có thể truy cập lúc này.');
      fetch('/api/v1/auth/maintenance-status', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((m) => {
          if (m?.maintenance_message) {
            let msg = m.maintenance_message;
            if (m.maintenance_ends_at) {
              const d = new Date(m.maintenance_ends_at);
              if (!isNaN(d.getTime())) {
                const hh = String(d.getHours()).padStart(2, '0');
                const mm = String(d.getMinutes()).padStart(2, '0');
                msg += ` (Dự kiến hoàn tất lúc ${hh}:${mm})`;
              }
            }
            setErrorMessage(msg);
          }
        })
        .catch(() => {});
      return;
    }

    // Chỉ tự động chuyển hướng khi session cookie còn tồn tại (trình duyệt chưa bị tắt)
    try {
      const hasSessionCookie = document.cookie
        .split(';')
        .some((c) => c.trim().startsWith('oculide_token='));

      if (!hasSessionCookie) {
        localStorage.removeItem('oculide_token');
        localStorage.removeItem('oculide_user');
        localStorage.removeItem('oculide_refresh_token');
        localStorage.removeItem('oculide_last_activity');
        return;
      }

      const token = localStorage.getItem('oculide_token');
      const rawUser = localStorage.getItem('oculide_user');
      const lastActivity = Number(localStorage.getItem('oculide_last_activity') || Date.now());
      const isIdleTimeout = Date.now() - lastActivity > 30 * 60 * 1000;

      if (token && rawUser && !isIdleTimeout) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          if (payload.exp && Date.now() < payload.exp * 1000) {
            const user = JSON.parse(rawUser);
            const role = (user.role || '').toLowerCase();
            const target =
              role === 'admin'
                ? '/admin/dashboard'
                : role === 'instructor'
                  ? '/instructor/dashboard'
                  : '/student/dashboard';
            window.location.replace(target);
          }
        }
      }
    } catch {
      // ignore
    }
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

  // ── XỬ LÝ ĐĂNG NHẬP ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Chưa nhập Email hoặc Tên đăng nhập');
      return;
    }
    if (!password) {
      setErrorMessage('Chưa nhập Mật khẩu');
      return;
    }

    setIsLoading(true);

    try {
      const ipHeaders = await getClientIpHeader();
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...ipHeaders,
        },
        body: JSON.stringify({
          username: email.trim(),
          password: password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 429) {
          setIsPermanentlyLocked(false);
          throw new Error('Bạn đã thao tác quá nhanh hoặc thử đăng nhập quá nhiều lần. Vui lòng đợi 1 phút rồi thử lại.');
        }
        if (response.status === 423 || data?.errorCode === 'ACCOUNT_TEMP_LOCKED' || data?.detail?.code === 'ACCOUNT_TEMP_LOCKED') {
          setIsPermanentlyLocked(false);
          const secs = Number(data?.detail?.retry_after_seconds ?? data?.detail?.remaining_seconds ?? 300);
          setLockoutSeconds(secs > 0 ? secs : 300);
          const minsStr = String(Math.floor((secs > 0 ? secs : 300) / 60)).padStart(2, '0');
          const secsStr = String((secs > 0 ? secs : 300) % 60).padStart(2, '0');
          throw new Error(
            data?.detail?.message ||
              `Tài khoản tạm khóa do nhập sai mật khẩu 5 lần. Hệ thống sẽ tự động mở khóa sau ${minsStr}:${secsStr}, hoặc liên hệ Giám thị phòng thi để được hỗ trợ ngay.`
          );
        }
        if (
          response.status === 403 &&
          (data?.errorCode === 'ACCOUNT_PERMANENTLY_LOCKED' || data?.detail?.code === 'ACCOUNT_PERMANENTLY_LOCKED')
        ) {
          setLockoutSeconds(null);
          setIsPermanentlyLocked(true);
          throw new Error(
            data?.detail?.message ||
              data?.message ||
              'Tài khoản của bạn đã bị khóa vĩnh viễn. Vui lòng liên hệ qua email oculide.system@gmail.com để được hỗ trợ mở khóa.'
          );
        }
        setLockoutSeconds(null);
        setIsPermanentlyLocked(false);
        const msg =
          typeof data?.detail === 'string'
            ? data.detail
            : data?.detail?.message || data?.message || 'Email/tài khoản hoặc mật khẩu không chính xác.';
        throw new Error(msg);
      }
      setLockoutSeconds(null);
      setIsPermanentlyLocked(false);

      if (data.access_token) {
        localStorage.setItem('oculide_token', data.access_token);
        localStorage.setItem('oculide_user', JSON.stringify(data.user));
        localStorage.setItem('oculide_last_activity', Date.now().toString());
        document.cookie = `oculide_token=${data.access_token}; path=/; SameSite=Lax`;
        document.cookie = `oculide_role=${data.user?.role || ''}; path=/; SameSite=Lax`;
        if (data.refresh_token) {
          localStorage.setItem('oculide_refresh_token', data.refresh_token);
        }
      }

      // Bỏ chuyển hướng trang trung gian reset-password sau khi tạo tài khoản, vào thẳng dashboard tương ứng
      // const requiresPasswordChange = Boolean(data.user?.must_change_password);
      // if (requiresPasswordChange) {
      //   window.location.href = '/reset-password';
      //   return;
      // }

      const role = (data.user?.role || '').toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect');
      const isRedirectAllowedForRole =
        redirectUrl &&
        redirectUrl.startsWith('/') &&
        !redirectUrl.startsWith('//') &&
        ((redirectUrl.startsWith('/admin') && role === 'admin') ||
          (redirectUrl.startsWith('/instructor') && (role === 'instructor' || role === 'admin')) ||
          (redirectUrl.startsWith('/student') && role === 'student') ||
          (!redirectUrl.startsWith('/admin') &&
            !redirectUrl.startsWith('/instructor') &&
            !redirectUrl.startsWith('/student')));

      if (isRedirectAllowedForRole) {
        window.location.href = redirectUrl;
        return;
      }

      if (role === 'admin') {
        window.location.href = '/admin/dashboard';
      } else if (role === 'instructor') {
        window.location.href = '/instructor/dashboard';
      } else {
        window.location.href = '/student/dashboard';
      }

    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-neutral-950 dark:text-slate-300 transition-colors duration-200">

      {/* ── NÚT CHUYỂN THEME CÂN ĐỐI ── */}
      {mounted && (
        <div className="fixed top-3.5 right-4 z-50">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng (Light Mode)' : 'Chuyển sang giao diện Tối (Dark Mode)'}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-800 shadow-sm backdrop-blur-md transition-colors hover:bg-[#ece7e9] dark:border-white/10 dark:bg-neutral-900 dark:text-amber-300 dark:hover:bg-[#25202b] cursor-pointer"
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

      {/* ── HEADER CỦA CỔNG ĐĂNG NHẬP ── */}
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
              <p className="text-[11px] font-medium text-slate-500 dark:text-[#a59fa3]">AI Proctoring &amp; Programming LMS</p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:bg-[#eae5e7] dark:border-white/15 dark:bg-[#221e27] dark:text-slate-300 dark:hover:bg-[#2b2532] pr-3 mr-12"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Về trang chủ</span>
          </Link>
        </div>
      </header>

      {/* ── BỐ CỤC 2 CỘT CÂN ĐỐI ── */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">

          {/* ── CỘT TRÁI (7 CỘT): THÔNG TIN HỌC THUẬT & TRẠNG THÁI HỆ THỐNG ── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Tag Cổng xác thực */}
            <div className="inline-flex items-center gap-2 rounded border border-brand-300 bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>CỔNG XÁC THỰC KHẢO THÍ &amp; THỰC HÀNH LẬP TRÌNH</span>
            </div>

            {/* Tiêu đề chính */}
            <h1 className="text-3xl font-serif font-bold tracking-tight text-[#2A282D] sm:text-4xl dark:text-white leading-tight">
              Nền tảng kiểm tra &amp; đánh giá <br />
              <span className="text-brand-600 dark:text-brand-200">
                Năng lực Lập trình Trực tuyến
              </span>
            </h1>

            {/* Mô tả phụ */}
            <p className="text-sm leading-relaxed text-[#5a565e] dark:text-[#b0a7aa] max-w-xl">
              Hệ thống cung cấp môi trường thực hành thuật toán, phòng thi cách ly Sandbox và giám sát thi tự động ứng dụng Trí tuệ Nhân tạo cho sinh viên và giảng viên đại học.
            </p>

            {/* Khung Thông tin Quy chuẩn & Môi trường */}
            <div className="rounded-md border border-slate-300 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
              <div className="flex items-center justify-between pb-3 border-b border-slate-300 dark:border-white/10 mb-4">
                <span className="rounded border border-brand-300 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200 uppercase tracking-wider">
                  MÔI TRƯỜNG SANDBOX CÔ LẬP
                </span>
                <span className="text-xs text-slate-500 dark:text-[#a59fa3] font-mono">
                  G++ 17 • Python 3.11 • OpenJDK 21
                </span>
              </div>

              <h3 className="text-base font-serif font-bold text-[#2A282D] dark:text-white mb-2">
                Hệ thống chấm thi tự động theo chuẩn IEEE 830-1998
              </h3>
              <p className="text-xs leading-relaxed text-[#5a565e] dark:text-[#b0a7aa]">
                Mã nguồn của sinh viên được biên dịch và chạy thử nghiệm trong các container Docker cô lập hoàn toàn tài nguyên, kiểm tra giới hạn thời gian (Time Limit), bộ nhớ (Memory Limit) và đối soát với bộ test case ẩn.
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-300 dark:border-white/10 text-xs">
                <span className="font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Mã hóa đường truyền WebRTC SFU
                </span>
                <span className="text-[#5a565e] dark:text-[#b0a7aa] flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-200" />
                  Phân quyền tập trung ở máy chủ
                </span>
              </div>
            </div>

            {/* Bảng Quy chế phòng thi ngắn gọn cho thí sinh */}
            <div className="rounded-md border border-slate-300 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
              <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#2A282D] dark:text-white mb-3 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-brand-600 dark:text-brand-200" />
                Lưu ý quan trọng khi vào ca thi
              </h4>
              <ul className="space-y-2 text-xs text-[#5a565e] dark:text-[#b0a7aa]">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                  <span>Sử dụng trình duyệt Chrome hoặc Edge phiên bản mới nhất, chuẩn bị sẵn webcam và kết nối ổn định.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                  <span>Không rời khỏi cửa sổ làm bài hoặc mở tab mới trong suốt thời gian diễn ra ca thi có giám sát.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                  <span>Mọi sự cố kỹ thuật sẽ được lưu vết vào nhật ký kiểm toán hệ thống để giảng viên xem xét.</span>
                </li>
              </ul>
            </div>

          </div>

          {/* ── CỘT PHẢI (5 CỘT): CARD ĐĂNG NHẬP CÂN ĐỐI ── */}
          <div className="lg:col-span-5">
            <div className="rounded-md border border-slate-300 bg-white p-6 sm:p-8 shadow-sm dark:border-white/10 dark:bg-neutral-900">

              {/* Header của Card Đăng nhập */}
              <div className="mb-6 text-left">
                <h2 className="text-2xl font-serif font-bold tracking-tight text-[#2A282D] dark:text-white">
                  Đăng nhập tài khoản
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-[#a59fa3]">
                  Sử dụng tài khoản hoặc Email do nhà trường cấp
                </p>
              </div>

              {/* Banner Bảo trì nếu có */}
              {maintenanceInfo.isActive && (
                <div className="mb-4 flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <strong className="block font-bold">Chế độ bảo trì hệ thống</strong>
                    <span className="mt-0.5 block leading-relaxed">{maintenanceInfo.message}</span>
                  </div>
                </div>
              )}

              {/* Form Đăng nhập */}
              <form onSubmit={handleSubmit} className="space-y-4 text-left">

                {/* Input 1: Email hoặc tên đăng nhập */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-slate-800 dark:text-slate-300"
                  >
                    Tên đăng nhập
                  </label>
                  <input
                    id="login-email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="abcd@dtu.edu.vn hoặc abcd"
                    disabled={isLoading}
                    autoComplete="username"
                    className="w-full h-11 rounded-md border border-slate-300 bg-slate-50 px-3.5 text-xs text-slate-800 placeholder-[#7a7376] transition-colors focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 disabled:bg-[#f1edee] disabled:text-[#a59fa3] dark:border-white/15 dark:bg-[#221e27] dark:text-slate-300 dark:placeholder-[#7a7376] dark:focus:border-brand-400 dark:focus:ring-[#7a0308]"
                  />
                </div>

                {/* Input 2: Mật khẩu */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-slate-800 dark:text-slate-300"
                    >
                      Mật khẩu
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-200 transition-colors"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      disabled={isLoading}
                      autoComplete="current-password"
                      className="w-full h-11 rounded-md border border-slate-300 bg-slate-50 px-3.5 pr-10 text-xs text-slate-800 placeholder-[#7a7376] transition-colors focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 disabled:bg-[#f1edee] disabled:text-[#a59fa3] dark:border-white/15 dark:bg-[#221e27] dark:text-slate-300 dark:placeholder-[#7a7376] dark:focus:border-brand-400 dark:focus:ring-[#7a0308]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Nút Đăng nhập */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="system-primary-action mt-2 flex w-full h-11 items-center justify-center rounded-md bg-slate-900 px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang xác thực tài khoản...
                    </span>
                  ) : (
                    <span>Đăng nhập</span>
                  )}
                </button>

                {/* Thông báo khóa vĩnh viễn, khóa tạm thời có đếm ngược hoặc lỗi thông thường */}
                {isPermanentlyLocked ? (
                  <div
                    role="alert"
                    className="mt-2 rounded-md border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                  >
                    <p className="font-bold">Tài khoản đã bị khóa vĩnh viễn</p>
                    <p className="mt-1 leading-relaxed">
                      Tài khoản của bạn đã bị khóa vĩnh viễn. Vui lòng liên hệ qua email{' '}
                      <a
                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=oculide.system@gmail.com&su=${encodeURIComponent('[Oculide] Yêu cầu hỗ trợ mở khóa tài khoản')}&body=${encodeURIComponent(`Kính gửi Ban Quản trị Hệ thống Oculide,\n\nTài khoản của tôi (${email.trim() || 'chưa nhập'}) hiện đang bị khóa vĩnh viễn.\nVui lòng kiểm tra và hỗ trợ mở khóa giúp tôi.\n\nXin cảm ơn.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline hover:text-rose-700 dark:hover:text-rose-100 transition-colors"
                      >
                        oculide.system@gmail.com
                      </a>{' '}
                      để được hỗ trợ mở khóa.
                    </p>
                  </div>
                ) : lockoutSeconds !== null && lockoutSeconds > 0 ? (
                  <div
                    role="alert"
                    className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                  >
                    <p className="font-bold">
                      Tài khoản tạm khóa do nhập sai mật khẩu quá nhiều lần.
                    </p>
                    <p className="mt-1 leading-relaxed">
                      Hệ thống sẽ tự động mở khóa sau{' '}
                      <span className="font-mono font-extrabold text-amber-700 dark:text-amber-300">
                        {String(Math.floor(lockoutSeconds / 60)).padStart(2, '0')}:
                        {String(lockoutSeconds % 60).padStart(2, '0')}
                      </span>
                      , Vui lòng đợi hết thời gian trên hoặc chọn Quên mật khẩu để khôi phục quyền truy cập.
                    </p>
                  </div>
                ) : errorMessage ? (
                  <p role="alert" className="mt-2 text-xs font-bold text-red-600 dark:text-red-400 text-left">
                    {errorMessage}
                  </p>
                ) : null}

                {/* Khối ghi chú phân quyền tự động */}
                <div className="mt-4 rounded-md border border-slate-300 bg-slate-50 p-3 text-left dark:border-white/10 dark:bg-[#221e27]">
                  <p className="text-xs font-semibold leading-snug text-slate-900 dark:text-[#e5a9b9]">
                    Mẹo nhỏ bảo vệ tài khoản
                  </p>
                  <p className="mt-0.5 text-[11px] font-normal text-slate-500 dark:text-[#a59fa3]">
                    Hệ thống tự nhận diện Sinh viên, Giảng viên hoặc Quản trị viên sau khi đăng nhập.
                  </p>
                </div>

              </form>

            </div>
          </div>

        </div>
      </main>

      {/* ── FOOTER HỌC THUẬT ── */}
      <InstitutionalFooter />

    </div>
  );
}
