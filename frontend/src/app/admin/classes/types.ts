export type ClassStatus = 'Chưa mở' | 'Hoạt động' | 'Đã kết thúc';
export type StudentStatus = 'Đang học' | 'Tạm dừng';

export type LabStatus = 'Đang mở' | 'Đã đóng' | 'Đã kết thúc';

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  status: StudentStatus;
  missingFields?: string[];
}

export interface ClassLab {
  id: string;
  labNumber: number;
  title: string;
  templateId?: string; // Mã bộ đề liên kết từ module Đề & câu hỏi
  language: string;
  questionCount: number;
  scheduleNote?: string; // Ví dụ: "Buổi học thứ 3 (Tuần 2)"
  startTime?: string; // Thời gian bắt đầu: Ví dụ "07:30, 28/10/2026"
  endTime?: string; // Thời gian kết thúc / Hạn đóng phòng: Ví dụ "09:50, 28/10/2026"
  durationMinutes?: number; // Thời lượng thực hành (phút): Ví dụ 90 hoặc 120 phút
  isProctored?: boolean; // Có giám sát phòng máy / trực tuyến
  roomCode?: string; // Mã phòng Lab (sinh ngẫu nhiên khi GV tạo phòng)
  roomPassword?: string; // Mật khẩu phòng Lab (sinh ngẫu nhiên 6 số)
  status: LabStatus;
  submissionCount: number;
}

export type ExamStatus = 'Sắp diễn ra' | 'Đang diễn ra' | 'Đã kết thúc';

export interface ClassExam {
  id: string;
  title: string;
  templateId?: string; // Mã bộ đề liên kết từ module Đề & câu hỏi
  type: 'Kiểm tra giữa kỳ' | 'Kiểm tra quá trình' | 'Thi kết thúc môn' | 'Kiểm tra thực hành';
  language: string;
  durationMinutes: number;
  scheduledAt: string; // Ví dụ: "08:00 - 09:30, 15/11/2026"
  questionCount: number;
  isProctored: boolean; // Có giám sát chống gian lận
  roomCode?: string; // Mã phòng Thi (sinh ngẫu nhiên khi GV tạo phòng)
  roomPassword?: string; // Mật khẩu phòng Thi (sinh ngẫu nhiên 6 số)
  status: ExamStatus;
  submissionCount: number;
}

export function generateRandomRoomCode(prefix: 'LAB' | 'EXAM'): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${digits}`;
}

export function generateRandomPassword(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Chuyển đổi chuỗi ngày giờ từ bất kỳ định dạng nào sang dạng "YYYY-MM-DDTHH:mm" cho input datetime-local
 */
export function toIsoDatetime(str?: string): string {
  if (!str) {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
    return str.slice(0, 16);
  }
  const match = str.match(/^(\d{2}):(\d{2}),?\s*(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [, hh, min, dd, MM, yyyy] = match;
    return `${yyyy}-${MM}-${dd}T${hh}:${min}`;
  }
  const matchReverse = str.match(/^(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2})/);
  if (matchReverse) {
    const [, dd, MM, yyyy, hh, min] = matchReverse;
    return `${yyyy}-${MM}-${dd}T${hh}:${min}`;
  }
  const timeOnly = str.match(/^(\d{2}):(\d{2})$/);
  if (timeOnly) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${timeOnly[1]}:${timeOnly[2]}`;
  }
  return '';
}

/**
 * Chuyển đổi từ ISO "YYYY-MM-DDTHH:mm" sang dạng hiển thị tiếng Việt "HH:mm, DD/MM/YYYY"
 */
export function formatDatetimeVietnamese(str?: string): string {
  if (!str) return '';
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (match) {
    const [, yyyy, MM, dd, hh, min] = match;
    return `${hh}:${min}, ${dd}/${MM}/${yyyy}`;
  }
  return str;
}

/**
 * Tính số phút giữa start ISO và end ISO
 */
export function calculateDurationInMinutes(startIso: string, endIso: string): number {
  try {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    return Math.round((end - start) / (1000 * 60));
  } catch {
    return 0;
  }
}

/**
 * Thêm số phút vào start ISO để ra end ISO
 */
export function addMinutesToIso(startIso: string, minutes: number): string {
  try {
    const d = new Date(startIso);
    if (isNaN(d.getTime())) return startIso;
    d.setMinutes(d.getMinutes() + minutes);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  } catch {
    return startIso;
  }
}

export interface TestCaseItem {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean; // true: Test ẩn chấm điểm, false: Test công khai cho sinh viên xem
  points?: number; // Điểm số từng test case (ví dụ: 1.0, 2.0, 2.5...)
}

export interface TemplateQuestionItem {
  id: string;
  title: string;
  difficulty: 'Dễ' | 'Trung bình' | 'Khó';
  description: string;
  sampleInput?: string;
  sampleOutput?: string;
  testCasesCount: number;
  testCases?: TestCaseItem[];
}

export interface QuestionTemplate {
  id: string; // Mã bộ đề (ví dụ: "TPL-LAB-01")
  title: string; // Tên đề trong module Đề & câu hỏi
  type: 'lab' | 'exam';
  category: string;
  language: string;
  questionCount: number;
  durationMinutes?: number;
  description?: string;
  questions?: TemplateQuestionItem[];
  updatedAt?: string;
  lecturer?: string;
}

