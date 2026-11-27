'use client';

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import EditClassModal from '@/components/admin/classes/EditClassModal';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCode2,
  FileSpreadsheet,
  GraduationCap,
  KeyRound,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Terminal,
  Trash2,
  Upload,
  UploadCloud,
  UserPlus,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { fetchWithAuth } from '@/services/apiClient';
import {
  parseStudentFile,
  downloadStudentSampleTemplate,
  ParsedStudentRow,
} from './excelParser';
import {
  ClassRow,
  ClassStatus,
  INITIAL_CLASSES,
  StudentRow,
  StudentStatus,
  saveStoredClasses,
} from './types';
import { exportStyledExcel } from '@/utils/excelExporter';

const SEMESTERS = ['HK1 2026–2027', 'HK2 2026–2027', 'HKT 2026-27', 'HKT 2025-26'];

function cleanMojibake(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â‚¬“/g, '–')
    .replace(/â€[\s\S]?/g, '–')
    .replace(/Â/g, '')
    .trim();
}

function getStudentInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'SV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white',
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash] || 'bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white';
}

function ClassManagerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [classes, setClasses] = useState<ClassRow[]>(INITIAL_CLASSES);
  const [selectedClassId, setSelectedClassId] = useState(INITIAL_CLASSES[0]?.id || '');
  const selectedClassIdRef = useRef(selectedClassId);
  useEffect(() => {
    selectedClassIdRef.current = selectedClassId;
  }, [selectedClassId]);
  const selectedClass = classes.find((item) => item.id === selectedClassId) ?? null;
  const [isStudentDrawerOpen, setIsStudentDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState('Tất cả học kỳ');
  const [status, setStatus] = useState('Tất cả trạng thái');
  const [studentSearch, setStudentSearch] = useState('');
  const [dbSemesters, setDbSemesters] = useState<Array<{ ma_hoc_ky: string; ten_hoc_ky: string }>>([]);
  const [instructorsList, setInstructorsList] = useState<Array<{ user_id: number; full_name: string; username: string; email: string }>>([]);

  // Modals state
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [editError, setEditError] = useState('');
  const [deletingClass, setDeletingClass] = useState<ClassRow | null>(null);
  const [viewingClass, setViewingClass] = useState<ClassRow | null>(null);
  const [detailTab, setDetailTab] = useState<'students' | 'labs' | 'exams'>('students');

  // Student modal (Tìm kiếm & Ghi danh sinh viên từ hệ thống)
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [studentSearchKeyword, setStudentSearchKeyword] = useState('');
  const [searchedStudents, setSearchedStudents] = useState<any[]>([]);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState<any | null>(null);
  const [enrollStatus, setEnrollStatus] = useState<StudentStatus>('Đang học');
  const [enrollNote, setEnrollNote] = useState('');
  const [addStudentError, setAddStudentError] = useState('');
  const [deletingStudent, setDeletingStudent] = useState<StudentRow | null>(null);
  const [targetClassForStudent, setTargetClassForStudent] = useState<ClassRow | null>(null);

  // Bulk import students modal (Đồng bộ module Người dùng)
  const [isImportStudentsOpen, setIsImportStudentsOpen] = useState(false);
  const [importStudentFile, setImportStudentFile] = useState<File | null>(null);
  const [importStudentWarnings, setImportStudentWarnings] = useState<string[]>([]);
  const [importStudentError, setImportStudentError] = useState('');
  const [previewStudents, setPreviewStudents] = useState<ParsedStudentRow[]>([]);
  const [isImportStudentParsing, setIsImportStudentParsing] = useState(false);
  const [isImportStudentDragging, setIsImportStudentDragging] = useState(false);
  const importStudentFileInputRef = useRef<HTMLInputElement>(null);

  // Đóng modal chi tiết lớp bằng phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewingClass(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Tự động đồng bộ viewingClass khi danh sách classes cập nhật
  useEffect(() => {
    if (viewingClass) {
      const freshClass = classes.find((c) => c.id === viewingClass.id);
      if (freshClass && freshClass !== viewingClass) {
        setViewingClass(freshClass);
      }
    }
  }, [classes, viewingClass]);

  // Tìm kiếm sinh viên với debounce 280ms
  useEffect(() => {
    if (!isAddStudentOpen) {
      setStudentSearchKeyword('');
      setSearchedStudents([]);
      setSelectedStudentToEnroll(null);
      setAddStudentError('');
      return;
    }

    const keyword = studentSearchKeyword.trim();
    if (!keyword) {
      setSearchedStudents([]);
      setIsSearchingStudent(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingStudent(true);
      setAddStudentError('');
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
        const targetClass = targetClassForStudent || viewingClass || selectedClass;
        const classCodeParam = targetClass ? `&class_code=${encodeURIComponent(targetClass.id)}` : '';
        const res = await fetch(`/api/v1/classes/students/search?q=${encodeURIComponent(keyword)}${classCodeParam}&limit=10`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          setSearchedStudents(data);
        } else {
          setSearchedStudents([]);
          setAddStudentError('Không tìm thấy sinh viên phù hợp trong hệ thống.');
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm sinh viên:', err);
      } finally {
        setIsSearchingStudent(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [studentSearchKeyword, isAddStudentOpen, targetClassForStudent, viewingClass, selectedClass, classes]);

  // Hàm tải danh sách sinh viên ghi danh trong lớp từ CSDL SQL Server
  const fetchStudentsForClass = useCallback(async (classId: string) => {
    if (!classId) return;
    try {
      const enrolledList = await fetchWithAuth<any[]>(`/api/v1/classes/${encodeURIComponent(classId)}/students`);
      if (Array.isArray(enrolledList)) {
        const mappedStudents: StudentRow[] = enrolledList.map((st: any) => ({
          id: st.student_id || st.username || String(st.user_id),
          name: st.full_name,
          email: st.email,
          phone: st.phone_number || undefined,
          homeroomClass: st.lop_sinh_hoat || undefined,
          department: st.department || undefined,
          status:
            st.status === 'hoc_ghep'
              ? 'Học ghép'
              : st.status === 'hoc_lai'
              ? 'Học lại'
              : st.status === 'hoc_vuot'
              ? 'Học vượt'
              : 'Đang học',
        }));

        setClasses((prev) => {
          const updated = prev.map((c) =>
            c.id === classId
              ? {
                  ...c,
                  students: mappedStudents,
                  studentCount: mappedStudents.length,
                }
              : c
          );
          saveStoredClasses(updated);
          return updated;
        });

        setViewingClass((prev) => {
          if (prev && prev.id === classId) {
            return {
              ...prev,
              students: mappedStudents,
              studentCount: mappedStudents.length,
            };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách sinh viên lớp:', err);
    }
  }, []);

  // Đồng bộ danh sách lớp học thực tế từ CSDL Backend (SQL Server)
  useEffect(() => {
    let isCancelled = false;

    async function syncClassesFromApi() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
        const res = await fetch('/api/v1/classes', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (isCancelled) return;
        if (res.ok) {
          const apiClasses = await res.json();
          if (Array.isArray(apiClasses)) {
            // Nguồn dữ liệu lớp học lấy trực tiếp 100% từ bảng Classes trong CSDL SQL Server
            const realClasses: ClassRow[] = apiClasses.map((apiCls: any) => ({
              id: apiCls.class_code,
              name: apiCls.class_name,
              courseCode: apiCls.course_code || undefined,
              sectionCode: apiCls.section_code || undefined,
              semester: apiCls.semester || 'HK1 2026–2027',
              status: apiCls.status === 'da_dong' ? 'Đã kết thúc' : 'Hoạt động',
              lecturer: apiCls.instructor_name || 'Chưa phân công',
              instructor_id: apiCls.instructor_id ?? null,
              studentCount: typeof apiCls.student_count === 'number' ? apiCls.student_count : 0,
              students: [],
            }));

            // Giữ lại sinh viên đã có trong state, không ghi đè thành mảng rỗng
            setClasses((prev) => {
              const updated = realClasses.map((rc) => {
                const existing = prev.find((p) => p.id === rc.id);
                return {
                  ...rc,
                  students: existing && existing.students && existing.students.length > 0 ? existing.students : rc.students,
                  studentCount: rc.studentCount || (existing ? existing.studentCount : 0),
                };
              });
              saveStoredClasses(updated);
              return updated;
            });

            const createdId = searchParams.get('created');
            const currentActive = selectedClassIdRef.current;
            let activeIdToLoad = '';
            if (createdId && realClasses.some((c) => c.id === createdId)) {
              activeIdToLoad = createdId;
            } else if (currentActive && realClasses.some((c) => c.id === currentActive)) {
              activeIdToLoad = currentActive;
            } else if (realClasses.length > 0) {
              activeIdToLoad = realClasses[0].id;
            }

            setSelectedClassId(activeIdToLoad);
            if (activeIdToLoad) {
              fetchStudentsForClass(activeIdToLoad);
            }
          }
        } else {
          setClasses([]);
          setSelectedClassId('');
        }
      } catch (err) {
        console.error('Không thể đồng bộ lớp từ CSDL:', err);
        if (!isCancelled) {
          setClasses([]);
          setSelectedClassId('');
        }
      }
    }
    syncClassesFromApi();
    return () => {
      isCancelled = true;
    };
  }, [searchParams, fetchStudentsForClass]);

  // Tải danh mục học kỳ từ CSDL bảng HocKy để đồng bộ bộ lọc
  useEffect(() => {
    async function loadSemesters() {
      try {
        const res = await fetch('/api/v1/classes/semesters/list');
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            setDbSemesters(list);
          }
        }
      } catch (err) {
        console.warn('Lỗi tải danh mục học kỳ từ CSDL:', err);
      }
    }
    async function loadInstructors() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
        const res = await fetch('/api/v1/admin/users?role=instructor&page_size=100', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.users)) {
            setInstructorsList(
              data.users.map((u: any) => ({
                user_id: u.user_id,
                full_name: u.full_name || u.username,
                username: u.username,
                email: u.email,
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách giảng viên:', err);
      }
    }
    loadSemesters();
    loadInstructors();
  }, []);

  // Tự động tải sinh viên ngay khi đổi lớp đang chọn hoặc khi lớp đang chọn chưa nạp sinh viên vào state
  useEffect(() => {
    if (!selectedClassId) return;
    const currentCls = classes.find((c) => c.id === selectedClassId);
    if (!currentCls) return;
    if (currentCls.studentCount > 0 && currentCls.students.length === 0) {
      fetchStudentsForClass(selectedClassId);
    }
  }, [selectedClassId, classes, fetchStudentsForClass]);

  function confirmDeleteStudent() {
    if (!deletingStudent) return;
    const targetClassId = (targetClassForStudent || viewingClass || selectedClass)?.id;
    if (!targetClassId) return;

    const updated = classes.map((item) => {
      if (item.id === targetClassId) {
        const updatedStudents = item.students.filter((s) => s.id !== deletingStudent.id);
        return {
          ...item,
          studentCount: Math.max(0, item.studentCount - 1),
          students: updatedStudents,
        };
      }
      return item;
    });

    setClasses(updated);
    saveStoredClasses(updated);

    if (viewingClass && viewingClass.id === targetClassId) {
      setViewingClass({
        ...viewingClass,
        studentCount: Math.max(0, viewingClass.studentCount - 1),
        students: viewingClass.students.filter((s) => s.id !== deletingStudent.id),
      });
    }

    // Đồng bộ xóa sinh viên khỏi CSDL Backend
    fetchWithAuth(
      `/api/v1/classes/${encodeURIComponent(targetClassId)}/students/${encodeURIComponent(deletingStudent.id)}`,
      { method: 'DELETE' }
    )
      .then(() => fetchStudentsForClass(targetClassId))
      .catch((err) => console.error('Lỗi khi xóa SV khỏi CSDL:', err));

    setDeletingStudent(null);
  }

  function handleEditFromDetail() {
    if (!viewingClass) return;
    const current = viewingClass;
    setViewingClass(null);
    openEditModal(current);
  }

  function openAddStudentModal(classItem?: ClassRow) {
    const target = classItem || viewingClass || selectedClass;
    if (!target) return;
    setTargetClassForStudent(target);
    setAddStudentError('');
    setIsAddStudentOpen(true);
  }

  function openImportStudentsModal(classItem?: ClassRow) {
    const target = classItem || viewingClass || selectedClass;
    if (!target) return;
    setTargetClassForStudent(target);
    handleResetImportStudentState();
    setIsImportStudentsOpen(true);
  }

  function handleConfirmEnrollStudent() {
    if (!selectedStudentToEnroll) {
      setAddStudentError('Vui lòng chọn một sinh viên từ kết quả tìm kiếm.');
      return;
    }

    const target = targetClassForStudent || viewingClass || selectedClass;
    if (!target) return;

    const studentId =
      selectedStudentToEnroll.student_id ||
      selectedStudentToEnroll.username ||
      String(selectedStudentToEnroll.user_id);
    const studentName = selectedStudentToEnroll.full_name;
    const email = selectedStudentToEnroll.email || '';

    if (
      target.students.some(
        (s) => s.id.toLowerCase() === studentId.toLowerCase()
      )
    ) {
      setAddStudentError('Sinh viên này đã có trong danh sách lớp.');
      return;
    }

    const newStudent: StudentRow = {
      id: studentId,
      name: studentName,
      email,
      phone: selectedStudentToEnroll.phone_number || undefined,
      homeroomClass: selectedStudentToEnroll.lop_sinh_hoat || undefined,
      department: selectedStudentToEnroll.department || undefined,
      status: enrollStatus,
      note: enrollNote.trim() || undefined,
    };

    const updatedStudents = [newStudent, ...target.students];
    const updatedClass: ClassRow = {
      ...target,
      studentCount: updatedStudents.length,
      students: updatedStudents,
    };

    const updatedList = classes.map((item) =>
      item.id === target.id ? updatedClass : item
    );
    setClasses(updatedList);
    saveStoredClasses(updatedList);

    if (viewingClass && viewingClass.id === target.id) {
      setViewingClass(updatedClass);
    }
    setTargetClassForStudent(updatedClass);
    setIsAddStudentOpen(false);
    setSelectedStudentToEnroll(null);
    setStudentSearchKeyword('');
    setEnrollNote('');
    setAddStudentError('');

    // Đồng bộ vào backend
    fetchWithAuth(`/api/v1/classes/${encodeURIComponent(target.id)}/students`, {
      method: 'POST',
      body: JSON.stringify({
        student_user_id: selectedStudentToEnroll.user_id || studentId,
        student_name: studentName,
        email: email || undefined,
        status:
          enrollStatus === 'Học ghép'
            ? 'hoc_ghep'
            : enrollStatus === 'Học lại'
            ? 'hoc_lai'
            : enrollStatus === 'Học vượt'
            ? 'hoc_vuot'
            : 'dang_hoc',
      }),
    })
      .then(() => fetchStudentsForClass(target.id))
      .catch((err) => {
        console.error('Lỗi khi ghi danh sinh viên vào CSDL:', err);
      });
  }

  // ── XỬ LÝ NHẬP EXCEL / CSV SINH VIÊN VÀO LỚP ──
  async function handleProcessImportStudentFile(file: File) {
    setImportStudentError('');
    setImportStudentWarnings([]);
    setPreviewStudents([]);
    setIsImportStudentParsing(true);
    setImportStudentFile(file);

    try {
      const result = await parseStudentFile(file);
      if (result.errorMessage) {
        setImportStudentError(result.errorMessage);
        return;
      }
      setImportStudentWarnings(result.warnings);
      setPreviewStudents(result.parsedStudents);
    } catch (err) {
      setImportStudentError(
        err instanceof Error
          ? err.message
          : 'Không thể đọc nội dung tệp. Vui lòng kiểm tra lại định dạng tệp Excel / CSV.'
      );
    } finally {
      setIsImportStudentParsing(false);
    }
  }

  function handleResetImportStudentState() {
    setImportStudentFile(null);
    setImportStudentError('');
    setImportStudentWarnings([]);
    setPreviewStudents([]);
    setIsImportStudentParsing(false);
    setIsImportStudentDragging(false);
    if (importStudentFileInputRef.current) {
      importStudentFileInputRef.current.value = '';
    }
  }

  async function handleConfirmBulkImportStudents() {
    const target = targetClassForStudent || viewingClass || selectedClass;
    if (!target || previewStudents.length === 0) return;

    const existingIds = new Set(target.students.map((s) => s.id.toLowerCase()));
    const newStudents: StudentRow[] = [];

    previewStudents.forEach((p) => {
      const normalizedId = p.id.toLowerCase();
      if (!existingIds.has(normalizedId)) {
        existingIds.add(normalizedId);
        newStudents.push({
          id: p.id,
          name: p.name,
          email: p.email || '',
          status: 'Đang học',
          missingFields: p.missingFields,
        });
      }
    });

    const updatedStudents = [...target.students, ...newStudents];
    const updatedClass: ClassRow = {
      ...target,
      studentCount: updatedStudents.length,
      students: updatedStudents,
    };

    if (viewingClass && viewingClass.id === target.id) {
      setViewingClass(updatedClass);
    }
    setTargetClassForStudent(updatedClass);
    const nextClasses = classes.map((c) => (c.id === updatedClass.id ? updatedClass : c));
    setClasses(nextClasses);
    saveStoredClasses(nextClasses);

    // Tự động đồng bộ danh sách tài khoản sinh viên vào CSDL SQL Server và gửi email thông tin đăng nhập
    if (newStudents.length > 0) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      const validUsers = newStudents
        .map((s) => {
          const emailVal = (s.email || '').trim().toLowerCase();
          return {
            username: emailVal ? emailVal.split('@')[0].trim().toLowerCase() : (s.id || '').toLowerCase(),
            email: emailVal,
            full_name: (s.name || '').trim() || (s.id || 'Sinh viên'),
            student_id: (s.id || '').trim().toUpperCase(),
          };
        })
        .filter((u) => u.email && u.full_name);

      if (validUsers.length > 0) {
        try {
          // 1. Tự động khởi tạo tài khoản cho các sinh viên chưa có trên hệ thống
          await fetchWithAuth('/api/v1/admin/users/batch-import', {
            method: 'POST',
            body: JSON.stringify({
              role: 'student',
              users: validUsers,
            }),
          });
        } catch (err) {
          console.error('Lỗi khi đồng bộ danh sách tài khoản sinh viên:', err);
        }
      }

      // 2. Ghi danh từng sinh viên vào lớp trong CSDL SQL Server (ClassEnrollments)
      for (const s of newStudents) {
        if (!s.id) continue;
        try {
          await fetchWithAuth(`/api/v1/classes/${encodeURIComponent(target.id)}/students`, {
            method: 'POST',
            body: JSON.stringify({
              student_user_id: s.id,
              student_name: s.name,
              email: s.email || undefined,
              status: 'dang_hoc',
            }),
          });
        } catch (enrollErr) {
          console.warn(`Lỗi ghi danh sinh viên ${s.id} vào CSDL:`, enrollErr);
        }
      }
      await fetchStudentsForClass(target.id);
    }

    setIsImportStudentsOpen(false);
    handleResetImportStudentState();
  }

  function handleExportStudentList() {
    if (!viewingClass || viewingClass.students.length === 0) return;
    
    const columns = [
      { header: 'STT', width: 50, align: 'center' as const },
      { header: 'Mã sinh viên (MSSV)', width: 140, align: 'center' as const },
      { header: 'Họ và tên sinh viên', width: 220, align: 'left' as const },
      { header: 'Email sinh viên', width: 240, align: 'left' as const },
      { header: 'Mã lớp học phần', width: 130, align: 'center' as const },
      { header: 'Trạng thái', width: 130, align: 'center' as const },
    ];

    const data = viewingClass.students.map((st, idx) => [
      idx + 1,
      st.id,
      st.name,
      st.email,
      viewingClass.id,
      (st.status as string) === 'Đang học' || (st.status as string) === 'active' ? 'Đang theo học' : st.status,
    ]);

    exportStyledExcel({
      title: `DANH SÁCH SINH VIÊN - LỚP HỌC PHẦN ${viewingClass.id}`,
      subtitle: `Tên môn/lớp: ${viewingClass.name} | Giảng viên: ${viewingClass.lecturer || 'Chưa phân công'} | Sĩ số: ${viewingClass.students.length}`,
      filename: `Danh_Sach_Sinh_Vien_Lop_${viewingClass.id}.xls`,
      sheetName: 'Danh sách SV',
      columns,
      data,
    });
  }

  function handleExportClasses() {
    if (classes.length === 0) return;

    const columns = [
      { header: 'STT', width: 50, align: 'center' as const },
      { header: 'Mã lớp', width: 130, align: 'center' as const },
      { header: 'Tên lớp học phần', width: 240, align: 'left' as const },
      { header: 'Học kỳ', width: 130, align: 'center' as const },
      { header: 'Giảng viên phụ trách', width: 200, align: 'left' as const },
      { header: 'Số tín chỉ', width: 90, align: 'right' as const },
      { header: 'Sĩ số', width: 80, align: 'right' as const },
      { header: 'Trạng thái', width: 130, align: 'center' as const },
    ];

    const data = classes.map((c, idx) => [
      idx + 1,
      c.id,
      c.name,
      c.semester,
      c.lecturer || 'Chưa phân công',
      c.creditHours || 3,
      c.students.length,
      c.status,
    ]);

    exportStyledExcel({
      title: 'DANH SÁCH TOÀN BỘ LỚP HỌC PHẦN (OCULIDE)',
      subtitle: `Trường Đại Học Duy Tân | Xuất lúc: ${new Date().toLocaleDateString('vi-VN')} | Tổng số lớp: ${classes.length}`,
      filename: `Danh_Sach_Lop_Hoc_Oculide_${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: 'Lớp học phần',
      columns,
      data,
    });
  }

  function openEditModal(classItem: ClassRow) {
    setEditError('');
    setEditingClass(classItem);
  }

  function closeEditModal() {
    setEditError('');
    setEditingClass(null);
  }

  async function handleToggleClassStatus(classId: string, newStatus: ClassStatus) {
    const updated = classes.map((item) =>
      item.id === classId
        ? {
            ...item,
            status: newStatus,
          }
        : item
    );
    setClasses(updated);
    saveStoredClasses(updated);

    if (viewingClass && viewingClass.id === classId) {
      setViewingClass({
        ...viewingClass,
        status: newStatus,
      });
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      await fetch(`/api/v1/classes/${encodeURIComponent(classId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái lớp:', err);
    }
  }

  async function saveEditClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingClass) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const newId = String(formData.get('classId') ?? '').trim().toUpperCase();
    const name = String(formData.get('className') ?? '').trim();
    const classSemester = String(formData.get('semester') ?? '').trim();
    const courseCode = String(formData.get('courseCode') ?? '').trim().toUpperCase() || undefined;
    const sectionCode = String(formData.get('sectionCode') ?? '').trim().toUpperCase() || undefined;
    const startDate = String(formData.get('startDate') ?? '').trim();
    const endDate = String(formData.get('endDate') ?? '').trim();
    const totalSessions = Number(formData.get('totalSessions') || 15);
    const creditHours = Number(formData.get('creditHours') || 3);

    // Tự động tính toán trạng thái lớp theo lịch học (Admin không đóng lớp thủ công)
    const today = new Date().toISOString().slice(0, 10);
    let classStatus: ClassStatus = 'Hoạt động';
    if (endDate && today > endDate) {
      classStatus = 'Đã kết thúc';
    } else if (startDate && today < startDate) {
      classStatus = 'Chưa mở';
    }

    const instructorIdRaw = formData.get('instructorId');
    const instructorId = instructorIdRaw ? Number(instructorIdRaw) : null;
    const selectedInstructor = instructorsList.find((i) => i.user_id === instructorId);
    const lecturer = selectedInstructor ? selectedInstructor.full_name : (editingClass.lecturer || 'Chưa phân công');

    if (!newId) {
      setEditError('Mã lớp không được để trống.');
      return;
    }
    if (!name) {
      setEditError('Tên lớp không được để trống.');
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setEditError('Ngày kết thúc phải diễn ra sau ngày bắt đầu khóa học.');
      return;
    }

    if (
      newId.toLocaleLowerCase('vi') !== editingClass.id.toLocaleLowerCase('vi') &&
      classes.some((item) => item.id.toLocaleLowerCase('vi') === newId.toLocaleLowerCase('vi'))
    ) {
      setEditError('Mã lớp này đã tồn tại. Vui lòng nhập mã khác.');
      return;
    }

    const updated = classes.map((item) =>
      item.id === editingClass.id
        ? {
            ...item,
            id: newId,
            name,
            courseCode,
            sectionCode,
            semester: classSemester,
            status: classStatus,
            instructor_id: instructorId,
            lecturer,
            startDate: startDate || item.startDate,
            endDate: endDate || item.endDate,
            totalSessions,
            creditHours,
          }
        : item
    );

    setClasses(updated);
    saveStoredClasses(updated);

    if (selectedClassId === editingClass.id) {
      setSelectedClassId(newId);
    }
    if (viewingClass && viewingClass.id === editingClass.id) {
      setViewingClass({
        ...viewingClass,
        id: newId,
        name,
        courseCode,
        sectionCode,
        semester: classSemester,
        status: classStatus,
        instructor_id: instructorId,
        lecturer,
        startDate: startDate || viewingClass.startDate,
        endDate: endDate || viewingClass.endDate,
        totalSessions,
        creditHours,
      });
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      await fetch(`/api/v1/classes/${encodeURIComponent(editingClass.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          class_code: newId,
          class_name: name,
          course_code: courseCode,
          section_code: sectionCode,
          semester: classSemester,
          status: classStatus,
          instructor_id: instructorId,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          total_sessions: totalSessions,
          credit_hours: creditHours,
        }),
      });
    } catch (err) {
      console.error('Lỗi khi lưu thông tin lớp vào CSDL:', err);
    }

    setEditingClass(null);
    setEditError('');
  }

  function openDeleteModal(classItem: ClassRow) {
    setDeletingClass(classItem);
  }

  function closeDeleteModal() {
    setDeletingClass(null);
  }

  async function confirmDeleteClass() {
    if (!deletingClass) return;
    const targetId = deletingClass.id;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      await fetch(`/api/v1/classes/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch (err) {
      console.error('Lỗi khi xóa lớp từ CSDL:', err);
    }

    const remaining = classes.filter((item) => item.id !== targetId);
    setClasses(remaining);
    saveStoredClasses(remaining);

    if (selectedClassId === targetId) {
      setSelectedClassId(remaining.length > 0 ? remaining[0].id : '');
    }
    setDeletingClass(null);
  }

  const normalizeTerm = (s: string) =>
    (s || '').replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();

  const availableSemesters = useMemo(() => {
    const list: string[] = [];
    if (dbSemesters.length > 0) {
      dbSemesters.forEach((s) => {
        if (!list.some((item) => normalizeTerm(item) === normalizeTerm(s.ten_hoc_ky))) {
          list.push(s.ten_hoc_ky);
        }
      });
    }
    classes.forEach((c) => {
      if (c.semester && !list.some((item) => normalizeTerm(item) === normalizeTerm(c.semester))) {
        list.push(c.semester.trim());
      }
    });
    return list.length > 0 ? list : SEMESTERS;
  }, [dbSemesters, classes]);

  const filteredClasses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    const selectedNormSemester = normalizeTerm(semester);
    return classes.filter((classItem) => {
      const matchesSearch =
        !query ||
        classItem.id.toLocaleLowerCase('vi').includes(query) ||
        classItem.name.toLocaleLowerCase('vi').includes(query);
      const classNormSemester = normalizeTerm(classItem.semester);
      const matchesSemester =
        semester === 'Tất cả học kỳ' ||
        classNormSemester === selectedNormSemester ||
        classNormSemester.replace(/\s+/g, '') === selectedNormSemester.replace(/\s+/g, '') ||
        classNormSemester.includes(selectedNormSemester) ||
        selectedNormSemester.includes(classNormSemester);
      const matchesStatus = status === 'Tất cả trạng thái' || classItem.status === status;
      return matchesSearch && matchesSemester && matchesStatus;
    });
  }, [classes, search, semester, status]);

  const filteredStudents = useMemo(() => {
    const target = viewingClass || selectedClass;
    if (!target) return [];
    const query = studentSearch.trim().toLocaleLowerCase('vi');
    if (!query) return target.students;
    return target.students.filter(
      (student) =>
        student.id.toLocaleLowerCase('vi').includes(query) ||
        student.name.toLocaleLowerCase('vi').includes(query) ||
        (student.email && student.email.toLocaleLowerCase('vi').includes(query)) ||
        (student.homeroomClass && student.homeroomClass.toLocaleLowerCase('vi').includes(query))
    );
  }, [viewingClass, selectedClass, studentSearch]);

  const totalStudents = classes.reduce((sum, item) => sum + item.studentCount, 0);
  const activeClasses = classes.filter((item) => item.status === 'Hoạt động').length;

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-neutral-950 text-slate-800 dark:text-slate-100 transition-colors">
      <AdminSidebar activeModule="classes" />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar title="Quản lý lớp & sinh viên" />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1440px]">
            {/* Header: Tiêu đề + Nút Tạo lớp mới */}
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-slate-300 pb-4 dark:border-white/10">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Quản lý đào tạo
                </p>
                <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#2A282D] dark:text-[#ede8e9] sm:text-[28px]">
                  Lớp học &amp; sinh viên
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Theo dõi lớp học, danh sách sinh viên và các phiên thực hành, kiểm tra lập trình.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Nút Xuất Excel */}
                <button
                  type="button"
                  onClick={handleExportClasses}
                  title="Xuất danh sách lớp học ra file Excel/CSV"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-slate-500" />
                  <span>Xuất danh sách lớp học</span>
                </button>

                {/* Nút Tạo lớp mới */}
                <Link
                  href="/admin/classes/create"
                  className="system-primary-action inline-flex h-9 items-center justify-center gap-2 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 dark:hover:bg-slate-200 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tạo lớp mới</span>
                </Link>
              </div>
            </div>

            {/* Thống kê 3 thẻ tinh gọn */}
            <section className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: 'Tổng số lớp',
                  value: classes.length,
                  icon: BookOpen,
                  color: 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200',
                },
                {
                  label: 'Lớp hoạt động',
                  value: activeClasses,
                  icon: UserRoundCheck,
                  color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
                },
                {
                  label: 'Tổng sinh viên',
                  value: totalStudents,
                  icon: GraduationCap,
                  color: 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-md border border-slate-300 bg-white px-3.5 py-2.5 shadow-sm dark:border-white/10 dark:bg-neutral-900 transition-colors"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${item.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] font-medium text-slate-500 uppercase">{item.label}</p>
                      <p className="font-mono text-xl font-bold text-slate-900 dark:text-white leading-tight tabular-nums">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Bảng danh sách lớp toàn màn hình (Full Width) */}
            <div className="mt-5">
              <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xs dark:border-white/10 dark:bg-neutral-900 transition-colors">
                {/* Header Bảng Lớp Học Phong Cách Học Thuật */}
                <div className="border-b border-slate-300 p-5 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-white shadow-2xs">
                        <GraduationCap className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-serif text-base font-bold text-slate-900 dark:text-white">
                            Danh sách lớp học phần
                          </h2>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10">
                            {filteredClasses.length} lớp học
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          Theo dõi phân công giảng dạy, sĩ số sinh viên và trạng thái lớp học phần
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-300 dark:bg-white/5 dark:border-white/10 font-mono text-[11px]">
                        <Users className="h-3.5 w-3.5 text-slate-800 dark:text-slate-200" />
                        {totalStudents} Tổng SV
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-300 dark:bg-white/5 dark:border-white/10 font-mono text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        {activeClasses} Đang mở
                      </span>
                    </div>
                  </div>

                  {/* Thanh tìm kiếm & bộ lọc đồng bộ chuẩn h-9 text-xs */}
                  <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1 min-w-0">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm theo mã hoặc tên lớp..."
                        className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-8 text-xs outline-none transition focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                      />
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200/60 transition cursor-pointer"
                          title="Xóa tìm kiếm"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto sm:shrink-0">
                      <div className="relative flex-1 sm:w-44 sm:flex-initial">
                        <select
                          value={semester}
                          onChange={(e) => setSemester(e.target.value)}
                          className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white pl-3 pr-8 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-200 outline-none transition focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 cursor-pointer"
                        >
                          <option value="Tất cả học kỳ">Tất cả học kỳ</option>
                          {availableSemesters.map((s) => (
                            <option key={s} value={s}>
                              {cleanMojibake(s)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>

                      <div className="relative flex-1 sm:w-44 sm:flex-initial">
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white pl-3 pr-8 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-200 outline-none transition focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 cursor-pointer"
                        >
                          <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                          <option value="Hoạt động">Hoạt động</option>
                          <option value="Chưa mở">Chưa mở</option>
                          <option value="Đã kết thúc">Đã kết thúc</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bảng danh sách lớp */}
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <tr>
                        <th scope="col" className="px-6 py-3.5">
                          Lớp học &amp; Học phần
                        </th>
                        <th scope="col" className="px-4 py-3.5 w-52">
                          Học kỳ &amp; Phân lớp
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-center w-28">
                          Sĩ số
                        </th>
                        <th scope="col" className="px-4 py-3.5 w-56">
                          Giảng viên phụ trách
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-center w-36">
                          Trạng thái
                        </th>
                        <th scope="col" className="px-6 py-3.5 text-right w-52 whitespace-nowrap">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300/60 dark:divide-white/5">
                      {filteredClasses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-14 text-center text-slate-400">
                            <GraduationCap className="mx-auto h-8 w-8 mb-2 opacity-30 text-slate-500" />
                            <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">Không tìm thấy lớp học nào</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Bấm nút &ldquo;Tạo lớp học mới&rdquo; để thêm lớp học phần</p>
                          </td>
                        </tr>
                      ) : (
                        filteredClasses.map((classItem) => {
                          const isSelected = viewingClass ? viewingClass.id === classItem.id : selectedClassId === classItem.id;
                          return (
                            <tr
                              key={classItem.id}
                              onClick={() => {
                                const isCurrent = viewingClass?.id === classItem.id;
                                if (isCurrent) {
                                  setViewingClass(null);
                                } else {
                                  setSelectedClassId(classItem.id);
                                  setViewingClass(classItem);
                                  setStudentSearch('');
                                  fetchStudentsForClass(classItem.id);
                                }
                              }}
                              className={`transition-colors cursor-pointer group ${
                                isSelected
                                  ? 'bg-brand-50 dark:bg-brand-500/10 border-l-4 border-brand dark:border-brand-400'
                                  : 'hover:bg-slate-50 dark:hover:bg-white/5'
                              }`}
                            >
                              {/* Cột 1: Lớp học & Học phần */}
                              <td className="px-6 py-3.5">
                                <div className="flex items-center gap-3.5">
                                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border shadow-2xs ${
                                    isSelected
                                      ? 'border-brand-300 bg-brand-100 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200'
                                      : 'border-slate-300 bg-slate-100 text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-200'
                                  }`}>
                                    <BookOpen className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold font-mono text-sm text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                      {classItem.id}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 font-medium truncate max-w-[280px]">
                                      {classItem.name}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Cột 2: Học kỳ & Mã môn */}
                              <td className="px-4 py-3.5">
                                <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                  {cleanMojibake(classItem.semester)}
                                </p>
                                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-1.5 py-0.2 rounded">
                                    {classItem.courseCode ? `Môn: ${classItem.courseCode}` : 'Chính khóa'}
                                  </span>
                                  {classItem.sectionCode && (
                                    <span className="text-[11px] text-slate-400">
                                      • {classItem.sectionCode}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Cột 3: Sĩ số */}
                              <td className="px-3 py-3.5 text-center">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/10 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-white/10">
                                  <Users className="h-3 w-3 text-slate-400" />
                                  <span>{classItem.studentCount} SV</span>
                                </span>
                              </td>

                              {/* Cột 4: Giảng viên phụ trách */}
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-900 dark:text-white border border-slate-900 dark:border-white/20">
                                    {classItem.lecturer ? classItem.lecturer.slice(0, 2).toUpperCase() : 'GV'}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[170px]">
                                      {classItem.lecturer || 'Chưa phân công'}
                                    </p>
                                    <p className="text-[11px] text-slate-400">Phụ trách lớp</p>
                                  </div>
                                </div>
                              </td>

                              {/* Cột 5: Trạng thái (Clean StatusBadge, NO squished text links!) */}
                              <td className="px-3 py-3.5 text-center">
                                <StatusBadge status={classItem.status} />
                              </td>

                              {/* Cột 6: Hộp công cụ thao tác chuẩn mực */}
                              <td className="px-6 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <div className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white p-0.5 shadow-2xs dark:border-white/10 dark:bg-neutral-950">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const isCurrent = viewingClass?.id === classItem.id;
                                      if (isCurrent) {
                                        setViewingClass(null);
                                      } else {
                                        setSelectedClassId(classItem.id);
                                        setViewingClass(classItem);
                                        setStudentSearch('');
                                      }
                                    }}
                                    title="Xem chi tiết lớp & danh sách sinh viên"
                                    aria-label={`Xem sinh viên lớp ${classItem.id}`}
                                    className={`flex h-8.5 w-8.5 items-center justify-center rounded-md border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition dark:border-white/10 dark:bg-white/5 cursor-pointer ${
                                      isSelected
                                        ? 'system-selected-module'
                                        : 'text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                                    }`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAddStudentModal(classItem);
                                    }}
                                    title={`Thêm sinh viên vào lớp ${classItem.id}`}
                                    aria-label={`Thêm sinh viên vào lớp ${classItem.id}`}
                                    className="flex h-8.5 w-8.5 items-center justify-center rounded-md border border-slate-200 bg-white shadow-2xs hover:shadow-xs text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 transition cursor-pointer"
                                  >
                                    <UserPlus className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditModal(classItem);
                                    }}
                                    title="Chỉnh sửa lớp"
                                    aria-label={`Chỉnh sửa lớp ${classItem.id}`}
                                    className="flex h-8.5 w-8.5 items-center justify-center rounded-md border border-slate-200 bg-white shadow-2xs hover:shadow-xs text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-amber-900/30 dark:hover:text-amber-300 transition cursor-pointer"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDeleteModal(classItem);
                                    }}
                                    title="Xóa lớp"
                                    aria-label={`Xóa lớp ${classItem.id}`}
                                    className="flex h-8.5 w-8.5 items-center justify-center rounded-md border border-slate-200 bg-white shadow-2xs hover:shadow-xs text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 transition cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" />
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
              </section>
            </div>

          </div>
        </main>
      </div>

      {/* ── MODAL CHI TIẾT LỚP HỌC (HIỂN THỊ CHÍNH GIỮA MÀN HÌNH - RỘNG RÃI max-w-5xl) ── */}
      {viewingClass && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 p-4 sm:p-6 pt-12 sm:pt-16 pb-12 sm:pb-16 backdrop-blur-[2px] overflow-y-auto"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewingClass(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="class-detail-modal-title"
            className="my-auto w-full max-w-5xl max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-8rem)] flex flex-col rounded-xl overflow-hidden border border-slate-300 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900 transition-colors"
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-300 px-8 py-6 sm:px-9 sm:py-6.5 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 id="class-detail-modal-title" className="text-xl font-bold tracking-tight text-[#2A282D] dark:text-white">
                      Chi tiết lớp học phần • {viewingClass.id}
                    </h2>
                    <StatusBadge status={viewingClass.status} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {viewingClass.name} • {cleanMojibake(viewingClass.semester)} • GV: {viewingClass.lecturer || 'Chưa phân công'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingClass(null)}
                aria-label="Đóng chi tiết lớp"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-200 transition cursor-pointer"
                title="Đóng hộp thoại (ESC)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body Modal cuộn được */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* 4 Khối thông tin tổng quan đều nhau */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col justify-between rounded-lg border border-slate-300 bg-slate-50 p-4 shadow-xs dark:bg-white/5 dark:border-white/10 min-h-[96px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      LỚP & MÔN HỌC
                    </span>
                    <BookOpen className="h-4 w-4 text-slate-900 dark:text-white" />
                  </div>
                  <div className="mt-2.5">
                    <p className="text-base font-extrabold text-slate-900 dark:text-white truncate">{viewingClass.id}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">{viewingClass.name}</p>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-lg border border-slate-300 bg-slate-50 p-4 shadow-xs dark:bg-white/5 dark:border-white/10 min-h-[96px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      THỜI GIAN & HỌC KỲ
                    </span>
                    <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="mt-2.5">
                    <p className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                      {viewingClass.startDate && viewingClass.endDate ? `${viewingClass.startDate} → ${viewingClass.endDate}` : cleanMojibake(viewingClass.semester)}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {viewingClass.totalSessions || 15} buổi • {viewingClass.creditHours || 3} tín chỉ • {cleanMojibake(viewingClass.semester)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-lg border border-slate-300 bg-slate-50 p-4 shadow-xs dark:bg-white/5 dark:border-white/10 min-h-[96px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      GIẢNG VIÊN PHỤ TRÁCH
                    </span>
                    <UserRoundCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="mt-2.5">
                    <p className="text-base font-extrabold text-slate-900 dark:text-white truncate">{viewingClass.lecturer || 'Chưa phân công'}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Cán bộ giảng dạy phụ trách</p>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-lg border border-slate-300 bg-slate-50 p-4 shadow-xs dark:bg-white/5 dark:border-white/10 min-h-[96px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      SĨ SỐ SINH VIÊN
                    </span>
                    <Users className="h-4 w-4 text-slate-900 dark:text-white" />
                  </div>
                  <div className="mt-2.5">
                    <p className="text-base font-extrabold text-slate-900 dark:text-white">
                      {viewingClass.students.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">sinh viên</span>
                    </p>
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Đã ghi danh vào lớp
                    </p>
                  </div>
                </div>
              </div>

              {/* Khung nội dung chi tiết: Danh sách sinh viên */}
              <div className="rounded-lg border border-slate-300 bg-slate-50/60 p-4 sm:p-5 dark:border-white/10 dark:bg-white/5 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Danh sách sinh viên ghi danh ({filteredStudents.length} / {viewingClass.students.length} SV)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Quản lý sinh viên chính thức trong lớp học phần {viewingClass.id}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative min-w-[200px] sm:min-w-[240px]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Tìm MSSV, họ tên, email..."
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-xs outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleExportStudentList}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15 cursor-pointer"
                      title="Xuất file CSV"
                    >
                      <Download className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                      <span>Xuất CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetClassForStudent(viewingClass);
                        setIsImportStudentsOpen(true);
                      }}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15 cursor-pointer"
                      title="Nhập danh sách từ Excel/CSV"
                    >
                      <Upload className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                      <span>Nhập Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddStudentError('');
                        openAddStudentModal(viewingClass);
                      }}
                      className="system-primary-action inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800 cursor-pointer"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Thêm SV</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xs dark:border-white/10 dark:bg-neutral-950">
                  <div className="overflow-x-auto max-h-[380px]">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10.5px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-300 dark:bg-neutral-900 dark:text-slate-300 dark:border-white/10">
                        <tr>
                          <th className="px-4 py-3 w-12 text-center">STT</th>
                          <th className="px-4 py-3 w-32">MÃ SINH VIÊN</th>
                          <th className="px-4 py-3">HỌ VÀ TÊN</th>
                          <th className="px-4 py-3">EMAIL TRƯỜNG</th>
                          <th className="px-4 py-3 w-28 text-center">TRẠNG THÁI</th>
                          <th className="px-4 py-3 w-16 text-right">XÓA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-white/5 dark:text-slate-200">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((student, index) => {
                            const hasMissing = student.missingFields && student.missingFields.length > 0;
                            const isMissingId = student.missingFields?.includes('Thiếu Mã SV') || !student.id;
                            const isMissingName = student.missingFields?.includes('Thiếu Họ và tên') || !student.name;
                            const isMissingEmail =
                              student.missingFields?.includes('Thiếu Email') ||
                              student.missingFields?.includes('Email sai định dạng') ||
                              !student.email;

                            return (
                              <tr
                                key={student.id || index}
                                className={`transition-colors ${
                                  hasMissing
                                    ? 'bg-amber-50/40 hover:bg-amber-50 dark:bg-amber-500/10 dark:hover:bg-amber-500/15'
                                    : 'hover:bg-slate-50/80 dark:hover:bg-white/5'
                                }`}
                              >
                                <td className="px-4 py-3 text-center font-medium text-slate-400">{index + 1}</td>
                                <td className="px-4 py-3 font-bold font-mono text-slate-900 dark:text-white">
                                  {isMissingId ? (
                                    <span className="text-[11px] font-bold text-red-600">Thiếu Mã SV</span>
                                  ) : (
                                    student.id
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-[10px] font-bold ${getAvatarColor(
                                        student.id
                                      )}`}
                                    >
                                      {getStudentInitials(student.name)}
                                    </div>
                                    <div className="min-w-0">
                                      {isMissingName ? (
                                        <span className="text-[11px] font-bold text-red-600">Thiếu Họ và tên</span>
                                      ) : (
                                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{student.name}</p>
                                      )}
                                      {student.homeroomClass && (
                                        <span className="text-[10px] text-slate-400">
                                          Lớp: {student.homeroomClass}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                  {isMissingEmail ? (
                                    <span className="text-[11px] font-bold text-red-600">
                                      {student.missingFields?.includes('Email sai định dạng')
                                        ? `Email sai (${student.email})`
                                        : 'Thiếu Email'}
                                    </span>
                                  ) : (
                                    <span className="truncate">{student.email || '—'}</span>
                                  )}
                                  {student.phone ? ` • ${student.phone}` : ''}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {hasMissing ? (
                                    <span className="text-[11px] font-bold text-amber-700">
                                      ⚠ {student.missingFields?.join(', ')}
                                    </span>
                                  ) : (
                                    <span
                                      className={`text-xs font-semibold ${
                                        student.status === 'Đang học'
                                          ? 'text-emerald-700 dark:text-emerald-400'
                                          : student.status === 'Học ghép'
                                          ? 'text-slate-900 dark:text-white'
                                          : student.status === 'Học lại'
                                          ? 'text-amber-700 dark:text-amber-400'
                                          : student.status === 'Học vượt'
                                          ? 'text-purple-700 dark:text-purple-400'
                                          : 'text-slate-600 dark:text-slate-400'
                                      }`}
                                    >
                                      {student.status}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTargetClassForStudent(viewingClass);
                                      setDeletingStudent(student);
                                    }}
                                    title={`Xóa sinh viên ${student.name}`}
                                    aria-label={`Xóa sinh viên ${student.name}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:bg-white/5 dark:hover:bg-red-500/15 cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                              {studentSearch ? 'Không tìm thấy sinh viên phù hợp với từ khóa.' : 'Lớp chưa có sinh viên nào ghi danh.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Danh sách sinh viên chính thức được ghi nhận trong lớp học phần.
                </p>
              </div>
            </div>

            {/* Footer Modal Chi tiết lớp */}
            <div className="flex items-center justify-between gap-4 border-t border-slate-300 px-8 py-5 bg-slate-50/60 dark:border-white/10 dark:bg-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Trạng thái lớp:</span>
                <StatusBadge status={viewingClass.status} />
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleEditFromDetail}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-2xs transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-200 cursor-pointer"
                >
                  <Pencil className="h-4 w-4 text-brand" />
                  <span>Sửa thông tin lớp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingClass(null)}
                  className="system-primary-action inline-flex h-11 items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 cursor-pointer shrink-0"
                >
                  Đóng
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── MODAL TÌM KIẾM & GHI DANH SINH VIÊN VÀO LỚP HỌC PHẦN ── */}
      {isAddStudentOpen && (targetClassForStudent || viewingClass || selectedClass) && (() => {
        const targetAddClass = targetClassForStudent || viewingClass || selectedClass;
        if (!targetAddClass) return null;
        return (
          <div
            className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/45 p-4 sm:p-6 pt-12 sm:pt-16 pb-12 sm:pb-16 backdrop-blur-[2px] overflow-y-auto"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setIsAddStudentOpen(false);
                setSelectedStudentToEnroll(null);
                setStudentSearchKeyword('');
                setAddStudentError('');
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-student-title"
              className="my-auto w-full max-w-xl max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-300 dark:bg-neutral-900 dark:border-white/10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                <div>
                  <h2 id="add-student-title" className="text-base font-bold text-slate-900 dark:text-white">
                    Ghi danh sinh viên vào lớp học phần
                  </h2>
                  <p className="text-xs text-slate-900 dark:text-white dark:text-blue-400 font-semibold mt-0.5">
                    {targetAddClass.id} • {targetAddClass.name} ({targetAddClass.semester})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddStudentOpen(false);
                    setSelectedStudentToEnroll(null);
                    setStudentSearchKeyword('');
                    setAddStudentError('');
                  }}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer dark:hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {/* Thanh tìm kiếm sinh viên từ hệ thống */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tìm kiếm sinh viên trong hệ thống <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      value={studentSearchKeyword}
                      onChange={(e) => {
                        setStudentSearchKeyword(e.target.value);
                        setAddStudentError('');
                      }}
                      placeholder="Nhập MSSV, Họ tên hoặc Email sinh viên..."
                      className="h-9 w-full rounded-md border border-slate-300 bg-white pl-10 pr-10 text-xs outline-none transition focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white font-medium"
                    />
                    {isSearchingStudent && (
                      <RotateCcw className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-900 dark:text-white" />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Tìm kiếm tức thì sinh viên đã có tài khoản trong hệ thống để ghi danh vào lớp.
                  </p>
                </div>

                {/* Danh sách kết quả tìm kiếm */}
                {studentSearchKeyword.trim().length > 0 && !selectedStudentToEnroll && (
                  <div className="rounded-md border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-2 max-h-56 overflow-y-auto space-y-1.5">
                    {isSearchingStudent ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Đang tìm kiếm sinh viên...
                      </div>
                    ) : searchedStudents.length > 0 ? (
                      searchedStudents.map((st) => {
                        const mssv = st.student_id || st.username || String(st.user_id);
                        const isEnrolled =
                          st.is_enrolled ||
                          targetAddClass.students.some(
                            (s) => s.id.toLowerCase() === mssv.toLowerCase()
                          );

                        return (
                          <div
                            key={st.user_id || mssv}
                            onClick={() => {
                              if (!isEnrolled) {
                                setSelectedStudentToEnroll(st);
                                setAddStudentError('');
                              }
                            }}
                            className={`flex items-center justify-between gap-3 p-2.5 rounded border transition ${
                              isEnrolled
                                ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-white/5 dark:border-white/5'
                                : 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50 cursor-pointer dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={`flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded text-xs font-bold ${getAvatarColor(
                                  mssv
                                )}`}
                              >
                                {getStudentInitials(st.full_name || 'SV')}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-snug">
                                  {st.full_name}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate leading-normal mt-0.5">
                                  MSSV: <span className="font-semibold text-slate-700 dark:text-slate-200">{mssv}</span> • {st.email}
                                  {st.lop_sinh_hoat ? ` • ${st.lop_sinh_hoat}` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {isEnrolled ? (
                                <span className="inline-block rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-400">
                                  Đã trong lớp
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStudentToEnroll(st);
                                    setAddStudentError('');
                                  }}
                                  className="system-primary-action rounded bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
                                >
                                  Chọn
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Không tìm thấy sinh viên nào với từ khóa &quot;{studentSearchKeyword}&quot;.
                      </div>
                    )}
                  </div>
                )}

                {/* Thẻ sinh viên đã được chọn */}
                {selectedStudentToEnroll && (
                  <div className="rounded-md border border-blue-200 bg-slate-100 dark:bg-white/10 p-3.5 dark:border-blue-500/30 dark:bg-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-bold ${getAvatarColor(
                            selectedStudentToEnroll.student_id || selectedStudentToEnroll.username || ''
                          )}`}
                        >
                          {getStudentInitials(selectedStudentToEnroll.full_name || 'SV')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                              {selectedStudentToEnroll.full_name}
                            </span>
                            <span className="rounded bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white px-2 py-0.5 text-[10px] font-bold dark:bg-blue-400/20 dark:text-blue-300">
                              Đã chọn
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate dark:text-slate-400 leading-normal">
                            MSSV: <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedStudentToEnroll.student_id || selectedStudentToEnroll.username}</span> • {selectedStudentToEnroll.email}
                            {selectedStudentToEnroll.lop_sinh_hoat ? ` • ${selectedStudentToEnroll.lop_sinh_hoat}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentToEnroll(null)}
                        className="text-xs font-semibold text-slate-900 dark:text-white hover:text-blue-800 underline cursor-pointer shrink-0 ml-1 dark:text-blue-400"
                      >
                        Đổi SV khác
                      </button>
                    </div>
                  </div>
                )}

                {/* Cấu hình phân loại ghi danh & ghi chú */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Phân loại ghi danh <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={enrollStatus}
                      onChange={(e) => setEnrollStatus(e.target.value as StudentStatus)}
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white cursor-pointer"
                    >
                      <option value="Đang học">Đang học (Chính thức theo kế hoạch)</option>
                      <option value="Học ghép">Học ghép (Đăng ký bổ sung)</option>
                      <option value="Học lại">Học lại / Cải thiện điểm</option>
                      <option value="Học vượt">Học vượt</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Ghi chú ghi danh
                    </label>
                    <input
                      value={enrollNote}
                      onChange={(e) => setEnrollNote(e.target.value)}
                      placeholder="Ví dụ: Đăng ký tín chỉ bổ sung đợt 2..."
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-slate-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                </div>

                {addStudentError && (
                  <p role="alert" className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-md border border-red-200">
                    {addStudentError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddStudentOpen(false);
                      setSelectedStudentToEnroll(null);
                      setStudentSearchKeyword('');
                      setAddStudentError('');
                    }}
                    className="h-9 rounded-md border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={!selectedStudentToEnroll}
                    onClick={handleConfirmEnrollStudent}
                    className={`h-9 rounded-md px-5 text-xs font-semibold text-white shadow-sm transition ${
                      selectedStudentToEnroll
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-none hover:bg-slate-800 dark:hover:bg-slate-200 cursor-pointer'
                        : 'bg-slate-300 cursor-not-allowed opacity-70'
                    }`}
                  >
                    Xác nhận ghi danh vào lớp
                  </button>
                </div>
              </div>
            </section>
          </div>
        );
      })()}

{/* ── MODAL NHẬP HÀNG LOẠT SINH VIÊN BẰNG EXCEL / CSV (ĐỒNG BỘ MODULE NGƯỜI DÙNG) ── */}
      {isImportStudentsOpen && (targetClassForStudent || viewingClass || selectedClass) && (() => {
        const targetImportClass = targetClassForStudent || viewingClass || selectedClass;
        if (!targetImportClass) return null;
        return (
          <div
            className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/45 p-4 sm:p-6 pt-10 sm:pt-14 pb-10 sm:pb-14 backdrop-blur-[2px] overflow-y-auto"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setIsImportStudentsOpen(false);
                handleResetImportStudentState();
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="import-student-title"
              className="my-auto w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-300 dark:bg-neutral-900 dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="import-student-title" className="text-lg font-bold text-slate-900 dark:text-white">
                    Nhập danh sách sinh viên bổ sung (Excel / CSV)
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Bổ sung danh sách sinh viên vào lớp học phần{' '}
                    <strong className="text-slate-900 dark:text-white dark:text-blue-400 font-bold">{targetImportClass.id}</strong> ({targetImportClass.name}).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsImportStudentsOpen(false);
                    handleResetImportStudentState();
                  }}
                  aria-label="Đóng"
                  className="flex h-8 w-8 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer dark:hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

            <div className="mt-5 space-y-4">
              {/* Thẻ input ẩn để chọn tệp */}
              <input
                ref={importStudentFileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleProcessImportStudentFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {/* VÙNG THẢ TỆP (DRAG & DROP ZONE) */}
              {!importStudentFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsImportStudentDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsImportStudentDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsImportStudentDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleProcessImportStudentFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => importStudentFileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                    isImportStudentDragging
                      ? 'border-blue-600 bg-slate-100 dark:bg-white/10 scale-[0.99]'
                      : 'border-slate-200 bg-slate-50/60 hover:border-blue-400 hover:bg-slate-100 dark:bg-white/10'
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-md transition ${
                      isImportStudentDragging ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white'
                    }`}
                  >
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-800">
                    Kéo thả tệp dữ liệu vào đây hoặc{' '}
                    <span className="text-slate-900 dark:text-white underline">chọn từ máy tính</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Hỗ trợ định dạng .csv, .xlsx, .xls (Dung lượng tối đa: 10MB)
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    3 cột chuẩn: Mã sinh viên, Họ và tên, Email
                  </p>
                </div>
              ) : (
                /* THẺ HIỂN THỊ TỆP ĐÃ ĐƯỢC CHỌN */
                <div className="rounded-md border border-blue-200 bg-slate-100 dark:bg-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{importStudentFile.name}</p>
                        <p className="text-xs text-slate-500">
                          {(importStudentFile.size / 1024).toFixed(1)} KB · Đọc được {previewStudents.length} sinh viên
                          {importStudentWarnings.length > 0 ? ` (${importStudentWarnings.length} cảnh báo thiếu thông tin)` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetImportStudentState}
                      className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-red-600 shadow-xs cursor-pointer transition"
                      title="Gỡ tệp để chọn tệp khác"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Loading khi phân tích file */}
              {isImportStudentParsing && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-slate-900 dark:text-white">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <span>Đang phân tích dữ liệu tệp...</span>
                </div>
              )}

              {/* Thông báo lỗi không đọc được tệp */}
              {importStudentError && (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{importStudentError}</span>
                </div>
              )}

              {/* Cảnh báo thiếu cột hoặc dòng thiếu thông tin */}
              {importStudentWarnings.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      Phát hiện {importStudentWarnings.length} cảnh báo thiếu trường / cột dữ liệu (Vẫn cho phép nhập):
                    </span>
                  </div>
                  <ul className="max-h-28 overflow-y-auto list-disc pl-5 space-y-0.5 text-[11.5px] font-medium text-amber-800">
                    {importStudentWarnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-amber-700 pt-0.5">
                    * Các trường bị thiếu đã được đánh dấu đỏ bên dưới. Bạn vẫn có thể nhấn <strong>Xác nhận nhập</strong> và chỉnh sửa bổ sung sau.
                  </p>
                </div>
              )}

              {/* Thông báo quy định tài khoản bắt buộc */}
              <div className="rounded-md border border-blue-200 bg-slate-100 dark:bg-white/10 p-3.5 text-xs text-blue-900 flex items-start gap-3">
                <div className="mt-0.5 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-1.5 text-white shrink-0">
                  <UserRoundCheck className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-blue-950">
                    Quy định: Sinh viên bắt buộc phải có tài khoản người dùng
                  </p>
                  <p className="text-[11.5px] leading-relaxed text-blue-800">
                    Để tham gia lớp, thi trực tuyến và thực hành lập trình có AI giám sát, tất cả sinh viên buộc phải có tài khoản.
                    Đối với các sinh viên trong danh sách <strong>chưa có tài khoản</strong>, hệ thống sẽ <strong>tự động tạo tài khoản</strong> (quyền Học viên, gửi thông tin đăng nhập qua Email) và ghi danh ngay vào lớp học phần này.
                  </p>
                </div>
              </div>

              {/* BẢNG XEM TRƯỚC DANH SÁCH SINH VIÊN */}
              {previewStudents.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Xem trước danh sách sinh viên ({previewStudents.length} sinh viên)
                    </p>
                    {importStudentWarnings.length > 0 ? (
                      <span className="text-[11px] font-semibold text-amber-600">
                        ⚠ Có trường thiếu · Vẫn có thể nhập
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-600">✓ Đủ 3 trường hợp lệ</span>
                    )}
                  </div>
                  <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 w-12 text-center">STT</th>
                          <th className="px-3 py-2.5 w-28">Mã sinh viên</th>
                          <th className="px-3 py-2.5">Họ và tên</th>
                          <th className="px-3 py-2.5">Email</th>
                          <th className="px-3 py-2.5 w-44">Tài khoản &amp; Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewStudents.map((st, i) => {
                          const hasMissing = st.missingFields.length > 0;
                          const isMissingId = st.missingFields.includes('Thiếu Mã SV') || !st.id;
                          const isMissingName = st.missingFields.includes('Thiếu Họ và tên') || !st.name;
                          const isMissingEmail =
                            st.missingFields.includes('Thiếu Email') ||
                            st.missingFields.includes('Email sai định dạng') ||
                            !st.email;

                          return (
                            <tr
                              key={st.id || i}
                              className={isMissingId || isMissingName ? 'bg-red-50/40 hover:bg-red-50/70' : hasMissing ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50/60'}
                            >
                              <td className="px-3 py-2 text-center font-medium text-slate-400">{i + 1}</td>
                              <td className="px-3 py-2 font-bold text-slate-900">
                                {isMissingId ? (
                                  <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                                    Thiếu Mã SV
                                  </span>
                                ) : (
                                  st.id
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-700 font-medium">
                                {isMissingName ? (
                                  <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                                    Thiếu Họ và tên
                                  </span>
                                ) : (
                                  st.name
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-500">
                                {isMissingEmail ? (
                                  <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                                    {st.missingFields.includes('Email sai định dạng')
                                      ? `Sai Email (${st.email})`
                                      : 'Thiếu Email'}
                                  </span>
                                ) : (
                                  st.email
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {isMissingId || isMissingName ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                    ✕ Thiếu thông tin tạo TK
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-900 dark:text-white">
                                    ✓ Tự động kích hoạt tài khoản
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TẢI TỆP MẪU CHUẨN */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-md border border-slate-300 bg-white p-3.5">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Tệp mẫu chuẩn Oculide (CSV / Excel)</p>
                    <p className="text-[11px] text-slate-400">
                      3 cột bắt buộc: Mã sinh viên, Họ và tên, Email
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadStudentSampleTemplate}
                    className="inline-flex items-center gap-1.5 rounded border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Tải tệp mẫu</span>
                  </button>
                </div>
              </div>

              {/* NÚT THAO TÁC */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportStudentsOpen(false);
                    handleResetImportStudentState();
                  }}
                  className="h-10 rounded-md border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={previewStudents.length === 0 || previewStudents.filter((s) => s.id && s.name).length === 0}
                  onClick={handleConfirmBulkImportStudents}
                  className={`h-10 rounded-md px-5 text-xs font-semibold transition cursor-pointer ${
                    previewStudents.filter((s) => s.id && s.name).length > 0
                      ? 'system-primary-action bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Xác nhận nhập ({previewStudents.filter((s) => s.id && s.name).length} sinh viên hợp lệ)
                </button>
              </div>
            </div>
          </section>
        </div>
        );
      })()}

      {/* Modal Xác nhận xóa sinh viên khỏi lớp */}
      {deletingStudent && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDeletingStudent(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-student-title"
            className="w-full max-w-md rounded-md bg-white p-6 shadow-xl border border-slate-300"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 id="delete-student-title" className="text-lg font-bold text-slate-900">
                  Xóa sinh viên khỏi lớp
                </h2>
                <p className="text-xs text-slate-500">
                  {viewingClass ? `Lớp ${viewingClass.id} • ${viewingClass.name}` : 'Xác nhận xóa sinh viên'}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa sinh viên{' '}
              <strong className="font-bold text-slate-900">{deletingStudent.name}</strong> (
              {deletingStudent.id}) ra khỏi lớp này không?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="h-9 rounded-md border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDeleteStudent}
                className="h-9 rounded-md bg-red-600 px-4 text-xs font-semibold text-white transition hover:bg-red-700 cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Modal Chỉnh sửa thông tin lớp */}
      <EditClassModal
        editingClass={editingClass}
        onClose={closeEditModal}
        onSubmit={saveEditClass}
        availableSemesters={availableSemesters}
        instructorsList={instructorsList}
        editError={editError}
      />

      {/* Modal Xác nhận xóa lớp */}
      {deletingClass && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-class-title"
            className="w-full max-w-md rounded-md bg-white p-6 shadow-xl"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 id="delete-class-title" className="text-lg font-bold text-slate-900">
                  Xác nhận xóa lớp
                </h2>
                <p className="text-xs text-slate-500">Hành động này không thể hoàn tác.</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa lớp{' '}
              <strong className="font-bold text-slate-900">
                {deletingClass.id} - {deletingClass.name}
              </strong>
              ? Danh sách{' '}
              <strong className="font-semibold text-slate-800">
                {deletingClass.studentCount} sinh viên
              </strong>{' '}
              trong lớp này sẽ được gỡ khỏi danh sách quản lý.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="h-9 rounded-md border border-slate-300 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDeleteClass}
                className="h-9 rounded-md bg-red-700 px-4 text-xs font-semibold text-white transition hover:bg-red-700 cursor-pointer"
              >
                Xóa lớp học
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function ClassManagerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f4f7f9] text-sm text-slate-500">
          Đang tải dữ liệu lớp học...
        </div>
      }
    >
      <ClassManagerContent />
    </Suspense>
  );
}

function StatusBadge({ status }: { status: ClassStatus }) {
  if (status === 'Chưa mở') {
    return (
      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
        Chưa mở
      </span>
    );
  }

  if (status === 'Hoạt động') {
    return (
      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        Hoạt động
      </span>
    );
  }

  return (
    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
      Đã kết thúc
    </span>
  );
}
