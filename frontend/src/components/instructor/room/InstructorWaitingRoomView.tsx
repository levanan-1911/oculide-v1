'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Laptop,
  Camera,
  DoorOpen,
  Trash2,
  X,
  FileSpreadsheet,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import {
  RoomSession,
  RoomAttendee,
  INSTRUCTOR_ROOMS_STORAGE_KEY,
  INSTRUCTOR_SCHEDULES_STORAGE_KEY,
  ScheduleSessionItem,
} from '@/components/instructor/classes/types';

interface Props {
  roomId: string;
}

export default function InstructorWaitingRoomView({ roomId }: Props) {
  const router = useRouter();

  const [room, setRoom] = useState<RoomSession | null>(null);
  const [attendees, setAttendees] = useState<RoomAttendee[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'waiting' | 'absent'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [conflictSession, setConflictSession] = useState<RoomSession | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  // Load room data from localStorage or create fallback
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let found: RoomSession | null = null;
    try {
      const raw = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
      if (raw) {
        const parsed: RoomSession[] = JSON.parse(raw);
        found = parsed.find((r) => r.id.toLowerCase() === roomId.toLowerCase()) || null;
      }
    } catch {
      // fallback
    }

    if (!found) {
      // Khởi tạo phòng giả lập nếu truy cập trực tiếp bằng URL
      found = {
        id: roomId,
        classId: roomId.slice(0, 5) || 'CS101',
        className: 'Nhập môn Lập trình C/C++',
        password: '883921',
        type: roomId.toLowerCase().includes('exam') ? 'exam' : 'lab',
        title: `Phòng Chờ Điểm Danh • ${roomId}`,
        templateId: 'TPL-LAB-01',
        templateTitle: 'Cấu trúc điều khiển & Mảng một chiều (C++)',
        templateLanguage: 'C++',
        durationMinutes: 120,
        status: 'waiting',
        createdAt: '07:30',
        proctoringConfig: {
          lockdownFullscreen: false,
          aiFaceDetection: false,
          aiObjectDetection: false,
          allowTabSwitch: true,
        },
        attendees: [
          { studentId: 'SE184801', studentName: 'Nguyễn Văn An', studentEmail: 'an.nv@school.edu.vn', status: 'waiting', joinedAt: '07:31:12', device: 'Laptop Windows 11 / Chrome 124', cameraReady: true },
          { studentId: 'SE184802', studentName: 'Trần Thị Bình', studentEmail: 'binh.tt@school.edu.vn', status: 'waiting', joinedAt: '07:32:05', device: 'MacBook Air M2 / Safari', cameraReady: true },
          { studentId: 'SE184803', studentName: 'Lê Hoàng Cường', studentEmail: 'cuong.lh@school.edu.vn', status: 'waiting', joinedAt: '07:33:40', device: 'Laptop Dell / Chrome', cameraReady: true },
          { studentId: 'SE184804', studentName: 'Phạm Minh Châu', studentEmail: 'chau.pm@school.edu.vn', status: 'waiting', joinedAt: '07:34:15', device: 'Laptop Asus / Edge', cameraReady: true },
          { studentId: 'SE184805', studentName: 'Đặng Tuấn Dương', studentEmail: 'duong.dt@school.edu.vn', status: 'waiting', joinedAt: '07:35:00', device: 'Laptop Lenovo / Chrome', cameraReady: true },
          { studentId: 'SE184806', studentName: 'Vũ Hải Yến', studentEmail: 'yen.vh@school.edu.vn', status: 'absent' },
        ],
      };
    }

    setRoom(found);
    setAttendees(found.attendees || []);
  }, [roomId]);

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
      if (filterStatus === 'waiting') return a.status === 'waiting';
      if (filterStatus === 'absent') return a.status === 'absent';
      return true;
    });
  }, [attendees, search, filterStatus]);

  const waitingCount = attendees.filter((a) => a.status === 'waiting').length;
  const absentCount = attendees.filter((a) => a.status === 'absent').length;
  const attendancePercent = attendees.length > 0 ? Math.round((waitingCount / attendees.length) * 100) : 0;

  // Toggle điểm danh thủ công
  const handleToggleAttendance = (studentId: string) => {
    setAttendees((prev) =>
      prev.map((a) => {
        if (a.studentId !== studentId) return a;
        const newStatus = a.status === 'waiting' ? 'absent' : 'waiting';
        return {
          ...a,
          status: newStatus,
          joinedAt: newStatus === 'waiting' ? new Date().toLocaleTimeString('vi-VN') : undefined,
          cameraReady: newStatus === 'waiting',
        };
      })
    );
  };

  // Kích hoạt ca thi và chuyển sang màn hình giám sát trực tiếp
  const activateRoomMonitoring = (targetRoomId: string) => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
        if (raw) {
          const parsed: RoomSession[] = JSON.parse(raw);
          const updated = parsed.map((r) =>
            r.id.toLowerCase() === targetRoomId.toLowerCase()
              ? { ...r, status: 'in_progress' as const, attendees }
              : r
          );
          localStorage.setItem(INSTRUCTOR_ROOMS_STORAGE_KEY, JSON.stringify(updated));
        }

        // Cập nhật trạng thái trong Lịch Giảng Dạy sang 'Đang diễn ra'
        const rawSched = localStorage.getItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY);
        if (rawSched) {
          const parsedSched: ScheduleSessionItem[] = JSON.parse(rawSched);
          const updatedSched = parsedSched.map((s) =>
            s.roomCode.toLowerCase() === targetRoomId.toLowerCase()
              ? { ...s, status: 'Đang diễn ra' as const }
              : s
          );
          localStorage.setItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY, JSON.stringify(updatedSched));
        }

        window.dispatchEvent(new Event('storage'));
      } catch {
        // fallback
      }
    }

    showToast('Đang chuyển hướng vào Trung tâm giám sát trực tiếp...');
    setTimeout(() => {
      router.push(`/instructor/monitoring?room=${encodeURIComponent(targetRoomId)}`);
    }, 400);
  };

  // Kiểm tra quy định: Được lên lịch trước nhưng KHÔNG được giám sát song song 2 phòng cùng lúc
  const handleStartExamAndMonitoring = () => {
    if (!room) return;

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
        if (raw) {
          const parsed: RoomSession[] = JSON.parse(raw);
          // Tìm xem có phòng nào KHÁC đang ở trạng thái in_progress hay không
          const activeRunningRoom = parsed.find(
            (r) => r.status === 'in_progress' && r.id.toLowerCase() !== room.id.toLowerCase()
          );

          if (activeRunningRoom) {
            // Phát hiện xung đột giám sát song song
            setConflictSession(activeRunningRoom);
            setIsConflictModalOpen(true);
            return;
          }
        }
      } catch {
        // ignore
      }
    }

    // Không có xung đột, mở phiên giám sát bình thường
    activateRoomMonitoring(room.id);
  };

  // Giảng viên chọn: Kết thúc ca cũ đang chạy để kích hoạt ca thi này
  const handleResolveConflictAndStart = () => {
    if (!conflictSession || !room) return;

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
        if (raw) {
          const parsed: RoomSession[] = JSON.parse(raw);
          const updated = parsed.map((r) => {
            if (r.id.toLowerCase() === conflictSession.id.toLowerCase()) {
              return { ...r, status: 'ended' as const };
            }
            if (r.id.toLowerCase() === room.id.toLowerCase()) {
              return { ...r, status: 'in_progress' as const, attendees };
            }
            return r;
          });
          localStorage.setItem(INSTRUCTOR_ROOMS_STORAGE_KEY, JSON.stringify(updated));
        }

        // Cập nhật schedules
        const rawSched = localStorage.getItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY);
        if (rawSched) {
          const parsedSched: ScheduleSessionItem[] = JSON.parse(rawSched);
          const updatedSched = parsedSched.map((s) => {
            if (s.roomCode.toLowerCase() === conflictSession.id.toLowerCase()) {
              return { ...s, status: 'Đã kết thúc' as const };
            }
            if (s.roomCode.toLowerCase() === room.id.toLowerCase()) {
              return { ...s, status: 'Đang diễn ra' as const };
            }
            return s;
          });
          localStorage.setItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY, JSON.stringify(updatedSched));
        }

        window.dispatchEvent(new Event('storage'));
      } catch {
        // fallback
      }
    }

    setIsConflictModalOpen(false);
    showToast(`Đã đóng ca ${conflictSession.id} và kích hoạt ca thi ${room.id}!`);
    setTimeout(() => {
      router.push(`/instructor/monitoring?room=${encodeURIComponent(room.id)}`);
    }, 400);
  };

  // Thao tác: Hủy phòng chờ điểm danh
  const handleConfirmCancelRoom = () => {
    if (!room) return;

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
        if (raw) {
          const parsed: RoomSession[] = JSON.parse(raw);
          const updated = parsed.map((r) =>
            r.id.toLowerCase() === room.id.toLowerCase()
              ? { ...r, status: 'ended' as const }
              : r
          );
          localStorage.setItem(INSTRUCTOR_ROOMS_STORAGE_KEY, JSON.stringify(updated));
        }

        // Cập nhật lịch giảng dạy
        const rawSched = localStorage.getItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY);
        if (rawSched) {
          const parsedSched: ScheduleSessionItem[] = JSON.parse(rawSched);
          const updatedSched = parsedSched.map((s) =>
            s.roomCode.toLowerCase() === room.id.toLowerCase()
              ? { ...s, status: 'Đã kết thúc' as const }
              : s
          );
          localStorage.setItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY, JSON.stringify(updatedSched));
        }

        window.dispatchEvent(new Event('storage'));
      } catch {
        // fallback
      }
    }

    showToast(`Đã hủy phòng chờ ${room.id} thành công! Lớp ${room.classId} đã sẵn sàng tạo ca mới.`);
    setIsCancelModalOpen(false);
    setTimeout(() => {
      router.push('/instructor/classes');
    }, 400);
  };

  if (!room) {
    return (
      <div className="flex h-64 items-center justify-center text-xs font-semibold text-slate-500">
        Đang tải thông tin phòng chờ...
      </div>
    );
  }

  const studentInviteLink = `http://localhost:3000/student/join?room=${room.id}&pin=${room.password}`;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-12">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4.5 py-3 text-xs font-medium text-white shadow-xl animate-in slide-in-from-bottom-2 duration-200 border border-slate-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── MODAL 1: XÁC NHẬN HỦY PHÒNG CHỜ ── */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Hủy Phòng Chờ?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Bạn có chắc chắn muốn hủy phòng chờ <strong className="font-mono text-slate-800">{room.id}</strong> của lớp{' '}
                  <strong className="text-slate-800">{room.classId} — {room.className}</strong>?
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-800 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-900">
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
                className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Quay Lại
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelRoom}
                className="h-10 inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 text-xs font-extrabold text-white shadow-md shadow-red-600/20 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-amber-300 bg-white p-6 shadow-2xl space-y-4.5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Xung Đột Phiên Giám Sát Trực Tiếp
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Theo quy định hệ thống Oculide, bạn được phép <strong>lên lịch trước</strong> cho nhiều lớp, nhưng <strong>chỉ được mở trực tiếp 01 phiên giám sát tại cùng một thời điểm</strong> để đảm bảo đường truyền WebRTC và tính tập trung.
                </p>
              </div>
            </div>

            {/* Chi tiết ca đang chạy vs ca muốn mở */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-500 uppercase text-[10.5px]">Ca học đang giám sát trực tiếp:</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10.5px] font-extrabold text-emerald-800">
                  <Radio className="h-3 w-3 animate-pulse text-emerald-600" />
                  Đang diễn ra
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">{conflictSession.className}</div>
                  <div className="text-[11px] text-slate-500">Mã phòng: <code className="font-mono font-bold text-blue-700">{conflictSession.id}</code></div>
                </div>
                <Link
                  href={`/instructor/monitoring?room=${encodeURIComponent(conflictSession.id)}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Xem Ca Này</span>
                </Link>
              </div>
            </div>

            <p className="text-xs text-slate-500 italic">
              Để bắt đầu ca thi này (<strong className="font-mono text-slate-800">{room.id}</strong>), bạn có thể kết thúc ca cũ trước hoặc chuyển đến màn hình giám sát của ca đang chạy.
            </p>

            {/* Các lựa chọn hành động */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConflictModalOpen(false)}
                className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Giữ Phòng Chờ Này
              </button>
              <button
                type="button"
                onClick={handleResolveConflictAndStart}
                className="h-10 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 text-xs font-extrabold text-white shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Kết Thúc Ca Cũ &amp; Mở Ca Này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3.5">
          <Link
            href="/instructor/classes"
            className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
            title="Quay lại danh sách lớp"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Phòng Chờ &amp; Điểm Danh
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-200 shadow-2xs">
                <Radio className="h-3 w-3 animate-pulse text-emerald-600" />
                Đang Mở Điểm Danh
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold border ${
                room.type === 'lab'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-purple-50 text-purple-800 border-purple-200'
              }`}>
                {room.type === 'lab' ? '💻 Thực Hành Lab (Mở)' : '📝 Kiểm Tra (Lockdown AI)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Lớp: <strong className="text-slate-800 font-extrabold">{room.classId} — {room.className}</strong> • Bộ đề thi: <strong className="text-blue-700 font-bold">{room.templateTitle}</strong>
            </p>
          </div>
        </div>

        {/* Nút Hủy Phòng Chờ & Nút Bắt đầu làm bài */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCancelModalOpen(true)}
            className="h-10 inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 hover:bg-red-100 hover:border-red-300 px-4 text-xs font-extrabold text-red-700 shadow-2xs transition-all active:scale-[0.99] cursor-pointer"
            title="Hủy phòng chờ này và giải phóng lớp học phần"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-600" />
            <span>Hủy Phòng Chờ</span>
          </button>

          <button
            type="button"
            onClick={handleStartExamAndMonitoring}
            className="h-10 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-5 text-xs font-extrabold text-white shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/25 transition-all active:scale-[0.99] cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span> Bắt Đầu </span>
          </button>
        </div>
      </div>

      {/* BANNER THÔNG TIN PHÒNG & MÃ PIN GỬI SINH VIÊN */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
        {/* Box 1: Mã phòng & PIN */}
        <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/30 p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-blue-900 block">
              Thông Tin Vào Phòng Của Sinh Viên
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-blue-200/90 bg-white p-3 shadow-2xs space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">MÃ PHÒNG</span>
                <div className="flex items-center justify-between">
                  <code className="font-mono text-base font-black text-blue-700 tracking-wider">{room.id}</code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(room.id, 'room', 'Mã phòng')}
                    className="rounded-lg p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                    title="Sao chép mã phòng"
                  >
                    {copiedKey === 'room' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-blue-200/90 bg-white p-3 shadow-2xs space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">MẬT KHẨU PIN</span>
                <div className="flex items-center justify-between">
                  <code className="font-mono text-base font-black text-slate-900 tracking-wider">{room.password}</code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(room.password, 'pin', 'Mã PIN')}
                    className="rounded-lg p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                    title="Sao chép mã PIN"
                  >
                    {copiedKey === 'pin' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => copyToClipboard(studentInviteLink, 'link', 'Link phòng chờ')}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200/90 bg-white hover:bg-blue-50 py-2.5 text-xs font-extrabold text-blue-700 transition shadow-2xs cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Sao Chép Link Mời Sinh Viên Vào Phòng</span>
          </button>
        </div>

        {/* Box 2: Tỷ lệ Điểm Danh Thời Gian Thực */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                Tiến Độ Điểm Danh Phòng Chờ
              </span>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {attendancePercent}%
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{waitingCount}</span>
              <span className="text-xs text-slate-500 font-bold">/ {attendees.length} sinh viên đã vào</span>
            </div>

            {/* Progress bar */}
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                style={{ width: `${attendancePercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-2 border-t border-slate-100">
            <span className="text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Đã vào: {waitingCount} SV
            </span>
            <span className="text-slate-400">Chưa vào: {absentCount} SV</span>
          </div>
        </div>

        {/* Box 3: Quy chế & Thiết bị phòng */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 block">
              Cấu Hình Giám Sát &amp; Thời Lượng
            </span>

            <div className="space-y-2 text-xs text-slate-700 pt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Thời lượng ca học:</span>
                <strong className="text-slate-900 font-bold">{room.durationMinutes} phút</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Khóa Fullscreen:</span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-[10.5px] ${
                  room.proctoringConfig.lockdownFullscreen
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {room.proctoringConfig.lockdownFullscreen ? 'Bật (Bắt buộc)' : 'Tắt (Cho phép rời tab)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Camera AI Proctoring:</span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-[10.5px] ${
                  room.proctoringConfig.aiFaceDetection
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {room.proctoringConfig.aiFaceDetection ? 'Bật (Chống gian lận)' : 'Tùy chọn'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-blue-700 font-bold flex items-center gap-1">
              <Radio className="h-3 w-3 animate-pulse text-blue-600" />
              Sẵn sàng làm bài
            </span>
            <span className="font-mono text-slate-400 text-[11px]">PIN: {room.password}</span>
          </div>
        </div>
      </div>

      {/* DANH SÁCH SINH VIÊN ĐIỂM DANH THỜI GIAN THỰC */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4 hover:border-slate-300/80 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Users className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Danh Sách Sinh Viên Phòng Chờ ({attendees.length})
            </h2>
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
                className="h-9 w-48 sm:w-60 rounded-xl border border-slate-200/90 bg-slate-50/70 pl-10 pr-3.5 text-xs outline-none transition-all hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
              />
            </div>

            {/* Filter buttons */}
            <div className="inline-flex rounded-xl bg-slate-100/90 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({attendees.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('waiting')}
                className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                  filterStatus === 'waiting'
                    ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Có mặt ({waitingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('absent')}
                className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                  filterStatus === 'absent'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chưa vào ({absentCount})
              </button>
            </div>

            {/* Thông báo dữ liệu điểm danh được quản lý ở Module Báo Cáo */}
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>Dữ liệu điểm danh chi tiết được lưu trữ tại module Báo cáo</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-2xs">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-700 uppercase font-extrabold text-[10.5px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">MSSV</th>
                <th className="px-4 py-3.5">Họ và Tên Sinh Viên</th>
                <th className="px-4 py-3.5">Email Sinh Viên</th>
                <th className="px-4 py-3.5 text-center">Trạng Thái Điểm Danh</th>
                <th className="px-4 py-3.5">Thiết Bị &amp; Camera</th>
                <th className="px-4 py-3.5 text-right">Điểm Danh Thủ Công</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                    Không tìm thấy sinh viên nào trong danh sách.
                  </td>
                </tr>
              ) : (
                filteredAttendees.map((a) => {
                  const isPresent = a.status === 'waiting';

                  return (
                    <tr key={a.studentId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-extrabold text-slate-900">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{a.studentId}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{a.studentName}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{a.studentEmail}</td>
                      <td className="px-4 py-3 text-center">
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 shadow-2xs">
                            <CheckCircle2 className="h-3 w-3" />
                            Có mặt ({a.joinedAt})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                            Chưa vào phòng
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px]">
                        {isPresent ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Laptop className="h-3 w-3 text-slate-400" />
                              <span className="truncate max-w-[180px] font-medium">{a.device || 'Laptop cá nhân'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px]">
                              <Camera className="h-3 w-3" />
                              <span>Camera: Sẵn sàng</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa kết nối thiết bị</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(a.studentId)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition cursor-pointer ${
                            isPresent
                              ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700 border border-slate-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {isPresent ? 'Hủy Điểm Danh' : 'Điểm Danh Nhanh'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
