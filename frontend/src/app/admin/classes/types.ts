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

function getDefaultTemplateLecturer(category?: string, id?: string): string {
  if (category === 'Cấu trúc dữ liệu' || id?.includes('02') || id?.includes('04')) {
    return 'Cô Nguyễn Minh Anh';
  }
  if (category === 'Lập trình OOP' || id?.includes('03')) {
    return 'Thầy Lê Hoàng Đức';
  }
  return 'Thầy Nguyễn Văn Nam';
}

export const SAMPLE_QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    id: 'TPL-LAB-01',
    title: 'Cấu trúc điều khiển & Mảng một chiều',
    type: 'lab',
    category: 'Lập trình căn bản',
    language: 'JavaScript / Python',
    questionCount: 3,
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
        title: 'Đảo ngược mảng không dùng mảng phụ',
        difficulty: 'Dễ',
        description: 'Đảo ngược vị trí các phần tử của mảng in-place với độ phức tạp không gian O(1).',
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
        title: 'Tìm mảng con liên tiếp có tổng lớn nhất (Kadane)',
        difficulty: 'Trung bình',
        description: 'Áp dụng thuật toán Kadane để tìm tổng lớn nhất của dãy con liên tiếp trong mảng có cả số âm.',
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
    updatedAt: '24/10/2026',
  },
  {
    id: 'TPL-LAB-02',
    title: 'Xử lý chuỗi & Thao tác DOM trên trình duyệt',
    type: 'lab',
    category: 'Lập trình Web',
    language: 'JavaScript',
    questionCount: 3,
    description: 'Thực hành biểu thức chính quy Regex, chuẩn hóa chuỗi và thao tác cây DOM giao diện web.',
    questions: [
      {
        id: 'Q-01',
        title: 'Chuẩn hóa họ tên và tách email sinh viên',
        difficulty: 'Dễ',
        description: 'Loại bỏ khoảng trắng thừa, viết hoa chữ cái đầu mỗi từ và kiểm tra định dạng email hợp lệ.',
        sampleInput: '"  nguyen  van   an  "',
        sampleOutput: '"Nguyen Van An"',
        testCasesCount: 4,
        testCases: [
          { id: 'TC-01', input: '"  nguyen  van   an  "', expectedOutput: '"Nguyen Van An"', isHidden: false, points: 2.5 },
          { id: 'TC-02', input: '"LE THI HOA"', expectedOutput: '"Le Thi Hoa"', isHidden: false, points: 2.5 },
          { id: 'TC-03', input: '" tran   duc  nam "', expectedOutput: '"Tran Duc Nam"', isHidden: true, points: 2.5 },
          { id: 'TC-04', input: '"bui hoa"', expectedOutput: '"Bui Hoa"', isHidden: true, points: 2.5 },
        ],
      },
      {
        id: 'Q-02',
        title: 'Render động danh sách Todo List vào bảng HTML',
        difficulty: 'Trung bình',
        description: 'Nhận mảng công việc và tạo các phần tử DOM kèm nút Đánh dấu hoàn thành.',
        sampleInput: '[{ text: "Nộp bài lab", done: false }]',
        sampleOutput: 'HTML Element <ul>...</ul>',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: '[{ text: "Nộp bài lab", done: false }]', expectedOutput: '<ul><li>Nộp bài lab</li></ul>', isHidden: false, points: 3 },
          { id: 'TC-02', input: '[]', expectedOutput: '<ul></ul>', isHidden: false, points: 3 },
          { id: 'TC-03', input: '[{ text: "A", done: true }, { text: "B", done: false }]', expectedOutput: '<ul><li class="done">A</li><li>B</li></ul>', isHidden: true, points: 4 },
        ],
      },
      {
        id: 'Q-03',
        title: 'Validate form đăng ký tài khoản bằng Regex',
        difficulty: 'Trung bình',
        description: 'Kiểm tra mật khẩu tối thiểu 8 ký tự, có ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt.',
        sampleInput: '"P@ssw0rd2026"',
        sampleOutput: 'true',
        testCasesCount: 4,
        testCases: [
          { id: 'TC-01', input: '"P@ssw0rd2026"', expectedOutput: 'true', isHidden: false, points: 2.5 },
          { id: 'TC-02', input: '"abc"', expectedOutput: 'false', isHidden: false, points: 2.5 },
          { id: 'TC-03', input: '"Password"', expectedOutput: 'false', isHidden: true, points: 2.5 },
          { id: 'TC-04', input: '"Admin#9999"', expectedOutput: 'true', isHidden: true, points: 2.5 },
        ],
      },
    ],
    updatedAt: '24/10/2026',
  },
  {
    id: 'TPL-LAB-03',
    title: 'Lập trình bất đồng bộ & Kết nối Fetch API',
    type: 'lab',
    category: 'Lập trình Web',
    language: 'JavaScript / Node.js',
    questionCount: 2,
    description: 'Xử lý Promise, Async/Await và tương tác RESTful API qua HTTP client.',
    questions: [
      {
        id: 'Q-01',
        title: 'Viết hàm retry fetch API tối đa 3 lần khi timeout',
        difficulty: 'Trung bình',
        description: 'Gửi request đến endpoint, nếu lỗi kết nối tự động thử lại tối đa 3 lần với exponential backoff.',
        sampleInput: 'fetchWithRetry(url, 3, 1000)',
        sampleOutput: 'Response { status: 200, data: [...] }',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'fetchWithRetry("/api/success", 3, 1000)', expectedOutput: '{ status: 200 }', isHidden: false, points: 3 },
          { id: 'TC-02', input: 'fetchWithRetry("/api/timeout-then-ok", 3, 500)', expectedOutput: '{ status: 200, retries: 2 }', isHidden: false, points: 3 },
          { id: 'TC-03', input: 'fetchWithRetry("/api/error-404", 3, 500)', expectedOutput: 'Error: Request failed 404', isHidden: true, points: 4 },
        ],
      },
      {
        id: 'Q-02',
        title: 'Chạy song song nhiều Promise với Promise.allSettled',
        difficulty: 'Khó',
        description: 'Lấy dữ liệu đồng thời từ 5 API khác nhau và phân loại kết quả thành công và thất bại.',
        sampleInput: '[url1, url2, url3]',
        sampleOutput: '{ fulfilled: 2, rejected: 1 }',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: '[url1, url2, url3]', expectedOutput: '{ fulfilled: 2, rejected: 1 }', isHidden: false, points: 5 },
          { id: 'TC-02', input: '[url1]', expectedOutput: '{ fulfilled: 1, rejected: 0 }', isHidden: false, points: 2.5 },
          { id: 'TC-03', input: '[failUrl1, failUrl2]', expectedOutput: '{ fulfilled: 0, rejected: 2 }', isHidden: true, points: 2.5 },
        ],
      },
    ],
    updatedAt: '24/10/2026',
  },
  {
    id: 'TPL-LAB-04',
    title: 'Danh sách liên kết đơn & Ngăn xếp (Stack)',
    type: 'lab',
    category: 'Cấu trúc dữ liệu',
    language: 'C++',
    questionCount: 4,
    description: 'Cài đặt và thao tác Singly Linked List, đảo ngược danh sách và ứng dụng Stack.',
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
    updatedAt: '24/10/2026',
  },
  {
    id: 'TPL-LAB-05',
    title: 'Hàng đợi (Queue) & Cây nhị phân tìm kiếm',
    type: 'lab',
    category: 'Cấu trúc dữ liệu',
    language: 'C++',
    questionCount: 3,
    description: 'Cài đặt Hàng đợi vòng và thuật toán duyệt trên cây nhị phân tìm kiếm BST.',
    questions: [
      {
        id: 'Q-01',
        title: 'Cài đặt Hàng đợi ưu tiên (Priority Queue)',
        difficulty: 'Trung bình',
        description: 'Cài đặt Priority Queue bằng cấu trúc Max-Heap với 2 hàm push và pop.',
        sampleInput: 'push(10), push(30), push(20), pop()',
        sampleOutput: '30',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'push(10), push(30), push(20), pop()', expectedOutput: '30', isHidden: false, points: 3 },
          { id: 'TC-02', input: 'push(5), pop()', expectedOutput: '5', isHidden: false, points: 3 },
          { id: 'TC-03', input: 'push(1), push(99), push(50), pop(), pop()', expectedOutput: '99, then 50', isHidden: true, points: 4 },
        ],
      },
      {
        id: 'Q-02',
        title: 'Duyệt cây nhị phân theo tầng (BFS Level-Order)',
        difficulty: 'Trung bình',
        description: 'Duyệt các node của cây theo thứ tự từng tầng từ trên xuống dưới sử dụng Queue.',
        sampleInput: 'Root: [3, 9, 20, null, null, 15, 7]',
        sampleOutput: '[[3], [9, 20], [15, 7]]',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'Root: [3, 9, 20, null, null, 15, 7]', expectedOutput: '[[3], [9, 20], [15, 7]]', isHidden: false, points: 3 },
          { id: 'TC-02', input: 'Root: [1]', expectedOutput: '[[1]]', isHidden: false, points: 3 },
          { id: 'TC-03', input: 'Root: []', expectedOutput: '[]', isHidden: true, points: 4 },
        ],
      },
      {
        id: 'Q-03',
        title: 'Kiểm tra cây nhị phân có cân bằng AVL hay không',
        difficulty: 'Khó',
        description: 'Kiểm tra độ chênh lệch chiều cao giữa 2 cây con của mọi node không vượt quá 1.',
        sampleInput: 'Tree [1, 2, 2, 3, 3, null, null, 4, 4]',
        sampleOutput: 'false',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'Tree [1, 2, 2, 3, 3, null, null, 4, 4]', expectedOutput: 'false', isHidden: false, points: 3 },
          { id: 'TC-02', input: 'Tree [3, 9, 20, null, null, 15, 7]', expectedOutput: 'true', isHidden: false, points: 3 },
          { id: 'TC-03', input: 'Tree []', expectedOutput: 'true', isHidden: true, points: 4 },
        ],
      },
    ],
    updatedAt: '24/10/2026',
  },
  {
    id: 'TPL-LAB-06',
    title: 'Khởi tạo Lớp, Đối tượng & Tính đóng gói',
    type: 'lab',
    category: 'Lập trình OOP',
    language: 'Java',
    questionCount: 3,
    description: 'Xây dựng Class, Constructor, Getter/Setter và quản lý truy cập access modifier trong Java.',
    questions: [
      {
        id: 'Q-01',
        title: 'Xây dựng lớp Student với điểm trung bình GPA',
        difficulty: 'Dễ',
        description: 'Tạo class Student có private fields name, gpa. Có method getGradeRank() trả về Giỏi/Khá/TB.',
        sampleInput: 'new Student("An", 3.6)',
        sampleOutput: 'rank: "Giỏi"',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'new Student("An", 3.6).getGradeRank()', expectedOutput: '"Giỏi"', isHidden: false, points: 3 },
          { id: 'TC-02', input: 'new Student("Binh", 2.8).getGradeRank()', expectedOutput: '"Khá"', isHidden: false, points: 3 },
          { id: 'TC-03', input: 'new Student("Cuong", 1.9).getGradeRank()', expectedOutput: '"Yếu"', isHidden: true, points: 4 },
        ],
      },
      {
        id: 'Q-02',
        title: 'Quản lý tài khoản ngân hàng BankAccount',
        difficulty: 'Dễ',
        description: 'Cài đặt phương thức deposit và withdraw với điều kiện số dư tối thiểu không âm.',
        sampleInput: 'balance = 100, withdraw(120)',
        sampleOutput: 'false, balance = 100',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'balance = 100, withdraw(120)', expectedOutput: 'false, balance = 100', isHidden: false, points: 3 },
          { id: 'TC-02', input: 'balance = 200, deposit(50), withdraw(100)', expectedOutput: 'true, balance = 150', isHidden: false, points: 3 },
          { id: 'TC-03', input: 'balance = 0, deposit(0)', expectedOutput: 'false, balance = 0', isHidden: true, points: 4 },
        ],
      },
      {
        id: 'Q-03',
        title: 'Phân loại nhân viên và tính lương thưởng kế thừa',
        difficulty: 'Trung bình',
        description: 'Lớp cha Employee, hai lớp con FullTimeEmployee và PartTimeEmployee tính lương theo công thức.',
        sampleInput: 'PartTimeEmployee(rate=50k, hours=80)',
        sampleOutput: 'salary = 4000000',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'PartTimeEmployee(rate=50k, hours=80)', expectedOutput: 'salary = 4000000', isHidden: false, points: 3 },
          { id: 'TC-02', input: 'FullTimeEmployee(base=8000000, bonus=1500000)', expectedOutput: 'salary = 9500000', isHidden: false, points: 3 },
          { id: 'TC-03', input: 'PartTimeEmployee(rate=50k, hours=0)', expectedOutput: 'salary = 0', isHidden: true, points: 4 },
        ],
      },
    ],
    updatedAt: '24/10/2026',
  },
  {
    id: 'TPL-EXAM-01',
    title: 'Kiểm tra giữa kỳ • Xây dựng ứng dụng Web tương tác',
    type: 'exam',
    category: 'Lập trình Web',
    language: 'JavaScript / Node.js',
    questionCount: 3,
    durationMinutes: 90,
    description: 'Đề thi thực hành giữa kỳ môn Lập trình Web. Sinh viên làm 3 bài lập trình giải quyết vấn đề thực tế.',
    questions: [
      {
        id: 'Q-01',
        title: 'Xây dựng bộ lọc và phân trang danh sách sản phẩm',
        difficulty: 'Dễ',
        description: 'Viết hàm filterAndPaginate(items, search, category, page, limit) trả về danh sách trang tương ứng.',
        sampleInput: 'items (100 sp), category="tech", page=2, limit=10',
        sampleOutput: '{ data: 10 items, totalPages: 4 }',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'items (100 sp), category="tech", page=2, limit=10', expectedOutput: '{ data: 10 items, totalPages: 4 }', isHidden: false, points: 1 },
          { id: 'TC-02', input: 'items (10 sp), category="all", page=1, limit=20', expectedOutput: '{ data: 10 items, totalPages: 1 }', isHidden: false, points: 1 },
          { id: 'TC-03', input: 'items (50 sp), category="empty", page=1, limit=10', expectedOutput: '{ data: 0 items, totalPages: 0 }', isHidden: true, points: 1 },
        ],
      },
      {
        id: 'Q-02',
        title: 'Tạo middleware xác thực JWT và phân quyền role',
        difficulty: 'Trung bình',
        description: 'Middleware kiểm tra token Bearer, giải mã payload và xác nhận quyền hạn người dùng trước khi next().',
        sampleInput: 'header: "Bearer invalid_token"',
        sampleOutput: '401 Unauthorized',
        testCasesCount: 4,
        testCases: [
          { id: 'TC-01', input: 'header: "Bearer invalid_token"', expectedOutput: '401 Unauthorized', isHidden: false, points: 1 },
          { id: 'TC-02', input: 'header: "Bearer valid_admin_token"', expectedOutput: '200 OK (req.user set)', isHidden: false, points: 1 },
          { id: 'TC-03', input: 'header: missing', expectedOutput: '401 Unauthorized', isHidden: true, points: 1 },
          { id: 'TC-04', input: 'header: "Bearer valid_student_token" access admin endpoint', expectedOutput: '403 Forbidden', isHidden: true, points: 1 },
        ],
      },
      {
        id: 'Q-03',
        title: 'Xử lý giỏ hàng và áp dụng mã giảm giá theo điều kiện',
        difficulty: 'Khó',
        description: 'Tính tổng tiền giỏ hàng, áp dụng voucher giảm giá (tiền cố định hoặc %) và thuế VAT chuẩn.',
        sampleInput: 'cart 500k, voucher DISCOUNT20 (20%, max 80k)',
        sampleOutput: 'finalTotal = 420k',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'cart 500k, voucher DISCOUNT20 (20%, max 80k)', expectedOutput: 'finalTotal = 420k', isHidden: false, points: 1 },
          { id: 'TC-02', input: 'cart 200k, voucher MIN300K', expectedOutput: 'finalTotal = 200k (Voucher not applicable)', isHidden: false, points: 1 },
          { id: 'TC-03', input: 'cart 1000k, voucher FIXED100K', expectedOutput: 'finalTotal = 900k', isHidden: true, points: 2 },
        ],
      },
    ],
    updatedAt: '24/10/2026',
  },
  {
    id: 'TPL-EXAM-02',
    title: 'Kiểm tra thực hành • Cây & Đồ thị nâng cao',
    type: 'exam',
    category: 'Cấu trúc dữ liệu',
    language: 'C++',
    questionCount: 2,
    durationMinutes: 60,
    description: 'Đề thi thực hành cuối kỳ Cấu trúc dữ liệu & Giải thuật. Chuyên sâu về thuật toán đồ thị.',
    questions: [
      {
        id: 'Q-01',
        title: 'Tìm đường đi ngắn nhất bằng Dijkstra',
        difficulty: 'Trung bình',
        description: 'Áp dụng thuật toán Dijkstra với Priority Queue để tìm khoảng cách ngắn nhất từ đỉnh nguồn S đến mọi đỉnh.',
        sampleInput: 'Đồ thị 6 đỉnh có trọng số dương, nguồn 1',
        sampleOutput: 'Mảng khoảng cách [0, 4, 12, 19, 21, 11]',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'Đồ thị 6 đỉnh có trọng số dương, nguồn 1', expectedOutput: 'Mảng khoảng cách [0, 4, 12, 19, 21, 11]', isHidden: false, points: 2 },
          { id: 'TC-02', input: 'Đồ thị rời rạc có đỉnh không tới được', expectedOutput: 'INF', isHidden: false, points: 2 },
          { id: 'TC-03', input: 'Đồ thị 100 đỉnh, 500 cạnh', expectedOutput: 'Khoảng cách tối ưu O((V+E)logV)', isHidden: true, points: 1 },
        ],
      },
      {
        id: 'Q-02',
        title: 'Tìm thành phần liên thông mạnh bằng thuật toán Tarjan',
        difficulty: 'Khó',
        description: 'Sử dụng DFS và Stack để xác định tất cả các thành phần liên thông mạnh trong đồ thị có hướng.',
        sampleInput: 'Directed Graph 8 đỉnh, 14 cạnh',
        sampleOutput: '3 thành phần liên thông mạnh',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'Directed Graph 8 đỉnh, 14 cạnh', expectedOutput: '3 thành phần liên thông mạnh', isHidden: false, points: 2 },
          { id: 'TC-02', input: 'Đồ thị chu trình đơn C5', expectedOutput: '1 thành phần liên thông mạnh', isHidden: false, points: 2 },
          { id: 'TC-03', input: 'DAG không có chu trình', expectedOutput: 'V thành phần liên thông mạnh', isHidden: true, points: 1 },
        ],
      },
    ],
    updatedAt: '24/10/2026',
  },
  {
    id: 'TPL-EXAM-03',
    title: 'Kiểm tra thực hành OOP • Kế thừa & Đa hình',
    type: 'exam',
    category: 'Lập trình OOP',
    language: 'Java',
    questionCount: 3,
    durationMinutes: 75,
    description: 'Đề thi thực hành kiểm tra khả năng áp dụng 4 tính chất OOP trong hệ thống cổng thanh toán trực tuyến.',
    questions: [
      {
        id: 'Q-01',
        title: 'Thiết kế hệ thống thanh toán PaymentGateway với Interface',
        difficulty: 'Trung bình',
        description: 'Tạo interface PaymentMethod với các implementation: CreditCard, EWallet, BankTransfer.',
        sampleInput: 'processPayment(new EWallet("Momo", 500000), 200000)',
        sampleOutput: 'Success: remaining 300000',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'processPayment(new EWallet("Momo", 500000), 200000)', expectedOutput: 'Success: remaining 300000', isHidden: false, points: 1.5 },
          { id: 'TC-02', input: 'processPayment(new CreditCard("1234", 100000), 150000)', expectedOutput: 'Failed: Insufficient limit', isHidden: false, points: 1.5 },
          { id: 'TC-03', input: 'processPayment(new BankTransfer("VCB", 1000000), 500000)', expectedOutput: 'Success: remaining 500000', isHidden: true, points: 1 },
        ],
      },
      {
        id: 'Q-02',
        title: 'Xử lý ngoại lệ tùy chỉnh InvalidTransactionException',
        difficulty: 'Dễ',
        description: 'Bắt các trường hợp số tiền âm, vượt hạn mức ngày và ném ngoại lệ tùy chỉnh.',
        sampleInput: 'transfer(-50000)',
        sampleOutput: 'Throw InvalidTransactionException("Số tiền không hợp lệ")',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'transfer(-50000)', expectedOutput: 'Throw InvalidTransactionException("Số tiền không hợp lệ")', isHidden: false, points: 1.5 },
          { id: 'TC-02', input: 'transfer(50000000) > maxDailyLimit', expectedOutput: 'Throw InvalidTransactionException("Vượt hạn mức ngày")', isHidden: false, points: 1.5 },
          { id: 'TC-03', input: 'transfer(100000)', expectedOutput: 'Success', isHidden: true, points: 1 },
        ],
      },
      {
        id: 'Q-03',
        title: 'Tối ưu hóa hóa đơn và xuất báo cáo đa định dạng',
        difficulty: 'Khó',
        description: 'Áp dụng Factory Pattern để sinh hóa đơn theo định dạng JSON, XML hoặc PDF.',
        sampleInput: 'InvoiceFactory.create("JSON", invoiceData)',
        sampleOutput: 'JSON formatted string',
        testCasesCount: 3,
        testCases: [
          { id: 'TC-01', input: 'InvoiceFactory.create("JSON", invoiceData)', expectedOutput: 'JSON formatted string', isHidden: false, points: 1 },
          { id: 'TC-02', input: 'InvoiceFactory.create("XML", invoiceData)', expectedOutput: '<invoice>...</invoice>', isHidden: false, points: 1 },
          { id: 'TC-03', input: 'InvoiceFactory.create("UNKNOWN", invoiceData)', expectedOutput: 'Throw IllegalArgumentException', isHidden: true, points: 1 },
        ],
      },
    ],
    updatedAt: '24/10/2026',
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
    id: 'SE1848',
    name: 'Lập trình Web',
    semester: 'HK1 2026–2027',
    startDate: '05/09/2026',
    endDate: '15/01/2027',
    roomCode: 'SE1848-ROOM',
    roomPassword: '123456',
    status: 'Hoạt động',
    studentCount: 48,
    lecturer: 'Long Phạm',
    students: [
      { id: 'SE184801', name: 'Nguyễn Văn An', email: 'an.nv@school.edu.vn', status: 'Đang học' },
      { id: 'SE184802', name: 'Trần Thu Bình', email: 'binh.tt@school.edu.vn', status: 'Đang học' },
      { id: 'SE184803', name: 'Lê Hải Nam', email: 'nam.lh@school.edu.vn', status: 'Đang học' },
      { id: 'SE184804', name: 'Phạm Minh Châu', email: 'chau.pm@school.edu.vn', status: 'Đang học' },
    ],
    labs: [
      {
        id: 'LAB-SE1848-01',
        templateId: 'TPL-LAB-01',
        labNumber: 1,
        title: 'Buổi 01 • Bài Lab 01: Cấu trúc điều khiển & Mảng một chiều',
        language: 'JavaScript / Python',
        questionCount: 3,
        scheduleNote: 'Thứ 3 (Tuần 2)',
        startTime: '07:30, 15/09/2026',
        endTime: '09:50, 15/09/2026',
        durationMinutes: 120,
        isProctored: true,
        roomCode: 'LAB-1848-01',
        roomPassword: '112233',
        status: 'Đang mở',
        submissionCount: 42,
      },
      {
        id: 'LAB-SE1848-02',
        templateId: 'TPL-LAB-02',
        labNumber: 2,
        title: 'Buổi 02 • Bài Lab 02: Xử lý chuỗi & Thao tác DOM trên trình duyệt',
        language: 'JavaScript',
        questionCount: 3,
        scheduleNote: 'Thứ 5 (Tuần 4)',
        startTime: '07:30, 29/09/2026',
        endTime: '09:50, 29/09/2026',
        durationMinutes: 120,
        isProctored: true,
        roomCode: 'LAB-1848-02',
        roomPassword: '223344',
        status: 'Đang mở',
        submissionCount: 28,
      },
      {
        id: 'LAB-SE1848-03',
        templateId: 'TPL-LAB-03',
        labNumber: 3,
        title: 'Buổi 03 • Bài Lab 03: Lập trình bất đồng bộ & Kết nối Fetch API',
        language: 'JavaScript / Node.js',
        questionCount: 2,
        scheduleNote: 'Thứ 3 (Tuần 6)',
        startTime: '13:30, 13/10/2026',
        endTime: '15:50, 13/10/2026',
        durationMinutes: 120,
        isProctored: false,
        roomCode: 'LAB-1848-03',
        roomPassword: '334455',
        status: 'Đang mở',
        submissionCount: 15,
      },
    ],
    exams: [
      {
        id: 'EXAM-SE1848-01',
        templateId: 'TPL-EXAM-01',
        title: 'Kiểm tra giữa kỳ • Xây dựng ứng dụng Web tương tác',
        type: 'Kiểm tra giữa kỳ',
        language: 'JavaScript / Node.js',
        durationMinutes: 90,
        scheduledAt: '08:00 - 09:30, 15/11/2026',
        questionCount: 3,
        isProctored: true,
        roomCode: 'EXAM-1848-MID',
        roomPassword: '889900',
        status: 'Sắp diễn ra',
        submissionCount: 0,
      },
    ],
  },
  {
    id: 'IT2202',
    name: 'Cấu trúc dữ liệu',
    semester: 'HKT 2026-27',
    startDate: '10/09/2026',
    endDate: '20/01/2027',
    roomCode: 'IT2202-ROOM',
    roomPassword: '654321',
    status: 'Hoạt động',
    studentCount: 52,
    students: [
      { id: 'IT220201', name: 'Vũ Gia Huy', email: 'huy.vg@school.edu.vn', status: 'Đang học' },
      { id: 'IT220202', name: 'Đỗ Khánh Linh', email: 'linh.dk@school.edu.vn', status: 'Đang học' },
      { id: 'IT220203', name: 'Ngô Đức Nam', email: 'nam.nd@school.edu.vn', status: 'Đang học' },
    ],
    labs: [
      {
        id: 'LAB-IT2202-01',
        templateId: 'TPL-LAB-04',
        labNumber: 1,
        title: 'Buổi 01 • Bài Lab 01: Danh sách liên kết đơn & Ngăn xếp (Stack)',
        language: 'C++',
        questionCount: 4,
        scheduleNote: 'Thứ 2 (Tuần 2)',
        startTime: '08:00, 20/09/2026',
        endTime: '10:00, 20/09/2026',
        durationMinutes: 120,
        isProctored: true,
        roomCode: 'LAB-2202-01',
        roomPassword: '556677',
        status: 'Đã kết thúc',
        submissionCount: 50,
      },
      {
        id: 'LAB-IT2202-02',
        templateId: 'TPL-LAB-05',
        labNumber: 2,
        title: 'Buổi 02 • Bài Lab 02: Hàng đợi (Queue) & Cây nhị phân tìm kiếm',
        language: 'C++',
        questionCount: 3,
        scheduleNote: 'Thứ 4 (Tuần 4)',
        startTime: '08:00, 04/10/2026',
        endTime: '10:00, 04/10/2026',
        durationMinutes: 120,
        isProctored: true,
        roomCode: 'LAB-2202-02',
        roomPassword: '667788',
        status: 'Đang mở',
        submissionCount: 38,
      },
    ],
    exams: [
      {
        id: 'EXAM-IT2202-01',
        templateId: 'TPL-EXAM-02',
        title: 'Kiểm tra thực hành • Cây & Đồ thị',
        type: 'Kiểm tra giữa kỳ',
        language: 'C++',
        durationMinutes: 60,
        scheduledAt: '14:00 - 15:00, 20/10/2026',
        questionCount: 2,
        isProctored: true,
        roomCode: 'EXAM-2202-MID',
        roomPassword: '990011',
        status: 'Đã kết thúc',
        submissionCount: 49,
      },
    ],
  },
  {
    id: 'SE1849',
    name: 'Lập trình hướng đối tượng',
    semester: 'HKT 2026-27',
    startDate: '15/10/2026',
    endDate: '28/02/2027',
    roomCode: 'SE1849-ROOM',
    roomPassword: '888888',
    status: 'Chưa mở',
    studentCount: 46,
    students: [
      { id: 'SE184901', name: 'Bùi Nhật Minh', email: 'minh.bn@school.edu.vn', status: 'Đang học' },
      { id: 'SE184902', name: 'Hoàng Ngọc Mai', email: 'mai.hn@school.edu.vn', status: 'Đang học' },
    ],
    labs: [
      {
        id: 'LAB-SE1849-01',
        templateId: 'TPL-LAB-06',
        labNumber: 1,
        title: 'Buổi 01 • Bài Lab 01: Khởi tạo Lớp, Đối tượng & Tính đóng gói',
        language: 'Java',
        questionCount: 3,
        scheduleNote: 'Thứ 6 (Tuần 2)',
        startTime: '13:00, 24/10/2026',
        endTime: '15:15, 24/10/2026',
        durationMinutes: 135,
        isProctored: true,
        roomCode: 'LAB-1849-01',
        roomPassword: '778899',
        status: 'Đang mở',
        submissionCount: 36,
      },
    ],
    exams: [
      {
        id: 'EXAM-SE1849-01',
        templateId: 'TPL-EXAM-03',
        title: 'Kiểm tra thực hành OOP • Kế thừa & Đa hình',
        type: 'Kiểm tra quá trình',
        language: 'Java',
        durationMinutes: 75,
        scheduledAt: '09:00 - 10:15, 05/11/2026',
        questionCount: 3,
        isProctored: false,
        roomCode: 'EXAM-1849-01',
        roomPassword: '445566',
        status: 'Sắp diễn ra',
        submissionCount: 0,
      },
    ],
  },
];

