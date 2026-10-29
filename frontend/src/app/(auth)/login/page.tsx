'use client';

import React, { useState } from 'react';
import AuthBrandPanel from '@/components/auth/AuthBrandPanel';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2
} from 'lucide-react';

export default function LoginPage() {
  // Trạng thái Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
          : 'Đăng nhập thành công! Đang chuyển hướng...',
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
    <main className="flex min-h-screen w-full flex-col bg-[#f4f7f9] font-sans text-slate-800 lg:flex-row">
      
      <AuthBrandPanel variant="detailed" />

      {/* ── CỘT PHẢI: 60% DESKTOP (Light Grey Background + Centered Card) ── */}
      <section className="relative flex min-h-[620px] w-full items-center justify-center p-4 sm:p-8 lg:min-h-screen lg:w-[60%] lg:p-12">
        
        {/* Thẻ Form Đăng Nhập (Card Container chuẩn Wireframe) */}
        <div className="w-full max-w-[440px] rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60 transition-all sm:min-h-[662px] sm:p-10">
          
          {/* Header của Form: Form chữ thanh lịch, rõ nét */}
          <div className="mb-7 text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Đăng nhập hệ thống
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-normal">
              Sử dụng email do nhà trường cung cấp để tiếp tục
            </p>
          </div>

          {/* Thông báo Lỗi / Thành công */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-snug">{successMessage}</span>
            </div>
          )}

          {/* Form Đăng nhập */}
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
                  placeholder="••••••••••"
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
                <a 
                  href="/forgot-password" 
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  <b>Quên mật khẩu?</b>
                </a>
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
