'use client';

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  UploadCloud,
  UserPlus,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import {
  parseStudentFile,
  downloadStudentSampleTemplate,
  ParsedStudentRow,
} from './excelParser';
import {
  ClassExam,
  ClassLab,
  ClassRow,
  ClassStatus,
  ExamStatus,
  INITIAL_CLASSES,
  MOCK_CLASS_IDS,
  LabStatus,
  QuestionTemplate,
  SAMPLE_QUESTION_TEMPLATES,
  StudentRow,
  StudentStatus,
  addMinutesToIso,
  calculateDurationInMinutes,
  formatDatetimeVietnamese,
  generateRandomPassword,
  generateRandomRoomCode,
  getStoredClasses,
  getStoredQuestionTemplates,
  saveStoredClasses,
  toIsoDatetime,
} from './types';

const SEMESTERS = ['HK1 2026–2027', 'HK2 2026–2027', 'HKT 2026-27', 'HKT 2025-26'];

function getStudentInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'SV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
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
  return AVATAR_COLORS[hash] || 'bg-blue-100 text-blue-700';
}

function ClassManagerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [classes, setClasses] = useState<ClassRow[]>(INITIAL_CLASSES);
  const [selectedClassId, setSelectedClassId] = useState(INITIAL_CLASSES[0]?.id || '');
  const selectedClass = classes.find((item) => item.id === selectedClassId) ?? null;
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState('Tất cả học kỳ');
  const [status, setStatus] = useState('Tất cả trạng thái');
  const [studentSearch, setStudentSearch] = useState('');
  const [dbSemesters, setDbSemesters] = useState<Array<{ ma_hoc_ky: string; ten_hoc_ky: string }>>([]);

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
          // Fallback tìm kiếm trong danh sách sinh viên mẫu
          const allStoredStudents: any[] = [];
          classes.forEach((c) => c.students.forEach((s) => allStoredStudents.push(s)));
          const kLower = keyword.toLowerCase();
          const filtered = allStoredStudents
            .filter(
              (s) =>
                s.id.toLowerCase().includes(kLower) ||
                s.name.toLowerCase().includes(kLower) ||
                (s.email && s.email.toLowerCase().includes(kLower))
            )
            .map((s) => ({
              user_id: s.id,
              student_id: s.id,
              full_name: s.name,
              email: s.email || `${s.id.toLowerCase()}@dtu.edu.vn`,
              lop_sinh_hoat: s.homeroomClass || 'K29-CSU',
              department: s.department || 'Khoa CMU',
              is_enrolled: targetClass?.students.some((st) => st.id === s.id) ?? false,
            }));
          setSearchedStudents(filtered.slice(0, 8));
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm sinh viên:', err);
      } finally {
        setIsSearchingStudent(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [studentSearchKeyword, isAddStudentOpen, targetClassForStudent, viewingClass, selectedClass, classes]);

  // Sync with localStorage on client mount & handle newly created class param
  useEffect(() => {
    const stored = getStoredClasses();
    setClasses(stored);
    const createdId = searchParams.get('created');
    setSelectedClassId((currentSelected) => {
      if (createdId && stored.some((c) => c.id === createdId)) {
        return createdId;
      }
      if (stored.length > 0 && !stored.some((c) => c.id === currentSelected)) {
        return stored[0].id;
      }
      return currentSelected;
    });

    // Đồng bộ danh sách lớp học thực tế từ CSDL Backend (SQL Server)
    async function syncClassesFromApi() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
        let res = await fetch('/api/v1/classes', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if ((res.status === 401 || res.status === 403) && token) {
          res = await fetch('/api/v1/classes');
        }
        if (res.ok) {
          const apiClasses = await res.json();
          if (Array.isArray(apiClasses)) {
            // Nguồn dữ liệu lớp học lấy trực tiếp 100% từ bảng LopHoc trong CSDL SQL Server
            const realClasses: ClassRow[] = apiClasses.map((apiCls: any) => ({
              id: apiCls.class_code,
              name: apiCls.class_name,
              courseCode: apiCls.course_code,
              sectionCode: apiCls.section_code,
              semester: apiCls.semester || 'HK1 2026–2027',
              startDate: '05/09/2026',
              endDate: '15/01/2027',
              roomCode: `${apiCls.class_code}-ROOM`,
              roomPassword: '123456',
              status: 'Hoạt động',
              lecturer: apiCls.instructor_name || 'TS. Huỳnh Bá Diệu',
              studentCount: typeof apiCls.student_count === 'number' ? apiCls.student_count : 0,
              students: [],
              labs: [],
              exams: [],
            }));

            setClasses(realClasses);
            saveStoredClasses(realClasses);

            const createdId = searchParams.get('created');
            setSelectedClassId((current) => {
              if (createdId && realClasses.some((c) => c.id === createdId)) {
                return createdId;
              }
              if (!current || !realClasses.some((c) => c.id === current)) {
                return realClasses[0]?.id || '';
              }
              return current;
            });
          }
        }
      } catch (err) {
        console.error('Không thể đồng bộ lớp từ CSDL:', err);
      }
    }
    syncClassesFromApi();
  }, [searchParams]);

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
    loadSemesters();
  }, []);

  // Đồng bộ danh sách sinh viên ghi danh trong lớp từ CSDL Backend khi chọn lớp
  useEffect(() => {
    if (!selectedClassId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
    fetch(`/api/v1/classes/${encodeURIComponent(selectedClassId)}/students`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((enrolledList) => {
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
              c.id === selectedClassId
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
            if (prev && prev.id === selectedClassId) {
              return {
                ...prev,
                students: mappedStudents,
                studentCount: mappedStudents.length,
              };
            }
            return prev;
          });
        }
      })
      .catch((err) => console.error('Lỗi đồng bộ SV lớp:', err));
  }, [selectedClassId]);

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
    const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
    fetch(`/api/v1/classes/${targetClassId}/students/${deletingStudent.id}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).catch((err) => console.error('Lỗi khi xóa SV khỏi CSDL:', err));

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
    const email =
      selectedStudentToEnroll.email || `${studentId.toLowerCase()}@dtu.edu.vn`;

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
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('oculide_token')
        : null;
    fetch(`/api/v1/classes/${target.id}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        student_user_id: selectedStudentToEnroll.user_id,
        status:
          enrollStatus === 'Học ghép'
            ? 'hoc_ghep'
            : enrollStatus === 'Học lại'
            ? 'hoc_lai'
            : enrollStatus === 'Học vượt'
            ? 'hoc_vuot'
            : 'dang_hoc',
      }),
    }).catch(() => {
      // Fallback nếu lớp chưa được lưu trong SQL Server
      fetch('/api/v1/admin/users/batch-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          role: 'student',
          users: [
            {
              username: email.split('@')[0],
              email: email,
              full_name: studentName,
              student_id: studentId,
              lop_sinh_hoat: selectedStudentToEnroll.lop_sinh_hoat,
              department: selectedStudentToEnroll.department,
            },
          ],
        }),
      }).catch((err) => console.error(err));
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
          email: p.email || `${p.id.toLowerCase()}@dtu.edu.vn`,
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
          const fallbackEmail = emailVal || (s.id ? `${s.id.toLowerCase()}@dtu.edu.vn` : '');
          return {
            username: fallbackEmail ? fallbackEmail.split('@')[0].trim().toLowerCase() : (s.id || '').toLowerCase(),
            email: fallbackEmail,
            full_name: (s.name || '').trim() || (s.id || 'Sinh viên'),
            student_id: (s.id || '').trim().toUpperCase(),
          };
        })
        .filter((u) => u.email && u.full_name);

      if (validUsers.length > 0) {
        try {
          // 1. Tự động khởi tạo tài khoản cho các sinh viên chưa có trên hệ thống
          await fetch('/api/v1/admin/users/batch-import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              role: 'student',
              users: validUsers,
            }),
          });

          // 2. Ghi danh từng sinh viên vào lớp trong CSDL SQL Server (SinhVienLopHoc)
          for (const s of newStudents) {
            if (!s.id) continue;
            try {
              await fetch(`/api/v1/classes/${encodeURIComponent(target.id)}/students`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  student_user_id: s.id,
                  status: 'dang_hoc',
                }),
              });
            } catch (enrollErr) {
              console.warn(`Lỗi ghi danh sinh viên ${s.id} vào CSDL:`, enrollErr);
            }
          }
        } catch (err) {
          console.error('Lỗi khi đồng bộ danh sách tài khoản sinh viên:', err);
        }
      }
    }

    setIsImportStudentsOpen(false);
    handleResetImportStudentState();
  }

  function handleExportStudentList() {
    if (!viewingClass || viewingClass.students.length === 0) return;
    const header = 'STT,Mã sinh viên,Họ và tên,Email,Lớp,Trạng thái\n';
    const rows = viewingClass.students
      .map(
        (st, idx) =>
          `${idx + 1},${st.id},"${st.name}",${st.email},${viewingClass.id},${st.status}`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Sach_Sinh_Vien_Lop_${viewingClass.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleExportClasses() {
    if (classes.length === 0) return;
    const header = 'STT,Mã lớp,Tên lớp học phần,Học kỳ,Giảng viên phụ trách,Sĩ số,Trạng thái\n';
    const rows = classes
      .map(
        (c, idx) =>
          `${idx + 1},"${c.id}","${c.name}","${c.semester}","${c.lecturer || 'Chưa phân công'}",${c.students.length},"${c.status}"`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Sach_Lop_Hoc_Oculide.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function openEditModal(classItem: ClassRow) {
    setEditError('');
    setEditingClass(classItem);
  }

  function closeEditModal() {
    setEditError('');
    setEditingClass(null);
  }

  function handleToggleClassStatus(classId: string, newStatus: ClassStatus) {
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
  }

  function saveEditClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingClass) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const newId = String(formData.get('classId') ?? '').trim().toUpperCase();
    const name = String(formData.get('className') ?? '').trim();
    const classSemester = String(formData.get('semester') ?? '').trim();
    const classStartDate = String(formData.get('startDate') ?? '').trim() || '05/09/2026';
    const classEndDate = String(formData.get('endDate') ?? '').trim() || '15/01/2027';
    const classRoomCode = String(formData.get('roomCode') ?? '').trim().toUpperCase() || `${newId}-ROOM`;
    const classRoomPassword = String(formData.get('roomPassword') ?? '').trim() || '123456';
    const classStatus = String(formData.get('status') ?? 'Hoạt động') as ClassStatus;

    if (!newId) {
      setEditError('Mã lớp không được để trống.');
      return;
    }
    if (!name) {
      setEditError('Tên lớp không được để trống.');
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
            semester: classSemester,
            startDate: classStartDate,
            endDate: classEndDate,
            roomCode: classRoomCode,
            roomPassword: classRoomPassword,
            status: classStatus,
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
        semester: classSemester,
        startDate: classStartDate,
        endDate: classEndDate,
        roomCode: classRoomCode,
        roomPassword: classRoomPassword,
        status: classStatus,
      });
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
    const query = studentSearch.trim().toLocaleLowerCase('vi');
    if (!selectedClass) return [];
    if (!query) return selectedClass.students;
    return selectedClass.students.filter(
      (student) =>
        student.id.toLocaleLowerCase('vi').includes(query) ||
        student.name.toLocaleLowerCase('vi').includes(query) ||
        student.email.toLocaleLowerCase('vi').includes(query)
    );
  }, [selectedClass, studentSearch]);

  const totalStudents = classes.reduce((sum, item) => sum + item.studentCount, 0);
  const activeClasses = classes.filter((item) => item.status === 'Hoạt động').length;

  return (
    <div className="flex min-h-screen w-full bg-[#f4f7f9] dark:bg-[#090a0f] text-slate-800 dark:text-slate-100 transition-colors">
      <AdminSidebar activeModule="classes" />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar title="Quản lý lớp & sinh viên" />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1440px]">
            {/* Header: Tiêu đề + Nút Tạo lớp mới */}
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  Quản lý đào tạo
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
                  Lớp học &amp; sinh viên
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Theo dõi lớp học, danh sách sinh viên và các phiên thực hành, kiểm tra lập trình.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Nút Xuất Excel */}
                <button
                  type="button"
                  onClick={handleExportClasses}
                  title="Xuất danh sách lớp học ra file Excel/CSV"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-slate-500" />
                  <span>Xuất danh sách lớp học</span>
                </button>

                {/* Nút Tạo lớp mới */}
                <Link
                  href="/admin/classes/create"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tạo lớp mới</span>
                </Link>
              </div>
            </div>

            {/* Thống kê 3 thẻ tinh gọn */}
            <section className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: 'Tổng số lớp',
                  value: classes.length,
                  icon: BookOpen,
                  color: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
                },
                {
                  label: 'Lớp hoạt động',
                  value: activeClasses,
                  icon: UserRoundCheck,
                  color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
                },
                {
                  label: 'Tổng sinh viên',
                  value: totalStudents,
                  icon: GraduationCap,
                  color: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-xs dark:border-white/10 dark:bg-[#0d1017] transition-colors"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-400">{item.label}</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Bảng danh sách lớp & Panel sinh viên */}
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              {/* Danh sách lớp với Toolbar tích hợp tinh gọn */}
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-white/10 dark:bg-[#0d1017] transition-colors">
                {/* Toolbar tích hợp ngay trên đầu bảng */}
                <div className="border-b border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">Danh sách lớp</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {filteredClasses.length} lớp học • Nhấp chọn hàng để xem sinh viên
                      </p>
                    </div>
                    <BookOpen className="h-4 w-4 text-slate-400" />
                  </div>

                  {/* Thanh tìm kiếm & bộ lọc đồng bộ chuẩn h-11 text-sm */}
                  <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1 min-w-0">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm theo mã hoặc tên lớp..."
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
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
                          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                        >
                          <option value="Tất cả học kỳ">Tất cả học kỳ</option>
                          {availableSemesters.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>

                      <div className="relative flex-1 sm:w-44 sm:flex-initial">
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
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
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/80 dark:bg-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/10">
                      <tr>
                        <th scope="col" className="px-4 py-2.5">
                          Lớp học
                        </th>
                        <th scope="col" className="px-3 py-2.5 whitespace-nowrap">
                          Học kỳ & Thời gian
                        </th>
                        <th scope="col" className="px-2 py-2.5 text-center whitespace-nowrap">
                          Sĩ số
                        </th>
                        <th scope="col" className="px-3 py-2.5 whitespace-nowrap">
                          Giảng viên phụ trách
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-center whitespace-nowrap">
                          Trạng thái
                        </th>
                        <th scope="col" className="px-4 py-2.5 text-right whitespace-nowrap">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/10 text-xs">
                      {filteredClasses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                            <GraduationCap className="mx-auto h-8 w-8 mb-2 opacity-30 text-slate-500" />
                            <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">Không tìm thấy lớp học nào</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Bấm nút &ldquo;Tạo lớp học mới&rdquo; để thêm lớp học phần</p>
                          </td>
                        </tr>
                      ) : (
                        filteredClasses.map((classItem) => {
                          const isSelected = selectedClassId === classItem.id;
                          return (
                            <tr
                              key={classItem.id}
                              onClick={() => {
                                setSelectedClassId(classItem.id);
                                setStudentSearch('');
                              }}
                              className={`transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50/70 dark:bg-blue-500/15 font-medium'
                                  : 'hover:bg-slate-50/70 dark:hover:bg-white/5'
                              }`}
                            >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full shrink-0 transition-opacity ${
                                    isSelected ? 'bg-blue-600 opacity-100' : 'opacity-0'
                                  }`}
                                />
                                <div>
                                  <p
                                    className={`font-bold ${
                                      isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'
                                    }`}
                                  >
                                    {classItem.id}
                                  </p>
                                  <p className="mt-0.5 text-[11.5px] font-medium text-slate-500 truncate max-w-[200px]">
                                    {classItem.name}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <p className="font-semibold text-slate-700">{classItem.semester}</p>
                              <div className="mt-0.5 flex items-center gap-1 text-[10.5px] text-slate-400">
                                <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                                <span>{classItem.startDate || '05/09/2026'} – {classItem.endDate || '15/01/2027'}</span>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-center whitespace-nowrap font-bold text-slate-700 dark:text-slate-200">
                              {classItem.studentCount}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-bold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                                  {classItem.lecturer ? classItem.lecturer.slice(0, 2).toUpperCase() : 'GV'}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs leading-tight">
                                    {classItem.lecturer || 'Chưa phân công'}
                                  </p>
                                  <p className="text-[10px] text-slate-400">Phụ trách lớp</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <StatusBadge status={classItem.status} />
                                {classItem.status === 'Chưa mở' ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleClassStatus(classItem.id, 'Hoạt động');
                                    }}
                                    className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                                    title="Giảng viên bấm để mở lớp"
                                  >
                                    ▶ Mở
                                  </button>
                                ) : classItem.status === 'Hoạt động' ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleClassStatus(classItem.id, 'Đã kết thúc');
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-red-600 transition cursor-pointer underline"
                                    title="Giảng viên bấm để kết thúc và đóng lớp này"
                                  >
                                    Đóng
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleClassStatus(classItem.id, 'Hoạt động');
                                    }}
                                    className="text-[10px] text-blue-600 hover:underline transition cursor-pointer"
                                    title="Giảng viên mở lại lớp học"
                                  >
                                    Mở lại
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAddStudentModal(classItem);
                                  }}
                                  title={`Thêm sinh viên vào lớp ${classItem.id}`}
                                  aria-label={`Thêm sinh viên vào lớp ${classItem.id}`}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedClassId(classItem.id);
                                    setStudentSearch('');
                                    setDetailTab('students');
                                    setViewingClass(classItem);
                                  }}
                                  title="Xem chi tiết đầy đủ"
                                  aria-label={`Xem chi tiết lớp ${classItem.id}`}
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'text-slate-400 hover:bg-blue-50 hover:text-blue-600'
                                  }`}
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(classItem);
                                  }}
                                  title="Chỉnh sửa lớp"
                                  aria-label={`Chỉnh sửa lớp ${classItem.id}`}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-600 cursor-pointer"
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
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 cursor-pointer"
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

              {/* Panel sinh viên trong lớp đang chọn */}
              <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-white/10 dark:bg-[#0d1017] transition-colors">
                <div className="border-b border-slate-100 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">Sinh viên lớp</h2>
                      {selectedClass ? (
                        <p className="mt-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400 truncate">
                          {selectedClass.id} • {selectedClass.name}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-slate-400">Chưa chọn lớp</p>
                      )}
                    </div>
                    {selectedClass && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {selectedClass.students.length} SV
                      </span>
                    )}
                  </div>

                  {/* NÚT THÊM SINH VIÊN TRỰC TIẾP VÀO LỚP ĐANG CHỌN */}
                  {selectedClass && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => openAddStudentModal(selectedClass)}
                        className="inline-flex w-full items-center justify-center gap-2 h-9.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                        title={`Thêm 1 sinh viên vào lớp ${selectedClass.id}`}
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Thêm sinh viên vào lớp</span>
                      </button>
                    </div>
                  )}

                  {selectedClass && selectedClass.status === 'Chưa mở' && (
                    <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs">
                      <span className="font-semibold text-amber-800 text-[11px]">Lớp chưa mở</span>
                      <button
                        type="button"
                        onClick={() => handleToggleClassStatus(selectedClass.id, 'Hoạt động')}
                        className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
                      >
                        <Play className="h-2 w-2 fill-white" />
                        Mở ngay
                      </button>
                    </div>
                  )}

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                      placeholder="Tìm MSSV, tên, email..."
                      className="h-9.5 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                </div>

                <div className="max-h-[480px] flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => {
                      const statusColor =
                        student.status === 'Đang học'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : student.status === 'Học ghép'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                          : student.status === 'Học lại'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                          : student.status === 'Học vượt'
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400';

                      return (
                        <div
                          key={student.id}
                          className="group flex items-center justify-between gap-2 p-3 hover:bg-slate-50/70 dark:hover:bg-white/5 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${getAvatarColor(
                                student.id
                              )}`}
                            >
                              {getStudentInitials(student.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {student.name}
                                </p>
                                {student.homeroomClass && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9.5px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                    {student.homeroomClass}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10.5px] text-slate-400 font-mono truncate">
                                {student.id} • {student.email}
                                {student.phone ? ` • ${student.phone}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`rounded px-1.5 py-0.5 text-[9.5px] font-bold ${statusColor}`}>
                              {student.status}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTargetClassForStudent(selectedClass);
                                setDeletingStudent(student);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded text-slate-300 hover:bg-red-50 hover:text-red-600 transition cursor-pointer opacity-0 group-hover:opacity-100 dark:hover:bg-red-500/15"
                              title={`Xóa sinh viên ${student.name} khỏi lớp`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-10 text-center text-xs text-slate-400">
                      Không có sinh viên nào phù hợp.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* ── MODAL CHI TIẾT LỚP HỌC (CHUYÊN BIỆT CHO BÀI LAB TRÊN LỚP & SINH VIÊN) ── */}
      {viewingClass && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 sm:p-6 backdrop-blur-[2px] overflow-y-auto"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewingClass(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="class-detail-title"
            className="my-auto w-full max-w-5xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 transition-all my-8"
          >
            {/* Header: Tiêu đề + Nút đóng */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="class-detail-title" className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                    Chi tiết lớp • {viewingClass.id} - {viewingClass.name}
                  </h2>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                    Quản lý sinh viên, bài lab thực hành trên lớp và các kỳ thi/kiểm tra lập trình.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingClass(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                title="Đóng chi tiết lớp"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── 4 KHỐI THÔNG TIN TỔNG QUAN ĐỀU NHAU (EQUAL STAT BLOCKS) ── */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-[#f8fafc] p-4 shadow-sm h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    LỚP & MÔN HỌC
                  </span>
                  <BookOpen className="h-4 w-4 text-blue-500" />
                </div>
                <div className="mt-2.5">
                  <p className="text-base font-extrabold text-slate-900 truncate">{viewingClass.id}</p>
                  <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{viewingClass.name}</p>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-[#f8fafc] p-4 shadow-sm h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    HỌC KỲ & THỜI GIAN
                  </span>
                  <Calendar className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="mt-2.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="text-base font-extrabold text-slate-900 truncate">{viewingClass.semester}</p>
                    <StatusBadge status={viewingClass.status} />
                  </div>
                  <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                    {viewingClass.startDate || '05/09/2026'} → {viewingClass.endDate || '15/01/2027'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-[#f8fafc] p-4 shadow-sm h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    GIẢNG VIÊN PHỤ TRÁCH
                  </span>
                  <UserRoundCheck className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="mt-2.5">
                  <p className="text-base font-extrabold text-slate-900 truncate">{viewingClass.lecturer || 'Long Phạm'}</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Giảng viên phụ trách lớp</p>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-[#f8fafc] p-4 shadow-sm h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    SĨ SỐ LỚP HỌC
                  </span>
                  <Users className="h-4 w-4 text-purple-500" />
                </div>
                <div className="mt-2.5">
                  <p className="text-base font-extrabold text-slate-900">
                    {viewingClass.students.length} <span className="text-xs font-normal text-slate-500">sinh viên</span>
                  </p>
                  <p className="text-xs font-medium text-emerald-700 mt-0.5">
                    Đã ghi danh vào lớp
                  </p>
                </div>
              </div>
            </div>

            {/* Khung nội dung chi tiết: Danh sách sinh viên */}
            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-[#f8fafc]/70 p-5 sm:p-6">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        Danh sách lớp • {viewingClass.students.length} sinh viên
                      </h3>
                      <p className="text-xs text-slate-500">
                        Theo dõi và quản lý danh sách sinh viên ghi danh trong lớp học phần {viewingClass.id}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleExportStudentList}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                        title="Tải về danh sách sinh viên lớp hiện tại (.csv)"
                      >
                        <Download className="h-4 w-4 text-slate-500" />
                        <span>Xuất danh sách</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAddStudentError('');
                          setIsAddStudentOpen(true);
                        }}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Thêm sinh viên</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] text-left text-xs">
                        <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="px-3.5 py-3.5 w-14 text-center">STT</th>
                            <th className="px-3.5 py-3.5 w-36">MÃ SINH VIÊN</th>
                            <th className="px-3.5 py-3.5">HỌ VÀ TÊN &amp; EMAIL</th>
                            <th className="px-3.5 py-3.5 w-36 text-center">PHÂN LOẠI</th>
                            <th className="px-3.5 py-3.5 w-20 text-right">THAO TÁC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {viewingClass.students.length > 0 ? (
                            viewingClass.students.map((student, index) => {
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
                                    hasMissing ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-slate-50/80'
                                  }`}
                                >
                                  <td className="px-3.5 py-3 text-center font-medium text-slate-400">{index + 1}</td>
                                  <td className="px-3.5 py-3 font-bold font-mono text-slate-900">
                                    {isMissingId ? (
                                      <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                                        Thiếu Mã SV
                                      </span>
                                    ) : (
                                      student.id
                                    )}
                                  </td>
                                  <td className="px-3.5 py-3">
                                    {isMissingName ? (
                                      <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                                        Thiếu Họ và tên
                                      </span>
                                    ) : (
                                      <p className="font-bold text-slate-800">{student.name}</p>
                                    )}
                                    {isMissingEmail ? (
                                      <span className="mt-0.5 inline-flex items-center rounded bg-red-100 px-1.5 py-0.2 text-[10px] font-bold text-red-600">
                                        {student.missingFields?.includes('Email sai định dạng')
                                          ? `Email sai (${student.email})`
                                          : 'Thiếu Email'}
                                      </span>
                                    ) : (
                                      <p className="text-[11px] text-slate-400 font-mono">{student.email}</p>
                                    )}
                                    {student.note && (
                                      <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                                        Ghi chú: {student.note}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-3 text-center">
                                    {hasMissing ? (
                                      <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                        ⚠ {student.missingFields?.join(', ')}
                                      </span>
                                    ) : (
                                      <span
                                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                          student.status === 'Đang học'
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : student.status === 'Học ghép'
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : student.status === 'Học lại'
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                            : student.status === 'Học vượt'
                                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                            : 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        {student.status}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setDeletingStudent(student)}
                                      title={`Xóa sinh viên ${student.name}`}
                                      aria-label={`Xóa sinh viên ${student.name}`}
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                Lớp chưa có sinh viên nào.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    Danh sách sinh viên chính thức được ghi nhận trong lớp học phần.
                  </p>
                </div>

                {/* Footer hành động của Modal Chi tiết lớp */}
                <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setViewingClass(null)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleEditFromDetail}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                  >
                    Sửa thông tin lớp
                  </button>
                  <button
                    type="button"
                    onClick={() => openAddStudentModal(viewingClass)}
                    className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 cursor-pointer"
                  >
                    Thêm sinh viên
                  </button>
                </div>
              </div>
            </div>
      )}

      {/* ── MODAL TÌM KIẾM & GHI DANH SINH VIÊN VÀO LỚP HỌC PHẦN ── */}
      {isAddStudentOpen && (targetClassForStudent || viewingClass || selectedClass) && (() => {
        const targetAddClass = targetClassForStudent || viewingClass || selectedClass;
        if (!targetAddClass) return null;
        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
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
              className="w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200/80 dark:bg-[#0d1017] dark:border-white/10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                <div>
                  <h2 id="add-student-title" className="text-base font-bold text-slate-900 dark:text-white">
                    Ghi danh sinh viên vào lớp học phần
                  </h2>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
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
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer dark:hover:bg-white/10"
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
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white font-medium"
                    />
                    {isSearchingStudent && (
                      <RotateCcw className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-600" />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Tìm kiếm tức thì sinh viên đã có tài khoản trong hệ thống để ghi danh vào lớp.
                  </p>
                </div>

                {/* Danh sách kết quả tìm kiếm */}
                {studentSearchKeyword.trim().length > 0 && !selectedStudentToEnroll && (
                  <div className="rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-2 max-h-56 overflow-y-auto space-y-1.5">
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
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border transition ${
                              isEnrolled
                                ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-white/5 dark:border-white/5'
                                : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer dark:bg-white/5 dark:border-white/10 dark:hover:bg-blue-500/10'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={`flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${getAvatarColor(
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
                                  className="rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 transition cursor-pointer"
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
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 dark:border-blue-500/30 dark:bg-blue-500/10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${getAvatarColor(
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
                            <span className="rounded bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-bold dark:bg-blue-400/20 dark:text-blue-300">
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
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer shrink-0 ml-1 dark:text-blue-400"
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
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white cursor-pointer"
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
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                </div>

                {addStudentError && (
                  <p role="alert" className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
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
                    className="h-9.5 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={!selectedStudentToEnroll}
                    onClick={handleConfirmEnrollStudent}
                    className={`h-9.5 rounded-xl px-5 text-xs font-semibold text-white shadow-sm transition ${
                      selectedStudentToEnroll
                        ? 'bg-blue-600 shadow-blue-500/20 hover:bg-blue-700 cursor-pointer'
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
            className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
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
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200/80 dark:bg-[#0d1017] dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="import-student-title" className="text-lg font-bold text-slate-900 dark:text-white">
                    Nhập danh sách sinh viên bổ sung (Excel / CSV)
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Bổ sung danh sách sinh viên vào lớp học phần{' '}
                    <strong className="text-blue-600 dark:text-blue-400 font-bold">{targetImportClass.id}</strong> ({targetImportClass.name}).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsImportStudentsOpen(false);
                    handleResetImportStudentState();
                  }}
                  aria-label="Đóng"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer dark:hover:bg-white/10"
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
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                    isImportStudentDragging
                      ? 'border-blue-600 bg-blue-50/70 scale-[0.99]'
                      : 'border-slate-200 bg-slate-50/60 hover:border-blue-400 hover:bg-blue-50/30'
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                      isImportStudentDragging ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-800">
                    Kéo thả tệp dữ liệu vào đây hoặc{' '}
                    <span className="text-blue-600 underline">chọn từ máy tính</span>
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
                <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
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
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-red-600 shadow-xs cursor-pointer transition"
                      title="Gỡ tệp để chọn tệp khác"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Loading khi phân tích file */}
              {isImportStudentParsing && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-blue-600">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <span>Đang phân tích dữ liệu tệp...</span>
                </div>
              )}

              {/* Thông báo lỗi không đọc được tệp */}
              {importStudentError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{importStudentError}</span>
                </div>
              )}

              {/* Cảnh báo thiếu cột hoặc dòng thiếu thông tin */}
              {importStudentWarnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900 space-y-1.5">
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
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-blue-600 p-1.5 text-white shrink-0">
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
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
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
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200/90 bg-white p-3.5">
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
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
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
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={previewStudents.length === 0 || previewStudents.filter((s) => s.id && s.name).length === 0}
                  onClick={handleConfirmBulkImportStudents}
                  className={`h-10 rounded-xl px-5 text-xs font-semibold transition cursor-pointer ${
                    previewStudents.filter((s) => s.id && s.name).length > 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20'
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
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200/80"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
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
                className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDeleteStudent}
                className="h-9 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white transition hover:bg-red-700 cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Modal Chỉnh sửa thông tin lớp */}
      {editingClass && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-class-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 id="edit-class-title" className="text-base font-bold text-slate-900">
                Chỉnh sửa lớp {editingClass.id}
              </h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={saveEditClass} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Mã lớp</label>
                <input
                  name="classId"
                  defaultValue={editingClass.id}
                  required
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 uppercase"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Tên lớp</label>
                <input
                  name="className"
                  defaultValue={editingClass.name}
                  required
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Học kỳ</label>
                <select
                  name="semester"
                  defaultValue={editingClass.semester}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {SEMESTERS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Thời gian bắt đầu</label>
                  <input
                    name="startDate"
                    defaultValue={editingClass.startDate || '05/09/2026'}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Thời gian kết thúc</label>
                  <input
                    name="endDate"
                    defaultValue={editingClass.endDate || '15/01/2027'}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Trạng thái (Giảng viên mở lớp)</label>
                <select
                  name="status"
                  defaultValue={editingClass.status}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Chưa mở">🟡 Chưa mở (Giảng viên chưa mở lớp)</option>
                  <option value="Hoạt động">🟢 Hoạt động (Đang mở lớp)</option>
                  <option value="Đã kết thúc">⚪ Đã kết thúc (Đóng lớp)</option>
                </select>
              </div>

              {editError && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {editError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700 cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

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
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
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
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDeleteClass}
                className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 cursor-pointer"
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
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/90 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        Chưa mở
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-2xs ${
        status === 'Hoạt động'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-100 text-slate-600'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === 'Hoạt động' ? 'bg-emerald-500' : 'bg-slate-400'
        }`}
      />
      {status}
    </span>
  );
}
