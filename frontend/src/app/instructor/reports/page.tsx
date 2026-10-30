'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Download,
  AlertTriangle,
  CheckCircle2,
  Search,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Layers,
  Lock,
  Unlock,
  Sparkles,
  UserCheck,
  Clock,
  CalendarDays,
  Users,
  BarChart3,
} from 'lucide-react';
import ReviewViolationModal, {
  StudentReportRecord,
} from '@/components/instructor/reports/ReviewViolationModal';

// Dùng lại đúng 8 sinh viên, điểm số và các cảnh báo AI từ code Reports cũ của bạn.
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

type AttendanceStatus = 'ontime' | 'late' | 'absent' | 'not_arrived';

type AttendanceRecord = {
  studentId: string;
  name: string;
  studentClass: string;
  checkInTime: string | null;
  lateMinutes: number | null;
  status: AttendanceStatus;
};

type ScoreBandDefinition = {
  id: string;
  label: string;
  min: number;
  max: number;
  inclusiveMax?: boolean;
};

// Dữ liệu demo phục vụ thử giao diện. Khi tích hợp API, thay bằng dữ liệu chuyên cần thực tế.
const REPORT_SESSIONS = [
  {
    id: 'session-01',
    label: 'Kiểm tra quá trình: Vòng lặp & Mảng 1 chiều',
    startTime: '08:00',
    dateLabel: '29/10/2026',
    gracePeriodMinutes: 5,
  },
];

// 8 sinh viên đầu trùng với INITIAL_RECORDS cũ. SE184809 và SE184810 là 2 hồ sơ demo bổ sung
// chỉ để minh họa trường hợp vắng mặt; code cũ không có dữ liệu điểm danh cho các bạn này.
const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  { studentId: 'SE184801', name: 'Nguyễn Văn An', studentClass: 'K27-SE01', checkInTime: '08:00', lateMinutes: 0, status: 'ontime' },
  { studentId: 'SE184802', name: 'Trần Thị Bình', studentClass: 'K27-SE01', checkInTime: '08:12', lateMinutes: 12, status: 'late' },
  { studentId: 'SE184803', name: 'Lê Hoàng Cường', studentClass: 'K27-SE02', checkInTime: '08:08', lateMinutes: 8, status: 'late' },
  { studentId: 'SE184804', name: 'Phạm Minh Châu', studentClass: 'K27-SE01', checkInTime: '07:58', lateMinutes: 0, status: 'ontime' },
  { studentId: 'SE184805', name: 'Đặng Tuấn Dương', studentClass: 'K27-SE03', checkInTime: '08:20', lateMinutes: 20, status: 'late' },
  { studentId: 'SE184806', name: 'Vũ Hải Yến', studentClass: 'K27-SE01', checkInTime: '08:03', lateMinutes: 0, status: 'ontime' },
  { studentId: 'SE184807', name: 'Hoàng Quốc Bảo', studentClass: 'K27-SE02', checkInTime: '08:09', lateMinutes: 9, status: 'late' },
  { studentId: 'SE184808', name: 'Đỗ Thị Mai', studentClass: 'K27-SE01', checkInTime: '07:59', lateMinutes: 0, status: 'ontime' },
  { studentId: 'SE184809', name: 'Trần Minh Phúc', studentClass: 'K27-SE02', checkInTime: null, lateMinutes: null, status: 'absent' },
  { studentId: 'SE184810', name: 'Ngô Khánh Linh', studentClass: 'K27-SE03', checkInTime: null, lateMinutes: null, status: 'absent' },
];

const SCORE_BANDS: ScoreBandDefinition[] = [
  { id: '0-2', label: '0 – dưới 2', min: 0, max: 2 },
  { id: '2-4', label: '2 – dưới 4', min: 2, max: 4 },
  { id: '4-6', label: '4 – dưới 6', min: 4, max: 6 },
  { id: '6-8', label: '6 – dưới 8', min: 6, max: 8 },
  { id: '8-9', label: '8 – dưới 9', min: 8, max: 9 },
  { id: '9-10', label: '9 – 10', min: 9, max: 10, inclusiveMax: true },
];

