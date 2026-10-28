'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ShieldAlert,
  Video,
  X,
  Send,
  CheckCircle2,
  Bell,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useMonitoring } from './MonitoringContext';
import SendNotificationModal from './SendNotificationModal';

export default function InstructorGlobalAlerts() {
  const {
    activeToast,
    dismissToast,
    reviewViolation,
    sendAnnouncement,
    toastNotice,
    clearToastNotice,
  } = useMonitoring();

  const [targetedModalStudent, setTargetedModalStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <>
      {/* ── 1. CẢNH BÁO VI PHẠM AI NỔI BẬT TRÊN MỌI MÀN HÌNH (High-Priority AI Violation Toast) ── */}
      {activeToast && (
        <div className="fixed top-4 right-4 z-50 w-full max-w-md animate-in slide-in-from-top-4 duration-300">
          <div className="rounded-3xl border-2 border-red-500 bg-white p-5 shadow-2xl shadow-red-500/20 ring-4 ring-red-500/10">
            {/* Header thông báo */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 animate-pulse">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-red-600">
                      Phát hiện vi phạm AI
                    </span>
                    <span className="rounded-md bg-red-100 px-1.5 py-0.2 text-[10px] font-bold text-red-700">
                      {activeToast.severity === 'critical' ? 'RẤT NGHIÊM TRỌNG' : 'CẢNH BÁO'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Phòng thi: <strong className="font-mono text-slate-800">{activeToast.roomCode}</strong> • {activeToast.timestamp}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={dismissToast}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                title="Đóng thông báo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chi tiết vi phạm */}
            <div className="mt-3.5 rounded-2xl border border-red-100 bg-red-50/60 p-3 text-xs">
              <p className="font-bold text-slate-900">
                Thí sinh: <span className="text-blue-700 font-extrabold">{activeToast.studentName}</span>{' '}
                <span className="font-mono text-slate-500">({activeToast.studentId})</span>
              </p>
              <p className="mt-1 font-semibold text-red-700 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {activeToast.type}
              </p>
              <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                {activeToast.description}
              </p>
            </div>

            {/* Các nút hành động ngay lập tức */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setTargetedModalStudent({
                      id: activeToast.studentId,
                      name: activeToast.studentName,
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-600 transition cursor-pointer"
                >
                  <Send className="h-3 w-3" />
                  Nhắc nhở riêng
                </button>

                <button
                  type="button"
                  onClick={() => reviewViolation(activeToast.id, 'record')}
                  className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                >
                  Lập biên bản
                </button>
              </div>

              <Link
                href="/instructor/monitoring"
                onClick={dismissToast}
                className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
              >
                <Video className="h-3.5 w-3.5" />
                Vào giám sát →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. TOAST THÔNG BÁO HÀNH ĐỘNG THÀNH CÔNG (Toast Notice) ── */}
      {toastNotice && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-xl shadow-emerald-900/20">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{toastNotice}</span>
            <button
              type="button"
              onClick={clearToastNotice}
              className="ml-2 text-white/80 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal gửi thông báo riêng đến sinh viên vi phạm */}
      {targetedModalStudent && (
        <SendNotificationModal
          isOpen={true}
          onClose={() => setTargetedModalStudent(null)}
          defaultTarget={{
            type: 'individual',
            studentId: targetedModalStudent.id,
            studentName: targetedModalStudent.name,
          }}
          onSend={(targetType, targetLabel, message, type, studentId) => {
            sendAnnouncement(targetType, targetLabel, message, type, studentId);
            setTargetedModalStudent(null);
          }}
        />
      )}
    </>
  );
}

