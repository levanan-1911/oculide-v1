'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Download,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Layers,
  Send,
  Lock,
  Unlock,
  FileSpreadsheet,
  Sparkles,
  RefreshCcw,
  UserCheck,
  UserX,
  HelpCircle,
} from 'lucide-react';
import ReviewViolationModal, {
  StudentReportRecord,
  StudentViolationIncident,
} from '@/components/instructor/reports/ReviewViolationModal';

const INITIAL_RECORDS: StudentReportRecord[] = [
  {
    id: 'SE184801',
    name: 'Nguyễn Văn An',
    studentClass: 'K27-SE01',
    examTitle: 'Kiểm tra quá trình: Vòng lặp & Mảng 1 chiều',
    submitTime: '08:25:30',
    testScore: 10.0,
    finalScore: 10.0,
    passedCases: '5/5 (100%)',
    isPublished: true,
    violations: [],
  },
  {
    id: 'SE184802',
    name: 'Trần Thị Bình',
    studentClass: 'K27-SE01',
    examTitle: 'Kiểm tra quá trình: Vòng lặp & Mảng 1 chiều',
    submitTime: '08:28:10',
    testScore: 8.5,
    finalScore: 8.5,
    passedCases: '4/5 (80%)',
    isPublished: false,
    violations: [
      {
        id: 'VIO-01',
        type: 'Quay mặt khỏi camera > 10s',
        timestamp: '08:03:40',
        severity: 'medium',
        confidence: 91.2,
        description: 'AI không phát hiện khuôn mặt chính diện với màn hình quá 10 giây.',
        evidenceSnapshot: {
          webcamLabel: 'Webcam HD 1080p',
          detectedObject: 'Quay mặt góc 60 độ về phía trái',
          screenState: 'Đang mở file solution.cpp',
        },
        status: 'pending',
      },
      {
        id: 'VIO-02',
        type: 'Cố ý thao tác thoát toàn màn hình',
        timestamp: '08:18:22',
        severity: 'high',
        confidence: 98.0,
        description: 'Học viên cố tình bấm tổ hợp phím hệ thống Alt+Tab để thoát chế độ khóa màn hình.',
        evidenceSnapshot: {
          webcamLabel: 'Webcam HD 1080p',
          detectedObject: 'Phím tắt hệ thống Alt+Tab',
          screenState: 'Màn hình nháy mất tiêu điểm (Window Blur)',
        },
        status: 'pending',
      },
    ],
  },
  {
    id: 'SE184803',
    name: 'Lê Hoàng Cường',
    studentClass: 'K27-SE02',
    examTitle: 'Kiểm tra quá trình: Vòng lặp & Mảng 1 chiều',
    submitTime: '08:20:00',
    testScore: 9.0,
    finalScore: 9.0,
    passedCases: '4/5 (80%)',
    isPublished: true,
    violations: [],
  },
  {
    id: 'SE184804',
    name: 'Phạm Minh Châu',
    studentClass: 'K27-SE01',
    examTitle: 'Kiểm tra quá trình: Vòng lặp & Mảng 1 chiều',
    submitTime: '08:15:45',
    testScore: 10.0,
    finalScore: 10.0,
    passedCases: '5/5 (100%)',
    isPublished: true,
    violations: [],
  },
  {
    id: 'SE184805',
    name: 'Đặng Tuấn Dương',
    studentClass: 'K27-SE03',
    examTitle: 'Kiểm tra quá trình: Vòng lặp & Mảng 1 chiều',
    submitTime: '08:29:12',
    testScore: 6.0,
    finalScore: 6.0,
    passedCases: '3/5 (60%)',
    isPublished: false,
    violations: [
      {
        id: 'VIO-03',
        type: 'Phát hiện thiết bị di động (Smartphone)',
        timestamp: '08:12:15',
        severity: 'critical',
        confidence: 95.8,
        description: 'AI phát hiện vật thể dạng điện thoại thông minh đặt dưới góc bàn làm bài.',
        evidenceSnapshot: {
          webcamLabel: 'Webcam HD 1080p',
          detectedObject: 'Điện thoại thông minh (Smartphone)',
          screenState: 'Đang gõ code đệ quy fibonacci',
        },
        status: 'pending',
      },
      {
        id: 'VIO-04',
        type: 'Phát hiện khuôn mặt lạ / Người thứ 2',
        timestamp: '08:20:00',
        severity: 'critical',
        confidence: 93.4,
        description: 'AI phát hiện thêm khuôn mặt thứ hai xuất hiện trong khung hình webcam.',
        evidenceSnapshot: {
          webcamLabel: 'Webcam HD 1080p',
          detectedObject: 'Khuôn mặt người thứ 2 phía sau',
          screenState: 'Đang chạy test case 1-3',
        },
        status: 'pending',
      },
    ],
  },
  {
    id: 'SE184806',
    name: 'Vũ Hải Yến',
    studentClass: 'K27-SE01',
    examTitle: 'Kiểm tra quá trình: Vòng lặp & Mảng 1 chiều',
    submitTime: '08:24:40',
    testScore: 8.0,
    finalScore: 8.0,
    passedCases: '4/5 (80%)',
    isPublished: false,
    violations: [
      {
        id: 'VIO-05',
        type: 'Phát hiện khuôn mặt lạ / Người thứ 2',
        timestamp: '08:18:20',
        severity: 'critical',
        confidence: 94.1,
        description: 'AI phát hiện thêm khuôn mặt thứ hai xuất hiện trong khung hình webcam.',
        evidenceSnapshot: {
          webcamLabel: 'Webcam HD 1080p',
          detectedObject: 'Người thứ 2 ghé sát màn hình',
          screenState: 'Đang mở loop_matrix.cpp',
        },
        status: 'pending',
      },
    ],
  },
  {
    id: 'SE184807',
    name: 'Hoàng Quốc Bảo',
    studentClass: 'K27-SE02',
    examTitle: 'Kiểm tra quá trình: Vòng lặp & Mảng 1 chiều',
    submitTime: '08:19:10',
    testScore: 9.5,
    finalScore: 9.5,
    passedCases: '5/5 (100%)',
    isPublished: true,
    violations: [],
  },
  {
    id: 'SE184808',
    name: 'Đỗ Thị Mai',
    studentClass: 'K27-SE01',
    examTitle: 'Kiểm tra quá trình: Vòng lặp & Mảng 1 chiều',
    submitTime: '08:27:00',
    testScore: 7.5,
    finalScore: 7.5,
    passedCases: '3/5 (60%)',
    isPublished: true,
    violations: [],
  },
];