export default function InstructorReportsPage() {
  const [selectedClass, setSelectedClass] = useState('CS101');
  const [selectedSession, setSelectedSession] = useState('session-01');
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'attendance' | 'scores' | 'results'>('overview');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | AttendanceStatus>('all');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [selectedScoreBand, setSelectedScoreBand] = useState('all');
  const [records, setRecords] = useState<StudentReportRecord[]>(INITIAL_RECORDS);
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs-review' | 'confirmed' | 'perfect'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewingStudent, setReviewingStudent] = useState<StudentReportRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ZIP hiện chỉ có dữ liệu demo cho CS101 / session-01. Các lựa chọn khác hiển thị trạng thái chưa có dữ liệu.
  const hasDemoDataset = selectedClass === 'CS101' && selectedSession === 'session-01';
  const currentRecords = useMemo(
    () => (hasDemoDataset ? records : []),
    [hasDemoDataset, records]
  );
  const attendanceRecords = useMemo(
    () => (hasDemoDataset ? INITIAL_ATTENDANCE : []),
    [hasDemoDataset]
  );
  const selectedSessionInfo = REPORT_SESSIONS.find((session) => session.id === selectedSession);

  const attendanceStats = useMemo(() => ({
    total: attendanceRecords.length,
    ontime: attendanceRecords.filter((item) => item.status === 'ontime').length,
    late: attendanceRecords.filter((item) => item.status === 'late').length,
    absent: attendanceRecords.filter((item) => item.status === 'absent').length,
    notArrived: attendanceRecords.filter((item) => item.status === 'not_arrived').length,
  }), [attendanceRecords]);

  const filteredAttendance = useMemo(() => {
    const query = attendanceSearch.trim().toLowerCase();
    return attendanceRecords.filter((student) => {
      const matchesStatus = attendanceFilter === 'all' || student.status === attendanceFilter;
      const matchesSearch = !query ||
        student.studentId.toLowerCase().includes(query) ||
        student.name.toLowerCase().includes(query) ||
        student.studentClass.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [attendanceRecords, attendanceFilter, attendanceSearch]);

  const scoreDistribution = useMemo(() => SCORE_BANDS.map((band) => ({
    ...band,
    count: currentRecords.filter((student) =>
      student.finalScore >= band.min &&
      (band.inclusiveMax ? student.finalScore <= band.max : student.finalScore < band.max)
    ).length,
  })), [currentRecords]);

  const selectedScoreBandInfo = SCORE_BANDS.find((band) => band.id === selectedScoreBand);
  const selectedScoreStudents = useMemo(() => {
    if (!selectedScoreBandInfo) return currentRecords;
    return currentRecords.filter((student) =>
      student.finalScore >= selectedScoreBandInfo.min &&
      (selectedScoreBandInfo.inclusiveMax
        ? student.finalScore <= selectedScoreBandInfo.max
        : student.finalScore < selectedScoreBandInfo.max)
    );
  }, [currentRecords, selectedScoreBandInfo]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Thống kê nhanh
  const stats = useMemo(() => {
    const total = currentRecords.length;
    const avgScore =
      total > 0
        ? (currentRecords.reduce((acc, r) => acc + r.finalScore, 0) / total).toFixed(1)
        : '0.0';
    const passedCount = currentRecords.filter((r) => r.finalScore >= 5.0).length;
    const passRate = total > 0 ? ((passedCount / total) * 100).toFixed(0) : '0';
    const studentsWithPendingViolations = currentRecords.filter((r) =>
      r.violations.some((v) => v.status === 'pending')
    ).length;
    const publishedCount = currentRecords.filter((r) => r.isPublished).length;
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
  }, [currentRecords]);

  // 2. Lọc danh sách
  const filteredRecords = useMemo(() => {
    return currentRecords.filter((r) => {
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
  }, [currentRecords, searchQuery, statusFilter]);

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
    if (currentRecords.length === 0) {
      showToast('Chưa có dữ liệu điểm cho học phần / phiên đã chọn.');
      return;
    }
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
    if (currentRecords.length === 0) {
      showToast('Chưa có dữ liệu điểm cho học phần / phiên đã chọn.');
      return;
    }

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

    const rows = currentRecords.map((r) => {
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
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast(`Đã xuất và tải về thành công bảng điểm lớp ${selectedClass}!`);
  };

  const handleExportAttendanceCsv = () => {
    if (attendanceRecords.length === 0) {
      showToast('Chưa có dữ liệu chuyên cần cho học phần / phiên đã chọn.');
      return;
    }

    const headers = ['MSSV', 'Họ và Tên', 'Lớp', 'Giờ vào phòng', 'Độ trễ (phút)', 'Trạng thái', 'Bài làm'];
    const rows = attendanceRecords.map((student) => {
      const matchingSubmission = currentRecords.find((record) => record.id === student.studentId);
      const statusLabel = {
        ontime: 'Đúng giờ',
        late: 'Đi muộn',
        absent: 'Vắng',
        not_arrived: 'Chưa vào phòng',
      }[student.status];
      return [
        student.studentId,
        `"${student.name.replace(/"/g, '""')}"`,
        student.studentClass,
        student.checkInTime ?? '',
        student.lateMinutes ?? '',
        statusLabel,
        matchingSubmission ? 'Đã nộp' : student.status === 'absent' ? 'Chưa nộp' : 'Chưa có dữ liệu',
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Chuyen_Can_${selectedClass}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Đã xuất danh sách chuyên cần của ${selectedClass}.`);
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
              Kết quả &amp; Báo cáo phiên làm bài
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
              {selectedClass}
            </span>
          </div>
        </div>

        {activeReportTab === 'results' && (
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
        )}
      </div>

      {/* Bộ lọc phạm vi báo cáo áp dụng cho cả bốn tab */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-600">Học phần</span>
          <select
            value={selectedClass}
            onChange={(event) => setSelectedClass(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          >
            <option value="CS101">CS101 — Nhập môn lập trình (có dữ liệu mẫu)</option>
            <option value="CS102">CS102</option>
            <option value="PRJ301">PRJ301</option>
            <option value="CSD201">CSD201</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-600">Phiên làm bài</span>
          <select
            value={selectedSession}
            onChange={(event) => setSelectedSession(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          >
            {REPORT_SESSIONS.map((session) => (
              <option key={session.id} value={session.id}>{session.label}</option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Ngày: {selectedSessionInfo?.dateLabel ?? '—'}</span>
          <span>•</span>
          <Clock className="h-3.5 w-3.5" />
          <span>Bắt đầu: {selectedSessionInfo?.startTime ?? '—'}</span>
          <span>•</span>
          <span>Hạn đi muộn: {selectedSessionInfo?.gracePeriodMinutes ?? 0} phút</span>
        </div>
      </div>

      {/* Điều hướng báo cáo */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xs" role="tablist" aria-label="Các loại báo cáo">
        {[
          { id: 'overview', label: 'Tổng quan', icon: Layers },
          { id: 'attendance', label: 'Chuyên cần', icon: UserCheck },
          { id: 'scores', label: 'Phổ điểm', icon: BarChart3 },
          { id: 'results', label: 'Bảng điểm & Vi phạm AI', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveReportTab(tab.id as typeof activeReportTab)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      { !hasDemoDataset && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
          Chưa có dữ liệu mẫu cho học phần hoặc phiên đã chọn. Bản thử nghiệm hiện chỉ có dữ liệu minh họa cho CS101 / phiên kiểm tra quá trình.
        </div>
      )}

      {/* ── 2. THỐNG KÊ NHANH ── */}
      {(activeReportTab === 'overview' || activeReportTab === 'results') && (
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
            <span className="text-xs font-semibold text-slate-500">sinh viên đã công bố</span>
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
      )}

      {/* Tổng quan: chuyên cần + phổ điểm tóm tắt */}
      {activeReportTab === 'overview' && hasDemoDataset && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Chuyên cần phiên làm bài</h2>
                <p className="mt-1 text-xs text-slate-500">{attendanceStats.total} sinh viên trong danh sách demo</p>
              </div>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button type="button" onClick={() => { setAttendanceFilter('ontime'); setActiveReportTab('attendance'); }} className="rounded-xl bg-emerald-50 p-3 text-left hover:ring-2 hover:ring-emerald-200">
                <span className="text-[11px] font-semibold text-emerald-700">Đúng giờ</span>
                <span className="mt-1 block text-2xl font-black text-emerald-700">{attendanceStats.ontime}</span>
              </button>
              <button type="button" onClick={() => { setAttendanceFilter('late'); setActiveReportTab('attendance'); }} className="rounded-xl bg-amber-50 p-3 text-left hover:ring-2 hover:ring-amber-200">
                <span className="text-[11px] font-semibold text-amber-700">Đi muộn</span>
                <span className="mt-1 block text-2xl font-black text-amber-700">{attendanceStats.late}</span>
              </button>
              <button type="button" onClick={() => { setAttendanceFilter('absent'); setActiveReportTab('attendance'); }} className="rounded-xl bg-red-50 p-3 text-left hover:ring-2 hover:ring-red-200">
                <span className="text-[11px] font-semibold text-red-700">Vắng</span>
                <span className="mt-1 block text-2xl font-black text-red-700">{attendanceStats.absent}</span>
              </button>
            </div>
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100" aria-label="Tỷ lệ chuyên cần">
              <div className="bg-emerald-500" style={{ width: `${attendanceStats.total ? attendanceStats.ontime / attendanceStats.total * 100 : 0}%` }} />
              <div className="bg-amber-500" style={{ width: `${attendanceStats.total ? attendanceStats.late / attendanceStats.total * 100 : 0}%` }} />
              <div className="bg-red-500" style={{ width: `${attendanceStats.total ? attendanceStats.absent / attendanceStats.total * 100 : 0}%` }} />
            </div>
            <button type="button" onClick={() => setActiveReportTab('attendance')} className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-800">Xem danh sách chuyên cần →</button>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Phổ điểm phiên</h2>
                <p className="mt-1 text-xs text-slate-500">Điểm chính thức của {currentRecords.length} bài có kết quả</p>
              </div>
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="mt-4 space-y-3">
              {scoreDistribution.map((band) => (
                <button key={band.id} type="button" onClick={() => { setSelectedScoreBand(band.id); setActiveReportTab('scores'); }} className="block w-full text-left">
                  <div className="mb-1 flex justify-between gap-3 text-[11px]"><span className="text-slate-600">{band.label}</span><span className="font-bold text-slate-800">{band.count} SV</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${currentRecords.length ? band.count / Math.max(...scoreDistribution.map((item) => item.count), 1) * 100 : 0}%` }} /></div>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setActiveReportTab('scores')} className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-800">Xem phổ điểm chi tiết →</button>
          </section>
        </div>
      )}

      {/* Tab chuyên cần */}
      {activeReportTab === 'attendance' && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { id: 'all', label: 'Tổng sinh viên', count: attendanceStats.total, tone: 'slate' },
              { id: 'ontime', label: 'Đúng giờ', count: attendanceStats.ontime, tone: 'emerald' },
              { id: 'late', label: 'Đi muộn', count: attendanceStats.late, tone: 'amber' },
              { id: 'absent', label: 'Vắng', count: attendanceStats.absent, tone: 'red' },
            ].map((item) => (
              <button key={item.id} type="button" onClick={() => setAttendanceFilter(item.id as typeof attendanceFilter)} className={`rounded-2xl border bg-white p-4 text-left shadow-xs transition hover:-translate-y-0.5 ${attendanceFilter === item.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200/80'}`}>
                <span className="text-xs font-semibold text-slate-500">{item.label}</span>
                <span className="mt-2 block text-2xl font-black text-slate-900">{item.count}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Danh sách chuyên cần</h2>
                <p className="mt-1 text-xs text-slate-500">Phân loại: đúng giờ trong thời gian hạn {selectedSessionInfo?.gracePeriodMinutes ?? 5} phút; vắng chỉ chốt sau khi phiên kết thúc.</p>
              </div>
              <button type="button" onClick={handleExportAttendanceCsv} disabled={attendanceRecords.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                <Download className="h-4 w-4" /> Xuất chuyên cần CSV
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'ontime', label: 'Đúng giờ' },
                  { id: 'late', label: 'Đi muộn' },
                  { id: 'absent', label: 'Vắng' },
                  { id: 'not_arrived', label: 'Chưa vào phòng' },
                ].map((filter) => (
                  <button key={filter.id} type="button" onClick={() => setAttendanceFilter(filter.id as typeof attendanceFilter)} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${attendanceFilter === filter.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={attendanceSearch} onChange={(event) => setAttendanceSearch(event.target.value)} placeholder="Tìm MSSV, tên hoặc lớp..." className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-blue-500 sm:w-64" />
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Sinh viên</th><th className="px-4 py-3">Lớp</th><th className="px-4 py-3 text-center">Giờ bắt đầu</th><th className="px-4 py-3 text-center">Giờ vào phòng</th><th className="px-4 py-3 text-center">Độ trễ</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Bài làm</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendance.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Không có sinh viên phù hợp với bộ lọc.</td></tr>
                  ) : filteredAttendance.map((student) => {
                    const submission = currentRecords.find((record) => record.id === student.studentId);
                    const statusLabel: Record<AttendanceStatus, string> = { ontime: 'Đúng giờ', late: 'Đi muộn', absent: 'Vắng', not_arrived: 'Chưa vào phòng' };
                    const statusClass: Record<AttendanceStatus, string> = { ontime: 'bg-emerald-50 text-emerald-700 border-emerald-200', late: 'bg-amber-50 text-amber-700 border-amber-200', absent: 'bg-red-50 text-red-700 border-red-200', not_arrived: 'bg-slate-100 text-slate-600 border-slate-200' };
                    return (
                      <tr key={student.studentId} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3"><div className="font-mono font-bold text-slate-900">{student.studentId}</div><div className="mt-0.5 font-semibold text-slate-700">{student.name}</div></td>
                        <td className="px-4 py-3">{student.studentClass}</td>
                        <td className="px-4 py-3 text-center font-mono">{selectedSessionInfo?.startTime ?? '—'}</td>
                        <td className="px-4 py-3 text-center font-mono">{student.checkInTime ?? '—'}</td>
                        <td className="px-4 py-3 text-center">{student.lateMinutes && student.lateMinutes > 0 ? `${student.lateMinutes} phút` : '—'}</td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClass[student.status]}`}>{statusLabel[student.status]}</span></td>
                        <td className="px-4 py-3">{submission ? <span className="font-semibold text-emerald-700">Đã nộp</span> : student.status === 'absent' ? <span className="text-slate-500">Chưa nộp</span> : <span className="text-slate-400">Chưa có dữ liệu</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">Đây là dữ liệu mẫu trên frontend. Thời gian vào phòng và danh sách vắng thực tế cần lấy từ nguồn điểm danh/backend khi tích hợp.</p>
          </div>
        </section>
      )}

      {/* Tab phổ điểm */}
      {activeReportTab === 'scores' && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"><p className="text-xs font-semibold text-slate-500">Bài có điểm</p><p className="mt-2 text-2xl font-black text-slate-900">{currentRecords.length}</p></div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"><p className="text-xs font-semibold text-slate-500">Điểm trung bình</p><p className="mt-2 text-2xl font-black text-blue-700">{stats.avgScore}/10</p></div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"><p className="text-xs font-semibold text-slate-500">Cao nhất</p><p className="mt-2 text-2xl font-black text-emerald-700">{currentRecords.length ? Math.max(...currentRecords.map((record) => record.finalScore)).toFixed(1) : '—'}</p></div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"><p className="text-xs font-semibold text-slate-500">Thấp nhất</p><p className="mt-2 text-2xl font-black text-amber-700">{currentRecords.length ? Math.min(...currentRecords.map((record) => record.finalScore)).toFixed(1) : '—'}</p></div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-sm font-extrabold text-slate-900">Phân bố điểm chính thức</h2><p className="mt-1 text-xs text-slate-500">Nhấn một khoảng điểm để xem danh sách sinh viên tương ứng.</p></div><span className="text-xs text-slate-500">Điểm sau vi phạm đã xác nhận / 10</span></div>
            {currentRecords.length === 0 ? <p className="py-12 text-center text-sm text-slate-400">Chưa có dữ liệu điểm cho phiên này.</p> : (
              <div className="mt-6 space-y-4">
                {scoreDistribution.map((band) => {
                  const maxCount = Math.max(...scoreDistribution.map((item) => item.count), 1);
                  const selected = selectedScoreBand === band.id;
                  return (
                    <button key={band.id} type="button" onClick={() => setSelectedScoreBand(selected ? 'all' : band.id)} className={`block w-full rounded-xl p-2 text-left transition ${selected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className={`font-semibold ${selected ? 'text-blue-800' : 'text-slate-600'}`}>{band.label} điểm</span><span className="font-bold text-slate-800">{band.count} SV ({currentRecords.length ? Math.round(band.count / currentRecords.length * 100) : 0}%)</span></div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all ${selected ? 'bg-blue-600' : 'bg-blue-400'}`} style={{ width: `${band.count / maxCount * 100}%` }} /></div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-extrabold text-slate-900">Danh sách sinh viên theo phổ điểm</h3><p className="mt-1 text-xs text-slate-500">{selectedScoreBandInfo ? `Khoảng đang chọn: ${selectedScoreBandInfo.label}` : 'Tất cả sinh viên có điểm'}</p></div><button type="button" onClick={() => setSelectedScoreBand('all')} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200">Bỏ lọc</button></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="border-b bg-slate-50 text-[10px] font-bold uppercase text-slate-500"><tr><th className="px-4 py-3">MSSV</th><th className="px-4 py-3">Họ tên</th><th className="px-4 py-3">Lớp</th><th className="px-4 py-3 text-right">Điểm</th></tr></thead><tbody className="divide-y divide-slate-100">{selectedScoreStudents.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">Không có sinh viên trong khoảng điểm này.</td></tr> : selectedScoreStudents.map((student) => <tr key={student.id}><td className="px-4 py-3 font-mono font-bold text-slate-900">{student.id}</td><td className="px-4 py-3 font-semibold text-slate-700">{student.name}</td><td className="px-4 py-3 text-slate-500">{student.studentClass}</td><td className="px-4 py-3 text-right font-black text-slate-900">{student.finalScore.toFixed(1)}/10</td></tr>)}</tbody></table></div>
            <p className="mt-3 text-[11px] text-slate-400">Sinh viên chưa có kết quả không được tự động coi là 0 điểm; dữ liệu mẫu hiện chỉ chứa các bản ghi đã có điểm.</p>
          </div>
        </section>
      )}

      {/* ── 3. BỘ LỌC BẢNG ĐIỂM ── */}
      {activeReportTab === 'results' && <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 mr-1">Lọc:</span>
          {[
            { id: 'all', label: `Tất cả (${currentRecords.length})` },
            { id: 'needs-review', label: `Chờ duyệt AI (${stats.studentsWithPendingViolations})` },
            { id: 'confirmed', label: 'Đã xác nhận' },
            { id: 'perfect', label: `Điểm 10 (${currentRecords.filter((r) => r.finalScore === 10).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
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
      </>}

      {/* ── MODAL XEM BẰNG CHỨNG SNAPSHOT & HỘI ĐỒNG THẨM ĐỊNH VI PHẠM ── */}
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