function getDefaultTemplateLecturer(_category?: string, _id?: string): string {
  return 'Thầy Nguyễn Văn Nam';
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
    lecturer: 'Thầy Nguyễn Văn Nam',
    description: 'Bài tập rèn luyện cấu trúc rẽ nhánh, vòng lặp và thao tác duyệt mảng số nguyên.',
    questions: [
      {
        id: 'Q-01',
        title: 'Tìm số nguyên tố lớn nhất trong mảng',
        difficulty: 'Dễ',
        description: 'Viết hàm nhận vào mảng số nguyên arr. Trả về số nguyên tố lớn nhất tìm thấy hoặc -1 nếu không có.',
        sampleInput: '[3, 7, 10, 11, 4, 15]',
        sampleOutput: '11',
        testCasesCount: 5,
        testCases: [
          { id: 'TC-01', input: '[3, 7, 10, 11, 4, 15]', expectedOutput: '11', isHidden: false, points: 2 },
          { id: 'TC-02', input: '[4, 6, 8, 9]', expectedOutput: '-1', isHidden: false, points: 2 },
          { id: 'TC-03', input: '[2, 3, 5, 7, 13, 17, 19, 23]', expectedOutput: '23', isHidden: true, points: 2 },
          { id: 'TC-04', input: '[1]', expectedOutput: '-1', isHidden: true, points: 2 },
          { id: 'TC-05', input: '[97, 2, 4, 6]', expectedOutput: '97', isHidden: true, points: 2 },
        ],
      },
      {
        id: 'Q-02',
        title: 'Đảo ngược mảng in-place O(1)',
        difficulty: 'Dễ',
        description: 'Đảo ngược vị trí các phần tử của mảng không dùng mảng phụ.',
        sampleInput: '[1, 2, 3, 4, 5]',
        sampleOutput: '[5, 4, 3, 2, 1]',
        testCasesCount: 4,
        testCases: [
          { id: 'TC-01', input: '[1, 2, 3, 4, 5]', expectedOutput: '[5, 4, 3, 2, 1]', isHidden: false, points: 2.5 },
          { id: 'TC-02', input: '[10, 20]', expectedOutput: '[20, 10]', isHidden: false, points: 2.5 },
          { id: 'TC-03', input: '[7]', expectedOutput: '[7]', isHidden: true, points: 2.5 },
          { id: 'TC-04', input: '[-1, 0, 1, 2, 3]', expectedOutput: '[3, 2, 1, 0, -1]', isHidden: true, points: 2.5 },
        ],
      },
      {
        id: 'Q-03',
        title: 'Tìm dãy con liên tiếp có tổng lớn nhất (Kadane)',
        difficulty: 'Trung bình',
        description: 'Áp dụng thuật toán Kadane để tìm tổng lớn nhất của dãy con liên tiếp trong mảng.',
        sampleInput: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]',
        sampleOutput: '6',
        testCasesCount: 5,
        testCases: [
          { id: 'TC-01', input: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]', expectedOutput: '6', isHidden: false, points: 2 },
          { id: 'TC-02', input: '[1]', expectedOutput: '1', isHidden: false, points: 2 },
          { id: 'TC-03', input: '[-1, -2, -3]', expectedOutput: '-1', isHidden: true, points: 2 },
          { id: 'TC-04', input: '[5, 4, -1, 7, 8]', expectedOutput: '23', isHidden: true, points: 2 },
          { id: 'TC-05', input: '[1, 2, 3, -2, 5]', expectedOutput: '9', isHidden: true, points: 2 },
        ],
      },
    ],
    updatedAt: '28/10/2026',
  },
  {
    id: 'TPL-LAB-02',
    title: 'Lab 02: Cấu trúc rẽ nhánh If/Else & Switch-Case',
    type: 'lab',
    category: 'Lập trình căn bản',
    language: 'C++',
    questionCount: 4,
    durationMinutes: 120,
    lecturer: 'Thầy Nguyễn Văn Nam',
    description: 'Thực hành các cấu trúc điều khiển rẽ nhánh phức hợp, con trỏ cơ bản và xử lý mã lỗi đầu vào.',
    questions: [
      {
        id: 'Q-01',
        title: 'Phân loại học lực sinh viên theo thang điểm 10',
        difficulty: 'Dễ',
        description: 'Nhập điểm trung bình từ 0.0 đến 10.0 và xuất xếp loại Xuất sắc, Giỏi, Khá, Trung bình hoặc Yếu.',
        sampleInput: '8.5',
        sampleOutput: 'Giỏi',
        testCasesCount: 4,
        testCases: [
          { id: 'TC-01', input: '8.5', expectedOutput: 'Giỏi', isHidden: false, points: 2.5 },
          { id: 'TC-02', input: '9.2', expectedOutput: 'Xuất sắc', isHidden: false, points: 2.5 },
          { id: 'TC-03', input: '6.8', expectedOutput: 'Khá', isHidden: true, points: 2.5 },
          { id: 'TC-04', input: '4.0', expectedOutput: 'Yếu', isHidden: true, points: 2.5 },
        ],
      },
      {
        id: 'Q-02',
        title: 'Giải phương trình bậc hai ax² + bx + c = 0',
        difficulty: 'Dễ',
        description: 'Biện luận và tìm nghiệm thực của phương trình bậc hai với các hệ số a, b, c.',
        sampleInput: '1 -3 2',
        sampleOutput: 'x1 = 1, x2 = 2',
        testCasesCount: 4,
        testCases: [
          { id: 'TC-01', input: '1 -3 2', expectedOutput: 'x1 = 1, x2 = 2', isHidden: false, points: 2.5 },
          { id: 'TC-02', input: '1 2 1', expectedOutput: 'x = -1', isHidden: false, points: 2.5 },
          { id: 'TC-03', input: '1 1 5', expectedOutput: 'Vô nghiệm', isHidden: true, points: 2.5 },
          { id: 'TC-04', input: '0 2 -4', expectedOutput: 'x = 2', isHidden: true, points: 2.5 },
        ],
      },
      {
        id: 'Q-03',
        title: 'Kiểm tra số ngày của tháng trong năm bằng Switch-Case',
        difficulty: 'Dễ',
        description: 'Nhập tháng và năm, trả về số ngày của tháng đó (có xét năm nhuận cho tháng 2).',
        sampleInput: '2 2024',
        sampleOutput: '29',
        testCasesCount: 4,
        testCases: [
          { id: 'TC-01', input: '2 2024', expectedOutput: '29', isHidden: false, points: 2.5 },
          { id: 'TC-02', input: '2 2025', expectedOutput: '28', isHidden: false, points: 2.5 },
          { id: 'TC-03', input: '4 2026', expectedOutput: '30', isHidden: true, points: 2.5 },
          { id: 'TC-04', input: '12 2026', expectedOutput: '31', isHidden: true, points: 2.5 },
        ],
      },
      {
        id: 'Q-04',
        title: 'Tính cước điện thoại bậc thang lũy tiến',
        difficulty: 'Trung bình',
        description: 'Tính tổng tiền cước theo số phút gọi với 3 định mức giá lũy tiến.',
        sampleInput: '120',
        sampleOutput: '165000',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: '120', expectedOutput: '165000', isHidden: false, points: 3 },
          { id: 'TC-02', input: '50', expectedOutput: '55000', isHidden: false, points: 3 },
          { id: 'TC-03', input: '250', expectedOutput: '399000', isHidden: true, points: 4 },
        ],
      },
    ],
    updatedAt: '28/10/2026',
  },
  {
    id: 'TPL-LAB-03',
    title: 'Lab 03: Vòng lặp For/While & Mảng 2 chiều',
    type: 'lab',
    category: 'Lập trình căn bản',
    language: 'C++',
    questionCount: 3,
    durationMinutes: 120,
    lecturer: 'Thầy Nguyễn Văn Nam',
    description: 'Thực hành thao tác duyệt mảng 1 chiều, ma trận 2 chiều và giải thuật tìm kiếm.',
    questions: [
      {
        id: 'Q-01',
        title: 'Tính tổng đường chéo chính và phụ của ma trận vuông',
        difficulty: 'Dễ',
        description: 'Cho ma trận vuông cấp N. Tính tổng các phần tử trên đường chéo chính và đường chéo phụ.',
        sampleInput: '3x3: [[1,2,3],[4,5,6],[7,8,9]]',
        sampleOutput: 'Chính: 15, Phụ: 15',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: '[[1,2,3],[4,5,6],[7,8,9]]', expectedOutput: '15 15', isHidden: false, points: 3 },
          { id: 'TC-02', input: '[[2,0],[0,2]]', expectedOutput: '4 0', isHidden: false, points: 3 },
          { id: 'TC-03', input: '[[5]]', expectedOutput: '5 5', isHidden: true, points: 4 },
        ],
      },
      {
        id: 'Q-02',
        title: 'Xoay ma trận 90 độ theo chiều kim đồng hồ',
        difficulty: 'Trung bình',
        description: 'Biến đổi ma trận vuông N x N xoay 90 độ theo chiều kim đồng hồ.',
        sampleInput: '[[1,2],[3,4]]',
        sampleOutput: '[[3,1],[4,2]]',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: '[[1,2],[3,4]]', expectedOutput: '[[3,1],[4,2]]', isHidden: false, points: 3 },
          { id: 'TC-02', input: '[[1,2,3],[4,5,6],[7,8,9]]', expectedOutput: '[[7,4,1],[8,5,2],[9,6,3]]', isHidden: false, points: 3 },
          { id: 'TC-03', input: '[[1]]', expectedOutput: '[[1]]', isHidden: true, points: 4 },
        ],
      },
      {
        id: 'Q-03',
        title: 'Tìm điểm yên ngựa (Saddle Point) trong ma trận',
        difficulty: 'Khó',
        description: 'Tìm phần tử vừa nhỏ nhất trên hàng vừa lớn nhất trên cột của ma trận M x N.',
        sampleInput: '[[3,7,8],[9,11,13],[15,16,17]]',
        sampleOutput: '15',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: '[[3,7,8],[9,11,13],[15,16,17]]', expectedOutput: '15', isHidden: false, points: 4 },
          { id: 'TC-02', input: '[[1,2],[3,4]]', expectedOutput: '3', isHidden: false, points: 3 },
          { id: 'TC-03', input: '[[1,10],[10,1]]', expectedOutput: '-1', isHidden: true, points: 3 },
        ],
      },
    ],
    updatedAt: '28/10/2026',
  },
  {
    id: 'TPL-LAB-04',
    title: 'Lab 04: Danh sách liên kết đơn & Ngăn xếp (Stack)',
    type: 'lab',
    category: 'Cấu trúc dữ liệu',
    language: 'C++',
    questionCount: 4,
    durationMinutes: 120,
    lecturer: 'Thầy Nguyễn Văn Nam',
    description: 'Cài đặt và thao tác Singly Linked List, đảo ngược danh sách, ứng dụng Stack và BST.',
    questions: [
      {
        id: 'Q-01',
        title: 'Chèn và xóa phần tử tại vị trí K trong Linked List',
        difficulty: 'Dễ',
        description: 'Cài đặt hàm insertAt(k, val) và removeAt(k) trên danh sách liên kết đơn.',
        sampleInput: 'head -> [1] -> [3], insertAt(1, 2)',
        sampleOutput: 'head -> [1] -> [2] -> [3]',
        testCasesCount: 4,
        testCases: [
          { id: 'TC-01', input: 'head -> [1] -> [3], insertAt(1, 2)', expectedOutput: '[1, 2, 3]', isHidden: false, points: 2.5 },
          { id: 'TC-02', input: 'head -> [1] -> [2], removeAt(0)', expectedOutput: '[2]', isHidden: false, points: 2.5 },
          { id: 'TC-03', input: 'head -> null, insertAt(0, 10)', expectedOutput: '[10]', isHidden: true, points: 2.5 },
          { id: 'TC-04', input: 'head -> [5, 6], removeAt(1)', expectedOutput: '[5]', isHidden: true, points: 2.5 },
        ],
      },
      {
        id: 'Q-02',
        title: 'Kiểm tra chuỗi ngoặc hợp lệ bằng Stack',
        difficulty: 'Dễ',
        description: 'Kiểm tra xem chuỗi chứa các dấu (), [], {} có đóng mở đúng thứ tự hay không.',
        sampleInput: '"({[]})"',
        sampleOutput: 'true',
        testCasesCount: 4,
        testCases: [
          { id: 'TC-01', input: '"({[]})"', expectedOutput: 'true', isHidden: false, points: 2.5 },
          { id: 'TC-02', input: '"([)]"', expectedOutput: 'false', isHidden: false, points: 2.5 },
          { id: 'TC-03', input: '""', expectedOutput: 'true', isHidden: true, points: 2.5 },
          { id: 'TC-04', input: '")("', expectedOutput: 'false', isHidden: true, points: 2.5 },
        ],
      },
      {
        id: 'Q-03',
        title: 'Chuyển đổi biểu thức Trung tố sang Hậu tố',
        difficulty: 'Trung bình',
        description: 'Sử dụng Stack để chuyển đổi biểu thức toán học dạng Infix sang Postfix.',
        sampleInput: '"A + B * C"',
        sampleOutput: '"A B C * +"',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: '"A + B * C"', expectedOutput: '"A B C * +"', isHidden: false, points: 3 },
          { id: 'TC-02', input: '"(A + B) * C"', expectedOutput: '"A B + C *"', isHidden: false, points: 3 },
          { id: 'TC-03', input: '"A + B - C"', expectedOutput: '"A B + C -"', isHidden: true, points: 4 },
        ],
      },
      {
        id: 'Q-04',
        title: 'Đảo ngược danh sách liên kết theo nhóm K phần tử',
        difficulty: 'Khó',
        description: 'Đảo ngược từng cụm k node liên tiếp trong danh sách liên kết đơn.',
        sampleInput: '[1, 2, 3, 4, 5], k = 2',
        sampleOutput: '[2, 1, 4, 3, 5]',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: '[1, 2, 3, 4, 5], k = 2', expectedOutput: '[2, 1, 4, 3, 5]', isHidden: false, points: 3 },
          { id: 'TC-02', input: '[1, 2, 3, 4, 5], k = 3', expectedOutput: '[3, 2, 1, 4, 5]', isHidden: false, points: 3 },
          { id: 'TC-03', input: '[1, 2], k = 2', expectedOutput: '[2, 1]', isHidden: true, points: 4 },
        ],
      },
    ],
    updatedAt: '28/10/2026',
  },
  {
    id: 'TPL-LAB-05',
    title: 'Lab 05: Thiết lập Tomcat Servlet & MVC Pattern',
    type: 'lab',
    category: 'Lập trình Web',
    language: 'Java',
    questionCount: 2,
    durationMinutes: 120,
    lecturer: 'Thầy Nguyễn Văn Nam',
    description: 'Thực hành cấu hình web.xml, tạo Controller Servlet và render view JSP theo mô hình MVC.',
    questions: [
      {
        id: 'Q-01',
        title: 'Xử lý tham số Request GET/POST trong HttpServlet',
        difficulty: 'Dễ',
        description: 'Đọc các tham số từ HttpServletRequest, kiểm tra hợp lệ và trả về chuỗi phản hồi chuẩn.',
        sampleInput: 'GET /student?id=SE184801&name=An',
        sampleOutput: '200 OK: SE184801 - An',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'id=SE184801&name=An', expectedOutput: '200 OK: SE184801 - An', isHidden: false, points: 5 },
          { id: 'TC-02', input: 'id=&name=An', expectedOutput: '400 Bad Request', isHidden: false, points: 2.5 },
          { id: 'TC-03', input: 'id=PRJ01&name=Bao', expectedOutput: '200 OK: PRJ01 - Bao', isHidden: true, points: 2.5 },
        ],
      },
      {
        id: 'Q-02',
        title: 'Điều hướng DispatcherServlet và lưu trạng thái HttpSession',
        difficulty: 'Trung bình',
        description: 'Xác thực thông tin đăng nhập, lưu UserDTO vào HttpSession và forward tới trang dashboard.jsp.',
        sampleInput: 'POST /login (user="student", pass="123456")',
        sampleOutput: 'Forward -> /WEB-INF/views/dashboard.jsp',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'user="student", pass="123456"', expectedOutput: 'Forward -> /WEB-INF/views/dashboard.jsp', isHidden: false, points: 5 },
          { id: 'TC-02', input: 'user="student", pass="wrong"', expectedOutput: 'Redirect -> /login?error=1', isHidden: false, points: 2.5 },
          { id: 'TC-03', input: 'session expired', expectedOutput: 'Redirect -> /login', isHidden: true, points: 2.5 },
        ],
      },
    ],
    updatedAt: '28/10/2026',
  },
  {
    id: 'TPL-EXAM-01',
    title: 'Kiểm tra quá trình • Vòng lặp & Mảng số nguyên',
    type: 'exam',
    category: 'Lập trình C/C++',
    language: 'C++',
    questionCount: 3,
    durationMinutes: 60,
    lecturer: 'Thầy Nguyễn Văn Nam',
    description: 'Đề kiểm tra quá trình gồm 3 câu lập trình thuật toán cơ bản, có chấm điểm tự động testcase.',
    questions: [
      {
        id: 'Q-01',
        title: 'Đếm số lượng phần tử chẵn và lẻ trong mảng',
        difficulty: 'Dễ',
        description: 'Cho mảng N số nguyên, đếm số lượng số chẵn và số lẻ.',
        sampleInput: '[1, 2, 3, 4, 6]',
        sampleOutput: 'Chẵn: 3, Lẻ: 2',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: '[1, 2, 3, 4, 6]', expectedOutput: '3 2', isHidden: false, points: 1 },
          { id: 'TC-02', input: '[2, 4, 8]', expectedOutput: '3 0', isHidden: false, points: 1 },
          { id: 'TC-03', input: '[1, 3, 5, 7]', expectedOutput: '0 4', isHidden: true, points: 1 },
        ],
      },
      {
        id: 'Q-02',
        title: 'Tìm phần tử lớn thứ hai trong mảng một chiều',
        difficulty: 'Trung bình',
        description: 'Tìm giá trị lớn thứ hai khác với giá trị lớn nhất trong mảng số nguyên.',
        sampleInput: '[10, 5, 20, 20, 8]',
        sampleOutput: '10',
        testCasesCount: 4,
        testCases: [
          { id: 'TC-01', input: '[10, 5, 20, 20, 8]', expectedOutput: '10', isHidden: false, points: 1 },
          { id: 'TC-02', input: '[5, 5, 5]', expectedOutput: '-1', isHidden: false, points: 1 },
          { id: 'TC-03', input: '[-10, -5, -2]', expectedOutput: '-5', isHidden: true, points: 1 },
          { id: 'TC-04', input: '[1, 2]', expectedOutput: '1', isHidden: true, points: 1 },
        ],
      },
      {
        id: 'Q-03',
        title: 'Kiểm tra mảng đối xứng (Palindrome Array)',
        difficulty: 'Trung bình',
        description: 'Kiểm tra mảng N số nguyên có đối xứng qua tâm hay không.',
        sampleInput: '[1, 2, 3, 2, 1]',
        sampleOutput: 'YES',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: '[1, 2, 3, 2, 1]', expectedOutput: 'YES', isHidden: false, points: 1 },
          { id: 'TC-02', input: '[1, 2, 3, 4]', expectedOutput: 'NO', isHidden: false, points: 1 },
          { id: 'TC-03', input: '[7]', expectedOutput: 'YES', isHidden: true, points: 1 },
        ],
      },
    ],
    updatedAt: '28/10/2026',
  },
  {
    id: 'TPL-EXAM-02',
    title: 'Kiểm tra giữa kỳ • Cấu trúc dữ liệu & Giải thuật',
    type: 'exam',
    category: 'Cấu trúc dữ liệu',
    language: 'C++',
    questionCount: 3,
    durationMinutes: 90,
    lecturer: 'Thầy Nguyễn Văn Nam',
    description: 'Đề thi thực hành giữa kỳ: Linked List, Stack/Queue và Cây nhị phân tìm kiếm BST.',
    questions: [
      {
        id: 'Q-01',
        title: 'Trộn hai danh sách liên kết đã sắp xếp tăng dần',
        difficulty: 'Dễ',
        description: 'Hợp nhất hai Singly Linked List đã tăng dần thành một danh sách liên kết duy nhất tăng dần.',
        sampleInput: 'L1: [1, 3, 5], L2: [2, 4, 6]',
        sampleOutput: '[1, 2, 3, 4, 5, 6]',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: '[1,3,5] & [2,4,6]', expectedOutput: '[1,2,3,4,5,6]', isHidden: false, points: 1.5 },
          { id: 'TC-02', input: '[] & [1,2]', expectedOutput: '[1,2]', isHidden: false, points: 1.5 },
          { id: 'TC-03', input: '[1,1] & [1,2]', expectedOutput: '[1,1,1,2]', isHidden: true, points: 1 },
        ],
      },
      {
        id: 'Q-02',
        title: 'Tìm kiếm và xóa node trên Cây nhị phân tìm kiếm (BST)',
        difficulty: 'Trung bình',
        description: 'Cài đặt thao tác xóa một khóa K khỏi cây BST và xuất kết quả duyệt In-order.',
        sampleInput: 'BST [5, 3, 6, 2, 4, 7], delete(3)',
        sampleOutput: 'In-order: [2, 4, 5, 6, 7]',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: '[5,3,6,2,4,7], delete(3)', expectedOutput: '[2,4,5,6,7]', isHidden: false, points: 1.5 },
          { id: 'TC-02', input: '[5,3,6], delete(5)', expectedOutput: '[3,6]', isHidden: false, points: 1.5 },
          { id: 'TC-03', input: '[5], delete(5)', expectedOutput: '[]', isHidden: true, points: 1 },
        ],
      },
      {
        id: 'Q-03',
        title: 'Tìm đường đi ngắn nhất bằng Dijkstra',
        difficulty: 'Khó',
        description: 'Áp dụng thuật toán Dijkstra với Priority Queue để tìm khoảng cách ngắn nhất từ đỉnh nguồn S.',
        sampleInput: 'Đồ thị 6 đỉnh có trọng số dương, nguồn 1',
        sampleOutput: '[0, 4, 12, 19, 21, 11]',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'Đồ thị 6 đỉnh, nguồn 1', expectedOutput: '[0, 4, 12, 19, 21, 11]', isHidden: false, points: 1 },
          { id: 'TC-02', input: 'Đồ thị rời rạc', expectedOutput: 'INF', isHidden: false, points: 1 },
          { id: 'TC-03', input: 'Đồ thị 100 đỉnh', expectedOutput: 'O((V+E)logV)', isHidden: true, points: 1 },
        ],
      },
    ],
    updatedAt: '28/10/2026',
  },
  {
    id: 'TPL-EXAM-03',
    title: 'Kiểm tra quá trình • Java Web MVC & JDBC DAO',
    type: 'exam',
    category: 'Java Web',
    language: 'Java',
    questionCount: 3,
    durationMinutes: 90,
    lecturer: 'Thầy Nguyễn Văn Nam',
    description: 'Đề kiểm tra thực hành xây dựng CRUD với Servlet, JSP và kết nối MySQL qua JDBC.',
    questions: [
      {
        id: 'Q-01',
        title: 'Xây dựng lớp StudentDAO với PreparedStatement chống SQL Injection',
        difficulty: 'Dễ',
        description: 'Cài đặt phương thức findByCode(String code) và insertStudent(Student s) sử dụng JDBC PreparedStatement.',
        sampleInput: 'findByCode("PRJ01")',
        sampleOutput: 'Student{id="PRJ01", name="Hoàng Quốc Bảo"}',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'findByCode("PRJ01")', expectedOutput: 'Student{id="PRJ01"}', isHidden: false, points: 1.5 },
          { id: 'TC-02', input: 'findByCode("OR 1=1")', expectedOutput: 'null (Blocked SQLi)', isHidden: false, points: 1.5 },
          { id: 'TC-03', input: 'insertStudent(valid)', expectedOutput: '1 row affected', isHidden: true, points: 1 },
        ],
      },
      {
        id: 'Q-02',
        title: 'Thiết kế Controller Servlet phân trang và lọc danh sách môn học',
        difficulty: 'Trung bình',
        description: 'Xử lý request GET /courses?page=2&keyword=Java và đẩy danh sách phân trang sang JSP.',
        sampleInput: 'page=2, limit=5, keyword="Java"',
        sampleOutput: 'List<Course> size=5, totalPages=3',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'page=2, limit=5, keyword="Java"', expectedOutput: 'size=5, totalPages=3', isHidden: false, points: 1.5 },
          { id: 'TC-02', input: 'page=1, keyword="NonExist"', expectedOutput: 'size=0, totalPages=0', isHidden: false, points: 1.5 },
          { id: 'TC-03', input: 'page=-1', expectedOutput: 'Fallback page=1', isHidden: true, points: 1 },
        ],
      },
      {
        id: 'Q-03',
        title: 'Xây dựng Authentication Filter kiểm tra quyền truy cập Session',
        difficulty: 'Khó',
        description: 'Cài đặt javax.servlet.Filter chặn các truy cập trái phép vào /admin/* và /instructor/* khi chưa đăng nhập.',
        sampleInput: 'GET /instructor/questions (No Session)',
        sampleOutput: 'HTTP 302 Redirect -> /login',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'No Session -> /instructor/questions', expectedOutput: '302 Redirect /login', isHidden: false, points: 1 },
          { id: 'TC-02', input: 'Role=STUDENT -> /instructor/questions', expectedOutput: '403 Forbidden', isHidden: false, points: 1 },
          { id: 'TC-03', input: 'Role=INSTRUCTOR -> /instructor/questions', expectedOutput: 'chain.doFilter() 200 OK', isHidden: true, points: 1 },
        ],
      },
    ],
    updatedAt: '28/10/2026',
  },
];

