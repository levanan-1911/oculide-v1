
"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Code2,
  Eye,
  FilePlus2,
  FileText,
  Layers3,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import InstructorSidebar from "../components/InstructorSidebar";
import type { QuestionSet, QuestionSetType } from "./types";

type FilterTab = "all" | "lab" | "exam";

const INITIAL_SETS: QuestionSet[] = [
  {
    id: "set-01",
    code: "TPL-LAB-01",
    title: "Cấu trúc điều khiển & Mảng một chiều",
    type: "lab",
    subject: "Lập trình căn bản",
    description: "Bài tập thực hành về điều kiện, vòng lặp và xử lý mảng một chiều.",
    questionCount: 3,
    languages: ["JavaScript", "Python"],
    durationMinutes: 120,
    classCodes: ["SE1848"],
    updatedAt: "24/10/2026",
  },
  {
    id: "set-02",
    code: "TPL-LAB-02",
    title: "Xử lý chuỗi & Thao tác DOM",
    type: "lab",
    subject: "Lập trình Web",
    description: "Thực hành xử lý chuỗi và thao tác các phần tử DOM.",
    questionCount: 4,
    languages: ["JavaScript"],
    durationMinutes: 90,
    classCodes: ["SE1850", "SE1851"],
    updatedAt: "24/10/2026",
  },
  {
    id: "set-03",
    code: "TPL-LAB-03",
    title: "Hàm và đệ quy cơ bản",
    type: "lab",
    subject: "Lập trình căn bản",
    description: "Rèn luyện cách xây dựng hàm và giải quyết bài toán bằng đệ quy.",
    questionCount: 5,
    languages: ["Python", "C++"],
    durationMinutes: 90,
    classCodes: ["SE1848"],
    updatedAt: "22/10/2026",
  },
  {
    id: "set-04",
    code: "TPL-LAB-04",
    title: "Danh sách và tìm kiếm",
    type: "lab",
    subject: "Cấu trúc dữ liệu",
    description: "Thực hành tìm kiếm và xử lý dữ liệu trong danh sách.",
    questionCount: 4,
    languages: ["Python", "C++"],
    durationMinutes: 100,
    classCodes: ["SE1852"],
    updatedAt: "20/10/2026",
  },
  {
    id: "set-05",
    code: "TPL-LAB-05",
    title: "Thuật toán sắp xếp",
    type: "lab",
    subject: "Cấu trúc dữ liệu",
    description: "Thực hành cài đặt và so sánh các thuật toán sắp xếp.",
    questionCount: 3,
    languages: ["C++", "Java"],
    durationMinutes: 90,
    classCodes: [],
    updatedAt: "18/10/2026",
  },
  {
    id: "set-06",
    code: "TPL-EXAM-01",
    title: "Kiểm tra giữa kỳ — Lập trình căn bản",
    type: "exam",
    subject: "Lập trình căn bản",
    description: "Đánh giá kiến thức về biến, vòng lặp, hàm và mảng.",
    questionCount: 5,
    languages: ["Python", "C++"],
    durationMinutes: 90,
    classCodes: ["SE1848", "SE1849"],
    updatedAt: "23/10/2026",
  },
  {
    id: "set-07",
    code: "TPL-EXAM-02",
    title: "Đánh giá lập trình Web",
    type: "exam",
    subject: "Lập trình Web",
    description: "Bài kiểm tra về JavaScript và xử lý sự kiện trên trang web.",
    questionCount: 4,
    languages: ["JavaScript"],
    durationMinutes: 120,
    classCodes: ["SE1850"],
    updatedAt: "21/10/2026",
  },
  {
    id: "set-08",
    code: "TPL-EXAM-03",
    title: "Kiểm tra cấu trúc dữ liệu",
    type: "exam",
    subject: "Cấu trúc dữ liệu",
    description: "Đánh giá khả năng áp dụng cấu trúc dữ liệu và thuật toán.",
    questionCount: 6,
    languages: ["C++", "Java"],
    durationMinutes: 120,
    classCodes: ["SE1852"],
    updatedAt: "19/10/2026",
  },
  {
    id: "set-09",
    code: "TPL-EXAM-04",
    title: "Thi cuối kỳ — Thuật toán",
    type: "exam",
    subject: "Phân tích thuật toán",
    description: "Đề thi tổng hợp về tìm kiếm, sắp xếp và tối ưu thuật toán.",
    questionCount: 5,
    languages: ["Python", "C++"],
    durationMinutes: 150,
    classCodes: ["SE1853"],
    updatedAt: "17/10/2026",
  },
];

const TYPE_LABEL: Record<QuestionSetType, string> = {
  lab: "Lab thực hành",
  exam: "Đề thi lập trình",
};

const TYPE_STYLE: Record<QuestionSetType, string> = {
  lab: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  exam: "bg-violet-50 text-violet-700 ring-violet-200",
};

