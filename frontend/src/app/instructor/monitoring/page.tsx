'use client';

import React from 'react';
import Link from 'next/link';
import { Video, AlertTriangle, ShieldCheck, CheckCircle2, User } from 'lucide-react';

export default function InstructorMonitoringPage() {
  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Giám Sát Trực Tiếp Phòng Thi (LiveKit SFU)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Lưới video đa điểm Panoptic Grid &amp; Phát hiện hành vi gian lận qua AI theo thời gian thực
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            LiveKit Server: Kết nối ổn định (35fps)
          </span>
        </div>
      </div>

      {/* Lưới video Panoptic Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            id: 'SE184801',
            name: 'Nguyễn Văn An',
            status: 'Bình thường',
            alert: false,
            time: '08:02:15',
          },
          {
            id: 'SE184802',
            name: 'Trần Thị Bình',
            status: 'Cảnh báo AI: Quay mặt khỏi camera > 10s',
            alert: true,
            time: '08:03:40',
          },
          {
            id: 'SE184803',
            name: 'Lê Hoàng Cường',
            status: 'Bình thường',
            alert: false,
            time: '08:21:10',
          },
        ].map((student) => (
          <div
            key={student.id}
            className={`rounded-2xl border ${
              student.alert
                ? 'border-amber-400 bg-amber-50/20'
                : 'border-slate-200/80 bg-white'
            } p-4 shadow-xs relative transition hover:shadow-md`}
          >
            <div className="aspect-video w-full rounded-xl bg-slate-900 flex items-center justify-center relative overflow-hidden">
              <Video className="h-9 w-9 text-slate-700" />
              <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                CAM • 720p
              </div>
              <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[11px] text-white font-semibold">
                {student.id} • {student.name}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Giờ vào phòng:</span>
                <span className="font-mono font-medium text-slate-700">{student.time}</span>
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold ${
                    student.alert ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {student.status}
                </span>

                {student.alert ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-red-700 cursor-pointer"
                    >
                      Duyệt vi phạm
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Bỏ qua
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    Hợp lệ
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

