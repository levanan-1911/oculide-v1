'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import InstitutionalFooter from '@/components/common/InstitutionalFooter';
import { checkMockPasswordLogin } from '@/utils/authPasswordReset';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft,
  Sun,
  Moon,
  Terminal
} from 'lucide-react';

export default function LoginPage() {
  // ── THEME STATE ──
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  // ── FORM STATE ──
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
                'Hệ thống đang được bảo trì định kỳ bởi Trung tâm CNTT. Vui lòng quay lại sau ít phút.',
            });
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Khởi tạo Theme
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

  // ── XỬ LÝ ĐĂNG NHẬP (BẢO TOÀN 100% LUỒNG XÁC THỰC & PHÂN QUYỀN) ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập Email hoặc tài khoản.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập Mật khẩu.');
      return;
    }

    setIsLoading(true);

    // 1. Ưu tiên kiểm tra tài khoản vừa đổi mật khẩu qua luồng Quên mật khẩu
    const mockResetUser = checkMockPasswordLogin(email, password);
    if (mockResetUser) {
      const mockToken = 'mock_token_' + Date.now();
      localStorage.setItem('oculide_token', mockToken);
      localStorage.setItem('oculide_user', JSON.stringify(mockResetUser));
      document.cookie = `oculide_token=${mockToken}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `oculide_role=${mockResetUser.role || ''}; path=/; max-age=86400; SameSite=Lax`;
      setSuccessMessage('Đăng nhập thành công với mật khẩu mới! Đang chuyển hướng...');
      setTimeout(() => {
        const role = mockResetUser.role;
        if (role === 'admin') {
          window.location.href = '/admin/dashboard';
        } else if (role === 'instructor') {
          window.location.href = '/instructor/dashboard';
        } else {
          window.location.href = '/student/dashboard';
        }
      }, 1000);
      return;
    }

    try {
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

      if (data.access_token) {
        localStorage.setItem('oculide_token', data.access_token);
        localStorage.setItem('oculide_user', JSON.stringify(data.user));
        document.cookie = `oculide_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `oculide_role=${data.user?.role || ''}; path=/; max-age=86400; SameSite=Lax`;
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

      setTimeout(() => {
        if (requiresPasswordChange) {
          window.location.href = '/reset-password';
          return;
        }

        // Kiểm tra xem có URL redirect trước đó không
        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect');
        if (redirectUrl && redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
          window.location.href = redirectUrl;
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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      
      {/* ── NÚT CHUYỂN ĐEN/TRẮNG ICON NHỎ GÓC TRÊN BÊN PHẢI ── */}
      {mounted && (
        <div className="fixed top-4 right-4 z-50">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng (Light)' : 'Chuyển sang giao diện Tối (Dark)'}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-700 shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-white active:scale-95 dark:border-white/15 dark:bg-[#121620]/90 dark:text-amber-400 dark:hover:bg-[#1a202c] cursor-pointer"
            aria-label="Chuyển đổi giao diện Sáng / Tối"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 transition-transform rotate-0 hover:-rotate-12" />
            )}
          </button>
        </div>
      )}

      {/* ── HEADER CỦA TRANG LOGIN ── */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-[#090a0f]/80 transition-colors">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 transition-transform group-hover:scale-105">
              <Eye className="h-5 w-5" strokeWidth={2.3} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">OCULIDE</span>
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  NCKH 2026
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">AI Proctoring &amp; Lab LMS</p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:bg-[#141824] dark:text-slate-200 dark:hover:bg-[#1a2030] pr-3 mr-12"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Về trang giới thiệu</span>
          </Link>
        </div>
      </header>

      {/* ── BỐ CỤC CHUẨN XÁC THEO ẢNH 1: BÊN TRÁI NỘI DUNG, BÊN PHẢI CARD ĐĂNG NHẬP ẢNH 2 ── */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          
          {/* ── CỘT TRÁI (7 CỘT): NỀN TẢNG THI & HỌC LẬP TRÌNH (ẢNH 1) ── */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Tag Brand */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>HỆ THỐNG QUẢN LÝ THI &amp; THỰC HÀNH LẬP TRÌNH</span>
            </div>

            {/* Tiêu đề chính lớn */}
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-[42px] lg:leading-[1.18] dark:text-white">
              Nền tảng dạy và học Tin học<br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 bg-clip-text text-transparent">
                cho trường học Việt Nam
              </span>
            </h1>

            {/* Mô tả phụ */}
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 max-w-xl">
              Từ bài tập Scratch, C++ đến lập trình Python nâng cao — một hệ thống bao phủ toàn bộ chương trình thực hành lập trình, chấm test case và giám sát thi trực tuyến bằng AI.
            </p>

            {/* Khung Showcase tính năng Sandbox (như khung card lớn ở Ảnh 1) */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0d1017] transition-all">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5 mb-4">
                <span className="rounded bg-blue-500/10 px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  DOCKER SANDBOX CÔ LẬP
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  C++ 17 • Python 3.11 • Java 21
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Chấm bài thi &amp; bài tập tự động tức thì
              </h3>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Mã nguồn sinh viên tự chạy trong Sandbox cô lập hoàn toàn, so khớp kết quả stdout, kiểm tra giới hạn thời gian (Time Limit) và bộ nhớ (Memory Limit) — kết hợp AI giám sát webcam phát hiện bất thường theo thời gian thực.
              </p>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5 text-xs">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Đạt chuẩn bảo mật IEEE 830-1998
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Thời gian phản hồi &lt; 2s
                </span>
              </div>
            </div>

            {/* Bàn phím ảo Animation mô phỏng gõ code Sandbox tự động */}
            <AnimatedVirtualKeyboard />

            {/* Dải 3 thông số thống kê lớn (như góc dưới của Ảnh 1) */}
            <div className="grid grid-cols-3 gap-4 pt-1">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">7</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Chủ đề NCKH</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">6+</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Ngôn ngữ lập trình</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">100%</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Sandbox cô lập</p>
              </div>
            </div>

            {/* Hàng Tags công nghệ (như thanh tag ở Ảnh 1) */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              {['Python', 'C++', 'Java', 'Docker Sandbox', 'LiveKit WebRTC', 'MediaPipe', 'YOLOv8', 'IEEE 830', 'Ngân hàng câu hỏi'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-slate-200 bg-slate-100/80 px-2.5 py-1 dark:border-white/10 dark:bg-white/5"
                >
                  {tag}
                </span>
              ))}
            </div>

          </div>

          {/* ── CỘT PHẢI (5 CỘT): CARD ĐĂNG NHẬP CHUẨN XÁC NHƯ ẢNH 2 (TỰ MATCH MÀU DARK / LIGHT) ── */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-7 sm:p-9 shadow-xl shadow-slate-200/50 transition-all dark:border-white/10 dark:bg-[#0d1017] dark:shadow-black/60">
              
              {/* Header của Card Đăng nhập (Ảnh 2) */}
              <div className="mb-6 text-left">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  Đăng nhập hệ thống
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400">
                  Sử dụng email do nhà trường cung cấp để tiếp tục
                </p>
              </div>

              {/* Thông báo lỗi nếu có */}
              {errorMessage && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 sm:text-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
              )}

              {/* Thông báo thành công */}
              {successMessage && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400 sm:text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="leading-snug">{successMessage}</span>
                </div>
              )}

              {/* Form Đăng nhập */}
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                
                {/* Input 1: Email hoặc tên đăng nhập */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="login-email" 
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 sm:text-sm"
                  >
                    Email hoặc Tên đăng nhập
                  </label>
                  <input
                    id="login-email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: phamvanlong@dtu.edu.vn hoặc phamvanlong"
                    disabled={isLoading}
                    autoComplete="username"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50 disabled:text-slate-400 dark:border-white/15 dark:bg-[#121622] dark:text-slate-100 dark:placeholder-slate-500"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    * Đăng nhập bằng Email trường hoặc Tên đăng nhập (không sử dụng Mã SV/GV).
                  </p>
                </div>

                {/* Input 2: Mật khẩu (Ảnh 2) */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="login-password" 
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 sm:text-sm"
                  >
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      disabled={isLoading}
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50 disabled:text-slate-400 dark:border-white/15 dark:bg-[#121622] dark:text-slate-100 dark:placeholder-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Link Quên mật khẩu? (Ảnh 2) */}
                  <div className="pt-0.5 text-right">
                    <a 
                      href="/forgot-password" 
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 transition-colors"
                    >
                      Quên mật khẩu?
                    </a>
                  </div>
                </div>

                {/* Nút Đăng nhập màu xanh (Ảnh 2) */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-1 flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer sm:text-base"
                >
                  {isLoading ? (
                    <>
                      <svg className="-ml-1 mr-2 h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Đang đăng nhập...</span>
                    </>
                  ) : (
                    <span>Đăng nhập</span>
                  )}
                </button>

                {/* Khối dải màu xanh thông báo phân quyền (Ảnh 2) */}
                <div className="mt-5 rounded-xl border border-blue-100/90 bg-blue-50/80 p-3.5 text-left dark:border-blue-900/30 dark:bg-blue-950/20">
                  <p className="text-xs font-semibold leading-snug text-blue-600 dark:text-blue-400 sm:text-sm">
                    Hệ thống tự xác định vai trò và quyền.
                  </p>
                  <p className="mt-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">
                    Không hiển thị bộ chọn vai trò.
                  </p>
                </div>

              </form>

            </div>
          </div>

        </div>
      </main>

      {/* ── FOOTER 4 CỘT CHUẨN NCKH ── */}
      <InstitutionalFooter />

    </div>
  );
}


// ── BÀN PHÍM ẢO MINI ANIMATION (NHỎ GỌN TINH TẾ NHƯ MẪU MONTINHOC.VN) ──
function AnimatedVirtualKeyboard() {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const WORDS = [
    'PYTHON',
    'SCRATCH',
    'DOCKER',
    'OCULIDE',
    'SANDBOX',
    'TEST',
  ];

  const KEY_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ];

  useEffect(() => {
    let wordIdx = 0;
    let charIdx = 0;
    let isWaiting = false;
    let timeoutId: NodeJS.Timeout;

    const tick = () => {
      const currentWord = WORDS[wordIdx];

      if (!isWaiting) {
        if (charIdx < currentWord.length) {
          const char = currentWord[charIdx];
          setActiveKey(char);
          charIdx++;
          timeoutId = setTimeout(() => {
            setActiveKey(null);
            timeoutId = setTimeout(tick, 90);
          }, 150);
        } else {
          // Bấm phím SPACE kết thúc từ
          setActiveKey('SPACE');
          isWaiting = true;
          timeoutId = setTimeout(() => {
            setActiveKey(null);
            timeoutId = setTimeout(() => {
              isWaiting = false;
              charIdx = 0;
              wordIdx = (wordIdx + 1) % WORDS.length;
              tick();
            }, 900);
          }, 200);
        }
      }
    };

    timeoutId = setTimeout(tick, 500);
    return () => clearTimeout(timeoutId);
  }, []);

  const handleManualKeyPress = (key: string) => {
    setActiveKey(key);
    setTimeout(() => setActiveKey(null), 200);
  };

  return (
    <div className="w-fit mx-auto my-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 shadow-sm dark:border-white/5 dark:bg-[#0c0f17]/80 backdrop-blur-sm transition-all select-none">
      {/* 3 Hàng phím chữ QWERTY mini */}
      <div className="flex flex-col items-center gap-1">
        {KEY_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center gap-1">
            {row.map((k) => {
              const isPressed = activeKey === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleManualKeyPress(k)}
                  className={`flex h-5 w-5 sm:h-5.5 sm:w-5.5 items-center justify-center rounded-md font-mono text-[9px] font-bold transition-all duration-75 cursor-pointer ${
                    isPressed
                      ? 'bg-white text-slate-950 shadow-[0_0_10px_rgba(255,255,255,0.95)] scale-90 dark:bg-white dark:text-slate-950 ring-1 ring-white/60'
                      : 'border border-slate-200/60 bg-white/90 text-slate-500 shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:bg-white dark:border-white/5 dark:bg-[#161a24] dark:text-slate-400 dark:shadow-[0_1px_0_rgba(0,0,0,0.5)] dark:hover:border-white/15 dark:hover:text-white'
                  }`}
                >
                  {k}
                </button>
              );
            })}
          </div>
        ))}

        {/* Phím Spacebar thu nhỏ */}
        <div className="mt-0.5 flex justify-center">
          <button
            type="button"
            onClick={() => handleManualKeyPress('SPACE')}
            className={`h-4 w-24 sm:w-32 rounded-full border transition-all duration-75 cursor-pointer ${
              activeKey === 'SPACE'
                ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.95)] scale-95 dark:bg-white ring-1 ring-white/60'
                : 'border-slate-200/60 bg-white/80 dark:border-white/5 dark:bg-[#161a24] hover:bg-white dark:hover:border-white/15'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
