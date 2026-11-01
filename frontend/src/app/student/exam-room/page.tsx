"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  CopyX,
  Eye,
  FileCode,
  FileText,
  HelpCircle,
  KeyRound,
  LoaderCircle,
  Lock,
  Maximize2,
  Minimize2,
  PhoneOff,
  Play,
  RotateCcw,
  Scan,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Unlock,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";

// Dữ liệu mẫu bài thi
const mockExamData = {
  id: "EXAM-101",
  title: "Kiểm tra Lập trình C++ & Thuật toán Cơ bản",
  subject: "Lập trình nâng cao (PRJ301)",
  durationMinutes: 60,
  roomCode: "OCL-C001",
  problems: [
    {
      id: "P1",
      title: "Bài 1: Tìm phần tử lớn thứ hai",
      points: 30,
      language: "cpp",
      description: `Cho mảng $A$ gồm $N$ số nguyên. Hãy viết chương trình tìm giá trị lớn thứ hai trong mảng.

### Đầu vào (Input):
- Dòng đầu tiên chứa số nguyên $N$ ($2 \\le N \\le 10^5$).
- Dòng thứ hai chứa $N$ số nguyên $A_i$ ($|A_i| \\le 10^9$).

### Đầu ra (Output):
- In ra một số nguyên duy nhất là giá trị lớn thứ hai trong mảng. Nếu không tồn tại, in ra \`-1\`.`,
      testcases: [
        { id: 1, input: "5\n10 5 20 20 8", expectedOutput: "10" },
        { id: 2, input: "4\n5 5 5 5", expectedOutput: "-1" },
        { id: 3, input: "3\n-10 -5 -20", expectedOutput: "-10" },
      ],
      initialCode: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    // Viết mã nguồn của bạn tại đây\n    return 0;\n}`,
    },
    {
      id: "P2",
      title: "Bài 2: Kiểm tra chuỗi Palindrome",
      points: 30,
      language: "cpp",
      description: `Viết chương trình kiểm tra một chuỗi ký tự nhập vào có phải là chuỗi đối xứng (Palindrome) hay không.

### Đầu vào (Input):
- Một dòng duy nhất chứa chuỗi $S$ ($1 \\le |S| \\le 10^4$).

### Đầu ra (Output):
- In ra \`YES\` nếu chuỗi là Palindrome, ngược lại in ra \`NO\`.`,
      testcases: [
        { id: 1, input: "radar", expectedOutput: "YES" },
        { id: 2, input: "oculide", expectedOutput: "NO" },
      ],
      initialCode: `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    // Viết mã nguồn của bạn tại đây\n    return 0;\n}`,
    },
    {
      id: "P3",
      title: "Bài 3: Tính tổng dãy số nguyên dương",
      points: 40,
      language: "cpp",
      description: `Cho số nguyên $N$. Hãy tính tổng các số nguyên dương từ 1 đến $N$.

### Đầu vào (Input):
- Một số nguyên $N$ ($1 \\le N \\le 10^9$).

### Đầu ra (Output):
- Tổng từ $1$ đến $N$.`,
      testcases: [
        { id: 1, input: "5", expectedOutput: "15" },
        { id: 2, input: "100", expectedOutput: "5050" },
      ],
      initialCode: `#include <iostream>\nusing namespace std;\n\nint main() {\n    long long n;\n    if (cin >> n) {\n        cout << n * (n + 1) / 2;\n    }\n    return 0;\n}`,
    },
  ],
};

type ExamState = "doing" | "confirm_submit" | "completed";

