'use client';

import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Monitor,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

export interface StudentViolationIncident {
  id: string;
  type: string;
  timestamp: string;
  severity: 'medium' | 'high' | 'critical';
  confidence: number; // e.g. 94.5%
  description: string;
  evidenceSnapshot: {
    webcamLabel: string;
    detectedObject: string;
    screenState: string;
    boundingBox?: { x: number; y: number; width: number; height: number };
  };
  status: 'pending' | 'confirmed' | 'rejected';
  penaltyApplied?: number; // e.g. -2.0
  resolutionNote?: string;
  reviewedAt?: string;
}

export interface StudentReportRecord {
  id: string;
  name: string;
  studentClass: string;
  examTitle: string;
  submitTime: string;
  testScore: number; // Điểm chấm tự động ban đầu
  finalScore: number; // Điểm sau khi trừ điểm vi phạm
  passedCases: string;
  isPublished: boolean;
  violations: StudentViolationIncident[];
}

interface ReviewViolationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: StudentReportRecord | null;
  onResolveViolation: (
    studentId: string,
    violationId: string,
    action: 'confirm' | 'reject',
    penalty: number,
    note: string
  ) => void;
  onBatchResolveAll?: (
    studentId: string,
    action: 'confirm' | 'reject',
    totalPenalty: number,
    note: string
  ) => void;
}

