'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import {
  ClassRow,
  ClassLab,
  ClassExam,
  StudentRow,
  INSTRUCTOR_STORAGE_KEY,
  INSTRUCTOR_ROOMS_STORAGE_KEY,
  RoomSession,
} from './types';

// Danh sách các lớp học phần được phân công cho Giảng viên
const INSTRUCTOR_DEFAULT_CLASSES: ClassRow[] = [
  {
    id: 'CS101',
    name: 'Nhập môn Lập trình C/C++',
    semester: 'HK1 2026–2027',
    startDate: '05/09/2026',
    endDate: '15/01/2027',
    status: 'Hoạt động',
    studentCount: 48,
    lecturer: 'Thầy Nguyễn Văn Nam',
    students: [
      { id: 'SE184801', name: 'Nguyễn Văn An', email: 'an.nv@school.edu.vn', status: 'Đang học' },
      { id: 'SE184802', name: 'Trần Thị Bình', email: 'binh.tt@school.edu.vn', status: 'Đang học' },
      { id: 'SE184803', name: 'Lê Hoàng Cường', email: 'cuong.lh@school.edu.vn', status: 'Đang học' },
      { id: 'SE184804', name: 'Phạm Minh Châu', email: 'chau.pm@school.edu.vn', status: 'Đang học' },
      { id: 'SE184805', name: 'Đặng Tuấn Dương', email: 'duong.dt@school.edu.vn', status: 'Đang học' },
      { id: 'SE184806', name: 'Vũ Hải Yến', email: 'yen.vh@school.edu.vn', status: 'Đang học' },
    ],
    labs: [
      {
        id: 'LAB-CS101-01',
        labNumber: 1,
        title: 'Lab 01: Biến, Kiểu dữ liệu & Phép toán cơ bản',
        language: 'C++',
        questionCount: 3,
        scheduleNote: 'Tuần 1',
        startTime: '08:00, 10/09/2026',
        endTime: '10:00, 10/09/2026',
        durationMinutes: 120,
        isProctored: false,
        roomCode: 'CS101-L1',
        roomPassword: '112233',
        status: 'Đã kết thúc',
        submissionCount: 48,
      },
      {
        id: 'LAB-CS101-02',
        labNumber: 2,
        title: 'Lab 02: Cấu trúc rẽ nhánh If/Else & Switch-Case',
        language: 'C++',
        questionCount: 4,
        scheduleNote: 'Tuần 3',
        startTime: '08:00, 24/09/2026',
        endTime: '10:00, 24/09/2026',
        durationMinutes: 120,
        isProctored: false,
        roomCode: 'CS101-L2',
        roomPassword: '223344',
        status: 'Đã kết thúc',
        submissionCount: 47,
      },
      {
        id: 'LAB-CS101-03',
        labNumber: 3,
        title: 'Lab 03: Vòng lặp For/While & Mảng 1 chiều',
        language: 'C++',
        questionCount: 4,
        scheduleNote: 'Hôm nay (Tuần 6)',
        startTime: '08:00, Hôm nay',
        endTime: '10:00, Hôm nay',
        durationMinutes: 120,
        isProctored: false,
        roomCode: 'CS101-LAB3',
        roomPassword: '883921',
        status: 'Đang mở',
        submissionCount: 46,
      },
    ],
    exams: [
      {
        id: 'EXAM-CS101-01',
        title: 'Kiểm tra quá trình: Vòng lặp & Mảng 1 chiều',
        type: 'Kiểm tra quá trình',
        language: 'C++',
        durationMinutes: 60,
        scheduledAt: '08:00 - 09:00, 15/10/2026',
        questionCount: 3,
        isProctored: true, // Kiểm tra thì bắt buộc khóa màn hình & AI
        roomCode: 'CS101-EX1',
        roomPassword: '991122',
        status: 'Đã kết thúc',
        submissionCount: 48,
      },
    ],
  },
  {
    id: 'PRJ301',
    name: 'Lập trình ứng dụng Java Web',
    semester: 'HK1 2026–2027',
    startDate: '10/09/2026',
    endDate: '20/01/2027',
    status: 'Hoạt động',
    studentCount: 45,
    lecturer: 'Thầy Nguyễn Văn Nam',
    students: [
      { id: 'PRJ01', name: 'Hoàng Quốc Bảo', email: 'bao.hq@school.edu.vn', status: 'Đang học' },
      { id: 'PRJ02', name: 'Đỗ Thị Mai', email: 'mai.dt@school.edu.vn', status: 'Đang học' },
      { id: 'PRJ03', name: 'Bùi Tuấn Anh', email: 'anh.bt@school.edu.vn', status: 'Đang học' },
    ],
    labs: [
      {
        id: 'LAB-PRJ-01',
        labNumber: 1,
        title: 'Lab 01: Thiết lập môi trường Tomcat & Servlet cơ bản',
        language: 'Java',
        questionCount: 2,
        startTime: '13:30, 18/09/2026',
        endTime: '15:30, 18/09/2026',
        durationMinutes: 120,
        isProctored: false,
        roomCode: 'PRJ-L1',
        roomPassword: '334455',
        status: 'Đã kết thúc',
        submissionCount: 45,
      },
    ],
    exams: [
      {
        id: 'EXAM-PRJ-01',
        title: 'Kiểm tra quá trình: Servlet & MVC Pattern',
        type: 'Kiểm tra quá trình',
        language: 'Java',
        durationMinutes: 90,
        scheduledAt: '13:30 - 15:30, Hôm nay',
        questionCount: 3,
        isProctored: true,
        roomCode: 'PRJ-KT01',
        roomPassword: '901244',
        status: 'Sắp diễn ra',
        submissionCount: 0,
      },
    ],
  },
  {
    id: 'CSD201',
    name: 'Cấu trúc dữ liệu & Giải thuật',
    semester: 'HK1 2026–2027',
    startDate: '15/09/2026',
    endDate: '25/01/2027',
    status: 'Hoạt động',
    studentCount: 42,
    lecturer: 'Thầy Nguyễn Văn Nam',
    students: [
      { id: 'CSD01', name: 'Nguyễn Đình Trọng', email: 'trong.nd@school.edu.vn', status: 'Đang học' },
      { id: 'CSD02', name: 'Vũ Thị Hạnh', email: 'hanh.vt@school.edu.vn', status: 'Đang học' },
    ],
    labs: [
      {
        id: 'LAB-CSD-01',
        labNumber: 1,
        title: 'Lab 01: Danh sách liên kết đơn (Singly Linked List)',
        language: 'C++',
        questionCount: 3,
        startTime: '15:15, 20/09/2026',
        endTime: '17:15, 20/09/2026',
        durationMinutes: 120,
        isProctored: false,
        roomCode: 'CSD-L1',
        roomPassword: '556677',
        status: 'Đã kết thúc',
        submissionCount: 42,
      },
    ],
    exams: [],
  },
  {
    id: 'CS102',
    name: 'Kỹ thuật Lập trình nâng cao',
    semester: 'HK1 2026–2027',
    startDate: '08/09/2026',
    endDate: '18/01/2027',
    status: 'Hoạt động',
    studentCount: 50,
    lecturer: 'Thầy Nguyễn Văn Nam',
    students: [
      { id: 'CS102_01', name: 'Lê Minh Quân', email: 'quan.lm@school.edu.vn', status: 'Đang học' },
    ],
    labs: [],
    exams: [],
  },
];