export interface ClassRow {
  id: string;
  name: string;
  semester: string;
  startDate?: string;
  endDate?: string;
  roomCode?: string;     // Mã phòng tham gia lớp (ví dụ: SE1848-ROOM)
  roomPassword?: string; // Mật khẩu phòng (ví dụ: 123456)
  status: ClassStatus;
  studentCount: number;
  students: StudentRow[];
  lecturer?: string;
  labs?: ClassLab[];
  exams?: ClassExam[];
}

export interface UploadedFileInfo {
  name: string;
  sizeFormatted: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
}

export interface FileRowError {
  rowNumber: number;
  rawData: string;
  errorMessage: string;
}

export const INITIAL_CLASSES: ClassRow[] = [
  {
    id: 'CS101',
    name: 'Nhập môn Lập trình C/C++',
    semester: 'HK1 2026–2027',
    startDate: '05/09/2026',
    endDate: '15/01/2027',
    roomCode: 'CS101-ROOM',
    roomPassword: '883921',
    status: 'Hoạt động',
    studentCount: 48,
    lecturer: 'Thầy Nguyễn Văn Nam',
    students: [
      { id: 'SE184801', name: 'Nguyễn Văn An', email: 'an.nv@school.edu.vn', status: 'Đang học' },
      { id: 'SE184802', name: 'Trần Thị Bình', email: 'binh.tt@school.edu.vn', status: 'Đang học' },
      { id: 'SE184803', name: 'Lê Hoàng Cường', email: 'cuong.lh@school.edu.vn', status: 'Đang học' },
      { id: 'SE184804', name: 'Phạm Minh Châu', email: 'chau.pm@school.edu.vn', status: 'Đang học' },
      { id: 'SE184805', name: 'Đặng Tuấn Dương', email: 'duong.dt@school.edu.vn', status: 'Đang học' },
      { id: 'SE184806', name: 'Vũ Hải Yến', email: 'yen.vh@school.edu.vn', status: 'Đang học' },
    ],
    labs: [
      {
        id: 'LAB-CS101-01',
        templateId: 'TPL-LAB-01',
        labNumber: 1,
        title: 'Lab 01: Cấu trúc điều khiển & Mảng một chiều',
        language: 'C++',
        questionCount: 3,
        scheduleNote: 'Tuần 1',
        startTime: '08:00, 10/09/2026',
        endTime: '10:00, 10/09/2026',
        durationMinutes: 120,
        isProctored: false,
        roomCode: 'CS101-L1',
        roomPassword: '112233',
        status: 'Đã kết thúc',
        submissionCount: 48,
      },
      {
        id: 'LAB-CS101-02',
        templateId: 'TPL-LAB-02',
        labNumber: 2,
        title: 'Lab 02: Cấu trúc rẽ nhánh If/Else & Switch-Case',
        language: 'C++',
        questionCount: 4,
        scheduleNote: 'Tuần 3',
        startTime: '08:00, 24/09/2026',
        endTime: '10:00, 24/09/2026',
        durationMinutes: 120,
        isProctored: false,
        roomCode: 'CS101-L2',
        roomPassword: '223344',
        status: 'Đã kết thúc',
        submissionCount: 47,
      },
      {
        id: 'LAB-CS101-03',
        templateId: 'TPL-LAB-03',
        labNumber: 3,
        title: 'Lab 03: Vòng lặp For/While & Mảng 1 chiều',
        language: 'C++',
        questionCount: 3,
        scheduleNote: 'Hôm nay (Tuần 6)',
        startTime: '07:30, 28/10/2026',
        endTime: '09:50, 28/10/2026',
        durationMinutes: 120,
        isProctored: true,
        roomCode: 'CS101-LAB3',
        roomPassword: '883921',
        status: 'Đang mở',
        submissionCount: 46,
      },
    ],
    exams: [
      {
        id: 'EXAM-CS101-01',
        templateId: 'TPL-EXAM-01',
        title: 'Kiểm tra quá trình • Vòng lặp & Mảng số nguyên',
        type: 'Kiểm tra quá trình',
        language: 'C++',
        durationMinutes: 60,
        scheduledAt: '08:00 - 09:00, 15/10/2026',
        questionCount: 3,
        isProctored: true,
        roomCode: 'CS101-EX1',
        roomPassword: '991122',
        status: 'Đã kết thúc',
        submissionCount: 48,
      },
    ],
  },
  {
    id: 'PRJ301',
    name: 'Lập trình ứng dụng Java Web',
    semester: 'HK1 2026–2027',
    startDate: '10/09/2026',
    endDate: '20/01/2027',
    roomCode: 'PRJ301-ROOM',
    roomPassword: '901244',
    status: 'Hoạt động',
    studentCount: 45,
    lecturer: 'Thầy Nguyễn Văn Nam',
    students: [
      { id: 'PRJ01', name: 'Hoàng Quốc Bảo', email: 'bao.hq@school.edu.vn', status: 'Đang học' },
      { id: 'PRJ02', name: 'Đỗ Thị Mai', email: 'mai.dt@school.edu.vn', status: 'Đang học' },
      { id: 'PRJ03', name: 'Bùi Tuấn Anh', email: 'anh.bt@school.edu.vn', status: 'Đang học' },
    ],
    labs: [
      {
        id: 'LAB-PRJ-01',
        templateId: 'TPL-LAB-05',
        labNumber: 1,
        title: 'Lab 05: Thiết lập Tomcat Servlet & MVC Pattern',
        language: 'Java',
        questionCount: 2,
        startTime: '13:30, 18/09/2026',
        endTime: '15:30, 18/09/2026',
        durationMinutes: 120,
        isProctored: false,
        roomCode: 'PRJ-L1',
        roomPassword: '334455',
        status: 'Đã kết thúc',
        submissionCount: 45,
      },
    ],
    exams: [
      {
        id: 'EXAM-PRJ-01',
        templateId: 'TPL-EXAM-03',
        title: 'Kiểm tra quá trình: Servlet & MVC Pattern',
        type: 'Kiểm tra quá trình',
        language: 'Java',
        durationMinutes: 90,
        scheduledAt: '13:30 - 15:00, 28/10/2026',
        questionCount: 3,
        isProctored: true,
        roomCode: 'PRJ-KT01',
        roomPassword: '901244',
        status: 'Sắp diễn ra',
        submissionCount: 0,
      },
    ],
  },
  {
    id: 'CSD201',
    name: 'Cấu trúc dữ liệu & Giải thuật',
    semester: 'HK1 2026–2027',
    startDate: '15/09/2026',
    endDate: '25/01/2027',
    roomCode: 'CSD201-ROOM',
    roomPassword: '128472',
    status: 'Hoạt động',
    studentCount: 42,
    lecturer: 'Thầy Nguyễn Văn Nam',
    students: [
      { id: 'CSD01', name: 'Nguyễn Đình Trọng', email: 'trong.nd@school.edu.vn', status: 'Đang học' },
      { id: 'CSD02', name: 'Vũ Thị Hạnh', email: 'hanh.vt@school.edu.vn', status: 'Đang học' },
    ],
    labs: [
      {
        id: 'LAB-CSD-01',
        templateId: 'TPL-LAB-04',
        labNumber: 4,
        title: 'Lab 04: Cây nhị phân tìm kiếm (BST)',
        language: 'Python',
        questionCount: 4,
        startTime: '15:15, 28/10/2026',
        endTime: '17:35, 28/10/2026',
        durationMinutes: 120,
        isProctored: false,
        roomCode: 'CSD-BST4',
        roomPassword: '128472',
        status: 'Đang mở',
        submissionCount: 42,
      },
    ],
    exams: [
      {
        id: 'EXAM-CSD-01',
        templateId: 'TPL-EXAM-02',
        title: 'Kiểm tra giữa kỳ • Cấu trúc dữ liệu & Giải thuật',
        type: 'Kiểm tra giữa kỳ',
        language: 'C++',
        durationMinutes: 90,
        scheduledAt: '08:00 - 09:30, 05/11/2026',
        questionCount: 3,
        isProctored: true,
        roomCode: 'CSD-EX02',
        roomPassword: '667788',
        status: 'Sắp diễn ra',
        submissionCount: 0,
      },
    ],
  },
  {
    id: 'CS102',
    name: 'Kỹ thuật Lập trình nâng cao',
    semester: 'HK1 2026–2027',
    startDate: '08/09/2026',
    endDate: '18/01/2027',
    roomCode: 'CS102-ROOM',
    roomPassword: '451092',
    status: 'Hoạt động',
    studentCount: 50,
    lecturer: 'Thầy Nguyễn Văn Nam',
    students: [
      { id: 'CS102_01', name: 'Lê Minh Quân', email: 'quan.lm@school.edu.vn', status: 'Đang học' },
    ],
    labs: [
      {
        id: 'LAB-CS102-01',
        templateId: 'TPL-LAB-02',
        labNumber: 2,
        title: 'Lab 02: Con trỏ & Quản lý bộ nhớ động',
        language: 'C++',
        questionCount: 4,
        startTime: '08:00, 27/10/2026',
        endTime: '10:20, 27/10/2026',
        durationMinutes: 120,
        isProctored: true,
        roomCode: 'CS102-PTR',
        roomPassword: '451092',
        status: 'Đã kết thúc',
        submissionCount: 49,
      },
    ],
    exams: [],
  },
];

