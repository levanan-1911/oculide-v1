'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Radio,
  Sparkles,
  RefreshCw,
  Lock,
  Code2,
  FileCode2,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  Users,
  Layers,
  Globe,
  Camera,
  Smartphone,
  Eye,
  Maximize,
  AlertTriangle,
  Sliders,
  Calendar,
} from 'lucide-react';
import {
  ClassRow,
  QuestionTemplate,
  RoomSession,
  ScheduleSessionItem,
  generateClassRoomCode,
  generateRandomAlphanumericPassword,
  SAMPLE_QUESTION_TEMPLATES,
  INSTRUCTOR_STORAGE_KEY,
  INSTRUCTOR_ROOMS_STORAGE_KEY,
  INSTRUCTOR_SCHEDULES_STORAGE_KEY,
} from '@/components/instructor/classes/types';

const DEFAULT_CLASSES: Array<{ id: string; name: string; studentCount: number }> = [
  { id: 'CS101', name: 'Nhập môn Lập trình C/C++', studentCount: 48 },
  { id: 'PRJ301', name: 'Lập trình ứng dụng Java Web', studentCount: 45 },
  { id: 'CSD201', name: 'Cấu trúc dữ liệu & Giải thuật', studentCount: 42 },
  { id: 'CS102', name: 'Kỹ thuật Lập trình nâng cao', studentCount: 50 },
];

const INITIAL_DEFAULT_SESSIONS = [
  {
    source: 'default',
    classId: 'CS101',
    className: 'Nhập môn Lập trình C/C++',
    roomCode: 'CS101-LAB3',
    dateIso: getTodayDateString(),
    displayDate: 'Hôm nay',
    startTime: '07:30',
    endTime: '09:50',
    status: 'in_progress',
    title: 'Lab 03: Vòng lặp For/While & Mảng 1 chiều',
  },
  {
    source: 'default',
    classId: 'PRJ301',
    className: 'Lập trình ứng dụng Java Web',
    roomCode: 'PRJ-KT01',
    dateIso: getTodayDateString(),
    displayDate: 'Hôm nay',
    startTime: '13:30',
    endTime: '15:00',
    status: 'waiting',
    title: 'Kiểm tra quá trình: Servlet & MVC Pattern',
  },
  {
    source: 'default',
    classId: 'CSD201',
    className: 'Cấu trúc dữ liệu & Giải thuật',
    roomCode: 'CSD-BST4',
    dateIso: getTodayDateString(),
    displayDate: 'Hôm nay',
    startTime: '15:15',
    endTime: '17:35',
    status: 'waiting',
    title: 'Lab 04: Cây nhị phân tìm kiếm (BST)',
  },
];

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateToIso(dateStr?: string): string {
  if (!dateStr) return getTodayDateString();
  const trimmed = dateStr.trim();
  if (trimmed === 'Hôm nay' || trimmed.toLowerCase() === 'today') {
    return getTodayDateString();
  }
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return getTodayDateString();
}

