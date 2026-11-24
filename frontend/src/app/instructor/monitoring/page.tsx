'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
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
  LogOut,
  ChevronDown,
  ArrowLeft,
  CameraOff,
} from 'lucide-react';
import {
  RoomSession,
  isRoomCurrentlyRunning,
} from '@/components/instructor/classes/types';
import { useMonitoring, ViolationAlert } from '@/components/instructor/monitoring/MonitoringContext';
import ExtendSessionModal from '@/components/instructor/monitoring/ExtendSessionModal';
import SendNotificationModal from '@/components/instructor/monitoring/SendNotificationModal';
import StudentDetailModal, { StudentDetailInfo } from '@/components/instructor/monitoring/StudentDetailModal';
import InstructorRoomChat from '@/components/instructor/monitoring/InstructorRoomChat';
import { fetchWithAuth, getAuthToken } from '@/services/apiClient';
import { useLiveKitRoom } from '@/hooks/useLiveKitRoom';
import LiveKitVideoFeed from '@/components/livekit/LiveKitVideoFeed';

const INITIAL_CAMERAS: StudentDetailInfo[] = [];

function InstructorMonitoringContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdParam = searchParams?.get('room');
  const [activeRoomSession, setActiveRoomSession] = useState<RoomSession | null>(null);
  const [realRoomId, setRealRoomId] = useState<number | null>(null);
  const [realStudents, setRealStudents] = useState<(StudentDetailInfo & { userId?: number })[] | null>(null);
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(true);
  const [isClassSwitcherOpen, setIsClassSwitcherOpen] = useState<boolean>(false);
  const [selectedRoomNotice, setSelectedRoomNotice] = useState<string | null>(null);

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

  // Tải danh sách tất cả các phòng đang hoạt động của Giảng viên để hỗ trợ giám sát nhiều lớp
  useEffect(() => {
    let isCancelled = false;
    const fetchActiveRooms = async () => {
      try {
        const rooms = await fetchWithAuth<any[]>('/api/v1/rooms');
        if (isCancelled) return;
        const running = (rooms || []).filter((room) => isRoomCurrentlyRunning(room));
        setActiveRooms(running);
      } catch (err) {
        console.error('Lỗi khi tải danh sách ca trực:', err);
      } finally {
        if (!isCancelled) setIsLoadingRooms(false);
      }
    };
    fetchActiveRooms();
    const interval = setInterval(fetchActiveRooms, 10000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleConfirmEndLab = async () => {
    if (!realRoomId) return;
    setIsEndingLab(true);
    try {
      await fetchWithAuth(`/api/v1/rooms/${realRoomId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'da_dong' }),
      });
      try {
        const updateStorageKey = (key: string) => {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            const updated = list.map((r: any) =>
              r.id === activeRoomSession?.id || r.id === roomIdParam ? { ...r, status: 'da_dong' } : r
            );
            localStorage.setItem(key, JSON.stringify(updated));
          }
        };
        updateStorageKey('oculide_instructor_rooms_mock');
        updateStorageKey('oculide_instructor_rooms');
        window.dispatchEvent(new Event('storage'));
      } catch {}
      setIsEndLabModalOpen(false);
      router.push('/instructor/classes');
    } catch (err: any) {
      alert(err?.message || 'Không thể kết thúc phòng');
    } finally {
      setIsEndingLab(false);
    }
  };

  // Kết nối LiveKit SFU (Chế độ Subscribe nhận video stream của tất cả sinh viên trong phòng)
  const { connectionState: livekitState, remoteTracks, participantTracks } = useLiveKitRoom({
    roomId: realRoomId,
    mode: 'subscribe',
    enabled: Boolean(realRoomId),
  });

  // Chỉ xác minh và mở phòng đang thực sự diễn ra từ Backend.
  useEffect(() => {
    if (!roomIdParam) {
      setActiveRoomSession(null);
      setRealRoomId(null);
      setRealStudents(null);
      setSelectedRoomNotice(null);
      return;
    }

    if (typeof window === 'undefined') return;
    let isCancelled = false;

    const loadRealRoom = async () => {
      try {
        const data = await fetchWithAuth<any>(`/api/v1/rooms/lobby/${encodeURIComponent(roomIdParam)}`);
        if (isCancelled) return;
        if (!data || !isRoomCurrentlyRunning(data)) {
          setActiveRoomSession(null);
          setRealRoomId(null);
          setRealStudents(null);
          setSelectedRoomNotice(
            data
              ? 'Phòng này chưa bắt đầu hoặc đã kết thúc. Chỉ các phiên đang diễn ra mới có thể mở trong module Giám sát.'
              : 'Không tìm thấy thông tin phòng này.'
          );
          return;
        }

        setSelectedRoomNotice(null);
        setRealRoomId(data.room_id);
        setSessionType(data.room_type === 'exam' ? 'EXAM' : 'LAB');

        const mappedAttendees = (data.attendees || []).map((a: any) => ({
          id: String(a.student_id),
          userId: a.user_id,
          name: a.student_name,
          studentClass: data.class_code || 'Lớp học phần',
          status: (a.status === 'completed' ? 'submitted' : 'normal') as 'normal' | 'warning' | 'critical' | 'submitted',
          statusText: a.status === 'late' ? 'Điểm danh muộn (Live)' : a.status === 'waiting' ? 'Đang làm bài (Live)' : a.status === 'completed' ? 'Đã nộp bài' : 'Chưa vào phòng',
          isLate: a.status === 'late',
          violationsCount: 0,
          entryTime: a.joined_at ? new Date(a.joined_at).toLocaleTimeString('vi-VN') : 'Chưa vào phòng',
          fps: (a.status === 'waiting' || a.status === 'late') ? 30 : 0,
          deviceInfo: 'Thiết bị thí sinh',
          trustScore: 100,
          activeApp: 'Oculide Exam IDE',
          currentFile: 'main.cpp',
          passedCases: '0/0',
          gazeStatus: 'Chính diện',
          faceDetected: 1,
          codeSnippet: '// Đang đồng bộ từ trình soạn thảo của thí sinh...',
          timeline: [],
          logs: [],
        }));

        setRealStudents(mappedAttendees);

        let parsedConfig: any = { requireCamera: false };
        if (data.proctoring_config) {
          try {
            parsedConfig = typeof data.proctoring_config === 'string'
              ? JSON.parse(data.proctoring_config)
              : data.proctoring_config;
          } catch {}
        }
        if (typeof window !== 'undefined') {
          const localSaved = localStorage.getItem(`oculide_room_${data.room_code}_require_cam`);
          const finalCam = localSaved !== null ? localSaved === 'true' : Boolean(parsedConfig?.requireCamera);
          setRequireCamera(finalCam);
        }

        setActiveRoomSession({
          id: data.room_code,
          classId: data.class_code || '',
          className: data.class_name || '',
          password: data.passcode || '',
          type: data.room_type === 'exam' ? 'exam' : 'lab',
          title: data.room_name,
          durationMinutes: data.duration_minutes || 60,
          status: 'in_progress',
          createdAt: data.created_at,
          proctoringConfig: parsedConfig,
          attendees: [],
        });
      } catch {
        if (isCancelled) return;
        setActiveRoomSession(null);
        setRealRoomId(null);
        setRealStudents(null);
        setSelectedRoomNotice('Không thể xác minh trạng thái phòng. Vui lòng tải lại hoặc quay về danh sách giám sát.');
      }
    };

    loadRealRoom();
    const interval = window.setInterval(loadRealRoom, 10000);
    return () => {
      isCancelled = true;
      window.clearInterval(interval);
    };
  }, [roomIdParam, setSessionType]);

  // Modals state
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isEndLabModalOpen, setIsEndLabModalOpen] = useState(false);
  const [isEndingLab, setIsEndingLab] = useState(false);
  const [isSendNoticeModalOpen, setIsSendNoticeModalOpen] = useState(false);
  const [targetedStudent, setTargetedStudent] = useState<{ id: string; name: string } | null>(null);

  // State Giám sát chi tiết / Phóng to sinh viên (Màn hình + Webcam)
  const [focusedStudent, setFocusedStudent] = useState<StudentDetailInfo | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Filters & Search: Mặc định là 'active' (chỉ hiển thị sinh viên đang làm bài; sinh viên nộp bài xong sẽ ẩn khỏi lưới)
  const [statusFilter, setStatusFilter] = useState<'active' | 'warning' | 'submitted' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSideTab, setActiveSideTab] = useState<'violations' | 'announcements' | 'chat'>('violations');
  const [realViolations, setRealViolations] = useState<ViolationAlert[] | null>(null);
  const [previewEvidenceViolation, setPreviewEvidenceViolation] = useState<ViolationAlert | null>(null);
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
          snapshot_url?: string | null;
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
            snapshotUrl: v.snapshot_url || null,
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
        wsRef.current = ws;
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
                snapshotUrl: v.snapshot_url || null,
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
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close();
        wsRef.current = null;
      }
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

  // Gửi thông báo trực tiếp qua WebSocket tới toàn bộ sinh viên trong phòng hoặc sinh viên chỉ định
  const handleSendNotice = (
    targetType: 'all' | 'group' | 'individual',
    targetLabel: string,
    message: string,
    type: 'info' | 'warning' | 'time' | 'urgent',
    studentId?: string
  ) => {
    sendAnnouncement(targetType, targetLabel, message, type, studentId);
    const targetStudent = realStudents?.find((s) => s.id === studentId);
    const targetUserId = targetStudent?.userId ? String(targetStudent.userId) : undefined;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'announcement',
          target_type: targetType,
          target_id: studentId,
          target_user_id: targetUserId,
          target_label: targetLabel,
          message: message,
          notice_type: type,
          instructor_name: activeRoomSession?.title || 'Giảng viên',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        })
      );
    }
  };

  // Giữ cấu hình Yêu cầu Webcam cố định không bị reset
  const handleToggleRequireCamera = async (checked: boolean) => {
    setRequireCamera(checked);
    if (activeRoomSession?.id) {
      localStorage.setItem(`oculide_room_${activeRoomSession.id}_require_cam`, String(checked));
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'room_config_update',
          requireCamera: checked,
        })
      );
    }
    if (realRoomId) {
      fetchWithAuth(`/api/v1/rooms/${realRoomId}`, {
        method: 'PUT',
        body: JSON.stringify({
          proctoring_config: {
            ...((activeRoomSession?.proctoringConfig as any) || {}),
            requireCamera: checked,
          },
        }),
      }).catch(() => null);
    }
  };

  const camerasSource = realStudents ?? INITIAL_CAMERAS;

  const activeCount = camerasSource.filter((c) => c.status !== 'submitted').length;
  const warningCount = camerasSource.filter((c) => c.status === 'warning' || c.status === 'critical').length;
  const submittedCount = camerasSource.filter((c) => c.status === 'submitted').length;

  const filteredCameras = camerasSource.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return c.status !== 'submitted';
    if (statusFilter === 'warning') return c.status === 'warning' || c.status === 'critical';
    if (statusFilter === 'submitted') return c.status === 'submitted';
    return true; // 'all'
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

  if (roomIdParam && !activeRoomSession) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-white/10 dark:bg-neutral-900">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-slate-500" />
        <h1 className="text-sm font-bold text-slate-900 dark:text-white">
          {selectedRoomNotice || 'Đang xác minh trạng thái phòng...'}
        </h1>
        <button
          type="button"
          onClick={() => router.replace('/instructor/monitoring')}
          className="system-primary-action mt-4 inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-xs font-bold text-white"
        >
          Về danh sách phiên đang diễn ra
        </button>
      </div>
    );
  }

  // Nếu chưa chọn lớp/phòng nào: Hiển thị danh sách các lớp đang hoạt động để Giảng viên chọn giám sát
  if (!roomIdParam && !activeRoomSession) {
    return (
      <div className="space-y-6">
        <div className="rounded-md border border-slate-300 bg-white p-6 shadow-xs sm:p-7 dark:border-white/10 dark:bg-neutral-900">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
              Module Giám Sát Trực Tiếp
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Danh Sách Các Lớp Đang Hoạt Động
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Một giảng viên có thể phụ trách nhiều lớp. Hãy chọn một lớp đang mở phòng bên dưới để vào giám sát trực tiếp.
            </p>
          </div>
        </div>

        {isLoadingRooms ? (
          <div className="rounded-md border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-neutral-900">
            Đang tải danh sách các lớp đang hoạt động...
          </div>
        ) : activeRooms.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-neutral-900">
            <Users className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Hiện tại không có lớp học phần nào đang mở phòng trực tiếp.</p>
            <p className="text-slate-400 mt-1">Vui lòng vào Lịch Thi hoặc Quản Lý Lớp để bắt đầu mở phòng thi / thực hành.</p>
            <Link
              href="/instructor/schedules"
              className="system-primary-action mt-4 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs"
            >
              Xem Lịch Đào Tạo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRooms.map((r) => (
              <div
                key={r.room_id || r.room_code}
                className="rounded-md border border-slate-300 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-neutral-900 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase font-bold text-slate-500">
                      Mã: {r.room_code}
                    </span>
                    <span className="rounded-md bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono">
                      {r.room_type === 'exam' ? 'Phòng Thi' : 'Phòng Thực Hành'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                    {r.room_name || r.room_code}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Lớp: <strong className="text-slate-700 dark:text-slate-200">{r.class_name || r.class_code || 'Lớp học phần'}</strong>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Thời lượng: <strong className="text-slate-700 dark:text-slate-300">{r.duration_minutes || 60}p</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push(`/instructor/monitoring?room=${encodeURIComponent(r.room_code)}`)}
                    className="system-primary-action inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
                  >
                    <span>Vào giám sát</span>
                    <ArrowLeft className="h-3 w-3 rotate-180" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── BANNER THÔNG BÁO QUY TRÌNH & TRẠNG THÁI PHÒNG ── */}
      {activeRoomSession && activeRoomSession.status === 'waiting' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-slate-300 bg-slate-50 p-4 text-xs dark:bg-white/5 dark:border-white/10">
          <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200 font-medium">
            <AlertTriangle className="h-5 w-5 text-slate-600 dark:text-slate-400 shrink-0" />
            <div>
              <p className="font-serif font-bold text-slate-900 dark:text-white">
                Phòng {activeRoomSession.id} đang ở trạng thái PHÒNG CHỜ (Điểm Danh)
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                Lưu ý: Quá trình giám sát trực tiếp qua camera &amp; code chỉ chính thức bắt đầu sau khi bạn bấm <strong>[Bắt Đầu Làm Bài]</strong> tại màn hình Phòng Chờ.
              </p>
            </div>
          </div>
          <Link
            href={`/instructor/room/${activeRoomSession.id}`}
            className="system-primary-action inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 transition shrink-0 cursor-pointer shadow-xs"
          >
            <span>Vào Phòng Chờ Điểm Danh</span>
          </Link>
        </div>
      )}

      {activeRoomSession && activeRoomSession.status === 'in_progress' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-slate-400" />
            <div>
              <p className="font-serif font-bold text-slate-900 dark:text-white">
                ĐANG GIÁM SÁT TRỰC TIẾP: Phòng {activeRoomSession.id} ({activeRoomSession.title})
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Mật khẩu PIN: <strong className="font-mono text-slate-900 dark:text-white">{activeRoomSession.password}</strong> • Bộ đề thi: <strong>{activeRoomSession.templateTitle}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <span className="rounded bg-white dark:bg-neutral-900 border border-slate-300 dark:border-white/10 px-2 py-0.5">
              {activeRoomSession.proctoringConfig.lockdownFullscreen ? 'Khóa Fullscreen' : 'Cho phép rời tab'}
            </span>
            <span className="rounded bg-white dark:bg-neutral-900 border border-slate-300 dark:border-white/10 px-2 py-0.5">
              {activeRoomSession.proctoringConfig.aiFaceDetection ? 'AI Giám sát: Bật' : 'AI Giám sát: Tắt'}
            </span>
          </div>
        </div>
      )}

      {/* ── 1. HEADER BAR CHỈ HUY PHÒNG THI & CHUYỂN ĐỔI CHẾ ĐỘ LAB / KIỂM TRA ── */}
      <div className="flex flex-col gap-4 rounded-md border border-slate-300 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-slate-100 dark:bg-white/10 px-2 py-0.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/20">
                {session.classCode}
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs font-medium text-slate-500">{session.className}</span>

              {/* Tag phân biệt chế độ EXAM vs LAB */}
              {session.type === 'EXAM' ? (
                <span className="inline-flex items-center gap-1.5 rounded bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 font-serif text-[11px] font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-white/20">
                  <ShieldAlert className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                  Buổi Kiểm Tra • Bắt buộc AI &amp; Camera
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 font-serif text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10">
                  <Monitor className="h-3 w-3 text-slate-500" />
                  Thực Hành Lab • Không dùng AI • Camera:{' '}
                  {session.requireCamera ? 'Bật (Theo GV)' : 'Tắt (Tùy chọn)'}
                </span>
              )}
            </div>

            <h1 className="mt-1 text-lg sm:text-xl font-serif font-bold tracking-tight text-slate-900 dark:text-white">
              {session.title}
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-4 font-mono text-xs text-slate-500">
              <span>
                Mã phòng: <strong className="font-bold text-slate-900 dark:text-white">{session.roomCode}</strong>
              </span>
              <span>
                Sĩ số: <strong className="text-slate-900 dark:text-white font-bold">{session.attendedStudents}/{session.totalStudents} SV</strong>
              </span>
            </div>
          </div>

          {/* Công cụ điều khiển phòng thi */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Lớp Switcher: Cho phép Giảng viên chuyển đổi nhanh giữa các lớp đang hoạt động */}
            {activeRooms.length > 1 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsClassSwitcherOpen((prev) => !prev)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-stone-200 transition cursor-pointer shadow-2xs"
                  title="Chuyển sang giám sát lớp khác đang hoạt động"
                >
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  <span>Đổi lớp ({activeRooms.length})</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>
                {isClassSwitcherOpen && (
                  <div className="absolute right-0 top-10 z-50 w-72 rounded-md border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-neutral-900">
                    <p className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase">Các lớp đang hoạt động</p>
                    <div className="mt-1 space-y-1">
                      {activeRooms.map((r) => (
                        <button
                          key={r.room_id || r.room_code}
                          type="button"
                          onClick={() => {
                            setIsClassSwitcherOpen(false);
                            router.push(`/instructor/monitoring?room=${encodeURIComponent(r.room_code)}`);
                          }}
                          className={`w-full text-left rounded-md px-2.5 py-1.5 text-xs transition flex items-center justify-between ${
                            r.room_code === roomIdParam
                              ? 'bg-slate-100 dark:bg-white/10 font-bold text-slate-900 dark:text-white'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="truncate">
                            <p className="font-semibold truncate">{r.room_name || r.room_code}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{r.class_name || r.room_code}</p>
                          </div>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10">
                            {r.room_type === 'exam' ? 'Thi' : 'Lab'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quy tắc kết thúc sớm: Phòng thực hành có thể kết thúc sớm; Phòng thi thì không */}
            {session.type === 'LAB' ? (
              <button
                type="button"
                onClick={() => setIsEndLabModalOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-stone-200 transition cursor-pointer shadow-2xs"
                title="Giảng viên kết thúc sớm ca thực hành cho sinh viên"
              >
                <LogOut className="h-3.5 w-3.5 text-slate-500" />
                <span>Kết thúc sớm</span>
              </button>
            ) : (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                <span>Quy chế: Phòng thi tự động kết thúc khi hết giờ</span>
              </span>
            )}

            {/* Nếu là buổi Lab: Toggle cho phép GV tùy chỉnh bật/tắt camera */}
            {session.type === 'LAB' && (
              <label className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#2A282D] dark:border-white/10 dark:bg-neutral-900 dark:text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={session.requireCamera}
                  onChange={(e) => handleToggleRequireCamera(e.target.checked)}
                  className="rounded accent-slate-900 dark:accent-white h-3.5 w-3.5"
                />
                <span>Yêu cầu Webcam</span>
              </label>
            )}

            {/* Đồng hồ đếm ngược */}
            <div className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 font-mono text-xs font-bold text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{session.remainingMinutes}p</span>
            </div>

            {/* Nút Gia hạn phòng tùy chỉnh: CẤM gia hạn đối với các kỳ thi theo quy chế */}
            {session.type === 'EXAM' ? (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 text-[11px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400" title="Quy chế khảo thí: Kỳ thi không cho phép gia hạn thêm thời gian">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Thời gian cố định
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setIsExtendModalOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-[#2A282D] hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-stone-200 transition cursor-pointer shadow-2xs"
              >
                <Clock className="h-3.5 w-3.5" />
                Gia hạn...
              </button>
            )}

            {/* Nút Phát thông báo */}
            <button
              type="button"
              onClick={() => {
                setTargetedStudent(null);
                setIsSendNoticeModalOpen(true);
              }}
              className="system-primary-action inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              Gửi thông báo
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. KHU VỰC CHÍNH: LƯỚI SINH VIÊN (PANOPTIC GRID) + SIDEBAR THÔNG BÁO SIÊU GỌN ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        {/* CỘT TRÁI (3 Cột): Bộ lọc và Lưới theo dõi */}
        <div className="lg:col-span-3 space-y-4">
          {/* Bộ lọc và tìm kiếm */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-slate-300 bg-white p-3 dark:border-white/10 dark:bg-neutral-900">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'active', label: `Đang làm bài (${activeCount})` },
                { id: 'warning', label: `Cảnh báo AI (${warningCount})` },
                { id: 'submitted', label: `Đã nộp bài (${submittedCount})` },
                { id: 'all', label: `Tất cả danh sách (${camerasSource.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`rounded px-3 py-1.5 font-sans text-xs font-bold transition cursor-pointer ${
                    statusFilter === tab.id
                      ? 'system-selected-module shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-stone-300 dark:hover:bg-white/5'
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
                className="h-9 w-full sm:w-56 rounded-md border border-slate-300 bg-slate-50 pl-10 pr-3.5 text-xs outline-none transition-colors focus:border-slate-600 focus:bg-white dark:border-white/10 dark:bg-neutral-950 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Lưới Camera / Màn hình Sinh viên */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCameras.map((student) => {
              const hasAlert = student.status === 'warning' || student.status === 'critical';
              const isSubmitted = student.status === 'submitted';
              const pKey = (student as any).userId ? `user_${(student as any).userId}` : '';
              const altKey = student.id ? `user_${student.id}` : '';
              const directKey = (student as any).userId ? String((student as any).userId) : '';
              const studentIdKey = student.id ? String(student.id) : '';

              const pTracks =
                (pKey && participantTracks[pKey]) ||
                (altKey && participantTracks[altKey]) ||
                (directKey && participantTracks[directKey]) ||
                (studentIdKey && participantTracks[studentIdKey]) ||
                (Object.keys(participantTracks).length === 1 && filteredCameras.length === 1
                  ? Object.values(participantTracks)[0]
                  : undefined);

              const camTrack =
                pTracks?.camera ||
                (pKey ? remoteTracks[pKey] : undefined) ||
                (altKey ? remoteTracks[altKey] : undefined) ||
                (directKey ? remoteTracks[directKey] : undefined) ||
                (studentIdKey ? remoteTracks[studentIdKey] : undefined) ||
                (Object.keys(remoteTracks).length === 1 && filteredCameras.length === 1
                  ? Object.values(remoteTracks)[0]
                  : undefined);

              const screenTrack = pTracks?.screen;
              const isLabRoom = session.type === 'LAB' || activeRoomSession?.type === 'lab';
              const isCamAllowedOff = isLabRoom && (activeRoomSession?.proctoringConfig as any)?.requireCamera === false;

              return (
                <div
                  key={student.id}
                  className={`rounded-md border bg-white p-3.5 dark:bg-neutral-900 shadow-2xs transition-colors relative ${
                    student.status === 'critical'
                      ? 'border-slate-500 bg-slate-50 dark:border-white/30 dark:bg-white/[0.04]'
                      : 'border-slate-300 dark:border-white/10'
                  }`}
                >
                  {/* Khung stream: BẤM VÀO ĐỂ PHÓNG TO CHI TIẾT (MÀN HÌNH + WEBCAM) */}
                  <div
                    onClick={() => setFocusedStudent(student)}
                    className="aspect-video w-full rounded bg-stone-950 flex items-center justify-center relative overflow-hidden group cursor-pointer"
                    title="Nhấp để phóng to màn hình và webcam của sinh viên này"
                  >
                    {/* Hiển thị Màn hình và/hoặc Webcam trực tiếp từ LiveKit */}
                    {screenTrack ? (
                      /* Trường hợp có luồng Màn hình: chiếu Màn hình chính + Webcam góc PiP */
                      <div className="relative h-full w-full">
                        <LiveKitVideoFeed
                          track={screenTrack}
                          muted
                          className="h-full w-full object-contain bg-black"
                        />
                        {camTrack && (
                          <div className="absolute bottom-2 right-2 w-28 aspect-video rounded border border-white/40 shadow-lg overflow-hidden bg-black z-10">
                            <LiveKitVideoFeed
                              track={camTrack}
                              muted
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute top-0.5 left-1 text-[7px] font-mono bg-black/70 px-1 rounded text-white">
                              CAM
                            </span>
                          </div>
                        )}
                      </div>
                    ) : camTrack ? (
                      /* Trường hợp có Webcam: chiếu Webcam full khung hình */
                      <LiveKitVideoFeed
                        track={camTrack}
                        muted
                        className="h-full w-full object-cover"
                      />
                    ) : isSubmitted ? (
                      /* Trường hợp sinh viên đã nộp bài */
                      <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-bold text-white font-serif">Đã nộp bài thành công</span>
                        <span className="text-[10px] font-mono text-slate-400">Sinh viên đã hoàn thành ca thi</span>
                      </div>
                    ) : (
                      /* Chưa có luồng video: hiển thị thông báo trạng thái kết nối rõ ràng */
                      <div className="flex flex-col items-center justify-center gap-2 p-4 text-center text-slate-400">
                        {isCamAllowedOff ? (
                          <>
                            <CameraOff className="h-8 w-8 text-slate-500" />
                            <span className="text-[11px] font-mono text-slate-400">
                              Camera tắt (Theo cấu hình phòng Lab)
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Đang chờ luồng chia sẻ màn hình...
                            </span>
                          </>
                        ) : (
                          <>
                            <Video className="h-8 w-8 text-slate-600 animate-pulse" />
                            <span className="text-[11px] font-mono text-slate-400">
                              {student.statusText.includes('Live')
                                ? 'Đang chờ tín hiệu Camera / Màn hình...'
                                : 'Sinh viên chưa vào phòng'}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Giả lập khung nhận diện khuôn mặt */}
                    {session.isAiActive && camTrack && !isSubmitted && (
                      <div
                        className={`absolute inset-4 rounded-md border pointer-events-none ${
                          hasAlert ? 'border-slate-300 bg-slate-900/10' : 'border-slate-500/40'
                        }`}
                      >
                        <span
                          className={`absolute -top-2.5 left-2 rounded px-1.5 py-0.5 text-[8px] font-mono font-bold text-white uppercase ${
                            hasAlert ? 'bg-slate-800' : 'bg-slate-700'
                          }`}
                        >
                          {hasAlert ? 'AI Alert' : 'Face Track'}
                        </span>
                      </div>
                    )}

                    {/* Tag FPS / LiveKit góc trên trái */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded bg-black/80 px-2 py-0.5 text-[9px] text-white font-mono z-10">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSubmitted
                            ? 'bg-emerald-400'
                            : hasAlert
                            ? 'bg-rose-500'
                            : (camTrack || screenTrack)
                            ? 'bg-emerald-400'
                            : 'bg-stone-500'
                        }`}
                      />
                      <span>
                        {isSubmitted
                          ? 'ĐÃ NỘP BÀI (HOÀN THÀNH)'
                          : screenTrack && camTrack
                          ? 'LIVE • Màn hình + Cam'
                          : screenTrack
                          ? 'LIVE • Màn hình'
                          : camTrack
                          ? 'LIVE • Camera'
                          : `${student.fps} FPS`}
                      </span>
                    </div>

                    {/* Lớp phủ Hover: Bấm để phóng to */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-brand text-white px-3 py-1.5 text-xs font-bold shadow-md">
                        <Maximize2 className="h-3.5 w-3.5" />
                        Phóng to chi tiết
                      </span>
                    </div>

                    {/* Tag góc dưới: Tên & MSSV */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded bg-black/85 px-2 py-1 text-white z-10">
                      <span className="text-[11px] font-medium truncate font-sans">
                        {student.id} • {student.name}
                      </span>
                      {hasAlert && (
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white shrink-0">
                          {student.violationsCount} vi phạm
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Trạng thái & Tác vụ nhanh */}
                  <div className="mt-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-400 dark:text-stone-500 text-[10px]">Tiến độ / Trạng thái:</span>
                      <div className="flex items-center gap-1.5 truncate max-w-[190px]">
                        {(student.isLate || student.statusText.includes('muộn')) && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-950/50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                            Muộn
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold truncate font-mono ${
                            student.statusText.includes('muộn')
                              ? 'text-amber-700 dark:text-amber-400 font-bold'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {student.statusText}
                        </span>
                      </div>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-300 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setFocusedStudent(student)}
                        className="inline-flex items-center gap-1 rounded-md bg-stone-100 dark:bg-stone-800 px-2 py-1 text-[11px] font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
                        title="Phóng to màn hình và webcam"
                      >
                        <Maximize2 className="h-3 w-3" />
                        Phóng to
                      </button>

                      {realRoomId && student.userId && (
                        <button
                          type="button"
                          onClick={() => handleUnlockStudent(student)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 transition cursor-pointer"
                          title="Mở khóa bài thi từ xa cho sinh viên"
                        >
                          <Unlock className="h-3 w-3" />
                          Mở khóa
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenIndividualNotice(student.id, student.name)}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/10 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition cursor-pointer"
                        title="Nhắn tin riêng cho SV này"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Nhắn riêng
                      </button>

                      {hasAlert ? (
                        <button
                          type="button"
                          onClick={() => reviewViolation(student.id, 'record')}
                          className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 hover:bg-slate-200 transition cursor-pointer"
                        >
                          Biên bản
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-500 dark:text-stone-400">
                          <ShieldCheck className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                          Hợp lệ
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredCameras.length === 0 && (
              <div className="col-span-full rounded-md border border-dashed border-slate-300 dark:border-white/10 p-10 text-center bg-white dark:bg-neutral-900 shadow-2xs">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  {statusFilter === 'active' && submittedCount > 0
                    ? 'Tất cả sinh viên đã hoàn thành và nộp bài'
                    : 'Không tìm thấy sinh viên nào trong mục này'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {statusFilter === 'active' && submittedCount > 0
                    ? 'Toàn bộ sinh viên đã nộp bài thi thành công và rời phòng. Bấm vào tab "Đã nộp bài" để xem chi tiết.'
                    : 'Không có dữ liệu sinh viên nào khớp với bộ lọc hoặc từ khóa tìm kiếm.'}
                </p>
                {statusFilter === 'active' && submittedCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('submitted')}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-3.5 py-1.5 text-xs font-bold transition hover:opacity-90 cursor-pointer"
                  >
                    Xem danh sách đã nộp ({submittedCount})
                  </button>
                ) : statusFilter !== 'active' ? (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-3.5 py-1.5 text-xs font-bold transition hover:opacity-90 cursor-pointer"
                  >
                    Về danh sách đang làm bài ({activeCount})
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* ── CỘT PHẢI (1 Cột): SIDEBAR THÔNG BÁO SIÊU GỌN THEO YÊU CẦU ── */}
        <div className="rounded-md border border-slate-300 bg-white p-3.5 dark:border-white/10 dark:bg-neutral-900 shadow-2xs space-y-3">
          {/* Header tabs nhỏ gọn - Giao diện trung tính mặc định, không icon dư thừa */}
          <div className="flex items-center gap-1 border-b border-slate-300 dark:border-white/10 pb-2">
            <button
              type="button"
              onClick={() => setActiveSideTab('violations')}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSideTab === 'violations'
                  ? 'system-selected-module shadow-2xs'
                  : 'bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10'
              }`}
            >
              <span>{session.type === 'EXAM' ? 'Vi phạm AI' : 'Cảnh báo'}</span>
              <span className={`rounded px-1.5 text-[9px] font-mono font-bold ${
                activeSideTab === 'violations'
                  ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300'
              }`}>
                {violations.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSideTab('announcements')}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSideTab === 'announcements'
                  ? 'system-selected-module shadow-2xs'
                  : 'bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10'
              }`}
            >
              <span>Đã gửi</span>
              <span className={`rounded px-1.5 text-[9px] font-mono font-bold ${
                activeSideTab === 'announcements'
                  ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300'
              }`}>
                {announcements.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSideTab('chat')}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSideTab === 'chat'
                  ? 'system-selected-module shadow-2xs'
                  : 'bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10'
              }`}
            >
              <span>Chat phòng</span>
            </button>
          </div>

          {/* Tab 1: Cảnh báo vi phạm */}
          {activeSideTab === 'violations' && (
            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-0.5">
              {unlockNotice && (
                <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-[11px] font-serif font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {unlockNotice}
                </div>
              )}
              {displayViolations.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-500 dark:text-stone-400">
                  <ShieldCheck className="mx-auto h-6 w-6 text-slate-500 dark:text-slate-400" />
                  <p className="mt-1 font-serif font-bold text-stone-700 dark:text-stone-300 text-xs">Không có vi phạm</p>
                </div>
              ) : (
                displayViolations.map((vio) => {
                  const matchedStudent = camerasSource.find((c) => c.id === vio.studentId || String(c.userId) === vio.studentId);
                  const isRecorded = vio.status === 'recorded';
                  const isDismissed = vio.status === 'dismissed';

                  return (
                    <div
                      key={vio.id}
                      className={`group rounded-md border p-2 transition text-xs space-y-1.5 ${
                        isRecorded || isDismissed
                          ? 'border-slate-300 dark:border-white/10 bg-stone-50 dark:bg-stone-900/40 opacity-60'
                          : vio.severity === 'critical'
                          ? 'border-slate-400 bg-slate-50 dark:border-white/20 dark:bg-white/10'
                          : 'border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5'
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
                                ? 'bg-stone-400'
                                : vio.severity === 'critical'
                                ? 'bg-slate-800 dark:bg-white'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span className="font-serif font-bold text-stone-900 dark:text-stone-100 truncate text-[11.5px]">
                            {vio.studentName}
                          </span>
                          <span className="font-mono text-stone-500 dark:text-stone-400 font-medium text-[10px] shrink-0">
                            ({vio.studentId})
                          </span>
                        </div>
                        <span className="font-mono text-[9.5px] text-stone-500 dark:text-stone-400 font-bold shrink-0">
                          {vio.timestamp}
                        </span>
                      </div>

                      {/* Dòng 2: Loại lỗi vi phạm */}
                      <div
                        onClick={() => matchedStudent && setFocusedStudent(matchedStudent)}
                        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium cursor-pointer truncate ${
                          vio.severity === 'critical'
                            ? 'bg-slate-200 text-slate-900 font-bold dark:bg-white/20 dark:text-white'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                        }`}
                        title={`${vio.type}: ${vio.description}`}
                      >
                        <AlertTriangle className="h-3 w-3 shrink-0 text-slate-500" />
                        <span className="truncate">{vio.type}</span>
                      </div>

                      {/* Dòng 3: Nút bấm mini gọn gàng */}
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-300 dark:border-white/10">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => matchedStudent && setFocusedStudent(matchedStudent)}
                            className="text-[10px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-0.5 cursor-pointer"
                            title="Phóng to màn hình & webcam SV"
                          >
                            <Eye className="h-2.5 w-2.5 text-slate-600 dark:text-slate-300" />
                            <span>Xem</span>
                          </button>

                          {vio.snapshotUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewEvidenceViolation(vio)}
                              className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-500/20"
                              title="Xem ảnh bằng chứng snapshot vi phạm"
                            >
                              <Video className="h-2.5 w-2.5 text-rose-600 dark:text-rose-400" />
                              <span>Bằng chứng</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenIndividualNotice(vio.studentId, vio.studentName)}
                            className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer inline-flex items-center gap-0.5"
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
                                className="system-primary-action rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-slate-800 cursor-pointer"
                                title="Lập biên bản vi phạm"
                              >
                                Lập BB
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewViolation(vio.id, 'dismiss')}
                                className="rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                                title="Bỏ qua cảnh báo"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-mono font-medium text-stone-500">
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
                <div className="p-4 text-center text-xs text-stone-400">
                  <Send className="mx-auto h-6 w-6 text-stone-300 dark:text-stone-600" />
                  <p className="mt-1 font-serif font-bold text-stone-600 dark:text-stone-300 text-xs">Chưa có thông báo</p>
                </div>
              ) : (
                announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="rounded-md border border-slate-300 dark:border-white/10 bg-stone-50 dark:bg-stone-900/40 p-2 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="rounded bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-slate-800 dark:text-slate-200 truncate border border-slate-300 dark:border-white/20">
                        {ann.targetLabel}
                      </span>
                      <span className="font-mono text-[9px] text-stone-400 shrink-0">
                        {ann.timestamp}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-stone-700 dark:text-stone-300 leading-snug font-medium line-clamp-2">
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
        videoTrack={(() => {
          if (!focusedStudent) return undefined;
          const k1 = focusedStudent.userId ? `user_${focusedStudent.userId}` : '';
          const k2 = focusedStudent.id ? `user_${focusedStudent.id}` : '';
          const k3 = focusedStudent.userId ? String(focusedStudent.userId) : '';
          const k4 = focusedStudent.id ? String(focusedStudent.id) : '';
          return (
            (k1 && participantTracks[k1]?.camera) ||
            (k2 && participantTracks[k2]?.camera) ||
            (k3 && participantTracks[k3]?.camera) ||
            (k4 && participantTracks[k4]?.camera) ||
            (k1 && remoteTracks[k1]) ||
            (k2 && remoteTracks[k2]) ||
            (k3 && remoteTracks[k3]) ||
            (k4 && remoteTracks[k4]) ||
            (Object.keys(participantTracks).length === 1 ? Object.values(participantTracks)[0]?.camera : undefined) ||
            (Object.keys(remoteTracks).length === 1 ? Object.values(remoteTracks)[0] : undefined)
          );
        })()}
        screenTrack={(() => {
          if (!focusedStudent) return undefined;
          const k1 = focusedStudent.userId ? `user_${focusedStudent.userId}` : '';
          const k2 = focusedStudent.id ? `user_${focusedStudent.id}` : '';
          const k3 = focusedStudent.userId ? String(focusedStudent.userId) : '';
          const k4 = focusedStudent.id ? String(focusedStudent.id) : '';
          return (
            (k1 && participantTracks[k1]?.screen) ||
            (k2 && participantTracks[k2]?.screen) ||
            (k3 && participantTracks[k3]?.screen) ||
            (k4 && participantTracks[k4]?.screen) ||
            (Object.keys(participantTracks).length === 1 ? Object.values(participantTracks)[0]?.screen : undefined)
          );
        })()}
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
        studentsList={
          realStudents
            ? realStudents.map((s) => ({ id: s.id, name: s.name }))
            : []
        }
        defaultTarget={
          targetedStudent
            ? {
                type: 'individual',
                studentId: targetedStudent.id,
                studentName: targetedStudent.name,
              }
            : undefined
        }
        onSend={handleSendNotice}
      />

      {/* ── MODAL DIALOG: XÁC NHẬN KẾT THÚC SỚM CA THỰC HÀNH ── */}
      {isEndLabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-md border border-slate-300 bg-white p-6 shadow-2xl space-y-4 dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Xác Nhận Kết Thúc Sớm Ca Thực Hành?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Bạn có chắc chắn muốn kết thúc ca thực hành <strong className="font-mono text-slate-900 dark:text-white">{activeRoomSession?.id || roomIdParam}</strong> ngay bây giờ không?
                </p>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
              <p>• Phiên giám sát trực tiếp sẽ đóng lại.</p>
              <p>• Sinh viên trong phòng sẽ nhận thông báo giải tán phòng.</p>
              <p>• Lớp học phần sẽ được giải phóng để bạn có thể tạo ca học mới.</p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                disabled={isEndingLab}
                onClick={() => setIsEndLabModalOpen(false)}
                className="h-9 rounded-md border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer dark:border-white/10 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-white/10 disabled:opacity-50"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isEndingLab}
                onClick={handleConfirmEndLab}
                className="system-primary-action h-9 inline-flex items-center gap-2 rounded-md bg-rose-700 hover:bg-rose-800 px-4 text-xs font-bold text-white shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                {isEndingLab ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Đang kết thúc...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Xác Nhận Kết Thúc</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DUYỆT BẰNG CHỨNG VI PHẠM CỦA SINH VIÊN */}
      {previewEvidenceViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-md border border-slate-300 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="font-serif text-base font-bold text-slate-900 dark:text-white">
                  Thẩm định bằng chứng vi phạm
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEvidenceViolation(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-md bg-slate-50 dark:bg-neutral-950 p-3.5 border border-slate-300 dark:border-white/10 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Sinh viên:</span>
                <span className="font-bold text-slate-900 dark:text-white">{previewEvidenceViolation.studentName} ({previewEvidenceViolation.studentId})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hành vi vi phạm:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{previewEvidenceViolation.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thời điểm ghi nhận:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{previewEvidenceViolation.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mô tả chi tiết:</span>
                <span className="text-slate-700 dark:text-slate-300">{previewEvidenceViolation.description}</span>
              </div>
            </div>

            {/* Khung ảnh bằng chứng snapshot */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Ảnh chụp thực tế từ Webcam (AI Snapshot):</span>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">Đã đối chiếu sinh trắc học</span>
              </p>
              <div className="relative aspect-video w-full overflow-hidden rounded-md border border-slate-300 bg-black flex items-center justify-center">
                {previewEvidenceViolation.snapshotUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewEvidenceViolation.snapshotUrl}
                    alt="Bằng chứng vi phạm"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="text-center p-6 text-slate-400 text-xs">
                    Không có ảnh chụp webcam tại thời điểm phát sinh sự kiện.
                  </div>
                )}
              </div>
            </div>

            {/* Các nút hành động duyệt */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-300 dark:border-white/10">
              <button
                type="button"
                onClick={() => setPreviewEvidenceViolation(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 cursor-pointer"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleReviewViolation(previewEvidenceViolation.id, 'dismiss');
                    setPreviewEvidenceViolation(null);
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-700 cursor-pointer"
                >
                  Bỏ qua vi phạm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleReviewViolation(previewEvidenceViolation.id, 'record');
                    setPreviewEvidenceViolation(null);
                  }}
                  className="system-primary-action rounded-md bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-sm cursor-pointer"
                >
                  Xác nhận Lập biên bản
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