const STORAGE_KEY = 'oculide_classes_v2';
const INSTRUCTOR_CLASSES_STORAGE_KEY = 'oculide_instructor_classes_mock';
const INSTRUCTOR_ROOMS_STORAGE_KEY = 'oculide_instructor_rooms_mock';

export function getStoredClasses(): ClassRow[] {
  if (typeof window === 'undefined') return INITIAL_CLASSES;
  try {
    let baseClasses: ClassRow[] = [...INITIAL_CLASSES];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        baseClasses = parsed.map((c) => {
          const initMatch = INITIAL_CLASSES.find((item) => item.id === c.id);
          const labs = (c.labs || initMatch?.labs || []).map((l: any, idx: number) => ({
            ...l,
            templateId: l.templateId || initMatch?.labs?.[idx]?.templateId || `TPL-LAB-0${idx + 1}`,
            roomCode: l.roomCode || initMatch?.labs?.[idx]?.roomCode || `${c.id}-LAB${idx + 1}`,
            roomPassword: l.roomPassword || initMatch?.labs?.[idx]?.roomPassword || '123456',
          }));
          const exams = (c.exams || initMatch?.exams || []).map((e: any, idx: number) => ({
            ...e,
            templateId: e.templateId || initMatch?.exams?.[idx]?.templateId || `TPL-EXAM-0${idx + 1}`,
            roomCode: e.roomCode || initMatch?.exams?.[idx]?.roomCode || `${c.id}-EX${idx + 1}`,
            roomPassword: e.roomPassword || initMatch?.exams?.[idx]?.roomPassword || '123456',
          }));
          return {
            ...c,
            lecturer: c.lecturer || initMatch?.lecturer || 'Thầy Nguyễn Văn Nam',
            roomCode: c.roomCode || initMatch?.roomCode || `${c.id}-ROOM`,
            roomPassword: c.roomPassword || initMatch?.roomPassword || '123456',
            labs,
            exams,
          };
        });
      }
    }

    // Đồng bộ thêm các lớp hoặc sinh viên từ phía Giảng viên (oculide_instructor_classes_mock)
    const rawInstructorClasses = localStorage.getItem(INSTRUCTOR_CLASSES_STORAGE_KEY);
    if (rawInstructorClasses) {
      const parsedInstructor: any[] = JSON.parse(rawInstructorClasses);
      if (Array.isArray(parsedInstructor)) {
        parsedInstructor.forEach((ic) => {
          const existingIdx = baseClasses.findIndex((bc) => bc.id === ic.id);
          if (existingIdx >= 0) {
            baseClasses[existingIdx] = {
              ...baseClasses[existingIdx],
              studentCount: ic.studentCount || baseClasses[existingIdx].studentCount,
              students:
                Array.isArray(ic.students) && ic.students.length > 0
                  ? ic.students
                  : baseClasses[existingIdx].students,
            };
          } else {
            baseClasses.push({
              ...ic,
              lecturer: ic.lecturer || 'Thầy Nguyễn Văn Nam',
              students: ic.students || [],
              labs: ic.labs || [],
              exams: ic.exams || [],
            });
          }
        });
      }
    }

    // Đồng bộ các phòng Lab / Kiểm tra do Giảng viên tạo từ /instructor/room vào danh sách lớp
    const rawInstructorRooms = localStorage.getItem(INSTRUCTOR_ROOMS_STORAGE_KEY);
    if (rawInstructorRooms) {
      const parsedRooms: any[] = JSON.parse(rawInstructorRooms);
      if (Array.isArray(parsedRooms)) {
        parsedRooms.forEach((room) => {
          const classIdx = baseClasses.findIndex((bc) => bc.id === room.classId);
          if (classIdx < 0) return;
          const targetClass = baseClasses[classIdx];
          if (room.type === 'lab') {
            const exists = (targetClass.labs || []).some(
              (l) => l.roomCode?.toLowerCase() === String(room.id).toLowerCase()
            );
            if (!exists) {
              const nextLabNum = (targetClass.labs?.length || 0) + 1;
              targetClass.labs = [
                {
                  id: `LAB-${room.id}`,
                  templateId: room.templateId || 'TPL-LAB-01',
                  labNumber: nextLabNum,
                  title: room.title || `Lab 0${nextLabNum}: Thực hành lập trình`,
                  language: room.templateLanguage || 'C++',
                  questionCount: 3,
                  scheduleNote: room.scheduledDate || 'Hôm nay',
                  startTime: `${room.startTime || '08:00'}, ${room.scheduledDate || 'Hôm nay'}`,
                  endTime: `${room.endTime || '10:00'}, ${room.scheduledDate || 'Hôm nay'}`,
                  durationMinutes: room.durationMinutes || 120,
                  isProctored: Boolean(room.proctoringConfig?.aiFaceDetection),
                  roomCode: room.id,
                  roomPassword: room.password || '123456',
                  status: room.status === 'ended' ? 'Đã kết thúc' : 'Đang mở',
                  submissionCount: Array.isArray(room.attendees)
                    ? room.attendees.filter((a: any) => a.status !== 'absent').length
                    : 0,
                },
                ...(targetClass.labs || []),
              ];
            }
          } else {
            const exists = (targetClass.exams || []).some(
              (e) => e.roomCode?.toLowerCase() === String(room.id).toLowerCase()
            );
            if (!exists) {
              targetClass.exams = [
                {
                  id: `EXAM-${room.id}`,
                  templateId: room.templateId || 'TPL-EXAM-01',
                  title: room.title || `Kiểm tra quá trình - ${targetClass.id}`,
                  type: 'Kiểm tra quá trình',
                  language: room.templateLanguage || 'C++',
                  durationMinutes: room.durationMinutes || 60,
                  scheduledAt: `${room.startTime || '08:00'} - ${room.endTime || '09:00'}, ${room.scheduledDate || 'Hôm nay'}`,
                  questionCount: 3,
                  isProctored: true,
                  roomCode: room.id,
                  roomPassword: room.password || '123456',
                  status:
                    room.status === 'in_progress'
                      ? 'Đang diễn ra'
                      : room.status === 'ended'
                      ? 'Đã kết thúc'
                      : 'Sắp diễn ra',
                  submissionCount: 0,
                },
                ...(targetClass.exams || []),
              ];
            }
          }
        });
      }
    }

    return baseClasses;
  } catch {
    // fallback
  }
  return INITIAL_CLASSES;
}

