"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { fetchWithAuth } from "@/services/apiClient";
import {
  ArrowLeft,
  Code2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Clock3,
  Cpu,
  HardDrive,
  FileCode2,
  Download,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";

// Định nghĩa kiểu dữ liệu cho chi tiết Test Case
export interface TestCaseResult {
  id: number;
  name: string;
  status: "AC" | "WA" | "TLE" | "RTE" | "MLE";
  statusText: string;
  runtime: string;
  memory: string;
  scoreEarned: number;
  scoreMax: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  diffNote?: string;
}

// Định nghĩa kiểu dữ liệu cho Bài Nộp chi tiết
export interface SubmissionDetail {
  id: string;
  problemCode: string;
  problemTitle: string;
  authorName: string;
  authorUsername: string;
  authorMssv: string;
  roomName?: string;
  roomCode?: string;
  className?: string;
  courseName?: string;
  submittedAt: string;
  language: string;
  compiler: string;
  status: "accepted" | "failed" | "pending";
  scoreEarned: number;
  scoreMax: number;
  pointsScaled: string; // e.g. "8,000 / 10,000 điểm"
  maxRuntime: string;
  maxMemory: string;
  code: string;
  testCases: TestCaseResult[];
}

export default function SubmissionDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Nhận dạng submission ID từ route dynamic
  const rawId = (params?.id as string) || "";
  const [apiSubmission, setApiSubmission] = useState<SubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!rawId || !/^\d+$/.test(rawId)) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    async function loadSubmissionDetail() {
      setIsLoading(true);
      try {
        const data = await fetchWithAuth<{
          submission_id: number;
          room_id?: number;
          room_code?: string;
          room_name?: string;
          class_name?: string;
          course_name?: string;
          question_id: number;
          question_title?: string;
          student_name?: string;
          student_code?: string;
          submitted_at: string;
          language: string;
          status: string;
          total_points?: number;
          max_points?: number;
          score_percentage?: number;
          code_content: string;
          grading_results?: Array<{
            result_id: number;
            test_case_id: number;
            is_passed: boolean;
            is_hidden?: boolean;
            input_data?: string | null;
            expected_output?: string | null;
            actual_output?: string | null;
            execution_time_ms?: number | null;
            memory_used_mb?: number | null;
            error_message?: string | null;
          }>;
        }>(`/api/v1/submissions/${rawId}`);
        if (cancelled || !data) return;

        const results = data.grading_results || [];
        const maxTimeMs = results.reduce((m, r) => Math.max(m, r.execution_time_ms || 0), 0);
        const maxMemMb = results.reduce((m, r) => Math.max(m, r.memory_used_mb || 0), 0);
        const pct = data.score_percentage ?? 0;
        const mappedStatus: "accepted" | "failed" | "pending" =
          data.status === "completed"
            ? pct >= 100
              ? "accepted"
              : "failed"
            : data.status === "failed"
            ? "failed"
            : "pending";

        setApiSubmission({
          id: String(data.submission_id),
          problemCode: `Q-${data.question_id}`,
          problemTitle: data.question_title || `Câu hỏi #${data.question_id}`,
          authorName: data.student_name || "Sinh viên",
          authorUsername: data.student_code || "",
          authorMssv: data.student_code || "",
          roomName: data.room_name,
          roomCode: data.room_code,
          className: data.class_name,
          courseName: data.course_name,
          submittedAt: new Date(data.submitted_at).toLocaleString("vi-VN"),
          language: data.language,
          compiler: data.language.toUpperCase(),
          status: mappedStatus,
          scoreEarned: results.filter((r) => r.is_passed).length,
          scoreMax: results.length || 1,
          pointsScaled: `${data.total_points ?? 0} / ${data.max_points ?? 10} điểm (${pct}%)`,
          maxRuntime: `${(maxTimeMs / 1000).toFixed(3)}s`,
          maxMemory: `${maxMemMb.toFixed(2)} MB`,
          code: data.code_content || "",
          testCases: results.map((r, idx) => ({
            id: idx + 1,
            name: r.is_hidden ? `Test case #${idx + 1} (Ẩn)` : `Test case #${idx + 1}`,
            status: r.is_passed ? "AC" : "WA",
            statusText: r.is_passed ? "Chính xác (AC)" : "Chưa đạt (WA)",
            runtime: `${((r.execution_time_ms || 0) / 1000).toFixed(3)}s`,
            memory: `${(r.memory_used_mb || 0).toFixed(2)} MB`,
            scoreEarned: r.is_passed ? 1 : 0,
            scoreMax: 1,
            input: r.is_hidden ? "[Test case ẩn]" : (r.input_data ?? ""),
            expectedOutput: r.is_hidden ? "[Test case ẩn]" : (r.expected_output ?? ""),
            actualOutput: r.actual_output || r.error_message || "",
            diffNote: r.is_passed ? "Đạt" : r.error_message || "Kết quả chưa khớp",
          })),
        });
      } catch {
        setApiSubmission(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    loadSubmissionDetail();
    return () => {
      cancelled = true;
    };
  }, [rawId]);

  const submission = apiSubmission;

  // Tab đang kích hoạt: "result" (Xem kết quả) hoặc "code" (Xem code)
  const queryTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"result" | "code">(
    queryTab === "code" ? "code" : "result"
  );

  // Chế độ xem mã nguồn thô (Raw text view)
  const [isRawView, setIsRawView] = useState<boolean>(false);

  // Trạng thái copy mã nguồn
  const [copied, setCopied] = useState<boolean>(false);

  // Trạng thái đóng/mở từng test case trong danh sách kết quả (Accordion)
  const [expandedTestCases, setExpandedTestCases] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
    5: true, // Mặc định mở test case bị lỗi để thí sinh tiện phân tích
  });

  // Toggle Accordion cho test case
  const toggleTestCase = (tcId: number) => {
    setExpandedTestCases((prev) => ({
      ...prev,
      [tcId]: !prev[tcId],
    }));
  };

  // Mở/Đóng tất cả test cases
  const toggleAllTestCases = (open: boolean) => {
    if (!submission) return;
    const updated: Record<number, boolean> = {};
    submission.testCases.forEach((tc) => {
      updated[tc.id] = open;
    });
    setExpandedTestCases(updated);
  };

  // Xử lý sao chép code vào bộ nhớ đệm
  const handleCopyCode = async () => {
    if (!submission) return;
    try {
      await navigator.clipboard.writeText(submission.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback nếu clipboard API bị chặn
      const textarea = document.createElement("textarea");
      textarea.value = submission.code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Tải file mã nguồn về máy
  const handleDownloadCode = () => {
    if (!submission) return;
    const extension = submission.language.toLowerCase().includes("python")
      ? ".py"
      : submission.language.toLowerCase().includes("java")
      ? ".java"
      : ".cpp";
    const blob = new Blob([submission.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${submission.problemCode}_solution${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Chuyển tab và cập nhật query URL
  const handleSelectTab = (tab: "result" | "code") => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Tính số dòng mã nguồn
  const codeLines = useMemo(() => {
    return submission ? submission.code.split("\n") : [];
  }, [submission]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1600px] flex min-h-[400px] flex-col items-center justify-center p-8 space-y-4">
        <LoaderCircle className="h-8 w-8 animate-spin text-slate-700 dark:text-slate-300" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Đang tải chi tiết bài nộp...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <Link
            href="/student/submissions"
            className="inline-flex items-center gap-1.5 font-medium hover:text-brand-700 dark:text-slate-500 dark:hover:text-brand-200 transition"
          >
            <ArrowLeft size={14} />
            <span>Quay lại danh sách bài làm</span>
          </Link>
        </div>
        <div className="rounded-md border border-slate-300 bg-white p-12 text-center space-y-4 dark:border-white/10 dark:bg-neutral-900">
          <FileCode2 className="h-12 w-12 text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Không tìm thấy bài nộp #{rawId}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Bài nộp không tồn tại trong hệ thống hoặc bạn không có quyền xem chi tiết bài làm này.
          </p>
          <div className="pt-2">
            <Link
              href="/student/submissions"
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              <ArrowLeft size={14} />
              <span>Xem lịch sử bài làm</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* ─── Breadcrumb & Điều hướng quay lại ───────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Link
            href="/student/submissions"
            className="inline-flex items-center gap-1.5 font-medium hover:text-brand-700 dark:text-slate-500 dark:hover:text-brand-200 transition"
          >
            <ArrowLeft size={14} />
            <span>Danh sách bài làm</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
            {submission.id}
          </span>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-slate-900 dark:text-white font-bold">
            {activeTab === "code" ? "Xem mã nguồn" : "Xem kết quả chạy"}
          </span>
        </div>

        {/* Trạng thái chấm của Sandbox */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span>Docker Sandbox v1.0.0 (Chấm cô lập)</span>
        </div>
      </div>

      {/* ─── Header Tiêu Đề Bài Làm (Mô phỏng 100% Header ảnh tham khảo) ─── */}
      <header className="rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-sm transition">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2">
            {/* Tiêu đề chính: Bài làm [mã] [tên bài] của [tác giả] */}
            <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#2A282D] dark:text-[#ede8e9]">
              Bài làm{" "}
              <span className="font-mono text-brand-700 dark:text-brand-200">
                {submission.problemCode}
              </span>{" "}
              <span>{submission.problemTitle}</span> của{" "}
              <span className="text-brand-700 dark:text-brand-200 hover:underline cursor-pointer">
                {submission.authorUsername}
              </span>
            </h1>

            {/* Thông tin phụ: Tác giả, MSSV, Phòng thi */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Họ tên: <strong className="text-slate-900 dark:text-white">{submission.authorName}</strong>
              </span>
              <span>•</span>
              <span className="font-mono">MSSV: {submission.authorMssv}</span>
              <span>•</span>
              <span className="rounded-md border border-brand-300 bg-brand-50 px-2 py-0.5 font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
                {submission.courseName || submission.className || submission.roomName || "Bài thực hành trực tuyến"}
              </span>
            </div>
          </div>

          {/* Cột phải: Thời gian nộp & Ngôn ngữ lập trình */}
          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-1 text-xs shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-white/5">
            <span className="inline-flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-300 tabular-nums">
              <Clock3 size={13} className="text-slate-400" />
              {submission.submittedAt}
            </span>
            <span className="rounded-md bg-brand px-2.5 py-1 font-mono text-xs font-bold text-white shadow-sm">
              {submission.language}
            </span>
          </div>
        </div>

        {/* ─── Thanh Liên Kết Điều Hướng Hành Động (Action Links) ───────── */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
          {/* Nhóm liên kết thao tác chuyển đổi giao diện (Giống ảnh gốc: Xem kết quả / Xem code / Nộp lại) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-[13px] font-semibold">
            {activeTab === "code" ? (
              <button
                type="button"
                onClick={() => handleSelectTab("result")}
                className="inline-flex items-center gap-1.5 text-brand-700 dark:text-brand-200 hover:text-brand-600 dark:hover:text-brand-100 transition underline underline-offset-4"
              >
                <CheckCircle2 size={14} />
                <span>Xem kết quả</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSelectTab("code")}
                className="inline-flex items-center gap-1.5 text-brand-700 dark:text-brand-200 hover:text-brand-600 dark:hover:text-brand-100 transition underline underline-offset-4"
              >
                <Code2 size={14} />
                <span>Xem code</span>
              </button>
            )}

            {/* Nút Xem mã nguồn thô (chỉ hiện khi đang ở tab Xem Code) */}
            {activeTab === "code" && (
              <>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={() => setIsRawView(!isRawView)}
                  className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-brand-700 dark:hover:text-brand-200 transition"
                >
                  <FileCode2 size={14} />
                  <span>{isRawView ? "Xem mã tô màu cú pháp" : "Xem mã nguồn thô"}</span>
                </button>
              </>
            )}

            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={13} />
              <span>Đã hoàn thành nộp bài</span>
            </span>
          </div>

          {/* Các nút công cụ bổ trợ (Tải về / Sao chép mã) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCode}
              title="Tải mã nguồn về máy"
              className="h-9 inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-white/10 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Tải mã nguồn</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCode}
              className={`h-9 inline-flex items-center gap-1.5 rounded-md px-3 text-xs font-bold transition active:scale-95 ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-brand text-white hover:bg-brand-600 shadow-sm"
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? "Đã sao chép!" : "Copy"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── TAB 1: XEM KẾT QUẢ CHẠY (RUN RESULTS VIEW - MATCHING IMAGE 2) ─── */}
      {activeTab === "result" && (
        <section className="space-y-6">
          <div className="rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-sm">
            {/* Tiêu đề mục Kết quả */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Kết quả</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  (Tổng quan trạng thái từng test case)
                </span>
              </h2>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => toggleAllTestCases(true)}
                  className="text-slate-500 hover:text-brand-700 dark:hover:text-brand-200 transition"
                >
                  Mở tất cả
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => toggleAllTestCases(false)}
                  className="text-slate-500 hover:text-brand-700 dark:hover:text-brand-200 transition"
                >
                  Thu gọn
                </button>
              </div>
            </div>

            {/* Dãy biểu tượng trạng thái nhanh (✔ ✔ ✔ ✔ ✖ - giống hệt ảnh tham khảo) */}
            <div className="my-5 flex flex-wrap items-center gap-2.5">
              {submission.testCases.map((tc) => (
                <button
                  key={tc.id}
                  type="button"
                  onClick={() => toggleTestCase(tc.id)}
                  title={`${tc.name}: ${tc.statusText} [${tc.runtime}, ${tc.memory}]`}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-md font-bold text-sm transition-transform active:scale-95 ${
                    tc.status === "AC"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 hover:bg-emerald-100"
                      : "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30 hover:bg-rose-100"
                  }`}
                >
                  {tc.status === "AC" ? "✔" : "✖"}
                </button>
              ))}
              <span className="ml-2 font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                ({submission.scoreEarned}/{submission.scoreMax} Test cases đạt)
              </span>
            </div>

            {/* Danh sách từng Test Case dạng Accordion chi tiết */}
            <div className="space-y-2.5 font-mono text-xs">
              {submission.testCases.map((tc) => {
                const isExpanded = !!expandedTestCases[tc.id];
                const isSuccess = tc.status === "AC";

                return (
                  <div
                    key={tc.id}
                    className={`rounded-md border transition-all ${
                      isSuccess
                        ? "border-emerald-200/80 bg-emerald-50/20 dark:border-emerald-500/20 dark:bg-emerald-500/[0.03]"
                        : "border-rose-200/90 bg-rose-50/30 dark:border-rose-500/30 dark:bg-rose-500/[0.04]"
                    }`}
                  >
                    {/* Header của dòng test case (chuẩn giao diện ảnh tham khảo) */}
                    <button
                      type="button"
                      onClick={() => toggleTestCase(tc.id)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded-md transition"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {tc.name}:
                        </span>
                        <span
                          className={`font-bold ${
                            isSuccess
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {tc.statusText}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                          [{tc.runtime}, {tc.memory}]
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          ({tc.scoreEarned}/{tc.scoreMax})
                        </span>
                      </div>

                      <span
                        className={`text-[11px] font-sans font-bold px-2 py-0.5 rounded-md ${
                          isSuccess
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300"
                        }`}
                      >
                        {tc.status}
                      </span>
                    </button>

                    {/* Chi tiết dữ liệu kiểm thử khi mở rộng */}
                    {isExpanded && (
                      <div className="p-4 pt-1 border-t border-slate-200/60 dark:border-white/5 space-y-3 font-sans text-xs">
                        {/* Lưới Input & Output */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          {/* Đầu vào (Input) */}
                          <div className="space-y-1">
                            <span className="font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                              Dữ liệu đầu vào (Input):
                            </span>
                            <pre className="font-mono text-xs rounded-md bg-slate-900 text-slate-100 p-2.5 overflow-x-auto border border-slate-800">
                              {tc.input}
                            </pre>
                          </div>

                          {/* Kết quả mong đợi (Expected Output) */}
                          <div className="space-y-1">
                            <span className="font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                              Kết quả mong đợi (Expected Output):
                            </span>
                            <pre className="font-mono text-xs rounded-md bg-slate-900 text-emerald-400 p-2.5 overflow-x-auto border border-slate-800">
                              {tc.expectedOutput}
                            </pre>
                          </div>
                        </div>

                        {/* Kết quả thực tế (Actual Output) */}
                        <div className="space-y-1">
                          <span className="font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                            Kết quả thực tế của chương trình (Your Output):
                          </span>
                          <pre
                            className={`font-mono text-xs rounded-md p-2.5 overflow-x-auto border ${
                              isSuccess
                                ? "bg-slate-900 text-emerald-300 border-slate-800"
                                : "bg-slate-900 text-rose-300 border-rose-900/50"
                            }`}
                          >
                            {tc.actualOutput}
                          </pre>
                        </div>

                        {/* Ghi chú sai lệch (Diff note) */}
                        {tc.diffNote && (
                          <div
                            className={`p-2.5 rounded-md border text-xs flex items-start gap-2 ${
                              isSuccess
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20"
                                : "bg-amber-50 text-amber-900 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20"
                            }`}
                          >
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            <span>
                              <strong>Phân tích hệ thống:</strong> {tc.diffNote}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─── Khối Tổng Kết Tài Nguyên & Điểm Số Cuối Cùng (KPI Summary) ─ */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/5 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-white">Tài nguyên:</span>
                <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  {submission.maxRuntime}, {submission.maxMemory}
                </span>
                <span className="text-slate-400 text-xs">(Thời gian chạy cao nhất và dung lượng RAM đỉnh)</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="font-bold text-slate-900 dark:text-white">Điểm cuối cùng:</span>
                <span className="font-bold font-mono text-slate-900 dark:text-slate-500 dark:text-blue-400">
                  {submission.scoreEarned}/{submission.scoreMax} ({submission.pointsScaled})
                </span>
              </div>

              {/* Progress bar trực quan */}
              <div className="pt-2">
                <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-2.5 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-2.5 transition-all duration-500"
                    style={{
                      width: `${(submission.scoreEarned / submission.scoreMax) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-rose-500 h-2.5 transition-all duration-500"
                    style={{
                      width: `${
                        ((submission.scoreMax - submission.scoreEarned) /
                          submission.scoreMax) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── TAB 2: XEM MÃ NGUỒN (CODE VIEWER - MATCHING IMAGE 1) ────────── */}
      {activeTab === "code" && (
        <section className="space-y-4">
          {/* Header của Code Viewer Box */}
          <div className="rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <FileCode2 size={15} className="text-slate-900 dark:text-slate-500 dark:text-blue-400" />
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  solution.cpp
                </span>
                <span className="text-slate-400">({codeLines.length} dòng, {submission.code.length} bytes)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-1 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copied ? "Đã copy" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Nội dung Code (chế độ Raw hoặc Tô màu có số dòng) */}
            {isRawView ? (
              <div className="p-4 bg-slate-950 font-mono text-xs text-slate-200 overflow-x-auto">
                <pre className="select-all leading-6">{submission.code}</pre>
              </div>
            ) : (
              <div className="flex overflow-x-auto bg-[#ffffff] dark:bg-[#0d1117] font-mono text-[13px] leading-6">
                {/* Cột Số Dòng (Line numbers) */}
                <div className="select-none py-4 px-3 text-right bg-slate-50/70 dark:bg-white/[0.02] border-r border-slate-200/80 dark:border-white/10 text-slate-400 dark:text-slate-600 min-w-[44px]">
                  {codeLines.map((_, idx) => (
                    <div key={idx} className="tabular-nums">
                      {idx + 1}
                    </div>
                  ))}
                </div>

                {/* Cột Nội Dung Code (Tô màu cú pháp cơ bản) */}
                <div className="py-4 px-4 flex-1 text-slate-900 dark:text-slate-100 whitespace-pre overflow-x-auto">
                  {codeLines.map((line, idx) => (
                    <div key={idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                      {renderSyntaxLine(line)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── Footer Bản Quyền Học Thuật ─────────────────────────────────── */}
      <footer className="text-center text-xs text-slate-500 dark:text-slate-400 pt-4">
        <span>Mã nguồn hệ thống Oculide LMS phát triển cho đề tài NCKH 2026</span>
        <span className="mx-2">•</span>
        <span>Phòng thực hành lập trình & Giám sát thi AI</span>
      </footer>
    </div>
  );
}

// Hàm hỗ trợ tô màu cú pháp nhẹ nhàng cho ngôn ngữ C++ / Java / Python (Syntax Styler)
function renderSyntaxLine(line: string) {
  if (line.trim().startsWith("//")) {
    return <span className="text-slate-400 dark:text-slate-500 italic">{line}</span>;
  }
  if (line.trim().startsWith("#include")) {
    return (
      <span>
        <span className="text-purple-600 dark:text-purple-400 font-semibold">#include</span>{" "}
        <span className="text-emerald-600 dark:text-emerald-400">
          {line.substring(line.indexOf("<") !== -1 ? line.indexOf("<") : 8)}
        </span>
      </span>
    );
  }
  if (line.includes("using namespace std;")) {
    return (
      <span>
        <span className="text-purple-600 dark:text-purple-400 font-semibold">using namespace</span>{" "}
        <span className="text-slate-900 dark:text-slate-500 dark:text-blue-400">std</span>;
      </span>
    );
  }

  // Tokenize đơn giản
  const parts = line.split(/(\b(?:int|long|char|string|void|bool|float|double|return|if|else|while|for|cin|cout)\b|"[^"]*")/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (/^(int|long|char|string|void|bool|float|double)$/.test(part)) {
          return (
            <span key={i} className="text-slate-900 dark:text-slate-500 dark:text-blue-400 font-semibold">
              {part}
            </span>
          );
        }
        if (/^(return|if|else|while|for)$/.test(part)) {
          return (
            <span key={i} className="text-purple-600 dark:text-purple-400 font-semibold">
              {part}
            </span>
          );
        }
        if (/^(cin|cout)$/.test(part)) {
          return (
            <span key={i} className="text-teal-600 dark:text-teal-400 font-semibold">
              {part}
            </span>
          );
        }
        if (part.startsWith('"') && part.endsWith('"')) {
          return (
            <span key={i} className="text-emerald-600 dark:text-emerald-400">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
