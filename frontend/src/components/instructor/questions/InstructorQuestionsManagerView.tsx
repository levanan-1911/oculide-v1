'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
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
  Lock,
} from 'lucide-react';
import {
  QuestionTemplate,
  TemplateQuestionItem,
  TemplateTestCaseItem,
  getStoredQuestionTemplates,
  saveStoredQuestionTemplates,
  syncClassesWithTemplate,
} from '@/components/instructor/classes/types';
import { fetchWithAuth } from '@/services/apiClient';

interface TemplateUsageRecord {
  template_id: string | number;
  template_code?: string;
  class_id: string | number;
  class_code?: string;
  class_name?: string;
  activity_type: 'lab' | 'exam';
}

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
  const [templateUsageRecords, setTemplateUsageRecords] = useState<TemplateUsageRecord[]>([]);
  const [templateUsageStatus, setTemplateUsageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lab' | 'midterm' | 'final' | 'exam'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [userRole, setUserRole] = useState<string>('instructor');
  const isAdminView = pathname?.startsWith('/admin') || userRole === 'admin';
  const [expandedTemplateIds, setExpandedTemplateIds] = useState<Record<string, boolean>>({});

  // Modal State for Editing / Creating
  const [editingTemplate, setEditingTemplate] = useState<QuestionTemplate | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editQuestions, setEditQuestions] = useState<TemplateQuestionItem[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Load templates from Backend API (fallback localStorage if offline)
  useEffect(() => {
    let isCancelled = false;
    if (typeof window !== 'undefined') {
      const r = localStorage.getItem('oculide_role') || 'instructor';
      setUserRole(r);
    }

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

      const modeParam = searchParams.get('mode');
      if (modeParam === 'create_final') {
        setTypeFilter('final');
        handleOpenCreateFinal();
      }
    };

    loadTemplates();
    return () => {
      isCancelled = true;
    };
  }, [directTemplateId, searchParams]);

  useEffect(() => {
    let isCancelled = false;
    fetchWithAuth<TemplateUsageRecord[]>('/api/v1/templates/usage')
      .then((records) => {
        if (isCancelled) return;
        setTemplateUsageRecords(records);
        setTemplateUsageStatus('loaded');
      })
      .catch((error) => {
        if (isCancelled) return;
        console.error('Không thể tải thống kê sử dụng bộ đề từ CSDL:', error);
        setTemplateUsageStatus('error');
        setNotification({
          type: 'info',
          message: 'Không thể tải thống kê lớp đang sử dụng bộ đề từ máy chủ.',
        });
      });

    return () => {
      isCancelled = true;
    };
  }, []);

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

    templateUsageRecords.forEach((record) => {
      const templateId = record.template_code || String(record.template_id);
      const classId = String(record.class_id);
      if (map[templateId] && !map[templateId].some((usage) => usage.classId === classId)) {
        map[templateId].push({
          classId: record.class_code || classId,
          className: record.class_name || record.class_code || classId,
          activityType: record.activity_type,
        });
      }
    });

    return map;
  }, [templates, templateUsageRecords]);

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
      // Admin CHỈ quản lý đề cuối kỳ (final / final_exam). Các dạng đề khác (lab, midterm) KHÔNG hiển thị lên trang admin.
      if (isAdminView) {
        const isFinal = tpl.type === 'final' || (tpl.type as any) === 'final_exam' || tpl.type === 'exam' || (tpl.category && tpl.category.toLowerCase().includes('kết thúc'));
        if (!isFinal) return false;
      } else {
        if (typeFilter !== 'all') {
          if (typeFilter === 'lab' && tpl.type !== 'lab') return false;
          if (typeFilter === 'midterm' && tpl.type !== 'midterm' && (tpl.type as any) !== 'midterm_exam') return false;
          if (typeFilter === 'final' && tpl.type !== 'final' && (tpl.type as any) !== 'final_exam' && tpl.type !== 'exam') return false;
        }
      }
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
  }, [templates, typeFilter, categoryFilter, searchTerm, isAdminView]);

  const adminFinalCount = useMemo(
    () => templates.filter((t) => t.type === 'final' || (t.type as any) === 'final_exam' || t.type === 'exam' || (t.category && t.category.toLowerCase().includes('kết thúc'))).length,
    [templates]
  );
  const adminQuestionsCount = useMemo(
    () => templates
      .filter((t) => t.type === 'final' || (t.type as any) === 'final_exam' || t.type === 'exam' || (t.category && t.category.toLowerCase().includes('kết thúc')))
      .reduce((sum, t) => sum + (t.questions?.length || 0), 0),
    [templates]
  );

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
    const rawLang = (template.language || '').toLowerCase();
    const normalizedLang = rawLang.includes('python')
      ? 'Python'
      : rawLang.includes('java') && !rawLang.includes('script')
      ? 'Java'
      : 'C++';
    setEditingTemplate({
      ...template,
      language: normalizedLang,
    });

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
      language: 'C++',
      questionCount: 1,
      description: 'Mô tả bài thực hành...',
      questions: [initialQuestion],
      updatedAt: 'Hôm nay',
    });
    setEditQuestions([initialQuestion]);
  }

  // Open Create Final Exam Modal (Quyền Ban Đào Tạo / Khảo Thí)
  function handleOpenCreateFinal() {
    setIsCreatingNew(true);
    const newId = `TPL-FINAL-0${templates.length + 1}`;
    const initialTestCases = [
      createDefaultTestCase(1, '10\n1 2 3 4 5 6 7 8 9 10', '55'),
    ];
    const initialQuestion: TemplateQuestionItem = {
      id: 'Q-01',
      title: 'Bài 1: Xử lý dữ liệu & Thuật toán',
      difficulty: 'Trung bình',
      description: 'Cho mảng số nguyên. Cài đặt thuật toán theo đặc tả đề bài...',
      sampleInput: '10\n1 2 3 4 5 6 7 8 9 10',
      sampleOutput: '55',
      testCases: initialTestCases,
      testCasesCount: initialTestCases.length,
    };

    setEditingTemplate({
      id: newId,
      title: 'Đề thi Kết thúc học phần: ',
      type: 'final',
      category: 'Thi Kết Thúc Học Phần',
      language: 'C++',
      questionCount: 1,
      description: 'Đề thi chính thức kết thúc học phần được niêm phong bảo mật.',
      questions: [initialQuestion],
      updatedAt: 'Hôm nay',
    });
    setEditQuestions([initialQuestion]);
  }

  const getDifficultyPercent = (diff?: string) => {
    const d = String(diff || '').trim().toLowerCase();
    if (d === 'khó' || d === 'hard' || d === 'kho') return 30;
    if (d === 'trung bình' || d === 'medium' || d === 'trung_binh') return 20;
    return 10;
  };

  const getDifficultyDefaultPoints = (diff?: string) => {
    return Number(((getDifficultyPercent(diff) / 100) * 10).toFixed(2));
  };

  const distributeQuestionsByDifficulty = (items: TemplateQuestionItem[], targetMax = 10): TemplateQuestionItem[] => {
    if (items.length === 0) return [];
    const capped = Math.min(10, Math.max(0.5, targetMax));
    if (items.length === 1) return [{ ...items[0], maxPoints: capped }];
    const weights = items.map((q) => getDifficultyPercent(q.difficulty));
    const weightSum = weights.reduce((s, w) => s + w, 0);
    let running = 0;
    return items.map((q, idx) => {
      if (idx === items.length - 1) {
        return { ...q, maxPoints: Number(Math.max(0.1, capped - running).toFixed(2)) };
      }
      const share = Number(((weights[idx] / weightSum) * capped).toFixed(2));
      running += share;
      return { ...q, maxPoints: share };
    });
  };

  const distributeQuestionsEvenly = (items: TemplateQuestionItem[], targetMax = 10): TemplateQuestionItem[] => {
    if (items.length === 0) return [];
    const capped = Math.min(10, Math.max(0.5, targetMax));
    if (items.length === 1) return [{ ...items[0], maxPoints: capped }];
    let running = 0;
    return items.map((q, idx) => {
      if (idx === items.length - 1) {
        return { ...q, maxPoints: Number(Math.max(0.1, capped - running).toFixed(2)) };
      }
      const share = Number((capped / items.length).toFixed(2));
      running += share;
      return { ...q, maxPoints: share };
    });
  };

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
      maxPoints: 10,
    };
    setEditQuestions((prev) => distributeQuestionsByDifficulty([...prev, newQ], 10));
  }

  // Remove a question
  function handleRemoveQuestionFromTemplate(index: number) {
    setEditQuestions((prev) => distributeQuestionsByDifficulty(prev.filter((_, idx) => idx !== index), 10));
  }

  function handleUpdateQuestionPoints(index: number, rawValue: string) {
    const parsed = Math.max(0, Number(rawValue) || 0);
    setEditQuestions((prev) => {
      const otherSum = prev.reduce((sum, item, idx) => (idx === index ? sum : sum + Number(item.maxPoints ?? item.max_points ?? 0)), 0);
      const maxAllowed = Math.max(0, Number((10 - otherSum).toFixed(2)));
      const clamped = Math.min(parsed, maxAllowed);
      if (parsed > maxAllowed) {
        alert('Tổng điểm các câu hỏi trong bộ đề không được vượt quá 10 điểm.');
      }
      return prev.map((item, idx) => (idx === index ? { ...item, maxPoints: clamped } : item));
    });
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

      const nextFieldValue = value;
      let nextMaxPoints = question.maxPoints;
      if (field === 'difficulty') {
        const otherSum = prev.reduce(
          (sum, item, idx) => (idx === index ? sum : sum + Number(item.maxPoints ?? item.max_points ?? 0)),
          0,
        );
        const targetPts = getDifficultyDefaultPoints(value);
        nextMaxPoints = Math.min(targetPts, Math.max(0, Number((10 - otherSum).toFixed(2))));
      }

      copy[index] = {
        ...question,
        [field]: nextFieldValue,
        ...(field === 'difficulty' ? { maxPoints: nextMaxPoints } : {}),
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

    const totalTemplatePoints = updatedQuestions.reduce(
      (sum, q) => sum + Number(q.maxPoints ?? q.max_points ?? 10),
      0,
    );
    if (totalTemplatePoints > 10.01) {
      alert('Tổng điểm các câu hỏi trong bộ đề không được vượt quá 10 điểm.');
      return;
    }

    const payload = {
      code: editingTemplate.id,
      title: trimmedTitle,
      type: editingTemplate.type,
      language: editingTemplate.language || 'C++ / Python',
      duration_minutes: editingTemplate.durationMinutes,
      questions: updatedQuestions.map((q) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        programming_language: editingTemplate.language || 'cpp',
        max_points: Number(q.maxPoints ?? q.max_points ?? 10),
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
      {/* Toast notification phong cách Học thuật */}
      {notification && (
        <div
          role="status"
          className="flex items-center justify-between rounded-md border border-slate-300 border-l-4 border-l-slate-900 dark:border-l-white bg-white p-4 shadow-sm transition dark:border-white/10 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xs shrink-0 bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white dark:bg-white/10 dark:text-white"
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="font-serif text-xs font-bold text-[#2A282D] dark:text-white">
                {notification.type === 'success' ? 'Thao tác thành công' : 'Thông báo hệ thống'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-300">{notification.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Direct link header banner if opened with templateId */}
      {directTemplateId && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-md border border-slate-300 bg-slate-100 dark:border-white/10 dark:bg-white/5 p-4 sm:flex-row sm:items-center dark:dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Chế độ chỉnh sửa liên kết từ Lớp học
              </p>
              <h3 className="text-sm font-bold leading-relaxed text-slate-900 dark:text-slate-100">
                Đang quản lý bộ đề: <span className="font-mono text-slate-900 dark:text-white">{directTemplateId}</span>
              </h3>
            </div>
          </div>
          <Link
            href={pathname.startsWith('/instructor') ? '/instructor/classes' : '/admin/classes'}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            Quay lại Lớp & sinh viên →
          </Link>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-300 pb-5 dark:border-white/10">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isAdminView ? 'Ngân hàng Đề Thi Kết Thúc Học Phần (Phòng Đào Tạo & Khảo Thí)' : 'Ngân hàng Đề & Câu hỏi'}
          </h2>
          <p className="mt-1 max-w-4xl text-xs leading-relaxed text-slate-500 sm:text-[13px] dark:text-slate-400">
            {isAdminView
              ? 'Kho lưu trữ và niêm phong đề thi kết thúc học phần chính thức. Ban Đào Tạo và Quản trị viên Khảo thí khởi tạo, thẩm định và quản lý các bộ đề thi cuối kỳ.'
              : 'Kho câu hỏi, bộ test case và đề thực hành chuẩn hóa. Các lớp học liên kết trực tiếp tới các bộ đề này để tổ chức bài Lab và thi.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdminView ? (
            <button
              type="button"
              onClick={handleOpenCreateFinal}
              className="system-primary-action inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Soạn đề thi cuối kỳ
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="system-primary-action inline-flex h-9 items-center gap-2 self-start rounded-md bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 sm:self-auto cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Tạo bộ đề mới
            </button>
          )}
        </div>
      </div>

      {/* KPI mini cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isAdminView ? (
          <>
            <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
              <p className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400">Tổng số đề cuối kỳ</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{adminFinalCount}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">Đề thi kết thúc học phần</p>
            </div>
            <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
              <p className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400">Niêm phong bảo mật</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{adminFinalCount}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">Bảo lưu an toàn trên hệ thống</p>
            </div>
            <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
              <p className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400">Tổng câu hỏi & test cases</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{adminQuestionsCount}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">Thẩm định theo chuẩn đào tạo</p>
            </div>
            <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
              <p className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400">Lớp học áp dụng</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {templateUsageStatus === 'loading'
                  ? '…'
                  : templateUsageStatus === 'error'
                    ? '—'
                    : new Set(Object.values(templateUsageMap).flatMap((list) => list.map((u) => u.classId))).size}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">Lớp có phòng gán bộ đề trong CSDL</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
              <p className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400">Tổng số bộ đề</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{templates.length}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">Đề thực hành & thi</p>
            </div>
            <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
              <p className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400">Bộ đề Lab thực hành</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {templates.filter((t) => t.type === 'lab').length}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">Phục vụ các bài lab trên lớp</p>
            </div>
            <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
              <p className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400">Đề kiểm tra giữa kỳ</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {templates.filter((t) => t.type === 'midterm' || (t.type as any) === 'midterm_exam').length}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">Kiểm tra định kỳ lớp học phần</p>
            </div>
            <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
              <p className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400">Lớp học đang liên kết</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {templateUsageStatus === 'loading'
                  ? '…'
                  : templateUsageStatus === 'error'
                    ? '—'
                    : new Set(Object.values(templateUsageMap).flatMap((list) => list.map((u) => u.classId))).size}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">Lớp có phòng gán bộ đề trong CSDL</p>
            </div>
          </>
        )}
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-md border border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã, tên đề, câu hỏi..."
              className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100 dark:placeholder:text-slate-500"
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

        {!isAdminView && (
          <select
            aria-label="Lọc theo loại đề"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 cursor-pointer dark:border-white/10 dark:bg-neutral-950 dark:text-slate-200"
          >
            <option value="all">Tất cả loại đề ({templates.length})</option>
            <option value="lab">Đề thực hành ({templates.filter((t) => t.type === 'lab').length})</option>
            <option value="midterm">
              Thi giữa kỳ ({templates.filter((t) => t.type === 'midterm' || (t.type as any) === 'midterm_exam').length})
            </option>
            <option value="final">
              Thi cuối kỳ ({templates.filter((t) => t.type === 'final' || (t.type as any) === 'final_exam' || t.type === 'exam').length})
            </option>
          </select>
        )}
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        {filteredTemplates.length === 0 ? (
          <div className="rounded-md border border-slate-300 bg-white p-10 text-center dark:border-white/10 dark:bg-neutral-900">
            <FileCode2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="mt-3 font-serif text-base font-bold text-slate-900 dark:text-slate-100">Không tìm thấy bộ đề phù hợp</h3>
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
                className={`rounded-md border bg-white p-5 transition dark:bg-neutral-900 ${
                  isTargetHighlight
                    ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white'
                    : 'border-slate-300 dark:border-white/10'
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 min-w-0 flex-1">
                    {/* Badge Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border border-slate-300 bg-slate-50 px-2.5 py-0.5 font-mono text-xs font-bold tracking-wide text-slate-800 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
                        {template.id}
                      </span>

                      {template.type === 'final' || (template.type as any) === 'final_exam' || (template.category && template.category.toLowerCase().includes('kết thúc')) ? (
                        <span className="inline-flex items-center gap-1 rounded border border-red-500 bg-transparent px-2.5 py-0.5 font-mono text-[11px] font-bold text-red-700 dark:border-red-400 dark:text-red-300">
                          Đề thi cuối kỳ
                        </span>
                      ) : template.type === 'midterm' || (template.type as any) === 'midterm_exam' ? (
                        <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-100 text-slate-800 dark:border-white/20 dark:bg-white/10 dark:text-slate-200 px-2.5 py-0.5 text-[11px] font-bold font-mono">
                          Đề thi giữa kỳ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 px-2.5 py-0.5 text-[11px] font-semibold font-mono">
                          Đề thực hành (Lab)
                        </span>
                      )}

                      <span className="inline-flex items-center rounded border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                        {template.category}
                      </span>

                      {template.updatedAt && (
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                          Cập nhật: {template.updatedAt}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-slate-100">
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
                      <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-2.5 py-1 font-mono font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                        <Terminal className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        {template.language}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-2.5 py-1 font-mono font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                        <Code2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        {(template.questions || []).length} bài tập coding
                      </span>

                      {template.durationMinutes && (
                        <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-2.5 py-1 font-mono font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                          <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          {template.durationMinutes} phút
                        </span>
                      )}

                      {/* Linked classes badge */}
                      {templateUsageStatus === 'error' ? (
                        <span className="inline-flex items-center gap-1 rounded border border-dashed border-amber-300 px-2.5 py-1 text-xs text-amber-700 dark:border-amber-500/30 dark:text-amber-300">
                          Không tải được dữ liệu sử dụng
                        </span>
                      ) : usageList.length > 0 ? (
                        <div className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                          <Layers className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Đang sử dụng trong:</span>
                          <span className="font-mono font-bold underline">
                            {usageList.map((u) => u.classId).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
                          Chưa có lớp nào sử dụng
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(template)}
                      className="system-primary-action inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-slate-900 px-3.5 text-xs font-semibold text-white transition hover:bg-slate-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1C1820]"
                    >
                      <Pencil className="h-3.5 w-3.5 shrink-0" />
                      <span>Chỉnh sửa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(template.id)}
                      className="inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-white/[0.08]"
                    >
                      <span>{isExpanded ? 'Ẩn câu hỏi' : 'Xem câu hỏi'}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(template.id)}
                      title="Xóa bộ đề"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer dark:border-white/10 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Collapsible Questions Details */}
                {isExpanded && (
                  <div className="mt-4 border-t border-slate-300 pt-4 dark:border-white/10">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Danh sách {(template.questions || []).length} bài tập coding trong đề
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-500">
                        Chỉnh sửa tại nút “Chỉnh sửa đề & câu hỏi” ở góc trên
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {(template.questions || []).map((q, index) => (
                        <div
                          key={q.id || index}
                          className="rounded-md border border-slate-300 bg-slate-50 p-3.5 text-xs dark:border-white/10 dark:bg-white/[0.02]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-900 dark:bg-white dark:text-slate-900/10 font-mono text-[11px] font-bold text-[#0f172a] dark:bg-slate-900 dark:bg-white dark:text-slate-900/20 dark:text-slate-500">
                                {index + 1}
                              </span>
                              <span className="font-serif font-bold text-slate-900 dark:text-slate-100">{q.title}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
                              >
                                {q.difficulty}
                              </span>
                              <span className="rounded border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
                                {q.testCases?.length ?? 0} test cases
                              </span>
                            </div>
                          </div>

                          <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">{q.description}</p>

                          {(q.sampleInput || q.sampleOutput) && (
                            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                              {q.sampleInput && (
                                <div className="rounded border border-slate-300 bg-white p-2 dark:border-white/10 dark:bg-neutral-950">
                                  <span className="font-sans font-bold text-slate-500 text-[10px] block mb-0.5 uppercase">
                                    Input mẫu:
                                  </span>
                                  <span className="text-slate-800 dark:text-slate-200">{q.sampleInput}</span>
                                </div>
                              )}
                              {q.sampleOutput && (
                                <div className="rounded border border-slate-300 bg-white p-2 dark:border-white/10 dark:bg-neutral-950">
                                  <span className="font-sans font-bold text-slate-500 text-[10px] block mb-0.5 uppercase">
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
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingTemplate(null);
          }}
        >
          <div className="relative my-4 flex max-h-[92vh] w-full max-w-5xl flex-col rounded-md border border-slate-300 bg-white p-4 shadow-2xl sm:p-6 dark:border-white/10 dark:bg-neutral-900">
            {(() => {
              const isEditingFinal = editingTemplate.type === 'final' || (editingTemplate.type as any) === 'final_exam' || (editingTemplate.category && editingTemplate.category.toLowerCase().includes('kết thúc'));
              const isEditingMidterm = editingTemplate.type === 'midterm' || (editingTemplate.type as any) === 'midterm_exam';
              const isEditingLab = !isEditingFinal && !isEditingMidterm;

              return (
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-300 pb-3.5 dark:border-white/10">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-bold font-mono tracking-wider ${
                        isEditingFinal
                          ? 'border border-red-500 bg-transparent text-red-700 dark:border-red-400 dark:text-red-300'
                          : isEditingMidterm
                          ? 'bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-200 border border-slate-300 dark:border-white/20'
                          : 'bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300 border border-slate-200 dark:border-white/10'
                      }`}>
                        {isEditingFinal
                          ? 'DẠNG ĐỀ: ĐỀ THI CUỐI KỲ'
                          : isEditingMidterm
                          ? 'DẠNG ĐỀ: ĐỀ THI GIỮA KỲ'
                          : 'DẠNG ĐỀ: ĐỀ THỰC HÀNH (LAB)'}
                      </span>
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        Mã: {editingTemplate.id}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-bold leading-relaxed text-slate-900 dark:text-slate-100">
                      {isCreatingNew
                        ? (isEditingFinal ? 'Soạn Đề Thi Kết Thúc Học Phần Mới' : 'Tạo Bộ Đề Mới Trong Ngân Hàng')
                        : `Chỉnh Sửa Bộ Đề: ${editingTemplate.title || editingTemplate.id}`}
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {isEditingFinal
                        ? 'Đề thi cuối kỳ chính thức do Ban Đào Tạo / Khảo Thí niêm phong bảo mật và phân bổ vào các ca thi kết thúc học phần.'
                        : isEditingMidterm
                        ? 'Đề thi giữa kỳ do Giảng viên quản lý. Giảng viên thẩm định kết quả và công bố điểm thi sau khi kết thúc ca.'
                        : 'Đề thực hành lập trình tại lớp. Sinh viên tự do tra cứu và hệ thống chấm điểm tự động công bố kết quả ngay.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingTemplate(null)}
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              );
            })()}

            <form onSubmit={handleSaveTemplate} className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {/* Banner hiển thị rõ ràng dạng đề và quy chế khảo thí */}
              <div className="rounded-md border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                    Xác nhận dạng đề đang cấu hình:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {editingTemplate.type === 'final' || (editingTemplate.type as any) === 'final_exam' || (editingTemplate.category && editingTemplate.category.toLowerCase().includes('kết thúc'))
                      ? 'Đề thi Kết thúc học phần (Final Exam)'
                      : editingTemplate.type === 'midterm' || (editingTemplate.type as any) === 'midterm_exam'
                      ? 'Đề thi Giữa kỳ (Midterm Exam)'
                      : 'Đề thực hành (Lab Practice)'}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11.5px]">
                  {editingTemplate.type === 'final' || (editingTemplate.type as any) === 'final_exam' || (editingTemplate.category && editingTemplate.category.toLowerCase().includes('kết thúc'))
                    ? '📌 Quyền hạn: Ban Đào Tạo & Ban Khảo Thí quản lý. Bộ đề này chỉ có thể gán cho các lịch thi Kết thúc học phần chính thức.'
                    : editingTemplate.type === 'midterm' || (editingTemplate.type as any) === 'midterm_exam'
                    ? '📌 Quyền hạn: Giảng viên phụ trách lớp. Bộ đề này chỉ có thể gán cho các ca Kiểm tra Giữa kỳ. Điểm số cần giảng viên công bố trước khi sinh viên xem được.'
                    : '📌 Quyền hạn: Giảng viên phụ trách lớp. Bộ đề này chỉ gán cho các ca Thực hành Lab. Sinh viên nộp bài được máy chấm tự động và công bố kết quả ngay.'}
                </p>
              </div>

              {/* Form Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="mb-1 block font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-300">
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
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-mono font-bold text-slate-900 outline-none transition focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100 dark:disabled:bg-white/[0.04]"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-300">
                    LOẠI BỘ ĐỀ <span className="text-red-500">*</span>
                  </label>
                  {isAdminView ? (
                    <div>
                      <div className="relative">
                        <input
                          type="text"
                          value="Đề thi cuối kỳ"
                          readOnly
                          disabled
                          className="h-9 w-full rounded-md border border-slate-300 bg-slate-100 pl-3 pr-9 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 cursor-not-allowed"
                        />
                        <Lock className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                        Mặc định cố định cho phân hệ Quản trị / Ban Đào tạo.
                      </p>
                    </div>
                  ) : (
                    <select
                      value={editingTemplate.type}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          type: e.target.value as any,
                        })
                      }
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-300 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="lab">Đề thực hành (Lab)</option>
                      <option value="midterm">Đề thi giữa kỳ (Midterm Exam)</option>
                      <option value="final" disabled>
                        Đề thi cuối kỳ (Chỉ dành cho Ban Đào tạo)
                      </option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-300">
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
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="mb-1 block font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-300">CHUYÊN MỤC</label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, category: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                  >
                    <option value="Lập trình căn bản">Lập trình căn bản</option>
                    <option value="Lập trình Web">Lập trình Web</option>
                    <option value="Cấu trúc dữ liệu">Cấu trúc dữ liệu</option>
                    <option value="Lập trình OOP">Lập trình OOP</option>
                    <option value="Cơ sở dữ liệu">Cơ sở dữ liệu</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-300">NGÔN NGỮ</label>
                  <select
                    value={editingTemplate.language}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, language: e.target.value })
                    }
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                  >
                    <option value="C++">C++</option>
                    <option value="Java">Java</option>
                    <option value="Python">Python</option>
                  </select>
                </div>

                {editingTemplate.type === 'exam' && (
                  <div>
                    <label className="mb-1 block font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-300">
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
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-300">MÔ TẢ YÊU CẦU ĐỀ</label>
                <textarea
                  rows={2}
                  value={editingTemplate.description || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, description: e.target.value })
                  }
                  placeholder="Mô tả mục tiêu bài thực hành hoặc kỳ thi..."
                  className="w-full rounded-md border border-slate-300 bg-white p-3 text-xs font-medium leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Sub-form: Danh sách câu hỏi */}
              <div className="border-t border-slate-300 pt-3 dark:border-white/10">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                      Danh sách câu hỏi &amp; Test Cases ({editQuestions.length} bài)
                    </h4>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      Tổng điểm bộ đề:{' '}
                      <strong className="font-mono text-slate-900 dark:text-white">
                        {Number(editQuestions.reduce((s, q) => s + Number(q.maxPoints ?? q.max_points ?? 10), 0).toFixed(2))} / 10 điểm
                      </strong>{' '}
                      (Khó: 30% = 3đ · TB: 20% = 2đ · Dễ: 10% = 1đ)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditQuestions((prev) => distributeQuestionsByDifficulty(prev, 10))}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-brand/30 bg-brand-50 px-2.5 text-[11px] font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-200 cursor-pointer"
                    >
                      Chia theo độ khó
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditQuestions((prev) => distributeQuestionsEvenly(prev, 10))}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 cursor-pointer"
                    >
                      Chia đều
                    </button>
                    <button
                      type="button"
                      onClick={handleAddQuestionToTemplate}
                      className="inline-flex h-8 items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white px-3 text-xs font-semibold transition cursor-pointer border border-slate-300 dark:border-white/20"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Thêm câu hỏi
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {editQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="space-y-3 rounded-md border border-slate-300 bg-slate-50 p-3.5 text-xs dark:border-white/10 dark:bg-white/[0.02]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
      <span className="font-serif font-bold text-slate-900 dark:text-white">Câu hỏi {idx + 1}</span>
      <span className="rounded bg-slate-200 dark:bg-white/10 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
        {editingTemplate.type === 'final' || (editingTemplate.type as any) === 'final_exam'
          ? 'Đề thi cuối kỳ'
          : editingTemplate.type === 'midterm' || (editingTemplate.type as any) === 'midterm_exam'
          ? 'Đề thi giữa kỳ'
          : 'Đề thực hành'}
      </span>
    </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestionFromTemplate(idx)}
                          className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                          title="Xóa câu hỏi này"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_115px_95px_95px] gap-2">
                        <div>
                          <label className="mb-1 block font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Tiêu đề câu hỏi
                          </label>
                          <input
                            type="text"
                            value={q.title}
                            onChange={(e) => handleUpdateQuestionField(idx, 'title', e.target.value)}
                            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Độ khó
                          </label>
                          <select
                            value={q.difficulty}
                            onChange={(e) =>
                              handleUpdateQuestionField(idx, 'difficulty', e.target.value)
                            }
                            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-900 outline-none transition focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                          >
                            <option value="Dễ">Dễ</option>
                            <option value="Trung bình">Trung bình</option>
                            <option value="Khó">Khó</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Điểm câu
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step="any"
                            value={q.maxPoints ?? q.max_points ?? 10}
                            onChange={(e) => handleUpdateQuestionPoints(idx, e.target.value)}
                            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-mono font-bold text-slate-900 outline-none transition focus:border-brand dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Số test case
                          </label>
                          <div
                            role="status"
                            aria-live="polite"
                            aria-label={`${q.testCases?.length ?? 0} test case`}
                            title="Số lượng được tự động tính theo danh sách Test Case bên dưới."
                            className="flex h-8 w-full cursor-not-allowed items-center justify-between rounded-md border border-slate-300 bg-slate-50 px-2 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
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
                        <label className="mb-1 block font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Đặc tả yêu cầu
                        </label>
                        <textarea
                          rows={2}
                          value={q.description}
                          onChange={(e) => handleUpdateQuestionField(idx, 'description', e.target.value)}
                          className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs font-normal leading-relaxed text-slate-900 outline-none transition focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Sample Input
                          </label>
                          <input
                            type="text"
                            value={q.sampleInput || ''}
                            onChange={(e) =>
                              handleUpdateQuestionField(idx, 'sampleInput', e.target.value)
                            }
                            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none transition focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Sample Output
                          </label>
                          <input
                            type="text"
                            value={q.sampleOutput || ''}
                            onChange={(e) =>
                              handleUpdateQuestionField(idx, 'sampleOutput', e.target.value)
                            }
                            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none transition focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 dark:border-white/10 dark:bg-neutral-950 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      {/* Test cases của câu hỏi */}
                      <div className="mt-3 space-y-3 border-t border-slate-300 pt-3 dark:border-white/10">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h5 className="font-serif text-xs font-bold text-slate-800 dark:text-slate-200">
                              Test Case chấm tự động ({q.testCases?.length || 0})
                            </h5>
                            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                              Nhập dữ liệu đầu vào và kết quả mong đợi cho từng trường hợp.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddTestCase(idx)}
                            className="inline-flex h-8 items-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white px-3 text-xs font-semibold transition cursor-pointer border border-slate-300 dark:border-white/20"
                          >
                            <Plus className="mr-1 inline h-3.5 w-3.5" />
                            Thêm Test Case
                          </button>
                        </div>

                        {(q.testCases || []).map((testCase, tcIdx) => (
                          <div
                            key={testCase.id}
                            className="space-y-3 rounded-md border border-slate-300 bg-white p-3 dark:border-white/10 dark:bg-neutral-950"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                TC-{String(tcIdx + 1).padStart(2, '0')}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleRemoveTestCase(idx, tcIdx)}
                                className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                                title="Xóa Test Case"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-300">
                                  Input Data
                                </label>
                                <textarea
                                  rows={3}
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
                                  className="w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-xs leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-300">
                                  Expected Output
                                </label>
                                <textarea
                                  rows={3}
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
                                  className="w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-xs leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 pt-2 dark:border-white/10">
                              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 accent-slate-900 dark:accent-white focus:ring-slate-900 dark:focus:ring-white"
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
                                  className="h-8 w-20 rounded-md border border-slate-300 bg-white px-2 text-right font-mono text-xs text-slate-900 outline-none transition focus:border-slate-900 dark:focus:border-white dark:border-white/10 dark:bg-neutral-900 dark:text-slate-100"
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
              <div className="rounded-md border border-slate-300 bg-slate-50 p-3 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">Cơ chế đồng bộ tự động:</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  Khi lưu bộ đề, mọi bài lab hoặc bài thi trong các lớp học đang gán mã{' '}
                  <strong className="font-mono text-slate-900 dark:text-white">{editingTemplate.id}</strong> (như SE1848, IT2202, SE1849...) sẽ tự động cập nhật tiêu đề, số lượng câu hỏi và ngôn ngữ lập trình tương ứng.
                </p>
              </div>

              {/* Footer action buttons */}
              <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-300 pt-3 sm:flex-row sm:gap-2.5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="h-9 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-white/[0.08]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="system-primary-action h-9 rounded-md bg-slate-900 px-5 text-xs font-semibold text-white transition hover:bg-slate-800 cursor-pointer shadow-xs"
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