export function saveStoredClasses(classes: ClassRow[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
    window.dispatchEvent(new Event('storage'));
  } catch {
    // ignore
  }
}

const TEMPLATES_STORAGE_KEY = 'oculide_instructor_templates_v2';
const LEGACY_TEMPLATES_STORAGE_KEY = 'oculide_question_templates_mock';
const DEFAULT_TEMPLATE_IDS = new Set([
  'TPL-LAB-01',
  'TPL-LAB-02',
  'TPL-LAB-03',
  'TPL-LAB-04',
  'TPL-LAB-05',
  'TPL-LAB-06',
  'TPL-EXAM-01',
  'TPL-EXAM-02',
  'TPL-EXAM-03',
]);

export function getStoredQuestionTemplates(): QuestionTemplate[] {
  const withLecturer = (list: QuestionTemplate[]) =>
    list.map((t) => ({
      ...t,
      lecturer: t.lecturer || getDefaultTemplateLecturer(t.category, t.id),
    }));

  if (typeof window === 'undefined') return withLecturer(SAMPLE_QUESTION_TEMPLATES);
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) {
      // Kiểm tra xem người dùng có vừa tạo bộ đề tùy chỉnh nào trong key cũ không
      let customTemplates: QuestionTemplate[] = [];
      const legacyRaw = localStorage.getItem(LEGACY_TEMPLATES_STORAGE_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed)) {
          customTemplates = legacyParsed.filter(
            (t: QuestionTemplate) => t && t.id && !DEFAULT_TEMPLATE_IDS.has(t.id)
          );
        }
      }
      const seeded = withLecturer([...customTemplates, ...SAMPLE_QUESTION_TEMPLATES]);
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((tpl: QuestionTemplate) => {
        const sample = SAMPLE_QUESTION_TEMPLATES.find((s) => s.id === tpl.id);
        const questions = (tpl.questions || sample?.questions || []).map(
          (q: TemplateQuestionItem, idx: number) => {
            const sampleQ = sample?.questions?.[idx];
            const testCases =
              q.testCases && q.testCases.length > 0
                ? q.testCases
                : sampleQ?.testCases || [];
            return {
              ...q,
              testCases,
              testCasesCount:
                testCases.length > 0 ? testCases.length : q.testCasesCount || 0,
            };
          }
        );
        return {
          ...tpl,
          lecturer: tpl.lecturer || getDefaultTemplateLecturer(tpl.category, tpl.id),
          questions,
        };
      });
    }
  } catch {
    // fallback
  }
  return withLecturer(SAMPLE_QUESTION_TEMPLATES);
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

