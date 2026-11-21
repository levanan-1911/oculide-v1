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
  status: 'waiting' | 'in_progress' | 'ended';
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
  const status = String(room.status || '').toLowerCase();
  if (status !== 'in_progress' && status !== 'dang_dien_ra') return false;
  if (room.is_active === false || room.is_active === 0 || room.is_active === '0' || room.is_active === 'false') {
    return false;
  }

  if (room.end_time) {
    const endTime = new Date(String(room.end_time)).getTime();
    if (Number.isFinite(endTime) && endTime <= now) return false;
  }

  return true;
}

export const INSTRUCTOR_STORAGE_KEY = 'oculide_instructor_classes_mock';
export const INSTRUCTOR_ROOMS_STORAGE_KEY = 'oculide_instructor_rooms_mock';
export const INSTRUCTOR_SCHEDULES_STORAGE_KEY = 'oculide_instructor_schedules_mock';
export const CURRENT_INSTRUCTOR_NAME = 'Thầy Nguyễn Văn Nam';

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

export const SAMPLE_QUESTION_TEMPLATES: QuestionTemplate[] = [];

export const INITIAL_INSTRUCTOR_SCHEDULES: ScheduleSessionItem[] = [];

/**
 * Đọc toàn bộ lịch & phiên kiểm tra từ nguồn duy nhất của Giảng viên
 * (kết hợp INSTRUCTOR_SCHEDULES_STORAGE_KEY và INSTRUCTOR_ROOMS_STORAGE_KEY)
 */
export function getStoredInstructorSchedules(): ScheduleSessionItem[] {
  if (typeof window === 'undefined') return [];

  let merged: ScheduleSessionItem[] = [];

  try {
    const rawSched = localStorage.getItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY);
    if (rawSched) {
      const parsed: ScheduleSessionItem[] = JSON.parse(rawSched);
      if (Array.isArray(parsed) && parsed.length > 0) {
        merged = parsed;
      }
    }

    // Đồng bộ thêm các phòng tạo từ /instructor/room nếu chưa có trong danh sách
    const rawRooms = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
    if (rawRooms) {
      const parsedRooms: RoomSession[] = JSON.parse(rawRooms);
      if (Array.isArray(parsedRooms)) {
        parsedRooms.forEach((room) => {
          const code = room.id;
          if (!code) return;
          const existingIdx = merged.findIndex(
            (m) => m.roomCode.toLowerCase() === code.toLowerCase()
          );
          const mappedStatus: ScheduleSessionItem['status'] =
            room.status === 'in_progress'
              ? 'Đang diễn ra'
              : room.status === 'ended'
              ? 'Đã kết thúc'
              : 'Sắp diễn ra';

          if (existingIdx >= 0) {
            // Đồng bộ trạng thái và bộ đề mới nhất từ phòng
            merged[existingIdx] = {
              ...merged[existingIdx],
              status: mappedStatus,
              templateId: room.templateId || merged[existingIdx].templateId,
              templateTitle: room.templateTitle || merged[existingIdx].templateTitle,
              durationMinutes: room.durationMinutes || merged[existingIdx].durationMinutes,
            };
          } else {
            merged.unshift({
              id: `SES-${code}`,
              classCode: room.classId || 'CS101',
              className: room.className || 'Nhập môn Lập trình C/C++',
              title: room.title || `Ca kiểm tra ${room.classId}`,
              type: room.type === 'lab' ? 'LAB' : 'EXAM',
              language: room.templateLanguage || 'C++',
              startTime: room.startTime || '08:00',
              endTime: room.endTime || '10:00',
              date: room.scheduledDate || 'Hôm nay',
              roomCode: code,
              passcode: room.password || '123456',
              status: mappedStatus,
              enrolledStudents: Array.isArray(room.attendees) ? room.attendees.length : 45,
              attendedStudents: Array.isArray(room.attendees)
                ? room.attendees.filter((a) => a.status !== 'absent').length
                : 0,
              isAiProctored: Boolean(
                room.proctoringConfig?.aiFaceDetection ||
                  room.proctoringConfig?.aiObjectDetection ||
                  room.proctoringConfig?.lockdownFullscreen
              ),
              templateId: room.templateId || (room.type === 'lab' ? 'TPL-LAB-01' : 'TPL-EXAM-01'),
              templateTitle: room.templateTitle || room.title,
              durationMinutes: room.durationMinutes || (room.type === 'lab' ? 120 : 90),
              lecturer: CURRENT_INSTRUCTOR_NAME,
            });
          }
        });
      }
    }
  } catch {
    // ignore
  }

  return merged;
}

export function saveStoredInstructorSchedules(items: ScheduleSessionItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('storage'));
  } catch {
    // ignore
  }
}

export const TEMPLATES_STORAGE_KEY = 'oculide_instructor_templates_v2';

export function getStoredClasses(): ClassRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(INSTRUCTOR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function getStoredQuestionTemplates(): QuestionTemplate[] {
  if (typeof window === 'undefined') return SAMPLE_QUESTION_TEMPLATES;
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return SAMPLE_QUESTION_TEMPLATES;
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
