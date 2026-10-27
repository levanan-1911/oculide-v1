'use client';

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  Mail,
  Search,
  SearchX,
  Users,
} from "lucide-react";
import type { EnrollmentStatus, EnrollmentStatusFilter, StudentEnrollment } from "../types";

interface EnrollmentTableProps {
  students: StudentEnrollment[];
  isLoading?: boolean;
}

const statusLabels: Record<EnrollmentStatus, string> = {
  enrolled: "Đã ghi danh",
  not_started: "Chưa bắt đầu",
  active: "Đang làm bài",
  completed: "Đã hoàn thành",
};

const statusStyles: Record<EnrollmentStatus, string> = {
  enrolled: "bg-slate-100 text-slate-700 ring-slate-200",
  not_started: "bg-amber-50 text-amber-700 ring-amber-200",
  active: "bg-blue-50 text-blue-700 ring-blue-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const statusOptions: Array<{ value: EnrollmentStatusFilter; label: string }> = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "enrolled", label: "Đã ghi danh" },
  { value: "not_started", label: "Chưa bắt đầu" },
  { value: "active", label: "Đang làm bài" },
  { value: "completed", label: "Đã hoàn thành" },
];

function StatusBadge({ status }: { status: EnrollmentStatus }) {
  const Icon = status === "completed" ? CheckCircle2 : status === "active" ? Clock3 : CircleDashed;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}

function initials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0] ?? "")
    .join("")
    .toLocaleUpperCase("vi-VN");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function EnrollmentTable({ students, isLoading = false }: EnrollmentTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<EnrollmentStatusFilter>("all");

  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("vi-VN");
    return students.filter((student) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          student.fullName,
          student.studentCode,
          student.email,
          student.className,
          String(student.studentId),
        ].some((value) => value.toLocaleLowerCase("vi-VN").includes(normalizedSearch));
      const matchesStatus = statusFilter === "all" || student.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, students]);

  const activeCount = students.filter((student) => student.status === "active").length;
  const completedCount = students.filter((student) => student.status === "completed").length;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Danh sách sinh viên ghi danh</h2>
              <p className="mt-1 text-sm text-slate-500">
                {students.length} sinh viên trong phòng · {activeCount} đang làm bài · {completedCount} đã hoàn thành
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
              <p className="text-xs text-slate-500">Tổng sinh viên</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{students.length}</p>
            </div>
            <div className="rounded-xl bg-blue-50 px-3.5 py-2.5">
              <p className="text-xs text-blue-700">Đang làm bài</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-blue-800">{activeCount}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Tìm kiếm sinh viên</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo tên, mã sinh viên, email hoặc lớp..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="sm:w-56">
            <span className="sr-only">Lọc theo trạng thái</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as EnrollmentStatusFilter)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 p-5 sm:p-6" aria-live="polite" aria-label="Đang tải danh sách sinh viên">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 p-3">
              <div className="h-10 w-10 rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-slate-100" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
              </div>
              <div className="h-6 w-24 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-14 text-center">
          <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
            <SearchX className="h-7 w-7" aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">
            {students.length === 0 ? "Chưa có sinh viên ghi danh" : "Không tìm thấy sinh viên phù hợp"}
          </h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
            {students.length === 0
              ? "Danh sách sẽ hiển thị tại đây khi có sinh viên được ghi danh vào phòng."
              : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái."}
          </p>
          {students.length > 0 && (searchTerm || statusFilter !== "all") ? (
            <button
              type="button"
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
              className="mt-4 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Xóa bộ lọc
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-5 py-3.5 sm:px-6">Sinh viên</th>
                  <th scope="col" className="px-4 py-3.5">Mã sinh viên</th>
                  <th scope="col" className="px-4 py-3.5">Lớp</th>
                  <th scope="col" className="px-4 py-3.5">Trạng thái</th>
                  <th scope="col" className="px-5 py-3.5 sm:px-6">Ngày ghi danh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.studentId} className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-xs font-bold text-blue-800">
                          {initials(student.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{student.fullName}</p>
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
                            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {student.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-700">{student.studentCode}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{student.className}</td>
                    <td className="px-4 py-4"><StatusBadge status={student.status} /></td>
                    <td className="px-5 py-4 text-sm tabular-nums text-slate-600 sm:px-6">{formatDate(student.enrolledAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>Đang hiển thị {filteredStudents.length} / {students.length} sinh viên</span>
            <span className="inline-flex items-center gap-1.5"><CircleDashed className="h-3.5 w-3.5" aria-hidden="true" /> Trạng thái được cập nhật theo dữ liệu phòng</span>
          </div>
        </>
      )}
    </section>
  );
}
