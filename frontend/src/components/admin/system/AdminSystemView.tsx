'use client';

import React, { useState, useMemo } from 'react';
import {
  Settings,
  Shield,
  Activity,
  Server,
  Database,
  Radio,
  HardDrive,
  Download,
  RefreshCw,
  Search,
  CheckCircle2,
  ShieldAlert,
  Cpu,
  Wifi,
  Laptop,
  Save,
  RotateCcw,
  Eye,
  X,
  Terminal,
  Mail,
  Sliders,
  Globe,
  Lock,
} from 'lucide-react';
import {
  AuditLogItem,
  ServiceHealthItem,
  SystemSettings,
  BackupItem,
  SYSTEM_STORAGE_SETTINGS_KEY,
  SYSTEM_STORAGE_LOGS_KEY,
  SYSTEM_STORAGE_BACKUPS_KEY,
} from './types';

// ==========================================
// CẤU HÌNH MẶC ĐỊNH CHO HẠ TẦNG QUẢN TRỊ
// ==========================================

const DEFAULT_SETTINGS: SystemSettings = {
  // 1. Giới hạn hạ tầng
  maxCodeFileSizeMb: 2,
  maxSandboxWorkers: 4,
  maxLiveKitBitrateKbps: 350,
  autoCleanupDraftsDays: 30,
  auditLogRetentionDays: 90,

  // 2. Tích hợp dịch vụ
  livekitServerUrl: 'wss://oculide-exam-4eu7af2s.livekit.cloud',
  smtpHost: 'smtp-relay.brevo.com',
  smtpPort: 587,
  smtpSenderEmail: 'noreply@oculide.edu.vn',
  allowedEmailDomain: '@school.edu.vn',

  // 3. Bảo mật & Vận hành
  maxLoginAttempts: 5,
  jwtTokenExpiryMinutes: 60,
  maintenanceMode: false,
  maintenanceMessage: 'Hệ thống Oculide đang được bảo trì định kỳ bởi Trung tâm CNTT. Vui lòng quay lại sau ít phút.',
};

const INITIAL_SERVICES: ServiceHealthItem[] = [
  {
    id: 'backend_api',
    name: 'Core Backend API (FastAPI)',
    category: 'Application Server',
    status: 'healthy',
    latencyMs: 38,
    uptimePercent: 99.95,
    lastChecked: 'Vừa xong',
    metrics: [
      { label: 'CPU Usage', value: '14%' },
      { label: 'RAM', value: '512 MB' },
      { label: 'Requests/phút', value: 340 },
    ],
    description: 'Xử lý xác thực người dùng, điều hướng phòng thi và quản lý API dữ liệu.',
  },
  {
    id: 'code_sandbox',
    name: 'Máy chủ Chấm Code (Docker Sandbox / Judge)',
    category: 'Execution Engine',
    status: 'healthy',
    latencyMs: 110,
    uptimePercent: 99.8,
    lastChecked: 'Vừa xong',
    metrics: [
      { label: 'Worker sẵn sàng', value: '4/4' },
      { label: 'Hàng đợi', value: '0 jobs' },
      { label: 'Thời gian chấm TB', value: '0.85s' },
    ],
    description: 'Môi trường sandbox an toàn thực thi và chấm test case cho C/C++, Java, Python.',
  },
  {
    id: 'livekit_media',
    name: 'LiveKit WebRTC Media Server',
    category: 'Streaming Engine',
    status: 'healthy',
    latencyMs: 45,
    uptimePercent: 99.9,
    lastChecked: 'Vừa xong',
    metrics: [
      { label: 'Phòng đang mở', value: '2 phòng' },
      { label: 'Luồng Media', value: '12 Screen + 12 Cam' },
      { label: 'Băng thông', value: '7.8 Mbps' },
    ],
    description: 'Truyền tải video chia sẻ màn hình (bắt buộc) và webcam thời gian thực từ laptop sinh viên về màn hình giám sát của giảng viên.',
  },
  {
    id: 'database',
    name: 'Cơ sở Dữ liệu (Microsoft SQL Server)',
    category: 'Data Storage',
    status: 'healthy',
    latencyMs: 8,
    uptimePercent: 100,
    lastChecked: 'Vừa xong',
    metrics: [
      { label: 'Connection Pool', value: '12/50' },
      { label: 'Dung lượng DB', value: '48.5 MB' },
      { label: 'Đọc/Ghi TB', value: '4.2ms' },
    ],
    description: 'Lưu trữ thông tin người dùng, lớp học, ngân hàng câu hỏi và bản nháp bài thi.',
  },
  {
    id: 'redis_cache',
    name: 'Redis Cache & Event Queue',
    category: 'In-Memory Cache',
    status: 'healthy',
    latencyMs: 2,
    uptimePercent: 100,
    lastChecked: 'Vừa xong',
    metrics: [
      { label: 'Bộ nhớ dùng', value: '24.2 MB' },
      { label: 'Hit Rate', value: '96.4%' },
      { label: 'Active Keys', value: 1820 },
    ],
    description: 'Quản lý phiên đăng nhập (JWT token blacklisting) và hàng đợi thông báo vi phạm.',
  },
];

