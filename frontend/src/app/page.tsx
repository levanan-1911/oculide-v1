'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Lock,
  Cpu,
  Zap,
  BarChart3,
  Sun,
  Moon,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
  FileText
} from 'lucide-react';
import InstitutionalFooter from '@/components/common/InstitutionalFooter';
import BrandLogo from '@/components/common/BrandLogo';

export default function HomePage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [mounted, setMounted] = useState(false);

  const staticCode = [
    '// Thuật toán: Tìm giá trị lớn thứ hai trong dãy số nguyên (Chuẩn C++17)',
    '#include <iostream>',
    '#include <vector>',
    '#include <limits>',
    'using namespace std;',
    '',
    'int findSecondLargest(const vector<int>& a) {',
    '    if (a.size() < 2) return -1;',
    '    int first = numeric_limits<int>::min();',
    '    int second = numeric_limits<int>::min();',
    '    for (int x : a) {',
    '        if (x > first) { second = first; first = x; }',
    '        else if (x > second && x < first) { second = x; }',
    '    }',
    '    return (second == numeric_limits<int>::min()) ? -1 : second;',
    '}',
    '',
    'int main() {',
    '    ios_base::sync_with_stdio(false);',
    '    cin.tie(NULL);',
    '    // Khởi tạo và chấm tự động qua Docker Sandbox',
    '    return 0;',
    '}'
  ];

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('oculide_theme') as 'dark' | 'light' | null;
    const initial = saved || 'light';
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-neutral-950 dark:text-[#f5f3f4] font-sans">

      {/* ── NÚT CHUYỂN LIGHT / DARK MODE CỔ ĐIỂN ── */}
      {mounted && (
        <div className="fixed top-3.5 right-4 z-50">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 shadow-xs hover:bg-[#eae4e6] dark:border-white/15 dark:bg-[#1c1820] dark:text-amber-400 dark:hover:bg-[#25202b] cursor-pointer"
            aria-label="Chuyển đổi giao diện Sáng / Tối"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-800" />
            )}
          </button>
        </div>
      )}

      {/* ── HEADER CỔ ĐIỂN: PHONG CÁCH CỔNG HỌC THUẬT ĐẠI HỌC ── */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-300 bg-[#ffffff]/95 dark:border-white/10 dark:bg-[#161318]/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo size={50} className="h-[50px] w-[50px] shrink-0 rounded-md object-cover shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded border border-brand-300 bg-brand-50 px-1.5 py-0.2 text-[10px] font-semibold text-brand-700 dark:border-[#deb5c0]/30 dark:bg-[#deb5c0]/10 dark:text-[#deb5c0]">
                  NCKH 2026
                </span>
              </div>
              <p className="text-[11px] font-serif text-[#716b70] dark:text-slate-400">
                Hệ Thống Khảo Thí &amp; Đánh Giá Năng Lực Lập Trình
              </p>
            </div>
          </Link>

          {/* Điều hướng trang nhã & Nút Đăng nhập */}
          <div className="flex items-center gap-6 pr-12">
            <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-700 dark:text-slate-300">
              <a href="#features" className="hover:text-brand-700 dark:hover:text-[#deb5c0]">Cấu trúc nghiệp vụ</a>
              <a href="#standards" className="hover:text-brand-700 dark:hover:text-[#deb5c0]">Quy chuẩn học thuật</a>
              <a href="#footer" className="hover:text-brand-700 dark:hover:text-[#deb5c0]">Đặc tả kỹ thuật</a>
            </nav>

            <Link
              href="/login"
              className="system-primary-action inline-flex h-9 items-center justify-center rounded border border-slate-900 bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-[#461c29] cursor-pointer"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO SECTION: PHONG CÁCH CỔ ĐIỂN (CLASSIC ACADEMIC) ── */}
        <section className="border-b border-slate-300 bg-white pt-12 pb-14 sm:pt-16 sm:pb-20 dark:border-white/10 dark:bg-[#161318]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-start">

              {/* Cột trái: Văn bản trang trọng, học thuật */}
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 border border-brand-300 bg-brand-50 px-3 py-1 text-[11px] font-medium text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-[#deb5c0]">
                  <GraduationCap className="h-3.5 w-3.5 text-brand-600 dark:text-[#deb5c0]" />
                  <span>TRƯỜNG ĐẠI HỌC • HỆ THỐNG KHẢO THÍ VÀ THỰC HÀNH LẬP TRÌNH</span>
                </div>

                <h1 className="font-serif text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[42px] lg:leading-[1.25] dark:text-white">
                  Đánh giá năng lực thuật toán &amp; <br />
                  <span className="text-brand-600 dark:text-[#deb5c0]">
                    Giám sát tính toàn vẹn học thuật trực tuyến
                  </span>
                </h1>

                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 max-w-2xl font-serif">
                  Môi trường làm bài độc lập trên nền tảng Docker Sandbox cô lập tài nguyên cho C++, Java và Python. Hỗ trợ thị giác máy tính giám sát tính toàn vẹn theo thời gian thực và chấm điểm tự động đối soát test case theo chuẩn đặc tả phần mềm IEEE 830-1998.
                </p>

                {/* Các nút hành động */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href="/login"
                    className="system-primary-action inline-flex h-10 items-center justify-center gap-2 rounded border border-slate-900 bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-[#461c29] cursor-pointer"
                  >
                    <span>Truy cập phòng thi</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <a
                    href="#features"
                    className="inline-flex h-10 items-center justify-center rounded border border-slate-300 bg-slate-50 px-4 text-xs font-semibold text-slate-800 hover:bg-[#eae4e6] dark:border-white/15 dark:bg-[#1c1820] dark:text-slate-200 dark:hover:bg-[#25202b]"
                  >
                    Đặc tả chức năng
                  </a>
                </div>

                <div className="flex items-center gap-6 pt-3 text-xs text-slate-600 dark:text-slate-400 font-serif">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-[#deb5c0]" />
                    Chấm I/O đối chiếu tức thời
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-[#deb5c0]" />
                    Kiểm soát chuyển tab và dán mã nguồn
                  </span>
                </div>
              </div>

              {/* Cột phải: Bản in mã nguồn tĩnh cổ điển (Không animation chuyển động) */}
              <div className="lg:col-span-5">
                <div className="rounded border border-slate-300 bg-slate-50 text-slate-800 shadow-xs dark:border-white/10 dark:bg-[#1c1820] dark:text-slate-200">
                  {/* Thanh tiêu đề bản in mã nguồn */}
                  <div className="flex h-9 items-center justify-between border-b border-slate-300 bg-[#f0ebed] px-3 dark:border-white/10 dark:bg-[#25202b]">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-brand-600 dark:text-[#deb5c0]" />
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        bai_kiem_tra_thuat_toan.cpp
                      </span>
                    </div>
                    <span className="rounded border border-brand-300 bg-brand-50 px-2 py-0.5 font-mono text-[10px] font-bold text-brand-700 dark:border-[#deb5c0]/30 dark:bg-[#deb5c0]/10 dark:text-[#deb5c0]">
                      G++ 17 Sandbox
                    </span>
                  </div>

                  {/* Khung mã nguồn tĩnh */}
                  <div className="p-3.5 font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 max-h-[220px] overflow-y-auto">
                    {staticCode.map((line, idx) => (
                      <div key={idx} className="flex">
                        <span className="w-6 select-none text-right pr-2 text-slate-400 dark:text-slate-600 font-mono text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="whitespace-pre">{line}</span>
                      </div>
                    ))}
                  </div>

                  {/* Bảng đối chiếu kết quả khảo thí */}
                  <div className="border-t border-slate-300 bg-[#ffffff] p-3 text-xs dark:border-white/10 dark:bg-[#161318]">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-300 dark:border-white/10 mb-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        AI Proctoring (LiveKit SFU):
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-[#deb5c0]">
                        Trực tuyến • Hợp lệ
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-serif">
                      <div className="rounded border border-slate-300 bg-slate-50 p-1.5 dark:border-white/10 dark:bg-[#1c1820]">
                        <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Thí sinh:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">1 người trước webcam</span>
                      </div>
                      <div className="rounded border border-slate-300 bg-slate-50 p-1.5 dark:border-white/10 dark:bg-[#1c1820]">
                        <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Màn hình:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Đã khóa toàn màn hình</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── BẢNG THÔNG SỐ KHẢO THÍ: 4 CỘT VUÔNG VẮN, CÂN ĐỐI ── */}
        <section className="border-b border-slate-300 bg-slate-50 py-8 dark:border-white/10 dark:bg-neutral-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
              <div className="border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-[#1c1820]">
                <p className="font-serif text-3xl font-bold text-brand-700 dark:text-[#deb5c0]">4</p>
                <p className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-200">Ngôn ngữ lập trình</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">C++, C, Java, Python</p>
              </div>
              <div className="border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-[#1c1820]">
                <p className="font-serif text-3xl font-bold text-brand-700 dark:text-[#deb5c0]">100%</p>
                <p className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-200">Sandbox Docker cô lập</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Cách ly hoàn toàn tài nguyên</p>
              </div>
              <div className="border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-[#1c1820]">
                <p className="font-serif text-3xl font-bold text-brand-700 dark:text-[#deb5c0]">&lt; 2s</p>
                <p className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-200">Chấm test case tự động</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Giới hạn thời gian &amp; bộ nhớ</p>
              </div>
              <div className="border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-[#1c1820]">
                <p className="font-serif text-3xl font-bold text-brand-700 dark:text-[#deb5c0]">3</p>
                <p className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-200">Phân quyền học thuật</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Sinh viên, Giảng viên, Admin</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CẤU TRÚC CHỨC NĂNG: 4 KHỐI HỌC THUẬT CÂN ĐỐI ── */}
        <section id="features" className="py-14 sm:py-18 bg-white dark:bg-[#161318]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-10">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-[#deb5c0]">
                KIẾN TRÚC NGHIỆP VỤ KHẢO THÍ
              </span>
              <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Bốn trụ cột đánh giá và giám sát học thuật
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-serif">
                Thiết kế theo chuẩn kiểm định chất lượng đào tạo đại học, bảo đảm tính công bằng và nghiêm túc.
              </p>
            </div>

            {/* 4 Cards vuông vắn, có cùng chiều cao, 1px border */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 items-stretch">

              {/* Box 1 */}
              <div className="flex flex-col justify-between border border-slate-300 bg-slate-50 p-5 dark:border-white/10 dark:bg-[#1c1820]">
                <div>
                  <div className="mb-3 flex h-9 w-9 items-center justify-center border border-brand-300 bg-brand-50 text-brand-700 dark:border-[#deb5c0]/30 dark:bg-[#deb5c0]/10 dark:text-[#deb5c0]">
                    <Lock className="h-4 w-4" />
                  </div>
                  <h3 className="font-serif text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Kiểm Soát Phòng Thi &amp; Cửa Sổ
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-serif">
                    Chặn rời khỏi cửa sổ thi, kiểm soát chế độ toàn màn hình và vô hiệu hóa thao tác dán mã nguồn từ bên ngoài.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-300 dark:border-white/10 text-[11px] font-semibold text-brand-700 dark:text-[#deb5c0]">
                  Ngăn chặn gian lận quy chế →
                </div>
              </div>

              {/* Box 2 */}
              <div className="flex flex-col justify-between border border-slate-300 bg-slate-50 p-5 dark:border-white/10 dark:bg-[#1c1820]">
                <div>
                  <div className="mb-3 flex h-9 w-9 items-center justify-center border border-brand-300 bg-brand-50 text-brand-700 dark:border-[#deb5c0]/30 dark:bg-[#deb5c0]/10 dark:text-[#deb5c0]">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <h3 className="font-serif text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Hỗ Trợ Giám Sát Thị Giác Máy Tính
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-serif">
                    Nhận diện hướng nhìn và phát hiện thiết bị di động trong khung hình. AI chỉ tạo cờ gợi ý; giảng viên giữ quyền phán quyết cuối cùng.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-300 dark:border-white/10 text-[11px] font-semibold text-brand-700 dark:text-[#deb5c0]">
                  Hỗ trợ quyết định giám thị →
                </div>
              </div>

              {/* Box 3 */}
              <div className="flex flex-col justify-between border border-slate-300 bg-slate-50 p-5 dark:border-white/10 dark:bg-[#1c1820]">
                <div>
                  <div className="mb-3 flex h-9 w-9 items-center justify-center border border-brand-300 bg-brand-50 text-brand-700 dark:border-[#deb5c0]/30 dark:bg-[#deb5c0]/10 dark:text-[#deb5c0]">
                    <Zap className="h-4 w-4" />
                  </div>
                  <h3 className="font-serif text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Docker Sandbox Chấm Tự Động
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-serif">
                    Biên dịch và chạy mã nguồn trong môi trường cô lập, đối chiếu với bộ test case chuẩn và kiểm soát giới hạn tài nguyên máy chủ.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-300 dark:border-white/10 text-[11px] font-semibold text-brand-700 dark:text-[#deb5c0]">
                  Cách ly hoàn toàn runtime →
                </div>
              </div>

              {/* Box 4 */}
              <div className="flex flex-col justify-between border border-slate-300 bg-slate-50 p-5 dark:border-white/10 dark:bg-[#1c1820]">
                <div>
                  <div className="mb-3 flex h-9 w-9 items-center justify-center border border-brand-300 bg-brand-50 text-brand-700 dark:border-[#deb5c0]/30 dark:bg-[#deb5c0]/10 dark:text-[#deb5c0]">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <h3 className="font-serif text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Bảng Điều Khiển Khảo Thí Trực Tiếp
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-serif">
                    Màn hình tập trung theo dõi điểm danh, tiến độ nộp bài, thời gian làm bài còn lại và thẩm định cảnh báo theo phiên kiểm tra.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-300 dark:border-white/10 text-[11px] font-semibold text-brand-700 dark:text-[#deb5c0]">
                  Quản lý ca thi tập trung →
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── QUY CHUẨN ĐẶC TẢ HỌC THUẬT (IEEE 830-1998) ── */}
        <section id="standards" className="border-t border-slate-300 bg-slate-50 py-12 dark:border-white/10 dark:bg-neutral-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="border border-slate-300 bg-white p-6 sm:p-8 dark:border-white/10 dark:bg-[#1c1820]">
              <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-8 space-y-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-[#deb5c0]">
                    TIÊU CHUẨN PHẦN MỀM HỌC THUẬT
                  </span>
                  <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white">
                    Tuân thủ Đặc tả Yêu cầu Phần mềm IEEE 830-1998
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-serif">
                    Được phát triển phục vụ công tác đào tạo và nghiên cứu khoa học, đáp ứng yêu cầu về bảo mật phân quyền, nhật ký kiểm toán, bảo vệ quyền riêng tư hình ảnh học viên và tính khả chuyển độc lập trình duyệt.
                  </p>
                  <div className="flex flex-wrap gap-4 pt-1 text-xs font-serif text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-[#deb5c0]" />
                      Bảo vệ dữ liệu người học
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-[#deb5c0]" />
                      Nhật ký kiểm toán lưu vết
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-4 flex flex-col justify-center items-start lg:items-end gap-2">
                  <Link
                    href="/login"
                    className="system-primary-action inline-flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded border border-slate-900 bg-slate-900 px-6 text-xs font-semibold text-white hover:bg-[#461c29] cursor-pointer"
                  >
                    <span>Vào cổng thi trực tuyến</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-serif">
                    Dành cho Sinh viên và Giảng viên
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER HỌC THUẬT ── */}
      <InstitutionalFooter />

    </div>
  );
}