export default function ExamWorkspacePage() {
  const [examState, setExamState] = useState<ExamState>("doing");
  const [activeProblemIdx, setActiveProblemIdx] = useState(0);
  const [codes, setCodes] = useState<Record<string, string>>({
    P1: mockExamData.problems[0].initialCode,
    P2: mockExamData.problems[1].initialCode,
    P3: mockExamData.problems[2].initialCode,
  });
  const [selectedLanguage, setSelectedLanguage] = useState("cpp");
  const [timeLeft, setTimeLeft] = useState(mockExamData.durationMinutes * 60);

  // Cảnh báo AI & Đếm Vi Phạm
  const [pasteCount, setPasteCount] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [aiViolationCount, setAiViolationCount] = useState(0);
  const [warningToast, setWarningToast] = useState<string | null>(null);

  // Trạng thái Khóa / Treo Máy
  const [isLocked, setIsLocked] = useState(false);
  const [teacherPasscode, setTeacherPasscode] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

  // YOLOv8 AI Proctoring Camera Simulation State
  const [yoloDetections, setYoloDetections] = useState<{
    label: string;
    confidence: number;
    bbox: { x: number; y: number; w: number; h: number };
    status: "ok" | "warning" | "danger";
  }>({
    label: "person",
    confidence: 0.98,
    bbox: { x: 18, y: 15, w: 64, h: 70 },
    status: "ok",
  });

  // Console Testcases Logic
  const [activeTestTab, setActiveTestTab] = useState<number | "custom">(1);
  const [customInput, setCustomInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<
    Record<number, { status: "passed" | "failed"; actualOutput: string; time: string }>
  >({});

  const [isFullscreen, setIsFullscreen] = useState(false);
  const currentProblem = mockExamData.problems[activeProblemIdx];

  const totalViolations = pasteCount + tabSwitchCount + aiViolationCount;

  // Kiểm tra giới hạn 3 lần vi phạm -> KHÓA BÀI THI (TREO MÁY)
  useEffect(() => {
    if (totalViolations >= 3 && !isLocked && examState === "doing") {
      setIsLocked(true);
      showToast("BÀI THI BỊ KHÓA: Bạn đã vi phạm 3 lần! Đang chờ Giảng viên phê duyệt.");
    }
  }, [totalViolations, isLocked, examState]);
  //FULL SCREEN
  // Bổ sung useEffect này trong src/app/student/exam-room/page.tsx
useEffect(() => {
  // Tự động yêu cầu Fullscreen khi vừa vào trang thi
  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      // Trình duyệt yêu cầu tương tác người dùng trước khi vào fullscreen
    }
  };

  enterFullscreen();
}, []);

  // Đếm ngược thời gian
  useEffect(() => {
    if (examState !== "doing" || isLocked) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setExamState("completed");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examState, isLocked]);

  // Giả lập YOLOv8 AI Detection Engine (Object Detection & Pose Estimation)
  useEffect(() => {
    if (examState !== "doing" || isLocked) return;

    const interval = setInterval(() => {
      const rand = Math.random();

      if (rand < 0.12) {
        // YOLOv8 phát hiện điện thoại (Cell phone detected)
        setYoloDetections({
          label: "cell phone",
          confidence: 0.89,
          bbox: { x: 55, y: 40, w: 30, h: 45 },
          status: "danger",
        });
        setAiViolationCount((prev) => prev + 1);
        showToast("YOLOv8 AI: Phát hiện thiết bị di động trong khung hình!");
      } else if (rand < 0.25) {
        // YOLOv8 phát hiện quay mặt đi (Head pose deviation)
        setYoloDetections({
          label: "looking away",
          confidence: 0.92,
          bbox: { x: 10, y: 15, w: 60, h: 65 },
          status: "warning",
        });
        setAiViolationCount((prev) => prev + 1);
        showToast("YOLOv8 AI: Góc mặt quay khỏi màn hình làm bài > 5s!");
      } else if (rand < 0.32) {
        // YOLOv8 phát hiện mất khuôn mặt (No face detected)
        setYoloDetections({
          label: "no face",
          confidence: 0.0,
          bbox: { x: 0, y: 0, w: 0, h: 0 },
          status: "danger",
        });
        setAiViolationCount((prev) => prev + 1);
        showToast("YOLOv8 AI: Không tìm thấy thí sinh trước webcam!");
      } else {
        // YOLOv8 Trạng thái bình thường
        setYoloDetections({
          label: "person",
          confidence: 0.98,
          bbox: { x: 20, y: 15, w: 60, h: 70 },
          status: "ok",
        });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [examState, isLocked]);

  // Giám sát Chuyển Tab
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden && examState === "doing" && !isLocked) {
        setTabSwitchCount((prev) => prev + 1);
        showToast("CẢNH BÁO: Rời khỏi cửa sổ bài thi (Chuyển Tab)!");
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [examState, isLocked]);

  // Chặn Ctrl+V & Paste
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (isLocked) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) {
      e.preventDefault();
      setPasteCount((prev) => prev + 1);
      showToast("CẢNH BÁO CẤM DÁN: Hệ thống chặn dán code bên ngoài!");
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (isLocked) return;
    e.preventDefault();
    setPasteCount((prev) => prev + 1);
    showToast("CẢNH BÁO CẤM DÁN: Hệ thống chặn dán code bên ngoài!");
  }

  function showToast(msg: string) {
    setWarningToast(msg);
    setTimeout(() => setWarningToast(null), 4500);
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Logic Giảng viên mở khóa
  const handleTeacherUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError("");
    setIsUnlocking(true);

    setTimeout(() => {
      // Mã mặc định duyệt mở khóa là '1234' hoặc bấm nút Duyệt trực tiếp
      if (teacherPasscode === "1234" || teacherPasscode === "") {
        setIsLocked(false);
        setPasteCount(0);
        setTabSwitchCount(0);
        setAiViolationCount(0);
        setIsUnlocking(false);
        setTeacherPasscode("");
        showToast("ĐÃ MỞ KHÓA: Giảng viên đã duyệt bài thi. Tiếp tục làm bài!");
      } else {
        setIsUnlocking(false);
        setUnlockError("Mã phê duyệt Giảng viên không đúng (Thử mã: 1234)");
      }
    }, 800);
  };

  const handleRunAllTests = () => {
    setIsRunning(true);
    setTestResults({});

    setTimeout(() => {
      setIsRunning(false);
      const results: Record<number, { status: "passed" | "failed"; actualOutput: string; time: string }> = {};

      currentProblem.testcases.forEach((tc) => {
        const isPass = Math.random() > 0.25;
        results[tc.id] = {
          status: isPass ? "passed" : "failed",
          actualOutput: isPass ? tc.expectedOutput : "0",
          time: "0.0" + Math.floor(Math.random() * 8 + 1) + "s",
        };
      });

      setTestResults(results);
    }, 1000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col select-none relative overflow-hidden">
      {/* Toast Cảnh báo Nổi */}
      {warningToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 rounded-2xl border border-rose-500/50 bg-rose-950/90 px-4 py-3 text-xs font-semibold text-rose-200 shadow-2xl backdrop-blur-md animate-bounce">
          <ShieldAlert size={20} className="shrink-0 text-rose-400" />
          <span>{warningToast}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* HEADER BÀI THI */}
      {/* ------------------------------------------------------------------ */}
      <header className="h-16 shrink-0 border-b border-slate-800 bg-slate-950 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20">
            <Code2 size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
              {mockExamData.title}
            </h1>
            <p className="text-[11px] text-slate-400">
              Mã phòng: <span className="font-mono font-semibold text-blue-400">{mockExamData.roomCode}</span>
            </p>
          </div>
        </div>

        {/* Thanh Giám sát vi phạm */}
        <div className="flex items-center gap-3">
          {/* Bộ đếm tổng số lần vi phạm (Tối đa 3 lần) */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs">
            <span className="text-slate-400">Vi phạm:</span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded-md text-xs ${
                totalViolations >= 3
                  ? "bg-rose-500 text-white animate-pulse"
                  : totalViolations > 0
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {totalViolations} / 3 lần
            </span>
          </div>

          {/* Đồng hồ đếm ngược */}
          <div
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 border font-mono font-bold text-sm ${
              timeLeft < 300
                ? "bg-rose-500/10 border-rose-500/40 text-rose-400 animate-pulse"
                : "bg-slate-900 border-slate-800 text-blue-400"
            }`}
          >
            <Clock size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {examState === "doing" && !isLocked && (
            <button
              type="button"
              onClick={() => setExamState("confirm_submit")}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition active:scale-[0.98]"
            >
              <Send size={14} />
              <span>Nộp bài</span>
            </button>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* PHASE 1: WORKSPACE (LÀM BÀI + CAMERA YOLOv8 AI) */}
      {/* ------------------------------------------------------------------ */}
      {examState === "doing" && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden relative">
          {/* CỘT TRÁI: ĐỀ BÀI & ĐIỀU HƯỚNG CÂU HỎI (5/12) */}
          <div className="lg:col-span-5 flex flex-col border-r border-slate-800 bg-slate-950/60 overflow-hidden relative">
            {/* Tabs chọn câu hỏi */}
            <div className="flex items-center gap-1 border-b border-slate-800 bg-slate-900/50 p-2 overflow-x-auto scrollbar-none">
              {mockExamData.problems.map((prob, idx) => {
                const isAnswered = (codes[prob.id] ?? "").trim().length > 30;
                return (
                  <button
                    key={prob.id}
                    type="button"
                    disabled={isLocked}
                    onClick={() => {
                      setActiveProblemIdx(idx);
                      setActiveTestTab(1);
                    }}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition shrink-0 ${
                      activeProblemIdx === idx
                        ? "bg-blue-600 text-white"
                        : "bg-slate-900/80 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <FileText size={14} />
                    <span>Câu {idx + 1}</span>
                    {isAnswered ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Nội dung câu hỏi */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-slate-300 text-xs sm:text-sm leading-relaxed pb-16">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white">
                  {currentProblem.title}
                </h2>
                <span className="rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
                  {currentProblem.points} Điểm
                </span>
              </div>

              <div className="whitespace-pre-line text-slate-300 font-sans">
                {currentProblem.description}
              </div>

              {/* Sample Testcase */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ví dụ mẫu (Sample Testcase):
                </h3>
                {currentProblem.testcases.slice(0, 1).map((tc) => (
                  <div key={tc.id} className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 space-y-1">
                      <p className="text-[10px] font-sans font-bold text-slate-400">Input mẫu:</p>
                      <pre className="text-emerald-400 whitespace-pre-wrap">{tc.input}</pre>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 space-y-1">
                      <p className="text-[10px] font-sans font-bold text-slate-400">Output kỳ vọng:</p>
                      <pre className="text-blue-400 whitespace-pre-wrap">{tc.expectedOutput}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Điều hướng Câu trước / Câu tiếp theo */}
            <div className="absolute bottom-0 left-0 right-0 h-14 border-t border-slate-800 bg-slate-950 p-2.5 flex items-center justify-between">
              <button
                type="button"
                disabled={activeProblemIdx === 0 || isLocked}
                onClick={() => {
                  setActiveProblemIdx((prev) => Math.max(0, prev - 1));
                  setActiveTestTab(1);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronLeft size={16} /> Câu trước
              </button>

              <span className="text-xs font-mono font-semibold text-slate-500">
                {activeProblemIdx + 1} / {mockExamData.problems.length}
              </span>

              {activeProblemIdx < mockExamData.problems.length - 1 ? (
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    setActiveProblemIdx((prev) => Math.min(mockExamData.problems.length - 1, prev + 1));
                    setActiveTestTab(1);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 transition shadow-xs disabled:opacity-40"
                >
                  Câu tiếp theo <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setExamState("confirm_submit")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-xs disabled:opacity-40"
                >
                  Hoàn thành <Send size={14} />
                </button>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: TRÌNH SOẠN THẢO CODE, WEBCAM AI YOLOv8 & CONSOLE (7/12) */}
          <div className="lg:col-span-7 flex flex-col bg-slate-900 overflow-hidden relative">
            {/* ------------------------------------------------------------------ */}
            {/* CAMERA GIÁM SÁT MODEL YOLOv8 REAL-TIME AI */}
            {/* ------------------------------------------------------------------ */}
            <div className="absolute top-3 right-4 z-20 flex flex-col items-end gap-1">
              <div className="relative h-28 w-40 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 p-1 shadow-2xl backdrop-blur-md">
                {/* Giả lập Luồng Video Camera */}
                <div className="relative h-full w-full rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center">
                  <Camera size={24} className="text-slate-600" />

                  {/* Khung Bounding Box nhận diện AI của YOLOv8 */}
                  {yoloDetections.bbox.w > 0 && (
                    <div
                      className={`absolute border-2 transition-all duration-300 ${
                        yoloDetections.status === "ok"
                          ? "border-emerald-400 bg-emerald-500/10"
                          : yoloDetections.status === "warning"
                          ? "border-amber-400 bg-amber-500/20"
                          : "border-rose-500 bg-rose-500/30 animate-pulse"
                      }`}
                      style={{
                        left: `${yoloDetections.bbox.x}%`,
                        top: `${yoloDetections.bbox.y}%`,
                        width: `${yoloDetections.bbox.w}%`,
                        height: `${yoloDetections.bbox.h}%`,
                      }}
                    >
                      {/* Nhãn Confidence YOLOv8 */}
                      <span
                        className={`absolute -top-4 left-0 rounded px-1 text-[9px] font-mono font-bold uppercase text-white ${
                          yoloDetections.status === "ok"
                            ? "bg-emerald-600"
                            : yoloDetections.status === "warning"
                            ? "bg-amber-600"
                            : "bg-rose-600"
                        }`}
                      >
                        {yoloDetections.label} {Math.round(yoloDetections.confidence * 100)}%
                      </span>
                    </div>
                  )}

                  {/* HUD Overlay thông số YOLOv8 */}
                  <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[8px] font-mono text-slate-400 bg-slate-950/80 px-1 py-0.5 rounded">
                    <span>YOLOv8n-pose</span>
                    <span className="text-emerald-400 font-bold">30 FPS</span>
                  </div>
                </div>
              </div>

              {/* Trạng thái AI Proctoring */}
              <div className="rounded-lg bg-slate-950/90 border border-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 flex items-center gap-1.5">
                <Scan size={12} className="text-blue-400 animate-spin" />
                <span>AI Vision: Active</span>
              </div>
            </div>

            {/* IDE Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <FileCode size={15} className="text-blue-400" /> Ngôn ngữ:
                </span>
                <select
                  value={selectedLanguage}
                  disabled={isLocked}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value="cpp">C++ (GCC 11)</option>
                  <option value="python">Python 3.10</option>
                  <option value="java">Java 17</option>
                </select>
              </div>

              <button
                type="button"
                disabled={isLocked}
                onClick={() =>
                  setCodes((prev) => ({
                    ...prev,
                    [currentProblem.id]: currentProblem.initialCode,
                  }))
                }
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 transition pr-44 sm:pr-0"
              >
                <RotateCcw size={12} /> Đặt lại
              </button>
            </div>

            {/* Trình soạn thảo Code */}
            <div className="flex-1 relative flex bg-slate-950 font-mono text-xs sm:text-sm">
              <div className="w-10 select-none border-r border-slate-800/80 bg-slate-950/80 py-3 text-right pr-2.5 text-slate-600 space-y-1 font-mono">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              <textarea
                value={codes[currentProblem.id] ?? ""}
                disabled={isLocked}
                onChange={(e) =>
                  setCodes((prev) => ({
                    ...prev,
                    [currentProblem.id]: e.target.value,
                  }))
                }
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                spellCheck={false}
                className="flex-1 resize-none bg-transparent p-3 text-slate-100 outline-none font-mono leading-relaxed placeholder:text-slate-700 disabled:opacity-30"
                placeholder="// Viết mã nguồn của bạn tại đây (Hệ thống chặn Ctrl+V)..."
              />
            </div>

            {/* CONSOLE & TESTCASE RUNNER */}
            <div className="h-52 shrink-0 border-t border-slate-800 bg-slate-950/95 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5 text-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {currentProblem.testcases.map((tc) => {
                    const res = testResults[tc.id];
                    return (
                      <button
                        key={tc.id}
                        type="button"
                        disabled={isLocked}
                        onClick={() => setActiveTestTab(tc.id)}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          activeTestTab === tc.id
                            ? "bg-slate-800 text-white border border-slate-700"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span>Testcase {tc.id}</span>
                        {res && (
                          res.status === "passed" ? (
                            <CheckCircle2 size={12} className="text-emerald-400" />
                          ) : (
                            <XCircle size={12} className="text-rose-400" />
                          )
                        )}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => setActiveTestTab("custom")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      activeTestTab === "custom"
                        ? "bg-slate-800 text-white border border-slate-700"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Tự nhập Input
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRunAllTests}
                  disabled={isRunning || isLocked}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition active:scale-[0.98] disabled:opacity-50 shrink-0"
                >
                  {isRunning ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <Play size={14} />
                  )}
                  <span>Chạy thử Testcases</span>
                </button>
              </div>

              {/* Console Body */}
              <div className="flex-1 p-3 font-mono text-xs overflow-y-auto text-slate-300">
                {typeof activeTestTab === "number" ? (
                  (() => {
                    const tc = currentProblem.testcases.find((t) => t.id === activeTestTab);
                    const res = testResults[activeTestTab];
                    if (!tc) return null;

                    return (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-[10px] font-sans font-bold text-slate-500 mb-1">Input:</p>
                            <pre className="rounded-lg bg-slate-900 p-2 text-slate-200 border border-slate-800">{tc.input}</pre>
                          </div>
                          <div>
                            <p className="text-[10px] font-sans font-bold text-slate-500 mb-1">Output kỳ vọng:</p>
                            <pre className="rounded-lg bg-slate-900 p-2 text-blue-400 border border-slate-800">{tc.expectedOutput}</pre>
                          </div>
                        </div>

                        {res && (
                          <div className="pt-2 border-t border-slate-800/80 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-sans font-bold text-slate-400">Kết quả:</span>
                              {res.status === "passed" ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                                  <CheckCircle2 size={13} /> PASSED ({res.time})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                                  <XCircle size={13} /> FAILED ({res.time})
                                </span>
                              )}
                            </div>
                            <pre className="rounded-lg bg-slate-900 p-2 text-slate-200 border border-slate-800">
                              {res.actualOutput}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-sans font-bold text-slate-500">Tự nhập Input để kiểm thử:</p>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      disabled={isLocked}
                      placeholder="Nhập dữ liệu testcase..."
                      className="w-full h-16 rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs font-mono text-slate-200 outline-none focus:border-blue-500 disabled:opacity-30"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* MÀN HÌNH MÁY BỊ KHÓA / TREO BÀI THI (LOCKED OVERLAY) */}
          {/* ------------------------------------------------------------------ */}
          {isLocked && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4">
              <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-slate-900 p-6 shadow-2xl space-y-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
                  <Lock size={32} />
                </div>

                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/20">
                    <ShieldAlert size={14} /> BÀI THI BỊ TREO TẠM THỜI
                  </span>
                  <h2 className="text-xl font-bold text-white">
                    Đã vượt quá 3 lần vi phạm
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Hệ thống AI đã khóa màn hình làm bài do ghi nhận 3 sự kiện vi phạm quy chế (Chuyển tab, Dán code hoặc quay mặt khỏi webcam).
                  </p>
                </div>

                {/* Danh sách vi phạm đã ghi nhận */}
                <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 text-xs space-y-2 text-left">
                  <p className="font-bold text-slate-300">Nhật ký vi phạm bài thi:</p>
                  <div className="flex justify-between text-slate-400">
                    <span>• Lần rời tab/cửa sổ:</span>
                    <span className="font-bold font-mono text-rose-400">{tabSwitchCount} lần</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>• Lần cố gắng dán code:</span>
                    <span className="font-bold font-mono text-amber-400">{pasteCount} lần</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>• Cảnh báo YOLOv8 AI Cam:</span>
                    <span className="font-bold font-mono text-rose-400">{aiViolationCount} lần</span>
                  </div>
                </div>

                {/* Form Nhập mã giải khóa của Giảng viên */}
                <form onSubmit={handleTeacherUnlock} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-left text-[11px] font-semibold text-slate-400 mb-1">
                      Mã phê duyệt Giảng viên (Thử: <code className="text-blue-400 font-bold">1234</code>)
                    </label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="password"
                        value={teacherPasscode}
                        onChange={(e) => setTeacherPasscode(e.target.value)}
                        placeholder="Nhập PIN giải khóa..."
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-xs font-mono text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {unlockError && (
                    <p className="text-xs text-rose-400 font-medium">{unlockError}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isUnlocking}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition shadow-sm"
                    >
                      {isUnlocking ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Unlock size={14} /> Mở khóa bài thi
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTeacherPasscode("1234");
                      }}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                    >
                      Điền mã mẫu
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* PHASE 2: CONFIRM SUBMIT MODAL */}
      {/* ------------------------------------------------------------------ */}
      {examState === "confirm_submit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertOctagon size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Xác nhận nộp bài thi</h2>
                <p className="text-xs text-slate-400">Kiểm tra lại trạng thái các câu hỏi</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {mockExamData.problems.map((prob, idx) => {
                const isAnswered = (codes[prob.id] ?? "").trim().length > 30;
                return (
                  <div key={prob.id} className="flex items-center justify-between rounded-xl bg-slate-950 p-3 border border-slate-800">
                    <span className="font-semibold text-slate-200">Câu {idx + 1}: {prob.title}</span>
                    {isAnswered ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                        <CheckCircle2 size={13} /> Đã làm
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                        <HelpCircle size={13} /> Chưa làm
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExamState("doing")}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Quay lại làm bài
              </button>
              <button
                type="button"
                onClick={() => setExamState("completed")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-sm"
              >
                <Send size={14} /> Nộp bài ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* PHASE 3: COMPLETED SCREEN */}
      {/* ------------------------------------------------------------------ */}
      {examState === "completed" && (
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 p-6 sm:p-8 text-center space-y-6 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20 mb-2">
                <Sparkles size={13} /> ĐÃ NỘP BÀI THÀNH CÔNG
              </span>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">Hoàn thành bài thi!</h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                Mã nguồn của bạn đã được ghi nhận vào hệ thống Oculide.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-1">
                <p className="text-slate-500">Số lần Cố gắng Dán code</p>
                <p className="font-mono font-bold text-amber-400 text-sm">{pasteCount} lần</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-1">
                <p className="text-slate-500">Số lần Rời Tab / Cửa sổ</p>
                <p className="font-mono font-bold text-rose-400 text-sm">{tabSwitchCount} lần</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/student/submissions"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition"
              >
                Xem danh sách bài nộp
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/student"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-5 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}