// NHẬT KÝ KIỂM TOÁN CHUẨN ADMIN: Chỉ ghi nhận sự kiện An ninh, Quản trị và Ca thi
const INITIAL_LOGS: AuditLogItem[] = [
  {
    id: 'LOG_001',
    timestamp: '2026-10-29 21:45:10',
    actorName: 'Thầy Nguyễn Văn Nam',
    actorRole: 'instructor',
    action: 'Tạo phòng thi & điểm danh',
    category: 'EXAM',
    severity: 'INFO',
    ipAddress: '172.16.20.14',
    status: 'success',
    details: 'Đã tạo phòng thi mới [CS101tdD] cho lớp CS101 - Nhập môn Lập trình C/C++ (Chế độ Nghiêm ngặt).',
    payload: {
      roomCode: 'CS101tdD',
      durationMinutes: 120,
      classId: 'CS101',
      mode: 'Strict Lockdown Fullscreen + AI Proctoring',
      allowExternalDocs: false,
    },
  },
  {
    id: 'LOG_002',
    timestamp: '2026-10-29 21:40:22',
    actorName: 'SE184802 - Trần Thị Bình',
    actorRole: 'student',
    action: 'Cảnh báo vi phạm: Rời màn hình bài thi',
    category: 'SECURITY',
    severity: 'WARNING',
    ipAddress: '171.244.18.92',
    status: 'flagged',
    details: 'Thí sinh chuyển đổi cửa sổ ứng dụng (Alt+Tab / mất tiêu điểm bài thi 3 lần) trong giờ làm bài.',
    payload: {
      studentId: 'SE184802',
      roomCode: 'CS101tdD',
      event: 'WINDOW_BLUR_DETECTED',
      blurCount: 3,
      durationSeconds: 12,
    },
  },
  {
    id: 'LOG_003',
    timestamp: '2026-10-29 21:35:00',
    actorName: 'System AI Engine',
    actorRole: 'system',
    action: 'Cảnh báo AI: Phát hiện thiết bị di động',
    category: 'SECURITY',
    severity: 'CRITICAL',
    ipAddress: '172.16.20.88',
    status: 'flagged',
    details: 'AI Proctoring phát hiện smartphone xuất hiện trong khung hình webcam của thí sinh SE184805 tại ca thi CS101.',
    payload: {
      studentId: 'SE184805',
      confidence: 94.8,
      detectedObject: 'Cell Phone',
      roomCode: 'CS101tdD',
      snapshotUrl: '/uploads/snapshots/vio_cellphone_01.jpg',
    },
  },
  {
    id: 'LOG_004',
    timestamp: '2026-10-29 21:28:15',
    actorName: 'Admin Hệ thống',
    actorRole: 'admin',
    action: 'Cập nhật giới hạn Sandbox Chấm bài',
    category: 'SYSTEM',
    severity: 'INFO',
    ipAddress: '172.16.1.10',
    status: 'success',
    details: 'Điều chỉnh trần số lượng Docker Sandbox Worker đồng thời từ 3 lên 4 workers.',
    payload: {
      field: 'maxSandboxWorkers',
      oldValue: 3,
      newValue: 4,
    },
  },
  {
    id: 'LOG_005',
    timestamp: '2026-10-29 21:15:40',
    actorName: 'SE184820 - Guest',
    actorRole: 'student',
    action: 'Đăng nhập thất bại (Sai mật khẩu 3 lần)',
    category: 'AUTH',
    severity: 'WARNING',
    ipAddress: '118.69.182.55',
    status: 'failure',
    details: 'Tài khoản SE184820 đăng nhập thất bại 3 lần liên tiếp. Cảnh báo nguy cơ dò mật khẩu (Brute-force).',
    payload: {
      username: 'SE184820',
      attemptCount: 3,
      maxAllowed: 5,
    },
  },
  {
    id: 'LOG_006',
    timestamp: '2026-10-29 20:30:10',
    actorName: 'Cô Lê Thị Mai',
    actorRole: 'instructor',
    action: 'Tạo ca kiểm tra thực hành mở (Open-Book Lab)',
    category: 'EXAM',
    severity: 'INFO',
    ipAddress: '172.16.20.19',
    status: 'success',
    details: 'Giảng viên tạo phòng kiểm tra giữa kỳ [PRJ301jBK] cho phép sinh viên tra cứu tài liệu môn học.',
    payload: {
      roomCode: 'PRJ301jBK',
      classId: 'PRJ301',
      mode: 'Open-Book Flexible Quiz',
      allowExternalDocs: true,
      aiBypassHeadTurnCheck: true,
    },
  },
  {
    id: 'LOG_007',
    timestamp: '2026-10-29 02:00:00',
    actorName: 'System Scheduler',
    actorRole: 'system',
    action: 'Sao lưu cơ sở dữ liệu tự động',
    category: 'SYSTEM',
    severity: 'INFO',
    ipAddress: '127.0.0.1',
    status: 'success',
    details: 'Tạo thành công bản sao lưu định kỳ oculide_db_auto_20261029_0200.bak (Dung lượng 46.2 MB).',
    payload: {
      backupFile: 'oculide_db_auto_20261029_0200.bak',
      durationSeconds: 14,
      status: 'SUCCESS',
    },
  },
];