/**
 * Tự động đồng bộ các thay đổi từ bộ đề sang tất cả các lớp học và lịch kiểm tra đang sử dụng bộ đề này.
 */
export function syncClassesWithTemplate(updatedTemplate: QuestionTemplate): void {
  if (typeof window === 'undefined') return;
  try {
    const classes = getStoredClasses();
    let hasChanges = false;
    const nextClasses = classes.map((c) => {
      let classChanged = false;
      const nextLabs = (c.labs || []).map((lab) => {
        if (lab.templateId === updatedTemplate.id) {
          classChanged = true;
          return {
            ...lab,
            title: updatedTemplate.title,
            language: updatedTemplate.language,
            questionCount: updatedTemplate.questionCount,
          };
        }
        return lab;
      });
      const nextExams = (c.exams || []).map((exam) => {
        if (exam.templateId === updatedTemplate.id) {
          classChanged = true;
          return {
            ...exam,
            title: updatedTemplate.title,
            language: updatedTemplate.language,
            questionCount: updatedTemplate.questionCount,
            durationMinutes: updatedTemplate.durationMinutes || exam.durationMinutes,
          };
        }
        return exam;
      });
      if (classChanged) {
        hasChanges = true;
        return { ...c, labs: nextLabs, exams: nextExams };
      }
      return c;
    });

    if (hasChanges) {
      saveStoredClasses(nextClasses);
    }

    // Đồng bộ tên bộ đề & thời lượng sang lịch giảng dạy của Giảng viên (oculide_instructor_schedules_mock)
    const rawInstSched = localStorage.getItem('oculide_instructor_schedules_mock');
    if (rawInstSched) {
      const parsedInstSched = JSON.parse(rawInstSched);
      if (Array.isArray(parsedInstSched)) {
        const updatedInstSched = parsedInstSched.map((s: any) =>
          s.templateId === updatedTemplate.id
            ? {
                ...s,
                templateTitle: updatedTemplate.title,
                language: updatedTemplate.language,
                durationMinutes: updatedTemplate.durationMinutes || s.durationMinutes,
              }
            : s
        );
        localStorage.setItem('oculide_instructor_schedules_mock', JSON.stringify(updatedInstSched));
      }
    }

    // Đồng bộ sang phòng học/thi của Giảng viên (oculide_instructor_rooms_mock)
    const rawInstRooms = localStorage.getItem('oculide_instructor_rooms_mock');
    if (rawInstRooms) {
      const parsedInstRooms = JSON.parse(rawInstRooms);
      if (Array.isArray(parsedInstRooms)) {
        const updatedInstRooms = parsedInstRooms.map((r: any) =>
          r.templateId === updatedTemplate.id
            ? {
                ...r,
                templateTitle: updatedTemplate.title,
                templateLanguage: updatedTemplate.language,
                durationMinutes: updatedTemplate.durationMinutes || r.durationMinutes,
              }
            : r
        );
        localStorage.setItem('oculide_instructor_rooms_mock', JSON.stringify(updatedInstRooms));
      }
    }

    window.dispatchEvent(new Event('storage'));
  } catch {
    // ignore
  }
}
