'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileText, Loader2, Play } from 'lucide-react';

const CODE_LINES = [
  '// Thuật toán: Tìm giá trị lớn thứ hai (O(n), C++17)',
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
  '        if (x > first) {',
  '            second = first;',
  '            first = x;',
  '        } else if (x > second && x < first) {',
  '            second = x;',
  '        }',
  '    }',
  '    return (second == numeric_limits<int>::min()) ? -1 : second;',
  '}',
  '',
  'int main() {',
  '    vector<int> nums = {12, 35, 1, 10, 34, 1};',
  '    cout << findSecondLargest(nums) << endl;',
  '    return 0;',
  '}',
];

const PRELOADED_START_LINE = 7; // Hiển thị sẵn 7 dòng khai báo đầu hàm
const LINE_HEIGHT_PX = 18;
const VIEWPORT_HEIGHT_PX = 236;

const TESTCASES = [
  { label: 'Testcase #1', time: '12ms' },
  { label: 'Testcase #2', time: '15ms' },
  { label: 'Testcase #3', time: '14ms' },
];

type SimPhase = 'typing' | 'running' | 'result';

function renderHighlightedLine(line: string) {
  const trimmed = line.trim();
  if (trimmed.startsWith('//')) {
    return <span className="text-slate-400 dark:text-slate-500 italic">{line}</span>;
  }
  if (trimmed.startsWith('#include')) {
    return <span className="text-brand-700 dark:text-rose-300">{line}</span>;
  }
  if (
    trimmed.startsWith('using ') ||
    trimmed.startsWith('return ') ||
    trimmed.startsWith('if ') ||
    trimmed.startsWith('} else') ||
    trimmed.startsWith('for ')
  ) {
    return <span className="text-indigo-700 dark:text-indigo-300">{line}</span>;
  }
  if (trimmed.startsWith('int ') || trimmed.startsWith('vector<') || trimmed.startsWith('cout ')) {
    return <span className="text-sky-700 dark:text-sky-300">{line}</span>;
  }
  return <span>{line}</span>;
}

