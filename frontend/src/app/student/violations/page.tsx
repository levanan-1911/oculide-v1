'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  Info,
  ArrowLeft,
} from 'lucide-react';
import StudentSidebar from '@/components/student/StudentSidebar';
import StudentTopbar from '@/components/student/StudentTopbar';

export default function StudentViolationsPage() {
  const violations = [
    {
      id: 1,
      examTitle: 'PRJ301 • Kiểm Tra Giữa Kỳ Java OOP',
      timestamp: '27/10/2026 14:15:22',
      type: 'TAB_SWITCH',
      typeName: 'Rời khỏi cửa sổ thi (Chuyển Tab)',
      duration: '12 giây',
      status: 'pending',
      statusText: 'Đang chờ GV xem xét',
      statusClass: 'bg-amber-50 text-amber-700 border-amber-200',
      evidenceNote: 'Hệ thống phát hiện mất tiêu điểm màn hình thi 12 giây.',
    },
    {
      id: 2,
      examTitle: 'CS101 • Thực Hành C++ Lab 02',
      timestamp: '20/10/2026 09:32:05',
      type: 'HEAD_POSE',
      typeName: 'Quay mặt khỏi camera > 10s',
      duration: '15 giây',
      status: 'rejected',
      statusText: 'Đã hủy (Không tính vi phạm)',
      statusClass: 'bg-slate-100 text-slate-600 border-slate-200',
      evidenceNote: 'Giảng viên đã xác nhận sinh viên cúi xuống ghi nháp.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 lg:flex font-sans">
      <StudentSidebar />

      <div className="min-w-0 flex-1">
        <StudentTopbar />

        <main className="mx-auto max-w-[1400px] space-y-6 p-5 sm:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href="/student"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-xl font-bold text-slate-900">
                  Nhật Ký Cảnh Báo AI &amp; Vi Phạm Cá Nhân
                </h1>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Minh bạch toàn bộ sự kiện cảnh báo từ hệ thống AI giám sát webcam và màn hình
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Chính sách đạo đức AI Oculide
            </div>
          </div>

          {/* Banner Thông báo đạo đức AI */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5 flex items-start gap-3.5">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <strong className="font-bold">Lưu ý quan trọng:</strong> Hệ thống AI chỉ tự động ghi nhận các khoảnh khắc bất thường ở trạng thái tạm thời (<code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[11px] font-bold">Chờ xem xét</code>). AI <strong>không bao giờ</strong> tự ý trừ điểm bài thi của bạn. Quyết định cuối cùng luôn do chính Giảng viên bộ môn xem xét bằng chứng video/ảnh chụp và phê duyệt.
            </div>
          </div>

          {/* Bảng danh sách các lần cảnh báo */}
          <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="px-6 py-3.5">Ca thi / Bài Lab</th>
                    <th className="px-6 py-3.5">Thời gian ghi nhận</th>
                    <th className="px-6 py-3.5">Loại hành vi cảnh báo</th>
                    <th className="px-6 py-3.5">Thời lượng</th>
                    <th className="px-6 py-3.5">Trạng thái xử lý</th>
                    <th className="px-6 py-3.5 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {violations.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {item.examTitle}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500">
                        {item.timestamp}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800">
                          {item.typeName}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.evidenceNote}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-slate-600">
                        {item.duration}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${item.statusClass}`}
                        >
                          {item.statusText}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => alert('Chi tiết ảnh chụp bằng chứng lúc vi phạm: ' + item.evidenceNote)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
                        >
                          Xem ảnh chụp
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

