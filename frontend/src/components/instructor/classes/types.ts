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

export interface TemplateQuestionItem {
  id: string;
  title: string;
  difficulty: 'Dễ' | 'Trung bình' | 'Khó';
  description: string;
  sampleInput?: string;
  sampleOutput?: string;
  testCasesCount: number;
}

export interface QuestionTemplate {
  id: string;
  title: string;
  type: 'lab' | 'exam';
  category: string;
  language: string;
  questionCount: number;
  durationMinutes: number;
  description: string;
  questions?: TemplateQuestionItem[];
}

export interface RoomAttendee {
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: 'waiting' | 'in_exam' | 'absent';
  joinedAt?: string;
  device?: string;
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
}

export interface RoomSession {
  id: string; // Mã phòng ngẫu nhiên ví dụ: CS101a8B
  classId: string;
  className: string;
  password: string; // Mã PIN ngẫu nhiên 6 ký tự ví dụ: k9A3zP
  type: 'lab' | 'exam';
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

export const INSTRUCTOR_STORAGE_KEY = 'oculide_instructor_classes_mock';
export const INSTRUCTOR_ROOMS_STORAGE_KEY = 'oculide_instructor_rooms_mock';
export const INSTRUCTOR_SCHEDULES_STORAGE_KEY = 'oculide_instructor_schedules_mock';
export const CURRENT_INSTRUCTOR_NAME = 'Thầy Nguyễn Văn Nam';

/**
 * Sinh mã phòng ngẫu nhiên: [MãLớp][3 ký tự ngẫu nhiên hoa/thường/số]
 * Ví dụ: CS101a8B, PRJ301x9K
 */
export function generateClassRoomCode(classId: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let rand = '';
  for (let i = 0; i < 3; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${classId.trim().toUpperCase()}${rand}`;
}

/**
 * Sinh mật khẩu phòng ngẫu nhiên gồm 6 ký tự chữ và số in hoa thường
 * Ví dụ: k9A3zP, 7bM4xQ
 */
export function generateRandomAlphanumericPassword(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const SAMPLE_QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    id: 'TPL-LAB-01',
    title: 'Lab 01: Cấu trúc điều khiển & Mảng một chiều',
    type: 'lab',
    category: 'Lập trình căn bản',
    language: 'C++',
    questionCount: 3,
    durationMinutes: 120,
    description: 'Bài tập rèn luyện cấu trúc rẽ nhánh, vòng lặp và thao tác duyệt mảng số nguyên.',
    questions: [
      {
        id: 'Q-01',
        title: 'Tìm số nguyên tố lớn nhất trong mảng',
        difficulty: 'Dễ',
        description: 'Viết hàm nhận vào mảng số nguyên arr. Trả về số nguyên tố lớn nhất tìm thấy hoặc -1.',
        sampleInput: '[3, 7, 10, 11, 4, 15]',
        sampleOutput: '11',
        testCasesCount: 5,
      },
      {
        id: 'Q-02',
        title: 'Đảo ngược mảng in-place O(1)',
        difficulty: 'Dễ',
        description: 'Đảo ngược vị trí các phần tử của mảng không dùng mảng phụ.',
        sampleInput: '[1, 2, 3, 4, 5]',
        sampleOutput: '[5, 4, 3, 2, 1]',
        testCasesCount: 4,
      },
      {
        id: 'Q-03',
        title: 'Tìm dãy con liên tiếp có tổng lớn nhất (Kadane)',
        difficulty: 'Trung bình',
        description: 'Áp dụng thuật toán Kadane để tìm tổng lớn nhất của dãy con liên tiếp trong mảng.',
        sampleInput: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]',
        sampleOutput: '6 (dãy [4, -1, 2, 1])',
        testCasesCount: 8,
      },
    ],
  },
  {
    id: 'TPL-LAB-02',
    title: 'Lab 02: Cấu trúc rẽ nhánh If/Else & Switch-Case',
    type: 'lab',
    category: 'Lập trình căn bản',
    language: 'C++',
    questionCount: 4,
    durationMinutes: 120,
    description: 'Thực hành các cấu trúc điều khiển rẽ nhánh phức hợp và xử lý mã lỗi đầu vào.',
  },
  {
    id: 'TPL-LAB-03',
    title: 'Lab 03: Vòng lặp For/While & Mảng 2 chiều',
    type: 'lab',
    category: 'Lập trình căn bản',
    language: 'C++',
    questionCount: 3,
    durationMinutes: 120,
    description: 'Thực hành thao tác duyệt ma trận và giải thuật tìm kiếm trên mảng 2 chiều.',
  },
  {
    id: 'TPL-LAB-04',
    title: 'Lab 04: Danh sách liên kết đơn & Ngăn xếp (Stack)',
    type: 'lab',
    category: 'Cấu trúc dữ liệu',
    language: 'C++',
    questionCount: 4,
    durationMinutes: 120,
    description: 'Cài đặt và thao tác Singly Linked List, đảo ngược danh sách và ứng dụng Stack.',
  },
  {
    id: 'TPL-LAB-05',
    title: 'Lab 05: Thiết lập Tomcat Servlet & MVC Pattern',
    type: 'lab',
    category: 'Lập trình Web',
    language: 'Java',
    questionCount: 2,
    durationMinutes: 120,
    description: 'Thực hành cấu hình web.xml, tạo Controller Servlet và render view JSP.',
  },
  {
    id: 'TPL-EXAM-01',
    title: 'Kiểm tra quá trình • Vòng lặp & Mảng số nguyên',
    type: 'exam',
    category: 'Lập trình C/C++',
    language: 'C++',
    questionCount: 3,
    durationMinutes: 60,
    description: 'Đề kiểm tra quá trình gồm 3 câu lập trình thuật toán cơ bản, có chấm điểm tự động testcase.',
  },
  {
    id: 'TPL-EXAM-02',
    title: 'Kiểm tra giữa kỳ • Cấu trúc dữ liệu & Giải thuật',
    type: 'exam',
    category: 'Cấu trúc dữ liệu',
    language: 'C++',
    questionCount: 3,
    durationMinutes: 90,
    description: 'Đề thi thực hành giữa kỳ: Linked List, Stack/Queue và Cây nhị phân tìm kiếm BST.',
  },
  {
    id: 'TPL-EXAM-03',
    title: 'Kiểm tra quá trình • Java Web MVC & JDBC DAO',
    type: 'exam',
    category: 'Java Web',
    language: 'Java',
    questionCount: 3,
    durationMinutes: 90,
    description: 'Đề kiểm tra thực hành xây dựng CRUD với Servlet, JSP và kết nối MySQL qua JDBC.',
  },
];
