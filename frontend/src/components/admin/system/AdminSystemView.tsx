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
  FileCode2,
  Camera,
  Check,
  ShieldCheck,
  ExternalLink,
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

function formatConciseAction(rawAction: string): string {
  const act = (rawAction || '').trim();
  const upper = act.toUpperCase();
  if (
    upper === 'AUTH_LOGIN' ||
    upper === 'LOGIN' ||
    upper === 'USER_LOGIN' ||
    upper === 'ĐĂNG NHẬP HỆ THỐNG' ||
    upper === 'ĐĂNG NHẬP'
  ) {
    return 'Đăng nhập';
  }
  if (
    upper === 'AUTH_LOGOUT' ||
    upper === 'LOGOUT' ||
    upper === 'USER_LOGOUT' ||
    upper === 'ĐĂNG XUẤT HỆ THỐNG' ||
    upper === 'ĐĂNG XUẤT'
  ) {
    return 'Đăng xuất';
  }
  if (upper === 'SYSTEM_SETTINGS' || upper === 'SETTINGS') return 'Cập nhật cấu hình';
  if (upper === 'DATABASE_BACKUP' || upper === 'BACKUP') return 'Sao lưu CSDL';
  if (upper === 'AUTH_PASSWORD' || upper === 'PASSWORD') return 'Đổi mật khẩu';
  if (upper === 'RESET_PASSWORD' || upper === 'ADMIN_RESET_PASSWORD') return 'Đặt lại mật khẩu';
  if (upper === 'AUTH_REGISTER' || upper === 'REGISTER') return 'Đăng ký';
  if (upper === 'USER_MGMT') return 'Quản lý tài khoản';
  if (upper === 'CLASS_MGMT') return 'Quản lý lớp học';
  if (upper === 'ADMIN_SCHEDULE') return 'Quản lý lịch thi';
  if (upper === 'MAINTENANCE_MODE') return 'Bảo trì hệ thống';
  return act || 'Hành động hệ thống';
}

function inferCategory(module: string, message: string): AuditLogCategory {
  const upper = (module + ' ' + message).toUpperCase();
  // 1. Khu vực Cảnh báo An ninh Hệ thống (IP lạ, Brute-force, Domain, Thất bại)
  if (
    upper.includes('IP LẠ') ||
    upper.includes('IP LA') ||
    upper.includes('DÒ MẬT KHẨU') ||
    upper.includes('DO MAT KHAU') ||
    upper.includes('BRUTE') ||
    upper.includes('ĐĂNG NHẬP SAI') ||
    upper.includes('DANG NHAP SAI') ||
    upper.includes('BẤT THƯỜNG') ||
    upper.includes('BAT THUONG') ||
    upper.includes('TỪ CHỐI') ||
    upper.includes('TU CHOI') ||
    upper.includes('DOMAIN') ||
    upper.includes('AUTH_REGISTER') ||
    upper.includes('SECURITY')
  ) {
    return 'SECURITY';
  }
  // 2. Khu vực Đổi mật khẩu & Quản lý Tài khoản
  if (
    upper.includes('PASSWORD') ||
    upper.includes('AUTH_PASSWORD') ||
    upper.includes('MẬT KHẨU') ||
    upper.includes('MAT KHAU') ||
    upper.includes('RESET') ||
    upper.includes('USER_MGMT') ||
    upper.includes('ADMIN_USER') ||
    upper.includes('TÀI KHOẢN') ||
    upper.includes('TAI KHOAN')
  ) {
    return 'PASSWORD';
  }
  // 3. Khu vực Sao lưu & Dữ liệu CSDL
  if (
    upper.includes('BACKUP') ||
    upper.includes('SAO LƯU') ||
    upper.includes('SAO LUU') ||
    upper.includes('DỌN DẸP') ||
    upper.includes('DON DEP') ||
    upper.includes('PHUC HOI') ||
    upper.includes('RESTORE') ||
    upper.includes('DATABASE')
  ) {
    return 'BACKUP';
  }
  // 4. Khu vực Đăng nhập & Xác thực
  if (
    upper.includes('LOGIN') ||
    upper.includes('AUTH_LOGIN') ||
    upper.includes('ĐĂNG NHẬP') ||
    upper.includes('DANG NHAP') ||
    upper.includes('DANG XUAT') ||
    upper.includes('LOGOUT')
  ) {
    return 'LOGIN';
  }
  // 5. Khu vực Cấu hình & Tham số Hạ tầng
  return 'SETTINGS';
}

