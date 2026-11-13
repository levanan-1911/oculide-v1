'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/services/apiClient';

export interface ViolationAlert {
  id: string;
  studentId: string;
  studentName: string;
  classCode: string;
  roomCode: string;
  type: string;
  severity: 'medium' | 'high' | 'critical';
  timestamp: string;
  description: string;
  status: 'pending' | 'warned' | 'recorded' | 'dismissed';
}

export interface SentAnnouncement {
  id: string;
  targetType: 'all' | 'group' | 'individual';
  targetLabel: string;
  message: string;
  type: 'info' | 'warning' | 'time' | 'urgent';
  timestamp: string;
}

export interface MonitoringSessionInfo {
  id: string;
  roomCode: string;
  classCode: string;
  className: string;
  title: string;
  type: 'LAB' | 'EXAM';
  remainingMinutes: number;
  totalStudents: number;
  attendedStudents: number;
  isAiActive: boolean;
  requireCamera: boolean;
}

interface MonitoringContextType {
  session: MonitoringSessionInfo;
  setSessionType: (type: 'LAB' | 'EXAM') => void;
  setRequireCamera: (req: boolean) => void;
  violations: ViolationAlert[];
  announcements: SentAnnouncement[];
  activeToast: ViolationAlert | null;
  extendSession: (minutes: number, reason?: string, notify?: boolean) => void;
  sendAnnouncement: (
    targetType: 'all' | 'group' | 'individual',
    targetLabel: string,
    message: string,
    type: 'info' | 'warning' | 'time' | 'urgent',
    studentId?: string
  ) => void;
  dismissToast: () => void;
  reviewViolation: (id: string, action: 'warn' | 'record' | 'dismiss') => void;
  simulateViolation: (typeOverride?: string) => void;
  toastNotice: string | null;
  clearToastNotice: () => void;
}

const MonitoringContext = createContext<MonitoringContextType | null>(null);

const SAMPLE_STUDENTS = [
  { id: 'SE184801', name: 'Nguyễn Văn An' },
  { id: 'SE184802', name: 'Trần Thị Bình' },
  { id: 'SE184803', name: 'Lê Hoàng Cường' },
  { id: 'SE184804', name: 'Phạm Minh Châu' },
  { id: 'SE184805', name: 'Đặng Tuấn Dương' },
  { id: 'SE184806', name: 'Vũ Hải Yến' },
];

