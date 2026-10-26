'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  FileCode2,
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
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import {
  ClassExam,
  ClassLab,
  ClassRow,
  ClassStatus,
  ExamStatus,
  INITIAL_CLASSES,
  QuestionTemplate,
  SAMPLE_QUESTION_TEMPLATES,
  StudentRow,
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
  const searchParams = useSearchParams();

  const [classes, setClasses] = useState<ClassRow[]>(INITIAL_CLASSES);
  const [selectedClassId, setSelectedClassId] = useState(INITIAL_CLASSES[0]?.id || '');
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState('Tất cả học kỳ');
  const [status, setStatus] = useState('Tất cả trạng thái');
  const [studentSearch, setStudentSearch] = useState('');

  // Modals state
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [editError, setEditError] = useState('');
  const [deletingClass, setDeletingClass] = useState<ClassRow | null>(null);
  const [viewingClass, setViewingClass] = useState<ClassRow | null>(null);
  const [detailTab, setDetailTab] = useState<'students' | 'labs' | 'exams'>('students');

  // Student modal
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [addStudentError, setAddStudentError] = useState('');
  const [deletingStudent, setDeletingStudent] = useState<StudentRow | null>(null);

  // Lab modal (Tạo bài Lab mới trên lớp)
  const [isAddLabOpen, setIsAddLabOpen] = useState(false);
  const [newLabNumber, setNewLabNumber] = useState(1);
  const [newLabTitle, setNewLabTitle] = useState('');
  const [newLabLanguage, setNewLabLanguage] = useState('Python');
  const [newLabQuestions, setNewLabQuestions] = useState(3);
  const [newLabSchedule, setNewLabSchedule] = useState('Thứ 3 (Tuần tới)');
  const [newLabStartTime, setNewLabStartTime] = useState('2026-10-28T07:30');
  const [newLabEndTime, setNewLabEndTime] = useState('2026-10-28T09:50');
  const [newLabDuration, setNewLabDuration] = useState(140);
  const [newLabProctored, setNewLabProctored] = useState(true);
  const [selectedLabTemplateId, setSelectedLabTemplateId] = useState('');
  const [addLabError, setAddLabError] = useState('');

  // Exam modal (Tạo bài thi / kiểm tra mới cho lớp)
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamType, setNewExamType] = useState<
    'Kiểm tra giữa kỳ' | 'Kiểm tra quá trình' | 'Thi kết thúc môn' | 'Kiểm tra thực hành'
  >('Kiểm tra giữa kỳ');
  const [newExamLanguage, setNewExamLanguage] = useState('JavaScript / Python');
  const [newExamDuration, setNewExamDuration] = useState(90);
  const [newExamSchedule, setNewExamSchedule] = useState('08:00 - 09:30, 20/11/2026');
  const [newExamQuestions, setNewExamQuestions] = useState(3);
  const [newExamProctored, setNewExamProctored] = useState(true);
  const [selectedExamTemplateId, setSelectedExamTemplateId] = useState('');
  const [addExamError, setAddExamError] = useState('');
  const [questionTemplates, setQuestionTemplates] = useState<QuestionTemplate[]>(SAMPLE_QUESTION_TEMPLATES);

  // Giảng viên chỉnh sửa bài Lab trong lớp
  const [editingLab, setEditingLab] = useState<ClassLab | null>(null);
  const [editLabTitle, setEditLabTitle] = useState('');
  const [editLabTemplateId, setEditLabTemplateId] = useState('');
  const [editLabLanguage, setEditLabLanguage] = useState('');
  const [editLabQuestions, setEditLabQuestions] = useState(1);
  const [editLabSchedule, setEditLabSchedule] = useState('');
  const [editLabStartTime, setEditLabStartTime] = useState('');
  const [editLabEndTime, setEditLabEndTime] = useState('');
  const [editLabDuration, setEditLabDuration] = useState(120);
  const [editLabProctored, setEditLabProctored] = useState(true);
  const [editLabStatus, setEditLabStatus] = useState<'Đang mở' | 'Đã đóng'>('Đang mở');
  const [editLabError, setEditLabError] = useState('');

  // Giảng viên chỉnh sửa bài thi trong lớp
  const [editingExam, setEditingExam] = useState<ClassExam | null>(null);
  const [editExamTitle, setEditExamTitle] = useState('');
  const [editExamTemplateId, setEditExamTemplateId] = useState('');
  const [editExamType, setEditExamType] = useState<
    'Kiểm tra giữa kỳ' | 'Kiểm tra quá trình' | 'Thi kết thúc môn' | 'Kiểm tra thực hành'
  >('Kiểm tra giữa kỳ');
  const [editExamLanguage, setEditExamLanguage] = useState('');
  const [editExamDuration, setEditExamDuration] = useState(90);
  const [editExamSchedule, setEditExamSchedule] = useState('');
  const [editExamQuestions, setEditExamQuestions] = useState(3);
  const [editExamProctored, setEditExamProctored] = useState(true);
  const [editExamStatus, setEditExamStatus] = useState<ExamStatus>('Sắp diễn ra');
  const [editExamError, setEditExamError] = useState('');

  function handleSelectLabTemplate(templateId: string) {
    setSelectedLabTemplateId(templateId);
    if (!templateId) return;
    const tpl = questionTemplates.find((t) => t.id === templateId);
    if (tpl) {
      setNewLabTitle(tpl.title.replace(/^Lab \d+ • /, ''));
      setNewLabLanguage(tpl.language);
      setNewLabQuestions(tpl.questionCount);
      setAddLabError('');
    }
  }

  function handleSelectExamTemplate(templateId: string) {
    setSelectedExamTemplateId(templateId);
    if (!templateId) return;
    const tpl = questionTemplates.find((t) => t.id === templateId);
    if (tpl) {
      setNewExamTitle(tpl.title);
      setNewExamLanguage(tpl.language);
      setNewExamQuestions(tpl.questionCount);
      if (tpl.durationMinutes) {
        setNewExamDuration(tpl.durationMinutes);
      }
      setAddExamError('');
    }
  }

  // Sync with localStorage on client mount & handle newly created class param
  useEffect(() => {
    const stored = getStoredClasses();
    setClasses(stored);
    setQuestionTemplates(getStoredQuestionTemplates());
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
  }, [searchParams]);

  function confirmDeleteStudent() {
    if (!deletingStudent) return;
    const targetClassId = viewingClass?.id || selectedClassId;
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

    setDeletingStudent(null);
  }

  function handleEditFromDetail() {
    if (!viewingClass) return;
    const current = viewingClass;
    setViewingClass(null);
    openEditModal(current);
  }

  function handleAddStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!viewingClass) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const studentId = String(formData.get('studentId') ?? '').trim().toUpperCase();
    const studentName = String(formData.get('studentName') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim().toLowerCase();

    if (!studentId || !studentName || !email) {
      setAddStudentError('Vui lòng nhập đầy đủ Mã sinh viên, Họ và tên và Email.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setAddStudentError('Email không hợp lệ (ví dụ: student@school.edu.vn).');
      return;
    }

    if (viewingClass.students.some((s) => s.id.toLowerCase() === studentId.toLowerCase())) {
      setAddStudentError('Mã sinh viên này đã có trong lớp.');
      return;
    }

    const newStudent: StudentRow = {
      id: studentId,
      name: studentName,
      email,
      status: 'Đang học',
    };

    const updatedClass: ClassRow = {
      ...viewingClass,
      studentCount: viewingClass.students.length + 1,
      students: [...viewingClass.students, newStudent],
    };

    const updatedList = classes.map((item) => (item.id === viewingClass.id ? updatedClass : item));
    setClasses(updatedList);
    saveStoredClasses(updatedList);

    setViewingClass(updatedClass);
    setIsAddStudentOpen(false);
    setAddStudentError('');
    form.reset();
  }

  function handleAddLab(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!viewingClass) return;
    const title = newLabTitle.trim();
    if (!title) {
      setAddLabError('Vui lòng nhập tiêu đề bài Lab.');
      return;
    }

    const newLab: ClassLab = {
      id: `LAB-${viewingClass.id}-${Date.now()}`,
      templateId: selectedLabTemplateId || undefined,
      labNumber: Number(newLabNumber) || 1,
      title: title.startsWith('Buổi') ? title : `Buổi 0${newLabNumber} • Bài Lab 0${newLabNumber}: ${title}`,
      language: newLabLanguage,
      questionCount: Number(newLabQuestions) || 1,
      scheduleNote: newLabSchedule.trim(),
      startTime: formatDatetimeVietnamese(newLabStartTime) || '07:30, 28/10/2026',
      endTime: formatDatetimeVietnamese(newLabEndTime) || '09:50, 28/10/2026',
      durationMinutes: calculateDurationInMinutes(newLabStartTime, newLabEndTime) || Number(newLabDuration) || 120,
      isProctored: newLabProctored,
      roomCode: generateRandomRoomCode('LAB'),
      roomPassword: generateRandomPassword(),
      status: 'Đang mở',
      submissionCount: 0,
    };

    const currentLabs = viewingClass.labs || [];
    const updatedClass: ClassRow = {
      ...viewingClass,
      labs: [newLab, ...currentLabs],
    };

    const updatedList = classes.map((item) => (item.id === viewingClass.id ? updatedClass : item));
    setClasses(updatedList);
    saveStoredClasses(updatedList);
    setViewingClass(updatedClass);

    setIsAddLabOpen(false);
    setNewLabTitle('');
    setSelectedLabTemplateId('');
    setNewLabNumber(currentLabs.length + 2);
    setNewLabProctored(true);
    setAddLabError('');
  }

  function handleCreateExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!viewingClass) return;

    const title = newExamTitle.trim();
    if (!title) {
      setAddExamError('Vui lòng nhập tên bài thi / kiểm tra.');
      return;
    }

    const newExam: ClassExam = {
      id: `EXAM-${viewingClass.id}-${Date.now().toString().slice(-4)}`,
      templateId: selectedExamTemplateId || undefined,
      title,
      type: newExamType,
      language: newExamLanguage,
      durationMinutes: Number(newExamDuration) || 60,
      scheduledAt: newExamSchedule.trim() || 'Thời gian thông báo sau',
      questionCount: Number(newExamQuestions) || 1,
      isProctored: newExamProctored,
      roomCode: generateRandomRoomCode('EXAM'),
      roomPassword: generateRandomPassword(),
      status: 'Sắp diễn ra',
      submissionCount: 0,
    };

    const currentExams = viewingClass.exams || [];
    const updatedClass: ClassRow = {
      ...viewingClass,
      exams: [newExam, ...currentExams],
    };

    const updatedList = classes.map((item) => (item.id === viewingClass.id ? updatedClass : item));
    setClasses(updatedList);
    saveStoredClasses(updatedList);
    setViewingClass(updatedClass);

    setIsAddExamOpen(false);
    setNewExamTitle('');
    setSelectedExamTemplateId('');
    setAddExamError('');
  }

  // Chỉnh sửa & Xóa bài Lab
  function openEditLabModal(lab: ClassLab) {
    setEditingLab(lab);
    setEditLabTitle(
      lab.title
        .replace(/^Buổi \d+ • (Bài Lab \d+: )?/, '')
        .replace(/^Lab \d+ • /, '')
    );
    setEditLabTemplateId(lab.templateId || '');
    setEditLabLanguage(lab.language);
    setEditLabQuestions(lab.questionCount);
    setEditLabSchedule(lab.scheduleNote || '');
    const startIso = toIsoDatetime(lab.startTime) || '2026-10-28T07:30';
    const endIso = toIsoDatetime(lab.endTime) || '2026-10-28T09:50';
    setEditLabStartTime(startIso);
    setEditLabEndTime(endIso);
    setEditLabDuration(lab.durationMinutes || calculateDurationInMinutes(startIso, endIso) || 120);
    setEditLabProctored(lab.isProctored ?? true);
    setEditLabStatus(lab.status);
    setEditLabError('');
  }

  function handleSwitchLabTemplateInEdit(templateId: string) {
    setEditLabTemplateId(templateId);
    if (!templateId) return;
    const tpl = questionTemplates.find((t) => t.id === templateId);
    if (tpl) {
      setEditLabTitle(
        tpl.title
          .replace(/^Buổi \d+ • (Bài Lab \d+: )?/, '')
          .replace(/^Lab \d+ • /, '')
      );
      setEditLabLanguage(tpl.language);
      setEditLabQuestions(tpl.questionCount);
      setEditLabError('');
    }
  }

  function handleSaveEditLab(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!viewingClass || !editingLab) return;
    const title = editLabTitle.trim();
    if (!title) {
      setEditLabError('Vui lòng nhập tiêu đề bài Lab.');
      return;
    }

    const updatedLab: ClassLab = {
      ...editingLab,
      title: title.startsWith('Buổi') ? title : `Buổi 0${editingLab.labNumber} • Bài Lab 0${editingLab.labNumber}: ${title}`,
      templateId: editLabTemplateId || undefined,
      language: editLabLanguage,
      questionCount: Number(editLabQuestions) || 1,
      scheduleNote: editLabSchedule.trim(),
      startTime: formatDatetimeVietnamese(editLabStartTime) || editingLab.startTime || '07:30, 28/10/2026',
      endTime: formatDatetimeVietnamese(editLabEndTime) || editingLab.endTime || '09:50, 28/10/2026',
      durationMinutes: calculateDurationInMinutes(editLabStartTime, editLabEndTime) || Number(editLabDuration) || 120,
      isProctored: editLabProctored,
      status: editLabStatus,
    };

    const currentLabs = viewingClass.labs || [];
    const updatedLabs = currentLabs.map((l) => (l.id === editingLab.id ? updatedLab : l));

    const updatedClass: ClassRow = {
      ...viewingClass,
      labs: updatedLabs,
    };

    const updatedList = classes.map((item) => (item.id === viewingClass.id ? updatedClass : item));
    setClasses(updatedList);
    saveStoredClasses(updatedList);
    setViewingClass(updatedClass);
    setEditingLab(null);
  }

  function handleDeleteLab(labId: string) {
    if (!viewingClass) return;
    const targetLab = (viewingClass.labs || []).find((l) => l.id === labId);
    const confirmMsg = targetLab
      ? `Bạn có chắc chắn muốn xóa "${targetLab.title}" khỏi lớp ${viewingClass.id}?`
      : 'Bạn có chắc chắn muốn xóa buổi thực hành này?';
    if (!confirm(confirmMsg)) return;

    const updatedLabs = (viewingClass.labs || []).filter((l) => l.id !== labId);
    const updatedClass: ClassRow = {
      ...viewingClass,
      labs: updatedLabs,
    };

    const updatedList = classes.map((item) => (item.id === viewingClass.id ? updatedClass : item));
    setClasses(updatedList);
    saveStoredClasses(updatedList);
    setViewingClass(updatedClass);
  }

  // Chỉnh sửa & Xóa bài thi
  function openEditExamModal(exam: ClassExam) {
    setEditingExam(exam);
    setEditExamTitle(exam.title);
    setEditExamTemplateId(exam.templateId || '');
    setEditExamType(exam.type);
    setEditExamLanguage(exam.language);
    setEditExamDuration(exam.durationMinutes);
    setEditExamSchedule(exam.scheduledAt);
    setEditExamQuestions(exam.questionCount);
    setEditExamProctored(exam.isProctored ?? true);
    setEditExamStatus(exam.status);
    setEditExamError('');
  }

  function handleSwitchExamTemplateInEdit(templateId: string) {
    setEditExamTemplateId(templateId);
    if (!templateId) return;
    const tpl = questionTemplates.find((t) => t.id === templateId);
    if (tpl) {
      setEditExamTitle(tpl.title);
      setEditExamLanguage(tpl.language);
      setEditExamQuestions(tpl.questionCount);
      if (tpl.durationMinutes) {
        setEditExamDuration(tpl.durationMinutes);
      }
      setEditExamError('');
    }
  }

  function handleSaveEditExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!viewingClass || !editingExam) return;
    const title = editExamTitle.trim();
    if (!title) {
      setEditExamError('Vui lòng nhập tiêu đề bài thi.');
      return;
    }

    const updatedExam: ClassExam = {
      ...editingExam,
      title,
      templateId: editExamTemplateId || undefined,
      type: editExamType,
      language: editExamLanguage,
      durationMinutes: Number(editExamDuration) || 60,
      scheduledAt: editExamSchedule.trim(),
      questionCount: Number(editExamQuestions) || 1,
      isProctored: editExamProctored,
      status: editExamStatus,
    };

    const currentExams = viewingClass.exams || [];
    const updatedExams = currentExams.map((ex) => (ex.id === editingExam.id ? updatedExam : ex));

    const updatedClass: ClassRow = {
      ...viewingClass,
      exams: updatedExams,
    };

    const updatedList = classes.map((item) => (item.id === viewingClass.id ? updatedClass : item));
    setClasses(updatedList);
    saveStoredClasses(updatedList);
    setViewingClass(updatedClass);
    setEditingExam(null);
  }

  function handleDeleteExam(examId: string) {
    if (!viewingClass) return;
    const targetExam = (viewingClass.exams || []).find((e) => e.id === examId);
    const confirmMsg = targetExam
      ? `Bạn có chắc chắn muốn xóa bài thi "${targetExam.title}" khỏi lớp ${viewingClass.id}?`
      : 'Bạn có chắc chắn muốn xóa bài thi này?';
    if (!confirm(confirmMsg)) return;

    const updatedExams = (viewingClass.exams || []).filter((e) => e.id !== examId);
    const updatedClass: ClassRow = {
      ...viewingClass,
      exams: updatedExams,
    };

    const updatedList = classes.map((item) => (item.id === viewingClass.id ? updatedClass : item));
    setClasses(updatedList);
    saveStoredClasses(updatedList);
    setViewingClass(updatedClass);
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

  function confirmDeleteClass() {
    if (!deletingClass) return;
    const remaining = classes.filter((item) => item.id !== deletingClass.id);
    setClasses(remaining);
    saveStoredClasses(remaining);

    if (selectedClassId === deletingClass.id) {
      setSelectedClassId(remaining.length > 0 ? remaining[0].id : '');
    }
    setDeletingClass(null);
  }

  const filteredClasses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return classes.filter((classItem) => {
      const matchesSearch =
        !query ||
        classItem.id.toLocaleLowerCase('vi').includes(query) ||
        classItem.name.toLocaleLowerCase('vi').includes(query);
      const matchesSemester = semester === 'Tất cả học kỳ' || classItem.semester === semester;
      const matchesStatus = status === 'Tất cả trạng thái' || classItem.status === status;
      return matchesSearch && matchesSemester && matchesStatus;
    });
  }, [classes, search, semester, status]);

  const selectedClass = classes.find((item) => item.id === selectedClassId) ?? null;
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
    <div className="flex min-h-screen w-full bg-[#f4f7f9] text-slate-800">
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
                <h1 className="mt-0.5 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Lớp học & sinh viên
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  Theo dõi lớp học, danh sách sinh viên và các phiên thực hành, kiểm tra lập trình.
                </p>
              </div>
              <div>
                <Link
                  href="/class-manager/create"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
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
                  color: 'bg-blue-50 text-blue-600',
                },
                {
                  label: 'Lớp hoạt động',
                  value: activeClasses,
                  icon: UserRoundCheck,
                  color: 'bg-emerald-50 text-emerald-600',
                },
                {
                  label: 'Tổng sinh viên',
                  value: totalStudents,
                  icon: GraduationCap,
                  color: 'bg-violet-50 text-violet-600',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-xs"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-400">{item.label}</p>
                      <p className="text-lg font-bold text-slate-900 leading-tight">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Bảng danh sách lớp & Panel sinh viên */}
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              {/* Danh sách lớp với Toolbar tích hợp tinh gọn */}
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                {/* Toolbar tích hợp ngay trên đầu bảng */}
                <div className="border-b border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Danh sách lớp</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {filteredClasses.length} lớp học • Nhấp chọn hàng để xem sinh viên
                      </p>
                    </div>
                    <BookOpen className="h-4 w-4 text-slate-400" />
                  </div>

                  {/* Thanh tìm kiếm & bộ lọc: Bố cục tinh gọn, không đè icon, không vỡ dòng */}
                  <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="relative flex-1 min-w-0">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm mã hoặc tên lớp..."
                        className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-8 text-xs outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                      />
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60 transition cursor-pointer"
                          title="Xóa tìm kiếm"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto sm:shrink-0">
                      <div className="relative flex-1 sm:w-40 sm:flex-initial">
                        <select
                          value={semester}
                          onChange={(e) => setSemester(e.target.value)}
                          className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 cursor-pointer"
                        >
                          <option value="Tất cả học kỳ">Tất cả học kỳ</option>
                          {SEMESTERS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      </div>

                      <div className="relative flex-1 sm:w-40 sm:flex-initial">
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 cursor-pointer"
                        >
                          <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                          <option value="Chưa mở">Chưa mở</option>
                          <option value="Hoạt động">Hoạt động</option>
                          <option value="Đã kết thúc">Đã kết thúc</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bảng danh sách lớp */}
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
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
                        <th scope="col" className="px-2 py-2.5 text-center whitespace-nowrap">
                          Buổi thực hành
                        </th>
                        <th scope="col" className="px-2 py-2.5 text-center whitespace-nowrap">
                          Bài thi
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-center whitespace-nowrap">
                          Trạng thái
                        </th>
                        <th scope="col" className="px-4 py-2.5 text-right whitespace-nowrap">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredClasses.map((classItem) => {
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
                                ? 'bg-blue-50/70 font-medium'
                                : 'hover:bg-slate-50/70'
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
                                      isSelected ? 'text-blue-700' : 'text-slate-900'
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
                            <td className="px-2 py-3 text-center whitespace-nowrap font-bold text-slate-700">
                              {classItem.studentCount}
                            </td>
                            <td className="px-2 py-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClassId(classItem.id);
                                  setViewingClass(classItem);
                                  setDetailTab('labs');
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50/80 px-2 py-0.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer shadow-2xs"
                                title="Nhấp để xem và quản lý buổi thực hành"
                              >
                                <Code2 className="h-3 w-3 text-blue-600" />
                                {(classItem.labs || []).length} buổi
                              </button>
                            </td>
                            <td className="px-2 py-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClassId(classItem.id);
                                  setViewingClass(classItem);
                                  setDetailTab('exams');
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50/80 px-2 py-0.5 text-[11px] font-bold text-purple-700 hover:bg-purple-100 transition cursor-pointer shadow-2xs"
                                title="Nhấp để xem và quản lý bài thi"
                              >
                                <GraduationCap className="h-3 w-3 text-purple-600" />
                                {(classItem.exams || []).length} bài thi
                              </button>
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
                                    setSelectedClassId(classItem.id);
                                    setStudentSearch('');
                                    setDetailTab('students');
                                    setViewingClass(classItem);
                                  }}
                                  title="Xem chi tiết đầy đủ"
                                  aria-label={`Xem chi tiết lớp ${classItem.id}`}
                                  className={`flex h-7.5 w-7.5 items-center justify-center rounded-lg transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'text-slate-400 hover:bg-blue-50 hover:text-blue-600'
                                  }`}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(classItem);
                                  }}
                                  title="Chỉnh sửa lớp"
                                  aria-label={`Chỉnh sửa lớp ${classItem.id}`}
                                  className="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-600 cursor-pointer"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteModal(classItem);
                                  }}
                                  title="Xóa lớp"
                                  aria-label={`Xóa lớp ${classItem.id}`}
                                  className="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Panel sinh viên trong lớp đang chọn */}
              <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                <div className="border-b border-slate-100 p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Sinh viên lớp</h2>
                      {selectedClass ? (
                        <p className="mt-0.5 text-xs font-semibold text-blue-700 truncate">
                          {selectedClass.id} • {selectedClass.name}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-slate-400">Chưa chọn lớp</p>
                      )}
                    </div>
                    {selectedClass && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                        {selectedClass.students.length} SV
                      </span>
                    )}
                  </div>

                  {selectedClass && selectedClass.status === 'Chưa mở' && (
                    <div className="mt-2.5 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs">
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

                  <div className="relative mt-2.5">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                      placeholder="Tìm MSSV, tên, email..."
                      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="max-h-[480px] flex-1 overflow-y-auto divide-y divide-slate-100">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-2.5 p-3 hover:bg-slate-50/70 transition"
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${getAvatarColor(
                            student.id
                          )}`}
                        >
                          {getStudentInitials(student.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {student.name}
                            </p>
                            <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9.5px] font-bold text-emerald-700 shrink-0">
                              {student.status}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-400 font-mono">
                            {student.id} • {student.email}
                          </p>
                        </div>
                      </div>
                    ))
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
                    SĨ SỐ & HOẠT ĐỘNG
                  </span>
                  <Users className="h-4 w-4 text-purple-500" />
                </div>
                <div className="mt-2.5">
                  <p className="text-base font-extrabold text-slate-900">
                    {viewingClass.students.length} <span className="text-xs font-normal text-slate-500">sinh viên</span>
                  </p>
                  <p className="text-xs font-medium text-purple-700 mt-0.5">
                    {(viewingClass.labs || []).length} bài lab • {(viewingClass.exams || []).length} bài thi
                  </p>
                </div>
              </div>
            </div>

            {/* ── 3 KHỐI TAB ĐIỀU HƯỚNG ĐỀU NHAU (3 EQUAL SEGMENTED TABS) ── */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDetailTab('students')}
                className={`flex items-center justify-between rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                  detailTab === 'students'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-1 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                      detailTab === 'students' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold">Sinh viên & Sĩ số</p>
                    <p className="text-[11px] text-slate-500">Danh sách quản lý lớp</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    detailTab === 'students' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {viewingClass.students.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('labs')}
                className={`flex items-center justify-between rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                  detailTab === 'labs'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-1 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                      detailTab === 'labs' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Code2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold">Buổi học & Bài Lab</p>
                    <p className="text-[11px] text-slate-500">Mỗi buổi 1 bài lab • {(viewingClass.labs || []).length} buổi</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    detailTab === 'labs' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {(viewingClass.labs || []).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('exams')}
                className={`flex items-center justify-between rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                  detailTab === 'exams'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-sm ring-1 ring-purple-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                      detailTab === 'exams' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold">Kỳ thi & Kiểm tra</p>
                    <p className="text-[11px] text-slate-500">Giữa kỳ, quá trình & cuối kỳ</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    detailTab === 'exams' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {(viewingClass.exams || []).length}
                </span>
              </button>
            </div>

            {/* Khung nội dung chi tiết */}
            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-[#f8fafc]/70 p-5 sm:p-6">

              {/* ── NỘI DUNG TAB 1: SINH VIÊN & SĨ SỐ ── */}
              {detailTab === 'students' && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-extrabold text-slate-900">
                      Danh sách lớp • {viewingClass.students.length} sinh viên
                    </h3>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[550px] text-left text-xs">
                        <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="px-4 py-3.5 w-16">STT</th>
                            <th className="px-4 py-3.5 w-32">MÃ SV</th>
                            <th className="px-4 py-3.5">HỌ VÀ TÊN</th>
                            <th className="px-4 py-3.5 w-28">LỚP</th>
                            <th className="px-4 py-3.5 w-28 text-center">TRẠNG THÁI</th>
                            <th className="px-4 py-3.5 w-20 text-right">THAO TÁC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {viewingClass.students.length > 0 ? (
                            viewingClass.students.map((student, index) => (
                              <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-400">{index + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{student.id}</td>
                                <td className="px-4 py-3 font-semibold text-slate-800">{student.name}</td>
                                <td className="px-4 py-3 text-slate-600">{viewingClass.id}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                    {student.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
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
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                Lớp chưa có sinh viên nào.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    Việc tạo lớp khởi đối chiếu danh tính; điểm chưa được nhập trong luồng này.
                  </p>
                </div>
              )}

              {/* ── NỘI DUNG TAB 2: BÀI LAB TRÊN LỚP (CHỈ PHỤC VỤ CÁC BÀI LAB THỰC HÀNH) ── */}
              {detailTab === 'labs' && (
                <div className="mt-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        Buổi thực hành & Bài Lab • {(viewingClass.labs || []).length} buổi
                      </h3>
                      <p className="text-xs text-slate-500">
                        Mỗi buổi học thực hành có 1 bài lab. Trong mỗi bài lab bao gồm nhiều đề bài lập trình.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAddLabError('');
                        setNewLabNumber((viewingClass.labs || []).length + 1);
                        setIsAddLabOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Tạo buổi lab mới
                    </button>
                  </div>

                  {/* Danh sách các buổi thực hành */}
                  {(viewingClass.labs || []).length > 0 ? (
                    <div className="space-y-3.5">
                      {(viewingClass.labs || []).map((lab) => (
                        <div
                          key={lab.id}
                          className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition"
                        >
                          <div className="space-y-2">
                            {/* Hàng nhãn */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                                  🧪 Buổi 0{lab.labNumber} • Bài Lab 0{lab.labNumber}
                                </span>

                                {lab.isProctored ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                    <ShieldCheck className="h-3 w-3" />
                                    Có giám sát
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                    Tự do
                                  </span>
                                )}
                              </div>

                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  lab.status === 'Đang mở'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    lab.status === 'Đang mở' ? 'bg-emerald-500' : 'bg-slate-400'
                                  }`}
                                />
                                {lab.status}
                              </span>
                            </div>

                            {/* Tiêu đề bài lab */}
                            <h4 className="text-sm sm:text-base font-bold text-slate-900">
                              {lab.title}
                            </h4>

                            {/* Chi tiết thông tin cấu hình & Thời gian */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50/80 border border-blue-200/70 px-2.5 py-0.5 font-semibold text-blue-800">
                                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                                {lab.startTime || '07:30, 28/10/2026'} – {lab.endTime ? lab.endTime.split(',')[0] : '09:50'}
                              </span>

                              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50/80 border border-amber-200/70 px-2.5 py-0.5 font-semibold text-amber-800">
                                <Clock className="h-3.5 w-3.5 text-amber-600" />
                                {lab.durationMinutes || 120} phút
                              </span>

                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                                <Terminal className="h-3.5 w-3.5 text-slate-400" />
                                {lab.language}
                              </span>

                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                                <Code2 className="h-3.5 w-3.5 text-slate-400" />
                                {lab.questionCount} đề bài
                              </span>

                              {lab.scheduleNote && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-0.5 text-slate-600 font-medium">
                                  {lab.scheduleNote}
                                </span>
                              )}
                            </div>

                            {/* Thông tin bộ đề liên kết từ module Đề & câu hỏi */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-slate-500">
                              <span>
                                Bộ đề:{' '}
                                <strong className="font-semibold text-slate-700">
                                  {lab.templateId || 'TPL-LAB-01'}
                                </strong>{' '}
                                ({lab.questionCount} đề)
                              </span>
                              <span className="text-slate-300">•</span>
                              <Link
                                href={`/admin?module=questions&templateId=${encodeURIComponent(
                                  lab.templateId || 'TPL-LAB-01'
                                )}`}
                                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                                title="Chỉnh sửa nội dung câu hỏi trong module Đề & câu hỏi"
                              >
                                <FileCode2 className="h-3 w-3" />
                                Chỉnh sửa đề từ module Đề & câu hỏi
                                <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            </div>

                            {/* Mã phòng & Mật khẩu phòng Lab */}
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs">
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-[11px] font-semibold text-slate-500">Mã phòng:</span>
                                  <span className="rounded bg-white border border-blue-200 px-2 py-0.5 font-bold text-blue-700 shadow-xs">
                                    {lab.roomCode || `${lab.id}-ROOM`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-[11px] font-semibold text-slate-500">Mật khẩu:</span>
                                  <span className="rounded bg-white border border-blue-200 px-2 py-0.5 font-bold text-slate-800 shadow-xs tracking-wider">
                                    {lab.roomPassword || '123456'}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const rCode = lab.roomCode || `${lab.id}-ROOM`;
                                  const rPass = lab.roomPassword || '123456';
                                  const joinUrl = `${window.location.origin}/join?code=${rCode}`;
                                  const info = `PHÒNG LAB: ${lab.title}\nLớp: ${viewingClass.id} - ${viewingClass.name}\nMã phòng: ${rCode}\nMật khẩu: ${rPass}\nCổng vào làm bài: ${joinUrl}`;
                                  navigator.clipboard.writeText(info);
                                  alert(`Đã sao chép phòng Lab ${rCode} và mật khẩu vào Clipboard!`);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100/70 transition cursor-pointer shadow-xs"
                              >
                                <Copy className="h-3 w-3" />
                                Sao chép phòng
                              </button>
                            </div>
                          </div>

                          {/* Footer căn đều lề với tiến độ bên trái & nút thao tác bên phải */}
                          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-3">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-32 sm:w-36 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-blue-600"
                                  style={{
                                    width: `${
                                      viewingClass.students.length > 0
                                        ? Math.min(100, Math.round((lab.submissionCount / viewingClass.students.length) * 100))
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                              <p className="text-xs font-bold text-slate-700">
                                Đã nộp: <span className="text-blue-600 font-extrabold">{lab.submissionCount}</span>/{viewingClass.students.length} SV
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                              <button
                                type="button"
                                onClick={() => openEditLabModal(lab)}
                                title="Giảng viên thay đổi đề hoặc cấu hình buổi thực hành này"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50/70 hover:text-blue-700 transition cursor-pointer"
                              >
                                <Pencil className="h-3 w-3" />
                                <span>Thay đổi đề & cấu hình</span>
                              </button>

                              <button
                                type="button"
                                className="h-8 rounded-lg border border-blue-200 bg-blue-50/60 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                              >
                                {lab.isProctored ? 'Vào phòng Lab & Giám sát' : 'Xem bài nộp & Chấm điểm'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteLab(lab.id)}
                                title="Xóa buổi thực hành khỏi lớp"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                      Lớp chưa có buổi thực hành nào. Bấm &quot;Tạo buổi lab mới&quot; để thêm bài lab cho buổi học.
                    </div>
                  )}
                </div>
              )}

              {/* ── NỘI DUNG TAB 3: BÀI THI & KIỂM TRA LẬP TRÌNH ── */}
              {detailTab === 'exams' && (
                <div className="mt-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        Bài thi & Kiểm tra lập trình • {(viewingClass.exams || []).length} bài
                      </h3>
                      <p className="text-xs text-slate-500">
                        Đề thi giữa kỳ, cuối kỳ và các bài kiểm tra thực hành có thiết lập thời gian làm bài.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAddExamError('');
                        setIsAddExamOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-purple-500/20 transition hover:bg-purple-700 cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Tạo bài thi mới
                    </button>
                  </div>

                  {/* Danh sách các bài thi */}
                  {(viewingClass.exams || []).length > 0 ? (
                    <div className="space-y-3.5">
                      {(viewingClass.exams || []).map((exam) => (
                        <div
                          key={exam.id}
                          className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:border-purple-300 hover:shadow-md transition"
                        >
                          <div className="space-y-2">
                            {/* Hàng nhãn */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700">
                                  📝 {exam.type}
                                </span>

                                {exam.isProctored ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                    <ShieldCheck className="h-3 w-3" />
                                    Có giám sát
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                    Tự do
                                  </span>
                                )}
                              </div>

                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  exam.status === 'Đang diễn ra'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : exam.status === 'Sắp diễn ra'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    exam.status === 'Đang diễn ra'
                                      ? 'bg-emerald-500 animate-pulse'
                                      : exam.status === 'Sắp diễn ra'
                                      ? 'bg-amber-500'
                                      : 'bg-slate-400'
                                  }`}
                                />
                                {exam.status}
                              </span>
                            </div>

                            {/* Tiêu đề bài thi */}
                            <h4 className="text-sm sm:text-base font-bold text-slate-900">
                              {exam.title}
                            </h4>

                            {/* Chi tiết thông tin cấu hình */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                                <Terminal className="h-3.5 w-3.5 text-slate-400" />
                                {exam.language}
                              </span>

                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                                <Code2 className="h-3.5 w-3.5 text-slate-400" />
                                {exam.questionCount} bài coding
                              </span>

                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {exam.durationMinutes} phút
                              </span>

                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-0.5 text-slate-600 font-medium">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {exam.scheduledAt}
                              </span>
                            </div>

                            {/* Thông tin bộ đề liên kết từ module Đề & câu hỏi */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-slate-500">
                              <span>
                                Đề thi liên kết:{' '}
                                <strong className="font-semibold text-slate-700">
                                  {exam.templateId || 'TPL-EXAM-01'}
                                </strong>
                              </span>
                              <span className="text-slate-300">•</span>
                              <Link
                                href={`/admin?module=questions&templateId=${encodeURIComponent(
                                  exam.templateId || 'TPL-EXAM-01'
                                )}`}
                                className="inline-flex items-center gap-1 font-semibold text-purple-600 hover:underline"
                                title="Chỉnh sửa nội dung đề & câu hỏi trong module Đề & câu hỏi"
                              >
                                <FileCode2 className="h-3 w-3" />
                                Chỉnh sửa đề từ module Đề & câu hỏi
                                <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            </div>

                            {/* Mã phòng thi & Mật khẩu phòng thi */}
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2 text-xs">
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-[11px] font-semibold text-slate-500">Mã phòng thi:</span>
                                  <span className="rounded bg-white border border-purple-200 px-2 py-0.5 font-bold text-purple-700 shadow-xs">
                                    {exam.roomCode || `${exam.id}-ROOM`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-[11px] font-semibold text-slate-500">Mật khẩu:</span>
                                  <span className="rounded bg-white border border-purple-200 px-2 py-0.5 font-bold text-slate-800 shadow-xs tracking-wider">
                                    {exam.roomPassword || '123456'}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const rCode = exam.roomCode || `${exam.id}-ROOM`;
                                  const rPass = exam.roomPassword || '123456';
                                  const joinUrl = `${window.location.origin}/join?code=${rCode}`;
                                  const info = `PHÒNG THI: ${exam.title}\nLớp: ${viewingClass.id} - ${viewingClass.name}\nMã phòng thi: ${rCode}\nMật khẩu: ${rPass}\nCổng vào làm bài: ${joinUrl}`;
                                  navigator.clipboard.writeText(info);
                                  alert(`Đã sao chép phòng thi ${rCode} và mật khẩu vào Clipboard!`);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-white px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100/70 transition cursor-pointer shadow-xs"
                              >
                                <Copy className="h-3 w-3" />
                                Sao chép phòng
                              </button>
                            </div>
                          </div>

                          {/* Footer căn đều lề với tiến độ bên trái & nút thao tác bên phải */}
                          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-3">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-32 sm:w-36 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-purple-600"
                                  style={{
                                    width: `${
                                      viewingClass.students.length > 0
                                        ? Math.min(100, Math.round((exam.submissionCount / viewingClass.students.length) * 100))
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                              <p className="text-xs font-bold text-slate-700">
                                Đã nộp: <span className="text-purple-600 font-extrabold">{exam.submissionCount}</span>/{viewingClass.students.length} SV
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                              <button
                                type="button"
                                onClick={() => openEditExamModal(exam)}
                                title="Giảng viên thay đổi đề hoặc cấu hình bài thi này"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-purple-300 hover:bg-purple-50/70 hover:text-purple-700 transition cursor-pointer"
                              >
                                <Pencil className="h-3 w-3" />
                                <span>Thay đổi đề & cấu hình</span>
                              </button>

                              <button
                                type="button"
                                className="h-8 rounded-lg border border-purple-200 bg-purple-50/60 px-3 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                              >
                                Vào phòng thi & Giám sát
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteExam(exam.id)}
                                title="Xóa bài thi khỏi lớp"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                      Lớp chưa có bài thi / kiểm tra nào. Bấm &quot;Tạo bài thi mới&quot; để thiết lập kỳ thi cho lớp.
                    </div>
                  )}
                </div>
              )}

              {/* Hàng nút bấm dưới cùng */}
              <div className="mt-8 flex flex-wrap items-center justify-end gap-3 pt-2">
                {/* Nút hành động Mở / Đóng lớp của Giảng viên */}
                {viewingClass.status === 'Chưa mở' ? (
                  <button
                    type="button"
                    onClick={() => handleToggleClassStatus(viewingClass.id, 'Hoạt động')}
                    className="inline-flex items-center gap-1.5 h-10 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition cursor-pointer"
                    title="Giảng viên bấm để mở lớp cho sinh viên tham gia học và làm bài"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    Giảng viên mở lớp
                  </button>
                ) : viewingClass.status === 'Hoạt động' ? (
                  <button
                    type="button"
                    onClick={() => handleToggleClassStatus(viewingClass.id, 'Đã kết thúc')}
                    className="inline-flex items-center gap-1.5 h-10 rounded-xl border border-amber-200 bg-amber-50 px-4 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                    title="Kết thúc khóa học và đóng lớp này"
                  >
                    <CheckCircle className="h-4 w-4 text-amber-600" />
                    Đóng lớp (Kết thúc môn)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleClassStatus(viewingClass.id, 'Hoạt động')}
                    className="inline-flex items-center gap-1.5 h-10 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                    title="Giảng viên bấm để mở lại lớp học"
                  >
                    <RotateCcw className="h-4 w-4 text-blue-600" />
                    Mở lại lớp
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setViewingClass(null)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  Về danh sách lớp
                </button>

                <button
                  type="button"
                  onClick={handleEditFromDetail}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  Sửa thông tin
                </button>

                {detailTab === 'students' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAddStudentError('');
                      setIsAddStudentOpen(true);
                    }}
                    className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 cursor-pointer"
                  >
                    Thêm sinh viên
                  </button>
                ) : detailTab === 'labs' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAddLabError('');
                      setNewLabNumber((viewingClass.labs || []).length + 1);
                      setIsAddLabOpen(true);
                    }}
                    className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 cursor-pointer"
                  >
                    Tạo buổi lab mới
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAddExamError('');
                      setIsAddExamOpen(true);
                    }}
                    className="h-10 rounded-xl bg-purple-600 px-5 text-xs font-semibold text-white shadow-sm shadow-purple-500/20 transition hover:bg-purple-700 cursor-pointer"
                  >
                    Tạo bài thi mới
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TẠO BÀI LAB THỰC HÀNH MỚI CHO LỚP ── */}
      {isAddLabOpen && viewingClass && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsAddLabOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-lab-title"
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 my-8 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h2 id="add-lab-title" className="text-base font-bold text-slate-900">
                  Thêm buổi thực hành (Bài Lab) • Lớp {viewingClass.id}
                </h2>
                <p className="text-xs text-slate-500">
                  Mỗi buổi học có 1 bài lab. Trong bài lab có nhiều đề bài để sinh viên thực hành.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddLabOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddLab} className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    CHỌN BỘ ĐỀ TỪ MODULE &quot;ĐỀ & CÂU HỎI&quot;
                  </label>
                  <Link
                    href="/admin?module=questions"
                    className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    target="_blank"
                  >
                    Ngân hàng đề ↗
                  </Link>
                </div>
                <select
                  value={selectedLabTemplateId}
                  onChange={(e) => handleSelectLabTemplate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">-- Tự nhập tiêu đề & cấu hình thủ công --</option>
                  {questionTemplates.filter((t) => t.type === 'lab').map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      [{tpl.id}] {tpl.title} ({tpl.language} • {tpl.questionCount} đề)
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  💡 Bộ câu hỏi và test case được nạp từ module Đề & câu hỏi. Bạn có thể chỉnh sửa nội dung bài tập tại module Đề & câu hỏi.
                </p>
              </div>

              <div className="grid grid-cols-[110px_1fr] gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    BUỔI HỌC SỐ
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newLabNumber}
                    onChange={(e) => setNewLabNumber(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    TIÊU ĐỀ BÀI LAB <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={newLabTitle}
                    onChange={(e) => {
                      setNewLabTitle(e.target.value);
                      setAddLabError('');
                    }}
                    placeholder="Ví dụ: Cấu trúc điều khiển & Mảng một chiều"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    NGÔN NGỮ LẬP TRÌNH
                  </label>
                  <select
                    value={newLabLanguage}
                    onChange={(e) => setNewLabLanguage(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Python">Python</option>
                    <option value="C++">C++</option>
                    <option value="Java">Java</option>
                    <option value="JavaScript / Node.js">JavaScript / Node.js</option>
                    <option value="TypeScript">TypeScript</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    SỐ ĐỀ TRONG BÀI LAB
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newLabQuestions}
                    onChange={(e) => setNewLabQuestions(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Cấu hình thời gian thực hành */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-1 text-blue-600">
                    <Calendar className="h-4 w-4" />
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <span>CẤU HÌNH THỜI GIAN BUỔI THỰC HÀNH</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                      <Calendar className="h-3 w-3 text-blue-600" />
                      <span>GIỜ BẮT ĐẦU BUỔI LAB</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector('input');
                          input?.showPicker?.();
                          input?.focus();
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-blue-600 hover:text-blue-700 cursor-pointer"
                        title="Mở lịch chọn ngày và giờ"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                      <input
                        type="datetime-local"
                        value={newLabStartTime}
                        onClick={(e) => e.currentTarget.showPicker?.()}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewLabStartTime(val);
                          if (val && newLabDuration) {
                            setNewLabEndTime(addMinutesToIso(val, newLabDuration));
                          }
                        }}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                      <Calendar className="h-3 w-3 text-blue-600" />
                      <span>GIỜ KẾT THÚC (HẠN NỘP)</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector('input');
                          input?.showPicker?.();
                          input?.focus();
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-blue-600 hover:text-blue-700 cursor-pointer"
                        title="Mở lịch chọn ngày và giờ"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                      <input
                        type="datetime-local"
                        value={newLabEndTime}
                        onClick={(e) => e.currentTarget.showPicker?.()}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewLabEndTime(val);
                          if (newLabStartTime && val) {
                            const diff = calculateDurationInMinutes(newLabStartTime, val);
                            if (diff > 0) setNewLabDuration(diff);
                          }
                        }}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Chọn nhanh thời lượng để tự động tính khoảng thời gian */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10.5px] font-semibold text-slate-500">
                    Khoảng thời lượng:
                  </span>
                  {[60, 90, 120, 135, 150, 180].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setNewLabDuration(mins);
                        if (newLabStartTime) {
                          setNewLabEndTime(addMinutesToIso(newLabStartTime, mins));
                        }
                      }}
                      className={`rounded-lg px-2 py-0.5 text-[10.5px] font-semibold transition cursor-pointer ${
                        newLabDuration === mins
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      +{mins}p
                    </button>
                  ))}
                </div>

                {/* Khoảng thời gian trực quan tóm tắt */}
                {newLabStartTime && newLabEndTime && (
                  <div className="rounded-xl border border-blue-200/80 bg-blue-50/90 px-3 py-1.5 text-[11px] text-blue-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Calendar className="h-3.5 w-3.5 text-blue-600" />
                      {formatDatetimeVietnamese(newLabStartTime)} → {formatDatetimeVietnamese(newLabEndTime)}
                    </span>
                    <span className="font-bold text-blue-700 bg-white/80 px-2 py-0.5 rounded-md border border-blue-200">
                      ⏱️ {calculateDurationInMinutes(newLabStartTime, newLabEndTime) || newLabDuration} phút
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                      <Clock className="h-3 w-3 text-amber-600" />
                      <span>THỜI LƯỢNG LÀM BÀI</span>
                    </label>
                    <select
                      value={newLabDuration}
                      onChange={(e) => setNewLabDuration(Number(e.target.value))}
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    >
                      <option value={60}>60 phút (1 giờ)</option>
                      <option value={90}>90 phút (1.5 giờ)</option>
                      <option value={120}>120 phút (2 giờ)</option>
                      <option value={135}>135 phút (3 tiết)</option>
                      <option value={150}>150 phút (2.5 giờ)</option>
                      <option value={180}>180 phút (3 giờ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <span>LỊCH HỌC / THỜI KHÓA BIỂU</span>
                    </label>
                    <input
                      value={newLabSchedule}
                      onChange={(e) => setNewLabSchedule(e.target.value)}
                      placeholder="Ví dụ: Thứ 3 (Tuần 2)"
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>

              {/* Checkbox Giám sát thực hành */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newLabProctored}
                    onChange={(e) => setNewLabProctored(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-900">Bật giám sát phòng thực hành (Proctoring)</span>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      Ghi nhận thao tác, cảnh báo rời tab và giám sát màn hình sinh viên trong suốt buổi thực hành.
                    </p>
                  </div>
                </label>
              </div>

              {/* Thông tin phòng ngẫu nhiên */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                <KeyRound className="h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  Hệ thống sẽ <strong>tự động sinh ngẫu nhiên Mã phòng & Mật khẩu (6 số)</strong> cho bài lab trong buổi học này ngay khi bạn bấm Tạo.
                </span>
              </div>

              {addLabError && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {addLabError}
                </p>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddLabOpen(false)}
                  className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 cursor-pointer"
                >
                  Tạo buổi lab
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ── MODAL TẠO BÀI THI / KIỂM TRA MỚI CHO LỚP ── */}
      {isAddExamOpen && viewingClass && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsAddExamOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-exam-title"
            className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h2 id="create-exam-title" className="text-base font-bold text-slate-900">
                  Tạo bài thi / Kiểm tra • Lớp {viewingClass.id}
                </h2>
                <p className="text-xs text-slate-500">
                  Thiết lập bài thi lập trình, thời gian làm bài và hình thức giám sát.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddExamOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="mt-4 space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    CHỌN ĐỀ THI TỪ NGÂN HÀNG &quot;ĐỀ & CÂU HỎI&quot;
                  </label>
                  <Link
                    href="/admin?module=questions"
                    className="text-[11px] font-semibold text-purple-600 hover:underline inline-flex items-center gap-0.5"
                    target="_blank"
                  >
                    Ngân hàng đề ↗
                  </Link>
                </div>
                <select
                  value={selectedExamTemplateId}
                  onChange={(e) => handleSelectExamTemplate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                >
                  <option value="">-- Tự nhập tiêu đề & cấu hình thủ công --</option>
                  {questionTemplates.filter((t) => t.type === 'exam').map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      [{tpl.id}] {tpl.title} ({tpl.language} • {tpl.questionCount} bài coding)
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  💡 Chọn đề thi từ ngân hàng để đồng bộ bộ test và cấu trúc câu hỏi. Bạn có thể chỉnh sửa đề tại module Đề & câu hỏi.
                </p>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  TIÊU ĐỀ BÀI THI <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={newExamTitle}
                  onChange={(e) => {
                    setNewExamTitle(e.target.value);
                    setAddExamError('');
                  }}
                  placeholder="Ví dụ: Kiểm tra giữa kỳ • Xây dựng ứng dụng Web tương tác"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-700">
                    LOẠI BÀI KIỂM TRA
                  </label>
                  <select
                    value={newExamType}
                    onChange={(e) =>
                      setNewExamType(
                        e.target.value as
                          | 'Kiểm tra giữa kỳ'
                          | 'Kiểm tra quá trình'
                          | 'Thi kết thúc môn'
                          | 'Kiểm tra thực hành'
                      )
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-xs font-semibold text-slate-800"
                  >
                    <option value="Kiểm tra giữa kỳ">Kiểm tra giữa kỳ</option>
                    <option value="Kiểm tra quá trình">Kiểm tra quá trình</option>
                    <option value="Thi kết thúc môn">Thi kết thúc môn</option>
                    <option value="Kiểm tra thực hành">Kiểm tra thực hành</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-700">
                    NGÔN NGỮ LẬP TRÌNH
                  </label>
                  <select
                    value={newExamLanguage}
                    onChange={(e) => setNewExamLanguage(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-xs font-semibold text-slate-800"
                  >
                    <option value="JavaScript / TypeScript">JavaScript / TypeScript</option>
                    <option value="Python">Python</option>
                    <option value="C / C++">C / C++</option>
                    <option value="Java">Java</option>
                    <option value="C#">C#</option>
                    <option value="SQL">SQL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-700">
                    THỜI GIAN LÀM BÀI (PHÚT)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={360}
                    value={newExamDuration}
                    onChange={(e) => setNewExamDuration(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-700">
                    SỐ CÂU HỎI CODING
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newExamQuestions}
                    onChange={(e) => setNewExamQuestions(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  LỊCH TRÌNH DIỄN RA
                </label>
                <input
                  value={newExamSchedule}
                  onChange={(e) => setNewExamSchedule(e.target.value)}
                  placeholder="Ví dụ: 08:00 - 09:30, 20/11/2026"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-xs font-medium text-slate-800"
                />
              </div>

              {/* Checkbox Giám sát */}
              <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newExamProctored}
                    onChange={(e) => setNewExamProctored(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-900">Bật giám sát trực tuyến (Proctoring)</span>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      Ghi nhận thao tác, cảnh báo rời tab và giám sát camera/màn hình trong suốt thời gian thi.
                    </p>
                  </div>
                </label>
              </div>

              {/* Thông tin phòng thi ngẫu nhiên */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                <KeyRound className="h-4 w-4 text-purple-600 shrink-0" />
                <span>
                  Hệ thống sẽ <strong>tự động sinh ngẫu nhiên Mã phòng thi & Mật khẩu (6 số)</strong> cho bài thi này ngay khi bạn bấm Tạo.
                </span>
              </div>

              {addExamError && (
                <p role="alert" className="text-xs font-semibold text-red-600">
                  {addExamError}
                </p>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddExamOpen(false)}
                  className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-xl bg-purple-600 px-5 text-xs font-semibold text-white shadow-sm shadow-purple-500/20 transition hover:bg-purple-700 cursor-pointer"
                >
                  Tạo bài thi
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ── MODAL GIẢNG VIÊN THAY ĐỔI ĐỀ & CẤU HÌNH BÀI LAB ── */}
      {editingLab && viewingClass && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 overflow-y-auto"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditingLab(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-lab-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200/80 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 id="edit-lab-title" className="text-base font-bold text-slate-900">
                  Thay đổi đề & cấu hình • Buổi 0{editingLab.labNumber} (Bài Lab 0{editingLab.labNumber})
                </h2>
                <p className="text-xs text-slate-500">
                  Lớp {viewingClass.id} • Điều chỉnh thông tin bài lab và số lượng đề bên trong.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLab(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLab} className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    CHỌN BỘ ĐỀ TỪ NGÂN HÀNG ĐỀ & CÂU HỎI
                  </label>
                  <Link
                    href={`/admin?module=questions&templateId=${encodeURIComponent(editLabTemplateId || 'TPL-LAB-01')}`}
                    className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    target="_blank"
                  >
                    Xem chi tiết đề ↗
                  </Link>
                </div>
                <select
                  value={editLabTemplateId}
                  onChange={(e) => handleSwitchLabTemplateInEdit(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">-- Đề tự thiết lập riêng cho lớp này --</option>
                  {questionTemplates.filter((t) => t.type === 'lab').map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      [{tpl.id}] {tpl.title} ({tpl.language} • {tpl.questionCount} đề)
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  💡 Giảng viên chọn đề khác từ ngân hàng sẽ tự động cập nhật tên và cấu hình bài tập tương ứng.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  TIÊU ĐỀ BÀI LAB <span className="text-red-500">*</span>
                </label>
                <input
                  value={editLabTitle}
                  onChange={(e) => {
                    setEditLabTitle(e.target.value);
                    setEditLabError('');
                  }}
                  placeholder="Ví dụ: Cấu trúc điều khiển & Mảng một chiều"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    NGÔN NGỮ LẬP TRÌNH
                  </label>
                  <select
                    value={editLabLanguage}
                    onChange={(e) => setEditLabLanguage(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="JavaScript / Python">JavaScript / Python</option>
                    <option value="Python">Python</option>
                    <option value="C++">C++</option>
                    <option value="Java">Java</option>
                    <option value="JavaScript">JavaScript</option>
                    <option value="JavaScript / Node.js">JavaScript / Node.js</option>
                    <option value="TypeScript">TypeScript</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    SỐ ĐỀ TRONG BÀI LAB
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editLabQuestions}
                    onChange={(e) => setEditLabQuestions(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Cấu hình thời gian thực hành */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-1 text-blue-600">
                    <Calendar className="h-4 w-4" />
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <span>CẤU HÌNH THỜI GIAN BUỔI THỰC HÀNH</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                      <Calendar className="h-3 w-3 text-blue-600" />
                      <span>GIỜ BẮT ĐẦU BUỔI LAB</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector('input');
                          input?.showPicker?.();
                          input?.focus();
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-blue-600 hover:text-blue-700 cursor-pointer"
                        title="Mở lịch chọn ngày và giờ"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                      <input
                        type="datetime-local"
                        value={editLabStartTime}
                        onClick={(e) => e.currentTarget.showPicker?.()}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditLabStartTime(val);
                          if (val && editLabDuration) {
                            setEditLabEndTime(addMinutesToIso(val, editLabDuration));
                          }
                        }}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                      <Calendar className="h-3 w-3 text-blue-600" />
                      <span>GIỜ KẾT THÚC (HẠN NỘP)</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector('input');
                          input?.showPicker?.();
                          input?.focus();
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-blue-600 hover:text-blue-700 cursor-pointer"
                        title="Mở lịch chọn ngày và giờ"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                      <input
                        type="datetime-local"
                        value={editLabEndTime}
                        onClick={(e) => e.currentTarget.showPicker?.()}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditLabEndTime(val);
                          if (editLabStartTime && val) {
                            const diff = calculateDurationInMinutes(editLabStartTime, val);
                            if (diff > 0) setEditLabDuration(diff);
                          }
                        }}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-2 text-xs font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Chọn nhanh thời lượng để tự động tính khoảng thời gian */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10.5px] font-semibold text-slate-500">
                    Khoảng thời lượng:
                  </span>
                  {[60, 90, 120, 135, 150, 180].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setEditLabDuration(mins);
                        if (editLabStartTime) {
                          setEditLabEndTime(addMinutesToIso(editLabStartTime, mins));
                        }
                      }}
                      className={`rounded-lg px-2 py-0.5 text-[10.5px] font-semibold transition cursor-pointer ${
                        editLabDuration === mins
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      +{mins}p
                    </button>
                  ))}
                </div>

                {/* Khoảng thời gian trực quan tóm tắt */}
                {editLabStartTime && editLabEndTime && (
                  <div className="rounded-xl border border-blue-200/80 bg-blue-50/90 px-3 py-1.5 text-[11px] text-blue-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Calendar className="h-3.5 w-3.5 text-blue-600" />
                      {formatDatetimeVietnamese(editLabStartTime)} → {formatDatetimeVietnamese(editLabEndTime)}
                    </span>
                    <span className="font-bold text-blue-700 bg-white/80 px-2 py-0.5 rounded-md border border-blue-200">
                      ⏱️ {calculateDurationInMinutes(editLabStartTime, editLabEndTime) || editLabDuration} phút
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                      <Clock className="h-3 w-3 text-amber-600" />
                      <span>THỜI LƯỢNG LÀM BÀI</span>
                    </label>
                    <select
                      value={editLabDuration}
                      onChange={(e) => {
                        const mins = Number(e.target.value);
                        setEditLabDuration(mins);
                        if (editLabStartTime) {
                          setEditLabEndTime(addMinutesToIso(editLabStartTime, mins));
                        }
                      }}
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    >
                      <option value={60}>60 phút (1 giờ)</option>
                      <option value={90}>90 phút (1.5 giờ)</option>
                      <option value={120}>120 phút (2 giờ)</option>
                      <option value={135}>135 phút (3 tiết)</option>
                      <option value={150}>150 phút (2.5 giờ)</option>
                      <option value={180}>180 phút (3 giờ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <span>LỊCH HỌC / GHI CHÚ</span>
                    </label>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        value={editLabSchedule}
                        onChange={(e) => setEditLabSchedule(e.target.value)}
                        placeholder="Ví dụ: Thứ 3 (Tuần 2)"
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  TRẠNG THÁI BÀI LAB
                </label>
                <select
                  value={editLabStatus}
                  onChange={(e) => setEditLabStatus(e.target.value as 'Đang mở' | 'Đã đóng')}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Đang mở">Đang mở (Sinh viên nộp bài)</option>
                  <option value="Đã đóng">Đã đóng (Khóa nộp bài)</option>
                </select>
              </div>

              {/* Checkbox Giám sát thực hành */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editLabProctored}
                    onChange={(e) => setEditLabProctored(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-900 text-xs">Bật giám sát phòng thực hành (Proctoring)</span>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      Ghi nhận thao tác, cảnh báo rời tab và giám sát màn hình sinh viên trong suốt buổi thực hành.
                    </p>
                  </div>
                </label>
              </div>

              {editLabError && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {editLabError}
                </p>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLab(null)}
                  className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 cursor-pointer"
                >
                  Lưu thay đổi bài Lab
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ── MODAL GIẢNG VIÊN THAY ĐỔI ĐỀ THI & CẤU HÌNH BÀI THI ── */}
      {editingExam && viewingClass && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 overflow-y-auto"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditingExam(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-exam-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200/80 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 id="edit-exam-title" className="text-base font-bold text-slate-900">
                  Thay đổi đề thi & cấu hình • {viewingClass.id}
                </h2>
                <p className="text-xs text-slate-500">
                  Giảng viên có thể đổi sang đề thi khác trong ngân hàng hoặc điều chỉnh lịch thi & thời gian.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingExam(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditExam} className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 text-xs">
                    CHỌN BỘ ĐỀ THI TỪ NGÂN HÀNG ĐỀ & CÂU HỎI
                  </label>
                  <Link
                    href={`/admin?module=questions&templateId=${encodeURIComponent(editExamTemplateId || 'TPL-EXAM-01')}`}
                    className="text-[11px] font-semibold text-purple-600 hover:underline inline-flex items-center gap-0.5"
                    target="_blank"
                  >
                    Xem chi tiết đề thi ↗
                  </Link>
                </div>
                <select
                  value={editExamTemplateId}
                  onChange={(e) => handleSwitchExamTemplateInEdit(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                >
                  <option value="">-- Đề tự thiết lập riêng cho lớp này --</option>
                  {questionTemplates.filter((t) => t.type === 'exam').map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      [{tpl.id}] {tpl.title} ({tpl.language} • {tpl.questionCount} bài coding)
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  💡 Đổi sang đề thi khác sẽ tự động cập nhật nội dung bài thi và thời gian theo chuẩn ngân hàng đề.
                </p>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 text-xs">
                  TIÊU ĐỀ BÀI THI <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={editExamTitle}
                  onChange={(e) => {
                    setEditExamTitle(e.target.value);
                    setEditExamError('');
                  }}
                  placeholder="Ví dụ: Kiểm tra giữa kỳ • Xây dựng ứng dụng Web tương tác"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-700 text-xs">
                    LOẠI BÀI KIỂM TRA
                  </label>
                  <select
                    value={editExamType}
                    onChange={(e) =>
                      setEditExamType(
                        e.target.value as
                          | 'Kiểm tra giữa kỳ'
                          | 'Kiểm tra quá trình'
                          | 'Thi kết thúc môn'
                          | 'Kiểm tra thực hành'
                      )
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-xs font-semibold text-slate-800"
                  >
                    <option value="Kiểm tra giữa kỳ">Kiểm tra giữa kỳ</option>
                    <option value="Kiểm tra quá trình">Kiểm tra quá trình</option>
                    <option value="Thi kết thúc môn">Thi kết thúc môn</option>
                    <option value="Kiểm tra thực hành">Kiểm tra thực hành</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-700 text-xs">
                    NGÔN NGỮ LẬP TRÌNH
                  </label>
                  <select
                    value={editExamLanguage}
                    onChange={(e) => setEditExamLanguage(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-xs font-semibold text-slate-800"
                  >
                    <option value="JavaScript / TypeScript">JavaScript / TypeScript</option>
                    <option value="JavaScript / Node.js">JavaScript / Node.js</option>
                    <option value="Python">Python</option>
                    <option value="C / C++">C / C++</option>
                    <option value="C++">C++</option>
                    <option value="Java">Java</option>
                    <option value="C#">C#</option>
                    <option value="SQL">SQL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-700 text-xs">
                    THỜI GIAN LÀM BÀI (PHÚT)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={360}
                    value={editExamDuration}
                    onChange={(e) => setEditExamDuration(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-700 text-xs">
                    SỐ BÀI TẬP CODING
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={editExamQuestions}
                    onChange={(e) => setEditExamQuestions(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-700 text-xs">
                    LỊCH THI
                  </label>
                  <input
                    value={editExamSchedule}
                    onChange={(e) => setEditExamSchedule(e.target.value)}
                    placeholder="Ví dụ: 08:00 - 09:30, 20/11/2026"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-700 text-xs">
                    TRẠNG THÁI BÀI THI
                  </label>
                  <select
                    value={editExamStatus}
                    onChange={(e) => setEditExamStatus(e.target.value as ExamStatus)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 text-xs font-semibold text-slate-800"
                  >
                    <option value="Sắp diễn ra">Sắp diễn ra</option>
                    <option value="Đang diễn ra">Đang diễn ra</option>
                    <option value="Đã kết thúc">Đã kết thúc</option>
                  </select>
                </div>
              </div>

              {/* Checkbox Giám sát bài thi */}
              <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editExamProctored}
                    onChange={(e) => setEditExamProctored(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-900 text-xs">Bật giám sát phòng thi (Proctoring)</span>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      Ghi nhận thao tác, cảnh báo rời tab và giám sát camera/màn hình trong suốt thời gian thi.
                    </p>
                  </div>
                </label>
              </div>

              {editExamError && (
                <p role="alert" className="text-xs font-semibold text-red-600">
                  {editExamError}
                </p>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingExam(null)}
                  className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-xl bg-purple-600 px-5 text-xs font-semibold text-white shadow-sm shadow-purple-500/20 transition hover:bg-purple-700 cursor-pointer"
                >
                  Lưu thay đổi bài thi
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal Thêm sinh viên vào lớp */}
      {isAddStudentOpen && viewingClass && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsAddStudentOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-student-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200/80"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 id="add-student-title" className="text-base font-bold text-slate-900">
                Thêm sinh viên vào lớp {viewingClass.id}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddStudentOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Mã sinh viên <span className="text-red-500">*</span>
                </label>
                <input
                  name="studentId"
                  required
                  placeholder="Ví dụ: SE184805"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  name="studentName"
                  required
                  placeholder="Ví dụ: Nguyễn Hoàng Nam"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Email sinh viên <span className="text-red-500">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Ví dụ: nam.nh@school.edu.vn"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {addStudentError && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {addStudentError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700 cursor-pointer"
                >
                  Xác nhận thêm
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

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
