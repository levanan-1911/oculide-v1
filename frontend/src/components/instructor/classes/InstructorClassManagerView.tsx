'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Table2,
  Users,
  Code2,
  Clock,
  ArrowRight,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  Video,
  Send,
  Eye,
  Lock,
  Unlock,
  Sparkles,
  BookOpen,
  FileCode2,
  ChevronRight,
  Search,
  Filter,
  Download,
  Trash2,
  Pencil,
  FileSpreadsheet,
  X,
  UserPlus,
  Radio,
  Loader2,
} from 'lucide-react';
import {
  ClassRow,
  ClassLab,
  ClassExam,
  StudentRow,
  RoomSession,
  isRoomCurrentlyRunning,
} from './types';
import { fetchWithAuth } from '@/services/apiClient';

function mapApiRoomsToSessions(apiRooms: any[]): RoomSession[] {
  const nowMs = Date.now();
  return apiRooms.map((r) => {
    const rawStatus = String(r.status || '').toLowerCase();
    const isInactive =
      r.is_active === false || r.is_active === 0 || r.is_active === '0' || r.is_active === 'false';
    const endMs = r.end_time ? new Date(String(r.end_time)).getTime() : NaN;
    const isExpired = Number.isFinite(endMs) && endMs <= nowMs;
    const mappedStatus: RoomSession['status'] = isRoomCurrentlyRunning(r, nowMs)
      ? 'in_progress'
      : !isInactive && !isExpired && ['scheduled', 'waiting', 'chua_mo'].includes(rawStatus)
      ? 'waiting'
      : 'ended';
    return {
      id: r.room_code,
      classId: r.class_code || String(r.class_id || ''),
      className: r.class_name || r.room_name,
      password: r.passcode || '',
      type: r.room_type === 'exam' ? 'exam' : 'lab',
      title: r.room_name,
      durationMinutes: r.duration_minutes || 60,
      status: mappedStatus,
      createdAt: r.created_at || '',
      proctoringConfig: { lockdownFullscreen: false, aiFaceDetection: false, aiObjectDetection: false, allowTabSwitch: true },
      attendees: [],
    };
  });
}

