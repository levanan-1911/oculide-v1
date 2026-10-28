import { redirect } from 'next/navigation';

/**
 * Route: /instructor/classes/create
 * Giảng viên không có quyền mở/tạo lớp học phần mới (do Nhà trường/Admin quản lý).
 * Tự động chuyển hướng về danh sách lớp học phần: /instructor/classes
 */
export default function InstructorCreateClassPage() {
  redirect('/instructor/classes');
}
