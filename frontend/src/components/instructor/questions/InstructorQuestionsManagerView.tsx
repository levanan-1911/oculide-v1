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
  ChevronDown,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  QuestionTemplate,
  TemplateQuestionItem,
  TemplateTestCaseItem,
  getStoredQuestionTemplates,
  saveStoredQuestionTemplates,
  getStoredClasses,
  syncClassesWithTemplate,
  ClassRow,
} from '@/app/admin/classes/types';
import { fetchWithAuth } from '@/services/apiClient';

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

export default function InstructorQuestionsManagerView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const directTemplateId = searchParams.get('templateId');

  const [templates, setTemplates] = useState<QuestionTemplate[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lab' | 'exam'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedTemplateIds, setExpandedTemplateIds] = useState<Record<string, boolean>>({});

  // Modal State for Editing / Creating
  const [editingTemplate, setEditingTemplate] = useState<QuestionTemplate | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editQuestions, setEditQuestions] = useState<TemplateQuestionItem[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Load templates from Backend API (fallback localStorage if offline)
  useEffect(() => {
    let isCancelled = false;

    const loadTemplates = async () => {
      try {
        const apiTemplates = await fetchWithAuth<QuestionTemplate[]>('/api/v1/templates');
        if (isCancelled) return;
        const normalized = (apiTemplates || []).map((template) => ({
          ...template,
          questions: template.questions?.map(normalizeQuestionForEditor) ?? [],
        }));
        setTemplates(normalized);
        saveStoredQuestionTemplates(normalized);

        if (directTemplateId) {
          const match = normalized.find((t) => t.id === directTemplateId);
          if (match) {
            setEditingTemplate(match);
            setEditQuestions(
              match.questions
                ? JSON.parse(JSON.stringify(match.questions)).map(normalizeQuestionForEditor)
                : [],
            );
            setExpandedTemplateIds((prev) => ({ ...prev, [directTemplateId]: true }));
          }
        }
      } catch {
        if (isCancelled) return;
        const loadedTemplates = getStoredQuestionTemplates().map((template) => ({
          ...template,
          questions: template.questions?.map(normalizeQuestionForEditor) ?? [],
        }));
        setTemplates(loadedTemplates);
      }
      setClasses(getStoredClasses());
    };

    loadTemplates();
    return () => {
      isCancelled = true;
    };
  }, [directTemplateId]);

  // Hide notification after 4 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Map each template to the classes using it
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

    return map;
  }, [templates, classes]);

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
        const matchesQuestion = (tpl.questions || []).some((question) =>
          question.title.toLowerCase().includes(q) || question.description.toLowerCase().includes(q)
        );
        return matchesId || matchesTitle || matchesCategory || matchesLang || matchesQuestion;
      }
      return true;
    });
  }, [templates, typeFilter, categoryFilter, searchTerm]);

  // Toggle card expansion
  function toggleExpand(id: string) {
    setExpandedTemplateIds((prev) => ({
      ...prev,
      [id]: !prev[id],
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
    const initialTestCases = [
      createDefaultTestCase(1, '[1, 2, 3]', '6'),
    ];
    const initialQuestion: TemplateQuestionItem = {
      id: 'Q-01',
      title: 'Bài 1: Khởi tạo chương trình',
      difficulty: 'Dễ',
      description: 'Cài đặt hàm tính toán cơ bản theo đặc tả...',
      sampleInput: '[1, 2, 3]',
      sampleOutput: '6',
      testCases: initialTestCases,
      testCasesCount: initialTestCases.length,
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
    });
    setEditQuestions([initialQuestion]);
  }

  // Add a question inside the edit modal
  function handleAddQuestionToTemplate() {
    const nextIndex = editQuestions.length + 1;
    const newQ: TemplateQuestionItem = {
      id: `Q-0${nextIndex}`,
      title: `Bài ${nextIndex}: Yêu cầu thuật toán mới`,
      difficulty: nextIndex % 2 === 0 ? 'Trung bình' : 'Dễ',
      description:
        'Mô tả chi tiết yêu cầu thuật toán, điều kiện biên và kết quả trả về.',
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
  function handleUpdateQuestionField(
    index: number,
    field: Exclude<keyof TemplateQuestionItem, 'testCases' | 'testCasesCount'>,
    value: string,
  ) {
    setEditQuestions((prev) => {
      const copy = [...prev];
      const question = copy[index];
      if (!question) return prev;

      copy[index] = {
        ...question,
        [field]: value,
        // Số lượng luôn được suy ra từ danh sách Test Case thực tế.
        testCasesCount: question.testCases?.length ?? 0,
      };
      return copy;
    });
  }
  // Add a test case to a question
  function handleAddTestCase(questionIndex: number) {
  setEditQuestions((prev) =>
    prev.map((question, index) => {
      if (index !== questionIndex) return question;

      const testCases = question.testCases || [];
      const highestTestCaseNumber = testCases.reduce((highest, testCase) => {
        const match = testCase.id.match(/(\d+)$/);
        return Math.max(highest, match ? Number(match[1]) : 0);
      }, 0);
      const nextTestCases = [
        ...testCases,
        createDefaultTestCase(highestTestCaseNumber + 1),
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
  async function handleSaveTemplate(e: React.FormEvent) {
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

    const payload = {
      code: editingTemplate.id,
      title: trimmedTitle,
      type: editingTemplate.type,
      duration_minutes: editingTemplate.durationMinutes,
      questions: updatedQuestions.map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        programming_language: ('language' in q && typeof q.language === 'string' && q.language) ? q.language : 'cpp',
        max_points: ('maxPoints' in q && typeof q.maxPoints === 'number') ? q.maxPoints : 10,
        test_cases: (q.testCases || []).map((tc) => ({
          id: tc.id,
          input_data: tc.inputData,
          expected_output: tc.expectedOutput,
          is_hidden: tc.isHidden,
          points: tc.points,
        })),
      })),
    };

    try {
      const endpoint = isCreatingNew
        ? '/api/v1/templates'
        : `/api/v1/templates/${encodeURIComponent(editingTemplate.id)}`;
      const savedTpl = await fetchWithAuth<QuestionTemplate>(endpoint, {
        method: isCreatingNew ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      });

      const nextTemplates = isCreatingNew
        ? [savedTpl, ...templates]
        : templates.map((t) => (t.id === savedTpl.id ? savedTpl : t));

      setTemplates(nextTemplates);
      saveStoredQuestionTemplates(nextTemplates);

      // Synchronize classes that use this template
      syncClassesWithTemplate(savedTpl);
      setClasses(getStoredClasses());

      const affectedClasses = templateUsageMap[savedTpl.id] || [];
      const classCount = affectedClasses.length;

      setNotification({
        type: 'success',
        message: `Đã lưu thành công bộ đề "${savedTpl.id}" vào CSDL và tự động đồng bộ sang ${classCount} lớp học liên kết (${affectedClasses.map((c) => c.classId).join(', ') || 'Chưa gán'}).`,
      });

      setEditingTemplate(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Lỗi kết nối máy chủ khi lưu bộ đề.');
    }
  }

  // Delete a template
  async function handleDeleteTemplate(templateId: string) {
    const usage = templateUsageMap[templateId] || [];
    if (usage.length > 0) {
      const confirmForce = confirm(
        `Bộ đề "${templateId}" hiện đang được sử dụng trong ${usage.length} lớp học (${usage.map((u) => u.classId).join(', ')}).\nBạn có chắc chắn muốn xóa không?`
      );
      if (!confirmForce) return;
    } else {
      if (!confirm(`Bạn có chắc chắn muốn xóa bộ đề "${templateId}"?`)) return;
    }

    try {
      await fetchWithAuth(`/api/v1/templates/${encodeURIComponent(templateId)}`, {
        method: 'DELETE',
      });

      const next = templates.filter((t) => t.id !== templateId);
      setTemplates(next);
      saveStoredQuestionTemplates(next);
      setNotification({
        type: 'info',
        message: `Đã xóa bộ đề "${templateId}" khỏi CSDL.`,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Lỗi kết nối máy chủ khi xóa bộ đề.');
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {/* Toast notification */}
      {notification && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-xl border p-4 shadow-sm transition ${
            notification.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs sm:text-sm font-semibold">{notification.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Direct link header banner if opened with templateId */}
      {directTemplateId && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-blue-200/90 bg-blue-50/70 p-4 sm:flex-row sm:items-center dark:border-blue-500/25 dark:bg-blue-500/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                Chế độ chỉnh sửa liên kết từ Lớp học
              </p>
              <h3 className="text-sm font-bold leading-relaxed text-slate-900 dark:text-slate-100">
                Đang quản lý bộ đề: <span className="font-mono text-blue-600 dark:text-blue-400">{directTemplateId}</span>
              </h3>
            </div>
          </div>
          <Link
            href={pathname.startsWith('/instructor') ? '/instructor/classes' : '/admin/classes'}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            Quay lại Lớp & sinh viên →
          </Link>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
            Ngân hàng Đề & Câu hỏi
          </h2>
          <p className="mt-1 max-w-4xl text-xs leading-relaxed text-slate-500 sm:text-[13px] dark:text-slate-400">
            Kho câu hỏi, bộ test case và đề thực hành chuẩn hóa. Các lớp học liên kết trực tiếp tới các bộ đề này để tổ chức bài Lab và thi.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex h-11 items-center gap-2 self-start rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:self-auto dark:focus-visible:ring-offset-[#0b0f17]"
        >
          <Plus className="h-4 w-4" />
          Tạo bộ đề mới
        </button>
      </div>

      {/* KPI mini cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-white/10 dark:bg-[#121824]">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng số bộ đề</p>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">{templates.length}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">Đề thực hành & thi</p>
        </div>
        <div className="rounded-2xl border border-blue-200/70 bg-blue-50/70 p-4 dark:border-blue-500/25 dark:bg-blue-500/10">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Bộ đề Lab thực hành</p>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums text-blue-700 dark:text-blue-300">
            {templates.filter((t) => t.type === 'lab').length}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-blue-700/80 dark:text-blue-300/80">Phục vụ các bài lab trên lớp</p>
        </div>
        <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 dark:border-amber-500/25 dark:bg-amber-500/10">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Đề kiểm tra & thi</p>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums text-amber-700 dark:text-amber-300">
            {templates.filter((t) => t.type === 'exam').length}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800/80 dark:text-amber-300/80">Giữa kỳ, quá trình & cuối kỳ</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/10">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Lớp học đang liên kết</p>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-300">
            {new Set(Object.values(templateUsageMap).flatMap((list) => list.map((u) => u.classId))).size}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-700/80 dark:text-emerald-300/80">Đồng bộ tự động realtime</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-white/10 dark:bg-[#121824] lg:flex-row lg:items-center lg:justify-between">
        {/* Type tabs */}
        <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.05]">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-bold transition cursor-pointer ${
              typeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1b2533] dark:text-slate-100' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100'
            }`}
          >
            Tất cả ({templates.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('lab')}
            className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-bold transition cursor-pointer ${
              typeFilter === 'lab' ? 'bg-white text-blue-700 shadow-sm dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-600 hover:bg-white/70 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-blue-300'
            }`}
          >
            Đề Lab thực hành ({templates.filter((t) => t.type === 'lab').length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('exam')}
            className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-bold transition cursor-pointer ${
              typeFilter === 'exam' ? 'bg-white text-amber-800 shadow-sm dark:bg-amber-500/15 dark:text-amber-300' : 'text-slate-600 hover:bg-white/70 hover:text-amber-800 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-amber-300'
            }`}
          >
            Đề thi lập trình ({templates.filter((t) => t.type === 'exam').length})
          </button>
        </div>

        {/* Search and Category select */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer dark:border-white/10 dark:bg-[#121824] dark:text-slate-200 dark:focus:ring-blue-500/20"
          >
            <option value="all">Tất cả chuyên mục</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã, tên đề, câu hỏi..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-500/20"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        {filteredTemplates.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-10 text-center dark:border-white/10 dark:bg-[#121824]">
            <FileCode2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">Không tìm thấy bộ đề phù hợp</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Hãy thử tìm kiếm với từ khóa khác hoặc điều chỉnh bộ lọc phân loại.
            </p>
          </div>
        ) : (
          filteredTemplates.map((template) => {
            const isExpanded = !!expandedTemplateIds[template.id];
            const usageList = templateUsageMap[template.id] || [];
            const isTargetHighlight = directTemplateId === template.id;

            return (
              <div
                key={template.id}
                id={`template-${template.id}`}
                className={`rounded-2xl border bg-white p-5 transition dark:bg-[#121824] ${
                  isTargetHighlight
                    ? 'border-blue-400 ring-2 ring-blue-100 dark:border-blue-400 dark:ring-blue-500/20'
                    : 'border-slate-200/90 dark:border-white/10'
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 min-w-0 flex-1">
                    {/* Badge Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-slate-700 dark:bg-white/[0.06] dark:text-slate-200">
                        {template.id}
                      </span>

                      {template.type === 'lab' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300">
                          Đề Lab thực hành
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
                          Đề thi lập trình
                        </span>
                      )}

                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                        {template.category}
                      </span>

                      {template.updatedAt && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          Cập nhật: {template.updatedAt}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
                      {template.title}
                    </h3>

                    {/* Description */}
                    {template.description && (
                      <p className="max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {template.description}
                      </p>
                    )}

                    {/* Metadata Specs Bar */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50/80 px-2.5 py-1.5 font-semibold text-slate-700 dark:bg-white/[0.04] dark:text-slate-300">
                        <Terminal className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        {template.language}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50/80 px-2.5 py-1.5 font-semibold text-slate-700 dark:bg-white/[0.04] dark:text-slate-300">
                        <Code2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        {(template.questions || []).length} bài tập coding
                      </span>

                      {template.durationMinutes && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50/80 px-2.5 py-1.5 font-semibold text-slate-700 dark:bg-white/[0.04] dark:text-slate-300">
                          <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          {template.durationMinutes} phút
                        </span>
                      )}

                      {/* Linked classes badge */}
                      {usageList.length > 0 ? (
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                          <Layers className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Đang sử dụng trong:</span>
                          <span className="font-bold underline">
                            {usageList.map((u) => u.classId).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-200 px-2.5 py-1.5 text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
                          Chưa có lớp nào sử dụng
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 shrink-0 pt-2 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(template)}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#121824]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Chỉnh sửa đề & câu hỏi
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleExpand(template.id)}
                        className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
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
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 cursor-pointer dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Collapsible Questions Details */}
                {isExpanded && (
                  <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/10">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Danh sách {(template.questions || []).length} bài tập coding trong đề
                      </h4>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        Chỉnh sửa tại nút “Chỉnh sửa đề & câu hỏi” ở góc trên
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {(template.questions || []).map((q, index) => (
                        <div
                          key={q.id || index}
                          className="rounded-xl bg-slate-50/80 p-3.5 text-xs transition hover:bg-slate-100/80 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-50 font-mono text-[11px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                                {index + 1}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-slate-100">{q.title}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  q.difficulty === 'Dễ'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                    : q.difficulty === 'Trung bình'
                                    ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                                    : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                                }`}
                              >
                                {q.difficulty}
                              </span>
                              <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                                {q.testCases?.length ?? 0} test cases
                              </span>
                            </div>
                          </div>

                          <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">{q.description}</p>

                          {(q.sampleInput || q.sampleOutput) && (
                            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                              {q.sampleInput && (
                                <div className="rounded-lg bg-white p-2 dark:bg-[#121824]">
                                  <span className="font-sans font-bold text-slate-400 dark:text-slate-500 text-[10px] block mb-0.5 uppercase">
                                    Input mẫu:
                                  </span>
                                  <span className="text-slate-800 dark:text-slate-200">{q.sampleInput}</span>
                                </div>
                              )}
                              {q.sampleOutput && (
                                <div className="rounded-lg bg-white p-2 dark:bg-[#121824]">
                                  <span className="font-sans font-bold text-slate-400 dark:text-slate-500 text-[10px] block mb-0.5 uppercase">
                                    Output mẫu:
                                  </span>
                                  <span className="text-slate-800 dark:text-slate-200">{q.sampleOutput}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
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
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingTemplate(null);
          }}
        >
          <div className="relative my-4 flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xl sm:p-6 dark:border-white/10 dark:bg-[#121824]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 pb-3.5 dark:border-white/10">
              <div>
                <h3 className="text-base font-bold leading-relaxed text-slate-900 sm:text-lg dark:text-slate-100">
                  {isCreatingNew ? 'Tạo bộ đề mới trong Ngân hàng' : `Chỉnh sửa bộ đề ${editingTemplate.id}`}
                </h3>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {isCreatingNew
                    ? 'Thêm đề mới để các giảng viên và lớp học có thể nạp vào bài Lab hoặc bài thi.'
                    : 'Các thay đổi sẽ tự động phản ánh sang tất cả các lớp đang sử dụng bộ đề này.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {/* Form Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:disabled:bg-white/[0.04] dark:focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:focus:ring-blue-500/20"
                  >
                    <option value="lab">Đề Lab thực hành</option>
                    <option value="exam">Đề kiểm tra / thi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">CHUYÊN MỤC</label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, category: e.target.value })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:focus:ring-blue-500/20"
                  >
                    <option value="Lập trình căn bản">Lập trình căn bản</option>
                    <option value="Lập trình Web">Lập trình Web</option>
                    <option value="Cấu trúc dữ liệu">Cấu trúc dữ liệu</option>
                    <option value="Lập trình OOP">Lập trình OOP</option>
                    <option value="Cơ sở dữ liệu">Cơ sở dữ liệu</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">NGÔN NGỮ</label>
                  <select
                    value={editingTemplate.language}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, language: e.target.value })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:focus:ring-blue-500/20"
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
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:focus:ring-blue-500/20"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">MÔ TẢ YÊU CẦU ĐỀ</label>
                <textarea
                  rows={2}
                  value={editingTemplate.description || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, description: e.target.value })
                  }
                  placeholder="Mô tả mục tiêu bài thực hành hoặc kỳ thi..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-500/20"
                />
              </div>

              {/* Sub-form: Danh sách câu hỏi */}
              <div className="border-t border-slate-100 pt-3 dark:border-white/10">
                <div className="mb-2.5 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Danh sách câu hỏi & Test Cases ({editQuestions.length} bài)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddQuestionToTemplate}
                    className="inline-flex h-9 items-center gap-1 rounded-xl bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 cursor-pointer dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/20"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm câu hỏi
                  </button>
                </div>

                <div className="space-y-3">
                  {editQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="space-y-3 rounded-xl bg-slate-50/80 p-3.5 text-xs dark:bg-white/[0.04]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-blue-700 dark:text-blue-300">Câu hỏi {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestionFromTemplate(idx)}
                          className="rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          title="Xóa câu hỏi này"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px] gap-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Tiêu đề câu hỏi
                          </label>
                          <input
                            type="text"
                            value={q.title}
                            onChange={(e) => handleUpdateQuestionField(idx, 'title', e.target.value)}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:focus:ring-blue-500/20"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Độ khó
                          </label>
                          <select
                            value={q.difficulty}
                            onChange={(e) =>
                              handleUpdateQuestionField(idx, 'difficulty', e.target.value)
                            }
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:focus:ring-blue-500/20"
                          >
                            <option value="Dễ">Dễ</option>
                            <option value="Trung bình">Trung bình</option>
                            <option value="Khó">Khó</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Số test case
                          </label>
                          <div
                            role="status"
                            aria-live="polite"
                            aria-label={`${q.testCases?.length ?? 0} test case`}
                            title="Số lượng được tự động tính theo danh sách Test Case bên dưới."
                            className="flex h-8 w-full cursor-not-allowed items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                          >
                            <span className="font-mono tabular-nums">
                              {q.testCases?.length ?? 0}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                              Tự động
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Đặc tả yêu cầu
                        </label>
                        <textarea
                          rows={2}
                          value={q.description}
                          onChange={(e) => handleUpdateQuestionField(idx, 'description', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-normal leading-relaxed text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:focus:ring-blue-500/20"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Sample Input
                          </label>
                          <input
                            type="text"
                            value={q.sampleInput || ''}
                            onChange={(e) =>
                              handleUpdateQuestionField(idx, 'sampleInput', e.target.value)
                            }
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:focus:ring-blue-500/20"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Sample Output
                          </label>
                          <input
                            type="text"
                            value={q.sampleOutput || ''}
                            onChange={(e) =>
                              handleUpdateQuestionField(idx, 'sampleOutput', e.target.value)
                            }
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:focus:ring-blue-500/20"
                          />
                        </div>
                      </div>
                      {/* Test cases của câu hỏi */}
<div className="mt-3 space-y-3 border-t border-slate-200 pt-3 dark:border-white/10">
  <div className="flex items-center justify-between gap-2">
    <div>
      <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200">
        Test Case chấm tự động ({q.testCases?.length || 0})
      </h5>
      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Nhập dữ liệu đầu vào và kết quả mong đợi cho từng trường hợp.
      </p>
    </div>

    <button
      type="button"
      onClick={() => handleAddTestCase(idx)}
      className="inline-flex h-9 items-center rounded-xl bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/20"
    >
      <Plus className="mr-1 inline h-3.5 w-3.5" />
      Thêm Test Case
    </button>
  </div>

  {(q.testCases || []).map((testCase, tcIdx) => (
    <div
      key={testCase.id}
      className="space-y-3 rounded-xl bg-white p-3 ring-1 ring-slate-200/80 dark:bg-[#121824] dark:ring-white/10"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300">
          TC-{String(tcIdx + 1).padStart(2, '0')}
        </span>

        <button
          type="button"
          onClick={() => handleRemoveTestCase(idx, tcIdx)}
          className="rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          title="Xóa Test Case"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
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
            className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
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
            className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-2 dark:border-white/10">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 accent-blue-600 focus:ring-blue-500 dark:border-white/20"
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

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
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
            className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-right text-xs text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-[#121824] dark:text-slate-100"
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
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <p className="font-semibold">Cơ chế đồng bộ tự động:</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  Khi lưu bộ đề, mọi bài lab hoặc bài thi trong các lớp học đang gán mã{' '}
                  <strong className="font-mono">{editingTemplate.id}</strong> (như SE1848, IT2202, SE1849...) sẽ tự động cập nhật tiêu đề, số lượng câu hỏi và ngôn ngữ lập trình tương ứng.
                </p>
              </div>

              {/* Footer action buttons */}
              <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:gap-2.5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#121824]"
                >
                  Lưu thay đổi bộ đề
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
