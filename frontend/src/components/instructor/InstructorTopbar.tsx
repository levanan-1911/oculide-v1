'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  Search,
  GraduationCap,
  AlertTriangle,
  Video,
  Clock,
  ShieldAlert,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import { useMonitoring } from './monitoring/MonitoringContext';
import { INSTRUCTOR_ROOMS_STORAGE_KEY, RoomSession } from '@/components/instructor/classes/types';

interface InstructorTopbarProps {
  title?: string;
}

export default function InstructorTopbar({
  title = 'Không gian Giảng viên',
}: InstructorTopbarProps) {
  const [initials, setInitials] = useState('GV');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { violations, reviewViolation } = useMonitoring();
  const [activeRunningRoom, setActiveRunningRoom] = useState<{ roomCode: string; remainingMinutes: number } | null>(null);

  useEffect(() => {
    function checkActiveRoom() {
      try {
        const raw = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
        if (raw) {
          const rooms: RoomSession[] = JSON.parse(raw);
          const running = rooms.find((r) => r.status === 'in_progress');
          if (running) {
            setActiveRunningRoom({
              roomCode: running.id,
              remainingMinutes: running.durationMinutes || 60,
            });
            return;
          }
        }
      } catch {
        // ignore
      }
      setActiveRunningRoom(null);
    }

    checkActiveRoom();
    window.addEventListener('storage', checkActiveRoom);
    const interval = setInterval(checkActiveRoom, 2500);
    return () => {
      window.removeEventListener('storage', checkActiveRoom);
      clearInterval(interval);
    };
  }, []);

  const pendingViolations = violations.filter((v) => v.status === 'pending');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = parsed.name || parsed.username || 'Giảng viên';
        const init = name
          .split(' ')
          .filter(Boolean)
          .slice(-2)
          .map((w: string) => w[0]?.toUpperCase())
          .join('') || 'GV';
        setInitials(init);
      }
    } catch {
      // ignore
    }

    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex h-[68px] w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-6 lg:px-8 relative z-30">
      {/* Tiêu đề bên trái & Tag trạng thái phiên đang giám sát */}
      <div className="flex items-center gap-3">
        <h1 className="text-[17px] font-bold tracking-tight text-slate-900">
          {title}
        </h1>

        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
          <GraduationCap className="h-3.5 w-3.5" />
          Giảng viên
        </span>

        {/* Tag chỉ báo phiên giám sát trực tiếp khi có phòng đang thực sự mở */}
        {activeRunningRoom && (
          <Link
            href={`/instructor/monitoring?room=${encodeURIComponent(activeRunningRoom.roomCode)}`}
            className="hidden md:inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition"
            title="Bấm để vào trực tiếp phòng giám sát LiveKit"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Đang giám sát:</span>
            <span className="font-mono text-emerald-900">{activeRunningRoom.roomCode}</span>
            <span className="text-[11px] font-medium text-emerald-600">({activeRunningRoom.remainingMinutes}p)</span>
          </Link>
        )}
      </div>

      {/* Cụm tìm kiếm + thông báo + avatar bên phải */}
      <div className="flex items-center gap-3">
        <div className="relative hidden lg:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm lớp học, bài lab, đề thi..."
            className="h-9 w-[240px] xl:w-[280px] rounded-full border border-slate-200/70 bg-[#f4f7f9] pl-9 pr-4 text-xs text-slate-700 placeholder-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Chuông thông báo & Dropdown thông báo vi phạm */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            aria-label="Thông báo vi phạm AI"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb] transition-colors hover:bg-blue-100/80 cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {pendingViolations.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white ring-2 ring-white animate-bounce">
                {pendingViolations.length}
              </span>
            )}
          </button>

          {/* Panel danh sách cảnh báo vi phạm */}
          {isNotifOpen && (
            <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-3xl border border-slate-200/90 bg-white p-4 shadow-2xl shadow-slate-900/10">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Cảnh báo vi phạm phòng thi
                  </h3>
                </div>
                <Link
                  href="/instructor/monitoring"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Màn hình giám sát</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {violations.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
                    <p className="mt-2 font-bold text-slate-700">Không có vi phạm nào</p>
                  </div>
                ) : (
                  violations.slice(0, 5).map((v) => (
                    <div
                      key={v.id}
                      className={`rounded-2xl border p-3 text-xs space-y-1.5 transition ${
                        v.status === 'pending'
                          ? 'border-red-200 bg-red-50/50'
                          : 'border-slate-100 bg-slate-50 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900 truncate">
                          {v.studentName} ({v.studentId})
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          {v.timestamp}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {v.type}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                        <span className="text-[10px] text-slate-500 font-mono">
                          Phòng: {v.roomCode}
                        </span>
                        {v.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => reviewViolation(v.id, 'record')}
                            className="rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-700 cursor-pointer"
                          >
                            Lập biên bản
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500">
                            {v.status === 'recorded' ? '✓ Đã lập biên bản' : 'Đã bỏ qua'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar Giảng viên */}
        <Link
          href="/instructor/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm hover:opacity-90 transition"
          title="Xem hồ sơ Giảng viên"
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}
