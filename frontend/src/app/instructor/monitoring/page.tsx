'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Video,
  Monitor,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  Copy,
  Users,
  Search,
  Filter,
  Eye,
  MessageSquare,
  Sparkles,
  Maximize2,
  FileCode2,
  ToggleLeft,
  ToggleRight,
  Radio,
  Unlock,
} from 'lucide-react';
import {
  RoomSession,
  INSTRUCTOR_ROOMS_STORAGE_KEY,
} from '@/components/instructor/classes/types';
import { useMonitoring, ViolationAlert } from '@/components/instructor/monitoring/MonitoringContext';
import ExtendSessionModal from '@/components/instructor/monitoring/ExtendSessionModal';
import SendNotificationModal from '@/components/instructor/monitoring/SendNotificationModal';
import StudentDetailModal, { StudentDetailInfo } from '@/components/instructor/monitoring/StudentDetailModal';
import InstructorRoomChat from '@/components/instructor/monitoring/InstructorRoomChat';
import { fetchWithAuth, getAuthToken } from '@/services/apiClient';
import { useLiveKitRoom } from '@/hooks/useLiveKitRoom';
import LiveKitVideoFeed from '@/components/livekit/LiveKitVideoFeed';

const INITIAL_CAMERAS: StudentDetailInfo[] = [
  {
    id: 'SE184801',
    name: 'Nguyễn Văn An',
    status: 'normal',
    statusText: 'Hợp lệ • Đang code',
    violationsCount: 0,
    entryTime: '07:28:10',
    fps: 30,
    deviceInfo: 'Laptop cá nhân (Windows 11)',
    trustScore: 98,
    studentClass: 'K27-SE01',
    passedCases: '5/5 (100%)',
    gazeStatus: 'Chính diện màn hình',
    faceDetected: 1,
    activeApp: 'Oculide Editor',
    currentFile: 'solution.cpp',
    codeSnippet: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    // Tìm phần tử lớn thứ 2 trong mảng
    int max1 = -1e9, max2 = -1e9;
    for (int x : a) {
        if (x > max1) { max2 = max1; max1 = x; }
        else if (x > max2 && x < max1) { max2 = x; }
    }
    cout << max2 << endl;
    return 0;
}`,
    timeline: [
      { time: '07:28:10', text: 'Điểm danh vào phòng thi thành công', type: 'info' },
      { time: '07:35:00', text: 'Mở đề bài và tạo file solution.cpp', type: 'info' },
      { time: '08:10:45', text: 'Chạy thử test case 1-5: Hoàn tất 100%', type: 'code' },
    ],
  },
  {
    id: 'SE184802',
    name: 'Trần Thị Bình',
    status: 'warning',
    statusText: 'Quay mặt khỏi camera > 10s',
    violationsCount: 2,
    entryTime: '07:31:05',
    fps: 28,
    deviceInfo: 'MacBook Air M2 (macOS)',
    trustScore: 72,
    studentClass: 'K27-SE01',
    passedCases: '3/5 (60%)',
    gazeStatus: 'Quay lệch trái > 10s',
    faceDetected: 1,
    activeApp: 'Oculide Editor',
    currentFile: 'binary_search.cpp',
    codeSnippet: `#include <iostream>
using namespace std;

int binarySearch(int arr[], int l, int r, int x) {
    while (l <= r) {
        int m = l + (r - l) / 2;
        if (arr[m] == x) return m;
        if (arr[m] < x) l = m + 1;
        else r = m - 1;
    }
    return -1;
}`,
    timeline: [
      { time: '07:31:05', text: 'Điểm danh vào phòng', type: 'info' },
      { time: '07:55:20', text: 'Chạy thử test case 1-3: Đạt', type: 'code' },
      { time: '08:03:40', text: 'Cảnh báo AI: Quay mặt khỏi camera > 10s (Lần 1)', type: 'warning' },
    ],
  },
  {
    id: 'SE184803',
    name: 'Lê Hoàng Cường',
    status: 'normal',
    statusText: 'Hợp lệ • Đang gõ code',
    violationsCount: 0,
    entryTime: '07:29:40',
    fps: 30,
    deviceInfo: 'Laptop cá nhân (Ubuntu 22.04)',
    trustScore: 95,
    studentClass: 'K27-SE02',
    passedCases: '4/5 (80%)',
    gazeStatus: 'Chính diện màn hình',
    faceDetected: 1,
    activeApp: 'Oculide Editor',
    currentFile: 'tree_traversal.cpp',
    codeSnippet: `struct Node {
    int data;
    Node *left, *right;
    Node(int val) : data(val), left(nullptr), right(nullptr) {}
};

void inorder(Node* root) {
    if (!root) return;
    inorder(root->left);
    cout << root->data << " ";
    inorder(root->right);
}`,
    timeline: [
      { time: '07:29:40', text: 'Điểm danh hợp lệ', type: 'info' },
      { time: '08:18:00', text: 'Biên dịch code C++ qua Docker Sandbox (0 errors)', type: 'code' },
    ],
  },
  {
    id: 'SE184804',
    name: 'Phạm Minh Châu',
    status: 'submitted',
    statusText: 'Đã nộp bài (08:25)',
    violationsCount: 0,
    entryTime: '07:30:00',
    fps: 30,
    deviceInfo: 'Laptop cá nhân (Windows 11)',
    trustScore: 100,
    studentClass: 'K27-SE01',
    passedCases: '5/5 (100%)',
    gazeStatus: 'Chính diện',
    faceDetected: 1,
    activeApp: 'Oculide Dashboard',
    currentFile: 'final_exam.cpp',
    codeSnippet: `// Bài thi đã được Submit thành công vào hệ thống.
// Điểm số tự động: 10/10.`,
    timeline: [
      { time: '07:30:00', text: 'Vào phòng thi đúng giờ', type: 'info' },
      { time: '08:25:30', text: 'Bấm Nộp bài chính thức. Điểm bài thi: 10/10', type: 'info' },
    ],
  },
  {
    id: 'SE184805',
    name: 'Đặng Tuấn Dương',
    status: 'critical',
    statusText: 'Phát hiện thiết bị di động (Smartphone)',
    violationsCount: 3,
    entryTime: '07:33:12',
    fps: 29,
    deviceInfo: 'MacBook Pro 14 (macOS)',
    trustScore: 48,
    studentClass: 'K27-SE03',
    passedCases: '1/5 (20%)',
    gazeStatus: 'Cúi nhìn xuống góc bàn',
    faceDetected: 1,
    activeApp: 'Oculide Client (Chế độ Khóa màn hình)',
    currentFile: 'task1.cpp',
    codeSnippet: `#include <iostream>
using namespace std;

// Đang viết hàm đệ quy fibonacci
long long fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}`,
    timeline: [
      { time: '07:33:12', text: 'Vào phòng thi (Chế độ Khóa toàn màn hình)', type: 'info' },
      { time: '08:12:15', text: 'Cảnh báo AI: Phát hiện thiết bị di động (Smartphone)', type: 'critical' },
      { time: '08:20:00', text: 'Cảnh báo AI: Cố ý bấm tổ hợp phím thoát Fullscreen (Lần 2)', type: 'warning' },
    ],
  },
  {
    id: 'SE184806',
    name: 'Vũ Hải Yến',
    status: 'critical',
    statusText: 'Phát hiện khuôn mặt lạ / Người thứ 2',
    violationsCount: 1,
    entryTime: '07:30:50',
    fps: 30,
    deviceInfo: 'Laptop cá nhân (Windows 10)',
    trustScore: 65,
    studentClass: 'K27-SE01',
    passedCases: '4/5 (80%)',
    gazeStatus: 'Nghiêng góc 45 độ',
    faceDetected: 2,
    activeApp: 'Oculide Editor',
    currentFile: 'loop_matrix.cpp',
    codeSnippet: `// Đang giải bài tập mảng 2 chiều...`,
    timeline: [
      { time: '07:30:50', text: 'Điểm danh vào phòng thi', type: 'info' },
      { time: '08:18:20', text: 'Phát hiện khuôn mặt lạ xuất hiện trong webcam', type: 'critical' },
    ],
  },
];

