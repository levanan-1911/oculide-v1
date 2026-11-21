'use client';

import React, { useState } from 'react';
import LiveKitVideoFeed from '@/components/livekit/LiveKitVideoFeed';
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
  userId?: number;
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
  videoTrack?: any;
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
  videoTrack,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-2 sm:p-5 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-md border border-slate-300 bg-neutral-950 text-stone-100 shadow-2xl transition-all my-auto max-h-[96vh] flex flex-col overflow-hidden dark:border-white/10">
        {/* ── 1. HEADER MODAL: ĐỊNH DANH SINH VIÊN & ĐIỀU HƯỚNG ── */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 shrink-0 bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/5 text-stone-300 border border-white/10">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-serif font-bold tracking-tight text-stone-100">
                  {student.name}
                </h2>
                <span className="font-mono text-xs text-stone-200 font-bold bg-white/10 px-2 py-0.5 rounded border border-white/10">
                  {student.id}
                </span>
                <span className="text-xs text-stone-400 font-medium">({student.studentClass})</span>

                {/* Badge Trạng thái */}
                <span
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold bg-white/10 text-stone-300 border border-white/10"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      hasAlert ? 'bg-brand' : 'bg-stone-400'
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
              <p className="text-[11px] text-stone-400 mt-0.5">
                Thiết bị: <strong className="text-stone-200">{student.deviceInfo || 'Thiết bị cá nhân'}</strong> • Vào phòng: <span className="font-mono">{student.entryTime}</span>
              </p>
            </div>
          </div>

          {/* Chọn chế độ hiển thị & Nút chuyển thí sinh */}
          <div className="flex items-center gap-2">
            {/* Bộ chọn layout */}
            {showWebcam && (
              <div className="hidden sm:flex items-center rounded-md bg-stone-900/80 p-0.5 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('screen-pip')}
                  className={`rounded px-2.5 py-1 text-[11px] font-serif font-bold transition cursor-pointer ${
                    viewMode === 'screen-pip' ? 'bg-brand text-white' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Màn hình + Cam (PiP)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`rounded px-2.5 py-1 text-[11px] font-serif font-bold transition cursor-pointer ${
                    viewMode === 'split' ? 'bg-brand text-white' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Song song
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('screen-only')}
                  className={`rounded px-2.5 py-1 text-[11px] font-serif font-bold transition cursor-pointer ${
                    viewMode === 'screen-only' ? 'bg-brand text-white' : 'text-stone-400 hover:text-white'
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
                className="flex h-8 items-center gap-1 rounded-md bg-stone-800 px-2.5 text-xs font-semibold text-stone-300 hover:bg-stone-700 hover:text-white transition cursor-pointer border border-white/5"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Trước</span>
              </button>
            )}

            {onNextStudent && (
              <button
                type="button"
                onClick={onNextStudent}
                className="flex h-8 items-center gap-1 rounded-md bg-stone-800 px-2.5 text-xs font-semibold text-stone-300 hover:bg-stone-700 hover:text-white transition cursor-pointer border border-white/5"
              >
                <span className="hidden sm:inline">Sau</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white transition cursor-pointer ml-1 border border-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── 2. NỘI DUNG CHÍNH: MÀN HÌNH SINH VIÊN + WEBCAM ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          {/* CỘT TRÁI (8 Cột): Khung Màn hình sinh viên + Webcam */}
          <div className="lg:col-span-8 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col justify-between space-y-4">
            {/* KHUNG STREAM CHÍNH: MÀN HÌNH SINH VIÊN */}
            <div className="relative aspect-video w-full rounded-md bg-black overflow-hidden border border-white/10 shadow-2xl">
              {/* Giả lập Màn hình làm bài của Sinh viên (Oculide Code IDE) */}
              <div className="absolute inset-0 bg-neutral-950 flex flex-col font-mono text-xs">
                {/* Thanh tab IDE của sinh viên */}
                <div className="flex items-center justify-between bg-neutral-900 px-3 py-1.5 border-b border-white/10 text-[11px] text-stone-400">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-stone-600" />
                    <span className="h-2.5 w-2.5 rounded-full bg-stone-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-stone-400" />
                    <span className="ml-2 px-2 py-0.5 rounded bg-black/40 text-stone-300 font-bold border border-white/10 flex items-center gap-1">
                      <FileCode2 className="h-3 w-3 text-stone-400" />
                      {student.currentFile}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-stone-300 font-bold">Docker Sandbox #dk-ready</span>
                    <span className="text-stone-500">•</span>
                    <span>Line 24, Col 12</span>
                  </div>
                </div>

                {/* Code Editor Body */}
                <div className="flex-1 p-3 overflow-hidden text-stone-300 space-y-1 text-[11px] font-mono leading-relaxed bg-neutral-950">
                  <p className="text-stone-500">{`// Đề bài: ${sessionType === 'EXAM' ? 'Kiểm tra quá trình' : 'Bài thực hành Lab'} - Oculide`}</p>
                  <pre className="text-stone-200 font-mono select-none">{student.codeSnippet}</pre>
                </div>

                {/* Terminal Test Runner ở đáy màn hình SV */}
                <div className="h-20 bg-stone-950 border-t border-white/10 p-2.5 text-[10px] font-mono text-stone-400 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-stone-400">
                    <span className="flex items-center gap-1 font-bold text-stone-300">
                      <Terminal className="h-3 w-3 text-stone-400" />
                      Oculide Test Runner
                    </span>
                    <span className="text-stone-200 font-bold">Passed: {student.passedCases}</span>
                  </div>
                  <p className="text-stone-400">
                    $ g++ -O2 solution.cpp -o solution &amp;&amp; ./solution <span className="text-stone-300">✓ Testcase 1-4 OK</span>
                  </p>
                </div>
              </div>

              {/* Tag MÀN HÌNH CHIA SẺ LIVE */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded bg-black/80 px-2 py-0.5 text-[10px] font-mono text-white backdrop-blur-xs border border-white/10">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-300" />
                <span>MÀN HÌNH SV • LIVE</span>
              </div>

              {/* WEBCAM SINH VIÊN (Picture-in-Picture ở góc dưới bên phải) */}
              {showWebcam && viewMode === 'screen-pip' && (
                <div className="absolute bottom-3 right-3 w-44 sm:w-52 aspect-video rounded-md bg-stone-950 border border-white/20 shadow-2xl overflow-hidden group/cam">
                  {videoTrack ? (
                    <LiveKitVideoFeed
                      track={videoTrack}
                      muted
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-stone-900 flex items-center justify-center">
                      <Video className="h-6 w-6 text-stone-600" />
                    </div>
                  )}

                  {/* Bounding box trên webcam nhỏ */}
                  <div
                    className={`absolute inset-2 rounded border pointer-events-none ${
                      hasAlert ? 'border-slate-800' : 'border-white/20'
                    }`}
                  />

                  {/* Tag trên webcam nhỏ */}
                  <div className="absolute top-1 left-1.5 flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.2 text-[9px] font-mono text-white">
                    <span
                      className={`h-1 w-1 rounded-full ${
                        hasAlert ? 'bg-slate-800' : 'bg-stone-300'
                      }`}
                    />
                    <span>CAM • {student.fps} FPS</span>
                  </div>

                  <div className="absolute bottom-1 left-1.5 bg-black/80 px-1.5 py-0.2 rounded text-[9px] font-serif font-bold text-white truncate max-w-[120px]">
                    {student.name}
                  </div>
                </div>
              )}

              {/* Thông báo Chụp bằng chứng */}
              {snapshotTaken && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center">
                  <div className="rounded-md bg-stone-900 px-4 py-2.5 text-xs font-serif font-bold text-stone-200 border border-white/20 shadow-xl flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Đã chụp ảnh màn hình và lưu bằng chứng vào biên bản!</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chế độ chia đôi (Split Mode): Nếu chọn hiển thị song song */}
            {showWebcam && viewMode === 'split' && (
              <div className="aspect-video w-full rounded-md bg-stone-950 border border-white/10 relative overflow-hidden flex items-center justify-center">
                {videoTrack ? (
                  <LiveKitVideoFeed
                    track={videoTrack}
                    muted
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Video className="h-10 w-10 text-stone-700" />
                )}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded bg-black/80 px-2 py-0.5 text-[10px] font-mono text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-300" />
                  <span>WEBCAM THÍ SINH • 1080p ({student.fps} FPS)</span>
                </div>
                <div
                  className={`absolute inset-8 rounded border pointer-events-none ${
                    hasAlert ? 'border-slate-800' : 'border-white/20'
                  }`}
                />
              </div>
            )}

            {/* Thông báo nếu buổi Lab không yêu cầu camera */}
            {!showWebcam && (
              <div className="rounded-md border border-white/10 bg-stone-900/60 p-3 text-xs text-stone-300 flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0 text-stone-400" />
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
                className="inline-flex items-center gap-1.5 rounded-md bg-stone-800 hover:bg-stone-700 px-3.5 py-2 text-xs font-serif font-bold text-stone-200 transition border border-white/10 cursor-pointer"
              >
                <Camera className="h-4 w-4 text-stone-300" />
                Chụp ảnh bằng chứng
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSendNotice(student.id, student.name)}
                  className="system-primary-action inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-serif font-bold text-white shadow-2xs transition hover:bg-slate-800 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  Gửi cảnh báo riêng
                </button>

                <button
                  type="button"
                  onClick={() => onRecordViolation(student.id)}
                  className="system-primary-action inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-serif font-bold text-white shadow-2xs transition hover:bg-slate-800 cursor-pointer"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Lập biên bản vi phạm
                </button>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (4 Cột): Thông tin định danh & Phân tích gọn gàng */}
          <div className="lg:col-span-4 p-5 space-y-4 bg-neutral-900">
            {/* 2 Chỉ số chính: Tiến độ Test Case & Cảnh báo */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-white/10 bg-stone-900/60 p-3 text-center">
                <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-stone-400">
                  Tiến độ bài làm
                </span>
                <p className="mt-1 text-lg font-mono font-bold text-stone-100">{student.passedCases}</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Test case đạt</p>
              </div>

              {sessionType === 'EXAM' ? (
                <div className="rounded-md border border-white/10 bg-stone-900/60 p-3 text-center">
                  <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-stone-400">
                    Cảnh báo vi phạm
                  </span>
                  <p
                    className="mt-1 text-lg font-mono font-bold text-stone-100"
                  >
                    {student.violationsCount} lần
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">Quy chế thi</p>
                </div>
              ) : (
                <div className="rounded-md border border-white/10 bg-stone-900/60 p-3 text-center">
                  <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-stone-400">
                    Phiên thực hành
                  </span>
                  <p className="mt-1 text-lg font-serif font-bold text-stone-100">Lab Active</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">Tự do thực hành</p>
                </div>
              )}
            </div>

            {/* Thông tin thiết bị cá nhân & Môi trường thi */}
            <div className="rounded-md border border-white/10 bg-stone-900/40 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Lớp sinh hoạt:</span>
                <strong className="text-stone-200 font-serif">{student.studentClass}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Môi trường thi:</span>
                <strong className="text-stone-200">Kiosk Mode (Khóa tab)</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Thời gian vào phòng:</span>
                <strong className="font-mono text-stone-200">{student.entryTime}</strong>
              </div>
            </div>

            {/* Header Tabs: Thông tin & Timeline */}
            <div className="flex items-center gap-1 rounded-md bg-stone-900 p-1 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`flex-1 rounded py-1 font-serif font-bold transition cursor-pointer ${
                  activeTab === 'info' ? 'bg-brand text-white' : 'text-stone-400 hover:text-white'
                }`}
              >
                Trạng thái {sessionType === 'EXAM' && '& AI'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 rounded py-1 font-serif font-bold transition cursor-pointer ${
                  activeTab === 'timeline' ? 'bg-brand text-white' : 'text-stone-400 hover:text-white'
                }`}
              >
                Nhật ký sự kiện ({student.timeline.length})
              </button>
            </div>

            {/* Tab 1: Trạng thái chi tiết */}
            {activeTab === 'info' && (
              <div className="space-y-2 text-xs">
                {sessionType === 'EXAM' && showWebcam ? (
                  <div className="rounded-md border border-white/10 bg-stone-900/40 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">Hướng nhìn mắt (Gaze):</span>
                      <span className="font-semibold text-stone-200">
                        {student.gazeStatus}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">Khuôn mặt trong webcam:</span>
                      <span className="font-semibold text-stone-200">
                        {student.faceDetected} khuôn mặt
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">Ứng dụng hoạt động:</span>
                      <span className="font-mono text-stone-200 font-bold">{student.activeApp}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-white/10 bg-stone-900/40 p-3 space-y-1.5 text-stone-300">
                    <p className="font-serif font-bold text-stone-200">Buổi thực hành Lab tự do</p>
                    <p className="text-[11px] text-stone-400 leading-relaxed">
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
                    className="flex items-start gap-2 rounded-md border border-white/10 bg-stone-900/40 p-2.5 text-[11px]"
                  >
                    <span
                      className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${
                        evt.type === 'critical'
                          ? 'bg-brand'
                          : 'bg-stone-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-200">{evt.text}</p>
                      <span className="font-mono text-[10px] text-stone-500">{evt.time}</span>
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
