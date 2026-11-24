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
  Loader2,
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
import { fetchWithAuth } from '@/services/apiClient';

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
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      if (parts[2].length === 4) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const y = parts[2];
        if (p0 > 12) {
          return `${y}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
        } else if (p1 > 12) {
          return `${y}-${String(p0).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
        } else {
          return `${y}-${String(p0).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
        }
      }
    }
  }
  return trimmed;
}

function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getInitialSchedule(leadMinutes = 0): { dateStr: string; startTime: string } {
  const now = new Date();
  const target = leadMinutes > 0 ? new Date(now.getTime() + leadMinutes * 60 * 1000) : now;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    dateStr: `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`,
    startTime: `${pad(target.getHours())}:${pad(target.getMinutes())}`,
  };
}

function computeScheduleIso(dateStr: string, startTime: string, durationMinutes: number) {
  const [year, month, day] = (dateStr || getTodayDateString()).split('-').map(Number);
  const [hours, minutes] = (startTime || '08:00').split(':').map(Number);
  const start = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0);
  const end = new Date(start.getTime() + (durationMinutes || 60) * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const startIso = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}:00`;
  const endIso = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}:00`;
  const displayEndTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  return { startIso, endIso, displayEndTime };
}

function getDefaultStartTime(): string {
  return getInitialSchedule(15).startTime;
}

function calculateEndTime(startTime: string, durationMinutes: number, dateStr?: string): string {
  const { displayEndTime } = computeScheduleIso(dateStr || getTodayDateString(), startTime, durationMinutes);
  return displayEndTime;
}

export default function InstructorCreateRoomView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryClass = searchParams?.get('class') || 'CS101';
  const queryType = searchParams?.get('type') === 'exam' ? 'exam' : 'lab';
  const returnToSchedules = searchParams?.get('returnTo') === 'schedules';

  const [classesList, setClassesList] = useState(DEFAULT_CLASSES);
  const [selectedClassId, setSelectedClassId] = useState(queryClass);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roomType, setRoomType] = useState<'lab' | 'midterm'>(queryType === 'exam' ? 'midterm' : 'lab');
  const [roomTitle, setRoomTitle] = useState(() => {
    return queryType === 'exam'
      ? `Bài Kiểm Tra: ${queryClass} - Đánh giá quá trình`
      : `Buổi Thực Hành: ${queryClass} - Lập trình & Thuật toán`;
  });
  // Các giá trị ngẫu nhiên/ngày giờ được khởi tạo sau khi hydrate để HTML server và client giống nhau.
  const [roomCode, setRoomCode] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isClientReady, setIsClientReady] = useState(false);
  const [saveToSchedule, setSaveToSchedule] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none');
  const [templatesList, setTemplatesList] = useState<QuestionTemplate[]>([
    {
      id: 'none',
      title: 'Chưa gán đề (Sẽ gán sau khi mở phòng)',
      type: 'lab',
      category: 'Cấu hình tự do',
      language: 'Tất cả ngôn ngữ',
      questionCount: 0,
      durationMinutes: 0,
      description: 'Cho phép khởi tạo phòng chờ điểm danh trước; bài tập thực hành hoặc đề thi sẽ gán sau khi chốt danh sách.',
    },
  ]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Nạp danh sách bộ đề mẫu từ Backend theo loại phòng (Lab / Giữa kỳ)
  useEffect(() => {
    let isCancelled = false;
    async function loadTemplates() {
      const defaultOption: QuestionTemplate = {
        id: 'none',
        title: 'Chưa gán đề (Sẽ gán sau khi mở phòng)',
        type: roomType,
        category: 'Cấu hình tự do',
        language: 'Tất cả ngôn ngữ',
        questionCount: 0,
        durationMinutes: 0,
        description: 'Cho phép khởi tạo phòng chờ điểm danh trước; bài tập thực hành hoặc đề thi sẽ gán sau khi chốt danh sách.',
      };

      try {
        const data = await fetchWithAuth<any[]>(`/api/v1/rooms/templates?room_type=${roomType}`);
        if (isCancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          const mapped: QuestionTemplate[] = data.map((t: any) => ({
            id: String(t.id),
            title: t.title || t.code || `Bộ đề #${t.id}`,
            type: ['final_exam', 'final'].includes(String(t.type).toLowerCase())
              ? 'final'
              : ['midterm', 'midterm_exam'].includes(String(t.type).toLowerCase())
                ? 'midterm'
                : t.type === 'exam'
                  ? 'exam'
                  : 'lab',
            category: t.type === 'lab' ? 'Thực hành' : 'Thi',
            language: 'C/C++/Java/Python',
            questionCount: t.question_count || 0,
            durationMinutes: t.duration_minutes || 60,
            description: t.description || `Bộ đề mẫu tạo lúc ${t.created_at || ''}`,
          }));
          setTemplatesList([defaultOption, ...mapped]);
        } else {
          setTemplatesList([defaultOption, ...SAMPLE_QUESTION_TEMPLATES.filter((t) => t.type === (roomType === 'lab' ? 'lab' : 'exam'))]);
        }
      } catch {
        setTemplatesList([defaultOption, ...SAMPLE_QUESTION_TEMPLATES.filter((t) => t.type === (roomType === 'lab' ? 'lab' : 'exam'))]);
      }
    }
    loadTemplates();
    return () => {
      isCancelled = true;
    };
  }, [roomType]);

  // Nạp danh sách lớp học phần thật từ Backend
  useEffect(() => {
    let isCancelled = false;
    async function loadInstructorClasses() {
      try {
        let queryParam = '';
        if (typeof window !== 'undefined') {
          const rawUser = localStorage.getItem('oculide_user');
          if (rawUser) {
            try {
              const u = JSON.parse(rawUser);
              if (u?.user_id) queryParam = `?instructor_id=${u.user_id}`;
            } catch {}
          }
        }
        const data = await fetchWithAuth<any[]>(`/api/v1/classes${queryParam}`);
        if (isCancelled || !Array.isArray(data)) return;
        if (data.length > 0) {
          const mapped = data.map((c: any) => ({
            id: c.class_code || String(c.class_id),
            name: c.class_name,
            studentCount: c.student_count || 0,
          }));
          setClassesList(mapped);

          const found = mapped.find(
            (x: any) => x.id.toLowerCase() === queryClass.toLowerCase()
          );
          if (found) {
            setSelectedClassId(found.id);
            setRoomCode(generateClassRoomCode());
          } else {
            setSelectedClassId(mapped[0].id);
            setRoomCode(generateClassRoomCode());
          }
        }
      } catch (err) {
        console.error('Lỗi nạp danh sách lớp:', err);
      }
    }
    loadInstructorClasses();
    return () => {
      isCancelled = true;
    };
  }, [queryClass]);

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

  // Chỉ tạo mã phòng/PIN và lấy ngày giờ địa phương sau lần render đầu tiên.
  // Tránh Math.random()/Date dùng trong useState initializer gây hydration mismatch.
  useEffect(() => {
    const { dateStr, startTime: initialStartTime } = getInitialSchedule(0);
    setRoomCode(generateClassRoomCode());
    setRoomPassword(generateRandomAlphanumericPassword(6));
    setScheduledDate(dateStr);
    setStartTime(initialStartTime);
    const { displayEndTime } = computeScheduleIso(dateStr, initialStartTime, 120);
    setEndTime(displayEndTime);
    setIsClientReady(true);
  }, [queryClass]);

  const handleSetCurrentTime = () => {
    const { dateStr, startTime: currentStartTime } = getInitialSchedule(0);
    setScheduledDate(dateStr);
    handleStartTimeChange(currentStartTime);
    showToast(`Đã đồng bộ giờ hiện tại: ${currentStartTime}`);
  };

  const loadExistingSessions = useCallback(async () => {
    const list: typeof existingSessions = [];

    try {
      // 1. Tải danh sách phòng trực tiếp từ Database để kiểm tra xung đột thời gian thực
      const dbRooms = await fetchWithAuth<any[]>('/api/v1/rooms');
      if (Array.isArray(dbRooms)) {
        dbRooms.forEach((r: any) => {
          if (r.status === 'da_dong' || r.status === 'da_huy') return;
          const rawStart = r.start_time || '';
          const rawEnd = r.end_time || '';
          const rDate = rawStart.includes('T') ? rawStart.split('T')[0] : getTodayDateString();
          const rStartTime = rawStart.includes('T') ? rawStart.split('T')[1].slice(0, 5) : '07:30';
          const rEndTime = rawEnd.includes('T') ? rawEnd.split('T')[1].slice(0, 5) : calculateEndTime(rStartTime, r.duration_minutes || 120);

          list.push({
            source: 'db',
            classId: String(r.class_id || ''),
            className: r.room_name || `Phòng ${r.room_code}`,
            roomCode: r.room_code,
            dateIso: normalizeDateToIso(rDate),
            displayDate: rDate === getTodayDateString() ? 'Hôm nay' : rDate,
            startTime: rStartTime,
            endTime: rEndTime,
            status: r.status === 'dang_dien_ra' ? 'Đang diễn ra' : 'Chưa mở',
            title: r.room_name || r.room_code,
          });
        });
      }
    } catch {
      // fallback
    }

    // 2. Dự phòng thêm từ lịch nếu có ca lên lịch trước
    if (typeof window !== 'undefined') {
      try {
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
      } catch {}
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
    if (!isClientReady || !scheduledDate || !startTime || !endTime) {
      return { isPast: false, message: null };
    }

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

      // Cho phép trễ 5 phút để tránh việc điền form 1-2 phút bị coi là quá khứ
      if (startTotalM < currentTotalM - 5) {
        const currentFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        return {
          isPast: true,
          message: `Giờ bắt đầu (${startTime}) đã trôi qua so với thời điểm hiện tại (${currentFormatted}). Vui lòng chọn từ ${currentFormatted} trở đi.`,
        };
      }
    }

    // 3. Kiểm tra giờ kết thúc (hỗ trợ ca học qua nửa đêm sang rạng sáng hôm sau)
    const startM = timeStringToMinutes(startTime);
    let endM = timeStringToMinutes(endTime);
    if (endM < startM) {
      endM += 24 * 60; // Ca thi qua nửa đêm
    }
    const durationSpan = endM - startM;
    if (durationSpan <= 0) {
      return {
        isPast: true,
        message: `Giờ kết thúc (${endTime}) không được trùng hoặc diễn ra trước giờ bắt đầu (${startTime}).`,
      };
    }
    if (durationSpan > 18 * 60) {
      return {
        isPast: true,
        message: `Thời lượng ca (${Math.round(durationSpan / 60)} tiếng) quá dài. Vui lòng kiểm tra lại giờ kết thúc (${endTime}).`,
      };
    }

    return { isPast: false, message: null };
  }, [isClientReady, scheduledDate, startTime, endTime]);

  // Kiểm tra xung đột lịch: CHỈ xung đột nếu CÙNG MỘT LỚP HỌC PHẦN
  // (Quy tắc hệ thống: Trong 1 giờ có thể có nhiều phòng, lớp được kiểm tra cùng một lúc -> Các phòng có thể trùng giờ nhưng phải khác lớp)
  const conflictSession = useMemo(() => {
    if (!isClientReady || !roomCode || !scheduledDate || !startTime || !endTime) return null;
    // Nếu ca tạo trước chưa gán lớp ('unassigned') thì không kiểm tra xung đột lớp
    if (!selectedClassId || selectedClassId === 'unassigned') return null;

    const chosenDateIso = normalizeDateToIso(scheduledDate);
    const newStartM = timeStringToMinutes(startTime);
    let newEndM = timeStringToMinutes(endTime);
    if (newEndM < newStartM) newEndM += 24 * 60; // Hỗ trợ ca qua nửa đêm

    const targetClassId = String(selectedClassId).trim().toLowerCase();
    const curClassItem = classesList.find((c) => c.id === selectedClassId);
    const targetClassName = curClassItem?.name ? curClassItem.name.trim().toLowerCase() : '';

    return (
      existingSessions.find((s) => {
        if (['ended', 'completed', 'da_dong', 'da_huy', 'da_ket_thuc', 'closed', 'cancelled', 'đã kết thúc'].includes(String(s.status || '').toLowerCase().trim())) return false;
        if (s.roomCode.toLowerCase() === roomCode.toLowerCase()) return false;

        // Nếu khác ngày thì không trùng
        if (s.dateIso !== chosenDateIso) return false;

        // CHỈ XUNG ĐỘT NẾU CÙNG LỚP HỌC PHẦN:
        const sClassId = String(s.classId || '').trim().toLowerCase();
        const sClassName = String(s.className || '').trim().toLowerCase();

        const isSameClass =
          (sClassId && sClassId === targetClassId) ||
          (targetClassName && sClassName && sClassName.includes(targetClassName));

        // Khác lớp -> Cho phép trùng giờ bình thường!
        if (!isSameClass) return false;

        // Cùng lớp: kiểm tra giao thoa thời gian
        const existStartM = timeStringToMinutes(s.startTime);
        let existEndM = timeStringToMinutes(s.endTime);
        if (existEndM < existStartM) existEndM += 24 * 60;

        // Giao thoa thời gian khi newStart < existEnd && newEnd > existStart
        const hasOverlap = newStartM < existEndM && newEndM > existStartM;
        return hasOverlap;
      }) || null
    );
  }, [isClientReady, existingSessions, scheduledDate, startTime, endTime, roomCode, selectedClassId, classesList]);

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
    const { displayEndTime } = computeScheduleIso(scheduledDate, newStart, durationMinutes);
    setEndTime(displayEndTime);
  };

  const handleDurationChange = (newMins: number) => {
    setDurationMinutes(newMins);
    const { displayEndTime } = computeScheduleIso(scheduledDate, startTime, newMins);
    setEndTime(displayEndTime);
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

  // Cập nhật cấu hình ràng buộc mặc định khi đổi loại phòng (Lab vs Midterm)
  const handleApplyPreset = (type: 'lab' | 'midterm') => {
    setRoomType(type);
    const targetClass = classesList.find((c) => c.id === selectedClassId) || classesList[0];
    const classLabel = selectedClassId === 'unassigned' ? 'Chưa gán lớp' : targetClass.id;

    if (type === 'lab') {
      setRoomTitle(`Buổi Thực Hành: ${classLabel} - Thao tác mảng & giải thuật`);
      setDurationMinutes(120);
      setEndTime(calculateEndTime(startTime, 120));
      setSelectedTemplateId('none');
      // Ràng buộc cho Lab: Mở, tự do
      setRequireCamera(false);
      setAiFaceDetection(false);
      setAiPhoneDetection(false);
      setLockdownFullscreen(false);
      setBlockTabSwitch(false);
      setWebAccessPolicy('open');
      setMaxTabSwitches(999);
    } else if (type === 'midterm') {
      setRoomTitle(`Thi Giữa Kỳ: ${classLabel} - Đánh giá năng lực giữa kỳ`);
      setDurationMinutes(60);
      setEndTime(calculateEndTime(startTime, 60));
      setSelectedTemplateId('none');
      // Ràng buộc cho Giữa kỳ: Nghiêm ngặt
      setRequireCamera(true);
      setAiFaceDetection(true);
      setAiPhoneDetection(true);
      setLockdownFullscreen(true);
      setBlockTabSwitch(true);
      setWebAccessPolicy('strict');
      setMaxTabSwitches(2);
    }
  };

  const handleRegenerateCodes = () => {
    const newCode = generateClassRoomCode();
    const newPass = generateRandomAlphanumericPassword(6);
    setRoomCode(newCode);
    setRoomPassword(newPass);
  };

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    handleRegenerateCodes();
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Nhận diện xem lớp đang chọn đã có phòng chờ hoặc ca live chưa
  const existingWaitingRoomForClass = useMemo(() => {
    if (!selectedClassId || selectedClassId === 'unassigned') return null;
    const norm = selectedClassId.replace(/[\s\-_]/g, '').toLowerCase();
    return (
      existingSessions.find((s) => {
        const sNorm = String(s.classId || '').replace(/[\s\-_]/g, '').toLowerCase();
        const sStatus = String(s.status || '').toLowerCase().trim();
        const isTerminal = ['ended', 'completed', 'da_dong', 'da_huy', 'da_ket_thuc', 'closed', 'cancelled', 'đã kết thúc'].includes(sStatus);
        return (
          (sNorm === norm || s.classId.toLowerCase() === selectedClassId.toLowerCase()) &&
          (sStatus === 'chưa mở' || sStatus === 'waiting' || sStatus === 'chua_mo' || sStatus === 'scheduled') &&
          !isTerminal
        );
      }) || null
    );
  }, [existingSessions, selectedClassId]);

  const existingActiveSessionForClass = useMemo(() => {
    if (!selectedClassId || selectedClassId === 'unassigned') return null;
    const norm = selectedClassId.replace(/[\s\-_]/g, '').toLowerCase();
    return (
      existingSessions.find((s) => {
        const sNorm = String(s.classId || '').replace(/[\s\-_]/g, '').toLowerCase();
        const sStatus = String(s.status || '').toLowerCase().trim();
        const isTerminal = ['ended', 'completed', 'da_dong', 'da_huy', 'da_ket_thuc', 'closed', 'cancelled', 'đã kết thúc'].includes(sStatus);
        return (
          (sNorm === norm || s.classId.toLowerCase() === selectedClassId.toLowerCase()) &&
          (sStatus === 'đang diễn ra' || sStatus === 'in_progress' || sStatus === 'dang_dien_ra') &&
          !isTerminal
        );
      }) || null
    );
  }, [existingSessions, selectedClassId]);

  const curClass = classesList.find((c) => c.id === selectedClassId) || classesList[0];
  const selectedTemplate =
    templatesList.find((t) => t.id === selectedTemplateId) || templatesList[0];

  // Khởi tạo phòng chờ
  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Chặn submit trước khi mã phòng, PIN và ngày giờ địa phương được khởi tạo.
    if (!isClientReady || !roomCode || !roomPassword || !scheduledDate) {
      showToast('Hệ thống đang chuẩn bị thông tin phòng. Vui lòng thử lại sau giây lát.');
      return;
    }

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

    setIsSubmitting(true);

    try {
      const templateIdToSend =
        selectedTemplateId && selectedTemplateId !== 'none' && !isNaN(Number(selectedTemplateId))
          ? Number(selectedTemplateId)
          : null;

      const { startIso, endIso } = computeScheduleIso(scheduledDate, startTime, durationMinutes);

      // 1. Gửi request tạo phòng lưu trực tiếp vào CSDL SQL Server (bảng Phong)
      const payload = {
        room_code: roomCode.trim(),
        room_name: roomTitle.trim() || `${selectedClassId === 'unassigned' ? 'Khung Lịch' : curClass.id} - ${roomType === 'lab' ? 'Thực hành' : 'Thi giữa kỳ'}`,
        room_type: roomType === 'lab' ? 'lab' : 'exam',
        session_type: roomType.toUpperCase(),
        class_id: selectedClassId === 'unassigned' ? null : curClass.id,
        template_id: templateIdToSend,
        description: `${roomType === 'lab' ? 'Buổi thực hành Lab' : 'Thi giữa kỳ'} cho ${selectedClassId === 'unassigned' ? 'khung lịch tự do' : `lớp ${curClass.name}`}`,
        start_time: startIso,
        end_time: endIso,
        duration_minutes: durationMinutes,
        max_attempts: roomType === 'lab' ? 10 : 1,
        passcode: roomPassword,
        proctoring_config: {
          lockdownFullscreen,
          aiFaceDetection,
          aiObjectDetection: aiPhoneDetection,
          allowTabSwitch: !blockTabSwitch,
          webAccessPolicy,
          maxTabSwitches,
          requireCamera,
        },
        status: 'chua_mo',
      };

      await fetchWithAuth('/api/v1/rooms', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

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
          { id: '29211200333', name: 'Hoàng Đình Khôi', email: '29211200333@dtu.edu.vn' },
          { id: 'SV2026001', name: 'Nguyễn Văn An', email: 'sv2026001@dtu.edu.vn' },
          { id: '29211200888', name: 'Trần Thu Hà', email: '29211200888@dtu.edu.vn' },
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

      showToast(`Đã tạo phòng ${roomCode} và lưu vào CSDL hệ thống thành công!`);

      // Điều hướng vào phòng chờ để điểm danh sinh viên trước khi bắt đầu
      setTimeout(() => {
        router.push(
          `/instructor/room/${encodeURIComponent(roomCode)}${
            returnToSchedules ? '?returnTo=schedules' : ''
          }`
        );
      }, 400);
    } catch (err: any) {
      console.error('Lỗi tạo phòng:', err);
      showToast(err.message || 'Lỗi khi tạo phòng học trên hệ thống');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-10 text-slate-900 dark:text-slate-100">
      {/* Toast thông báo phong cách Học thuật */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-md border border-slate-300 border-l-4 border-l-[#91040A] bg-white px-4 py-3 text-xs shadow-lg dark:border-white/10 dark:border-l-[#fca5a5] dark:bg-neutral-900"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-brand-50 text-brand-700 shrink-0 dark:bg-brand-500/10 dark:text-brand-200">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-serif text-xs font-bold text-[#2A282D] dark:text-white">Thông báo</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">{toastMessage}</p>
          </div>
        </aside>
      )}

      {/* Header bar */}
      <div className="flex flex-col gap-3 border-b border-slate-300 pb-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <Link
            href="/instructor/schedules"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 text-slate-600 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            title="Quay lại Lịch & phiên kiểm tra"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-serif text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Thiết Lập Phòng Học &amp; Điểm Danh
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded border border-slate-800/20 bg-slate-800/10 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-800" />
                Quy trình: Setup &rarr; Phòng Chờ &rarr; Bắt Đầu &rarr; Giám Sát
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Cấu hình các ràng buộc kiểm soát camera, quản lý mở trang web khác, sinh mã phòng ngẫu nhiên và chọn bộ đề thi.
            </p>
          </div>
        </div>
      </div>

      {/* CẢNH BÁO NẾU LỚP NÀY ĐÃ CÓ PHÒNG CHỜ HOẶC PHIÊN LIVE */}
      {existingWaitingRoomForClass && (
        <div className="rounded-md border border-blue-300 bg-blue-50/80 p-4 shadow-2xs dark:border-blue-500/30 dark:bg-blue-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200">
            <Users className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <span className="font-bold">Lớp {curClass.id} ({curClass.name})</span> hiện đã có 1 phòng chờ đang mở: <code className="font-mono font-bold bg-white/70 px-1.5 py-0.5 rounded border border-blue-200">{existingWaitingRoomForClass.roomCode}</code>.
              <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">Quy định hệ thống: Mỗi lớp học phần chỉ có 01 phòng chờ tại một thời điểm.</p>
            </div>
          </div>
          <Link
            href={`/instructor/room/${encodeURIComponent(existingWaitingRoomForClass.roomCode)}`}
            className="system-primary-action inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-700 hover:bg-blue-800 px-3.5 text-xs font-bold text-white shadow-2xs transition whitespace-nowrap shrink-0"
          >
            <span>Vào Phòng Chờ Hiện Có</span>
          </Link>
        </div>
      )}

      {existingActiveSessionForClass && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50/80 p-4 shadow-2xs dark:border-emerald-500/30 dark:bg-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
            <Radio className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="font-bold">Lớp {curClass.id} ({curClass.name})</span> hiện đang có phiên giám sát trực tiếp: <code className="font-mono font-bold bg-white/70 px-1.5 py-0.5 rounded border border-emerald-200">{existingActiveSessionForClass.roomCode}</code>.
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">Vui lòng kết thúc phiên live này trước khi tạo phòng mới cho buổi tiếp theo.</p>
            </div>
          </div>
          <Link
            href={`/instructor/monitoring?room=${encodeURIComponent(existingActiveSessionForClass.roomCode)}`}
            className="system-primary-action inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 px-3.5 text-xs font-bold text-white shadow-2xs transition whitespace-nowrap shrink-0"
          >
            <span>Đến Màn Hình Giám Sát</span>
          </Link>
        </div>
      )}

      <form onSubmit={handleCreateRoomSubmit} className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12 xl:gap-5">
        {/* CỘT TRÁI (7 CỘT): CẤU HÌNH LỚP, MÃ PHÒNG VÀ CÁC RÀNG BUỘC */}
        <div className="min-w-0 space-y-5 xl:col-span-7">
          {/* 1. Lớp học phần & Mã phòng ngẫu nhiên */}
          <div className="rounded-md border border-slate-300 bg-white p-5 shadow-2xs transition-colors dark:border-white/10 dark:bg-neutral-900 sm:p-6">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-300 dark:border-white/10">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500">
                <Users className="h-3.5 w-3.5" />
              </div>
              <h2 className="font-serif text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                1. Lớp Học Phần &amp; Mã Phòng Ngẫu Nhiên
              </h2>
            </div>

            <div className="space-y-4 pt-3">
              {/* Thẻ Lớp học phần cố định rộng rãi */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    GÁN CHO LỚP HỌC PHẦN *
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Có thể tạo trước lịch rồi gán lớp sau
                  </span>
                </div>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    handleClassChange(nextId);
                    const c = classesList.find((item) => item.id === nextId);
                    const lbl = nextId === 'unassigned' ? 'Khung Lịch' : (c ? c.id : nextId);
                    if (roomType === 'lab') {
                      setRoomTitle(`Buổi Thực Hành: ${lbl} - Lập trình & Thuật toán`);
                    } else {
                      setRoomTitle(`Thi Giữa Kỳ: ${lbl} - Đánh giá quá trình`);
                    }
                  }}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                >
                  <option value="unassigned">Chưa gán lớp (Tạo khung lịch trước, gán lớp sau)</option>
                  {classesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.name} ({c.studentCount} SV)
                    </option>
                  ))}
                </select>
                {selectedClassId !== 'unassigned' && curClass && (
                  <p className="mt-1.5 text-[11px] text-slate-500 font-mono">
                    Đã chọn lớp: <strong className="text-slate-700 dark:text-slate-300">{curClass.name}</strong> • Sĩ số: {curClass.studentCount} SV
                  </p>
                )}
                {selectedClassId === 'unassigned' && (
                  <p className="mt-1.5 text-[11px] text-slate-500 font-mono">
                    Khung lịch trước: Bạn có thể chọn lớp và gán học phần bất kỳ lúc nào từ màn hình Quản lý Lịch Đào Tạo.
                  </p>
                )}
              </div>

              {/* Tên buổi học / ca thi */}
              <div>
                <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  TÊN BUỔI HỌC / CA THI *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Buổi thực hành Lab 03 - Vòng lặp For/While"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.04] px-3.5 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none transition focus:border-slate-900 focus:bg-white dark:focus:bg-neutral-900 dark:focus:border-slate-800 placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Mã phòng & Mật khẩu sinh tự động */}
            <div className="mt-4 rounded-md border border-slate-300 bg-slate-50/60 p-4 space-y-3 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-500 flex items-center gap-1.5">
                  <Radio className="h-4 w-4" />
                  Mã Phòng &amp; Mật Khẩu (Sinh Tự Động):
                </span>
                <button
                  type="button"
                  onClick={handleRegenerateCodes}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-900 dark:text-slate-500 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-white/10 px-2.5 py-1 rounded shadow-2xs hover:bg-slate-50 dark:hover:bg-white/10 transition cursor-pointer"
                  title="Sinh lại mã ngẫu nhiên mới"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Tạo Lại Mã Ngẫu Nhiên</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="rounded-md border border-slate-300 bg-white p-3 space-y-1 dark:border-white/10 dark:bg-neutral-900">
                  <div className="flex items-center justify-between font-mono text-[10.5px] uppercase font-bold text-slate-500">
                    <span>MÃ PHÒNG (ROOM CODE)</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(roomCode, 'code')}
                      disabled={!roomCode}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer dark:hover:bg-white/10 dark:hover:text-white"
                      title="Sao chép mã phòng"
                    >
                      {copiedKey === 'code' ? (
                        <Check className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-lg font-bold tabular-nums tracking-wider text-brand dark:text-brand-200">
                      {roomCode || 'Đang tạo mã phòng...'}
                    </code>
                  </div>
                  <span className="text-[10px] text-slate-500 block font-mono">Mã ngẫu nhiên gồm 8 ký tự</span>
                </div>

                <div className="rounded-md border border-slate-300 bg-white p-3 space-y-1 dark:border-white/10 dark:bg-neutral-900">
                  <div className="flex items-center justify-between font-mono text-[10.5px] uppercase font-bold text-slate-500">
                    <span>MẬT KHẨU PIN PHÒNG</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(roomPassword, 'pin')}
                      disabled={!roomPassword}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer dark:hover:bg-white/10 dark:hover:text-white"
                      title="Sao chép mã PIN"
                    >
                      {copiedKey === 'pin' ? (
                        <Check className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-lg font-bold tabular-nums tracking-wider text-slate-900 dark:text-slate-100">
                      {roomPassword || 'Đang tạo PIN...'}
                    </code>
                  </div>
                  <span className="text-[10px] text-slate-500 block font-mono">6 ký tự ngẫu nhiên in hoa thường &amp; số</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Loại phòng & Preset */}
          <div className="rounded-md border border-slate-300 bg-white p-5 shadow-2xs transition-colors dark:border-white/10 dark:bg-neutral-900 sm:p-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-300 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500">
                  <Layers className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-serif text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  2. Loại Hình Phòng Học
                </h2>
              </div>
              <span className="font-mono text-[11px] font-bold text-slate-500">Chọn cấu hình mẫu</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3">
              {/* Option 1: Buổi Thực Hành Lab */}
              <div
                onClick={() => handleApplyPreset('lab')}
                role="button"
                aria-pressed={roomType === 'lab'}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleApplyPreset('lab'); } }}
                className={`rounded-md border p-4 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  roomType === 'lab'
                    ? 'border-slate-900 bg-slate-50 dark:border-white dark:bg-white/10 shadow-xs'
                    : 'border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-slate-100 dark:bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      Thực Hành
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">120 phút</span>
                  </div>

                  <div>
                    <h3 className="font-serif text-sm font-bold text-slate-900 dark:text-white">
                      Phòng Thực Hành (Lab)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tự do tra cứu • Chấm tự động
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Sinh viên tự do làm bài, code máy chấm ngay, có quyền kết thúc ca sớm.
                  </p>
                </div>

                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                  <span className="truncate">Chỉ gán đề thực hành</span>
                </div>
              </div>

              {/* Option 2: Thi Giữa Kỳ */}
              <div
                onClick={() => handleApplyPreset('midterm')}
                role="button"
                aria-pressed={roomType === 'midterm'}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleApplyPreset('midterm'); } }}
                className={`rounded-md border p-4 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  roomType === 'midterm'
                    ? 'border-slate-900 bg-slate-50 dark:border-white dark:bg-white/10 shadow-xs'
                    : 'border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-slate-100 dark:bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      Giữa Kỳ
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">60 phút</span>
                  </div>

                  <div>
                    <h3 className="font-serif text-sm font-bold text-slate-900 dark:text-white">
                      Lịch Thi Giữa Kỳ
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                      Khóa Fullscreen • AI Giám sát
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Khóa toàn màn hình, AI giám sát. Điểm do GV công bố sau đối soát. Không kết thúc sớm.
                  </p>
                </div>

                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-slate-500" />
                  <span className="truncate">Chỉ gán đề giữa kỳ</span>
                </div>
              </div>

            </div>
          </div>

          {/* 3. THIẾT LẬP THỜI GIAN CA HỌC & LƯU VÀO LỊCH */}
          <div className="rounded-md border border-slate-300 bg-white p-5 shadow-2xs transition-colors dark:border-white/10 dark:bg-neutral-900 sm:p-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-300 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-serif text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  3. Thiết Lập Thời Gian &amp; Lưu Vào Lịch Giảng Dạy
                </h2>
              </div>
              <span className="rounded border border-slate-300 bg-slate-50 px-2.5 py-0.5 font-mono text-[10.5px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                Đồng bộ Lịch Giảng Dạy
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3">
              {/* Ngày diễn ra */}
              <div>
                <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Ngày ca học / thi:
                </label>
                <input
                  type="date"
                  min={isClientReady ? getTodayDateString() : undefined}
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.04] p-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none transition focus:border-slate-900 focus:bg-white dark:focus:bg-neutral-900 dark:focus:border-slate-800 cursor-pointer"
                  required
                />
              </div>

              {/* Giờ bắt đầu */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Giờ bắt đầu:
                  </label>
                  <button
                    type="button"
                    onClick={handleSetCurrentTime}
                    className="inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold text-brand-700 dark:text-brand-300 hover:underline cursor-pointer"
                    title="Đặt giờ bắt đầu thành thời gian hiện tại"
                  >
                    <Clock className="h-3 w-3" />
                    Lấy giờ hiện tại (Realtime)
                  </button>
                </div>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.04] p-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none transition focus:border-slate-900 focus:bg-white dark:focus:bg-neutral-900 dark:focus:border-slate-800 cursor-pointer"
                  required
                />
              </div>

              {/* Giờ kết thúc */}
              <div>
                <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Giờ kết thúc:
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.04] p-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none transition focus:border-slate-900 focus:bg-white dark:focus:bg-neutral-900 dark:focus:border-slate-800 cursor-pointer"
                  required
                />
              </div>
            </div>

            {/* CẢNH BÁO THỜI GIAN TRONG QUÁ KHỨ */}
            {pastTimeValidation.isPast && (
              <div className="mt-3.5 rounded-md border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-3 text-xs text-slate-800 dark:text-slate-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <AlertTriangle className="h-4 w-4 text-slate-700 dark:text-slate-300 shrink-0" />
                  <span>Thời Gian Không Hợp Lệ</span>
                </div>
                <p className="leading-relaxed pl-6">{pastTimeValidation.message}</p>
              </div>
            )}

            {/* CẢNH BÁO TRÙNG LỊCH VỚI CA ĐANG MỞ / ĐANG GIÁM SÁT */}
            {conflictSession && (
              <div className="mt-3.5 rounded-md border border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/5 p-4 text-xs text-slate-800 dark:text-slate-200 space-y-3 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="h-5 w-5 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white block">
                      Phát hiện trùng lịch ca học/thi của cùng lớp {curClass.id}:
                    </strong>
                    <p className="leading-relaxed">
                      Lớp <strong className="font-bold">{curClass.id}</strong> đã có ca học{' '}
                      <strong className="font-mono font-bold text-slate-900 dark:text-white">[{conflictSession.roomCode}]</strong>{' '}
                      (<i>{conflictSession.title}</i>) diễn ra trong khung giờ{' '}
                      <strong className="font-mono font-bold text-slate-900 dark:text-white">{conflictSession.startTime} - {conflictSession.endTime}</strong> ngày{' '}
                      <strong>{conflictSession.displayDate}</strong>.
                    </p>
                  </div>
                </div>

                <div className="rounded-md border border-slate-300 bg-white dark:border-white/10 dark:bg-neutral-900 p-3 text-[11.5px] text-slate-600 dark:text-slate-300 space-y-2">
                  <span className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                    <Clock className="h-3.5 w-3.5" />
                    Quy chế khảo thí &amp; phòng thi:
                  </span>
                  <p className="leading-relaxed">
                    Hệ thống cho phép các lớp khác nhau kiểm tra/thi cùng một giờ. Tuy nhiên trong <strong>cùng một lớp</strong>, sinh viên không thể tham gia 2 ca thi cùng lúc. Vui lòng chọn khung giờ khác hoặc điều chỉnh thời gian bắt đầu sau {conflictSession.endTime}.
                  </p>
                  <p className="leading-relaxed">
                    Giảng viên có thể giám sát song song nhiều lớp khác nhau tại cùng một thời điểm. Tuy nhiên để tránh sinh viên bị trùng ca, phòng mới của lớp <strong>{curClass.id}</strong> cần thiết lập thời gian <strong>sau {conflictSession.endTime}</strong> hoặc chọn <strong>ngày khác</strong>.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSetAfterConflict(conflictSession.endTime)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Đặt giờ bắt đầu thành {conflictSession.endTime}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSetTomorrow}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Chuyển sang ngày mai</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lựa chọn thời lượng */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-300 dark:border-white/10">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-500" />
                Thời lượng ca học: <strong className="font-mono tabular-nums text-slate-900 dark:text-white ml-1">{durationMinutes} phút</strong>
              </span>
              <div className="flex items-center gap-1.5">
                {[45, 60, 90, 120, 150].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleDurationChange(mins)}
                    className={`h-8 px-3 rounded-md font-mono text-xs font-bold transition cursor-pointer ${
                      durationMinutes === mins
                        ? 'system-selected-module shadow-2xs'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300'
                    }`}
                  >
                    {mins}p
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox lưu vào lịch */}
            <label className={`mt-3 flex items-start gap-3 rounded-md border p-3.5 cursor-pointer transition ${
              saveToSchedule
              ? 'border-brand-300 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10'
                : 'border-slate-300 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.02] hover:bg-white'
            }`}>
              <input
                type="checkbox"
                checked={saveToSchedule}
                onChange={(e) => setSaveToSchedule(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-brand focus:ring-brand cursor-pointer"
              />
              <div>
                <span className="font-serif text-xs font-bold text-slate-900 dark:text-white block">
                  Tự động lưu ca học này vào Lịch Giảng Dạy (/instructor/schedules)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ca học sẽ tự động xuất hiện trên Lịch ca dạy và giảng viên có thể xem lịch, gia hạn hoặc kích hoạt phòng thi theo kế hoạch.
                </p>
              </div>
            </label>
          </div>

          {/* 4. THIẾT LẬP RÀNG BUỘC (SETUP CONSTRAINTS: CAM, QUẢN LÝ WEB, FULLSCREEN...) */}
          <div className="rounded-md border border-slate-300 bg-white p-5 shadow-2xs transition-colors dark:border-white/10 dark:bg-neutral-900 sm:p-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-300 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-slate-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                  <Sliders className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-serif text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  4. Thiết Lập Ràng Buộc &amp; Giám Sát Chống Gian Lận
                </h2>
              </div>
              <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">Tùy chỉnh linh hoạt</span>
            </div>

            {/* Nhóm A: Ràng buộc Camera & AI */}
            <div className="space-y-3 pt-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                A. Ràng Buộc Camera &amp; Trí Tuệ Nhân Tạo (AI)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className={`flex items-start gap-2.5 rounded-md border p-3 cursor-pointer transition ${
                  requireCamera
                    ? 'border-slate-900 bg-slate-100 dark:border-white dark:bg-white/10 shadow-2xs'
                    : 'border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                }`}>
                  <input
                    type="checkbox"
                    checked={requireCamera}
                    onChange={(e) => setRequireCamera(e.target.checked)}
                    className="mt-0.5 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                      {roomType === 'lab' ? 'Bắt buộc bật Camera trong phòng Lab' : 'Bắt buộc bật Camera'}
                    </span>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-normal">
                      {roomType === 'lab'
                        ? (requireCamera
                            ? 'Bắt buộc sinh viên bật webcam suốt buổi thực hành'
                            : 'Cho phép sinh viên tắt camera trong phòng Lab (nhưng vẫn phải kiểm tra ở bước Check-in)')
                        : 'Bắt buộc webcam sinh viên trước khi vào làm bài'}
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 rounded-md border p-3 cursor-pointer transition ${
                  aiFaceDetection
                    ? 'border-slate-900 bg-slate-100 dark:border-white dark:bg-white/10 shadow-2xs'
                    : 'border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                }`}>
                  <input
                    type="checkbox"
                    checked={aiFaceDetection}
                    onChange={(e) => setAiFaceDetection(e.target.checked)}
                    className="mt-0.5 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                      AI Khuôn Mặt
                    </span>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-normal">Phát hiện quay mặt, nhiều người hoặc rời màn hình</p>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 rounded-md border p-3 cursor-pointer transition ${
                  aiPhoneDetection
                    ? 'border-slate-900 bg-slate-100 dark:border-white dark:bg-white/10 shadow-2xs'
                    : 'border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                }`}>
                  <input
                    type="checkbox"
                    checked={aiPhoneDetection}
                    onChange={(e) => setAiPhoneDetection(e.target.checked)}
                    className="mt-0.5 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                      AI Điện Thoại
                    </span>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-normal">Cảnh báo khi phát hiện dùng smartphone</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Nhóm B: Quản lý các trang web khác & Toàn màn hình */}
            <div className="space-y-3 pt-4 border-t border-slate-300 dark:border-white/10">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                B. Ràng Buộc Màn Hình &amp; Quản Lý Mở Trang Web Khác
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex items-start gap-2.5 rounded-md border p-3 cursor-pointer transition ${
                  lockdownFullscreen
                    ? 'border-slate-900 bg-slate-100 dark:border-white dark:bg-white/10 shadow-2xs'
                    : 'border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                }`}>
                  <input
                    type="checkbox"
                    checked={lockdownFullscreen}
                    onChange={(e) => setLockdownFullscreen(e.target.checked)}
                    className="mt-0.5 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Maximize className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                      Khóa Toàn Màn Hình (Lockdown)
                    </span>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-normal">Ngăn thu nhỏ cửa sổ trình duyệt hoặc thoát fullscreen</p>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 rounded-md border p-3 cursor-pointer transition ${
                  blockTabSwitch
                    ? 'border-slate-900 bg-slate-100 dark:border-white dark:bg-white/10 shadow-2xs'
                    : 'border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                }`}>
                  <input
                    type="checkbox"
                    checked={blockTabSwitch}
                    onChange={(e) => setBlockTabSwitch(e.target.checked)}
                    className="mt-0.5 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                      Chặn Chuyển Tab Trình Duyệt
                    </span>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-normal">Cảnh báo vi phạm ngay khi mở tab hoặc ứng dụng khác</p>
                  </div>
                </label>
              </div>

              {/* Chính sách quản lý các trang web khác */}
              <div className="rounded-md border border-slate-300 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] p-3.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-slate-500" />
                    Chính Sách Quản Lý Trang Web Khác:
                  </span>
                  <select
                    value={webAccessPolicy}
                    onChange={(e) => setWebAccessPolicy(e.target.value as 'strict' | 'whitelist' | 'open')}
                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium dark:border-white/15 dark:bg-neutral-900 text-slate-800 dark:text-slate-100 outline-none focus:border-slate-900 cursor-pointer"
                  >
                    <option value="strict">Cấm toàn bộ trang web khác (Block All External Web)</option>
                    <option value="whitelist">Chỉ cho phép tra cứu Whitelist kỹ thuật</option>
                    <option value="open">Môi trường mở tự do (Dành cho buổi Lab)</option>
                  </select>
                </div>

                {webAccessPolicy === 'whitelist' && (
                  <p className="text-[11px] text-slate-900 dark:text-slate-500 bg-white dark:bg-white/[0.04] p-2.5 rounded-md border border-slate-300 dark:border-white/10 leading-relaxed font-medium">
                    <strong>Whitelist cho phép:</strong> <code className="font-mono bg-slate-50 dark:bg-white/10 px-1 py-0.5 rounded border border-slate-300 dark:border-white/10">docs.oracle.com</code>, <code className="font-mono bg-slate-50 dark:bg-white/10 px-1 py-0.5 rounded border border-slate-300 dark:border-white/10">cppreference.com</code>, <code className="font-mono bg-slate-50 dark:bg-white/10 px-1 py-0.5 rounded border border-slate-300 dark:border-white/10">w3schools.com</code>. Mọi trang web khác bị chặn.
                  </p>
                )}
                {webAccessPolicy === 'strict' && (
                  <p className="text-[11px] text-slate-800 dark:text-slate-500 bg-white dark:bg-white/[0.04] p-2.5 rounded-md border border-slate-300 dark:border-white/10 leading-relaxed font-medium">
                    <strong>Cấm tuyệt đối:</strong> Mọi hành vi mở tab ngoài đều bị ghi nhận vi phạm AI và thông báo lên màn hình giám sát.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (5 CỘT): CHỌN ĐỀ THI TỪ MODULE ĐỀ & KHỞI TẠO PHÒNG CHỜ (STICKY ON DESKTOP) */}
        <div className="min-w-0 space-y-5 xl:sticky xl:top-4 xl:col-span-5 xl:self-start">
          <div className="rounded-md border border-slate-300 bg-white p-5 shadow-2xs transition-colors dark:border-white/10 dark:bg-neutral-900 sm:p-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-300 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-serif text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  5. Chọn Bộ Đề (Từ Module Đề)
                </h2>
              </div>
              <span className="font-mono text-[10px] font-bold text-slate-500 uppercase bg-slate-50 dark:bg-white/[0.08] px-2 py-0.5 rounded">
                {templatesList.length} Lựa Chọn
              </span>
            </div>

            <p className="text-xs text-slate-500 pt-2">
              Chọn bộ đề thi / bài lab hoặc chọn &quot;Chưa gán đề&quot; để mở phòng trước và giao đề sau:
            </p>

            {/* Danh sách đề thi */}
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1.5 pt-1">
              {templatesList.map((tpl) => {
                const isSelected = tpl.id === selectedTemplateId;
                const isNone = tpl.id === 'none';

                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    role="button"
                    aria-pressed={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTemplateId(tpl.id); } }}
                    className={`rounded-md border p-3.5 cursor-pointer transition space-y-2 ${
                      isSelected
                        ? 'border-brand bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10 shadow-2xs'
                        : 'border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded ${
                          isNone ? 'bg-slate-50 dark:bg-white/[0.08] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10' : 'bg-slate-50 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10'
                        }`}>
                          {isNone ? 'GÁN SAU' : tpl.id}
                        </span>
                        <span className="rounded px-2 py-0.5 font-mono text-[10px] font-bold border bg-white text-slate-700 border-slate-300 dark:bg-white/10 dark:text-slate-200 dark:border-white/10">
                          {tpl.language}
                        </span>
                      </div>
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 rounded bg-brand-50 px-2 py-0.5 font-mono text-[10.5px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                          <Check className="h-3 w-3 stroke-[3]" />
                          Đang chọn
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-semibold">Bấm để chọn</span>
                      )}
                    </div>

                    <h3 className="font-serif text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{tpl.title}</h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{tpl.description}</p>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-300 dark:border-white/10 text-[10.5px] font-medium text-slate-500">
                      <span>{isNone ? 'Mở phòng không cần đề' : `${tpl.questionCount} câu hỏi lập trình`}</span>
                      <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                        {isNone ? 'Khuyến nghị tạo phòng' : `Thời lượng: ${tpl.durationMinutes} phút`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tóm tắt & Nút khởi tạo phòng chờ */}
            <div className="pt-3 border-t border-slate-300 dark:border-white/10 space-y-3.5">
              <div className="rounded-md border border-slate-300 bg-slate-50/60 p-3.5 text-xs space-y-2 dark:border-white/10 dark:bg-white/[0.02]">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-[11px]">Lớp phụ trách:</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">{curClass.id} ({curClass.studentCount} SV)</strong>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-[11px]">Mã phòng ngẫu nhiên:</span>
                  <code className="font-mono font-bold tabular-nums text-slate-900 dark:text-slate-500 bg-white dark:bg-white/10 px-1.5 py-0.5 rounded border border-slate-300 dark:border-white/10">{roomCode}</code>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-[11px]">Mật khẩu PIN:</span>
                  <code className="font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100 bg-white dark:bg-neutral-900 px-1.5 py-0.5 rounded border border-slate-300 dark:border-white/10">{roomPassword}</code>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-[11px]">Thời gian ca học:</span>
                  <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-bold">
                    {startTime} - {endTime} ({durationMinutes}p)
                  </strong>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-[11px]">Lịch giảng dạy:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                    {saveToSchedule ? 'Đã bật lưu lịch' : 'Không lưu lịch'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-[11px]">Ràng buộc:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-[11px]">
                    {requireCamera ? 'Camera' : 'Cam tùy chọn'} • {lockdownFullscreen ? 'Khóa Fullscreen' : 'Mở'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-slate-300 dark:border-white/10">
                  <span className="text-[11px]">Bộ đề giao:</span>
                  <strong className="font-serif text-slate-900 dark:text-slate-100 truncate max-w-[200px] text-right font-bold">{selectedTemplate.title}</strong>
                </div>
              </div>

              {/* Cảnh báo trước khi bấm nút tạo phòng */}
              {pastTimeValidation.isPast ? (
                <div className="rounded-md border border-slate-300 bg-slate-100 dark:border-white/10 dark:bg-white/5 p-2.5 text-center text-xs font-bold text-slate-800 dark:text-slate-200">
                  ⚠️ Không thể tạo phòng: Thời gian thiết lập ở trong quá khứ!
                </div>
              ) : conflictSession ? (
                <div className="rounded-md border border-slate-300 bg-slate-100 dark:border-white/10 dark:bg-white/5 p-2.5 text-center text-xs font-bold text-slate-800 dark:text-slate-200">
                  ⚠️ Trùng lịch giám sát ({conflictSession.startTime} - {conflictSession.endTime}) với ca {conflictSession.roomCode} (Lớp {conflictSession.classId})!
                </div>
              ) : null}

              {/* Nút hành động */}
              <button
                type="submit"
                disabled={!isClientReady || !roomCode || !roomPassword || isSubmitting || Boolean(pastTimeValidation.isPast || conflictSession)}
                className={`w-full inline-flex items-center justify-center gap-2 h-10 rounded-md px-4 text-xs font-bold text-white shadow-2xs transition ${
                  !isClientReady || !roomCode || !roomPassword || isSubmitting || pastTimeValidation.isPast || conflictSession
                    ? 'bg-slate-400 cursor-not-allowed opacity-60'
                    : 'system-primary-action bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Đang lưu phòng vào hệ thống...</span>
                  </>
                ) : (
                  <>
                    <Radio className="h-4 w-4 shrink-0" />
                    <span>{isClientReady ? 'Tạo Phòng Chờ & Lưu Vào Lịch' : 'Đang chuẩn bị thông tin phòng...'}</span>
                  </>
                )}
              </button>
              <p className="text-[10.5px] text-center text-slate-500">
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
