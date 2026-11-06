'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export default function AuthShowcasePanel() {
  return (
    <div className="space-y-6">
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

      {/* Khung Showcase tính năng Sandbox */}
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

      {/* Dải 3 thông số thống kê lớn */}
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

      {/* Hàng Tags công nghệ */}
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
  );
}

// ── BÀN PHÍM ẢO MINI ANIMATION ──
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
    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-[#0c0e14]/60">
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Bàn phím giả lập gõ lệnh Sandbox
        </span>
        <span className="text-[11px] font-mono text-slate-400">Autotyping: ON</span>
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        {KEY_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center gap-1 sm:gap-1.5">
            {row.map((k) => {
              const isActive = activeKey === k;
              return (
                <button
                  type="button"
                  key={k}
                  onClick={() => handleManualKeyPress(k)}
                  className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-[10px] sm:text-xs font-mono font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/50 scale-110 -translate-y-0.5'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-400 dark:border-white/10 dark:bg-[#141824] dark:text-slate-300'
                  }`}
                >
                  {k}
                </button>
              );
            })}
          </div>
        ))}

        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => handleManualKeyPress('SPACE')}
            className={`h-6 sm:h-7 w-48 sm:w-60 rounded-md text-[10px] font-mono font-semibold tracking-wider transition-all ${
              activeKey === 'SPACE'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/50 scale-105'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-blue-400 dark:border-white/10 dark:bg-[#141824] dark:text-slate-400'
            }`}
          >
            SPACE
          </button>
        </div>
      </div>
    </div>
  );
}
