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

export const DEFAULT_PROCTORING_POLICY: ProctoringPolicy = {
  webcam: 'required',
  screenShare: 'required',
  clipboard: 'block',
  notifications: ['Bảng giám sát', 'Thông báo nổi'],
  faceMissingThresholdSec: 15,
  faceMissingSeverity: 'medium',
  webcamLostThresholdSec: 10,
  webcamLostSeverity: 'high',
  screenStopThresholdSec: 5,
  screenStopSeverity: 'critical',
  tabSwitchLimit: 2,
  tabSwitchSeverity: 'high',
};

import {
  getStoredInstructorSchedules,
  INITIAL_INSTRUCTOR_SCHEDULES,
  ScheduleSessionItem,
  INSTRUCTOR_SCHEDULES_STORAGE_KEY,
  INSTRUCTOR_ROOMS_STORAGE_KEY,
  getStoredQuestionTemplates,
} from '@/components/instructor/classes/types';

export { INSTRUCTOR_SCHEDULES_STORAGE_KEY, INSTRUCTOR_ROOMS_STORAGE_KEY };
export const SCHEDULES_STORAGE_KEY = 'oculide_schedules_mock';

function mapInstructorSessionToExamSchedule(
  item: ScheduleSessionItem,
  templatesMap?: Map<string, { title: string; durationMinutes?: number }>
): ExamScheduleItem {
  let status: ScheduleStatus = 'scheduled';
  if (item.status === 'Đang diễn ra') status = 'ongoing';
  else if (item.status === 'Đã kết thúc') status = 'completed';

  const tplId = item.templateId || (item.type === 'LAB' ? 'TPL-LAB-01' : 'TPL-EXAM-01');
  const matchedTpl = templatesMap?.get(tplId);

  const normalizedClassId = (item.classCode || 'CS101').split('-')[0];
  const displayDate =
    item.date === 'Hôm nay'
      ? 'Hôm nay (28/10/2026)'
      : item.date === 'Hôm qua'
      ? 'Hôm qua (27/10/2026)'
      : item.date || '28/10/2026';

  const titleLower = (item.title + ' ' + (item.templateTitle || '')).toLowerCase();
  let examFormat: ExamFormat = 'coding';
  if (titleLower.includes('trắc nghiệm') || titleLower.includes('quiz') || titleLower.includes('mcq')) {
    examFormat = 'quiz';
  } else if (titleLower.includes('cuối kỳ') || titleLower.includes('hỗn hợp') || titleLower.includes('final')) {
    examFormat = 'hybrid';
  }

  return {
    id: item.id || item.roomCode,
    title: item.title,
    classId: normalizedClassId,
    className: item.className,
    studentCount: item.enrolledStudents || 45,
    lecturer: item.lecturer || 'Thầy Nguyễn Văn Nam',
    templateId: tplId,
    templateTitle: matchedTpl?.title || item.templateTitle || item.title,
    templateVersion: 'v1 • Sẵn sàng',
    date: displayDate,
    startTime: item.startTime || '08:00',
    endTime: item.endTime || '09:30',
    durationMinutes:
      item.durationMinutes || matchedTpl?.durationMinutes || (item.type === 'LAB' ? 120 : 90),
    room: item.type === 'LAB' ? 'Phòng thực hành Lab' : 'Phòng kiểm tra tập trung',
    roomCode: item.roomCode,
    roomPassword: item.passcode || '••••••',
    status,
    examFormat,
    proctoringPolicy: item.isAiProctored
      ? DEFAULT_PROCTORING_POLICY
      : {
          ...DEFAULT_PROCTORING_POLICY,
          webcam: 'optional',
          screenShare: 'optional',
          clipboard: 'allow',
        },
    isLobbyOpen: status === 'ongoing',
    readyStudentCount: item.attendedStudents || 0,
    deviceCheckCount: 0,
    absentCount: Math.max(0, (item.enrolledStudents || 0) - (item.attendedStudents || 0)),
    createdAt: '28/10/2026',
    creatorRole: 'instructor',
  };
}

export const INITIAL_SCHEDULES: ExamScheduleItem[] = [];

/**
 * Đọc toàn bộ danh sách lịch kiểm tra từ local storage nếu có
 */
export function getStoredSchedules(): ExamScheduleItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveStoredSchedules(schedules: ExamScheduleItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules));
  } catch {
    // ignore
  }
}