export default function HeroInteractivePreview() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [phase, setPhase] = useState<SimPhase>('typing');
  const [lineIndex, setLineIndex] = useState(PRELOADED_START_LINE);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setPhase('result');
      setLineIndex(CODE_LINES.length - 1);
      setCharIndex(CODE_LINES[CODE_LINES.length - 1].length);
      return;
    }

    let cancelled = false;
    let timerId: number | null = null;

    const schedule = (fn: () => void, ms: number) => {
      if (timerId !== null) window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };

    const stepTyping = (curLine: number, curChar: number) => {
      if (cancelled) return;
      const lineText = CODE_LINES[curLine] ?? '';

      if (curChar < lineText.length) {
        // Gõ cụm 3 ký tự mỗi tick 16ms (~60fps) để nhanh & mượt
        const nextChar = Math.min(lineText.length, curChar + 3);
        setLineIndex(curLine);
        setCharIndex(nextChar);
        schedule(() => stepTyping(curLine, nextChar), 16);
        return;
      }

      if (curLine < CODE_LINES.length - 1) {
        const nextLine = curLine + 1;
        setLineIndex(nextLine);
        setCharIndex(0);
        schedule(() => stepTyping(nextLine, 0), 45);
        return;
      }

      // Gõ xong dòng cuối -> chờ 200ms -> chạy Docker Sandbox (700ms) -> kết quả (1500ms) -> reset (300ms)
      schedule(() => {
        setPhase('running');
        schedule(() => {
          setPhase('result');
          schedule(() => {
            setPhase('typing');
            setLineIndex(PRELOADED_START_LINE);
            setCharIndex(0);
            schedule(() => stepTyping(PRELOADED_START_LINE, 0), 300);
          }, 1500);
        }, 700);
      }, 200);
    };

    setPhase('typing');
    setLineIndex(PRELOADED_START_LINE);
    setCharIndex(0);
    stepTyping(PRELOADED_START_LINE, 0);

    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [prefersReducedMotion]);

  const visibleLines = prefersReducedMotion
    ? CODE_LINES
    : CODE_LINES.slice(0, lineIndex + 1).map((line, idx) =>
        idx === lineIndex ? line.slice(0, charIndex) : line
      );

  // Tính toán độ dịch chuyển translateY (150ms ease-out) để bám sát dòng đang gõ
  const cursorBottomPx = (lineIndex + 1) * LINE_HEIGHT_PX + 14;
  const thresholdPx = VIEWPORT_HEIGHT_PX * 0.7;
  const scrollOffsetPx =
    prefersReducedMotion
      ? Math.max(0, CODE_LINES.length * LINE_HEIGHT_PX + 28 - VIEWPORT_HEIGHT_PX)
      : cursorBottomPx > thresholdPx
      ? cursorBottomPx - thresholdPx
      : 0;

  return (
    <div className="lg:col-span-5">
      <div className="rounded border border-slate-300 bg-slate-50 text-slate-800 shadow-xs overflow-hidden dark:border-white/10 dark:bg-[#1c1820] dark:text-slate-200">
        {/* Thanh tiêu đề bản in mã nguồn */}
        <div className="flex h-9 items-center justify-between border-b border-slate-300 bg-[#f0ebed] px-3 dark:border-white/10 dark:bg-[#25202b]">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 shrink-0 text-brand-600 dark:text-[#deb5c0]" />
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              bai_kiem_tra_thuat_toan.cpp
            </span>
          </div>
          <span className="shrink-0 rounded border border-brand-300 bg-brand-50 px-2 py-0.5 font-mono text-[10px] font-bold text-brand-700 dark:border-[#deb5c0]/30 dark:bg-[#deb5c0]/10 dark:text-[#deb5c0]">
            G++ 17 Sandbox
          </span>
        </div>

        {/* Khung mã nguồn chiều cao cố định, ẩn scrollbar, cuộn 150ms ease-out theo con trỏ */}
        <div
          style={{ height: `${VIEWPORT_HEIGHT_PX}px` }}
          className="overflow-hidden p-3.5 font-mono text-[11px] leading-[18px] text-slate-700 dark:text-slate-300"
        >
          <div
            style={{ transform: `translateY(-${scrollOffsetPx}px)` }}
            className="transition-transform duration-150 ease-out will-change-transform"
          >
            {visibleLines.map((line, idx) => {
              const isActiveLine = !prefersReducedMotion && phase === 'typing' && idx === lineIndex;
              return (
                <div
                  key={idx}
                  className={`flex ${isActiveLine ? 'bg-brand-50/50 dark:bg-white/[0.03] rounded-xs' : ''}`}
                >
                  <span className="w-6 select-none text-right pr-2 text-slate-400 dark:text-slate-600 font-mono text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="whitespace-pre">
                    {renderHighlightedLine(line)}
                    {isActiveLine && (
                      <span className="inline-block w-1.5 h-3.5 align-middle ml-0.5 bg-brand-700 dark:bg-rose-300 animate-pulse" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Thanh Run & Verify */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-[#19151c]">
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
            Docker Isolated Runner
          </span>
          <div
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[11px] font-bold transition-colors duration-150 ${
              phase === 'running'
                ? 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30'
                : phase === 'result'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
                : 'bg-brand-700 text-white border border-brand-700'
            }`}
          >
            {phase === 'running' ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Đang chạy trên Docker Sandbox...</span>
              </>
            ) : phase === 'result' ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                <span>Run &amp; Verify</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3 fill-current" />
                <span>Run &amp; Verify</span>
              </>
            )}
          </div>
        </div>

        {/* Panel kết quả Testcase trượt mượt */}
        <div
          className={`grid transition-all duration-200 ease-out ${
            phase === 'result' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-[11px] dark:border-emerald-500/20 dark:bg-emerald-950/20 space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                {TESTCASES.map((tc) => (
                  <div
                    key={tc.label}
                    className="rounded border border-emerald-200 bg-white px-2 py-1 text-emerald-800 dark:border-emerald-500/30 dark:bg-neutral-900 dark:text-emerald-300"
                  >
                    {tc.label}: Passed ({tc.time})
                  </div>
                ))}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-2.5 py-1 font-mono text-[10px] font-bold text-white">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>Accepted • 100/100 điểm • Docker Sandbox Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bảng đối chiếu AI Proctoring (Giữ cố định vị trí & thông số) */}
        <div className="border-t border-slate-300 bg-[#ffffff] p-3 text-xs dark:border-white/10 dark:bg-[#161318]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-300 dark:border-white/10 mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              AI Proctoring (LiveKit SFU):
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-[#deb5c0]">
              <span
                className={`h-2 w-2 rounded-full bg-emerald-500 ${
                  prefersReducedMotion ? '' : 'animate-pulse'
                }`}
              />
              <span>Trực tuyến • Hợp lệ</span>
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

          <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Khuôn mặt: Khớp 99.8%
            </span>
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Chuyển tab: 0 lần
            </span>
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Audio: Bình thường
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