export default function InstructorClassManagerView() {
  const searchParams = useSearchParams();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'students' | 'labs' | 'exams'>('students');
  const [searchStudent, setSearchStudent] = useState('');
  const [createdRooms, setCreatedRooms] = useState<RoomSession[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Trạng thái tải dữ liệu từ Backend
  const [isLoadingClasses, setIsLoadingClasses] = useState<boolean>(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState<boolean>(false);

  // Tìm kiếm sinh viên hệ thống khi thêm vào lớp
  const [systemStudentSuggestions, setSystemStudentSuggestions] = useState<any[]>([]);
  const [isSearchingSystem, setIsSearchingSystem] = useState<boolean>(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Tải danh sách Sinh viên và Phòng Lab/Thi của lớp học phần được chọn
  const loadClassDetails = useCallback(async (targetClassId: string) => {
    if (!targetClassId) return;
    setIsLoadingDetails(true);
    try {
      const [studentsRes, roomsRes] = await Promise.all([
        fetchWithAuth<any[]>(`/api/v1/classes/${encodeURIComponent(targetClassId)}/students`).catch(() => []),
        fetchWithAuth<{ labs: ClassLab[]; exams: ClassExam[] }>(`/api/v1/classes/${encodeURIComponent(targetClassId)}/rooms`).catch(() => ({ labs: [], exams: [] })),
      ]);

      const mappedStudents: StudentRow[] = (studentsRes || []).map((s: any) => ({
        id: s.student_id || s.username || String(s.user_id),
        name: s.full_name || s.username,
        email: s.email || '',
        status: 'Đang học',
      }));

      setClasses((prev) =>
        prev.map((c) => {
          if (c.id === targetClassId) {
            return {
              ...c,
              students: mappedStudents,
              studentCount: mappedStudents.length,
              labs: roomsRes?.labs || [],
              exams: roomsRes?.exams || [],
            };
          }
          return c;
        })
      );
    } catch (err) {
      console.error('Lỗi tải thông tin chi tiết lớp học:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  // 1. Tải danh sách lớp học phần từ Backend API thật
  useEffect(() => {
    let isCancelled = false;

    async function loadInstructorClasses() {
      setIsLoadingClasses(true);
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
        if (isCancelled) return;

        if (Array.isArray(data)) {
          const mapped: ClassRow[] = data.map((c) => ({
            id: c.class_code || String(c.class_id),
            name: c.class_name,
            semester: c.semester || 'HK1 2026–2027',
            startDate: '05/09/2026',
            endDate: '15/01/2027',
            status: 'Hoạt động',
            studentCount: c.student_count || 0,
            lecturer: c.instructor_name || 'TS. Huỳnh Bá Diệu',
            students: [],
            labs: [],
            exams: [],
          }));

          setClasses((prev) => {
            return mapped.map((m) => {
              const existing = prev.find((p) => p.id === m.id);
              return {
                ...m,
                students: existing?.students?.length ? existing.students : m.students,
                studentCount: existing?.students?.length ? existing.students.length : m.studentCount,
                labs: existing?.labs?.length ? existing.labs : m.labs,
                exams: existing?.exams?.length ? existing.exams : m.exams,
              };
            });
          });

          // Nhận diện lớp cần chọn ưu tiên từ URL param hoặc mặc định lớp đầu tiên
          const paramClass = searchParams?.get('created') || searchParams?.get('class');
          let activeId = '';
          if (paramClass && mapped.some((x) => x.id.toLowerCase() === paramClass.toLowerCase())) {
            const matched = mapped.find((x) => x.id.toLowerCase() === paramClass.toLowerCase());
            activeId = matched?.id || mapped[0]?.id || '';
          } else if (mapped.length > 0) {
            activeId = mapped[0].id;
          }

          if (activeId) {
            setSelectedClassId(activeId);
            loadClassDetails(activeId);
          }
        }

        // Đồng bộ danh sách phòng thực tế từ backend
        const syncRooms = async () => {
          try {
            const apiRooms = await fetchWithAuth<any[]>('/api/v1/rooms');
            if (!isCancelled && Array.isArray(apiRooms)) {
              setCreatedRooms(mapApiRoomsToSessions(apiRooms));
            }
          } catch (error) {
            console.error('Không thể tải phòng từ máy chủ:', error);
            setCreatedRooms([]);
          }
        };

        await syncRooms();
      } catch (err: any) {
        console.error('Lỗi khi tải danh sách lớp học phần:', err);
        showToast(err.message || 'Không thể kết nối CSDL lớp học phần');
      } finally {
        if (!isCancelled) setIsLoadingClasses(false);
      }
    }

    loadInstructorClasses();

    // Lắng nghe thay đổi storage và định kỳ đồng bộ trạng thái phòng
    const syncRoomsFromAllSources = async () => {
      try {
        const apiRooms = await fetchWithAuth<any[]>('/api/v1/rooms');
        if (!isCancelled && Array.isArray(apiRooms)) {
          setCreatedRooms(mapApiRoomsToSessions(apiRooms));
        }
      } catch (error) {
        console.error('Không thể đồng bộ phòng từ máy chủ:', error);
        if (!isCancelled) setCreatedRooms([]);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', syncRoomsFromAllSources);
      const pollInterval = window.setInterval(syncRoomsFromAllSources, 4000);
      return () => {
        isCancelled = true;
        window.removeEventListener('storage', syncRoomsFromAllSources);
        window.clearInterval(pollInterval);
      };
    }

    return () => {
      isCancelled = true;
    };
  }, [searchParams, loadClassDetails]);

  // 2. Tải chi tiết khi người dùng chủ động click chọn lớp học phần khác
  useEffect(() => {
    if (selectedClassId) {
      loadClassDetails(selectedClassId);
    }
  }, [selectedClassId, loadClassDetails]);

  // Tìm kiếm lớp học phần trong danh sách phụ trách
  const [searchClass, setSearchClass] = useState('');

  // Modal thêm sinh viên vào lớp
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');

  // Modal xác nhận xóa sinh viên khỏi lớp
  const [deletingStudent, setDeletingStudent] = useState<StudentRow | null>(null);

  // Lọc danh sách lớp theo ô tìm kiếm
  const filteredClasses = useMemo(() => {
    return classes.filter(
      (c) =>
        c.id.toLowerCase().includes(searchClass.toLowerCase()) ||
        c.name.toLowerCase().includes(searchClass.toLowerCase())
    );
  }, [classes, searchClass]);

  // Lớp hiện tại đang được chọn
  const currentClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || classes[0] || null;
  }, [classes, selectedClassId]);

  // Kiểm tra phòng ca học đang mở hoặc phòng chờ của lớp hiện tại
  const isTerminalStatus = (status?: string) => {
    const s = String(status || '').toLowerCase().trim();
    return ['ended', 'completed', 'da_dong', 'da_huy', 'da_ket_thuc', 'closed', 'cancelled'].includes(s);
  };

  const isClassMatch = (roomClassId?: string, classId?: string) => {
    if (!roomClassId || !classId) return false;
    const c1 = roomClassId.replace(/[\s\-_]/g, '').toUpperCase();
    const c2 = classId.replace(/[\s\-_]/g, '').toUpperCase();
    return c1 === c2 || roomClassId.toUpperCase() === classId.toUpperCase();
  };

  const activeRoomForCurrentClass = useMemo(() => {
    if (!currentClass) return null;
    return createdRooms.find(
      (r) =>
        isClassMatch(r.classId, currentClass.id) &&
        (r.status === 'in_progress' || (r.status as string) === 'dang_dien_ra') &&
        !isTerminalStatus(r.status)
    ) || null;
  }, [createdRooms, currentClass]);

  const waitingRoomForCurrentClass = useMemo(() => {
    if (!currentClass) return null;
    return createdRooms.find(
      (r) =>
        isClassMatch(r.classId, currentClass.id) &&
        (r.status === 'waiting' || r.status === 'chua_mo' || r.status === 'scheduled') &&
        !isTerminalStatus(r.status)
    ) || null;
  }, [createdRooms, currentClass]);

  // Sinh viên sau khi lọc tìm kiếm
  const filteredStudents = useMemo(() => {
    if (!currentClass?.students) return [];
    return currentClass.students.filter(
      (s) =>
        s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
        s.id.toLowerCase().includes(searchStudent.toLowerCase()) ||
        s.email.toLowerCase().includes(searchStudent.toLowerCase())
    );
  }, [currentClass, searchStudent]);

  // Tự động tìm kiếm gợi ý sinh viên trong hệ thống khi nhập MSSV
  const handleStudentIdChange = (val: string) => {
    setNewStudentId(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const trimmed = val.trim();
    if (trimmed.length < 2 || !currentClass) {
      setSystemStudentSuggestions([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setIsSearchingSystem(true);
      try {
        const results = await fetchWithAuth<any[]>(
          `/api/v1/classes/students/search?q=${encodeURIComponent(trimmed)}&class_id=${encodeURIComponent(currentClass.id)}&limit=5`
        );
        setSystemStudentSuggestions(results || []);
      } catch {
        setSystemStudentSuggestions([]);
      } finally {
        setIsSearchingSystem(false);
      }
    }, 300);
  };

  const handleSelectSuggestion = (student: any) => {
    setNewStudentId(student.student_id || student.username);
    setNewStudentName(student.full_name);
    setNewStudentEmail(student.email);
    setSystemStudentSuggestions([]);
  };

  // Thao tác: Thêm sinh viên mới qua API Backend
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId.trim() || !newStudentName.trim() || !currentClass) return;

    setIsSubmittingStudent(true);
    try {
      await fetchWithAuth(`/api/v1/classes/${encodeURIComponent(currentClass.id)}/students`, {
        method: 'POST',
        body: JSON.stringify({
          student_user_id: newStudentId.trim(),
          student_name: newStudentName.trim(),
          email: newStudentEmail.trim() || undefined,
          status: 'dang_hoc',
        }),
      });

      const newStudent: StudentRow = {
        id: newStudentId.trim().toUpperCase(),
        name: newStudentName.trim(),
        email: newStudentEmail.trim(),
        status: 'Đang học',
      };

      setClasses((prev) =>
        prev.map((c) => {
          if (c.id !== currentClass.id) return c;
          const updatedStudents = [newStudent, ...(c.students || []).filter((s) => s.id !== newStudent.id)];
          return {
            ...c,
            studentCount: updatedStudents.length,
            students: updatedStudents,
          };
        })
      );

      loadClassDetails(currentClass.id);
      showToast(`Đã thêm sinh viên ${newStudent.name} (${newStudent.id}) vào lớp!`);
      setNewStudentId('');
      setNewStudentName('');
      setNewStudentEmail('');
      setSystemStudentSuggestions([]);
      setIsAddStudentOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Không thể thêm sinh viên vào lớp');
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  const handleDeleteRoomItem = async (roomCode: string, title: string) => {
    if (
      !window.confirm(
        `Giảng viên có chắc chắn muốn xóa phòng thi [${roomCode}] (${title}) khỏi hệ thống?\nToàn bộ dữ liệu phiên thi sẽ bị xóa vĩnh viễn khỏi CSDL.`
      )
    ) {
      return;
    }
    try {
      await fetchWithAuth(`/api/v1/rooms/by-code/${encodeURIComponent(roomCode)}`, { method: 'DELETE' });

      setClasses((prev) =>
        prev.map((c) => {
          if (!currentClass || c.id !== currentClass.id) return c;
          return {
            ...c,
            labs: (c.labs || []).filter((l) => l.roomCode?.toLowerCase() !== roomCode.toLowerCase()),
            exams: (c.exams || []).filter((e) => e.roomCode?.toLowerCase() !== roomCode.toLowerCase()),
          };
        })
      );
      showToast(`Đã xóa thành công phòng thi ${roomCode}!`);
    } catch (err: any) {
      console.error('Lỗi khi xóa ca thi:', err);
      showToast(err?.message || 'Không thể xóa phòng');
    }
  };

  // Thao tác: Xóa sinh viên khỏi lớp học phần qua API Backend
  const handleConfirmDeleteStudent = async () => {
    if (!deletingStudent || !currentClass) return;
    const targetStudent = deletingStudent;

    try {
      await fetchWithAuth(
        `/api/v1/classes/${encodeURIComponent(currentClass.id)}/students/${encodeURIComponent(targetStudent.id)}`,
        {
          method: 'DELETE',
        }
      );

      setClasses((prev) =>
        prev.map((c) => {
          if (c.id !== currentClass.id) return c;
          const newStudents = (c.students || []).filter((s) => s.id !== targetStudent.id);
          return {
            ...c,
            studentCount: Math.max(0, newStudents.length),
            students: newStudents,
          };
        })
      );

      loadClassDetails(currentClass.id);
      showToast(`Đã xóa sinh viên ${targetStudent.name} (${targetStudent.id}) khỏi lớp ${currentClass.id}!`);
      setDeletingStudent(null);
    } catch (err: any) {
      showToast(err.message || 'Không thể xóa sinh viên');
    }
  };

  // Thao tác: Xuất file CSV danh sách sinh viên lớp học phần
  const handleExportStudentsCsv = () => {
    if (!currentClass) return;
    const headers = ['STT', 'Mã Sinh Viên (MSSV)', 'Họ và Tên', 'Email Sinh Viên'];
    const rows = (currentClass.students || []).map((s, idx) => {
      return [idx + 1, s.id, `"${s.name}"`, s.email].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DanhSachSV_${currentClass.id}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Đã xuất danh sách sinh viên lớp ${currentClass.id}!`);
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8 text-slate-800 dark:text-slate-200">
      {/* Toast thông báo phong cách Học thuật */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-md border border-slate-300 border-l-4 border-l-slate-900 dark:border-l-white bg-white px-4 py-3 text-xs shadow-lg dark:border-white/10 dark:border-l-[#fca5a5] dark:bg-neutral-900"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-200 shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-serif text-xs font-bold text-[#2A282D] dark:text-white">Thông báo</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">{toastMessage}</p>
          </div>
        </aside>
      )}

      {/* ── 1. HEADER BAR CHUYÊN BIỆT GIẢNG VIÊN ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-300 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Lớp Học Phần &amp; Sinh Viên
            </h1>
            <span className="rounded border border-slate-300 bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:border-white/20 dark:bg-white/10 dark:text-slate-200">
              {isLoadingClasses ? 'Đang tải...' : `${classes.length} Lớp Phụ Trách`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý các lớp học phần được phân công giảng dạy, tạo bài thực hành Lab, đề kiểm tra và điểm danh sinh viên.
          </p>
        </div>
      </div>

      {/* ── 2. KHU VỰC CHÍNH: CỘT CHỌN LỚP PHỤ TRÁCH + CỘT KHÔNG GIAN LỚP HỌC ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        {/* CỘT TRÁI (4 Cột): DANH SÁCH LỚP PHỤ TRÁCH CỦA GIẢNG VIÊN */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4">
          <div className="rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
                Lớp học phần ({classes.length})
              </span>
              <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">Phân công</span>
            </div>

            {/* Ô TÌM KIẾM LỚP HỌC PHẦN */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Tìm mã hoặc tên lớp học..."
                value={searchClass}
                onChange={(e) => setSearchClass(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.04] pl-9 pr-3.5 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none transition focus:border-slate-600 focus:bg-white dark:focus:bg-neutral-900 placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              {isLoadingClasses ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-900 dark:text-white" />
                  <span>Đang tải danh sách lớp học...</span>
                </div>
              ) : filteredClasses.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Không tìm thấy lớp học phần phù hợp.
                </div>
              ) : (
                filteredClasses.map((c) => {
                  const isSelected = c.id === selectedClassId;
                  const labCount = c.labs?.length || 0;
                  const examCount = c.exams?.length || 0;

                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedClassId(c.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedClassId(c.id);
                        }
                      }}
                      aria-pressed={isSelected}
                      className={`rounded-md border p-3.5 transition cursor-pointer space-y-2 focus-visible:outline-none ${
                        isSelected
                          ? 'border-brand bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10 shadow-2xs'
                          : 'border-slate-300 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span
                            className={`shrink-0 font-mono tabular-nums text-xs font-bold px-2 py-0.5 rounded ${
                              isSelected
                                ? 'bg-brand text-white'
                                : 'bg-slate-50 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10'
                            }`}
                          >
                            {c.id}
                          </span>
                          <h3 className="min-w-0 flex-1 truncate font-serif font-bold text-slate-900 dark:text-white text-xs sm:text-[13px] leading-normal">
                            {c.name}
                          </h3>
                        </div>

                        {(() => {
                          const activeForC = createdRooms.find(
                            (r) =>
                              isClassMatch(r.classId, c.id) &&
                              (r.status === 'in_progress' || (r.status as string) === 'dang_dien_ra') &&
                              !isTerminalStatus(r.status)
                          );
                          const waitingForC = createdRooms.find(
                            (r) =>
                              isClassMatch(r.classId, c.id) &&
                              (r.status === 'waiting' || r.status === 'chua_mo' || r.status === 'scheduled') &&
                              !isTerminalStatus(r.status)
                          );
                          if (activeForC) {
                            return (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700 px-2 py-0.5 font-mono text-[10.5px] font-bold">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Đang Live
                              </span>
                            );
                          }
                          if (waitingForC) {
                            return (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700 px-2 py-0.5 font-mono text-[10.5px] font-bold">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                Phòng Chờ
                              </span>
                            );
                          }
                          return <ClassStatusBadge status={c.status} />;
                        })()}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-300 dark:border-white/10">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
                            {c.studentCount}
                          </strong>{' '}
                          sinh viên
                        </span>
                        <span className="font-mono text-[11px]">
                          {labCount} Lab • {examCount} Thi
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Thông báo phân quyền */}
            <div className="rounded-md border border-slate-300 bg-slate-50/60 dark:border-white/10 dark:bg-white/[0.02] p-3 text-[11px] leading-relaxed text-slate-500 flex items-start gap-2">
              <GraduationCap className="h-4 w-4 text-brand-600 dark:text-brand-200 shrink-0 mt-0.5" />
              <span>
                Bạn chỉ quản lý các lớp học phần được Khoa/Admin phân công. Mọi bài Lab và Kiểm tra tạo tại đây sẽ tự động thuộc lớp này.
              </span>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (8 Cột): CHI TIẾT LỚP ĐƯỢC CHỌN (3 TAB: SINH VIÊN, LABS, EXAMS) */}
        <div className="min-w-0 lg:col-span-8 space-y-4">
          {!currentClass ? (
            <div className="rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 p-8 text-center text-xs text-slate-500">
              {isLoadingClasses ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-900 dark:text-white" />
                  <span>Đang tải thông tin lớp học...</span>
                </div>
              ) : (
                <span>Chưa có lớp học phần nào được phân công cho bạn. Vui lòng liên hệ Admin.</span>
              )}
            </div>
          ) : (
            <>
              {/* Card Header Lớp học */}
              <div className="rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 p-5 shadow-2xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono tabular-nums text-xs font-bold bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-200 px-2.5 py-0.5 rounded border border-slate-300 dark:border-white/10">
                        {currentClass.id}
                      </span>
                      <h2 className="font-serif text-lg font-bold text-slate-900 dark:text-white">{currentClass.name}</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Giảng viên: <strong className="text-slate-800 dark:text-slate-200">{currentClass.lecturer}</strong> • Học kỳ: {currentClass.semester} • Sĩ số: <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{currentClass.studentCount} SV</strong>
                    </p>
                  </div>

                  {/* Tạo phòng và truy cập phòng hiện có: Tuân thủ nghiêm ngặt 3 trạng thái của vòng đời lớp */}
                  <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:w-auto">

                    {activeRoomForCurrentClass ? (
                      /* Trạng thái 3: ĐANG CÓ PHIÊN LIVE - Chỉ hiển thị nút Giám Sát, ẩn nút Tạo Phòng & Vào Phòng Chờ */
                      <Link
                        href={`/instructor/monitoring?room=${encodeURIComponent(activeRoomForCurrentClass.id)}`}
                        className="system-primary-action inline-flex h-9 w-full sm:w-auto items-center justify-center gap-2 rounded-md bg-emerald-700 hover:bg-emerald-800 px-4 text-xs font-bold text-white shadow-2xs transition whitespace-nowrap cursor-pointer shrink-0"
                      >
                        <Video className="h-3.5 w-3.5 shrink-0" />
                        <span>Giám Sát ({activeRoomForCurrentClass.id})</span>
                      </Link>
                    ) : waitingRoomForCurrentClass ? (
                      /* Trạng thái 2: ĐANG CÓ PHÒNG CHỜ - Chỉ hiển thị nút Vào Phòng Chờ (ẩn nút Tạo Phòng) */
                      <Link
                        href={`/instructor/room/${encodeURIComponent(waitingRoomForCurrentClass.id)}`}
                        className="system-primary-action inline-flex h-9 w-full sm:w-auto items-center justify-center gap-2 rounded-md bg-blue-700 hover:bg-blue-800 px-4 text-xs font-bold text-white shadow-2xs transition whitespace-nowrap cursor-pointer shrink-0"
                      >
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span>Mở Phòng ({waitingRoomForCurrentClass.id})</span>
                      </Link>
                    ) : (
                      /* Trạng thái 1: TRỐNG / PHIÊN LIVE CŨ ĐÃ KẾT THÚC - Hiển thị nút Tạo Phòng để mở buổi tiếp theo */
                      <Link
                        href={`/instructor/room?class=${encodeURIComponent(currentClass.id)}`}
                        className="system-primary-action inline-flex h-9 w-full sm:w-auto items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800 whitespace-nowrap cursor-pointer shrink-0"
                      >
                        <Radio className="h-3.5 w-3.5 shrink-0" />
                        <span>Tạo Phòng</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Thanh tiêu đề danh sách sinh viên + lối tắt sang Lịch */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-300 dark:border-white/10 pt-2 pb-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('students')}
                    aria-pressed={activeTab === 'students'}
                    className="system-selected-tab flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs font-bold transition-colors cursor-pointer border-b-2"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Danh Sách Sinh Viên ({currentClass.students?.length || 0})</span>
                  </button>

                  <Link
                    href="/instructor/schedules"
                    className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white transition"
                  >
                    <span>Xem lịch của lớp →</span>
                  </Link>
                </div>
              </div>

              {/* ── TAB 1: DANH SÁCH SINH VIÊN ── */}
              {activeTab === 'students' && (
                <div className="rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Tìm theo MSSV hoặc họ tên..."
                        value={searchStudent}
                        onChange={(e) => setSearchStudent(e.target.value)}
                        className="h-9 w-full rounded-md border border-slate-300 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.04] pl-9 pr-3.5 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none transition focus:border-slate-600 focus:bg-white dark:focus:bg-neutral-900 placeholder:text-slate-500"
                      />
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleExportStudentsCsv}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition cursor-pointer"
                        title="Xuất file CSV danh sách sinh viên"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Xuất CSV</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsAddStudentOpen(true)}
                        className="system-primary-action inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-4 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800 cursor-pointer"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Thêm Sinh Viên</span>
                      </button>
                    </div>
                  </div>

                  {/* Bảng Sinh viên */}
                  <div className="max-h-[65vh] overflow-auto rounded-md border border-slate-300 dark:border-white/10">
                    <table className="w-full min-w-[680px] text-left text-xs text-slate-700 dark:text-slate-300">
                      <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-neutral-950 border-b border-slate-300 dark:border-white/10 text-slate-500 uppercase font-mono font-bold text-[10px] tracking-wider">
                        <tr>
                          <th className="px-4 py-3 w-12 text-center">STT</th>
                          <th className="px-4 py-3">MSSV</th>
                          <th className="px-4 py-3">Họ và Tên</th>
                          <th className="px-4 py-3">Email Sinh Viên</th>
                          <th className="px-4 py-3 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 dark:divide-white/10 font-sans">
                        {isLoadingDetails ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-slate-500">
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-slate-900 dark:text-white" />
                                <span>Đang tải danh sách sinh viên...</span>
                              </div>
                            </td>
                          </tr>
                        ) : filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-slate-500">
                              <div className="flex flex-col items-center gap-2">
                                <Users className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                                <span>Không tìm thấy sinh viên nào trong lớp này.</span>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((st, idx) => (
                            <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition">
                              <td className="px-4 py-3 text-center font-mono font-medium tabular-nums text-slate-500">{idx + 1}</td>
                              <td className="px-4 py-3 font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">{st.id}</td>
                              <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{st.name}</td>
                              <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{st.email}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setDeletingStudent(st)}
                                  className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 bg-slate-100 px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                                  title={`Xóa sinh viên ${st.name} khỏi lớp`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Xóa</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB 2: BÀI THỰC HÀNH LAB (CHẾ ĐỘ MỞ - TỰ DO TRA CỨU) ── */}
              {activeTab === 'labs' && (
                <div className="rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-300 dark:border-white/10">
                    <div>
                      <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Danh Sách Bài Thực Hành Lab ({currentClass.labs?.length || 0})
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Chế độ Lab: Cho phép tra cứu tài liệu, không phạt rời tab, camera tùy chọn theo GV.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {isLoadingDetails ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-900 dark:text-white" />
                        <span>Đang tải danh sách bài thực hành...</span>
                      </div>
                    ) : (currentClass.labs || []).length === 0 ? (
                      <div className="flex flex-col items-center gap-2 rounded-md bg-slate-50/60 dark:bg-white/[0.02] py-10 text-center text-xs text-slate-500">
                        <Code2 className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                        <span>Lớp chưa có buổi thực hành nào.</span>
                      </div>
                    ) : (
                      currentClass.labs?.map((lab) => (
                        <div
                          key={lab.id}
                          className="rounded-md border border-slate-300 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.02] p-4 space-y-2.5 transition hover:bg-slate-50/70 dark:hover:bg-white/[0.04]"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 uppercase tracking-wider">
                                Lab {lab.labNumber < 10 ? `0${lab.labNumber}` : lab.labNumber}
                              </span>
                              <h4 className="font-serif font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{lab.title}</h4>
                            </div>

                            <span
                              className="self-start rounded px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider border border-slate-300 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                            >
                              {lab.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-1 border-t border-slate-300 dark:border-white/10">
                            <span>Ngôn ngữ: <strong className="text-slate-800 dark:text-slate-200">{lab.language}</strong></span>
                            <span>•</span>
                            <span>Số bài đã nộp: <strong className="font-mono tabular-nums text-slate-800 dark:text-slate-200">{lab.submissionCount}/{currentClass.studentCount} SV</strong></span>
                            <span>•</span>
                            <span>Mã phòng: <code className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">{lab.roomCode}</code></span>
                            {lab.roomPassword && (
                              <>
                                <span>•</span>
                                <span>Mã PIN: <code className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">{lab.roomPassword}</code></span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-800 dark:text-slate-200">
                              <ShieldCheck className="h-3 w-3" />
                              Chế độ Lab (Không AI, không phạt rời tab)
                            </span>

                            <div className="flex items-center gap-2">
                              {lab.status === 'Đang mở' ? (
                                <Link
                                  href={`/instructor/monitoring?room=${encodeURIComponent(lab.roomCode || lab.id)}`}
                                  className="system-primary-action inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-[11px] font-bold text-white hover:bg-slate-800 transition"
                                >
                                  <Video className="h-3 w-3" />
                                  <span>Vào Phòng Giám Sát</span>
                                </Link>
                              ) : (
                                <span
                                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-100 dark:bg-white/[0.06] px-2.5 text-[11px] font-medium text-slate-500 border border-slate-200 dark:border-white/10"
                                  title="Lab chưa mở - Chỉ có thể vào giám sát khi đã mở ca"
                                >
                                  <Lock className="h-3 w-3" />
                                  <span>{lab.status}</span>
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteRoomItem(lab.roomCode || lab.id, lab.title)}
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition cursor-pointer"
                                title="Xóa buổi thực hành này khỏi lớp"
                              >
                                <Trash2 className="h-3 w-3 text-slate-500" />
                                <span>Xóa</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 3: BÀI KIỂM TRA & THI (CHẾ ĐỘ KHÓA MÀN HÌNH & AI PROCTORING) ── */}
              {activeTab === 'exams' && (
                <div className="rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-300 dark:border-white/10">
                    <div>
                      <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Danh Sách Bài Kiểm Tra &amp; Thi ({currentClass.exams?.length || 0})
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Chế độ Exam: Bắt buộc Khóa màn hình (Lockdown), Camera AI nhận diện gian lận.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {isLoadingDetails ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-900 dark:text-white" />
                        <span>Đang tải danh sách bài kiểm tra...</span>
                      </div>
                    ) : (currentClass.exams || []).length === 0 ? (
                      <div className="flex flex-col items-center gap-2 rounded-md bg-slate-50/60 dark:bg-white/[0.04] py-10 text-center text-xs text-slate-500">
                        <FileCode2 className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                        <span>Lớp chưa có bài kiểm tra nào.</span>
                      </div>
                    ) : (
                      currentClass.exams?.map((exam) => (
                        <div
                          key={exam.id}
                          className="rounded-md border border-slate-300 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.02] p-4 space-y-2.5 transition hover:bg-slate-50/70 dark:hover:bg-white/[0.04]"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 uppercase tracking-wider">
                                {exam.type}
                              </span>
                              <h4 className="font-serif font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{exam.title}</h4>
                            </div>

                            <span
                              className="self-start rounded px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider border border-slate-300 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                            >
                              {exam.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-1 border-t border-slate-300 dark:border-white/10">
                            <span>Thời lượng: <strong className="font-mono text-slate-800 dark:text-slate-200">{exam.durationMinutes} phút</strong></span>
                            <span>•</span>
                            <span>Mã phòng: <code className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">{exam.roomCode}</code></span>
                            {exam.roomPassword && (
                              <>
                                <span>•</span>
                                <span>Mã PIN: <code className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">{exam.roomPassword}</code></span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                              <ShieldAlert className="h-3 w-3" />
                              Khóa màn hình &amp; AI Proctoring
                            </span>

                            <div className="flex items-center gap-2">
                              <Link
                                href="/instructor/reports"
                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 px-2.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition"
                              >
                                <BookOpen className="h-3 w-3" />
                                <span>Báo Cáo Điểm</span>
                              </Link>

                              {exam.status === 'Đang diễn ra' ? (
                                <Link
                                  href={`/instructor/monitoring?room=${encodeURIComponent(exam.roomCode || exam.id)}`}
                                  className="system-primary-action inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-[11px] font-bold text-white hover:bg-slate-800 transition"
                                >
                                  <Video className="h-3 w-3" />
                                  <span>Giám Sát AI</span>
                                </Link>
                              ) : (
                                <span
                                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-100 dark:bg-white/[0.06] px-2.5 text-[11px] font-medium text-slate-500 border border-slate-200 dark:border-white/10"
                                  title="Bài kiểm tra chưa diễn ra - Chỉ có thể vào giám sát khi ca thi đã mở"
                                >
                                  <Lock className="h-3 w-3" />
                                  <span>{exam.status}</span>
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteRoomItem(exam.roomCode || exam.id, exam.title)}
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition cursor-pointer"
                                title="Xóa kỳ thi này khỏi lớp"
                              >
                                <Trash2 className="h-3 w-3 text-slate-500" />
                                <span>Xóa</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── 3. MODAL THÊM SINH VIÊN VÀO LỚP ── */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-slate-900 dark:text-white" />
                <h3 className="font-serif text-base font-bold text-slate-900 dark:text-white">Thêm Sinh Viên Vào Lớp</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddStudentOpen(false);
                  setSystemStudentSuggestions([]);
                }}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3.5 text-xs">
              <div className="relative">
                <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Mã số sinh viên (MSSV) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="VD: 29211200333 hoặc SV2026001"
                    value={newStudentId}
                    onChange={(e) => handleStudentIdChange(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-950 px-3 pr-8 text-xs font-mono tabular-nums text-slate-800 dark:text-slate-200 outline-none transition focus:border-slate-600"
                  />
                  {isSearchingSystem && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-slate-500" />
                  )}
                </div>

                {/* Gợi ý sinh viên từ CSDL hệ thống */}
                {systemStudentSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-xl overflow-hidden divide-y divide-slate-300 dark:divide-white/10">
                    <div className="p-2 font-mono text-[10px] uppercase font-bold text-slate-500 bg-slate-50 dark:bg-white/[0.02]">
                      Sinh viên tìm thấy trong hệ thống:
                    </div>
                    {systemStudentSuggestions.map((st) => (
                      <button
                        key={st.user_id}
                        type="button"
                        onClick={() => handleSelectSuggestion(st)}
                        className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-white/10 flex items-center justify-between text-xs transition cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {st.full_name} <span className="font-mono text-slate-900 dark:text-white">({st.student_id || st.username})</span>
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">{st.email}</div>
                        </div>
                        {st.is_enrolled ? (
                          <span className="text-[10px] text-slate-500 font-bold">Đã có trong lớp</span>
                        ) : (
                          <span className="text-[10px] text-slate-900 dark:text-white font-bold">Chọn</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Họ và tên sinh viên *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Hoàng Đình Khôi"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-950 px-3 text-xs text-slate-800 dark:text-slate-200 outline-none transition focus:border-slate-600"
                />
              </div>

              <div>
                <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Email sinh viên (Tùy chọn)
                </label>
                <input
                  type="email"
                  placeholder="VD: 29211200333@dtu.edu.vn"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-950 px-3 text-xs text-slate-800 dark:text-slate-200 outline-none transition focus:border-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-300 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddStudentOpen(false);
                    setSystemStudentSuggestions([]);
                  }}
                  className="inline-flex h-9 items-center rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] px-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStudent}
                  className="system-primary-action inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-900 px-4 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingStudent && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isSubmittingStudent ? 'Đang thêm...' : 'Thêm Vào Lớp'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 4. MODAL XÁC NHẬN XÓA SINH VIÊN KHỎI LỚP ── */}
      {deletingStudent && currentClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-serif text-sm font-bold text-slate-900 dark:text-white">Xóa Sinh Viên Khỏi Lớp</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa sinh viên <strong className="text-slate-900 dark:text-white">{deletingStudent.name}</strong> (MSSV: <code className="font-mono font-bold text-slate-900 dark:text-white">{deletingStudent.id}</code>) khỏi lớp học phần <strong className="font-serif text-slate-900 dark:text-white">{currentClass.id} - {currentClass.name}</strong> không?
            </p>

            <div className="rounded-md border border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/5 p-3 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
              Sinh viên này sẽ không còn quyền truy cập vào các buổi thực hành Lab và bài Kiểm tra của lớp. Giảng viên vẫn có thể thêm lại bất cứ lúc nào qua MSSV.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-300 dark:border-white/10">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="inline-flex h-9 items-center rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] px-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="system-primary-action inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-2xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xác Nhận Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Badge trạng thái lớp học phần, đồng bộ với Admin ClassManagerView. */
function ClassStatusBadge({ status }: { status: ClassRow['status'] }) {
  const tone = 'border-slate-300 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300';
  const dotTone = 'bg-slate-400';

  return (
    <span
      className={`inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-1.5 text-[9px] font-bold leading-none ${tone}`}
      aria-label={`Trạng thái lớp: ${status}`}
      title={status}
    >
      <span className={`h-1 w-1 shrink-0 rounded-full ${dotTone}`} aria-hidden="true" />
      {status}
    </span>
  );
}