export default function InstructorClassManagerView() {
  const searchParams = useSearchParams();
  const [classes, setClasses] = useState<ClassRow[]>(INSTRUCTOR_DEFAULT_CLASSES);
  const [selectedClassId, setSelectedClassId] = useState<string>(INSTRUCTOR_DEFAULT_CLASSES[0].id);
  const [activeTab, setActiveTab] = useState<'students' | 'labs' | 'exams'>('students');
  const [searchStudent, setSearchStudent] = useState('');
  const [createdRooms, setCreatedRooms] = useState<RoomSession[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Khởi tạo từ localStorage nếu có sẵn dữ liệu của giảng viên
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(INSTRUCTOR_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setClasses(parsed);
        }
      } else {
        localStorage.setItem(INSTRUCTOR_STORAGE_KEY, JSON.stringify(INSTRUCTOR_DEFAULT_CLASSES));
      }

      // Đọc các phòng ca học đã tạo từ localStorage để nhận diện lớp nào đang có phòng mở
      const rawRooms = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
      if (rawRooms) {
        setCreatedRooms(JSON.parse(rawRooms));
      }

      const handleStorageChange = () => {
        const updated = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
        if (updated) {
          try {
            setCreatedRooms(JSON.parse(updated));
          } catch {
            // fallback
          }
        }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    } catch {
      // fallback
    }
  }, []);

  // Kiểm tra param ?created= khi vừa tạo lớp mới thành công
  useEffect(() => {
    const createdId = searchParams?.get('created');
    if (createdId) {
      setSelectedClassId(createdId);
      showToast(`Đã mở thành công lớp học phần ${createdId}!`);
    }
  }, [searchParams]);

  // Cập nhật state lớp và đồng bộ localStorage
  const updateClassesAndStorage = (updater: (prev: ClassRow[]) => ClassRow[]) => {
    setClasses((prev) => {
      const updated = updater(prev);
      if (typeof window !== 'undefined') {
        localStorage.setItem(INSTRUCTOR_STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Tìm kiếm lớp học phần
  const [searchClass, setSearchClass] = useState('');

  // Modal thêm sinh viên vào lớp
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');

  // Modal xác nhận xóa sinh viên khỏi lớp
  const [deletingStudent, setDeletingStudent] = useState<StudentRow | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
    return classes.find((c) => c.id === selectedClassId) || classes[0];
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

  // Thao tác: Thêm sinh viên mới
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId.trim() || !newStudentName.trim()) return;

    const newStudent: StudentRow = {
      id: newStudentId.trim().toUpperCase(),
      name: newStudentName.trim(),
      email: newStudentEmail.trim() || `${newStudentId.trim().toLowerCase()}@school.edu.vn`,
      status: 'Đang học',
    };

    updateClassesAndStorage((prev) =>
      prev.map((c) => {
        if (c.id !== currentClass.id) return c;
        return {
          ...c,
          studentCount: c.studentCount + 1,
          students: [newStudent, ...(c.students || [])],
        };
      })
    );

    showToast(`Đã thêm sinh viên ${newStudent.name} (${newStudent.id}) vào lớp!`);
    setNewStudentId('');
    setNewStudentName('');
    setNewStudentEmail('');
    setIsAddStudentOpen(false);
  };

  // Thao tác: Xóa sinh viên khỏi lớp học phần
  const handleConfirmDeleteStudent = () => {
    if (!deletingStudent) return;
    const targetStudent = deletingStudent;

    updateClassesAndStorage((prev) =>
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
  };

  // Thao tác: Xuất file CSV danh sách sinh viên lớp học phần
  const handleExportStudentsCsv = () => {
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
              {classes.length} Lớp Phụ Trách
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quản lý các lớp học phần được phân công giảng dạy, tạo bài thực hành Lab, đề kiểm tra và điểm danh sinh viên.
          </p>
        </div>

        {/* Nút tạo phòng đã được chuyển vào bên trong card chi tiết lớp để thống nhất quy trình chọn lớp trước */}
      </div>

      {/* ── 2. KHU VỰC CHÍNH: CỘT CHỌN LỚP PHỤ TRÁCH + CỘT KHÔNG GIAN LỚP HỌC ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        {/* CỘT TRÁI (4 Cột): DANH SÁCH LỚP PHỤ TRÁCH CỦA GIẢNG VIÊN (KHÔNG CÓ NÚT XÓA LỚP CỦA ADMIN) */}
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
              {filteredClasses.length === 0 ? (
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
                        <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-200">{c.studentCount}</strong> sinh viên
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
                  href={`/instructor/room?class=${currentClass.id}`}
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
                <span>Bài Thực Hành({currentClass.labs?.length || 0})</span>
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
                  {/* Nút Thêm sinh viên (Đã loại bỏ nút Xuất DS SV theo yêu cầu) */}
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
                    {filteredStudents.length === 0 ? (
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
                {(currentClass.labs || []).length === 0 ? (
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
                            Lab 0{lab.labNumber}
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
                        <span>•</span>
                        <span>Mã PIN: <code className="font-mono tabular-nums font-bold text-blue-700 dark:text-blue-300">{lab.roomPassword}</code></span>
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
                              <span>Lab chưa mở</span>
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
                {(currentClass.exams || []).length === 0 ? (
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
                        <span>•</span>
                        <span>Mã PIN: <code className="font-mono tabular-nums font-bold text-blue-700 dark:text-blue-300">{exam.roomPassword}</code></span>
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
                              <span>Chưa diễn ra</span>
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
        </div>
      </div>

      {/* ── 3. MODAL THÊM SINH VIÊN VÀO LỚP ── */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121824] p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Thêm Sinh Viên Vào Lớp</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStudentOpen(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Mã số sinh viên (MSSV) *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: SE184899"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 text-xs font-mono tabular-nums text-slate-800 dark:text-slate-200 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Họ và tên sinh viên *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Hoàng Long"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 text-xs text-slate-800 dark:text-slate-200 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email sinh viên (Tùy chọn)</label>
                <input
                  type="email"
                  placeholder="VD: long.nh@school.edu.vn"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 text-xs text-slate-800 dark:text-slate-200 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 cursor-pointer"
                >
                  Thêm Vào Lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. MODAL XÁC NHẬN XÓA SINH VIÊN KHỎI LỚP ── */}
      {deletingStudent && (
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

  // Pending dùng Amber; Active/Completed dùng Emerald theo Semantic Tokens.
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
