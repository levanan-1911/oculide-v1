'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Code2,
  Terminal,
  Clock,
  FileCode2,
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  X,
  ExternalLink,
  GraduationCap,
  Sparkles,
  Layers,
  Check,
  Download,
  Eye,
  EyeOff,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import {
  QuestionTemplate,
  TemplateQuestionItem,
TestCaseItem,
  TemplateTestCaseItem,
  getStoredQuestionTemplates,
  saveStoredQuestionTemplates,
  getStoredClasses,
  syncClassesWithTemplate,
  ClassRow,
} from '@/app/admin/classes/types';
import {
  ExamScheduleItem,
  getStoredSchedules,
} from '@/app/admin/schedules/types';

function createDefaultTestCase(
  index: number,
  inputData = '',
  expectedOutput = '',
): TemplateTestCaseItem {
  return {
    id: `TC-${String(index).padStart(2, '0')}`,
    inputData,
    expectedOutput,
    isHidden: false,
    points: 1,
  };
}

function normalizeQuestionForEditor(
  question: TemplateQuestionItem,
): TemplateQuestionItem {
  const existingCases = Array.isArray(question.testCases)
    ? question.testCases
    : [];

  const testCases =
    existingCases.length > 0
      ? existingCases.map((testCase, index) => ({
          ...createDefaultTestCase(index + 1),
          ...testCase,
          id: testCase.id || `TC-${String(index + 1).padStart(2, '0')}`,
        }))
      : [
          createDefaultTestCase(
            1,
            question.sampleInput || '',
            question.sampleOutput || '',
          ),
        ];

  return {
    ...question,
    testCases,
    testCasesCount: testCases.length,
  };
}

