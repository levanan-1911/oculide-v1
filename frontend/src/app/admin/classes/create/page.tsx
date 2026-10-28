'use client';

import { useRef, useState } from 'react';
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
  Download,
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
  ParsedStudentRow,
} from '../excelParser';

export default function CreateClassPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [createdStudents, setCreatedStudents] = useState<StudentRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [manualStudentId, setManualStudentId] = useState('');
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualStudentEmail, setManualStudentEmail] = useState('');
  const [createError, setCreateError] = useState('');

  async function handleFileUpload(file: File) {
    setCreateError('');
    setImportWarnings([]);
    setIsParsing(true);

    const sizeKB =
      file.size < 1024
        ? `${file.size} B`
        : `${(file.size / 1024).toFixed(1)} KB`;

    try {
      const result = await parseStudentFile(file);

      if (result.errorMessage) {
        setCreateError(result.errorMessage);
        setUploadedFileInfo(null);
        setCreatedStudents([]);
        return;
      }

      setImportWarnings(result.warnings);
      setUploadedFileInfo({
        name: file.name,
        sizeFormatted: sizeKB,
        totalRows: result.totalRows,
        validCount: result.parsedStudents.filter((s) => s.missingFields.length === 0).length,
        invalidCount: result.parsedStudents.filter((s) => s.missingFields.length > 0).length,
      });

      // Lưu danh sách sinh viên được phân tích
      setCreatedStudents(
        result.parsedStudents.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          status: 'Đang học',
          missingFields: s.missingFields,
        }))
      );
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : 'Không thể đọc nội dung tệp. Vui lòng kiểm tra lại định dạng tệp Excel (.xlsx, .xls) hoặc CSV.'
      );
      setUploadedFileInfo(null);
      setCreatedStudents([]);
    } finally {
      setIsParsing(false);
    }
  }

  function clearUploadedFile() {
    setUploadedFileInfo(null);
    setImportWarnings([]);
    setCreatedStudents([]);
    setCreateError('');
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

    router.push(`/admin/classes?created=${encodeURIComponent(id)}`);
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
                    href="/admin/classes"
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
                        {/* Input file ẩn */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv, .xlsx, .xls"
                          onChange={handleFileChange}
                          className="hidden"
                        />

                        {/* 1. KHUNG KÉO THẢ TỆP */}
                        {!uploadedFileInfo ? (
                          <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                              isDragging
                                ? 'border-blue-600 bg-blue-50/70 scale-[0.99]'
                                : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/20'
                            }`}
                          >
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                                isDragging ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                              }`}
                            >
                              <UploadCloud className="h-6 w-6" />
                            </div>
                            <p className="mt-3 text-sm font-bold text-slate-800">
                              Kéo thả tệp dữ liệu vào đây hoặc{' '}
                              <span className="text-blue-600 underline">chọn từ máy tính</span>
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Hỗ trợ định dạng .csv, .xlsx, .xls (Dung lượng tối đa: 10MB)
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-slate-500">
                              3 cột chuẩn: Mã sinh viên, Họ và tên, Email
                            </p>
                          </div>
                        ) : (
                          /* THẺ HIỂN THỊ TỆP ĐÃ ĐƯỢC CHỌN */
                          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                                  <FileSpreadsheet className="h-6 w-6" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-900">
                                    {uploadedFileInfo.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {uploadedFileInfo.sizeFormatted} · Đọc được {createdStudents.length} sinh viên
                                    {importWarnings.length > 0 ? ` (${importWarnings.length} cảnh báo thiếu thông tin)` : ''}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={clearUploadedFile}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-red-600 shadow-xs cursor-pointer transition"
                                title="Gỡ tệp để chọn tệp khác"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Loading khi đang phân tích tệp */}
                        {isParsing && (
                          <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-blue-600">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                            <span>Đang đọc và phân tích tệp Excel / CSV...</span>
                          </div>
                        )}

                        {/* Cảnh báo thiếu trường hoặc cột (Vẫn cho phép nạp) */}
                        {importWarnings.length > 0 && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900 space-y-1.5">
                            <div className="flex items-center gap-2 font-bold text-amber-800">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                              <span>
                                Phát hiện {importWarnings.length} cảnh báo thiếu trường / cột dữ liệu (Vẫn cho phép nạp vào lớp):
                              </span>
                            </div>
                            <ul className="max-h-28 overflow-y-auto list-disc pl-5 space-y-0.5 text-[11.5px] font-medium text-amber-800">
                              {importWarnings.map((warn, idx) => (
                                <li key={idx}>{warn}</li>
                              ))}
                            </ul>
                            <p className="text-[11px] text-amber-700 pt-0.5">
                              * Các trường bị thiếu đã được đánh dấu đỏ trong bảng bên dưới để bổ sung sau.
                            </p>
                          </div>
                        )}

                        {/* Bảng xem trước danh sách sinh viên nạp từ file */}
                        {createdStudents.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Danh sách sinh viên đọc từ tệp ({createdStudents.length} sinh viên)
                              </p>
                              {importWarnings.length > 0 ? (
                                <span className="text-[11px] font-semibold text-amber-600">
                                  ⚠ Có trường thiếu · Vẫn có thể nạp
                                </span>
                              ) : (
                                <span className="text-[11px] font-semibold text-emerald-600">
                                  ✓ Đủ 3 trường hợp lệ
                                </span>
                              )}
                            </div>

                            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                              <table className="w-full text-left text-xs">
                                <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                  <tr>
                                    <th className="px-3 py-2.5 w-12 text-center">STT</th>
                                    <th className="px-3 py-2.5 w-32">Mã sinh viên</th>
                                    <th className="px-3 py-2.5">Họ và tên</th>
                                    <th className="px-3 py-2.5">Email</th>
                                    <th className="px-3 py-2.5 w-36">Kiểm tra</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {createdStudents.map((st, i) => {
                                    const hasMissing = st.missingFields && st.missingFields.length > 0;
                                    const isMissingId = st.missingFields?.includes('Thiếu Mã SV') || !st.id;
                                    const isMissingName = st.missingFields?.includes('Thiếu Họ và tên') || !st.name;
                                    const isMissingEmail =
                                      st.missingFields?.includes('Thiếu Email') ||
                                      st.missingFields?.includes('Email sai định dạng') ||
                                      !st.email;

                                    return (
                                      <tr
                                        key={st.id || i}
                                        className={hasMissing ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-slate-50/60'}
                                      >
                                        <td className="px-3 py-2 text-center font-medium text-slate-400">
                                          {i + 1}
                                        </td>
                                        <td className="px-3 py-2 font-bold text-slate-900">
                                          {isMissingId ? (
                                            <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                                              Thiếu Mã SV
                                            </span>
                                          ) : (
                                            st.id
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-slate-700 font-medium">
                                          {isMissingName ? (
                                            <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                                              Thiếu Họ và tên
                                            </span>
                                          ) : (
                                            st.name
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-slate-500">
                                          {isMissingEmail ? (
                                            <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                                              {st.missingFields?.includes('Email sai định dạng')
                                                ? `Sai Email (${st.email})`
                                                : 'Thiếu Email'}
                                            </span>
                                          ) : (
                                            st.email
                                          )}
                                        </td>
                                        <td className="px-3 py-2">
                                          {hasMissing ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                              ⚠ {st.missingFields?.join(', ')}
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                              ✓ Đủ thông tin
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* TẢI TỆP MẪU CHUẨN (ĐỒNG BỘ MODULE NGƯỜI DÙNG) */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200/90 bg-white p-3.5">
                          <div className="flex items-center gap-3">
                            <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                Tệp mẫu chuẩn Oculide (CSV / Excel)
                              </p>
                              <p className="text-[11px] text-slate-400">
                                3 cột bắt buộc: Mã sinh viên, Họ và tên, Email
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={downloadStudentSampleTemplate}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5 text-slate-500" />
                              <span>Tải tệp mẫu</span>
                            </button>
                          </div>
                        </div>
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
                      href="/admin/classes"
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