export default function InstructorReportsPage() {
  const [selectedClass, setSelectedClass] = useState('CS101');
  const [records, setRecords] = useState<StudentReportRecord[]>(INITIAL_RECORDS);
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs-review' | 'confirmed' | 'perfect'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewingStudent, setReviewingStudent] = useState<StudentReportRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Thống kê nhanh
  const stats = useMemo(() => {
    const total = records.length;
    const avgScore =
      total > 0
        ? (records.reduce((acc, r) => acc + r.finalScore, 0) / total).toFixed(1)
        : '0.0';
    const passedCount = records.filter((r) => r.finalScore >= 5.0).length;
    const passRate = total > 0 ? ((passedCount / total) * 100).toFixed(0) : '0';
    const studentsWithPendingViolations = records.filter((r) =>
      r.violations.some((v) => v.status === 'pending')
    ).length;
    const publishedCount = records.filter((r) => r.isPublished).length;
    const allPublished = total > 0 && publishedCount === total;

    return {
      total,
      avgScore,
      passedCount,
      passRate,
      studentsWithPendingViolations,
      publishedCount,
      allPublished,
    };
  }, [records]);

  // 2. Lọc danh sách
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (statusFilter === 'needs-review') {
        return r.violations.some((v) => v.status === 'pending');
      }
      if (statusFilter === 'confirmed') {
        return r.violations.some((v) => v.status === 'confirmed');
      }
      if (statusFilter === 'perfect') {
        return r.finalScore === 10.0;
      }
      return true;
    });
  }, [records, searchQuery, statusFilter]);

  // 3. Xử lý thẩm định vi phạm AI (Duyệt từng sự cố)
  const handleResolveViolation = (
    studentId: string,
    violationId: string,
    action: 'confirm' | 'reject',
    penalty: number,
    note: string
  ) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== studentId) return rec;

        const updatedViolations = rec.violations.map((v) => {
          if (v.id === violationId) {
            return {
              ...v,
              status: action === 'confirm' ? ('confirmed' as const) : ('rejected' as const),
              penaltyApplied: penalty,
              resolutionNote: note,
              reviewedAt: new Date().toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            };
          }
          return v;
        });

        // Tính lại điểm số sau khi trừ điểm vi phạm
        const totalPenalty = updatedViolations
          .filter((v) => v.status === 'confirmed')
          .reduce((sum, v) => sum + (v.penaltyApplied || 0), 0);

        const newFinalScore = Math.max(0, rec.testScore - totalPenalty);

        return {
          ...rec,
          finalScore: Number(newFinalScore.toFixed(1)),
          violations: updatedViolations,
        };
      })
    );

    showToast(
      action === 'confirm'
        ? `Đã xác nhận vi phạm cho thí sinh ${studentId} (Trừ ${penalty}đ)`
        : `Đã bác bỏ cảnh báo AI cho thí sinh ${studentId} (Giữ nguyên điểm)`
    );
  };

  // 4. Xử lý thẩm định hàng loạt cho 1 thí sinh
  const handleBatchResolveAll = (
    studentId: string,
    action: 'confirm' | 'reject',
    totalPenalty: number,
    note: string
  ) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== studentId) return rec;

        const updatedViolations = rec.violations.map((v) => ({
          ...v,
          status: action === 'confirm' ? ('confirmed' as const) : ('rejected' as const),
          penaltyApplied: action === 'confirm' ? totalPenalty / rec.violations.length : 0,
          resolutionNote: note,
          reviewedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        }));

        const newFinalScore = Math.max(0, rec.testScore - (action === 'confirm' ? totalPenalty : 0));

        return {
          ...rec,
          finalScore: Number(newFinalScore.toFixed(1)),
          violations: updatedViolations,
        };
      })
    );

    showToast(
      action === 'confirm'
        ? `Đã xác nhận phạt tất cả vi phạm của sinh viên ${studentId}`
        : `Đã bác bỏ tất cả cảnh báo AI của sinh viên ${studentId}`
    );
  };

  // 5. Công bố điểm toàn bộ lớp
  const handleTogglePublishAll = () => {
    const nextState = !stats.allPublished;
    setRecords((prev) =>
      prev.map((r) => ({
        ...r,
        isPublished: nextState,
      }))
    );

    showToast(
      nextState
        ? `Đã CÔNG BỐ ĐIỂM cho toàn bộ sinh viên lớp ${selectedClass}! Sinh viên đã có thể xem điểm.`
        : `Đã ẨN ĐIỂM lớp ${selectedClass}. Sinh viên tạm thời không xem được điểm.`
    );
  };

  // 6. Bật/tắt công bố điểm cho từng sinh viên
  const handleTogglePublishSingle = (studentId: string) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id === studentId) {
          const next = !r.isPublished;
          showToast(
            next
              ? `Đã công bố điểm cho thí sinh ${r.name} (${r.id})`
              : `Đã ẩn điểm thí sinh ${r.name} (${r.id})`
          );
          return { ...r, isPublished: next };
        }
        return r;
      })
    );
  };

  // 7. Xuất file Bảng Điểm CSV thực tế (Tải trực tiếp)
  const handleExportCsv = () => {
    const headers = [
      'MSSV',
      'Họ và Tên',
      'Lớp',
      'Bài thi',
      'Thời gian nộp',
      'Điểm Test Cases',
      'Điểm Trừ Vi Phạm',
      'Điểm Chính Thức',
      'Số Vi Phạm AI',
      'Trạng Thái Duyệt',
      'Công Bố Điểm',
    ];

    const rows = records.map((r) => {
      const penalty = (r.testScore - r.finalScore).toFixed(1);
      const pendingCount = r.violations.filter((v) => v.status === 'pending').length;
      const confirmedCount = r.violations.filter((v) => v.status === 'confirmed').length;

      let reviewStatus = 'Tuân thủ tốt';
      if (pendingCount > 0) reviewStatus = `Chờ duyệt (${pendingCount} vi phạm)`;
      else if (confirmedCount > 0) reviewStatus = `Đã phạt (-${penalty}đ)`;
      else if (r.violations.length > 0) reviewStatus = 'Đã bác bỏ lỗi AI';

      return [
        r.id,
        `"${r.name}"`,
        r.studentClass,
        `"${r.examTitle}"`,
        r.submitTime,
        r.testScore,
        penalty,
        r.finalScore,
        r.violations.length,
        `"${reviewStatus}"`,
        r.isPublished ? 'Đã công bố' : 'Chưa công bố',
      ].join(',');
    });

    // Thêm UTF-8 BOM (\uFEFF) để Excel hiển thị tiếng Việt có dấu chuẩn 100%
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Bang_Diem_${selectedClass}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Đã xuất và tải về thành công bảng điểm lớp ${selectedClass}!`);
  };

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. HEADER BAR: TIÊU ĐỀ + NÚT CÔNG BỐ ĐIỂM TOÀN LỚP + XUẤT CSV ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Kết Quả Điểm Số &amp; Thẩm Định Vi Phạm AI
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
              {selectedClass}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bảng điểm tự động từ Docker Sandbox, cơ chế thẩm định ảnh snapshot vi phạm AI và quyền công bố điểm thi cho sinh viên.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Nút Công Bố / Ẩn Điểm Toàn Bộ Lớp */}
          <button
            type="button"
            onClick={handleTogglePublishAll}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shadow-xs transition cursor-pointer ${
              stats.allPublished
                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
            }`}
            title="Quyết định sinh viên có được xem điểm bài thi trên Dashboard hay không"
          >
            {stats.allPublished ? (
              <>
                <Lock className="h-3.5 w-3.5 text-amber-700" />
                <span>Ẩn Điểm Toàn Lớp</span>
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5" />
                <span>Công Bố Điểm Toàn Lớp</span>
              </>
            )}
          </button>

          {/* Nút Xuất Bảng Điểm CSV Thực Tế */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
            title="Tải về file Excel/CSV chuẩn UTF-8"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Xuất Bảng Điểm Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* ── 2. 4 THẺ THỐNG KÊ NHANH (KPI STATS) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Điểm trung bình */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Điểm trung bình lớp
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.avgScore}</span>
            <span className="text-xs font-semibold text-slate-500">/ 10.0</span>
          </div>
          <p className="mt-1 text-xs text-blue-600 font-medium">Docker Test Cases tự động</p>
        </div>

        {/* Tỷ lệ Đạt */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tỷ lệ Đạt (≥ 5.0)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{stats.passRate}%</span>
            <span className="text-xs font-semibold text-slate-500">
              ({stats.passedCount}/{stats.total} SV)
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Đạt chuẩn đánh giá học phần</p>
        </div>

        {/* Cảnh báo AI Chờ Duyệt (Quan trọng) */}
        <div
          className={`rounded-2xl border p-5 shadow-xs transition ${
            stats.studentsWithPendingViolations > 0
              ? 'border-amber-300 bg-amber-50/40'
              : 'border-slate-200/80 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cảnh báo AI cần duyệt
            </span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                stats.studentsWithPendingViolations > 0
                  ? 'bg-amber-100 text-amber-700 animate-pulse'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                stats.studentsWithPendingViolations > 0 ? 'text-amber-700' : 'text-slate-900'
              }`}
            >
              {stats.studentsWithPendingViolations}
            </span>
            <span className="text-xs font-semibold text-slate-500">thí sinh có nghi vấn</span>
          </div>
          <p className="mt-1 text-xs text-amber-700 font-semibold">
            {stats.studentsWithPendingViolations > 0
              ? 'Cần GV thẩm định trước khi công bố'
              : 'Tất cả vi phạm đã được xử lý'}
          </p>
        </div>

        {/* Trạng thái công bố điểm */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Công bố điểm thi
            </span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                stats.allPublished ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {stats.publishedCount}/{stats.total}
            </span>
            <span className="text-xs font-semibold text-slate-500">sinh viên đã xem</span>
          </div>
          <p className="mt-1 text-xs font-bold text-slate-600">
            {stats.allPublished ? (
              <span className="text-emerald-600">✓ Đã mở điểm cho cả lớp</span>
            ) : (
              <span className="text-amber-600">Đang ẩn một phần ({stats.total - stats.publishedCount} SV)</span>
            )}
          </p>
        </div>
      </div>

      {/* ── 3. BỘ LỌC LỚP & TÌM KIẾM SINH VIÊN ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
        {/* Chọn lớp học */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 mr-1">Lớp:</span>
          {['CS101', 'CS102', 'PRJ301', 'CSD201'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedClass(c)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectedClass === c
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {c}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Lọc theo trạng thái vi phạm */}
          {[
            { id: 'all', label: `Tất cả (${records.length})` },
            {
              id: 'needs-review',
              label: `Chờ duyệt AI (${stats.studentsWithPendingViolations})`,
            },
            { id: 'perfect', label: 'Điểm 10 (2)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`rounded-xl px-2.5 py-1 text-[11.5px] font-bold transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Thanh tìm kiếm MSSV / Tên */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm MSSV hoặc Tên sinh viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full sm:w-64 rounded-xl border border-slate-200/90 bg-slate-50/70 pl-10 pr-3.5 text-xs outline-none transition-all hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ── 4. BẢNG ĐIỂM CHI TIẾT & CÔNG CỤ THẨM ĐỊNH VI PHẠM AI ── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-700 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">MSSV</th>
                <th className="px-5 py-3.5">Họ và Tên</th>
                <th className="px-5 py-3.5 text-center">Nộp bài</th>
                <th className="px-5 py-3.5 text-center">Test Cases</th>
                <th className="px-5 py-3.5 text-center">Điểm Chính Thức</th>
                <th className="px-5 py-3.5">Cảnh báo Vi Phạm AI</th>
                <th className="px-5 py-3.5 text-center">Trạng Thái Công Bố</th>
                <th className="px-5 py-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không tìm thấy sinh viên nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((st) => {
                  const pendingViolations = st.violations.filter((v) => v.status === 'pending');
                  const confirmedViolations = st.violations.filter((v) => v.status === 'confirmed');
                  const rejectedViolations = st.violations.filter((v) => v.status === 'rejected');
                  const hasPending = pendingViolations.length > 0;
                  const penaltyDeducted = (st.testScore - st.finalScore).toFixed(1);

                  return (
                    <tr
                      key={st.id}
                      className={`hover:bg-slate-50/70 transition ${
                        hasPending ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Cột 1: MSSV */}
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        {st.id}
                      </td>

                      {/* Cột 2: Tên & Lớp */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-xs">{st.name}</div>
                        <div className="text-[10.5px] text-slate-400 font-mono">{st.studentClass}</div>
                      </td>

                      {/* Cột 3: Giờ nộp bài */}
                      <td className="px-5 py-4 text-center font-mono text-[11px] text-slate-500">
                        {st.submitTime}
                      </td>

                      {/* Cột 4: Test case */}
                      <td className="px-5 py-4 text-center">
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {st.passedCases}
                        </span>
                      </td>

                      {/* Cột 5: Điểm chính thức */}
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`rounded-lg px-2.5 py-0.5 text-xs font-black ${
                              st.finalScore >= 9.0
                                ? 'bg-emerald-100 text-emerald-800'
                                : st.finalScore >= 7.0
                                ? 'bg-blue-100 text-blue-800'
                                : st.finalScore >= 5.0
                                ? 'bg-slate-100 text-slate-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {st.finalScore.toFixed(1)} / 10
                          </span>
                          {Number(penaltyDeducted) > 0 && (
                            <span className="text-[9.5px] font-bold text-red-600 mt-0.5">
                              (Đã trừ {penaltyDeducted}đ)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cột 6: Báo cáo Vi phạm AI */}
                      <td className="px-5 py-4">
                        {st.violations.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            0 vi phạm (Tuân thủ tốt)
                          </span>
                        ) : hasPending ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-800 border border-amber-300 animate-pulse">
                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                              {pendingViolations.length} cảnh báo chờ thẩm định
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Lỗi: {pendingViolations[0].type}
                            </span>
                          </div>
                        ) : confirmedViolations.length > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10.5px] font-bold text-red-800 border border-red-200">
                            <ShieldAlert className="h-3 w-3 text-red-600" />
                            Đã xác nhận phạt ({confirmedViolations.length} lỗi)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800 border border-emerald-200">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            Đã bác bỏ lỗi AI ({rejectedViolations.length})
                          </span>
                        )}
                      </td>

                      {/* Cột 7: Trạng thái công bố */}
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePublishSingle(st.id)}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition cursor-pointer border ${
                            st.isPublished
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Nhấp để chuyển trạng thái công bố điểm"
                        >
                          {st.isPublished ? '✓ Đã công bố' : 'Chưa công bố'}
                        </button>
                      </td>

                      {/* Cột 8: Nút Thẩm Định Bằng Chứng */}
                      <td className="px-5 py-4 text-right">
                        {st.violations.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setReviewingStudent(st)}
                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-2xs ${
                              hasPending
                                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <Eye className="h-3 w-3" />
                            <span>{hasPending ? 'Thẩm định AI' : 'Xem lại'}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Hợp lệ</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. MODAL XEM BẰNG CHỨNG SNAPSHOT & HỘI ĐỒNG THẨM ĐỊNH VI PHẠM ── */}
      <ReviewViolationModal
        isOpen={Boolean(reviewingStudent)}
        onClose={() => setReviewingStudent(null)}
        record={reviewingStudent}
        onResolveViolation={(studentId, violationId, action, penalty, note) => {
          handleResolveViolation(studentId, violationId, action, penalty, note);
        }}
        onBatchResolveAll={(studentId, action, totalPenalty, note) => {
          handleBatchResolveAll(studentId, action, totalPenalty, note);
        }}
      />
    </div>
  );
}
