"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Clock3,
  Cpu,
  FileText,
  LoaderCircle,
  Save,
  Tag,
  X,
} from "lucide-react";
import type { Question, QuestionDifficulty, QuestionInput } from "../types";
import MarkdownEditor from "./MarkdownEditor";

type QuestionFormProps = {
  initialQuestion?: Question | null;
  onSave: (question: QuestionInput) => void | Promise<void>;
  onCancel?: () => void;
};

type FormState = {
  title: string;
  difficulty: QuestionDifficulty;
  tagsText: string;
  description: string;
  timeLimitSeconds: string;
  memoryLimitMb: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  title: "",
  difficulty: "easy",
  tagsText: "",
  description: "",
  timeLimitSeconds: "1.0",
  memoryLimitMb: "256",
};

function toFormState(question?: Question | null): FormState {
  if (!question) {
    return { ...EMPTY_FORM };
  }

  return {
    title: question.title,
    difficulty: question.difficulty,
    tagsText: question.tags.join(", "),
    description: question.description,
    timeLimitSeconds: String(
      question.resourceLimits.timeLimitSeconds,
    ),
    memoryLimitMb: String(question.resourceLimits.memoryLimitMb),
  };
}

export default function QuestionForm({
  initialQuestion,
  onSave,
  onCancel,
}: QuestionFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    toFormState(initialQuestion),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    setForm(toFormState(initialQuestion));
    setErrors({});
    setSubmitError("");
  }, [initialQuestion]);

  function update<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setErrors((current) => {
      if (!(key in current)) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });

    setSubmitError("");
  }

  function validate(): FormErrors {
    const next: FormErrors = {};

    if (!form.title.trim()) {
      next.title = "Vui lòng nhập tiêu đề câu hỏi.";
    } else if (form.title.trim().length > 120) {
      next.title = "Tiêu đề không được vượt quá 120 ký tự.";
    }

    const time = Number(form.timeLimitSeconds);

    if (
      !form.timeLimitSeconds.trim() ||
      !Number.isFinite(time) ||
      time < 0.1 ||
      time > 10
    ) {
      next.timeLimitSeconds =
        "Giới hạn thời gian phải từ 0,1 đến 10 giây.";
    } else if (
      !/^\d+(\.\d{1,2})?$/.test(form.timeLimitSeconds.trim())
    ) {
      next.timeLimitSeconds =
        "Nhập số có tối đa 2 chữ số thập phân.";
    }

    const memory = Number(form.memoryLimitMb);

    if (
      !form.memoryLimitMb.trim() ||
      !Number.isInteger(memory) ||
      memory < 16 ||
      memory > 4096
    ) {
      next.memoryLimitMb =
        "Giới hạn bộ nhớ phải là số nguyên từ 16 đến 4096 MB.";
    }

    if (!form.description.trim()) {
      next.description = "Vui lòng nhập nội dung đề bài.";
    } else if (form.description.trim().length < 20) {
      next.description =
        "Nội dung đề bài phải có ít nhất 20 ký tự.";
    }

    const tags = form.tagsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (tags.length > 10) {
      next.tagsText = "Chỉ được nhập tối đa 10 thẻ.";
    } else if (tags.some((item) => item.length > 24)) {
      next.tagsText = "Mỗi thẻ không được vượt quá 24 ký tự.";
    }

    return next;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) {
      const firstError = Object.keys(
        nextErrors,
      )[0];

      document
        .getElementById(`question-field-${firstError}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      return;
    }

    setIsSaving(true);

    try {
      const tags = Array.from(
        new Set(
          form.tagsText
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      );

      await onSave({
        title: form.title.trim(),
        difficulty: form.difficulty,
        tags,
        description: form.description.trim(),
        resourceLimits: {
          timeLimitSeconds: Number(form.timeLimitSeconds),
          memoryLimitMb: Number(form.memoryLimitMb),
        },
      });
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Không thể lưu câu hỏi. Vui lòng thử lại.",
      );

      requestAnimationFrame(() => {
        document
          .getElementById("question-form-submit-error")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
      });
    } finally {
      setIsSaving(false);
    }
  }

  const fieldClass = (key: keyof FormState) =>
    `mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:bg-slate-50 ${
      errors[key]
        ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
        : "border-slate-200 focus:border-blue-400 focus:ring-blue-100"
    }`;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6"
    >
      {submitError && (
        <div
          id="question-form-submit-error"
          role="alert"
          className="flex scroll-mt-6 items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />
          <span>{submitError}</span>
          <button
            type="button"
            aria-label="Đóng thông báo lỗi"
            onClick={() => setSubmitError("")}
            className="ml-auto rounded p-0.5 hover:bg-rose-100"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div
          className="sm:col-span-2"
          id="question-field-title"
        >
          <label
            htmlFor="question-title"
            className="text-sm font-semibold text-slate-700"
          >
            Tiêu đề câu hỏi{" "}
            <span className="text-rose-500">*</span>
          </label>

          <input
            id="question-title"
            value={form.title}
            onChange={(event) =>
              update("title", event.target.value)
            }
            maxLength={140}
            placeholder="Ví dụ: Two Sum"
            aria-invalid={Boolean(errors.title)}
            className={fieldClass("title")}
          />

          {errors.title && (
            <p className="mt-1 text-xs text-rose-600">
              {errors.title}
            </p>
          )}

          <p className="mt-1 text-right text-xs text-slate-400">
            {form.title.length}/140 ký tự
          </p>
        </div>

        <div>
          <label
            htmlFor="question-difficulty"
            className="text-sm font-semibold text-slate-700"
          >
            Độ khó
          </label>

          <select
            id="question-difficulty"
            value={form.difficulty}
            onChange={(event) =>
              update(
                "difficulty",
                event.target.value as QuestionDifficulty,
              )
            }
            className={fieldClass("difficulty")}
          >
            <option value="easy">Dễ</option>
            <option value="medium">Trung bình</option>
            <option value="hard">Khó</option>
          </select>
        </div>

        <div id="question-field-tagsText">
          <label
            htmlFor="question-tags"
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"
          >
            <Tag size={14} />
            Thẻ / danh mục
          </label>

          <input
            id="question-tags"
            value={form.tagsText}
            onChange={(event) =>
              update("tagsText", event.target.value)
            }
            placeholder="array, hash-table, beginner"
            aria-invalid={Boolean(errors.tagsText)}
            className={fieldClass("tagsText")}
          />

          {errors.tagsText && (
            <p className="mt-1 text-xs text-rose-600">
              {errors.tagsText}
            </p>
          )}

          <p className="mt-1 text-xs text-slate-400">
            Phân tách các thẻ bằng dấu phẩy (tối đa 10 thẻ).
          </p>
        </div>
      </div>

      <div
        id="question-field-description"
        className="scroll-mt-6"
      >
        <div className="mb-2 flex items-center gap-2">
          <FileText
            size={16}
            className="text-blue-600"
          />
          <label className="text-sm font-semibold text-slate-700">
            Nội dung đề bài{" "}
            <span className="text-rose-500">*</span>
          </label>
        </div>

        <MarkdownEditor
          value={form.description}
          onChange={(value) =>
            update("description", value)
          }
          error={errors.description}
          disabled={isSaving}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Giới hạn tài nguyên
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Giới hạn thực thi được áp dụng khi chấm bài.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div
            id="question-field-timeLimitSeconds"
            className="scroll-mt-6"
          >
            <label
              htmlFor="question-time-limit"
              className="flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <Clock3
                size={15}
                className="text-blue-600"
              />
              Giới hạn thời gian
            </label>

            <div className="relative mt-1.5">
              <input
                id="question-time-limit"
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={form.timeLimitSeconds}
                onChange={(event) =>
                  update(
                    "timeLimitSeconds",
                    event.target.value,
                  )
                }
                aria-invalid={Boolean(errors.timeLimitSeconds)}
                className={`${fieldClass("timeLimitSeconds")} pr-14`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                giây
              </span>
            </div>

            {errors.timeLimitSeconds && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.timeLimitSeconds}
              </p>
            )}

            <p className="mt-1 text-xs text-slate-400">
              Khoảng cho phép: 0,1–10 giây
            </p>
          </div>

          <div
            id="question-field-memoryLimitMb"
            className="scroll-mt-6"
          >
            <label
              htmlFor="question-memory-limit"
              className="flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <Cpu
                size={15}
                className="text-blue-600"
              />
              Giới hạn bộ nhớ
            </label>

            <div className="relative mt-1.5">
              <input
                id="question-memory-limit"
                type="number"
                min="16"
                max="4096"
                step="16"
                value={form.memoryLimitMb}
                onChange={(event) =>
                  update(
                    "memoryLimitMb",
                    event.target.value,
                  )
                }
                aria-invalid={Boolean(errors.memoryLimitMb)}
                className={`${fieldClass("memoryLimitMb")} pr-12`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                MB
              </span>
            </div>

            {errors.memoryLimitMb && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.memoryLimitMb}
              </p>
            )}

            <p className="mt-1 text-xs text-slate-400">
              Khoảng cho phép: 16–4096 MB
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy
          </button>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <LoaderCircle
                size={16}
                className="animate-spin"
              />
              Đang lưu…
            </>
          ) : (
            <>
              <Save size={16} />
              Lưu câu hỏi
            </>
          )}
        </button>
      </div>
    </form>
  );
}