// TUÂN THỦ: Không theo dõi mic sinh viên!
// Hệ thống đã KHÓA TAB (Lockdown Mode): Sinh viên không thể mở tab khác hay mở ứng dụng ngoài một cách thông thường.
// Cảnh báo tập trung vào: Hành vi vật lý qua Camera (quay mặt, người thứ 2, dùng điện thoại) & Cố ý thoát chế độ toàn màn hình Fullscreen.
const VIOLATION_TYPES = [
  {
    type: 'Quay mặt khỏi camera > 10s',
    severity: 'medium' as const,
    desc: 'Không phát hiện khuôn mặt chính diện với màn hình quá 10 giây.',
  },
  {
    type: 'Phát hiện khuôn mặt lạ / Người thứ 2',
    severity: 'critical' as const,
    desc: 'AI phát hiện thêm khuôn mặt thứ hai xuất hiện trong webcam.',
  },
  {
    type: 'Phát hiện thiết bị di động (Smartphone)',
    severity: 'critical' as const,
    desc: 'AI phát hiện vật thể dạng điện thoại thông minh trong khu vực làm bài.',
  },
  {
    type: 'Cố ý thao tác thoát toàn màn hình',
    severity: 'high' as const,
    desc: 'Học viên cố tình bấm tổ hợp phím hệ thống nhằm thoát chế độ khóa toàn màn hình Fullscreen.',
  },
];

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  // Mặc định là buổi kiểm tra EXAM (hoặc buổi LAB)
  const [session, setSession] = useState<MonitoringSessionInfo>({
    id: 'SES-01',
    roomCode: 'CS101-LAB3',
    classCode: 'CS101-A',
    className: 'Nhập môn Lập trình C/C++',
    title: 'Kiểm tra quá trình: Vòng lặp & Mảng 1 chiều',
    type: 'EXAM', // Mặc định EXAM: AI bắt buộc, Camera bắt buộc
    remainingMinutes: 54,
    totalStudents: 48,
    attendedStudents: 46,
    isAiActive: true,
    requireCamera: true,
  });

  // Chuyển đổi giữa Buổi Lab và Buổi Kiểm Tra
  const setSessionType = useCallback((type: 'LAB' | 'EXAM') => {
    if (type === 'LAB') {
      setSession((prev) => ({
        ...prev,
        type: 'LAB',
        title: 'Thực hành Lab 03: Vòng lặp For/While & Mảng',
        isAiActive: false, // Lab thì không cần AI
        requireCamera: false, // Camera tùy theo yêu cầu của GV
      }));
    } else {
      setSession((prev) => ({
        ...prev,
        type: 'EXAM',
        title: 'Kiểm tra quá trình: Vòng lặp & Mảng 1 chiều',
        isAiActive: true, // Kiểm tra bắt buộc AI
        requireCamera: true, // Kiểm tra bắt buộc Camera
      }));
    }
  }, []);

  const setRequireCamera = useCallback((req: boolean) => {
    setSession((prev) => ({ ...prev, requireCamera: req }));
  }, []);

  const [violations, setViolations] = useState<ViolationAlert[]>([]);
  const [announcements, setAnnouncements] = useState<SentAnnouncement[]>([]);

  const [activeToast, setActiveToast] = useState<ViolationAlert | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Nạp phòng đang diễn ra và danh sách cảnh báo vi phạm thật từ Backend API
  useEffect(() => {
    let isCancelled = false;

    async function syncActiveRoomAndViolations() {
      try {
        const rooms = await fetchWithAuth<any[]>('/api/v1/rooms');
        if (isCancelled || !Array.isArray(rooms)) return;

        const running =
          rooms.find((r) => r.status === 'dang_dien_ra' || r.status === 'in_progress') || rooms[0];
        if (!running) {
          setViolations([]);
          return;
        }

        setSession((prev) => ({
          ...prev,
          id: String(running.room_id),
          roomCode: running.room_code || prev.roomCode,
          classCode: running.class_code || prev.classCode,
          className: running.class_name || running.room_name || prev.className,
          title: running.room_name || prev.title,
          type: running.room_type === 'exam' ? 'EXAM' : 'LAB',
          remainingMinutes: running.duration_minutes || prev.remainingMinutes,
          totalStudents: running.total_students ?? prev.totalStudents,
          attendedStudents: running.attended_students ?? prev.attendedStudents,
        }));

        if (running.room_id) {
          const roomViolations = await fetchWithAuth<any[]>(
            `/api/v1/violations/room/${running.room_id}`
          ).catch(() => []);
          if (!isCancelled && Array.isArray(roomViolations)) {
            const mapped: ViolationAlert[] = roomViolations.map((v: any) => ({
              id: String(v.violation_id),
              studentId: String(v.student_code || v.student_id),
              studentName: v.student_name || `Sinh viên #${v.student_id}`,
              classCode: running.class_code || 'Lớp HP',
              roomCode: running.room_code,
              type: v.violation_type || 'Vi phạm quy chế',
              severity:
                v.severity === 'critical'
                  ? 'critical'
                  : v.severity === 'high'
                  ? 'high'
                  : 'medium',
              timestamp: v.detected_at
                ? new Date(v.detected_at).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '--:--',
              description: v.description || 'Phát hiện hành vi bất thường trong phòng thi.',
              status:
                v.review_status === 'confirmed'
                  ? 'recorded'
                  : v.review_status === 'warned'
                  ? 'warned'
                  : v.review_status === 'dismissed' || v.review_status === 'rejected'
                  ? 'dismissed'
                  : 'pending',
            }));
            setViolations(mapped);
          }
        }
      } catch {
        // Offline / chưa đăng nhập
      }
    }

    syncActiveRoomAndViolations();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Đếm ngược mỗi phút
  useEffect(() => {
    const timer = setInterval(() => {
      setSession((prev) => ({
        ...prev,
        remainingMinutes: Math.max(0, prev.remainingMinutes - 1),
      }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Gia hạn thời gian phòng tùy chỉnh
  const extendSession = useCallback(
    (minutes: number, reason?: string, notify: boolean = true) => {
      setSession((prev) => ({
        ...prev,
        remainingMinutes: prev.remainingMinutes + minutes,
      }));

      const noticeText = `Đã gia hạn thành công +${minutes} phút cho phòng ${session.roomCode}!`;
      setToastNotice(noticeText);
      setTimeout(() => setToastNotice(null), 4000);

      if (notify) {
        const annMsg = reason
          ? `Giảng viên đã gia hạn thêm ${minutes} phút làm bài. Lý do: ${reason}`
          : `Giảng viên đã gia hạn thêm ${minutes} phút làm bài cho cả phòng.`;

        const newAnn: SentAnnouncement = {
          id: `ANN-${Date.now().toString().slice(-4)}`,
          targetType: 'all',
          targetLabel: `Toàn bộ phòng thi (${session.attendedStudents} SV)`,
          message: annMsg,
          type: 'time',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setAnnouncements((prev) => [newAnn, ...prev]);
      }
    },
    [session.roomCode, session.attendedStudents]
  );

  // Gửi thông báo đến sinh viên (Toàn bộ / Nhóm / Cá nhân)
  const sendAnnouncement = useCallback(
    (
      targetType: 'all' | 'group' | 'individual',
      targetLabel: string,
      message: string,
      type: 'info' | 'warning' | 'time' | 'urgent'
    ) => {
      const newAnn: SentAnnouncement = {
        id: `ANN-${Date.now().toString().slice(-4)}`,
        targetType,
        targetLabel,
        message,
        type,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setAnnouncements((prev) => [newAnn, ...prev]);
      setToastNotice(`Đã gửi thông báo đến: ${targetLabel}`);
      setTimeout(() => setToastNotice(null), 3500);
    },
    []
  );

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const clearToastNotice = useCallback(() => {
    setToastNotice(null);
  }, []);

  // Xử lý vi phạm (đồng bộ lên Backend nếu là ID thật trong CSDL)
  const reviewViolation = useCallback(
    (id: string, action: 'warn' | 'record' | 'dismiss') => {
      setViolations((prev) =>
        prev.map((v) => {
          if (v.id === id) {
            return {
              ...v,
              status: action === 'warn' ? 'warned' : action === 'record' ? 'recorded' : 'dismissed',
            };
          }
          return v;
        })
      );

      if (/^\d+$/.test(id)) {
        const reviewStatus =
          action === 'record' ? 'confirmed' : action === 'warn' ? 'warned' : 'dismissed';
        fetchWithAuth(`/api/v1/violations/${id}/review`, {
          method: 'PATCH',
          body: JSON.stringify({ review_status: reviewStatus }),
        }).catch(() => null);
      }

      if (action === 'warn') {
        setToastNotice('Đã gửi cảnh báo nhắc nhở đến thí sinh.');
      } else if (action === 'record') {
        setToastNotice('Đã ghi nhận biên bản vi phạm vào báo cáo.');
      } else {
        setToastNotice('Đã bỏ qua cảnh báo.');
      }
      setTimeout(() => setToastNotice(null), 3000);

      if (activeToast?.id === id) {
        setActiveToast(null);
      }
    },
    [activeToast]
  );

  // Giả lập vi phạm AI theo thời gian thực (chỉ khi AI đang bật)
  const simulateViolation = useCallback(
    (typeOverride?: string) => {
      if (!session.isAiActive) {
        setToastNotice('Buổi thực hành Lab đang tắt AI Proctoring. Chuyển sang ca Kiểm tra để bật AI.');
        setTimeout(() => setToastNotice(null), 3000);
        return;
      }

      const student = SAMPLE_STUDENTS[Math.floor(Math.random() * SAMPLE_STUDENTS.length)];
      const vTemplate = typeOverride
        ? VIOLATION_TYPES.find((v) => v.type === typeOverride) || VIOLATION_TYPES[0]
        : VIOLATION_TYPES[Math.floor(Math.random() * VIOLATION_TYPES.length)];

      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const newViolation: ViolationAlert = {
        id: `VIO-${Date.now().toString().slice(-4)}`,
        studentId: student.id,
        studentName: student.name,
        classCode: session.classCode,
        roomCode: session.roomCode,
        type: vTemplate.type,
        severity: vTemplate.severity,
        timestamp: timeStr,
        description: vTemplate.desc,
        status: 'pending',
      };

      setViolations((prev) => [newViolation, ...prev]);
      setActiveToast(newViolation);
    },
    [session.isAiActive, session.classCode, session.roomCode]
  );

  return (
    <MonitoringContext.Provider
      value={{
        session,
        setSessionType,
        setRequireCamera,
        violations,
        announcements,
        activeToast,
        extendSession,
        sendAnnouncement,
        dismissToast,
        reviewViolation,
        simulateViolation,
        toastNotice,
        clearToastNotice,
      }}
    >
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
}
