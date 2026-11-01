'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';

export default function LoginPage() {
  // Trạng thái Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [maintenanceInfo, setMaintenanceInfo] = useState<{
    isActive: boolean;
    message: string;
  }>({ isActive: false, message: '' });

  // Kiểm tra cờ bảo trì hệ thống
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('oculide_admin_system_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.maintenanceMode) {
            setMaintenanceInfo({
              isActive: true,
              message:
                parsed.maintenanceMessage ||
                'Hệ thống đang được bảo trì định kỳ bởi Trung tâm CNTT. Cổng đăng nhập tạm thời chỉ dành riêng cho Quản trị viên.',
            });
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Xử lý gửi form đăng nhập
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate nhanh ở Client
    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập Email hoặc tài khoản.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập Mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      // Kết nối trực tiếp tới Backend REST API của Oculide v1
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email.trim(),
          password: password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || 'Email/tài khoản hoặc mật khẩu không chính xác.');
      }

      // Kiểm tra Chế độ Bảo trì: Nếu đang bật bảo trì, chỉ duy nhất Admin được đăng nhập
      if (typeof window !== 'undefined') {
        try {
          const rawSettings = localStorage.getItem('oculide_admin_system_settings');
          if (rawSettings) {
            const parsed = JSON.parse(rawSettings);
            if (parsed.maintenanceMode && data.user?.role !== 'admin') {
              throw new Error(
                parsed.maintenanceMessage ||
                  'Hệ thống đang trong chế độ bảo trì định kỳ. Cổng đăng nhập tạm thời chỉ dành riêng cho Quản trị viên.'
              );
            }
          }
        } catch (mErr: any) {
          if (mErr.message?.includes('bảo trì') || mErr.message?.includes('Quản trị viên')) {
            throw mErr;
          }
        }
      }

      // Lưu JWT Token và thông tin User
      if (data.access_token) {
        localStorage.setItem('oculide_token', data.access_token);
        localStorage.setItem('oculide_user', JSON.stringify(data.user));
        if (data.refresh_token) {
          localStorage.setItem('oculide_refresh_token', data.refresh_token);
        }
      }

      const requiresPasswordChange = Boolean(data.user?.must_change_password);
      setSuccessMessage(
        requiresPasswordChange
          ? 'Mật khẩu tạm hợp lệ. Đang chuyển đến bước đặt mật khẩu mới...'
          : 'Đăng nhập thành công! Đang chuyển hướng...'
      );

      // Hệ thống tự động điều hướng theo Role (Admin, Giảng viên, Sinh viên)
      setTimeout(() => {
        if (requiresPasswordChange) {
          window.location.href = '/reset-password';
          return;
        }
        const role = data.user?.role;
        if (role === 'admin') {
          window.location.href = '/admin/dashboard';
        } else if (role === 'instructor') {
          window.location.href = '/instructor/dashboard';
        } else {
          window.location.href = '/student/dashboard';
        }
      }, 1000);

    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row font-sans bg-[#f4f7f9] text-slate-800">
      
      {/* ── CỘT TRÁI: 40% DESKTOP (Navy Dark Theme + Oculide Branding) ── */}
      <section className="w-full lg:w-[40%] bg-[#1a253a] text-white flex flex-col justify-between p-8 sm:p-12 relative overflow-hidden shrink-0">
        
        {/* Hiệu ứng ánh sáng mờ trang trí nền */}
        <div 
          aria-hidden="true" 
          className="absolute -top-32 -left-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" 
        />
        <div 
          aria-hidden="true" 
          className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" 
        />

        {/* 1. Logo Oculide & Nhãn nhận diện */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
            <Eye className="w-6 h-6 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Oculide
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">AI Proctoring &amp; Lab LMS</p>
          </div>
        </div>

        {/* 2. Hero Content: Slogan & Giới thiệu tính năng */}
        <div className="relative z-10 my-8 lg:my-auto text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-blue-300 mb-6 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Chuẩn đặc tả IEEE 830-1998</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-snug tracking-tight text-white mb-4">
            Giám sát phòng thi &amp;<br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              {' '}Thực hành lập trình AI
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-md mx-auto lg:mx-0 font-normal">
            Minh bạch, trực quan và bảo mật. Tự động hóa đánh giá năng lực lập trình và phát hiện bất thường bằng Trí tuệ Nhân tạo.
          </p>

          {/* Micro-features Checklist */}
          <div className="mt-8 space-y-3 hidden sm:block text-left max-w-sm mx-auto lg:mx-0">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">✓</div>
              <span>Giám sát đa luồng qua LiveKit WebRTC SFU</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">✓</div>
              <span>Chấm điểm code tự động trong Docker Sandbox cô lập</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">✓</div>
              <span>Phát hiện gian lận bằng YOLOv8 &amp; MediaPipe</span>
            </div>
          </div>
        </div>

        {/* 3. Footer bên trái */}
        <div className="relative z-10 text-xs text-slate-400 border-t border-slate-800/80 pt-4 hidden lg:block">
          <p>© 2026 Oculide System. Nghiên cứu khoa học &amp; Ứng dụng.</p>
        </div>
      </section>

      {/* ── CỘT PHẢI: 60% DESKTOP (Form Đăng nhập Căn giữa Tuyệt đối) ── */}
      <section className="w-full lg:w-[60%] flex items-center justify-center p-6 sm:p-12 lg:p-16 relative">
        
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 relative z-10">
          
          {/* Header Tiêu đề Form */}
          <div className="mb-8 text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Đăng nhập hệ thống
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 font-normal">
              Sử dụng email do nhà trường cung cấp để tiếp tục
            </p>
          </div>

          {/* Banner Thông báo Bảo trì (nếu có) */}
          {maintenanceInfo.isActive && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Hệ thống đang bảo trì</p>
                <p className="text-[11px] mt-0.5">{maintenanceInfo.message}</p>
              </div>
            </div>
          )}

          {/* Thông báo Lỗi */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Thông báo Thành công */}
          {successMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Form điền thông tin */}
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            
            {/* Input 1: EMAIL HOẶC TÀI KHOẢN */}
            <div className="space-y-1.5">
              <label 
                htmlFor="email" 
                className="block text-xs sm:text-sm font-semibold text-slate-700"
              >
                Email hoặc tài khoản
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="abcd@school.edu.vn"
                disabled={isLoading}
                autoComplete="username"
                className="w-full bg-white text-slate-800 text-sm px-4 py-3 rounded-xl border border-slate-200 placeholder-slate-400 
                           focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all 
                           disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            {/* Input 2: MẬT KHẨU */}
            <div className="space-y-1.5">
              <label 
                htmlFor="password" 
                className="block text-xs sm:text-sm font-semibold text-slate-700"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="w-full bg-white text-slate-800 text-sm px-4 py-3 pr-11 rounded-xl border border-slate-200 placeholder-slate-400 
                             focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all 
                             disabled:bg-slate-50 disabled:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Link Quên mật khẩu bên phải dưới ô mật khẩu */}
              <div className="text-right pt-1">
                <Link 
                  href="/forgot-password" 
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            {/* Nút bấm chính: Primary Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold py-3 px-4 rounded-xl 
                         shadow-md shadow-blue-500/25 flex items-center justify-center transition-all 
                         disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer text-sm sm:text-base mt-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>

            {/* Khối dải màu sáng thông báo phân quyền (Đúng nguyên mẫu wireframe) */}
            <div className="mt-6 p-4 rounded-xl bg-blue-50/75 border border-blue-100/80 text-left">
              <p className="text-xs sm:text-sm font-semibold text-blue-600 leading-snug">
                Hệ thống tự xác định vai trò và quyền.
              </p>
              <p className="text-xs text-slate-400 mt-1 font-normal">
                Không hiển thị bộ chọn vai trò.
              </p>
            </div>

          </form>

        </div>

      </section>

    </main>
  );
}