function InstructorMonitoringContent() {
  const searchParams = useSearchParams();
  const roomIdParam = searchParams?.get('room');
  const [activeRoomSession, setActiveRoomSession] = useState<RoomSession | null>(null);
  const [realRoomId, setRealRoomId] = useState<number | null>(null);
  const [realStudents, setRealStudents] = useState<(StudentDetailInfo & { userId?: number })[] | null>(null);

  const {
    session,
    setSessionType,
    setRequireCamera,
    violations,
    announcements,
    extendSession,
    sendAnnouncement,
    reviewViolation,
    simulateViolation,
  } = useMonitoring();

  // Kết nối LiveKit SFU (Chế độ Subscribe nhận video stream của tất cả sinh viên trong phòng)
  const { connectionState: livekitState, remoteTracks } = useLiveKitRoom({
    roomId: realRoomId,
    mode: 'subscribe',
    enabled: Boolean(realRoomId),
  });

  // Đọc thông tin phòng thật từ Backend (fallback localStorage nếu offline)
  useEffect(() => {
    if (typeof window === 'undefined' || !roomIdParam) return;
    let isCancelled = false;

    const loadRealRoom = async () => {
      try {
        const data = await fetchWithAuth<any>(`/api/v1/rooms/lobby/${encodeURIComponent(roomIdParam)}`);
        if (isCancelled || !data) return;

        setRealRoomId(data.room_id);
        setSessionType(data.room_type === 'exam' ? 'EXAM' : 'LAB');

        const mappedAttendees = (data.attendees || []).map((a: any) => ({
          id: String(a.student_id),
          userId: a.user_id,
          name: a.student_name,
          studentClass: data.class_code || 'Lớp học phần',
          status: (a.status === 'completed' ? 'submitted' : 'normal') as 'normal' | 'warning' | 'critical' | 'submitted',
          statusText: a.status === 'waiting' ? 'Đang làm bài (Live)' : a.status === 'completed' ? 'Đã nộp bài' : 'Chưa vào phòng',
          fps: a.status === 'waiting' ? 30 : 0,
          activeApp: 'Oculide Exam IDE',
          currentFile: 'main.cpp',
          passedCases: '0/0',
          codeSnippet: '// Đang chờ dữ liệu đồng bộ từ trình soạn thảo...',
          logs: [],
        }));

        if (mappedAttendees.length > 0) {
          setRealStudents(mappedAttendees);
        }

        setActiveRoomSession({
          id: data.room_code,
          classId: data.class_code || '',
          className: data.class_name || '',
          password: data.passcode || '',
          type: data.room_type === 'exam' ? 'exam' : 'lab',
          title: data.room_name,
          durationMinutes: data.duration_minutes || 60,
          status: data.status === 'dang_dien_ra' ? 'in_progress' : data.status === 'da_dong' ? 'ended' : 'waiting',
          createdAt: data.created_at,
          proctoringConfig: { lockdownFullscreen: true, aiFaceDetection: true, aiObjectDetection: true, allowTabSwitch: false },
          attendees: [],
        });
      } catch {
        // Fallback localStorage nếu offline
        try {
          const raw = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
          if (raw) {
            const parsed: RoomSession[] = JSON.parse(raw);
            const found = parsed.find((r) => r.id.toLowerCase() === roomIdParam.toLowerCase());
            if (found) {
              setActiveRoomSession(found);
              setSessionType(found.type === 'lab' ? 'LAB' : 'EXAM');
            }
          }
        } catch {
          // ignore
        }
      }
    };

    loadRealRoom();
    return () => {
      isCancelled = true;
    };
  }, [roomIdParam, setSessionType]);

  // Modals state
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isSendNoticeModalOpen, setIsSendNoticeModalOpen] = useState(false);
  const [targetedStudent, setTargetedStudent] = useState<{ id: string; name: string } | null>(null);

  // State Giám sát chi tiết / Phóng to sinh viên (Màn hình + Webcam)
  const [focusedStudent, setFocusedStudent] = useState<StudentDetailInfo | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'warning' | 'normal' | 'submitted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSideTab, setActiveSideTab] = useState<'violations' | 'announcements' | 'chat'>('violations');
  const [realViolations, setRealViolations] = useState<ViolationAlert[] | null>(null);
  const [unlockNotice, setUnlockNotice] = useState<string | null>(null);
  const chatRoomCode = activeRoomSession?.id || roomIdParam || session.roomCode;

  useEffect(() => {
    if (!realRoomId) {
      setRealViolations(null);
      return;
    }
    let cancelled = false;
    let ws: WebSocket | null = null;

    async function loadViolationsAndWs() {
      try {
        const vioRows = await fetchWithAuth<Array<{
          violation_id: number;
          student_id: number;
          student_name?: string;
          student_code?: string;
          violation_type: string;
          severity: string;
          description?: string | null;
          detected_at: string;
          review_status: 'pending' | 'confirmed' | 'rejected';
        }>>(`/api/v1/violations/room/${realRoomId}`);
        if (!cancelled && Array.isArray(vioRows)) {
          const mapped: ViolationAlert[] = vioRows.map((v) => ({
            id: String(v.violation_id),
            studentId: v.student_code || String(v.student_id),
            studentName: v.student_name || `Sinh viên #${v.student_id}`,
            classCode: activeRoomSession?.classId || '',
            roomCode: chatRoomCode,
            type: v.violation_type,
            severity: (v.severity === 'critical' ? 'critical' : v.severity === 'high' ? 'high' : 'medium'),
            timestamp: new Date(v.detected_at).toLocaleTimeString('vi-VN'),
            description: v.description || v.violation_type,
            status: v.review_status === 'confirmed' ? 'recorded' : v.review_status === 'rejected' ? 'dismissed' : 'pending',
          }));
          setRealViolations(mapped);
        }
      } catch {
        // Giữ fallback context nếu chưa tải được
      }

      try {
        const me = await fetchWithAuth<{ user_id: number }>('/api/v1/auth/me');
        const token = getAuthToken();
        if (cancelled || !me?.user_id || !token || typeof window === 'undefined') return;
        const baseWs = process.env.NEXT_PUBLIC_WS_URL
          ? process.env.NEXT_PUBLIC_WS_URL.replace(/\/$/, '')
          : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
        ws = new WebSocket(`${baseWs}/ws/${realRoomId}/proctor_${me.user_id}?token=${encodeURIComponent(token)}`);
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'violation_alert' && msg.violation) {
              const v = msg.violation;
              const newAlert: ViolationAlert = {
                id: String(v.violation_id),
                studentId: String(v.student_id),
                studentName: `Sinh viên #${v.student_id}`,
                classCode: activeRoomSession?.classId || '',
                roomCode: chatRoomCode,
                type: v.violation_type,
                severity: (v.severity === 'critical' ? 'critical' : v.severity === 'high' ? 'high' : 'medium'),
                timestamp: v.detected_at ? new Date(v.detected_at).toLocaleTimeString('vi-VN') : new Date().toLocaleTimeString('vi-VN'),
                description: v.description || v.violation_type,
                status: 'pending',
              };
              setRealViolations((prev) => [newAlert, ...(prev || [])]);
              setRealStudents((prev) =>
                prev
                  ? prev.map((s) =>
                      s.userId === Number(v.student_id)
                        ? { ...s, status: 'warning', statusText: `Cảnh báo: ${v.violation_type}`, violationsCount: (s.violationsCount || 0) + 1 }
                        : s,
                    )
                  : prev,
              );
            }
          } catch {
            // ignore
          }
        };
      } catch {
        // ignore WS error
      }
    }

    loadViolationsAndWs();
    return () => {
      cancelled = true;
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [realRoomId, activeRoomSession?.classId, chatRoomCode]);

  const handleUnlockStudent = async (student: StudentDetailInfo) => {
    const targetUserId = student.userId ?? (Number.isInteger(Number(student.id)) ? Number(student.id) : null);
    if (!realRoomId || !targetUserId) return;
    try {
      await fetchWithAuth(`/api/v1/sessions/room/${realRoomId}/unlock/${targetUserId}`, {
        method: 'POST',
      });
      setUnlockNotice(`Đã gửi lệnh mở khóa bài thi cho ${student.name}.`);
      setTimeout(() => setUnlockNotice(null), 3500);
    } catch {
      setUnlockNotice(`Không thể gửi lệnh mở khóa cho ${student.name}.`);
      setTimeout(() => setUnlockNotice(null), 3500);
    }
  };

  const handleReviewViolation = (id: string, action: 'warn' | 'record' | 'dismiss') => {
    if (realViolations !== null && /^\d+$/.test(id)) {
      const reviewStatus = action === 'record' ? 'confirmed' : action === 'dismiss' ? 'rejected' : null;
      if (reviewStatus) {
        fetchWithAuth(`/api/v1/violations/${id}/review`, {
          method: 'PATCH',
          body: JSON.stringify({ review_status: reviewStatus }),
        }).catch(() => {});
      }
      setRealViolations((prev) =>
        prev
          ? prev.map((v) =>
              v.id === id
                ? { ...v, status: action === 'record' ? 'recorded' : action === 'dismiss' ? 'dismissed' : 'warned' }
                : v,
            )
          : prev,
      );
      return;
    }
    reviewViolation(id, action);
  };

  const displayViolations = realViolations ?? violations;

  const handleOpenIndividualNotice = (studentId: string, studentName: string) => {
    setTargetedStudent({ id: studentId, name: studentName });
    setIsSendNoticeModalOpen(true);
  };

  const camerasSource = realStudents ?? INITIAL_CAMERAS;

  const filteredCameras = camerasSource.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'warning') return c.status === 'warning' || c.status === 'critical';
    if (statusFilter === 'normal') return c.status === 'normal';
    if (statusFilter === 'submitted') return c.status === 'submitted';
    return true;
  });

  const handleNextStudent = () => {
    if (!focusedStudent) return;
    const currentIndex = filteredCameras.findIndex((c) => c.id === focusedStudent.id);
    if (currentIndex !== -1 && currentIndex < filteredCameras.length - 1) {
      setFocusedStudent(filteredCameras[currentIndex + 1]);
    } else if (filteredCameras.length > 0) {
      setFocusedStudent(filteredCameras[0]);
    }
  };

  const handlePrevStudent = () => {
    if (!focusedStudent) return;
    const currentIndex = filteredCameras.findIndex((c) => c.id === focusedStudent.id);
    if (currentIndex > 0) {
      setFocusedStudent(filteredCameras[currentIndex - 1]);
    } else if (filteredCameras.length > 0) {
      setFocusedStudent(filteredCameras[filteredCameras.length - 1]);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── BANNER THÔNG BÁO QUY TRÌNH & TRẠNG THÁI PHÒNG ── */}
      {activeRoomSession && activeRoomSession.status === 'waiting' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 text-amber-900 font-medium">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-amber-950">
                Phòng {activeRoomSession.id} đang ở trạng thái PHÒNG CHỜ (Điểm Danh)
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Lưu ý: Quá trình giám sát trực tiếp qua camera &amp; code chỉ chính thức bắt đầu sau khi bạn bấm <strong>[Bắt Đầu Làm Bài]</strong> tại màn hình Phòng Chờ.
              </p>
            </div>
          </div>
          <Link
            href={`/instructor/room/${activeRoomSession.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition shrink-0 shadow-2xs cursor-pointer"
          >
            <span>Vào Phòng Chờ Điểm Danh</span>
          </Link>
        </div>
      )}

      {activeRoomSession && activeRoomSession.status === 'in_progress' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-emerald-300 bg-emerald-50/90 px-4 py-3 text-xs font-medium text-emerald-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
            </span>
            <div>
              <p className="font-bold text-emerald-950">
                ĐANG GIÁM SÁT TRỰC TIẾP: Phòng {activeRoomSession.id} ({activeRoomSession.title})
              </p>
              <p className="text-[11px] text-emerald-800">
                Mật khẩu PIN: <strong className="font-mono text-emerald-950">{activeRoomSession.password}</strong> • Bộ đề thi: <strong className="text-emerald-950">{activeRoomSession.templateTitle}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-800">
            <span className="rounded-md bg-white border border-emerald-200 px-2 py-0.5">
              {activeRoomSession.proctoringConfig.lockdownFullscreen ? '🔒 Khóa Fullscreen' : '🔓 Cho phép rời tab'}
            </span>
            <span className="rounded-md bg-white border border-emerald-200 px-2 py-0.5">
              {activeRoomSession.proctoringConfig.aiFaceDetection ? '📷 AI Smartphone & Face: Bật' : '📷 AI: Tắt'}
            </span>
          </div>
        </div>
      )}

      {/* ── 1. HEADER BAR CHỈ HUY PHÒNG THI & CHUYỂN ĐỔI CHẾ ĐỘ LAB / KIỂM TRA ── */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                {session.classCode}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-500">{session.className}</span>

              {/* Tag phân biệt chế độ EXAM vs LAB */}
              {session.type === 'EXAM' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200">
                  <ShieldAlert className="h-3 w-3 text-purple-600" />
                  Buổi Kiểm Tra • Bắt buộc AI &amp; Camera
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                  <Monitor className="h-3 w-3 text-blue-600" />
                  Thực Hành Lab • Không dùng AI • Camera:{' '}
                  {session.requireCamera ? 'Bật (Theo GV)' : 'Tắt (Tùy chọn)'}
                </span>
              )}
            </div>

            <h1 className="mt-1 text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
              {session.title}
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span>
                Mã phòng: <strong className="font-mono font-bold text-blue-700">{session.roomCode}</strong>
              </span>
              <span>
                Sĩ số: <strong className="text-slate-800 font-bold">{session.attendedStudents}/{session.totalStudents} SV</strong>
              </span>
            </div>
          </div>

          {/* Công cụ điều khiển phòng thi */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Chuyển nhanh giữa ca Kiểm tra (EXAM) và ca Thực hành (LAB) */}
            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setSessionType('EXAM')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  session.type === 'EXAM'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kiểm tra (EXAM)
              </button>
              <button
                type="button"
                onClick={() => setSessionType('LAB')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  session.type === 'LAB'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Thực hành (LAB)
              </button>
            </div>

            {/* Nếu là buổi Lab: Toggle cho phép GV tùy chỉnh bật/tắt camera */}
            {session.type === 'LAB' && (
              <label className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs">
                <input
                  type="checkbox"
                  checked={session.requireCamera}
                  onChange={(e) => setRequireCamera(e.target.checked)}
                  className="rounded text-blue-600 accent-blue-600 h-3.5 w-3.5"
                />
                <span>Yêu cầu Webcam</span>
              </label>
            )}

            {/* Đồng hồ đếm ngược */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-2xs">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>{session.remainingMinutes}p</span>
            </div>

            {/* Nút Gia hạn phòng tùy chỉnh */}
            <button
              type="button"
              onClick={() => setIsExtendModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-2xs hover:bg-amber-100 transition cursor-pointer"
            >
              <Clock className="h-3.5 w-3.5" />
              Gia hạn...
            </button>

            {/* Nút Phát thông báo */}
            <button
              type="button"
              onClick={() => {
                setTargetedStudent(null);
                setIsSendNoticeModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              Gửi thông báo
            </button>

            {/* Nút Test Vi phạm AI (chỉ khi có AI) */}
            {session.isAiActive && (
              <button
                type="button"
                onClick={() => simulateViolation()}
                className="inline-flex items-center gap-1 rounded-2xl border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                title="Bấm để kích hoạt cảnh báo vi phạm AI ngẫu nhiên"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                <span>Test AI</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. KHU VỰC CHÍNH: LƯỚI SINH VIÊN (PANOPTIC GRID) + SIDEBAR THÔNG BÁO SIÊU GỌN ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        {/* CỘT TRÁI (3 Cột): Bộ lọc và Lưới theo dõi */}
        <div className="lg:col-span-3 space-y-4">
          {/* Bộ lọc và tìm kiếm */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: `Tất cả (${camerasSource.length})` },
                { id: 'warning', label: `Cảnh báo AI (${camerasSource.filter((c) => c.status === 'warning' || c.status === 'critical').length})` },
                { id: 'normal', label: `Bình thường (${camerasSource.filter((c) => c.status === 'normal').length})` },
                { id: 'submitted', label: `Đã nộp (${camerasSource.filter((c) => c.status === 'submitted').length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm MSSV hoặc tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8.5 w-full sm:w-56 rounded-xl border border-slate-200/90 bg-slate-50/70 pl-10 pr-3.5 text-xs outline-none transition-all hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Lưới Camera / Màn hình Sinh viên */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCameras.map((student) => {
              const hasAlert = student.status === 'warning' || student.status === 'critical';
              const isSubmitted = student.status === 'submitted';
              const lkTrack = (student as any).userId
                ? remoteTracks[`user_${(student as any).userId}`]
                : undefined;

              return (
                <div
                  key={student.id}
                  className={`rounded-3xl border bg-white p-3.5 shadow-xs transition-all hover:shadow-md relative ${
                    student.status === 'critical'
                      ? 'border-red-400 ring-2 ring-red-500/20 bg-red-50/10'
                      : student.status === 'warning'
                      ? 'border-amber-400 ring-2 ring-amber-500/10 bg-amber-50/10'
                      : 'border-slate-200/90'
                  }`}
                >
                  {/* Khung stream: BẤM VÀO ĐỂ PHÓNG TO CHI TIẾT (MÀN HÌNH + WEBCAM) */}
                  <div
                    onClick={() => setFocusedStudent(student)}
                    className="aspect-video w-full rounded-2xl bg-slate-900 flex items-center justify-center relative overflow-hidden group cursor-pointer"
                    title="Nhấp để phóng to màn hình và webcam của sinh viên này"
                  >
                    {/* Hiển thị Màn hình hoặc Webcam */}
                    {session.type === 'LAB' && !session.requireCamera ? (
                      <div className="absolute inset-0 bg-[#1e1e2e] p-2 flex flex-col justify-between font-mono text-[9px] text-slate-300">
                        <div className="flex items-center justify-between text-slate-400 border-b border-slate-700/60 pb-1">
                          <span className="text-blue-400 font-bold">{student.currentFile}</span>
                          <span className="text-emerald-400">{student.passedCases}</span>
                        </div>
                        <p className="line-clamp-2 text-slate-400 select-none">
                          {student.codeSnippet.slice(0, 80)}...
                        </p>
                        <span className="text-slate-500 text-[8px]">Màn hình làm bài sinh viên</span>
                      </div>
                    ) : (
                      <>
                        {lkTrack ? (
                          <LiveKitVideoFeed
                            track={lkTrack}
                            muted
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Video className="h-9 w-9 text-slate-700" />
                        )}
                        {/* Giả lập khung nhận diện khuôn mặt */}
                        {session.isAiActive && (
                          <div
                            className={`absolute inset-4 rounded-xl border-2 pointer-events-none transition-all ${
                              hasAlert ? 'border-red-500/80 animate-pulse' : 'border-emerald-400/40'
                            }`}
                          >
                            <span
                              className={`absolute -top-2.5 left-2 rounded px-1 text-[8px] font-bold text-white uppercase ${
                                hasAlert ? 'bg-red-600' : 'bg-emerald-600'
                              }`}
                            >
                              {hasAlert ? 'AI Alert' : 'Face Track'}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Tag FPS / LiveKit góc trên trái */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.2 text-[9px] text-white font-mono backdrop-blur-xs">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          hasAlert ? 'bg-red-400 animate-ping' : lkTrack ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      <span>{lkTrack ? 'LIVE • LiveKit' : `${student.fps} FPS`}</span>
                    </div>

                    {/* Lớp phủ Hover: Bấm để phóng to */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-blue-600 text-white px-2.5 py-1 text-xs font-bold shadow-lg">
                        <Maximize2 className="h-3.5 w-3.5" />
                        Phóng to chi tiết
                      </span>
                    </div>

                    {/* Tag góc dưới: Tên & MSSV */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-xl bg-black/80 px-2 py-0.5 text-white backdrop-blur-xs">
                      <span className="text-[11px] font-bold truncate">
                        {student.id} • {student.name}
                      </span>
                      {hasAlert && (
                        <span className="rounded bg-red-600 px-1 text-[9px] font-bold text-white shrink-0">
                          {student.violationsCount} vi phạm
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Trạng thái & Tác vụ nhanh */}
                  <div className="mt-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[10px]">Tiến độ / Trạng thái:</span>
                      <span
                        className={`text-[10px] font-bold truncate max-w-[190px] ${
                          student.status === 'critical'
                            ? 'text-red-600'
                            : student.status === 'warning'
                            ? 'text-amber-600'
                            : isSubmitted
                            ? 'text-blue-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {student.statusText}
                      </span>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setFocusedStudent(student)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                        title="Phóng to màn hình và webcam"
                      >
                        <Maximize2 className="h-3 w-3" />
                        Phóng to
                      </button>

                      {realRoomId && student.userId && (
                        <button
                          type="button"
                          onClick={() => handleUnlockStudent(student)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                          title="Mở khóa bài thi từ xa cho sinh viên"
                        >
                          <Unlock className="h-3 w-3" />
                          Mở khóa
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenIndividualNotice(student.id, student.name)}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                        title="Nhắn tin riêng cho SV này"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Nhắn riêng
                      </button>

                      {hasAlert ? (
                        <button
                          type="button"
                          onClick={() => reviewViolation(student.id, 'record')}
                          className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                        >
                          Biên bản
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                          <ShieldCheck className="h-3 w-3 text-emerald-500" />
                          Hợp lệ
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CỘT PHẢI (1 Cột): SIDEBAR THÔNG BÁO SIÊU GỌN THEO YÊU CẦU ── */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-3">
          {/* Header tabs nhỏ gọn */}
          <div className="flex items-center gap-1 border-b border-slate-100 pb-2">
            <button
              type="button"
              onClick={() => setActiveSideTab('violations')}
              className={`flex-1 rounded-xl py-1 text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                activeSideTab === 'violations'
                  ? 'bg-red-50 text-red-700 shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>{session.type === 'EXAM' ? '🚨 Vi phạm AI' : '🚨 Cảnh báo'}</span>
              <span className="rounded-full bg-red-100 px-1.5 text-[9px] font-black text-red-700">
                {violations.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSideTab('announcements')}
              className={`flex-1 rounded-xl py-1 text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                activeSideTab === 'announcements'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>📢 Đã gửi</span>
              <span className="rounded-full bg-blue-100 px-1.5 text-[9px] font-black text-blue-700">
                {announcements.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSideTab('chat')}
              className={`flex-1 rounded-xl py-1 text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                activeSideTab === 'chat'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <MessageSquare className="h-3 w-3" />
              <span>Chat phòng</span>
            </button>
          </div>

          {/* Tab 1: Cảnh báo vi phạm (THIẾT KẾ SIÊU GỌN NHẤT CÓ THỂ THEO HÌNH ẢNH USER) */}
          {activeSideTab === 'violations' && (
            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-0.5">
              {unlockNotice && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
                  {unlockNotice}
                </div>
              )}
              {displayViolations.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  <ShieldCheck className="mx-auto h-6 w-6 text-emerald-400" />
                  <p className="mt-1 font-bold text-slate-600 text-xs">Không có vi phạm</p>
                </div>
              ) : (
                displayViolations.map((vio) => {
                  const matchedStudent = camerasSource.find((c) => c.id === vio.studentId || String(c.userId) === vio.studentId);
                  const isRecorded = vio.status === 'recorded';
                  const isDismissed = vio.status === 'dismissed';

                  return (
                    <div
                      key={vio.id}
                      className={`group rounded-xl border p-2 transition text-xs space-y-1.5 ${
                        isRecorded || isDismissed
                          ? 'border-slate-200 bg-slate-50/80 opacity-60'
                          : vio.severity === 'critical'
                          ? 'border-red-200 bg-red-50/50 hover:bg-red-50 hover:border-red-300'
                          : 'border-amber-200 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-300'
                      }`}
                    >
                      {/* Dòng 1: Header - Tên SV + MSSV + Giờ */}
                      <div className="flex items-center justify-between gap-1">
                        <div
                          onClick={() => matchedStudent && setFocusedStudent(matchedStudent)}
                          className="flex items-center gap-1.5 min-w-0 cursor-pointer hover:underline"
                          title="Bấm để xem trực tiếp màn hình & webcam SV"
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              isRecorded || isDismissed
                                ? 'bg-slate-400'
                                : vio.severity === 'critical'
                                ? 'bg-red-500 animate-pulse'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span className="font-bold text-slate-900 truncate text-[11.5px]">
                            {vio.studentName}
                          </span>
                          <span className="font-mono text-slate-500 font-medium text-[10px] shrink-0">
                            ({vio.studentId})
                          </span>
                        </div>
                        <span className="font-mono text-[9.5px] text-slate-400 font-bold shrink-0">
                          {vio.timestamp}
                        </span>
                      </div>

                      {/* Dòng 2: Loại lỗi vi phạm - Gọn gàng 1 dòng không rớt */}
                      <div
                        onClick={() => matchedStudent && setFocusedStudent(matchedStudent)}
                        className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold cursor-pointer truncate ${
                          vio.severity === 'critical'
                            ? 'bg-red-100/70 text-red-700'
                            : 'bg-amber-100/70 text-amber-800'
                        }`}
                        title={`${vio.type}: ${vio.description}`}
                      >
                        <AlertTriangle className="h-3 w-3 shrink-0 text-red-600" />
                        <span className="truncate">{vio.type}</span>
                      </div>

                      {/* Dòng 3: Nút bấm mini gọn gàng */}
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => matchedStudent && setFocusedStudent(matchedStudent)}
                          className="text-[10px] font-bold text-slate-600 hover:text-blue-600 inline-flex items-center gap-0.5 cursor-pointer"
                          title="Phóng to màn hình & webcam SV"
                        >
                          <Eye className="h-2.5 w-2.5 text-blue-500" />
                          <span>Xem</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenIndividualNotice(vio.studentId, vio.studentName)}
                            className="rounded px-1.5 py-0.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50 cursor-pointer inline-flex items-center gap-0.5"
                            title="Nhắc nhở riêng"
                          >
                            <Send className="h-2.5 w-2.5" />
                            <span>Nhắc</span>
                          </button>

                          {vio.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReviewViolation(vio.id, 'record')}
                                className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-700 cursor-pointer shadow-2xs"
                                title="Lập biên bản vi phạm"
                              >
                                Lập BB
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewViolation(vio.id, 'dismiss')}
                                className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                                title="Bỏ qua cảnh báo"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500">
                              {vio.status === 'recorded' ? '✓ Đã lập BB' : 'Đã bỏ qua'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 2: Thông báo đã gửi */}
          {activeSideTab === 'announcements' && (
            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-0.5">
              {announcements.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  <Send className="mx-auto h-6 w-6 text-slate-300" />
                  <p className="mt-1 font-bold text-slate-600 text-xs">Chưa có thông báo</p>
                </div>
              ) : (
                announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-2 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[9.5px] font-bold text-blue-800 truncate">
                        {ann.targetLabel}
                      </span>
                      <span className="font-mono text-[9px] text-slate-400 shrink-0">
                        {ann.timestamp}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-700 leading-snug font-medium line-clamp-2">
                      {ann.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Chat trực tiếp với sinh viên trong phòng */}
          {activeSideTab === 'chat' && (
            <InstructorRoomChat roomCode={chatRoomCode} />
          )}
        </div>
      </div>

      {/* ── 3. MODAL PHÓNG TO GIÁM SÁT CHI TIẾT SINH VIÊN (MÀN HÌNH + WEBCAM) ── */}
      <StudentDetailModal
        isOpen={Boolean(focusedStudent)}
        onClose={() => setFocusedStudent(null)}
        student={focusedStudent}
        sessionType={session.type}
        requireCamera={session.requireCamera}
        onSendNotice={(studentId, studentName) => {
          handleOpenIndividualNotice(studentId, studentName);
        }}
        onRecordViolation={(studentId) => {
          reviewViolation(studentId, 'record');
        }}
        onNextStudent={handleNextStudent}
        onPrevStudent={handlePrevStudent}
      />

      {/* ── 4. CÁC MODAL ĐIỀU KHIỂN: GIA HẠN & PHÁT THÔNG BÁO ── */}
      <ExtendSessionModal
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        roomCode={session.roomCode}
        currentRemainingMinutes={session.remainingMinutes}
        onConfirm={(minutes, reason, notify) => {
          extendSession(minutes, reason, notify);
        }}
      />

      <SendNotificationModal
        isOpen={isSendNoticeModalOpen}
        onClose={() => {
          setIsSendNoticeModalOpen(false);
          setTargetedStudent(null);
        }}
        defaultTarget={
          targetedStudent
            ? {
                type: 'individual',
                studentId: targetedStudent.id,
                studentName: targetedStudent.name,
              }
            : undefined
        }
        onSend={(targetType, targetLabel, message, type, studentId) => {
          sendAnnouncement(targetType, targetLabel, message, type, studentId);
        }}
      />
    </div>
  );
}

export default function InstructorMonitoringPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs font-semibold text-slate-500">
          Đang tải trung tâm giám sát phòng thi...
        </div>
      }
    >
      <InstructorMonitoringContent />
    </React.Suspense>
  );
}
