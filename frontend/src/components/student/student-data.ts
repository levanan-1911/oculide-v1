
export type ExamStatus = "Sắp diễn ra" | "Đang diễn ra" | "Đã hoàn thành";

export interface StudentExam {
  id: string;
  title: string;
  subject: string;
  instructor: string;
  startTime: string;
  duration: number;
  status: ExamStatus;
  roomCode: string;
}

export const studentExams: StudentExam[] = [
  {
    id: "EX001",
    title: "Kiểm tra thực hành C++",
    subject: "Lập trình C++",
    instructor: "Nguyễn Văn An",
    startTime: "09:00, 28/10/2026",
    duration: 60,
    status: "Sắp diễn ra",
    roomCode: "OCL-C001",
  },
  {
    id: "EX002",
    title: "Đánh giá thực hành Java",
    subject: "Lập trình Java",
    instructor: "Trần Thị Mai",
    startTime: "14:00, 27/10/2026",
    duration: 90,
    status: "Đang diễn ra",
    roomCode: "OCL-J002",
  },
  {
    id: "EX003",
    title: "Bài thực hành Python",
    subject: "Lập trình Python",
    instructor: "Lê Minh Tuấn",
    startTime: "08:00, 20/10/2026",
    duration: 45,
    status: "Đã hoàn thành",
    roomCode: "OCL-P003",
  },
];

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
