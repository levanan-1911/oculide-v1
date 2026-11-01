import React from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';

export default function InstitutionalFooter() {
  return (
    <footer id="footer" className="w-full border-t border-slate-200/80 bg-slate-100/70 pt-14 pb-10 dark:border-white/10 dark:bg-[#06070a] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Cột 1: Thông tin thương hiệu & bản quyền đề tài */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <Eye className="h-4 w-4" />
              </div>
              <span className="font-extrabold tracking-tight text-slate-900 dark:text-white">OCULIDE</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 max-w-sm">
              Hệ thống Quản lý Phòng Thực hành Lập trình và Giám sát Thi Trực tuyến ứng dụng Trí tuệ Nhân tạo. Đề tài Nghiên cứu Khoa học &amp; Ứng dụng Công nghệ 2026.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              © 2026 Oculide System. Chuẩn đặc tả IEEE 830-1998.
            </p>
          </div>

          {/* Cột 2: Cổng Truy Cập */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3.5">Cổng Truy Cập</h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li><Link href="/student/join" className="hover:text-blue-600 dark:hover:text-white transition-colors">Sinh viên vào phòng thi</Link></li>
              <li><Link href="/login" className="hover:text-blue-600 dark:hover:text-white transition-colors">Giảng viên đăng nhập</Link></li>
              <li><Link href="/login" className="hover:text-blue-600 dark:hover:text-white transition-colors">Quản trị viên đào tạo</Link></li>
            </ul>
          </div>

          {/* Cột 3: Nền Tảng Công Nghệ */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3.5">Nền Tảng Công Nghệ</h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li><span>LiveKit WebRTC SFU</span></li>
              <li><span>Docker Sandbox cách ly</span></li>
              <li><span>MediaPipe &amp; YOLOv8</span></li>
              <li><span>Next.js 14 &amp; Tailwind</span></li>
            </ul>
          </div>

          {/* Cột 4: Học Thuật & Liên Hệ */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3.5">Học Thuật &amp; Liên Hệ</h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li><span>Khoa Công nghệ Thông tin</span></li>
              <li><span>Quy định phòng thi trực tuyến</span></li>
              <li><span>Chính sách bảo mật hình ảnh</span></li>
              <li><span>Hỗ trợ kỹ thuật phòng máy</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:border-white/5 dark:text-slate-500">
          <div>Phát triển phục vụ công tác giảng dạy &amp; khảo thí đại học.</div>
          <div className="flex items-center gap-4">
            <span className="hover:underline cursor-pointer">Điều khoản</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Bảo mật</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Hỗ trợ</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

