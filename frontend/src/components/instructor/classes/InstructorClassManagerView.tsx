'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  INSTRUCTOR_ROOMS_STORAGE_KEY,
  RoomSession,
} from './types';
import { fetchWithAuth } from '@/services/apiClient';

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

          setClasses(mapped);

          // Nhận diện lớp cần chọn ưu tiên từ URL param hoặc mặc định lớp đầu tiên
          const paramClass = searchParams?.get('created') || searchParams?.get('class');
          if (paramClass && mapped.some((x) => x.id.toLowerCase() === paramClass.toLowerCase())) {
            const matched = mapped.find((x) => x.id.toLowerCase() === paramClass.toLowerCase());
            setSelectedClassId(matched?.id || mapped[0]?.id || '');
          } else if (mapped.length > 0) {
            setSelectedClassId(mapped[0].id);
          }
        }
      } catch (err: any) {
        console.error('Lỗi khi tải danh sách lớp học phần:', err);
        showToast(err.message || 'Không thể kết nối CSDL lớp học phần');
      } finally {
        if (!isCancelled) setIsLoadingClasses(false);
      }
    }

    loadInstructorClasses();

    // Lấy thông tin phòng ca học đang mở từ localStorage
    if (typeof window !== 'undefined') {
      try {
        const rawRooms = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
        if (rawRooms) {
          setCreatedRooms(JSON.parse(rawRooms));
        }

        const handleStorageChange = () => {
          const updated = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
          if (updated) {
            try {
              setCreatedRooms(JSON.parse(updated));
            } catch {}
          }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
      } catch {}
    }

    return () => {
      isCancelled = true;
    };
  }, [searchParams]);

  // 2. Tải danh sách Sinh viên và Phòng Lab/Thi khi chọn lớp học phần
  useEffect(() => {
    if (!selectedClassId) return;
    let isCancelled = false;

    async function loadClassDetails() {
      setIsLoadingDetails(true);
      try {
        const [studentsRes, roomsRes] = await Promise.all([
          fetchWithAuth<any[]>(`/api/v1/classes/${encodeURIComponent(selectedClassId)}/students`).catch(() => []),
          fetchWithAuth<{ labs: ClassLab[]; exams: ClassExam[] }>(`/api/v1/classes/${encodeURIComponent(selectedClassId)}/rooms`).catch(() => ({ labs: [], exams: [] })),
        ]);

        if (isCancelled) return;

        const mappedStudents: StudentRow[] = (studentsRes || []).map((s: any) => ({
          id: s.student_id || s.username || String(s.user_id),
          name: s.full_name || s.username,
          email: s.email || '',
          status: 'Đang học',
        }));

        setClasses((prev) =>
          prev.map((c) => {
            if (c.id === selectedClassId) {
              return {
                ...c,
                students: mappedStudents,
                studentCount: mappedStudents.length,
                labs: roomsRes.labs || [],
                exams: roomsRes.exams || [],
              };
            }
            return c;
          })
        );
      } catch (err) {
        console.error('Lỗi tải thông tin chi tiết lớp học:', err);
      } finally {
        if (!isCancelled) setIsLoadingDetails(false);
      }
    }

    loadClassDetails();
    return () => {
      isCancelled = true;
    };
  }, [selectedClassId]);

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
  const activeRoomForCurrentClass = useMemo(() => {
    if (!currentClass) return null;
    return createdRooms.find(
      (r) => r.classId.toUpperCase() === currentClass.id.toUpperCase() && r.status === 'in_progress'
    ) || null;
  }, [createdRooms, currentClass]);

  const waitingRoomForCurrentClass = useMemo(() => {
    if (!currentClass) return null;
    return createdRooms.find(
      (r) => r.classId.toUpperCase() === currentClass.id.toUpperCase() && r.status === 'waiting'
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
        email: newStudentEmail.trim() || `${newStudentId.trim().toLowerCase()}@dtu.edu.vn`,
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
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. HEADER BAR CHUYÊN BIỆT GIẢNG VIÊN ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Lớp Học Phần &amp; Sinh Viên
            </h1>
            <span className="rounded-full border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/15 px-2.5 py-1 text-[11px] font-bold text-blue-800 dark:text-blue-300">
              {isLoadingClasses ? 'Đang tải...' : `${classes.length} Lớp Phụ Trách`}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quản lý các lớp học phần được phân công giảng dạy, tạo bài thực hành Lab, đề kiểm tra và điểm danh sinh viên.
          </p>
        </div>
      </div>

      {/* ── 2. KHU VỰC CHÍNH: CỘT CHỌN LỚP PHỤ TRÁCH + CỘT KHÔNG GIAN LỚP HỌC ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        {/* CỘT TRÁI (4 Cột): DANH SÁCH LỚP PHỤ TRÁCH CỦA GIẢNG VIÊN */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4">
          <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-4 shadow-[0_2px_10px_rgba(15,23,42,0.02)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Lớp học phần của bạn ({classes.length})
              </span>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Được phân công</span>
            </div>

            {/* Ô TÌM KIẾM LỚP HỌC PHẦN */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Tìm mã hoặc tên lớp học..."
                value={searchClass}
                onChange={(e) => setSearchClass(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.04] pl-10 pr-3.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.06] focus:border-blue-500 focus:bg-white dark:focus:bg-[#121824] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              {isLoadingClasses ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <span>Đang tải danh sách lớp học...</span>
                </div>
              ) : filteredClasses.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
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
                      className={`rounded-xl border p-4 transition-colors cursor-pointer space-y-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-500/15 ring-1 ring-blue-500/20'
                          : 'border-transparent bg-slate-50/80 dark:bg-white/[0.04] hover:border-transparent hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span
                            className={`shrink-0 font-mono tabular-nums text-xs font-bold px-2.5 py-1 rounded-lg ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {c.id}
                          </span>
                          <h3 className="min-w-0 flex-1 truncate font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-[13px] leading-normal">
                            {c.name}
                          </h3>
                        </div>

                        <ClassStatusBadge status={c.status} />
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-white/5">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                          <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
                            {c.studentCount}
                          </strong>{' '}
                          sinh viên
                        </span>
                        <span>
                          {labCount} Lab • {examCount} Thi
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Thông báo phân quyền */}
            <div className="rounded-xl bg-slate-50/80 dark:bg-white/[0.04] p-3 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                Bạn chỉ quản lý các lớp học phần được Khoa/Admin phân công. Mọi bài Lab và Kiểm tra tạo tại đây sẽ tự động thuộc lớp này.
              </span>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (8 Cột): CHI TIẾT LỚP ĐƯỢC CHỌN (3 TAB: SINH VIÊN, LABS, EXAMS) */}
        <div className="min-w-0 lg:col-span-8 space-y-4">
          {!currentClass ? (
            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              {isLoadingClasses ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span>Đang tải thông tin lớp học...</span>
                </div>
              ) : (
                <span>Chưa có lớp học phần nào được phân công cho bạn. Vui lòng liên hệ Admin.</span>
              )}
            </div>
          ) : (
            <>
              {/* Card Header Lớp học */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)] space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono tabular-nums text-xs font-bold bg-blue-50 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-500/30">
                        {currentClass.id}
                      </span>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{currentClass.name}</h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Giảng viên: <strong className="text-slate-800 dark:text-slate-200">{currentClass.lecturer}</strong> • Học kỳ: {currentClass.semester} • Sĩ số: <strong className="font-mono tabular-nums text-blue-700 dark:text-blue-300">{currentClass.studentCount} SV</strong>
                    </p>
                  </div>

                  {/* Tạo phòng và truy cập phòng hiện có */}
                  <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:w-auto">
                    <Link
                      href={`/instructor/room?class=${encodeURIComponent(currentClass.id)}`}
                      className="inline-flex h-11 w-full sm:w-[195px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-[0.99] whitespace-nowrap cursor-pointer shrink-0"
                    >
                      <Radio className="h-4 w-4 animate-pulse shrink-0" />
                      <span>Tạo Phòng</span>
                    </Link>

                    {activeRoomForCurrentClass ? (
                      /* ĐÃ CÓ PHÒNG MỞ: Cho phép vào phòng giám sát trực tiếp */
                      <Link
                        href={`/instructor/monitoring?room=${encodeURIComponent(activeRoomForCurrentClass.id)}`}
                        className="inline-flex h-11 w-full sm:w-[195px] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white shadow-sm shadow-red-500/20 transition-all hover:bg-red-700 hover:shadow-sm active:scale-[0.99] whitespace-nowrap cursor-pointer shrink-0"
                      >
                        <Video className="h-4 w-4 shrink-0" />
                        <span>Giám Sát</span>
                      </Link>
                    ) : waitingRoomForCurrentClass ? (
                      /* ĐANG Ở PHÒNG CHỜ: Điểm danh và bấm Bắt đầu trước khi giám sát */
                      <Link
                        href={`/instructor/room/${encodeURIComponent(waitingRoomForCurrentClass.id)}`}
                        className="inline-flex h-11 w-full sm:w-[195px] items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-xs font-semibold text-white shadow-sm shadow-amber-500/20 transition-all hover:bg-amber-700 hover:shadow-sm active:scale-[0.99] whitespace-nowrap cursor-pointer shrink-0"
                      >
                        <Users className="h-4 w-4 shrink-0" />
                        <span>Vào Phòng Chờ</span>
                      </Link>
                    ) : null}
                  </div>
                </div>

                {/* 3 Tabs điều khiển */}
                <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-100 dark:border-white/5 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('students')}
                    aria-pressed={activeTab === 'students'}
                    className={`flex h-10 shrink-0 items-center gap-1.5 px-3 text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
                      activeTab === 'students'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Danh Sách Sinh Viên ({currentClass.students?.length || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('labs')}
                    aria-pressed={activeTab === 'labs'}
                    className={`flex h-10 shrink-0 items-center gap-1.5 px-3 text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
                      activeTab === 'labs'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Code2 className="h-4 w-4" />
                    <span>Bài Thực Hành ({currentClass.labs?.length || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('exams')}
                    aria-pressed={activeTab === 'exams'}
                    className={`flex h-10 shrink-0 items-center gap-1.5 px-3 text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
                      activeTab === 'exams'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <FileCode2 className="h-4 w-4" />
                    <span>Bài Kiểm Tra &amp; Thi ({currentClass.exams?.length || 0})</span>
                  </button>
                </div>
              </div>

              {/* ── TAB 1: DANH SÁCH SINH VIÊN ── */}
              {activeTab === 'students' && (
                <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-4 sm:p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        placeholder="Tìm theo MSSV hoặc họ tên..."
                        value={searchStudent}
                        onChange={(e) => setSearchStudent(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.04] pl-10 pr-3.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.06] focus:border-blue-500 focus:bg-white dark:focus:bg-[#121824] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleExportStudentsCsv}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="Xuất file CSV danh sách sinh viên"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Xuất CSV</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsAddStudentOpen(true)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-blue-700 cursor-pointer"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Thêm Sinh Viên</span>
                      </button>
                    </div>
                  </div>

                  {/* Bảng Sinh viên */}
                  <div className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200/90 dark:border-white/10">
                    <table className="w-full min-w-[680px] text-left text-xs text-slate-700 dark:text-slate-300">
                      <thead className="sticky top-0 z-10 bg-slate-50/80 dark:bg-white/[0.05] border-b border-slate-200/90 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                        <tr>
                          <th className="px-4 py-3.5 w-12 text-center">STT</th>
                          <th className="px-4 py-3.5">MSSV</th>
                          <th className="px-4 py-3.5">Họ và Tên</th>
                          <th className="px-4 py-3.5">Email Sinh Viên</th>
                          <th className="px-4 py-3.5 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-sans">
                        {isLoadingDetails ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-slate-400">
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                <span>Đang tải danh sách sinh viên...</span>
                              </div>
                            </td>
                          </tr>
                        ) : filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-slate-500 dark:text-slate-400">
                              <div className="flex flex-col items-center gap-2">
                                <Users className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                                <span>Không tìm thấy sinh viên nào trong lớp này.</span>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((st, idx) => (
                            <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.06] transition">
                              <td className="px-4 py-3.5 text-center font-medium tabular-nums text-slate-500 dark:text-slate-400">{idx + 1}</td>
                              <td className="px-4 py-3.5 font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">{st.id}</td>
                              <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-100">{st.name}</td>
                              <td className="px-4 py-3.5 text-[11px] text-slate-500 dark:text-slate-400">{st.email}</td>
                              <td className="px-4 py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setDeletingStudent(st)}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 px-2.5 text-[11px] font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors cursor-pointer"
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
                <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-4 sm:p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Danh Sách Bài Thực Hành Lab ({currentClass.labs?.length || 0})
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Chế độ Lab: Cho phép tra cứu tài liệu, không phạt rời tab, camera tùy chọn theo GV.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {isLoadingDetails ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        <span>Đang tải danh sách bài thực hành...</span>
                      </div>
                    ) : (currentClass.labs || []).length === 0 ? (
                      <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50/80 dark:bg-white/[0.04] py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                        <Code2 className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                        <span>Lớp chưa có buổi thực hành nào.</span>
                      </div>
                    ) : (
                      currentClass.labs?.map((lab) => (
                        <div
                          key={lab.id}
                          className="rounded-xl bg-slate-50/80 dark:bg-white/[0.04] p-4 space-y-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 px-2 py-1 text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                                Lab {lab.labNumber < 10 ? `0${lab.labNumber}` : lab.labNumber}
                              </span>
                              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">{lab.title}</h4>
                            </div>

                            <span
                              className={`self-start rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                                lab.status === 'Đang mở'
                                  ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                                  : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                              }`}
                            >
                              {lab.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-white/5">
                            <span>Ngôn ngữ: <strong className="text-slate-800 dark:text-slate-200">{lab.language}</strong></span>
                            <span>•</span>
                            <span>Số bài đã nộp: <strong className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{lab.submissionCount}/{currentClass.studentCount} SV</strong></span>
                            <span>•</span>
                            <span>Mã phòng: <code className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">{lab.roomCode}</code></span>
                            {lab.roomPassword && (
                              <>
                                <span>•</span>
                                <span>Mã PIN: <code className="font-mono tabular-nums font-bold text-blue-700 dark:text-blue-300">{lab.roomPassword}</code></span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-300">
                              <ShieldCheck className="h-3 w-3" />
                              Chế độ Lab (Không AI, không phạt rời tab)
                            </span>

                            <div className="flex items-center gap-2">
                              {lab.status === 'Đang mở' ? (
                                <Link
                                  href={`/instructor/monitoring?room=${encodeURIComponent(lab.roomCode || lab.id)}`}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-700 transition-colors"
                                >
                                  <Video className="h-3 w-3" />
                                  <span>Vào Phòng Giám Sát</span>
                                </Link>
                              ) : (
                                <span
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] px-2.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10"
                                  title="Lab chưa mở - Chỉ có thể vào giám sát khi đã mở ca"
                                >
                                  <Lock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                                  <span>{lab.status}</span>
                                </span>
                              )}
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
                <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121824] p-5 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Danh Sách Bài Kiểm Tra &amp; Thi ({currentClass.exams?.length || 0})
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Chế độ Exam: Bắt buộc Khóa màn hình (Lockdown), Camera AI nhận diện gian lận.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {isLoadingDetails ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        <span>Đang tải danh sách bài kiểm tra...</span>
                      </div>
                    ) : (currentClass.exams || []).length === 0 ? (
                      <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50/80 dark:bg-white/[0.04] py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                        <FileCode2 className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                        <span>Lớp chưa có bài kiểm tra nào.</span>
                      </div>
                    ) : (
                      currentClass.exams?.map((exam) => (
                        <div
                          key={exam.id}
                          className="rounded-xl bg-slate-50/80 dark:bg-white/[0.04] p-4 space-y-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 px-2 py-1 text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                                {exam.type}
                              </span>
                              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">{exam.title}</h4>
                            </div>

                            <span
                              className={`self-start rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                                exam.status === 'Đang diễn ra'
                                  ? 'bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30'
                                  : exam.status === 'Sắp diễn ra'
                                  ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                                  : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                              }`}
                            >
                              {exam.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-white/5">
                            <span>Thời lượng: <strong className="text-slate-800 dark:text-slate-200">{exam.durationMinutes} phút</strong></span>
                            <span>•</span>
                            <span>Mã phòng: <code className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">{exam.roomCode}</code></span>
                            {exam.roomPassword && (
                              <>
                                <span>•</span>
                                <span>Mã PIN: <code className="font-mono tabular-nums font-bold text-blue-700 dark:text-blue-300">{exam.roomPassword}</code></span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                              <ShieldAlert className="h-3 w-3" />
                              Khóa màn hình &amp; AI Proctoring
                            </span>

                            <div className="flex items-center gap-2">
                              <Link
                                href="/instructor/reports"
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121824] px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors"
                              >
                                <BookOpen className="h-3 w-3" />
                                <span>Báo Cáo Điểm</span>
                              </Link>

                              {exam.status === 'Đang diễn ra' ? (
                                <Link
                                  href={`/instructor/monitoring?room=${encodeURIComponent(exam.roomCode || exam.id)}`}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-[11px] font-semibold text-white hover:bg-red-700 transition-colors"
                                >
                                  <Video className="h-3 w-3" />
                                  <span>Giám Sát AI</span>
                                </Link>
                              ) : (
                                <span
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] px-2.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10"
                                  title="Bài kiểm tra chưa diễn ra - Chỉ có thể vào giám sát khi ca thi đã mở"
                                >
                                  <Lock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                                  <span>{exam.status}</span>
                                </span>
                              )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Thêm Sinh Viên Vào Lớp</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddStudentOpen(false);
                  setSystemStudentSuggestions([]);
                }}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3.5 text-xs">
              <div className="relative">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mã số sinh viên (MSSV) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="VD: 29211200333 hoặc SV2026001"
                    value={newStudentId}
                    onChange={(e) => handleStudentIdChange(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 pr-8 text-xs font-mono tabular-nums text-slate-800 dark:text-slate-200 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
                  />
                  {isSearchingSystem && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-slate-400" />
                  )}
                </div>

                {/* Gợi ý sinh viên từ CSDL hệ thống */}
                {systemStudentSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#182030] shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
                    <div className="p-2 text-[10px] uppercase font-bold text-slate-400 bg-slate-50 dark:bg-white/[0.02]">
                      Sinh viên tìm thấy trong hệ thống:
                    </div>
                    {systemStudentSuggestions.map((st) => (
                      <button
                        key={st.user_id}
                        type="button"
                        onClick={() => handleSelectSuggestion(st)}
                        className="w-full text-left p-2.5 hover:bg-blue-50 dark:hover:bg-blue-500/15 flex items-center justify-between text-xs transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {st.full_name} <span className="font-mono text-blue-600 dark:text-blue-400">({st.student_id || st.username})</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{st.email}</div>
                        </div>
                        {st.is_enrolled ? (
                          <span className="text-[10px] text-amber-600 font-semibold">Đã có trong lớp</span>
                        ) : (
                          <span className="text-[10px] text-blue-600 font-bold">Chọn</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Họ và tên sinh viên *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Hoàng Đình Khôi"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 text-xs text-slate-800 dark:text-slate-200 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Email sinh viên (Tùy chọn)
                </label>
                <input
                  type="email"
                  placeholder="VD: 29211200333@dtu.edu.vn"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 text-xs text-slate-800 dark:text-slate-200 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddStudentOpen(false);
                    setSystemStudentSuggestions([]);
                  }}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStudent}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121824] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Xóa Sinh Viên Khỏi Lớp</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa sinh viên <strong className="text-slate-900 dark:text-slate-100">{deletingStudent.name}</strong> (MSSV: <code className="font-mono font-bold text-slate-900 dark:text-slate-100">{deletingStudent.id}</code>) khỏi lớp học phần <strong className="text-blue-700 dark:text-blue-300">{currentClass.id} - {currentClass.name}</strong> không?
            </p>

            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/15 p-3 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              Sinh viên này sẽ không còn quyền truy cập vào các buổi thực hành Lab và bài Kiểm tra của lớp. Giảng viên vẫn có thể thêm lại bất cứ lúc nào qua MSSV.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer shadow-sm"
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
  const isNotOpened = status === 'Chưa mở';

  const tone = isNotOpened
    ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300';

  const dotTone = isNotOpened ? 'bg-amber-500' : 'bg-emerald-500';

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
