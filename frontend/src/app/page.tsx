'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Eye, 
  ArrowRight, 
  Sparkles, 
  Lock, 
  Cpu, 
  Zap, 
  BarChart3,
  Sun,
  Moon
} from 'lucide-react';
import InstitutionalFooter from '@/components/common/InstitutionalFooter';

export default function HomePage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const [codeLines, setCodeLines] = useState<string[]>([]);
  const [aiStatus, setAiStatus] = useState('Đang kiểm tra...');

  const fullCode = [
    '#include <iostream>',
    '#include <vector>',
    'using namespace std;',
    '',
    'int main() {',
    '    vector<int> a = {12, 45, 7, 89, 23};',
    '    int maxVal = a[0];',
    '    for(int x : a) maxVal = max(maxVal, x);',
    '    cout << "Max = " << maxVal;',
    '    return 0;',
    '}'
  ];

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

  useEffect(() => {
    setCodeLines([]);
    setAiStatus('Đang kiểm tra...');
    let idx = 0;
    const timer = setInterval(() => {
      if (idx < fullCode.length) {
        setCodeLines((prev) => [...prev, fullCode[idx]]);
        idx++;
      } else {
        clearInterval(timer);
        setTimeout(() => {
          setAiStatus('Bình thường (Secure)');
        }, 500);
      }
    }, 120);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      
      {/* ── NÚT CHUYỂN ĐEN/TRẮNG ICON NHỎ GÓC PHẢI TRÊN CÙNG ── */}
      {mounted && (
        <div className="fixed top-3.5 right-4 z-50">
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

      {/* ── HEADER THANH ĐIỀU HƯỚNG ── */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-[#090a0f]/80 transition-colors">
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

          {/* Links & Duy nhất 1 nút Đăng nhập màu trắng bo góc */}
          <div className="flex items-center gap-4 sm:gap-6 pr-12">
            <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-300">
              <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Tính năng AI</a>
              <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Docker Sandbox</a>
              <a href="#footer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Bảo mật &amp; Bản quyền</a>
            </nav>

            {/* Nút Đăng nhập trắng -> Chuyển đến URL /login */}
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-white text-slate-900 px-4 text-xs font-bold shadow-md shadow-slate-300/40 border border-slate-200/80 transition-all hover:bg-slate-50 hover:scale-105 active:scale-95 dark:border-white/20 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 cursor-pointer"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO SECTION CỦA LANDING PAGE ── */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              
              {/* Cột trái: Thông tin nền tảng & Nút Đăng nhập */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>ĐẠI HỌC • GIÁM SÁT THI &amp; THỰC HÀNH LẬP TRÌNH AI</span>
                </div>

                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.15] dark:text-white">
                  Nền tảng thi &amp; thực hành <br />
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 bg-clip-text text-transparent">
                    Lập trình Trực tuyến bằng AI
                  </span>
                </h1>

                <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  Sinh viên viết code C++, Java, Python trong môi trường Sandbox cô lập. Trí tuệ Nhân tạo giám sát đa luồng qua Webcam, phát hiện gian lận và so khớp Test Cases tức thì.
                </p>

                {/* Hành động: Nút Đăng nhập trắng nổi bật dẫn tới /login */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-slate-900 px-7 text-sm font-bold shadow-lg shadow-slate-300/40 border border-slate-200/90 transition-all hover:bg-slate-50 hover:scale-105 active:scale-95 dark:border-white/20 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 cursor-pointer"
                  >
                    <span>Đăng nhập hệ thống</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <a
                    href="#features"
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-transparent px-6 text-sm font-semibold text-slate-700 transition-all hover:border-blue-600 hover:text-blue-600 dark:border-white/15 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-400"
                  >
                    Khám phá tính năng
                  </a>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dành cho Giảng viên, Sinh viên và Cán bộ Quản trị Khảo thí.
                </p>
              </div>

              {/* Cột phải: Live Terminal Mockup */}
              <div className="lg:col-span-5">
                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-[#0d1017] text-slate-200 shadow-2xl dark:border-white/10">
                  <div className="flex h-10 items-center justify-between border-b border-white/10 bg-[#141824] px-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                      <span className="ml-2 font-mono text-xs text-slate-400">bai_tap_mang.cpp</span>
                    </div>
                    <span className="rounded bg-blue-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-400">
                      C++ 17 Sandbox
                    </span>
                  </div>

                  <div className="p-4 font-mono text-xs leading-relaxed text-slate-300 min-h-[180px]">
                    {codeLines.map((line, idx) => (
                      <p key={idx} className="whitespace-pre">
                        {line}
                      </p>
                    ))}
                  </div>

                  <div className="border-t border-white/10 bg-[#121620] p-4 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2.5">
                      <div className="flex items-center gap-2 font-bold text-slate-200">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                        </span>
                        <span>AI Giám Sát Thời Gian Thực (LiveKit SFU)</span>
                      </div>
                      <span className="font-bold text-emerald-400">{aiStatus}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] mb-2.5">
                      <div className="rounded-lg bg-white/5 p-2 border border-white/5">
                        <span className="block text-slate-400 text-[10px]">Khuôn mặt webcam:</span>
                        <span className="font-bold text-emerald-400">1 người (Hợp lệ)</span>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2 border border-white/5">
                        <span className="block text-slate-400 text-[10px]">Màn hình thi:</span>
                        <span className="font-bold text-sky-400">Khóa Toàn màn hình</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                      <span>✓ Khớp kết quả mong đợi • 4/4 Test Cases</span>
                      <span>10.0 / 10.0 điểm</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── STATS BAR ── */}
        <section className="border-y border-slate-200/80 bg-slate-50 py-10 dark:border-white/10 dark:bg-[#0d1017] transition-colors">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
              <div>
                <p className="text-3xl font-black text-slate-900 dark:text-white">4+</p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Ngôn ngữ chấm tự động</p>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 dark:text-white">100%</p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Docker Sandbox cô lập</p>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 dark:text-white">&lt; 2s</p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Phát hiện bất thường qua AI</p>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 dark:text-white">2 Role</p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Phân quyền Giảng viên &amp; Admin</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── BENTO GRID FEATURES ── */}
        <section id="features" className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Một hệ thống, trọn vẹn quy trình kiểm tra lập trình
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Từ tạo phòng thực hành, chấm code tự động đến giám sát thi chống gian lận đa luồng.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0d1017] transition-all hover:-translate-y-1 hover:border-blue-500">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Khóa Màn Hình &amp; Đổi Tab</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tự động phát hiện khi sinh viên mở tab khác, chặn phím tắt copy/paste mã nguồn từ ngoài vào.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0d1017] transition-all hover:-translate-y-1 hover:border-blue-500">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                  <Cpu className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">MediaPipe &amp; YOLOv8 AI</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Nhận diện góc mặt, phát hiện điện thoại hoặc người lạ xuất hiện trong khung hình thi webcam.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0d1017] transition-all hover:-translate-y-1 hover:border-blue-500">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Chấm Test Cases Tức Thì</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  So khớp kết quả stdout, kiểm tra giới hạn thời gian (Time Limit) và bộ nhớ (Memory Limit).
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0d1017] transition-all hover:-translate-y-1 hover:border-blue-500">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Live Dashboard Giảng Viên</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Xem luồng webcam cả lớp theo lưới, nhận cờ cảnh báo tức thời để can thiệp kịp thời.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER 4 CỘT CHUẨN NCKH ── */}
      <InstitutionalFooter />

    </div>
  );
}
