'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  Radio,
  RefreshCw,
  Send,
  Lock,
  Unlock,
  KeyRound,
  FileText,
  Users,
  Video,
  Monitor,
  Check,
  X,
  Sparkles,
  Info,
  ShieldCheck,
  Play,
  RotateCcw,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import {
  ExamScheduleItem,
  getStoredSchedules,
  saveStoredSchedules,
  INITIAL_SCHEDULES,
} from '../../types';

interface StudentLobbyCheckin {
  id: string;
  name: string;
  deviceWebcam: 'ok' | 'error' | 'not_connected';
  deviceScreen: 'ok' | 'error' | 'not_connected';
  status: 'ready' | 'needs_help' | 'absent';
}

export default function ExamLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = (params?.id as string) || '';

  const [schedule, setSchedule] = useState<ExamScheduleItem | null>(null);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAccepting, setIsAccepting] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [copiedField, setCopiedField] = useState<'code' | 'password' | null>(null);

  // Student checkin mock state
  const [students, setStudents] = useState<StudentLobbyCheckin[]>([
    { id: 'SE184801', name: 'Nguyễn Văn An', deviceWebcam: 'ok', deviceScreen: 'ok', status: 'ready' },
    { id: 'SE184802', name: 'Trần Thu Bình', deviceWebcam: 'ok', deviceScreen: 'ok', status: 'ready' },
    { id: 'SE184803', name: 'Lê Hải Nam', deviceWebcam: 'error', deviceScreen: 'ok', status: 'needs_help' },
    { id: 'SE184804', name: 'Phạm Minh Châu', deviceWebcam: 'ok', deviceScreen: 'ok', status: 'ready' },
    { id: 'SE184805', name: 'Hoàng Đức Trọng', deviceWebcam: 'not_connected', deviceScreen: 'not_connected', status: 'absent' },
    { id: 'SE184806', name: 'Vũ Gia Huy', deviceWebcam: 'ok', deviceScreen: 'ok', status: 'ready' },
    { id: 'SE184807', name: 'Đỗ Khánh Linh', deviceWebcam: 'ok', deviceScreen: 'ok', status: 'ready' },
    { id: 'SE184808', name: 'Ngô Đức Nam', deviceWebcam: 'error', deviceScreen: 'error', status: 'needs_help' },
  ]);

  // Load schedule from storage
  useEffect(() => {
    const list = getStoredSchedules();
    const found = list.find((s) => s.id === scheduleId) || list[0] || INITIAL_SCHEDULES[0];
    if (found) {
      setSchedule(found);
      setIsLobbyOpen(!!found.isLobbyOpen || found.status === 'ongoing');
    }
  }, [scheduleId]);

  // Hide notification
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Copy to clipboard helper
  function handleCopy(text: string, field: 'code' | 'password') {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    setNotification({
      type: 'success',
      message: `Đã sao chép ${field === 'code' ? 'Mã phòng' : 'Mật khẩu'} vào bộ nhớ tạm!`,
    });
  }

  // Pre-flight action: Open Lobby (Wireframe 3 -> Wireframe 4)
  function handleConfirmOpenLobby() {
    if (!schedule) return;
    const updated: ExamScheduleItem = {
      ...schedule,
      isLobbyOpen: true,
      readyStudentCount: 36,
      deviceCheckCount: 7,
      absentCount: 5,
    };
    setSchedule(updated);
    setIsLobbyOpen(true);

    const all = getStoredSchedules();
    const nextList = all.map((s) => (s.id === schedule.id ? updated : s));
    saveStoredSchedules(nextList);

    setNotification({
      type: 'success',
      message: 'Đã mở phòng kiểm tra thành công! Mã tham gia và mật khẩu đã sẵn sàng.',
    });
  }

  // Lobby action: Start Exam (Wireframe 4 -> Live Monitoring)
  function handleStartExam() {
    if (!schedule) return;
    if (
      !confirm(
        `Bắt đầu tính giờ làm bài cho ca thi "${schedule.id}"?\nToàn bộ thí sinh sẽ nhận đề thi và kích hoạt giám sát AI.`
      )
    ) {
      return;
    }

    const updated: ExamScheduleItem = {
      ...schedule,
      status: 'ongoing',
    };
    setSchedule(updated);

    const all = getStoredSchedules();
    const nextList = all.map((s) => (s.id === schedule.id ? updated : s));
    saveStoredSchedules(nextList);

    router.push(`/admin/monitoring?session=${schedule.id}`);
  }

  // Re-check student device
  function handleRecheckDevice(stId: string) {
    setStudents((prev) =>
      prev.map((st) =>
        st.id === stId
          ? { ...st, deviceWebcam: 'ok', deviceScreen: 'ok', status: 'ready' }
          : st
      )
    );
    setNotification({
      type: 'success',
      message: `Đã kiểm tra lại thiết bị của thí sinh ${stId}: Đạt chuẩn!`,
    });
  }

  // Regenerate Code & Password
  function handleRegenerateCredentials() {
    if (!schedule) return;
    const newCode = `OC-${Math.floor(100000 + Math.random() * 900000)}`;
    const newPassword = String(Math.floor(100000 + Math.random() * 900000));
    const updated = { ...schedule, roomCode: newCode, roomPassword: newPassword };
    setSchedule(updated);

    const all = getStoredSchedules();
    saveStoredSchedules(all.map((s) => (s.id === schedule.id ? updated : s)));

    setNotification({
      type: 'info',
      message: `Đã cấp lại Mã phòng mới: ${newCode} và Mật khẩu mới.`,
    });
  }

  if (!schedule) {
    return (
      <div className="flex min-h-screen w-full bg-[#f4f7f9] text-slate-800">
        <AdminSidebar activeModule="schedules" />
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
          <p className="text-sm font-semibold text-slate-500">Đang tải thông tin phòng kiểm tra...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f4f7f9] text-slate-800">
      <AdminSidebar activeModule="schedules" />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          title={isLobbyOpen ? 'Phòng chờ giảng viên' : 'Mở phòng kiểm tra'}
        />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1200px] space-y-6">
            {/* Toast Notification */}
            {notification && (
              <div
                role="status"
                className={`flex items-center justify-between rounded-xl border p-4 shadow-sm transition ${
                  notification.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-blue-200 bg-blue-50 text-blue-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="text-xs sm:text-sm font-semibold">{notification.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotification(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-black/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Header & Back Button */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/schedules"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                  title="Quay lại danh sách lịch kiểm tra"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                    {isLobbyOpen ? 'Phòng chờ giảng viên' : 'Mở phòng kiểm tra'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {isLobbyOpen
                      ? `${schedule.id} • Đã mở phòng • Chưa bắt đầu làm bài.`
                      : 'Kiểm tra điều kiện mở phòng thi và thời gian tham gia.'}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {isLobbyOpen ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                    Phòng chờ đang mở
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-800 shadow-sm">
                    <Lock className="h-3.5 w-3.5" />
                    Chưa cấp mã phòng
                  </span>
                )}
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════
                GIAI ĐOẠN 1: PRE-FLIGHT CHECKLIST (WIREFRAME ẢNH 3)
            ══════════════════════════════════════════════════════════════ */}
            {!isLobbyOpen && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Kiểm tra điều kiện tiên quyết trước khi mở phòng
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đảm bảo tất cả 5 điều kiện dưới đây đều đạt chuẩn để ca thi diễn ra an toàn, không gián đoạn.
                  </p>
                </div>

                {/* Bảng Checklist điều kiện */}
                <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[#f8fafc] text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">ĐIỀU KIỆN</th>
                        <th className="px-5 py-3">KẾT QUẢ KIỂM TRA</th>
                        <th className="px-5 py-3 text-right">TRẠNG THÁI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-bold text-slate-800">
                          Lịch kiểm tra
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {schedule.id} ({schedule.date} • {schedule.startTime} - {schedule.endTime})
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <Check className="h-3.5 w-3.5" />
                            Đã lên lịch
                          </span>
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-bold text-slate-800">
                          Phiên bản đề
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {schedule.templateTitle} ({schedule.templateVersion})
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <Check className="h-3.5 w-3.5" />
                            Sẵn sàng
                          </span>
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-bold text-slate-800">
                          Danh sách tham gia kiểm tra
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          Lớp {schedule.classId} • Đã chốt {schedule.studentCount} tài khoản
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <Check className="h-3.5 w-3.5" />
                            {schedule.studentCount} tài khoản hợp lệ
                          </span>
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-bold text-slate-800">
                          Chính sách giám sát AI
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          Webcam bắt buộc, Khóa màn hình, Chặn Clipboard
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <Check className="h-3.5 w-3.5" />
                            Đã lưu
                          </span>
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-bold text-slate-800">
                          Dịch vụ giám sát và chấm
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          Oculide AI Proctoring Engine &amp; Auto-grader
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <Check className="h-3.5 w-3.5" />
                            Sẵn sàng
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Hộp ghi chú quan trọng */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold">Lưu ý trước khi mở phòng:</h5>
                    <p className="mt-0.5 leading-relaxed text-blue-800">
                      Mã tham gia và mật khẩu chỉ được cấp sau khi mở phòng thành công. Mở phòng cho phép sinh viên vào phòng chờ để kiểm tra camera và màn hình trước, chưa hiển thị đề thi hoặc chạy thời gian làm bài.
                    </p>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <Link
                    href="/admin/schedules"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Quay lại lịch
                  </Link>

                  <button
                    type="button"
                    onClick={handleConfirmOpenLobby}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 transition cursor-pointer"
                  >
                    <Unlock className="h-4 w-4" />
                    Mở phòng kiểm tra
                  </button>
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════
                GIAI ĐOẠN 2: PHÒNG CHỜ GIẢNG VIÊN - LOBBY (WIREFRAME ẢNH 4)
            ══════════════════════════════════════════════════════════════ */}
            {isLobbyOpen && (
              <div className="space-y-5">
                {/* 3 Thẻ Thông tin Mã phòng & Mật khẩu */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Mã tham gia */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-slate-400">
                        MÃ THAM GIA
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        Chỉ đọc
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xl sm:text-2xl font-black text-blue-600 tracking-wider">
                        {schedule.roomCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(schedule.roomCode, 'code')}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        {copiedField === 'code' ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-slate-500" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Mật khẩu phòng */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-slate-400">
                        MẬT KHẨU PHÒNG
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        {showPassword ? (
                          <>
                            <EyeOff className="h-3 w-3" />
                            <span>Ẩn</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3" />
                            <span>Hiện</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xl sm:text-2xl font-black text-slate-800 tracking-wider">
                        {showPassword ? schedule.roomPassword || '123456' : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(schedule.roomPassword || '123456', 'password')}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        {copiedField === 'password' ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-slate-500" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Trạng thái tiếp nhận */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-slate-400">
                        TRẠNG THÁI TIẾP NHẬN
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        Chỉ đọc
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-3 w-3 rounded-full ${
                            isAccepting ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                          }`}
                        ></span>
                        <span className="text-base sm:text-lg font-bold text-slate-900">
                          {isAccepting ? 'Đang mở phòng' : 'Tạm dừng tiếp nhận'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {schedule.room}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bảng Danh sách Sinh viên vào phòng chờ */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Danh sách thí sinh kết nối phòng chờ
                      </h3>
                      <p className="text-xs text-slate-500">
                        Theo dõi thiết bị camera &amp; chia sẻ màn hình của từng thí sinh theo thời gian thực.
                      </p>
                    </div>
                    <span className="font-mono text-xs text-slate-400">
                      Cập nhật tự động: 3s/lần
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[#f8fafc] text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3">MSSV</th>
                          <th className="px-5 py-3">SINH VIÊN</th>
                          <th className="px-5 py-3">WEBCAM / MÀN HÌNH</th>
                          <th className="px-5 py-3">TRẠNG THÁI</th>
                          <th className="px-5 py-3 text-right">THAO TÁC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {students.map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50 transition">
                            <td className="px-5 py-3 font-mono font-bold text-slate-800">
                              {st.id}
                            </td>
                            <td className="px-5 py-3 font-semibold text-slate-900">
                              {st.name}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold ${
                                    st.deviceWebcam === 'ok'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : st.deviceWebcam === 'error'
                                      ? 'bg-red-50 text-red-700 border border-red-200'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  <Video className="h-3 w-3" />
                                  Cam: {st.deviceWebcam === 'ok' ? 'Đạt' : st.deviceWebcam === 'error' ? 'Lỗi' : 'Chưa'}
                                </span>

                                <span
                                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold ${
                                    st.deviceScreen === 'ok'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : st.deviceScreen === 'error'
                                      ? 'bg-red-50 text-red-700 border border-red-200'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  <Monitor className="h-3 w-3" />
                                  Màn hình: {st.deviceScreen === 'ok' ? 'Đạt' : st.deviceScreen === 'error' ? 'Lỗi' : 'Chưa'}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              {st.status === 'ready' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                                  <Check className="h-3 w-3" />
                                  Sẵn sàng
                                </span>
                              ) : st.status === 'needs_help' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                                  <AlertCircle className="h-3 w-3" />
                                  Cần hỗ trợ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                                  Chưa vào
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {st.status === 'needs_help' ? (
                                <button
                                  type="button"
                                  onClick={() => handleRecheckDevice(st.id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  Kiểm tra lại
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400">Đã đồng bộ</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Banner thống kê nhanh */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 font-bold text-center">
                    36 sẵn sàng / 7 kiểm tra thiết bị / 5 chưa tham gia.
                  </div>

                  {/* Action Buttons Row (Footer Wireframe 4) */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setNotification({
                            type: 'success',
                            message: `Đã gửi mã phòng ${schedule.roomCode} tới email của 48 sinh viên!`,
                          })
                        }
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5 text-slate-500" />
                        Gửi thông tin tham gia
                      </button>

                      <button
                        type="button"
                        onClick={handleRegenerateCredentials}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                        Cấp lại mã / mật khẩu
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAccepting(!isAccepting);
                          setNotification({
                            type: 'info',
                            message: isAccepting
                              ? 'Đã tạm dừng tiếp nhận thêm thí sinh vào phòng.'
                              : 'Đã mở lại tiếp nhận thí sinh.',
                          });
                        }}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        {isAccepting ? (
                          <>
                            <Lock className="h-3.5 w-3.5 text-slate-500" />
                            Tạm dừng tiếp nhận
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                            Mở lại tiếp nhận
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setNotification({
                            type: 'info',
                            message: 'Đã phát thông báo quy chế thi tới màn hình toàn bộ thí sinh!',
                          })
                        }
                        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <FileText className="h-4 w-4 text-slate-500" />
                        Gửi quy chế
                      </button>

                      <button
                        type="button"
                        onClick={handleStartExam}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 transition cursor-pointer"
                      >
                        <Play className="h-4 w-4 fill-white" />
                        Bắt đầu buổi kiểm tra
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
