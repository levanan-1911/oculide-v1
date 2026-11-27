export type ScheduleStatus = 'ongoing' | 'scheduled' | 'draft' | 'completed' | 'cancelled';
export type ExamFormat = 'coding' | 'quiz' | 'hybrid';

export interface ProctoringPolicy {
  webcam: 'required' | 'optional' | 'disabled';
  screenShare: 'required' | 'optional' | 'disabled';
  clipboard: 'block' | 'warn' | 'allow';
  notifications: string[];
  faceMissingThresholdSec: number;
  faceMissingSeverity: 'low' | 'medium' | 'high' | 'critical';
  webcamLostThresholdSec: number;
  webcamLostSeverity: 'low' | 'medium' | 'high' | 'critical';
  screenStopThresholdSec: number;
  screenStopSeverity: 'low' | 'medium' | 'high' | 'critical';
  tabSwitchLimit: number;
  tabSwitchSeverity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ExamScheduleItem {
  id: string; // Mã ca thi (ví dụ: "PRJ301-MID")
  room_id?: number;
  title: string; // Tên ca thi (ví dụ: "Kiểm tra giữa kỳ • Lập trình Web")
  courseCode?: string; // Mã học phần (ví dụ: "CS404")
  courseName?: string; // Tên học phần (ví dụ: "Lập trình thuật toán & Cấu trúc dữ liệu")
  creditHours?: number; // Số tín chỉ (ví dụ: 3)
  examKind?: 'final' | 'midterm';
  examKindLabel?: string; // "Thi Kết Thúc Học Phần" | "Thi Giữa Kỳ"
  classId: string; // Mã lớp (ví dụ: "SE1848")
  className: string; // Tên lớp (ví dụ: "Lập trình Web")
  studentCount: number; // Sĩ số (ví dụ: 48)
  lecturer: string; // Giảng viên khởi tạo (ví dụ: "Thầy Nguyễn Văn Nam")
  creatorRole?: string; // 'admin' | 'instructor'
  creatorLabel?: string; // 'Quản trị viên (Khảo thí)' | 'Giảng viên phụ trách'
  creatorName?: string; // Tên người tạo
  createdBy?: string; // Tên người tạo
  templateId?: string | null; // Mã bộ đề (ví dụ: "TPL-EXAM-01")
  templateTitle?: string; // Tên bộ đề (ví dụ: "Xây dựng ứng dụng Web tương tác")
  templateType?: string; // 'final_exam' | 'exam' | 'lab' | 'midterm'
  templateVersion: string; // Phiên bản đề (ví dụ: "v1 • Sẵn sàng")
  date: string; // Ngày thi (dd/mm/yyyy hoặc yyyy-mm-dd)
  startTime: string; // Giờ bắt đầu (hh:mm)
  endTime: string; // Giờ kết thúc (hh:mm)
  durationMinutes: number; // Thời lượng thi (phút)
  room: string; // Phòng máy / Địa điểm thi (ví dụ: "Phòng máy LAB-302" hoặc "Online tập trung")
  roomCode: string; // Mã phòng thi (ví dụ: "OC-482915")
  roomPassword?: string; // Mật khẩu phòng (ví dụ: "123456")
  status: ScheduleStatus;
  rawStatus?: string;
  examFormat?: ExamFormat;
  proctoringPolicy: ProctoringPolicy;
  isLobbyOpen?: boolean;
  readyStudentCount?: number;
  deviceCheckCount?: number;
  absentCount?: number;
  attendedStudents?: number;
  pendingViolations?: number;
  createdAt?: string;
}
