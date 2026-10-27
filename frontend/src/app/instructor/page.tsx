'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Table2,
  Users,
  Code2,
  Clock,
  ArrowRight,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Calendar,
  ExternalLink,
} from 'lucide-react';

export default function InstructorDashboardPage() {
  const [instructorName, setInstructorName] = useState('Thầy Nguyễn Văn Nam');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name || parsed.username) {
          setInstructorName(parsed.name || parsed.username);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner Chào mừng Giảng viên */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-md shadow-blue-900/10 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
            <GraduationCap className="h-4 w-4" />
            Cổng Giảng Viên • Học kỳ 1 (2026-2027)
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
            Xin chào, {instructorName}!
          </h1>
          <p className="mt-2 text-sm text-blue-100 leading-relaxed">
            Hôm nay bạn có <strong className="text-white font-bold">2 ca thực hành Lab</strong> và <strong className="text-white font-bold">1 bài kiểm tra lập trình</strong>. Hệ thống AI đang sẵn sàng giám sát trực tiếp.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/instructor/classes"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" />
              Tạo bài Lab mới
            </Link>
            <Link
              href="/instructor/monitoring"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/20"
            >
              <Play className="h-4 w-4" />
              Vào phòng giám sát LiveKit
            </Link>
          </div>
        </div>
      </section>

      {/* 4 Thẻ Thống kê nhanh của Giảng viên */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Lớp phụ trách</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Table2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">4</span>
            <span className="text-xs font-semibold text-slate-600">lớp học phần</span>
          </div>
          <p className="mt-1 text-xs text-blue-600 font-medium">CS101, CS102, PRJ301, CSD201</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Tổng sinh viên</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">182</span>
            <span className="text-xs font-semibold text-slate-600">sinh viên</span>
          </div>
          <p className="mt-1 text-xs text-slate-600">Điểm danh tự động qua MSSV</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Lab đang mở</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Code2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">2</span>
            <span className="text-xs font-semibold text-emerald-600 font-bold">Đang online</span>
          </div>
          <p className="mt-1 text-xs text-slate-600">Học sinh đang nộp code testcase</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Cảnh báo AI</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">3</span>
            <span className="text-xs font-semibold text-slate-600">chờ duyệt</span>
          </div>
          <p className="mt-1 text-xs text-amber-600 font-medium">Quay mặt & chuyển Tab khi thi</p>
        </div>
      </div>

      {/* Danh sách ca thực hành hôm nay */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Lịch Thực Hành & Kiểm Tra Hôm Nay</h2>
              <p className="text-xs text-slate-600">Các ca máy và phòng thi đang diễn ra</p>
            </div>
            <Link
              href="/instructor/schedules"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Xem toàn bộ <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 transition hover:bg-emerald-50">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm">
                  LAB 03
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Lớp CS101 • C++ & Con Trỏ</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Đang mở
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    08:00 - 10:00 • Phòng Lab PM-301 • Mã PIN: <code className="font-mono font-bold text-slate-900">CS101-L3</code>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link
                  href="/instructor/classes"
                  className="flex-1 sm:flex-none text-center rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  Chi tiết
                </Link>
                <Link
                  href="/instructor/monitoring"
                  className="flex-1 sm:flex-none text-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                >
                  Giám sát LiveKit
                </Link>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4 transition hover:bg-blue-50">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm">
                  THI
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">PRJ301 • Kiểm Tra Giữa Kỳ Java OOP</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                      Chế độ EXAM (Khóa Tab)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    13:30 - 15:30 • 45 sinh viên • Camera AI kích hoạt
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link
                  href="/instructor/classes"
                  className="flex-1 sm:flex-none text-center rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  Cấu hình đề
                </Link>
                <Link
                  href="/instructor/monitoring"
                  className="flex-1 sm:flex-none text-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                >
                  Chuẩn bị phòng
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Phím tắt hành động nhanh */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Thao Tác Nhanh</h2>
          <div className="space-y-2.5">
            <Link
              href="/instructor/classes"
              className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-xs font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Table2 className="h-4 w-4" />
                </div>
                <span>Quản lý Lớp & Công bố điểm</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/instructor/questions"
              className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-xs font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Code2 className="h-4 w-4" />
                </div>
                <span>Kho Đề & Test Cases Cá Nhân</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/instructor/reports"
              className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-xs font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span>Báo Cáo Điểm & Vi Phạm SV</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

