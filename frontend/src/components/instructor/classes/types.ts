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

export const INITIAL_INSTRUCTOR_SCHEDULES: ScheduleSessionItem[] = [
  {
    id: 'SES-01',
    classCode: 'CS101-A',
    className: 'Nhập môn Lập trình C/C++',
    title: 'Lab 03: Vòng lặp For/While & Mảng 1 chiều',
    type: 'LAB',
    language: 'C++',
    startTime: '07:30',
    endTime: '09:50',
    date: 'Hôm nay',
    roomCode: 'CS101-LAB3',
    passcode: '883921',
    status: 'Đang diễn ra',
    enrolledStudents: 48,
    attendedStudents: 46,
    isAiProctored: true,
    templateId: 'TPL-LAB-03',
    templateTitle: 'Lab 03: Vòng lặp For/While & Mảng 2 chiều',
    durationMinutes: 120,
    lecturer: CURRENT_INSTRUCTOR_NAME,
  },
  {
    id: 'SES-02',
    classCode: 'PRJ301',
    className: 'Lập trình ứng dụng Java Web',
    title: 'Kiểm tra quá trình: Servlet & MVC Pattern',
    type: 'EXAM',
    language: 'Java',
    startTime: '13:30',
    endTime: '15:00',
    date: 'Hôm nay',
    roomCode: 'PRJ-KT01',
    passcode: '901244',
    status: 'Sắp diễn ra',
    enrolledStudents: 45,
    attendedStudents: 0,
    isAiProctored: true,
    templateId: 'TPL-EXAM-03',
    templateTitle: 'Kiểm tra quá trình • Java Web MVC & JDBC DAO',
    durationMinutes: 90,
    lecturer: CURRENT_INSTRUCTOR_NAME,
  },
  {
    id: 'SES-03',
    classCode: 'CSD201',
    className: 'Cấu trúc dữ liệu & Giải thuật',
    title: 'Lab 04: Cây nhị phân tìm kiếm (BST)',
    type: 'LAB',
    language: 'Python',
    startTime: '15:15',
    endTime: '17:35',
    date: 'Hôm nay',
    roomCode: 'CSD-BST4',
    passcode: '128472',
    status: 'Sắp diễn ra',
    enrolledStudents: 42,
    attendedStudents: 0,
    isAiProctored: false,
    templateId: 'TPL-LAB-04',
    templateTitle: 'Lab 04: Danh sách liên kết đơn & Ngăn xếp (Stack)',
    durationMinutes: 120,
    lecturer: CURRENT_INSTRUCTOR_NAME,
  },
  {
    id: 'SES-04',
    classCode: 'CS102',
    className: 'Kỹ thuật Lập trình nâng cao',
    title: 'Lab 02: Con trỏ & Quản lý bộ nhớ động',
    type: 'LAB',
    language: 'C++',
    startTime: '08:00',
    endTime: '10:20',
    date: 'Hôm qua',
    roomCode: 'CS102-PTR',
    passcode: '451092',
    status: 'Đã kết thúc',
    enrolledStudents: 50,
    attendedStudents: 49,
    isAiProctored: true,
    templateId: 'TPL-LAB-02',
    templateTitle: 'Lab 02: Cấu trúc rẽ nhánh If/Else & Switch-Case',
    durationMinutes: 120,
    lecturer: CURRENT_INSTRUCTOR_NAME,
  },
];

/**
 * Đọc toàn bộ lịch & phiên kiểm tra từ nguồn duy nhất của Giảng viên
 * (kết hợp INITIAL_INSTRUCTOR_SCHEDULES, INSTRUCTOR_SCHEDULES_STORAGE_KEY và INSTRUCTOR_ROOMS_STORAGE_KEY)
 */
export function getStoredInstructorSchedules(): ScheduleSessionItem[] {
  if (typeof window === 'undefined') return INITIAL_INSTRUCTOR_SCHEDULES;

  let merged: ScheduleSessionItem[] = [...INITIAL_INSTRUCTOR_SCHEDULES];

  try {
    const rawSched = localStorage.getItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY);
    if (rawSched) {
      const parsed: ScheduleSessionItem[] = JSON.parse(rawSched);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const storedCodes = new Set(parsed.map((s) => s.roomCode.toLowerCase()));
        const remainingDefaults = INITIAL_INSTRUCTOR_SCHEDULES.filter(
          (init) => !storedCodes.has(init.roomCode.toLowerCase())
        );
        merged = [
          ...parsed.map((item) => {
            const initMatch = INITIAL_INSTRUCTOR_SCHEDULES.find(
              (i) => i.roomCode.toLowerCase() === item.roomCode.toLowerCase() || i.id === item.id
            );
            return {
              ...initMatch,
              ...item,
              templateId:
                item.templateId ||
                initMatch?.templateId ||
                (item.type === 'LAB' ? 'TPL-LAB-01' : 'TPL-EXAM-01'),
              templateTitle:
                item.templateTitle || initMatch?.templateTitle || item.title,
              durationMinutes:
                item.durationMinutes || initMatch?.durationMinutes || (item.type === 'LAB' ? 120 : 90),
              lecturer: item.lecturer || CURRENT_INSTRUCTOR_NAME,
            };
          }),
          ...remainingDefaults,
        ];
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