const STORAGE_KEY = 'oculide_classes_mock';

export function getStoredClasses(): ClassRow[] {
  if (typeof window === 'undefined') return INITIAL_CLASSES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_CLASSES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((c) => {
        const initMatch = INITIAL_CLASSES.find((item) => item.id === c.id);
        const labs = (c.labs || initMatch?.labs || []).map((l: any, idx: number) => ({
          ...l,
          templateId: l.templateId || initMatch?.labs?.[idx]?.templateId || `TPL-LAB-0${idx + 1}`,
          roomCode:
            l.roomCode ||
            initMatch?.labs?.[idx]?.roomCode ||
            `LAB-${Math.floor(1000 + Math.random() * 9000)}`,
          roomPassword:
            l.roomPassword || initMatch?.labs?.[idx]?.roomPassword || '123456',
        }));
        const exams = (c.exams || initMatch?.exams || []).map((e: any, idx: number) => ({
          ...e,
          templateId: e.templateId || initMatch?.exams?.[idx]?.templateId || `TPL-EXAM-0${idx + 1}`,
          roomCode:
            e.roomCode ||
            initMatch?.exams?.[idx]?.roomCode ||
            `EXAM-${Math.floor(1000 + Math.random() * 9000)}`,
          roomPassword:
            e.roomPassword || initMatch?.exams?.[idx]?.roomPassword || '123456',
        }));
        return {
          ...c,
          roomCode: c.roomCode || initMatch?.roomCode || `${c.id}-ROOM`,
          roomPassword: c.roomPassword || initMatch?.roomPassword || '123456',
          labs,
          exams,
        };
      });
    }
  } catch {
    // fallback
  }
  return INITIAL_CLASSES;
}