function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getDefaultStartTime(): string {
  const now = new Date();
  // Lấy thời điểm hiện tại cộng 15 phút và làm tròn lên mốc 15 phút tiếp theo
  const futureMs = now.getTime() + 15 * 60 * 1000;
  const futureDate = new Date(futureMs);
  const hours = futureDate.getHours();
  const minutes = futureDate.getMinutes();
  const roundedM = Math.ceil(minutes / 15) * 15;
  if (roundedM >= 60) {
    const nextH = (hours + 1) % 24;
    return `${String(nextH).padStart(2, '0')}:00`;
  }
  return `${String(hours).padStart(2, '0')}:${String(roundedM).padStart(2, '0')}`;
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  if (!startTime || !startTime.includes(':')) return '10:00';
  const [h, m] = startTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '10:00';
  const totalMinutes = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export default function InstructorCreateRoomView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryClass = searchParams?.get('class') || 'CS101';
  const queryType = searchParams?.get('type') === 'exam' ? 'exam' : 'lab';

  const [classesList, setClassesList] = useState(DEFAULT_CLASSES);
  const [selectedClassId, setSelectedClassId] = useState(queryClass);
  const [roomType, setRoomType] = useState<'lab' | 'exam'>(queryType);
  const [roomTitle, setRoomTitle] = useState(() => {
    return queryType === 'exam'
      ? `Bài Kiểm Tra: ${queryClass} - Đánh giá quá trình`
      : `Buổi Thực Hành: ${queryClass} - Lập trình & Thuật toán`;
  });
  const [roomCode, setRoomCode] = useState(() => generateClassRoomCode(queryClass));
  const [roomPassword, setRoomPassword] = useState(() => generateRandomAlphanumericPassword(6));
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [scheduledDate, setScheduledDate] = useState(() => getTodayDateString());
  const [startTime, setStartTime] = useState(() => getDefaultStartTime());
  const [endTime, setEndTime] = useState(() => calculateEndTime(getDefaultStartTime(), 120));
  const [saveToSchedule, setSaveToSchedule] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('TPL-LAB-01');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [existingSessions, setExistingSessions] = useState<Array<{
    source: string;
    classId: string;
    className: string;
    roomCode: string;
    dateIso: string;
    displayDate: string;
    startTime: string;
    endTime: string;
    status: string;
    title: string;
  }>>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadExistingSessions = useCallback(() => {
    if (typeof window === 'undefined') return;
    const list: typeof existingSessions = [];

    try {
      // 1. Từ INSTRUCTOR_ROOMS_STORAGE_KEY
      const rawRooms = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
      if (rawRooms) {
        const parsed: RoomSession[] = JSON.parse(rawRooms);
        parsed.forEach((r) => {
          if (r.status === 'ended') return;
          const rDate = r.scheduledDate || getTodayDateString();
          list.push({
            source: 'room',
            classId: r.classId,
            className: r.className,
            roomCode: r.id,
            dateIso: normalizeDateToIso(rDate),
            displayDate: rDate === getTodayDateString() ? 'Hôm nay' : rDate,
            startTime: r.startTime || '07:30',
            endTime: r.endTime || calculateEndTime(r.startTime || '07:30', r.durationMinutes || 120),
            status: r.status,
            title: r.title,
          });
        });
      }

      // 2. Từ INSTRUCTOR_SCHEDULES_STORAGE_KEY
      const rawSched = localStorage.getItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY);
      if (rawSched) {
        const parsedSched: ScheduleSessionItem[] = JSON.parse(rawSched);
        parsedSched.forEach((s) => {
          if (s.status === 'Đã kết thúc') return;
          if (list.some((item) => item.roomCode.toLowerCase() === s.roomCode.toLowerCase())) return;
          list.push({
            source: 'schedule',
            classId: s.classCode.split('-')[0],
            className: s.className,
            roomCode: s.roomCode,
            dateIso: normalizeDateToIso(s.date),
            displayDate: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            status: s.status,
            title: s.title,
          });
        });
      }

      // 3. Fallback: Bổ sung các ca mặc định từ INITIAL_DEFAULT_SESSIONS nếu chưa có trong storage
      INITIAL_DEFAULT_SESSIONS.forEach((initSess) => {
        if (!list.some((item) => item.roomCode.toLowerCase() === initSess.roomCode.toLowerCase())) {
          list.push(initSess);
        }
      });
    } catch {
      // fallback
    }

    setExistingSessions(list);
  }, []);

  useEffect(() => {
    loadExistingSessions();
    const handleStorage = () => loadExistingSessions();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadExistingSessions]);

  // Kiểm tra thời gian trong quá khứ
  const pastTimeValidation = useMemo(() => {
    const todayStr = getTodayDateString();
    const chosenDateIso = normalizeDateToIso(scheduledDate);

    // 1. Ngày đã qua
    if (chosenDateIso < todayStr) {
      return {
        isPast: true,
        message: `Ngày ca học (${scheduledDate}) đã ở trong quá khứ. Vui lòng chọn ngày từ hôm nay trở đi.`,
      };
    }

    // 2. Cùng ngày hôm nay nhưng giờ bắt đầu đã qua
    if (chosenDateIso === todayStr) {
      const now = new Date();
      const currentTotalM = now.getHours() * 60 + now.getMinutes();
      const startTotalM = timeStringToMinutes(startTime);

      if (startTotalM < currentTotalM) {
        const currentFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        return {
          isPast: true,
          message: `Giờ bắt đầu (${startTime}) đã trôi qua so với thời điểm hiện tại (${currentFormatted}). Không thể tạo lịch trong quá khứ. Vui lòng chọn từ ${currentFormatted} trở đi.`,
        };
      }
    }

    // 3. Giờ kết thúc <= Giờ bắt đầu
    const startM = timeStringToMinutes(startTime);
    const endM = timeStringToMinutes(endTime);
    if (endM <= startM) {
      return {
        isPast: true,
        message: `Giờ kết thúc (${endTime}) phải diễn ra sau giờ bắt đầu (${startTime}).`,
      };
    }

    return { isPast: false, message: null };
  }, [scheduledDate, startTime, endTime]);

  // Kiểm tra xung đột với ca học đang mở / phiên giám sát trực tiếp của TẤT CẢ các lớp phụ trách
  const conflictSession = useMemo(() => {
    const chosenDateIso = normalizeDateToIso(scheduledDate);
    const newStartM = timeStringToMinutes(startTime);
    const newEndM = timeStringToMinutes(endTime);

    return (
      existingSessions.find((s) => {
        if (s.status === 'ended' || s.status === 'Đã kết thúc') return false;
        if (s.roomCode.toLowerCase() === roomCode.toLowerCase()) return false;

        // Nếu khác ngày thì không trùng
        if (s.dateIso !== chosenDateIso) return false;

        // Cùng ngày: kiểm tra giao thoa thời gian (Áp dụng cho TẤT CẢ các lớp của giảng viên)
        const existStartM = timeStringToMinutes(s.startTime);
        const existEndM = timeStringToMinutes(s.endTime);

        // Quy định: Phòng tiếp theo CHỈ được phép tạo khi setup thời gian sau khi phòng hiện tại đã kết thúc phiên giám sát (startTime >= s.endTime)
        // Giao thoa thời gian khi newStart < existEnd && newEnd > existStart
        const hasOverlap = newStartM < existEndM && newEndM > existStartM;
        return hasOverlap;
      }) || null
    );
  }, [existingSessions, scheduledDate, startTime, endTime, roomCode]);

  const handleSetAfterConflict = (conflictEndTime: string) => {
    handleStartTimeChange(conflictEndTime);
    showToast(`Đã chỉnh giờ bắt đầu sang ${conflictEndTime} (ngay sau khi ca hiện tại kết thúc)`);
  };

  const handleSetTomorrow = () => {
    const base = new Date();
    base.setDate(base.getDate() + 1);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    const tomorrowStr = `${y}-${m}-${d}`;
    setScheduledDate(tomorrowStr);
    showToast(`Đã chuyển ngày sang ngày mai (${tomorrowStr})`);
  };

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    setEndTime(calculateEndTime(newStart, durationMinutes));
  };

  const handleDurationChange = (newMins: number) => {
    setDurationMinutes(newMins);
    setEndTime(calculateEndTime(startTime, newMins));
  };

  // RÀNG BUỘC CỦA PHÒNG (SETUP CONSTRAINTS)
  const [requireCamera, setRequireCamera] = useState(queryType === 'exam');
  const [aiFaceDetection, setAiFaceDetection] = useState(queryType === 'exam');
  const [aiPhoneDetection, setAiPhoneDetection] = useState(queryType === 'exam');
  const [lockdownFullscreen, setLockdownFullscreen] = useState(queryType === 'exam');
  const [blockTabSwitch, setBlockTabSwitch] = useState(queryType === 'exam');
  const [webAccessPolicy, setWebAccessPolicy] = useState<'strict' | 'whitelist' | 'open'>(
    queryType === 'exam' ? 'strict' : 'open'
  );
  const [maxTabSwitches, setMaxTabSwitches] = useState<number>(queryType === 'exam' ? 0 : 999);

  // Khởi tạo danh sách lớp từ localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(INSTRUCTOR_STORAGE_KEY);
        if (raw) {
          const parsed: ClassRow[] = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setClassesList(
              parsed.map((c) => ({
                id: c.id,
                name: c.name,
                studentCount: c.studentCount || c.students?.length || 40,
              }))
            );
          }
        }
      } catch {
        // fallback
      }
    }
  }, []);

  // Cập nhật cấu hình ràng buộc mặc định khi đổi loại phòng (Lab vs Exam)
  const handleApplyPreset = (type: 'lab' | 'exam') => {
    setRoomType(type);
    const curClass = classesList.find((c) => c.id === selectedClassId) || classesList[0];

    if (type === 'lab') {
      setRoomTitle(`Buổi Thực Hành: ${curClass.id} - Thao tác mảng & giải thuật`);
      setDurationMinutes(120);
      setEndTime(calculateEndTime(startTime, 120));
      setSelectedTemplateId('TPL-LAB-01');
      // Ràng buộc cho Lab: Mở, tự do
      setRequireCamera(false);
      setAiFaceDetection(false);
      setAiPhoneDetection(false);
      setLockdownFullscreen(false);
      setBlockTabSwitch(false);
      setWebAccessPolicy('open');
      setMaxTabSwitches(999);
    } else {
      setRoomTitle(`Bài Kiểm Tra: ${curClass.id} - Đánh giá năng lực lập trình`);
      setDurationMinutes(60);
      setEndTime(calculateEndTime(startTime, 60));
      setSelectedTemplateId('TPL-EXAM-01');
      // Ràng buộc cho Exam: Nghiêm ngặt
      setRequireCamera(true);
      setAiFaceDetection(true);
      setAiPhoneDetection(true);
      setLockdownFullscreen(true);
      setBlockTabSwitch(true);
      setWebAccessPolicy('strict');
      setMaxTabSwitches(0);
    }
  };

  const handleRegenerateCodes = (classId: string) => {
    const newCode = generateClassRoomCode(classId);
    const newPass = generateRandomAlphanumericPassword(6);
    setRoomCode(newCode);
    setRoomPassword(newPass);
  };

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    handleRegenerateCodes(newClassId);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const curClass = classesList.find((c) => c.id === selectedClassId) || classesList[0];
  const selectedTemplate =
    SAMPLE_QUESTION_TEMPLATES.find((t) => t.id === selectedTemplateId) || SAMPLE_QUESTION_TEMPLATES[0];

  // Khởi tạo phòng chờ
  const handleCreateRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Kiểm tra không cho phép tạo phòng trong quá khứ
    if (pastTimeValidation.isPast) {
      showToast(pastTimeValidation.message || 'Không thể tạo phòng với thời gian trong quá khứ!');
      return;
    }

    // 2. Kiểm tra không cho phép tạo phòng trùng lịch với ca đang mở giám sát
    if (conflictSession) {
      showToast(
        `Trùng lịch: Lớp đã có ca [${conflictSession.roomCode}] mở từ ${conflictSession.startTime} - ${conflictSession.endTime}. Vui lòng chọn sau ${conflictSession.endTime} hoặc ngày khác!`
      );
      return;
    }

    let studentsToSeed: Array<{ id: string; name: string; email: string }> = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(INSTRUCTOR_STORAGE_KEY);
        if (raw) {
          const parsed: ClassRow[] = JSON.parse(raw);
          const found = parsed.find((c) => c.id === selectedClassId);
          if (found && found.students && found.students.length > 0) {
            studentsToSeed = found.students;
          }
        }
      } catch {
        // fallback
      }
    }

    if (studentsToSeed.length === 0) {
      studentsToSeed = [
        { id: 'SE184801', name: 'Nguyễn Văn An', email: 'an.nv@school.edu.vn' },
        { id: 'SE184802', name: 'Trần Thị Bình', email: 'binh.tt@school.edu.vn' },
        { id: 'SE184803', name: 'Lê Hoàng Cường', email: 'cuong.lh@school.edu.vn' },
        { id: 'SE184804', name: 'Phạm Minh Châu', email: 'chau.pm@school.edu.vn' },
        { id: 'SE184805', name: 'Đặng Tuấn Dương', email: 'duong.dt@school.edu.vn' },
        { id: 'SE184806', name: 'Vũ Hải Yến', email: 'yen.vh@school.edu.vn' },
      ];
    }

    const attendees = studentsToSeed.map((s, idx) => {
      const isJoined = idx < Math.ceil(studentsToSeed.length * 0.85);
      return {
        studentId: s.id,
        studentName: s.name,
        studentEmail: s.email,
        status: (isJoined ? 'waiting' : 'absent') as 'waiting' | 'absent',
        joinedAt: isJoined ? `07:${30 + (idx % 15)}:${10 + (idx % 50)}` : undefined,
        device: isJoined ? 'Laptop cá nhân (Windows 11 / Chrome 124)' : undefined,
        cameraReady: isJoined,
      };
    });

    const newRoom: RoomSession = {
      id: roomCode,
      classId: curClass.id,
      className: curClass.name,
      password: roomPassword,
      type: roomType,
      title: roomTitle.trim() || `${curClass.id} - ${roomType === 'lab' ? 'Thực hành' : 'Kiểm tra'}`,
      templateId: selectedTemplate.id,
      templateTitle: selectedTemplate.title,
      templateLanguage: selectedTemplate.language,
      durationMinutes: durationMinutes,
      scheduledDate: scheduledDate,
      startTime: startTime,
      endTime: endTime,
      savedToSchedule: saveToSchedule,
      status: 'waiting', // Bắt đầu ở trạng thái phòng chờ (Lobby)
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      proctoringConfig: {
        lockdownFullscreen,
        aiFaceDetection,
        aiObjectDetection: aiPhoneDetection,
        allowTabSwitch: !blockTabSwitch,
      },
      attendees,
    };

    if (typeof window !== 'undefined') {
      try {
        let existingRooms: RoomSession[] = [];
        const raw = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
        if (raw) existingRooms = JSON.parse(raw);
        localStorage.setItem(INSTRUCTOR_ROOMS_STORAGE_KEY, JSON.stringify([newRoom, ...existingRooms]));

        // Lưu vào Lịch Giảng Dạy (/instructor/schedules)
        if (saveToSchedule) {
          const isToday = scheduledDate === getTodayDateString();
          const displayDate = isToday
            ? 'Hôm nay'
            : new Date(scheduledDate).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });

          const newScheduleItem: ScheduleSessionItem = {
            id: `SES-${roomCode}`,
            classCode: curClass.id,
            className: curClass.name,
            title: newRoom.title,
            type: roomType === 'lab' ? 'LAB' : 'EXAM',
            language: selectedTemplate.language || 'C++',
            startTime: startTime,
            endTime: endTime,
            date: displayDate,
            roomCode: roomCode,
            passcode: roomPassword,
            status: 'Sắp diễn ra',
            enrolledStudents: curClass.studentCount,
            attendedStudents: 0,
            isAiProctored: Boolean(requireCamera || aiFaceDetection || aiPhoneDetection || lockdownFullscreen),
          };

          let existingSchedules: ScheduleSessionItem[] = [];
          const rawSched = localStorage.getItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY);
          if (rawSched) existingSchedules = JSON.parse(rawSched);
          localStorage.setItem(
            INSTRUCTOR_SCHEDULES_STORAGE_KEY,
            JSON.stringify([newScheduleItem, ...existingSchedules.filter((s) => s.roomCode !== roomCode)])
          );
        }

        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.error(err);
      }
    }

    showToast(`Đã tạo phòng chờ ${roomCode} và lưu vào Lịch Giảng Dạy thành công!`);

    // Điều hướng vào phòng chờ để điểm danh sinh viên trước khi bắt đầu
    setTimeout(() => {
      router.push(`/instructor/room/${roomCode}`);
    }, 400);
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-10">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4.5 py-3 text-xs font-medium text-white shadow-xl animate-in slide-in-from-bottom-2 duration-200 border border-slate-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3.5">
          <Link
            href="/instructor/classes"
            className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
            title="Quay lại danh sách lớp"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Thiết Lập Phòng Học &amp; Điểm Danh
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200/80 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                Quy trình: Setup &rarr; Phòng Chờ &rarr; Bắt Đầu &rarr; Giám Sát
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Cấu hình các ràng buộc kiểm soát camera, quản lý mở trang web khác, sinh mã phòng ngẫu nhiên và chọn bộ đề thi.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleCreateRoomSubmit} className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12 xl:gap-6">
        {/* CỘT TRÁI (7 CỘT): CẤU HÌNH LỚP, MÃ PHÒNG VÀ CÁC RÀNG BUỘC */}
        <div className="min-w-0 space-y-5 xl:col-span-7">
          {/* 1. Lớp học phần & Mã phòng ngẫu nhiên */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4 hover:border-slate-300/80 transition-all">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <Users className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                1. Lớp Học Phần &amp; Mã Phòng Ngẫu Nhiên
              </h2>
            </div>

            <div className="space-y-4">
              {/* Thẻ Lớp học phần cố định rộng rãi không bị rút gọn N... */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    LỚP HỌC PHẦN PHỤ TRÁCH *
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700">
                    <Lock className="h-3 w-3 text-blue-600" />
                    Cố định theo lớp đã chọn
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-200/90 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 p-3.5 text-xs text-slate-800 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs font-black bg-blue-600 text-white px-2.5 py-1 rounded-lg shadow-2xs shrink-0">
                      {curClass.id}
                    </span>
                    <span className="font-black text-slate-900 text-xs sm:text-sm">
                      {curClass.name}
                    </span>
                    <span className="text-slate-500 font-bold bg-white/90 px-2 py-0.5 rounded-md border border-slate-200/70 shrink-0">
                      {curClass.studentCount} Sinh viên
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-blue-700 border border-blue-200/90 shrink-0 shadow-2xs self-start sm:self-auto">
                    <Lock className="h-3.5 w-3.5 text-blue-600" />
                    Lớp Đã Khóa
                  </span>
                </div>
              </div>

              {/* Tên buổi học / ca thi toàn chiều rộng */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  TÊN BUỔI HỌC / CA THI *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Buổi thực hành Lab 03 - Vòng lặp For/While"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  className="h-10.5 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 px-4 text-xs font-semibold text-slate-800 outline-none transition-all hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Mã phòng & Mật khẩu sinh tự động */}
            <div className="rounded-2xl border border-blue-100/90 bg-gradient-to-br from-blue-50/70 via-indigo-50/20 to-white p-4.5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Radio className="h-4 w-4 text-blue-600 animate-pulse" />
                  Mã Phòng &amp; Mật Khẩu (Sinh Tự Động):
                </span>
                <button
                  type="button"
                  onClick={() => handleRegenerateCodes(selectedClassId)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white border border-blue-200/90 hover:border-blue-300 px-3 py-1.5 rounded-lg shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                  title="Sinh lại mã ngẫu nhiên mới"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Tạo Lại Mã Ngẫu Nhiên</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="rounded-xl border border-blue-200/90 bg-white p-3.5 shadow-2xs space-y-1.5 hover:shadow-xs transition-all">
                  <div className="flex items-center justify-between text-[10.5px] uppercase font-bold text-slate-500">
                    <span>MÃ PHÒNG (ROOM CODE)</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(roomCode, 'code')}
                      className="rounded-lg p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                      title="Sao chép mã phòng"
                    >
                      {copiedKey === 'code' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-lg font-black text-blue-700 tracking-wider">
                      {roomCode}
                    </code>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-medium">Định dạng: {selectedClassId}xxx (3 ký tự hoa/thường/số)</span>
                </div>

                <div className="rounded-xl border border-blue-200/90 bg-white p-3.5 shadow-2xs space-y-1.5 hover:shadow-xs transition-all">
                  <div className="flex items-center justify-between text-[10.5px] uppercase font-bold text-slate-500">
                    <span>MẬT KHẨU PIN PHÒNG</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(roomPassword, 'pin')}
                      className="rounded-lg p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                      title="Sao chép mã PIN"
                    >
                      {copiedKey === 'pin' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-lg font-black text-slate-900 tracking-wider">
                      {roomPassword}
                    </code>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-medium">6 ký tự ngẫu nhiên in hoa thường &amp; số</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Loại phòng & Preset */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4 hover:border-slate-300/80 transition-all">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Layers className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  2. Loại Hình Phòng Học
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">Chọn cấu hình mẫu</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Buổi Thực Hành Lab */}
              <div
                onClick={() => handleApplyPreset('lab')}
                className={`rounded-2xl border p-4 sm:p-5 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  roomType === 'lab'
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top row: Icon on left, Badge on right */}
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100/90 text-blue-700 shadow-2xs">
                      <Code2 className="h-5 w-5" />
                    </div>
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-extrabold text-emerald-800 border border-emerald-200 shadow-2xs">
                      Chế độ mở
                    </span>
                  </div>

                  {/* Title & subtitle */}
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">
                      Phòng Thực Hành (Lab)
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Không phạt rời tab • Tra cứu tự do
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed min-h-[44px]">
                    Sinh viên được tự do tra cứu tài liệu, không bị phạt khi chuyển Tab trình duyệt, camera tùy chọn theo giảng viên.
                  </p>
                </div>

                {/* Footer checklist */}
                <div className="text-[11px] font-bold text-blue-700 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">Tra cứu tự do • Không phạt chuyển tab</span>
                </div>
              </div>

              {/* Option 2: Phòng Kiểm Tra / Thi */}
              <div
                onClick={() => handleApplyPreset('exam')}
                className={`rounded-2xl border p-4 sm:p-5 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  roomType === 'exam'
                    ? 'border-purple-500 bg-gradient-to-br from-purple-50/80 via-white to-purple-50/30 shadow-xs ring-2 ring-purple-500/20'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top row: Icon on left, Badge on right */}
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100/90 text-purple-700 shadow-2xs">
                      <FileCode2 className="h-5 w-5" />
                    </div>
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-purple-100 px-3 py-1 text-[11px] font-extrabold text-purple-800 border border-purple-200 shadow-2xs">
                      Lockdown Fullscreen
                    </span>
                  </div>

                  {/* Title & subtitle */}
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">
                      Phòng Kiểm Tra / Thi
                    </h3>
                    <p className="text-[11px] text-purple-700 font-semibold mt-0.5">
                      Khóa toàn màn hình • AI Giám sát
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed min-h-[44px]">
                    Bắt buộc khóa toàn màn hình. Bật Camera AI nhận diện điện thoại, quay mặt đi, rời khỏi máy và quản lý tab khắt khe.
                  </p>
                </div>

                {/* Footer checklist */}
                <div className="text-[11px] font-bold text-purple-700 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span className="truncate">Khóa Fullscreen • AI Giám sát 100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. THIẾT LẬP THỜI GIAN CA HỌC & LƯU VÀO LỊCH */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4 hover:border-slate-300/80 transition-all">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  3. Thiết Lập Thời Gian &amp; Lưu Vào Lịch Giảng Dạy
                </h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200">
                Đồng bộ Lịch Giảng Dạy
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Ngày diễn ra */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Ngày ca học / thi:
                </label>
                <input
                  type="date"
                  min={getTodayDateString()}
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 p-2.5 text-xs font-bold text-slate-800 outline-none transition-all hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                  required
                />
              </div>

              {/* Giờ bắt đầu */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Giờ bắt đầu:
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 p-2.5 text-xs font-bold text-slate-800 outline-none transition-all hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                  required
                />
              </div>

              {/* Giờ kết thúc */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Giờ kết thúc:
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 p-2.5 text-xs font-bold text-slate-800 outline-none transition-all hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                  required
                />
              </div>
            </div>

            {/* CẢNH BÁO THỜI GIAN TRONG QUÁ KHỨ */}
            {pastTimeValidation.isPast && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 space-y-1 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 font-bold text-red-900">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>Thời Gian Không Hợp Lệ (Trong quá khứ)</span>
                </div>
                <p className="leading-relaxed pl-6">{pastTimeValidation.message}</p>
              </div>
            )}

            {/* CẢNH BÁO TRÙNG LỊCH VỚI CA ĐANG MỞ / ĐANG GIÁM SÁT */}
            {conflictSession && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 space-y-3 animate-in fade-in duration-150 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="text-xs font-bold uppercase tracking-wider text-amber-950 block">
                      {conflictSession.classId.toUpperCase() === selectedClassId.toUpperCase()
                        ? 'Phát hiện trùng lịch với ca học đang mở của lớp này:'
                        : `Phát hiện trùng lịch với ca học của lớp ${conflictSession.classId}:`}
                    </strong>
                    <p className="leading-relaxed">
                      {conflictSession.classId.toUpperCase() === selectedClassId.toUpperCase() ? (
                        <>
                          Lớp <strong className="font-extrabold">{curClass.id}</strong> đã có ca học{' '}
                          <strong className="font-mono font-bold text-blue-800">[{conflictSession.roomCode}]</strong>{' '}
                          (<i>{conflictSession.title}</i>) diễn ra trong khung giờ{' '}
                          <strong className="text-amber-900 font-extrabold">{conflictSession.startTime} - {conflictSession.endTime}</strong> ngày{' '}
                          <strong>{conflictSession.displayDate}</strong>.
                        </>
                      ) : (
                        <>
                          Giảng viên đã có ca học tại lớp{' '}
                          <strong className="font-extrabold text-blue-900">{conflictSession.classId} — {conflictSession.className}</strong>:{' '}
                          Mã phòng <strong className="font-mono font-bold text-blue-800">[{conflictSession.roomCode}]</strong>{' '}
                          (<i>{conflictSession.title}</i>) diễn ra trong khung giờ{' '}
                          <strong className="text-amber-900 font-extrabold">{conflictSession.startTime} - {conflictSession.endTime}</strong> ngày{' '}
                          <strong>{conflictSession.displayDate}</strong>.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-3 border border-amber-200/80 text-[11.5px] text-amber-800 space-y-2">
                  <span className="font-bold flex items-center gap-1.5 text-amber-900">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    Quy chế giám sát đa lớp:
                  </span>
                  <p className="leading-relaxed">
                    Giảng viên <strong>không thể giám sát song song nhiều ca/nhiều lớp cùng một thời điểm</strong> (áp dụng cho toàn bộ các lớp phụ trách). Bạn chỉ có thể tạo phòng chờ tiếp theo khi thiết lập thời gian <strong>sau {conflictSession.endTime}</strong> (khi ca của lớp {conflictSession.classId} kết thúc) hoặc chọn <strong>ngày khác</strong>.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSetAfterConflict(conflictSession.endTime)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1.5 font-extrabold text-xs transition cursor-pointer shadow-2xs"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Đặt giờ bắt đầu thành {conflictSession.endTime}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSetTomorrow}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1.5 font-extrabold text-xs transition cursor-pointer shadow-2xs"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Chuyển sang ngày mai</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lựa chọn thời lượng */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                Thời lượng ca học: <strong className="text-blue-700 ml-1">{durationMinutes} phút</strong>
              </span>
              <div className="flex items-center gap-1.5">
                {[45, 60, 90, 120, 150].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleDurationChange(mins)}
                    className={`h-8 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      durationMinutes === mins
                        ? 'bg-blue-600 text-white shadow-xs scale-105'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {mins}p
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox lưu vào lịch */}
            <label className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
              saveToSchedule
                ? 'border-blue-300 bg-blue-50/60 shadow-2xs'
                : 'border-slate-200/80 bg-slate-50/40 hover:bg-slate-50'
            }`}>
              <input
                type="checkbox"
                checked={saveToSchedule}
                onChange={(e) => setSaveToSchedule(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-blue-900 block">
                  Tự động lưu ca học này vào Lịch Giảng Dạy (/instructor/schedules)
                </span>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Ca học sẽ tự động xuất hiện trên Lịch ca dạy và giảng viên có thể xem lịch, gia hạn hoặc kích hoạt phòng thi theo kế hoạch.
                </p>
              </div>
            </label>
          </div>

          {/* 4. THIẾT LẬP RÀNG BUỘC (SETUP CONSTRAINTS: CAM, QUẢN LÝ WEB, FULLSCREEN...) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4 hover:border-slate-300/80 transition-all">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Sliders className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  4. Thiết Lập Ràng Buộc &amp; Giám Sát Chống Gian Lận
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-blue-600">Tùy chỉnh linh hoạt</span>
            </div>

            {/* Nhóm A: Ràng buộc Camera & AI */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                A. Ràng Buộc Camera &amp; Trí Tuệ Nhân Tạo (AI)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition-all ${
                  requireCamera
                    ? 'border-blue-400 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20'
                    : 'border-slate-200/90 bg-white hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={requireCamera}
                    onChange={(e) => setRequireCamera(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-blue-600" />
                      Bật Camera
                    </span>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">Bắt buộc webcam sinh viên trước khi vào làm bài</p>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition-all ${
                  aiFaceDetection
                    ? 'border-indigo-400 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500/20'
                    : 'border-slate-200/90 bg-white hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={aiFaceDetection}
                    onChange={(e) => setAiFaceDetection(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-indigo-600" />
                      AI Khuôn Mặt
                    </span>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">Phát hiện quay mặt, nhiều người hoặc rời màn hình</p>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition-all ${
                  aiPhoneDetection
                    ? 'border-rose-400 bg-rose-50/50 shadow-xs ring-1 ring-rose-500/20'
                    : 'border-slate-200/90 bg-white hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={aiPhoneDetection}
                    onChange={(e) => setAiPhoneDetection(e.target.checked)}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-rose-600" />
                      AI Điện Thoại
                    </span>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">Cảnh báo đỏ khi phát hiện dùng smartphone</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Nhóm B: Quản lý các trang web khác & Toàn màn hình */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                B. Ràng Buộc Màn Hình &amp; Quản Lý Mở Trang Web Khác
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition-all ${
                  lockdownFullscreen
                    ? 'border-purple-400 bg-purple-50/50 shadow-xs ring-1 ring-purple-500/20'
                    : 'border-slate-200/90 bg-white hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={lockdownFullscreen}
                    onChange={(e) => setLockdownFullscreen(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Maximize className="h-3.5 w-3.5 text-purple-600" />
                      Khóa Toàn Màn Hình (Lockdown)
                    </span>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">Ngăn thu nhỏ cửa sổ trình duyệt hoặc thoát fullscreen</p>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition-all ${
                  blockTabSwitch
                    ? 'border-purple-400 bg-purple-50/50 shadow-xs ring-1 ring-purple-500/20'
                    : 'border-slate-200/90 bg-white hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={blockTabSwitch}
                    onChange={(e) => setBlockTabSwitch(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-purple-600" />
                      Chặn Chuyển Tab Trình Duyệt
                    </span>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">Cảnh báo vi phạm ngay khi mở tab hoặc ứng dụng khác</p>
                  </div>
                </label>
              </div>

              {/* Chính sách quản lý các trang web khác */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-slate-600" />
                    Chính Sách Quản Lý Trang Web Khác:
                  </span>
                  <select
                    value={webAccessPolicy}
                    onChange={(e) => setWebAccessPolicy(e.target.value as any)}
                    className="h-8.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="strict">Cấm toàn bộ trang web khác (Block All External Web)</option>
                    <option value="whitelist">Chỉ cho phép tra cứu Whitelist kỹ thuật</option>
                    <option value="open">Môi trường mở tự do (Dành cho buổi Lab)</option>
                  </select>
                </div>

                {webAccessPolicy === 'whitelist' && (
                  <p className="text-[11px] text-blue-700 bg-blue-50/90 p-2.5 rounded-lg border border-blue-200 leading-relaxed font-medium">
                    🌐 <strong>Whitelist cho phép:</strong> <code className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200">docs.oracle.com</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200">cppreference.com</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200">w3schools.com</code>. Mọi trang web khác bị chặn.
                  </p>
                )}
                {webAccessPolicy === 'strict' && (
                  <p className="text-[11px] text-purple-800 bg-purple-50/90 p-2.5 rounded-lg border border-purple-200 leading-relaxed font-medium">
                    🔒 <strong>Cấm tuyệt đối:</strong> Mọi hành vi mở tab ngoài đều bị ghi nhận vi phạm AI và thông báo lên màn hình giám sát.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (5 CỘT): CHỌN ĐỀ THI TỪ MODULE ĐỀ & KHỞI TẠO PHÒNG CHỜ (STICKY ON DESKTOP) */}
        <div className="min-w-0 space-y-5 xl:sticky xl:top-4 xl:col-span-5 xl:self-start">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4 hover:border-slate-300/80 transition-all">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  5. Chọn Bộ Đề (Từ Module Đề)
                </h2>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-full">
                {SAMPLE_QUESTION_TEMPLATES.length} Đề Trong Ngân Hàng
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Chọn bộ đề thi / bài lab từ Module Đề &amp; Câu hỏi để giao cho sinh viên phòng này:
            </p>

            {/* Danh sách đề thi với thanh cuộn hiện đại */}
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
              {SAMPLE_QUESTION_TEMPLATES.map((tpl) => {
                const isSelected = tpl.id === selectedTemplateId;

                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`rounded-xl border p-3.5 cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/30 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10.5px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {tpl.id}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          tpl.language === 'C++'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {tpl.language}
                        </span>
                      </div>
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          <Check className="h-3 w-3 stroke-[3]" />
                          Đang chọn
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold">Bấm để chọn</span>
                      )}
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{tpl.title}</h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{tpl.description}</p>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10.5px] font-medium text-slate-500">
                      <span>{tpl.questionCount} câu hỏi lập trình</span>
                      <span className="font-bold text-blue-700">Thời lượng: {tpl.durationMinutes} phút</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tóm tắt & Nút khởi tạo phòng chờ */}
            <div className="pt-3 border-t border-slate-100 space-y-3.5">
              <div className="rounded-xl bg-slate-50/90 border border-slate-200/90 p-3.5 text-xs space-y-2 shadow-2xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-[11px]">Lớp phụ trách:</span>
                  <strong className="text-slate-900 font-extrabold">{curClass.id} ({curClass.studentCount} SV)</strong>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-[11px]">Mã phòng ngẫu nhiên:</span>
                  <code className="font-mono font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{roomCode}</code>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-[11px]">Mật khẩu PIN:</span>
                  <code className="font-mono font-black text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">{roomPassword}</code>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-[11px]">Thời gian ca học:</span>
                  <strong className="text-slate-900 font-bold">
                    {startTime} - {endTime} ({durationMinutes}p)
                  </strong>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-[11px]">Lịch giảng dạy:</span>
                  <span className={`font-bold ${saveToSchedule ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {saveToSchedule ? '✓ Đã bật lưu lịch' : 'Không lưu lịch'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-[11px]">Ràng buộc:</span>
                  <span className="font-bold text-slate-800 text-[11px]">
                    {requireCamera ? '📷 Camera' : 'Cam tùy chọn'} • {lockdownFullscreen ? '🔒 Khóa Fullscreen' : 'Mở'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/60">
                  <span className="text-[11px]">Bộ đề giao:</span>
                  <strong className="text-slate-900 truncate max-w-[200px] text-right font-bold">{selectedTemplate.title}</strong>
                </div>
              </div>

              {/* Cảnh báo trước khi bấm nút tạo phòng */}
              {pastTimeValidation.isPast ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-xs font-bold text-red-700 animate-in fade-in duration-150">
                  ⚠️ Không thể tạo phòng: Thời gian thiết lập ở trong quá khứ!
                </div>
              ) : conflictSession ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-center text-xs font-bold text-amber-900 animate-in fade-in duration-150">
                  ⚠️ Trùng lịch giám sát ({conflictSession.startTime} - {conflictSession.endTime}) với ca {conflictSession.roomCode} (Lớp {conflictSession.classId})!
                </div>
              ) : null}

              {/* Nút hành động */}
              <button
                type="submit"
                disabled={Boolean(pastTimeValidation.isPast || conflictSession)}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-extrabold text-white shadow-md transition-all active:scale-[0.99] ${
                  pastTimeValidation.isPast || conflictSession
                    ? 'bg-slate-400 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/25 cursor-pointer shadow-blue-500/20'
                }`}
              >
                <Radio className="h-4 w-4 animate-pulse" />
                <span>Tạo Phòng Chờ &amp; Lưu Vào Lịch</span>
              </button>
              <p className="text-[10.5px] text-center text-slate-400 font-medium">
                {conflictSession || pastTimeValidation.isPast
                  ? 'Vui lòng điều chỉnh thời gian hợp lệ để tiếp tục tạo phòng chờ.'
                  : 'Phòng mới sẽ được lưu ở trạng thái Chờ (Waiting) trong Lịch Giảng Dạy cho đến khi bạn bắt đầu ca học.'}
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
