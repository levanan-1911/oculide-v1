export type ClassStatus = 'Chưa mở' | 'Hoạt động' | 'Đã kết thúc';
export type StudentStatus = 'Đang học' | 'Tạm dừng';
export type LabStatus = 'Đang mở' | 'Đã đóng' | 'Đã kết thúc';
export type ExamStatus = 'Sắp diễn ra' | 'Đang diễn ra' | 'Đã kết thúc';

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  status?: StudentStatus;
  attendanceRate?: number;
}

export interface ClassLab {
  id: string;
  labNumber: number;
  title: string;
  templateId?: string;
  language: string;
  questionCount: number;
  scheduleNote?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  isProctored?: boolean;
  roomCode?: string;
  roomPassword?: string;
  status: LabStatus;
  submissionCount: number;
}

export interface ClassExam {
  id: string;
  title: string;
  templateId?: string;
  type: 'Kiểm tra giữa kỳ' | 'Kiểm tra quá trình' | 'Thi kết thúc môn' | 'Kiểm tra thực hành';
  language: string;
  durationMinutes: number;
  scheduledAt: string;
  questionCount: number;
  isProctored: boolean;
  roomCode?: string;
  roomPassword?: string;
  status: ExamStatus;
  submissionCount: number;
  isPublished?: boolean;
}

export interface ClassRow {
  id: string;
  name: string;
  semester: string;
  startDate: string;
  endDate: string;
  roomCode?: string;
  roomPassword?: string;
  status: ClassStatus;
  studentCount: number;
  lecturer: string;
  students?: StudentRow[];
  labs?: ClassLab[];
  exams?: ClassExam[];
}

export interface TestCaseItem {
  id: string;
  input?: string;
  inputData?: string;
  expectedOutput: string;
  isHidden: boolean;
  points?: number;
}

export type TemplateTestCaseItem = TestCaseItem & {
  points: number;
};

export interface TemplateQuestionItem {
  id: string;
  title: string;
  difficulty: 'Dễ' | 'Trung bình' | 'Khó';
  description: string;
  sampleInput?: string;
  sampleOutput?: string;
  testCases?: (TestCaseItem | TemplateTestCaseItem)[];
  testCasesCount: number;
  maxPoints?: number;
  max_points?: number;
}

export interface QuestionTemplate {
  id: string;
  title: string;
  type: 'lab' | 'midterm' | 'final' | 'exam';
  category: string;
  language: string;
  questionCount: number;
  durationMinutes?: number;
  description?: string;
  questions?: TemplateQuestionItem[];
  updatedAt?: string;
  lecturer?: string;
}

export interface RoomAttendee {
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: 'waiting' | 'in_exam' | 'absent' | 'late';
  joinedAt?: string;
  cameraReady?: boolean;
}

export interface ScheduleSessionItem {
  id: string;
  classCode: string;
  className: string;
  title: string;
  type: 'LAB' | 'EXAM';
  language: string;
  startTime: string;
  endTime: string;
  date: string;
  roomCode: string;
  passcode: string;
  status: 'Đang diễn ra' | 'Sắp diễn ra' | 'Đã kết thúc';
  enrolledStudents: number;
  attendedStudents: number;
  isAiProctored: boolean;
  templateId?: string;
  templateTitle?: string;
  durationMinutes?: number;
  lecturer?: string;
}

export interface RoomSession {
  id: string; // Mã phòng ngẫu nhiên ví dụ: CS101a8B
  classId: string;
  className: string;
  password: string; // Mã PIN ngẫu nhiên 6 ký tự ví dụ: k9A3zP
  type: 'lab' | 'exam' | 'midterm' | 'final';
  title: string;
  templateId?: string;
  templateTitle?: string;
  templateLanguage?: string;
  durationMinutes: number;
  scheduledDate?: string; // Ngày diễn ra ví dụ: '2026-10-28' hoặc '28/10/2026'
  startTime?: string; // Giờ bắt đầu ví dụ: '08:00'
  endTime?: string; // Giờ kết thúc ví dụ: '10:00'
  savedToSchedule?: boolean; // Đã lưu vào lịch giảng dạy
  status: 'waiting' | 'in_progress' | 'ended' | 'chua_mo' | 'dang_dien_ra' | 'da_ket_thuc' | string;
  createdAt: string;
  proctoringConfig: {
    lockdownFullscreen: boolean;
    aiFaceDetection: boolean;
    aiObjectDetection: boolean; // phát hiện smartphone
    allowTabSwitch: boolean; // Lab: true, Exam: false
  };
  attendees: RoomAttendee[];
}

export function isRoomCurrentlyRunning(
  room: { status?: unknown; is_active?: unknown; end_time?: unknown },
  now: number = Date.now()
): boolean {
  const status = String(room.status || '').toLowerCase().trim();
  const terminalStatuses = ['ended', 'completed', 'da_dong', 'da_huy', 'da_ket_thuc', 'closed', 'cancelled'];
  if (terminalStatuses.includes(status)) return false;
  if (status !== 'in_progress' && status !== 'dang_dien_ra') return false;
  if (room.is_active === false || room.is_active === 0 || room.is_active === '0' || room.is_active === 'false') {
    return false;
  }
  if (room.end_time) {
    const endMs = new Date(String(room.end_time)).getTime();
    if (Number.isFinite(endMs) && endMs <= now) {
      return false;
    }
  }

  return true;
}

/**
 * Sinh mã phòng ngẫu nhiên gồm 8 ký tự chữ in hoa và số.
 */
export function generateClassRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomValues = new Uint32Array(8);
  globalThis.crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (value) => chars[value % chars.length]).join('');
}

/**
 * Sinh mật khẩu phòng ngẫu nhiên gồm tối đa 8 ký tự chữ và số in hoa thường
 * Ví dụ: k9A3zP, 7bM4xQ
 */
export function generateRandomAlphanumericPassword(length: number = 6): string {
  if (!Number.isInteger(length) || length < 1 || length > 8) {
    throw new RangeError('Mật khẩu phòng phải có từ 1 đến 8 ký tự.');
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const randomValues = new Uint32Array(length);
  globalThis.crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (value) => chars[value % chars.length]).join('');
}

export const TEMPLATES_STORAGE_KEY = 'oculide_instructor_templates_v2';

export function getStoredClasses(): ClassRow[] {
  return [];
}

export function getStoredQuestionTemplates(): QuestionTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveStoredQuestionTemplates(templates: QuestionTemplate[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    window.dispatchEvent(new Event('storage'));
  } catch {
    // ignore
  }
}

export function syncClassesWithTemplate(updatedTemplate: QuestionTemplate): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event('storage'));
  } catch {
    // ignore
  }
}