export default function QuestionsManagerView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const directTemplateId = searchParams.get('templateId');

  // Phân định vai trò: Giảng viên (Instructor) vs Quản trị viên (Admin)
  const isInstructor = pathname.startsWith('/instructor');
  const isAdmin = !isInstructor;

  const [templates, setTemplates] = useState<QuestionTemplate[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [schedules, setSchedules] = useState<ExamScheduleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lab' | 'exam'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedTemplateIds, setExpandedTemplateIds] = useState<Record<string, boolean>>({});
  const [expandedQuestionTestCases, setExpandedQuestionTestCases] = useState<Record<string, boolean>>({});

  // Modal State for Editing / Creating (Chỉ dành cho Giảng viên)
  const [editingTemplate, setEditingTemplate] = useState<QuestionTemplate | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editQuestions, setEditQuestions] = useState<TemplateQuestionItem[]>([]);
  // Modal State xem thông tin đề chỉ đọc (Dành cho Admin - không hiện câu hỏi & testcases)
  const [viewingAdminTemplate, setViewingAdminTemplate] = useState<QuestionTemplate | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Load templates, classes & schedules from localStorage + listen to storage sync
  useEffect(() => {
    const loadAllData = () => {
      const loadedTemplates = getStoredQuestionTemplates();
      const loadedClasses = getStoredClasses();
      const loadedSchedules = getStoredSchedules();
      setTemplates(loadedTemplates);
      setClasses(loadedClasses);
      setSchedules(loadedSchedules);

if (directTemplateId) {
        const match = loadedTemplates.find((t) => t.id === directTemplateId);
        if (match) {
          if (isInstructor) {
            setEditingTemplate(match);
            setEditQuestions(
              match.questions
                ? JSON.parse(JSON.stringify(match.questions)).map(normalizeQuestionForEditor)
                : []
            );
            setExpandedTemplateIds((prev) => ({ ...prev, [directTemplateId]: true }));
          } else {
            setViewingAdminTemplate(match);
          }
        }
      }
    };

    loadAllData();
    window.addEventListener('storage', loadAllData);
    return () => window.removeEventListener('storage', loadAllData);
  }, [directTemplateId, isInstructor]);

  // Hide notification after 4 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Map each template to the classes using it (từ cả lớp học và lịch kiểm tra)
  const templateUsageMap = useMemo(() => {
    const map: Record<string, { classId: string; className: string; activityType: 'lab' | 'exam' }[]> = {};
    templates.forEach((tpl) => {
      map[tpl.id] = [];
    });

    classes.forEach((c) => {
      (c.labs || []).forEach((l) => {
        if (l.templateId && map[l.templateId]) {
          if (!map[l.templateId].some((u) => u.classId === c.id)) {
            map[l.templateId].push({ classId: c.id, className: c.name, activityType: 'lab' });
          }
        }
      });
      (c.exams || []).forEach((e) => {
        if (e.templateId && map[e.templateId]) {
          if (!map[e.templateId].some((u) => u.classId === c.id)) {
            map[e.templateId].push({ classId: c.id, className: c.name, activityType: 'exam' });
          }
        }
      });
    });

    // Bổ sung các lớp học từ lịch kiểm tra do Giảng viên tạo
    schedules.forEach((s) => {
      if (s.templateId && map[s.templateId]) {
        if (!map[s.templateId].some((u) => u.classId === s.classId)) {
          map[s.templateId].push({
            classId: s.classId,
            className: s.className,
            activityType: s.templateId.includes('LAB') ? 'lab' : 'exam',
          });
        }
      }
    });

    return map;
  }, [templates, classes, schedules]);

  // Map each template to the exam schedules using it
  const templateScheduleMap = useMemo(() => {
    const map: Record<string, ExamScheduleItem[]> = {};
    templates.forEach((tpl) => {
      map[tpl.id] = [];
    });
    schedules.forEach((s) => {
      if (s.templateId && map[s.templateId]) {
        map[s.templateId].push(s);
      }
    });
    return map;
  }, [templates, schedules]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      if (typeFilter !== 'all' && tpl.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && tpl.category !== categoryFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesId = tpl.id.toLowerCase().includes(q);
        const matchesTitle = tpl.title.toLowerCase().includes(q);
        const matchesCategory = tpl.category.toLowerCase().includes(q);
        const matchesLang = tpl.language.toLowerCase().includes(q);
        const matchesLecturer = (tpl.lecturer || '').toLowerCase().includes(q);
        // Nếu là Giảng viên mới tìm kiếm trong nội dung câu hỏi
        const matchesQuestion = isInstructor
          ? (tpl.questions || []).some(
              (question) =>
                question.title.toLowerCase().includes(q) || question.description.toLowerCase().includes(q)
            )
          : false;
        return matchesId || matchesTitle || matchesCategory || matchesLang || matchesLecturer || matchesQuestion;
      }
      return true;
    });
  }, [templates, typeFilter, categoryFilter, searchTerm, isInstructor]);

  // Toggle card expansion
  function toggleExpand(id: string) {
    setExpandedTemplateIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  // Toggle test cases detail for a specific question in the list
  function toggleQuestionTestCases(uniqueKey: string) {
    setExpandedQuestionTestCases((prev) => ({
      ...prev,
      [uniqueKey]: !prev[uniqueKey],
    }));
  }

  // Open Edit Modal
  function handleOpenEdit(template: QuestionTemplate) {
    setIsCreatingNew(false);
    setEditingTemplate(template);

    setEditQuestions(
      template.questions
        ? JSON.parse(JSON.stringify(template.questions)).map(
          normalizeQuestionForEditor,
        )
        : [],
    );
  }

  // Open Create Modal
  function handleOpenCreate() {
    setIsCreatingNew(true);
    const newId = `TPL-LAB-0${templates.length + 1}`;
    const initialTestCases: TestCaseItem[] = [
      { id: 'TC-01', input: '[1, 2, 3]', expectedOutput: '6', isHidden: false, points: 2 },
      { id: 'TC-02', input: '[0, 0, 0]', expectedOutput: '0', isHidden: false, points: 2 },
      { id: 'TC-03', input: '[-1, -2, -3]', expectedOutput: '-6', isHidden: true, points: 3 },
      { id: 'TC-04', input: '[100, 200, 300]', expectedOutput: '600', isHidden: true, points: 3 },
    ];
    const initialQuestion: TemplateQuestionItem = {
      id: 'Q-01',
      title: 'Bài 1: Khởi tạo chương trình',
      difficulty: 'Dễ',
      description: 'Cài đặt hàm tính toán cơ bản theo đặc tả...',
      sampleInput: '[1, 2, 3]',
      sampleOutput: '6',
      testCasesCount: initialTestCases.length,
      testCases: initialTestCases,
    };

    setEditingTemplate({
      id: newId,
      title: '',
      type: 'lab',
      category: 'Lập trình căn bản',
      language: 'JavaScript / Python',
      questionCount: 1,
      description: 'Mô tả bài thực hành...',
      questions: [initialQuestion],
      updatedAt: 'Hôm nay',
      lecturer: 'Thầy Nguyễn Văn Nam',
    });
    setEditQuestions([initialQuestion]);
  }

  // Add a question inside the edit modal
  function handleAddQuestionToTemplate() {
    const nextIndex = editQuestions.length + 1;
    const defaultTestCases: TestCaseItem[] = [
      { id: 'TC-01', input: 'input_1', expectedOutput: 'output_1', isHidden: false, points: 2 },
      { id: 'TC-02', input: 'input_2', expectedOutput: 'output_2', isHidden: false, points: 2 },
      { id: 'TC-03', input: 'input_hidden', expectedOutput: 'output_hidden', isHidden: true, points: 3 },
    ];

    const newQ: TemplateQuestionItem = {
      id: `Q-0${nextIndex}`,
      title: `Bài ${nextIndex}: Yêu cầu thuật toán mới`,
      difficulty: nextIndex % 2 === 0 ? 'Trung bình' : 'Dễ',
description: 'Mô tả chi tiết yêu cầu thuật toán, điều kiện biên và kết quả trả về.',
      sampleInput: '',
      sampleOutput: '',
      testCases: [createDefaultTestCase(1)],
      testCasesCount: 1,
    };
    setEditQuestions((prev) => [...prev, newQ]);
  }

  // Remove a question
  function handleRemoveQuestionFromTemplate(index: number) {
    setEditQuestions((prev) => prev.filter((_, idx) => idx !== index));
  }

  // Update a question field
  function handleUpdateQuestionField(index: number, field: keyof TemplateQuestionItem, value: any) {
    setEditQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }
  // Add a test case to a question
  function handleAddTestCase(questionIndex: number) {
  setEditQuestions((prev) =>
    prev.map((question, index) => {
      if (index !== questionIndex) return question;


      const testCases = question.testCases || [];
      const nextTestCases = [
        ...testCases,
        createDefaultTestCase(testCases.length + 1),
      ];

      return {
        ...question,
        testCases: nextTestCases,
        testCasesCount: nextTestCases.length,
      };
    }),
  );
}

function handleRemoveTestCase(
  questionIndex: number,
  testCaseIndex: number,
) {
  setEditQuestions((prev) =>
    prev.map((question, index) => {
      if (index !== questionIndex) return question;

      const testCases = (question.testCases || []).filter(
        (_, tcIndex) => tcIndex !== testCaseIndex,
      );

      return {
        ...question,
        testCases,
        testCasesCount: testCases.length,
      };
    }),
  );
}

function handleUpdateTestCaseField(
  questionIndex: number,
  testCaseIndex: number,
  field: keyof TemplateTestCaseItem,
  value: string | number | boolean,
) {
  setEditQuestions((prev) =>
    prev.map((question, index) => {
      if (index !== questionIndex) return question;

      const testCases = (question.testCases || []).map(
        (testCase, tcIndex) =>
          tcIndex === testCaseIndex
            ? { ...testCase, [field]: value }
            : testCase,
      );

      return {
        ...question,
        testCases,
        testCasesCount: testCases.length,
      };
    }),
  );
}
// Save changes
  function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTemplate) return;

    const trimmedTitle = editingTemplate.title.trim();
    if (!trimmedTitle) {
      alert('Vui lòng nhập tên bộ đề.');
      return;
    }
    
    const questionWithoutTestCases = editQuestions.findIndex(
  (question) =>
    !question.testCases || question.testCases.length === 0,
);

