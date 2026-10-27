"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { Question, QuestionDifficulty } from "../types";

type QuestionListProps = {
  questions: Question[];
  selectedId: string | null;
  onSelect: (question: Question) => void;
  onCreate: () => void;
};

const difficultyLabel: Record<QuestionDifficulty, string> = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
};

const difficultyClass: Record<QuestionDifficulty, string> = {
  easy: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  hard: "bg-rose-50 text-rose-700 ring-rose-200",
};

export default function QuestionList({
  questions,
  selectedId,
  onSelect,
  onCreate,
}: QuestionListProps) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<
    "all" | QuestionDifficulty
  >("all");
  const [tag, setTag] = useState("all");

  const tags = useMemo(
    () =>
      Array.from(
        new Set(questions.flatMap((question) => question.tags)),
      ).sort((a, b) => a.localeCompare(b)),
    [questions],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return questions.filter((question) => {
      const matchesSearch =
        !query ||
        question.title.toLowerCase().includes(query) ||
        question.tags.some((item) =>
          item.toLowerCase().includes(query),
        );

      const matchesDifficulty =
        difficulty === "all" ||
        question.difficulty === difficulty;

      const matchesTag =
        tag === "all" || question.tags.includes(tag);

      return matchesSearch && matchesDifficulty && matchesTag;
    });
  }, [questions, search, difficulty, tag]);

  return (
    <aside className="flex min-h-[620px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-slate-900">
              Ngân hàng câu hỏi
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {questions.length} câu hỏi trong thư viện
            </p>
          </div>

          <button
            type="button"
            onClick={onCreate}
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            + Tạo mới
          </button>
        </div>

        <label className="relative mt-4 block">
          <span className="sr-only">Tìm kiếm câu hỏi</span>
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm câu hỏi hoặc thẻ..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="min-w-0">
            <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <SlidersHorizontal size={12} />
              Độ khó
            </span>
            <select
              value={difficulty}
              onChange={(event) =>
                setDifficulty(
                  event.target.value as "all" | QuestionDifficulty,
                )
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600 outline-none focus:border-blue-400"
            >
              <option value="all">Tất cả mức độ</option>
              <option value="easy">Dễ</option>
              <option value="medium">Trung bình</option>
              <option value="hard">Khó</option>
            </select>
          </label>

          <label className="min-w-0">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Thẻ
            </span>
            <select
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600 outline-none focus:border-blue-400"
            >
              <option value="all">Tất cả thẻ</option>
              {tags.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              Không tìm thấy câu hỏi
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Hãy thử từ khóa hoặc bộ lọc khác.
            </p>
          </div>
        ) : (
          filtered.map((question) => {
            const selected = question.id === selectedId;

            return (
              <button
                type="button"
                key={question.id}
                onClick={() => onSelect(question)}
                aria-current={selected ? "true" : undefined}
                className={`group w-full rounded-xl border p-3 text-left transition ${
                  selected
                    ? "border-blue-200 bg-blue-50/70"
                    : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                      selected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {selected ? (
                      <Check size={12} />
                    ) : (
                      <ChevronRight size={12} />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">
                      {question.title}
                    </span>

                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${difficultyClass[question.difficulty]}`}
                      >
                        {difficultyLabel[question.difficulty]}
                      </span>

                      {question.tags.slice(0, 2).map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500"
                        >
                          {item}
                        </span>
                      ))}
                    </span>
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400">
        Hiển thị {filtered.length}/{questions.length} câu hỏi
      </div>
    </aside>
  );
}