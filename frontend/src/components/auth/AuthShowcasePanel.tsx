'use client';

import React from 'react';
import { CheckCircle2, GraduationCap, ShieldCheck, Terminal, BookOpen } from 'lucide-react';

export default function AuthShowcasePanel() {
  return (
    <div className="space-y-6 text-left">
      {/* Tag Academic Standard */}
      <div className="inline-flex items-center gap-2 rounded border border-brand-300 bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
        <GraduationCap className="h-3.5 w-3.5" />
        <span>HỆ THỐNG KHẢO THÍ &amp; THỰC HÀNH LẬP TRÌNH ĐẠI HỌC</span>
      </div>

      {/* Tiêu đề chính */}
      <h1 className="text-3xl font-serif font-bold tracking-tight text-[#2A282D] sm:text-4xl lg:text-[40px] lg:leading-tight dark:text-white">
        Nền tảng kiểm tra &amp; đánh giá <br />
        <span className="text-brand-600 dark:text-brand-200">
          Năng lực Lập trình Trực tuyến
        </span>
      </h1>

      {/* Mô tả phụ */}
      <p className="text-sm leading-relaxed text-[#5a565e] dark:text-[#b0a7aa] max-w-xl">
        Cung cấp môi trường thực hành thuật toán, phòng thi cách ly Sandbox và cơ chế giám sát tự động ứng dụng Trí tuệ Nhân tạo cho sinh viên và giảng viên đại học.
      </p>

      {/* Khung Showcase tiêu chuẩn Sandbox */}
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
          Mã nguồn sinh viên được biên dịch và chạy thử nghiệm trong các container Docker cô lập hoàn toàn tài nguyên, kiểm tra giới hạn thời gian (Time Limit), bộ nhớ (Memory Limit) và đối soát với bộ test case ẩn.
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

      {/* Thông số học thuật */}
      <div className="grid grid-cols-3 gap-4 pt-1 border-t border-slate-300 dark:border-white/10">
        <div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#2A282D] dark:text-white">7</p>
          <p className="text-xs text-slate-500 dark:text-[#a59fa3] font-medium mt-0.5">Chủ đề NCKH</p>
        </div>
        <div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#2A282D] dark:text-white">6+</p>
          <p className="text-xs text-slate-500 dark:text-[#a59fa3] font-medium mt-0.5">Ngôn ngữ lập trình</p>
        </div>
        <div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#2A282D] dark:text-white">100%</p>
          <p className="text-xs text-slate-500 dark:text-[#a59fa3] font-medium mt-0.5">Sandbox cô lập</p>
        </div>
      </div>

      {/* Dải Tags tiêu chuẩn */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold text-[#5a565e] dark:text-[#b0a7aa]">
        {['Python 3.11', 'C++ 17 (GCC)', 'Java 21', 'Docker Sandbox', 'WebRTC SFU', 'MediaPipe', 'YOLOv8', 'IEEE 830'].map((tag) => (
          <span
            key={tag}
            className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1 dark:border-white/10 dark:bg-neutral-900"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
