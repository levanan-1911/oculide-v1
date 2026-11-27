'use client';

import React from 'react';
import {
  Activity,
  CheckCircle2,
  Database,
  Radio,
  Server,
  Terminal,
} from 'lucide-react';

export interface HealthServiceMetric {
  label: string;
  value: string | number;
}

export interface HealthServiceItem {
  id: string;
  name: string;
  category: string;
  description: string;
  metrics: HealthServiceMetric[];
  latencyMs: number;
  uptimePercent: number;
}

interface SystemHealthTabProps {
  services: HealthServiceItem[];
}

export default function SystemHealthTab({ services }: SystemHealthTabProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-md border border-slate-300 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Hệ thống vận hành ổn định
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tất cả {services.length} dịch vụ đang hoạt động bình thường, không ghi nhận sự cố gián đoạn kết nối.
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap pl-12 sm:pl-0">
          Trạng thái: <strong className="font-bold text-slate-800 dark:text-slate-200">Hoạt động bình thường</strong>
        </div>
      </div>

      {/* Lưới danh sách 5 dịch vụ cốt lõi */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {services.map((svc) => (
          <div
            key={svc.id}
            className="flex flex-col justify-between rounded-md border border-slate-300 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-white/10 dark:bg-neutral-900"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                    {svc.id === 'backend_api' ? (
                      <Server className="h-4 w-4" />
                    ) : svc.id === 'code_sandbox' ? (
                      <Terminal className="h-4 w-4" />
                    ) : svc.id === 'livekit_media' ? (
                      <Radio className="h-4 w-4" />
                    ) : svc.id === 'database' ? (
                      <Database className="h-4 w-4" />
                    ) : (
                      <Activity className="h-4 w-4" />
                    )}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {svc.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {svc.category}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Hoạt động
                </span>
              </div>

              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {svc.description}
              </p>

              {/* Các chỉ số hiệu năng Metrics */}
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-md bg-slate-50 dark:bg-white/5 p-2.5">
                {svc.metrics.map((m, idx) => (
                  <div key={idx} className="text-center">
                    <span className="block text-[10px] font-semibold text-slate-400">
                      {m.label}
                    </span>
                    <span className="mt-0.5 block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-3 text-[11px] text-slate-400 dark:text-slate-500">
              <span>
                Độ trễ: <strong className="text-slate-700 dark:text-slate-200">{svc.latencyMs} ms</strong>
              </span>
              <span>
                Uptime: <strong className="text-slate-700 dark:text-slate-200">{svc.uptimePercent}%</strong>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
