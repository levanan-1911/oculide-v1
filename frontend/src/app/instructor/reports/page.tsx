'use client';

import React, { useState } from 'react';
import { BookOpen, Download, AlertTriangle, CheckCircle2, Search, Filter } from 'lucide-react';

export default function InstructorReportsPage() {
  const [selectedClass, setSelectedClass] = useState('CS101');

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Kết Quả Điểm Số &amp; Báo Cáo Vi Phạm Quy Chế
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Bảng điểm tự động từ Docker Sandbox và bằng chứng vi phạm quy chế của sinh viên
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert('Xuất báo cáo Excel thành công cho lớp ' + selectedClass)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Xuất Bảng Điểm Excel
        </button>
      </div>

      {/* Bộ lọc lớp */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Chọn lớp:</span>
          {['CS101', 'CS102', 'PRJ301', 'CSD201'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedClass(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectedClass === c
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Hiển thị 45 sinh viên • 45/45 đã hoàn thành bài Lab
        </div>
      </div>

      {/* Bảng điểm & Vi phạm */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-700 uppercase font-bold text-[10px]">
              <tr>
                <th className="px-6 py-3.5">MSSV</th>
                <th className="px-6 py-3.5">Họ và Tên</th>
                <th className="px-6 py-3.5 text-center">Điểm Test Cases</th>
                <th className="px-6 py-3.5">Số lần rời Tab / Cảnh báo AI</th>
                <th className="px-6 py-3.5 text-center">Trạng thái công bố</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              <tr className="hover:bg-slate-50/60 transition">
                <td className="px-6 py-4 font-bold font-mono text-slate-900">SE184801</td>
                <td className="px-6 py-4 font-medium text-slate-900">Nguyễn Văn An</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                    10.0 / 10
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    0 lần (Tuân thủ tốt)
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    Đã công bố
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/60 transition bg-amber-50/15">
                <td className="px-6 py-4 font-bold font-mono text-slate-900">SE184802</td>
                <td className="px-6 py-4 font-medium text-slate-900">Trần Thị Bình</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                    8.5 / 10
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    2 lần (1 lần rời Tab, 1 lần quay mặt &gt; 10s)
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                    Chờ duyệt vi phạm
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/60 transition">
                <td className="px-6 py-4 font-bold font-mono text-slate-900">SE184803</td>
                <td className="px-6 py-4 font-medium text-slate-900">Lê Hoàng Cường</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                    9.0 / 10
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    0 lần (Tuân thủ tốt)
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    Đã công bố
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

