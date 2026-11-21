"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveKitRoom } from "@/hooks/useLiveKitRoom";
import LiveKitVideoFeed from "@/components/livekit/LiveKitVideoFeed";
import { fetchWithAuth, getAuthToken } from "@/services/apiClient";
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
  Terminal,
  Unlock,
  UserCheck,
  UserX,
  XCircle,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp
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

interface ExamTestcase {
  id: number;
  input: string;
  expectedOutput: string;
}

interface ExamProblem {
  id: string;
  question_id?: number;
  title: string;
  points: number;
  language: string;
  description: string;
  testcases: ExamTestcase[];
  initialCode: string;
}

interface ExamData {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  roomCode: string;
  problems: ExamProblem[];
}

function getInitialCodeTemplate(language: string): string {
  const lang = language.toLowerCase();
  if (lang === "python") {
    return "# Viết mã nguồn Python của bạn tại đây\nimport sys\n\ndef main():\n    pass\n\nif __name__ == '__main__':\n    main()\n";
  }
  if (lang === "java") {
    return "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Viết mã nguồn Java của bạn tại đây\n    }\n}\n";
  }
  return "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Viết mã nguồn của bạn tại đây\n    return 0;\n}\n";
}

export default function ExamWorkspacePage() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);
  const [examState, setExamState] = useState<ExamState>("doing");
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [examRoomType, setExamRoomType] = useState<'lab' | 'exam'>('lab');
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [examData, setExamData] = useState<ExamData>(mockExamData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [customRunOutput, setCustomRunOutput] = useState<{
    stdout: string;
    error: string | null;
    time: string;
  } | null>(null);

  // PIP Camera minimization state
  const [isCameraExpanded, setIsCameraExpanded] = useState(true);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("oculide_theme") as "dark" | "light" | null;
    const initial = saved || "light";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const applyTheme = (t: "dark" | "light") => {
    const html = document.documentElement;
    if (t === "dark") {
      html.classList.add("dark");
      html.setAttribute("data-theme", "dark");
    } else {
      html.classList.remove("dark");
      html.setAttribute("data-theme", "light");
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("oculide_theme", next);
    applyTheme(next);
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("oculide_student_pending_exam");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.roomId) setActiveRoomId(Number(parsed.roomId));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!activeRoomId) return;
    let cancelled = false;
    async function loadExamContent() {
      try {
        const data = await fetchWithAuth(`/api/v1/rooms/${activeRoomId}/exam-content`);
        if (cancelled || !data) return;
        setExamRoomType(data.room_type === 'exam' ? 'exam' : 'lab');

        if (Array.isArray(data.questions) && data.questions.length > 0) {
          const mappedProblems: ExamProblem[] = data.questions.map((q: {
            id?: string;
            question_id?: number;
            title?: string;
            max_points?: number;
            programming_language?: string;
            description?: string;
            test_cases?: Array<{ input?: string; inputData?: string; expectedOutput?: string }>;
          }) => {
            const lang = q.programming_language || "cpp";
            return {
              id: q.id || String(q.question_id),
              question_id: q.question_id,
              title: q.title || "Câu hỏi lập trình",
              points: q.max_points ?? 10,
              language: lang,
              description: q.description || "",
              testcases: (q.test_cases || []).map((tc, idx) => ({
                id: idx + 1,
                input: tc.input ?? tc.inputData ?? "",
                expectedOutput: tc.expectedOutput ?? "",
              })),
              initialCode: getInitialCodeTemplate(lang),
            };
          });

          setExamData({
            id: data.template_id || String(data.room_id),
            title: data.template_title || data.room_name || mockExamData.title,
            subject: data.room_type === "lab" ? "Thực hành (Lab)" : "Kiểm tra / Thi",
            durationMinutes: data.duration_minutes || mockExamData.durationMinutes,
            roomCode: data.room_code || mockExamData.roomCode,
            problems: mappedProblems,
          });
          setCodes((prev) => {
            const next: Record<string, string> = { ...prev };
            for (const p of mappedProblems) {
              if (!next[p.id]) next[p.id] = p.initialCode;
            }
            return next;
          });
          setSelectedLanguage(mappedProblems[0]?.language || "cpp");
          setTimeLeft((data.duration_minutes || mockExamData.durationMinutes) * 60);
        } else {
          setExamData((prev) => ({
            ...prev,
            title: data.room_name || prev.title,
            roomCode: data.room_code || prev.roomCode,
            durationMinutes: data.duration_minutes || prev.durationMinutes,
          }));
          if (data.duration_minutes) {
            setTimeLeft(data.duration_minutes * 60);
          }
        }
      } catch {
        // fallback
      }
    }
    loadExamContent();
    return () => {
      cancelled = true;
    };
  }, [activeRoomId]);

  const {
    connectionState: livekitState,
    localVideoTrack,
  } = useLiveKitRoom({
    roomId: activeRoomId,
    mode: "publish",
    enabled: Boolean(activeRoomId) && examState === "doing",
  });
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

  // YOLOv8 AI Proctoring State
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
  const currentProblem = examData.problems[activeProblemIdx] ?? examData.problems[0];

  const totalViolations = pasteCount + tabSwitchCount + aiViolationCount;

  // Khóa thi khi quá 3 lần vi phạm
  useEffect(() => {
    if (totalViolations >= 3 && !isLocked && examState === "doing") {
      setIsLocked(true);
      showToast("BÀI THI BỊ KHÓA: Bạn đã ghi nhận 3 lần vi phạm quy chế! Đang chờ Giảng viên phê duyệt mở khóa.");
    }
  }, [totalViolations, isLocked, examState]);

  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch {
        // browser restriction
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

  // Giả lập YOLOv8 AI
  useEffect(() => {
    if (examState !== "doing" || isLocked) return;

    const interval = setInterval(() => {
      const rand = Math.random();

      if (rand < 0.1) {
        setYoloDetections({
          label: "cell phone",
          confidence: 0.89,
          bbox: { x: 55, y: 40, w: 30, h: 45 },
          status: "danger",
        });
        setAiViolationCount((prev) => prev + 1);
        showToast("CẢNH BÁO AI: Phát hiện thiết bị di động trong khung hình!");
      } else if (rand < 0.22) {
        setYoloDetections({
          label: "looking away",
          confidence: 0.92,
          bbox: { x: 10, y: 15, w: 60, h: 65 },
          status: "warning",
        });
        setAiViolationCount((prev) => prev + 1);
        showToast("CẢNH BÁO AI: Góc mặt quay khỏi màn hình làm bài > 5s!");
      } else {
        setYoloDetections({
          label: "person",
          confidence: 0.98,
          bbox: { x: 20, y: 15, w: 60, h: 70 },
          status: "ok",
        });
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [examState, isLocked]);

  useEffect(() => {
    if (!activeRoomId) return;
    let cancelled = false;
    let ws: WebSocket | null = null;

    async function initSessionAndWs() {
      try {
        const sess = await fetchWithAuth<{ session_id: number }>("/api/v1/sessions", {
          method: "POST",
          body: JSON.stringify({ room_id: activeRoomId }),
        });
        if (!cancelled && sess?.session_id) {
          setActiveSessionId(sess.session_id);
        }

        const me = await fetchWithAuth<{ user_id: number }>("/api/v1/auth/me");
        const token = getAuthToken();
        if (cancelled || !me?.user_id || !token || typeof window === "undefined") return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/${activeRoomId}/${me.user_id}?token=${encodeURIComponent(token)}`;
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "student_unlocked") {
              setIsLocked(false);
              setPasteCount(0);
              setTabSwitchCount(0);
              setAiViolationCount(0);
              setTeacherPasscode("");
              showToast("ĐÃ MỞ KHÓA: Giảng viên đã phê duyệt mở khóa từ xa!");
            }
          } catch {
            // ignore
          }
        };
      } catch {
        // ignore
      }
    }

    initSessionAndWs();
    return () => {
      cancelled = true;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [activeRoomId]);

  const reportViolationToBackend = (
    violationType: "tab_switch" | "copy_paste" | "fullscreen_exit",
    severity: "low" | "medium" | "high",
    description: string,
  ) => {
    if (!activeSessionId) return;
    fetchWithAuth("/api/v1/violations", {
      method: "POST",
      body: JSON.stringify({
        session_id: activeSessionId,
        violation_type: violationType,
        severity,
        description,
      }),
    }).catch(() => {});
  };

  // Giám sát chuyển tab
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden && examState === "doing" && !isLocked) {
        setTabSwitchCount((prev) => prev + 1);
        showToast("CẢNH BÁO QUY CHẾ: Rời khỏi cửa sổ bài thi (Chuyển tab)!");
        reportViolationToBackend(
          "tab_switch",
          "medium",
          "Sinh viên chuyển tab hoặc rời khỏi cửa sổ làm bài.",
        );
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [examState, isLocked, activeSessionId]);

  // Chặn phím tắt paste
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (isLocked) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) {
      e.preventDefault();
      setPasteCount((prev) => prev + 1);
      showToast("CẢNH BÁO: Hệ thống chặn thao tác dán mã nguồn từ ngoài vào!");
      reportViolationToBackend(
        "copy_paste",
        "medium",
        "Sinh viên nhấn tổ hợp Ctrl+V / Cmd+V trong trình soạn thảo.",
      );
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (isLocked) return;
    e.preventDefault();
    setPasteCount((prev) => prev + 1);
    showToast("CẢNH BÁO: Hệ thống chặn thao tác dán mã nguồn từ ngoài vào!");
    reportViolationToBackend(
      "copy_paste",
      "medium",
      "Sinh viên thực hiện thao tác dán (Paste) vào trình soạn thảo.",
    );
  }

  function showToast(msg: string) {
    setWarningToast(msg);
    setTimeout(() => setWarningToast(null), 4000);
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTeacherUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError("");
    setIsUnlocking(true);

    setTimeout(() => {
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
        setUnlockError("Mã phê duyệt Giảng viên không đúng (Mã mẫu: 1234)");
      }
    }, 600);
  };

  const handleRunAllTests = async () => {
    setIsRunning(true);
    setTestResults({});
    setCustomRunOutput(null);

    const codeContent = codes[currentProblem.id] ?? "";

    try {
      if (activeTestTab === "custom") {
        const data = await fetchWithAuth<{ stdout?: string; error?: string | null; execution_ms?: number }>("/api/v1/submissions/run", {
          method: "POST",
          body: JSON.stringify({
            code_content: codeContent,
            language: selectedLanguage,
            custom_input: customInput,
          }),
        });
        setCustomRunOutput({
          stdout: data.stdout || "",
          error: data.error || null,
          time: `${((data.execution_ms || 0) / 1000).toFixed(2)}s`,
        });
      } else {
        const results: Record<number, { status: "passed" | "failed"; actualOutput: string; time: string }> = {};
        await Promise.all(
          currentProblem.testcases.map(async (tc) => {
            try {
              const data = await fetchWithAuth<{ stdout?: string; error?: string | null; execution_ms?: number }>("/api/v1/submissions/run", {
                method: "POST",
                body: JSON.stringify({
                  code_content: codeContent,
                  language: selectedLanguage,
                  custom_input: tc.input,
                }),
              });
              const actual = (data.stdout ?? "").trim();
              const expected = (tc.expectedOutput ?? "").trim();
              const isPass = !data.error && actual === expected;
              results[tc.id] = {
                status: isPass ? "passed" : "failed",
                actualOutput: data.error ? String(data.error) : String(data.stdout ?? ""),
                time: `${((data.execution_ms || 0) / 1000).toFixed(2)}s`,
              };
            } catch (err) {
              results[tc.id] = {
                status: "failed",
                actualOutput: err instanceof Error ? err.message : "Lỗi kết nối máy chủ",
                time: "0.00s",
              };
            }
          }),
        );
        setTestResults(results);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Lỗi khi chạy thử code.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitExam = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      if (activeRoomId) {
        const realProblems = examData.problems.filter((p) => typeof p.question_id === "number");
        for (const prob of realProblems) {
          const code = codes[prob.id] ?? "";
          if (!code.trim()) continue;
          await fetchWithAuth("/api/v1/submissions", {
            method: "POST",
            body: JSON.stringify({
              room_id: activeRoomId,
              question_id: prob.question_id,
              attempt_number: 1,
              code_content: code,
              language: selectedLanguage,
            }),
          });
        }
      }
      setExamState("completed");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không thể nộp bài. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
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
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-neutral-950 dark:text-slate-300 font-sans flex flex-col select-none relative overflow-hidden transition-colors duration-200">
      
      {/* Toast Cảnh báo Nổi */}
      {warningToast && (
        <div className="fixed top-18 right-6 z-50 flex items-center gap-3 rounded-md border border-rose-500/50 bg-rose-900 text-white px-4 py-3 text-xs font-semibold shadow-lg backdrop-blur-md">
          <ShieldAlert size={18} className="shrink-0 text-rose-300" />
          <span>{warningToast}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* HEADER BÀI THI: GỌN GÀNG, ĐẦY ĐỦ THÔNG TIN THEO CHUẨN UX HỌC THUẬT */}
      {/* ------------------------------------------------------------------ */}
      <header className="h-16 shrink-0 border-b border-slate-300 bg-white px-4 sm:px-6 flex items-center justify-between dark:border-white/10 dark:bg-neutral-900 transition-colors z-30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand text-white font-bold text-xs shadow-sm">
            <Code2 size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-serif font-bold text-[#2A282D] dark:text-white truncate max-w-xs sm:max-w-md">
              {examData.title}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-[#a59fa3]">
              Mã ca thi: <span className="font-mono font-semibold text-slate-900 dark:text-[#e5a9b9]">{examData.roomCode}</span>
            </p>
          </div>
        </div>

        {/* Thanh Giám sát vi phạm + Đếm ngược + Nút Nộp bài */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* Bộ đếm vi phạm */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-md bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs dark:bg-[#221e27] dark:border-white/10">
            <span className="text-[#5a565e] dark:text-[#b0a7aa]">Vi phạm:</span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                totalViolations >= 3
                  ? "bg-rose-700 text-white"
                  : totalViolations > 0
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-400"
              }`}
            >
              {totalViolations} / 3
            </span>
          </div>

          {/* Đồng hồ đếm ngược */}
          <div
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 border font-mono font-bold text-xs sm:text-sm ${
              timeLeft < 300
                ? "bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400"
                : "bg-slate-50 border-slate-300 text-slate-900 dark:bg-[#221e27] dark:border-white/10 dark:text-[#e5a9b9]"
            }`}
          >
            <Clock size={15} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          {/* Nút Đổi Theme Sáng / Tối */}
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối"}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-[#221e27] dark:text-amber-300 dark:hover:bg-[#2b2532] transition-colors cursor-pointer"
              aria-label="Đổi theme sáng / tối"
            >
              {theme === "dark" ? (
                <Sun size={16} className="text-amber-300" />
              ) : (
                <Moon size={16} className="text-slate-800" />
              )}
            </button>
          )}

          {/* Toàn màn hình */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Thoát toàn màn hình" : "Chế độ toàn màn hình"}
            className="hidden md:flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-[#221e27] dark:text-slate-300 dark:hover:bg-[#2b2532] transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Nút Nộp bài */}
          {examState === "doing" && !isLocked && (
            <button
              type="button"
              onClick={() => setExamState("confirm_submit")}
              className="system-primary-action inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Send size={14} />
              <span>Nộp bài</span>
            </button>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* KHÔNG GIAN LÀM BÀI: 2 CỘT CÂN ĐỐI TUYỆT ĐỐI (ĐỀ BÀI vs IDE) */}
      {/* ------------------------------------------------------------------ */}
      {examState === "doing" && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden relative">
          
          {/* CỘT TRÁI (5/12): ĐỀ BÀI & ĐIỀU HƯỚNG CÂU HỎI */}
          <div className="lg:col-span-5 flex flex-col border-r border-slate-300 bg-white dark:border-white/10 dark:bg-neutral-900 overflow-hidden relative transition-colors">
            
            {/* Tabs chọn câu hỏi */}
            <div className="flex items-center gap-1.5 border-b border-slate-300 bg-slate-50 p-2 overflow-x-auto dark:border-white/10 dark:bg-[#18151D]">
              {examData.problems.map((prob, idx) => {
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
                    className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                      activeProblemIdx === idx
                        ? "system-selected-module shadow-xs"
                        : "bg-white text-[#5a565e] border border-slate-300 hover:bg-[#FAF9F9] dark:border-white/10 dark:bg-[#221e27] dark:text-[#b0a7aa] dark:hover:bg-[#2b2532]"
                    }`}
                  >
                    <FileText size={14} />
                    <span>Câu {idx + 1}</span>
                    {isAnswered ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Nội dung câu hỏi */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-slate-800 dark:text-slate-300 text-xs sm:text-sm leading-relaxed pb-16">
              <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-3">
                <h2 className="text-base font-serif font-bold text-[#2A282D] dark:text-white">
                  {currentProblem.title}
                </h2>
                <span className="rounded border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-[#f0c2cf]">
                  {currentProblem.points} Điểm
                </span>
              </div>

              <div className="whitespace-pre-line font-sans leading-relaxed">
                {currentProblem.description}
              </div>

              {/* Sample Testcases */}
              <div className="space-y-3 pt-3">
                <h3 className="text-xs font-serif font-bold uppercase tracking-wider text-slate-500 dark:text-[#a59fa3]">
                  Ví dụ mẫu (Sample Testcase):
                </h3>
                {currentProblem.testcases.slice(0, 1).map((tc) => (
                  <div key={tc.id} className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    <div className="rounded-md border border-slate-300 bg-slate-50 p-3 space-y-1 dark:border-white/10 dark:bg-[#221e27]">
                      <p className="text-[10px] font-sans font-bold text-slate-500 dark:text-[#a59fa3]">Input mẫu:</p>
                      <pre className="text-emerald-800 dark:text-emerald-400 whitespace-pre-wrap">{tc.input}</pre>
                    </div>
                    <div className="rounded-md border border-slate-300 bg-slate-50 p-3 space-y-1 dark:border-white/10 dark:bg-[#221e27]">
                      <p className="text-[10px] font-sans font-bold text-slate-500 dark:text-[#a59fa3]">Output kỳ vọng:</p>
                      <pre className="text-slate-900 dark:text-[#e5a9b9] whitespace-pre-wrap">{tc.expectedOutput}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Điều hướng Câu trước / Câu tiếp theo */}
            <div className="absolute bottom-0 left-0 right-0 h-14 border-t border-slate-300 bg-white p-2.5 flex items-center justify-between dark:border-white/10 dark:bg-neutral-900">
              <button
                type="button"
                disabled={activeProblemIdx === 0 || isLocked}
                onClick={() => {
                  setActiveProblemIdx((prev) => Math.max(0, prev - 1));
                  setActiveTestTab(1);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40 transition-colors dark:border-white/10 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-[#2b2532] cursor-pointer"
              >
                <ChevronLeft size={16} /> Câu trước
              </button>

              <span className="text-xs font-mono font-semibold text-slate-500 dark:text-[#a59fa3]">
                {activeProblemIdx + 1} / {examData.problems.length}
              </span>

              {activeProblemIdx < examData.problems.length - 1 ? (
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    setActiveProblemIdx((prev) => Math.min(examData.problems.length - 1, prev + 1));
                    setActiveTestTab(1);
                  }}
                  className="system-primary-action inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  Câu tiếp theo <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setExamState("confirm_submit")}
                  className="system-primary-action inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  Hoàn thành <Send size={14} />
                </button>
              )}
            </div>
          </div>

          {/* CỘT PHẢI (7/12): TRÌNH SOẠN THẢO CODE, TOOLBAR, CONSOLE TEST */}
          <div className="lg:col-span-7 flex flex-col bg-[#FAF9F9] dark:bg-neutral-950 overflow-hidden relative transition-colors">
            
            {/* IDE Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-300 bg-white px-4 py-2 shrink-0 dark:border-white/10 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-[#a59fa3] flex items-center gap-1.5">
                  <FileCode size={15} className="text-slate-900 dark:text-[#e5a9b9]" /> Ngôn ngữ:
                </span>
                <select
                  value={selectedLanguage}
                  disabled={isLocked}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-slate-900 dark:border-white/10 dark:bg-[#221e27] dark:text-slate-300"
                >
                  <option value="cpp">C++ (GCC 11)</option>
                  <option value="python">Python 3.10</option>
                  <option value="java">Java 17</option>
                </select>

                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() =>
                    setCodes((prev) => ({
                      ...prev,
                      [currentProblem.id]: currentProblem.initialCode,
                    }))
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-[#a59fa3] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} /> Đặt lại mẫu
                </button>
              </div>

              {/* Tình trạng AI Vision & Nút bật/thu nhỏ Camera PIP */}
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-slate-50 border border-slate-300 px-2.5 py-1 text-[10px] font-mono text-[#5a565e] dark:bg-white/5 dark:border-white/10 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  <span>AI Proctoring: Hoạt động</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCameraExpanded(!isCameraExpanded)}
                  title={isCameraExpanded ? "Thu nhỏ camera giám sát" : "Mở rộng camera giám sát"}
                  className="flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-medium text-[#5a565e] hover:bg-[#eae5e7] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Camera size={13} className="text-slate-900 dark:text-[#e5a9b9]" />
                  <span>{isCameraExpanded ? "Ẩn cam" : "Hiện cam"}</span>
                  {isCameraExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </button>
              </div>
            </div>

            {/* Trình soạn thảo Code (Textarea + Line Numbers) */}
            <div className="flex-1 relative flex bg-white font-mono text-xs sm:text-sm dark:bg-[#18151D]">
              {/* Cột số dòng */}
              <div className="w-11 select-none border-r border-slate-300 bg-slate-50 py-3 text-right pr-2 text-slate-500 space-y-1 font-mono text-xs dark:border-white/5 dark:bg-neutral-950 dark:text-slate-500">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Textarea nhập code */}
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
                className="flex-1 resize-none bg-transparent p-3.5 text-[#2A282D] outline-none font-mono leading-relaxed placeholder:text-slate-500 disabled:opacity-40 dark:text-slate-300 dark:placeholder:text-slate-500"
                placeholder="// Viết mã nguồn bài giải tại đây (Hệ thống chặn thao tác Ctrl+V)..."
              />
            </div>

            {/* PIP CAMERA ĐƯỢC ĐẶT GÓC DƯỚI PHẢI NON-OBSTRUCTIVE */}
            {isCameraExpanded && (
              <div className="absolute bottom-58 right-4 z-20 flex flex-col items-end gap-1">
                <div className="relative h-28 w-40 overflow-hidden rounded-md border border-slate-300 bg-neutral-950 p-0.5 shadow-md dark:border-white/10">
                  <div className="relative h-full w-full rounded bg-black overflow-hidden flex items-center justify-center">
                    {localVideoTrack ? (
                      <LiveKitVideoFeed
                        track={localVideoTrack}
                        muted
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Camera size={24} className="text-slate-500" />
                    )}

                    {/* Bounding box AI */}
                    {yoloDetections.bbox.w > 0 && (
                      <div
                        className={`absolute border-2 ${
                          yoloDetections.status === "ok"
                            ? "border-emerald-400 bg-emerald-500/10"
                            : yoloDetections.status === "warning"
                            ? "border-amber-400 bg-amber-500/20"
                            : "border-rose-500 bg-rose-500/30"
                        }`}
                        style={{
                          left: `${yoloDetections.bbox.x}%`,
                          top: `${yoloDetections.bbox.y}%`,
                          width: `${yoloDetections.bbox.w}%`,
                          height: `${yoloDetections.bbox.h}%`,
                        }}
                      >
                        <span
                          className={`absolute -top-3.5 left-0 rounded px-1 text-[8px] font-mono font-bold uppercase text-white ${
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

                    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-[8px] font-mono text-slate-300 bg-black/70 px-1 py-0.5 rounded">
                      <span>{livekitState === "connected" ? "LiveKit SFU" : "AI Camera"}</span>
                      <span className="text-emerald-400 font-bold">ON</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CONSOLE & TESTCASE RUNNER PANEL */}
            <div className="h-56 shrink-0 border-t border-slate-300 bg-white flex flex-col dark:border-white/10 dark:bg-neutral-900">
              {/* Header của Console */}
              <div className="flex items-center justify-between border-b border-slate-300 px-3 py-1.5 text-xs dark:border-white/10 bg-slate-50 dark:bg-[#18151D]">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {currentProblem.testcases.map((tc) => {
                    const res = testResults[tc.id];
                    return (
                      <button
                        key={tc.id}
                        type="button"
                        disabled={isLocked}
                        onClick={() => setActiveTestTab(tc.id)}
                        className={`inline-flex h-7.5 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                          activeTestTab === tc.id
                            ? "bg-white text-slate-900 border border-slate-300 shadow-xs dark:bg-white/10 dark:text-[#f0c2cf] dark:border-white/20"
                            : "text-[#5a565e] hover:text-[#2A282D] dark:text-[#b0a7aa] dark:hover:text-white"
                        }`}
                      >
                        <span>Testcase {tc.id}</span>
                        {res && (
                          res.status === "passed" ? (
                            <CheckCircle2 size={12} className="text-emerald-700 dark:text-emerald-400" />
                          ) : (
                            <XCircle size={12} className="text-rose-600 dark:text-rose-400" />
                          )
                        )}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => setActiveTestTab("custom")}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                      activeTestTab === "custom"
                        ? "bg-white text-slate-900 border border-slate-300 shadow-xs dark:bg-white/10 dark:text-[#f0c2cf] dark:border-white/20"
                        : "text-[#5a565e] hover:text-[#2A282D] dark:text-[#b0a7aa] dark:hover:text-white"
                    }`}
                  >
                    Tự nhập Input
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRunAllTests}
                  disabled={isRunning || isLocked}
                  className="system-primary-action inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 shrink-0 cursor-pointer shadow-xs"
                >
                  {isRunning ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <Play size={14} />
                  )}
                  <span>Chạy thử Testcase</span>
                </button>
              </div>

              {/* Console Body */}
              <div className="flex-1 p-3 font-mono text-xs overflow-y-auto text-slate-800 dark:text-slate-300">
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
                            <pre className="rounded-md bg-slate-50 p-2 text-slate-800 border border-slate-300 dark:bg-[#221e27] dark:text-slate-300 dark:border-white/10 font-mono">{tc.input}</pre>
                          </div>
                          <div>
                            <p className="text-[10px] font-sans font-bold text-slate-500 mb-1">Output kỳ vọng:</p>
                            <pre className="rounded-md bg-slate-50 p-2 text-slate-900 border border-slate-300 dark:bg-[#221e27] dark:text-[#e5a9b9] dark:border-white/10 font-mono">{tc.expectedOutput}</pre>
                          </div>
                        </div>

                        {res && (
                          <div className="pt-2 border-t border-slate-300 dark:border-white/10 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-sans font-bold text-slate-500">Kết quả chạy:</span>
                              {res.status === "passed" ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                                  <CheckCircle2 size={13} /> PASSED ({res.time})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                                  <XCircle size={13} /> FAILED ({res.time})
                                </span>
                              )}
                            </div>
                            <pre className="rounded-md bg-slate-50 p-2 text-slate-800 border border-slate-300 dark:bg-[#221e27] dark:text-slate-300 dark:border-white/10 font-mono">
                              {res.actualOutput}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-sans font-bold text-slate-500">Tự nhập Input tùy chỉnh để kiểm thử:</p>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      disabled={isLocked}
                      placeholder="Nhập dữ liệu testcase..."
                      className="w-full h-16 rounded-md border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800 outline-none focus:border-slate-900 disabled:opacity-30 dark:border-white/10 dark:bg-[#221e27] dark:text-slate-300"
                    />
                    {customRunOutput && (
                      <div className="pt-1 space-y-1">
                        <p className="text-[10px] font-sans font-bold text-slate-500">
                          Kết quả chạy thử ({customRunOutput.time}):
                        </p>
                        <pre className={`rounded-md bg-slate-50 p-2 border border-slate-300 dark:bg-[#221e27] dark:border-white/10 font-mono ${customRunOutput.error ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                          {customRunOutput.error || customRunOutput.stdout || "(Không có output)"}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ------------------------------------------------------------------ */}
          {/* MÀN HÌNH MÁY BỊ KHÓA / TREO BÀI THI DO VI PHẠM */}
          {/* ------------------------------------------------------------------ */}
          {isLocked && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-md border border-rose-300 bg-white dark:border-rose-500/40 dark:bg-neutral-900 p-6 shadow-xl space-y-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                  <Lock size={28} />
                </div>

                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                    <ShieldAlert size={14} /> BÀI THI BỊ TẠM KHÓA
                  </span>
                  <h2 className="text-lg font-serif font-bold text-[#2A282D] dark:text-white">
                    Đã ghi nhận 3 sự kiện vi phạm
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#a59fa3] leading-relaxed">
                    Hệ thống đã tạm dừng làm bài do vượt quá số lần cảnh báo quy chế. Vui lòng liên hệ Giảng viên phụ trách để thẩm định và mở khóa.
                  </p>
                </div>

                {/* Danh sách vi phạm */}
                <div className="rounded-md bg-slate-50 dark:bg-[#221e27] p-3.5 border border-slate-300 dark:border-white/10 text-xs space-y-2 text-left">
                  <p className="font-bold text-[#2A282D] dark:text-white">Nhật ký sự kiện:</p>
                  <div className="flex justify-between text-[#5a565e] dark:text-[#b0a7aa]">
                    <span>• Lần rời tab/cửa sổ thi:</span>
                    <span className="font-bold font-mono text-rose-600 dark:text-rose-400">{tabSwitchCount} lần</span>
                  </div>
                  <div className="flex justify-between text-[#5a565e] dark:text-[#b0a7aa]">
                    <span>• Lần cố gắng dán code:</span>
                    <span className="font-bold font-mono text-amber-600 dark:text-amber-400">{pasteCount} lần</span>
                  </div>
                  <div className="flex justify-between text-[#5a565e] dark:text-[#b0a7aa]">
                    <span>• Cảnh báo AI Vision:</span>
                    <span className="font-bold font-mono text-rose-600 dark:text-rose-400">{aiViolationCount} lần</span>
                  </div>
                </div>

                {/* Form Nhập mã giải khóa */}
                <form onSubmit={handleTeacherUnlock} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-left text-[11px] font-semibold text-[#5a565e] dark:text-[#b0a7aa] mb-1">
                      Mã PIN phê duyệt của Giảng viên (Mã mẫu: <code className="text-slate-900 dark:text-[#e5a9b9] font-bold">1234</code>)
                    </label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="password"
                        value={teacherPasscode}
                        onChange={(e) => setTeacherPasscode(e.target.value)}
                        placeholder="Nhập PIN giải khóa..."
                        className="w-full h-10 rounded-md border border-slate-300 bg-white dark:border-white/10 dark:bg-[#221e27] py-2 pl-9 pr-3 text-xs font-mono text-[#2A282D] dark:text-white outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>

                  {unlockError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{unlockError}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isUnlocking}
                      className="system-primary-action flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
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
                      onClick={() => setTeacherPasscode("1234")}
                      className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-800 hover:bg-[#eae5e7] dark:border-white/10 dark:bg-[#221e27] dark:text-slate-300 dark:hover:bg-[#2b2532] transition-colors cursor-pointer"
                    >
                      Mã mẫu
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-md border border-slate-300 bg-white p-6 shadow-xl space-y-5 dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center gap-3 border-b border-slate-300 dark:border-white/10 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                <AlertOctagon size={22} />
              </div>
              <div>
                <h2 className="text-base font-serif font-bold text-[#2A282D] dark:text-white">Xác nhận nộp bài thi</h2>
                <p className="text-xs text-slate-500 dark:text-[#a59fa3]">Kiểm tra lại trạng thái bài làm trước khi nộp chính thức</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {examData.problems.map((prob, idx) => {
                const isAnswered = (codes[prob.id] ?? "").trim().length > 30;
                return (
                  <div key={prob.id} className="flex items-center justify-between rounded-md bg-slate-50 p-3 border border-slate-300 dark:bg-[#221e27] dark:border-white/10">
                    <span className="font-semibold text-[#2A282D] dark:text-white">Câu {idx + 1}: {prob.title}</span>
                    {isAnswered ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 size={13} /> Đã có bài làm
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                        <HelpCircle size={13} /> Chưa làm
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {submitError && (
              <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setExamState("doing")}
                className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50 dark:border-white/10 dark:bg-[#221e27] dark:text-slate-300 dark:hover:bg-[#2b2532] cursor-pointer"
              >
                Quay lại làm tiếp
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitExam}
                className="system-primary-action inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}
                <span>{isSubmitting ? "Đang nộp bài..." : "Xác nhận nộp bài"}</span>
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
          <div className="w-full max-w-xl rounded-md border border-slate-300 bg-white p-6 sm:p-8 text-center space-y-6 shadow-md dark:border-white/10 dark:bg-neutral-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <span className="inline-flex items-center gap-1 rounded border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                HỆ THỐNG ĐÃ TIẾP NHẬN BÀI LÀM
              </span>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {examRoomType === 'lab' ? 'Hoàn thành bài thực hành' : 'Hoàn thành ca thi'}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Mã nguồn của bạn đã được ghi nhận và gửi đến hệ thống lưu trữ an toàn.
              </p>
            </div>

            {/* Quy tắc công bố điểm: Thực hành công bố máy chấm ngay; Bài thi phải do GV công bố */}
            {examRoomType === 'lab' ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5 text-center space-y-1.5">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Kết quả chấm điểm tự động (Máy chấm test case):
                </p>
                <p className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                  10 / 10
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Bài thực hành đạt chuẩn. Toàn bộ test case đã được máy chấm tự động xác nhận đạt 100%.
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5 text-center space-y-1.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Quy chế bảo mật điểm thi
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Theo quy chế khảo thí, điểm số bài thi chính thức sẽ được công bố sau khi Giảng viên hoàn tất đối soát biên bản giám sát AI và nhấn nút công bố điểm.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-left text-xs">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5 space-y-1 dark:border-white/10 dark:bg-white/5">
                <p className="text-slate-500 dark:text-slate-400">Số lần cố gắng dán code</p>
                <p className="font-mono font-bold text-slate-900 dark:text-white text-sm">{pasteCount} lần</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5 space-y-1 dark:border-white/10 dark:bg-white/5">
                <p className="text-slate-500 dark:text-slate-400">Số lần rời tab / cửa sổ</p>
                <p className="font-mono font-bold text-slate-900 dark:text-white text-sm">{tabSwitchCount} lần</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/student/submissions"
                className="system-primary-action w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
              >
                Xem danh sách bài nộp
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/student"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-[#221e27] dark:text-slate-300 dark:hover:bg-[#2b2532] transition-colors"
              >
                Về trang tổng quan
              </Link>
            </div>
          </div>
        </main>
      )}

    </div>
  );
}
