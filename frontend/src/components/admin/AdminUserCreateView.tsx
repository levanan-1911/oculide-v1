'use client';

import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, CheckCircle2 } from 'lucide-react';

interface AdminUserCreateViewProps {
  onBackToList: () => void;
  onUserCreated?: (newUser: {
    fullName: string;
    email: string;
    userCode: string;
    role: 'instructor' | 'student';
    departmentOrClass: string;
    status: 'active' | 'locked';
  }) => void;
}

export default function AdminUserCreateView({
  onBackToList,
  onUserCreated,
}: AdminUserCreateViewProps) {
  // Trạng thái các trường trong Form
  const [fullName, setFullName] = useState('Nguyễn Văn An');
  const [email, setEmail] = useState('an.nv@oclide.edu.vn');
  const [userCode, setUserCode] = useState('GV0031');
  const [role, setRole] = useState<'instructor' | 'student'>('instructor');
  const [departmentOrClass, setDepartmentOrClass] = useState('Bộ môn Công nghệ phần mềm');
  const [status, setStatus] = useState<'active' | 'locked'>('active');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessToast(true);

      onUserCreated?.({
        fullName,
        email,
        userCode,
        role,
        departmentOrClass,
        status,
      });

      // Tự động quay lại danh sách sau 1.2s
      setTimeout(() => {
        onBackToList();
      }, 1200);
    }, 600);
  };

  return (
    <div className="mx-auto max-w-[1440px] font-sans text-slate-800">
      {/* ── HEADER: TIÊU ĐỀ + NÚT DANH SÁCH + NÚT EXCEL/CSV ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[26px]">
            Tạo tài khoản
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-[13.5px]">
            Chọn tạo nhanh một tài khoản hoặc nhập hàng loạt bằng Excel/CSV.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToList}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Danh sách</span>
        </button>
      </div>

      {/* Thông báo tạo thành công */}
      {successToast && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Tài khoản {userCode} đã được khởi tạo thành công! Mật khẩu tạm đã được gửi. Đang quay lại danh sách...</span>
        </div>
      )}

      {/* ── KHỐI CHÍNH: FORM TẠO NHANH + NÚT NHẬP HÀNG LOẠT BÊN PHẢI ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Cột trái (9/12): Khối Tạo nhanh */}
        <div className="rounded-2xl border border-slate-200/75 bg-white p-6 sm:p-8 shadow-[0_2px_10px_rgba(15,23,42,0.02)] lg:col-span-9">
          <h3 className="text-base font-bold text-slate-900 sm:text-[17px]">
            Tạo nhanh
          </h3>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Trường 1: HỌ VÀ TÊN * */}
              <div className="space-y-1.5">
                <label
                  htmlFor="create-fullname"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                >
                  HỌ VÀ TÊN <span className="text-red-500">*</span>
                </label>
                <input
                  id="create-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn An"
                  className="h-11 w-full rounded-xl border border-slate-200/90 bg-white px-4 text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-colors focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Trường 2: EMAIL TRƯỜNG * */}
              <div className="space-y-1.5">
                <label
                  htmlFor="create-email"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                >
                  EMAIL TRƯỜNG <span className="text-red-500">*</span>
                </label>
                <input
                  id="create-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="an.nv@oclide.edu.vn"
                  className="h-11 w-full rounded-xl border border-slate-200/90 bg-white px-4 text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-colors focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Trường 3: MÃ CÁN BỘ / MSSV * */}
              <div className="space-y-1.5">
                <label
                  htmlFor="create-usercode"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                >
                  MÃ CÁN BỘ / MSSV <span className="text-red-500">*</span>
                </label>
                <input
                  id="create-usercode"
                  type="text"
                  required
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  placeholder="GV0031"
                  className="h-11 w-full rounded-xl border border-slate-200/90 bg-white px-4 text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-colors focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Trường 4: VAI TRÒ * */}
              <div className="space-y-1.5">
                <label
                  htmlFor="create-role"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                >
                  VAI TRÒ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="create-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'instructor' | 'student')}
                    className="h-11 w-full appearance-none rounded-xl border border-slate-200/90 bg-white px-4 pr-9 text-xs sm:text-sm font-medium text-slate-800 shadow-sm transition-colors focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="instructor">Giảng viên</option>
                    <option value="student">Sinh viên</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {/* Trường 5: ĐƠN VỊ / LỚP */}
              <div className="space-y-1.5">
                <label
                  htmlFor="create-unit"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                >
                  ĐƠN VỊ / LỚP
                </label>
                <input
                  id="create-unit"
                  type="text"
                  value={departmentOrClass}
                  onChange={(e) => setDepartmentOrClass(e.target.value)}
                  placeholder="Bộ môn Công nghệ phần mềm"
                  className="h-11 w-full rounded-xl border border-slate-200/90 bg-white px-4 text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-colors focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Trường 6: TRẠNG THÁI */}
              <div className="space-y-1.5">
                <label
                  htmlFor="create-status"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                >
                  TRẠNG THÁI
                </label>
                <div className="relative">
                  <select
                    id="create-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'locked')}
                    className="h-11 w-full appearance-none rounded-xl border border-slate-200/90 bg-white px-4 pr-9 text-xs sm:text-sm font-medium text-slate-800 shadow-sm transition-colors focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="locked">Bị khóa</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
            </div>

            {/* Khối thông báo xanh nhạt (Mật khẩu tạm) */}
            <div className="rounded-2xl border border-blue-100/90 bg-[#eff6ff]/70 p-5 text-left">
              <p className="text-xs font-bold text-[#1d4ed8] sm:text-[13.5px]">
                Mật khẩu tạm sẽ được gửi đến email trường.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Người dùng phải đổi mật khẩu sau lần đăng nhập đầu tiên.
              </p>
            </div>

            {/* Cặp nút hành động bên dưới (Hủy & Tạo tài khoản) */}
            <div className="flex items-center justify-center gap-6 pt-4">
              <button
                type="button"
                onClick={onBackToList}
                className="inline-flex h-10 min-w-[120px] items-center justify-center rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 min-w-[140px] items-center justify-center rounded-xl bg-slate-900 px-6 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-600 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
            </div>
          </form>
        </div>

        {/* Cột phải (3/12): Nút Nhập hàng loạt Excel / CSV */}
        <div className="lg:col-span-3">
          <button
            type="button"
            className="w-full rounded-xl border border-blue-500 bg-white px-5 py-3 text-xs sm:text-sm font-semibold text-blue-600 shadow-sm transition-colors hover:bg-blue-50/60 cursor-pointer text-center"
          >
            Nhập hàng loạt Excel / CSV
          </button>
        </div>
      </div>
    </div>
  );
}