export default function ReviewViolationModal({
  isOpen,
  onClose,
  record,
  onResolveViolation,
  onBatchResolveAll,
}: ReviewViolationModalProps) {
  const [selectedIncidentIndex, setSelectedIncidentIndex] = useState(0);
  const [decisionAction, setDecisionAction] = useState<'confirm' | 'reject'>('confirm');
  const [penaltyPoints, setPenaltyPoints] = useState<number>(2.0);
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<'webcam' | 'screen'>('webcam');

  if (!isOpen || !record) return null;

  const incidents = record.violations || [];
  const currentIncident = incidents[selectedIncidentIndex] || incidents[0];

  const handleApplyDecision = () => {
    if (!currentIncident) return;
    const penalty = decisionAction === 'confirm' ? penaltyPoints : 0;
    const note =
      resolutionNote.trim() ||
      (decisionAction === 'confirm'
        ? `Xác nhận vi phạm quy chế thi. Trừ ${penalty} điểm.`
        : 'Bác bỏ cảnh báo AI do nhận diện nhầm, chấp nhận giải trình.');

    onResolveViolation(record.id, currentIncident.id, decisionAction, penalty, note);
    setResolutionNote('');

    // Chuyển sang sự cố tiếp theo nếu còn
    if (selectedIncidentIndex < incidents.length - 1) {
      setSelectedIncidentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleConfirmAll = () => {
    if (!onBatchResolveAll) return;
    onBatchResolveAll(
      record.id,
      'confirm',
      penaltyPoints,
      resolutionNote.trim() || `Xác nhận tất cả vi phạm. Trừ ${penaltyPoints} điểm vào kết quả.`
    );
    onClose();
  };

  const handleRejectAll = () => {
    if (!onBatchResolveAll) return;
    onBatchResolveAll(
      record.id,
      'reject',
      0,
      'Bác bỏ toàn bộ cảnh báo AI, công nhận kết quả làm bài của sinh viên.'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-700/80 bg-slate-900 text-white shadow-2xl transition-all my-auto max-h-[94vh] flex flex-col overflow-hidden">
        {/* ── 1. HEADER MODAL: THÔNG TIN THÍ SINH CẦN DUYỆT ── */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 shrink-0 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">
                  Thẩm Định &amp; Duyệt Cảnh Báo Vi Phạm AI
                </h2>
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/40">
                  {incidents.length} cảnh báo ghi nhận
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Thí sinh: <strong className="text-slate-100">{record.name}</strong> • MSSV:{' '}
                <span className="font-mono text-blue-400 font-bold">{record.id}</span> • Lớp:{' '}
                <span className="text-slate-300">{record.studentClass}</span> • Điểm Test:{' '}
                <strong className="text-emerald-400 font-bold">{record.testScore}/10</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition cursor-pointer"
            title="Đóng modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── 2. NỘI DUNG CHÍNH: DANH SÁCH SỰ CỐ + BẰNG CHỨNG ẢNH CHỤP + HỘI ĐỒNG DUYỆT ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Thanh chọn sự cố nếu có nhiều lần bị cảnh báo */}
          {incidents.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-400 shrink-0">Chọn cảnh báo:</span>
              {incidents.map((inc, idx) => (
                <button
                  key={inc.id}
                  type="button"
                  onClick={() => setSelectedIncidentIndex(idx)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                    selectedIncidentIndex === idx
                      ? 'bg-blue-600 text-white shadow-md'
                      : inc.status === 'confirmed'
                      ? 'bg-red-950/60 text-red-400 border border-red-800'
                      : inc.status === 'rejected'
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>Lần {idx + 1} ({inc.timestamp})</span>
                  {inc.status === 'confirmed' && <span className="text-[10px]">✕ Đã phạt</span>}
                  {inc.status === 'rejected' && <span className="text-[10px]">✓ Bác bỏ</span>}
                  {inc.status === 'pending' && (
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          )}

          {currentIncident ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* CỘT TRÁI (7 Cột): BẰNG CHỨNG ẢNH CHỤP SNAPSHOT (CAMERA & MÀN HÌNH) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveEvidenceTab('webcam')}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition cursor-pointer ${
                        activeEvidenceTab === 'webcam'
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-800/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Camera className="h-3.5 w-3.5 text-amber-400" />
                      <span>Ảnh Webcam AI Snapshot</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEvidenceTab('screen')}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition cursor-pointer ${
                        activeEvidenceTab === 'screen'
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-800/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Monitor className="h-3.5 w-3.5 text-blue-400" />
                      <span>Ảnh Màn hình Code lúc vi phạm</span>
                    </button>
                  </div>

                  <span className="font-mono text-xs text-slate-400 font-semibold">
                    Thời điểm: <strong className="text-white">{currentIncident.timestamp}</strong>
                  </span>
                </div>

                {/* Khung hiển thị Bằng chứng Snapshot chân thực */}
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-950 flex flex-col justify-between shadow-inner">
                  {activeEvidenceTab === 'webcam' ? (
                    <>
                      {/* Giả lập khung hình Webcam chụp lúc AI bắt vi phạm */}
                      <div className="absolute inset-0 bg-radial from-slate-800 to-slate-950 flex items-center justify-center">
                        {/* Hình khối mô phỏng góc nhìn camera học viên */}
                        <div className="relative flex flex-col items-center justify-center text-slate-600">
                          <User className="h-28 w-28 opacity-40 text-slate-400" />
                          <span className="text-xs font-mono text-slate-400 mt-1">
                            Khung hình giám sát Webcam HD (1080p)
                          </span>
                        </div>

                        {/* Bounding Box màu đỏ của AI khoanh vùng vật thể vi phạm */}
                        <div className="absolute top-[28%] right-[22%] w-36 h-36 rounded-xl border-2 border-red-500 bg-red-500/15 animate-pulse flex flex-col justify-between p-1.5 shadow-lg shadow-red-500/20">
                          <span className="self-start rounded bg-red-600 px-1 text-[8.5px] font-black text-white uppercase tracking-wider">
                            AI DETECT: {currentIncident.evidenceSnapshot.detectedObject}
                          </span>
                          <span className="self-end rounded bg-black/80 px-1 text-[8px] font-mono font-bold text-red-300">
                            Conf: {currentIncident.confidence}%
                          </span>
                        </div>
                      </div>

                      {/* Header overlay */}
                      <div className="relative z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-600/90 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                          <AlertTriangle className="h-3 w-3" />
                          Bằng chứng AI Snapshot #{currentIncident.id}
                        </span>
                        <span className="font-mono text-[10px] text-slate-300">
                          Khóa Tab: BẬT • Camera AI: ACTIVED
                        </span>
                      </div>

                      {/* Footer overlay */}
                      <div className="relative z-10 flex items-center justify-between p-3 bg-gradient-to-t from-black/90 to-transparent">
                        <p className="text-[11px] font-medium text-slate-200">
                          Đối tượng phát hiện:{' '}
                          <span className="text-amber-400 font-bold">
                            {currentIncident.evidenceSnapshot.detectedObject}
                          </span>
                        </p>
                        <span className="text-[10px] text-slate-400">
                          Độ tin cậy AI: <strong className="text-white">{currentIncident.confidence}%</strong>
                        </span>
                      </div>
                    </>
                  ) : (
                    /* Tab Màn hình code sinh viên lúc đó */
                    <div className="absolute inset-0 bg-[#1e1e2e] p-4 font-mono text-xs text-slate-300 flex flex-col justify-between overflow-hidden">
                      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 text-slate-400">
                        <span className="text-blue-400 font-bold">solution.cpp • Oculide Sandbox</span>
                        <span className="text-emerald-400 font-semibold">{record.passedCases} Testcases</span>
                      </div>
                      <pre className="text-[11px] text-slate-300 overflow-x-auto py-2 leading-relaxed opacity-90 select-none">
{`#include <iostream>
using namespace std;

// Trạng thái màn hình lúc xảy ra cảnh báo lúc ${currentIncident.timestamp}
// Sinh viên đang thao tác trên IDE Oculide
int main() {
    int n;
    cin >> n;
    // Đang phát hiện nghi vấn gian lận qua camera...
    return 0;
}`}
                      </pre>
                      <div className="border-t border-slate-700/60 pt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Chế độ: Fullscreen Lock (Không chuyển tab)</span>
                        <span className="text-amber-400 font-semibold">Ảnh chụp màn hình đối chiếu</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mô tả cảnh báo của hệ thống */}
                <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-3.5 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400 text-xs">
                      {currentIncident.type}
                    </span>
                    <span className="rounded bg-red-950 px-1.5 py-0.2 text-[9.5px] font-bold text-red-400 border border-red-800">
                      Mức độ: {currentIncident.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11.5px] leading-relaxed">
                    {currentIncident.description}
                  </p>
                </div>
              </div>

              {/* CỘT PHẢI (5 Cột): QUYẾT ĐỊNH & THẨM ĐỊNH CỦA GIẢNG VIÊN */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-800/50 p-4 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700 pb-2">
                    Quyết Định Thẩm Định Của Giảng Viên
                  </h3>

                  {/* Lựa chọn XÁC NHẬN VI PHẠM hoặc BÁC BỎ */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDecisionAction('confirm')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                        decisionAction === 'confirm'
                          ? 'border-red-500 bg-red-500/20 text-white ring-2 ring-red-500/30'
                          : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-750'
                      }`}
                    >
                      <XCircle className="h-5 w-5 text-red-400 mb-1" />
                      <span className="text-xs font-bold">Xác nhận vi phạm</span>
                      <span className="text-[10px] text-slate-400">Trừ điểm / Ghi biên bản</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisionAction('reject')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                        decisionAction === 'reject'
                          ? 'border-emerald-500 bg-emerald-500/20 text-white ring-2 ring-emerald-500/30'
                          : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-750'
                      }`}
                    >
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 mb-1" />
                      <span className="text-xs font-bold">Bác bỏ cảnh báo</span>
                      <span className="text-[10px] text-slate-400">Giữ nguyên điểm tối đa</span>
                    </button>
                  </div>

                  {/* Cấu hình trừ điểm nếu xác nhận vi phạm */}
                  {decisionAction === 'confirm' ? (
                    <div className="mt-4 space-y-2 rounded-xl bg-slate-900/60 p-3 border border-slate-700/60 text-xs">
                      <label className="font-bold text-slate-300 block">
                        Chọn mức trừ điểm vi phạm:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { val: 1.0, label: '-1.0đ (Nhẹ)' },
                          { val: 2.0, label: '-2.0đ (Chuẩn)' },
                          { val: 5.0, label: '-5.0đ (Nặng)' },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setPenaltyPoints(opt.val)}
                            className={`rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
                              penaltyPoints === opt.val
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                        <span>Điểm bài thi dự kiến:</span>
                        <span className="font-bold text-amber-400">
                          {record.testScore} - {penaltyPoints} ={' '}
                          <strong className="text-white text-sm">
                            {Math.max(0, record.testScore - penaltyPoints).toFixed(1)} / 10
                          </strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl bg-emerald-950/30 p-3 border border-emerald-800/40 text-xs space-y-1">
                      <p className="font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Chấp nhận giải trình / Bác bỏ lỗi AI
                      </p>
                      <p className="text-[11px] text-slate-300">
                        Điểm bài thi của thí sinh được giữ nguyên:{' '}
                        <strong className="text-emerald-300 font-bold">{record.testScore} / 10</strong>.
                      </p>
                    </div>
                  )}

                  {/* Lý do / Ghi chú phản hồi cho sinh viên */}
                  <div className="mt-3.5 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Ghi chú của Giảng viên (Hiển thị cho SV xem):</span>
                      <span className="text-[10px] text-slate-500 font-normal">Tùy chọn</span>
                    </label>
                    <textarea
                      rows={2}
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder={
                        decisionAction === 'confirm'
                          ? 'Nhập lý do trừ điểm (VD: Camera phát hiện rõ hình ảnh điện thoại lúc 08:12)...'
                          : 'Nhập ghi chú bác bỏ (VD: Sinh viên có giải trình hợp lý, không phát hiện vi phạm)...'
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Hàng nút bấm thực thi */}
                <div className="pt-3 border-t border-slate-700/80 space-y-2">
                  <button
                    type="button"
                    onClick={handleApplyDecision}
                    className={`w-full rounded-xl py-2.5 text-xs font-bold text-white shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      decisionAction === 'confirm'
                        ? 'bg-red-600 hover:bg-red-700 shadow-red-900/30'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/30'
                    }`}
                  >
                    <span>Lưu Quyết Định Cho Cảnh Báo Này</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  {/* Thao tác hàng loạt cho toàn bộ cảnh báo của thí sinh này */}
                  {incidents.length > 1 && onBatchResolveAll && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleConfirmAll}
                        className="flex-1 rounded-lg border border-red-800 bg-red-950/40 py-1.5 text-[10.5px] font-semibold text-red-300 hover:bg-red-900/50 cursor-pointer text-center"
                      >
                        Phạt tất cả ({incidents.length})
                      </button>
                      <button
                        type="button"
                        onClick={handleRejectAll}
                        className="flex-1 rounded-lg border border-emerald-800 bg-emerald-950/40 py-1.5 text-[10.5px] font-semibold text-emerald-300 hover:bg-emerald-900/50 cursor-pointer text-center"
                      >
                        Bác bỏ tất cả ({incidents.length})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
              <p className="font-bold text-slate-200">Thí sinh này không có vi phạm nào cần thẩm định.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

