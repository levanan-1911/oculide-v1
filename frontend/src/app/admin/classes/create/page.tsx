'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  UploadCloud,
  Trash2,
  Plus,
  Download,
  Loader2,
  GraduationCap,
  Users,
  Search,
  Sparkles,
  Info,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import {
  ClassRow,
  ClassStatus,
  StudentRow,
  UploadedFileInfo,
  getStoredClasses,
  saveStoredClasses,
} from '../types';
import {
  parseStudentFile,
  downloadStudentSampleTemplate,
} from '../excelParser';

const SEMESTERS = ['HK1 2026–2027', 'HK2 2026–2027', 'HKT 2026-27', 'HKT 2025-26'];

export default function CreateClassPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Thông tin Lớp học
  const [classCode, setClassCode] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [sectionCode, setSectionCode] = useState('');
  const [className, setClassName] = useState('');
  const [semester, setSemester] = useState('HK1 2026–2027');
  const [credits, setCredits] = useState<number | ''>(3);
  const [description, setDescription] = useState('');
  const [createStatus, setCreateStatus] = useState<ClassStatus>('Hoạt động');

  // Giảng viên phụ trách (Admin phân công từ CSDL)
  const [instructors, setInstructors] = useState<
    Array<{ id: number; name: string; email: string; code?: string }>
  >([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<number | null>(null);
  const [selectedLecturerName, setSelectedLecturerName] = useState('TS. Huỳnh Bá Diệu');
  const [isLoadingInstructors, setIsLoadingInstructors] = useState(false);

  // Danh sách sinh viên
  const [studentInputMode, setStudentInputMode] = useState<'file' | 'manual'>('file');
  const [uploadedFileInfo, setUploadedFileInfo] = useState<UploadedFileInfo | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentFilter, setStudentFilter] = useState('');
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [autoExtractedNotice, setAutoExtractedNotice] = useState<string | null>(null);

  // Nhập thủ công sinh viên
  const [manualId, setManualId] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [isLookingUpMssv, setIsLookingUpMssv] = useState(false);
  const [mssvFoundStudent, setMssvFoundStudent] = useState<{
    id: string;
    name: string;
    email: string;
    lopSinhHoat?: string;
  } | null>(null);

  // Tìm kiếm sinh viên trong hệ thống để thêm nhanh vào lớp
  const [systemSearchKeyword, setSystemSearchKeyword] = useState('');
  const [searchedSystemStudents, setSearchedSystemStudents] = useState<any[]>([]);
  const [isSearchingSystem, setIsSearchingSystem] = useState(false);
  const [isManualNewStudentExpanded, setIsManualNewStudentExpanded] = useState(false);

  // Trạng thái lưu
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tìm kiếm sinh viên trong hệ thống từ CSDL SQL Server với debounce 250ms
  useEffect(() => {
    const kw = systemSearchKeyword.trim();
    if (!kw) {
      setSearchedSystemStudents([]);
      setIsSearchingSystem(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingSystem(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
        const res = await fetch(`/api/v1/classes/students/search?q=${encodeURIComponent(kw)}&limit=10`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            setSearchedSystemStudents(list);
          }
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm sinh viên:', err);
      } finally {
        setIsSearchingSystem(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [systemSearchKeyword]);

  // Thêm nhanh sinh viên tìm thấy từ hệ thống vào danh sách lớp
  function handleAddSystemStudent(st: any) {
    const id = (st.student_id || st.username || String(st.user_id)).trim().toUpperCase();
    if (students.some((s) => s.id.toUpperCase() === id)) {
      return;
    }
    const newStudent: StudentRow = {
      id,
      name: st.full_name,
      email: st.email || `${id.toLowerCase()}@dtu.edu.vn`,
      homeroomClass: st.lop_sinh_hoat || undefined,
      department: st.department || undefined,
      phone: st.phone_number || undefined,
      status: 'Đang học',
      hasAccount: true,
    };
    setStudents((prev) => [...prev, newStudent]);
    setErrorMessage('');
  }

  // Tự động tra cứu sinh viên theo MSSV từ CSDL SQL Server khi nhập thủ công
  useEffect(() => {
    const trimmedId = manualId.trim();
    if (trimmedId.length < 2) {
      setMssvFoundStudent(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLookingUpMssv(true);
        const res = await fetch(`/api/v1/classes/students/search?q=${encodeURIComponent(trimmedId)}&limit=1`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const found = list[0];
            const upper = trimmedId.toUpperCase();
            if (
              (found.student_id && found.student_id.toUpperCase() === upper) ||
              (found.username && found.username.toUpperCase() === upper)
            ) {
              setMssvFoundStudent({
                id: found.student_id || found.username,
                name: found.full_name,
                email: found.email,
                lopSinhHoat: found.lop_sinh_hoat,
              });
              setManualName(found.full_name);
              setManualEmail(found.email);
              return;
            }
          }
        }
        setMssvFoundStudent(null);
      } catch (err) {
        console.warn('Lỗi tra cứu MSSV:', err);
      } finally {
        setIsLookingUpMssv(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [manualId]);

  // Tải danh sách Giảng viên thật từ CSDL để Admin gán phụ trách lớp
  useEffect(() => {
    async function loadInstructors() {
      try {
        setIsLoadingInstructors(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
        const res = await fetch('/api/v1/admin/users?role=instructor&page_size=100', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.users && Array.isArray(data.users)) {
            const list = data.users.map((u: any) => ({
              id: u.user_id,
              name: u.full_name || u.username,
              email: u.email,
              code: u.student_id || u.ma_dinh_danh || `MSGV${u.user_id}`,
            }));
            setInstructors(list);
            if (list.length > 0) {
              setSelectedInstructorId(list[0].id);
              setSelectedLecturerName(list[0].name);
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách giảng viên:', err);
      } finally {
        setIsLoadingInstructors(false);
      }
    }
    loadInstructors();
  }, []);

  // Xử lý nạp tệp Excel / CSV
  async function handleFileUpload(file: File) {
    setErrorMessage('');
    setImportWarnings([]);
    setAutoExtractedNotice(null);
    setIsParsing(true);

    const sizeKB =
      file.size < 1024
        ? `${file.size} B`
        : `${(file.size / 1024).toFixed(1)} KB`;

    try {
      const result = await parseStudentFile(file);

      if (result.errorMessage) {
        setErrorMessage(result.errorMessage);
        setUploadedFileInfo(null);
        setStudents([]);
        return;
      }

      // Tự động đối chiếu tài khoản sinh viên với cơ sở dữ liệu hệ thống
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      const existingUserIds = new Set<string>();
      try {
        const resUsers = await fetch('/api/v1/admin/users?role=student&page_size=100', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (resUsers.ok) {
          const uData = await resUsers.json();
          if (uData.users && Array.isArray(uData.users)) {
            uData.users.forEach((u: any) => {
              if (u.student_id) existingUserIds.add(u.student_id.trim().toUpperCase());
              if (u.username) existingUserIds.add(u.username.trim().toUpperCase());
              if (u.email) existingUserIds.add(u.email.trim().toLowerCase());
            });
          }
        }
      } catch (checkErr) {
        console.warn('Lỗi kiểm tra tài khoản sinh viên từ CSDL:', checkErr);
      }

      // Đánh dấu trạng thái tài khoản cho từng sinh viên
      const missingAccounts: Array<{ id: string; name: string }> = [];
      const studentsWithAccountStatus = result.parsedStudents.map((s) => {
        const upperId = s.id.toUpperCase();
        const lowerEmail = s.email.toLowerCase();
        const hasAccount = existingUserIds.has(upperId) || existingUserIds.has(lowerEmail);
        if (!hasAccount) {
          missingAccounts.push({ id: s.id, name: s.name });
        }
        return {
          id: s.id,
          name: s.name,
          email: s.email,
          homeroomClass: s.homeroomClass,
          status: 'Đang học' as const,
          missingFields: s.missingFields,
          hasAccount,
        };
      });

      const currentWarnings = [...result.warnings];
      if (missingAccounts.length > 0) {
        currentWarnings.unshift(
          `Cảnh báo: Có ${missingAccounts.length} sinh viên chưa có tài khoản trong hệ thống (${missingAccounts.map((s) => `${s.name} - ${s.id}`).join(', ')}). Hệ thống sẽ tự động khởi tạo tài khoản đăng nhập cho các sinh viên này khi bấm "Tạo lớp học".`
        );
      }
      setImportWarnings(currentWarnings);

      setUploadedFileInfo({
        name: file.name,
        sizeFormatted: sizeKB,
        totalRows: result.totalRows,
        validCount: result.parsedStudents.filter((s) => s.missingFields.length === 0).length,
        invalidCount: result.parsedStudents.filter((s) => s.missingFields.length > 0).length,
      });

      // Tự động điền thông tin lớp nếu trích xuất được từ tiêu đề file Excel của trường
      const extractedPieces: string[] = [];
      if (result.metadata) {
        if (result.metadata.courseCode) {
          setCourseCode(result.metadata.courseCode);
        }
        if (result.metadata.classSection) {
          setSectionCode(result.metadata.classSection);
        }
        if (result.metadata.classCode) {
          setClassCode(result.metadata.classCode);
        } else if (result.metadata.courseCode && result.metadata.classSection) {
          setClassCode(`${result.metadata.courseCode} ${result.metadata.classSection}`);
        }
        if (result.metadata.courseCode && result.metadata.classSection) {
          extractedPieces.push(`Mã môn: ${result.metadata.courseCode}`);
          extractedPieces.push(`Mã lớp: ${result.metadata.classSection}`);
        } else if (result.metadata.classCode) {
          extractedPieces.push(`Mã lớp: ${result.metadata.classCode}`);
        }
        if (result.metadata.className) {
          setClassName(result.metadata.className);
          extractedPieces.push(`Môn: ${result.metadata.className}`);
        }
        if (result.metadata.credits) {
          setCredits(result.metadata.credits);
          extractedPieces.push(`Số TC: ${result.metadata.credits}`);
        }
        if (result.metadata.semester) {
          setSemester(result.metadata.semester);
          extractedPieces.push(`Học kỳ: ${result.metadata.semester}`);
        }
        if (result.metadata.lecturerName) {
          const targetGv = result.metadata.lecturerName.toLowerCase();
          const match = instructors.find(
            (i) =>
              i.name.toLowerCase().includes(targetGv) ||
              targetGv.includes(i.name.toLowerCase())
          );
          if (match) {
            setSelectedInstructorId(match.id);
            setSelectedLecturerName(match.name);
            extractedPieces.push(`GV: ${match.name}`);
          } else {
            setSelectedLecturerName(result.metadata.lecturerName);
            extractedPieces.push(`GV: ${result.metadata.lecturerName}`);
          }
        }
      }

      if (extractedPieces.length > 0) {
        setAutoExtractedNotice(`Đã tự động nhận diện: ${extractedPieces.join(' • ')}`);
      }

      // Lưu danh sách sinh viên được phân tích kèm trạng thái tài khoản
      setStudents(studentsWithAccountStatus);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Không thể đọc nội dung tệp. Vui lòng kiểm tra lại định dạng tệp Excel (.xlsx, .xls) hoặc CSV.'
      );
      setUploadedFileInfo(null);
      setStudents([]);
    } finally {
      setIsParsing(false);
    }
  }

  function clearUploadedFile() {
    setUploadedFileInfo(null);
    setImportWarnings([]);
    setStudents([]);
    setErrorMessage('');
    setAutoExtractedNotice(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  // Thêm nhanh sinh viên thủ công (chỉ cần MSSV, Email tự sinh hoặc lấy từ CSDL)
  async function handleAddManualStudent() {
    const id = manualId.trim().toUpperCase();
    if (!id) {
      setErrorMessage('Vui lòng nhập Mã số sinh viên (MSSV).');
      return;
    }

    if (students.some((s) => s.id.toUpperCase() === id)) {
      setErrorMessage(`Mã sinh viên "${id}" đã có trong danh sách.`);
      return;
    }

    let name = manualName.trim();
    let email = manualEmail.trim().toLowerCase();

    // Nếu tên chưa nhập nhưng đã tra cứu được từ CSDL
    if (!name && mssvFoundStudent) {
      name = mssvFoundStudent.name;
      email = mssvFoundStudent.email;
    }

    // Nếu chưa có Họ tên, kiểm tra nhanh CSDL
    if (!name) {
      try {
        const res = await fetch(`/api/v1/classes/students/search?q=${encodeURIComponent(id)}&limit=1`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const match = list.find(
              (s: any) =>
                (s.student_id && s.student_id.toUpperCase() === id) ||
                (s.username && s.username.toUpperCase() === id)
            );
            if (match) {
              name = match.full_name;
              email = match.email;
            }
          }
        }
      } catch {
        // ignore
      }
    }

    if (!name) {
      setErrorMessage(`Sinh viên "${id}" chưa có trong hệ thống. Vui lòng nhập thêm Họ và tên.`);
      return;
    }

    // Email tự động sinh chuẩn @dtu.edu.vn theo MSSV nếu để trống
    if (!email) {
      email = `${id.toLowerCase()}@dtu.edu.vn`;
    }

    setStudents((curr) => [
      ...curr,
      {
        id,
        name,
        email,
        status: 'Đang học',
        hasAccount: !!mssvFoundStudent,
      },
    ]);
    setManualId('');
    setManualName('');
    setManualEmail('');
    setMssvFoundStudent(null);
    setErrorMessage('');
  }

  function handleRemoveStudent(studentId: string) {
    setStudents((curr) => curr.filter((s) => s.id !== studentId));
  }

  // Lọc sinh viên trong bảng xem trước
  const filteredStudents = students.filter((s) => {
    if (!studentFilter) return true;
    const q = studentFilter.toLowerCase();
    return s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  // Hoàn tất tạo lớp học (1-Click Action)
  async function handleCreateClass() {
    const id = classCode.trim().toUpperCase();
    const name = className.trim();
    const sem = semester.trim();
    const gv = selectedLecturerName.trim() || 'TS. Huỳnh Bá Diệu';

    if (!id) {
      setErrorMessage('Vui lòng nhập Mã lớp học phần (ví dụ: CMU-CS 316 AIS).');
      return;
    }
    if (!name) {
      setErrorMessage('Vui lòng nhập Tên môn học / Tên lớp (ví dụ: Fundamentals of Computing 2).');
      return;
    }
    if (students.length === 0) {
      setErrorMessage('Vui lòng nạp hoặc nhập danh sách sinh viên của lớp.');
      return;
    }

    const existingClasses = getStoredClasses();
    if (existingClasses.some((c) => c.id.toLowerCase() === id.toLowerCase())) {
      setErrorMessage(`Mã lớp "${id}" đã tồn tại trong hệ thống. Vui lòng chọn mã khác.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;

      // 1. Lưu lớp học vào CSDL SQL Server (bảng LopHoc) với Giảng viên được Admin gán
      let createdClassCode = id;
      try {
        const resCls = await fetch('/api/v1/classes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            class_code: id,
            class_name: name,
            course_code: courseCode.trim() || undefined,
            section_code: sectionCode.trim() || undefined,
            semester: sem,
            description: description.trim() || `Lớp ${name} (${sem}) - Giảng viên phụ trách: ${gv}`,
            instructor_id: selectedInstructorId || undefined,
          }),
        });
        if (resCls.ok) {
          const clsData = await resCls.json();
          createdClassCode = clsData.class_code || id;
        }
      } catch (err) {
        console.error('Lỗi khi lưu lớp học vào CSDL SQL Server:', err);
      }

      // 2. Tự động đồng bộ tài khoản sinh viên vào CSDL SQL Server (vai trò student)
      const validUsers = students
        .map((s) => {
          const emailVal = (s.email || '').trim().toLowerCase();
          const fallbackEmail = emailVal || (s.id ? `${s.id.toLowerCase()}@dtu.edu.vn` : '');
          return {
            username: fallbackEmail ? fallbackEmail.split('@')[0].trim().toLowerCase() : (s.id || '').toLowerCase(),
            email: fallbackEmail,
            full_name: (s.name || '').trim() || (s.id || 'Sinh viên'),
            student_id: (s.id || '').trim().toUpperCase(),
          };
        })
        .filter((u) => u.email && u.full_name);

      if (validUsers.length > 0) {
        try {
          await fetch('/api/v1/admin/users/batch-import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              role: 'student',
              users: validUsers,
            }),
          });
        } catch (err) {
          console.error('Lỗi khi nạp danh sách sinh viên lớp vào CSDL:', err);
        }
      }

      // 3. GHI DANH TẤT CẢ SINH VIÊN VÀO CSDL SQL SERVER (Bảng SinhVienLopHoc)
      try {
        const studentIds = students.map((s) => s.id);
        await fetch(`/api/v1/classes/${encodeURIComponent(createdClassCode)}/students/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            student_ids: studentIds,
            status: 'dang_hoc',
          }),
        });
      } catch (err) {
        console.error('Lỗi khi ghi danh sinh viên vào CSDL SQL Server:', err);
      }

      // 4. Lưu vào localStorage để đồng bộ ngay giao diện Client
      const newClass: ClassRow = {
        id: createdClassCode,
        name,
        semester: sem,
        startDate: '05/09/2026',
        endDate: '15/01/2027',
        roomCode: `${createdClassCode}-ROOM`,
        roomPassword: '123456',
        status: createStatus,
        studentCount: students.length,
        students: students,
        lecturer: gv,
        labs: [],
        exams: [],
      };
      saveStoredClasses([...existingClasses, newClass]);

      // 5. Chuyển hướng về trang danh sách lớp với thông báo thành công
      router.push(`/admin/classes?created=${encodeURIComponent(createdClassCode)}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo lớp học.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] dark:bg-[#090a0f] text-slate-800 dark:text-slate-100 transition-colors">
      <AdminSidebar activeModule="classes" />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar title="Tạo lớp học mới" />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1440px] space-y-6">

            {/* THANH ĐIỀU HƯỚNG & HÀNH ĐỘNG TRÊN CÙNG */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <Link
                  href="/admin/classes"
                  title="Quay lại danh sách lớp"
                  aria-label="Quay lại danh sách lớp"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/90 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 shadow-xs dark:bg-white/5 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 cursor-pointer"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Tạo lớp học mới
                  </h1>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                    Khởi tạo lớp học phần, phân công giảng viên và nạp danh sách sinh viên.
                  </p>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <Link
                  href="/admin/classes"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-xs dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
                >
                  Hủy
                </Link>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCreateClass}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 text-xs font-semibold text-white shadow-sm shadow-blue-500/25 transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang khởi tạo lớp...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Tạo lớp học</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* THÔNG BÁO TỰ ĐỘNG ĐIỀN NẾU TRÍCH XUẤT TỪ FILE EXCEL */}
            {autoExtractedNotice && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-xs text-emerald-900 shadow-xs dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="flex-1 font-medium">
                  <span className="font-bold">✨ Nhận diện thông minh từ file Excel: </span>
                  <span>{autoExtractedNotice}</span>
                </div>
              </div>
            )}

            {/* BÁO LỖI NẾU CÓ */}
            {errorMessage && (
              <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 shadow-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* BỐ CỤC CHÍNH 2 CỘT: TRÁI (THÔNG TIN LỚP) - PHẢI (DANH SÁCH SINH VIÊN) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">

              {/* ── CỘT TRÁI (5/12): THÔNG TIN LỚP HỌC & GIẢNG VIÊN ── */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#0d1017] space-y-5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-white/5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Thông tin Lớp học phần
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Mã môn, tên lớp và giảng viên phụ trách
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Mã môn & Mã phân lớp riêng biệt */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        MÃ MÔN HỌC
                      </label>
                      <input
                        value={courseCode}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setCourseCode(val);
                          if (sectionCode) setClassCode(`${val} ${sectionCode}`.trim());
                        }}
                        placeholder="VD: CMU-CS 316 hoặc CS 252"
                        maxLength={30}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        MÃ PHÂN LỚP
                      </label>
                      <input
                        value={sectionCode}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setSectionCode(val);
                          if (courseCode) setClassCode(`${courseCode} ${val}`.trim());
                        }}
                        placeholder="VD: AIS hoặc DDIS"
                        maxLength={20}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Mã lớp học phần đầy đủ */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      MÃ LỚP HỌC PHẦN ĐẦY ĐỦ <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={classCode}
                      onChange={(e) => {
                        setClassCode(e.target.value.toUpperCase());
                        setErrorMessage('');
                      }}
                      placeholder="Ví dụ: CMU-CS 316 AIS hoặc CS 252 DDIS"
                      maxLength={50}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">
                      Mã định danh duy nhất trong CSDL (ghép bởi Mã môn + Mã phân lớp).
                    </p>
                  </div>

                  {/* Tên môn học / Tên lớp */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      TÊN MÔN HỌC / TÊN LỚP <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={className}
                      onChange={(e) => {
                        setClassName(e.target.value);
                        setErrorMessage('');
                      }}
                      placeholder="Ví dụ: Fundamentals of Computing 2"
                      maxLength={120}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>

                  {/* Học kỳ & Số tín chỉ */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        HỌC KỲ <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121622] dark:text-white"
                      >
                        {SEMESTERS.map((sem) => (
                          <option key={sem} value={sem}>{sem}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        SỐ TÍN CHỈ
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={credits}
                        onChange={(e) => setCredits(e.target.value ? Number(e.target.value) : '')}
                        placeholder="3"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Giảng viên phụ trách (Admin phân công) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        GIẢNG VIÊN PHỤ TRÁCH <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md dark:bg-blue-500/15 dark:text-blue-400">
                        Admin phân công
                      </span>
                    </div>
                    <select
                      value={selectedInstructorId ?? ''}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setSelectedInstructorId(id);
                        const inst = instructors.find((i) => i.id === id);
                        if (inst) setSelectedLecturerName(inst.name);
                      }}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121622] dark:text-white"
                    >
                      {instructors.length === 0 ? (
                        <option value="">
                          {isLoadingInstructors ? 'Đang tải danh sách...' : 'TS. Huỳnh Bá Diệu (Mặc định)'}
                        </option>
                      ) : (
                        instructors.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name} ({inst.email})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Mô tả / Ghi chú */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      MÔ TẢ / GHI CHÚ
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ghi chú thêm về lớp học hoặc lịch trình..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white resize-none"
                    />
                  </div>

                  {/* Trạng thái lớp */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      TRẠNG THÁI LỚP
                    </label>
                    <select
                      value={createStatus}
                      onChange={(e) => setCreateStatus(e.target.value as ClassStatus)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#121622] dark:text-white"
                    >
                      <option value="Hoạt động">🟢 Hoạt động (Mở lớp ngay)</option>
                      <option value="Chưa mở">🟡 Chưa mở (Sẽ mở sau)</option>
                      <option value="Đã kết thúc">⚪ Đã kết thúc</option>
                    </select>
                  </div>
                </div>

                {/* Hướng dẫn nhỏ */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-[11px] text-slate-500 space-y-1 dark:border-white/5 dark:bg-white/5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    <Info className="h-3.5 w-3.5 text-blue-500" />
                    <span>Lưu ý phân công</span>
                  </div>
                  <p>
                    Admin có toàn quyền gán bất kỳ Giảng viên nào trong hệ thống phụ trách lớp. Giảng viên được gán sẽ có quyền quản lý bài Lab, phòng thi và giám sát sinh viên của lớp này.
                  </p>
                </div>
              </div>

              {/* ── CỘT PHẢI (7/12): NẠP DANH SÁCH SINH VIÊN ── */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#0d1017] space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Danh sách sinh viên của lớp
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Nạp từ tệp Excel chuẩn Duy Tân hoặc nhập thủ công
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                    Sĩ số: <span className="text-blue-600 dark:text-blue-400 font-extrabold">{students.length}</span> SV
                  </span>
                </div>

                {/* Chuyển đổi phương thức: Nạp từ file / Nhập thủ công */}
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit dark:bg-white/5">
                  <button
                    type="button"
                    onClick={() => setStudentInputMode('file')}
                    className={`inline-flex items-center gap-1.5 h-8 rounded-lg px-3.5 text-xs font-bold transition cursor-pointer ${
                      studentInputMode === 'file'
                        ? 'bg-white text-blue-600 shadow-xs dark:bg-white/10 dark:text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Nạp từ tệp Excel / CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentInputMode('manual')}
                    className={`inline-flex items-center gap-1.5 h-8 rounded-lg px-3.5 text-xs font-bold transition cursor-pointer ${
                      studentInputMode === 'manual'
                        ? 'bg-white text-blue-600 shadow-xs dark:bg-white/10 dark:text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Nhập thủ công</span>
                  </button>
                </div>

                {/* ── CHẾ ĐỘ 1: NẠP TỪ TỆP EXCEL / CSV ── */}
                {studentInputMode === 'file' && (
                  <div className="space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {!uploadedFileInfo ? (
                      /* KHUNG KÉO THẢ TỆP */
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition-all cursor-pointer ${
                          isDragging
                            ? 'border-blue-600 bg-blue-50/70 scale-[0.99] dark:bg-blue-900/20'
                            : 'border-slate-200 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/20 dark:border-white/10 dark:bg-white/5'
                        }`}
                      >
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                            isDragging ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                          }`}
                        >
                          <UploadCloud className="h-6 w-6" />
                        </div>
                        <p className="mt-3 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          Kéo thả tệp danh sách sinh viên vào đây hoặc{' '}
                          <span className="text-blue-600 dark:text-blue-400 underline">chọn từ máy tính</span>
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400 max-w-md">
                          Hỗ trợ chuẩn tệp ĐH Duy Tân (.xlsx, .xls) và CSV. Hệ thống tự động nhận diện cột <strong>Họ và tên gộp ô</strong>, tự sinh <strong>email @dtu.edu.vn</strong> và bỏ qua các cột điểm thành phần.
                        </p>
                      </div>
                    ) : (
                      /* THẺ TỆP ĐÃ NẠP */
                      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 dark:border-blue-800/40 dark:bg-blue-950/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                              <FileSpreadsheet className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                {uploadedFileInfo.name}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {uploadedFileInfo.sizeFormatted} · Đã đọc thành công <strong className="text-emerald-600 dark:text-emerald-400">{students.length} sinh viên</strong>
                                {students.some((s) => s.hasAccount === false) && (
                                  <span className="ml-1 text-amber-600 dark:text-amber-400 font-semibold">
                                    ({students.filter((s) => s.hasAccount !== false).length} đã có tài khoản,{' '}
                                    {students.filter((s) => s.hasAccount === false).length} chưa có tài khoản)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={clearUploadedFile}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-red-600 shadow-xs cursor-pointer transition dark:hover:bg-white/10"
                            title="Gỡ tệp để chọn tệp khác"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Loading spinner khi đang bóc tách tệp */}
                    {isParsing && (
                      <div className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Đang đọc và phân tích cấu trúc tệp Excel...</span>
                      </div>
                    )}

                    {/* Cảnh báo sinh viên chưa có tài khoản trong hệ thống */}
                    {students.some((s) => s.hasAccount === false) && (
                      <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
                        <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>
                            Cảnh báo: Có {students.filter((s) => s.hasAccount === false).length} sinh viên chưa có tài khoản trong hệ thống
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300/90">
                          Sinh viên:{' '}
                          <strong className="font-semibold">
                            {students
                              .filter((s) => s.hasAccount === false)
                              .map((s) => `${s.name} (${s.id})`)
                              .join(', ')}
                          </strong>{' '}
                          chưa có tài khoản trong cơ sở dữ liệu.
                        </p>
                        <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                          ℹ️ Hệ thống sẽ tự động khởi tạo tài khoản đăng nhập (mật khẩu mặc định: <code className="font-mono font-bold">123456</code>) và ghi danh vào lớp khi bấm <strong>&quot;Tạo lớp học&quot;</strong>.
                        </p>
                      </div>
                    )}

                    {/* Cảnh báo cấu trúc tệp nếu có */}
                    {importWarnings.filter((w) => !w.startsWith('Cảnh báo: Có')).length > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 space-y-1 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-300">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Lưu ý khi đọc tệp:</span>
                        </div>
                        <ul className="list-disc pl-4 text-[11px] space-y-0.5">
                          {importWarnings
                            .filter((w) => !w.startsWith('Cảnh báo: Có'))
                            .map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {/* BẢNG XEM TRƯỚC DANH SÁCH SINH VIÊN */}
                    {students.length > 0 && (
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="text"
                              value={studentFilter}
                              onChange={(e) => setStudentFilter(e.target.value)}
                              placeholder="Tìm nhanh MSSV, Họ tên..."
                              className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                            />
                          </div>

                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            ✓ {students.length} sinh viên hợp lệ
                            {students.some((s) => s.hasAccount === false) && (
                              <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
                                ({students.filter((s) => s.hasAccount !== false).length} đã có tài khoản,{' '}
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  {students.filter((s) => s.hasAccount === false).length} chưa có tài khoản
                                </span>)
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#090a0f]">
                          <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-slate-400">
                              <tr>
                                <th className="px-3 py-2 text-center w-12">STT</th>
                                <th className="px-3 py-2 w-32">Mã SV</th>
                                <th className="px-3 py-2">Họ và tên</th>
                                <th className="px-3 py-2">Email</th>
                                <th className="px-3 py-2 w-36 text-center">Tài khoản</th>
                                <th className="px-3 py-2 text-center w-12">Xóa</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                              {filteredStudents.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                                    Không tìm thấy sinh viên phù hợp với từ khóa
                                  </td>
                                </tr>
                              ) : (
                                filteredStudents.map((st, i) => (
                                  <tr key={st.id || i} className="hover:bg-slate-50/60 dark:hover:bg-white/5">
                                    <td className="px-3 py-2 text-center font-medium text-slate-400">
                                      {i + 1}
                                    </td>
                                    <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">
                                      {st.id}
                                    </td>
                                    <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">
                                      {st.name}
                                    </td>
                                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                                      {st.email}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {st.hasAccount === false ? (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:border-amber-800/40 dark:text-amber-300" title="Sinh viên chưa có tài khoản, sẽ được tự động tạo khi bấm Tạo lớp học">
                                          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                                          Chưa có tài khoản
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/40 dark:text-emerald-400">
                                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                          Đã có tài khoản
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveStudent(st.id)}
                                        className="text-slate-300 hover:text-red-600 transition cursor-pointer"
                                        title="Xóa sinh viên này khỏi lớp"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Nút tải tệp mẫu chuẩn */}
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-white/5 dark:bg-white/5">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="text-[11px] text-slate-500">
                          Chưa có file? Tải tệp Excel mẫu để nhập thử.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={downloadStudentSampleTemplate}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs dark:border-white/10 dark:bg-white/10 dark:text-slate-200 cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                        <span>Tải tệp mẫu</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── CHẾ ĐỘ 2: NHẬP THỦ CÔNG & TÌM KIẾM SINH VIÊN ── */}
                {studentInputMode === 'manual' && (
                  <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 sm:p-5 dark:border-white/10 dark:bg-white/[0.02]">
                    {/* KHU VỰC 1: TÌM KIẾM & THÊM NHANH TỪ CSDL HỆ THỐNG */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            Tìm kiếm &amp; thêm sinh viên từ hệ thống
                          </h3>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {students.length} sinh viên đã chọn
                        </span>
                      </div>

                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={systemSearchKeyword}
                          onChange={(e) => {
                            setSystemSearchKeyword(e.target.value);
                            setErrorMessage('');
                          }}
                          placeholder="Nhập MSSV, Họ và tên hoặc Email để tìm kiếm sinh viên..."
                          className="h-10.5 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white font-medium"
                        />
                        {isSearchingSystem && (
                          <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-600" />
                        )}
                      </div>

                      {/* Danh sách kết quả tìm kiếm */}
                      {systemSearchKeyword.trim().length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0d1017] p-2 max-h-64 overflow-y-auto space-y-1.5 shadow-xs">
                          {isSearchingSystem ? (
                            <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              <span>Đang tìm kiếm sinh viên trong CSDL...</span>
                            </div>
                          ) : searchedSystemStudents.length > 0 ? (
                            searchedSystemStudents.map((st) => {
                              const mssv = st.student_id || st.username || String(st.user_id);
                              const isAdded = students.some((s) => s.id.toUpperCase() === mssv.toUpperCase());

                              return (
                                <div
                                  key={st.user_id || mssv}
                                  className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 transition hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                                >
                                  <div className="min-w-0 flex-1 pr-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                                        {st.full_name}
                                      </span>
                                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                                        {mssv}
                                      </span>
                                    </div>
                                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                      {st.email}
                                      {st.lop_sinh_hoat ? ` • ${st.lop_sinh_hoat}` : ''}
                                      {st.department ? ` • ${st.department}` : ''}
                                    </p>
                                  </div>

                                  {isAdded ? (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 shrink-0">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Đã thêm
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAddSystemStudent(st)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer shrink-0"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      Thêm nhanh
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-6 text-center text-xs text-slate-400">
                              Không tìm thấy sinh viên nào khớp với từ khóa &ldquo;{systemSearchKeyword}&rdquo;
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* KHU VỰC 2: NHẬP SINH VIÊN MỚI CHƯA CÓ TRONG HỆ THỐNG (FALLBACK) */}
                    <div className="border-t border-slate-200/80 dark:border-white/10 pt-3">
                      <button
                        type="button"
                        onClick={() => setIsManualNewStudentExpanded(!isManualNewStudentExpanded)}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-300 transition cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Sinh viên chưa có tài khoản? Nhập thủ công MSSV &amp; Họ tên</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {isManualNewStudentExpanded ? '(Thu gọn)' : '(Bấm để mở)'}
                        </span>
                      </button>

                      {isManualNewStudentExpanded && (
                        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-white/10 dark:bg-white/5">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  Mã sinh viên (MSSV) <span className="text-red-500">*</span>
                                </label>
                                {isLookingUpMssv && (
                                  <span className="text-[10px] text-blue-600 animate-pulse">Đang tra cứu...</span>
                                )}
                              </div>
                              <input
                                value={manualId}
                                onChange={(e) => {
                                  setManualId(e.target.value.toUpperCase());
                                  setErrorMessage('');
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddManualStudent();
                                  }
                                }}
                                placeholder="Ví dụ: 29211200333"
                                maxLength={20}
                                className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono font-bold uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                              />
                              {mssvFoundStudent && (
                                <p className="mt-1 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Đã có trong hệ thống: {mssvFoundStudent.name}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Họ và tên sinh viên {mssvFoundStudent ? <span className="text-emerald-600 text-[11px] font-normal">(tự động điền)</span> : <span className="text-slate-400 font-normal">(nếu sinh viên mới)</span>}
                              </label>
                              <input
                                value={manualName}
                                onChange={(e) => {
                                  setManualName(e.target.value);
                                  setErrorMessage('');
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddManualStudent();
                                  }
                                }}
                                placeholder="Tự động điền khi có MSSV"
                                maxLength={100}
                                className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white font-medium"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Email sinh viên <span className="text-slate-400 font-normal">(tự sinh theo MSSV)</span>
                              </label>
                              <input
                                value={manualEmail}
                                onChange={(e) => {
                                  setManualEmail(e.target.value);
                                  setErrorMessage('');
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddManualStudent();
                                  }
                                }}
                                type="email"
                                placeholder={manualId ? `${manualId.toLowerCase()}@dtu.edu.vn` : 'Tự sinh theo MSSV'}
                                maxLength={100}
                                className="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleAddManualStudent}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Thêm sinh viên này</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* KHU VỰC 3: DANH SÁCH SINH VIÊN ĐÃ THÊM VÀO LỚP */}
                    {students.length > 0 && (
                      <div className="space-y-2 border-t border-slate-200/80 dark:border-white/10 pt-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Danh sách sinh viên trong lớp ({students.length})
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            Nhấn biểu tượng thùng rác để gỡ
                          </span>
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-1.5">
                          {students.map((s, idx) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs dark:border-white/10 dark:bg-white/5"
                            >
                              <div className="flex items-center gap-2 truncate min-w-0">
                                <span className="font-bold text-slate-900 dark:text-white shrink-0">
                                  {idx + 1}. {s.id}
                                </span>
                                <span className="text-slate-400 shrink-0">•</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {s.name}
                                </span>
                                <span className="text-slate-400 shrink-0">•</span>
                                <span className="text-slate-500 dark:text-slate-400 truncate text-[11px]">
                                  {s.email}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveStudent(s.id)}
                                className="text-slate-400 hover:text-red-600 transition shrink-0 ml-2 cursor-pointer"
                                title="Xóa sinh viên khỏi danh sách"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* THANH ĐIỀU HƯỚNG CHÂN TRANG */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-white/10">
              <Link
                href="/admin/classes"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-xs dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
              >
                Hủy bỏ
              </Link>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreateClass}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-6 text-xs font-semibold text-white shadow-sm shadow-blue-500/25 transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang khởi tạo lớp...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Tạo lớp học</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