const EMPTY_FORM = {
  code: "",
  title: "",
  subject: "",
  type: "lab" as QuestionSetType,
  durationMinutes: "120",
  description: "",
  languages: "Python",
};
const AVAILABLE_LANGUAGES = [
  "C++",
  "Java",
  "Python",
];

export default function QuestionsPage() {
  const [sets, setSets] = useState<QuestionSet[]>(INITIAL_SETS);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [category, setCategory] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [formError, setFormError] = useState("");

  const labCount = sets.filter((item) => item.type === "lab").length;
  const examCount = sets.filter((item) => item.type === "exam").length;

  const linkedClassCount = new Set(
    sets.flatMap((item) => item.classCodes),
  ).size;

  const tabCounts: Record<FilterTab, number> = {
    all: sets.length,
    lab: labCount,
    exam: examCount,
  };

  const filteredSets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sets.filter((item) => {
      const matchesSearch =
        !query ||
        item.code.toLowerCase().includes(query) ||
        item.title.toLowerCase().includes(query) ||
        item.subject.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.classCodes.some((code) =>
          code.toLowerCase().includes(query),
        );

      const matchesTab =
        activeTab === "all" || item.type === activeTab;

      const matchesCategory =
        category === "all" || item.type === category;

      return matchesSearch && matchesTab && matchesCategory;
    });
  }, [sets, search, activeTab, category]);

  function openCreateForm() {
  setForm(EMPTY_FORM);
  setSelectedLanguages([]);
  setFormError("");
  setNotice("");
  setShowCreateForm(true);
}

  function closeCreateForm() {
    setShowCreateForm(false);
    setFormError("");
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const code = form.code.trim().toUpperCase();
    const title = form.title.trim();
    const subject = form.subject.trim();
    const duration = Number(form.durationMinutes);

    if (!code || !title || !subject) {
      setFormError("Vui lòng nhập mã bộ đề, tên bộ đề và môn học.");
      return;
    }

    if (sets.some((item) => item.code.toLowerCase() === code.toLowerCase())) {
      setFormError("Mã bộ đề đã tồn tại. Vui lòng nhập mã khác.");
      return;
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 600) {
      setFormError("Thời lượng phải là số nguyên từ 1 đến 600 phút.");
      return;
    }

    const newSet: QuestionSet = {
      id: `set-${Date.now()}`,
      code,
      title,
      type: form.type,
      subject,
      description: form.description.trim(),
      questionCount: 0,
      languages: [form.languages],
      durationMinutes: duration,
      classCodes: [],
      updatedAt: new Date().toLocaleDateString("vi-VN"),
    };

    setSets((current) => [newSet, ...current]);
    setActiveTab("all");
    setCategory("all");
    setSearch("");
    setNotice(`Đã tạo bộ đề "${title}" trên giao diện mẫu.`);
    setShowCreateForm(false);
    setForm(EMPTY_FORM);
  }

  function updateForm<K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "lab", label: "Đề Lab thực hành" },
    { id: "exam", label: "Đề thi lập trình" },
  ];

  return (
    <div className="flex min-h-screen bg-[#f5f8fc] text-slate-800">
      <InstructorSidebar />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                <span>Quản lý đào tạo</span>
                <span>/</span>
                <span className="font-medium text-blue-700">Đề & câu hỏi</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Quản lý bộ đề
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Tạo, tổ chức và quản lý bộ đề thực hành, kiểm tra và thi lập trình.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              <Plus size={18} />
              Tạo bộ đề mới
            </button>
          </header>

          {notice && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            >
              <CheckCircle2 size={18} />
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Đóng thông báo"
                className="ml-auto rounded p-1 hover:bg-emerald-100"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Tổng số bộ đề"
              value={sets.length}
              description="Tất cả bộ đề trong thư viện"
              icon={<Layers3 size={20} />}
              iconClass="bg-blue-50 text-blue-700"
            />
            <StatCard
              title="Bộ đề Lab thực hành"
              value={labCount}
              description="Dùng cho các buổi thực hành"
              icon={<Code2 size={20} />}
              iconClass="bg-emerald-50 text-emerald-700"
            />
            <StatCard
              title="Đề kiểm tra & thi"
              value={examCount}
              description="Bộ đề dùng để đánh giá"
              icon={<FileText size={20} />}
              iconClass="bg-violet-50 text-violet-700"
            />
            <StatCard
              title="Lớp học đang liên kết"
              value={linkedClassCount}
              description="Số mã lớp khác nhau đang sử dụng"
              icon={<Link2 size={20} />}
              iconClass="bg-amber-50 text-amber-700"
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Danh sách bộ đề
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Tìm kiếm và lọc bộ đề theo nhu cầu.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="relative block sm:w-72">
                    <span className="sr-only">Tìm kiếm bộ đề</span>
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Tìm mã đề, tên đề, môn học, lớp..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </label>

                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(event.target.value as FilterTab)
                    }
                    aria-label="Lọc theo loại bộ đề"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="all">Tất cả danh mục</option>
                    <option value="lab">Lab thực hành</option>
                    <option value="exam">Đề thi lập trình</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-100">
                {tabs.map((tab) => {
                  const selected = activeTab === tab.id;

                  return (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${
                        selected
                          ? "border-blue-600 text-blue-700"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {tab.label}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          selected
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {tabCounts[tab.id]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              {filteredSets.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-14 text-center">
                  <Search className="mx-auto text-slate-300" size={28} />
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Không tìm thấy bộ đề
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Hãy thử từ khóa khác hoặc thay đổi bộ lọc.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setCategory("all");
                      setActiveTab("all");
                    }}
                    className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-800"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              ) : (
                filteredSets.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:shadow-sm sm:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                            {item.code}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TYPE_STYLE[item.type]}`}
                          >
                            {TYPE_LABEL[item.type]}
                          </span>
                        </div>

                        <h3 className="mt-3 text-base font-semibold text-slate-900">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.subject}
                        </p>
                        {item.description && (
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                            {item.description}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <FileText size={15} />
                            {item.questionCount} câu hỏi
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 size={15} />
                            {item.durationMinutes} phút
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays size={15} />
                            Cập nhật {item.updatedAt}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-slate-500">
                            Ngôn ngữ:
                          </span>
                          {item.languages.length > 0 ? (
                            item.languages.map((language) => (
                              <span
                                key={language}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                              >
                                {language}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">
                              Chưa cấu hình
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-slate-500">
                            Lớp liên kết:
                          </span>
                          {item.classCodes.length > 0 ? (
                            item.classCodes.map((classCode) => (
                              <span
                                key={classCode}
                                className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                              >
                                {classCode}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">
                              Chưa liên kết lớp
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 lg:justify-end">
                        {/* Nút Xem */}
                        <button
                          type="button"
                          onClick={() => {
                            alert(`Xem bộ đề: ${item.title}`);
                          }}
                          title="Xem bộ đề"
                          className="rounded-lg border border-blue-200 p-2 text-blue-600 transition hover:bg-blue-50"
                        >
                          <Eye size={16} />
                        </button>

                        {/* Nút Sửa */}
                        <button
                          type="button"
                          onClick={() => {
                            alert(`Sửa bộ đề: ${item.title}`);
                          }}
                          title="Sửa bộ đề"
                          className="rounded-lg border border-emerald-200 p-2 text-emerald-600 transition hover:bg-emerald-50"
                        >
                          <Pencil size={16} />
                        </button>

                        {/* Nút Xóa */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc muốn xóa bộ đề "${item.title}"?`)) {
                              setSets((current) =>
                                current.filter((set) => set.id !== item.id)
                              );
                            }
                          }}
                          title="Xóa bộ đề"
                          className="rounded-lg border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <span>
                Hiển thị {filteredSets.length} / {sets.length} bộ đề
              </span>
              <span>Dữ liệu mẫu — chưa kết nối máy chủ</span>
            </div>
          </section>
        </div>
      </main>

      {showCreateForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateForm();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-set-title"
            className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <h2
                  id="create-set-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Tạo bộ đề mới
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Nhập thông tin cơ bản cho bộ đề.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateForm}
                aria-label="Đóng biểu mẫu"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 p-5">
              {formError && (
                <p
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  {formError}
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Mã bộ đề <span className="text-rose-500">*</span>
                  <input
                    required
                    value={form.code}
                    onChange={(event) => updateForm("code", event.target.value)}
                    placeholder="VD: TPL-LAB-06"
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Loại bộ đề
                  <select
                    value={form.type}
                    onChange={(event) =>
                      updateForm("type", event.target.value as QuestionSetType)
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="lab">Lab thực hành</option>
                    <option value="exam">Đề thi lập trình</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Tên bộ đề <span className="text-rose-500">*</span>
                <input
                  required
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  placeholder="Nhập tên bộ đề"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Môn học <span className="text-rose-500">*</span>
                <input
                  required
                  value={form.subject}
                  onChange={(event) => updateForm("subject", event.target.value)}
                  placeholder="VD: Lập trình căn bản"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Thời lượng (phút)
                <input
                  type="number"
                  min={1}
                  max={600}
                  required
                  value={form.durationMinutes}
                  onChange={(event) =>
                    updateForm("durationMinutes", event.target.value)
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </label>
              
              <label className="block text-sm font-medium text-slate-700">
                Ngôn ngữ lập trình
                <select
                  value={form.languages}
                  onChange={(event) =>
                    updateForm("languages", event.target.value)
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="C++">C++</option>
                  <option value="Java">Java</option>
                  <option value="Python">Python</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Mô tả
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  placeholder="Mô tả ngắn về nội dung bộ đề..."
                  className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </label>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <FilePlus2 size={16} />
                  Tạo bộ đề
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
};

function StatCard({
  title,
  value,
  description,
  icon,
  iconClass,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </article>
  );
}
