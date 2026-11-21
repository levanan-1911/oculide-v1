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
        <div className="fixed top-4 right-4 z-50 w-full max-w-md">
          <div className="rounded-md border border-slate-800 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-neutral-900">
            {/* Header thông báo */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-800/30 bg-slate-800/10 text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-500">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-500">
                      Phát hiện vi phạm AI
                    </span>
                    <span className="rounded border border-slate-800/20 bg-slate-800/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-800 dark:text-slate-500">
                      {activeToast.severity === 'critical' ? 'RẤT NGHIÊM TRỌNG' : 'CẢNH BÁO'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Phòng thi: <strong className="font-mono text-slate-800 dark:text-slate-200">{activeToast.roomCode}</strong> • <span className="font-mono">{activeToast.timestamp}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={dismissToast}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
                title="Đóng thông báo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chi tiết vi phạm */}
            <div className="mt-3.5 rounded-md border border-slate-300 bg-slate-50/60 p-3 text-xs dark:border-white/10 dark:bg-white/[0.02]">
              <p className="font-bold text-slate-900 dark:text-white">
                Thí sinh: <span className="font-serif font-bold text-slate-900 dark:text-slate-500">{activeToast.studentName}</span>{' '}
                <span className="font-mono text-slate-500">({activeToast.studentId})</span>
              </p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-500 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {activeToast.type}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                {activeToast.description}
              </p>
            </div>

            {/* Các nút hành động ngay lập tức */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-300 dark:border-white/10">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setTargetedModalStudent({
                      id: activeToast.studentId,
                      name: activeToast.studentName,
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  <Send className="h-3 w-3" />
                  Nhắc nhở riêng
                </button>

                <button
                  type="button"
                  onClick={() => reviewViolation(activeToast.id, 'record')}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  Lập biên bản
                </button>
              </div>

              <Link
                href="/instructor/monitoring"
                onClick={dismissToast}
                className="system-primary-action inline-flex items-center gap-1 rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition"
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
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-center gap-2.5 rounded-md border border-brand bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-xl">
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

