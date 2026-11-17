'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  LogIn,
  KeyRound,
  GraduationCap,
  Layers,
  Clock,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { fetchWithAuth } from '@/services/apiClient';
import {
  AuditLogItem,
  AuditLogCategory,
  ServiceHealthItem,
  SystemSettings,
  BackupItem,
  StorageStats,
  SYSTEM_STORAGE_SETTINGS_KEY,
  SYSTEM_STORAGE_LOGS_KEY,
  SYSTEM_STORAGE_BACKUPS_KEY,
} from './types';

// ==========================================
// HÀM TIỆN ÍCH CHUYỂN ĐỔI VÀ PHÂN LOẠI DỮ LIỆU LOG
// ==========================================

function formatTimestamp(dtStr?: string | null): string {
  if (!dtStr) return 'Vừa xong';
  try {
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return String(dtStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return String(dtStr);
  }
}

function inferCategory(module: string, message: string): AuditLogCategory {
  const upper = (module + ' ' + message).toUpperCase();
  // 1. Khu vực Đăng nhập & Xác thực
  if (
    upper.includes('LOGIN') ||
    upper.includes('AUTH_LOGIN') ||
    upper.includes('DANG NHAP') ||
    upper.includes('DANG XUAT') ||
    upper.includes('LOGOUT')
  ) {
    return 'LOGIN';
  }
  // 2. Khu vực Đổi mật khẩu & Quản lý Tài khoản
  if (
    upper.includes('PASSWORD') ||
    upper.includes('AUTH_PASSWORD') ||
    upper.includes('MAT KHAU') ||
    upper.includes('DOI MAT KHAU') ||
    upper.includes('RESET') ||
    upper.includes('USER_MGMT') ||
    upper.includes('ADMIN_USER') ||
    upper.includes('TAI KHOAN')
  ) {
    return 'PASSWORD';
  }
  // 3. Khu vực Sao lưu & Dữ liệu CSDL
  if (
    upper.includes('BACKUP') ||
    upper.includes('SAO LUU') ||
    upper.includes('PHUC HOI') ||
    upper.includes('RESTORE') ||
    upper.includes('DATABASE')
  ) {
    return 'BACKUP';
  }
  // 4. Khu vực Cảnh báo An ninh Hệ thống (Brute-force, Domain, Khóa tài khoản)
  if (
    upper.includes('BRUTE') ||
    upper.includes('DO MAT KHAU') ||
    upper.includes('THAT BAI') ||
    upper.includes('TU CHOI') ||
    upper.includes('DOMAIN') ||
    upper.includes('AUTH_REGISTER') ||
    upper.includes('SECURITY')
  ) {
    return 'SECURITY';
  }
  // 5. Khu vực Cấu hình & Tham số Hạ tầng
  return 'SETTINGS';
}

function getCategoryMeta(cat: AuditLogCategory) {
  switch (cat) {
    case 'LOGIN':
      return {
        label: 'Đăng nhập & Phiên',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
        badgeIcon: LogIn,
        dotColor: 'bg-emerald-500',
        description: 'Lịch sử đăng nhập, đăng xuất và phiên làm việc tài khoản',
      };
    case 'PASSWORD':
      return {
        label: 'Mật khẩu & Tài khoản',
        badgeColor: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
        badgeIcon: KeyRound,
        dotColor: 'bg-violet-500',
        description: 'Đổi mật khẩu, đặt lại mật khẩu, phân quyền và khóa tài khoản',
      };
    case 'SETTINGS':
    case 'SYSTEM':
      return {
        label: 'Cấu hình Hạ tầng',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
        badgeIcon: Sliders,
        dotColor: 'bg-blue-500',
        description: 'Cập nhật tham số hệ thống, sandbox và chế độ bảo trì',
      };
    case 'BACKUP':
      return {
        label: 'Sao lưu & CSDL',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
        badgeIcon: HardDrive,
        dotColor: 'bg-amber-500',
        description: 'Tạo, tải về và xóa bản sao lưu cơ sở dữ liệu SQL Server',
      };
    case 'SECURITY':
      return {
        label: 'An ninh Hệ thống',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
        badgeIcon: ShieldAlert,
        dotColor: 'bg-rose-500',
        description: 'Cảnh báo dò mật khẩu, từ chối email sai miền và khóa truy cập',
      };
    default:
      return {
        label: 'Hệ thống',
        badgeColor: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10',
        badgeIcon: Activity,
        dotColor: 'bg-slate-500',
        description: 'Nhật ký chung hệ thống',
      };
  }
}

function mapSeverity(level?: string | null): 'INFO' | 'WARNING' | 'CRITICAL' | 'SECURITY' {
  const upper = (level || 'INFO').toUpperCase();
  if (upper === 'CRITICAL' || upper === 'ERROR') return 'CRITICAL';
  if (upper === 'WARNING') return 'WARNING';
  if (upper === 'SECURITY') return 'SECURITY';
  return 'INFO';
}

function mapRole(role?: string | null): 'admin' | 'instructor' | 'student' | 'system' {
  const lower = (role || '').toLowerCase();
  if (lower === 'admin') return 'admin';
  if (lower === 'instructor') return 'instructor';
  if (lower === 'student') return 'student';
  return 'system';
}

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

  // 2. Tên miền trường
  allowedEmailDomain: '@school.edu.vn',

  // 3. Bảo mật & Vận hành
  maxLoginAttempts: 5,
  jwtTokenExpiryMinutes: 60,
  maintenanceMode: false,
  maintenanceMessage: 'Hệ thống Oculide đang được bảo trì định kỳ bởi Trung tâm CNTT. Vui lòng quay lại sau ít phút.',

  // 4. Thời gian & Chính sách Sao lưu
  backupScheduleEnabled: true,
  backupFrequency: 'daily',
  backupTime: '02:00',
  backupOnMaintenance: true,
  backupRetentionDays: 30,
  backupMaxCopies: 10,
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

// NHẬT KÝ KIỂM TOÁN CHUẨN ADMIN: Chỉ ghi nhận sự kiện An ninh hệ thống, Đăng nhập, Mật khẩu, Cấu hình và Sao lưu CSDL
const INITIAL_LOGS: AuditLogItem[] = [
  {
    id: 'LOG_001',
    timestamp: '2026-10-29 21:28:15',
    actorName: 'admin',
    actorRole: 'admin',
    action: 'Cập nhật giới hạn Sandbox Chấm bài',
    category: 'SETTINGS',
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
    id: 'LOG_002',
    timestamp: '2026-10-29 21:20:00',
    actorName: 'admin',
    actorRole: 'admin',
    action: 'Kích hoạt Chế độ bảo trì hệ thống',
    category: 'SETTINGS',
    severity: 'WARNING',
    ipAddress: '172.16.1.10',
    status: 'flagged',
    details: 'Bật chế độ bảo trì hạ tầng phục vụ nâng cấp máy chủ chấm thi.',
    payload: {
      maintenanceMode: true,
      maintenanceMessage: 'Hệ thống đang được bảo trì định kỳ bởi Trung tâm CNTT.',
    },
  },
  {
    id: 'LOG_003',
    timestamp: '2026-10-29 21:15:40',
    actorName: 'SE184820',
    actorRole: 'student',
    action: 'Cảnh báo dò mật khẩu (Sai 3 lần)',
    category: 'SECURITY',
    severity: 'WARNING',
    ipAddress: '118.69.182.55',
    status: 'flagged',
    details: 'Tài khoản SE184820 đăng nhập thất bại 3 lần liên tiếp. Cảnh báo nguy cơ dò mật khẩu (Brute-force).',
    payload: {
      username: 'SE184820',
      attemptCount: 3,
      maxAllowed: 5,
    },
  },
  {
    id: 'LOG_004',
    timestamp: '2026-10-29 20:45:00',
    actorName: 'admin',
    actorRole: 'admin',
    action: 'Thay đổi tham số thời hạn JWT Token',
    category: 'SETTINGS',
    severity: 'INFO',
    ipAddress: '172.16.1.10',
    status: 'success',
    details: 'Cập nhật thời hạn sống của JSON Web Token từ 60 phút lên 120 phút.',
    payload: {
      field: 'jwtTokenExpiryMinutes',
      oldValue: 60,
      newValue: 120,
    },
  },
  {
    id: 'LOG_005',
    timestamp: '2026-10-29 20:12:10',
    actorName: 'Guest User',
    actorRole: 'system',
    action: 'Từ chối đăng ký tài khoản (Sai tên miền)',
    category: 'SECURITY',
    severity: 'WARNING',
    ipAddress: '14.161.35.88',
    status: 'failure',
    details: 'Từ chối đăng ký với email cá nhân "@gmail.com". Tên miền không thuộc cấu hình cho phép (@dtu.edu.vn).',
    payload: {
      attemptedEmail: 'student_test@gmail.com',
      allowedDomain: '@dtu.edu.vn',
    },
  },
  {
    id: 'LOG_006',
    timestamp: '2026-10-29 18:30:20',
    actorName: 'admin',
    actorRole: 'admin',
    action: 'Đặt lại mật khẩu cho người dùng',
    category: 'PASSWORD',
    severity: 'WARNING',
    ipAddress: '127.0.0.1',
    status: 'success',
    details: 'Quản trị viên đã đặt lại mật khẩu ngẫu nhiên cho giảng viên MSGV001 và gửi thông tin về email.',
    payload: {
      targetUser: 'instructor',
      action: 'ADMIN_RESET_PASSWORD',
    },
  },
  {
    id: 'LOG_007',
    timestamp: '2026-10-29 14:10:05',
    actorName: 'Nguyễn Văn An',
    actorRole: 'student',
    action: 'Đổi mật khẩu người dùng',
    category: 'PASSWORD',
    severity: 'INFO',
    ipAddress: '171.244.18.92',
    status: 'success',
    details: 'Người dùng sinh viên đổi mật khẩu cá nhân thành công qua cổng dịch vụ tài khoản.',
    payload: {
      username: 'student',
      action: 'USER_CHANGE_PASSWORD',
    },
  },
  {
    id: 'LOG_008',
    timestamp: '2026-10-29 02:00:00',
    actorName: 'System Scheduler',
    actorRole: 'system',
    action: 'Sao lưu cơ sở dữ liệu tự động',
    category: 'BACKUP',
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
  {
    id: 'LOG_009',
    timestamp: '2026-10-29 08:30:15',
    actorName: 'admin',
    actorRole: 'admin',
    action: 'Đăng nhập hệ thống thành công',
    category: 'LOGIN',
    severity: 'INFO',
    ipAddress: '127.0.0.1',
    status: 'success',
    details: 'Quản trị viên đăng nhập thành công vào bảng điều khiển hệ thống Oculide.',
    payload: {
      role: 'admin',
      authMethod: 'PASSWORD_HASH_JWT',
    },
  },
];

const INITIAL_BACKUPS: BackupItem[] = [];

export default function AdminSystemView() {
  const [activeTab, setActiveTab] = useState<'logs' | 'health' | 'settings' | 'backup'>('logs');

  // State Cấu hình (Settings)
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // State Nhật ký (Logs)
  const [logs, setLogs] = useState<AuditLogItem[]>(INITIAL_LOGS);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [totalDbLogs, setTotalDbLogs] = useState(0);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // State Dịch vụ (Services Health)
  const [services, setServices] = useState<ServiceHealthItem[]>(INITIAL_SERVICES);
  const [isPinging, setIsPinging] = useState(false);

  // State Thống kê lưu trữ
  const [storageStats, setStorageStats] = useState<StorageStats>({
    submissions_count: 0,
    violations_count: 0,
    logs_count: 0,
    users_count: 0,
    counts: { submissions_count: 0, violations_count: 0, logs_count: 0, users_count: 0 },
    disk: { total_gb: 100, used_gb: 20, free_gb: 80, used_percent: 20 },
  });

  // State Bản sao lưu (Backups)
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isCleaningUpBackups, setIsCleaningUpBackups] = useState(false);
  const [isSavingBackupPolicy, setIsSavingBackupPolicy] = useState(false);

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

  // Tải danh sách nhật ký từ CSDL Backend
  const loadSystemLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetchWithAuth<any>('/api/v1/system-logs?skip=0&limit=300');
      if (res && Array.isArray(res.items)) {
        const mapped: AuditLogItem[] = res.items.map((item: any) => {
          const sev = mapSeverity(item.log_level);
          return {
            id: `LOG_${String(item.log_id).padStart(4, '0')}`,
            timestamp: formatTimestamp(item.created_at),
            actorName: item.actor_name || item.username || (item.user_id ? `User #${item.user_id}` : 'Hệ thống'),
            actorRole: mapRole(item.actor_role),
            action: item.module || 'Hành động hệ thống',
            category: inferCategory(item.module || '', item.message || ''),
            severity: sev,
            ipAddress: item.ip_address || '127.0.0.1',
            status: sev === 'CRITICAL' ? 'failure' : sev === 'WARNING' || sev === 'SECURITY' ? 'flagged' : 'success',
            details: item.message || '',
            payload: item.extra_data || undefined,
          };
        });
        setLogs(mapped);
        setTotalDbLogs(res.total ?? mapped.length);
      }
    } catch (err) {
      console.error('Lỗi khi tải nhật ký hệ thống từ backend:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Kiểm tra thời gian thực sức khỏe toàn bộ các dịch vụ
  const loadSystemHealth = async () => {
    setIsPinging(true);
    try {
      const res = await fetchWithAuth<{ overall_status: string; services: ServiceHealthItem[] }>(
        '/api/v1/admin/system/health'
      );
      if (res && Array.isArray(res.services)) {
        setServices(res.services);
        showToast('Đã kiểm tra và cập nhật trạng thái các dịch vụ hệ thống!');
      }
    } catch (err) {
      console.error('Lỗi khi kiểm tra sức khỏe hệ thống:', err);
    } finally {
      setIsPinging(false);
    }
  };

  // Tải danh sách bản sao lưu thực tế từ đĩa cứng máy chủ
  const loadBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await fetchWithAuth<any>('/api/v1/admin/system/backups');
      if (res && Array.isArray(res.backups)) {
        const mapped: BackupItem[] = res.backups.map((b: any) => ({
          id: b.id,
          filename: b.filename,
          createdAt: b.created_at,
          sizeMb: b.size_mb,
          type: b.type,
          status: 'completed',
          checksum: b.checksum,
        }));
        setBackups(mapped);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách bản sao lưu:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  // Tải cấu hình hạ tầng thực tế từ Backend
  const loadSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const data = await fetchWithAuth<any>('/api/v1/admin/system/settings');
      if (data) {
        setSettings({
          maxCodeFileSizeMb: data.max_code_file_size_mb ?? 2,
          maxSandboxWorkers: data.max_sandbox_workers ?? 4,
          maxLiveKitBitrateKbps: data.max_livekit_bitrate_kbps ?? 350,
          autoCleanupDraftsDays: data.auto_cleanup_drafts_days ?? 30,
          auditLogRetentionDays: data.audit_log_retention_days ?? 90,
          allowedEmailDomain: data.allowed_email_domain ?? '@school.edu.vn',
          maxLoginAttempts: data.max_login_attempts ?? 5,
          jwtTokenExpiryMinutes: data.jwt_token_expiry_minutes ?? 60,
          maintenanceMode: Boolean(data.maintenance_mode),
          maintenanceMessage: data.maintenance_message ?? '',
          backupScheduleEnabled: data.backup_schedule_enabled ?? true,
          backupFrequency: data.backup_frequency ?? 'daily',
          backupTime: data.backup_time ?? '02:00',
          backupOnMaintenance: data.backup_on_maintenance ?? true,
          backupRetentionDays: data.backup_retention_days ?? 30,
          backupMaxCopies: data.backup_max_copies ?? 10,
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải cấu hình hệ thống:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // Lấy số liệu phân bổ lưu trữ thực tế từ CSDL và ổ cứng máy chủ
  const loadStorageMetrics = async () => {
    try {
      const res = await fetchWithAuth<any>('/api/v1/admin/system/storage');
      if (res) {
        setStorageStats({
          submissions_count: res.submissions_count || 0,
          violations_count: res.violations_count || 0,
          logs_count: res.logs_count || 0,
          users_count: res.users_count || 0,
          counts: res.counts || {
            submissions_count: res.submissions_count || 0,
            violations_count: res.violations_count || 0,
            logs_count: res.logs_count || 0,
            users_count: res.users_count || 0,
          },
          disk: res.disk || { total_gb: 100, used_gb: 20, free_gb: 80, used_percent: 20 },
        });
      }
    } catch (err) {
      console.error('Lỗi khi lấy thông tin lưu trữ:', err);
    }
  };

  useEffect(() => {
    loadSystemLogs();
    loadSystemHealth();
    loadStorageMetrics();
    loadSettings();
    loadBackups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lưu Cấu hình thực tế lên máy chủ
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const payload = {
        max_code_file_size_mb: settings.maxCodeFileSizeMb,
        max_sandbox_workers: settings.maxSandboxWorkers,
        max_livekit_bitrate_kbps: settings.maxLiveKitBitrateKbps,
        auto_cleanup_drafts_days: settings.autoCleanupDraftsDays,
        audit_log_retention_days: settings.auditLogRetentionDays,
        allowed_email_domain: settings.allowedEmailDomain,
        max_login_attempts: settings.maxLoginAttempts,
        jwt_token_expiry_minutes: settings.jwtTokenExpiryMinutes,
        maintenance_mode: settings.maintenanceMode,
        maintenance_message: settings.maintenanceMessage,
        backup_schedule_enabled: settings.backupScheduleEnabled,
        backup_frequency: settings.backupFrequency,
        backup_time: settings.backupTime,
        backup_on_maintenance: settings.backupOnMaintenance,
        backup_retention_days: settings.backupRetentionDays,
        backup_max_copies: settings.backupMaxCopies,
      };

      const res = await fetchWithAuth<any>('/api/v1/admin/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res) {
        showToast('Đã lưu thành công các tham số cấu hình hạ tầng hệ thống vào máy chủ!');
        loadSystemLogs();
        loadSystemHealth();
        loadBackups();
      }
    } catch (err) {
      console.error('Không thể lưu cấu hình:', err);
      showToast('Lỗi khi lưu cấu hình hạ tầng lên máy chủ!');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Lưu nhanh Chính sách sao lưu từ Tab Sao lưu
  const handleSaveBackupPolicy = async () => {
    setIsSavingBackupPolicy(true);
    try {
      const payload = {
        max_code_file_size_mb: settings.maxCodeFileSizeMb,
        max_sandbox_workers: settings.maxSandboxWorkers,
        max_livekit_bitrate_kbps: settings.maxLiveKitBitrateKbps,
        auto_cleanup_drafts_days: settings.autoCleanupDraftsDays,
        audit_log_retention_days: settings.auditLogRetentionDays,
        allowed_email_domain: settings.allowedEmailDomain,
        max_login_attempts: settings.maxLoginAttempts,
        jwt_token_expiry_minutes: settings.jwtTokenExpiryMinutes,
        maintenance_mode: settings.maintenanceMode,
        maintenance_message: settings.maintenanceMessage,
        backup_schedule_enabled: settings.backupScheduleEnabled,
        backup_frequency: settings.backupFrequency,
        backup_time: settings.backupTime,
        backup_on_maintenance: settings.backupOnMaintenance,
        backup_retention_days: settings.backupRetentionDays,
        backup_max_copies: settings.backupMaxCopies,
      };

      const res = await fetchWithAuth<any>('/api/v1/admin/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res) {
        showToast('Đã lưu thành công chính sách thời gian & thời hạn lưu trữ sao lưu!');
        await loadBackups();
        loadSystemLogs();
      }
    } catch (err) {
      console.error('Không thể lưu chính sách sao lưu:', err);
      showToast('Lỗi khi lưu chính sách sao lưu!');
    } finally {
      setIsSavingBackupPolicy(false);
    }
  };

  // Dọn dẹp bản sao lưu quá hạn chủ động
  const handleCleanupBackups = async () => {
    setIsCleaningUpBackups(true);
    try {
      const res = await fetchWithAuth<any>('/api/v1/admin/system/backups/cleanup', {
        method: 'POST',
      });
      if (res) {
        showToast(res.message || 'Đã dọn dẹp các bản sao lưu quá hạn thành công!');
        await loadBackups();
        loadStorageMetrics();
        loadSystemLogs();
      }
    } catch (err) {
      console.error('Lỗi khi dọn dẹp sao lưu:', err);
      showToast('Lỗi khi kích hoạt dọn dẹp sao lưu!');
    } finally {
      setIsCleaningUpBackups(false);
    }
  };

  // Khôi phục mặc định Cấu hình
  const handleResetSettings = async () => {
    if (confirm('Bạn có chắc chắn muốn khôi phục toàn bộ cài đặt về mặc định của hệ thống?')) {
      try {
        await fetchWithAuth('/api/v1/admin/system/settings/reset', {
          method: 'POST',
        });
        await loadSettings();
        loadSystemLogs();
        showToast('Đã khôi phục cài đặt hạ tầng về mặc định an toàn!');
      } catch (err) {
        console.error('Lỗi khi khôi phục cài đặt:', err);
        showToast('Lỗi khi khôi phục cài đặt hạ tầng!');
      }
    }
  };

  // Thao tác Ping lại toàn bộ dịch vụ
  const handlePingServices = () => {
    loadSystemHealth();
  };

  // Thao tác Tạo bản sao lưu thực tế
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const res = await fetchWithAuth<any>('/api/v1/admin/system/backups', {
        method: 'POST',
      });
      if (res && res.backup) {
        showToast(`Đã tạo thành công bản sao lưu CSDL ${res.backup.filename}!`);
        await loadBackups();
        loadSystemLogs();
        loadStorageMetrics();
      }
    } catch (err: any) {
      console.error('Lỗi khi tạo bản sao lưu:', err);
      showToast('Lỗi khi tạo bản sao lưu CSDL trên máy chủ!');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Tải tệp bản sao lưu thật về máy tính
  const handleDownloadBackup = async (filename: string) => {
    try {
      showToast(`Đang chuẩn bị tải về ${filename}...`);
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      const downloadUrl = `/api/v1/admin/system/backups/${encodeURIComponent(filename)}/download`;
      
      const response = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        showToast(`Không thể tải tệp ${filename}!`);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi tải tệp sao lưu:', err);
      showToast(`Lỗi khi tải file ${filename}!`);
    }
  };

  // Xóa tệp bản sao lưu thật trên máy chủ
  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tệp sao lưu ${filename} khỏi ổ đĩa máy chủ?`)) {
      return;
    }
    try {
      await fetchWithAuth(`/api/v1/admin/system/backups/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      showToast(`Đã xóa tệp sao lưu ${filename} thành công!`);
      await loadBackups();
      loadSystemLogs();
      loadStorageMetrics();
    } catch (err) {
      console.error('Lỗi khi xóa bản sao lưu:', err);
      showToast(`Lỗi khi xóa tệp ${filename}!`);
    }
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
      const matchCategory =
        filterCategory === 'all' ||
        log.category === filterCategory ||
        (filterCategory === 'SETTINGS' && log.category === 'SYSTEM');
      const matchRole = filterRole === 'all' || log.actorRole === filterRole;

      return matchSearch && matchSeverity && matchCategory && matchRole;
    });
  }, [logs, searchLog, filterSeverity, filterCategory, filterRole]);

  // Reset về trang 1 khi đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchLog, filterSeverity, filterCategory, filterRole]);

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

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
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-7 dark:border-white/10 dark:bg-[#141824]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Settings className="h-5 w-5" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Hệ Thống & Nhật Ký Quản Trị
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Kiểm toán an ninh thông tin, theo dõi trạng thái dịch vụ thời gian thực và quản lý hạ tầng vận hành Oculide.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === 'logs' && (
              <button
                type="button"
                onClick={loadSystemLogs}
                disabled={isLoadingLogs}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                <span>{isLoadingLogs ? 'Đang tải...' : 'Làm mới'}</span>
              </button>
            )}

            {activeTab === 'health' && (
              <button
                type="button"
                onClick={handlePingServices}
                disabled={isPinging}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition dark:hover:bg-white/5 cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-100 dark:border-white/10 pb-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>1. Nhật Ký Kiểm Toán (Audit Logs)</span>
            <span className="ml-1 rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {totalDbLogs || logs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'health'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
          {/* 4 Thẻ KPI tóm tắt sự kiện theo các khu vực chính */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#141824]">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng sự kiện ghi nhận</span>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{totalDbLogs || logs.length} logs</p>
              <p className="mt-1 text-[11px] text-emerald-600 font-semibold">Tất cả khu vực hệ thống</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#141824]">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Khu vực Đăng nhập & Phiên</span>
              <p className="mt-2 text-2xl font-black text-emerald-600">
                {logs.filter((l) => l.category === 'LOGIN').length} lượt
              </p>
              <p className="mt-1 text-[11px] text-emerald-600 font-medium">Đăng nhập, đăng xuất & xác thực</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#141824]">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đổi mật khẩu & Tài khoản</span>
              <p className="mt-2 text-2xl font-black text-violet-600">
                {logs.filter((l) => l.category === 'PASSWORD').length} tác động
              </p>
              <p className="mt-1 text-[11px] text-violet-600 font-medium">Đổi/reset pass, phân quyền, khóa</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#141824]">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cấu hình & Sao lưu Dữ liệu</span>
              <p className="mt-2 text-2xl font-black text-blue-600">
                {logs.filter((l) => l.category === 'SETTINGS' || l.category === 'BACKUP' || l.category === 'SYSTEM').length} tác động
              </p>
              <p className="mt-1 text-[11px] text-blue-600 font-medium">Tham số hạ tầng & bản sao lưu CSDL</p>
            </div>
          </div>

          {/* Dải nút chuyển Phân khu vực lưu trữ nhật ký hệ thống */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-xs dark:border-white/10 dark:bg-[#141824]">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'Tất cả tác động', icon: Layers, count: logs.length, color: 'text-slate-600' },
                { id: 'LOGIN', label: '1. Đăng nhập & Phiên', icon: LogIn, count: logs.filter((l) => l.category === 'LOGIN').length, color: 'text-emerald-600' },
                { id: 'PASSWORD', label: '2. Đổi mật khẩu & Tài khoản', icon: KeyRound, count: logs.filter((l) => l.category === 'PASSWORD').length, color: 'text-violet-600' },
                { id: 'SETTINGS', label: '3. Cấu hình Hạ tầng', icon: Sliders, count: logs.filter((l) => l.category === 'SETTINGS' || l.category === 'SYSTEM').length, color: 'text-blue-600' },
                { id: 'BACKUP', label: '4. Sao lưu & CSDL', icon: HardDrive, count: logs.filter((l) => l.category === 'BACKUP').length, color: 'text-amber-600' },
                { id: 'SECURITY', label: '5. An ninh Hệ thống', icon: ShieldAlert, count: logs.filter((l) => l.category === 'SECURITY').length, color: 'text-rose-600' },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = filterCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterCategory(tab.id)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : tab.color}`} />
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-slate-700 dark:bg-white/10 dark:text-slate-300 shadow-2xs'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thanh tìm kiếm & Bộ lọc nâng cao */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#141824]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchLog}
                  onChange={(e) => setSearchLog(e.target.value)}
                  placeholder="Tìm theo tên tác nhân, hành động, địa chỉ IP (172.16...), mã phòng thi, chi tiết..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-[#f8fafc] pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-slate-500 dark:focus:bg-[#0d1017]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-600 cursor-pointer dark:border-white/10 dark:bg-[#141824] dark:text-slate-200"
                >
                  <option value="all">Tất cả khu vực</option>
                  <option value="LOGIN">Đăng nhập & Phiên (LOGIN)</option>
                  <option value="PASSWORD">Đổi mật khẩu & Tài khoản (PASSWORD)</option>
                  <option value="SETTINGS">Cấu hình Hạ tầng (SETTINGS)</option>
                  <option value="BACKUP">Sao lưu & CSDL (BACKUP)</option>
                  <option value="SECURITY">An ninh Hệ thống (SECURITY)</option>
                </select>

                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-600 cursor-pointer dark:border-white/10 dark:bg-[#141824] dark:text-slate-200"
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
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-600 cursor-pointer dark:border-white/10 dark:bg-[#141824] dark:text-slate-200"
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
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-white/10 dark:bg-[#141824]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                    <th className="px-5 py-3.5">Thời gian</th>
                    <th className="px-4 py-3.5">Khu vực</th>
                    <th className="px-4 py-3.5">Tác nhân & Vai trò</th>
                    <th className="px-4 py-3.5">Hành động & Sự kiện</th>
                    <th className="px-4 py-3.5">Địa chỉ IP Mạng</th>
                    <th className="px-4 py-3.5">Mức độ</th>
                    <th className="px-4 py-3.5 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 dark:divide-white/5 dark:text-slate-300">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                        {isLoadingLogs ? (
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                            <span>Đang truy xuất nhật ký từ máy chủ...</span>
                          </div>
                        ) : (
                          'Không tìm thấy sự kiện nhật ký nào phù hợp với bộ lọc.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => {
                      const catMeta = getCategoryMeta(log.category);
                      const CatIcon = catMeta.badgeIcon;
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition dark:hover:bg-white/5">
                          <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {log.timestamp}
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${catMeta.badgeColor}`}>
                              <CatIcon className="h-3 w-3 shrink-0" />
                              <span>{catMeta.label}</span>
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900 dark:text-white">{log.actorName}</div>
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
                            <div className="font-semibold text-slate-900 dark:text-white">{log.action}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[280px]">
                              {log.details}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 dark:text-slate-200">
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
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer dark:bg-white/10 dark:text-slate-200 dark:hover:bg-blue-600/20 dark:hover:text-blue-400"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Xem Chi tiết</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Thanh điều hướng phân trang */}
            {filteredLogs.length > pageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-[#f8fafc] px-5 py-3 text-xs dark:border-white/10 dark:bg-white/5">
                <span className="text-slate-500 dark:text-slate-400">
                  Hiển thị <strong className="text-slate-800 dark:text-slate-200">{(currentPage - 1) * pageSize + 1}</strong> -{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {Math.min(currentPage * pageSize, filteredLogs.length)}
                  </strong>{' '}
                  trong tổng số <strong className="text-slate-800 dark:text-slate-200">{filteredLogs.length}</strong> sự kiện
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Trước</span>
                  </button>

                  <span className="px-2 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                  >
                    <span>Sau</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: SỨC KHỎE DỊCH VỤ (SYSTEM HEALTH)                    */}
      {/* ========================================================= */}
      {activeTab === 'health' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-300">
                  Tất cả 5 dịch vụ lõi đang vận hành ổn định
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Không có sự cố gián đoạn kết nối hay nghẽn hàng đợi chấm bài trong 24 giờ qua.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 shadow-2xs dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Realtime Active
            </span>
          </div>

          {/* Lưới danh sách 5 dịch vụ cốt lõi */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-white/10 dark:bg-[#141824]"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
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
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white dark:text-white leading-tight">
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

                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {svc.description}
                  </p>

                  {/* Các chỉ số hiệu năng Metrics */}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[#f8fafc] dark:bg-white/5 p-2.5">
                    {svc.metrics.map((m, idx) => (
                      <div key={idx} className="text-center">
                        <span className="block text-[10px] font-semibold text-slate-400">
                          {m.label}
                        </span>
                        <span className="mt-0.5 block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-3 text-[11px] text-slate-400 dark:text-slate-500">
                  <span>
                    Độ trễ: <strong className="text-slate-700 dark:text-slate-200">{svc.latencyMs} ms</strong>
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
          {isLoadingSettings && (
            <div className="flex items-center gap-2 p-3 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Đang đồng bộ cấu hình từ máy chủ...</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 1. Giới hạn Hạ tầng & Bảo vệ Máy chủ */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#141824]">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-white/10 pb-3 mb-5">
                <Cpu className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Giới Hạn Hạ Tầng Máy Chủ</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                    <span className="w-16 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/10 px-2 py-1 text-center font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {settings.maxCodeFileSizeMb} MB
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Ngăn chặn sinh viên upload các file rác khổng lồ làm đầy bộ nhớ máy chủ.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                    <span className="w-20 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/10 px-2 py-1 text-center font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {settings.maxSandboxWorkers} workers
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Giới hạn số container Docker chạy song song để tránh quá tải CPU của trường.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                    <span className="w-24 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/10 px-2 py-1 text-center font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {settings.maxLiveKitBitrateKbps} kbps
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Khống chế trần bitrate LiveKit cho mỗi luồng (màn hình / webcam) để tránh nghẽn Wifi phòng thi khi cả lớp cùng phát video.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap">ngày sau khi thi</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Dọn dẹp bảng CodeDrafts của các ca thi đã kết thúc để tối ưu ổ cứng.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                    <span className="w-24 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/10 px-2 py-1 text-center font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {settings.auditLogRetentionDays} ngày
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Tự động dọn dẹp các bản ghi log cũ hơn 1 học kỳ (90 - 180 ngày) để bảo vệ hiệu năng máy chủ.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Thời gian lưu trữ bản sao lưu CSDL (Backup Retention)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={7}
                      max={90}
                      step={7}
                      value={settings.backupRetentionDays}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          backupRetentionDays: parseInt(e.target.value, 10),
                        })
                      }
                      className="flex-1 accent-blue-600 cursor-pointer"
                    />
                    <span className="w-24 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/10 px-2 py-1 text-center font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {settings.backupRetentionDays} ngày
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Tự động xóa các file sao lưu .bak cũ hơn số ngày này trên ổ cứng máy chủ.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Bảo mật & Vận hành */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#141824]">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-white/10 pb-3 mb-5">
                <Lock className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Bảo Mật & Bảo Trì Hệ Thống</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 font-mono text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                    placeholder="@school.edu.vn"
                  />
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Chỉ cho phép tài khoản có đuôi email này đăng nhập vào hệ thống trường.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Tự động khóa tạm 15 phút nếu nhập sai quá số lần quy định để chống Brute-force.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap">phút</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Hết hạn token sẽ yêu cầu cấp lại phiên để đảm bảo an toàn phiên làm việc.
                  </p>
                </div>

                {/* Chế độ Bảo trì */}
                <div
                  className={`rounded-xl border p-3.5 transition ${
                    settings.maintenanceMode
                      ? 'border-red-200 bg-red-50/70 dark:border-red-500/30 dark:bg-red-950/20'
                      : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Chế độ Bảo trì Hệ thống
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
                      className="h-4 w-4 rounded text-red-600 cursor-pointer accent-red-600"
                    />
                  </div>

                  {settings.maintenanceMode && (
                    <div className="mt-3 space-y-2 border-t border-red-200/60 dark:border-red-500/20 pt-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>Cổng an toàn: Admin luôn có thể đăng nhập bình thường tại trang /login để tắt chế độ bảo trì này.</span>
                      </div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
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
                        className="w-full rounded-lg border border-red-200 bg-white dark:bg-white/5 dark:border-red-500/30 p-2 text-xs text-slate-800 dark:text-white outline-none"
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Khôi phục mặc định</span>
            </button>

            <button
              type="submit"
              disabled={isSavingSettings}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Lưu Cấu Hình Hạ Tầng</span>
                </>
              )}
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
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#141824]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Phân bổ Dung lượng Lưu trữ Hệ thống (Storage Quota)
                </h3>
                <p className="text-xs text-slate-500">
                  Số lượng bản ghi CSDL và dung lượng ổ cứng thực tế của máy chủ.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
              >
                {isCreatingBackup ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang sao lưu CSDL SQL Server...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    <span>Tạo Bản Sao Lưu Ngay</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="space-y-2 rounded-xl border border-slate-100 dark:border-white/5 bg-[#f8fafc] dark:bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Mã nguồn bài nộp (Code)</span>
                  <span className="font-mono text-slate-500">
                    {storageStats.submissions_count} bài nộp
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(2, storageStats.submissions_count * 2))}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {storageStats.submissions_count} bài nộp được lưu trữ an toàn trong bảng BaiNop.
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-100 dark:border-white/5 bg-[#f8fafc] dark:bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Ảnh Bằng chứng Giám sát AI</span>
                  <span className="font-mono text-slate-500">
                    {storageStats.violations_count} bản ghi
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(2, storageStats.violations_count * 5))}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {storageStats.violations_count} bản ghi vi phạm trong bảng ViPhamGiamSat.
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-100 dark:border-white/5 bg-[#f8fafc] dark:bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Ổ cứng Máy chủ (Server Disk)</span>
                  <span className="font-mono text-slate-500">
                    {storageStats.disk.used_gb} GB / {storageStats.disk.total_gb} GB
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${storageStats.disk.used_percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Còn trống {storageStats.disk.free_gb} GB ({Math.max(0, 100 - storageStats.disk.used_percent).toFixed(1)}% khả dụng).
                </p>
              </div>
            </div>
          </div>

          {/* Cấu hình Thời gian & Chính sách Sao lưu tự động */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#141824]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 border-b border-slate-100 dark:border-white/5 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <Clock className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Cấu Hình Thời Gian & Chính Sách Sao Lưu (Backup Schedule & Retention)
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Thiết lập khung giờ sao lưu định kỳ, cơ chế tự động sao lưu an toàn khi bảo trì và thời hạn lưu trữ bản sao lưu.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCleanupBackups}
                  disabled={isCleaningUpBackups}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition cursor-pointer dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-950/40 disabled:opacity-50"
                  title="Dọn dẹp các tệp sao lưu đã quá hạn lưu trữ"
                >
                  <Trash2 className={`h-3.5 w-3.5 ${isCleaningUpBackups ? 'animate-spin' : ''}`} />
                  <span>{isCleaningUpBackups ? 'Đang dọn dẹp...' : 'Dọn dẹp bản sao lưu quá hạn'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveBackupPolicy}
                  disabled={isSavingBackupPolicy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingBackupPolicy ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Lưu chính sách</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Cột 1: Thời điểm & Tần suất sao lưu */}
              <div className="space-y-4 rounded-xl border border-slate-100 bg-[#f8fafc] p-4.5 dark:border-white/5 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      1. Thời điểm thực hiện sao lưu (Backup Timing)
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.backupScheduleEnabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          backupScheduleEnabled: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Khung giờ chạy định kỳ
                    </label>
                    <input
                      type="time"
                      value={settings.backupTime}
                      disabled={!settings.backupScheduleEnabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          backupTime: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-blue-500 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">
                      Khuyến nghị chọn từ 01:00 - 04:00 sáng (giờ thấp điểm tải).
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tần suất sao lưu
                    </label>
                    <select
                      value={settings.backupFrequency}
                      disabled={!settings.backupScheduleEnabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          backupFrequency: e.target.value as 'daily' | 'weekly',
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer dark:border-white/10 dark:bg-[#141824] dark:text-white"
                    >
                      <option value="daily">Hàng ngày (Daily - Khuyến nghị)</option>
                      <option value="weekly">Hàng tuần (Chủ nhật)</option>
                    </select>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Tự động tạo tệp .bak thực tế trên máy chủ theo chu kỳ.
                    </p>
                  </div>
                </div>

                {/* Tùy chọn sao lưu khi vào Bảo trì */}
                <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-3 dark:border-blue-500/20 dark:bg-blue-950/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-xs font-bold text-blue-950 dark:text-blue-200">
                          Tự động sao lưu Snapshot khi bật Chế độ Bảo trì
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                        Mỗi khi Quản trị viên kích hoạt <strong>Chế độ Bảo trì Hệ thống</strong>, một bản sao lưu CSDL an toàn (Snapshot) sẽ được tự động tạo trước khi bất kỳ thao tác bảo trì/nâng cấp nào diễn ra.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.backupOnMaintenance}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          backupOnMaintenance: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded text-blue-600 cursor-pointer accent-blue-600 shrink-0 mt-0.5"
                    />
                  </div>
                </div>
              </div>

              {/* Cột 2: Thời hạn lưu trữ & Giới hạn dung lượng */}
              <div className="space-y-4 rounded-xl border border-slate-100 bg-[#f8fafc] p-4.5 dark:border-white/5 dark:bg-white/5">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    2. Thời hạn lưu trữ & Giới hạn tệp (Retention Policy)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Thời gian lưu trữ bản sao lưu
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={3}
                        max={365}
                        value={settings.backupRetentionDays}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            backupRetentionDays: parseInt(e.target.value, 10) || 30,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                      <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">ngày</span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Các bản sao lưu cũ hơn thời hạn này sẽ được dọn dẹp tự động.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Số bản sao lưu tối đa giữ lại
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={2}
                        max={50}
                        value={settings.backupMaxCopies}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            backupMaxCopies: parseInt(e.target.value, 10) || 10,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                      <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">bản</span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Tối đa số file .bak lưu trữ trên đĩa cứng để tránh tràn bộ nhớ.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Chính sách bảo vệ dung lượng tự động
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    Hệ thống tự động kích hoạt dọn dẹp mỗi khi tạo bản sao lưu mới hoặc khi lưu cấu hình, đảm bảo không bao giờ vượt quá <strong>{settings.backupMaxCopies} bản</strong> và không giữ tệp quá <strong>{settings.backupRetentionDays} ngày</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bảng Danh sách Bản sao lưu */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#141824]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Lịch Sử Các Bản Sao Lưu (Database Backups)
                </h3>
                <p className="text-xs text-slate-500">
                  Các tệp sao lưu .bak thực tế của Microsoft SQL Server được lưu trữ trong thư mục backend/backups/.
                </p>
              </div>

              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Tổng cộng: <strong className="text-slate-800 dark:text-white">{backups.length} bản sao lưu</strong>
              </span>
            </div>

            {isLoadingBackups ? (
              <div className="flex items-center justify-center py-12 gap-2 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span>Đang quét các tệp sao lưu trên đĩa cứng...</span>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                <Database className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Chưa có bản sao lưu nào</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Nhấn nút &ldquo;Tạo Bản Sao Lưu Ngay&rdquo; ở góc trên để tạo bản sao lưu CSDL SQL Server đầu tiên.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                      <th className="px-4 py-3">Tên file sao lưu</th>
                      <th className="px-4 py-3">Thời gian tạo</th>
                      <th className="px-4 py-3">Dung lượng</th>
                      <th className="px-4 py-3">Loại sao lưu</th>
                      <th className="px-4 py-3">Mã Checksum (SHA-256)</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700 dark:divide-white/5 dark:text-slate-300">
                    {backups.map((bk) => (
                      <tr key={bk.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition">
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Database className="h-4 w-4 text-slate-400" />
                          <span>{bk.filename}</span>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {bk.createdAt}
                        </td>

                        <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          {bk.sizeMb} MB
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              bk.type === 'maintenance'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-500/30'
                                : bk.type === 'auto'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-500/30'
                                : 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-500/30'
                            }`}
                          >
                            {bk.type === 'maintenance' ? 'Bảo trì (Snapshot)' : bk.type === 'auto' ? 'Tự động' : 'Thủ công'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-[10px] text-slate-400" title={bk.checksum}>
                          {bk.checksum.length > 24 ? `${bk.checksum.slice(0, 22)}...` : bk.checksum}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDownloadBackup(bk.filename)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                              title="Tải tệp .bak về máy tính"
                            >
                              <Download className="h-3.5 w-3.5 text-blue-600" />
                              <span>Tải về</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteBackup(bk.filename)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer dark:border-red-500/30 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
                              title="Xóa tệp khỏi máy chủ"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL XEM CHI TIẾT PAYLOAD CỦA LOG                         */}
      {/* ========================================================= */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 p-6 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-bold">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
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
              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-[#f8fafc] dark:bg-white/5 p-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Tác nhân:</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedLog.actorName}</div>
                  <span className="text-[10px] text-blue-600 font-mono font-bold">
                    Vai trò: {selectedLog.actorRole.toUpperCase()}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Hành động:</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedLog.action}</div>
                  <span className="text-[10px] text-emerald-600 font-mono font-bold">
                    Mức độ: {selectedLog.severity}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Khu vực lưu trữ:</span>
                  <div className="mt-1">
                    {(() => {
                      const meta = getCategoryMeta(selectedLog.category);
                      const Icon = meta.badgeIcon;
                      return (
                        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${meta.badgeColor}`}>
                          <Icon className="h-3 w-3 shrink-0" />
                          <span>{meta.label}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                    {getCategoryMeta(selectedLog.category).description}
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
                <p className="rounded-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
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
                className="rounded-xl bg-slate-900 dark:bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:hover:bg-blue-700 transition cursor-pointer"
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