function getCategoryMeta(cat: AuditLogCategory) {
  const neutralBadge = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10';
  switch (cat) {
    case 'LOGIN':
      return {
        label: 'Đăng nhập & Phiên',
        badgeColor: neutralBadge,
        badgeIcon: LogIn,
        dotColor: 'bg-slate-400',
        description: 'Lịch sử đăng nhập, đăng xuất và phiên làm việc tài khoản',
      };
    case 'PASSWORD':
      return {
        label: 'Mật khẩu & Tài khoản',
        badgeColor: neutralBadge,
        badgeIcon: KeyRound,
        dotColor: 'bg-slate-400',
        description: 'Đổi mật khẩu, đặt lại mật khẩu, phân quyền và khóa tài khoản',
      };
    case 'SETTINGS':
    case 'SYSTEM':
      return {
        label: 'Cấu hình Hạ tầng',
        badgeColor: neutralBadge,
        badgeIcon: Sliders,
        dotColor: 'bg-slate-400',
        description: 'Cập nhật tham số hệ thống, sandbox và chế độ bảo trì',
      };
    case 'BACKUP':
      return {
        label: 'Sao lưu & CSDL',
        badgeColor: neutralBadge,
        badgeIcon: HardDrive,
        dotColor: 'bg-slate-400',
        description: 'Tạo, tải về và xóa bản sao lưu cơ sở dữ liệu SQL Server',
      };
    case 'SECURITY':
      return {
        label: 'An ninh Hệ thống',
        badgeColor: neutralBadge,
        badgeIcon: ShieldAlert,
        dotColor: 'bg-slate-400',
        description: 'Cảnh báo dò mật khẩu, từ chối email sai miền và khóa truy cập',
      };
    default:
      return {
        label: 'Hệ thống',
        badgeColor: neutralBadge,
        badgeIcon: Activity,
        dotColor: 'bg-slate-400',
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

function getFormattedActor(name: string, role?: string): string {
  const cleanName = cleanMojibake(name || '').trim();
  const lowerName = cleanName.toLowerCase();
  const lowerRole = (role || '').toLowerCase();

  // Nếu là hệ thống
  if (
    lowerRole === 'system' ||
    lowerName === 'hệ thống' ||
    lowerName === 'system' ||
    lowerName === 'system scheduler' ||
    lowerName === 'guest user'
  ) {
    return 'Hệ thống';
  }

  // Nếu có tên cụ thể
  if (cleanName && cleanName !== 'undefined' && cleanName !== 'null') {
    if (cleanName.toLowerCase() === 'admin') return 'Quản trị viên';
    return cleanName;
  }

  if (lowerRole === 'admin') return 'Quản trị viên';
  if (lowerRole === 'instructor') return 'Giảng viên';
  if (lowerRole === 'student') return 'Sinh viên';
  return 'Quản trị viên';
}

function getRoleDisplay(role?: string | null): string {
  const lower = (role || '').toLowerCase();
  if (lower === 'admin') return 'Quản trị viên';
  if (lower === 'instructor') return 'Giảng viên';
  if (lower === 'student') return 'Sinh viên';
  return 'Hệ thống';
}

function formatLogDescription(details: string, actorName: string, role: string): string {
  const text = (details || '').trim();
  if (!text) return 'Hành động tác động hệ thống';

  // Nếu câu đã có đầy đủ chủ ngữ rõ ràng thì giữ nguyên
  if (
    text.startsWith('Giảng viên') ||
    text.startsWith('Quản trị viên') ||
    text.startsWith('Ban Khảo thí') ||
    text.startsWith('Sinh viên') ||
    text.startsWith('Hệ thống') ||
    text.startsWith('Tài khoản') ||
    text.startsWith('Người dùng')
  ) {
    return text;
  }

  const cleanName = cleanMojibake(actorName);
  const lowerRole = (role || '').toLowerCase();

  if (lowerRole === 'admin') {
    const adminTitle = cleanName && cleanName !== 'admin' && cleanName !== 'Quản trị viên' ? cleanName : 'Quản trị viên';
    return `${adminTitle} đã ${text.charAt(0).toLowerCase() + text.slice(1)}`;
  } else if (lowerRole === 'instructor') {
    const instTitle = cleanName && cleanName !== 'Giảng viên' ? `Giảng viên ${cleanName}` : 'Giảng viên phụ trách';
    return `${instTitle} đã ${text.charAt(0).toLowerCase() + text.slice(1)}`;
  } else if (lowerRole === 'student') {
    const stTitle = cleanName && cleanName !== 'Sinh viên' ? `Sinh viên ${cleanName}` : 'Sinh viên';
    return `${stTitle} đã ${text.charAt(0).toLowerCase() + text.slice(1)}`;
  } else {
    return `Hệ thống đã ${text.charAt(0).toLowerCase() + text.slice(1)}`;
  }
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
  allowedEmailDomain: '@gmail.com',

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

const INITIAL_BACKUPS: BackupItem[] = [];

function cleanMojibake(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/Giáº£ng ViÃªn HÆ°á»›ng Dáº«n/g, 'TS. Nguyễn Văn Nam')
    .replace(/Quáº£n Trá»‹ ViÃªn/g, 'Quản trị viên')
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â€/g, '–')
    .replace(/Â/g, '')
    .trim();
}

export default function AdminSystemView() {
  const [activeTab, setActiveTab] = useState<'logs' | 'health' | 'settings' | 'backup'>('logs');
  const [evidenceSubTab, setEvidenceSubTab] = useState<'violations' | 'submissions'>('violations');

  // State Cấu hình (Settings)
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // State Nhật ký (Logs)
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
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

  // ── TRA CỨU BẰNG CHỨNG PHÚC KHẢO (EVIDENCE & APPEAL AUDIT) ──
  const [isEvidenceViolationsOpen, setIsEvidenceViolationsOpen] = useState(false);
  const [isEvidenceSubmissionsOpen, setIsEvidenceSubmissionsOpen] = useState(false);
  const [evidenceViolations, setEvidenceViolations] = useState<any[]>([]);
  const [evidenceSubmissions, setEvidenceSubmissions] = useState<any[]>([]);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [evidenceSearch, setEvidenceSearch] = useState('');
  const [evidenceStatusFilter, setEvidenceStatusFilter] = useState('all');
  const [selectedSnapshot, setSelectedSnapshot] = useState<{
    violationId: number;
    url: string;
    title: string;
    desc: string;
    time: string;
    student: string;
    studentCode: string;
    severity: string;
    type: string;
    room: string;
    status: string;
  } | null>(null);
  const [selectedSubmissionCode, setSelectedSubmissionCode] = useState<{
    code: string;
    student: string;
    studentCode: string;
    room: string;
    question: string;
    lang: string;
    score: number;
    submittedAt: string;
  } | null>(null);
  const [isUpdatingAppeal, setIsUpdatingAppeal] = useState(false);

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
            actorName: cleanMojibake(item.actor_name || item.username || (item.user_id ? `User #${item.user_id}` : 'Hệ thống')),
            actorRole: mapRole(item.actor_role),
            action: formatConciseAction(item.module),
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
  const loadSystemHealth = async (showNotification = false) => {
    setIsPinging(true);
    try {
      const res = await fetchWithAuth<{ overall_status: string; services: ServiceHealthItem[] }>(
        '/api/v1/admin/system/health'
      );
      if (res && Array.isArray(res.services)) {
        setServices(res.services);
        if (showNotification) {
          showToast('Đã kiểm tra và cập nhật trạng thái các dịch vụ hệ thống!');
        }
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
      const data = await fetchWithAuth<any>('/api/v1/admin/system/settings?_t=' + Date.now());
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

  // Tải dữ liệu hồ sơ bằng chứng vi phạm và bài nộp (phục vụ thanh tra & phúc khảo)
  const fetchEvidenceData = async () => {
    setIsLoadingEvidence(true);
    try {
      const [violationsData, submissionsData] = await Promise.all([
        fetchWithAuth<any[]>('/api/v1/admin/evidence/violations'),
        fetchWithAuth<any[]>('/api/v1/admin/evidence/submissions'),
      ]);
      setEvidenceViolations(Array.isArray(violationsData) ? violationsData : []);
      setEvidenceSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
    } catch (err) {
      console.error('Lỗi khi tải bằng chứng phúc khảo:', err);
      showToast('Không thể tải dữ liệu bằng chứng phúc khảo');
    } finally {
      setIsLoadingEvidence(false);
    }
  };

  // Điều hướng nhanh sang Tab Bằng chứng Phúc khảo (Sub-tab trong Tab Nhật Ký)
  const handleOpenEvidenceViolations = () => {
    setActiveTab('logs');
    setFilterCategory('EVIDENCE');
    setEvidenceSubTab('violations');
    fetchEvidenceData();
  };

  const handleOpenEvidenceSubmissions = () => {
    setActiveTab('logs');
    setFilterCategory('EVIDENCE');
    setEvidenceSubTab('submissions');
    fetchEvidenceData();
  };

  // Xử lý cập nhật quyết định phúc khảo (chấp nhận giải oan hoặc giữ nguyên xử phạt)
  const handleUpdateAppealStatus = async (violationId: number, nextStatus: 'confirmed' | 'rejected') => {
    setIsUpdatingAppeal(true);
    try {
      let updated = false;
      // 1. Gọi endpoint phúc khảo chuyên biệt cho Admin
      try {
        await fetchWithAuth(`/api/v1/admin/evidence/violations/${violationId}/review`, {
          method: 'PATCH',
          body: JSON.stringify({ review_status: nextStatus }),
        });
        updated = true;
      } catch (errAdmin) {
        console.warn('Fallback sang endpoint /violations review:', errAdmin);
        await fetchWithAuth(`/api/v1/violations/${violationId}/review`, {
          method: 'PATCH',
          body: JSON.stringify({ review_status: nextStatus }),
        });
        updated = true;
      }

      if (updated) {
        setEvidenceViolations((prev) =>
          prev.map((v) => (v.violation_id === violationId ? { ...v, review_status: nextStatus, is_reviewed: true } : v))
        );
        if (selectedSnapshot && selectedSnapshot.violationId === violationId) {
          setSelectedSnapshot((prev) => (prev ? { ...prev, status: nextStatus } : null));
        }
        showToast(
          nextStatus === 'rejected'
            ? 'Đã chấp nhận phúc khảo: Hủy bỏ ghi nhận vi phạm!'
            : 'Đã xác nhận duy trì biên bản vi phạm!'
        );
      }
    } catch (err: any) {
      console.error('Lỗi khi cập nhật phúc khảo:', err);
      const msg = err?.detail || err?.message || (typeof err === 'string' ? err : 'Không thể cập nhật trạng thái phúc khảo');
      showToast(msg);
    } finally {
      setIsUpdatingAppeal(false);
    }
  };

  useEffect(() => {
    loadSystemLogs();
    loadSystemHealth();
    loadStorageMetrics();
    loadSettings();
    loadBackups();
    fetchEvidenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'logs' && filterCategory === 'EVIDENCE') {
      fetchEvidenceData();
    } else if (activeTab === 'settings') {
      loadSettings();
    }
  }, [activeTab, filterCategory]);

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
        setSettings({
          maxCodeFileSizeMb: res.max_code_file_size_mb ?? settings.maxCodeFileSizeMb,
          maxSandboxWorkers: res.max_sandbox_workers ?? settings.maxSandboxWorkers,
          maxLiveKitBitrateKbps: res.max_livekit_bitrate_kbps ?? settings.maxLiveKitBitrateKbps,
          autoCleanupDraftsDays: res.auto_cleanup_drafts_days ?? settings.autoCleanupDraftsDays,
          auditLogRetentionDays: res.audit_log_retention_days ?? settings.auditLogRetentionDays,
          allowedEmailDomain: res.allowed_email_domain ?? settings.allowedEmailDomain,
          maxLoginAttempts: res.max_login_attempts ?? settings.maxLoginAttempts,
          jwtTokenExpiryMinutes: res.jwt_token_expiry_minutes ?? settings.jwtTokenExpiryMinutes,
          maintenanceMode: Boolean(res.maintenance_mode),
          maintenanceMessage: res.maintenance_message ?? '',
          backupScheduleEnabled: res.backup_schedule_enabled ?? settings.backupScheduleEnabled,
          backupFrequency: res.backup_frequency ?? settings.backupFrequency,
          backupTime: res.backup_time ?? settings.backupTime,
          backupOnMaintenance: res.backup_on_maintenance ?? settings.backupOnMaintenance,
          backupRetentionDays: res.backup_retention_days ?? settings.backupRetentionDays,
          backupMaxCopies: res.backup_max_copies ?? settings.backupMaxCopies,
        });
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
    loadSystemHealth(true);
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
      {/* Toast Notification phong cách Học thuật */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-md border border-slate-300 border-l-4 border-l-slate-900 dark:border-l-white bg-white px-4 py-3 text-xs shadow-lg dark:border-white/10 dark:border-l-white dark:bg-neutral-900"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-brand-50 text-brand-700 shrink-0 dark:bg-brand-500/10 dark:text-brand-200">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-serif text-xs font-bold text-[#2A282D] dark:text-white">Thông báo hệ thống</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">{toastMessage}</p>
          </div>
        </aside>
      )}

      {/* Header Module & Navigation Tabs */}
      <div className="rounded-md border border-slate-300 bg-white p-6 shadow-xs sm:p-7 dark:border-white/10 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white dark:bg-white/10 dark:text-white">
                <Settings className="h-5 w-5" />
              </span>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-[#2A282D] dark:text-[#ede8e9]">
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
                onClick={() => {
                  loadSystemLogs();
                  if (filterCategory === 'EVIDENCE') {
                    fetchEvidenceData();
                  }
                }}
                disabled={isLoadingLogs || isLoadingEvidence}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-slate-600 dark:text-slate-300 ${isLoadingLogs || isLoadingEvidence ? 'animate-spin' : ''}`} />
                <span>{isLoadingLogs || isLoadingEvidence ? 'Đang tải...' : 'Làm mới'}</span>
              </button>
            )}

            {activeTab === 'health' && (
              <button
                type="button"
                onClick={handlePingServices}
                disabled={isPinging}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-slate-600 dark:text-slate-300 ${isPinging ? 'animate-spin' : ''}`} />
                <span>Kiểm tra kết nối</span>
              </button>
            )}

            {activeTab === 'backup' && (
              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="system-primary-action inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
              >
                <Download className={`h-3.5 w-3.5 ${isCreatingBackup ? '' : ''}`} />
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
                ? 'system-selected-tab'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>1. Nhật Ký Hệ Thống (Audit Logs)</span>
            <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              activeTab === 'logs'
                ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white dark:bg-white/10 dark:text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
            }`}>
              {totalDbLogs || logs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'health'
                ? 'system-selected-tab'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>2. Sức Khỏe Dịch Vụ (System Health)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'settings'
                ? 'system-selected-tab'
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
                ? 'system-selected-tab'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HardDrive className="h-4 w-4" />
            <span>4. Bản Sao Lưu &amp; Bộ Nhớ (Backup &amp; Storage)</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: NHẬT KÝ KIỂM TOÁN (AUDIT LOGS)                     */}
      {/* ========================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-5">
          {/* Dải nút chuyển Sub-Tab bên trong Tab Nhật Ký Hệ Thống */}
          <div className="rounded-md border border-slate-300 bg-white p-2.5 shadow-xs dark:border-white/10 dark:bg-neutral-900">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'Tất cả tác động', icon: Layers, count: logs.length },
                { id: 'LOGIN', label: '1. Đăng nhập & Phiên', icon: LogIn, count: logs.filter((l) => l.category === 'LOGIN').length },
                { id: 'PASSWORD', label: '2. Đổi mật khẩu & Tài khoản', icon: KeyRound, count: logs.filter((l) => l.category === 'PASSWORD').length },
                { id: 'SETTINGS', label: '3. Cấu hình Hạ tầng', icon: Sliders, count: logs.filter((l) => l.category === 'SETTINGS' || l.category === 'SYSTEM').length },
                { id: 'BACKUP', label: '4. Sao lưu & CSDL', icon: HardDrive, count: logs.filter((l) => l.category === 'BACKUP').length },
                { id: 'SECURITY', label: '5. An ninh Hệ thống', icon: ShieldAlert, count: logs.filter((l) => l.category === 'SECURITY').length },
                {
                  id: 'EVIDENCE',
                  label: '6. Bằng chứng & Hồ sơ Phúc khảo',
                  icon: Camera,
                  count: evidenceViolations.length + evidenceSubmissions.length || (storageStats.violations_count + storageStats.submissions_count),
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = filterCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setFilterCategory(tab.id);
                      if (tab.id === 'EVIDENCE') {
                        fetchEvidenceData();
                      }
                    }}
                    className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                      isActive
                        ? 'system-selected-module shadow-xs'
                        : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
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

          {filterCategory === 'EVIDENCE' ? (
            /* SUB-TAB 6: BẰNG CHỨNG & HỒ SƠ PHÚC KHẢO (EVIDENCE & APPEALS) */
            <div className="space-y-5">
              {/* Banner Giới thiệu chức năng độc lập */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-md border border-slate-300 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-neutral-900">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white dark:bg-white/10 dark:text-white shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Trung Tâm Đối Soát Bằng Chứng &amp; Xử Lý Phúc Khảo
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
                      Khu vực tra cứu chuyên biệt dành cho Ban Khảo thí, Thanh tra đào tạo và Hội đồng chấm phúc khảo. Toàn bộ hình ảnh snapshot vi phạm thời gian thực từ AI Giám sát và nguyên bản mã nguồn bài nộp từ Docker Sandbox được bảo lưu an toàn, tách biệt hoàn toàn khỏi cấu hình hạ tầng máy chủ.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={fetchEvidenceData}
                    disabled={isLoadingEvidence}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-slate-600 dark:text-slate-300 ${isLoadingEvidence ? 'animate-spin' : ''}`} />
                    <span>Làm mới hồ sơ</span>
                  </button>
                </div>
              </div>

              {/* 4 Thẻ KPI Tóm tắt Hồ sơ Phúc khảo */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border border-slate-300 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-neutral-900">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng biên bản vi phạm AI</span>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {evidenceViolations.length} bản ghi
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">Bảo lưu trong bảng ViPhamGiamSat</p>
                </div>

                <div className="rounded-md border border-slate-300 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-neutral-900">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Chờ đối soát / Phúc khảo</span>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {evidenceViolations.filter((v) => !v.review_status || v.review_status === 'pending').length} hồ sơ
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">Chưa có kết luận chính thức</p>
                </div>

                <div className="rounded-md border border-slate-300 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-neutral-900">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đã giải quyết khiếu nại</span>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {evidenceViolations.filter((v) => v.review_status && v.review_status !== 'pending').length} biên bản
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">Đã giải oan hoặc xác nhận phạt</p>
                </div>

                <div className="rounded-md border border-slate-300 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-neutral-900">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mã nguồn bài thi lưu trữ</span>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {evidenceSubmissions.length} bài nộp
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">Lưu nguyên bản trong BaiNop</p>
                </div>
              </div>

              {/* Dải chuyển Sub-Tab giữa Ảnh Vi Phạm và Mã Nguồn Bài Nộp */}
              <div className="rounded-md border border-slate-300 bg-white p-2.5 shadow-xs dark:border-white/10 dark:bg-neutral-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEvidenceSubTab('violations')}
                      className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold transition cursor-pointer ${
                        evidenceSubTab === 'violations'
                          ? 'system-selected-module shadow-xs'
                          : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                      }`}
                    >
                      <Camera className={`h-3.5 w-3.5 ${evidenceSubTab === 'violations' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span>Ảnh Bằng Chứng Vi Phạm Giám Sát AI</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          evidenceSubTab === 'violations'
                            ? 'bg-white/20 text-white'
                            : 'bg-white text-slate-700 dark:bg-white/10 dark:text-slate-300 shadow-2xs'
                        }`}
                      >
                        {evidenceViolations.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEvidenceSubTab('submissions')}
                      className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold transition cursor-pointer ${
                        evidenceSubTab === 'submissions'
                          ? 'system-selected-module shadow-xs'
                          : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                      }`}
                    >
                      <FileCode2 className={`h-3.5 w-3.5 ${evidenceSubTab === 'submissions' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span>Mã Nguồn Bài Nộp &amp; Chấm Điểm Sandbox</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          evidenceSubTab === 'submissions'
                            ? 'bg-white/20 text-white'
                            : 'bg-white text-slate-700 dark:bg-white/10 dark:text-slate-300 shadow-2xs'
                        }`}
                      >
                        {evidenceSubmissions.length}
                      </span>
                    </button>
                  </div>

                  {/* Ô tìm kiếm & lọc */}
                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 sm:w-72">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder={
                          evidenceSubTab === 'violations'
                            ? 'Tìm thí sinh, MSSV, phòng thi, loại vi phạm...'
                            : 'Tìm thí sinh, MSSV, bài thi, ngôn ngữ...'
                        }
                        value={evidenceSearch}
                        onChange={(e) => setEvidenceSearch(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-900 dark:border-white focus:outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                      />
                    </div>

                    {evidenceSubTab === 'violations' && (
                      <select
                        value={evidenceStatusFilter}
                        onChange={(e) => setEvidenceStatusFilter(e.target.value)}
                        className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 cursor-pointer"
                      >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="pending">Chờ phúc khảo / Chưa duyệt</option>
                        <option value="confirmed">Đã xác nhận phạt</option>
                        <option value="rejected">Đã giải oan / Hủy vi phạm</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Bảng Dữ Liệu Chi Tiết */}
              <div className="rounded-md border border-slate-300 bg-white shadow-xs overflow-hidden dark:border-white/10 dark:bg-neutral-900">
                {isLoadingEvidence ? (
                  <div className="flex h-56 flex-col items-center justify-center text-xs font-semibold text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-900 dark:text-white mb-2" />
                    <span>Đang tải danh sách hồ sơ bằng chứng từ cơ sở dữ liệu...</span>
                  </div>
                ) : evidenceSubTab === 'violations' ? (
                  // BẢNG ẢNH BẰNG CHỨNG VI PHẠM
                  (() => {
                    const filtered = evidenceViolations.filter((v) => {
                      const kw = evidenceSearch.trim().toLowerCase();
                      const matchKw =
                        !kw ||
                        (v.student_name && v.student_name.toLowerCase().includes(kw)) ||
                        (v.student_code && v.student_code.toLowerCase().includes(kw)) ||
                        (v.room_name && v.room_name.toLowerCase().includes(kw)) ||
                        (v.room_code && v.room_code.toLowerCase().includes(kw)) ||
                        (v.description && v.description.toLowerCase().includes(kw)) ||
                        (v.violation_type && v.violation_type.toLowerCase().includes(kw));
                      const matchStatus =
                        evidenceStatusFilter === 'all' ||
                        (evidenceStatusFilter === 'pending' && (!v.review_status || v.review_status === 'pending')) ||
                        (evidenceStatusFilter === 'confirmed' && v.review_status === 'confirmed') ||
                        (evidenceStatusFilter === 'rejected' && v.review_status === 'rejected');
                      return matchKw && matchStatus;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                          <ShieldCheck className="h-10 w-10 text-slate-300 mb-2" />
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Không tìm thấy bản ghi vi phạm nào phù hợp điều kiện lọc.</p>
                          <p className="text-[11px] text-slate-400 mt-1">Hệ thống đang lưu trữ {evidenceViolations.length} bản ghi vi phạm tổng cộng.</p>
                        </div>
                      );
                    }

                    const typeMap: Record<string, string> = {
                      tab_switch: 'Chuyển tab trình duyệt',
                      multiple_faces: 'Phát hiện nhiều người',
                      no_face_detected: 'Mất dấu khuôn mặt',
                      phone_detected: 'Phát hiện điện thoại',
                      suspicious_object: 'Thiết bị cấm / Tài liệu',
                      camera_blocked: 'Camera bị che khuất',
                      fullscreen_exit: 'Thoát chế độ toàn màn hình',
                    };

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1020px] text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                              <th className="py-3 px-4 font-bold">Thí sinh</th>
                              <th className="py-3 px-4 font-bold">Phòng thi &amp; Ca thi</th>
                              <th className="py-3 px-4 font-bold">Hành vi ghi nhận</th>
                              <th className="py-3 px-4 font-bold">Thời điểm</th>
                              <th className="py-3 px-4 font-bold">Trạng thái phúc khảo</th>
                              <th className="py-3 px-4 font-bold text-right w-[420px] min-w-[420px] whitespace-nowrap">Bằng chứng &amp; Xử lý</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filtered.map((item) => {
                              const isConfirmed = item.review_status === 'confirmed';
                              const isRejected = item.review_status === 'rejected';
                              const isPending = !isConfirmed && !isRejected;

                              return (
                                <tr key={item.violation_id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02]">
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-900 dark:text-white">
                                      {item.student_name || `Thí sinh #${item.student_id}`}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono">
                                      MSSV: {item.student_code || `SV${item.student_id}`}
                                    </div>
                                  </td>

                                  <td className="py-3 px-4">
                                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                                      {item.room_name || item.room_code || 'Phòng thi chung'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      Mã phòng: {item.room_code || 'N/A'}
                                    </div>
                                  </td>

                                  <td className="py-3 px-4">
                                    <div className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                                      <span>{typeMap[item.violation_type] || item.violation_type}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs" title={item.description}>
                                      {item.description}
                                    </p>
                                  </td>

                                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                    {new Date(item.detected_at).toLocaleString('vi-VN')}
                                  </td>

                                  <td className="py-3 px-4">
                                    {isConfirmed && (
                                      <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                                        Đã xác nhận phạt
                                      </span>
                                    )}
                                    {isRejected && (
                                      <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                                        Đã giải oan / Hủy vi phạm
                                      </span>
                                    )}
                                    {isPending && (
                                      <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                                        Chờ phúc khảo
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 text-right whitespace-nowrap w-[420px] min-w-[420px]">
                                    <div className="flex items-center justify-end gap-2 whitespace-nowrap flex-nowrap shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSelectedSnapshot({
                                            violationId: item.violation_id,
                                            url: item.snapshot_url || '/uploads/snapshots/sample_tab_switch.jpg',
                                            title: typeMap[item.violation_type] || item.violation_type,
                                            desc: item.description,
                                            time: new Date(item.detected_at).toLocaleString('vi-VN'),
                                            student: item.student_name || ('Thí sinh #' + item.student_id),
                                            studentCode: item.student_code || ('SV' + item.student_id),
                                            severity: item.severity,
                                            type: item.violation_type,
                                            room: item.room_name || item.room_code || 'Phòng thi',
                                            status: item.review_status || 'pending',
                                          })
                                        }
                                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0 transition shadow-2xs select-none"
                                      >
                                        <Eye className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                                        <span className="whitespace-nowrap">Xem ảnh bằng chứng</span>
                                      </button>

                                      {isPending ? (
                                        <>
                                          <button
                                            type="button"
                                            disabled={isUpdatingAppeal}
                                            onClick={() => handleUpdateAppealStatus(item.violation_id, 'rejected')}
                                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0 shadow-2xs select-none"
                                            title="Chấp nhận phúc khảo: Hủy bỏ ghi nhận vi phạm cho thí sinh"
                                          >
                                            <Check className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                                            <span className="whitespace-nowrap">Giải oan</span>
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isUpdatingAppeal}
                                            onClick={() => handleUpdateAppealStatus(item.violation_id, 'confirmed')}
                                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0 shadow-2xs select-none"
                                            title="Xác nhận vi phạm: Giữ nguyên quyết định xử phạt"
                                          >
                                            <ShieldAlert className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                                            <span className="whitespace-nowrap">Phạt</span>
                                          </button>
                                        </>
                                      ) : (
                                        <span className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300 whitespace-nowrap shrink-0 select-none">
                                          {isConfirmed ? 'Đã xác nhận phạt' : 'Đã giải oan'}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()
                ) : (
                  // BẢNG MÃ NGUỒN BÀI NỘP
                  (() => {
                    const filtered = evidenceSubmissions.filter((s) => {
                      const kw = evidenceSearch.trim().toLowerCase();
                      if (!kw) return true;
                      return (
                        (s.student_name && s.student_name.toLowerCase().includes(kw)) ||
                        (s.student_code && s.student_code.toLowerCase().includes(kw)) ||
                        (s.question_title && s.question_title.toLowerCase().includes(kw)) ||
                        (s.room_name && s.room_name.toLowerCase().includes(kw)) ||
                        (s.room_code && s.room_code.toLowerCase().includes(kw)) ||
                        (s.programming_language && s.programming_language.toLowerCase().includes(kw))
                      );
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                          <FileCode2 className="h-10 w-10 text-slate-300 mb-2" />
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Không tìm thấy bài nộp nào phù hợp điều kiện tìm kiếm.</p>
                          <p className="text-[11px] text-slate-400 mt-1">Hệ thống đang lưu trữ {evidenceSubmissions.length} bài nộp trong CSDL.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                              <th className="py-3 px-4 font-bold">Thí sinh</th>
                              <th className="py-3 px-4 font-bold">Bài thi / Phòng thi</th>
                              <th className="py-3 px-4 font-bold">Ngôn ngữ</th>
                              <th className="py-3 px-4 font-bold">Điểm số Sandbox</th>
                              <th className="py-3 px-4 font-bold">Thời điểm nộp</th>
                              <th className="py-3 px-4 font-bold text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filtered.map((item) => (
                              <tr key={item.submission_id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02]">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900 dark:text-white">
                                    {item.student_name || `Thí sinh #${item.student_id}`}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    MSSV: {item.student_code || `SV${item.student_id}`}
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    {item.question_title || 'Bài tập lập trình'}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {item.room_name || item.room_code || 'Phòng thi chung'}
                                  </div>
                                </td>

                                <td className="py-3 px-4 font-mono font-bold uppercase text-[11px] text-slate-700 dark:text-slate-300">
                                  {item.programming_language}
                                </td>

                                <td className="py-3 px-4">
                                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                                    {item.total_score ?? 0} điểm
                                  </span>
                                </td>

                                <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                  {new Date(item.submitted_at).toLocaleString('vi-VN')}
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedSubmissionCode({
                                        code: item.code_content || '',
                                        student: item.student_name || `Thí sinh #${item.student_id}`,
                                        studentCode: item.student_code || `SV${item.student_id}`,
                                        room: item.room_name || item.room_code || 'Phòng thi',
                                        question: item.question_title || 'Bài thi lập trình',
                                        lang: item.programming_language,
                                        score: item.total_score ?? 0,
                                        submittedAt: new Date(item.submitted_at).toLocaleString('vi-VN'),
                                      })
                                    }
                                    className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 cursor-pointer shadow-2xs"
                                  >
                                    <Terminal className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                                    <span>Xem mã nguồn</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* 4 Thẻ KPI tóm tắt sự kiện theo các khu vực chính */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border border-slate-300 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-neutral-900">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng sự kiện ghi nhận</span>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{totalDbLogs || logs.length} logs</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tất cả khu vực hệ thống</p>
                </div>

                <div className="rounded-md border border-slate-300 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-neutral-900">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Khu vực Đăng nhập & Phiên</span>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {logs.filter((l) => l.category === 'LOGIN').length} lượt
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">Đăng nhập, đăng xuất & xác thực</p>
                </div>

                <div className="rounded-md border border-slate-300 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-neutral-900">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đổi mật khẩu & Tài khoản</span>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {logs.filter((l) => l.category === 'PASSWORD').length} tác động
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">Đổi/reset pass, phân quyền, khóa</p>
                </div>

                <div className="rounded-md border border-slate-300 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-neutral-900">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cấu hình & Sao lưu Dữ liệu</span>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {logs.filter((l) => l.category === 'SETTINGS' || l.category === 'BACKUP' || l.category === 'SYSTEM').length} tác động
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tham số hạ tầng & bản sao lưu CSDL</p>
                </div>
              </div>

          {/* Thanh tìm kiếm & Bộ lọc nâng cao */}
          <div className="rounded-md border border-slate-300 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-neutral-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchLog}
                  onChange={(e) => setSearchLog(e.target.value)}
                  placeholder="Tìm theo tên tác nhân, hành động, địa chỉ IP (172.16...), mã phòng thi, chi tiết..."
                  className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-900 dark:border-white focus:ring-1 focus:ring-[#0f172a]/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:placeholder-slate-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-900 dark:border-white cursor-pointer dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200"
                >
                  <option value="all">Tất cả khu vực</option>
                  <option value="LOGIN">Đăng nhập & Phiên (LOGIN)</option>
                  <option value="PASSWORD">Đổi mật khẩu & Tài khoản (PASSWORD)</option>
                  <option value="SETTINGS">Cấu hình Hạ tầng (SETTINGS)</option>
                  <option value="BACKUP">Sao lưu & CSDL (BACKUP)</option>
                  <option value="SECURITY">An ninh Hệ thống (SECURITY)</option>
                  <option value="EVIDENCE">Bằng chứng & Hồ sơ Phúc khảo</option>
                </select>

                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-900 dark:border-white cursor-pointer dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200"
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
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-900 dark:border-white cursor-pointer dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="admin">Quản trị viên</option>
                  <option value="instructor">Giảng viên</option>
                  <option value="student">Sinh viên</option>
                  <option value="system">Hệ thống</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bảng Dữ liệu Nhật ký */}
          <div className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-xs dark:border-white/10 dark:bg-neutral-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                    <th className="px-6 py-4 w-44">Thời gian</th>
                    <th className="px-5 py-4 w-52">Tác nhân</th>
                    <th className="px-5 py-4">Hành động</th>
                    <th className="px-5 py-4 w-36 text-right">Địa chỉ IP</th>
                    <th className="px-5 py-4 w-32 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 dark:divide-white/5 dark:text-slate-300">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                        {isLoadingLogs ? (
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-slate-900 dark:text-white" />
                            <span>Đang truy xuất nhật ký từ máy chủ...</span>
                          </div>
                        ) : (
                          'Không tìm thấy sự kiện nhật ký nào phù hợp với bộ lọc.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => {
                      const displayActor = getFormattedActor(log.actorName, log.actorRole);
                      return (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className="hover:bg-slate-50/80 transition dark:hover:bg-white/5 cursor-pointer"
                        >
                          <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {log.timestamp}
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {displayActor}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {getRoleDisplay(log.actorRole)}
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {log.action}
                            </div>
                          </td>

                          <td className="px-5 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {log.ipAddress}
                          </td>

                          <td className="px-5 py-3.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLog(log);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-white hover:border-slate-900 dark:border-white/30 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                              title="Xem chi tiết bản ghi nhật ký"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-400" />
                              <span>Chi tiết</span>
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs dark:border-white/10 dark:bg-white/5">
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
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
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
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
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
    </div>
  )}

      {/* ========================================================= */}
      {/* TAB 2: SỨC KHỎE DỊCH VỤ (SYSTEM HEALTH)                    */}
      {/* ========================================================= */}
      {activeTab === 'health' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-md border border-slate-300 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Hệ thống vận hành ổn định
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tất cả {services.length} dịch vụ đang hoạt động bình thường, không ghi nhận sự cố gián đoạn kết nối.
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap pl-12 sm:pl-0">
              Trạng thái: <strong className="font-bold text-slate-800 dark:text-slate-200">Hoạt động bình thường</strong>
            </div>
          </div>

          {/* Lưới danh sách 5 dịch vụ cốt lõi */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="flex flex-col justify-between rounded-md border border-slate-300 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-white/10 dark:bg-neutral-900"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
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
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {svc.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {svc.category}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Hoạt động
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {svc.description}
                  </p>

                  {/* Các chỉ số hiệu năng Metrics */}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-md bg-slate-50 dark:bg-white/5 p-2.5">
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
                    Uptime: <strong className="text-slate-700 dark:text-slate-200">{svc.uptimePercent}%</strong>
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
            <div className="flex items-center gap-2 p-3 text-xs text-slate-600 bg-slate-100 dark:bg-white/5 dark:text-slate-300 rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Đang đồng bộ cấu hình từ máy chủ...</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 1. Giới hạn Hạ tầng & Bảo vệ Máy chủ */}
            <div className="rounded-md border border-slate-300 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-neutral-900">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-white/10 pb-3 mb-5">
                <Cpu className="h-5 w-5 text-slate-700 dark:text-slate-300" />
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
                      className="flex-1 accent-slate-900 dark:accent-white cursor-pointer"
                    />
                    <span className="w-16 rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/10 px-2 py-1 text-center font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
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
                      className="flex-1 accent-slate-900 dark:accent-white cursor-pointer"
                    />
                    <span className="w-20 rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/10 px-2 py-1 text-center font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
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
                      className="flex-1 accent-slate-900 dark:accent-white cursor-pointer"
                    />
                    <span className="w-24 rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/10 px-2 py-1 text-center font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
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
                      className="w-full rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-slate-900 dark:border-white"
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
                      className="flex-1 accent-slate-900 dark:accent-white cursor-pointer"
                    />
                    <span className="w-24 rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/10 px-2 py-1 text-center font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
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
                      className="flex-1 accent-slate-900 dark:accent-white cursor-pointer"
                    />
                    <span className="w-24 rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/10 px-2 py-1 text-center font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
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
            <div className="rounded-md border border-slate-300 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-neutral-900">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-white/10 pb-3 mb-5">
                <Lock className="h-5 w-5 text-slate-700 dark:text-slate-300" />
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
                    className="w-full rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 font-mono text-xs text-slate-800 dark:text-white outline-none focus:border-slate-900 dark:border-white"
                    placeholder="@gmail.com"
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
                    className="w-full rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-slate-900 dark:border-white"
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
                      className="w-full rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-slate-900 dark:border-white"
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap">phút</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Hết hạn token sẽ yêu cầu cấp lại phiên để đảm bảo an toàn phiên làm việc.
                  </p>
                </div>

                {/* Chế độ Bảo trì */}
                <div
                  className={`rounded-md border p-3.5 transition ${
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
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 dark:bg-white/5 dark:text-slate-300 px-2.5 py-1.5 rounded border border-slate-200 dark:border-white/10">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-slate-600 dark:text-slate-400" />
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
                        className="w-full rounded border border-red-200 bg-white dark:bg-white/5 dark:border-red-500/30 p-2 text-xs text-slate-800 dark:text-white outline-none"
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
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Khôi phục mặc định</span>
            </button>

            <button
              type="submit"
              disabled={isSavingSettings}
              className="system-primary-action inline-flex items-center gap-2 rounded-md bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
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
          <div className="rounded-md border border-slate-300 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-neutral-900">
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
                className="system-primary-action inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
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
              <div className="space-y-3 rounded-md border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Mã nguồn bài nộp (Code)</span>
                    <span className="font-mono text-slate-500">
                      {storageStats.submissions_count} bài nộp
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-slate-700 dark:bg-slate-300 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(2, storageStats.submissions_count * 2))}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {storageStats.submissions_count} bài nộp được lưu trữ an toàn trong bảng BaiNop.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleOpenEvidenceSubmissions}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:underline cursor-pointer"
                  >
                    <FileCode2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Xem tại Tab Bằng chứng Phúc khảo &rarr;</span>
                  </button>
                  <span className="text-[10px] text-slate-400">Đối soát mã nguồn</span>
                </div>
              </div>

              <div className="space-y-3 rounded-md border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Ảnh Bằng chứng Giám sát AI</span>
                    <span className="font-mono text-slate-500">
                      {storageStats.violations_count} bản ghi
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-slate-700 dark:bg-slate-300 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(2, storageStats.violations_count * 5))}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {storageStats.violations_count} bản ghi vi phạm trong bảng ViPhamGiamSat.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleOpenEvidenceViolations}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:underline cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Xem tại Tab Bằng chứng Phúc khảo &rarr;</span>
                  </button>
                  <span className="text-[10px] text-slate-400">Hồ sơ vi phạm AI</span>
                </div>
              </div>

              <div className="space-y-2 rounded-md border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Ổ cứng Máy chủ (Server Disk)</span>
                  <span className="font-mono text-slate-500">
                    {storageStats.disk.used_gb} GB / {storageStats.disk.total_gb} GB
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-slate-700 dark:bg-slate-300 rounded-full"
                    style={{ width: `${storageStats.disk.used_percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Còn trống {storageStats.disk.free_gb} GB ({Math.max(0, 100 - storageStats.disk.used_percent).toFixed(1)}% khả dụng).
                </p>
              </div>
            </div>

            {/* Hướng dẫn phân định trách nhiệm */}
            <div className="mt-4 flex items-center gap-2.5 rounded-md bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-slate-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              <span>
                <strong>Phân định quyền hạn:</strong> Khu vực này dành cho quản trị viên cấu hình sao lưu và kiểm tra dung lượng ổ đĩa. Toàn bộ hồ sơ đối soát vi phạm và chấm phúc khảo bài làm được quy hoạch độc lập tại <strong>Tab con Bằng Chứng &amp; Hồ Sơ Phúc Khảo (trong Tab Nhật Ký Hệ Thống)</strong>.
              </span>
            </div>
          </div>

          {/* Cấu hình Thời gian & Chính sách Sao lưu tự động */}
          <div className="rounded-lg border border-slate-300 bg-white p-8 shadow-xs dark:border-white/10 dark:bg-neutral-900 space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/5">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200 shrink-0">
                    <Clock className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cấu Hình Thời Gian &amp; Chính Sách Sao Lưu (Backup Schedule &amp; Retention)
                  </h3>
                </div>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 pl-13">
                  Thiết lập khung giờ sao lưu định kỳ, cơ chế tự động sao lưu an toàn khi bảo trì và thời hạn lưu trữ bản sao lưu.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCleanupBackups}
                  disabled={isCleaningUpBackups}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 disabled:opacity-50"
                  title="Dọn dẹp các tệp sao lưu đã quá hạn lưu trữ"
                >
                  <Trash2 className={`h-3.5 w-3.5 ${isCleaningUpBackups ? 'animate-spin' : ''}`} />
                  <span>{isCleaningUpBackups ? 'Đang dọn dẹp...' : 'Dọn dẹp bản sao lưu quá hạn'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveBackupPolicy}
                  disabled={isSavingBackupPolicy}
                  className="system-primary-action inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
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

            <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
              {/* Cột 1: Thời điểm & Tần suất sao lưu */}
              <div className="space-y-5 rounded-lg border border-slate-200 bg-slate-50/70 p-6 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/5">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-4.5 w-4.5 text-slate-700 dark:text-slate-300" />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
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
                    <div className="w-9 h-5 rounded-full bg-slate-200 peer-focus:outline-none peer dark:bg-slate-700 peer-checked:bg-brand dark:peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                      className="w-full h-10 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono text-slate-800 outline-none focus:border-slate-900 dark:border-white disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      Khuyến nghị chọn từ 01:00 - 04:00 sáng (giờ thấp điểm tải).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                      className="w-full h-10 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-slate-900 dark:border-white disabled:opacity-50 cursor-pointer dark:border-white/10 dark:bg-neutral-900 dark:text-white"
                    >
                      <option value="daily">Hàng ngày (Daily - Khuyến nghị)</option>
                      <option value="weekly">Hàng tuần (Chủ nhật)</option>
                    </select>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      Tự động tạo tệp .bak thực tế trên máy chủ theo chu kỳ.
                    </p>
                  </div>
                </div>

                {/* Tùy chọn sao lưu khi vào Bảo trì */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5 mt-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-slate-600 dark:text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Tự động sao lưu Snapshot khi bật Chế độ Bảo trì
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
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
                      className="h-4 w-4 rounded text-slate-700 cursor-pointer accent-slate-900 dark:accent-white shrink-0 mt-0.5"
                    />
                  </div>
                </div>
              </div>

              {/* Cột 2: Thời hạn lưu trữ & Giới hạn dung lượng */}
              <div className="space-y-5 rounded-lg border border-slate-200 bg-slate-50/70 p-6 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/60 dark:border-white/5">
                  <HardDrive className="h-4.5 w-4.5 text-slate-700 dark:text-slate-300" />
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    2. Thời hạn lưu trữ &amp; Giới hạn tệp (Retention Policy)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                        className="w-full h-10 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono text-slate-800 outline-none focus:border-slate-900 dark:border-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                      <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">ngày</span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      Các bản sao lưu cũ hơn thời hạn này sẽ được dọn dẹp tự động.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                        className="w-full h-10 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono text-slate-800 outline-none focus:border-slate-900 dark:border-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                      <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">bản</span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      Tối đa số file .bak lưu trữ trên đĩa cứng để tránh tràn bộ nhớ.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5 mt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-600 dark:text-slate-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Chính sách bảo vệ dung lượng tự động
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Hệ thống tự động kích hoạt dọn dẹp mỗi khi tạo bản sao lưu mới hoặc khi lưu cấu hình, đảm bảo không bao giờ vượt quá <strong>{settings.backupMaxCopies} bản</strong> và không giữ tệp quá <strong>{settings.backupRetentionDays} ngày</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bảng Danh sách Bản sao lưu */}
          <div className="rounded-md border border-slate-300 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-neutral-900">
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
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                <span>Đang quét các tệp sao lưu trên đĩa cứng...</span>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 dark:border-white/10 rounded-md">
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
                    <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
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
                              'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10'
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
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                              title="Tải tệp .bak về máy tính"
                            >
                              <Download className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                              <span>Tải về</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteBackup(bk.filename)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer dark:border-red-500/30 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
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
          <div className="w-full max-w-2xl rounded-md bg-white dark:bg-neutral-900 border border-slate-300 dark:border-white/10 p-6 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white dark:bg-white/10 dark:text-white font-bold">
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
              <div className="grid grid-cols-2 gap-4 rounded-md bg-slate-50 dark:bg-white/5 p-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Tác nhân thực hiện:</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {getFormattedActor(selectedLog.actorName, selectedLog.actorRole)}
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Vai trò: {getRoleDisplay(selectedLog.actorRole)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Hành động:</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedLog.action}</div>
                  <span className="text-[10px] text-slate-500 font-mono font-bold dark:text-slate-400">
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
                        <span className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] font-bold ${meta.badgeColor}`}>
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
                  <span className="text-[10px] text-slate-500 font-mono font-bold dark:text-slate-400">
                    Log ID: {selectedLog.id}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mô tả sự kiện:
                </span>
                <p className="rounded-md border border-slate-100 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {formatLogDescription(selectedLog.details || selectedLog.action, selectedLog.actorName, selectedLog.actorRole)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="system-primary-action rounded-md bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: KHO BẰNG CHỨNG GIÁM SÁT AI (HỒ SƠ PHÚC KHẢO)     */}
      {/* ========================================================= */}
      {isEvidenceViolationsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-md border border-slate-300 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-neutral-900">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-white/10">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                  <ShieldAlert className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Hồ Sơ Bằng Chứng Giám Sát AI (Căn Cứ Phúc Khảo &amp; Thanh Tra)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tra cứu hình ảnh hiện trường camera/màn hình vi phạm, thời gian và nhật ký AI khi có yêu cầu phúc khảo của thí sinh.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEvidenceViolationsOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Bộ lọc & Tìm kiếm */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4 border-b border-slate-100 dark:border-white/5">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên thí sinh, MSSV, phòng thi..."
                  value={evidenceSearch}
                  onChange={(e) => setEvidenceSearch(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-900 dark:border-white focus:outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500 whitespace-nowrap">Trạng thái:</span>
                <select
                  value={evidenceStatusFilter}
                  onChange={(e) => setEvidenceStatusFilter(e.target.value)}
                  className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  <option value="all">Tất cả biên bản</option>
                  <option value="pending">Chờ phúc khảo / Chưa duyệt</option>
                  <option value="confirmed">Đã xác nhận vi phạm</option>
                  <option value="rejected">Đã giải oan / Bác bỏ</option>
                </select>
                <button
                  type="button"
                  onClick={handleOpenEvidenceViolations}
                  className="p-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                  title="Làm mới dữ liệu"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingEvidence ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Bảng Danh sách Bằng chứng */}
            <div className="flex-1 overflow-y-auto py-3">
              {isLoadingEvidence ? (
                <div className="flex h-48 items-center justify-center text-xs font-semibold text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Đang tải hồ sơ bằng chứng giám sát AI từ CSDL...
                </div>
              ) : (() => {
                const filtered = evidenceViolations.filter((v) => {
                  const kw = evidenceSearch.trim().toLowerCase();
                  const matchKw =
                    !kw ||
                    (v.student_name && v.student_name.toLowerCase().includes(kw)) ||
                    (v.student_code && v.student_code.toLowerCase().includes(kw)) ||
                    (v.room_name && v.room_name.toLowerCase().includes(kw)) ||
                    (v.room_code && v.room_code.toLowerCase().includes(kw)) ||
                    (v.description && v.description.toLowerCase().includes(kw)) ||
                    (v.violation_type && v.violation_type.toLowerCase().includes(kw));
                  const matchStatus =
                    evidenceStatusFilter === 'all' ||
                    (evidenceStatusFilter === 'pending' && (!v.review_status || v.review_status === 'pending')) ||
                    (evidenceStatusFilter === 'confirmed' && v.review_status === 'confirmed') ||
                    (evidenceStatusFilter === 'rejected' && v.review_status === 'rejected');
                  return matchKw && matchStatus;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
                      <ShieldCheck className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-xs font-semibold">Không tìm thấy bản ghi vi phạm nào phù hợp điều kiện lọc.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Hệ thống đang lưu trữ {evidenceViolations.length} bản ghi vi phạm tổng cộng.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1020px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                          <th className="py-2.5 px-3 font-bold">Thí sinh</th>
                          <th className="py-2.5 px-3 font-bold">Phòng thi</th>
                          <th className="py-2.5 px-3 font-bold">Hành vi ghi nhận</th>
                          <th className="py-2.5 px-3 font-bold">Thời điểm</th>
                          <th className="py-2.5 px-3 font-bold">Hiện trạng</th>
                          <th className="py-2.5 px-3 font-bold text-right w-[420px] min-w-[420px] whitespace-nowrap">Bằng chứng &amp; Xử lý</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {filtered.map((item) => {
                          const isConfirmed = item.review_status === 'confirmed';
                          const isRejected = item.review_status === 'rejected';
                          const isPending = !isConfirmed && !isRejected;

                          const typeMap: Record<string, string> = {
                            tab_switch: 'Chuyển tab trình duyệt',
                            multiple_faces: 'Phát hiện nhiều người',
                            no_face_detected: 'Mất dấu khuôn mặt',
                            phone_detected: 'Phát hiện điện thoại',
                            suspicious_object: 'Thiết bị cấm / Tài liệu',
                            camera_blocked: 'Camera bị che khuất',
                            fullscreen_exit: 'Thoát chế độ toàn màn hình',
                          };

                          return (
                            <tr key={item.violation_id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02]">
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {item.student_name || `Thí sinh #${item.student_id}`}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  MSSV: {item.student_code || `SV${item.student_id}`}
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  {item.room_name || item.room_code || 'Phòng thi chung'}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Mã: {item.room_code || 'N/A'}
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <div className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                                  <span>{typeMap[item.violation_type] || item.violation_type}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs" title={item.description}>
                                  {item.description}
                                </p>
                              </td>

                              <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                {new Date(item.detected_at).toLocaleString('vi-VN')}
                              </td>

                              <td className="py-3 px-3">
                                {isConfirmed && (
                                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                                    Đã xác nhận phạt
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                                    Đã giải oan / Hủy bỏ
                                  </span>
                                )}
                                {isPending && (
                                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                                    Đang chờ phúc khảo
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-3 text-right whitespace-nowrap w-[420px] min-w-[420px]">
                                <div className="flex items-center justify-end gap-2 whitespace-nowrap flex-nowrap shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedSnapshot({
                                        violationId: item.violation_id,
                                        url: item.snapshot_url || '/uploads/snapshots/sample_tab_switch.jpg',
                                        title: typeMap[item.violation_type] || item.violation_type,
                                        desc: item.description,
                                        time: new Date(item.detected_at).toLocaleString('vi-VN'),
                                        student: item.student_name || ('Thí sinh #' + item.student_id),
                                        studentCode: item.student_code || ('SV' + item.student_id),
                                        severity: item.severity,
                                        type: item.violation_type,
                                        room: item.room_name || item.room_code || 'Phòng thi',
                                        status: item.review_status || 'pending',
                                      })
                                    }
                                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0 transition shadow-2xs select-none"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                                    <span className="whitespace-nowrap">Xem ảnh bằng chứng</span>
                                  </button>

                                  {isPending ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={isUpdatingAppeal}
                                        onClick={() => handleUpdateAppealStatus(item.violation_id, 'rejected')}
                                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0 shadow-2xs select-none"
                                        title="Chấp thuận đơn phúc khảo của sinh viên và xóa bỏ vi phạm"
                                      >
                                        <Check className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                                        <span className="whitespace-nowrap">Giải oan</span>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isUpdatingAppeal}
                                        onClick={() => handleUpdateAppealStatus(item.violation_id, 'confirmed')}
                                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 transition cursor-pointer whitespace-nowrap shrink-0 shadow-2xs select-none"
                                        title="Bác bỏ phúc khảo và giữ nguyên biên bản vi phạm"
                                      >
                                        <ShieldAlert className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                                        <span className="whitespace-nowrap">Phạt</span>
                                      </button>
                                    </>
                                  ) : (
                                    <span className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300 whitespace-nowrap shrink-0 select-none">
                                      {isConfirmed ? 'Đã xác nhận phạt' : 'Đã giải oan'}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/10">
              <span className="text-xs text-slate-500">
                Toàn bộ ảnh chụp bằng chứng được lưu trữ an toàn trong bảng <code>ViPhamGiamSat</code> và thư mục Snapshot máy chủ.
              </span>
              <button
                type="button"
                onClick={() => setIsEvidenceViolationsOpen(false)}
                className="system-primary-action rounded-md bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Đóng danh sách
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: XEM ẢNH BẰNG CHỨNG PHÓNG TO KÈM QUYẾT ĐỊNH       */}
      {/* ========================================================= */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-md border border-slate-300 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Bằng Chứng Hiện Trường: {selectedSnapshot.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSnapshot(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4 overflow-y-auto space-y-4">
              {/* Ảnh snapshot hiện trường */}
              <div className="rounded-md border border-slate-200 bg-slate-900 flex items-center justify-center p-2 min-h-64 dark:border-white/10">
                <img
                  src={selectedSnapshot.url}
                  alt="Ảnh bằng chứng vi phạm"
                  className="max-h-96 w-auto rounded object-contain"
                  onError={(e) => {
                    // Fallback nếu ảnh demo chưa có file vật lý
                    (e.target as HTMLElement).style.display = 'none';
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent && !parent.querySelector('.img-fallback')) {
                      const div = document.createElement('div');
                      div.className = 'img-fallback text-center text-slate-300 p-8 space-y-2';
                      div.innerHTML = `
                        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </div>
                        <p class="text-xs font-semibold">Ảnh chụp Bằng chứng AI Giám sát Thời gian thực</p>
                        <p class="text-[11px] text-slate-400">File Snapshot: ${selectedSnapshot.url}</p>
                      `;
                      parent.appendChild(div);
                    }
                  }}
                />
              </div>

              {/* Thông tin đối soát chi tiết */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-white/5 p-4 rounded-md border border-slate-100 dark:border-white/5">
                <div>
                  <span className="text-slate-400">Thí sinh:</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedSnapshot.student} ({selectedSnapshot.studentCode})
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Phòng thi:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedSnapshot.room}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Thời điểm ghi nhận:</span>
                  <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedSnapshot.time}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Mức độ cảnh báo:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 uppercase">
                    {selectedSnapshot.severity}
                  </div>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
                  <span className="text-slate-400">Nhật ký giải trình của AI / Giám thị:</span>
                  <p className="mt-1 font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedSnapshot.desc}
                  </p>
                </div>
              </div>
            </div>

            {/* Thao tác xử lý phúc khảo trực tiếp trên Modal */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
              <div className="text-xs text-slate-500">
                Trạng thái hiện tại:{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedSnapshot.status === 'confirmed'
                    ? 'ĐÃ XÁC NHẬN PHẠT'
                    : selectedSnapshot.status === 'rejected'
                    ? 'ĐÃ GIẢI OAN'
                    : 'CHỜ PHÚC KHẢO'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedSnapshot.status === 'pending' || !selectedSnapshot.status ? (
                  <>
                    <button
                      type="button"
                      disabled={isUpdatingAppeal}
                      onClick={() => handleUpdateAppealStatus(selectedSnapshot.violationId, 'rejected')}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 transition cursor-pointer"
                    >
                      Chấp nhận phúc khảo (Hủy vi phạm)
                    </button>
                    <button
                      type="button"
                      disabled={isUpdatingAppeal}
                      onClick={() => handleUpdateAppealStatus(selectedSnapshot.violationId, 'confirmed')}
                      className="system-primary-action rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      Xác nhận vi phạm (Giữ nguyên phạt)
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Hồ sơ đã hoàn tất xử lý phúc khảo. Không thể thao tác thêm.
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedSnapshot(null)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: KHO BÀI NỘP & MÃ NGUỒN (CHẤM PHÚC KHẢO)          */}
      {/* ========================================================= */}
      {isEvidenceSubmissionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-md border border-slate-300 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-neutral-900">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-white/10">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white dark:bg-white/10 dark:text-white">
                  <FileCode2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Hồ Sơ Bài Nộp &amp; Mã Nguồn (Phục Vụ Chấm Phúc Khảo)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tra cứu toàn bộ mã nguồn bài làm của thí sinh, thời gian nộp, kết quả test cases và điểm số nguyên bản để phục vụ hội đồng chấm phúc khảo.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEvidenceSubmissionsOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tìm kiếm */}
            <div className="flex items-center justify-between gap-3 py-4 border-b border-slate-100 dark:border-white/5">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên thí sinh, MSSV, tên câu hỏi/bài thi..."
                  value={evidenceSearch}
                  onChange={(e) => setEvidenceSearch(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-900 dark:border-white focus:outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenEvidenceSubmissions}
                className="p-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                title="Làm mới dữ liệu"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingEvidence ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Bảng Danh sách Bài nộp */}
            <div className="flex-1 overflow-y-auto py-3">
              {isLoadingEvidence ? (
                <div className="flex h-48 items-center justify-center text-xs font-semibold text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Đang tải hồ sơ bài nộp từ CSDL SQL Server...
                </div>
              ) : (() => {
                const filtered = evidenceSubmissions.filter((s) => {
                  const kw = evidenceSearch.trim().toLowerCase();
                  return (
                    !kw ||
                    (s.student_name && s.student_name.toLowerCase().includes(kw)) ||
                    (s.student_code && s.student_code.toLowerCase().includes(kw)) ||
                    (s.question_title && s.question_title.toLowerCase().includes(kw)) ||
                    (s.room_name && s.room_name.toLowerCase().includes(kw)) ||
                    (s.programming_language && s.programming_language.toLowerCase().includes(kw))
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
                      <FileCode2 className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-xs font-semibold">Không tìm thấy bài nộp nào phù hợp từ khóa.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Hệ thống đang lưu trữ {evidenceSubmissions.length} bài nộp trong CSDL.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                          <th className="py-2.5 px-3 font-bold">Thí sinh</th>
                          <th className="py-2.5 px-3 font-bold">Phòng thi &amp; Đề bài</th>
                          <th className="py-2.5 px-3 font-bold">Ngôn ngữ</th>
                          <th className="py-2.5 px-3 font-bold">Điểm số</th>
                          <th className="py-2.5 px-3 font-bold">Thời gian nộp</th>
                          <th className="py-2.5 px-3 font-bold text-right">Mã nguồn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {filtered.map((item) => (
                          <tr key={item.submission_id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02]">
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {item.student_name || `Thí sinh #${item.student_id}`}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                MSSV: {item.student_code || `SV${item.student_id}`}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {item.question_title || 'Bài tập lập trình'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {item.room_name || item.room_code || 'Phòng thi chung'}
                              </div>
                            </td>

                            <td className="py-3 px-3 font-mono font-bold uppercase text-[11px] text-slate-700 dark:text-slate-300">
                              {item.programming_language}
                            </td>

                            <td className="py-3 px-3">
                              <span className="font-mono font-bold text-slate-900 dark:text-white dark:text-white">
                                {item.total_score ?? 0} điểm
                              </span>
                            </td>

                            <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {new Date(item.submitted_at).toLocaleString('vi-VN')}
                            </td>

                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedSubmissionCode({
                                    code: item.code_content || '',
                                    student: item.student_name || `Thí sinh #${item.student_id}`,
                                    studentCode: item.student_code || `SV${item.student_id}`,
                                    room: item.room_name || item.room_code || 'Phòng thi',
                                    question: item.question_title || 'Bài thi lập trình',
                                    lang: item.programming_language,
                                    score: item.total_score ?? 0,
                                    submittedAt: new Date(item.submitted_at).toLocaleString('vi-VN'),
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white cursor-pointer"
                              >
                                <Terminal className="h-3.5 w-3.5" />
                                <span>Xem mã nguồn</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/10">
              <span className="text-xs text-slate-500">
                Toàn bộ mã nguồn bài làm được bảo lưu toàn vẹn trong bảng <code>BaiNop</code> phục vụ lưu trữ học thuật vĩnh viễn.
              </span>
              <button
                type="button"
                onClick={() => setIsEvidenceSubmissionsOpen(false)}
                className="system-primary-action rounded-md bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Đóng danh sách
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: TRÌNH XEM MÃ NGUỒN CODE CHI TIẾT (CODE VIEWER)    */}
      {/* ========================================================= */}
      {selectedSubmissionCode && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-md border border-slate-300 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-slate-900 dark:text-white dark:text-white" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Mã Nguồn Bài Thi: {selectedSubmissionCode.question}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Thí sinh: <strong>{selectedSubmissionCode.student}</strong> ({selectedSubmissionCode.studentCode}) • Ngôn ngữ: <strong className="uppercase">{selectedSubmissionCode.lang}</strong> • Điểm: <strong>{selectedSubmissionCode.score} điểm</strong> • Nộp lúc: {selectedSubmissionCode.submittedAt}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmissionCode(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4 flex-1 overflow-y-auto">
              <pre className="rounded-md border border-slate-800 bg-[#0d1117] p-4 font-mono text-xs text-slate-100 overflow-x-auto leading-relaxed selection:bg-slate-900 dark:bg-white dark:text-slate-900">
                <code>{selectedSubmissionCode.code || '// Thí sinh nộp file rỗng'}</code>
              </pre>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/10">
              <span className="text-xs text-slate-400">
                Mã nguồn được đối chiếu nguyên bản từ máy chủ chấm Docker Sandbox.
              </span>
              <button
                type="button"
                onClick={() => setSelectedSubmissionCode(null)}
                className="system-primary-action rounded-md bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Đóng trình xem code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
