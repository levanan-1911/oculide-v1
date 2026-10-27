'use client';

import React, { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminSidebar, { ADMIN_NAV_GROUPS } from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import QuestionsManagerView from '@/components/admin/QuestionsManagerView';
import {
  Table2,
  Clock,
  Flag,
  ChevronDown,
} from 'lucide-react';

// Hàm toán học dựng hình quạt (Donut sector) SVG chuẩn xác theo góc độ
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function createDonutSegmentPath(
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(x, y, outerRadius, endAngle);
  const endOuter = polarToCartesian(x, y, outerRadius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, endAngle);
  const endInner = polarToCartesian(x, y, innerRadius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M',
    startOuter.x,
    startOuter.y,
    'A',
    outerRadius,
    outerRadius,
    0,
    largeArcFlag,
    0,
    endOuter.x,
    endOuter.y,
    'L',
    endInner.x,
    endInner.y,
    'A',
    innerRadius,
    innerRadius,
    0,
    largeArcFlag,
    1,
    startInner.x,
    startInner.y,
    'Z',
  ].join(' ');
}

// Dữ liệu khung tĩnh (Static UI Mockup theo đúng bản thiết kế)
const KPI_CARDS = [
  {
    id: 'active-classes',
    label: 'Lớp đang hoạt động',
    value: '128',
    subtext: '+8 trong tháng',
    iconBg: 'bg-[#eff6ff]',
    iconColor: 'text-[#2563eb]',
    subtextColor: 'text-[#2563eb]',
    iconType: 'table',
  },
  {
    id: 'upcoming-schedules',
    label: 'Lịch kiểm tra sắp tới',
    value: '24',
    subtext: '6 lịch trong hôm nay',
    iconBg: 'bg-[#eef2ff]',
    iconColor: 'text-[#4f46e5]',
    subtextColor: 'text-[#4f46e5]',
    iconType: 'clock',
  },
  {
    id: 'ongoing-sessions',
    label: 'Phiên đang diễn ra',
    value: '05',
    subtext: '412 sinh viên tham gia',
    iconBg: 'bg-[#ecfdf5]',
    iconColor: 'text-[#059669]',
    subtextColor: 'text-[#059669]',
    iconType: 'live',
  },
  {
    id: 'action-needed',
    label: 'Cần xử lý',
    value: '12',
    subtext: '7 cảnh báo • 5 sự cố',
    iconBg: 'bg-[#fff7ed]',
    iconColor: 'text-[#ea580c]',
    subtextColor: 'text-[#ea580c]',
    iconType: 'flag',
  },
];

const LINE_CHART_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const LINE_CHART_X = [64, 160, 256, 352, 448, 544, 640];
// Quy đổi giá trị (0 -> 40) sang tọa độ Y (192 -> 24)
const STUDENT_POINTS_Y = [121, 108, 95, 83, 62, 74, 37];
const SESSION_POINTS_Y = [142, 121, 133, 104, 87, 112, 74];

const DONUT_SEGMENTS = [
  {
    label: 'Thấp',
    percent: '42%',
    color: '#2563eb',
    dotClass: 'bg-[#2563eb]',
    startAngle: 0,
    endAngle: 151.2,
  },
  {
    label: 'Trung bình',
    percent: '28%',
    color: '#f59e0b',
    dotClass: 'bg-[#f59e0b]',
    startAngle: 151.2,
    endAngle: 252,
  },
  {
    label: 'Cao',
    percent: '19%',
    color: '#f97316',
    dotClass: 'bg-[#f97316]',
    startAngle: 252,
    endAngle: 320.4,
  },
  {
    label: 'Nghiêm trọng',
    percent: '11%',
    color: '#ef4444',
    dotClass: 'bg-[#ef4444]',
    startAngle: 320.4,
    endAngle: 360,
  },
];

const PENDING_ISSUES = [
  {
    id: 1,
    title: 'Mất kết nối màn hình • SE1848',
    subtitle: 'Phiên PRJ301-KT01',
    severity: 'Cao',
    severityClass: 'bg-[#fff7ed] text-[#ea580c]',
    status: 'Chưa xử lý',
  },
  {
    id: 2,
    title: '5 bài chấm tự động bị lỗi',
    subtitle: 'Phiên CSD201-KT02',
    severity: 'Trung bình',
    severityClass: 'bg-[#fffbeb] text-[#d97706]',
    status: 'Cần rà soát',
  },
  {
    id: 3,
    title: 'Tài khoản đăng nhập bất thường',
    subtitle: 'SV SE184802',
    severity: 'Nghiêm trọng',
    severityClass: 'bg-[#fef2f2] text-[#dc2626]',
    status: 'Chưa xử lý',
  },
  {
    id: 4,
    title: 'Danh sách lớp chưa chốt',
    subtitle: 'Lớp IT2202',
    severity: 'Thấp',
    severityClass: 'bg-[#eff6ff] text-[#2563eb]',
    status: 'Chờ GV',
  },
];

const TODAY_SESSIONS = [
  {
    id: 1,
    time: '08:00',
    timeBadgeClass: 'bg-[#ecfdf5] text-[#059669]',
    title: 'PRJ301 • Kiểm tra giữa kỳ',
    subtitle: 'SE1848 • 48 SV',
    status: 'Đang diễn ra',
    statusClass: 'text-[#059669]',
  },
  {
    id: 2,
    time: '13:30',
    timeBadgeClass: 'bg-[#eff6ff] text-[#2563eb]',
    title: 'CSD201 • Thực hành',
    subtitle: 'IT2202 • 36 SV',
    status: 'Sắp bắt đầu',
    statusClass: 'text-[#2563eb]',
  },
  {
    id: 3,
    time: '15:00',
    timeBadgeClass: 'bg-[#f1f5f9] text-[#475569]',
    title: 'MAD101 • Bài kiểm tra ngắn',
    subtitle: 'SE1849 • 42 SV',
    status: 'Đã lên lịch',
    statusClass: 'text-[#64748b]',
  },
];

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleParam = searchParams.get('module');

  // Xác định module đang hoạt động dựa trên tham số query module của URL
  const validModuleIds = ADMIN_NAV_GROUPS.flatMap((g) => g.items).map((item) => item.id);
  const activeModule =
    moduleParam && validModuleIds.includes(moduleParam) ? moduleParam : 'overview';

  useEffect(() => {
    // Nếu truy cập vào /admin?module=classes thì chuyển sang /class-manager
    if (moduleParam === 'classes') {
      router.replace('/class-manager');
    }
  }, [moduleParam, router]);

  // Tìm tên module hiện tại để hiển thị trên Topbar khi chuyển tab
  const currentModuleItem = ADMIN_NAV_GROUPS.flatMap((g) => g.items).find(
    (item) => item.id === activeModule
  );

  const topbarTitle =
    activeModule === 'overview'
      ? 'Tổng quan quản trị'
      : currentModuleItem?.label || 'Tổng quan quản trị';

  // Chuỗi polyline cho biểu đồ đường
  const studentPolyline = LINE_CHART_X.map(
    (x, i) => `${x},${STUDENT_POINTS_Y[i]}`
  ).join(' ');
  const sessionPolyline = LINE_CHART_X.map(
    (x, i) => `${x},${SESSION_POINTS_Y[i]}`
  ).join(' ');

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f7f9] font-sans text-slate-800">
      {/* ── CỘT TRÁI: SIDEBAR ĐIỀU HƯỚNG CÁC MODULE ── */}
      <AdminSidebar activeModule={activeModule} />

      {/* ── KHỐI BÊN PHẢI: TOPBAR + NỘI DUNG TRANG ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar title={topbarTitle} />

        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-7">
          {activeModule === 'overview' ? (
            <div className="mx-auto max-w-[1440px]">
              {/* ── TIÊU ĐỀ TRANG & BỘ LỌC THỜI GIAN ── */}
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[26px]">
                    Tổng quan toàn hệ thống
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 sm:text-[13.5px]">
                    Theo dõi hoạt động học tập, thực hành và kiểm tra trong phạm vi toàn trường.
                  </p>
                </div>

                {/* Nút chọn khoảng thời gian */}
                <button
                  type="button"
                  className="inline-flex h-10 min-w-[180px] items-center justify-between rounded-xl border border-slate-200/90 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
                >
                  <span>Hôm nay</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </div>

              {/* ── HÀNG 1: 4 THẺ CHỈ SỐ KPI ── */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {KPI_CARDS.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor}`}
                      >
                        {card.iconType === 'table' && (
                          <Table2 className="h-4 w-4" />
                        )}
                        {card.iconType === 'clock' && (
                          <Clock className="h-4 w-4" />
                        )}
                        {card.iconType === 'live' && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#059669]">
                            <span className="h-2 w-2 rounded-full bg-[#059669]" />
                          </span>
                        )}
                        {card.iconType === 'flag' && (
                          <Flag className="h-4 w-4" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-500">
                        {card.label}
                      </span>
                    </div>

                    <div className="mt-4 flex items-baseline gap-3">
                      <span className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900">
                        {card.value}
                      </span>
                      <span
                        className={`text-xs font-semibold ${card.subtextColor}`}
                      >
                        {card.subtext}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── HÀNG 2: BIỂU ĐỒ HOẠT ĐỘNG & CẢNH BÁO ── */}
              <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
                {/* Cột trái (8/12): Hoạt động theo thời gian */}
                <div className=" rounded-2xl border border-slate-200/75 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.02)] xl:col-span-8">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h3 className="text-[16px] font-bold text-slate-900">
                        Hoạt động theo thời gian
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Số phiên và lượng sinh viên theo khoảng đã chọn
                      </p>
                    </div>

                    {/* Chú giải (Legend Pills) */}
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex min-w-[100px] items-center justify-center gap-1.5 rounded-lg bg-[#eff6ff] px-3.5 py-1.5 text-xs font-semibold text-[#2563eb]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />
                        Phiên
                      </span>
                      <span className="inline-flex min-w-[108px] items-center justify-center gap-1.5 rounded-lg bg-[#ecfdf5] px-3.5 py-1.5 text-xs font-semibold text-[#059669]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
                        Sinh viên
                      </span>
                    </div>
                  </div>

                  {/* Biểu đồ đường SVG */}
                  <div className="mt-4 w-full overflow-x-auto">
                    <svg
                      viewBox="0 0 680 222"
                      className="h-[220px] w-full min-w-[500px]"
                      role="img"
                      aria-label="Biểu đồ hoạt động theo thời gian"
                    >
                      {/* Đường kẻ ngang và nhãn trục Y */}
                      {[
                        { label: '40', y: 24 },
                        { label: '30', y: 66 },
                        { label: '20', y: 108 },
                        { label: '10', y: 150 },
                      ].map((row) => (
                        <g key={row.label}>
                          <text
                            x="28"
                            y={row.y + 4}
                            textAnchor="end"
                            className="fill-slate-400 text-[11px] font-medium"
                          >
                            {row.label}
                          </text>
                          <line
                            x1="44"
                            y1={row.y}
                            x2="656"
                            y2={row.y}
                            stroke="#f1f5f9"
                            strokeWidth="1.2"
                          />
                        </g>
                      ))}

                      {/* Đường trục đáy (y = 192) */}
                      <line
                        x1="44"
                        y1="192"
                        x2="656"
                        y2="192"
                        stroke="#f1f5f9"
                        strokeWidth="1.2"
                      />

                      {/* Đường biểu diễn Sinh viên (Xanh lá) */}
                      <polyline
                        fill="none"
                        stroke="#059669"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={studentPolyline}
                      />

                      {/* Đường biểu diễn Phiên (Xanh dương) */}
                      <polyline
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={sessionPolyline}
                      />

                      {/* Điểm nút tròn trên đường Sinh viên */}
                      {LINE_CHART_X.map((x, idx) => (
                        <circle
                          key={`student-${x}`}
                          cx={x}
                          cy={STUDENT_POINTS_Y[idx]}
                          r="4.5"
                          fill="#ffffff"
                          stroke="#059669"
                          strokeWidth="2.4"
                        />
                      ))}

                      {/* Điểm nút tròn trên đường Phiên */}
                      {LINE_CHART_X.map((x, idx) => (
                        <circle
                          key={`session-${x}`}
                          cx={x}
                          cy={SESSION_POINTS_Y[idx]}
                          r="4.5"
                          fill="#ffffff"
                          stroke="#2563eb"
                          strokeWidth="2.4"
                        />
                      ))}

                      {/* Nhãn trục X (T2 -> CN) */}
                      {LINE_CHART_DAYS.map((day, idx) => (
                        <text
                          key={day}
                          x={LINE_CHART_X[idx]}
                          y="214"
                          textAnchor="middle"
                          className="fill-slate-400 text-[11px] font-medium"
                        >
                          {day}
                        </text>
                      ))}
                    </svg>
                  </div>
                </div>

                {/* Cột phải (4/12): Cảnh báo theo mức độ */}
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200/75 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.02)] xl:col-span-4">
                  <div>
                    <h3 className="text-[16px] font-bold text-slate-900">
                      Cảnh báo theo mức độ
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Các phiên trong khoảng thời gian đã chọn
                    </p>
                  </div>

                  <div className="my-auto flex flex-col items-center justify-between gap-6 py-4 sm:flex-row">
                    {/* Biểu đồ Donut SVG */}
                    <div className="relative flex h-[168px] w-[168px] shrink-0 items-center justify-center">
                      <svg
                        viewBox="0 0 168 168"
                        className="h-full w-full"
                        role="img"
                        aria-label="Biểu đồ cảnh báo theo mức độ"
                      >
                        {DONUT_SEGMENTS.map((seg) => (
                          <path
                            key={seg.label}
                            d={createDonutSegmentPath(
                              84,
                              84,
                              76,
                              48,
                              seg.startAngle,
                              seg.endAngle
                            )}
                            fill={seg.color}
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                          />
                        ))}
                      </svg>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[22px] font-extrabold leading-none text-slate-900">
                          326
                        </span>
                        <span className="mt-1 text-[11px] font-medium text-slate-400">
                          sự kiện
                        </span>
                      </div>
                    </div>

                    {/* Danh sách tỷ lệ phần trăm */}
                    <div className="w-full flex-1 space-y-3.5">
                      {DONUT_SEGMENTS.map((seg) => (
                        <div
                          key={seg.label}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`h-3 w-3 shrink-0 rounded-[4px] ${seg.dotClass}`}
                            />
                            <span className="font-medium text-slate-500">
                              {seg.label}
                            </span>
                          </div>
                          <span className="font-bold text-slate-800">
                            {seg.percent}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── HÀNG 3: VIỆC CẦN XỬ LÝ & PHIÊN KIỂM TRA HÔM NAY ── */}
              <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
                {/* Cột trái (8/12): Bảng Việc cần xử lý */}
                <div className="rounded-2xl border border-slate-200/75 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.02)] xl:col-span-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] font-bold text-slate-900">
                      Việc cần xử lý
                    </h3>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#2563eb] hover:underline cursor-pointer"
                    >
                      Xem tất cả →
                    </button>
                  </div>

                  {/* Header của bảng */}
                  <div className="mt-4 grid grid-cols-12 rounded-xl bg-[#f8fafc] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <div className="col-span-7">VẤN ĐỀ</div>
                    <div className="col-span-3 text-center">MỨC ĐỘ</div>
                    <div className="col-span-2 text-left sm:pl-2">
                      TRẠNG THÁI
                    </div>
                  </div>

                  {/* Danh sách các dòng việc cần xử lý */}
                  <div className="divide-y divide-slate-100">
                    {PENDING_ISSUES.map((issue) => (
                      <div
                        key={issue.id}
                        className="grid grid-cols-12 items-center px-4 py-3.5 transition-colors hover:bg-slate-50/60"
                      >
                        <div className="col-span-7 pr-3">
                          <p className="text-[13.5px] font-bold text-slate-800">
                            {issue.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {issue.subtitle}
                          </p>
                        </div>

                        <div className="col-span-3 flex justify-center">
                          <span
                            className={`inline-flex min-w-[92px] items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${issue.severityClass}`}
                          >
                            {issue.severity}
                          </span>
                        </div>

                        <div className="col-span-2 text-left text-xs font-semibold text-slate-600 sm:pl-2">
                          {issue.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cột phải (4/12): Phiên kiểm tra hôm nay */}
                <div className="rounded-2xl border border-slate-200/75 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.02)] xl:col-span-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] font-bold text-slate-900">
                      Phiên kiểm tra hôm nay
                    </h3>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#2563eb] hover:underline cursor-pointer"
                    >
                      Xem lịch →
                    </button>
                  </div>

                  <div className="mt-4 space-y-3.5">
                    {TODAY_SESSIONS.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-[#f8fafc] p-4 transition-colors hover:bg-slate-100/70"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span
                            className={`flex h-9 w-[58px] shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${session.timeBadgeClass}`}
                          >
                            {session.time}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-bold text-slate-900">
                              {session.title}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {session.subtitle}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`ml-2 shrink-0 self-end text-[11.5px] font-bold ${session.statusClass}`}
                        >
                          {session.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── DÒNG CHÚ THÍCH CUỐI TRANG ── */}
              <p className="mt-5 text-xs text-slate-400">
                Dữ liệu minh họa để duyệt bố cục dashboard Admin • Tất cả chức năng sẽ được đặc tả theo quyền và trạng thái.
              </p>
            </div>
          ) : activeModule === 'questions' ? (
            /* Phân hệ Ngân hàng Đề & Câu hỏi (Quản lý bài lab, đề thi & test cases) */
            <QuestionsManagerView />
          ) : (
            /* Khung chờ khi người dùng bấm thử sang các module khác trên Sidebar */
            <div className="mx-auto max-w-[1440px]">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  Module: {currentModuleItem?.label}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  Khung điều hướng cho phân hệ này đã sẵn sàng. Giao diện chi tiết và kết nối dữ liệu sẽ được triển khai ở bước tiếp theo.
                </p>
                <Link
                  href="/admin"
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#2563eb] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
                >
                  Quay lại trang Tổng quan
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


export default function AdminDashboardPage() {
  return (
    <Suspense fallback={null}>
      <AdminDashboardContent />
    </Suspense>
  );
}
