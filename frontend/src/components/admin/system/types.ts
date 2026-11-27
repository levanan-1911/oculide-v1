export type AuditLogCategory = 'LOGIN' | 'PASSWORD' | 'SETTINGS' | 'BACKUP' | 'SECURITY' | 'SYSTEM' | 'AUTH' | 'EXAM' | 'USER';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: 'admin' | 'instructor' | 'student' | 'system';
  actorCode?: string;
  action: string;
  eventCode?: string;
  actionLabel?: string;
  category: AuditLogCategory;
  normalizedCategory?: 'AUTH' | 'EXAM' | 'USER' | 'SYSTEM';
  categoryLabel?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SECURITY';
  normalizedSeverity?: 'INFO' | 'WARN' | 'CRITICAL';
  ipAddress: string;
  status: 'success' | 'failure' | 'flagged';
  normalizedStatus?: 'SUCCESS' | 'FAILED';
  details: string;
  attemptCount?: number;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  errorCode?: string;
  errorReason?: string;
  target?: { entityType?: string; entityId?: string | number; label?: string } | null;
  beforeData?: unknown;
  afterData?: unknown;
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
  maxCodeFileSizeMb: number;
  maxSandboxWorkers: number;
  maxLiveKitBitrateKbps: number;
  autoCleanupDraftsDays: number;
  auditLogRetentionDays: number;
  allowedEmailDomain: string;
  maxLoginAttempts: number;
  jwtTokenExpiryMinutes: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceDurationMinutes: number;
  maintenanceEndsAt?: string | null;
  maintenanceOnBackupSchedule: boolean;
  maintenanceScheduleTime: string;
  // Cấu hình thời gian & chính sách sao lưu
  backupScheduleEnabled: boolean;
  backupFrequency: 'daily' | 'weekly';
  backupTime: string;
  backupOnMaintenance: boolean;
  backupRetentionDays: number;
  backupMaxCopies: number;
}

export interface BackupItem {
  id: string;
  filename: string;
  createdAt: string;
  sizeMb: number;
  type: 'auto' | 'manual' | 'maintenance';
  status: 'completed' | 'in_progress' | 'failed';
  checksum: string;
}

export interface StorageStats {
  submissions_count: number;
  violations_count: number;
  logs_count: number;
  users_count: number;
  counts: {
    submissions_count: number;
    violations_count: number;
    logs_count: number;
    users_count: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    used_percent: number;
  };
}

export const SYSTEM_STORAGE_SETTINGS_KEY = 'oculide_admin_system_settings';
export const SYSTEM_STORAGE_LOGS_KEY = 'oculide_admin_audit_logs';
export const SYSTEM_STORAGE_BACKUPS_KEY = 'oculide_admin_backups';
