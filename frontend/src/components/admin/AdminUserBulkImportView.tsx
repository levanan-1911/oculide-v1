'use client';

import React, { useState, useRef } from 'react';
import { ArrowLeft, Download, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdminUserBulkImportViewProps {
  onBackToList: () => void;
  onImportSuccess?: (count: number) => void;
}

export default function AdminUserBulkImportView({
  onBackToList,
  onImportSuccess,
}: AdminUserBulkImportViewProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    total: number;
    valid: number;
    errors: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Xử lý chọn file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setAnalysisResult(null);
    }
  };

  // Kéo thả file
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setAnalysisResult(null);
    }
  };

  // Tải file mẫu CSV
  const handleDownloadSample = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'MÃ SỐ,HỌ VÀ TÊN,EMAIL TRƯỜNG,VAI TRÒ,ĐƠN VỊ / LỚP\n' +
      'GV0050,Nguyễn Văn An,an.nv@oclide.edu.vn,Giảng viên,Bộ môn Kỹ thuật phần mềm\n' +
      'SV184850,Lê Hoàng Nam,nam.lh@oclide.edu.vn,Sinh viên,Lớp SE1848\n' +
      'SV184851,Trần Thị Mai,mai.tt@oclide.edu.vn,Sinh viên,Lớp SE1848\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'mau_danh_sach_tai_khoan_oclide.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Giả lập Phân tích file
  const handleAnalyze = () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);

    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisResult({
        total: 45,
        valid: 43,
        errors: 2,
      });
      onImportSuccess?.(43);
    }, 1000);
  };

  return (
    <div className="mx-auto max-w-[1440px] font-sans text-slate-800">
      {/* ── HEADER: TIÊU ĐỀ + NÚT TẢI FILE MẪU + NÚT DANH SÁCH ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[26px]">
            Nhập tài khoản hàng loạt
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-[13.5px]">
            Nhập danh sách tài khoản từ mẫu Excel hoặc CSV.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleDownloadSample}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Tải file mẫu</span>
          </button>

          <button
            type="button"
            onClick={onBackToList}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Danh sách</span>
          </button>
        </div>
      </div>

      {/* ── KHỐI 1: CHỌN FILE TÀI KHOẢN ── */}
      <div className="mt-6 rounded-2xl border border-slate-200/75 bg-white p-6 sm:p-8 shadow-[0_2px_10px_rgba(15,23,42,0.02)]">
        <h3 className="text-base font-bold text-slate-900 sm:text-[17px]">
          Chọn file tài khoản
        </h3>

        {/* Khung thả file (Dropzone) */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-blue-200/80 bg-[#f8faff] py-12 px-6 text-center transition-colors hover:bg-blue-50/40"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100/70 text-[#2563eb]">
            <UploadCloud className="h-6 w-6" />
          </div>

          <p className="mt-4 text-sm font-bold text-slate-800">
            Kéo thả file .xlsx hoặc .csv vào đây
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Tối đa 10 MB • Dùng đúng cấu trúc file mẫu
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white px-5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
          >
            Chọn file
          </button>

          {selectedFile && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Đã chọn: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>
      </div>

      {/* ── KHỐI 2: QUY TẮC KIỂM TRA DỮ LIỆU ── */}
      <div className="mt-6 rounded-2xl border border-slate-200/75 bg-white p-6 sm:p-8 shadow-[0_2px_10px_rgba(15,23,42,0.02)]">
        <h3 className="text-base font-bold text-slate-900 sm:text-[17px]">
          Quy tắc kiểm tra dữ liệu
        </h3>

        <div className="mt-4 space-y-3 text-xs sm:text-[13.5px] text-slate-600">
          <div className="flex items-start gap-2.5">
            <span className="font-bold text-slate-700">✓</span>
            <p>Email phải thuộc tên miền trường và chưa tồn tại.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="font-bold text-slate-700">✓</span>
            <p>Vai trò chỉ nhận: Quản trị viên, Giảng viên/Giám thị, Sinh viên.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="font-bold text-slate-700">✓</span>
            <p>Mã cán bộ hoặc MSSV phải duy nhất.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="font-bold text-slate-700">✓</span>
            <p>Dòng lỗi không được tạo; các dòng hợp lệ vẫn có thể tiếp tục.</p>
          </div>
        </div>
      </div>

      {/* Kết quả phân tích (nếu đã phân tích xong) */}
      {analysisResult && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-sm font-bold text-slate-900">Kết quả phân tích sơ bộ:</h4>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500">Tổng số dòng</p>
              <p className="text-xl font-bold text-slate-900">{analysisResult.total}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <p className="text-xs text-emerald-600">Hợp lệ (Sẵn sàng tạo)</p>
              <p className="text-xl font-bold text-emerald-700">{analysisResult.valid}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <p className="text-xs text-red-600">Bị lỗi (Trùng email/mã)</p>
              <p className="text-xl font-bold text-red-700">{analysisResult.errors}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── CẶP NÚT DƯỚI CÙNG (HỦY & PHÂN TÍCH FILE) ── */}
      <div className="mt-8 flex items-center justify-end gap-5">
        <button
          type="button"
          onClick={onBackToList}
          className="inline-flex h-10 min-w-[120px] items-center justify-center rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
        >
          Hủy
        </button>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!selectedFile || isAnalyzing}
          className="inline-flex h-10 min-w-[140px] items-center justify-center rounded-xl bg-slate-900 px-6 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isAnalyzing ? 'Đang phân tích...' : 'Phân tích file'}
        </button>
      </div>
    </div>
  );
}