const INITIAL_BACKUPS: BackupItem[] = [
  {
    id: 'BK_001',
    filename: 'oculide_db_auto_20261029_0200.bak',
    createdAt: '2026-10-29 02:00:00',
    sizeMb: 46.2,
    type: 'auto',
    status: 'completed',
    checksum: 'sha256:8f2a1b9c7e3d...',
  },
  {
    id: 'BK_002',
    filename: 'oculide_db_manual_20261028_1830.bak',
    createdAt: '2026-10-28 18:30:15',
    sizeMb: 45.8,
    type: 'manual',
    status: 'completed',
    checksum: 'sha256:4a7e9b2c1d8f...',
  },
  {
    id: 'BK_003',
    filename: 'oculide_db_auto_20261028_0200.bak',
    createdAt: '2026-10-28 02:00:00',
    sizeMb: 45.1,
    type: 'auto',
    status: 'completed',
    checksum: 'sha256:1b3d5f7a9c2e...',
  },
];

export default function AdminSystemView() {
  const [activeTab, setActiveTab] = useState<'logs' | 'health' | 'settings' | 'backup'>('logs');

  // State Cấu hình (Settings)
  const [settings, setSettings] = useState<SystemSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(SYSTEM_STORAGE_SETTINGS_KEY);
        if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      } catch {
        // fallback
      }
    }
    return DEFAULT_SETTINGS;
  });

  // State Nhật ký (Logs)
  const [logs, setLogs] = useState<AuditLogItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(SYSTEM_STORAGE_LOGS_KEY);
        if (raw) return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    return INITIAL_LOGS;
  });

  // State Dịch vụ (Services Health)
  const [services, setServices] = useState<ServiceHealthItem[]>(INITIAL_SERVICES);
  const [isPinging, setIsPinging] = useState(false);

  // State Bản sao lưu (Backups)
  const [backups, setBackups] = useState<BackupItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(SYSTEM_STORAGE_BACKUPS_KEY);
        if (raw) return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    return INITIAL_BACKUPS;
  });
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  // Modal xem chi tiết Log
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Bộ lọc Log
  const [searchLog, setSearchLog] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Lưu Cấu hình
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem(SYSTEM_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    }
    showToast('Đã lưu thành công các tham số cấu hình hạ tầng hệ thống!');
  };

  // Khôi phục mặc định Cấu hình
  const handleResetSettings = () => {
    if (confirm('Bạn có chắc chắn muốn khôi phục toàn bộ cài đặt về mặc định của hệ thống?')) {
      setSettings(DEFAULT_SETTINGS);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SYSTEM_STORAGE_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      }
      showToast('Đã khôi phục cài đặt về mặc định!');
    }
  };

  // Thao tác Ping lại toàn bộ dịch vụ
  const handlePingServices = () => {
    setIsPinging(true);
    setTimeout(() => {
      setServices((prev) =>
        prev.map((s) => ({
          ...s,
          latencyMs: Math.floor(Math.random() * 30) + 15,
          lastChecked: 'Vừa xong',
        }))
      );
      setIsPinging(false);
      showToast('Kiểm tra kết nối toàn bộ dịch vụ thành công! Các dịch vụ đều hoạt động ổn định.');
    }, 800);
  };

  // Thao tác Tạo bản sao lưu ngay
  const handleCreateBackup = () => {
    setIsCreatingBackup(true);
    setTimeout(() => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
        now.getHours()
      )}${pad(now.getMinutes())}`;
      const newBk: BackupItem = {
        id: `BK_${Date.now().toString().slice(-4)}`,
        filename: `oculide_db_manual_${dateStr}.bak`,
        createdAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
          now.getHours()
        )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        sizeMb: 46.5,
        type: 'manual',
        status: 'completed',
        checksum: `sha256:${Math.random().toString(36).slice(2, 12)}...`,
      };

      const updated = [newBk, ...backups];
      setBackups(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SYSTEM_STORAGE_BACKUPS_KEY, JSON.stringify(updated));
      }
      setIsCreatingBackup(false);
      showToast(`Đã tạo thành công bản sao lưu thủ công ${newBk.filename}!`);
    }, 1200);
  };

  // Lọc Log theo tiêu chí
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        log.actorName.toLowerCase().includes(searchLog.toLowerCase()) ||
        log.action.toLowerCase().includes(searchLog.toLowerCase()) ||
        log.ipAddress.includes(searchLog) ||
        log.details.toLowerCase().includes(searchLog.toLowerCase());

      const matchSeverity = filterSeverity === 'all' || log.severity === filterSeverity;
      const matchCategory = filterCategory === 'all' || log.category === filterCategory;
      const matchRole = filterRole === 'all' || log.actorRole === filterRole;

      return matchSearch && matchSeverity && matchCategory && matchRole;
    });
  }, [logs, searchLog, filterSeverity, filterCategory, filterRole]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Module & Navigation Tabs */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Settings className="h-5 w-5" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Hệ Thống & Nhật Ký Quản Trị
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Kiểm toán an ninh thông tin, theo dõi trạng thái dịch vụ thời gian thực và quản lý hạ tầng vận hành Oculide.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === 'health' && (
              <button
                type="button"
                onClick={handlePingServices}
                disabled={isPinging}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${isPinging ? 'animate-spin' : ''}`} />
                <span>Kiểm tra kết nối</span>
              </button>
            )}

            {activeTab === 'backup' && (
              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
              >
                <Download className={`h-3.5 w-3.5 ${isCreatingBackup ? 'animate-bounce' : ''}`} />
                <span>{isCreatingBackup ? 'Đang tạo bản sao lưu...' : 'Tạo sao lưu ngay'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Tabs Điều hướng chính */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-100 pb-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>1. Nhật Ký Kiểm Toán (Audit Logs)</span>
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {logs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'health'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>2. Sức Khỏe Dịch Vụ (System Health)</span>
            <span className="ml-1 flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>3. Cấu Hình Hạ Tầng (Infrastructure Settings)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'backup'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <HardDrive className="h-4 w-4" />
            <span>4. Bản Sao Lưu & Bộ Nhớ (Backup & Storage)</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: NHẬT KÝ KIỂM TOÁN (AUDIT LOGS)                     */}
      {/* ========================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-5">
          {/* 4 Thẻ KPI tóm tắt sự kiện */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Tổng sự kiện ghi nhận</span>
              <p className="mt-2 text-2xl font-black text-slate-900">{logs.length} logs</p>
              <p className="mt-1 text-[11px] text-emerald-600 font-semibold">Tất cả dịch vụ đều ghi nhận</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Cảnh báo An ninh & Ca thi</span>
              <p className="mt-2 text-2xl font-black text-amber-600">
                {logs.filter((l) => l.severity === 'WARNING' || l.severity === 'CRITICAL').length} vụ việc
              </p>
              <p className="mt-1 text-[11px] text-amber-600 font-medium">Bao gồm rời màn hình & điện thoại</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Thời hạn lưu trữ Log</span>
              <p className="mt-2 text-2xl font-black text-indigo-600">{settings.auditLogRetentionDays} ngày</p>
              <p className="mt-1 text-[11px] text-slate-400">Tự động dọn sau mỗi học kỳ</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Tỷ lệ truy cập hợp lệ</span>
              <p className="mt-2 text-2xl font-black text-emerald-600">98.5%</p>
              <p className="mt-1 text-[11px] text-emerald-600 font-medium">Không phát hiện tấn công DDoS</p>
            </div>
          </div>

          {/* Thanh tìm kiếm & Bộ lọc nâng cao */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchLog}
                  onChange={(e) => setSearchLog(e.target.value)}
                  placeholder="Tìm theo tên tác nhân, hành động, địa chỉ IP (172.16...), mã phòng thi..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-[#f8fafc] pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-600 cursor-pointer"
                >
                  <option value="all">Tất cả danh mục</option>
                  <option value="AUTH">Xác thực (AUTH)</option>
                  <option value="EXAM">Quản lý Thi cử (EXAM)</option>
                  <option value="SYSTEM">Hệ thống (SYSTEM)</option>
                  <option value="SECURITY">An ninh & AI (SECURITY)</option>
                </select>

                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-600 cursor-pointer"
                >
                  <option value="all">Tất cả mức độ</option>
                  <option value="INFO">Thông tin (INFO)</option>
                  <option value="WARNING">Cảnh báo (WARNING)</option>
                  <option value="CRITICAL">Nghiêm trọng (CRITICAL)</option>
                  <option value="SECURITY">Bảo mật (SECURITY)</option>
                </select>

                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-600 cursor-pointer"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="admin">Admin</option>
                  <option value="instructor">Giảng viên</option>
                  <option value="student">Sinh viên</option>
                  <option value="system">Hệ thống</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bảng Dữ liệu Nhật ký */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Thời gian</th>
                    <th className="px-4 py-3.5">Tác nhân & Vai trò</th>
                    <th className="px-4 py-3.5">Hành động & Sự kiện</th>
                    <th className="px-4 py-3.5">Địa chỉ IP Mạng</th>
                    <th className="px-4 py-3.5">Mức độ</th>
                    <th className="px-4 py-3.5 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                        Không tìm thấy sự kiện nhật ký nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.timestamp}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{log.actorName}</div>
                          <span
                            className={`inline-block mt-0.5 rounded-full px-2 py-0.2 text-[10px] font-bold ${
                              log.actorRole === 'admin'
                                ? 'bg-purple-50 text-purple-700'
                                : log.actorRole === 'instructor'
                                ? 'bg-blue-50 text-blue-700'
                                : log.actorRole === 'system'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {log.actorRole.toUpperCase()}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{log.action}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[280px]">
                            {log.details}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                            <Globe className="h-3.5 w-3.5 text-slate-400" />
                            <span>{log.ipAddress}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Client IP
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              log.severity === 'INFO'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : log.severity === 'WARNING'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : log.severity === 'CRITICAL'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {log.severity}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Xem Payload</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: SỨC KHỎE DỊCH VỤ (SYSTEM HEALTH)                    */}
      {/* ========================================================= */}
      {activeTab === 'health' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  Tất cả 5 dịch vụ lõi đang vận hành ổn định
                </h3>
                <p className="text-xs text-emerald-700">
                  Không có sự cố gián đoạn kết nối hay nghẽn hàng đợi chấm bài trong 24 giờ qua.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Realtime Active
            </span>
          </div>

          {/* Lưới danh sách 5 dịch vụ cốt lõi */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        {svc.id === 'backend_api' ? (
                          <Server className="h-4 w-4" />
                        ) : svc.id === 'code_sandbox' ? (
                          <Terminal className="h-4 w-4" />
                        ) : svc.id === 'livekit_media' ? (
                          <Radio className="h-4 w-4" />
                        ) : svc.id === 'database' ? (
                          <Database className="h-4 w-4" />
                        ) : (
                          <Activity className="h-4 w-4" />
                        )}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {svc.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {svc.category}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      HEALTHY
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                    {svc.description}
                  </p>

                  {/* Các chỉ số hiệu năng Metrics */}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[#f8fafc] p-2.5">
                    {svc.metrics.map((m, idx) => (
                      <div key={idx} className="text-center">
                        <span className="block text-[10px] font-semibold text-slate-400">
                          {m.label}
                        </span>
                        <span className="mt-0.5 block text-xs font-extrabold text-slate-800">
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                  <span>
                    Độ trễ: <strong className="text-slate-700">{svc.latencyMs} ms</strong>
                  </span>
                  <span>
                    Uptime: <strong className="text-emerald-600">{svc.uptimePercent}%</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CẤU HÌNH HẠ TẦNG (INFRASTRUCTURE SETTINGS)          */}
      {/* ========================================================= */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* 1. Giới hạn Hạ tầng & Bảo vệ Máy chủ */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 mb-5">
                <Cpu className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">1. Giới Hạn Hạ Tầng Máy Chủ</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dung lượng file code tối đa (Max File Size)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={settings.maxCodeFileSizeMb}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          maxCodeFileSizeMb: parseInt(e.target.value, 10),
                        })
                      }
                      className="flex-1 accent-blue-600 cursor-pointer"
                    />
                    <span className="w-16 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-center font-mono text-xs font-bold text-slate-800">
                      {settings.maxCodeFileSizeMb} MB
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Ngăn chặn sinh viên upload các file rác khổng lồ làm đầy bộ nhớ máy chủ.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số Sandbox Worker đồng thời tối đa
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={2}
                      max={8}
                      step={1}
                      value={settings.maxSandboxWorkers}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          maxSandboxWorkers: parseInt(e.target.value, 10),
                        })
                      }
                      className="flex-1 accent-blue-600 cursor-pointer"
                    />
                    <span className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-center font-mono text-xs font-bold text-slate-800">
                      {settings.maxSandboxWorkers} workers
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Giới hạn số container Docker chạy song song để tránh quá tải CPU của trường.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Băng thông Video tối đa mỗi luồng (Bitrate Cap / Stream)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={150}
                      max={800}
                      step={50}
                      value={settings.maxLiveKitBitrateKbps}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          maxLiveKitBitrateKbps: parseInt(e.target.value, 10),
                        })
                      }
                      className="flex-1 accent-blue-600 cursor-pointer"
                    />
                    <span className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-center font-mono text-xs font-bold text-slate-800">
                      {settings.maxLiveKitBitrateKbps} kbps
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Khống chế trần bitrate LiveKit cho mỗi luồng (màn hình / webcam) để tránh nghẽn Wifi phòng thi khi cả lớp cùng phát video.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tự động xóa bản nháp code cũ (Auto-cleanup)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={7}
                      max={90}
                      value={settings.autoCleanupDraftsDays}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          autoCleanupDraftsDays: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none"
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap">ngày sau khi thi</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Dọn dẹp bảng CodeDrafts của các ca thi đã kết thúc để tối ưu ổ cứng.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thời hạn lưu trữ nhật ký kiểm toán (Log Retention)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={30}
                      max={180}
                      step={30}
                      value={settings.auditLogRetentionDays}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          auditLogRetentionDays: parseInt(e.target.value, 10),
                        })
                      }
                      className="flex-1 accent-blue-600 cursor-pointer"
                    />
                    <span className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-center font-mono text-xs font-bold text-slate-800">
                      {settings.auditLogRetentionDays} ngày
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Tự động dọn dẹp các bản ghi log cũ hơn 1 học kỳ (90 - 180 ngày) để bảo vệ hiệu năng máy chủ.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Tích hợp Dịch vụ & Kết nối Trường học */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 mb-5">
                <Globe className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">2. Tích Hợp Dịch Vụ & Mạng</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Máy chủ Streaming (LiveKit Server URL)
                  </label>
                  <input
                    type="text"
                    value={settings.livekitServerUrl}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        livekitServerUrl: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-800 outline-none"
                    placeholder="wss://livekit.domain.edu.vn"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Endpoint WebRTC phục vụ truyền webcam thời gian thực.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Máy chủ Gửi Email Khôi Phục (SMTP Host)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={settings.smtpHost}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          smtpHost: e.target.value,
                        })
                      }
                      className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-800 outline-none"
                      placeholder="smtp.school.edu.vn"
                    />
                    <input
                      type="number"
                      value={settings.smtpPort}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          smtpPort: parseInt(e.target.value, 10),
                        })
                      }
                      className="rounded-xl border border-slate-200 px-2 py-2 font-mono text-xs text-slate-800 outline-none text-center"
                      placeholder="587"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Người Gửi Hệ Thống (Sender Email)
                  </label>
                  <input
                    type="email"
                    value={settings.smtpSenderEmail}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        smtpSenderEmail: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none"
                    placeholder="noreply@oculide.edu.vn"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên miền Email trường được phép đăng ký
                  </label>
                  <input
                    type="text"
                    value={settings.allowedEmailDomain}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        allowedEmailDomain: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-800 outline-none"
                    placeholder="@school.edu.vn"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Chỉ cho phép tài khoản có đuôi email này đăng nhập vào hệ thống trường.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Chính sách Bảo mật & Vận hành */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 mb-5">
                <Lock className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">3. Bảo Mật & Vận Hành</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đăng nhập sai tối đa trước khi khóa
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={10}
                    value={settings.maxLoginAttempts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxLoginAttempts: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Tự động khóa tạm 15 phút nếu nhập sai quá số lần quy định để chống Brute-force.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thời hạn Access Token phiên làm việc
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={15}
                      max={180}
                      step={15}
                      value={settings.jwtTokenExpiryMinutes}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          jwtTokenExpiryMinutes: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none"
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap">phút</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Hết hạn token sẽ yêu cầu cấp lại phiên để đảm bảo an toàn phiên làm việc.
                  </p>
                </div>

                {/* Chế độ Bảo trì */}
                <div
                  className={`rounded-xl border p-3.5 transition ${
                    settings.maintenanceMode
                      ? 'border-red-200 bg-red-50/70'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Chế độ Bảo trì Hệ thống
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Tạm khóa đăng nhập đối với Sinh viên & Giảng viên. Admin vẫn đăng nhập bình thường tại trang /login để tắt bảo trì bất cứ lúc nào.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.maintenanceMode}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          maintenanceMode: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded text-red-600 cursor-pointer"
                    />
                  </div>

                  {settings.maintenanceMode && (
                    <div className="mt-3 space-y-2 border-t border-red-200/60 pt-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>Cổng an toàn: Admin luôn có thể đăng nhập bình thường tại trang /login để tắt chế độ bảo trì này.</span>
                      </div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Thông báo hiển thị cho người dùng khi đăng nhập
                      </label>
                      <textarea
                        rows={2}
                        value={settings.maintenanceMessage}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            maintenanceMessage: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-red-200 bg-white p-2 text-xs text-slate-800 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cụm nút Lưu & Khôi phục */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetSettings}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Khôi phục mặc định</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Lưu Cấu Hình Hạ Tầng</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* TAB 4: BẢN SAO LƯU & BỘ NHỚ (BACKUP & STORAGE)             */}
      {/* ========================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Thống kê dung lượng ổ cứng lưu trữ */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">
              Phân bổ Dung lượng Lưu trữ Hệ thống (Storage Quota)
            </h3>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="space-y-2 rounded-xl border border-slate-100 bg-[#f8fafc] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Mã nguồn bài nộp (Code)</span>
                  <span className="font-mono text-slate-500">1.2 GB / 50 GB (2.4%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '2.4%' }} />
                </div>
                <p className="text-[11px] text-slate-400">Các file .cpp, .java, .py của sinh viên.</p>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-100 bg-[#f8fafc] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Ảnh Bằng chứng AI Proctoring</span>
                  <span className="font-mono text-slate-500">14.8 GB / 100 GB (14.8%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: '14.8%' }} />
                </div>
                <p className="text-[11px] text-slate-400">Ảnh chụp webcam khi phát hiện gian lận.</p>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-100 bg-[#f8fafc] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Cơ sở Dữ liệu & Nhật ký</span>
                  <span className="font-mono text-slate-500">128 MB / 10 GB (1.28%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: '1.28%' }} />
                </div>
                <p className="text-[11px] text-slate-400">Bảng dữ liệu người dùng, ca thi, audit logs.</p>
              </div>
            </div>
          </div>

          {/* Bảng Danh sách Bản sao lưu */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Lịch Sử Các Bản Sao Lưu (Database Backups)
                </h3>
                <p className="text-xs text-slate-500">
                  Hệ thống tự động sao lưu toàn bộ cơ sở dữ liệu vào lúc 02:00 AM mỗi ngày.
                </p>
              </div>

              <span className="text-xs font-semibold text-slate-500">
                Tổng cộng: <strong className="text-slate-800">{backups.length} bản sao lưu</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Tên file sao lưu</th>
                    <th className="px-4 py-3">Thời gian tạo</th>
                    <th className="px-4 py-3">Dung lượng</th>
                    <th className="px-4 py-3">Loại sao lưu</th>
                    <th className="px-4 py-3">Mã Checksum</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {backups.map((bk) => (
                    <tr key={bk.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 flex items-center gap-2">
                        <Database className="h-4 w-4 text-slate-400" />
                        <span>{bk.filename}</span>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {bk.createdAt}
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {bk.sizeMb} MB
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            bk.type === 'auto'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {bk.type === 'auto' ? 'Tự động 02:00' : 'Thủ công'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[10px] text-slate-400">
                        {bk.checksum}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            showToast(`Đang tải xuống bản sao lưu ${bk.filename}...`)
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5 text-blue-600" />
                          <span>Tải về</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL XEM CHI TIẾT PAYLOAD CỦA LOG                         */}
      {/* ========================================================= */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-bold">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Chi Tiết Bản Ghi Nhật Ký [{selectedLog.id}]
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedLog.timestamp}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-[#f8fafc] p-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Tác nhân:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedLog.actorName}</div>
                  <span className="text-[10px] text-blue-600 font-mono font-bold">
                    Vai trò: {selectedLog.actorRole.toUpperCase()}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Hành động:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedLog.action}</div>
                  <span className="text-[10px] text-emerald-600 font-mono font-bold">
                    Mức độ: {selectedLog.severity}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Địa chỉ IP kết nối:</span>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {selectedLog.ipAddress}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    IPv4 Client Address
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Thời gian ghi nhận:</span>
                  <div className="font-mono font-medium text-slate-900 mt-0.5">{selectedLog.timestamp}</div>
                  <span className="text-[10px] text-purple-700 font-mono font-bold">
                    Log ID: {selectedLog.id}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mô tả sự kiện:
                </span>
                <p className="rounded-xl border border-slate-100 bg-white p-3 text-xs text-slate-700 leading-relaxed">
                  {selectedLog.details}
                </p>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1.5">
                  Dữ liệu Payload kỹ thuật (JSON):
                </span>
                <pre className="max-h-48 overflow-y-auto rounded-xl bg-slate-900 p-4 font-mono text-xs text-emerald-400 leading-relaxed">
                  {JSON.stringify(selectedLog.payload || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