export function saveStoredClasses(classes: ClassRow[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
  } catch {
    // ignore
  }
}

const TEMPLATES_STORAGE_KEY = 'oculide_question_templates_mock';

export function getStoredQuestionTemplates(): QuestionTemplate[] {
  const withLecturer = (list: QuestionTemplate[]) =>
    list.map((t) => ({
      ...t,
      lecturer: t.lecturer || getDefaultTemplateLecturer(t.category, t.id),
    }));

  if (typeof window === 'undefined') return withLecturer(SAMPLE_QUESTION_TEMPLATES);
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return withLecturer(SAMPLE_QUESTION_TEMPLATES);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Tự động bổ sung testCases & lecturer nếu localStorage lưu trữ bản mock cũ
      return parsed.map((tpl: QuestionTemplate) => {
        const sample = SAMPLE_QUESTION_TEMPLATES.find((s) => s.id === tpl.id);
        const questions = (tpl.questions || []).map((q: TemplateQuestionItem, idx: number) => {
          const sampleQ = sample?.questions?.[idx];
          const testCases = q.testCases && q.testCases.length > 0
            ? q.testCases
            : (sampleQ?.testCases || []);
          return {
            ...q,
            testCases,
            testCasesCount: testCases.length > 0 ? testCases.length : (q.testCasesCount || 0),
          };
        });
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
            title: `Lab 0${lab.labNumber} • ${updatedTemplate.title}`,
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

    // Đồng bộ tên bộ đề & thời lượng sang lịch kiểm tra Admin (oculide_schedules_mock)
    const rawSched = localStorage.getItem('oculide_schedules_mock');
    if (rawSched) {
      const parsedSched = JSON.parse(rawSched);
      if (Array.isArray(parsedSched)) {
        const updatedSched = parsedSched.map((s: any) =>
          s.templateId === updatedTemplate.id
            ? {
                ...s,
                templateTitle: updatedTemplate.title,
                durationMinutes: updatedTemplate.durationMinutes || s.durationMinutes,
              }
            : s
        );
        localStorage.setItem('oculide_schedules_mock', JSON.stringify(updatedSched));
      }
    }
    window.dispatchEvent(new Event('storage'));
  } catch {
    // ignore
  }
}
