"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Search,
  Download,
  Eye,
  X,
  CheckCircle2,
  ShieldCheck,
  Check,
  FileCode2,
  BookOpen,
  GraduationCap,
  Radio,
  Megaphone,
  Plus,
  Users,
  ClipboardList,
  Monitor,
  Laptop,
  Code2,
  Send,
  RefreshCw,
  Terminal,
  ShieldAlert,
  Filter,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { fetchWithAuth } from '@/services/apiClient';
import {
  ExamScheduleItem,
  getStoredSchedules,
  saveStoredSchedules,
  ScheduleStatus,
} from './types';

// Helper to filter only formal exams: Midterm & Final examinations
function isFormalExamSession(item: ExamScheduleItem): boolean {
  const combined = `${item.title} ${item.templateTitle || ''} ${item.templateId || ''}`.toLowerCase();

  // Exclude casual lab practices
  if (
    combined.includes('thực hành lab') ||
    combined.includes('lab practice') ||
    combined.includes('lab 0') ||
    combined.includes('lab ') ||
    combined.includes('bài tập lab') ||
    item.templateId?.toUpperCase().includes('LAB')
  ) {
    return false;
  }

  const isMidterm = combined.includes('giữa k') || combined.includes('midterm') || combined.includes('quá trình');
  const isFinal = combined.includes('cuối k') || combined.includes('final') || combined.includes('kết thúc');
  const isExam = combined.includes('thi') || combined.includes('kiểm tra');

  return isMidterm || isFinal || isExam;
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const totalMin = (h || 8) * 60 + (m || 0) + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

// Ngân hàng đề thi lập trình thực hành (Tái sử dụng từ role Giảng viên)
const AVAILABLE_CODING_TEMPLATES = [
  {
    id: 1,
    code: 'TPL-EXAM-01',
    title: 'Đề thi Kết thúc học phần: Thuật toán & Cấu trúc Dữ liệu',
    courseCode: 'CS404',
    language: 'C++ / Python',
    totalProblems: 4,
    durationMinutes: 90,
    author: 'TS. Nguyễn Văn Nam',
  },
  {
    id: 2,
    code: 'TPL-EXAM-02',
    title: 'Đề thi Thực hành: Lập trình Hướng đối tượng & Design Patterns',
    courseCode: 'CS316',
    language: 'Java / C#',
    totalProblems: 3,
    durationMinutes: 90,
    author: 'ThS. Trần Hoàng Yến',
  },
  {
    id: 3,
    code: 'TPL-EXAM-03',
    title: 'Đề thi Lập trình Web Fullstack & Thiết kế RESTful API',
    courseCode: 'IS385',
    language: 'TypeScript / Node.js',
    totalProblems: 3,
    durationMinutes: 120,
    author: 'Phạm Vũ Long',
  },
  {
    id: 4,
    code: 'TPL-EXAM-04',
    title: 'Đề thi Cơ sở Dữ liệu Nâng cao & Tối ưu Truy vấn SQL',
    courseCode: 'DB201',
    language: 'PostgreSQL / SQL',
    totalProblems: 5,
    durationMinutes: 90,
    author: 'TS. Lê Hải Đăng',
  },
];

export default function ScheduleManagerPage() {
  const [schedules, setSchedules] = useState<ExamScheduleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [examKindFilter, setExamKindFilter] = useState<'all' | 'midterm' | 'final'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeTab, setTypeTab] = useState<'all' | 'ongoing' | 'scheduled' | 'completed'>('all');
  const [selectedSchedule, setSelectedSchedule] = useState<ExamScheduleItem | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalStudents, setModalStudents] = useState<any[]>([]);
  const [isLoadingModalStudents, setIsLoadingModalStudents] = useState(false);
  const [studentSearchInRoom, setStudentSearchInRoom] = useState('');

  // Inspector notes logbook
  const [inspectorNote, setInspectorNote] = useState('');
  const [isTakingNote, setIsTakingNote] = useState(false);
  const [inspectionNotesList, setInspectionNotesList] = useState<Array<{ time: string; text: string }>>([
    { time: '08:00', text: 'Mở phòng thi kết thúc học phần đúng giờ. Giám thị đã phổ biến quy chế thi lập trình trên máy.' },
    { time: '08:15', text: 'Thanh tra đào tạo kiểm tra trực ban: Toàn bộ máy tính sinh viên hoạt động ổn định trên IDE của hệ thống.' }
  ]);

  // Modal Tạo Lịch Thi Cuối Kỳ (Chỉ Lập Trình)
  const [isCreateFinalExamOpen, setIsCreateFinalExamOpen] = useState(false);
  const [newExamForm, setNewExamForm] = useState({
    title: 'Thi Cuối Kỳ: Lập Trình Thuật Toán & Cấu Trúc Dữ Liệu',
    courseCode: 'CS404',
    lecturer: 'TS. Nguyễn Văn Nam',
    date: '2026-11-25',
    startTime: '08:00',
    durationMinutes: 90,
    studentCount: 50,
    assignTemplateNow: false,
    selectedTemplateId: 1,
  });

  // Modal Gán / Đổi Đề Thi Cho Ca Thi (Chọn từ Ngân hàng đề thi kết thúc học phần đã thẩm định)
  const [attachTemplateSchedule, setAttachTemplateSchedule] = useState<ExamScheduleItem | null>(null);
  const [availableFinalTemplates, setAvailableFinalTemplates] = useState<any[]>([]);
  const [selectedTemplateToAttach, setSelectedTemplateToAttach] = useState<number | string>(2);
  const [isAttaching, setIsAttaching] = useState(false);

  // Modal Thanh Tra Màn Hình & Code Thí Sinh Thời Gian Thực
  const [inspectingStudent, setInspectingStudent] = useState<any | null>(null);
  const [studentLiveScreenData, setStudentLiveScreenData] = useState<any | null>(null);
  const [isLoadingLiveScreen, setIsLoadingLiveScreen] = useState(false);
  const [customWarningMessage, setCustomWarningMessage] = useState('');
  const [isSendingWarning, setIsSendingWarning] = useState(false);

  // Tải danh sách đề thi kết thúc học phần từ API (chỉ lọc final_exam)
  const loadFinalTemplates = async () => {
    try {
      const data = await fetchWithAuth<any[]>('/api/v1/admin/templates?template_type=final_exam');
      if (Array.isArray(data) && data.length > 0) {
        const finalsOnly = data.filter((t: any) => t.type === 'final_exam' || t.template_type === 'final_exam' || (t.title && (t.title.toLowerCase().includes('kết thúc') || t.title.toLowerCase().includes('cuối kỳ'))));
        const finalResults = finalsOnly.length > 0 ? finalsOnly : data;
        setAvailableFinalTemplates(finalResults);
        if (finalResults[0]) {
          setSelectedTemplateToAttach(finalResults[0].template_id || finalResults[0].id);
        }
      } else {
        setAvailableFinalTemplates(AVAILABLE_CODING_TEMPLATES.filter((t) => t.id === 1 || t.title.includes('Kết thúc')));
      }
    } catch {
      setAvailableFinalTemplates(AVAILABLE_CODING_TEMPLATES.filter((t) => t.id === 1 || t.title.includes('Kết thúc')));
    }
  };

  // Load real schedules from FastAPI Backend
  const loadSchedulesFromApi = async () => {
    setIsLoading(true);
    try {
      const resSchedules = await fetchWithAuth<{ total: number; schedules: ExamScheduleItem[] }>('/api/v1/admin/schedules');
      if (resSchedules?.schedules && resSchedules.schedules.length > 0) {
        setSchedules(resSchedules.schedules);
      } else {
        setSchedules(getStoredSchedules());
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
    loadFinalTemplates();
  }, []);

  // Tự động kiểm tra và đóng phòng khi hết thời gian làm bài thi
  useEffect(() => {
    const autoCloseTimer = setInterval(() => {
      const now = new Date();
      setSchedules((prevSchedules) =>
        prevSchedules.map((item) => {
          if (item.status === 'ongoing' && item.endTime) {
            const [endH, endM] = item.endTime.split(':').map(Number);
            const dateParts = item.date.includes('/')
              ? item.date.split('/').map(Number)
              : item.date.includes('-')
              ? item.date.split('-').map(Number)
              : [now.getDate(), now.getMonth() + 1, now.getFullYear()];

            let examEnd: Date;
            if (dateParts.length === 3 && dateParts[0] > 1000) {
              examEnd = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], endH, endM);
            } else if (dateParts.length === 3) {
              examEnd = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], endH, endM);
            } else {
              examEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);
            }

            if (now >= examEnd) {
              return {
                ...item,
                status: 'completed' as ScheduleStatus,
              };
            }
          }
          return item;
        })
      );
    }, 15000);

    return () => clearInterval(autoCloseTimer);
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

  // Load student live screen & written code
  const openStudentInspection = async (student: any) => {
    setInspectingStudent(student);
    setIsLoadingLiveScreen(true);
    setStudentLiveScreenData(null);

    const roomId = selectedSchedule?.room_id || Number(selectedSchedule?.id) || 1;
    const studentId = student.student_id || 1;

    try {
      const data = await fetchWithAuth<any>(`/api/v1/admin/schedules/${roomId}/students/${studentId}/live-screen`);
      setStudentLiveScreenData(data);
    } catch {
      // Fallback mock live code preview
      setStudentLiveScreenData({
        student_id: studentId,
        full_name: student.full_name,
        student_code: student.student_code,
        session_status: 'in_progress',
        code_content: `# Bài làm môn: ${selectedSchedule?.title || 'Lập trình thuật toán'}\n# Thí sinh: ${student.full_name} (${student.student_code})\n\ndef solve_problem(nums, target):\n    hash_map = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in hash_map:\n            return [hash_map[diff], i]\n        hash_map[num] = i\n    return []\n\nif __name__ == "__main__":\n    print("Output test:", solve_problem([2, 7, 11, 15], 9))\n`,
        programming_language: 'python',
        last_saved_at: new Date().toLocaleTimeString('vi-VN'),
      });
    } finally {
      setIsLoadingLiveScreen(false);
    }
  };

  // Hide notification
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Filter only formal examination sessions (Midterm & Final)
  const formalSchedules = useMemo(() => {
    return schedules.filter(isFormalExamSession);
  }, [schedules]);

  // Danh sách môn học phần (Course Codes) cho dropdown bộ lọc
  const courseOptions = useMemo(() => {
    const set = new Set<string>();
    formalSchedules.forEach((s) => {
      const code = s.courseCode || s.classId || s.title.slice(0, 10);
      if (code) set.add(code);
    });
    return Array.from(set);
  }, [formalSchedules]);

  // Filtered schedules for table display
  const filteredSchedules = useMemo(() => {
    return formalSchedules.filter((item) => {
      if (typeTab === 'ongoing' && item.status !== 'ongoing') return false;
      if (typeTab === 'scheduled' && item.status !== 'scheduled') return false;
      if (typeTab === 'completed' && item.status !== 'completed') return false;

      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      if (examKindFilter !== 'all' && item.examKind !== examKindFilter) return false;

      if (courseFilter !== 'all') {
        const itemCode = (item.courseCode || item.classId || '').toLowerCase();
        if (!itemCode.includes(courseFilter.toLowerCase())) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesLecturer = item.lecturer.toLowerCase().includes(q);
        const matchesTemplate = item.templateId?.toLowerCase().includes(q) || item.templateTitle?.toLowerCase().includes(q);
        const matchesCourse = (item.courseCode || '').toLowerCase().includes(q);
        return matchesId || matchesTitle || matchesLecturer || matchesTemplate || matchesCourse;
      }
      return true;
    });
  }, [formalSchedules, typeTab, statusFilter, courseFilter, searchTerm]);

  // KPI counters
  const totalCount = formalSchedules.length;
  const ongoingCount = formalSchedules.filter((s) => s.status === 'ongoing').length;
  const scheduledCount = formalSchedules.filter((s) => s.status === 'scheduled').length;
  const completedCount = formalSchedules.filter((s) => s.status === 'completed').length;

  // Handle Create Final Exam (100% Coding Only)
  const handleCreateFinalExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamForm.title.trim() || !newExamForm.courseCode.trim()) {
      alert('Vui lòng điền đầy đủ tên môn thi và mã học phần.');
      return;
    }

    const cleanCourse = newExamForm.courseCode.trim().toUpperCase();
    const templateObj = newExamForm.assignTemplateNow
      ? AVAILABLE_CODING_TEMPLATES.find((t) => t.id === Number(newExamForm.selectedTemplateId))
      : null;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      const res = await fetch('/api/v1/admin/schedules/final-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: newExamForm.title.trim(),
          course_code: cleanCourse,
          lecturer: newExamForm.lecturer.trim() || 'TS. Nguyễn Văn Nam',
          exam_date: newExamForm.date,
          start_time: newExamForm.startTime,
          duration_minutes: Number(newExamForm.durationMinutes) || 90,
          student_count: Number(newExamForm.studentCount) || 50,
          template_id: templateObj ? templateObj.id : null,
        }),
      });

      if (res.ok) {
        const createdData = await res.json();
        const newScheduleItem: ExamScheduleItem = {
          id: createdData.room_code || `EXAM-FINAL-${cleanCourse}-${Date.now().toString().slice(-4)}`,
          room_id: createdData.room_id,
          title: newExamForm.title.trim(),
          courseCode: cleanCourse,
          classId: cleanCourse,
          className: `Khóa thi kết thúc học phần • ${cleanCourse}`,
          studentCount: Number(newExamForm.studentCount) || 50,
          lecturer: newExamForm.lecturer || 'TS. Nguyễn Văn Nam',
          templateId: templateObj ? templateObj.code : '',
          templateTitle: templateObj ? templateObj.title : 'Chưa gán đề thi (Bảo mật chống lộ đề)',
          templateVersion: 'v1.0 (Lập trình thực hành)',
          date: newExamForm.date,
          startTime: newExamForm.startTime,
          endTime: calculateEndTime(newExamForm.startTime, Number(newExamForm.durationMinutes) || 90),
          durationMinutes: Number(newExamForm.durationMinutes) || 90,
          room: 'Phòng thi máy tính tập trung',
          roomCode: createdData.room_code || `EXAM_${cleanCourse}`,
          roomPassword: Math.floor(100000 + Math.random() * 900000).toString(),
          status: 'scheduled',
          examFormat: 'coding',
          proctoringPolicy: {
            webcam: 'optional',
            screenShare: 'optional',
            clipboard: 'block',
            notifications: ['Bảng thanh tra', 'Thông báo phòng máy'],
            faceMissingThresholdSec: 15,
            faceMissingSeverity: 'medium',
            webcamLostThresholdSec: 10,
            webcamLostSeverity: 'high',
            screenStopThresholdSec: 5,
            screenStopSeverity: 'critical',
            tabSwitchLimit: 2,
            tabSwitchSeverity: 'high',
          },
          attendedStudents: 0,
          createdAt: new Date().toLocaleDateString('vi-VN'),
          creatorRole: 'system',
        };

        const updated = [newScheduleItem, ...schedules];
        setSchedules(updated);
        saveStoredSchedules(updated);
        setIsCreateFinalExamOpen(false);
        setNotification({
          type: 'success',
          message: `Đã khởi tạo lịch thi cuối kỳ môn "${newExamForm.title}" thành công. Lịch thi được bảo mật chỉ Admin xem trước.`,
        });
        return;
      }
    } catch (err) {
      console.warn('Backend API error when creating exam:', err);
    }

    // Client-side fallback if backend unavailable
    const newScheduleItem: ExamScheduleItem = {
      id: `EXAM-FINAL-${cleanCourse}-${Date.now().toString().slice(-4)}`,
      title: newExamForm.title.trim(),
      courseCode: cleanCourse,
      classId: cleanCourse,
      className: `Khóa thi kết thúc học phần • ${cleanCourse}`,
      studentCount: Number(newExamForm.studentCount) || 50,
      lecturer: newExamForm.lecturer || 'TS. Nguyễn Văn Nam',
      templateId: templateObj ? templateObj.code : '',
      templateTitle: templateObj ? templateObj.title : 'Chưa gán đề thi (Bảo mật chống lộ đề)',
      templateVersion: 'v1.0 (Lập trình thực hành)',
      date: newExamForm.date,
      startTime: newExamForm.startTime,
      endTime: calculateEndTime(newExamForm.startTime, Number(newExamForm.durationMinutes) || 90),
      durationMinutes: Number(newExamForm.durationMinutes) || 90,
      room: 'Phòng thi máy tính tập trung',
      roomCode: `EXAM_${cleanCourse}`,
      roomPassword: Math.floor(100000 + Math.random() * 900000).toString(),
      status: 'scheduled',
      examFormat: 'coding',
      proctoringPolicy: {
        webcam: 'optional',
        screenShare: 'optional',
        clipboard: 'block',
        notifications: ['Bảng thanh tra', 'Thông báo phòng máy'],
        faceMissingThresholdSec: 15,
        faceMissingSeverity: 'medium',
        webcamLostThresholdSec: 10,
        webcamLostSeverity: 'high',
        screenStopThresholdSec: 5,
        screenStopSeverity: 'critical',
        tabSwitchLimit: 2,
        tabSwitchSeverity: 'high',
      },
      attendedStudents: 0,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      creatorRole: 'system',
    };

    const updated = [newScheduleItem, ...schedules];
    setSchedules(updated);
    saveStoredSchedules(updated);
    setIsCreateFinalExamOpen(false);
    setNotification({
      type: 'success',
      message: `Đã tạo lịch thi cuối kỳ môn "${newExamForm.title}" thành công!`,
    });
  };

  // Handle Attach Template to Exam (Đổi / Gán đề thi kết thúc học phần từ danh sách)
  const handleAttachTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachTemplateSchedule) return;

    const tpl = availableFinalTemplates.find(
      (t) => t.template_id === Number(selectedTemplateToAttach) || t.id === Number(selectedTemplateToAttach) || String(t.id) === String(selectedTemplateToAttach)
    );
    if (!tpl) {
      alert('Vui lòng chọn một đề thi kết thúc học phần hợp lệ.');
      return;
    }

    setIsAttaching(true);
    const roomId = attachTemplateSchedule.room_id || Number(attachTemplateSchedule.id) || 1;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      const res = await fetch(`/api/v1/admin/schedules/${roomId}/attach-template`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          template_id: tpl.template_id || tpl.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Không thể đổi đề thi');
      }

      setNotification({
        type: 'success',
        message: `Đã đổi đề thi kết thúc học phần: "${tpl.template_code || tpl.id || 'TPL'} • ${tpl.title}" thành công!`,
      });
      setAttachTemplateSchedule(null);
      await loadSchedulesFromApi();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gán đề thi');
    } finally {
      setIsAttaching(false);
    }
  };


  // Handle Send Direct Warning to Student Screen
  const handleSendStudentWarning = () => {
    if (!customWarningMessage.trim() || !inspectingStudent) return;
    setIsSendingWarning(true);
    setTimeout(() => {
      setIsSendingWarning(false);
      setCustomWarningMessage('');
      setNotification({
        type: 'info',
        message: `Đã gửi thông điệp nhắc nhở trực tiếp tới màn hình thí sinh ${inspectingStudent.full_name}.`,
      });
    }, 600);
  };

  // Export to Excel / CSV
  function handleExportExcel() {
    if (formalSchedules.length === 0) {
      alert('Không có dữ liệu ca thi chính thức để xuất.');
      return;
    }

    const rows: string[][] = [
      [
        'Mã ca thi',
        'Tên môn thi & kỳ thi',
        'Mã học phần',
        'Sĩ số dự thi',
        'Cán bộ coi thi',
        'Mã đề thi',
        'Tên đề thi lập trình',
        'Ngày thi',
        'Giờ bắt đầu',
        'Giờ kết thúc',
        'Thời lượng (phút)',
        'Hình thức thi',
        'Trạng thái',
      ],
    ];

    formalSchedules.forEach((s) => {
      const statusLabel =
        s.status === 'ongoing'
          ? 'Đang diễn ra (Live)'
          : s.status === 'scheduled'
          ? 'Đã lên lịch'
          : s.status === 'completed'
          ? 'Đã kết thúc (Tự động đóng)'
          : 'Bản nháp';

      rows.push([
        s.id,
        s.title,
        s.courseCode || s.classId,
        String(s.studentCount),
        s.lecturer,
        s.templateId || 'Chưa gán',
        s.templateTitle || 'Chưa gán đề thi',
        s.date,
        s.startTime,
        s.endTime,
        String(s.durationMinutes),
        '100% Lập trình thực hành',
        statusLabel,
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
    link.setAttribute('download', `danh_sach_lich_thi_cuoi_ky_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setNotification({
      type: 'success',
      message: 'Đã xuất danh sách lịch thi ra file CSV thành công!',
    });
  }

  // Room students list for Ongoing Live Inspection modal
  const roomStudentsList = useMemo(() => {
    if (modalStudents.length > 0) return modalStudents;
    return [
      { student_id: 1, student_code: '0123456', full_name: 'Long Phạm', attendance_status: 'present', progress: 'Đang làm bài (75%)', pc: 'PC-01' },
      { student_id: 2, student_code: '20110002', full_name: 'Trần Thị Bích', attendance_status: 'present', progress: 'Đang làm bài (80%)', pc: 'PC-02' },
      { student_id: 3, student_code: '20110003', full_name: 'Lê Văn Cường', attendance_status: 'present', progress: 'Đang làm bài (60%)', pc: 'PC-03' },
      { student_id: 4, student_code: '20110004', full_name: 'Hoàng Minh Tuấn', attendance_status: 'absent', progress: 'Chưa vào phòng', pc: 'PC-04' },
      { student_id: 5, student_code: '20110005', full_name: 'Nguyễn Văn Nam', attendance_status: 'present', progress: 'Đang làm bài (70%)', pc: 'PC-05' },
    ];
  }, [modalStudents]);

  const filteredRoomStudents = useMemo(() => {
    if (!studentSearchInRoom.trim()) return roomStudentsList;
    const q = studentSearchInRoom.toLowerCase();
    return roomStudentsList.filter(
      (st) =>
        (st.student_code && st.student_code.toLowerCase().includes(q)) ||
        (st.full_name && st.full_name.toLowerCase().includes(q)) ||
        (st.pc && st.pc.toLowerCase().includes(q))
    );
  }, [roomStudentsList, studentSearchInRoom]);

  const attendedInRoom = roomStudentsList.filter((s) => s.attendance_status === 'present').length;

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-neutral-950 text-slate-800 dark:text-slate-100 transition-colors">
      <AdminSidebar activeModule="schedules" />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar title="Lịch & phiên kiểm tra" />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1440px] space-y-6">
            {/* Academic Alert Notification */}
            {notification && (
              <div
                role="status"
                className={`flex items-center justify-between rounded-lg border border-slate-300 border-l-4 bg-white p-4 shadow-sm transition dark:border-white/10 dark:bg-neutral-900 ${
                  notification.type === 'success'
                    ? 'border-l-emerald-700'
                    : 'border-l-slate-900 dark:border-l-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-md shrink-0 ${
                      notification.type === 'success'
                        ? 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300'
                        : 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                    }`}
                  >
                    {notification.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#2A282D] dark:text-white">
                      {notification.type === 'success' ? 'Thao tác thành công' : 'Thông báo hệ thống'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-300">{notification.message}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotification(null)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Header: Quản trị Lịch Thi Kết Thúc Học Phần */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-300 pb-4 dark:border-white/10">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  KHẢO THÍ &amp; THANH TRA ĐÀO TẠO
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
                  Quản lý lịch &amp; phiên kiểm tra
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Lập lịch thi kết thúc học phần (100% lập trình), phân bổ ca thi theo môn, bảo mật đề thi và thanh tra trực ban.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateFinalExamOpen(true)}
                  className="system-primary-action inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tạo lịch thi cuối kỳ</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  title="Xuất danh sách lịch thi ra file CSV"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span>Xuất lịch thi</span>
                </button>
              </div>
            </div>

            {/* KPI Cards Row (4 cards) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900 transition-colors">
                <p className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">Tổng ca thi chính thức</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{totalCount}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">Kỳ thi kết thúc học phần</p>
              </div>

              <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900 transition-colors">
                <p className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">Đang diễn ra (Live)</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{ongoingCount}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">Đang tổ chức thi</p>
              </div>

              <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900 transition-colors">
                <p className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">Đã lên lịch (Sắp tới)</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{scheduledCount}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">Chờ mở phòng thi</p>
              </div>

              <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900 transition-colors">
                <p className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">Đã kết thúc</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{completedCount}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">Tự động đóng phòng thi</p>
              </div>
            </div>

            {/* Toolbar: 2 tầng gọn gàng, vừa vặn 100% trong khung, không tràn thanh cuộn */}
            <div className="flex flex-col gap-3 rounded-lg border border-slate-300 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-neutral-900 transition-colors">
              {/* Tầng 1: Type Tabs bên trái + Tìm kiếm bên phải */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Type Tabs: shrink-0, không overflow-x-auto */}
                <div className="inline-flex h-9 shrink-0 items-center rounded-lg border border-slate-300 bg-slate-50 p-1 dark:border-white/10 dark:bg-neutral-950">
                  <button
                    type="button"
                    onClick={() => setTypeTab('all')}
                    className={`h-full whitespace-nowrap rounded-md px-3 text-xs font-semibold transition cursor-pointer ${
                      typeTab === 'all'
                        ? 'system-selected-module shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Tất cả ({formalSchedules.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeTab('ongoing')}
                    className={`h-full whitespace-nowrap rounded-md px-3 text-xs font-semibold transition cursor-pointer ${
                      typeTab === 'ongoing'
                        ? 'system-selected-module shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Đang diễn ra ({ongoingCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeTab('scheduled')}
                    className={`h-full whitespace-nowrap rounded-md px-3 text-xs font-semibold transition cursor-pointer ${
                      typeTab === 'scheduled'
                        ? 'system-selected-module shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Sắp tới ({scheduledCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeTab('completed')}
                    className={`h-full whitespace-nowrap rounded-md px-3 text-xs font-semibold transition cursor-pointer ${
                      typeTab === 'completed'
                        ? 'system-selected-module shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Đã kết thúc ({completedCount})
                  </button>
                </div>

                {/* Ô tìm kiếm */}
                <div className="relative w-full sm:w-72 md:w-80">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm môn thi, mã môn, cán bộ..."
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-8 text-xs font-medium outline-none transition focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-[#0f172a]/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tầng 2: Dải bộ lọc (Môn học phần + Hình thức thi + Trạng thái + Xóa lọc) */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-slate-300/60 dark:border-white/5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Bộ lọc:</span>
                </div>

                {/* Lọc theo môn học phần */}
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-[#0f172a]/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100 cursor-pointer"
                >
                  <option value="all">Tất cả môn học phần</option>
                  {courseOptions.map((c) => (
                    <option key={c} value={c}>
                      Môn: {c}
                    </option>
                  ))}
                </select>

                {/* Bộ lọc theo hình thức thi: Giữa kỳ hoặc Kết thúc học phần */}
                <select
                  value={examKindFilter}
                  onChange={(e) => setExamKindFilter(e.target.value as 'all' | 'midterm' | 'final')}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-[#0f172a]/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100 cursor-pointer"
                >
                  <option value="all">Tất cả hình thức thi</option>
                  <option value="final">Thi Kết Thúc Học Phần</option>
                  <option value="midterm">Thi Giữa Kỳ</option>
                </select>

                {/* Trạng thái filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-[#0f172a]/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100 cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="ongoing">Đang diễn ra (Live)</option>
                  <option value="scheduled">Đã lên lịch</option>
                  <option value="completed">Đã kết thúc</option>
                </select>

                {(courseFilter !== 'all' || examKindFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCourseFilter('all');
                      setExamKindFilter('all');
                      setStatusFilter('all');
                      setSearchTerm('');
                    }}
                    className="h-9 rounded-lg px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
                  >
                    Đặt lại bộ lọc
                  </button>
                )}
              </div>
            </div>

            {/* BẢNG LỊCH THI: Thiết kế gọn gàng, tự co dãn theo nội dung, không tràn và không đè nút */}
            <div className="rounded-lg border border-slate-300 bg-white shadow-sm overflow-hidden dark:border-white/10 dark:bg-neutral-900 transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-neutral-950 text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="px-3.5 py-3 whitespace-nowrap min-w-[95px]">MÔN THI</th>
                      <th className="px-3 py-3 whitespace-nowrap min-w-[140px]">KỲ THI</th>
                      <th className="px-3 py-3 whitespace-nowrap min-w-[180px]">BẮT ĐẦU &amp; THỜI LƯỢNG</th>
                      <th className="px-3 py-3 whitespace-nowrap min-w-[150px]">CÁN BỘ COI THI</th>
                      <th className="px-2.5 py-3 whitespace-nowrap text-center min-w-[65px]">SĨ SỐ</th>
                      <th className="px-3 py-3 whitespace-nowrap min-w-[110px]">TRẠNG THÁI</th>
                      <th className="px-3.5 py-3 whitespace-nowrap text-right min-w-[170px]">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10 font-medium">
                    {filteredSchedules.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <FileCode2 className="mx-auto h-12 w-12 text-slate-300" />
                          <p className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                            Không tìm thấy ca thi phù hợp
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Các kỳ thi kết thúc học phần sẽ hiển thị tại đây khi được lập lịch.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredSchedules.map((item) => {
                        const hasTemplate = Boolean(item.templateId && item.templateId.trim());

                        return (
                          <tr
                            key={item.id}
                            className={`transition hover:bg-slate-50/80 dark:hover:bg-white/5 ${
                              item.status === 'ongoing' ? 'bg-red-50/20 dark:bg-red-950/25' : ''
                            }`}
                          >
                            {/* Cột 1: MÔN THI (Chỉ hiển thị Mã môn và Số tín chỉ) */}
                            <td className="px-3.5 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="shrink-0 font-mono text-xs font-bold tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded dark:bg-white/10 dark:text-slate-300">
                                  {item.courseCode || item.classId || 'CS404'}
                                </span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  {item.creditHours || 3} tín chỉ
                                </span>
                              </div>
                            </td>

                            {/* Cột 2: KỲ THI */}
                            <td className="px-3 py-3">
                              <span className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                {item.examKind === 'final' ? 'Thi Kết Thúc Học Phần' : 'Thi Giữa Kỳ'}
                              </span>
                            </td>

                            {/* Cột 3: Bắt đầu & Thời lượng */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span>{item.date} • {item.startTime}</span>
                                </div>
                                <p className="mt-0.5 text-[11px] text-slate-500">
                                  Thời lượng: <strong className="text-slate-700 dark:text-slate-300">{item.durationMinutes} phút</strong> ({item.startTime} - {item.endTime})
                                </p>
                              </div>
                            </td>

                            {/* Cột 4: Cán bộ coi thi */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <GraduationCap className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                  <span>{item.lecturer}</span>
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                                  {item.examKind === 'final' ? 'Giám thị phụ trách' : 'Giảng viên phụ trách lớp'}
                                </p>
                              </div>
                            </td>

                            {/* Cột 5: Sĩ số dự thi */}
                            <td className="px-2.5 py-3 text-center whitespace-nowrap">
                              <div>
                                <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                                  {item.studentCount} <span className="text-[11px] font-normal text-slate-500">SV</span>
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  P.Đào tạo
                                </p>
                              </div>
                            </td>

                            {/* Cột 6: Trạng thái (Typography thuần túy, KHÔNG box, KHÔNG chấm, KHÔNG bị đè) */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              {item.status === 'ongoing' ? (
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  Đang diễn ra (Live)
                                </span>
                              ) : item.status === 'scheduled' ? (
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  Đã lên lịch
                                </span>
                              ) : item.status === 'completed' ? (
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  Đã kết thúc
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Bản nháp
                                </span>
                              )}
                            </td>

                            {/* Cột 7: Thao tác (Rộng rãi, không tràn, đúng ngữ cảnh trạng thái) */}
                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {item.status === 'ongoing' ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSchedule(item)}
                                    className="system-primary-action inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>Thanh tra Live</span>
                                  </button>
                                ) : item.status === 'completed' ? (
                                  /* Ca thi đã hoàn thành: CHỈ xem Chi tiết (không thể đổi đề sau khi đã thi xong) */
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSchedule(item)}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 shadow-2xs transition cursor-pointer whitespace-nowrap"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                                    <span>Chi tiết</span>
                                  </button>
                                ) : (
                                  /* Ca thi sắp tới: Có thể gán/đổi đề và xem chi tiết */
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAttachTemplateSchedule(item);
                                        setSelectedTemplateToAttach(item.templateId || (availableFinalTemplates[0]?.template_id || 1));
                                      }}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 shadow-2xs transition cursor-pointer whitespace-nowrap"
                                      title="Gán hoặc đổi đề thi kết thúc học phần"
                                    >
                                      <FileCode2 className="h-3.5 w-3.5 text-brand-700 dark:text-brand-300" />
                                      <span>{hasTemplate ? 'Đổi đề' : 'Gán đề'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedSchedule(item)}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 shadow-2xs transition cursor-pointer whitespace-nowrap"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                                      <span>Chi tiết</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Banner chính sách bảo mật lịch thi & vai trò */}
            <div className="rounded-lg border border-slate-300 bg-slate-50 p-4 text-xs text-slate-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-300">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-slate-900 dark:text-white shrink-0" />
                <p className="leading-relaxed">
                  <strong>Quy chế bảo mật kỳ thi kết thúc học phần:</strong> Lịch thi chỉ Ban Khảo thí được xem trước và chỉnh sửa. Giám thị (GV) và Thí sinh chỉ được truy cập phòng thi khi đến đúng thời gian quy định. Giám thị chỉ có quyền giám sát, không thể kết thúc sớm ca thi; hệ thống sẽ tự động đóng phòng khi hết thời gian làm bài.
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-900 dark:text-white shrink-0">
                Oculide Secure Academic Engine
              </span>
            </div>
          </div>
        </main>
      </div>

      {/* ── MODAL 1: TẠO LỊCH THI CUỐI KỲ (100% LẬP TRÌNH - BẢO MẬT ĐỀ THI) ── */}
      {isCreateFinalExamOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/65 backdrop-blur-[3px] p-4 sm:p-6 pt-12 sm:pt-16 pb-12 sm:pb-16 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCreateFinalExamOpen(false);
          }}
        >
          <div className="relative w-full max-w-2xl my-auto max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-8rem)] flex flex-col rounded-xl overflow-hidden border border-slate-300 bg-white shadow-2xl transition-all dark:border-white/10 dark:bg-neutral-900 text-slate-800 dark:text-slate-200">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-300 px-6 py-5 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Tạo lịch thi kết thúc học phần (Chỉ Lập Trình)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Khởi tạo ca thi chính thức, phân công giám thị và thiết lập bảo mật đề thi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateFinalExamOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateFinalExam} className="overflow-y-auto flex-1 p-6 space-y-4 text-xs">
              {/* Tên kỳ thi */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Tên kỳ thi / môn thi chính thức *
                </label>
                <input
                  type="text"
                  required
                  value={newExamForm.title}
                  onChange={(e) => setNewExamForm({ ...newExamForm, title: e.target.value })}
                  placeholder="Ví dụ: Thi Cuối Kỳ: Lập Trình Thuật Toán & Cấu Trúc Dữ Liệu"
                  className="h-9 w-full rounded-lg border border-slate-300 px-3 font-medium outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-[#0f172a]/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                />
              </div>

              {/* Grid 2 cols: Mã học phần & Cán bộ coi thi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Mã môn học phần *
                  </label>
                  <input
                    type="text"
                    required
                    value={newExamForm.courseCode}
                    onChange={(e) => setNewExamForm({ ...newExamForm, courseCode: e.target.value })}
                    placeholder="Ví dụ: CS404"
                    className="h-9 w-full rounded-lg border border-slate-300 px-3 font-medium outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-[#0f172a]/20 uppercase dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Cán bộ coi thi chính (Giám thị) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newExamForm.lecturer}
                    onChange={(e) => setNewExamForm({ ...newExamForm, lecturer: e.target.value })}
                    placeholder="Ví dụ: TS. Nguyễn Văn Nam"
                    className="h-9 w-full rounded-lg border border-slate-300 px-3 font-medium outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-[#0f172a]/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Hình thức thi: 100% Lập trình thực hành */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Hình thức bài thi: 100% Thực hành lập trình trên máy (Coding Only)
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                    Đã chuẩn hóa
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Kỳ thi tập trung kiểm tra năng lực viết code, kiểm thử tự động qua testcase trên sandbox và camera giám sát trực ban.
                </p>
              </div>

              {/* Grid 3 cols: Ngày thi, Giờ bắt đầu, Thời lượng */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Ngày thi *
                  </label>
                  <input
                    type="date"
                    required
                    value={newExamForm.date}
                    onChange={(e) => setNewExamForm({ ...newExamForm, date: e.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-300 px-3 font-medium outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-[#0f172a]/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Giờ bắt đầu *
                  </label>
                  <input
                    type="time"
                    required
                    value={newExamForm.startTime}
                    onChange={(e) => setNewExamForm({ ...newExamForm, startTime: e.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-300 px-3 font-medium outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-[#0f172a]/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Thời lượng (phút) *
                  </label>
                  <input
                    type="number"
                    required
                    min={30}
                    max={180}
                    step={15}
                    value={newExamForm.durationMinutes}
                    onChange={(e) => setNewExamForm({ ...newExamForm, durationMinutes: Number(e.target.value) })}
                    className="h-9 w-full rounded-lg border border-slate-300 px-3 font-medium outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-[#0f172a]/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Sĩ số dự thi */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Sĩ số dự thi theo danh sách phòng đào tạo (sinh viên) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={500}
                  value={newExamForm.studentCount}
                  onChange={(e) => setNewExamForm({ ...newExamForm, studentCount: Number(e.target.value) })}
                  className="h-9 w-full rounded-lg border border-slate-300 px-3 font-medium outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-[#0f172a]/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                />
              </div>

              {/* Bảo mật đề thi: Tùy chọn gán đề thi ngay hay thêm sau */}
              <div className="rounded-lg border border-slate-300 p-3.5 space-y-3 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                <span className="block font-bold text-slate-800 dark:text-slate-200">
                  Phương thức gắn đề thi lập trình
                </span>

                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="templateChoice"
                      checked={!newExamForm.assignTemplateNow}
                      onChange={() => setNewExamForm({ ...newExamForm, assignTemplateNow: false })}
                      className="mt-0.5 accent-slate-900 dark:accent-white"
                    />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        (Khuyến nghị) Chưa gán đề thi ngay • Bảo mật chống lộ đề
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Admin tạo lịch thi trước, đề thi lập trình sẽ được đính kèm vào ca thi gần thời điểm tổ chức thi để đảm bảo tính khách quan và bí mật.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input
                      type="radio"
                      name="templateChoice"
                      checked={newExamForm.assignTemplateNow}
                      onChange={() => setNewExamForm({ ...newExamForm, assignTemplateNow: true })}
                      className="mt-0.5 accent-slate-900 dark:accent-white"
                    />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        Chọn đề thi lập trình từ Ngân hàng đề thi của Giảng viên
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Tái sử dụng các bộ đề thực hành có sẵn trong ngân hàng câu hỏi.
                      </p>
                    </div>
                  </label>
                </div>

                {newExamForm.assignTemplateNow && (
                  <div className="pt-2 animate-in fade-in">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Chọn bộ đề thi lập trình:
                    </label>
                    <select
                      value={newExamForm.selectedTemplateId}
                      onChange={(e) => setNewExamForm({ ...newExamForm, selectedTemplateId: Number(e.target.value) })}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 font-medium outline-none focus:border-slate-900 dark:focus:border-white dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                    >
                      {AVAILABLE_CODING_TEMPLATES.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.code} • {tpl.title} ({tpl.language})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Footer Modal */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-300 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateFinalExamOpen(false)}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="system-primary-action h-9 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 text-xs font-semibold text-white shadow-sm transition cursor-pointer"
                >
                  Xác nhận tạo lịch thi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: GÁN / ĐỔI ĐỀ THI KẾT THÚC HỌC PHẦN (CHỈ ĐỀ CUỐI KỲ HOẶC SOẠN MỚI KÈM TEST CASES) ── */}
      {attachTemplateSchedule && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/65 backdrop-blur-[3px] p-4 sm:p-6 pt-12 sm:pt-16 pb-12 sm:pb-16 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAttachTemplateSchedule(null);
          }}
        >
          <div className="relative w-full max-w-2xl my-auto max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-8rem)] flex flex-col rounded-xl overflow-hidden border border-slate-300 bg-white shadow-2xl transition-all dark:border-white/10 dark:bg-neutral-900 text-slate-800 dark:text-slate-200">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-300 px-6 py-5 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
                  <FileCode2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Gán / Đổi đề thi kết thúc học phần
                  </h3>
                  <p className="text-xs text-slate-500">
                    {attachTemplateSchedule.courseName || attachTemplateSchedule.title} ({attachTemplateSchedule.courseCode || attachTemplateSchedule.classId})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachTemplateSchedule(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* THÔNG TIN BẢO MẬT & CHỌN TỪ NGÂN HÀNG ĐỀ KẾT THÚC HỌC PHẦN */}
            <form onSubmit={handleAttachTemplateSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-white/10 dark:bg-white/5 space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-slate-900 dark:text-white" />
                  <span>Ngân hàng đề thi niêm phong (Sealed Question Bank)</span>
                </p>
                <p className="text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed">
                  Theo quy chế bảo mật, đề thi kết thúc học phần do <strong>Hội đồng ra đề / Trưởng bộ môn</strong> thẩm định và nộp vào ngân hàng đề thi. Quản trị viên chỉ định bộ đề chính thức cho ca thi. Đề thi được niêm phong mã hóa và chỉ giải mã trên máy tính thí sinh khi ca thi bắt đầu.
                </p>
                <div className="pt-1.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Chưa có bộ đề phù hợp cho ca thi này?</span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Hãy tạo bộ đề trong Ngân hàng đề thi trước khi gán lịch.
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Danh sách đề thi kết thúc học phần hợp lệ ({availableFinalTemplates.length} bộ đề):
                </label>
                <div className="space-y-2">
                  {availableFinalTemplates.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-white/10">
                      Chưa có bộ đề kết thúc học phần nào trong ngân hàng đề thi.
                    </div>
                  ) : (
                    availableFinalTemplates.map((tpl) => {
                      const tplKey = tpl.template_id || tpl.id;
                      const isSelected = String(selectedTemplateToAttach) === String(tplKey);

                      return (
                        <label
                          key={tplKey}
                          className={`flex items-start gap-3 p-3.5 rounded-lg border transition cursor-pointer ${
                            isSelected
                              ? 'border-brand bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10'
                              : 'border-slate-200 hover:border-slate-300 dark:border-white/10'
                          }`}
                        >
                          <input
                            type="radio"
                            name="attachTemplateRadio"
                            value={tplKey}
                            checked={isSelected}
                            onChange={() => setSelectedTemplateToAttach(tplKey)}
                            className="mt-0.5 accent-brand"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                {tpl.template_code || tpl.code || `TPL-${tplKey}`}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                {tpl.language || 'C++ / Python'}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                              {tpl.title}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Thời lượng: {tpl.durationMinutes || tpl.duration_minutes || 90} phút • Tác giả: {tpl.lecturer || tpl.author || 'Ban ra đề / Khảo thí'} • {tpl.questionCount || tpl.totalProblems || 2} bài tập
                            </p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-300 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setAttachTemplateSchedule(null)}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isAttaching || availableFinalTemplates.length === 0}
                  className="system-primary-action h-9 rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  {isAttaching ? 'Đang lưu...' : 'Xác nhận gán đề thi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: THANH TRA TRỰC BAN PHÒNG THI & CHI TIẾT CA THI ── */}
      {selectedSchedule && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/65 backdrop-blur-[3px] p-4 sm:p-6 pt-12 sm:pt-16 pb-12 sm:pb-16 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedSchedule(null);
          }}
        >
          {selectedSchedule.status === 'ongoing' ? (
            /* ── CHẾ ĐỘ THANH TRA TRỰC BAN ĐANG DIỄN RA (LIVE INSPECTION) ── */
            <div className="relative w-full max-w-5xl my-auto max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-8rem)] flex flex-col rounded-xl border border-slate-300 bg-white shadow-2xl transition-all dark:border-white/10 dark:bg-neutral-900 text-slate-800 dark:text-slate-200 overflow-hidden">
              {/* Top Banner: Thanh tra trực ban */}
              <div className="flex flex-wrap items-center justify-between border-b border-brand-800 px-6 py-4 bg-brand text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white shadow-xs">
                    <Radio className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded">
                        THANH TRA ĐÀO TẠO • TRỰC BAN KỲ THI
                      </span>
                    </div>
                    <h2 className="mt-0.5 text-base sm:text-lg font-bold">
                      {selectedSchedule.title} ({selectedSchedule.courseCode || selectedSchedule.classId})
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNotification({
                        type: 'info',
                        message: `Đã phát thông điệp nhắc nhở quy chế thi tới toàn bộ máy tính thí sinh trong ca thi.`,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white px-3.5 py-1.5 text-xs font-semibold backdrop-blur-xs transition cursor-pointer"
                    title="Phát thanh thông điệp quy chế thi tới toàn bộ thí sinh"
                  >
                    <Megaphone className="h-3.5 w-3.5" />
                    <span>Phát thanh nhắc nhở</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSchedule(null)}
                    aria-label="Đóng thanh tra"
                    className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Body: Logistics & Inspection Panels */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* 1. Thanh chỉ số phòng thi thời gian thực */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-slate-300 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Cán bộ coi thi chính
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">
                      {selectedSchedule.lecturer}
                    </p>
                    <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">
                      Giám thị đang điều hành
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-300 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Sĩ số &amp; Điểm danh
                    </p>
                    <p className="mt-1 text-base font-extrabold text-slate-700 dark:text-slate-300">
                      {attendedInRoom} / {selectedSchedule.studentCount} SV
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Vắng: {Math.max(0, selectedSchedule.studentCount - attendedInRoom)} thí sinh
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-300 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Hình thức &amp; Thời lượng
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                      100% Lập trình thực hành
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {selectedSchedule.durationMinutes} phút • {selectedSchedule.startTime} - {selectedSchedule.endTime}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-300 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Đề thi lập trình
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">
                      {selectedSchedule.templateId || 'TPL-EXAM-01'}
                    </p>
                    <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">
                      Đã bảo mật &amp; đồng bộ
                    </p>
                  </div>
                </div>

                {/* 2. Dual Panels: Bảng danh sách thí sinh phòng thi & Sổ biên bản thanh tra */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Cột trái (7 cols): Bảng danh sách thí sinh + Nút xem màn hình & code */}
                  <div className="lg:col-span-7 rounded-lg border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-950 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-900 dark:text-white" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                          Danh sách thí sinh ({filteredRoomStudents.length} SV)
                        </h4>
                      </div>
                      <div className="relative w-full sm:w-48">
                        <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={studentSearchInRoom}
                          onChange={(e) => setStudentSearchInRoom(e.target.value)}
                          placeholder="Tìm MSSV, tên..."
                          className="h-8 w-full rounded border border-slate-300 bg-white pl-7 pr-2 text-[11px] outline-none focus:border-slate-900 dark:focus:border-white dark:border-white/10 dark:bg-white/5"
                        />
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-lg overflow-hidden dark:border-white/10">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10 text-[10px] font-mono uppercase text-slate-500">
                            <th className="px-3 py-2">STT</th>
                            <th className="px-3 py-2">MÃ SV</th>
                            <th className="px-3 py-2">HỌ VÀ TÊN</th>
                            <th className="px-3 py-2">MÁY SỐ</th>
                            <th className="px-3 py-2">ĐIỂM DANH</th>
                            <th className="px-3 py-2 text-right">THANH TRA MÀN HÌNH</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {filteredRoomStudents.map((st, idx) => (
                            <tr key={st.student_id || idx} className="hover:bg-slate-50 dark:hover:bg-white/5">
                              <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="px-3 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                                {st.student_code}
                              </td>
                              <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white">
                                {st.full_name}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-slate-600 dark:text-slate-300">
                                {st.pc || `PC-0${idx + 1}`}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                {st.attendance_status === 'present' ? (
                                  <span className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                                    Có mặt
                                  </span>
                                ) : (
                                  <span className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                                    Vắng mặt
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => openStudentInspection(st)}
                                  className="system-primary-action inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-800 cursor-pointer shadow-2xs"
                                >
                                  <Monitor className="h-3 w-3" />
                                  <span>Xem màn hình</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Cột phải (5 cols): Sổ biên bản thanh tra trực ban */}
                  <div className="lg:col-span-5 rounded-lg border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-950 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ClipboardList className="h-4 w-4 text-slate-900 dark:text-white" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                          Biên bản thanh tra trực ban
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        BB-TT-{selectedSchedule.roomCode || 'FINAL'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5 dark:border-white/10 dark:bg-white/5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Thông tin ca thi kiểm tra
                        </span>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300">
                          • Môn thi: <strong>{selectedSchedule.title}</strong>
                        </p>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300">
                          • Cán bộ coi thi: <strong>{selectedSchedule.lecturer}</strong>
                        </p>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300">
                          • Đơn vị lập: <strong>Ban Thanh tra &amp; Khảo thí Đào tạo</strong>
                        </p>
                      </div>

                      {/* Danh sách ghi chép biên bản */}
                      <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                        {inspectionNotesList.map((n, i) => (
                          <div key={i} className="rounded border border-slate-200/80 bg-white p-2.5 dark:border-white/10 dark:bg-white/5 text-xs">
                            <span className="font-mono text-slate-900 dark:text-white font-bold">[{n.time}]</span>
                            <p className="mt-0.5 text-slate-700 dark:text-slate-300 leading-snug">{n.text}</p>
                          </div>
                        ))}
                      </div>

                      {/* Form ghi thêm vào biên bản */}
                      <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                            Thêm ghi nhận thanh tra
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsTakingNote(!isTakingNote)}
                            className="text-[11px] font-bold text-slate-900 dark:text-white hover:underline cursor-pointer"
                          >
                            {isTakingNote ? 'Thu gọn' : '+ Nhập nhận xét'}
                          </button>
                        </div>

                        {isTakingNote && (
                          <div className="space-y-2 animate-in fade-in">
                            <textarea
                              value={inspectorNote}
                              onChange={(e) => setInspectorNote(e.target.value)}
                              placeholder="Nhận xét tình hình trật tự phòng thi, tình trạng thiết bị máy tính, sự cố nếu có..."
                              className="w-full h-18 rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-slate-900 dark:focus:border-white dark:border-white/10 dark:bg-white/5"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (inspectorNote.trim()) {
                                    setInspectionNotesList([
                                      ...inspectionNotesList,
                                      {
                                        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                                        text: inspectorNote.trim(),
                                      },
                                    ]);
                                    setInspectorNote('');
                                    setIsTakingNote(false);
                                    setNotification({ type: 'success', message: 'Đã lưu ghi nhận vào biên bản thanh tra.' });
                                  }
                                }}
                                className="system-primary-action rounded bg-slate-900 px-3.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                              >
                                Lưu biên bản
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Thanh tra Live */}
              <div className="border-t border-slate-300 px-6 py-4 bg-slate-50/60 dark:border-white/10 dark:bg-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-slate-500" />
                  <span>
                    Biên bản thanh tra số <strong>BB-TT-{selectedSchedule.roomCode || 'FINAL'}</strong> đang được ghi nhận trực tuyến.
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setNotification({
                        type: 'success',
                        message: `Đã xuất biên bản thanh tra ca thi ${selectedSchedule.title} (PDF).`,
                      });
                    }}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Xuất biên bản</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSchedule(null)}
                    className="system-primary-action inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 cursor-pointer"
                  >
                    Đóng thanh tra
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── CHẾ ĐỘ XEM CHI TIẾT CA THI ĐÃ LÊN LỊCH / ĐÃ KẾT THÚC ── */
            <div className="relative w-full max-w-2xl my-auto max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-slate-300 bg-white p-6 sm:p-7 shadow-2xl transition-all dark:border-white/10 dark:bg-neutral-900 text-slate-800 dark:text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded">
                      MÃ MÔN: {selectedSchedule.courseCode || selectedSchedule.classId || 'CS404'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {selectedSchedule.examKind === 'final' ? 'Thi Kết Thúc Học Phần' : 'Thi Giữa Kỳ'}
                    </span>
                  </div>
                  <h3 className="mt-1 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {selectedSchedule.courseName || selectedSchedule.title}
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
                {/* Box 1: Thông tin Môn học, Kỳ thi, Tín chỉ, Người tạo lịch, Cán bộ */}
                <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 dark:border-white/10 dark:bg-white/5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Tên môn học:</span>
                    <span className="mt-0.5 block font-bold text-slate-900 dark:text-white truncate" title={selectedSchedule.courseName || selectedSchedule.title}>
                      {selectedSchedule.courseName || selectedSchedule.title}
                    </span>
                    <span className="text-[10.5px] text-slate-500 block">Số tín chỉ: {selectedSchedule.creditHours || 3} tín chỉ</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Kỳ thi:</span>
                    <span className="mt-0.5 block font-bold text-slate-800 dark:text-slate-200">
                      {selectedSchedule.examKind === 'final' ? 'Thi Kết Thúc Học Phần' : 'Thi Giữa Kỳ'}
                    </span>
                    <span className="text-[10.5px] text-slate-500 block">Thời lượng: {selectedSchedule.durationMinutes} phút</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Người tạo lịch:</span>
                    <span className="mt-0.5 block font-bold text-slate-900 dark:text-white">
                      {selectedSchedule.examKind === 'final' ? 'Ban Khảo thí' : 'Giảng viên phụ trách lớp'}
                    </span>
                    <span className="text-[10.5px] text-slate-500 block">
                      {selectedSchedule.examKind === 'final' ? 'Hội đồng Khảo thí' : (selectedSchedule.creatorLabel || 'Giảng viên phụ trách')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                      {selectedSchedule.examKind === 'final' ? 'Giám thị coi thi:' : 'Giảng viên phụ trách:'}
                    </span>
                    <span className="mt-0.5 block font-bold text-slate-900 dark:text-white truncate">{selectedSchedule.lecturer}</span>
                    <span className="text-[10.5px] text-slate-500 block">
                      {selectedSchedule.examKind === 'final' ? 'Giám thị phụ trách phòng' : 'Giảng viên phụ trách lớp'}
                    </span>
                  </div>
                </div>

                {/* Box 2: Thời gian thi cụ thể */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 grid grid-cols-2 gap-3 dark:border-white/10 dark:bg-white/5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Giờ &amp; Ngày bắt đầu:</span>
                    <span className="mt-0.5 block font-bold text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                      {selectedSchedule.startTime} • {selectedSchedule.date}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Giờ &amp; Ngày kết thúc:</span>
                    <span className="mt-0.5 block font-bold text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                      {selectedSchedule.endTime} • {selectedSchedule.date}
                    </span>
                  </div>
                </div>

                {/* Box 3: Thông tin Đề thi */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 space-y-1.5 dark:border-white/10 dark:bg-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Bộ đề thi lập trình liên kết
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white sm:text-sm">
                        {selectedSchedule.templateId ? `${selectedSchedule.templateId} - ${selectedSchedule.templateTitle}` : 'Chưa gán đề thi (Bảo mật chống lộ đề)'}
                      </h4>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        Hình thức: <strong>100% Thực hành lập trình trên máy</strong> • Sandbox bảo mật
                      </p>
                    </div>
                    {selectedSchedule.templateId ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          <ShieldCheck className="h-4 w-4 text-slate-500 shrink-0" />
                          Đề thi kết thúc học phần
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const sched = selectedSchedule;
                            setSelectedSchedule(null);
                            setAttachTemplateSchedule(sched);
                            setSelectedTemplateToAttach(sched.templateId || (availableFinalTemplates[0]?.template_id || 1));
                          }}
                          className="system-primary-action inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                        >
                          Đổi đề
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const sched = selectedSchedule;
                          setSelectedSchedule(null);
                          setAttachTemplateSchedule(sched);
                          setSelectedTemplateToAttach(sched.templateId || (availableFinalTemplates[0]?.template_id || 1));
                        }}
                        className="system-primary-action inline-flex items-center gap-1 rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                      >
                        + Gán đề thi ngay
                      </button>
                    )}
                  </div>
                </div>

                {/* Box 4: Danh sách thí sinh */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-3.5 space-y-2 dark:border-white/10 dark:bg-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Sĩ số danh sách thi theo P.Đào tạo ({selectedSchedule.studentCount} sinh viên)
                  </span>
                  <p className="text-xs text-slate-500 italic">
                    Danh sách thí sinh được phòng đào tạo chia ca và phân quyền truy cập tự động đúng ngày giờ thi.
                  </p>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 pt-3.5 border-t border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Trạng thái ca thi:
                  </span>
                  {selectedSchedule.status === 'completed' ? (
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Đã kết thúc (Tự động đóng)
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Đã lên lịch
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSchedule(null)}
                    className="system-primary-action h-9 rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 4: THANH TRA MÀN HÌNH & BÀI LÀM CODE CỦA SINH VIÊN (LIVE STUDENT INSPECTION) ── */}
      {inspectingStudent && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/75 backdrop-blur-[3px] p-4 sm:p-6 pt-12 sm:pt-16 pb-12 sm:pb-16 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setInspectingStudent(null);
          }}
        >
          <div className="relative w-full max-w-5xl my-auto max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-8rem)] flex flex-col rounded-xl overflow-hidden border border-slate-700 bg-neutral-900 shadow-2xl text-slate-200">
            {/* Header Modal Thanh tra sinh viên */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-black/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
                  <Monitor className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded text-slate-300">
                      {inspectingStudent.student_code}
                    </span>
                    <h3 className="text-base font-bold text-white">
                      {inspectingStudent.full_name}
                    </h3>
                    <span className="text-xs font-semibold text-slate-300">
                      • {inspectingStudent.attendance_status === 'present' ? 'Đang làm bài' : 'Vắng mặt'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Máy số: <strong>{inspectingStudent.pc || 'PC-01'}</strong> • Ca thi: {selectedSchedule?.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3 text-slate-300 animate-spin" />
                  Đồng bộ Live
                </span>
                <button
                  type="button"
                  onClick={() => setInspectingStudent(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Split Screen Body: Bên trái là Code Editor, Bên phải là Màn hình & Giám sát */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 overflow-y-auto flex-1">
              {/* Cột trái (7 cols): Live Code IDE Viewer */}
              <div className="lg:col-span-7 flex flex-col rounded-lg border border-slate-800 bg-neutral-950 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 bg-black/30 text-xs">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-slate-900 dark:text-white" />
                    <span className="font-mono font-bold text-slate-300">
                      main.{studentLiveScreenData?.programming_language === 'cpp' ? 'cpp' : studentLiveScreenData?.programming_language === 'java' ? 'java' : 'py'}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {studentLiveScreenData?.programming_language || 'python'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Lưu lần cuối: {studentLiveScreenData?.last_saved_at || 'Vừa xong'}
                  </span>
                </div>

                <div className="flex-1 p-4 font-mono text-xs text-slate-200 overflow-y-auto max-h-[380px] bg-[#0d0b0e] leading-relaxed">
                  {isLoadingLiveScreen ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mr-2 text-slate-900 dark:text-white" />
                      <span>Đang tải mã nguồn của thí sinh...</span>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono">
                      {studentLiveScreenData?.code_content || '# Thí sinh đang thao tác viết mã bài thi...'}
                    </pre>
                  )}
                </div>
              </div>

              {/* Cột phải (5 cols): Live Screen / Snapshot & Giám sát gian lận */}
              <div className="lg:col-span-5 space-y-3.5">
                {/* Khung chụp màn hình thi */}
                <div className="rounded-lg border border-slate-800 bg-neutral-950 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Laptop className="h-4 w-4 text-slate-300" />
                      Màn hình làm bài của thí sinh
                    </span>
                    <span className="text-[10px] font-semibold text-slate-300">
                      Stream ổn định
                    </span>
                  </div>

                  <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
                    {studentLiveScreenData?.snapshot_url ? (
                      <img
                        src={studentLiveScreenData.snapshot_url}
                        alt="Student Live Screen"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Monitor className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-medium">Màn hình IDE Oculide của thí sinh</p>
                        <p className="text-[10px] text-slate-600">Độ phân giải: 1920x1080 • LAN 100Mbps</p>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-slate-300">
                      REC • LIVE
                    </div>
                  </div>
                </div>

                {/* Khung trạng thái tuân thủ quy chế thi */}
                <div className="rounded-lg border border-slate-800 bg-neutral-950 p-3.5 space-y-2 text-xs">
                  <span className="font-bold text-slate-300 block">
                    Chỉ số giám sát tính toàn vẹn (Integrity)
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded bg-white/5 p-2">
                      <span className="text-slate-400 block">Chuyển tab / Cửa sổ:</span>
                      <strong className="text-slate-300">0 lần (Tuân thủ)</strong>
                    </div>
                    <div className="rounded bg-white/5 p-2">
                      <span className="text-slate-400 block">Webcam / Khuôn mặt:</span>
                      <strong className="text-slate-300">Đầy đủ nhận diện</strong>
                    </div>
                  </div>
                </div>

                {/* Gửi nhắc nhở trực tiếp vào màn hình thí sinh */}
                <div className="rounded-lg border border-slate-800 bg-neutral-950 p-3.5 space-y-2 text-xs">
                  <span className="font-bold text-slate-300 block">
                    Gửi cảnh báo / nhắc nhở tới thí sinh
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customWarningMessage}
                      onChange={(e) => setCustomWarningMessage(e.target.value)}
                      placeholder="Nhập nội dung nhắc nhở..."
                      className="h-8 flex-1 rounded border border-slate-700 bg-white/5 px-2.5 text-xs text-white outline-none focus:border-slate-900 dark:focus:border-white"
                    />
                    <button
                      type="button"
                      disabled={isSendingWarning || !customWarningMessage.trim()}
                      onClick={handleSendStudentWarning}
                      className="system-primary-action inline-flex h-8 items-center gap-1 rounded bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="h-3 w-3" />
                      <span>{isSendingWarning ? 'Đang gửi...' : 'Gửi'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal Thanh tra thí sinh */}
            <div className="flex items-center justify-between border-t border-white/10 px-6 py-3 bg-black/40 text-xs shrink-0">
              <span className="text-slate-400">
                Thanh tra trực ban đang giám sát tiến trình làm bài của <strong>{inspectingStudent.full_name}</strong>.
              </span>
              <button
                type="button"
                onClick={() => setInspectingStudent(null)}
                className="system-primary-action h-9 rounded-lg px-4 text-xs font-semibold transition cursor-pointer"
              >
                Đóng màn hình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
