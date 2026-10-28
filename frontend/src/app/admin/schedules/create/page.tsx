'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  ShieldCheck,
  Video,
  Monitor,
  Copy,
  ChevronRight,
  BookOpen,
  Users,
  MapPin,
  Save,
  Check,
  Sparkles,
  Info,
  ShieldAlert,
  Radio,
  FileCode2,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import {
  ClassRow,
  StudentRow,
  getStoredClasses,
  getStoredQuestionTemplates,
  QuestionTemplate,
} from '@/app/admin/classes/types';
import {
  ExamScheduleItem,
  DEFAULT_PROCTORING_POLICY,
  getStoredSchedules,
  saveStoredSchedules,
  ProctoringPolicy,
} from '../types';

export default function CreateSchedulePage() {
  const router = useRouter();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [templates, setTemplates] = useState<QuestionTemplate[]>([]);

  // Wizard Step: 1 -> 2 -> 3 -> 4
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State - Step 1: Thông tin
  const [scheduleId, setScheduleId] = useState('');
  const [title, setTitle] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [date, setDate] = useState('2026-10-30');
  const [startTime, setStartTime] = useState('08:00');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [room, setRoom] = useState('Phòng máy LAB-302');
  const [roomCode, setRoomCode] = useState('');
  const [roomPassword, setRoomPassword] = useState('123456');
  const [lecturer, setLecturer] = useState('Long Phạm');

  // Form State - Step 2: Đề & Danh sách
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateVersion, setTemplateVersion] = useState('v1 • Sẵn sàng');

  // Form State - Step 3: Chính sách giám sát AI
  const [policyMode, setPolicyMode] = useState<'custom' | 'default' | 'copy'>('custom');
  const [proctoringPolicy, setProctoringPolicy] = useState<ProctoringPolicy>({
    ...DEFAULT_PROCTORING_POLICY,
  });

  // Load classes and question templates
  useEffect(() => {
    const loadedClasses = getStoredClasses();
    const loadedTemplates = getStoredQuestionTemplates();
    setClasses(loadedClasses);
    setTemplates(loadedTemplates);

    // Initial defaults
    if (loadedClasses.length > 0) {
      setSelectedClassId(loadedClasses[0].id);
      setLecturer(loadedClasses[0].lecturer || 'Long Phạm');
    }

    if (loadedTemplates.length > 0) {
      // Find an exam template first if available
      const defaultTpl = loadedTemplates.find((t) => t.type === 'exam') || loadedTemplates[0];
      setSelectedTemplateId(defaultTpl.id);
    }

    // Generate random room code
    const randomCode = `OC-${Math.floor(100000 + Math.random() * 900000)}`;
    setRoomCode(randomCode);
    setScheduleId(`EXAM-${loadedClasses[0]?.id || 'SE1848'}-${String(Math.floor(Math.random() * 90) + 10)}`);
    setTitle('Kiểm tra giữa kỳ • Thực hành lập trình');
  }, []);

  // Selected class data
  const currentClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  // Selected template data
  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Calculate end time
  const calculatedEndTime = useMemo(() => {
    try {
      const [h, m] = startTime.split(':').map(Number);
      const startMin = h * 60 + m;
      const endMin = startMin + Number(durationMinutes);
      const endH = Math.floor(endMin / 60) % 24;
      const endM = endMin % 60;
      return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    } catch {
      return '10:00';
    }
  }, [startTime, durationMinutes]);

  // Update lecturer when class changes
  function handleClassChange(newClassId: string) {
    setSelectedClassId(newClassId);
    const target = classes.find((c) => c.id === newClassId);
    if (target?.lecturer) {
      setLecturer(target.lecturer);
    }
  }

  // Update template and sync duration if template has durationMinutes
  function handleTemplateChange(newTemplateId: string) {
    setSelectedTemplateId(newTemplateId);
    const target = templates.find((t) => t.id === newTemplateId);
    if (target?.durationMinutes) {
      setDurationMinutes(target.durationMinutes);
    }
    if (target?.title && !title) {
      setTitle(target.title);
    }
  }

  // Handle Save Draft
  function handleSaveDraft() {
    const draftSchedule: ExamScheduleItem = {
      id: scheduleId.trim() || `DRAFT-${selectedClassId}-${Date.now().toString().slice(-4)}`,
      title: title.trim() || 'Ca kiểm tra bản nháp',
      classId: selectedClassId,
      className: currentClass?.name || 'Lớp học',
      studentCount: currentClass?.students?.length || 48,
      lecturer: lecturer || 'Long Phạm',
      templateId: selectedTemplateId,
      templateTitle: currentTemplate?.title || 'Bộ đề kiểm tra',
      templateVersion,
      date,
      startTime,
      endTime: calculatedEndTime,
      durationMinutes: Number(durationMinutes),
      room,
      roomCode,
      roomPassword,
      status: 'draft',
      proctoringPolicy,
      isLobbyOpen: false,
      readyStudentCount: 0,
      deviceCheckCount: 0,
      absentCount: currentClass?.students?.length || 48,
      createdAt: 'Hôm nay',
    };

    const existingSchedules = getStoredSchedules();
    saveStoredSchedules([draftSchedule, ...existingSchedules]);
    router.push('/admin/schedules');
  }

  // Handle Finish & Create Schedule
  function handleFinishCreate() {
    if (!title.trim()) {
      alert('Vui lòng nhập tên ca kiểm tra.');
      setStep(1);
      return;
    }

    const newSchedule: ExamScheduleItem = {
      id: scheduleId.trim() || `EXAM-${selectedClassId}-${Date.now().toString().slice(-4)}`,
      title: title.trim(),
      classId: selectedClassId,
      className: currentClass?.name || 'Lớp học',
      studentCount: currentClass?.students?.length || 48,
      lecturer: lecturer || 'Long Phạm',
      templateId: selectedTemplateId,
      templateTitle: currentTemplate?.title || 'Bộ đề kiểm tra',
      templateVersion,
      date,
      startTime,
      endTime: calculatedEndTime,
      durationMinutes: Number(durationMinutes),
      room,
      roomCode,
      roomPassword,
      status: 'scheduled',
      proctoringPolicy,
      isLobbyOpen: false,
      readyStudentCount: 0,
      deviceCheckCount: 0,
      absentCount: currentClass?.students?.length || 48,
      createdAt: 'Hôm nay',
    };

    const existingSchedules = getStoredSchedules();
    const updated = [newSchedule, ...existingSchedules];
    saveStoredSchedules(updated);

    router.push('/admin/schedules');
  }

  // Step 1 Validation
  function handleNextFromStep1() {
    if (!title.trim()) {
      alert('Vui lòng nhập tên ca kiểm tra.');
      return;
    }
    setStep(2);
  }

  // Stepper Header Items
  const stepsMeta = [
    { num: 1, label: '1. Thông tin' },
    { num: 2, label: '2. Đề & danh sách' },
    { num: 3, label: '3. Chính sách' },
    { num: 4, label: '4. Xác nhận' },
  ];

  return (
    <div className="flex min-h-screen w-full bg-[#f4f7f9] text-slate-800">
      <AdminSidebar activeModule="schedules" />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar title="Tạo lịch kiểm tra mới" />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1200px] space-y-6">
            {/* Header & Back Button */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/schedules"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                  title="Quay lại danh sách lịch kiểm tra"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                    {step === 1 && 'Tạo lịch kiểm tra • Thông tin cơ bản'}
                    {step === 2 && 'Tạo lịch kiểm tra • Đề và danh sách'}
                    {step === 3 && 'Tạo lịch kiểm tra • Chính sách giám sát'}
                    {step === 4 && 'Tạo lịch kiểm tra • Xác nhận & Hoàn tất'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {step === 1 && 'Bước 1/4 • Thiết lập thông tin môn học, lớp và khung giờ tổ chức.'}
                    {step === 2 && 'Bước 2/4 • Chỉ phiên bản Sẵn sàng được sử dụng.'}
                    {step === 3 && 'Bước 3/4 • Giảng viên tự thiết lập hoặc dùng chính sách mẫu cho lịch này.'}
                    {step === 4 && 'Bước 4/4 • Kiểm tra tự động xung đột trùng lịch và hoàn tất ca thi.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Stepper (4 bước) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stepsMeta.map((s) => {
                const isActive = step === s.num;
                const isPassed = step > s.num;
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => {
                      if (s.num <= step) setStep(s.num as any);
                    }}
                    className={`h-11 rounded-xl px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer border ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                        : isPassed
                        ? 'border-emerald-200 bg-emerald-50/60 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-400 opacity-80'
                    }`}
                  >
                    {isPassed ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {s.num}
                      </span>
                    )}
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ═══════════════════════════════════════════════════════
                BƯỚC 1: THÔNG TIN CƠ BẢN
            ════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">1. Thông tin chung ca kiểm tra</h3>
                  <p className="text-xs text-slate-500">
                    Chọn lớp học và thời gian bắt đầu làm bài.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      MÃ CA KIỂM TRA <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={scheduleId}
                      onChange={(e) => setScheduleId(e.target.value.toUpperCase())}
                      placeholder="Ví dụ: PRJ301-MID"
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      LỚP HỌC THAM GIA <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.id} - {c.name} ({c.students?.length || c.studentCount} SV)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    TIÊU ĐỀ CA KIỂM TRA <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Kiểm tra giữa kỳ • Xây dựng ứng dụng Web tương tác"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      NGÀY THI <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      GIỜ BẮT ĐẦU <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      THỜI LƯỢNG (PHÚT) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={300}
                      step={5}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <span className="mt-1 block text-[11px] text-slate-400">
                      Kết thúc lúc: <strong className="text-slate-700">{calculatedEndTime}</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      PHÒNG MÁY / ĐỊA ĐIỂM THI
                    </label>
                    <select
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    >
                      <option value="Phòng máy LAB-302">Phòng máy LAB-302</option>
                      <option value="Phòng máy LAB-201">Phòng máy LAB-201</option>
                      <option value="Phòng máy LAB-305">Phòng máy LAB-305</option>
                      <option value="Online tập trung">Online tập trung (Giám sát tại nhà)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      GIẢNG VIÊN / GIÁM THỊ CHÍNH
                    </label>
                    <input
                      type="text"
                      value={lecturer}
                      onChange={(e) => setLecturer(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Footer Buttons Step 1 */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <Link
                    href="/admin/schedules"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Hủy bỏ
                  </Link>
                  <button
                    type="button"
                    onClick={handleNextFromStep1}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 transition cursor-pointer"
                  >
                    Tiếp tục: Đề &amp; danh sách →
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                BƯỚC 2: ĐỀ VÀ DANH SÁCH (ĐÚNG NHƯ WIREFRAME ẢNH 1)
            ════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ĐỀ KIỂM TRA <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.id} • {t.questionCount} bài tập)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      PHIÊN BẢN ĐỀ <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={templateVersion}
                      onChange={(e) => setTemplateVersion(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    >
                      <option value="v1 • Sẵn sàng">v1 • Sẵn sàng</option>
                      <option value="v2 • Bản cập nhật">v2 • Bản cập nhật</option>
                    </select>
                  </div>
                </div>

                {/* Lớp và danh sách tham gia */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    LỚP / DANH SÁCH THAM GIA KIỂM TRA
                  </label>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="font-bold text-slate-900">
                        {selectedClassId} • {currentClass?.students?.length || 48} tài khoản hợp lệ
                      </span>
                    </div>
                    <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                      Chỉ đọc
                    </span>
                  </div>
                </div>

                {/* Bảng danh sách sinh viên */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f8fafc] text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5">MSSV</th>
                          <th className="px-4 py-2.5">HỌ TÊN</th>
                          <th className="px-4 py-2.5">EMAIL TRƯỜNG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(currentClass?.students || []).slice(0, 10).map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-mono font-bold text-slate-800">{st.id}</td>
                            <td className="px-4 py-2.5 font-medium text-slate-900">{st.name}</td>
                            <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">{st.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-slate-100 bg-slate-50/50 p-2 text-center text-[11px] text-slate-500">
                    Hiển thị 10 / {currentClass?.students?.length || 48} sinh viên trong danh sách snapshot.
                  </div>
                </div>

                {/* Info Alert Box */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 flex items-center gap-2.5">
                  <Info className="h-4 w-4 text-blue-600 shrink-0" />
                  <p>Lưu bản chụp danh sách và đúng phiên bản đề tại thời điểm lên lịch.</p>
                </div>

                {/* Footer Buttons Step 2 */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Link
                      href="/admin/schedules"
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Hủy
                    </Link>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Quay lại
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Save className="h-4 w-4 text-slate-500" />
                      Lưu nháp
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 transition cursor-pointer"
                    >
                      Tiếp tục: Chính sách giám sát →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                BƯỚC 3: CHÍNH SÁCH GIÁM SÁT AI (ĐÚNG NHƯ WIREFRAME ẢNH 2)
            ════════════════════════════════════════════════════════ */}
            {step === 3 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
                {/* Mode Selector */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5">
                  <p className="text-xs font-semibold text-blue-900 mb-2">
                    Chọn cách cấu hình: Tự cấu hình | Dùng mẫu mặc định | Sao chép từ lịch khác
                  </p>
                  <div className="inline-flex rounded-xl bg-white border border-slate-200 p-1">
                    <button
                      type="button"
                      onClick={() => setPolicyMode('custom')}
                      className={`h-9 px-4 rounded-lg text-xs font-bold transition cursor-pointer ${
                        policyMode === 'custom' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Tự cấu hình
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPolicyMode('default');
                        setProctoringPolicy(DEFAULT_PROCTORING_POLICY);
                      }}
                      className={`h-9 px-4 rounded-lg text-xs font-bold transition cursor-pointer ${
                        policyMode === 'default' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Dùng mẫu mặc định
                    </button>
                    <button
                      type="button"
                      onClick={() => setPolicyMode('copy')}
                      className={`h-9 px-4 rounded-lg text-xs font-bold transition cursor-pointer ${
                        policyMode === 'copy' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Sao chép
                    </button>
                  </div>
                </div>

                {/* 4 Thiết lập phần cứng & Clipboard */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      WEBCAM TRƯỚC
                    </label>
                    <select
                      value={proctoringPolicy.webcam}
                      onChange={(e) =>
                        setProctoringPolicy({
                          ...proctoringPolicy,
                          webcam: e.target.value as any,
                        })
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                    >
                      <option value="required">Bắt buộc</option>
                      <option value="optional">Tùy chọn</option>
                      <option value="disabled">Tắt</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      CHIA SẺ TOÀN MÀN HÌNH
                    </label>
                    <select
                      value={proctoringPolicy.screenShare}
                      onChange={(e) =>
                        setProctoringPolicy({
                          ...proctoringPolicy,
                          screenShare: e.target.value as any,
                        })
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                    >
                      <option value="required">Bắt buộc</option>
                      <option value="optional">Không bắt buộc</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      CLIPBOARD
                    </label>
                    <select
                      value={proctoringPolicy.clipboard}
                      onChange={(e) =>
                        setProctoringPolicy({
                          ...proctoringPolicy,
                          clipboard: e.target.value as any,
                        })
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                    >
                      <option value="block">Chặn sao chép / dán ra ngoài</option>
                      <option value="warn">Cảnh báo khi dán</option>
                      <option value="allow">Cho phép</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      THÔNG BÁO
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="[Bảng giám sát, Thông báo nổi]"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 outline-none"
                    />
                  </div>
                </div>

                {/* Bảng Ngưỡng và mức độ theo sự kiện */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Ngưỡng và mức độ theo sự kiện
                  </h4>

                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden text-xs">
                    {/* Event 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_160px] items-center gap-3 p-3.5 bg-white">
                      <div>
                        <strong className="text-slate-800 block text-xs">Không phát hiện khuôn mặt</strong>
                        <span className="text-[11px] text-slate-400">Học sinh cúi mặt hoặc rời khỏi webcam</span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">NGƯỠNG</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={5}
                            max={120}
                            value={proctoringPolicy.faceMissingThresholdSec}
                            onChange={(e) =>
                              setProctoringPolicy({
                                ...proctoringPolicy,
                                faceMissingThresholdSec: Number(e.target.value),
                              })
                            }
                            className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-center font-bold"
                          />
                          <span className="text-slate-500 font-semibold">giây</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">MỨC CẢNH BÁO</label>
                        <select
                          value={proctoringPolicy.faceMissingSeverity}
                          onChange={(e) =>
                            setProctoringPolicy({
                              ...proctoringPolicy,
                              faceMissingSeverity: e.target.value as any,
                            })
                          }
                          className="h-9 w-full rounded-lg border border-slate-200 px-2 text-xs font-semibold"
                        >
                          <option value="low">Thấp</option>
                          <option value="medium">Trung bình</option>
                          <option value="high">Cao</option>
                          <option value="critical">Nghiêm trọng</option>
                        </select>
                      </div>
                    </div>

                    {/* Event 2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_160px] items-center gap-3 p-3.5 bg-white">
                      <div>
                        <strong className="text-slate-800 block text-xs">Mất webcam</strong>
                        <span className="text-[11px] text-slate-400">Rút cáp camera hoặc tắt quyền thiết bị</span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">NGƯỠNG</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={3}
                            max={60}
                            value={proctoringPolicy.webcamLostThresholdSec}
                            onChange={(e) =>
                              setProctoringPolicy({
                                ...proctoringPolicy,
                                webcamLostThresholdSec: Number(e.target.value),
                              })
                            }
                            className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-center font-bold"
                          />
                          <span className="text-slate-500 font-semibold">giây</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">MỨC CẢNH BÁO</label>
                        <select
                          value={proctoringPolicy.webcamLostSeverity}
                          onChange={(e) =>
                            setProctoringPolicy({
                              ...proctoringPolicy,
                              webcamLostSeverity: e.target.value as any,
                            })
                          }
                          className="h-9 w-full rounded-lg border border-slate-200 px-2 text-xs font-semibold text-amber-700 bg-amber-50"
                        >
                          <option value="low">Thấp</option>
                          <option value="medium">Trung bình</option>
                          <option value="high">Cao</option>
                          <option value="critical">Nghiêm trọng</option>
                        </select>
                      </div>
                    </div>

                    {/* Event 3 */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_160px] items-center gap-3 p-3.5 bg-white">
                      <div>
                        <strong className="text-slate-800 block text-xs">Dừng chia sẻ màn hình</strong>
                        <span className="text-[11px] text-slate-400">Bấm nút Stop Sharing trên trình duyệt</span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">NGƯỠNG</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={proctoringPolicy.screenStopThresholdSec}
                            onChange={(e) =>
                              setProctoringPolicy({
                                ...proctoringPolicy,
                                screenStopThresholdSec: Number(e.target.value),
                              })
                            }
                            className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-center font-bold"
                          />
                          <span className="text-slate-500 font-semibold">giây</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">MỨC CẢNH BÁO</label>
                        <select
                          value={proctoringPolicy.screenStopSeverity}
                          onChange={(e) =>
                            setProctoringPolicy({
                              ...proctoringPolicy,
                              screenStopSeverity: e.target.value as any,
                            })
                          }
                          className="h-9 w-full rounded-lg border border-red-200 px-2 text-xs font-semibold text-red-700 bg-red-50"
                        >
                          <option value="high">Cao</option>
                          <option value="critical">Nghiêm trọng</option>
                        </select>
                      </div>
                    </div>

                    {/* Event 4 */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_160px] items-center gap-3 p-3.5 bg-white">
                      <div>
                        <strong className="text-slate-800 block text-xs">Chuyển tab</strong>
                        <span className="text-[11px] text-slate-400">Mở tab khác hoặc ứng dụng bên ngoài</span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">NGƯỠNG</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={proctoringPolicy.tabSwitchLimit}
                            onChange={(e) =>
                              setProctoringPolicy({
                                ...proctoringPolicy,
                                tabSwitchLimit: Number(e.target.value),
                              })
                            }
                            className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-center font-bold"
                          />
                          <span className="text-slate-500 font-semibold">lần</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">MỨC CẢNH BÁO</label>
                        <select
                          value={proctoringPolicy.tabSwitchSeverity}
                          onChange={(e) =>
                            setProctoringPolicy({
                              ...proctoringPolicy,
                              tabSwitchSeverity: e.target.value as any,
                            })
                          }
                          className="h-9 w-full rounded-lg border border-slate-200 px-2 text-xs font-semibold text-amber-700 bg-amber-50"
                        >
                          <option value="low">Thấp</option>
                          <option value="medium">Trung bình</option>
                          <option value="high">Cao</option>
                          <option value="critical">Nghiêm trọng</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  Website ngoài bị chặn; AI chỉ phát tín hiệu hỗ trợ.
                </p>

                {/* Footer Buttons Step 3 */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Quay lại
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Save className="h-4 w-4 text-slate-500" />
                      Lưu nháp
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 transition cursor-pointer"
                    >
                      Lưu và tiếp tục: Xác nhận →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                BƯỚC 4: XÁC NHẬN & TẠO LỊCH (KIỂM TRA XUNG ĐỘT)
            ════════════════════════════════════════════════════════ */}
            {step === 4 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
                {/* Auto Conflict Check Result */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">
                      Kiểm tra tự động: Không phát hiện xung đột lịch thi
                    </h4>
                    <p className="mt-0.5 text-xs text-emerald-700">
                      Phòng máy <strong className="font-semibold">{room}</strong> và lớp học{' '}
                      <strong className="font-semibold">{selectedClassId}</strong> đều hoàn toàn trống trong khung giờ{' '}
                      <strong className="font-semibold">{startTime} - {calculatedEndTime}</strong> ngày{' '}
                      <strong className="font-semibold">{date}</strong>.
                    </p>
                  </div>
                </div>

                {/* Tổng kết phiếu ca thi */}
                <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 text-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-blue-600 uppercase">
                        {scheduleId || 'EXAM-AUTO'}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{title}</h3>
                    </div>
                    <span className="rounded-full bg-blue-100 text-blue-700 px-3 py-1 font-bold text-xs">
                      Trạng thái: Đã lên lịch
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Lớp học:</span>
                      <strong className="text-slate-800 text-xs">{selectedClassId} - {currentClass?.name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Sĩ số snapshot:</span>
                      <strong className="text-slate-800 text-xs">{currentClass?.students?.length || 48} Sinh viên</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Thời gian thi:</span>
                      <strong className="text-slate-800 text-xs">{date} • {startTime} - {calculatedEndTime}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Thời lượng:</span>
                      <strong className="text-slate-800 text-xs">{durationMinutes} Phút</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Đề thi liên kết:</span>
                      <strong className="text-blue-700 text-xs">{currentTemplate?.title || selectedTemplateId}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Phòng máy:</span>
                      <strong className="text-slate-800 text-xs">{room}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Mã phòng cấp sẵn:</span>
                      <strong className="font-mono text-blue-600 text-xs">{roomCode}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Giám sát AI:</span>
                      <strong className="text-purple-700 text-xs">Webcam + Khóa màn hình</strong>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons Step 4 */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Quay lại sửa
                  </button>

                  <button
                    type="button"
                    onClick={handleFinishCreate}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 transition cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    Hoàn tất &amp; Lưu ca kiểm tra
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