if (questionWithoutTestCases >= 0) {
  alert(
    `Câu hỏi ${questionWithoutTestCases + 1} cần có ít nhất một Test Case.`,
  );
  return;
}

const updatedQuestions = editQuestions.map((question) => ({
  ...question,
  testCasesCount: question.testCases?.length || 0,
}));

    // Ensure testCasesCount matches testCases length
    const normalizedQuestions = editQuestions.map((q) => ({
      ...q,
      testCasesCount: (q.testCases && q.testCases.length > 0) ? q.testCases.length : (q.testCasesCount || 0),
    }));

    const updatedTpl: QuestionTemplate = {
      ...editingTemplate,
      title: trimmedTitle,
questionCount: updatedQuestions.length,
      questions: updatedQuestions,
      updatedAt: 'Vừa xong',
    };

    let nextTemplates: QuestionTemplate[];
    if (isCreatingNew) {
      nextTemplates = [updatedTpl, ...templates];
    } else {
      nextTemplates = templates.map((t) => (t.id === updatedTpl.id ? updatedTpl : t));
    }

    setTemplates(nextTemplates);
    saveStoredQuestionTemplates(nextTemplates);

    // Synchronize classes that use this template
    syncClassesWithTemplate(updatedTpl);
    setClasses(getStoredClasses());

    const affectedClasses = templateUsageMap[updatedTpl.id] || [];
    const classCount = affectedClasses.length;

    setNotification({
      type: 'success',
      message: `Đã lưu thành công bộ đề "${updatedTpl.id}" và tự động đồng bộ sang ${classCount} lớp học liên kết (${affectedClasses.map((c) => c.classId).join(', ') || 'Chưa gán'}).`,
    });

    setEditingTemplate(null);
  }

  // Delete a template
  function handleDeleteTemplate(templateId: string) {
    const usage = templateUsageMap[templateId] || [];
    if (usage.length > 0) {
      const confirmForce = confirm(
        `Bộ đề "${templateId}" hiện đang được sử dụng trong ${usage.length} lớp học (${usage.map((u) => u.classId).join(', ')}).\nBạn có chắc chắn muốn xóa không?`
      );
      if (!confirmForce) return;
    } else {
      if (!confirm(`Bạn có chắc chắn muốn xóa bộ đề "${templateId}"?`)) return;
    }

    const next = templates.filter((t) => t.id !== templateId);
    setTemplates(next);
    saveStoredQuestionTemplates(next);
    setNotification({
      type: 'info',
      message: `Đã xóa bộ đề "${templateId}".`,
    });
  }

  // Export to Excel / CSV
  function handleExportExcel() {
    if (templates.length === 0) {
      alert('Không có dữ liệu bộ đề để xuất.');
      return;
    }

    const rows: string[][] = [];

    if (isAdmin) {
      // Role Admin: Chỉ xuất thông tin quản lý định danh đề (KHÔNG xuất câu hỏi & testcases bảo mật)
      rows.push([
        'Mã bộ đề',
        'Tên bộ đề',
        'Loại đề',
        'Chuyên mục',
        'Giảng viên khởi tạo',
        'Ngôn ngữ lập trình',
        'Số bài tập coding',
        'Tổng số Test Cases',
        'Thời gian (phút)',
        'Các lớp đang sử dụng',
        'Ca kiểm tra áp dụng',
        'Cập nhật',
      ]);

      templates.forEach((t) => {
        const questions = t.questions || [];
        const totalTc = questions.reduce(
          (sum, q) => sum + ((q.testCases && q.testCases.length) || q.testCasesCount || 0),
          0
        );
        const classList = (templateUsageMap[t.id] || []).map((u) => u.classId).join(', ');
        const schedList = (templateScheduleMap[t.id] || []).map((s) => s.id).join(', ');
        rows.push([
          t.id,
          t.title,
          t.type === 'lab' ? 'Lab thực hành' : 'Thi lập trình',
          t.category,
          t.lecturer || 'Thầy Nguyễn Văn Nam',
          t.language,
          String(questions.length || t.questionCount || 0),
          String(totalTc),
          String(t.durationMinutes || (t.type === 'exam' ? 90 : 120)),
          classList || 'Chưa gán',
          schedList || 'Chưa lên lịch',
          t.updatedAt || 'Hôm nay',
        ]);
      });
    } else {
      // Role Giảng viên: Xuất đầy đủ câu hỏi & testcases
      rows.push([
        'Mã bộ đề',
        'Tên bộ đề',
        'Loại đề',
        'Chuyên mục',
        'Ngôn ngữ',
        'Thời gian (phút)',
        'Mã câu hỏi',
        'Tiêu đề câu hỏi',
        'Độ khó',
        'Input mẫu',
        'Output mẫu',
        'Mã Test Case',
        'Đầu vào (Input)',
        'Đầu ra kỳ vọng (Expected Output)',
        'Phân loại Test',
        'Điểm',
      ]);

      templates.forEach((t) => {
        const questions = t.questions || [];
        if (questions.length === 0) {
          rows.push([
            t.id,
            t.title,
            t.type === 'lab' ? 'Lab thực hành' : 'Thi lập trình',
            t.category,
            t.language,
            String(t.durationMinutes || ''),
            '', '', '', '', '', '', '', '', '', ''
          ]);
        } else {
          questions.forEach((q) => {
            const testCases = q.testCases || [];
            if (testCases.length === 0) {
              rows.push([
                t.id,
                t.title,
                t.type === 'lab' ? 'Lab thực hành' : 'Thi lập trình',
                t.category,
                t.language,
                String(t.durationMinutes || ''),
                q.id,
                q.title,
                q.difficulty,
                q.sampleInput || '',
                q.sampleOutput || '',
                '', '', '', '', ''
              ]);
            } else {
              testCases.forEach((tc) => {
                rows.push([
                  t.id,
                  t.title,
                  t.type === 'lab' ? 'Lab thực hành' : 'Thi lập trình',
                  t.category,
                  t.language,
                  String(t.durationMinutes || ''),
                  q.id,
                  q.title,
                  q.difficulty,
                  q.sampleInput || '',
                  q.sampleOutput || '',
                  tc.id,
                  tc.input,
                  tc.expectedOutput,
                  tc.isHidden ? 'Ẩn chấm điểm' : 'Công khai',
                  String(tc.points || ''),
                ]);
              });
            }
          });
        }
      });
    }

    const csvContent =
      '\uFEFF' +
      rows
        .map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${isAdmin ? 'danh_muc_bo_de_admin' : 'ngan_hang_cau_hoi'}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setNotification({
      type: 'success',
      message: isAdmin
        ? 'Đã xuất danh mục thông tin bộ đề ra file Excel/CSV thành công!'
        : 'Đã xuất dữ liệu bộ đề & test cases ra file Excel/CSV thành công!',
    });
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {/* Toast notification */}
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

      {/* Direct link header banner if opened with templateId */}
      {directTemplateId && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                {isInstructor ? 'Chế độ chỉnh sửa liên kết từ Lớp học' : 'Tra cứu thông tin bộ đề liên kết'}
              </p>
              <h3 className="text-sm font-bold text-slate-900">
                Đang xem bộ đề: <span className="font-mono text-blue-600">{directTemplateId}</span>
              </h3>
            </div>
          </div>
          <Link
            href={isInstructor ? '/instructor/classes' : '/admin/classes'}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            Quay lại Lớp &amp; sinh viên →
          </Link>
        </div>
      )}

      {/* Main Header - Đồng bộ theo phân quyền Giảng viên vs Admin */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">QUẢN LÝ ĐÀO TẠO</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
            Đề &amp; câu hỏi
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isAdmin
              ? 'Ghi nhận, quản lý thông tin định danh và theo dõi trạng thái các bộ đề thực hành & đề kiểm tra do giảng viên khởi tạo trên toàn hệ thống.'
              : 'Kho câu hỏi, bộ test case và đề thực hành chuẩn hóa, đồng bộ tự động tới các lớp học và lịch kiểm tra.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            title="Xuất danh sách bộ đề thực hành & kiểm tra ra file Excel/CSV"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Xuất danh sách bộ đề</span>
          </button>

          {/* Chỉ Role Giảng viên mới có nút Tạo bộ đề mới */}
          {isInstructor && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Tạo bộ đề mới
            </button>
          )}
        </div>
      </div>

      {/* KPI mini cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0d1017] transition-colors">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng số bộ đề</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{templates.length}</p>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
            {isAdmin ? 'Do giảng viên khởi tạo' : 'Đề thực hành & thi'}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm dark:border-blue-500/25 dark:bg-blue-500/10 transition-colors">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Bộ đề Lab thực hành</p>
          <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">
            {templates.filter((t) => t.type === 'lab').length}
          </p>
          <p className="mt-0.5 text-[11px] text-blue-500/90 dark:text-blue-300/70">Phục vụ các bài lab trên lớp</p>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4 shadow-sm dark:border-purple-500/25 dark:bg-purple-500/10 transition-colors">
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">Đề kiểm tra &amp; thi</p>
          <p className="mt-1 text-2xl font-black text-purple-600 dark:text-purple-400">
            {templates.filter((t) => t.type === 'exam').length}
          </p>
          <p className="mt-0.5 text-[11px] text-purple-500/90 dark:text-purple-300/70">Giữa kỳ, quá trình &amp; cuối kỳ</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-500/25 dark:bg-emerald-500/10 transition-colors">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Lớp &amp; lịch thi liên kết</p>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {new Set(Object.values(templateUsageMap).flatMap((list) => list.map((u) => u.classId))).size}
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-500/90 dark:text-emerald-300/70">Đồng bộ tự động với lịch thi</p>
        </div>
      </div>

      {/* Filters and Search Bar - Chuẩn hóa chiều cao h-11 và typography text-sm */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0d1017] transition-colors lg:flex-row lg:items-center lg:justify-between">
        {/* Type tabs */}
        <div className="inline-flex h-11 items-center rounded-xl bg-slate-100 p-1 overflow-x-auto dark:bg-white/5">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`h-full whitespace-nowrap rounded-lg px-3.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-blue-600 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Tất cả ({templates.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('lab')}
            className={`h-full whitespace-nowrap rounded-lg px-3.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
              typeFilter === 'lab'
                ? 'bg-white text-blue-700 shadow-sm dark:bg-blue-600 dark:text-white'
                : 'text-slate-600 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300'
            }`}
          >
            🧪 Đề Lab thực hành ({templates.filter((t) => t.type === 'lab').length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('exam')}
            className={`h-full whitespace-nowrap rounded-lg px-3.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
              typeFilter === 'exam'
                ? 'bg-white text-purple-700 shadow-sm dark:bg-blue-600 dark:text-white'
                : 'text-slate-600 hover:text-purple-700 dark:text-slate-400 dark:hover:text-purple-300'
            }`}
          >
            🎓 Đề thi lập trình ({templates.filter((t) => t.type === 'exam').length})
          </button>
        </div>

        {/* Search and Category select */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#141824] dark:text-slate-200 dark:focus:border-blue-500 cursor-pointer"
          >
            <option value="all">Tất cả chuyên mục</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isAdmin
                  ? 'Tìm theo mã đề, tên bộ đề, giảng viên...'
                  : 'Tìm theo mã, tên đề, câu hỏi...'
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm font-medium outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#141824] dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        {filteredTemplates.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-[#0d1017]">
            <FileCode2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">Không tìm thấy bộ đề phù hợp</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Hãy thử tìm kiếm với từ khóa khác hoặc điều chỉnh bộ lọc phân loại.
            </p>
          </div>
        ) : (
          filteredTemplates.map((template) => {
            const isExpanded = !!expandedTemplateIds[template.id];
            const usageList = templateUsageMap[template.id] || [];
            const scheduleList = templateScheduleMap[template.id] || [];
            const totalTc = (template.questions || []).reduce(
              (s, q) => s + ((q.testCases || []).length || q.testCasesCount || 0),
              0
            );
            const isTargetHighlight = directTemplateId === template.id;

            return (
              <div
                key={template.id}
                id={`template-${template.id}`}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-[#0d1017] dark:hover:border-white/20 ${
                  isTargetHighlight
                    ? 'border-blue-400 ring-2 ring-blue-100 dark:border-blue-500 dark:ring-blue-900/40'
                    : 'border-slate-200/80'
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2.5 min-w-0 flex-1">
                    {/* Badge Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black tracking-wider text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md dark:bg-white/10 dark:text-slate-200 border border-slate-200/60 dark:border-white/10">
                        {template.id}
                      </span>

                      {template.type === 'lab' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300">
                          🧪 Đề Lab thực hành
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/15 dark:text-purple-300">
                          🎓 Đề thi lập trình
                        </span>
                      )}

                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/5 dark:text-slate-300 border border-slate-200/50 dark:border-white/5">
                        {template.category}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300">
                        GV: {template.lecturer || 'Thầy Nguyễn Văn Nam'}
                      </span>

                      {template.updatedAt && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          Cập nhật: {template.updatedAt}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
                      {template.title}
                    </h3>

                    {/* Description */}
                    {template.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                        {template.description}
                      </p>
                    )}

                    {/* Metadata Specs Bar */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200/60 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 dark:border-white/5 dark:bg-white/5 dark:text-slate-300">
                        <Terminal className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        {template.language}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200/60 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 dark:border-white/5 dark:bg-white/5 dark:text-slate-300">
                        <Code2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        {(template.questions || []).length} bài tập coding ({totalTc} test cases)
                      </span>

                      {template.durationMinutes && (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200/60 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 dark:border-white/5 dark:bg-white/5 dark:text-slate-300">
                          <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          {template.durationMinutes} phút
                        </span>
                      )}

                      {/* Linked classes badge */}
                      {usageList.length > 0 ? (
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                          <Layers className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Đang sử dụng trong lớp:</span>
                          <span className="font-bold underline">
                            {Array.from(new Set(usageList.map((u) => u.classId))).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-200 px-2.5 py-1 text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
                          Chưa có lớp nào sử dụng
                        </span>
                      )}

                      {/* Linked schedules badge */}
                      {scheduleList.length > 0 && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Lịch kiểm tra:</span>
                          <span className="font-bold">
                            {scheduleList.length} ca ({scheduleList.map((s) => s.roomCode || s.id).join(', ')})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 shrink-0 pt-2 lg:pt-0">
                    {isAdmin ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setViewingAdminTemplate(template)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 text-xs font-bold text-blue-700 shadow-xs transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25 cursor-pointer whitespace-nowrap"
                        >
                          <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          Xem thông tin bộ đề
                        </button>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
                          🔒 Bảo mật câu hỏi & Test Cases
                        </span>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(template)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Chỉnh sửa đề & câu hỏi
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleExpand(template.id)}
                            className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 cursor-pointer"
                          >
                            {isExpanded ? 'Ẩn câu hỏi' : 'Xem câu hỏi'}
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(template.id)}
                            title="Xóa bộ đề"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Collapsible Questions Details (Instructor Only) */}
                {!isAdmin && isExpanded && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Danh sách {(template.questions || []).length} bài tập coding trong đề
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Chỉnh sửa hoặc thêm test cases tại nút &quot;Chỉnh sửa đề & câu hỏi&quot;
                      </span>
                    </div>

                    <div className="space-y-3">
                      {(template.questions || []).map((q, index) => {
                        const tcList = q.testCases || [];
                        const publicCount = tcList.filter((tc) => !tc.isHidden).length;
                        const hiddenCount = tcList.filter((tc) => tc.isHidden).length;
                        const qKey = `${template.id}-${q.id || index}`;
                        const isTcOpen = !!expandedQuestionTestCases[qKey];

                        return (
                          <div
                            key={q.id || index}
                            className="rounded-xl border border-slate-200/90 bg-[#f8fafc] p-4 text-xs transition hover:bg-slate-50"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 font-mono text-[11px] font-bold text-blue-700">
                                  {index + 1}
                                </span>
                                <span className="font-bold text-slate-900 sm:text-[13px]">{q.title}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    q.difficulty === 'Dễ'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : q.difficulty === 'Trung bình'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {q.difficulty}
                                </span>

                                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                                  <span>{tcList.length > 0 ? tcList.length : q.testCasesCount} test cases</span>
                                  {tcList.length > 0 && (
                                    <span className="text-slate-400 font-normal">
                                      ({publicCount} công khai, {hiddenCount} ẩn)
                                    </span>
                                  )}
                                </span>

                                {tcList.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleQuestionTestCases(qKey)}
                                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                  >
                                    {isTcOpen ? (
                                      <>
                                        <EyeOff className="h-3 w-3" />
                                        <span>Ẩn test cases</span>
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="h-3 w-3" />
                                        <span>Chi tiết test cases</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="mt-2 text-slate-600 leading-relaxed">{q.description}</p>

                            {(q.sampleInput || q.sampleOutput) && (
                              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                                {q.sampleInput && (
                                  <div className="rounded-lg bg-white border border-slate-200/80 p-2.5">
                                    <span className="font-sans font-bold text-slate-400 text-[10px] block mb-0.5 uppercase">
                                      Input mẫu:
                                    </span>
                                    <span className="text-slate-800">{q.sampleInput}</span>
                                  </div>
                                )}
                                {q.sampleOutput && (
                                  <div className="rounded-lg bg-white border border-slate-200/80 p-2.5">
                                    <span className="font-sans font-bold text-slate-400 text-[10px] block mb-0.5 uppercase">
                                      Output mẫu:
                                    </span>
                                    <span className="text-slate-800">{q.sampleOutput}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Expanded Test Cases list */}
                            {isTcOpen && tcList.length > 0 && (
                              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    Chi tiết bộ Test Cases chấm điểm ({tcList.length} test)
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    Tổng điểm: {tcList.reduce((acc, curr) => acc + (curr.points || 0), 0)}đ
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 gap-2 pt-1">
                                  {tcList.map((tc, tcIndex) => (
                                    <div
                                      key={tc.id || tcIndex}
                                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-2.5 text-[11px] ${
                                        tc.isHidden
                                          ? 'border-purple-200 bg-purple-50/40 text-purple-950'
                                          : 'border-emerald-200 bg-emerald-50/30 text-emerald-950'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-slate-700">
                                          {tc.id}
                                        </span>
                                        <span
                                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                            tc.isHidden
                                              ? 'bg-purple-100 text-purple-700'
                                              : 'bg-emerald-100 text-emerald-700'
                                          }`}
                                        >
                                          {tc.isHidden ? '🔒 Test ẩn (Chấm điểm)' : '👁️ Test công khai'}
                                        </span>
                                        <span className="font-semibold text-slate-600">
                                          {tc.points ? `${tc.points}đ` : '1đ'}
                                        </span>
                                      </div>

                                      <div className="flex-1 font-mono text-[11px] space-y-0.5 sm:space-y-0 sm:flex sm:items-center sm:gap-4 sm:justify-end">
                                        <div className="truncate max-w-[280px]">
                                          <span className="font-sans text-slate-400 text-[10px] font-bold mr-1">In:</span>
                                          <span className="font-semibold">{tc.input}</span>
                                        </div>
                                        <div className="truncate max-w-[280px]">
                                          <span className="font-sans text-slate-400 text-[10px] font-bold mr-1">Out:</span>
                                          <span className="font-semibold">{tc.expectedOutput}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── MODAL CHỈNH SỬA / TẠO MỚI BỘ ĐỀ ── */}
      {editingTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingTemplate(null);
          }}
        >
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {isCreatingNew ? 'Tạo bộ đề mới trong Ngân hàng' : `Chỉnh sửa bộ đề ${editingTemplate.id}`}
                </h3>
                <p className="text-xs text-slate-500">
                  {isCreatingNew
                    ? 'Thêm đề mới để các giảng viên và lớp học có thể nạp vào bài Lab hoặc bài thi.'
                    : 'Các thay đổi sẽ tự động phản ánh sang tất cả các lớp đang sử dụng bộ đề này.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Form Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    MÃ BỘ ĐỀ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.id}
                    disabled={!isCreatingNew}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, id: e.target.value.toUpperCase() })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-mono font-bold text-slate-800 disabled:bg-slate-100 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    LOẠI HOẠT ĐỘNG <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingTemplate.type}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        type: e.target.value as 'lab' | 'exam',
                      })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="lab">🧪 Đề Lab thực hành</option>
                    <option value="exam">🎓 Đề kiểm tra / thi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  TÊN BỘ ĐỀ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingTemplate.title}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, title: e.target.value })
                  }
                  placeholder="Ví dụ: Cấu trúc điều khiển & Mảng một chiều"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">CHUYÊN MỤC</label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, category: e.target.value })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="Lập trình căn bản">Lập trình căn bản</option>
                    <option value="Lập trình Web">Lập trình Web</option>
                    <option value="Cấu trúc dữ liệu">Cấu trúc dữ liệu</option>
                    <option value="Lập trình OOP">Lập trình OOP</option>
                    <option value="Cơ sở dữ liệu">Cơ sở dữ liệu</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">NGÔN NGỮ</label>
                  <select
                    value={editingTemplate.language}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, language: e.target.value })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="JavaScript / Python">JavaScript / Python</option>
                    <option value="JavaScript">JavaScript</option>
                    <option value="JavaScript / Node.js">JavaScript / Node.js</option>
                    <option value="C++">C++</option>
                    <option value="Java">Java</option>
                    <option value="Python">Python</option>
                    <option value="SQL">SQL</option>
                  </select>
                </div>

                {editingTemplate.type === 'exam' && (
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      THỜI GIAN THI (PHÚT)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={360}
                      value={editingTemplate.durationMinutes || 60}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          durationMinutes: Number(e.target.value),
                        })
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">MÔ TẢ YÊU CẦU ĐỀ</label>
                <textarea
                  rows={2}
                  value={editingTemplate.description || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, description: e.target.value })
                  }
                  placeholder="Mô tả mục tiêu bài thực hành hoặc kỳ thi..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* Sub-form: Danh sách câu hỏi và quản lý Test Cases con */}
              <div className="border-t border-slate-100 pt-3">
                <div className="mb-2.5 flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Danh sách câu hỏi & Test Cases ({editQuestions.length} bài)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddQuestionToTemplate}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm câu hỏi
                  </button>
                </div>

                <div className="space-y-3.5">
                  {editQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                        <span className="font-bold text-blue-700 sm:text-sm">
                          Câu hỏi {idx + 1}: {q.title || 'Chưa đặt tiêu đề'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestionFromTemplate(idx)}
                          className="text-slate-400 hover:text-red-600 transition"
                          title="Xóa câu hỏi này"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Tiêu đề câu hỏi
                          </label>
                          <input
                            type="text"
                            value={q.title}
                            onChange={(e) => handleUpdateQuestionField(idx, 'title', e.target.value)}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Độ khó
                          </label>
                          <select
                            value={q.difficulty}
                            onChange={(e) =>
                              handleUpdateQuestionField(idx, 'difficulty', e.target.value)
                            }
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold"
                          >
                            <option value="Dễ">Dễ</option>
                            <option value="Trung bình">Trung bình</option>
                            <option value="Khó">Khó</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Đặc tả yêu cầu
                        </label>
                        <textarea
                          rows={2}
                          value={q.description}
                          onChange={(e) => handleUpdateQuestionField(idx, 'description', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-normal"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Sample Input (mẫu hiển thị)
                          </label>
                          <input
                            type="text"
                            value={q.sampleInput || ''}
                            onChange={(e) =>
                              handleUpdateQuestionField(idx, 'sampleInput', e.target.value)
                            }
                            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Sample Output (mẫu hiển thị)
                          </label>
                          <input
                            type="text"
                            value={q.sampleOutput || ''}
                            onChange={(e) =>
                              handleUpdateQuestionField(idx, 'sampleOutput', e.target.value)
                            }
                            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs"
                          />
                        </div>
                      </div>
{/* Test cases của câu hỏi */}
<div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
  <div className="flex items-center justify-between gap-2">
    <div>
      <h5 className="text-xs font-bold text-slate-700">
        Test Case chấm tự động ({q.testCases?.length || 0})
      </h5>
      <p className="text-[11px] text-slate-500">
        Nhập dữ liệu đầu vào và kết quả mong đợi cho từng trường hợp.
      </p>
    </div>

    <button
      type="button"
      onClick={() => handleAddTestCase(idx)}
      className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
    >
      <Plus className="mr-1 inline h-3.5 w-3.5" />
      Thêm Test Case
    </button>
  </div>

  {(q.testCases || []).map((testCase, tcIdx) => (
    <div
      key={testCase.id}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-3"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-blue-700">
          TC-{String(tcIdx + 1).padStart(2, '0')}
        </span>

        <button
          type="button"
          onClick={() => handleRemoveTestCase(idx, tcIdx)}
          className="text-slate-400 hover:text-red-600"
          title="Xóa Test Case"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Input Data
          </label>
          <textarea
            rows={4}
            value={testCase.inputData}
            onChange={(e) =>
              handleUpdateTestCaseField(
                idx,
                tcIdx,
                'inputData',
                e.target.value,
              )
            }
            placeholder="Nhập dữ liệu đầu vào..."
            className="w-full rounded-lg border border-slate-200 p-2 font-mono text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Expected Output
          </label>
          <textarea
            rows={4}
            value={testCase.expectedOutput}
            onChange={(e) =>
              handleUpdateTestCaseField(
                idx,
                tcIdx,
                'expectedOutput',
                e.target.value,
              )
            }
            placeholder="Nhập kết quả mong đợi..."
            className="w-full rounded-lg border border-slate-200 p-2 font-mono text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={testCase.isHidden}
            onChange={(e) =>
              handleUpdateTestCaseField(
                idx,
                tcIdx,
                'isHidden',
                e.target.checked,
              )
            }
          />
          Ẩn Test Case với sinh viên
        </label>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          Điểm
          <input
            type="number"
            min={0}
            step={0.5}
            value={testCase.points}
            onChange={(e) =>
              handleUpdateTestCaseField(
                idx,
                tcIdx,
                'points',
                Math.max(0, Number(e.target.value)),
              )
            }
            className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right"
          />
        </label>
      </div>
    </div>
  ))}
</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Helper notice */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                <p className="font-semibold">⚡ Cơ chế đồng bộ tự động:</p>
                <p className="mt-0.5 text-[11px] text-amber-800">
                  Khi lưu bộ đề, mọi bài lab hoặc bài thi trong các lớp học đang gán mã{' '}
                  <strong className="font-mono">{editingTemplate.id}</strong> (như SE1848, IT2202, SE1849...) sẽ tự động cập nhật tiêu đề, số lượng câu hỏi và ngôn ngữ lập trình tương ứng.
                </p>
              </div>

              {/* Footer action buttons - Chuẩn hóa chiều cao h-10 */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-blue-600 px-5 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 transition cursor-pointer"
                >
                  Lưu thay đổi bộ đề
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Policy Notice Banner */}
      {isAdmin && (
        <div className="rounded-xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-3 text-xs font-medium text-[#1d4ed8] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <strong>Chính sách phân quyền & bảo mật đề thi:</strong> Quản trị viên chỉ ghi nhận và quản lý thông tin bộ đề từ <strong>Role Giảng viên</strong> tạo ra. Nội dung chi tiết câu hỏi và Test Cases được bảo mật tuyệt đối và không hiển thị ở quyền Quản trị viên.
          </div>
          <Link
            href="/admin/schedules"
            className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-3 py-1.5 text-[11px] font-bold text-[#1d4ed8] shadow-2xs transition hover:bg-white whitespace-nowrap shrink-0"
          >
            Xem Lịch & Phiên kiểm tra →
          </Link>
        </div>
      )}

      {/* Modal: Xem thông tin bộ đề (Read-only Metadata cho Role Admin) */}
      {isAdmin && viewingAdminTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 dark:border-white/10 dark:bg-[#0d1017]">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/10 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-black tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300">
                    {viewingAdminTemplate.id}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-white/5 dark:text-slate-300">
                    {viewingAdminTemplate.category}
                  </span>
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300">
                    GV: {viewingAdminTemplate.lecturer || 'Thầy Nguyễn Văn Nam'}
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  {viewingAdminTemplate.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingAdminTemplate(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {viewingAdminTemplate.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-white/5 rounded-xl p-3.5 border border-slate-100 dark:border-white/5">
                {viewingAdminTemplate.description}
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-100 dark:border-white/5 text-xs">
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Phân loại</span>
                <span className="mt-1 block font-bold text-slate-800 dark:text-slate-200">
                  {viewingAdminTemplate.type === 'lab' ? 'Đề Lab thực hành' : 'Đề thi lập trình'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Ngôn ngữ</span>
                <span className="mt-1 block font-bold text-slate-800 dark:text-slate-200">{viewingAdminTemplate.language}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Quy mô câu hỏi</span>
                <span className="mt-1 block font-bold text-blue-700 dark:text-blue-400">
                  {(viewingAdminTemplate.questions || []).length} bài tập (
                  {(viewingAdminTemplate.questions || []).reduce(
                    (s, q) => s + ((q.testCases || []).length || q.testCasesCount || 0),
                    0
                  )}{' '}
                  test cases)
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Thời lượng</span>
                <span className="mt-1 block font-bold text-slate-800 dark:text-slate-200">
                  {viewingAdminTemplate.durationMinutes ? `${viewingAdminTemplate.durationMinutes} phút` : '90 phút'}
                </span>
              </div>
            </div>

            {/* Linked classes & exam schedules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3.5">
                <div className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">
                  Lớp học đang gán bộ đề
                </div>
                {(templateUsageMap[viewingAdminTemplate.id] || []).length > 0 ? (
                  <div className="space-y-1.5">
                    {(templateUsageMap[viewingAdminTemplate.id] || []).map((u, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-white/5 px-2.5 py-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{u.classId}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{u.className}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 text-[11px]">Chưa có lớp học nào gán bộ đề này.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3.5">
                <div className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">
                  Lịch kiểm tra sử dụng đề
                </div>
                {(templateScheduleMap[viewingAdminTemplate.id] || []).length > 0 ? (
                  <div className="space-y-1.5">
                    {(templateScheduleMap[viewingAdminTemplate.id] || []).map((sch) => (
                      <div key={sch.id} className="flex items-center justify-between rounded-lg bg-blue-50/60 dark:bg-blue-500/10 px-2.5 py-1.5">
                        <div>
                          <span className="font-mono font-bold text-blue-700 dark:text-blue-300">{sch.roomCode || sch.id}</span>
                          <span className="ml-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">({sch.classId})</span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{sch.date}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 text-[11px]">Chưa có lịch kiểm tra nào sử dụng đề này.</p>
                )}
              </div>
            </div>

            {/* Security notice */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-300">
              <div className="font-bold">🔒 Bảo mật nội dung câu hỏi & Test Cases</div>
              <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed">
                Theo quy định phân quyền của hệ thống OCULIDE, Quản trị viên chỉ quản lý thông tin định danh bộ đề, lớp học và lịch kiểm tra liên kết. Nội dung đề bài và bộ Test Cases chấm điểm chỉ hiển thị cho Giảng viên biên soạn đề.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setViewingAdminTemplate(null)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
