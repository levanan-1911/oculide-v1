'use client';

import React, { Suspense, useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminSidebar, { ADMIN_NAV_GROUPS } from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { fetchWithAuth } from '@/services/apiClient';
import {
  Table2,
  Clock,
  Flag,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RefreshCw,
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

interface ActivityDayItem {
  day: string;
  date: string;
  date_iso: string;
  sessions: number;
  students: number;
}

interface RiskSegmentItem {
  label: string;
  count: number;
  percent: string;
  percent_num: number;
  color: string;
  dotClass: string;
  startAngle?: number;
  endAngle?: number;
}

interface PendingIssueItem {
  id: string | number;
  title: string;
  subtitle: string;
  severity: string;
  severityClass: string;
  status: string;
}

interface TodaySessionItem {
  id: number | string;
  time: string;
  timeBadgeClass: string;
  title: string;
  subtitle: string;
  status: string;
  statusClass: string;
}

const LINE_CHART_X = [64, 160, 256, 352, 448, 544, 640];

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleParam = searchParams.get('module');

  // Xác định module đang hoạt động
  const validModuleIds = ADMIN_NAV_GROUPS.flatMap((g) => g.items).map((item) => item.id);
  const activeModule =
    moduleParam && validModuleIds.includes(moduleParam) ? moduleParam : 'overview';

  useEffect(() => {
    if (moduleParam === 'classes') {
      router.replace('/admin/classes');
    }
  }, [moduleParam, router]);

  const currentModuleItem = ADMIN_NAV_GROUPS.flatMap((g) => g.items).find(
    (item) => item.id === activeModule
  );

  const topbarTitle =
    activeModule === 'overview'
      ? 'Tổng quan quản trị'
      : currentModuleItem?.label || 'Tổng quan quản trị';

  // State dữ liệu thực tế tải từ Backend CSDL SQL Server
  const [isLoading, setIsLoading] = useState(true);
  const [kpiData, setKpiData] = useState({
    activeClasses: { value: '0', subtext: '0 lớp học phần' },
    upcomingSchedules: { value: '0', subtext: '0 lịch trong hôm nay' },
    ongoingSessions: { value: '00', subtext: '0 sinh viên tham gia' },
    actionNeeded: { value: '0', subtext: '0 cảnh báo • 0 sự cố' },
  });

  const [activityChart, setActivityChart] = useState<ActivityDayItem[]>([]);
  const [totalRiskEvents, setTotalRiskEvents] = useState(0);
  const [riskSegments, setRiskSegments] = useState<RiskSegmentItem[]>([]);
  const [pendingIssues, setPendingIssues] = useState<PendingIssueItem[]>([]);
  const [todaySessions, setTodaySessions] = useState<TodaySessionItem[]>([]);

  // Tải dữ liệu thật từ API
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchWithAuth<any>('/api/v1/admin/dashboard/overview');
      if (data) {
        if (data.kpi) {
          setKpiData({
            activeClasses: {
              value: data.kpi.active_classes?.value || '0',
              subtext: data.kpi.active_classes?.subtext || '0 lớp học phần',
            },
            upcomingSchedules: {
              value: data.kpi.upcoming_schedules?.value || '0',
              subtext: data.kpi.upcoming_schedules?.subtext || '0 lịch trong hôm nay',
            },
            ongoingSessions: {
              value: data.kpi.ongoing_sessions?.value || '00',
              subtext: data.kpi.ongoing_sessions?.subtext || '0 sinh viên tham gia',
            },
            actionNeeded: {
              value: data.kpi.action_needed?.value || '0',
              subtext: data.kpi.action_needed?.subtext || '0 cảnh báo • 0 sự cố',
            },
          });
        }

        if (Array.isArray(data.activity_chart)) {
          setActivityChart(data.activity_chart);
        }

        if (data.risk_breakdown) {
          setTotalRiskEvents(data.risk_breakdown.total_events || 0);
          const rawSegs: RiskSegmentItem[] = data.risk_breakdown.segments || [];

          // Tính toán góc startAngle và endAngle cho biểu đồ Donut
          let curAngle = 0;
          const totalCount = rawSegs.reduce((sum, s) => sum + (s.count || 0), 0);

          const computedSegs = rawSegs.map((seg) => {
            const spanAngle = totalCount > 0 ? (seg.count / totalCount) * 360 : 90;
            const start = curAngle;
            const end = curAngle + spanAngle;
            curAngle = end;
            return {
              ...seg,
              startAngle: start,
              endAngle: end,
            };
          });

          setRiskSegments(computedSegs);
        }

        if (Array.isArray(data.pending_issues)) {
          setPendingIssues(data.pending_issues);
        }

        if (Array.isArray(data.today_sessions)) {
          setTodaySessions(data.today_sessions);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu tổng quan Admin Dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Tính toán tọa độ biểu đồ đường động
  const { studentPolyline, sessionPolyline, studentYPoints, sessionYPoints, maxChartValue } =
    useMemo(() => {
      if (activityChart.length === 0) {
        return {
          studentPolyline: '',
          sessionPolyline: '',
          studentYPoints: [192, 192, 192, 192, 192, 192, 192],
          sessionYPoints: [192, 192, 192, 192, 192, 192, 192],
          maxChartValue: 40,
        };
      }

      const allVals = activityChart.flatMap((d) => [d.sessions || 0, d.students || 0]);
      const maxValRaw = Math.max(...allVals, 10);
      // Làm tròn lên mốc chia hết cho 10
      const maxVal = Math.ceil(maxValRaw / 10) * 10;

      // y = 192 (val = 0) đến y = 24 (val = maxVal)
      const valToY = (v: number) => {
        const ratio = Math.min(1, Math.max(0, v / maxVal));
        return 192 - ratio * (192 - 24);
      };

      const sY = activityChart.map((d) => valToY(d.students || 0));
      const sessY = activityChart.map((d) => valToY(d.sessions || 0));

      const sPoly = LINE_CHART_X.slice(0, activityChart.length)
        .map((x, i) => `${x},${sY[i]}`)
        .join(' ');
      const sessPoly = LINE_CHART_X.slice(0, activityChart.length)
        .map((x, i) => `${x},${sessY[i]}`)
        .join(' ');

      return {
        studentPolyline: sPoly,
        sessionPolyline: sessPoly,
        studentYPoints: sY,
        sessionYPoints: sessY,
        maxChartValue: maxVal,
      };
    }, [activityChart]);

  const kpiCardsList = [
    {
      id: 'active-classes',
      label: 'Lớp đang hoạt động',
      value: kpiData.activeClasses.value,
      subtext: kpiData.activeClasses.subtext,
      iconBg: 'bg-[#eff6ff]',
      iconColor: 'text-[#2563eb]',
      subtextColor: 'text-[#2563eb]',
      iconType: 'table',
    },
    {
      id: 'upcoming-schedules',
      label: 'Lịch kiểm tra sắp tới',
      value: kpiData.upcomingSchedules.value,
      subtext: kpiData.upcomingSchedules.subtext,
      iconBg: 'bg-[#eef2ff]',
      iconColor: 'text-[#4f46e5]',
      subtextColor: 'text-[#4f46e5]',
      iconType: 'clock',
    },
    {
      id: 'ongoing-sessions',
      label: 'Phiên đang diễn ra',
      value: kpiData.ongoingSessions.value,
      subtext: kpiData.ongoingSessions.subtext,
      iconBg: 'bg-[#ecfdf5]',
      iconColor: 'text-[#059669]',
      subtextColor: 'text-[#059669]',
      iconType: 'live',
    },
    {
      id: 'action-needed',
      label: 'Cần xử lý',
      value: kpiData.actionNeeded.value,
      subtext: kpiData.actionNeeded.subtext,
      iconBg: 'bg-[#fff7ed]',
      iconColor: 'text-[#ea580c]',
      subtextColor: 'text-[#ea580c]',
      iconType: 'flag',
    },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f7f9] dark:bg-[#090a0f] font-sans text-slate-800 dark:text-slate-100 transition-colors">
      {/* ── CỘT TRÁI: SIDEBAR ĐIỀU HƯỚNG CÁC MODULE ── */}
      <AdminSidebar activeModule={activeModule} />

      {/* ── KHỐI BÊN PHẢI: TOPBAR + NỘI DUNG TRANG ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar title={topbarTitle} />

        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1440px]">
            {/* ── TIÊU ĐỀ TRANG & BỘ LỌC THỜI GIAN ── */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-[26px]">
                  Tổng quan toàn hệ thống
                </h2>
                <p className="mt-1 text-xs text-slate-500 sm:text-[13.5px]">
                  Theo dõi hoạt động học tập, thực hành và kiểm tra trong phạm vi toàn trường từ CSDL thời gian thực.
                </p>
              </div>

              {/* Nút Làm mới dữ liệu */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadDashboardData}
                  disabled={isLoading}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-[#0d1017] dark:text-slate-200 dark:hover:bg-white/5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                  <span>{isLoading ? 'Đang đồng bộ...' : 'Làm mới số liệu'}</span>
                </button>
              </div>
            </div>

            {/* ── HÀNG 1: 4 THẺ CHỈ SỐ KPI ── */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpiCardsList.map((card) => (
                <div
                  key={card.id}
                  className="rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)] dark:border-white/10 dark:bg-[#0d1017] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor}`}
                    >
                      {card.iconType === 'table' && <Table2 className="h-4 w-4" />}
                      {card.iconType === 'clock' && <Clock className="h-4 w-4" />}
                      {card.iconType === 'live' && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#059669]">
                          <span className="h-2 w-2 rounded-full bg-[#059669]" />
                        </span>
                      )}
                      {card.iconType === 'flag' && <Flag className="h-4 w-4" />}
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {card.label}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline gap-3">
                    <span className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white">
                      {card.value}
                    </span>
                    <span className={`text-xs font-semibold ${card.subtextColor}`}>
                      {card.subtext}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── HÀNG 2: BIỂU ĐỒ HOẠT ĐỘNG & CẢNH BÁO ── */}
            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
              {/* Cột trái (8/12): Hoạt động theo thời gian */}
              <div className="rounded-2xl border border-slate-200/75 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.02)] xl:col-span-8 dark:border-white/10 dark:bg-[#0d1017] transition-colors">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
                      Hoạt động theo thời gian (7 ngày qua)
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                      Số phiên thi và lượng sinh viên thực hiện qua hệ thống
                    </p>
                  </div>

                  {/* Chú giải */}
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex min-w-[100px] items-center justify-center gap-1.5 rounded-lg bg-[#eff6ff] px-3.5 py-1.5 text-xs font-semibold text-[#2563eb]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />
                      Phiên thi
                    </span>
                    <span className="inline-flex min-w-[108px] items-center justify-center gap-1.5 rounded-lg bg-[#ecfdf5] px-3.5 py-1.5 text-xs font-semibold text-[#059669]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
                      Sinh viên
                    </span>
                  </div>
                </div>

                {/* Biểu đồ đường SVG động */}
                <div className="mt-4 w-full overflow-x-auto">
                  <svg
                    viewBox="0 0 680 222"
                    className="h-[220px] w-full min-w-[500px]"
                    role="img"
                    aria-label="Biểu đồ hoạt động theo thời gian"
                  >
                    {/* Đường kẻ ngang và nhãn trục Y động */}
                    {[
                      { label: String(maxChartValue), y: 24 },
                      { label: String(Math.round((maxChartValue * 3) / 4)), y: 66 },
                      { label: String(Math.round(maxChartValue / 2)), y: 108 },
                      { label: String(Math.round(maxChartValue / 4)), y: 150 },
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
                          className="dark:stroke-white/5"
                          strokeWidth="1.2"
                        />
                      </g>
                    ))}

                    {/* Đường trục đáy */}
                    <line
                      x1="44"
                      y1="192"
                      x2="656"
                      y2="192"
                      stroke="#f1f5f9"
                      className="dark:stroke-white/5"
                      strokeWidth="1.2"
                    />

                    {/* Đường biểu diễn Sinh viên (Xanh lá) */}
                    {studentPolyline && (
                      <polyline
                        fill="none"
                        stroke="#059669"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={studentPolyline}
                      />
                    )}

                    {/* Đường biểu diễn Phiên (Xanh dương) */}
                    {sessionPolyline && (
                      <polyline
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={sessionPolyline}
                      />
                    )}

                    {/* Điểm nút tròn trên đường Sinh viên */}
                    {LINE_CHART_X.slice(0, activityChart.length).map((x, idx) => (
                      <circle
                        key={`student-${x}`}
                        cx={x}
                        cy={studentYPoints[idx]}
                        r="4.5"
                        fill="#ffffff"
                        stroke="#059669"
                        strokeWidth="2.4"
                      />
                    ))}

                    {/* Điểm nút tròn trên đường Phiên */}
                    {LINE_CHART_X.slice(0, activityChart.length).map((x, idx) => (
                      <circle
                        key={`session-${x}`}
                        cx={x}
                        cy={sessionYPoints[idx]}
                        r="4.5"
                        fill="#ffffff"
                        stroke="#2563eb"
                        strokeWidth="2.4"
                      />
                    ))}

                    {/* Nhãn trục X */}
                    {activityChart.map((d, idx) => (
                      <text
                        key={d.day + idx}
                        x={LINE_CHART_X[idx]}
                        y="214"
                        textAnchor="middle"
                        className="fill-slate-400 text-[11px] font-medium"
                      >
                        {d.day} ({d.date})
                      </text>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Cột phải (4/12): Cảnh báo theo mức độ */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200/75 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.02)] xl:col-span-4 dark:border-white/10 dark:bg-[#0d1017] transition-colors">
                <div>
                  <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
                    Cảnh báo theo mức độ
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Phân bổ mức độ nghiêm trọng từ hệ thống AI giám sát
                  </p>
                </div>

                <div className="my-auto flex flex-col items-center justify-between gap-6 py-4 sm:flex-row">
                  {/* Biểu đồ Donut SVG động */}
                  <div className="relative flex h-[168px] w-[168px] shrink-0 items-center justify-center">
                    <svg
                      viewBox="0 0 168 168"
                      className="h-full w-full"
                      role="img"
                      aria-label="Biểu đồ cảnh báo theo mức độ"
                    >
                      {totalRiskEvents > 0 ? (
                        riskSegments
                          .filter((seg) => seg.count > 0 && typeof seg.startAngle === 'number' && typeof seg.endAngle === 'number')
                          .map((seg) => (
                            <path
                              key={seg.label}
                              d={createDonutSegmentPath(
                                84,
                                84,
                                76,
                                48,
                                seg.startAngle!,
                                Math.min(seg.endAngle!, seg.startAngle! + 359.9)
                              )}
                              fill={seg.color}
                              stroke="#ffffff"
                              strokeWidth="2.5"
                              strokeLinejoin="round"
                            />
                          ))
                      ) : (
                        // Khi chưa có vi phạm: Vẽ vòng tròn xám thanh nhã
                        <circle
                          cx="84"
                          cy="84"
                          r="62"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="24"
                          className="dark:stroke-white/10"
                        />
                      )}
                    </svg>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[22px] font-extrabold leading-none text-slate-900 dark:text-white">
                        {totalRiskEvents}
                      </span>
                      <span className="mt-1 text-[11px] font-medium text-slate-400">
                        sự kiện
                      </span>
                    </div>
                  </div>

                  {/* Danh sách tỷ lệ phần trăm */}
                  <div className="w-full flex-1 space-y-3.5">
                    {riskSegments.map((seg) => (
                      <div key={seg.label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className={`h-3 w-3 shrink-0 rounded-[4px] ${seg.dotClass}`} />
                          <span className="font-medium text-slate-500 dark:text-slate-400">
                            {seg.label}
                          </span>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {seg.count > 0 ? `${seg.percent} (${seg.count})` : '0%'}
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
              <div className="rounded-2xl border border-slate-200/75 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.02)] xl:col-span-8 dark:border-white/10 dark:bg-[#0d1017] transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
                    Việc cần xử lý ({pendingIssues.length})
                  </h3>
                  <Link
                    href="/admin/system"
                    className="text-xs font-semibold text-[#2563eb] hover:underline cursor-pointer"
                  >
                    Xem nhật ký hệ thống →
                  </Link>
                </div>

                {/* Header của bảng */}
                <div className="mt-4 grid grid-cols-12 rounded-xl bg-[#f8fafc] dark:bg-white/5 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <div className="col-span-7">VẤN ĐỀ / SỰ CỐ</div>
                  <div className="col-span-3 text-center">MỨC ĐỘ</div>
                  <div className="col-span-2 text-left sm:pl-2">TRẠNG THÁI</div>
                </div>

                {/* Danh sách các dòng việc cần xử lý */}
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {pendingIssues.length > 0 ? (
                    pendingIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="grid grid-cols-12 items-center px-4 py-3.5 transition-colors hover:bg-slate-50/60 dark:hover:bg-white/5"
                      >
                        <div className="col-span-7 pr-3">
                          <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-200 truncate">
                            {issue.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
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

                        <div className="col-span-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 sm:pl-2">
                          {issue.status}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 dark:text-slate-500">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                      <p className="text-xs font-medium">Hiện không có sự cố hoặc cảnh báo vi phạm nào cần xử lý</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cột phải (4/12): Phiên kiểm tra hôm nay */}
              <div className="rounded-2xl border border-slate-200/75 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.02)] xl:col-span-4 dark:border-white/10 dark:bg-[#0d1017] transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
                    Phiên kiểm tra ({todaySessions.length})
                  </h3>
                  <Link
                    href="/admin/schedules"
                    className="text-xs font-semibold text-[#2563eb] hover:underline cursor-pointer"
                  >
                    Xem lịch thi →
                  </Link>
                </div>

                <div className="mt-4 space-y-3.5">
                  {todaySessions.length > 0 ? (
                    todaySessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-[#f8fafc] p-4 transition-colors hover:bg-slate-100/70 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span
                            className={`flex h-9 w-[58px] shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${session.timeBadgeClass}`}
                          >
                            {session.time}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-bold text-slate-900 dark:text-white">
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
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 dark:text-slate-500">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 opacity-80" />
                      <p className="text-xs font-medium">Chưa có ca thi nào diễn ra trong ngày hôm nay</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── DÒNG CHÚ THÍCH CUỐI TRANG ── */}
            <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">
              Dữ liệu được tổng hợp thời gian thực từ CSDL Microsoft SQL Server • Hệ thống giám sát khảo thí Oculide v2.4.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f4f7f9] dark:bg-[#090a0f] text-xs font-semibold text-slate-500 dark:text-slate-400">
          Đang nạp dữ liệu bảng điều khiển quản trị...
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
