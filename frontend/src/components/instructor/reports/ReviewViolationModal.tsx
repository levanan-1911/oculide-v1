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
  ChevronRight,
} from 'lucide-react';

export interface StudentViolationIncident {
  id: string;
  type: string;
  timestamp: string;
  severity: 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  snapshot_url?: string;
  evidenceSnapshot: {
    webcamLabel: string;
    detectedObject: string;
    screenState: string;
    boundingBox?: { x: number; y: number; width: number; height: number };
  };
  status: 'pending' | 'confirmed' | 'rejected';
  penaltyApplied?: number;
  resolutionNote?: string;
  reviewedAt?: string;
}

export interface StudentReportRecord {
  id: string;
  name: string;
  studentClass: string;
  examTitle: string;
  submitTime: string;
  testScore: number;
  finalScore: number;
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
  const [penaltyPoints, setPenaltyPoints] = useState<number>(0);
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<'webcam' | 'screen'>('webcam');

  if (!isOpen || !record) return null;

  const incidents = record.violations || [];
  const currentIncident = incidents[selectedIncidentIndex] || incidents[0];
  const isCurrentDecided = Boolean(currentIncident && currentIncident.status !== 'pending');
  const pendingCount = incidents.filter((i) => i.status === 'pending').length;

  const handleApplyDecision = () => {
    if (!currentIncident || currentIncident.status !== 'pending') return;
    const penalty = decisionAction === 'confirm' ? penaltyPoints : 0;
    const note =
      resolutionNote.trim() ||
      (decisionAction === 'confirm'
        ? `Xác nhận vi phạm quy chế thi. Trừ ${penalty} điểm.`
        : 'Bác bỏ cảnh báo AI do nhận diện nhầm, chấp nhận giải trình.');

    onResolveViolation(record.id, currentIncident.id, decisionAction, penalty, note);
    setResolutionNote('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-md border border-slate-200 bg-white text-slate-900 shadow-2xl transition-all my-auto max-h-[94vh] flex flex-col overflow-hidden dark:border-white/10 dark:bg-slate-900 dark:text-white">
        {/* ── 1. HEADER MODAL: THÔNG TIN THÍ SINH CẦN DUYỆT ── */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0 bg-slate-50 dark:border-white/10 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-200 text-slate-800 border border-slate-300 dark:bg-white/10 dark:text-white dark:border-white/10">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-serif font-bold text-slate-900 dark:text-white">
                  Thẩm Định &amp; Duyệt Cảnh Báo Vi Phạm AI
                </h2>
                <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-mono font-bold text-slate-700 border border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10">
                  {incidents.length} cảnh báo ghi nhận
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Thí sinh: <strong className="text-slate-900 dark:text-white font-serif">{record.name}</strong> • MSSV:{' '}
                <span className="font-mono text-slate-900 dark:text-white font-bold">{record.id}</span> • Lớp:{' '}
                <span className="text-slate-600 dark:text-slate-300 font-mono">{record.studentClass}</span> • Điểm Test:{' '}
                <strong className="text-slate-900 dark:text-white font-mono font-bold">{record.testScore}/10</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer border border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20 dark:border-white/10"
            title="Đóng modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── 2. NỘI DUNG CHÍNH: DANH SÁCH SỰ CỐ + BẰNG CHỨNG ẢNH CHỤP + HỘI ĐỒNG DUYỆT ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Thanh chọn sự cố nếu có nhiều lần bị cảnh báo */}
          {incidents.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-serif font-bold text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">Chọn cảnh báo:</span>
              {incidents.map((inc, idx) => (
                <button
                  key={inc.id}
                  type="button"
                  onClick={() => setSelectedIncidentIndex(idx)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-serif font-bold transition cursor-pointer shrink-0 ${
                    selectedIncidentIndex === idx
                      ? 'bg-brand text-white shadow-2xs'
                      : inc.status === 'confirmed'
                      ? 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-white/10 dark:text-slate-300 dark:border-white/20'
                      : inc.status === 'rejected'
                      ? 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-white/5 dark:text-slate-400'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="font-mono">Lần {idx + 1} ({inc.timestamp})</span>
                  {inc.status === 'confirmed' && <span className="text-[10px]">✕ Đã phạt</span>}
                  {inc.status === 'rejected' && <span className="text-[10px]">✓ Bác bỏ</span>}
                  {inc.status === 'pending' && (
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                  )}
                </button>
              ))}
            </div>
          )}

          {currentIncident ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* CỘT TRÁI (7 Cột): BẰNG CHỨNG ẢNH CHỤP SNAPSHOT (CAMERA & MÀN HÌNH) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveEvidenceTab('webcam')}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-serif font-bold transition cursor-pointer ${
                        activeEvidenceTab === 'webcam'
                          ? 'bg-brand text-white'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      <Camera className="h-3.5 w-3.5 shrink-0" />
                      <span>Ảnh Webcam AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEvidenceTab('screen')}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-serif font-bold transition cursor-pointer ${
                        activeEvidenceTab === 'screen'
                          ? 'bg-brand text-white'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      <Monitor className="h-3.5 w-3.5 shrink-0" />
                      <span>Màn hình Code</span>
                    </button>
                  </div>

                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap shrink-0">
                    Thời điểm: <strong className="text-slate-900 dark:text-white">{currentIncident.timestamp}</strong>
                  </span>
                </div>

                {/* Khung hiển thị Bằng chứng Snapshot */}
                <div className="relative aspect-video w-full overflow-hidden rounded-md border border-slate-200 bg-slate-950 flex flex-col justify-between shadow-inner dark:border-white/10">
                  {activeEvidenceTab === 'webcam' ? (
                    <>
                      {currentIncident.snapshot_url ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={currentIncident.snapshot_url}
                            alt="AI Snapshot Bằng chứng"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                          <div className="relative flex flex-col items-center justify-center text-slate-500">
                            <User className="h-28 w-28 opacity-40 text-slate-400" />
                            <span className="text-xs font-mono text-slate-400 mt-1">
                              Khung hình giám sát Webcam HD (1080p)
                            </span>
                          </div>

                          {/* Bounding Box trung tính */}
                          <div className="absolute top-[28%] right-[22%] w-36 h-36 rounded border-2 border-slate-400 bg-slate-800/40 flex flex-col justify-between p-1.5 shadow-md">
                            <span className="self-start rounded bg-slate-800 px-1 text-[8.5px] font-mono font-bold text-white uppercase tracking-wider">
                              AI DETECT: {currentIncident.evidenceSnapshot.detectedObject}
                            </span>
                            <span className="self-end rounded bg-black/80 px-1 text-[8px] font-mono font-bold text-slate-200">
                              Conf: {currentIncident.confidence}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Header overlay */}
                      <div className="relative z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
                        <span className="inline-flex items-center gap-1.5 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold text-white uppercase border border-slate-700">
                          <AlertTriangle className="h-3 w-3" />
                          Bằng chứng AI Snapshot #{currentIncident.id}
                        </span>
                        <span className="font-mono text-[10px] text-slate-300">
                          Khóa Tab: BẬT • Camera AI: Đang giám sát
                        </span>
                      </div>

                      {/* Footer overlay */}
                      <div className="relative z-10 flex items-center justify-between p-3 bg-gradient-to-t from-black/90 to-transparent">
                        <p className="text-[11px] font-medium text-slate-200">
                          Đối tượng phát hiện:{' '}
                          <span className="text-white font-bold font-serif">
                            {currentIncident.evidenceSnapshot.detectedObject}
                          </span>
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Độ tin cậy AI: <strong className="text-white">{currentIncident.confidence}%</strong>
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-slate-900 p-4 font-mono text-xs text-slate-300 flex flex-col justify-between overflow-hidden">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 text-slate-400">
                        <span className="text-slate-200 font-bold">solution.cpp • Oculide Sandbox</span>
                        <span className="text-slate-300 font-semibold">{record.passedCases}</span>
                      </div>
                      <pre className="text-[11px] text-slate-300 overflow-x-auto py-2 leading-relaxed opacity-90 select-none">
{`#include <iostream>
using namespace std;

// Trạng thái màn hình lúc xảy ra cảnh báo lúc ${currentIncident.timestamp}
// Sinh viên đang thao tác trên IDE Oculide
int main() {
    int n;
    cin >> n;
    // Bằng chứng giám sát màn hình ghi nhận thời điểm vi phạm
    return 0;
}`}
                      </pre>
                      <div className="border-t border-white/10 pt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Chế độ: Fullscreen Lock (Không chuyển tab)</span>
                        <span className="text-slate-300 font-semibold font-serif">Ảnh chụp màn hình đối chiếu</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mô tả cảnh báo của hệ thống */}
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1 dark:border-white/10 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-slate-900 dark:text-white text-xs">
                      {currentIncident.type}
                    </span>
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-slate-700 border border-slate-300 dark:bg-white/10 dark:text-slate-300 dark:border-white/10">
                      Mức độ: {currentIncident.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed">
                    {currentIncident.description}
                  </p>
                </div>
              </div>

              {/* CỘT PHẢI (5 Cột): QUYẾT ĐỊNH & THẨM ĐỊNH CỦA GIẢNG VIÊN */}
              <div className="lg:col-span-5 rounded-md border border-slate-200 bg-slate-50 p-4 space-y-4 flex flex-col justify-between dark:border-white/10 dark:bg-slate-800/40">
                <div>
                  <h3 className="text-xs font-serif font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-white/10 pb-2">
                    Quyết Định Thẩm Định Của Giảng Viên
                  </h3>

                  {isCurrentDecided ? (
                    <div className="mt-4 space-y-3 rounded-md border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
                      <div className="flex items-center gap-2">
                        {currentIncident.status === 'confirmed' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-serif font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40">
                            <XCircle className="h-4 w-4 shrink-0" />
                            <span>Đã xác nhận vi phạm</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-serif font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>Đã bác bỏ cảnh báo</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {currentIncident.resolutionNote ||
                          (currentIncident.status === 'confirmed'
                            ? 'Cảnh báo này đã được giảng viên xác nhận lập biên bản.'
                            : 'Cảnh báo này đã được giảng viên bác bỏ.')}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/10">
                        Quyết định đã được chốt và khóa chỉnh sửa.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Lựa chọn XÁC NHẬN VI PHẠM hoặc BÁC BỎ */}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDecisionAction('confirm')}
                          className={`flex flex-col items-center justify-center p-3 rounded-md border text-center transition cursor-pointer ${
                            decisionAction === 'confirm'
                              ? 'border-brand bg-brand/10 text-slate-900 font-bold dark:border-brand dark:bg-brand/20 dark:text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                          }`}
                        >
                          <XCircle className="h-5 w-5 text-slate-700 dark:text-slate-300 mb-1" />
                          <span className="text-xs font-serif font-bold whitespace-nowrap">Xác nhận vi phạm</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">Trừ điểm / Ghi biên bản</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDecisionAction('reject')}
                          className={`flex flex-col items-center justify-center p-3 rounded-md border text-center transition cursor-pointer ${
                            decisionAction === 'reject'
                              ? 'border-brand bg-brand/10 text-slate-900 font-bold dark:border-brand dark:bg-brand/20 dark:text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                          }`}
                        >
                          <CheckCircle2 className="h-5 w-5 text-slate-700 dark:text-slate-300 mb-1" />
                          <span className="text-xs font-serif font-bold whitespace-nowrap">Bác bỏ cảnh báo</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">Giữ nguyên điểm bài làm</span>
                        </button>
                      </div>

                      {/* Cấu hình trừ điểm nếu xác nhận vi phạm */}
                      {decisionAction === 'confirm' ? (
                        <div className="mt-4 space-y-2 rounded-md bg-white p-3 border border-slate-200 text-xs dark:bg-slate-900 dark:border-white/10">
                          <label className="font-serif font-bold text-slate-700 dark:text-slate-300 block">
                            Chọn mức trừ điểm vi phạm:
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { val: 1.0, label: '-1.0đ (Nhẹ)' },
                              { val: 2.0, label: '-2.0đ (Chuẩn)' },
                              { val: 5.0, label: '-5.0đ (Nặng)' },
                            ].map((opt) => (
                              <button
                                key={opt.val}
                                type="button"
                                onClick={() => setPenaltyPoints(opt.val)}
                                className={`flex-1 min-w-[95px] whitespace-nowrap rounded px-2 py-1.5 text-[11px] font-mono font-bold transition cursor-pointer border ${
                                  penaltyPoints === opt.val
                                    ? 'bg-brand text-white border-brand'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>

                          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-white/10">
                            <span>Điểm bài thi dự kiến:</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {record.testScore} - {penaltyPoints} ={' '}
                              <strong className="text-slate-900 dark:text-white text-sm">
                                {Math.max(0, record.testScore - penaltyPoints).toFixed(1)} / 10
                              </strong>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-md bg-white p-3 border border-slate-200 text-xs space-y-1 dark:bg-slate-900 dark:border-white/10">
                          <p className="font-serif font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                            <span>Chấp nhận giải trình / Bác bỏ lỗi AI</span>
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                            Điểm bài thi của thí sinh được giữ nguyên:{' '}
                            <strong className="text-slate-900 dark:text-white font-mono font-bold">{record.testScore} / 10</strong>.
                          </p>
                        </div>
                      )}

                      {/* Lý do / Ghi chú phản hồi cho sinh viên */}
                      <div className="mt-3.5 space-y-1.5">
                        <label className="text-xs font-serif font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2">
                          <span>Ghi chú cho sinh viên:</span>
                          <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap shrink-0">Tùy chọn</span>
                        </label>
                        <textarea
                          rows={2}
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          placeholder={
                            decisionAction === 'confirm'
                              ? 'Nhập lý do trừ điểm (VD: Camera phát hiện rõ hình ảnh vi phạm)...'
                              : 'Nhập ghi chú bác bỏ (VD: Sinh viên có giải trình hợp lý)...'
                          }
                          className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-brand-600 focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Hàng nút bấm thực thi */}
                <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
                  {isCurrentDecided ? (
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full rounded-md border border-slate-300 bg-white py-2 text-xs font-serif font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      Đóng
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleApplyDecision}
                        className="system-primary-action w-full rounded-md py-2.5 text-xs font-serif font-bold text-white shadow-2xs transition cursor-pointer flex items-center justify-center gap-1.5 bg-brand hover:bg-brand/90 whitespace-nowrap"
                      >
                        <span>Lưu Quyết Định Cho Cảnh Báo Này</span>
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      </button>

                      {/* Thao tác hàng loạt cho các cảnh báo chưa duyệt */}
                      {pendingCount > 1 && onBatchResolveAll && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleConfirmAll}
                            className="flex-1 whitespace-nowrap rounded-md border border-slate-200 bg-white py-1.5 px-2 text-[11px] font-serif font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer text-center dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                          >
                            Phạt tất cả chờ duyệt ({pendingCount})
                          </button>
                          <button
                            type="button"
                            onClick={handleRejectAll}
                            className="flex-1 whitespace-nowrap rounded-md border border-slate-200 bg-white py-1.5 px-2 text-[11px] font-serif font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer text-center dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                          >
                            Bác bỏ tất cả ({pendingCount})
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="font-serif font-bold text-slate-800 dark:text-slate-200">Thí sinh này không có vi phạm nào cần thẩm định.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
