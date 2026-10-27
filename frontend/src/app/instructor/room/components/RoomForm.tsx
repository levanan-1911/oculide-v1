'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertCircle,
  CalendarClock,
  Check,
  Clock3,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  Save,
  ShieldAlert,
  Unlock,
  Users,
} from "lucide-react";
import type { Room, RoomFormValues, RoomMode } from "../types";

interface RoomFormProps {
  initialRoom: Room;
  onSubmit: (values: RoomFormValues) => Promise<void>;
  isSaving: boolean;
}

interface FormErrors {
  roomCode?: string;
  roomName?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: string;
  maxAttempts?: string;
}

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-slate-700">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="flex items-start gap-1.5 text-xs text-rose-600">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-xs leading-5 text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50";

export default function RoomForm({ initialRoom, onSubmit, isSaving }: RoomFormProps) {
  const [form, setForm] = useState<RoomFormValues>({
    roomCode: initialRoom.roomCode,
    roomName: initialRoom.roomName,
    mode: initialRoom.mode,
    description: initialRoom.description,
    startTime: toLocalDateTimeInput(initialRoom.startTime),
    endTime: toLocalDateTimeInput(initialRoom.endTime),
    durationMinutes: initialRoom.durationMinutes,
    maxAttempts: initialRoom.maxAttempts,
    passcode: initialRoom.passcode,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPasscode, setShowPasscode] = useState(false);
  // Once the teacher edits the end time manually, automatic calculation stops.
  const [endTimeManuallyEdited, setEndTimeManuallyEdited] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitErrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setForm({
      roomCode: initialRoom.roomCode,
      roomName: initialRoom.roomName,
      mode: initialRoom.mode,
      description: initialRoom.description,
      startTime: toLocalDateTimeInput(initialRoom.startTime),
      endTime: toLocalDateTimeInput(initialRoom.endTime),
      durationMinutes: initialRoom.durationMinutes,
      maxAttempts: initialRoom.maxAttempts,
      passcode: initialRoom.passcode,
    });
    setErrors({});
    setSubmitError(null);
    setEndTimeManuallyEdited(false);
  }, [initialRoom]);

  function validateSchedule(values: RoomFormValues): Pick<FormErrors, "startTime" | "endTime" | "durationMinutes"> {
    const scheduleErrors: Pick<FormErrors, "startTime" | "endTime" | "durationMinutes"> = {};
    const now = Date.now();
    const start = values.startTime ? new Date(values.startTime).getTime() : Number.NaN;
    const end = values.endTime ? new Date(values.endTime).getTime() : Number.NaN;
    const duration = values.durationMinutes;
    const validDuration = Number.isFinite(duration) && Number.isInteger(duration) && duration > 0;

    if (!values.startTime) {
      scheduleErrors.startTime = "Vui lòng chọn thời gian mở phòng.";
    } else if (!Number.isFinite(start)) {
      scheduleErrors.startTime = "Thời gian mở không hợp lệ.";
    } else if (start <= now) {
      scheduleErrors.startTime = "Thời gian bắt đầu không được ở trong quá khứ. Nếu chọn hôm nay, giờ bắt đầu phải sau thời điểm hiện tại.";
    }

    if (!values.endTime) {
      scheduleErrors.endTime = "Vui lòng chọn thời gian đóng phòng.";
    } else if (!Number.isFinite(end)) {
      scheduleErrors.endTime = "Thời gian đóng không hợp lệ.";
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      scheduleErrors.durationMinutes = "Thời lượng phải là số phút lớn hơn 0.";
    } else if (!Number.isInteger(duration)) {
      scheduleErrors.durationMinutes = "Thời lượng phải là số nguyên tính bằng phút.";
    }

    if (Number.isFinite(start) && Number.isFinite(end)) {
      if (end <= start) {
        scheduleErrors.endTime = "Thời gian kết thúc phải sau thời gian bắt đầu.";
      } else if (validDuration && end < start + duration * 60_000) {
        scheduleErrors.endTime = "Thời gian kết thúc không được sớm hơn thời gian bắt đầu cộng thời lượng làm bài.";
      }
    }

    return scheduleErrors;
  }

  function updateField<K extends keyof RoomFormValues>(field: K, value: RoomFormValues[K]) {
    let nextForm: RoomFormValues = { ...form, [field]: value };

    if (field === "endTime") {
      // A manually chosen end time becomes the teacher's choice and is preserved.
      setEndTimeManuallyEdited(true);
    }

    // Auto-calculate the end time from start + duration until the teacher edits it.
    if (
      (field === "startTime" || field === "durationMinutes") &&
      !endTimeManuallyEdited &&
      nextForm.startTime &&
      Number.isInteger(nextForm.durationMinutes) &&
      nextForm.durationMinutes > 0
    ) {
      const start = new Date(nextForm.startTime).getTime();
      if (Number.isFinite(start)) {
        const calculatedEnd = new Date(start + nextForm.durationMinutes * 60_000);
        const pad = (part: number) => String(part).padStart(2, "0");
        nextForm = {
          ...nextForm,
          endTime: `${calculatedEnd.getFullYear()}-${pad(calculatedEnd.getMonth() + 1)}-${pad(calculatedEnd.getDate())}T${pad(calculatedEnd.getHours())}:${pad(calculatedEnd.getMinutes())}`,
        };
      }
    }

    setForm(nextForm);
    setSubmitError(null);

    if (field === "startTime" || field === "endTime" || field === "durationMinutes") {
      const scheduleErrors = validateSchedule(nextForm);
      setErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors.startTime;
        delete nextErrors.endTime;
        delete nextErrors.durationMinutes;
        return { ...nextErrors, ...scheduleErrors };
      });
    } else {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!form.roomCode.trim()) {
      nextErrors.roomCode = "Vui lòng nhập mã phòng.";
    } else if (!/^[a-zA-Z0-9_-]{3,30}$/.test(form.roomCode.trim())) {
      nextErrors.roomCode = "Mã phòng dài 3–30 ký tự, chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.";
    }

    if (!form.roomName.trim()) nextErrors.roomName = "Vui lòng nhập tên phòng.";

    Object.assign(nextErrors, validateSchedule(form));

    if (!Number.isInteger(form.maxAttempts) || form.maxAttempts < 1 || form.maxAttempts > 10) {
      nextErrors.maxAttempts = "Số lượt làm phải nằm trong khoảng 1–10.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    try {
      await onSubmit({
        ...form,
        roomCode: form.roomCode.trim(),
        roomName: form.roomName.trim(),
        description: form.description.trim(),
        passcode: form.passcode.trim(),
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Không thể lưu cấu hình phòng. Vui lòng thử lại.";

      setSubmitError(message);
      window.setTimeout(() => {
        submitErrorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        submitErrorRef.current?.focus();
      }, 0);
    }
  }

  const modeOptions: Array<{
    value: RoomMode;
    title: string;
    description: string;
    icon: typeof GraduationCap;
  }> = [
    {
      value: "practice",
      title: "Lớp học luyện tập",
      description: "Dành cho thực hành và rèn luyện kỹ năng.",
      icon: GraduationCap,
    },
    {
      value: "exam",
      title: "Chế độ thi cử",
      description: "Dành cho buổi kiểm tra có giám sát.",
      icon: ShieldAlert,
    },
  ];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {submitError ? (
        <div
          ref={submitErrorRef}
          role="alert"
          tabIndex={-1}
          className="scroll-mt-6 rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-3.5 text-sm text-rose-800 shadow-sm outline-none focus:ring-2 focus:ring-rose-300"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
            <div>
              <p className="font-bold">Không thể lưu cấu hình phòng</p>
              <p className="mt-1 leading-5">{submitError}</p>
            </div>
          </div>
        </div>
      ) : null}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Thông tin phòng</h2>
              <p className="mt-1 text-sm text-slate-500">Đặt tên và xác định mục đích sử dụng phòng.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field label="Tên phòng" htmlFor="roomName" required error={errors.roomName}>
            <input
              id="roomName"
              value={form.roomName}
              onChange={(event) => updateField("roomName", event.target.value)}
              className={inputClass}
              placeholder="Ví dụ: Lập trình Python - Nhóm 01"
              maxLength={120}
              required
              disabled={isSaving}
              aria-invalid={Boolean(errors.roomName)}
            />
          </Field>

          <Field
            label="Mã phòng"
            htmlFor="roomCode"
            required
            hint="Dùng để nhận diện phòng; chỉ gồm chữ, số, - hoặc _."
            error={errors.roomCode}
          >
            <input
              id="roomCode"
              value={form.roomCode}
              onChange={(event) => updateField("roomCode", event.target.value)}
              className={inputClass}
              placeholder="VD: PYTHON-101"
              maxLength={30}
              required
              disabled={isSaving}
              autoCapitalize="characters"
              aria-invalid={Boolean(errors.roomCode)}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Mô tả" htmlFor="description" hint="Thông tin ngắn giúp sinh viên nhận biết đúng phòng.">
              <textarea
                id="description"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                className={`${inputClass} min-h-24 resize-y`}
                placeholder="Mục tiêu buổi học, nội dung hoặc lưu ý..."
                maxLength={1000}
                disabled={isSaving}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="text-[15px] font-semibold text-slate-900">Chế độ phòng</h2>
          <p className="mt-1 text-sm text-slate-500">Chọn loại phòng phù hợp với hoạt động của lớp.</p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
          {modeOptions.map((option) => {
            const Icon = option.icon;
            const selected = form.mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateField("mode", option.value)}
                disabled={isSaving}
                aria-pressed={selected}
                className={`relative flex min-h-28 items-start gap-3 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected
                    ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className={`rounded-xl p-2.5 ${selected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">{option.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-500">{option.description}</span>
                </span>
                {selected ? (
                  <span className="rounded-full bg-blue-600 p-1 text-white">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {form.mode === "exam" ? (
          <div className="mx-5 mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900 sm:mx-6 sm:mb-6">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>Chế độ thi cử cần được cấu hình lịch thi, danh sách dự thi và chính sách giám sát hợp lệ trước khi mở phòng theo quy trình hệ thống.</p>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700">
              <CalendarClock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Thời gian & lượt làm</h2>
              <p className="mt-1 text-sm text-slate-500">Chọn khung thời gian phòng có hiệu lực và thời lượng mỗi lượt.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field label="Thời gian mở" htmlFor="startTime" required error={errors.startTime}>
            <input
              id="startTime"
              type="datetime-local"
              value={form.startTime}
              onChange={(event) => updateField("startTime", event.target.value)}
              className={inputClass}
              required
              disabled={isSaving}
              aria-invalid={Boolean(errors.startTime)}
            />
          </Field>

          <Field label="Thời gian đóng" htmlFor="endTime" required error={errors.endTime}>
            <input
              id="endTime"
              type="datetime-local"
              value={form.endTime}
              onChange={(event) => updateField("endTime", event.target.value)}
              className={inputClass}
              required
              disabled={isSaving}
              aria-invalid={Boolean(errors.endTime)}
            />
          </Field>

          <Field label="Thời lượng làm bài (phút)" htmlFor="durationMinutes" required error={errors.durationMinutes}>
            <div className="relative">
              <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="durationMinutes"
                type="number"
                min={1}
                step={1}
                value={form.durationMinutes}
                onChange={(event) => updateField("durationMinutes", event.target.value === "" ? 0 : Number(event.target.value))}
                className={`${inputClass} pl-10 pr-16`}
                required
                disabled={isSaving}
                aria-invalid={Boolean(errors.durationMinutes)}
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">phút</span>
            </div>
          </Field>

          <Field label="Số lượt làm tối đa" htmlFor="maxAttempts" required error={errors.maxAttempts}>
            <input
              id="maxAttempts"
              type="number"
              min={1}
              max={10}
              step={1}
              value={form.maxAttempts}
              onChange={(event) => updateField("maxAttempts", event.target.value === "" ? 0 : Number(event.target.value))}
              className={inputClass}
              required
              disabled={isSaving}
              aria-invalid={Boolean(errors.maxAttempts)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Bảo mật phòng</h2>
              <p className="mt-1 text-sm text-slate-500">Có thể đặt mã truy cập để hạn chế người tham gia không được mời.</p>
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <Field
            label="Mã truy cập"
            htmlFor="passcode"
            hint="Để trống nếu phòng không yêu cầu mã truy cập. Không sử dụng mật khẩu tài khoản."
          >
            <div className="relative">
              {form.passcode ? (
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              ) : (
                <Unlock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              )}
              <input
                id="passcode"
                type={showPasscode ? "text" : "password"}
                value={form.passcode}
                onChange={(event) => updateField("passcode", event.target.value)}
                className={`${inputClass} pl-10 pr-24`}
                placeholder="Nhập mã truy cập (nếu cần)"
                maxLength={64}
                autoComplete="new-password"
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={() => setShowPasscode((visible) => !visible)}
                disabled={isSaving}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                aria-label={showPasscode ? "Ẩn mã truy cập" : "Hiện mã truy cập"}
              >
                {showPasscode ? "Ẩn mã" : "Hiện mã"}
              </button>
            </div>
          </Field>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">Các trường có dấu <span className="text-rose-500">*</span> là bắt buộc.</p>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          {isSaving ? "Đang lưu..." : "Lưu cấu hình phòng"}
        </button>
      </div>
    </form>
  );
}
