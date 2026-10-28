'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

  const [violations, setViolations] = useState<ViolationAlert[]>([
    {
      id: 'VIO-01',
      studentId: 'SE184802',
      studentName: 'Trần Thị Bình',
      classCode: 'CS101-A',
      roomCode: 'CS101-LAB3',
      type: 'Quay mặt khỏi camera > 10s',
      severity: 'medium',
      timestamp: '08:03:40',
      description: 'Không phát hiện khuôn mặt chính diện quá 10 giây.',
      status: 'pending',
    },
    {
      id: 'VIO-02',
      studentId: 'SE184805',
      studentName: 'Đặng Tuấn Dương',
      classCode: 'CS101-A',
      roomCode: 'CS101-LAB3',
      type: 'Phát hiện thiết bị di động (Smartphone)',
      severity: 'critical',
      timestamp: '08:12:15',
      description: 'AI phát hiện điện thoại thông minh đặt dưới góc bàn làm bài.',
      status: 'pending',
    },
    {
      id: 'VIO-03',
      studentId: 'SE184806',
      studentName: 'Vũ Hải Yến',
      classCode: 'CS101-A',
      roomCode: 'CS101-LAB3',
      type: 'Phát hiện khuôn mặt lạ / Người thứ 2',
      severity: 'critical',
      timestamp: '08:18:20',
      description: 'AI phát hiện thêm khuôn mặt thứ hai xuất hiện trong webcam.',
      status: 'pending',
    },
  ]);

  const [announcements, setAnnouncements] = useState<SentAnnouncement[]>([
    {
      id: 'ANN-01',
      targetType: 'all',
      targetLabel: 'Toàn bộ phòng thi (46 SV)',
      message: 'Các em chú ý đọc kỹ yêu cầu test case 3 và kiểm tra định dạng output trước khi submit.',
      type: 'info',
      timestamp: '08:00:10',
    },
  ]);

  const [activeToast, setActiveToast] = useState<ViolationAlert | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

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
          targetLabel: 'Toàn bộ phòng thi (46 SV)',
          message: annMsg,
          type: 'time',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setAnnouncements((prev) => [newAnn, ...prev]);
      }
    },
    [session.roomCode]
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

  // Xử lý vi phạm
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
