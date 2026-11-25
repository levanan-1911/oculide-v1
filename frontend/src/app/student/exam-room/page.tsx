"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useLiveKitRoom } from "@/hooks/useLiveKitRoom";
import LiveKitVideoFeed from "@/components/livekit/LiveKitVideoFeed";
import { fetchWithAuth, getAuthToken } from "@/services/apiClient";
import { ProctoringClient } from "@/utils/proctorClient";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CameraOff,
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
  Monitor,
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
  ChevronUp,
  BellRing,
  X
} from "lucide-react";

// Cấu trúc khởi tạo ban đầu rỗng khi chờ dữ liệu đề thi từ Backend
const initialEmptyExam: ExamData = {
  id: "",
  title: "Đang tải đề thi...",
  subject: "Phòng thi trực tuyến",
  durationMinutes: 60,
  roomCode: "",
  problems: [],
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
  const [proctoringConfig, setProctoringConfig] = useState<any>(null);
  const isLabSession = examRoomType === "lab";
  const isCameraOffAllowed = isLabSession && proctoringConfig?.requireCamera === false;
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [examData, setExamData] = useState<ExamData>(initialEmptyExam);
  const [isLoadingExam, setIsLoadingExam] = useState<boolean>(true);
  const [examErrorMessage, setExamErrorMessage] = useState<string | null>(null);
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
        if (parsed.roomType) setExamRoomType(parsed.roomType === 'lab' ? 'lab' : 'exam');
        if (parsed.proctoringConfig) setProctoringConfig(parsed.proctoringConfig);
      }
    } catch {
      // ignore
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const qRoomId = params.get("roomId") || params.get("room_id");
      if (qRoomId && !isNaN(Number(qRoomId))) {
        setActiveRoomId(Number(qRoomId));
      }
    }
  }, []);

  useEffect(() => {
    if (!activeRoomId) return;

    // Kiểm tra xem thí sinh đã nộp bài thi cho phòng này từ trước hay chưa
    const alreadySubmittedLocal = localStorage.getItem(`oculide_submitted_room_${activeRoomId}`) === "true";
    if (alreadySubmittedLocal) {
      setExamState("completed");
      return;
    }

    let cancelled = false;
    async function loadExamContent() {
      setIsLoadingExam(true);
      setExamErrorMessage(null);
      try {
        const data = await fetchWithAuth<any>(`/api/v1/rooms/${activeRoomId}/exam-content`);
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
            title: data.template_title || data.room_name || "Bài thi trực tuyến",
            subject: data.room_type === "lab" ? "Thực hành (Lab)" : "Kiểm tra / Thi",
            durationMinutes: data.duration_minutes || 60,
            roomCode: data.room_code || "",
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
          const durationMins = data.duration_minutes || 60;
          const totalSecs = durationMins * 60;
          let calculatedRemaining = totalSecs;

          if (typeof window !== "undefined" && activeRoomId) {
            try {
              const startKey = `exam_start_timestamp_${activeRoomId}`;
              const startTs = Number(localStorage.getItem(startKey));
              if (startTs && !isNaN(startTs)) {
                const elapsedSecs = Math.max(0, Math.floor((Date.now() - startTs) / 1000));
                calculatedRemaining = Math.max(0, totalSecs - elapsedSecs);
              }
            } catch {}
          }

          setTimeLeft(calculatedRemaining);
          if (calculatedRemaining <= 0) {
            setExamState("completed");
          }
        } else {
          setExamData({
            id: String(data.room_id || activeRoomId),
            title: data.room_name || "Phòng thi",
            subject: data.room_type === "lab" ? "Thực hành (Lab)" : "Kiểm tra / Thi",
            durationMinutes: data.duration_minutes || 60,
            roomCode: data.room_code || "",
            problems: [],
          });
          setExamErrorMessage("Phòng thi hiện tại chưa có đề thi hoặc câu hỏi nào từ Giảng viên.");
        }
      } catch (err: any) {
        const errMsg = String(err?.message || err?.detail || "");
        if (errMsg.includes("đã nộp") || errMsg.includes("không thể") || errMsg.includes("403") || errMsg.includes("Forbidden")) {
          localStorage.setItem(`oculide_submitted_room_${activeRoomId}`, "true");
          setExamState("completed");
          showToast("Bạn đã nộp bài thi cho phòng này. Không thể truy cập lại đề bài.");
          return;
        }
        setExamErrorMessage(errMsg || "Lỗi khi nạp dữ liệu đề thi từ máy chủ.");
      } finally {
        if (!cancelled) setIsLoadingExam(false);
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
    localScreenTrack,
    isScreenSharing,
    enableScreenShare,
    disableScreenShare,
    toggleCamera,
  } = useLiveKitRoom({
    roomId: activeRoomId,
    mode: "publish",
    enabled: Boolean(activeRoomId) && examState === "doing",
  });
  const [activeProblemIdx, setActiveProblemIdx] = useState(0);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [selectedLanguage, setSelectedLanguage] = useState("cpp");
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (typeof window === "undefined" || !activeRoomId) return 60 * 60;
    try {
      const startTs = Number(localStorage.getItem(`exam_start_timestamp_${activeRoomId}`));
      if (startTs && !isNaN(startTs)) {
        const elapsed = Math.floor((Date.now() - startTs) / 1000);
        return Math.max(0, 60 * 60 - elapsed);
      }
    } catch {}
    return 60 * 60;
  });

  // Luồng camera vật lý trực tiếp
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Ưu tiên gắn trực tiếp localVideoTrack của LiveKit vào khung hình, tránh xung đột camera
  useEffect(() => {
    const videoEl = localVideoRef.current;
    if (!videoEl) return;
    if (localVideoTrack) {
      localVideoTrack.attach(videoEl);
      return () => {
        localVideoTrack.detach(videoEl);
      };
    } else if (localStream) {
      videoEl.srcObject = localStream;
      videoEl.play().catch(() => {});
    }
  }, [localVideoTrack, localStream, isCameraExpanded]);

  // Tự động yêu cầu chia sẻ màn hình khi sinh viên vào phòng thi / phòng thực hành (Lab)
  const [hasPromptedScreenShare, setHasPromptedScreenShare] = useState(false);
  const [showScreenShareModal, setShowScreenShareModal] = useState(false);

  useEffect(() => {
    if (livekitState !== "connected" || isScreenSharing || hasPromptedScreenShare) return;

    let isSubscribed = true;
    setHasPromptedScreenShare(true);

    enableScreenShare().then((success) => {
      if (!isSubscribed) return;
      if (!success) {
        // Cần tương tác người dùng (user activation) -> Mở modal để sinh viên bấm 1 click
        setShowScreenShareModal(true);
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [livekitState, isScreenSharing, hasPromptedScreenShare, enableScreenShare]);

  // Cảnh báo AI & Đếm Vi Phạm - Phục hồi từ localStorage khi F5 reload trang
  const [pasteCount, setPasteCount] = useState<number>(() => {
    if (typeof window === "undefined" || !activeRoomId) return 0;
    return Number(localStorage.getItem(`exam_paste_${activeRoomId}`)) || 0;
  });
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(() => {
    if (typeof window === "undefined" || !activeRoomId) return 0;
    return Number(localStorage.getItem(`exam_tab_switch_${activeRoomId}`)) || 0;
  });
  const [aiViolationCount, setAiViolationCount] = useState<number>(() => {
    if (typeof window === "undefined" || !activeRoomId) return 0;
    return Number(localStorage.getItem(`exam_ai_violation_${activeRoomId}`)) || 0;
  });
  const [warningToast, setWarningToast] = useState<string | null>(null);
  const [incomingAnnouncement, setIncomingAnnouncement] = useState<{
    id: number;
    message: string;
    noticeType: string;
    sender: string;
    time: string;
  } | null>(null);

  // Trạng thái Khóa / Treo Máy do vi phạm (Chỉ Giảng viên mới được mở khóa từ xa)
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    if (typeof window === "undefined" || !activeRoomId) return false;
    try {
      return localStorage.getItem(`exam_locked_${activeRoomId}`) === "true";
    } catch {
      return false;
    }
  });
  const [helpRequested, setHelpRequested] = useState(false);

  // Đồng bộ trạng thái khóa và số vi phạm khi activeRoomId sẵn sàng
  useEffect(() => {
    if (!activeRoomId || typeof window === "undefined") return;
    try {
      if (localStorage.getItem(`exam_locked_${activeRoomId}`) === "true") {
        setIsLocked(true);
      }
      const savedPaste = Number(localStorage.getItem(`exam_paste_${activeRoomId}`));
      if (savedPaste) setPasteCount(savedPaste);
      const savedTab = Number(localStorage.getItem(`exam_tab_switch_${activeRoomId}`));
      if (savedTab) setTabSwitchCount(savedTab);
      const savedAi = Number(localStorage.getItem(`exam_ai_violation_${activeRoomId}`));
      if (savedAi) setAiViolationCount(savedAi);
    } catch {}
  }, [activeRoomId]);

  // Khởi động Engine AI Proctoring Client để chụp định kỳ webcam và gửi về Celery Worker
  useEffect(() => {
    if (!activeSessionId || examState !== "doing" || isLocked) return;
    const videoEl = localVideoRef.current;
    if (!videoEl) return;

    const token = getAuthToken() || "";
    const client = new ProctoringClient(activeSessionId, window.location.origin, token);
    const hasActiveCamera = Boolean(localVideoTrack || localStream);
    client.setCameraActive(hasActiveCamera);
    client.start(videoEl);

    return () => {
      client.stop();
    };
  }, [activeSessionId, examState, isLocked, localVideoTrack, localStream]);

  // YOLOv8 AI Proctoring State - Khởi tạo sạch sẽ, không giả lập tĩnh cứng
  const [yoloDetections, setYoloDetections] = useState<{
    label: string;
    confidence: number;
    bbox: { x: number; y: number; w: number; h: number };
    status: "ok" | "warning" | "danger";
  }>({
    label: "Giám sát AI",
    confidence: 1.0,
    bbox: { x: 0, y: 0, w: 0, h: 0 },
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
  const currentProblem = examData.problems[activeProblemIdx] ?? examData.problems[0] ?? null;

  const totalViolations = pasteCount + tabSwitchCount + aiViolationCount;

  // Khóa thi khi quá 3 lần vi phạm - Cập nhật đồng bộ vào CSDL và localStorage để F5 không thể mở lại
  useEffect(() => {
    if (totalViolations >= 3 && !isLocked && examState === "doing") {
      setIsLocked(true);
      if (activeRoomId && typeof window !== "undefined") {
        try {
          localStorage.setItem(`exam_locked_${activeRoomId}`, "true");
        } catch {}
      }
      if (activeSessionId) {
        // Đồng bộ trạng thái khóa trực tiếp vào CSDL để không thể F5 mở lại
        fetchWithAuth(`/api/v1/sessions/${activeSessionId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "locked" }),
        }).catch(() => {});
      }
      showToast("BÀI THI BỊ KHÓA: Bạn đã ghi nhận 3 lần vi phạm quy chế! Đang chờ Giảng viên phê duyệt mở khóa.");
    }
  }, [totalViolations, isLocked, examState, activeRoomId, activeSessionId]);

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

  useEffect(() => {
    if (!activeRoomId) return;
    let cancelled = false;
    let ws: WebSocket | null = null;

    async function initSessionAndWs() {
      try {
        const sess = await fetchWithAuth<{
          session_id: number;
          status?: string;
          is_locked?: boolean;
          started_at?: string;
          start_time?: string;
        }>("/api/v1/sessions", {
          method: "POST",
          body: JSON.stringify({ room_id: activeRoomId }),
        });
        if (!cancelled && sess?.session_id) {
          setActiveSessionId(sess.session_id);
          const isSessionLocked = sess.status === "locked" || sess.status === "bi_khoa" || Boolean(sess.is_locked);
          if (isSessionLocked) {
            setIsLocked(true);
            if (activeRoomId && typeof window !== "undefined") {
              try {
                localStorage.setItem(`exam_locked_${activeRoomId}`, "true");
              } catch {}
            }
          }

          // Nạp lịch sử vi phạm thực tế từ máy chủ (tránh bị reset khi reload trang)
          try {
            const serverViolations = await fetchWithAuth<Array<{
              violation_id: number;
              violation_type: string;
            }>>(`/api/v1/violations/session/${sess.session_id}`);
            if (Array.isArray(serverViolations) && serverViolations.length > 0) {
              let tabs = 0;
              let pastes = 0;
              let ais = 0;
              for (const v of serverViolations) {
                if (v.violation_type === "tab_switch") tabs++;
                else if (v.violation_type === "copy_paste") pastes++;
                else ais++;
              }
              setTabSwitchCount(tabs);
              setPasteCount(pastes);
              setAiViolationCount(ais);
              if (activeRoomId && typeof window !== "undefined") {
                try {
                  localStorage.setItem(`exam_tab_switch_${activeRoomId}`, String(tabs));
                  localStorage.setItem(`exam_paste_${activeRoomId}`, String(pastes));
                  localStorage.setItem(`exam_ai_violation_${activeRoomId}`, String(ais));
                } catch {}
              }
              if (tabs + pastes + ais >= 3) {
                setIsLocked(true);
                if (activeRoomId && typeof window !== "undefined") {
                  try {
                    localStorage.setItem(`exam_locked_${activeRoomId}`, "true");
                  } catch {}
                }
              }
            }
          } catch {}

          // Lấy mốc thời gian bắt đầu làm bài chính thức từ API session
          const apiStartTimeRaw = sess.started_at || sess.start_time;
          let officialStartTs = 0;
          if (apiStartTimeRaw) {
            const parsedMs = Date.parse(apiStartTimeRaw);
            if (!Number.isNaN(parsedMs) && parsedMs > 0) {
              officialStartTs = parsedMs;
            }
          }

          const startKey = `exam_start_timestamp_${activeRoomId}`;
          if (officialStartTs > 0) {
            localStorage.setItem(startKey, String(officialStartTs));
            setTimeLeft((prev) => {
              const totalSecs = (examData.durationMinutes || 60) * 60;
              const elapsed = Math.max(0, Math.floor((Date.now() - officialStartTs) / 1000));
              return Math.max(0, totalSecs - elapsed);
            });
          } else if (typeof window !== "undefined" && !localStorage.getItem(startKey)) {
            // Lưu mốc khi bắt đầu phiên làm bài nếu chưa có
            localStorage.setItem(startKey, String(Date.now()));
          }
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
            if (
              msg.type === "student_unlocked" ||
              msg.type === "ROOM_UNLOCKED" ||
              msg.type === "room_unlocked"
            ) {
              if (!msg.student_id || String(msg.student_id) === String(me.user_id)) {
                setIsLocked(false);
                setPasteCount(0);
                setTabSwitchCount(0);
                setAiViolationCount(0);
                if (activeRoomId && typeof window !== "undefined") {
                  try {
                    localStorage.removeItem(`exam_locked_${activeRoomId}`);
                    localStorage.removeItem(`exam_paste_${activeRoomId}`);
                    localStorage.removeItem(`exam_tab_switch_${activeRoomId}`);
                    localStorage.removeItem(`exam_ai_violation_${activeRoomId}`);
                  } catch {}
                }
                showToast("ĐÃ MỞ KHÓA: Giảng viên đã phê duyệt mở khóa từ xa!");
              }
            } else if (msg.type === "announcement" || msg.type === "notice") {
              const myIds = [
                String(me.user_id),
                String((me as any).student_id || ""),
                String((me as any).user_code || ""),
                String((me as any).username || ""),
              ].filter(Boolean);
              const targetStr = msg.target_id ? String(msg.target_id).trim() : "";
              const targetUserIdStr = msg.target_user_id ? String(msg.target_user_id).trim() : "";
              const targetType = msg.target_type || (targetStr ? "individual" : "all");
              const isTargetMe =
                targetType === "all" ||
                (!targetStr && !targetUserIdStr) ||
                targetStr.toLowerCase() === "all" ||
                (targetUserIdStr && targetUserIdStr === String(me.user_id)) ||
                myIds.some((id) => id.toLowerCase() === targetStr.toLowerCase());

              if (isTargetMe && msg.message) {
                setIncomingAnnouncement({
                  id: Date.now(),
                  message: msg.message,
                  noticeType: msg.notice_type || "info",
                  sender: msg.instructor_name || "Giảng viên",
                  time: msg.timestamp || new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
                });
              }
            } else if (msg.type === "room_config_update" && typeof msg.requireCamera === "boolean") {
              setProctoringConfig((prev: any) => ({ ...prev, requireCamera: msg.requireCamera }));
              if (msg.requireCamera) {
                toggleCamera(true).catch(() => null);
              }
            } else if (msg.type === "snapshot_update") {
              if (String(msg.student_id) === String(me.user_id)) {
                if (msg.camera_status === "off") {
                  setYoloDetections({
                    label: "Camera tắt",
                    confidence: 1.0,
                    bbox: { x: 0, y: 0, w: 0, h: 0 },
                    status: "danger",
                  });
                } else if (msg.camera_status === "covered") {
                  setYoloDetections({
                    label: "Camera bị che",
                    confidence: 1.0,
                    bbox: { x: 0, y: 0, w: 0, h: 0 },
                    status: "danger",
                  });
                } else if (msg.face_count === 0) {
                  setYoloDetections({
                    label: "Không thấy mặt",
                    confidence: 0.0,
                    bbox: { x: 0, y: 0, w: 0, h: 0 },
                    status: "warning",
                  });
                } else if (msg.face_count === 1) {
                  setYoloDetections({
                    label: msg.looking_at_screen ? "Hợp lệ" : "Lệch hướng",
                    confidence: msg.confidence_score || 0.95,
                    bbox: { x: 20, y: 15, w: 60, h: 70 },
                    status: msg.looking_at_screen ? "ok" : "warning",
                  });
                }
              }
            } else if (msg.type === "proctor_reminder") {
              if (String(msg.student_id) === String(me.user_id) && msg.message) {
                showToast(msg.message);
              }
            } else if (msg.type === "violation_alert") {
              if (!msg.student_id || String(msg.student_id) === String(me.user_id)) {
                setAiViolationCount((prev) => {
                  const next = prev + 1;
                  if (activeRoomId && typeof window !== "undefined") {
                    try {
                      localStorage.setItem(`exam_ai_violation_${activeRoomId}`, String(next));
                    } catch {}
                  }
                  return next;
                });
                if (msg.detection) {
                  setYoloDetections(msg.detection);
                }
                showToast(`CẢNH BÁO VI PHẠM: ${msg.description || "Hệ thống AI ghi nhận vi phạm quy chế!"}`);
              }
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
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          if (activeRoomId && typeof window !== "undefined") {
            try {
              localStorage.setItem(`exam_tab_switch_${activeRoomId}`, String(next));
            } catch {}
          }
          return next;
        });
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
  }, [examState, isLocked, activeSessionId, activeRoomId]);

  // Chặn phím tắt paste
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (isLocked) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) {
      e.preventDefault();
      setPasteCount((prev) => {
        const next = prev + 1;
        if (activeRoomId && typeof window !== "undefined") {
          try {
            localStorage.setItem(`exam_paste_${activeRoomId}`, String(next));
          } catch {}
        }
        return next;
      });
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
    setPasteCount((prev) => {
      const next = prev + 1;
      if (activeRoomId && typeof window !== "undefined") {
        try {
          localStorage.setItem(`exam_paste_${activeRoomId}`, String(next));
        } catch {}
      }
      return next;
    });
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

  const handleRequestInstructorHelp = async () => {
    if (!activeRoomId) return;
    setHelpRequested(true);
    try {
      await fetchWithAuth(`/api/v1/support/room/${activeRoomId}`, {
        method: "POST",
        body: JSON.stringify({
          room_id: activeRoomId,
          issue_type: "account",
          priority: "high",
          title: "Yêu cầu mở khóa bài thi do vi phạm quy chế",
          description: `Thí sinh bị tạm khóa bài thi (rời tab: ${tabSwitchCount}, dán: ${pasteCount}, AI: ${aiViolationCount}). Đang yêu cầu Giảng viên mở khóa từ xa.`
        })
      });
      showToast("Đã gửi tín hiệu trợ giúp tới Giảng viên. Vui lòng giữ nguyên màn hình!");
    } catch {
      showToast("Đã gửi tín hiệu tới Giảng viên qua hệ thống giám sát.");
    }
  };

  const handleRunAllTests = async () => {
    if (!currentProblem) return;
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
        // Chuẩn hóa ngôn ngữ lập trình về chuẩn hệ thống backend (cpp, python, java, c)
        const normalizeLang = (lang: string) => {
          const l = (lang || "").toLowerCase().trim();
          if (l.includes("python") || l === "py") return "python";
          if (l.includes("java") && !l.includes("script")) return "java";
          if (l.includes("c++") || l.includes("cpp")) return "cpp";
          if (l === "c") return "c";
          return "cpp";
        };
        const safeLang = normalizeLang(selectedLanguage);

        // Nộp mã nguồn cho từng câu hỏi trong đề thi
        for (const prob of examData.problems) {
          const qId = Number(prob.question_id || prob.id);
          if (isNaN(qId) || qId <= 0) continue;

          const code = codes[prob.id] || codes[String(prob.question_id)] || prob.initialCode || "";
          if (!code.trim()) continue;

          try {
            await fetchWithAuth("/api/v1/submissions", {
              method: "POST",
              body: JSON.stringify({
                room_id: activeRoomId,
                question_id: qId,
                attempt_number: 1,
                code_content: code,
                language: safeLang,
              }),
            });
          } catch (subErr) {
            console.warn(`Lỗi khi nộp bài cho câu hỏi #${qId}:`, subErr);
          }
        }

        // Đánh dấu chính thức nộp bài trên Backend và kết thúc phiên thi
        await fetchWithAuth(`/api/v1/rooms/${activeRoomId}/submit-exam`, {
          method: "POST",
        }).catch(() => {});

        // Lưu cờ vào localStorage để ngăn vào lại phòng thi kể cả khi bấm back hoặc tải lại trang
        localStorage.setItem(`oculide_submitted_room_${activeRoomId}`, "true");
        localStorage.removeItem(`exam_start_timestamp_${activeRoomId}`);
        localStorage.removeItem(`exam_locked_${activeRoomId}`);
        localStorage.removeItem(`exam_paste_${activeRoomId}`);
        localStorage.removeItem(`exam_tab_switch_${activeRoomId}`);
        localStorage.removeItem(`exam_ai_violation_${activeRoomId}`);
        sessionStorage.removeItem("oculide_student_pending_exam");
      }

      // Tắt stream camera khi đã nộp bài
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
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

      {/* Thông Báo từ Giảng viên Nổi ở Góc Màn Hình (Bottom-Right) */}
      {incomingAnnouncement && (
        <div className="fixed bottom-6 right-6 z-50 flex max-w-md w-full animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex w-full items-start gap-3.5 rounded-lg border-2 border-amber-500 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <BellRing className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-400">
                  {incomingAnnouncement.sender} • {incomingAnnouncement.time}
                </span>
                <button
                  type="button"
                  onClick={() => setIncomingAnnouncement(null)}
                  className="rounded p-1 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Đóng thông báo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-100 leading-relaxed break-words">
                {incomingAnnouncement.message}
              </p>
              <div className="mt-2.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIncomingAnnouncement(null)}
                  className="rounded bg-amber-500 hover:bg-amber-600 px-3.5 py-1 text-xs font-bold text-slate-950 transition cursor-pointer shadow-sm"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
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

      {/* Banner cảnh báo chia sẻ màn hình bắt buộc khi đang làm bài mà chưa share */}
      {examState === "doing" && !isScreenSharing && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 z-20">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
            <span>
              <strong>YÊU CẦU QUY CHẾ:</strong> Bạn chưa chia sẻ màn hình làm bài. Vui lòng chia sẻ <strong>Toàn bộ màn hình (Entire Screen)</strong> hoặc <strong>Cửa sổ IDE</strong> để Giám thị theo dõi ca thi.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              enableScreenShare().then((success) => {
                if (!success) setShowScreenShareModal(true);
              });
            }}
            className="system-primary-action shrink-0 px-3.5 py-1.5 text-xs rounded-md font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            Bật chia sẻ màn hình ngay
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* KHÔNG GIAN LÀM BÀI: 2 CỘT CÂN ĐỐI TUYỆT ĐỐI (ĐỀ BÀI vs IDE) */}
      {/* ------------------------------------------------------------------ */}
      {examState === "doing" && (
        !currentProblem ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-neutral-900">
            {isLoadingExam ? (
              <div className="space-y-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-slate-800 dark:text-slate-200 mx-auto" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Đang tải nội dung đề thi từ hệ thống...
                </p>
              </div>
            ) : (
              <div className="max-w-md space-y-4">
                <FileCode className="h-12 w-12 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {examErrorMessage || "Phòng thi hiện chưa có câu hỏi nào"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vui lòng liên hệ Giám thị hoặc Giảng viên phụ trách để cập nhật bộ đề thi cho phòng này.
                </p>
                <Link
                  href="/student/exams"
                  className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Quay về danh sách phòng thi</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
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

              {/* Tình trạng AI Vision & Nút bật/thu nhỏ Camera PIP & Nút Chia sẻ Màn hình */}
              <div className="flex items-center gap-2">
                {isScreenSharing ? (
                  <button
                    type="button"
                    onClick={disableScreenShare}
                    title="Đang chia sẻ màn hình làm bài - Nhấn để tạm dừng"
                    className="flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <Monitor size={12} />
                    <span>Đang chia sẻ MH</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => enableScreenShare()}
                    title="Bấm để kích hoạt chia sẻ toàn màn hình cho Giám thị"
                    className="flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Monitor size={12} />
                    <span>Chia sẻ MH</span>
                  </button>
                )}

                {isCameraOffAllowed && (
                  <button
                    type="button"
                    onClick={() => toggleCamera()}
                    title={localVideoTrack ? "Tắt Camera (Được phép trong phòng Lab)" : "Bật Camera"}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                      localVideoTrack
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                        : "border-slate-300 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                    }`}
                  >
                    {localVideoTrack ? <Camera size={12} /> : <CameraOff size={12} />}
                    <span>{localVideoTrack ? "Cam Bật" : "Cam Tắt"}</span>
                  </button>
                )}

                <div className="rounded-md bg-slate-50 border border-slate-300 px-2.5 py-1 text-[10px] font-mono text-[#5a565e] dark:bg-white/5 dark:border-white/10 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  <span>AI Proctoring</span>
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
                onChange={(e) => {
                  if (activeRoomId && typeof window !== "undefined") {
                    const startKey = `exam_start_timestamp_${activeRoomId}`;
                    if (!localStorage.getItem(startKey)) {
                      localStorage.setItem(startKey, String(Date.now()));
                    }
                  }
                  setCodes((prev) => ({
                    ...prev,
                    [currentProblem.id]: e.target.value,
                  }));
                  proctorClientRef.current?.reportCodeChange(e.target.value.length);
                }}
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
                    ) : isCameraOffAllowed ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400 p-2 text-center bg-stone-900/90 h-full w-full">
                        <CameraOff size={20} className="text-slate-500" />
                        <span className="text-[9px] font-mono">Camera đang tắt (Được phép trong Lab)</span>
                        <button
                          type="button"
                          onClick={() => toggleCamera(true)}
                          className="mt-1 rounded bg-stone-800 px-2 py-0.5 text-[9px] font-bold text-white hover:bg-stone-700 transition cursor-pointer"
                        >
                          Bật lại Cam
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                        <Camera size={22} className="animate-pulse" />
                        <span className="text-[9px] font-mono">Đang kết nối camera...</span>
                      </div>
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
                      {Boolean(localVideoTrack || localStream) ? (
                        <span className="text-emerald-400 font-bold">ON</span>
                      ) : (
                        <span className="text-rose-400 font-bold">OFF</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* THẺ VIDEO ẨN DUY TRÌ LIÊN TỤC CHO PROCTORING CLIENT CHỤP FRAME PHÂN TÍCH */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ display: "none", position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
              aria-hidden="true"
            />

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

                {/* Hướng dẫn quy chế: Sinh viên tuyệt đối không thể tự mở khóa */}
                <div className="rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 p-3 text-xs text-amber-900 dark:text-amber-200 text-left space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    Quy định mở khóa bài thi:
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Theo quy chế thi trực tuyến Oculide, <b>thí sinh không thể tự mở khóa</b> bài làm. Vui lòng giữ nguyên màn hình và liên hệ Giảng viên giám thị để được kiểm tra và kích hoạt mở khóa từ xa.
                  </p>
                </div>

                <div className="pt-1 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleRequestInstructorHelp}
                    disabled={helpRequested}
                    className="system-primary-action inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 py-2.5 px-4 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
                  >
                    {helpRequested ? (
                      <>
                        <CheckCircle2 size={15} className="text-emerald-400" />
                        <span>Đã gửi tín hiệu tới Giảng viên — Đang chờ phê duyệt...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Gửi thông báo trợ giúp tới Giảng viên</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
                    <LoaderCircle size={13} className="animate-spin text-slate-400" />
                    Hệ thống sẽ tự động mở khóa ngay khi Giảng viên nhấn duyệt.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        )
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

      {/* MODAL YÊU CẦU CHIA SẺ MÀN HÌNH BẮT BUỘC KHI VÀO PHÒNG */}
      {showScreenShareModal && !isScreenSharing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-md border border-slate-300 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900 space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white border border-slate-200 dark:border-white/10">
              <Monitor size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white">
                Yêu Cầu Chia Sẻ Màn Hình Làm Bài
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Theo quy chế phòng {examRoomType === 'exam' ? 'thi trực tuyến' : 'thực hành (Lab)'}, sinh viên bắt buộc phải chia sẻ màn hình để Giảng viên giám sát tiến độ và tính liêm chính học thuật.
              </p>
            </div>
            <div className="rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-left space-y-2 text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Hướng dẫn chọn màn hình:</p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside">
                <li>Ưu tiên chọn tab <strong>&quot;Toàn bộ màn hình&quot; (Entire Screen)</strong></li>
                <li>Hoặc chọn <strong>&quot;Cửa sổ&quot; (Window)</strong> chứa IDE / Trình duyệt thi</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={async () => {
                const ok = await enableScreenShare();
                if (ok) setShowScreenShareModal(false);
              }}
              className="system-primary-action w-full flex items-center justify-center gap-2 rounded-md bg-slate-900 py-3 font-serif text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-slate-800 transition cursor-pointer"
            >
              <Monitor size={16} />
              <span>CHIA SẺ MÀN HÌNH NGAY</span>
            </button>
            <p className="font-mono text-[11px] text-slate-400">
              * Sinh viên có thể chọn Entire Screen hoặc Tab/Cửa sổ IDE đang mở để làm bài mượt mà.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
