'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Search,
  Download,
  Eye,
  X,
  CheckCircle2,
  Video,
  Monitor,
  ShieldCheck,
  ShieldAlert,
  Check,
  MapPin,
  FileCode2,
  BookOpen,
  User,
  GraduationCap,
  Layers,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { fetchWithAuth } from '@/services/apiClient';
import {
  ExamScheduleItem,
  getStoredSchedules,
} from './types';

export default function ScheduleManagerPage() {
  const [schedules, setSchedules] = useState<ExamScheduleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeTab, setTypeTab] = useState<'all' | 'ongoing' | 'scheduled' | 'completed'>('all');
  const [selectedSchedule, setSelectedSchedule] = useState<ExamScheduleItem | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<{
    total_schedules: number;
    ongoing_count: number;
    scheduled_count: number;
    completed_count: number;
  } | null>(null);
  const [modalStudents, setModalStudents] = useState<any[]>([]);
  const [isLoadingModalStudents, setIsLoadingModalStudents] = useState(false);

  // Load real schedules from FastAPI Backend
  const loadSchedulesFromApi = async () => {
    setIsLoading(true);
    try {
      const [resSchedules, resOverview] = await Promise.all([
        fetchWithAuth<{ total: number; schedules: ExamScheduleItem[] }>('/api/v1/admin/schedules'),
        fetchWithAuth<{ total_schedules: number; ongoing_count: number; scheduled_count: number; completed_count: number }>('/api/v1/admin/schedules/overview')
      ]);
      if (resSchedules?.schedules) {
        setSchedules(resSchedules.schedules);
      }
      if (resOverview) {
        setOverview(resOverview);
      }
    } catch (err: any) {
      console.warn('API error, falling back to local storage cache:', err.message);
      setSchedules(getStoredSchedules());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedulesFromApi();
  }, []);

  // Fetch real student status when a schedule is selected
  useEffect(() => {
    if (!selectedSchedule) {
      setModalStudents([]);
      return;
    }
    const roomId = selectedSchedule.room_id || Number(selectedSchedule.id);
    if (!roomId || isNaN(roomId)) return;
    setIsLoadingModalStudents(true);
    fetchWithAuth<{ room_info: any; students: any[] }>(`/api/v1/admin/schedules/${roomId}`)
      .then((res) => {
        if (res?.students) setModalStudents(res.students);
      })
      .catch(() => setModalStudents([]))
      .finally(() => setIsLoadingModalStudents(false));
  }, [selectedSchedule]);

  // Hide notification
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Classes list for dropdown
  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    schedules.forEach((s) => {
      map.set(s.classId, s.className);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [schedules]);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((item) => {
      // Type tab filter
      if (typeTab === 'ongoing' && item.status !== 'ongoing') return false;
      if (typeTab === 'scheduled' && item.status !== 'scheduled') return false;
      if (typeTab === 'completed' && item.status !== 'completed') return false;

      // Status dropdown filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      // Class dropdown filter
      if (classFilter !== 'all' && item.classId !== classFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesClass = item.classId.toLowerCase().includes(q) || item.className.toLowerCase().includes(q);
        const matchesLecturer = item.lecturer.toLowerCase().includes(q);
        const matchesTemplate = item.templateId.toLowerCase().includes(q) || item.templateTitle.toLowerCase().includes(q);
        const matchesRoom = item.room.toLowerCase().includes(q);
        return matchesId || matchesTitle || matchesClass || matchesLecturer || matchesTemplate || matchesRoom;
      }
      return true;
    });
  }, [schedules, typeTab, statusFilter, classFilter, searchTerm]);

  // Counts for KPIs
  const totalCount = overview?.total_schedules ?? schedules.length;
  const ongoingCount = overview?.ongoing_count ?? schedules.filter((s) => s.status === 'ongoing').length;
  const scheduledCount = overview?.scheduled_count ?? schedules.filter((s) => s.status === 'scheduled').length;
  const completedCount = overview?.completed_count ?? schedules.filter((s) => s.status === 'completed').length;

  // Export to Excel / CSV
  function handleExportExcel() {
    if (schedules.length === 0) {
      alert('Không có dữ liệu ca thi để xuất.');
      return;
    }

    const rows: string[][] = [
      [
        'Mã ca thi',
        'Tên ca thi',
        'Lớp học',
        'Môn học',
        'Sĩ số',
        'Giảng viên phụ trách',
        'Bộ đề liên kết',
        'Tên bộ đề',
        'Ngày thi',
        'Giờ bắt đầu',
        'Giờ kết thúc',
        'Thời lượng (phút)',
        'Phòng thi / Địa điểm',
        'Mã phòng thi',
        'Trạng thái',
        'Webcam AI',
        'Khóa màn hình',
        'Chặn Clipboard',
      ],
    ];

    schedules.forEach((s) => {
      const statusLabel =
        s.status === 'ongoing'
          ? 'Đang diễn ra (Live)'
          : s.status === 'scheduled'
          ? 'Đã lên lịch'
          : s.status === 'completed'
          ? 'Đã kết thúc'
          : s.status === 'draft'
          ? 'Bản nháp'
          : 'Đã hủy';

      rows.push([
        s.id,
        s.title,
        s.classId,
        s.className,
        String(s.studentCount),
        s.lecturer,
        s.templateId,
        s.templateTitle,
        s.date,
        s.startTime,
        s.endTime,
        String(s.durationMinutes),
        s.room,
        s.roomCode,
        statusLabel,
        s.proctoringPolicy.webcam === 'required' ? 'Bắt buộc' : 'Tùy chọn',
        s.proctoringPolicy.screenShare === 'required' ? 'Bắt buộc' : 'Không',
        s.proctoringPolicy.clipboard === 'block' ? 'Chặn hoàn toàn' : 'Cảnh báo',
      ]);
    });

    const csvContent =
      '\uFEFF' +
      rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `danh_sach_lich_thi_admin_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setNotification({
      type: 'success',
      message: 'Đã xuất danh sách lịch & phiên kiểm tra ra file Excel/CSV thành công!',
    });
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f4f7f9] dark:bg-[#090a0f] text-slate-800 dark:text-slate-100 transition-colors">
      <AdminSidebar activeModule="schedules" />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar title="Lịch & phiên kiểm tra" />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1440px] space-y-6">
            {/* Toast Notification */}
            {notification && (
              <div
                role="status"
                className={`flex items-center justify-between rounded-xl border p-4 shadow-sm transition ${
                  notification.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-blue-200 bg-blue-50 text-blue-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="text-xs sm:text-sm font-semibold">{notification.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotification(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-black/5 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Header: Đồng bộ hệ thống, Admin chỉ ghi nhận/giám sát */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">QUẢN LÝ ĐÀO TẠO</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
                  Quản lý lịch &amp; phiên kiểm tra
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Ghi nhận, giám sát và thống kê danh sách lịch kiểm tra &amp; phiên thực hành do giảng viên khởi tạo trên toàn hệ thống.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  title="Xuất danh sách lịch & ca kiểm tra ra file Excel/CSV"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span>Xuất lịch & ca kiểm tra</span>
                </button>
              </div>
            </div>

            {/* KPI Cards Row (4 cards) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0d1017] transition-colors">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng ca kiểm tra</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{totalCount}</p>
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">Do giảng viên khởi tạo</p>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-sm dark:border-red-500/25 dark:bg-red-500/10 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300">Đang diễn ra (Live)</p>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                </div>
                <p className="mt-1 text-2xl font-black text-red-600 dark:text-red-400">{ongoingCount}</p>
                <p className="mt-0.5 text-[11px] text-red-500/90 dark:text-red-300/70">Giảng viên đang điều hành</p>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm dark:border-blue-500/25 dark:bg-blue-500/10 transition-colors">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Đã lên lịch (Sắp tới)</p>
                <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{scheduledCount}</p>
                <p className="mt-0.5 text-[11px] text-blue-500/90 dark:text-blue-300/70">Chờ giảng viên mở phòng</p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-500/25 dark:bg-emerald-500/10 transition-colors">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Đã hoàn thành</p>
                <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{completedCount}</p>
                <p className="mt-0.5 text-[11px] text-emerald-500/90 dark:text-emerald-300/70">Đã chốt &amp; có bảng điểm</p>
              </div>
            </div>

            {/* Toolbar: Tabs lọc + Dropdown Lớp + Dropdown Trạng thái + Tìm kiếm (chuẩn h-11) */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0d1017] transition-colors lg:flex-row lg:items-center lg:justify-between">
              {/* Type Tabs */}
              <div className="inline-flex h-11 items-center rounded-xl bg-slate-100 p-1 overflow-x-auto dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setTypeTab('all')}
                  className={`h-full whitespace-nowrap rounded-lg px-3.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                    typeTab === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Tất cả ({schedules.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeTab('ongoing')}
                  className={`h-full whitespace-nowrap rounded-lg px-3.5 text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    typeTab === 'ongoing'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-red-700 dark:text-slate-400 dark:hover:text-red-400'
                  }`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${typeTab === 'ongoing' ? 'bg-white' : 'bg-red-500'}`}></span>
                  Đang diễn ra ({ongoingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeTab('scheduled')}
                  className={`h-full whitespace-nowrap rounded-lg px-3.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                    typeTab === 'scheduled'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400'
                  }`}
                >
                  📅 Sắp tới ({scheduledCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeTab('completed')}
                  className={`h-full whitespace-nowrap rounded-lg px-3.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                    typeTab === 'completed'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400'
                  }`}
                >
                  ✅ Đã xong ({completedCount})
                </button>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Lớp filter */}
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#141824] dark:text-slate-100 cursor-pointer"
                >
                  <option value="all">Tất cả lớp học</option>
                  {classOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.name}
                    </option>
                  ))}
                </select>

                {/* Trạng thái filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#141824] dark:text-slate-100 cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="ongoing">🔴 Đang diễn ra</option>
                  <option value="scheduled">📅 Đã lên lịch</option>
                  <option value="completed">✅ Đã kết thúc</option>
                  <option value="draft">📝 Bản nháp</option>
                </select>

                {/* Search Input */}
                <div className="relative min-w-[260px] flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nhập mã hoặc tên..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm font-medium outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#141824] dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-blue-500"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bảng Danh sách Ca kiểm tra ghi nhận từ Giảng viên */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden dark:border-white/10 dark:bg-[#0d1017] transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/10 bg-[#f8fafc] dark:bg-white/5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="px-5 py-3.5">LỊCH KIỂM TRA &amp; ĐỀ THI</th>
                      <th className="px-4 py-3.5">LỚP &amp; GIẢNG VIÊN</th>
                      <th className="px-4 py-3.5">BẮT ĐẦU &amp; THỜI LƯỢNG</th>
                      <th className="px-4 py-3.5">GIÁM SÁT AI</th>
                      <th className="px-4 py-3.5">TRẠNG THÁI</th>
                      <th className="px-5 py-3.5 text-right">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10 font-medium">
                    {filteredSchedules.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <FileCode2 className="mx-auto h-12 w-12 text-slate-300" />
                          <p className="mt-3 text-base font-bold text-slate-900">
                            Không tìm thấy ca kiểm tra phù hợp
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Các ca kiểm tra sẽ tự động hiển thị tại đây khi Giảng viên tạo phòng hoặc lên lịch.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredSchedules.map((item) => {
                        return (
                          <tr
                            key={item.id}
                            className={`transition hover:bg-slate-50/80 dark:hover:bg-white/5 ${
                              item.status === 'ongoing' ? 'bg-red-50/20 dark:bg-red-950/25' : ''
                            }`}
                          >
                            {/* Cột 1: Mã ca thi & Đề thi */}
                            <td className="px-5 py-4 min-w-[260px]">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="shrink-0 font-mono text-xs font-black tracking-wider text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md dark:bg-white/10 dark:text-slate-200">
                                    {item.id}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                                    {item.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600">
                                    <BookOpen className="h-3 w-3 shrink-0 text-slate-400" />
                                    {item.templateId} • {item.templateTitle}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Cột 2: Lớp học & Giảng viên */}
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-[13px]">
                                  {item.classId}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {item.className} • <span className="font-semibold">{item.studentCount} SV</span>
                                </p>
                                <p className="text-[11px] font-semibold text-blue-700 mt-0.5 flex items-center gap-1">
                                  <GraduationCap className="h-3 w-3 text-blue-500 shrink-0" />
                                  GV: {item.lecturer}
                                </p>
                              </div>
                            </td>

                            {/* Cột 3: Bắt đầu & Thời lượng */}
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{item.date} • {item.startTime}</span>
                                </div>
                                <p className="mt-0.5 text-[11px] text-slate-500">
                                  Thời lượng: <strong className="text-slate-700">{item.durationMinutes} phút</strong> ({item.startTime} - {item.endTime})
                                </p>
                                <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                                  <MapPin className="h-3 w-3 text-slate-400" />
                                  <span>{item.room}</span>
                                </div>
                              </div>
                            </td>

                            {/* Cột 4: Giám sát AI */}
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                                      item.proctoringPolicy?.webcam === 'required'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    <Video className="h-2.5 w-2.5" />
                                    Webcam
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                                      item.proctoringPolicy?.screenShare === 'required'
                                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    <Monitor className="h-2.5 w-2.5" />
                                    Màn hình
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Mã phòng: {item.roomCode}
                                </span>
                              </div>
                            </td>

                            {/* Cột 5: Trạng thái */}
                            <td className="px-4 py-4 whitespace-nowrap">
                              {item.status === 'ongoing' ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                  Đang diễn ra (Live)
                                </span>
                              ) : item.status === 'scheduled' ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                                  <Calendar className="h-3 w-3" />
                                  Đã lên lịch
                                </span>
                              ) : item.status === 'completed' ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                  <Check className="h-3 w-3" />
                                  Đã kết thúc
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                  Nháp
                                </span>
                              )}
                            </td>

                            {/* Cột 6: Thao tác (Admin xem thông tin thanh tra) */}
                            <td className="px-5 py-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedSchedule(item)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 transition cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                                <span>Xem thanh tra</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Banner chính sách phân công & đồng bộ (theo mockup wireframe) */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
                <p className="leading-relaxed">
                  Chỉ hiển thị dữ liệu trong phạm vi được phân công theo học kỳ{' '}
                  <strong className="font-semibold">HK1 2026–2027</strong>. Lịch kiểm tra &amp; phòng thi do Giảng viên bộ môn tạo và điều hành; Quản trị viên theo dõi thông tin thanh tra và hỗ trợ hạ tầng kỹ thuật.
                </p>
              </div>
              <span className="text-[11px] font-bold text-blue-600 shrink-0">
                Oculide Proctoring System v2.4
              </span>
            </div>
          </div>
        </main>
      </div>

      {/* ── MODAL CHI TIẾT CA THI (ĐỒNG BỘ DARK / LIGHT CHUẨN XÁC) ── */}
      {selectedSchedule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedSchedule(null);
          }}
        >
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl transition-all dark:border-white/10 dark:bg-[#0d1017] my-8 text-slate-800 dark:text-slate-200">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3.5">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  {selectedSchedule.id} • {selectedSchedule.classId}
                </span>
                <h3 className="mt-0.5 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {selectedSchedule.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSchedule(null)}
                aria-label="Đóng"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              {/* Box 1: Thông tin Giảng viên & Phòng máy */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 dark:border-white/10 dark:bg-[#141824]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Giảng viên:</span>
                  <span className="mt-0.5 block font-bold text-blue-600 dark:text-blue-400 truncate">{selectedSchedule.lecturer}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Phòng máy:</span>
                  <span className="mt-0.5 block font-bold text-slate-800 dark:text-slate-200 truncate">{selectedSchedule.room}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Thời gian:</span>
                  <span className="mt-0.5 block font-bold text-slate-800 dark:text-slate-200">{selectedSchedule.startTime} - {selectedSchedule.endTime}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Mã phòng:</span>
                  <span className="mt-0.5 block font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">{selectedSchedule.roomCode}</span>
                </div>
              </div>

              {/* Box 2: Thông tin Đề thi liên kết */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-1.5 dark:border-white/10 dark:bg-[#141824]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Bộ đề thi liên kết
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white sm:text-sm">
                      {selectedSchedule.templateId} - {selectedSchedule.templateTitle}
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      Phiên bản: {selectedSchedule.templateVersion} • Thời lượng: {selectedSchedule.durationMinutes} phút
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    Bảo mật câu hỏi &amp; Test Cases
                  </span>
                </div>
              </div>

              {/* Box 3: Chính sách giám sát AI */}
              {selectedSchedule.proctoringPolicy && (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-2 dark:border-white/10 dark:bg-[#141824]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Chính sách giám sát AI áp dụng
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="rounded-lg bg-white border border-slate-200/80 p-2 dark:border-white/10 dark:bg-[#0d1017]">
                      <span className="block text-slate-500 dark:text-slate-400 text-[10px]">Webcam:</span>
                      <strong className="text-purple-700 dark:text-purple-300 font-bold">
                        {selectedSchedule.proctoringPolicy.webcam === 'required' ? 'Bắt buộc' : 'Tùy chọn'}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200/80 p-2 dark:border-white/10 dark:bg-[#0d1017]">
                      <span className="block text-slate-500 dark:text-slate-400 text-[10px]">Chia sẻ màn hình:</span>
                      <strong className="text-purple-700 dark:text-purple-300 font-bold">
                        {selectedSchedule.proctoringPolicy.screenShare === 'required' ? 'Toàn màn hình' : 'Không'}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200/80 p-2 dark:border-white/10 dark:bg-[#0d1017]">
                      <span className="block text-slate-500 dark:text-slate-400 text-[10px]">Chặn Clipboard:</span>
                      <strong className="text-purple-700 dark:text-purple-300 font-bold">
                        {selectedSchedule.proctoringPolicy.clipboard === 'block' ? 'Chặn sao chép' : 'Cảnh báo'}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200/80 p-2 dark:border-white/10 dark:bg-[#0d1017]">
                      <span className="block text-slate-500 dark:text-slate-400 text-[10px]">Giới hạn đổi tab:</span>
                      <strong className="text-purple-700 dark:text-purple-300 font-bold">
                        Tối đa {selectedSchedule.proctoringPolicy.tabSwitchLimit || 2} lần
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Box 4: Chính sách phân quyền & Thông tin điều hành */}
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/70 p-3.5 space-y-1.5 dark:border-blue-500/20 dark:bg-blue-500/10">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    Quy chế khảo thí &amp; Trách nhiệm giám sát
                  </span>
                </div>
                <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                  Toàn quyền điều hành phòng thi, điểm danh, theo dõi camera/màn hình thí sinh và xử lý vi phạm thuộc về Giảng viên coi thi phụ trách (<strong>{selectedSchedule.lecturer}</strong>). Quản trị viên chỉ đối soát thông tin thanh tra và hỗ trợ hạ tầng kỹ thuật máy chủ.
                </p>
              </div>

              {/* Box 5: Danh sách thí sinh dự thi thực tế từ CSDL */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2 dark:border-white/10 dark:bg-[#141824]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Danh sách thí sinh đăng ký ({modalStudents.length > 0 ? modalStudents.length : selectedSchedule.studentCount} sinh viên)
                  </span>
                  {isLoadingModalStudents && (
                    <span className="text-[11px] text-blue-500 animate-pulse">Đang tải danh sách thí sinh...</span>
                  )}
                </div>

                {modalStudents.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-100 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5">
                    {modalStudents.map((st) => (
                      <div key={st.student_id} className="flex items-center justify-between px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-500">{st.student_code}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{st.full_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            st.attendance_status === 'present'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'
                          }`}>
                            {st.attendance_status === 'present' ? 'Có mặt' : 'Chưa vào'}
                          </span>
                          {st.current_score !== null && (
                            <span className="font-bold text-blue-600 dark:text-blue-400">{st.current_score} đ</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Chưa có sinh viên nào ghi danh hoặc đang đồng bộ danh sách lớp.</p>
                )}
              </div>
            </div>

            {/* Footer Modal: Read-only giám sát và điều hướng cho Admin */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 pt-3.5 border-t border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                {selectedSchedule.status === 'ongoing' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    Đang diễn ra (Live)
                  </span>
                ) : selectedSchedule.status === 'completed' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Đã hoàn thành
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400">
                    <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    Đã lên lịch
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Giám thị: <strong className="text-slate-800 dark:text-slate-200">{selectedSchedule.lecturer}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSchedule(null)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
