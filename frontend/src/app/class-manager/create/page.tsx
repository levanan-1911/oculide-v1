'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  UploadCloud,
  Trash2,
  X,
  Plus,
  KeyRound,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import {
  ClassRow,
  ClassStatus,
  StudentRow,
  UploadedFileInfo,
  FileRowError,
  getStoredClasses,
  saveStoredClasses,
} from '../types';

export default function CreateClassPage() {
  const router = useRouter();

  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [createClassId, setCreateClassId] = useState('');
  const [createClassName, setCreateClassName] = useState('');
  const [createSemester, setCreateSemester] = useState('HK1 2026–2027');
  const [createStartDate, setCreateStartDate] = useState('05/09/2026');
  const [createEndDate, setCreateEndDate] = useState('15/01/2027');
  const [createRoomCode, setCreateRoomCode] = useState('');
  const [createRoomPassword, setCreateRoomPassword] = useState('123456');
  const [createStatus, setCreateStatus] = useState<ClassStatus>('Hoạt động');
  const [createLecturer, setCreateLecturer] = useState('Long Phạm');

  const [studentInputMode, setStudentInputMode] = useState<'file' | 'manual'>('file');
  const [uploadedFileInfo, setUploadedFileInfo] = useState<UploadedFileInfo | null>(null);
  const [fileValidationErrors, setFileValidationErrors] = useState<FileRowError[]>([]);
  const [createdStudents, setCreatedStudents] = useState<StudentRow[]>([]);

  const [manualStudentId, setManualStudentId] = useState('');
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualStudentEmail, setManualStudentEmail] = useState('');
  const [createError, setCreateError] = useState('');

  function downloadSampleTemplate() {
    const sampleCsv = `Mã SV,Họ và tên,Email\nSE184801,Nguyễn Văn An,an.nv@school.edu.vn\nSE184802,Trần Thu Bình,binh.tt@school.edu.vn\nSE184803,Lê Hải Nam,nam.lh@school.edu.vn\nSE184804,Phạm Minh Châu,chau.pm@school.edu.vn`;
    const blob = new Blob(['\uFEFF' + sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Mau_Danh_Sach_Sinh_Vien.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleFileUpload(file: File) {
    setCreateError('');
    const sizeKB =
      file.size < 1024
        ? `${file.size} B`
        : `${(file.size / 1024).toFixed(1)} KB`;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '');
      const rawLines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

      const parsed: StudentRow[] = [];
      const errors: FileRowError[] = [];

      const startIndex = rawLines[0]?.toLowerCase().includes('mã') ? 1 : 0;

      for (let i = startIndex; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        const rowNum = i + 1;
        const delimiter = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ',';
        const parts = line.split(delimiter).map((p) => p.trim());
        const id = parts[0] || '';
        const name = parts[1] || '';
        const email = parts[2] || '';

        if (!id && !name && !email) {
          errors.push({
            rowNumber: rowNum,
            rawData: line,
            errorMessage: 'Dòng trống hoặc không đúng định dạng',
          });
        } else if (!id) {
          errors.push({
            rowNumber: rowNum,
            rawData: line,
            errorMessage: `Thiếu "Mã sinh viên" (Họ tên: ${name || 'Chưa rõ'})`,
          });
        } else if (!name) {
          errors.push({
            rowNumber: rowNum,
            rawData: line,
            errorMessage: `Thiếu "Họ và tên" (Mã SV: ${id})`,
          });
        } else if (!email) {
          errors.push({
            rowNumber: rowNum,
            rawData: line,
            errorMessage: `Thiếu "Email" (Mã SV: ${id} - Họ tên: ${name})`,
          });
        } else if (!email.includes('@') || !email.includes('.')) {
          errors.push({
            rowNumber: rowNum,
            rawData: line,
            errorMessage: `Email không hợp lệ: "${email}" (Mã SV: ${id})`,
          });
        } else {
          parsed.push({
            id: id.toUpperCase(),
            name,
            email: email.toLowerCase(),
            status: 'Đang học',
          });
        }
      }

      setUploadedFileInfo({
        name: file.name,
        sizeFormatted: sizeKB,
        totalRows: rawLines.length - startIndex,
        validCount: parsed.length,
        invalidCount: errors.length,
      });
      setFileValidationErrors(errors);
      setCreatedStudents(parsed);
    };
    reader.readAsText(file);
  }

  function clearUploadedFile() {
    setUploadedFileInfo(null);
    setFileValidationErrors([]);
    setCreatedStudents([]);
  }

  function handleAddManualStudent() {
    const id = manualStudentId.trim().toUpperCase();
    const name = manualStudentName.trim();
    const email = manualStudentEmail.trim().toLowerCase();

    if (!id || !name || !email) {
      setCreateError('Vui lòng nhập đầy đủ Mã sinh viên, Họ và tên và Email.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setCreateError('Định dạng email không hợp lệ (ví dụ: an.nv@school.edu.vn).');
      return;
    }
    if (createdStudents.some((s) => s.id === id)) {
      setCreateError(`Mã sinh viên "${id}" đã có trong danh sách.`);
      return;
    }

    setCreatedStudents((current) => [
      ...current,
      {
        id,
        name,
        email,
        status: 'Đang học',
      },
    ]);
    setManualStudentId('');
    setManualStudentName('');
    setManualStudentEmail('');
    setCreateError('');
  }

  function handleProceedToConfirmation() {
    const id = createClassId.trim().toUpperCase();
    const name = createClassName.trim();

    if (!id) {
      setCreateError('Vui lòng nhập Mã lớp.');
      return;
    }
    if (!name) {
      setCreateError('Vui lòng nhập Tên lớp.');
      return;
    }

    const existingClasses = getStoredClasses();
    if (existingClasses.some((c) => c.id.toLowerCase() === id.toLowerCase())) {
      setCreateError(`Mã lớp "${id}" đã tồn tại trong hệ thống. Vui lòng chọn mã khác.`);
      return;
    }

    if (createdStudents.length === 0) {
      setCreateError('Vui lòng nhập hoặc nạp danh sách sinh viên có đầy đủ Mã SV, Họ tên và Email.');
      return;
    }

    setCreateError('');
    setCreateStep(2);
  }

  function handleFinishCreate() {
    const id = createClassId.trim().toUpperCase();
    const name = createClassName.trim();
    const semesterVal = createSemester.trim();
    const lecturerVal = createLecturer.trim() || 'Long Phạm';

    const finalRoomCode = createRoomCode.trim().toUpperCase() || `${id}-ROOM`;
    const finalRoomPassword = createRoomPassword.trim() || '123456';

    const newClass: ClassRow = {
      id,
      name,
      semester: semesterVal,
      startDate: createStartDate.trim() || '05/09/2026',
      endDate: createEndDate.trim() || '15/01/2027',
      roomCode: finalRoomCode,
      roomPassword: finalRoomPassword,
      status: createStatus,
      studentCount: createdStudents.length,
      students: createdStudents,
      lecturer: lecturerVal,
      labs: [],
      exams: [],
    };

    const currentClasses = getStoredClasses();
    saveStoredClasses([...currentClasses, newClass]);

    router.push(`/class-manager?created=${encodeURIComponent(id)}`);
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f4f7f9] text-slate-800">
      <AdminSidebar activeModule="classes" />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar title="Tạo lớp học mới" />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1440px]">
            {createStep === 1 ? (
              /* ── BƯỚC 1: NHẬP THÔNG TIN LỚP & CHỌN NGUỒN DANH SÁCH SINH VIÊN ── */
              <div>
                {/* Header: Nút mũi tên quay lại + Tiêu đề + Phụ đề */}
                <div className="flex items-center gap-3.5">
                  <Link
                    href="/class-manager"
                    title="Về danh sách lớp"
                    aria-label="Về danh sách lớp"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition hover:bg-blue-100 cursor-pointer"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                      Tạo lớp • Thông tin
                    </h1>
                    <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                      Bước 1/3 • Tạo lớp và chọn cách bổ sung danh sách sinh viên.
                    </p>
                  </div>
                </div>

                {/* Khung Form chính màu trắng */}
                <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
                  {/* Hàng 2x2: Mã lớp, Tên lớp, Học kỳ, Giảng viên phụ trách */}
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        MÃ LỚP <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={createClassId}
                        onChange={(e) => {
                          setCreateClassId(e.target.value.toUpperCase());
                          setCreateError('');
                        }}
                        placeholder="Ví dụ: SE1848"
                        maxLength={20}
                        className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        TÊN LỚP <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={createClassName}
                        onChange={(e) => {
                          setCreateClassName(e.target.value);
                          setCreateError('');
                        }}
                        placeholder="Ví dụ: Lập trình Web"
                        maxLength={100}
                        className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        HỌC KỲ <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={createSemester}
                        onChange={(e) => setCreateSemester(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="HK1 2026–2027">HK1 2026–2027</option>
                        <option value="HK2 2026–2027">HK2 2026–2027</option>
                        <option value="HKT 2026-27">HKT 2026-27</option>
                        <option value="HKT 2025-26">HKT 2025-26</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        GIẢNG VIÊN PHỤ TRÁCH
                      </label>
                      <input
                        value={createLecturer}
                        onChange={(e) => setCreateLecturer(e.target.value)}
                        placeholder="Ví dụ: Long Phạm"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  {/* Hàng 2: Thời gian bắt đầu, kết thúc & Mở lớp */}
                  <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        THỜI GIAN BẮT ĐẦU <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={createStartDate}
                        onChange={(e) => setCreateStartDate(e.target.value)}
                        placeholder="Ví dụ: 05/09/2026"
                        className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        THỜI GIAN KẾT THÚC <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={createEndDate}
                        onChange={(e) => setCreateEndDate(e.target.value)}
                        placeholder="Ví dụ: 15/01/2027"
                        className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        TRẠNG THÁI LỚP (GIẢNG VIÊN MỞ LỚP)
                      </label>
                      <select
                        value={createStatus}
                        onChange={(e) => setCreateStatus(e.target.value as ClassStatus)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="Hoạt động">🟢 Hoạt động (Giảng viên mở lớp ngay)</option>
                        <option value="Chưa mở">🟡 Chưa mở (Giảng viên sẽ mở lớp sau)</option>
                        <option value="Đã kết thúc">⚪ Đã kết thúc</option>
                      </select>
                    </div>
                  </div>

                  {/* Section con: Bước 2 • Danh sách sinh viên của lớp */}
                  <div className="mt-8 rounded-2xl border border-slate-200/80 bg-[#f8fafc]/70 p-5 sm:p-7">
                    <h3 className="text-base font-extrabold text-slate-900">
                      Bước 2 • Danh sách sinh viên của lớp
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Nhập danh sách sinh viên từ Excel/CSV hoặc tạo nhanh từng sinh viên.
                    </p>

                    {/* 2 Tab: Nhập từ file / Tạo nhanh */}
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setStudentInputMode('file')}
                        className={`h-10 rounded-xl px-5 text-xs font-semibold transition cursor-pointer ${
                          studentInputMode === 'file'
                            ? 'bg-[#2563eb] text-white shadow-sm shadow-blue-500/20'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Nhập từ file
                      </button>

                      <button
                        type="button"
                        onClick={() => setStudentInputMode('manual')}
                        className={`h-10 rounded-xl px-5 text-xs font-semibold transition cursor-pointer ${
                          studentInputMode === 'manual'
                            ? 'bg-[#2563eb] text-white shadow-sm shadow-blue-500/20'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Tạo nhanh
                      </button>
                    </div>

                    {/* Khung tải file khi chọn Nhập từ file */}
                    {studentInputMode === 'file' && (
                      <div className="mt-5 space-y-4">
                        {/* 1. KHUNG KÉO THẢ TỆP LUÔN HIỂN THỊ Ở TRÊN */}
                        <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-white p-6 transition hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer">
                          <UploadCloud className="mb-2 h-8 w-8 text-blue-500" />
                          <p className="text-xs font-bold text-slate-800 text-center">
                            Kéo thả file .xlsx / .csv vào đây hoặc bấm để duyệt
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400 text-center">
                            Hỗ trợ định dạng CSV hoặc Excel gồm các cột: Mã SV, Họ và tên, Email
                          </p>
                          <input
                            type="file"
                            accept=".csv,.xlsx,.xls,.txt"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file);
                            }}
                            className="hidden"
                          />
                        </label>

                        {/* Thanh công cụ: Link tải file mẫu */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">
                            {uploadedFileInfo
                              ? `Đang chọn file: ${uploadedFileInfo.name}`
                              : 'Chưa chọn file. Vui lòng tải lên file danh sách sinh viên (.csv, .xlsx).'}
                          </span>
                          <button
                            type="button"
                            onClick={downloadSampleTemplate}
                            className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:underline cursor-pointer"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Tải file mẫu Excel (.csv)
                          </button>
                        </div>

                        {/* 2. THÔNG TIN FILE HIỂN THỊ Ở DƯỚI KHUNG TẢI LÊN */}
                        {uploadedFileInfo && (
                          <div className="space-y-3.5 pt-2 border-t border-slate-200/60">
                            {/* Card thông tin tệp */}
                            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3.5">
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/30">
                                    <FileSpreadsheet className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-900">
                                      {uploadedFileInfo.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Dung lượng:{' '}
                                      <span className="font-semibold text-slate-700">
                                        {uploadedFileInfo.sizeFormatted}
                                      </span>{' '}
                                      • Đã phân tích:{' '}
                                      <span className="font-semibold text-slate-700">
                                        {uploadedFileInfo.totalRows} dòng
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={clearUploadedFile}
                                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-red-600 cursor-pointer self-start sm:self-auto"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Hủy / Xóa file
                                </button>
                              </div>

                              <div className="mt-3.5 flex flex-wrap items-center gap-4 border-t border-blue-100 pt-3 text-xs">
                                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  <strong>{uploadedFileInfo.validCount}</strong> sinh viên hợp lệ
                                </span>
                                {uploadedFileInfo.invalidCount > 0 && (
                                  <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    <strong>{uploadedFileInfo.invalidCount}</strong> dòng bị lỗi / thiếu trường
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Cảnh báo lỗi nếu có dòng thiếu trường */}
                            {fileValidationErrors.length > 0 && (
                              <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-sm">
                                <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
                                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                                  Phát hiện {fileValidationErrors.length} dòng dữ liệu chưa hợp lệ hoặc thiếu trường bắt buộc:
                                </div>
                                <ul className="mt-2.5 max-h-36 overflow-y-auto space-y-1.5 pl-6 list-disc text-amber-800/90 font-medium">
                                  {fileValidationErrors.map((err) => (
                                    <li key={err.rowNumber}>
                                      <strong>Dòng {err.rowNumber}:</strong> {err.errorMessage}
                                    </li>
                                  ))}
                                </ul>
                                <p className="mt-3 border-t border-amber-200/70 pt-2 text-[11px] italic text-amber-700">
                                  {uploadedFileInfo?.validCount ? (
                                    <>
                                      Hệ thống đã tự động lọc giữ lại <strong>{uploadedFileInfo.validCount}</strong> sinh viên hợp lệ. Bạn có thể tiếp tục với danh sách này hoặc tải lại file chuẩn.
                                    </>
                                  ) : (
                                    <>
                                      Không tìm thấy sinh viên hợp lệ nào trong file. Vui lòng kiểm tra lại cấu trúc file hoặc tải file mẫu bên dưới.
                                    </>
                                  )}
                                </p>
                              </div>
                            )}

                            {/* Bảng xem trước danh sách sinh viên nạp từ file */}
                            {createdStudents.length > 0 && (
                              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-xs font-bold text-slate-800 mb-2.5">
                                  Danh sách sinh viên đọc từ file ({createdStudents.length} sinh viên):
                                </p>
                                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100 text-xs">
                                  {createdStudents.map((st, i) => (
                                    <div key={st.id} className="flex items-center justify-between px-3.5 py-2">
                                      <span className="font-medium text-slate-400 w-8">{i + 1}</span>
                                      <span className="font-bold text-slate-900 w-28">{st.id}</span>
                                      <span className="font-semibold text-slate-800 flex-1 truncate">{st.name}</span>
                                      <span className="text-slate-500 flex-1 truncate">{st.email}</span>
                                      <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">
                                        Hợp lệ
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Khung nhập nhanh sinh viên */}
                    {studentInputMode === 'manual' && (
                      <div className="mt-5 space-y-3">
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[140px_1fr_1fr_auto]">
                          <input
                            value={manualStudentId}
                            onChange={(e) => {
                              setManualStudentId(e.target.value.toUpperCase());
                              setCreateError('');
                            }}
                            placeholder="Mã SV *"
                            maxLength={20}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                          <input
                            value={manualStudentName}
                            onChange={(e) => {
                              setManualStudentName(e.target.value);
                              setCreateError('');
                            }}
                            placeholder="Họ và tên *"
                            maxLength={100}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                          <input
                            value={manualStudentEmail}
                            onChange={(e) => {
                              setManualStudentEmail(e.target.value);
                              setCreateError('');
                            }}
                            type="email"
                            placeholder="Email sinh viên *"
                            maxLength={100}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                          <button
                            type="button"
                            onClick={handleAddManualStudent}
                            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Thêm
                          </button>
                        </div>

                        {createdStudents.length > 0 && (
                          <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                            {createdStudents.map((s, idx) => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="font-bold text-slate-900">{idx + 1}. {s.id}</span>
                                  <span className="text-slate-400">•</span>
                                  <span className="font-semibold text-slate-800">{s.name}</span>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-500 truncate">{s.email}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCreatedStudents((curr) => curr.filter((item) => item.id !== s.id))
                                  }
                                  className="text-slate-400 hover:text-red-600 transition shrink-0 ml-2 cursor-pointer"
                                  title="Xóa sinh viên khỏi danh sách"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Dòng chú thích */}
                    <p className="mt-4 text-xs text-slate-400">
                      Chưa lưu lớp. Xác nhận danh sách trước khi hoàn tất.
                    </p>
                  </div>

                  {createError && (
                    <p role="alert" className="mt-4 text-sm font-semibold text-red-600">
                      {createError}
                    </p>
                  )}

                  {/* Hàng nút bấm Hủy & Tiếp tục với danh sách */}
                  <div className="mt-8 flex items-center justify-end gap-3 pt-2">
                    <Link
                      href="/class-manager"
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                    >
                      Hủy
                    </Link>

                    <button
                      type="button"
                      onClick={handleProceedToConfirmation}
                      className="h-11 rounded-xl bg-[#2563eb] px-6 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 cursor-pointer"
                    >
                      Tiếp tục với danh sách
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── BƯỚC 2: XÁC NHẬN THÔNG TIN VÀ LƯU LỚP ── */
              <div>
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => setCreateStep(1)}
                    title="Quay lại sửa thông tin"
                    aria-label="Quay lại sửa thông tin"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition hover:bg-blue-100 cursor-pointer"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                      Tạo lớp • Xác nhận & Hoàn tất
                    </h1>
                    <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                      Bước 2/2 • Kiểm tra lại thông tin lớp học và danh sách sinh viên trước khi lưu.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
                  {/* Tóm tắt thông tin lớp */}
                  <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-[#f8fafc] p-4 text-xs sm:grid-cols-4">
                    <div>
                      <span className="text-slate-400 font-medium">Mã lớp:</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{createClassId}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Tên lớp:</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{createClassName}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Học kỳ:</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{createSemester}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Giảng viên:</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{createLecturer}</p>
                    </div>
                  </div>

                  <h3 className="mt-6 mb-3 text-base font-bold text-slate-900">
                    Danh sách sinh viên ({createdStudents.length} sinh viên)
                  </h3>

                  <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200/80 divide-y divide-slate-100">
                    {createdStudents.map((st, i) => (
                      <div key={st.id} className="flex items-center justify-between px-4 py-3 text-xs">
                        <span className="font-medium text-slate-500 w-8">{i + 1}</span>
                        <span className="font-bold text-slate-900 w-28">{st.id}</span>
                        <span className="font-semibold text-slate-800 flex-1">{st.name}</span>
                        <span className="text-slate-500 flex-1">{st.email}</span>
                        <span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 font-semibold text-[10px]">
                          Đang học
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCreateStep(1)}
                      className="h-11 rounded-xl border border-slate-200 px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                    >
                      Quay lại sửa thông tin
                    </button>

                    <button
                      type="button"
                      onClick={handleFinishCreate}
                      className="inline-flex items-center gap-2 h-11 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 transition hover:bg-emerald-700 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Xác nhận & Lưu lớp
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

