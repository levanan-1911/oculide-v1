export type ScheduleStatus = 'ongoing' | 'scheduled' | 'draft' | 'completed' | 'cancelled';

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
  title: string; // Tên ca thi (ví dụ: "Kiểm tra giữa kỳ • Lập trình Web")
  classId: string; // Mã lớp (ví dụ: "SE1848")
  className: string; // Tên lớp (ví dụ: "Lập trình Web")
  studentCount: number; // Sĩ số (ví dụ: 48)
  lecturer: string; // Giảng viên khởi tạo (ví dụ: "Thầy Nguyễn Văn Nam")
  templateId: string; // Mã bộ đề (ví dụ: "TPL-EXAM-01")
  templateTitle: string; // Tên bộ đề (ví dụ: "Xây dựng ứng dụng Web tương tác")
  templateVersion: string; // Phiên bản đề (ví dụ: "v1 • Sẵn sàng")
  date: string; // Ngày thi (dd/mm/yyyy hoặc yyyy-mm-dd)
  startTime: string; // Giờ bắt đầu (hh:mm)
  endTime: string; // Giờ kết thúc (hh:mm)
  durationMinutes: number; // Thời lượng thi (phút)
  room: string; // Phòng máy / Địa điểm thi (ví dụ: "Phòng máy LAB-302" hoặc "Online tập trung")
  roomCode: string; // Mã phòng thi (ví dụ: "OC-482915")
  roomPassword?: string; // Mật khẩu phòng (ví dụ: "123456")
  status: ScheduleStatus;
  proctoringPolicy: ProctoringPolicy;
  isLobbyOpen?: boolean;
  readyStudentCount?: number;
  deviceCheckCount?: number;
  absentCount?: number;
  createdAt?: string;
  creatorRole?: 'instructor' | 'system';
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

export const INITIAL_SCHEDULES: ExamScheduleItem[] = [
  {
    id: 'PRJ301-MID',
    title: 'Kiểm tra giữa kỳ • Xây dựng ứng dụng Web tương tác',
    classId: 'SE1848',
    className: 'Lập trình Web',
    studentCount: 48,
    lecturer: 'Thầy Nguyễn Văn Nam',
    templateId: 'TPL-EXAM-01',
    templateTitle: 'Xây dựng ứng dụng Web tương tác',
    templateVersion: 'v1 • Sẵn sàng',
    date: '28/10/2026',
    startTime: '08:00',
    endTime: '09:30',
    durationMinutes: 90,
    room: 'Phòng máy LAB-302',
    roomCode: 'OC-482915',
    roomPassword: '••••••••',
    status: 'ongoing', // Đang diễn ra
    proctoringPolicy: DEFAULT_PROCTORING_POLICY,
    isLobbyOpen: true,
    readyStudentCount: 36,
    deviceCheckCount: 7,
    absentCount: 5,
    createdAt: '20/10/2026',
    creatorRole: 'instructor',
  },
  {
    id: 'CSD-MID',
    title: 'Kiểm tra giữa kỳ • Cấu trúc dữ liệu & Giải thuật',
    classId: 'IT2202',
    className: 'Cấu trúc dữ liệu',
    studentCount: 52,
    lecturer: 'Cô Nguyễn Minh Anh',
    templateId: 'TPL-EXAM-02',
    templateTitle: 'Cây & Đồ thị nâng cao',
    templateVersion: 'v1 • Sẵn sàng',
    date: '30/10/2026',
    startTime: '13:30',
    endTime: '15:00',
    durationMinutes: 90,
    room: 'Phòng máy LAB-201',
    roomCode: 'OC-220299',
    roomPassword: '••••••••',
    status: 'scheduled', // Đã lên lịch
    proctoringPolicy: DEFAULT_PROCTORING_POLICY,
    isLobbyOpen: false,
    readyStudentCount: 0,
    deviceCheckCount: 0,
    absentCount: 52,
    createdAt: '22/10/2026',
    creatorRole: 'instructor',
  },
  {
    id: 'OOP-FIN',
    title: 'Kiểm tra thực hành • Kế thừa & Đa hình OOP',
    classId: 'SE1849',
    className: 'Lập trình hướng đối tượng',
    studentCount: 46,
    lecturer: 'Thầy Lê Hoàng Đức',
    templateId: 'TPL-EXAM-03',
    templateTitle: 'Kiểm tra thực hành OOP • Kế thừa & Đa hình',
    templateVersion: 'v1 • Sẵn sàng',
    date: '02/11/2026',
    startTime: '08:00',
    endTime: '09:15',
    durationMinutes: 75,
    room: 'Phòng máy LAB-305',
    roomCode: 'OC-184901',
    roomPassword: '••••••••',
    status: 'scheduled', // Đã lên lịch
    proctoringPolicy: DEFAULT_PROCTORING_POLICY,
    isLobbyOpen: false,
    readyStudentCount: 0,
    deviceCheckCount: 0,
    absentCount: 46,
    createdAt: '24/10/2026',
    creatorRole: 'instructor',
  },
  {
    id: 'WEB-LAB-02',
    title: 'Đánh giá thực hành • Xử lý chuỗi & Thao tác DOM',
    classId: 'SE1848',
    className: 'Lập trình Web',
    studentCount: 48,
    lecturer: 'Thầy Nguyễn Văn Nam',
    templateId: 'TPL-LAB-02',
    templateTitle: 'Xử lý chuỗi & Thao tác DOM trên trình duyệt',
    templateVersion: 'v1 • Sẵn sàng',
    date: '18/10/2026',
    startTime: '07:30',
    endTime: '09:30',
    durationMinutes: 120,
    room: 'Online tập trung',
    roomCode: 'OC-LAB02-ON',
    roomPassword: '••••••••',
    status: 'completed', // Đã kết thúc
    proctoringPolicy: {
      ...DEFAULT_PROCTORING_POLICY,
      clipboard: 'warn',
    },
    isLobbyOpen: false,
    readyStudentCount: 48,
    deviceCheckCount: 0,
    absentCount: 0,
    createdAt: '15/10/2026',
    creatorRole: 'instructor',
  },
  {
    id: 'CSD-QUIZ-01',
    title: 'Thi thử nghiệm • Danh sách liên kết & Ngăn xếp (Stack)',
    classId: 'IT2202',
    className: 'Cấu trúc dữ liệu',
    studentCount: 52,
    lecturer: 'Cô Nguyễn Minh Anh',
    templateId: 'TPL-LAB-04',
    templateTitle: 'Danh sách liên kết đơn & Ngăn xếp (Stack)',
    templateVersion: 'v1 • Bản nháp',
    date: '05/11/2026',
    startTime: '10:00',
    endTime: '11:30',
    durationMinutes: 90,
    room: 'Chưa phân phòng',
    roomCode: 'OC-DRAFT-01',
    status: 'draft', // Bản nháp
    proctoringPolicy: DEFAULT_PROCTORING_POLICY,
    isLobbyOpen: false,
    readyStudentCount: 0,
    deviceCheckCount: 0,
    absentCount: 52,
    createdAt: '26/10/2026',
    creatorRole: 'instructor',
  },
];

