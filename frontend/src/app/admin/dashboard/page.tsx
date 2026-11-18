'use client';

import React, { Suspense, useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminSidebar, { ADMIN_NAV_GROUPS } from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { fetchWithAuth } from '@/services/apiClient';
import {
  Users,
  GraduationCap,
  Server,
  Database,
  RefreshCw,
  ArrowUpRight,
  Shield,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  FileSpreadsheet,
  Settings,
  HardDrive,
  FileText,
  Clock,
  Layers,
  Activity,
  Lock,
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
  system_actions?: number;
  active_users?: number;
  sessions?: number;
  students?: number;
}

interface UserDistributionSegment {
  label: string;
  role: string;
  count: number;
  active: number;
  locked: number;
  percent: string;
  percent_num: number;
  color: string;
  dotClass: string;
  startAngle?: number;
  endAngle?: number;
}

interface AuditLogItem {
  id: number | string;
  time: string;
  level: string;
  module: string;
  message: string;
  user: string;
  ip: string;
}

interface SystemServiceItem {
  name: string;
  status: string;
  status_text: string;
  detail: string;
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
      ? 'Bảng điều khiển Quản trị'
      : currentModuleItem?.label || 'Bảng điều khiển Quản trị';

  // State dữ liệu thực tế tải từ Backend CSDL SQL Server
  const [isLoading, setIsLoading] = useState(true);
  const [kpiData, setKpiData] = useState({
    totalUsers: {
      value: '0',
      subtext: '0 SV • 0 GV • 0 Admin',
      total: 0,
      students: 0,
      instructors: 0,
      admins: 0,
      active: 0,
      locked: 0,
    },
    activeClasses: {
      value: '0',
      subtext: '0 lớp học phần',
      total: 0,
    },
    systemStatus: {
      value: '100%',
      subtext: 'Tất cả dịch vụ đang hoạt động ổn định',
    },
    backupStatus: {
      value: '0',
      subtext: 'Chưa có bản sao lưu',
      last_backup_time: '',
      total_size_mb: 0,
    },
  });

  const [userDistribution, setUserDistribution] = useState<UserDistributionSegment[]>([]);
  const [activityChart, setActivityChart] = useState<ActivityDayItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([]);
  const [systemServices, setSystemServices] = useState<SystemServiceItem[]>([]);
  const [storageStats, setStorageStats] = useState<any>({});

  // Tải dữ liệu thật từ API
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchWithAuth<any>('/api/v1/admin/dashboard/overview');
      if (data) {
        if (data.kpi) {
          setKpiData({
            totalUsers: {
              value: data.kpi.total_users?.value || '0',
              subtext: data.kpi.total_users?.subtext || '0 SV • 0 GV • 0 Admin',
              total: data.kpi.total_users?.total || 0,
              students: data.kpi.total_users?.students || 0,
              instructors: data.kpi.total_users?.instructors || 0,
              admins: data.kpi.total_users?.admins || 0,
              active: data.kpi.total_users?.active || 0,
              locked: data.kpi.total_users?.locked || 0,
            },
            activeClasses: {
              value: data.kpi.active_classes?.value || '0',
              subtext: data.kpi.active_classes?.subtext || '0 lớp học phần',
              total: data.kpi.active_classes?.total || 0,
            },
            systemStatus: {
              value: data.kpi.system_status?.value || '100%',
              subtext: data.kpi.system_status?.subtext || 'Tất cả dịch vụ đang hoạt động ổn định',
            },
            backupStatus: {
              value: data.kpi.backup_status?.value || '0',
              subtext: data.kpi.backup_status?.subtext || 'Chưa có bản sao lưu',
              last_backup_time: data.kpi.backup_status?.last_backup_time || '',
              total_size_mb: data.kpi.backup_status?.total_size_mb || 0,
            },
          });
        }

        if (Array.isArray(data.user_distribution)) {
          const rawDist: UserDistributionSegment[] = data.user_distribution;
          let curAngle = 0;
          const totalCount = rawDist.reduce((sum, s) => sum + (s.count || 0), 0);

          const computedDist = rawDist.map((seg) => {
            const spanAngle = totalCount > 0 ? (seg.count / totalCount) * 360 : 120;
            const start = curAngle;
            const end = curAngle + spanAngle;
            curAngle = end;
            return {
              ...seg,
              startAngle: start,
              endAngle: end,
            };
          });
          setUserDistribution(computedDist);
        }

        if (Array.isArray(data.activity_chart)) {
          setActivityChart(data.activity_chart);
        }

        if (Array.isArray(data.recent_audit_logs)) {
          setRecentLogs(data.recent_audit_logs);
        }

        if (Array.isArray(data.system_services)) {
          setSystemServices(data.system_services);
        }

        if (data.storage_stats) {
          setStorageStats(data.storage_stats);
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

  // Tính toán tọa độ biểu đồ đường hoạt động hệ thống
  const { actionsPolyline, usersPolyline, actionsYPoints, usersYPoints, maxChartValue } =
    useMemo(() => {
      if (activityChart.length === 0) {
        return {
          actionsPolyline: '',
          usersPolyline: '',
          actionsYPoints: [192, 192, 192, 192, 192, 192, 192],
          usersYPoints: [192, 192, 192, 192, 192, 192, 192],
          maxChartValue: 20,
        };
      }

      const allVals = activityChart.flatMap((d) => [
        d.system_actions ?? d.sessions ?? 0,
        d.active_users ?? d.students ?? 0,
      ]);
      const maxValRaw = Math.max(...allVals, 10);
      const maxVal = Math.ceil(maxValRaw / 10) * 10;

      const valToY = (v: number) => {
        const ratio = Math.min(1, Math.max(0, v / maxVal));
        return 192 - ratio * (192 - 24);
      };

      const actionsY = activityChart.map((d) => valToY(d.system_actions ?? d.sessions ?? 0));
      const usersY = activityChart.map((d) => valToY(d.active_users ?? d.students ?? 0));

      const actionsPts = LINE_CHART_X.slice(0, activityChart.length)
        .map((x, i) => `${x},${actionsY[i]}`)
        .join(' ');
      const usersPts = LINE_CHART_X.slice(0, activityChart.length)
        .map((x, i) => `${x},${usersY[i]}`)
        .join(' ');

      return {
        actionsPolyline: actionsPts,
        usersPolyline: usersPts,
        actionsYPoints: actionsY,
        usersYPoints: usersY,
        maxChartValue: maxVal,
      };
    }, [activityChart]);

  // Danh sách 4 thẻ chỉ số cốt lõi của Quản trị viên
  const kpiCardsList = [
    {
      id: 'total-users',
      label: 'Tổng người dùng hệ thống',
      value: kpiData.totalUsers.value,
      subtext: kpiData.totalUsers.subtext,
      badge: `${kpiData.totalUsers.active} hoạt động`,
      iconBg: 'bg-purple-50 dark:bg-purple-500/10',
      iconColor: 'text-purple-600 dark:text-purple-400',
      subtextColor: 'text-purple-600 dark:text-purple-400',
      icon: Users,
    },
    {
      id: 'active-classes',
      label: 'Lớp học phần quản lý',
      value: kpiData.activeClasses.value,
      subtext: kpiData.activeClasses.subtext,
      badge: 'Đang mở',
      iconBg: 'bg-blue-50 dark:bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
      subtextColor: 'text-blue-600 dark:text-blue-400',
      icon: GraduationCap,
    },
    {
      id: 'system-status',
      label: 'Hạ tầng & Dịch vụ',
      value: kpiData.systemStatus.value,
      subtext: kpiData.systemStatus.subtext,
      badge: 'Ổn định',
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      subtextColor: 'text-emerald-600 dark:text-emerald-400',
      icon: Server,
    },
    {
      id: 'database-backups',
      label: 'Bản sao lưu CSDL',
      value: `${kpiData.backupStatus.value} bản`,
      subtext: kpiData.backupStatus.subtext,
      badge: 'Tự động',
      iconBg: 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
      subtextColor: 'text-amber-600 dark:text-amber-400',
      icon: Database,
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
            {/* ── TIÊU ĐỀ TRANG & NÚT LÀM MỚI ── */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-[26px]">
                  Bảng điều khiển Quản trị Hệ thống
                </h2>
                <p className="mt-1 text-xs text-slate-500 sm:text-[13.5px]">
                  Giám sát tài khoản người dùng, hạ tầng kỹ thuật, sao lưu và an ninh vận hành toàn trường theo thời gian thực.
                </p>
              </div>

              {/* Nút Làm mới dữ liệu */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadDashboardData}
                  disabled={isLoading}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-[#0d1017] dark:text-slate-200 dark:hover:bg-white/5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      isLoading ? 'animate-spin text-purple-600' : 'text-slate-500'
                    }`}
                  />
                  <span>{isLoading ? 'Đang đồng bộ...' : 'Làm mới số liệu'}</span>
                </button>
              </div>
            </div>

            {/* ── HÀNG 1: 4 THẺ CHỈ SỐ KPI CỐT LÕI DÀNH CHO ADMIN ── */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpiCardsList.map((card) => {
                const IconComponent = card.icon;
                return (
                  <div
                    key={card.id}
                    className="rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)] dark:border-white/10 dark:bg-[#0d1017] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor}`}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {card.label}
                        </span>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {card.badge}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white">
                        {card.value}
                      </div>
                      <p className={`mt-2 text-xs font-medium ${card.subtextColor} truncate`}>
                        {card.subtext}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── HÀNG 2: HOẠT ĐỘNG HỆ THỐNG & CƠ CẤU NGƯỜI DÙNG ── */}
            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
              {/* Cột trái (8/12): Hoạt động hệ thống 7 ngày */}
              <div className="rounded-2xl border border-slate-200/75 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.02)] xl:col-span-8 dark:border-white/10 dark:bg-[#0d1017] transition-colors">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
                      Hoạt động & Tương tác Hệ thống (7 ngày qua)
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                      Tần suất nhật ký kiểm toán và lượng tài khoản hoạt động trong tuần
                    </p>
                  </div>

                  {/* Chú giải 2 đường biểu đồ */}
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
                      Nhật ký & Tác vụ
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      Tài khoản truy cập
                    </span>
                  </div>
                </div>

                {/* Biểu đồ đường SVG động */}
                <div className="mt-4 w-full overflow-x-auto">
                  <svg
                    viewBox="0 0 680 222"
                    className="h-[220px] w-full min-w-[500px]"
                    role="img"
                    aria-label="Biểu đồ hoạt động hệ thống theo thời gian"
                  >
                    {/* Đường kẻ ngang và nhãn trục Y */}
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

                    {/* Đường polyline: Nhật ký & Tác vụ (Màu tím) */}
                    {actionsPolyline && (
                      <polyline
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={actionsPolyline}
                      />
                    )}

                    {/* Đường polyline: Tài khoản truy cập (Màu xanh dương) */}
                    {usersPolyline && (
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={usersPolyline}
                      />
                    )}

                    {/* Nút tròn trên đường Tác vụ */}
                    {LINE_CHART_X.slice(0, activityChart.length).map((x, idx) => (
                      <circle
                        key={`action-${x}`}
                        cx={x}
                        cy={actionsYPoints[idx]}
                        r="4"
                        fill="#ffffff"
                        stroke="#8b5cf6"
                        strokeWidth="2.2"
                      />
                    ))}

                    {/* Nút tròn trên đường Tài khoản */}
                    {LINE_CHART_X.slice(0, activityChart.length).map((x, idx) => (
                      <circle
                        key={`user-${x}`}
                        cx={x}
                        cy={usersYPoints[idx]}
                        r="4"
                        fill="#ffffff"
                        stroke="#3b82f6"
                        strokeWidth="2.2"
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

              {/* Cột phải (4/12): Cơ cấu người dùng theo vai trò (Donut Chart) */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200/75 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.02)] xl:col-span-4 dark:border-white/10 dark:bg-[#0d1017] transition-colors">
                <div>
                  <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
                    Cơ cấu Tài khoản
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Phân bổ theo vai trò và trạng thái kích hoạt
                  </p>
                </div>

                <div className="my-auto flex flex-col items-center justify-between gap-6 py-4 sm:flex-row">
                  {/* Biểu đồ Donut SVG động */}
                  <div className="relative flex h-[168px] w-[168px] shrink-0 items-center justify-center">
                    <svg
                      viewBox="0 0 168 168"
                      className="h-full w-full"
                      role="img"
                      aria-label="Biểu đồ cơ cấu người dùng"
                    >
                      {kpiData.totalUsers.total > 0 ? (
                        userDistribution
                          .filter(
                            (seg) =>
                              seg.count > 0 &&
                              typeof seg.startAngle === 'number' &&
                              typeof seg.endAngle === 'number'
                          )
                          .map((seg) => (
                            <path
                              key={seg.role}
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
                      <span className="text-[20px] font-extrabold leading-none text-slate-900 dark:text-white">
                        {kpiData.totalUsers.value}
                      </span>
                      <span className="mt-1 text-[11px] font-medium text-slate-400">
                        tài khoản
                      </span>
                    </div>
                  </div>

                  {/* Danh sách vai trò & tỷ lệ */}
                  <div className="w-full flex-1 space-y-3.5">
                    {userDistribution.map((seg) => (
                      <div key={seg.role} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className={`h-3 w-3 shrink-0 rounded-[4px] ${seg.dotClass}`} />
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            {seg.label}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {seg.count} ({seg.percent})
                        </span>
                      </div>
                    ))}

                    {/* Thống kê trạng thái Hoạt động vs Bị khóa */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {kpiData.totalUsers.active} hoạt động
                      </span>
                      {kpiData.totalUsers.locked > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <Lock className="h-3.5 w-3.5" />
                          {kpiData.totalUsers.locked} đang khóa
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">0 tài khoản khóa</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── HÀNG 3: NHẬT KÝ QUẢN TRỊ GẦN ĐÂY & THAO TÁC NHANH ── */}
            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
              {/* Cột trái (8/12): Bảng Nhật ký kiểm toán gần đây */}
              <div className="rounded-2xl border border-slate-200/75 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.02)] xl:col-span-8 dark:border-white/10 dark:bg-[#0d1017] transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
                      Nhật ký Quản trị & Kiểm toán gần đây
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Ghi nhận các tác động và sự kiện bảo mật trực tiếp trên hệ thống
                    </p>
                  </div>
                  <Link
                    href="/admin/system"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 cursor-pointer"
                  >
                    <span>Xem toàn bộ nhật ký</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Header của bảng nhật ký */}
                <div className="mt-4 grid grid-cols-12 rounded-xl bg-[#f8fafc] dark:bg-white/5 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <div className="col-span-2">THỜI GIAN</div>
                  <div className="col-span-2 text-center">MỨC ĐỘ / PHÂN HỆ</div>
                  <div className="col-span-5">NỘI DUNG TÁC ĐỘNG</div>
                  <div className="col-span-3 text-right">NGƯỜI THỰC HIỆN / IP</div>
                </div>

                {/* Danh sách các dòng nhật ký */}
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {recentLogs.length > 0 ? (
                    recentLogs.map((log) => {
                      const isErr = log.level === 'error' || log.level === 'critical';
                      const isWarn = log.level === 'warning' || log.level === 'security';
                      const badgeCls = isErr
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                        : isWarn
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                        : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';

                      return (
                        <div
                          key={log.id}
                          className="grid grid-cols-12 items-center px-4 py-3.5 transition-colors hover:bg-slate-50/60 dark:hover:bg-white/5"
                        >
                          <div className="col-span-2 text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                            {log.time}
                          </div>

                          <div className="col-span-2 flex flex-col items-center gap-1">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase border ${badgeCls}`}
                            >
                              {log.level}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                              {log.module}
                            </span>
                          </div>

                          <div className="col-span-5 pr-2">
                            <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                              {log.message}
                            </p>
                          </div>

                          <div className="col-span-3 text-right">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {log.user}
                            </p>
                            <p className="text-[11px] font-mono text-slate-400">
                              {log.ip}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-slate-400 dark:text-slate-500">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                      <p className="text-xs font-medium">Hệ thống đang vận hành ổn định, chưa có sự cố phát sinh</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cột phải (4/12): Thao tác Quản trị Nhanh & Tình trạng Dịch vụ */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200/75 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.02)] xl:col-span-4 dark:border-white/10 dark:bg-[#0d1017] transition-colors space-y-6">
                <div>
                  <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
                    Thao tác Quản trị Nhanh
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Lối tắt truy cập các tính năng quản lý cốt lõi
                  </p>

                  {/* Grid nút hành động */}
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <Link
                      href="/admin/users"
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-white hover:border-purple-300 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 transition group text-center"
                    >
                      <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Quản lý Người dùng
                      </span>
                      <span className="text-[10px] text-slate-400">Thêm & duyệt tài khoản</span>
                    </Link>

                    <Link
                      href="/admin/classes"
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-white hover:border-blue-300 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 transition group text-center"
                    >
                      <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Lớp học phần
                      </span>
                      <span className="text-[10px] text-slate-400">Danh sách & tạo lớp</span>
                    </Link>

                    <Link
                      href="/admin/system"
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-white hover:border-amber-300 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 transition group text-center"
                    >
                      <Database className="h-5 w-5 text-amber-600 dark:text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Sao lưu CSDL
                      </span>
                      <span className="text-[10px] text-slate-400">Tạo snapshot & khôi phục</span>
                    </Link>

                    <Link
                      href="/admin/system"
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-white hover:border-emerald-300 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 transition group text-center"
                    >
                      <Settings className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Cấu hình Hạ tầng
                      </span>
                      <span className="text-[10px] text-slate-400">Bảo trì & thông số</span>
                    </Link>
                  </div>
                </div>

                {/* Khối Trạng thái Dịch vụ Cốt lõi */}
                <div className="pt-4 border-t border-slate-100 dark:border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-emerald-500" />
                      Dịch vụ Hệ thống Cốt lõi
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Online
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(systemServices.length > 0 ? systemServices : [
                      { name: 'CSDL SQL Server', status: 'online', status_text: 'Hoạt động', detail: 'Kết nối ổn định' },
                      { name: 'Redis Cache Server', status: 'online', status_text: 'Hoạt động', detail: 'Port 6379' },
                      { name: 'LiveKit SFU Engine', status: 'online', status_text: 'Sẵn sàng', detail: 'WebRTC Streaming' },
                      { name: 'Docker Code Sandbox', status: 'online', status_text: 'Sẵn sàng', detail: 'Chấm bài cách ly' },
                    ]).map((svc) => (
                      <div
                        key={svc.name}
                        className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-white/5 px-3 py-2 text-xs"
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {svc.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {svc.status_text}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── DÒNG CHÚ THÍCH CUỐI TRANG ── */}
            <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">
              Số liệu bảng điều khiển quản trị được tổng hợp trực tiếp từ CSDL Microsoft SQL Server & Hạ tầng máy chủ Oculide v2.4.
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
