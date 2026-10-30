export interface AuditLogItem {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: 'admin' | 'instructor' | 'student' | 'system';
  action: string;
  category: 'AUTH' | 'EXAM' | 'SYSTEM' | 'SECURITY';
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SECURITY';
  ipAddress: string;
  status: 'success' | 'failure' | 'flagged';
  details: string;
  payload?: Record<string, unknown>;
}

export interface ServiceHealthItem {
  id: string;
  name: string;
  category: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  uptimePercent: number;
  lastChecked: string;
  metrics: {
    label: string;
    value: string | number;
  }[];
  description: string;
}

export interface SystemSettings {
  // 1. Giới hạn Hạ tầng & Bảo vệ Máy chủ (Server & Sandbox Protection)
  maxCodeFileSizeMb: number;
  maxSandboxWorkers: number;
  maxLiveKitBitrateKbps: number;
  autoCleanupDraftsDays: number;
  auditLogRetentionDays: number;

  // 2. Tích hợp Dịch vụ & Kết nối (Integrations & Endpoints)
  livekitServerUrl: string;
  smtpHost: string;
  smtpPort: number;
  smtpSenderEmail: string;
  allowedEmailDomain: string;

  // 3. Chính sách An ninh & Vận hành (Security & Maintenance)
  maxLoginAttempts: number;
  jwtTokenExpiryMinutes: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export interface BackupItem {
  id: string;
  filename: string;
  createdAt: string;
  sizeMb: number;
  type: 'auto' | 'manual';
  status: 'completed' | 'in_progress' | 'failed';
  checksum: string;
}

export const SYSTEM_STORAGE_SETTINGS_KEY = 'oculide_admin_system_settings';
export const SYSTEM_STORAGE_LOGS_KEY = 'oculide_admin_audit_logs';
export const SYSTEM_STORAGE_BACKUPS_KEY = 'oculide_admin_backups';