export const SCHEDULES_STORAGE_KEY = 'oculide_schedules_mock';
export const INSTRUCTOR_SCHEDULES_STORAGE_KEY = 'oculide_instructor_schedules_mock';
export const INSTRUCTOR_ROOMS_STORAGE_KEY = 'oculide_instructor_rooms_mock';

/**
 * Đọc toàn bộ danh sách lịch kiểm tra được ghi nhận từ:
 * 1. Dữ liệu mock hệ thống & Admin cache (SCHEDULES_STORAGE_KEY)
 * 2. Các ca kiểm tra & thực hành do Giảng viên khởi tạo (INSTRUCTOR_SCHEDULES_STORAGE_KEY, INSTRUCTOR_ROOMS_STORAGE_KEY)
 */
export function getStoredSchedules(): ExamScheduleItem[] {
  if (typeof window === 'undefined') return INITIAL_SCHEDULES;

  let baseList: ExamScheduleItem[] = INITIAL_SCHEDULES;

  try {
    const raw = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        baseList = parsed;
      }
    }
  } catch {
    // fallback
  }

  // Tích hợp dữ liệu ca thi do giảng viên tạo từ INSTRUCTOR_SCHEDULES_STORAGE_KEY
  try {
    const rawInstructorSched = localStorage.getItem(INSTRUCTOR_SCHEDULES_STORAGE_KEY);
    if (rawInstructorSched) {
      const parsedInstructor = JSON.parse(rawInstructorSched);
      if (Array.isArray(parsedInstructor)) {
        parsedInstructor.forEach((item: any) => {
          const id = item.id || item.roomCode;
          const exists = baseList.some((s) => s.id === id || s.roomCode === item.roomCode);
          if (!exists) {
            let status: ScheduleStatus = 'scheduled';
            if (item.status === 'Đang diễn ra' || item.status === 'in_progress') status = 'ongoing';
            else if (item.status === 'Đã kết thúc' || item.status === 'ended') status = 'completed';

            const converted: ExamScheduleItem = {
              id: id,
              title: item.title || `Ca kiểm tra ${item.classCode || ''}`,
              classId: item.classCode || 'CLASS-01',
              className: item.className || 'Lớp học phần',
              studentCount: item.enrolledStudents || 45,
              lecturer: 'Thầy Nguyễn Văn Nam (Giảng viên)',
              templateId: item.type === 'LAB' ? 'TPL-LAB' : 'TPL-EXAM',
              templateTitle: item.title || 'Bài tập thực hành / Kiểm tra',
              templateVersion: 'v1.0',
              date: item.date === 'Hôm nay' ? '28/10/2026' : (item.date || '28/10/2026'),
              startTime: item.startTime || '08:00',
              endTime: item.endTime || '09:30',
              durationMinutes: 90,
              room: item.roomCode?.includes('LAB') ? 'Phòng máy thực hành' : 'Phòng thi tiêu chuẩn',
              roomCode: item.roomCode || 'OC-ROOM',
              roomPassword: item.passcode || '••••••',
              status: status,
              proctoringPolicy: DEFAULT_PROCTORING_POLICY,
              createdAt: '28/10/2026',
              creatorRole: 'instructor',
            };
            baseList = [converted, ...baseList];
          }
        });
      }
    }
  } catch {
    // ignore
  }

  return baseList;
}

export function saveStoredSchedules(schedules: ExamScheduleItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules));
  } catch {
    // ignore
  }
}
