'use client';

import React, { useState } from 'react';
import {
  X,
  Video,
  Monitor,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Send,
  Camera,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Laptop,
  CheckCircle2,
  FileCode2,
  Terminal,
  Layers,
  Sparkles,
  Eye,
  Info,
} from 'lucide-react';

export interface StudentDetailInfo {
  id: string;
  name: string;
  status: 'normal' | 'warning' | 'critical' | 'submitted';
  statusText: string;
  violationsCount: number;
  entryTime: string;
  fps: number;
  deviceInfo?: string;
  trustScore: number;
  studentClass: string;
  passedCases: string;
  gazeStatus: string;
  faceDetected: number;
  activeApp: string;
  currentFile: string;
  codeSnippet: string;
  timeline: {
    time: string;
    text: string;
    type: 'info' | 'warning' | 'critical' | 'code';
  }[];
}

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentDetailInfo | null;
  sessionType: 'LAB' | 'EXAM';
  requireCamera: boolean;
  onSendNotice: (studentId: string, studentName: string) => void;
  onRecordViolation: (studentId: string) => void;
  onNextStudent?: () => void;
  onPrevStudent?: () => void;
}

export default function StudentDetailModal({
  isOpen,
  onClose,
  student,
  sessionType,
  requireCamera,
  onSendNotice,
  onRecordViolation,
  onNextStudent,
  onPrevStudent,
}: StudentDetailModalProps) {
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [viewMode, setViewMode] = useState<'screen-pip' | 'split' | 'screen-only'>('screen-pip');
  const [activeTab, setActiveTab] = useState<'info' | 'timeline'>('info');

  if (!isOpen || !student) return null;

  const handleTakeSnapshot = () => {
    setSnapshotTaken(true);
    setTimeout(() => setSnapshotTaken(false), 2500);
  };

  const hasAlert = student.status === 'warning' || student.status === 'critical';
  // Camera hiển thị nếu buổi kiểm tra (bắt buộc) hoặc buổi lab có yêu cầu bật camera
  const showWebcam = sessionType === 'EXAM' || requireCamera;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-5 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-3xl border border-slate-700/70 bg-slate-900 text-white shadow-2xl transition-all my-auto max-h-[96vh] flex flex-col overflow-hidden">
        {/* ── 1. HEADER MODAL: ĐỊNH DANH SINH VIÊN & ĐIỀU HƯỚNG ── */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 shrink-0 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                  {student.name}
                </h2>
                <span className="font-mono text-xs text-blue-400 font-bold bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                  {student.id}
                </span>
                <span className="text-xs text-slate-400 font-medium">({student.studentClass})</span>

                {/* Badge Trạng thái */}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    student.status === 'critical'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : student.status === 'warning'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : student.status === 'submitted'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      hasAlert ? 'bg-red-400 animate-ping' : 'bg-emerald-400'
                    }`}
                  />
                  {student.status === 'critical'
                    ? 'Vi phạm'
                    : student.status === 'warning'
                    ? 'Cảnh báo'
                    : student.status === 'submitted'
                    ? 'Đã nộp bài'
                    : 'Bình thường'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Thiết bị: <strong className="text-slate-200">{student.deviceInfo || 'Thiết bị cá nhân'}</strong> • Vào phòng: <span className="font-mono">{student.entryTime}</span>
              </p>
            </div>
          </div>

          {/* Chọn chế độ hiển thị & Nút chuyển thí sinh */}
          <div className="flex items-center gap-2">
            {/* Bộ chọn layout */}
            {showWebcam && (
              <div className="hidden sm:flex items-center rounded-xl bg-slate-800/80 p-0.5 border border-slate-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('screen-pip')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                    viewMode === 'screen-pip' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Màn hình + Cam (PiP)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                    viewMode === 'split' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Song song
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('screen-only')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                    viewMode === 'screen-only' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Chỉ Màn hình
                </button>
              </div>
            )}

            {/* Chuyển SV */}
            {onPrevStudent && (
              <button
                type="button"
                onClick={onPrevStudent}
                className="flex h-8 items-center gap-1 rounded-xl bg-slate-800 px-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Trước</span>
              </button>
            )}

            {onNextStudent && (
              <button
                type="button"
                onClick={onNextStudent}
                className="flex h-8 items-center gap-1 rounded-xl bg-slate-800 px-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                <span className="hidden sm:inline">Sau</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition cursor-pointer ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── 2. NỘI DUNG CHÍNH: MÀN HÌNH SINH VIÊN + WEBCAM (THEO YÊU CẦU) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          {/* CỘT TRÁI (8 Cột): Khung Màn hình sinh viên + Webcam */}
          <div className="lg:col-span-8 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between space-y-4">
            {/* KHUNG STREAM CHÍNH: MÀN HÌNH SINH VIÊN */}
            <div className="relative aspect-video w-full rounded-2xl bg-black overflow-hidden border border-slate-800 shadow-2xl">
              {/* Giả lập Màn hình làm bài của Sinh viên (Oculide Code IDE) */}
              <div className="absolute inset-0 bg-[#1e1e2e] flex flex-col font-mono text-xs">
                {/* Thanh tab IDE của sinh viên */}
                <div className="flex items-center justify-between bg-[#181825] px-3 py-1.5 border-b border-[#313244] text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 px-2 py-0.5 rounded bg-[#1e1e2e] text-blue-400 font-bold border border-[#313244] flex items-center gap-1">
                      <FileCode2 className="h-3 w-3" />
                      {student.currentFile}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-emerald-400 font-bold">Docker Sandbox #dk-ready</span>
                    <span className="text-slate-500">•</span>
                    <span>Line 24, Col 12</span>
                  </div>
                </div>

                {/* Code Editor Body */}
                <div className="flex-1 p-3 overflow-hidden text-slate-300 space-y-1 text-[11px] font-mono leading-relaxed bg-[#1e1e2e]">
                  <p className="text-slate-500">{`// Đề bài: ${sessionType === 'EXAM' ? 'Kiểm tra quá trình' : 'Bài thực hành Lab'} - Oculide`}</p>
                  <pre className="text-blue-300 font-mono select-none">{student.codeSnippet}</pre>
                </div>

                {/* Terminal Test Runner ở đáy màn hình SV */}
                <div className="h-20 bg-[#11111b] border-t border-[#313244] p-2.5 text-[10px] font-mono text-slate-400 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1 font-bold text-slate-300">
                      <Terminal className="h-3 w-3 text-emerald-400" />
                      Oculide Test Runner
                    </span>
                    <span className="text-emerald-400 font-bold">Passed: {student.passedCases}</span>
                  </div>
                  <p className="text-slate-400">
                    $ g++ -O2 solution.cpp -o solution &amp;&amp; ./solution <span className="text-emerald-400">✓ Testcase 1-4 OK</span>
                  </p>
                </div>
              </div>

              {/* Tag MÀN HÌNH CHIA SẺ LIVE */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-lg bg-black/80 px-2 py-0.5 text-[10px] font-mono text-white backdrop-blur-xs border border-white/10">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span>MÀN HÌNH SV • LIVE</span>
              </div>

              {/* WEBCAM SINH VIÊN (Picture-in-Picture ở góc dưới bên phải) */}
              {showWebcam && viewMode === 'screen-pip' && (
                <div className="absolute bottom-3 right-3 w-44 sm:w-52 aspect-video rounded-xl bg-slate-950 border-2 border-slate-700/80 shadow-2xl overflow-hidden group/cam">
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                    <Video className="h-6 w-6 text-slate-600" />
                  </div>

                  {/* Bounding box trên webcam nhỏ */}
                  <div
                    className={`absolute inset-2 rounded-lg border pointer-events-none ${
                      hasAlert ? 'border-red-500 animate-pulse' : 'border-emerald-400/50'
                    }`}
                  />

                  {/* Tag trên webcam nhỏ */}
                  <div className="absolute top-1 left-1.5 flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.2 text-[9px] font-mono text-white">
                    <span
                      className={`h-1 w-1 rounded-full ${
                        hasAlert ? 'bg-red-400 animate-ping' : 'bg-emerald-400'
                      }`}
                    />
                    <span>CAM • {student.fps} FPS</span>
                  </div>

                  <div className="absolute bottom-1 left-1.5 bg-black/80 px-1.5 py-0.2 rounded text-[9px] font-bold text-white truncate max-w-[120px]">
                    {student.name}
                  </div>
                </div>
              )}

              {/* Thông báo Chụp bằng chứng */}
              {snapshotTaken && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-200">
                  <div className="rounded-2xl bg-black/90 px-4 py-2.5 text-xs font-bold text-emerald-400 border border-emerald-500/40 shadow-xl flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Đã chụp ảnh màn hình và lưu bằng chứng vào báo cáo!</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chế độ chia đôi (Split Mode): Nếu chọn hiển thị song song */}
            {showWebcam && viewMode === 'split' && (
              <div className="aspect-video w-full rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden flex items-center justify-center">
                <Video className="h-10 w-10 text-slate-700" />
                <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/80 px-2 py-0.5 text-[10px] font-mono text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>WEBCAM THÍ SINH • 1080p ({student.fps} FPS)</span>
                </div>
                <div
                  className={`absolute inset-8 rounded-xl border-2 pointer-events-none ${
                    hasAlert ? 'border-red-500 animate-pulse' : 'border-emerald-400/50'
                  }`}
                />
              </div>
            )}

            {/* Thông báo nếu buổi Lab không yêu cầu camera */}
            {!showWebcam && (
              <div className="rounded-2xl border border-blue-900/50 bg-blue-950/30 p-3 text-xs text-blue-300 flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0 text-blue-400" />
                <span>
                  Buổi thực hành Lab đang tắt webcam thí sinh. Giảng viên đang theo dõi tiến độ code trực tiếp qua màn hình.
                </span>
              </div>
            )}

            {/* Thanh công cụ: Chụp bằng chứng + Gửi cảnh báo riêng + Lập biên bản */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleTakeSnapshot}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-white transition border border-slate-700 cursor-pointer"
              >
                <Camera className="h-4 w-4 text-amber-400" />
                Chụp ảnh bằng chứng
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSendNotice(student.id, student.name)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-blue-600/30 transition cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  Gửi cảnh báo riêng
                </button>

                <button
                  type="button"
                  onClick={() => onRecordViolation(student.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-red-600/30 transition cursor-pointer"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Lập biên bản vi phạm
                </button>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (4 Cột): Thông tin định danh & Phân tích gọn gàng */}
          <div className="lg:col-span-4 p-5 space-y-4 bg-slate-900/60">
            {/* 2 Chỉ số chính: Tiến độ Test Case & Cảnh báo */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Tiến độ bài làm
                </span>
                <p className="mt-1 text-lg font-black text-blue-400">{student.passedCases}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Test case đạt</p>
              </div>

              {sessionType === 'EXAM' ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-3 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Cảnh báo vi phạm
                  </span>
                  <p
                    className={`mt-1 text-lg font-black ${
                      student.violationsCount > 0 ? 'text-red-400' : 'text-slate-300'
                    }`}
                  >
                    {student.violationsCount} lần
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Quy chế thi</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-3 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Phiên thực hành
                  </span>
                  <p className="mt-1 text-lg font-black text-emerald-400">Lab Active</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tự do thực hành</p>
                </div>
              )}
            </div>

            {/* Thông tin thiết bị cá nhân & Môi trường thi */}
            <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Thiết bị làm bài:</span>
                <strong className="text-slate-200">{student.deviceInfo || 'Thiết bị cá nhân (BYOD)'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Lớp sinh hoạt:</span>
                <strong className="text-slate-200">{student.studentClass}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Môi trường thi:</span>
                <strong className="text-slate-200">Kiosk Mode (Khóa tab ngoài)</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Thời gian vào phòng:</span>
                <strong className="font-mono text-slate-200">{student.entryTime}</strong>
              </div>
            </div>

            {/* Header Tabs: Thông tin & Timeline */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-800/80 p-1 border border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`flex-1 rounded-lg py-1 font-bold transition cursor-pointer ${
                  activeTab === 'info' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Trạng thái {sessionType === 'EXAM' && '& AI'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 rounded-lg py-1 font-bold transition cursor-pointer ${
                  activeTab === 'timeline' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Nhật ký sự kiện ({student.timeline.length})
              </button>
            </div>

            {/* Tab 1: Trạng thái chi tiết */}
            {activeTab === 'info' && (
              <div className="space-y-2 text-xs">
                {sessionType === 'EXAM' && showWebcam ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Hướng nhìn mắt (Gaze):</span>
                      <span
                        className={`font-bold ${
                          student.gazeStatus.includes('lệch') || student.gazeStatus.includes('Nghiêng')
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {student.gazeStatus}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Khuôn mặt trong webcam:</span>
                      <span
                        className={`font-bold ${
                          student.faceDetected > 1 ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {student.faceDetected} khuôn mặt
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Ứng dụng hoạt động:</span>
                      <span className="font-mono text-blue-400">{student.activeApp}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-3 space-y-1.5 text-slate-300">
                    <p className="font-bold text-slate-200">Buổi thực hành Lab tự do</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Sinh viên đang thao tác giải bài tập trên Oculide IDE. Giảng viên có thể xem trực
                      tiếp code và kết quả chạy thử test cases.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Timeline sự kiện */}
            {activeTab === 'timeline' && (
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {student.timeline.map((evt, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-800/40 p-2.5 text-[11px]"
                  >
                    <span
                      className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${
                        evt.type === 'critical'
                          ? 'bg-red-400 animate-ping'
                          : evt.type === 'warning'
                          ? 'bg-amber-400'
                          : evt.type === 'code'
                          ? 'bg-blue-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-200">{evt.text}</p>
                      <span className="font-mono text-[10px] text-slate-500">{evt.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
