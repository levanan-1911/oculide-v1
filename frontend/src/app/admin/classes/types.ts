export type ClassStatus = 'Chưa mở' | 'Hoạt động' | 'Đã kết thúc';
export type StudentStatus = 'Đang học' | 'Tạm dừng' | 'Học ghép' | 'Học lại' | 'Học vượt';

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  homeroomClass?: string; // Lớp sinh hoạt / Niên chế (ví dụ: K29-CSU, K29-KTPM1)
  department?: string; // Khoa / Chuyên ngành
  note?: string; // Ghi chú đăng ký bổ sung / học ghép
  status: StudentStatus;
  missingFields?: string[];
  hasAccount?: boolean; // Trạng thái đã có tài khoản trong hệ thống hay chưa
}

export interface ClassRow {
  id: string;
  name: string;
  courseCode?: string;   // Mã môn học riêng (VD: CMU-CS 316, CS 252)
  sectionCode?: string;  // Mã phân lớp (VD: AIS, DDIS)
  semester: string;
  startDate?: string;
  endDate?: string;
  status: ClassStatus;
  studentCount: number;
  students: StudentRow[];
  lecturer?: string;
  instructor_id?: number | null;
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

export const INITIAL_CLASSES: ClassRow[] = [];

const STORAGE_KEY = 'oculide_classes_v2';

export function getStoredClasses(): ClassRow[] {
  if (typeof window === 'undefined') return INITIAL_CLASSES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c: any) => ({
          ...c,
          lecturer: c.lecturer || 'Chưa phân công',
          students: c.students || [],
        }));
      }
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
    window.dispatchEvent(new Event('storage'));
  } catch {
    // ignore
  }
}
