export type ExamStatus = "Sắp diễn ra" | "Đang diễn ra" | "Đã hoàn thành";

export interface StudentExam {
  id: string;
  roomId?: number;
  title: string;
  subject: string;
  classCode?: string;
  roomType?: "exam" | "lab" | "classroom";
  instructor: string;
  startTime: string;
  rawStartTime?: string;
  duration: number; // Tính bằng phút
  status: ExamStatus;
  roomCode: string;
  submissionsCount?: number;
}

export interface ApiStudentRoom {
  room_id: number;
  room_code: string;
  room_name: string;
  room_type?: string;
  instructor_id?: number;
  instructor_name?: string | null;
  class_id?: number | null;
  class_code?: string | null;
  class_name?: string | null;
  course_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number | null;
  status?: string | null;
  is_active?: boolean | null;
  student_session_status?: string | null;
  student_submissions_count?: number | null;
}

export function formatRoomStartTime(iso?: string | null): string {
  if (!iso) return "Chưa xếp lịch";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${hh}:${mm}, ${dd}/${mo}/${yyyy}`;
}

export function mapApiRoomToStudentExam(room: ApiStudentRoom): StudentExam {
  const rawStatus = (room.status || "chua_mo").toLowerCase();
  const sessionStatus = (room.student_session_status || "").toLowerCase();
  const isActive = room.is_active !== false;
  const now = Date.now();
  const endMs = room.end_time ? new Date(room.end_time).getTime() : NaN;

  let status: ExamStatus = "Sắp diễn ra";
  if (
    sessionStatus === "da_nop" ||
    sessionStatus === "completed" ||
    rawStatus === "da_dong" ||
    rawStatus === "da_huy" ||
    rawStatus === "ended" ||
    !isActive
  ) {
    status = "Đã hoàn thành";
  } else if (rawStatus === "dang_dien_ra" || rawStatus === "in_progress") {
    status = "Đang diễn ra";
  } else if (!Number.isNaN(endMs) && endMs < now) {
    status = "Đã hoàn thành";
  } else {
    status = "Sắp diễn ra";
  }

  const subjectLabel =
    room.course_name && room.class_name
      ? `${room.course_name} - ${room.class_name}`
      : room.class_name || room.course_name || (room.room_type === "exam" ? "Thi thực hành lập trình" : "Thực hành Lab");

  return {
    id: String(room.room_id),
    roomId: room.room_id,
    title: room.room_name || room.room_code,
    subject: subjectLabel,
    classCode: room.class_code || undefined,
    roomType: (room.room_type as "exam" | "lab" | "classroom") || "lab",
    instructor: room.instructor_name || "Giảng viên bộ môn",
    startTime: formatRoomStartTime(room.start_time),
    rawStartTime: room.start_time || undefined,
    duration: Number(room.duration_minutes) || 60,
    status,
    roomCode: room.room_code,
    submissionsCount: Number(room.student_submissions_count) || 0,
  };
}

export interface StudentProfile {
  id: string;
  mssv: string;
  fullName: string;
  email: string;
  avatar?: string;
  className: string;
  major: string;
  role: "student";
  ipAddress: string;
  deviceFingerprint: string;
}

export interface StudentAccount extends StudentProfile {
  passcode: string; // Mật khẩu đăng nhập hệ thống
}

// Thông tin Sinh viên hiện tại đang đăng nhập trong phiên
export const currentStudent: StudentProfile = {
  id: "STU-184801",
  mssv: "SE184801",
  fullName: "Nguyễn Minh Anh",
  email: "anh.nm@school.edu.vn",
  avatar: "/avatars/student-default.png",
  className: "SE1804-NET",
  major: "Kỹ thuật Phần mềm (Software Engineering)",
  role: "student",
  ipAddress: "172.16.20.105 (Campus Network)",
  deviceFingerprint: "FP-OCULIDE-9982X",
};

// Danh sách Tài khoản Sinh viên mẫu phục vụ Đăng nhập & Kiểm tra mật khẩu
export const mockStudentAccounts: StudentAccount[] = [
  {
    ...currentStudent,
    passcode: "123456",
  },
  {
    id: "STU-184802",
    mssv: "SE184802",
    fullName: "Trần Bảo Nam",
    email: "nam.tb@school.edu.vn",
    className: "SE1804-NET",
    major: "An toàn Thông tin",
    role: "student",
    ipAddress: "172.16.20.106",
    deviceFingerprint: "FP-OCULIDE-8831Y",
    passcode: "123456",
  },
];

export const studentExams: StudentExam[] = [];

export const studentNotifications = [
  {
    id: 1,
    title: "Lịch thi sắp tới",
    message: "Kiểm tra thực hành C++ dự kiến diễn ra ngày 28/10/2026.",
    time: "Hôm nay",
    unread: true,
  },
  {
    id: 2,
    title: "Nhắc nhở chuẩn bị thiết bị",
    message: "Hãy kiểm tra webcam, mạng và trình duyệt trước giờ thi.",
    time: "Hôm nay",
    unread: true,
  },
  {
    id: 3,
    title: "Hoàn thành bài thi",
    message: "Bài thực hành Python đã kết thúc.",
    time: "20/10/2026",
    unread: false,
  },
];