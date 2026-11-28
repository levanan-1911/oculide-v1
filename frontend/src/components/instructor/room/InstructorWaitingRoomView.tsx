'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Radio,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Users,
  Search,
  Video,
  Play,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Camera,
  DoorOpen,
  Trash2,
  X,
  FileSpreadsheet,
  AlertCircle,
  LogOut,
  Send,
  FileCode2,
  BookOpen,
  Plus,
  Sparkles,
} from 'lucide-react';
import {
  RoomSession,
  RoomAttendee,
} from '@/components/instructor/classes/types';
import { fetchWithAuth } from '@/services/apiClient';
import SendNotificationModal from '@/components/instructor/monitoring/SendNotificationModal';
import AssignTemplateModal from './AssignTemplateModal';

interface Props {
  roomId: string;
  returnToSchedules?: boolean;
}

export default function InstructorWaitingRoomView({
  roomId,
  returnToSchedules = false,
}: Props) {
  const router = useRouter();
  const returnPath = returnToSchedules
    ? '/instructor/schedules'
    : '/instructor/classes';

  const [rawRoomId, setRawRoomId] = useState<number | null>(null);
  const [room, setRoom] = useState<RoomSession | null>(null);
  const [attendees, setAttendees] = useState<RoomAttendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lobbyLoadError, setLobbyLoadError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'waiting' | 'absent'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const startRoomHandlerRef = useRef<() => Promise<void>>(async () => {});

  // Modal states
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [conflictSession, setConflictSession] = useState<RoomSession | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isAssignTemplateModalOpen, setIsAssignTemplateModalOpen] = useState(false);
  const [roomStartTime, setRoomStartTime] = useState<string | null>(null);
  const [numericRoomId, setNumericRoomId] = useState<number | null>(null);
  const [activeListTab, setActiveListTab] = useState<'attendance' | 'scoreboard'>('attendance');
  const [scoreboard, setScoreboard] = useState<Array<{
    student_id: number;
    student_name: string;
    student_code?: string;
    total_score: number;
    max_room_points?: number;
    score_scale_10?: number;
    solved_questions: number;
    total_submissions: number;
    last_submission_time?: string | null;
  }>>([]);
  const [scoreboardLoading, setScoreboardLoading] = useState(false);
  const [noticeTarget, setNoticeTarget] = useState<{
    type: 'all' | 'group' | 'individual';
    studentId?: string;
    studentName?: string;
  } | undefined>(undefined);

  const handleOpenNotice = (target?: { type: 'all' | 'group' | 'individual'; studentId?: string; studentName?: string }) => {
    setNoticeTarget(target || { type: 'all' });
    setIsNoticeModalOpen(true);
  };

  const handleAssignTemplateSuccess = (newTemplate: {
    id: string;
    code?: string;
    title: string;
    language?: string;
    durationMinutes?: number;
  }) => {
    if (!room) return;
    const updatedRoom: RoomSession = {
      ...room,
      templateId: newTemplate.id || undefined,
      templateTitle: newTemplate.title,
      templateLanguage: newTemplate.language || room.templateLanguage,
      durationMinutes: newTemplate.durationMinutes || room.durationMinutes,
    };
    setRoom(updatedRoom);

    showToast(`Đã gán thành công bộ đề: ${newTemplate.title}`);
  };

  // Nạp dữ liệu phòng chờ và danh sách sinh viên thực tế từ Backend CSDL SQL Server
  useEffect(() => {
    let isCancelled = false;
    let requestInFlight = false;

    async function loadLobbyData(silent = false) {
      if (requestInFlight) return;
      requestInFlight = true;
      if (!silent) setIsLoading(true);
      try {
        const data = await fetchWithAuth<any>(`/api/v1/rooms/lobby/${encodeURIComponent(roomId)}`);
        if (isCancelled || !data) return;
        if (data.room_id) {
          setNumericRoomId(Number(data.room_id));
        }

        setLobbyLoadError(null);
        setRawRoomId(data.room_id);
        if (data.start_time) {
          setRoomStartTime(data.start_time);
        }
        // Khi giảng viên mở phòng chờ, tự động chuyển từ scheduled/chua_mo -> waiting để SV được phép vào
        const rawLobbyStatus = String(data.status || '').toLowerCase();
        if (!silent && data.room_id && (rawLobbyStatus === 'scheduled' || rawLobbyStatus === 'chua_mo')) {
          fetchWithAuth(`/api/v1/rooms/${data.room_id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'waiting' }),
          }).catch(() => null);
        }

        let parsedConfig = {
          lockdownFullscreen: false,
          aiFaceDetection: false,
          aiObjectDetection: false,
          allowTabSwitch: true,
        };
        if (data.proctoring_config) {
          try {
            parsedConfig = typeof data.proctoring_config === 'string'
              ? JSON.parse(data.proctoring_config)
              : data.proctoring_config;
          } catch { }
        }

        const realAttendees: RoomAttendee[] = (data.attendees || []).map((a: any) => ({
          studentId: String(a.student_id),
          studentName: a.student_name,
          studentEmail: a.student_email || '',
          status: a.status === 'late' ? 'late' : (a.status === 'waiting' || a.status === 'completed') ? 'waiting' : 'absent',
          joinedAt: a.joined_at ? new Date(a.joined_at).toLocaleTimeString('vi-VN') : undefined,
          cameraReady: Boolean(a.camera_ready),
        }));

        const sessionType = String(data.session_type || '').toUpperCase();
        const roomSessionType: RoomSession['type'] =
          sessionType === 'MIDTERM'
            ? 'midterm'
            : sessionType === 'FINAL'
              ? 'final'
              : sessionType === 'LAB' || data.room_type !== 'exam'
                ? 'lab'
                : 'exam';

        const realRoom: RoomSession = {
          id: data.room_code,
          classId: data.class_code || (data.class_id ? String(data.class_id) : 'LỚP HỌC PHẦN'),
          className: data.class_name || data.course_name || 'Lớp học phần',
          password: data.passcode || '',
          type: roomSessionType,
          title: data.room_name || `Phòng Chờ • ${data.room_code}`,
          templateId: data.template_code || (data.template_id ? String(data.template_id) : undefined),
          templateTitle: data.template_title || (data.template_id ? `Bộ đề #${data.template_id}` : 'Chưa gán đề (Tự do)'),
          templateLanguage: data.template_language || 'C/C++/Java/Python',
          durationMinutes: data.duration_minutes || 60,
          endTime: data.end_time || undefined,
          status: ['da_dong', 'da_huy', 'da_ket_thuc', 'completed', 'ended', 'closed', 'cancelled'].includes(
            String(data.status || '').toLowerCase()
          )
            ? 'ended'
            : ['dang_dien_ra', 'in_progress'].includes(String(data.status || '').toLowerCase())
              ? 'in_progress'
              : 'waiting',
          createdAt: data.created_at ? new Date(data.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '08:00',
          proctoringConfig: parsedConfig,
          attendees: realAttendees,
        };

        setRoom(realRoom);
        setAttendees(realAttendees);
      } catch (err) {
        if (!isCancelled) {
          setLobbyLoadError(
            err instanceof Error ? err.message : 'Không thể tải dữ liệu phòng chờ từ máy chủ.'
          );
        }
      } finally {
        requestInFlight = false;
        if (!isCancelled && !silent) setIsLoading(false);
      }
    }

    loadLobbyData();
    // Đồng bộ trạng thái điểm danh từ máy chủ mỗi 3 giây.
    const pollInterval = setInterval(() => loadLobbyData(true), 3000);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
    };
  }, [roomId]);

  // Nạp bảng điểm sinh viên trong phòng từ Backend
  useEffect(() => {
    if (!numericRoomId) return;
    let isCancelled = false;

    async function loadScoreboard(silent = false) {
      if (!silent) setScoreboardLoading(true);
      try {
        const rows = await fetchWithAuth<any[]>(`/api/v1/rooms/${numericRoomId}/scoreboard`);
        if (!isCancelled && Array.isArray(rows)) {
          setScoreboard(rows);
        }
      } catch {
        // Bỏ qua lỗi polling ngầm
      } finally {
        if (!isCancelled && !silent) setScoreboardLoading(false);
      }
    }

    loadScoreboard(activeListTab !== 'scoreboard');
    if (activeListTab !== 'scoreboard') {
      return () => {
        isCancelled = true;
      };
    }
    const timer = setInterval(() => loadScoreboard(true), 5000);
    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, [numericRoomId, activeListTab]);

  // Tự động mở phòng cho phòng thi (giữa kỳ / cuối kỳ) khi đến thời gian thiết lập
  useEffect(() => {
    startRoomHandlerRef.current = handleStartExamAndMonitoring;
  });

  useEffect(() => {
    if (
      !room ||
      room.status !== 'waiting' ||
      !roomStartTime
    ) return;

    const toLocalNaiveIso = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    let postponing = false;
    const postponeBy5Mins = async (toastMsg: string) => {
      if (postponing) return;
      postponing = true;
      const nextStart = new Date(Date.now() + 5 * 60 * 1000);
      const nextStartIso = toLocalNaiveIso(nextStart);
      const durationMs = (room.durationMinutes || 60) * 60 * 1000;
      const nextEndIso = toLocalNaiveIso(new Date(nextStart.getTime() + durationMs));
      setRoomStartTime(nextStartIso);
      showToast(toastMsg);
      if (rawRoomId) {
        try {
          await fetchWithAuth(`/api/v1/rooms/${rawRoomId}`, {
            method: 'PUT',
            body: JSON.stringify({ start_time: nextStartIso, end_time: nextEndIso }),
          });
        } catch {
          // Giữ thời gian dời trên client nếu cập nhật tạm thời lỗi
        }
      }
      postponing = false;
    };

    const checkAutoStart = async () => {
      const startMs = new Date(roomStartTime).getTime();
      if (!isNaN(startMs) && Date.now() >= startMs) {
        if (!room.templateId) {
          await postponeBy5Mins('Phòng chờ chưa có đề thi: Thời gian tự động bắt đầu được dời thêm 5 phút.');
          return;
        }

        if (rawRoomId) {
          try {
            await fetchWithAuth(`/api/v1/rooms/${rawRoomId}/status`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'dang_dien_ra', force_close_conflicts: false }),
            });
            activateRoomMonitoring(room.id);
            return;
          } catch (err: any) {
            const conflictData = err?.conflict_room || err?.detail?.conflict_room;
            if (conflictData) {
              await postponeBy5Mins(
                `Phòng ${conflictData.room_code || 'khác'} đang được giám sát: Phòng này tự động dời thêm 5 phút.`
              );
              return;
            }
          }
        }

        showToast('Đến giờ thi theo lịch đã thiết lập: Hệ thống tự động kích hoạt phòng thi!');
        void startRoomHandlerRef.current();
      }
    };

    void checkAutoStart();
    const timer = setInterval(() => {
      void checkAutoStart();
    }, 5000);
    return () => clearInterval(timer);
  }, [room, roomStartTime, rawRoomId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Đã sao chép ${label}: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Lọc sinh viên theo tìm kiếm và tab trạng thái
  const filteredAttendees = useMemo(() => {
    return attendees.filter((a) => {
      const matchSearch =
        a.studentName.toLowerCase().includes(search.toLowerCase()) ||
        a.studentId.toLowerCase().includes(search.toLowerCase()) ||
        a.studentEmail.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;
      if (filterStatus === 'waiting') return a.status === 'waiting' || a.status === 'late';
      if (filterStatus === 'absent') return a.status === 'absent';
      return true;
    });
  }, [attendees, search, filterStatus]);

  const waitingCount = attendees.filter((a) => a.status === 'waiting' || a.status === 'late').length;
  const absentCount = attendees.filter((a) => a.status === 'absent').length;
  const attendancePercent = attendees.length > 0 ? Math.round((waitingCount / attendees.length) * 100) : 0;
  const endTimeMs = room?.endTime ? Date.parse(room.endTime) : Number.NaN;
  const isRoomExpired = Boolean(
    room && (
      room.status === 'ended' ||
      (room.status === 'in_progress' && Number.isFinite(endTimeMs) && endTimeMs <= Date.now())
    )
  );

  // Toggle điểm danh thủ công: đồng bộ tức thì với Backend CSDL
  const handleToggleAttendance = async (studentId: string) => {
    const target = attendees.find((a) => a.studentId === studentId);
    if (!target) return;
    const newStatus = target.status === 'waiting' ? 'absent' : 'waiting';

    // Cập nhật giao diện lập tức (Optimistic UI)
    setAttendees((prev) =>
      prev.map((a) => {
        if (a.studentId !== studentId) return a;
        return {
          ...a,
          status: newStatus,
          joinedAt: newStatus === 'waiting' ? new Date().toLocaleTimeString('vi-VN') : undefined,
          cameraReady: newStatus === 'waiting' ? a.cameraReady : false,
        };
      })
    );

    if (rawRoomId) {
      try {
        await fetchWithAuth(`/api/v1/rooms/${rawRoomId}/attendance`, {
          method: 'POST',
          body: JSON.stringify({ student_id: studentId, status: newStatus }),
        });
        showToast(`Đã cập nhật: ${target.studentName} → ${newStatus === 'waiting' ? 'Có mặt' : 'Vắng mặt'}`);
      } catch {
        showToast('Không thể đồng bộ điểm danh với máy chủ.');
      }
    }
  };

  // Kích hoạt ca thi và chuyển sang màn hình giám sát trực tiếp
  const activateRoomMonitoring = (targetRoomId: string) => {
    showToast('Đang chuyển hướng vào Trung tâm giám sát trực tiếp...');
    setTimeout(() => {
      router.push(`/instructor/monitoring?room=${encodeURIComponent(targetRoomId)}`);
    }, 400);
  };

  // Kiểm tra quy định: Được lên lịch trước nhưng KHÔNG được giám sát song song 2 phòng cùng lúc
  const handleStartExamAndMonitoring = async () => {
    if (!room) return;

    if (!room.templateId) {
      showToast('Không thể bắt đầu: Vui lòng gán bộ đề thi cho phòng trước khi bắt đầu.');
      return;
    }

    // Quy định: Phòng thực hành không thể mở phòng khi chưa có sinh viên trong phòng chờ
    const isLab = (room.type as string) === 'lab' || (room.type as string) === 'practice';
    if (isLab && waitingCount === 0) {
      showToast('Không thể mở phòng: Phòng thực hành yêu cầu có ít nhất 1 sinh viên trong phòng chờ trước khi bắt đầu.');
      return;
    }

    setIsActionLoading(true);

    if (rawRoomId) {
      try {
        await fetchWithAuth(`/api/v1/rooms/${rawRoomId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'dang_dien_ra', force_close_conflicts: false }),
        });

        activateRoomMonitoring(room.id);
        return;
      } catch (err: any) {
        const conflictData = err?.conflict_room || err?.detail?.conflict_room;
        if (conflictData) {
          setConflictSession({
            id: conflictData.room_code,
            classId: String(conflictData.room_id),
            className: conflictData.class_name || conflictData.room_name || 'Phòng học phần khác',
            password: '',
            type: 'lab',
            title: conflictData.room_name || conflictData.room_code,
            durationMinutes: 120,
            status: 'in_progress',
            createdAt: conflictData.start_time || '',
            proctoringConfig: { lockdownFullscreen: false, aiFaceDetection: false, aiObjectDetection: false, allowTabSwitch: true },
            attendees: [],
          });
          setIsConflictModalOpen(true);
          return;
        }
        showToast(err?.detail?.message || err?.message || 'Có lỗi khi bắt đầu phòng thi');
        return;
      } finally {
        setIsActionLoading(false);
      }
    }

    // Fallback nếu không có rawRoomId
    activateRoomMonitoring(room.id);
    setIsActionLoading(false);
  };

  // Giảng viên chọn: Kết thúc ca cũ đang chạy để kích hoạt ca thi này
  const handleResolveConflictAndStart = async () => {
    if (!room) return;
    setIsActionLoading(true);

    if (rawRoomId) {
      try {
        await fetchWithAuth(`/api/v1/rooms/${rawRoomId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'dang_dien_ra', force_close_conflicts: true }),
        });
        setIsConflictModalOpen(false);
        showToast(`Đã đóng ca cũ và kích hoạt ca thi ${room.id}!`);
        setTimeout(() => {
          router.push(`/instructor/monitoring?room=${encodeURIComponent(room.id)}`);
        }, 400);
        return;
      } catch (err: any) {
        showToast(err?.message || 'Không thể đóng ca cũ');
      } finally {
        setIsActionLoading(false);
      }
    }

    setIsConflictModalOpen(false);
    activateRoomMonitoring(room.id);
  };

  // Thao tác: Hủy phòng chờ điểm danh
  const handleConfirmCancelRoom = async () => {
    if (!room) return;
    setIsActionLoading(true);

    const syncCancelledState = () => {};

    if (rawRoomId) {
      try {
        await fetchWithAuth(`/api/v1/rooms/${rawRoomId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'da_dong' }),
        });
        syncCancelledState();
        showToast(`Đã hủy phòng chờ ${room.id} thành công! Lớp ${room.classId} đã sẵn sàng tạo ca mới.`);
        setIsCancelModalOpen(false);
        setTimeout(() => {
          router.push(returnPath);
        }, 400);
        return;
      } catch (err: any) {
        showToast(err?.message || 'Không thể hủy phòng trên hệ thống');
      } finally {
        setIsActionLoading(false);
      }
    }

    syncCancelledState();
    setIsCancelModalOpen(false);
    setTimeout(() => {
      router.push(returnPath);
    }, 400);
  };

  if (isLoading && !room) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-xs font-semibold text-slate-500">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span>Đang nạp thông tin phòng chờ và sĩ số lớp từ CSDL...</span>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-xs text-slate-500">
        <AlertTriangle className="h-8 w-8 text-slate-400" />
        <span className="max-w-xl text-center font-bold">
          {lobbyLoadError || `Không tìm thấy dữ liệu phòng chờ "${roomId}"`}
        </span>
        <button
          onClick={() => router.push(returnPath)}
          className="system-primary-action rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
        >
          Quay lại Quản lý Lớp học
        </button>
      </div>
    );
  }

  const studentInviteLink = `/student/exams?code=${encodeURIComponent(room.id)}&pin=${encodeURIComponent(room.password)}`;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-12">
      {/* Toast thông báo mặc định hệ thống */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-md border border-slate-300 border-l-4 border-l-slate-900 bg-white px-4.5 py-3 text-xs shadow-lg dark:border-white/10 dark:border-l-white dark:bg-neutral-900"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-slate-100 text-slate-900 shrink-0 dark:bg-white/10 dark:text-white">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-sans text-xs font-bold text-slate-900 dark:text-white">Thông báo</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">{toastMessage}</p>
          </div>
        </aside>
      )}
      {lobbyLoadError && (
        <p role="status" className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Không thể làm mới dữ liệu điểm danh: {lobbyLoadError}
        </p>
      )}

      {/* ── MODAL 1: XÁC NHẬN HỦY PHÒNG CHỜ ── */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-md border border-slate-300 bg-white p-6 shadow-2xl space-y-4 dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Xác Nhận Hủy Phòng Chờ?</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Bạn có chắc chắn muốn hủy phòng chờ <strong className="font-mono text-slate-800 dark:text-slate-200">{room.id}</strong> của lớp{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{room.classId} — {room.className}</strong>?
                </p>
              </div>
            </div>

            <div className="rounded-md bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-700 space-y-1 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <span className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                <AlertCircle className="h-3.5 w-3.5" />
                Lưu ý quan trọng:
              </span>
              <p className="leading-relaxed">
                Khi hủy phòng, sinh viên đang trong phòng chờ sẽ nhận được thông báo giải tán phòng. Lớp học phần sẽ trở lại trạng thái bình thường để bạn có thể tạo ca học mới.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="h-9 rounded-md border border-slate-300 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Quay Lại
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelRoom}
                className="system-primary-action h-9 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800 cursor-pointer dark:hover:bg-slate-800"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xác Nhận Hủy Phòng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CẢNH BÁO QUY ĐỊNH GIÁM SÁT SONG SONG ── */}
      {isConflictModalOpen && conflictSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-md border border-slate-300 bg-white p-6 shadow-2xl space-y-4.5 dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Xung Đột Phiên Giám Sát Trực Tiếp
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Theo quy định hệ thống Oculide, bạn được phép <strong>lên lịch trước</strong> cho nhiều lớp, nhưng <strong>chỉ được mở trực tiếp 01 phiên giám sát tại cùng một thời điểm</strong> để đảm bảo đường truyền WebRTC và tính tập trung.
                </p>
              </div>
            </div>

            {/* Chi tiết ca đang chạy vs ca muốn mở */}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs dark:border-white/10 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                <span className="font-mono font-bold text-slate-500 uppercase text-[10.5px]">Ca học đang giám sát trực tiếp:</span>
                <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10.5px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Đang diễn ra
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{conflictSession.className}</div>
                  <div className="text-[11px] text-slate-500">Mã phòng: <code className="font-mono font-bold text-slate-900 dark:text-slate-100">{conflictSession.id}</code></div>
                </div>
                <Link
                  href={`/instructor/monitoring?room=${encodeURIComponent(conflictSession.id)}`}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Xem Ca Này</span>
                </Link>
              </div>
            </div>

            <p className="text-xs text-slate-500 italic">
              Để bắt đầu ca thi này (<strong className="font-mono text-slate-800 dark:text-slate-200">{room.id}</strong>), bạn có thể kết thúc ca cũ trước hoặc chuyển đến màn hình giám sát của ca đang chạy.
            </p>

            {/* Các lựa chọn hành động */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConflictModalOpen(false)}
                className="h-9 rounded-md border border-slate-300 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Giữ Phòng Chờ Này
              </button>
              <button
                type="button"
                onClick={handleResolveConflictAndStart}
                className="system-primary-action h-9 inline-flex items-center justify-center gap-1.5 rounded-md bg-slate-900 px-4 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Kết Thúc Ca Cũ &amp; Mở Ca Này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-300 dark:border-white/10">
        <div className="flex items-center gap-3.5">
          <Link
            href={returnPath}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer dark:border-white/10 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-white/10"
            title="Quay lại danh sách lớp"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Phòng Chờ &amp; Điểm Danh
              </h1>
              <span className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-0.5 font-mono text-xs font-bold ${
                isRoomExpired
                  ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
                  : 'border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isRoomExpired ? 'bg-amber-500' : 'bg-slate-400'}`} />
                {isRoomExpired ? 'Đã kết thúc' : 'Đang Mở Điểm Danh'}
              </span>
              <span className="rounded px-2.5 py-0.5 font-mono text-xs font-bold border border-slate-300 bg-white text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                {room.type === 'lab'
                  ? 'Thực Hành Lab'
                  : room.type === 'final'
                    ? 'Thi kết thúc học phần'
                    : room.type === 'midterm'
                      ? 'Thi giữa kỳ'
                      : 'Kiểm Tra Trực Tuyến'}
              </span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center flex-wrap gap-1.5">
              <span>Lớp: <strong className="text-slate-900 dark:text-slate-100 font-bold">{room.classId} — {room.className}</strong></span>
              <span>•</span>
              <span>Bộ đề: <strong className="font-semibold text-slate-900 dark:text-slate-100">{room.templateTitle}</strong></span>
              {(roomStartTime || room.endTime) && (
                <>
                  <span>•</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    Thời gian:{' '}
                    <strong className="text-slate-900 dark:text-white">
                      {roomStartTime ? new Date(roomStartTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      {' – '}
                      {room.endTime ? new Date(room.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </strong>
                    {roomStartTime && (
                      <> ({new Date(roomStartTime).toLocaleDateString('vi-VN')})</>
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Nút Gán Đề, Phát Thông Báo, Hủy Phòng Chờ & Nút Bắt đầu làm bài */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAssignTemplateModalOpen(true)}
            disabled={isRoomExpired}
            className="h-9 inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-white/10"
            title="Gán hoặc đổi bộ đề thi cho phòng chờ"
          >
            <FileCode2 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
            <span>{room.templateId ? 'Đổi Đề Thi' : 'Gán Đề Thi'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenNotice({ type: 'all' })}
            className="h-9 inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition cursor-pointer dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
            title="Phát thông báo nhanh cho sinh viên trong phòng chờ"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Phát Thông Báo</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCancelModalOpen(true)}
            className="h-9 inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-3.5 text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer dark:border-white/10 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-white/10"
            title="Hủy phòng chờ này và giải phóng lớp học phần"
          >
            <Trash2 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
            <span>Hủy Phòng Chờ</span>
          </button>

          {(() => {
            const isLab = (room.type as string) === 'lab' || (room.type as string) === 'practice';
            const isMissingTemplate = !room.templateId;
            const isLabBlocked = isLab && waitingCount === 0;
            const isStartBlocked = isMissingTemplate || isLabBlocked;
            return (
              <button
                type="button"
                disabled={isActionLoading || isStartBlocked}
                onClick={handleStartExamAndMonitoring}
                title={
                  isMissingTemplate
                    ? 'Vui lòng gán bộ đề thi trước khi bắt đầu phòng'
                    : isLabBlocked
                    ? 'Phòng thực hành yêu cầu ít nhất 1 sinh viên vào phòng chờ trước khi bắt đầu'
                    : 'Bắt đầu ca thi / thực hành và chuyển sang giám sát trực tiếp'
                }
                className={`h-9 inline-flex items-center gap-2 rounded-md px-4 text-xs font-bold text-white shadow-2xs transition ${
                  isStartBlocked
                    ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                    : 'system-primary-action bg-slate-900 hover:bg-black cursor-pointer dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                }`}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Bắt Đầu</span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* BANNER THÔNG TIN PHÒNG, ĐỀ THI & MÃ PIN GỬI SINH VIÊN (4 CỘT) */}
      <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Box 1: Mã phòng & PIN */}
        <div className="min-w-0 rounded-md border border-slate-300 bg-white p-5 shadow-2xs transition-colors dark:border-white/10 dark:bg-neutral-900 flex flex-col justify-between space-y-4">
          {isRoomExpired ? (
            <div className="flex min-h-28 flex-col justify-center rounded-md border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
                Phòng đã kết thúc
              </span>
              <p className="mt-2 text-xs leading-relaxed text-amber-800 dark:text-amber-100">
                Mã phòng và mật khẩu đã hết hiệu lực.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                  Thông Tin Vào Phòng Của Sinh Viên
                </span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-3 shadow-2xs space-y-1 dark:border-white/10 dark:bg-white/[0.02]">
                    <span className="font-mono text-[10px] text-slate-500 font-bold block uppercase">MÃ PHÒNG</span>
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <code className="min-w-0 truncate font-mono text-base font-bold text-brand tracking-wider dark:text-brand-200" title={room.id}>{room.id}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(room.id, 'room', 'Mã phòng')}
                        className="shrink-0 rounded p-1 text-slate-500 hover:bg-brand-50 hover:text-brand transition-colors cursor-pointer dark:hover:bg-brand-500/10 dark:hover:text-brand-200"
                        title="Sao chép mã phòng"
                      >
                        {copiedKey === 'room' ? <Check className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-3 shadow-2xs space-y-1 dark:border-white/10 dark:bg-white/[0.02]">
                    <span className="font-mono text-[10px] text-slate-500 font-bold block uppercase">MẬT KHẨU PIN</span>
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <code className="min-w-0 truncate font-mono text-base font-bold text-slate-900 tracking-wider dark:text-white" title={room.password}>{room.password}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(room.password, 'pin', 'Mã PIN')}
                        className="shrink-0 rounded p-1 text-slate-500 hover:bg-brand-50 hover:text-brand transition-colors cursor-pointer dark:hover:bg-brand-500/10 dark:hover:text-brand-200"
                        title="Sao chép mã PIN"
                      >
                        {copiedKey === 'pin' ? <Check className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(`${window.location.origin}${studentInviteLink}`, 'link', 'Link phòng chờ')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 py-2 text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Sao Chép Link Mời Sinh Viên</span>
              </button>
            </>
          )}
        </div>

        {/* Box 2: Bộ Đề Thi & Bài Tập */}
        <div className="rounded-md border border-slate-300 bg-white p-5 shadow-2xs transition-colors dark:border-white/10 dark:bg-neutral-900 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                Bộ Đề Thi / Thực Hành
              </span>
              <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                room.templateId
                  ? 'border-slate-300 bg-slate-100 text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-200'
                  : 'border-slate-300 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-400'
              }`}>
                {room.templateId ? 'Đã Gán Đề' : 'Chưa Gán'}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2" title={room.templateTitle}>
                {room.templateTitle || 'Chưa gán bộ đề thi'}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                {room.templateId ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>Mã: {room.templateId}</span>
                    <span>•</span>
                    <span>{room.templateLanguage || 'Đa ngôn ngữ'}</span>
                  </div>
                ) : (
                  <span className="text-slate-500 italic">Nhấn nút bên dưới để chọn bộ đề</span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Box 3: Tỷ lệ Điểm Danh Thời Gian Thực */}
        <div className="rounded-md border border-slate-300 bg-white p-5 shadow-2xs transition-colors dark:border-white/10 dark:bg-neutral-900 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                Tiến Độ Điểm Danh
              </span>
              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                {attendancePercent}%
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{waitingCount}</span>
              <span className="text-xs text-slate-500">/ {attendees.length} sinh viên đã vào</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full rounded bg-slate-100 overflow-hidden dark:bg-white/10">
              <div
                className="h-full bg-slate-700 dark:bg-slate-300 transition-all duration-300"
                style={{ width: `${attendancePercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-2 border-t border-slate-200 dark:border-white/10">
            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1 font-mono">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Đã vào: {waitingCount} SV
            </span>
            <span className="font-mono">Chưa vào: {absentCount} SV</span>
          </div>
        </div>

        {/* Box 4: Quy chế & Thiết bị phòng */}
        <div className="rounded-md border border-slate-300 bg-white p-5 shadow-2xs transition-colors dark:border-white/10 dark:bg-neutral-900 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
              Cấu Hình Giám Sát &amp; Thời Lượng
            </span>

            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Thời lượng ca học:</span>
                <strong className="font-mono font-bold text-slate-900 dark:text-white">{room.durationMinutes} phút</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Khóa Fullscreen:</span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                  {room.proctoringConfig.lockdownFullscreen ? 'Bật (Bắt buộc)' : 'Tắt'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Camera AI Proctoring:</span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                  {room.proctoringConfig.aiFaceDetection ? 'Bật (Chống gian lận)' : 'Tùy chọn'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-2 border-t border-slate-200 dark:border-white/10">
            <span className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Sẵn sàng làm bài
            </span>
            <span className="font-mono text-slate-500 text-[11px]">PIN: {room.password}</span>
          </div>
        </div>
      </div>

      {/* DANH SÁCH SINH VIÊN ĐIỂM DANH & BẢNG ĐIỂM THỜI GIAN THỰC */}
      <div className="rounded-md border border-slate-300 bg-white p-5 sm:p-6 shadow-2xs space-y-4 transition-colors dark:border-white/10 dark:bg-neutral-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md bg-slate-100 p-1 text-xs font-semibold dark:bg-white/[0.04]">
              <button
                type="button"
                onClick={() => setActiveListTab('attendance')}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 transition cursor-pointer text-xs font-bold ${
                  activeListTab === 'attendance'
                    ? 'system-selected-module shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Điểm Danh ({attendees.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveListTab('scoreboard')}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 transition cursor-pointer text-xs font-bold ${
                  activeListTab === 'scoreboard'
                    ? 'system-selected-module shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Bảng Điểm Sinh Viên ({scoreboard.length})
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm MSSV, họ tên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-48 sm:w-60 rounded-md border border-slate-300 bg-slate-50 pl-10 pr-3.5 text-xs outline-none transition focus:border-slate-600 focus:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
              />
            </div>

            {/* Filter buttons */}
            <div className="inline-flex rounded-md bg-slate-100 p-1 text-xs font-semibold dark:bg-white/[0.04]">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`rounded px-2.5 py-1 transition cursor-pointer font-mono text-[11px] ${filterStatus === 'all'
                    ? 'system-selected-module shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                Tất cả ({attendees.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('waiting')}
                className={`rounded px-2.5 py-1 transition cursor-pointer font-mono text-[11px] ${filterStatus === 'waiting'
                    ? 'system-selected-module shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                Có mặt ({waitingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('absent')}
                className={`rounded px-2.5 py-1 transition cursor-pointer font-mono text-[11px] ${filterStatus === 'absent'
                    ? 'system-selected-module shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                Chưa vào ({absentCount})
              </button>
            </div>

            {/* Thông báo dữ liệu điểm danh */}
            <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.02]">
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
              <span>Đồng bộ điểm danh tự động mỗi 3 giây</span>
            </div>
          </div>
        </div>

        {/* Table */}
        {activeListTab === 'attendance' && (
          <div className="overflow-x-auto rounded-md border border-slate-200 shadow-2xs dark:border-white/10">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono font-bold text-[10.5px] tracking-wider dark:bg-neutral-950 dark:border-white/10">
              <tr>
                <th className="px-4 py-3.5">MSSV</th>
                <th className="px-4 py-3.5">Họ và Tên Sinh Viên</th>
                <th className="px-4 py-3.5">Email Sinh Viên</th>
                <th className="px-4 py-3.5 text-center">Trạng Thái Điểm Danh</th>
                <th className="px-4 py-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans dark:divide-white/10">
              {filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-slate-500">
                    Không tìm thấy sinh viên nào trong danh sách.
                  </td>
                </tr>
              ) : (
                filteredAttendees.map((a) => {
                  const isPresent = a.status === 'waiting' || a.status === 'late';

                  return (
                    <tr key={a.studentId} className="hover:bg-slate-50/50 transition-colors dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs dark:bg-white/10 dark:border-white/10">{a.studentId}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{a.studentName}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{a.studentEmail}</td>
                      <td className="px-4 py-3 text-center">
                        {a.status === 'late' ? (
                          <span className="inline-flex items-center gap-1.5 rounded border border-amber-300 bg-amber-50 px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                            <Clock className="h-3 w-3" />
                            Điểm danh muộn{a.joinedAt ? ` (${a.joinedAt})` : ''}
                          </span>
                        ) : isPresent ? (
                          <span className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Có mặt{a.joinedAt ? ` (${a.joinedAt})` : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-400">
                            Chưa vào phòng
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenNotice({ type: 'individual', studentId: a.studentId, studentName: a.studentName })}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10"
                            title={`Gửi thông báo riêng cho ${a.studentName}`}
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Nhắc nhở</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        )}
        {activeListTab === 'scoreboard' && (
          <div className="overflow-x-auto">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
              <span>Bảng điểm tổng hợp theo bài nộp của từng sinh viên trong phòng</span>
              <button
                type="button"
                onClick={() => {
                  if (!numericRoomId) return;
                  setScoreboardLoading(true);
                  fetchWithAuth<any[]>(`/api/v1/rooms/${numericRoomId}/scoreboard`)
                    .then((rows) => { if (Array.isArray(rows)) setScoreboard(rows); })
                    .catch(() => showToast('Không thể tải bảng điểm phòng.'))
                    .finally(() => setScoreboardLoading(false));
                }}
                className="rounded border border-slate-300 dark:border-white/15 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                {scoreboardLoading ? 'Đang tải...' : 'Làm mới bảng điểm'}
              </button>
            </div>
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-mono font-bold uppercase text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">MSSV</th>
                  <th className="px-4 py-3">Họ và Tên</th>
                  <th className="px-4 py-3 text-center">Câu đạt</th>
                  <th className="px-4 py-3 text-center">Lần nộp</th>
                  <th className="px-4 py-3 text-right">Điểm bài thi</th>
                  <th className="px-4 py-3 text-right">Thang 10</th>
                  <th className="px-4 py-3 text-right">Nộp gần nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {scoreboard
                  .filter((row) => {
                    const kw = search.trim().toLowerCase();
                    if (!kw) return true;
                    return (
                      (row.student_name || '').toLowerCase().includes(kw) ||
                      (row.student_code || '').toLowerCase().includes(kw) ||
                      String(row.student_id).includes(kw)
                    );
                  })
                  .map((row, idx) => (
                    <tr key={row.student_id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {row.student_code || `SV-${row.student_id}`}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {row.student_name}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {row.solved_questions}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {row.total_submissions}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {Number(row.total_score ?? 0).toFixed(2)} / {Number(row.max_room_points ?? 10).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-brand-700 dark:text-brand-300">
                        {Number(row.score_scale_10 ?? 0).toFixed(1)} / 10
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-500">
                        {row.last_submission_time
                          ? new Date(row.last_submission_time).toLocaleString('vi-VN')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                {scoreboard.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      {scoreboardLoading ? 'Đang tải bảng điểm...' : 'Chưa có sinh viên nào nộp bài trong phòng này.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL 3: PHÁT THÔNG BÁO CHO SINH VIÊN TRONG PHÒNG CHỜ ── */}
      <SendNotificationModal
        isOpen={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
        defaultTarget={noticeTarget}
        studentsList={attendees.map((a) => ({ id: a.studentId, name: a.studentName }))}
        onSend={(targetType, targetLabel, message) => {
          showToast(`Đã phát thông báo tới ${targetLabel}: "${message}"`);
        }}
      />

      {/* ── MODAL 4: GÁN BỘ ĐỀ THI VÀO PHÒNG ── */}
      {room && (
        <AssignTemplateModal
          isOpen={isAssignTemplateModalOpen}
          onClose={() => setIsAssignTemplateModalOpen(false)}
          roomCode={room.id}
          roomType={room.type}
          currentTemplateId={room.templateId}
          currentTemplateTitle={room.templateTitle}
          onSuccess={handleAssignTemplateSuccess}
        />
      )}
    </div>
  );
}
