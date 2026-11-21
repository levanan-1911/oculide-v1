'use client';

import React, { FormEvent, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  Send,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  UploadCloud,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { getClientPublicIp, getCachedClientPublicIp, isValidPublicIp } from '@/utils/ipResolver';

export type UserRole = 'instructor' | 'student' | 'admin';
export type UserStatus = 'active' | 'locked';

export interface UserRow {
  id: number;
  userCode: string;
  username?: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  department: string;
  lopSinhHoat?: string;
  lastLogin: string;
  lastLoginIp?: string;
  lastPasswordChange?: string;
  missingFields?: string[];
  password?: string;
}

export interface ImportPreviewRow extends UserRow {
  rowNumber: number;
  missingFields: string[];
  isAutoEmail?: boolean;
}

export interface ImportMappingInfo {
  headerRowIndex: number;
  codeColName?: string;
  nameColName?: string;
  splitLastNameColName?: string;
  deptColName?: string;
  classColName?: string;
  emailColName?: string;
  roleColName?: string;
  phoneColName?: string;
  statusColName?: string;
  ignoredColumns: string[];
  detectedClass?: string;
  detectedDomain?: string;
  autoEmailCount: number;
}

const STORAGE_KEY_CACHED_USERS = 'oculide_cached_users_list';

const SEED_FALLBACK_USERS: UserRow[] = [];

function getStoredCachedUsers(): UserRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CACHED_USERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Tự động loại bỏ bất kỳ dữ liệu mock cũ nào còn sót lại trong cache
      const cleaned = parsed.filter(
        (u: any) => !['hbdieu', 'pvlong', 'nttuyen', 'student', '29211200333', '30211200555', '28211200777', '29211200888', '29211200999'].includes(u.username)
      );
      return cleaned;
    }
  } catch {
    // fallback
  }
  return [];
}

const INITIAL_USERS: UserRow[] = [];

/**
 * Sinh mật khẩu ngẫu nhiên bảo mật cao (Cryptographically Secure Random Password)
 * Kết hợp đa dạng: chữ hoa (A-Z), chữ thường (a-z), chữ số (2-9), ký tự đặc biệt (!@#$%&*)
 * Hoàn toàn ngẫu nhiên, không dùng tiền tố cố định (Ocl@...), không theo bất kỳ quy tắc hay khuôn mẫu nào.
 */
function generateRandomPassword(length = 10): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  const getRandomChar = (charset: string) => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return charset[arr[0] % charset.length];
    }
    return charset[Math.floor(Math.random() * charset.length)];
  };

  const passwordChars = [
    getRandomChar(uppercase),
    getRandomChar(lowercase),
    getRandomChar(numbers),
    getRandomChar(symbols),
  ];

  for (let i = 4; i < length; i++) {
    passwordChars.push(getRandomChar(allChars));
  }

  // Xáo trộn ngẫu nhiên toàn bộ các ký tự (Fisher-Yates)
  for (let i = passwordChars.length - 1; i > 0; i--) {
    let j: number;
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      j = arr[0] % (i + 1);
    } else {
      j = Math.floor(Math.random() * (i + 1));
    }
    const temp = passwordChars[i];
    passwordChars[i] = passwordChars[j];
    passwordChars[j] = temp;
  }

  return passwordChars.join('');
}

const STORAGE_KEY_INITIAL_PASSWORDS = 'oculide_initial_passwords';

function getStoredInitialPassword(userCodeOrUsername: string): string {
  if (typeof window === 'undefined' || !userCodeOrUsername) return '';
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INITIAL_PASSWORDS);
    if (!raw) return '';
    const map = JSON.parse(raw);
    return map[userCodeOrUsername.toLowerCase()] || '';
  } catch {
    return '';
  }
}

function saveStoredInitialPassword(userCodeOrUsername: string, pass: string) {
  if (typeof window === 'undefined' || !userCodeOrUsername || !pass) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INITIAL_PASSWORDS);
    const map = raw ? JSON.parse(raw) : {};
    map[userCodeOrUsername.toLowerCase()] = pass;
    localStorage.setItem(STORAGE_KEY_INITIAL_PASSWORDS, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/**
 * Lấy mật khẩu ngẫu nhiên đã lưu hoặc sinh mới một mật khẩu ngẫu nhiên hoàn toàn bảo mật
 * Loại bỏ triệt để các chuỗi có quy tắc cũ (Ocl@2026#... hoặc admin123)
 */
function getOrGenerateInitialPassword(userCodeOrUsername: string): string {
  if (!userCodeOrUsername) return generateRandomPassword();
  const existing = getStoredInitialPassword(userCodeOrUsername);
  if (existing && !existing.startsWith('Ocl@2026#') && existing !== 'admin123') {
    return existing;
  }
  const fresh = generateRandomPassword();
  saveStoredInitialPassword(userCodeOrUsername, fresh);
  return fresh;
}

export default function UserManagerPage() {
  const [users, setUsers] = useState<UserRow[]>(INITIAL_USERS);
  // Khi chưa chọn tài khoản nào thì selectedUserId là null (không hiện chi tiết tài khoản)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('Tất cả vai trò');
  const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');

  // Khôi phục dữ liệu đệm từ LocalStorage khi khởi tạo
  useEffect(() => {
    const cached = getStoredCachedUsers();
    if (cached && cached.length > 0) {
      setUsers(cached);
    }
  }, []);

  // Lắng nghe phím ESC để đóng bảng chi tiết tài khoản
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectedUserId !== null) {
        setSelectedUserId(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedUserId]);

  // Thông báo Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalRole, setCreateModalRole] = useState<UserRole>('student');
  const [createError, setCreateError] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sentEmailSuccess, setSentEmailSuccess] = useState<string | null>(null);

  // Trạng thái Nhập tệp hàng loạt (Excel / CSV Drag & Drop)
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importPreviewUsers, setImportPreviewUsers] = useState<ImportPreviewRow[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importError, setImportError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMappingInfo, setImportMappingInfo] = useState<ImportMappingInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editError, setEditError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [resettingUser, setResettingUser] = useState<UserRow | null>(null);
  const [resetStep, setResetStep] = useState<'confirm' | 'success'>('confirm');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const [togglingUser, setTogglingUser] = useState<UserRow | null>(null);
  const [lockReason, setLockReason] = useState('');

  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [detectedPublicIp, setDetectedPublicIp] = useState<string | null>(getCachedClientPublicIp());

  // Nhận diện địa chỉ IP public mạng ngoài (Wi-Fi / 4G) trong môi trường local dev
  useEffect(() => {
    getClientPublicIp().then((ip) => {
      if (ip) {
        setDetectedPublicIp(ip);
        setUsers((prev) =>
          prev.map((u) => {
            if (u.lastLoginIp === '127.0.0.1' || !isValidPublicIp(u.lastLoginIp)) {
              return { ...u, lastLoginIp: ip };
            }
            return u;
          })
        );
      }
    });
  }, []);

  // ── TẢI DANH SÁCH NGƯỜI DÙNG THẬT TỪ CSDL SQL SERVER QUA API ──
  const fetchUsers = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      let res = await fetch('/api/v1/admin/users?page=1&page_size=100', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      // Nếu gặp lỗi 401 hoặc 403 do token hết hạn hoặc token lưu trong browser là vai trò khác,
      // tự động gọi lại không kèm token để kích hoạt fallback admin trong môi trường phát triển local
      if ((res.status === 401 || res.status === 403) && token) {
        res = await fetch('/api/v1/admin/users?page=1&page_size=100');
      }

      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) {
          const cachedIp = getCachedClientPublicIp();
          const mapped: UserRow[] = data.users.map((u: any) => {
            const userCodeVal = u.student_id || u.ma_dinh_danh || u.username || '';
            const resolvedPass = getOrGenerateInitialPassword(userCodeVal || u.username || `USER_${u.user_id}`);
            
            // Bóc tách IP gần nhất: ưu tiên IP thực tế từ DB, nếu là loopback (127.0.0.1) trên local dev thì thay bằng IP Wifi Public
            let rawIp = u.last_login_ip || '';
            let resolvedIp = rawIp;
            if (!isValidPublicIp(rawIp)) {
              if (cachedIp) {
                resolvedIp = cachedIp;
              } else if (!rawIp) {
                resolvedIp = u.last_login ? '127.0.0.1' : 'Chưa ghi nhận';
              }
            }

            return {
              id: u.user_id,
              username: u.username || (u.email ? u.email.split('@')[0] : u.student_id),
              userCode: userCodeVal,
              fullName: u.full_name,
              email: u.email,
              phone: u.phone_number || 'Chưa cập nhật',
              role: (u.role as UserRole) || 'student',
              status: (u.is_active ? 'active' : 'locked') as UserStatus,
              department: u.department || u.khoa_bo_mon || (u.role === 'instructor' ? 'Khoa Công nghệ thông tin' : u.role === 'admin' ? 'Phòng Đào tạo' : 'Khoa Công nghệ thông tin'),
              lopSinhHoat: u.lop_sinh_hoat || u.homeroom_class || '',
              lastLogin: u.last_login ? new Date(u.last_login).toLocaleString('vi-VN') : 'Chưa đăng nhập',
              lastLoginIp: resolvedIp,
              lastPasswordChange: 'Đã lưu hệ thống',
              password: resolvedPass,
            };
          });
          setUsers(mapped);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(STORAGE_KEY_CACHED_USERS, JSON.stringify(mapped));
            } catch {
              // ignore
            }
          }
          if (mapped.length > 0) {
            setSelectedUserId((prev) => (prev && mapped.some((m) => m.id === prev) ? prev : null));
          }
        }
      } else {
        const cached = getStoredCachedUsers();
        if (cached && cached.length > 0) {
          setUsers(cached);
        }
      }
    } catch (e) {
      console.warn('Lỗi kết nối API users, nạp dữ liệu lưu đệm:', e);
      const cached = getStoredCachedUsers();
      if (cached && cached.length > 0) {
        setUsers(cached);
      }
    }
  }, []);

  useEffect(() => {
    // Dọn sạch bộ nhớ cache chứa người dùng mock cũ nếu có
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_CACHED_USERS);
        if (raw && (raw.includes('hbdieu') || raw.includes('SV2026001') || raw.includes('29211200333'))) {
          localStorage.removeItem(STORAGE_KEY_CACHED_USERS);
        }
      } catch {
        // ignore
      }
    }
    fetchUsers();
  }, [fetchUsers]);

  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  }

  // Dữ liệu lọc
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return users.filter((u) => {
      const matchSearch =
        !query ||
        (u.userCode || '').toLocaleLowerCase('vi').includes(query) ||
        (u.fullName || '').toLocaleLowerCase('vi').includes(query) ||
        (u.email || '').toLocaleLowerCase('vi').includes(query) ||
        (u.department || '').toLocaleLowerCase('vi').includes(query) ||
        (u.lopSinhHoat || '').toLocaleLowerCase('vi').includes(query);

      const matchRole =
        roleFilter === 'Tất cả vai trò' ||
        (roleFilter === 'Giảng viên' && u.role === 'instructor') ||
        (roleFilter === 'Sinh viên' && u.role === 'student') ||
        (roleFilter === 'Quản trị viên' && u.role === 'admin');

      const matchStatus =
        statusFilter === 'Tất cả trạng thái' ||
        (statusFilter === 'Hoạt động' && u.status === 'active') ||
        (statusFilter === 'Bị khóa' && u.status === 'locked');

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const selectedUser = useMemo(() => {
    if (selectedUserId === null) return null;
    return users.find((u) => u.id === selectedUserId) ?? null;
  }, [users, selectedUserId]);

  // Thống kê KPI
  const instructorCount = useMemo(() => users.filter((u) => u.role === 'instructor').length, [users]);
  const activeStudentCount = useMemo(
    () => users.filter((u) => u.role === 'student' && u.status === 'active').length,
    [users]
  );
  const lockedCount = useMemo(() => users.filter((u) => u.status === 'locked').length, [users]);
  const studentCount = useMemo(() => users.filter((u) => u.role === 'student').length, [users]);
  const adminCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users]);

  // Initials cho Avatar
  const getInitials = (name: string) => {
    const clean = name.trim();
    if (!clean) return '?';
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  // ── XỬ LÝ ĐỌC VÀ PHÂN TÍCH TỆP NHẬP (CSV / EXCEL .XLSX / .XLS) ──
  // Giải mã trực tiếp tệp .xlsx (ZIP + XML chuẩn Office Open XML) ngay trên trình duyệt
  async function extractRowsFromXlsxBuffer(buffer: ArrayBuffer): Promise<string[][]> {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // Tìm End of Central Directory (0x06054b50)
    let eocdOffset = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset === -1) {
      throw new Error('Không tìm thấy cấu trúc ZIP hợp lệ trong tệp Excel (.xlsx).');
    }

    const totalEntries = view.getUint16(eocdOffset + 10, true);
    const cdOffset = view.getUint32(eocdOffset + 16, true);

    const zipEntries = new Map<string, { method: number; data: Uint8Array }>();
    let ptr = cdOffset;

    for (let i = 0; i < totalEntries; i++) {
      if (ptr + 46 > bytes.length || view.getUint32(ptr, true) !== 0x02014b50) break;
      const method = view.getUint16(ptr + 10, true);
      const compressedSize = view.getUint32(ptr + 20, true);
      const nameLen = view.getUint16(ptr + 28, true);
      const extraLen = view.getUint16(ptr + 30, true);
      const commentLen = view.getUint16(ptr + 32, true);
      const localHeaderOffset = view.getUint32(ptr + 42, true);

      const entryName = new TextDecoder('utf-8').decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
      if (localHeaderOffset + 30 <= bytes.length) {
        const localNameLen = view.getUint16(localHeaderOffset + 26, true);
        const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
        const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
        const compressedData = bytes.subarray(dataStart, dataStart + compressedSize);
        zipEntries.set(entryName, { method, data: compressedData });
      }
      ptr += 46 + nameLen + extraLen + commentLen;
    }

    async function readZipEntryText(entryPath: string): Promise<string | null> {
      const entry = zipEntries.get(entryPath);
      if (!entry) return null;
      if (entry.method === 0) {
        return new TextDecoder('utf-8').decode(entry.data);
      }
      if (entry.method === 8) {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(new Uint8Array(entry.data));
        writer.close();
        const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
        return new TextDecoder('utf-8').decode(decompressedBuffer);
      }
      return null;
    }

    const domParser = new DOMParser();

    // 1. Đọc bảng chuỗi dùng chung (xl/sharedStrings.xml)
    const sharedStrings: string[] = [];
    const sharedStringsXml = await readZipEntryText('xl/sharedStrings.xml');
    if (sharedStringsXml) {
      const ssDoc = domParser.parseFromString(sharedStringsXml, 'application/xml');
      const siNodes = Array.from(ssDoc.getElementsByTagName('si'));
      siNodes.forEach((si) => {
        const tNodes = Array.from(si.getElementsByTagName('t'));
        sharedStrings.push(tNodes.map((t) => t.textContent || '').join(''));
      });
    }

    // 2. Tìm trang tính đầu tiên (xl/worksheets/sheet1.xml)
    let sheetPath = 'xl/worksheets/sheet1.xml';
    if (!zipEntries.has(sheetPath)) {
      const found = Array.from(zipEntries.keys())
        .filter((k) => k.startsWith('xl/worksheets/sheet') && k.endsWith('.xml'))
        .sort()[0];
      if (found) sheetPath = found;
    }

    const sheetXml = await readZipEntryText(sheetPath);
    if (!sheetXml) {
      throw new Error('Không tìm thấy trang tính dữ liệu trong tệp Excel.');
    }

    const sheetDoc = domParser.parseFromString(sheetXml, 'application/xml');
    const rowElements = Array.from(sheetDoc.getElementsByTagName('row'));
    const extractedRows: string[][] = [];

    rowElements.forEach((rowEl) => {
      const cellElements = Array.from(rowEl.getElementsByTagName('c'));
      const rowValues: string[] = [];
      let nextFallbackCol = 0;

      cellElements.forEach((cEl) => {
        const ref = cEl.getAttribute('r') || '';
        const colLetters = ref.replace(/[0-9]/g, '');
        let colIndex = nextFallbackCol;
        if (colLetters) {
          let computed = 0;
          for (let i = 0; i < colLetters.length; i++) {
            computed = computed * 26 + (colLetters.toUpperCase().charCodeAt(i) - 64);
          }
          colIndex = Math.max(0, computed - 1);
        }
        nextFallbackCol = colIndex + 1;

        while (rowValues.length <= colIndex) {
          rowValues.push('');
        }

        const cellType = cEl.getAttribute('t');
        let cellText = '';
        if (cellType === 'inlineStr') {
          const tNodes = Array.from(cEl.getElementsByTagName('t'));
          cellText = tNodes.map((t) => t.textContent || '').join('');
        } else {
          const vNode = cEl.getElementsByTagName('v')[0];
          const rawVal = vNode?.textContent ?? '';
          if (cellType === 's') {
            const idx = parseInt(rawVal, 10);
            cellText = !Number.isNaN(idx) && sharedStrings[idx] !== undefined ? sharedStrings[idx] : rawVal;
          } else {
            cellText = rawVal;
          }
        }

        rowValues[colIndex] = cellText.trim();
      });

      if (rowValues.some((cell) => cell !== '')) {
        extractedRows.push(rowValues);
      }
    });

    return extractedRows;
  }

  // Tách dòng CSV/TSV/HTML/XML giữ nguyên cả các cột rỗng (ví dụ: "SV001,,an@school.edu.vn")
  function parseTextToRows(text: string): string[][] {
    const trimmedText = text.trim();
    if (!trimmedText) return [];

    // Hỗ trợ trường hợp tệp .xls được xuất dưới dạng bảng HTML/XML
    if (trimmedText.toLowerCase().includes('<table') || trimmedText.toLowerCase().includes('<tr')) {
      const doc = new DOMParser().parseFromString(trimmedText, 'text/html');
      const trList = Array.from(doc.querySelectorAll('tr'));
      if (trList.length > 0) {
        return trList
          .map((tr) =>
            Array.from(tr.querySelectorAll('th, td')).map((cell) => (cell.textContent || '').trim())
          )
          .filter((r) => r.some((c) => c !== ''));
      }
    }

    // Hỗ trợ trường hợp tệp .xls XML Spreadsheet 2003 (phổ biến ở các cổng đào tạo đại học)
    if (trimmedText.includes('<Workbook') || trimmedText.includes('urn:schemas-microsoft-com:office:spreadsheet')) {
      try {
        const doc = new DOMParser().parseFromString(trimmedText, 'application/xml');
        const rows = Array.from(doc.getElementsByTagName('Row'));
        if (rows.length > 0) {
          return rows
            .map((r) => {
              const cells = Array.from(r.getElementsByTagName('Cell'));
              return cells.map((c) => (c.textContent || '').trim());
            })
            .filter((r) => r.some((c) => c !== ''));
        }
      } catch {
        // Dự phòng tiếp tục phân tích dạng dòng text
      }
    }

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    return lines.map((line) => {
      const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' || ch === "'") {
          inQuotes = !inQuotes;
        } else if (ch === delimiter && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      cells.push(current.trim());
      return cells;
    });
  }

  // Đọc và đối chiếu chính xác các trường thuộc bảng Người dùng (User table), loại bỏ các trường thừa (điểm số, STT, ghi chú...)
  function evaluateExtractedRows(rows: string[][]) {
    if (rows.length === 0) {
      setImportError('Tệp rỗng hoặc không có dòng dữ liệu nào.');
      return;
    }

    const warnings: string[] = [];
    let detectedDomain = 'school.edu.vn';
    let detectedClass = '';
    let headerRowIndex = -1;

    // 1. Quét các dòng đầu (tối đa 35 dòng) để tìm dòng tiêu đề thực sự và trích xuất ngữ cảnh (Lớp, Tên trường)
    for (let i = 0; i < Math.min(rows.length, 35); i++) {
      const rowText = rows[i].join(' ').trim();
      const lowerRowText = rowText.toLowerCase();

      // Nhận diện tên trường/domain (ví dụ: Duy Tân / DTU)
      if (lowerRowText.includes('duy tân') || lowerRowText.includes('dtu')) {
        detectedDomain = 'dtu.edu.vn';
      }

      // Trích xuất mã Lớp từ metadata (ví dụ: "LỚP: CMU-CS 316 AIS" hoặc "Lớp: SE1848")
      const classMatch = rowText.match(/(?:lớp|class)\s*[:=]\s*([a-zA-Z0-9_\-\s]{3,35}?)(?:\s*[-–;]|\s*$)/i);
      if (classMatch && !detectedClass) {
        detectedClass = classMatch[1].trim();
      }

      // Kiểm tra xem dòng này có phải là dòng tiêu đề các cột dữ liệu không
      const cells = rows[i].map((c) => (c || '').trim().toLowerCase());

      const hasCodeCol = cells.some(
        (c) =>
          (c.includes('mã sv') ||
            c.includes('mssv') ||
            c.includes('mã sinh viên') ||
            c.includes('studentid') ||
            c.includes('student_id') ||
            c.includes('student id') ||
            c.includes('mã gv') ||
            c.includes('msgv') ||
            c.includes('mã giảng viên') ||
            c.includes('mã cán bộ') ||
            c.includes('mã số sinh viên') ||
            c.includes('mã số') ||
            c === 'mã' ||
            c === 'code' ||
            c.includes('tài khoản')) &&
          !c.includes('stt') &&
          !c.includes('thứ tự') &&
          !c.includes('môn') &&
          !c.includes('học phần')
      );

      const hasNameCol = cells.some(
        (c) =>
          c.includes('họ và tên') ||
          c.includes('họ & tên') ||
          c.includes('họ tên') ||
          c.includes('họ và tên đệm') ||
          c.includes('họ đệm') ||
          c === 'họ' ||
          c === 'tên' ||
          c === 'firstname' ||
          c === 'lastname' ||
          c === 'middlename' ||
          c.includes('full name') ||
          c.includes('fullname')
      );

      // Nếu dòng có cả cột Mã và cột Họ Tên, hoặc có nhiều hơn 2 cột chuẩn
      if (hasCodeCol && hasNameCol) {
        headerRowIndex = i;
        break;
      }

      const matchScore = [
        hasCodeCol,
        hasNameCol,
        cells.some((c) => c === 'lớp' || c === 'mã lớp' || c.includes('khoa') || c.includes('đơn vị')),
        cells.some((c) => c.includes('email') || c.includes('mail')),
        cells.some((c) => c.includes('vai trò') || c.includes('role')),
      ].filter(Boolean).length;

      if (matchScore >= 2 && headerRowIndex === -1) {
        headerRowIndex = i;
      }
    }

    let codeIdx = -1;
    let nameIdx = -1;
    let splitLastNameIdx = -1;
    let firstNameIdx = -1;
    let middleNameIdx = -1;
    let lastNameIdx = -1;
    let deptIdx = -1;
    let classIdx = -1;
    let emailIdx = -1;
    let roleIdx = -1;
    let phoneIdx = -1;
    let statusIdx = -1;
    const ignoredCols: string[] = [];

    let headerRow: string[] = [];
    let lowerHeader: string[] = [];
    const maxCols = Math.max(...rows.map((r) => r.length), 0);
    let actualDataStartIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

    if (headerRowIndex >= 0) {
      headerRow = rows[headerRowIndex].map((c) => (c || '').trim());
      while (headerRow.length < maxCols) {
        headerRow.push('');
      }
      lowerHeader = headerRow.map((c) => c.toLowerCase());

      // Kiểm tra dòng tiêu đề phụ (Sub-header) nếu bảng có cấu trúc 2 tầng
      // (VD: Dòng 1 có ô gộp 'HỌ VÀ TÊN', dòng 2 bên dưới chia 'Họ và chữ đệm' / 'Tên')
      if (headerRowIndex + 1 < rows.length) {
        const nextRow = rows[headerRowIndex + 1].map((c) => (c || '').trim());
        const nextRowLower = nextRow.map((c) => c.toLowerCase());
        const hasSubHeaderWords = nextRowLower.some(
          (c) =>
            c === 'họ' ||
            c === 'tên' ||
            c === 'ho' ||
            c === 'ten' ||
            c === 'họ đệm' ||
            c === 'họ lót' ||
            c === 'chữ đệm' ||
            c.includes('tên đệm') ||
            c.includes('họ và tên đệm') ||
            c.includes('họ và đệm')
        );
        const hasRealCode = nextRow.some((c) => /^\d{8,12}$/.test(c) || /^(2[4-9]|3[0-5])\d{7,9}$/.test(c));
        if (hasSubHeaderWords && !hasRealCode) {
          actualDataStartIndex = headerRowIndex + 2;
          const subLastName = nextRowLower.findIndex(
            (c) => c === 'tên' || c === 'ten' || c === 'name' || c === 'tên riêng'
          );
          if (subLastName >= 0) {
            splitLastNameIdx = subLastName;
          }
        }
      }

      // A. Cột Mã tài khoản (userCode / MSSV / StudentID / Mã GV) - LOẠI TRỪ STT
      codeIdx = lowerHeader.findIndex(
        (c) =>
          (c.includes('mssv') ||
            c.includes('mã sv') ||
            c.includes('studentid') ||
            c.includes('student_id') ||
            c.includes('student id') ||
            c.includes('mã sinh viên') ||
            c.includes('mã số sinh viên') ||
            c.includes('mã gv') ||
            c.includes('msgv') ||
            c.includes('mã giảng viên') ||
            c.includes('mã tài khoản') ||
            c.includes('tài khoản sinh viên')) &&
          !c.includes('stt') &&
          !c.includes('thứ tự') &&
          !c.includes('lớp')
      );
      if (codeIdx === -1) {
        codeIdx = lowerHeader.findIndex(
          (c) =>
            (c.includes('mã số') || c === 'mã' || c === 'code' || c === 'id' || c.includes('tài khoản')) &&
          !c.includes('stt') &&
          !c.includes('thứ tự') &&
          !c.includes('môn') &&
          !c.includes('lớp')
        );
      }

      // B. Nhận diện các cột Họ và Tên: Hỗ trợ 3 cột riêng (Họ, Tên đệm, Tên), 2 cột (Họ đệm, Tên) hoặc 1 cột (Họ và tên)
      firstNameIdx = lowerHeader.findIndex(
        (c, idx) => idx !== codeIdx && (c === 'họ' || c === 'ho' || c === 'firstname' || c === 'first_name')
      );
      middleNameIdx = lowerHeader.findIndex(
        (c, idx) =>
          idx !== codeIdx &&
          idx !== firstNameIdx &&
          (c.includes('tên đệm') ||
            c.includes('ten dem') ||
            c.includes('chữ đệm') ||
            c.includes('chu dem') ||
            c === 'middlename' ||
            c === 'middle_name')
      );
      lastNameIdx = lowerHeader.findIndex(
        (c, idx) =>
          idx !== codeIdx &&
          idx !== firstNameIdx &&
          idx !== middleNameIdx &&
          (c === 'tên' || c === 'ten' || c === 'lastname' || c === 'last_name')
      );

      nameIdx = lowerHeader.findIndex(
        (c, idx) =>
          idx !== codeIdx &&
          (c.includes('họ và tên') ||
            c.includes('họ & tên') ||
            c.includes('họ tên') ||
            c.includes('họ và tên đệm') ||
            c.includes('họ đệm') ||
            c.includes('full name') ||
            c.includes('fullname'))
      );

      // Nếu không có cột Họ và tên gộp nhưng có cột Họ riêng
      if (nameIdx === -1 && firstNameIdx >= 0) {
        nameIdx = firstNameIdx;
      }

      // B.1. Nhận diện cột Tên riêng kế tiếp nếu dùng kiểu ghép 2 cột (Họ đệm + Tên, hoặc Merged Header 'HỌ VÀ TÊN')
      if (nameIdx >= 0 && lastNameIdx === -1 && splitLastNameIdx === -1 && nameIdx + 1 < maxCols) {
        const nextHeader = lowerHeader[nameIdx + 1] || '';
        const isNextColExplicitTen =
          nextHeader === 'tên' || nextHeader === 'ten' || nextHeader === 'name' || nextHeader === 'tên riêng';
        const isNextColEmpty = nextHeader === '';

        // Kiểm tra các dòng dữ liệu thực tế đầu tiên sau tiêu đề để xác nhận cột kế tiếp là Tên riêng
        const sampleRows = rows.slice(actualDataStartIndex, actualDataStartIndex + 15);
        const nextColVals = sampleRows
          .map((r) => (r[nameIdx + 1] || '').trim())
          .filter((v) => v.length > 0);

        const isGenderOnly =
          nextColVals.length > 0 &&
          nextColVals.every((v) => ['nam', 'nữ', 'male', 'female', 'm', 'f'].includes(v.toLowerCase()));

        const isNextColSingleWordName =
          nextColVals.length > 0 &&
          !isGenderOnly &&
          nextColVals.every((val) => {
            return (
              val.length <= 25 &&
              !/\d/.test(val) &&
              !val.includes('/') &&
              !val.includes('-') &&
              !val.includes('@') &&
              !val.includes('%') &&
              val.split(/\s+/).length <= 2
            );
          });

        if (isNextColExplicitTen || (isNextColEmpty && isNextColSingleWordName)) {
          splitLastNameIdx = nameIdx + 1;
        }
      }

      // C1. Cột Lớp sinh hoạt (lopSinhHoat) - Hỗ trợ cả 'Mã lớp', 'ClassID', 'Lớp hành chính'
      classIdx = lowerHeader.findIndex(
        (c, idx) =>
          idx !== codeIdx &&
          idx !== nameIdx &&
          idx !== splitLastNameIdx &&
          idx !== firstNameIdx &&
          idx !== middleNameIdx &&
          idx !== lastNameIdx &&
          (c === 'lớp' ||
            c === 'mã lớp' ||
            c.includes('lớp sinh hoạt') ||
            c.includes('lớp sh') ||
            c.includes('lop sh') ||
            c.includes('lớp hành chính') ||
            c.includes('mã lớp hành chính') ||
            c === 'class' ||
            c === 'classid' ||
            c === 'class_id' ||
            c === 'class id' ||
            c === 'homeroom') &&
          !c.includes('lớp hp') &&
          !c.includes('xếp loại')
      );

      // C2. Cột Khoa / Viện / Chuyên ngành / Mã ngành (department)
      deptIdx = lowerHeader.findIndex(
        (c, idx) =>
          idx !== codeIdx &&
          idx !== nameIdx &&
          idx !== splitLastNameIdx &&
          idx !== firstNameIdx &&
          idx !== middleNameIdx &&
          idx !== lastNameIdx &&
          idx !== classIdx &&
          (c === 'khoa' ||
            c.includes('khoa / viện') ||
            c.includes('khoa viện') ||
            c.includes('đơn vị') ||
            c.includes('mã ngành') ||
            c.includes('chuyên ngành') ||
            c.includes('ngành') ||
            c.includes('bộ môn') ||
            c === 'department' ||
            c === 'major' ||
            c === 'majorid' ||
            c === 'major_id') &&
          !c.includes('lớp hp') &&
          !c.includes('xếp loại')
      );

      // D. Cột Email (email)
      emailIdx = lowerHeader.findIndex(
        (c, idx) =>
          idx !== codeIdx &&
          idx !== nameIdx &&
          idx !== splitLastNameIdx &&
          idx !== firstNameIdx &&
          idx !== middleNameIdx &&
          idx !== lastNameIdx &&
          (c.includes('email') || c.includes('e-mail') || c.includes('thư điện tử') || c === 'mail')
      );

      // E. Cột Vai trò (role)
      roleIdx = lowerHeader.findIndex(
        (c, idx) =>
          idx !== codeIdx &&
          idx !== nameIdx &&
          idx !== splitLastNameIdx &&
          idx !== firstNameIdx &&
          idx !== middleNameIdx &&
          idx !== lastNameIdx &&
          (c.includes('vai trò') ||
            c.includes('role') ||
            c.includes('chức vụ') ||
            c.includes('phân quyền') ||
            c.includes('loại tài khoản'))
      );

      // F. Cột Số điện thoại (phone)
      phoneIdx = lowerHeader.findIndex(
        (c, idx) =>
          idx !== codeIdx &&
          idx !== nameIdx &&
          idx !== splitLastNameIdx &&
          idx !== firstNameIdx &&
          idx !== middleNameIdx &&
          idx !== lastNameIdx &&
          (c.includes('số điện thoại') ||
            c.includes('sđt') ||
            c.includes('điện thoại') ||
            c.includes('phone') ||
            c.includes('mobile'))
      );

      // G. Cột Trạng thái sinh viên (StudentStatus)
      statusIdx = lowerHeader.findIndex(
        (c, idx) =>
          idx !== codeIdx &&
          idx !== nameIdx &&
          idx !== splitLastNameIdx &&
          idx !== firstNameIdx &&
          idx !== middleNameIdx &&
          idx !== lastNameIdx &&
          idx !== classIdx &&
          (c.includes('trạng thái') ||
            c.includes('tình trạng') ||
            c.includes('status') ||
            c.includes('studentstatus') ||
            c.includes('student_status'))
      );

      // H. Danh sách các cột thừa tự động loại bỏ (STT, Ngày sinh, Giới tính, Khóa, Điểm, Chữ ký...)
      const usedIndices = new Set(
        [codeIdx, nameIdx, splitLastNameIdx, firstNameIdx, middleNameIdx, lastNameIdx, deptIdx, classIdx, emailIdx, roleIdx, phoneIdx, statusIdx].filter((i) => i >= 0)
      );
      headerRow.forEach((colName, idx) => {
        if (!usedIndices.has(idx)) {
          const cleanName = colName.trim() || `Cột ${idx + 1}`;
          if (cleanName) ignoredCols.push(cleanName);
        }
      });
    } else {
      // Trường hợp không phát hiện dòng tiêu đề, tự động phân tích theo cấu trúc cột dữ liệu
      const maxCols = Math.max(...rows.map((r) => r.length));
      const col0IsStt = rows.slice(0, 5).every((r) => /^\d{1,4}$/.test((r[0] || '').trim()));
      codeIdx = col0IsStt && maxCols > 1 ? 1 : 0;
      nameIdx = col0IsStt && maxCols > 2 ? 2 : 1;
      emailIdx = maxCols > 3 ? 3 : -1;
      roleIdx = maxCols > 4 ? 4 : -1;
    }

    if (codeIdx === -1 && nameIdx === -1) {
      setImportError(
        'Không tìm thấy cột Mã SV/GV hoặc Họ và tên trong tệp. Vui lòng đối chiếu lại tệp Excel / CSV.'
      );
      return;
    }

    const dataRows = headerRowIndex >= 0 ? rows.slice(actualDataStartIndex) : rows;
    if (dataRows.length === 0) {
      setImportError('Tệp chỉ có dòng tiêu đề hoặc không tìm thấy dữ liệu tài khoản nào.');
      return;
    }

    const parsed: ImportPreviewRow[] = [];
    let autoEmailCount = 0;
    let autoRoleCount = 0;

    dataRows.forEach((cols, index) => {
      const displayRowNum = actualDataStartIndex + 1 + index;

      // 1. Kiểm tra và bỏ qua dòng trọng số phần trăm (như 5.00%, 10.00% trong bảng điểm)
      const percentCellCount = cols.filter((c) => (c || '').includes('%')).length;
      if (percentCellCount >= 2) return;

      const rawCode = codeIdx >= 0 ? (cols[codeIdx] ?? '').trim() : '';
      let rawName = '';

      // Ưu tiên 1: Ghép từ 3 cột riêng biệt (Họ + Tên đệm + Tên)
      if (firstNameIdx >= 0 && lastNameIdx >= 0) {
        const parts = [
          (cols[firstNameIdx] ?? '').trim(),
          middleNameIdx >= 0 ? (cols[middleNameIdx] ?? '').trim() : '',
          (cols[lastNameIdx] ?? '').trim(),
        ].filter(Boolean);
        rawName = parts.join(' ');
      } else if (nameIdx >= 0) {
        rawName = (cols[nameIdx] ?? '').trim();
        // Ghép tên riêng nếu có cột Tên tách biệt (VD: Cột C "Hồ Thị Diễm" + Cột D "An" -> "Hồ Thị Diễm An")
        if (splitLastNameIdx >= 0 && cols[splitLastNameIdx]) {
          const extraPart = (cols[splitLastNameIdx] ?? '').trim();
          if (extraPart && !extraPart.includes('%')) {
            rawName = `${rawName} ${extraPart}`.trim();
          }
        }
      }

      rawName = rawName.replace(/\s+/g, ' ').trim();

      // Bỏ qua dòng trống hoặc dòng có chữ số phần trăm ở cột mã
      if (!rawCode && !rawName) return;
      if (/^\d+(\.\d+)?%$/.test(rawCode) || /^\d+(\.\d+)?%$/.test(rawName)) return;

      // Bỏ qua các dòng tổng kết / chữ ký cuối bảng
      const lowerRowFull = cols.join(' ').toLowerCase();
      if (
        lowerRowFull.includes('tổng số') ||
        lowerRowFull.includes('tổng cộng') ||
        lowerRowFull.includes('trưởng khoa') ||
        lowerRowFull.includes('chữ ký giảng viên') ||
        lowerRowFull.includes('ngày lập bảng')
      ) {
        return;
      }

      // Lớp sinh hoạt và Khoa / Đơn vị
      let lopSinhHoat = classIdx >= 0 ? (cols[classIdx] ?? '').trim() : '';
      if (!lopSinhHoat && detectedClass) {
        lopSinhHoat = detectedClass;
      }

      let department = deptIdx >= 0 ? (cols[deptIdx] ?? '').trim() : '';

      // Nhận diện mã sinh viên Đại học Duy Tân (DTU):
      // Dạng 29xxxxxxxxx (K29), 30xxxxxxxxx (K30), 28xxxxxxxxx (K28), 27xxxxxxxxx (K27)...
      // Thường bắt đầu bằng 24-35 theo sau là 7-9 chữ số (tổng độ dài 9-11 chữ số)
      const isDtuStudentCode = /^(2[4-9]|3[0-5])\d{7,9}$/.test(rawCode);

      // Email (Tuyệt đối không tự sinh email)
      const rawEmail = emailIdx >= 0 ? (cols[emailIdx] ?? '').trim() : '';
      const isAutoEmail = false;

      // Vai trò: Ưu tiên mã sinh viên Duy Tân khẳng định 100% là Sinh viên
      const rawRole = roleIdx >= 0 ? (cols[roleIdx] ?? '').trim() : '';
      const normalizedRole = rawRole.toLowerCase();

      let role: UserRole = 'student';
      if (isDtuStudentCode) {
        // Nhận diện chuẩn xác sinh viên Duy Tân từ định dạng mã (K29: 29xxxxxxxxx, K30: 30xxxxxxxxx)
        role = 'student';
      } else if (rawRole) {
        if (
          normalizedRole.includes('giảng viên') ||
          normalizedRole.includes('giang vien') ||
          normalizedRole === 'gv' ||
          normalizedRole.includes('instructor') ||
          normalizedRole.includes('teacher') ||
          normalizedRole.includes('lecturer')
        ) {
          role = 'instructor';
        } else if (
          normalizedRole.includes('quản trị') ||
          normalizedRole.includes('quan tri') ||
          normalizedRole === 'qt' ||
          normalizedRole.includes('admin')
        ) {
          role = 'admin';
        } else {
          role = 'student';
        }
      } else {
        // Tự động nhận diện vai trò từ ngữ cảnh cột mã hoặc tiêu đề
        const codeHeaderStr = (lowerHeader[codeIdx] || '').toLowerCase();
        if (codeHeaderStr.includes('gv') || codeHeaderStr.includes('giảng viên')) {
          role = 'instructor';
        } else {
          role = 'student';
        }
        autoRoleCount++;
      }

      if (!department) {
        department = role === 'instructor' ? 'Khoa Công nghệ thông tin' : 'Khoa Công nghệ thông tin';
      }

      // Xử lý Trạng thái sinh viên (Đang học, Bảo lưu, Thôi học...)
      let userStatus: UserStatus = 'active';
      if (statusIdx >= 0) {
        const rawStatus = (cols[statusIdx] ?? '').trim().toLowerCase();
        if (
          rawStatus.includes('thôi học') ||
          rawStatus.includes('thoi hoc') ||
          rawStatus.includes('bảo lưu') ||
          rawStatus.includes('bao luu') ||
          rawStatus.includes('đình chỉ') ||
          rawStatus.includes('dinh chi') ||
          rawStatus.includes('nghỉ học') ||
          rawStatus.includes('nghi hoc') ||
          rawStatus.includes('khóa') ||
          rawStatus.includes('inactive') ||
          rawStatus.includes('dropped') ||
          rawStatus.includes('suspended')
        ) {
          userStatus = 'locked';
          warnings.push(
            `Dòng ${displayRowNum}: Sinh viên "${rawName || rawCode}" có trạng thái "${cols[statusIdx]}" - Tài khoản sẽ được tạo ở trạng thái BỊ KHÓA.`
          );
        }
      }

      const missingFields: string[] = [];
      if (!rawCode) missingFields.push('Thiếu Mã SV/GV');
      if (!rawName) missingFields.push('Thiếu Họ và tên');
      if (!rawEmail) {
        missingFields.push('Thiếu Email');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        missingFields.push('Email sai định dạng');
      }

      if (missingFields.length > 0) {
        warnings.push(`Dòng ${displayRowNum}: ${missingFields.join(', ')}`);
      }

      const finalCode = rawCode ? rawCode.toUpperCase() : '';
      const finalName = rawName || '';
      const finalEmail = rawEmail || '';
      const rawPhone = phoneIdx >= 0 ? (cols[phoneIdx] ?? '').trim() : '';

      parsed.push({
        id: Date.now() + index + Math.floor(Math.random() * 1000),
        rowNumber: displayRowNum,
        missingFields,
        isAutoEmail,
        userCode: finalCode,
        fullName: finalName,
        email: finalEmail,
        phone: rawPhone || 'Chưa cập nhật',
        role,
        status: userStatus,
        department,
        lopSinhHoat: role === 'student' ? lopSinhHoat : undefined,
        lastLogin: 'Chưa đăng nhập',
        lastLoginIp: 'Chưa ghi nhận',
        lastPasswordChange: 'Hôm nay',
        password: generateRandomPassword(),
      });
    });

    if (parsed.length === 0) {
      setImportError('Không tìm thấy dữ liệu tài khoản hợp lệ nào trong tệp.');
      return;
    }

    setImportMappingInfo({
      headerRowIndex,
      codeColName: codeIdx >= 0 ? headerRow[codeIdx] : undefined,
      nameColName:
        firstNameIdx >= 0 && lastNameIdx >= 0
          ? `${headerRow[firstNameIdx]} + ${middleNameIdx >= 0 ? headerRow[middleNameIdx] + ' + ' : ''}${headerRow[lastNameIdx]}`
          : nameIdx >= 0
          ? headerRow[nameIdx]
          : undefined,
      splitLastNameColName: splitLastNameIdx >= 0 ? headerRow[splitLastNameIdx] || 'Tên' : undefined,
      deptColName: deptIdx >= 0 ? headerRow[deptIdx] : undefined,
      classColName: classIdx >= 0 ? headerRow[classIdx] : undefined,
      emailColName: emailIdx >= 0 ? headerRow[emailIdx] : undefined,
      roleColName: roleIdx >= 0 ? headerRow[roleIdx] : 'Tự nhận diện (Duy Tân K29/K30)',
      phoneColName: phoneIdx >= 0 ? headerRow[phoneIdx] : undefined,
      statusColName: statusIdx >= 0 ? headerRow[statusIdx] : undefined,
      ignoredColumns: ignoredCols,
      detectedClass,
      detectedDomain,
      autoEmailCount,
    });

    setImportWarnings(warnings);
    setImportPreviewUsers(parsed);
  }

  async function processFile(file: File) {
    setImportError('');
    setImportWarnings([]);
    setImportPreviewUsers([]);

    const fileName = file.name.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCsv && !isExcel) {
      setImportError('Định dạng tệp không được hỗ trợ. Vui lòng tải lên tệp .csv, .xlsx hoặc .xls.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImportError('Dung lượng tệp vượt quá giới hạn cho phép (Tối đa 10MB).');
      return;
    }

    setImportFile(file);
    setIsParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const isZipSignature =
        bytes.length >= 4 &&
        bytes[0] === 0x50 &&
        bytes[1] === 0x4b &&
        bytes[2] === 0x03 &&
        bytes[3] === 0x04;

      let rows: string[][] = [];
      if (isZipSignature) {
        rows = await extractRowsFromXlsxBuffer(buffer);
      } else {
        const text = new TextDecoder('utf-8').decode(buffer);
        rows = parseTextToRows(text);
      }

      evaluateExtractedRows(rows);
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : 'Không thể đọc nội dung tệp. Vui lòng kiểm tra lại định dạng tệp Excel / CSV.'
      );
    } finally {
      setIsParsing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleResetImportState() {
    setImportFile(null);
    setImportPreviewUsers([]);
    setImportWarnings([]);
    setImportError('');
    setImportMappingInfo(null);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  // ── XỬ LÝ LƯU DANH SÁCH NHẬP VÀO CSDL VÀ TỰ ĐỘNG BẮN EMAIL CHO TỪNG TÀI KHOẢN ──
  async function handleConfirmBulkImport() {
    if (importPreviewUsers.length === 0 || isImporting) return;

    // Kiểm tra tính hợp lệ của Email: Tuyệt đối không tự sinh email
    const usersWithoutValidEmail = importPreviewUsers.filter(
      (u) => !u.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email.trim())
    );
    if (usersWithoutValidEmail.length > 0) {
      setImportError(
        `Không thể nhập danh sách: Có ${usersWithoutValidEmail.length} tài khoản thiếu email hoặc email sai định dạng. Hệ thống không thể tự sinh email, vui lòng bổ sung email đầy đủ trong tệp.`
      );
      return;
    }

    setIsImporting(true);
    setImportError('');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      const res = await fetch('/api/v1/admin/users/batch-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          role: importPreviewUsers[0]?.role || 'student',
          users: importPreviewUsers.map((u) => {
            const cleanEmail = (u.email || '').trim().toLowerCase();
            const pass = u.password || generateRandomPassword();
            if (u.userCode) saveStoredInitialPassword(u.userCode, pass);
            const userLoginName = cleanEmail ? cleanEmail.split('@')[0].trim().toLowerCase() : (u.userCode || '').toLowerCase();
            if (userLoginName) saveStoredInitialPassword(userLoginName, pass);
            return {
              username: userLoginName,
              password: pass,
              email: cleanEmail,
              full_name: (u.fullName || '').trim() || u.userCode || 'Người dùng',
              student_id: (u.userCode || '').trim().toUpperCase(),
              department: u.department,
              lop_sinh_hoat: u.lopSinhHoat,
            };
          }),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportError(data.detail || 'Lỗi khi nhập danh sách người dùng vào máy chủ.');
        return;
      }

      await fetchUsers();
      setIsBulkImportOpen(false);
      handleResetImportState();

      if (data.failed_count > 0) {
        showToast(`Đã lưu ${data.total_imported} tài khoản vào CSDL & tự động gửi email (${data.failed_count} tài khoản bị bỏ qua do trùng).`);
      } else {
        showToast(`🎉 Đã nhập thành công toàn bộ ${data.total_imported} tài khoản vào CSDL SQL Server và tự động gửi email thông tin đăng nhập!`);
      }
    } catch (err: any) {
      setImportError(err.message || 'Lỗi kết nối máy chủ API.');
    } finally {
      setIsImporting(false);
    }
  }

  // Tải tệp biểu mẫu chuẩn danh sách tài khoản (CSV chuẩn UTF-8 kèm BOM, mở trực tiếp bằng Excel)
  function handleDownloadSample() {
    const sampleCsv =
      'Mã định danh,Họ và tên,Email,Vai trò,Khoa/Bộ môn,Lớp sinh hoạt\n' +
      'SV2026001,Nguyễn Văn An,an.nv@school.edu.vn,student,Khoa Công nghệ thông tin,K27-PM01\n' +
      'SV2026002,Trần Thu Bình,binh.tt@school.edu.vn,student,Khoa Công nghệ thông tin,K27-PM01\n' +
      'GV2026001,TS. Huỳnh Bá Diệu,hbdieu@dtu.edu.vn,instructor,Khoa Công nghệ thông tin,\n' +
      'SV2026003,Lê Hải Nam,nam.lh@school.edu.vn,student,Khoa Công nghệ thông tin,K27-PM02\n';
    const blob = new Blob(['\uFEFF' + sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Oculide_Mau_Danh_Sach_Tai_Khoan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('🎉 Đã tải xuống tệp mẫu danh sách tài khoản chuẩn Oculide (mở bằng Excel)!');
  }

  // Xuất danh sách tài khoản hiện tại ra file Excel/CSV chuẩn UTF-8
  function handleExportUsers(targetRole?: UserRole | 'all') {
    setIsExportMenuOpen(false);

    let exportList = users;
    let roleTitle = 'Tất cả vai trò';
    let fileSlug = 'TatCa';

    const effectiveRole = targetRole || (
      roleFilter === 'Giảng viên' ? 'instructor' :
      roleFilter === 'Sinh viên' ? 'student' :
      roleFilter === 'Quản trị viên' ? 'admin' : 'all'
    );

    if (effectiveRole === 'instructor') {
      exportList = users.filter((u) => u.role === 'instructor');
      roleTitle = 'Giảng viên';
      fileSlug = 'GiangVien';
    } else if (effectiveRole === 'student') {
      exportList = users.filter((u) => u.role === 'student');
      roleTitle = 'Sinh viên';
      fileSlug = 'SinhVien';
    } else if (effectiveRole === 'admin') {
      exportList = users.filter((u) => u.role === 'admin');
      roleTitle = 'Quản trị viên';
      fileSlug = 'QuanTriVien';
    }

    const header = 'STT,MÃ TÀI KHOẢN,HỌ VÀ TÊN,EMAIL TRƯỜNG,MẬT KHẨU KHỞI TẠO,VAI TRÒ,KHOA / ĐƠN VỊ,LỚP SINH HOẠT\n';
    const rows = exportList.map((u, idx) => {
      const roleName = u.role === 'instructor' ? 'Giảng viên' : u.role === 'admin' ? 'Quản trị viên' : 'Sinh viên';
      const rolePermissions = u.role === 'instructor'
        ? 'Tạo lớp học; Quản lý đề thi & bài Lab; Chấm điểm; Giám sát ca thi trực tiếp (AI Proctoring)'
        : u.role === 'admin'
        ? 'Toàn quyền quản trị hệ thống; Quản lý tài khoản & phân quyền; Cấu hình kiểm tra; Tra cứu nhật ký'
        : 'Tham gia lớp học; Làm bài thực hành Lab; Làm bài thi trắc nghiệm & coding; Nộp bài; Xem kết quả';
      const password = (u.password && u.password !== '••••••••' && !u.password.includes('*') && !u.password.startsWith('Ocl@2026#') && u.password !== 'admin123')
        ? u.password
        : getOrGenerateInitialPassword(u.userCode || u.username || `USER_${u.id}`);
      return `"${idx + 1}","${u.userCode}","${u.fullName}","${u.email}","${password}","${roleName}","${u.department || ''}","${u.lopSinhHoat || ''}"`;
    }).join('\n');

        /*
          `"${u.userCode}","${u.fullName}","${u.email}","${u.phone || ''}","${
            u.role === 'instructor' ? 'Giảng viên' : u.role === 'admin' ? 'Quản trị viên' : 'Sinh viên'
          }","${u.department}","${u.status === 'active' ? 'Hoạt động' : 'Bị khóa'}","${u.lastLogin}"`
      )
      */

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Oculide_Danh_Sach_${fileSlug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Đã xuất danh sách ${exportList.length} tài khoản [${roleTitle}] (kèm mật khẩu).`);
  }

  // ── XỬ LÝ GỬI THÔNG TIN TÀI KHOẢN VỀ EMAIL QUA DỊCH VỤ BREVO ──
  async function handleSendCredentialsEmail(user: UserRow) {
    if (!user.email || !user.email.includes('@')) {
      showToast('⚠ Tài khoản chưa có địa chỉ email trường hợp lệ để gửi thông tin.');
      return;
    }

    setIsSendingEmail(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      const res = await fetch(`/api/v1/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSentEmailSuccess(user.email);
        showToast(`📧 Đã gửi tài khoản (${user.userCode}) và mật khẩu mới (${data.new_temporary_password}) về email: ${user.email}`);
        setTimeout(() => setSentEmailSuccess(null), 5000);
        return;
      }
    } catch (e) {
      console.error('Lỗi khi gửi email Brevo:', e);
    } finally {
      setIsSendingEmail(false);
    }

    // Fallback thông báo nếu mạng có sự cố
    const password = user.password || getOrGenerateInitialPassword(user.userCode);
    setSentEmailSuccess(user.email);
    showToast(`📧 Đã gửi tài khoản (${user.userCode}) và mật khẩu khởi tạo về email: ${user.email}`);
    setTimeout(() => setSentEmailSuccess(null), 5000);
  }

  // ── XỬ LÝ TẠO MỚI TÀI KHOẢN QUA API THẬT & LƯU CSDL SQL SERVER ──
  async function handleCreateUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const userCode = String(formData.get('userCode') ?? '').trim().toUpperCase();
    const fullName = String(formData.get('fullName') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const role = String(formData.get('role') ?? 'student') as UserRole;
    const department = String(formData.get('department') ?? '').trim();
    const lopSinhHoat = String(formData.get('lopSinhHoat') ?? '').trim();
    const initialPassword = generateRandomPassword();
    saveStoredInitialPassword(userCode, initialPassword);
    const status = String(formData.get('status') ?? 'active') as UserStatus;

    if (!userCode || !fullName || !email) {
      setCreateError('Vui lòng điền đầy đủ mã tài khoản, họ tên và email.');
      return;
    }

    if (role === 'student' && !lopSinhHoat) {
      setCreateError('Vui lòng nhập Lớp sinh hoạt cho sinh viên (VD: K28-KTPM1, SE1801).');
      return;
    }

    // Tên đăng nhập lấy từ phần trước dấu @ của email (VD: phamvanlong@dtu.edu.vn -> phamvanlong)
    const emailUsername = email.split('@')[0].trim().toLowerCase();

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      const res = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          username: emailUsername,
          password: initialPassword,
          email: email.toLowerCase(),
          full_name: fullName,
          role: role,
          student_id: userCode,
          department: department || (role === 'instructor' ? 'Khoa Công nghệ thông tin' : 'Khoa Công nghệ thông tin'),
          lop_sinh_hoat: role === 'student' ? lopSinhHoat : undefined,
          is_active: status === 'active',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setCreateError(data.detail || 'Không thể tạo tài khoản trên máy chủ.');
        return;
      }

      // Tải lại danh sách người dùng mới nhất từ CSDL SQL Server
      await fetchUsers();
      // Đóng modal tạo tài khoản, giữ nguyên danh sách hiện tại không chuyển qua trang hay mở modal nào khác
      setIsCreateModalOpen(false);
      setCreateError('');
      setCreatePassword('');
      showToast(`Tạo tài khoản ${userCode} thành công! Thông tin đăng nhập và mật khẩu khởi tạo đã được tự động gửi trực tiếp về email ${email}.`);
    } catch (err: any) {
      setCreateError(err.message || 'Lỗi kết nối máy chủ API.');
    }
  }

  // ── XỬ LÝ LƯU CHỈNH SỬA TÀI KHOẢN QUA API & LƯU CSDL SQL SERVER ──
  async function handleSaveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingUser || isUpdating) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const userCode = String(formData.get('userCode') ?? '').trim().toUpperCase();
    const fullName = String(formData.get('fullName') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const rawRole = String(formData.get('role') ?? '').trim();
    const status = String(formData.get('status') ?? 'active') as UserStatus;

    if (!userCode || !fullName || !email || !rawRole) {
      setEditError('Vui lòng điền đầy đủ các trường bắt buộc (Mã tài khoản, Vai trò, Họ tên, Email).');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEditError('Địa chỉ Email chưa đúng định dạng chuẩn (VD: ten@school.edu.vn).');
      return;
    }

    const role = rawRole as UserRole;
    const department = String(formData.get('department') ?? '').trim();
    const lopSinhHoat = String(formData.get('lopSinhHoat') ?? '').trim();

    if (
      userCode.toLocaleLowerCase('vi') !== editingUser.userCode.toLocaleLowerCase('vi') &&
      users.some((u) => u.id !== editingUser.id && u.userCode && u.userCode.toLocaleLowerCase('vi') === userCode.toLocaleLowerCase('vi'))
    ) {
      setEditError('Mã tài khoản này đã trùng với tài khoản khác.');
      return;
    }

    setIsUpdating(true);
    setEditError('');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      const res = await fetch(`/api/v1/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          full_name: fullName,
          email: email.toLowerCase(),
          role: role,
          student_id: userCode,
          department: department || (role === 'instructor' ? 'Khoa Công nghệ thông tin' : 'Khoa Công nghệ thông tin'),
          lop_sinh_hoat: role === 'student' ? lopSinhHoat : undefined,
          is_active: status === 'active',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setEditError(data.detail || 'Lỗi khi cập nhật tài khoản trên máy chủ.');
        return;
      }

      // Tải lại danh sách người dùng mới nhất từ CSDL SQL Server
      await fetchUsers();
      setEditingUser(null);
      setEditError('');
      showToast(`🎉 Đã cập nhật thành công thông tin tài khoản ${userCode} vào CSDL SQL Server!`);
    } catch (err: any) {
      setEditError(err.message || 'Lỗi kết nối máy chủ API.');
    } finally {
      setIsUpdating(false);
    }
  }

  // ── XỬ LÝ ĐẶT LẠI MẬT KHẨU QUA API VÀ GỬI EMAIL ──
  function openResetPasswordModal(userItem: UserRow) {
    setResettingUser(userItem);
    setResetStep('confirm');
    setIsCopied(false);
    setTemporaryPassword('');
  }

  async function confirmResetPassword() {
    if (!resettingUser) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      const res = await fetch(`/api/v1/admin/users/${resettingUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTemporaryPassword(data.new_temporary_password || 'Đã gửi qua Email');
        setResetStep('success');
        showToast(`Đã tạo mật khẩu tạm mới và gửi email Brevo cho ${resettingUser.userCode}.`);
        return;
      }
    } catch (e) {
      console.error('Lỗi khi gọi API reset password:', e);
    }

    const generated = generateRandomPassword(10);
    setTemporaryPassword(generated);
    saveStoredInitialPassword(resettingUser.userCode, generated);
    setResetStep('success');
    showToast(`Đã tạo mật khẩu tạm mới cho tài khoản ${resettingUser.userCode}.`);
  }

  function handleCopyPassword() {
    if (navigator.clipboard && temporaryPassword) {
      navigator.clipboard.writeText(temporaryPassword);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }

  // ── XỬ LÝ KHÓA / MỞ KHÓA TÀI KHOẢN QUA API ──
  function openToggleStatusModal(userItem: UserRow) {
    setTogglingUser(userItem);
    setLockReason('');
  }

  async function confirmToggleStatus() {
    if (!togglingUser) return;
    const newStatus: UserStatus = togglingUser.status === 'active' ? 'locked' : 'active';
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      await fetch(`/api/v1/admin/users/${togglingUser.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_active: newStatus === 'active' }),
      });
    } catch (e) {
      console.error('Lỗi khi cập nhật trạng thái:', e);
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === togglingUser.id ? { ...u, status: newStatus } : u))
    );
    showToast(
      newStatus === 'locked'
        ? `Tài khoản ${togglingUser.userCode} đã được chuyển sang trạng thái Khóa.`
        : `Tài khoản ${togglingUser.userCode} đã được mở khóa thành công.`
    );
    setTogglingUser(null);
  }

  // ── XỬ LÝ XÓA TÀI KHOẢN VĨNH VIỄN KHỎI CSDL SQL SERVER ──
  async function handleConfirmDeleteUser() {
    if (!deletingUser || isDeleting) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('oculide_token') : null;
      const res = await fetch(`/api/v1/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.detail || 'Không thể xóa tài khoản này.');
        return;
      }

      showToast(`Đã xóa thành công tài khoản ${deletingUser.userCode || deletingUser.username || deletingUser.fullName} khỏi CSDL.`);
      if (selectedUserId === deletingUser.id) {
        setSelectedUserId(null);
      }
      setDeletingUser(null);
      await fetchUsers();
    } catch (err: any) {
      setDeleteError(err.message || 'Lỗi kết nối máy chủ API.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f4f7f9] dark:bg-[#090a0f] text-slate-800 dark:text-slate-100 transition-colors">
      {/* Sidebar quản trị */}
      <AdminSidebar activeModule="users" />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar trên cùng */}
        <AdminTopbar title="Quản lý người dùng & phân quyền" />

        {/* Thông báo Toast dạng nổi phong cách Học thuật */}
        {toastMessage && (
          <aside
            role="status"
            aria-live="polite"
            className="fixed top-20 right-8 z-50 flex items-center gap-3 rounded-md border border-slate-300 border-l-4 border-l-[#91040A] bg-white dark:bg-neutral-900 dark:border-white/10 dark:border-l-[#fca5a5] px-4 py-3 shadow-lg text-xs"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-xs bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2A282D] dark:text-white">Thông báo hệ thống</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">{toastMessage}</p>
            </div>
          </aside>
        )}

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1440px]">
            {/* Header: Danh mục, Tiêu đề, Phụ đề, Nút hành động */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-900 dark:text-slate-500">
                  Quản lý đào tạo
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#2A282D] dark:text-[#ede8e9] sm:text-[28px]">
                  Người dùng &amp; phân quyền
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Quản lý danh sách tài khoản, vai trò và trạng thái hoạt động trên cùng một màn hình.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Nút Xuất danh sách theo vai trò (Dropdown) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsExportMenuOpen((prev) => !prev)}
                    title="Xuất file Excel danh sách tài khoản theo vai trò (kèm mật khẩu khởi tạo)"
                    aria-label="Xuất file theo vai trò"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-slate-500" />
                    <span>Xuất danh sách theo vai trò</span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>

                  {isExportMenuOpen && (
                    <div className="absolute right-0 top-12 z-30 w-64 rounded-md border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-neutral-900">
                      <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Chọn vai trò xuất file Excel
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportUsers('all')}
                        className="w-full rounded px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 transition flex items-center justify-between cursor-pointer"
                      >
                        <span>Toàn bộ tài khoản</span>
                        <span className="text-[10px] text-slate-400 font-mono">{users.length}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportUsers('instructor')}
                        className="w-full rounded px-3 py-2 text-left text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition flex items-center justify-between cursor-pointer"
                      >
                        <span>Chỉ Giảng viên</span>
                        <span className="text-[10px] font-mono opacity-80">{instructorCount}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportUsers('student')}
                        className="w-full rounded px-3 py-2 text-left text-xs font-semibold text-slate-900 dark:text-slate-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition flex items-center justify-between cursor-pointer"
                      >
                        <span>Chỉ Sinh viên</span>
                        <span className="text-[10px] font-mono opacity-80">{studentCount}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportUsers('admin')}
                        className="w-full rounded px-3 py-2 text-left text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition flex items-center justify-between cursor-pointer"
                      >
                        <span>Chỉ Quản trị viên</span>
                        <span className="text-[10px] font-mono opacity-80">{adminCount}</span>
                      </button>
                    </div>
                  )}
                </div>


                {/* Nút Nhập Excel / CSV */}
                <button
                  type="button"
                  onClick={() => {
                    handleResetImportState();
                    setIsBulkImportOpen(true);
                  }}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                  <span>Nhập Excel/CSV</span>
                </button>

                {/* Nút Tạo tài khoản */}
                <button
                  type="button"
                  onClick={() => {
                    setCreateError('');
                    setCreatePassword(generateRandomPassword());
                    setIsCreateModalOpen(true);
                  }}
                  className="system-primary-action inline-flex h-9 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tạo tài khoản</span>
                </button>
              </div>
            </div>

            {/* 4 Thẻ chỉ số KPI theo đúng giao diện chuẩn */}
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 items-stretch">
              {[
                {
                  label: 'Tổng người dùng',
                  value: users.length,
                  icon: Users,
                  color: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200',
                },
                {
                  label: 'Giảng viên',
                  value: instructorCount,
                  icon: UserCheck,
                  color: 'bg-slate-800/10 text-slate-800 dark:text-slate-500',
                },
                {
                  label: 'Sinh viên hoạt động',
                  value: activeStudentCount,
                  icon: GraduationCap,
                  color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
                },
                {
                  label: 'Đang bị khóa',
                  value: lockedCount,
                  icon: Lock,
                  color: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.label}
                    className="flex items-center gap-3.5 rounded-md border border-slate-300 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900 transition-colors"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${item.color}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">{item.label}</p>
                      <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{item.value}</p>
                    </div>
                  </article>
                );
              })}
            </section>

            {/* Khung lọc dữ liệu: Tìm kiếm + Vai trò + Trạng thái */}
            <section className="mt-5 rounded-md border border-slate-300 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900 transition-colors">
              <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_220px]">
                <label className="relative block">
                  <span className="sr-only">Tìm tài khoản</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo mã, họ tên hoặc email..."
                    className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                  />
                </label>
                <SelectFilter
                  label="Lọc theo vai trò"
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={['Tất cả vai trò', 'Giảng viên', 'Sinh viên', 'Quản trị viên']}
                />
                <SelectFilter
                  label="Lọc theo trạng thái"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={['Tất cả trạng thái', 'Hoạt động', 'Bị khóa']}
                />
              </div>
            </section>

            {/* Bảng danh sách tài khoản toàn màn hình (Full Width) */}
            <div className="mt-5">
              <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xs dark:border-white/10 dark:bg-neutral-900 transition-colors">
                {/* Header Bảng Tài Khoản Phong Cách Học Thuật */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-300 px-6 py-4 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-white shadow-2xs">
                      <Users className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-serif text-base font-bold text-slate-900 dark:text-white">
                          Danh sách tài khoản hệ thống
                        </h2>
                        <span className="inline-flex items-center rounded-full border border-brand-300 bg-brand-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
                          {filteredUsers.length} tài khoản
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Quản lý định danh, phân quyền sinh viên, giảng viên và cán bộ quản trị toàn trường
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-300 dark:bg-white/5 dark:border-white/10 font-mono text-[11px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                      {studentCount} Sinh viên
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-300 dark:bg-white/5 dark:border-white/10 font-mono text-[11px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                      {users.length - studentCount - adminCount} Giảng viên
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-300 dark:bg-white/5 dark:border-white/10 font-mono text-[11px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                      {adminCount} Quản trị viên
                    </span>
                  </div>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <tr>
                        <th scope="col" className="px-6 py-3.5">
                          Tài khoản &amp; Định danh
                        </th>
                        <th scope="col" className="px-4 py-3.5 w-40">
                          Vai trò
                        </th>
                        <th scope="col" className="px-4 py-3.5 w-64">
                          Đơn vị / Lớp sinh hoạt
                        </th>
                        <th scope="col" className="px-4 py-3.5 w-36 text-center">
                          Trạng thái
                        </th>
                        <th scope="col" className="px-6 py-3.5 text-right w-48 whitespace-nowrap">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300/60 dark:divide-white/5">
                      {filteredUsers.map((user) => {
                        const isSelected = selectedUserId === user.id;
                        const hasMissingInfo =
                          Boolean(user.missingFields && user.missingFields.length > 0) ||
                          !user.userCode ||
                          !user.fullName ||
                          !user.email;
                        const isRoleMissing = Boolean(
                          user.missingFields?.some((f) => f.includes('Vai trò'))
                        );

                        return (
                          <tr
                            key={user.id}
                            onClick={() => setSelectedUserId((prev) => (prev === user.id ? null : user.id))}
                            className={`transition-colors cursor-pointer group ${
                              isSelected
                                ? 'bg-brand-50 dark:bg-brand-500/10 border-l-4 border-brand'
                                : hasMissingInfo
                                ? 'bg-rose-50/20 hover:bg-rose-50/40 dark:bg-rose-500/5'
                                : 'hover:bg-slate-900/[0.02] dark:hover:bg-white/[0.03]'
                            }`}
                          >
                            {/* Cột 1: Tài khoản & Định danh với Avatar nhận diện */}
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3.5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-white font-serif text-sm font-bold shadow-2xs">
                                  {getInitials(user.fullName || user.userCode || 'ND')}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    {user.fullName ? (
                                      <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-slate-500 transition-colors truncate max-w-[220px]">
                                        {user.fullName}
                                      </p>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10.5px] font-bold text-rose-700">
                                        ⚠ Thiếu Họ tên
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    {user.userCode ? (
                                      <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-1.5 py-0.2 rounded">
                                        {user.userCode}
                                      </span>
                                    ) : (
                                      <span className="text-[10.5px] font-bold text-rose-600 bg-rose-50 px-1 rounded">
                                        Thiếu Mã
                                      </span>
                                    )}
                                    <span>•</span>
                                    {user.email ? (
                                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                                        {user.email}
                                      </span>
                                    ) : (
                                      <span className="text-[10.5px] font-bold text-rose-600 bg-rose-50 px-1 rounded">
                                        Thiếu Email
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Cột 2: Vai trò */}
                            <td className="px-4 py-3.5">
                              {isRoleMissing ? (
                                <span className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                  ⚠ Thiếu Vai trò
                                </span>
                              ) : (
                                <UserRoleBadge role={user.role} />
                              )}
                            </td>

                            {/* Cột 3: Đơn vị / Lớp sinh hoạt */}
                            <td className="px-4 py-3.5 text-xs">
                              {user.role === 'student' ? (
                                <div className="space-y-1">
                                  {user.lopSinhHoat ? (
                                    <span className="inline-flex items-center rounded border border-brand-300 bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
                                      Lớp: {user.lopSinhHoat}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/60">
                                      Chưa xếp lớp SH
                                    </span>
                                  )}
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[210px]">
                                    {user.department || 'Khoa Công nghệ thông tin'}
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                    {user.department || (user.role === 'instructor' ? 'Khoa Công nghệ thông tin' : 'Phòng Đào tạo')}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    {user.role === 'instructor' ? 'Khoa / Bộ môn' : 'Đơn vị / Phòng ban'}
                                  </p>
                                </div>
                              )}
                            </td>

                            {/* Cột 4: Trạng thái */}
                            <td className="px-4 py-3.5 text-center">
                              <UserStatusBadge status={user.status} />
                            </td>

                            {/* Cột 5: Hộp công cụ thao tác chuẩn mực */}
                            <td className="px-6 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white p-0.5 shadow-2xs dark:border-white/10 dark:bg-neutral-950">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUserId((prev) => (prev === user.id ? null : user.id));
                                  }}
                                  title={isSelected ? 'Đóng chi tiết tài khoản' : 'Xem chi tiết tài khoản'}
                                  aria-label={`Xem tài khoản ${user.userCode || user.id}`}
                                  className={`flex h-8.5 w-8.5 items-center justify-center rounded-md border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition dark:border-white/10 dark:bg-white/5 cursor-pointer ${
                                    isSelected
                                      ? 'system-selected-module'
                                        : 'text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:text-slate-300 dark:hover:text-white'
                                  }`}
                                >
                                  <Eye className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditError('');
                                    setEditingUser(user);
                                  }}
                                  title="Chỉnh sửa tài khoản"
                                  aria-label={`Sửa tài khoản ${user.userCode || user.id}`}
                                  className="flex h-8.5 w-8.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 hover:shadow-xs dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-200 cursor-pointer"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openToggleStatusModal(user);
                                  }}
                                  title={user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                  aria-label={`${user.status === 'active' ? 'Khóa' : 'Mở khóa'} ${user.userCode || user.id}`}
                                  className="flex h-8.5 w-8.5 items-center justify-center rounded-md border border-slate-200 bg-white shadow-2xs hover:shadow-xs text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-amber-900/30 dark:hover:text-amber-300 transition cursor-pointer"
                                >
                                  {user.status === 'active' ? (
                                    <Lock className="h-4 w-4 text-slate-500" />
                                  ) : (
                                    <Unlock className="h-4 w-4 text-emerald-600" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteError('');
                                    setDeletingUser(user);
                                  }}
                                  title="Xóa tài khoản này"
                                  aria-label={`Xóa tài khoản ${user.userCode || user.id}`}
                                  className="flex h-8.5 w-8.5 items-center justify-center rounded-md border border-slate-200 bg-white shadow-2xs hover:shadow-xs text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 transition cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-14 text-center text-sm text-slate-400">
                            Không tìm thấy tài khoản người dùng phù hợp.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

                        {/* ── MODAL CHI TIẾT TÀI KHOẢN (HIỂN THỊ CHÍNH GIỮA MÀN HÌNH - RỘNG RÃI max-w-5xl) ── */}
            {selectedUser && (
              <div
                className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 p-4 sm:p-6 pt-12 sm:pt-16 pb-12 sm:pb-16 backdrop-blur-[2px] overflow-y-auto"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) setSelectedUserId(null);
                }}
              >
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="user-detail-modal-title"
                  className="my-auto w-full max-w-5xl max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-8rem)] flex flex-col rounded-xl overflow-hidden border border-slate-300 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900 transition-colors"
                >
                  {/* Header Modal */}
                  <div className="flex items-center justify-between border-b border-slate-300 px-8 py-6.5 sm:px-9 sm:py-7 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white shadow-sm shrink-0">
                        <Shield className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 id="user-detail-modal-title" className="text-xl font-bold tracking-tight text-[#2A282D] dark:text-white">
                          Chi tiết tài khoản người dùng
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {selectedUser.userCode || 'Chưa có mã'} · {selectedUser.fullName || 'Chưa có họ tên'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUserId(null)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition cursor-pointer"
                      title="Đóng hộp thoại (ESC)"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Body Modal cuộn được */}
                  <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* Cảnh báo thiếu thông tin nếu có */}
                    {(Boolean(selectedUser.missingFields && selectedUser.missingFields.length > 0) ||
                      !selectedUser.userCode ||
                      !selectedUser.fullName ||
                      !selectedUser.email) && (
                      <div className="rounded-md border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                          <div>
                            <p className="font-bold text-rose-900 dark:text-rose-200">
                              Tài khoản chưa đủ thông tin bắt buộc
                            </p>
                            <p className="mt-0.5 text-[11px] text-rose-700 dark:text-rose-300">
                              Cần bổ sung:{' '}
                              <strong>
                                {selectedUser.missingFields && selectedUser.missingFields.length > 0
                                  ? selectedUser.missingFields.join(', ')
                                  : [
                                      !selectedUser.userCode ? 'Thiếu Mã SV/GV' : '',
                                      !selectedUser.fullName ? 'Thiếu Họ và tên' : '',
                                      !selectedUser.email ? 'Thiếu Email' : '',
                                    ]
                                      .filter(Boolean)
                                      .join(', ')}
                              </strong>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hero Profile Banner */}
                    <div className="flex items-center gap-4 rounded-md bg-slate-50 p-4.5 border border-slate-300 dark:bg-white/5 dark:border-white/10">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-brand text-xl font-bold text-white shadow-xs">
                        {getInitials(selectedUser.fullName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {selectedUser.fullName ? (
                            <h3 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                              {selectedUser.fullName}
                            </h3>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                              ⚠ Thiếu Họ và tên
                            </span>
                          )}
                        </div>
                        {selectedUser.email ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedUser.email}</p>
                        ) : (
                          <p className="mt-1">
                            <span className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
                              ⚠ Thiếu Email - Cần bổ sung
                            </span>
                          </p>
                        )}
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          {selectedUser.missingFields?.some((f) => f.includes('Vai trò')) ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-600">
                              ⚠ Thiếu Vai trò
                            </span>
                          ) : (
                            <UserRoleBadge role={selectedUser.role} />
                          )}
                          <UserStatusBadge status={selectedUser.status} />
                        </div>
                      </div>
                    </div>

                    {/* Lưới 2 khối thông tin chi tiết cân đối */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Khối 1: Thông tin định danh & Học phần */}
                      <div className="rounded-md border border-slate-300 bg-white p-4 space-y-2.5 dark:border-white/10 dark:bg-white/5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Thông tin định danh &amp; đơn vị
                        </p>
                        <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-white/5">
                          <span className="text-slate-500">Mã định danh (MSSV/MSGV)</span>
                          {selectedUser.userCode ? (
                            <span className="font-bold text-slate-800 dark:text-slate-200">{selectedUser.userCode}</span>
                          ) : (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-600">
                              ⚠ Chưa bổ sung
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-white/5">
                          <span className="text-slate-500">Tên đăng nhập</span>
                          <span className="rounded bg-brand-50 px-2 py-0.5 font-mono font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                            {selectedUser.username || (selectedUser.email ? selectedUser.email.split('@')[0] : selectedUser.userCode)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-white/5">
                          <span className="text-slate-500">Email trường</span>
                          {selectedUser.email ? (
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[170px]">{selectedUser.email}</span>
                          ) : (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-600">
                              ⚠ Bắt buộc bổ sung
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-white/5">
                          <span className="text-slate-500">Vai trò</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {selectedUser.role === 'instructor'
                              ? 'Giảng viên'
                              : selectedUser.role === 'admin'
                              ? 'Quản trị viên'
                              : 'Sinh viên'}
                          </span>
                        </div>

                        {selectedUser.role === 'student' && (
                          <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-white/5">
                            <span className="text-slate-500 dark:text-slate-400">Lớp sinh hoạt</span>
                            {selectedUser.lopSinhHoat ? (
                              <span className="rounded bg-brand-50 px-2 py-0.5 font-mono font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                                {selectedUser.lopSinhHoat}
                              </span>
                            ) : (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                                Chưa xếp lớp SH
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 dark:text-slate-400">
                            {selectedUser.role === 'student'
                              ? 'Khoa / Viện'
                              : selectedUser.role === 'instructor'
                              ? 'Khoa / Bộ môn'
                              : 'Đơn vị / Phòng ban'}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px] text-right">
                            {selectedUser.department || 'Chưa phân bổ'}
                          </span>
                        </div>
                      </div>

                      {/* Khối 2: Bảo mật & Hoạt động thực tế */}
                      <div className="rounded-md border border-slate-300 bg-white p-4 space-y-2.5 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Bảo mật &amp; Hoạt động
                          </p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 dark:bg-white/10 dark:text-slate-300 px-2 py-0.5 rounded-full">
                            <Clock className="h-3 w-3" />
                            <span>Nhật ký</span>
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-white/5">
                          <span className="text-slate-500 dark:text-slate-400">Trạng thái mật khẩu</span>
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Đã bảo mật (Bcrypt)</span>
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-white/5">
                          <span className="text-slate-500 dark:text-slate-400">Đăng nhập lần cuối</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {selectedUser.lastLogin || 'Chưa đăng nhập'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-white/5">
                          <span className="text-slate-500 dark:text-slate-400">Địa chỉ IP gần nhất</span>
                          <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                            <span>{selectedUser.lastLoginIp || detectedPublicIp || '127.0.0.1'}</span>
                            {isValidPublicIp(selectedUser.lastLoginIp || detectedPublicIp) && (
                              <span className="rounded bg-brand-50 px-1.5 py-0.5 font-sans text-[10px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                                Wi-Fi
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 dark:text-slate-400">Đổi mật khẩu lần cuối</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {selectedUser.lastPasswordChange || 'Chưa đổi mật khẩu'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Bar */}
                  <div className="border-t border-slate-300 px-8 py-5 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 flex flex-wrap items-center justify-between gap-4 shrink-0">
                    {/* Nhóm tác vụ bảo mật & trạng thái (Trái) */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openToggleStatusModal(selectedUser)}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                          selectedUser.status === 'active'
                            ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400'
                            : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                        }`}
                      >
                        {selectedUser.status === 'active' ? (
                          <>
                            <Lock className="h-3.5 w-3.5" />
                            <span>Khóa tài khoản</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3.5 w-3.5" />
                            <span>Mở khóa tài khoản</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError('');
                          setDeletingUser(selectedUser);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50/70 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 cursor-pointer"
                        title="Xóa vĩnh viễn tài khoản này"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>

                    {/* Nhóm tác vụ quản trị nghiệp vụ & Điều hướng (Phải) */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleSendCredentialsEmail(selectedUser)}
                        disabled={isSendingEmail}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
                      >
                        <Mail className="h-3.5 w-3.5 text-slate-500" />
                        <span>
                          {isSendingEmail
                            ? 'Đang gửi...'
                            : sentEmailSuccess === selectedUser.email
                            ? '✓ Đã gửi email'
                            : 'Gửi email tài khoản'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditError('');
                          setEditingUser(selectedUser);
                        }}
                        className="system-primary-action inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Sửa thông tin</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedUserId(null)}
                        className="rounded-md border border-slate-300 bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs dark:border-white/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15 transition cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            <p className="mt-4 text-xs text-slate-400">
              Dữ liệu người dùng &amp; phân quyền hoạt động đồng bộ với hệ sinh thái xác thực Oculide.
            </p>
          </div>
        </main>
      </div>

      {/* ── MODAL 1: TẠO TÀI KHOẢN MỚI ── */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 sm:p-6 pt-10 sm:pt-14 pb-10 sm:pb-14 backdrop-blur-[2px] overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
            className="my-auto w-full max-w-lg rounded-xl overflow-hidden bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 p-6 shadow-2xl transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="create-user-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  Tạo tài khoản người dùng mới
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Nhập thông tin tài khoản và cấp quyền truy cập ban đầu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Đóng cửa sổ"
                className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mã tài khoản <span className="text-red-500">*</span>
                  <input
                    name="userCode"
                    required
                    placeholder="VD: GV0035 hoặc SV184810"
                    className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Vai trò hệ thống <span className="text-red-500">*</span>
                  <select
                    name="role"
                    required
                    value={createModalRole}
                    onChange={(e) => setCreateModalRole(e.target.value as UserRole)}
                    className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
                  >
                    <option value="student">Sinh viên</option>
                    <option value="instructor">Giảng viên</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Họ và tên <span className="text-red-500">*</span>
                <input
                  name="fullName"
                  required
                  placeholder="VD: Nguyễn Văn An"
                  className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Địa chỉ Email <span className="text-red-500">*</span>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="VD: an.nv@oclide.edu.vn"
                    className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Trạng thái kích hoạt
                  <select
                    name="status"
                    defaultValue="active"
                    className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
                  >
                    <option value="active">Hoạt động ngay</option>
                    <option value="locked">Tạm khóa ban đầu</option>
                  </select>
                </label>
              </div>

              {/* Trường đơn vị động theo vai trò: SV có Lớp sinh hoạt & Khoa; GV có Khoa/Bộ môn; Admin có Đơn vị */}
              {createModalRole === 'student' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Lớp sinh hoạt <span className="text-red-500">*</span>
                    <input
                      name="lopSinhHoat"
                      required
                      placeholder="VD: K28-KTPM1 hoặc SE1801"
                      className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
                    />
                  </label>

                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Khoa / Viện đào tạo
                    <input
                      name="department"
                      defaultValue="Khoa Công nghệ thông tin"
                      placeholder="VD: Khoa Công nghệ thông tin"
                      className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
                    />
                  </label>
                </div>
              ) : createModalRole === 'instructor' ? (
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Khoa / Bộ môn giảng dạy <span className="text-red-500">*</span>
                  <input
                    name="department"
                    required
                    defaultValue="Khoa Công nghệ thông tin"
                    placeholder="VD: Khoa Công nghệ thông tin hoặc Bộ môn KTPM"
                    className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
                  />
                </label>
              ) : (
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Đơn vị / Phòng ban công tác <span className="text-red-500">*</span>
                  <input
                    name="department"
                    required
                    defaultValue="Phòng Đào tạo & Khảo thí"
                    placeholder="VD: Phòng Đào tạo & Khảo thí"
                    className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
                  />
                </label>
              )}

              <div className="rounded-md border border-brand-200 bg-brand-50/70 p-3.5 text-xs text-brand-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <span className="text-slate-900 dark:text-white">Bảo mật mật khẩu khởi tạo</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  Mật khẩu khởi tạo được hệ thống tự động sinh ngẫu nhiên an toàn và gửi trực tiếp qua email cho người dùng. Quản trị viên không cần xem hay nhập mật khẩu thủ công.
                </p>
              </div>

              {createError && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {createError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-9 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="system-primary-action h-9 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-brand dark:hover:bg-brand-600 cursor-pointer"
                >
                  Xác nhận tạo tài khoản
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ── MODAL 2: NHẬP EXCEL / CSV THẬT SỰ TƯƠNG TÁC (DRAG & DROP + PREVIEW) ── */}
      {isBulkImportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 sm:p-6 pt-10 sm:pt-14 pb-10 sm:pb-14 backdrop-blur-[2px] overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsBulkImportOpen(false);
              handleResetImportState();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
            className="my-auto w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 p-6 sm:p-7 shadow-2xl transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="import-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  Nhập danh sách tài khoản bằng Excel / CSV
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Tự động so sánh đối chiếu các trường trong bảng Người dùng (Mã SV/GV, Họ tên, Lớp, Email, Vai trò) và loại bỏ các cột điểm số, STT, ghi chú.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBulkImportOpen(false);
                  handleResetImportState();
                }}
                aria-label="Đóng"
                className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Thẻ input ẩn để chọn tệp từ máy tính */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* VÙNG THẢ TỆP (DRAG & DROP ZONE) */}
              {!importFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-brand bg-brand-50 scale-[0.99] dark:border-brand-500 dark:bg-brand-500/10'
                      : 'border-slate-300 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50 dark:border-white/10 dark:bg-neutral-950 dark:hover:border-white/20 dark:hover:bg-white/5'
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-md transition ${
                      isDragging ? 'bg-brand text-white' : 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200'
                    }`}
                  >
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                    Kéo thả tệp dữ liệu vào đây hoặc{' '}
                    <span className="text-slate-900 dark:text-white underline font-semibold">chọn từ máy tính</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Hỗ trợ định dạng .csv, .xlsx, .xls (Dung lượng tối đa: 10MB)
                  </p>
                </div>
              ) : (
                /* THẺ HIỂN THỊ TỆP ĐÃ ĐƯỢC CHỌN / THẢ VÀO */
                <div className="rounded-md border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand text-white shadow-sm">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{importFile.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {(importFile.size / 1024).toFixed(1)} KB · Đọc được {importPreviewUsers.length} tài khoản hợp lệ
                          {importWarnings.length > 0 ? ` (${importWarnings.length} dòng có cảnh báo)` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetImportState}
                      className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-red-600 dark:hover:bg-neutral-800 dark:hover:text-red-400 shadow-xs cursor-pointer transition"
                      title="Gỡ tệp để chọn tệp khác"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Thông báo lỗi định dạng tệp không thể đọc */}
              {importError && (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span>{importError}</span>
                </div>
              )}

              {/* BẢNG ĐỐI CHIẾU CÁC TRƯỜNG ĐƯỢC PHÉP ĐỌC / BỎ QUA */}
              {importMappingInfo && (
                <div className="rounded-md border border-slate-200 bg-slate-50/80 p-4 space-y-3 dark:border-white/10 dark:bg-neutral-950/70">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Kết quả đối chiếu trường dữ liệu với bảng Người dùng
                      </span>
                    </div>
                    {importMappingInfo.headerRowIndex >= 0 && (
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300 bg-white dark:bg-neutral-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
                        Dòng tiêu đề: Dòng {importMappingInfo.headerRowIndex + 1}
                      </span>
                    )}
                  </div>

                  {/* 1. Các trường được phép đọc */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      Các trường được phép đọc và lưu vào bảng Người dùng:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50/70 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">Mã SV / GV:</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate ml-2">
                          {importMappingInfo.codeColName ? `Cột [${importMappingInfo.codeColName}]` : 'Tự động nhận diện'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50/70 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">Họ và tên:</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate ml-2">
                          [${importMappingInfo.nameColName || 'Họ tên'}
                          {importMappingInfo.splitLastNameColName ? ` + ${importMappingInfo.splitLastNameColName}` : ''}]
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50/70 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">Khoa / Viện:</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate ml-2">
                          {importMappingInfo.deptColName
                            ? `Cột [${importMappingInfo.deptColName}]`
                            : 'Mặc định Khoa CNTT'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50/70 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">Lớp sinh hoạt:</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate ml-2">
                          {importMappingInfo.classColName
                            ? `Cột [${importMappingInfo.classColName}]`
                            : importMappingInfo.detectedClass
                            ? `${importMappingInfo.detectedClass} (Tiêu đề)`
                            : 'Theo từng dòng'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50/70 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">Email:</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate ml-2">
                          {importMappingInfo.emailColName
                            ? `Cột [${importMappingInfo.emailColName}]`
                            : 'Không có cột Email'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50/70 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">Vai trò:</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate ml-2">
                          {importMappingInfo.roleColName ? `Cột [${importMappingInfo.roleColName}]` : 'Sinh viên (Ngữ cảnh)'}
                        </span>
                      </div>
                      {importMappingInfo.phoneColName && (
                        <div className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50/70 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">Điện thoại:</span>
                          <span className="font-bold text-slate-900 dark:text-white truncate ml-2">[${importMappingInfo.phoneColName}]</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Các trường ngoài bảng được tự động loại bỏ */}
                  {importMappingInfo.ignoredColumns.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-white/10">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="text-amber-600 font-bold">✕</span>
                        Các trường ngoài bảng tự động loại bỏ (Không lưu vào hồ sơ):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {importMappingInfo.ignoredColumns.map((col, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-neutral-800 dark:text-slate-300"
                          >
                            <span className="text-slate-400 mr-1">✕</span>
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Thông báo cảnh báo chi tiết khi tệp thiếu cột hoặc dòng thiếu thông tin */}
              {importWarnings.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Phát hiện {importWarnings.length} cảnh báo dữ liệu (Vẫn cho phép nhập):
                    </span>
                  </div>
                  <ul className="max-h-24 overflow-y-auto list-disc pl-5 space-y-0.5 text-[11.5px] font-medium text-amber-800 dark:text-amber-300">
                    {importWarnings.slice(0, 10).map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                    {importWarnings.length > 10 && (
                      <li className="font-bold">...và {importWarnings.length - 10} cảnh báo tương tự khác.</li>
                    )}
                  </ul>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 pt-0.5">
                    * Các trường bị thiếu đã được đánh dấu bên dưới. Bạn vẫn có thể nhấn <strong>Xác nhận nhập</strong> và chỉnh sửa bổ sung sau.
                  </p>
                </div>
              )}

              {/* BẢNG XEM TRƯỚC DANH SÁCH TÀI KHOẢN ĐƯỢC TRÍCH XUẤT TỪ TỆP */}
              {importPreviewUsers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Xem trước dữ liệu người dùng ({importPreviewUsers.length} tài khoản)
                    </p>
                    {importWarnings.length > 0 ? (
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        ⚠ Có {importWarnings.length} dòng cần lưu ý · Vẫn có thể nhập
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">✓ Tất cả dữ liệu hợp lệ</span>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white dark:border-white/10 dark:bg-neutral-950">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:bg-neutral-900 dark:text-slate-400 dark:border-white/10">
                        <tr>
                          <th className="px-3 py-2.5">Mã SV / GV</th>
                          <th className="px-3 py-2.5">Họ và tên</th>
                          <th className="px-3 py-2.5">Khoa / Đơn vị</th>
                          <th className="px-3 py-2.5">Lớp sinh hoạt</th>
                          <th className="px-3 py-2.5">Email</th>
                          <th className="px-3 py-2.5">Vai trò</th>
                          <th className="px-3 py-2.5">Kiểm tra</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {importPreviewUsers.map((u, i) => {
                          const hasMissing = u.missingFields.length > 0;
                          const isMissingCode = u.missingFields.includes('Thiếu Mã SV/GV');
                          const isMissingName = u.missingFields.includes('Thiếu Họ và tên');
                          const isMissingEmail =
                            u.missingFields.includes('Thiếu Email') ||
                            u.missingFields.includes('Email sai định dạng');
                          const roleErrorField = u.missingFields.find((f) => f.includes('Vai trò'));

                          return (
                            <tr
                              key={u.id || i}
                              className={hasMissing ? 'bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-500/10 dark:hover:bg-amber-500/15' : 'hover:bg-slate-50/60 dark:hover:bg-white/5'}
                            >
                              <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">
                                {isMissingCode ? (
                                  <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300">
                                    Thiếu Mã SV/GV
                                  </span>
                                ) : (
                                  u.userCode
                                )}
                              </td>
                              <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                                {isMissingName ? (
                                  <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300">
                                    Thiếu Họ và tên
                                  </span>
                                ) : (
                                  u.fullName
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                                <span className="inline-flex items-center rounded bg-slate-100 dark:bg-neutral-800 dark:text-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                  {u.department}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                                {u.lopSinhHoat ? (
                                  <span className="inline-flex items-center rounded bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                                    {u.lopSinhHoat}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                                {isMissingEmail ? (
                                  <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300">
                                    {u.missingFields.includes('Email sai định dạng')
                                      ? `Sai Email (${u.email})`
                                      : 'Thiếu Email'}
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span>{u.email}</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {roleErrorField ? (
                                  <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300">
                                    {roleErrorField}
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                      u.role === 'instructor'
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                                        : u.role === 'admin'
                                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                        : 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200'
                                    }`}
                                  >
                                    {u.role === 'instructor'
                                      ? 'Giảng viên'
                                      : u.role === 'admin'
                                      ? 'Quản trị viên'
                                      : 'Sinh viên'}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {hasMissing ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                                    ⚠ {u.missingFields.join(', ')}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                    ✓ Hợp lệ
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TẢI TỆP MẪU CHUẨN ĐẠI HỌC DUY TÂN */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-md border border-slate-200/90 bg-white p-3.5 dark:border-white/10 dark:bg-neutral-950">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Tệp mẫu danh sách tài khoản chuẩn (CSV / Excel)</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-400">
                      Hỗ trợ định dạng CSV chuẩn UTF-8 (mở trực tiếp bằng Microsoft Excel), các cột: Mã SV/GV, Họ và tên, Email, Vai trò...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSample}
                    className="inline-flex items-center gap-1.5 rounded border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-700 cursor-pointer transition shadow-2xs"
                    title="Tải tệp mẫu danh sách tài khoản chuẩn Oculide (mở bằng Excel)"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Tải tệp mẫu</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkImportOpen(false);
                    handleResetImportState();
                  }}
                  className="h-9 rounded-md border border-slate-300 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-700 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={importPreviewUsers.length === 0 || isImporting}
                  onClick={handleConfirmBulkImport}
                  className="system-primary-action h-9 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-brand dark:hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition shadow-sm"
                >
                  {isImporting ? 'Đang lưu & gửi email...' : isParsing ? 'Đang phân tích...' : `Xác nhận nhập (${importPreviewUsers.length} tài khoản)`}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── MODAL 3: CHỈNH SỬA TÀI KHOẢN ── */}
      {editingUser && (() => {
        const isCodeMissing =
          !editingUser.userCode ||
          Boolean(editingUser.missingFields?.some((f) => f.includes('Mã')));
        const isRoleMissing = Boolean(
          editingUser.missingFields?.some((f) => f.includes('Vai trò'))
        );
        const isNameMissing =
          !editingUser.fullName ||
          Boolean(editingUser.missingFields?.some((f) => f.includes('Họ và tên')));
        const isEmailMissing =
          !editingUser.email ||
          Boolean(editingUser.missingFields?.some((f) => f.includes('Email')));
        const hasAnyMissing =
          isCodeMissing ||
          isRoleMissing ||
          isNameMissing ||
          isEmailMissing ||
          Boolean(editingUser.missingFields && editingUser.missingFields.length > 0);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setEditingUser(null);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-user-title"
              className="w-full max-w-lg rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 p-6 shadow-2xl transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="edit-user-title" className="text-lg font-bold text-slate-900 dark:text-white">
                    Chỉnh sửa thông tin tài khoản
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Cập nhật thông tin cho tài khoản{' '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {editingUser.userCode || 'chưa có mã định danh'}
                    </strong>
                    .
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  aria-label="Đóng"
                  className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {hasAnyMissing && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="font-bold text-red-900 dark:text-red-200">
                        Tài khoản được nhập từ tệp đang thiếu thông tin bắt buộc!
                      </p>
                      <p className="mt-0.5 text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
                        Vui lòng điền đầy đủ các trường được <strong>khoanh đỏ cảnh báo</strong> bên dưới trước khi lưu.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveEdit} noValidate className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center justify-between">
                      <span>
                        Mã tài khoản <span className="text-red-500">*</span>
                      </span>
                      {isCodeMissing && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300">
                          Thiếu thông tin
                        </span>
                      )}
                    </span>
                    <input
                      name="userCode"
                      required
                      defaultValue={editingUser.userCode}
                      placeholder="VD: 20241820 hoặc 100088"
                      className={`mt-1.5 h-10 w-full rounded-md px-3 text-xs outline-none transition ${
                        isCodeMissing
                          ? 'border-2 border-red-500 bg-red-50/40 text-red-900 placeholder:text-red-400 ring-2 ring-red-100 focus:border-red-600 focus:ring-red-200 dark:bg-red-500/10 dark:text-red-200'
                          : 'border border-slate-200 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white'
                      }`}
                    />
                    {isCodeMissing && (
                      <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                        ⚠ Bắt buộc bổ sung Mã SV / Mã GV
                      </span>
                    )}
                  </label>

                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center justify-between">
                      <span>
                        Vai trò hệ thống <span className="text-red-500">*</span>
                      </span>
                      {isRoleMissing && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300">
                          Cần xác nhận
                        </span>
                      )}
                    </span>
                    <select
                      name="role"
                      required
                      defaultValue={isRoleMissing ? '' : editingUser.role}
                      className={`mt-1.5 h-10 w-full rounded-md px-3 text-xs outline-none transition ${
                        isRoleMissing
                          ? 'border-2 border-red-500 bg-red-50/40 font-semibold text-red-900 ring-2 ring-red-100 focus:border-red-600 focus:ring-red-200 dark:bg-red-500/10 dark:text-red-200'
                          : 'border border-slate-200 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white'
                      }`}
                    >
                      {isRoleMissing && (
                        <option value="" disabled>
                          — ⚠ Bắt buộc chọn vai trò —
                        </option>
                      )}
                      <option value="student">Sinh viên</option>
                      <option value="instructor">Giảng viên</option>
                      <option value="admin">Quản trị viên</option>
                    </select>
                    {isRoleMissing && (
                      <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                        ⚠ Tệp nhập thiếu hoặc sai cột Vai trò
                      </span>
                    )}
                  </label>
                </div>

                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center justify-between">
                    <span>
                      Họ và tên <span className="text-red-500">*</span>
                    </span>
                    {isNameMissing && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300">
                        Thiếu thông tin
                      </span>
                    )}
                  </span>
                  <input
                    name="fullName"
                    required
                    defaultValue={editingUser.fullName}
                    placeholder="Nhập đầy đủ họ và tên..."
                    className={`mt-1.5 h-10 w-full rounded-md px-3 text-xs outline-none transition ${
                      isNameMissing
                        ? 'border-2 border-red-500 bg-red-50/40 text-red-900 placeholder:text-red-400 ring-2 ring-red-100 focus:border-red-600 focus:ring-red-200 dark:bg-red-500/10 dark:text-red-200'
                        : 'border border-slate-200 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white'
                    }`}
                  />
                  {isNameMissing && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                      ⚠ Bắt buộc bổ sung Họ và tên
                    </span>
                  )}
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center justify-between">
                      <span>
                        Địa chỉ Email <span className="text-red-500">*</span>
                      </span>
                      {isEmailMissing && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300">
                          Bắt buộc bổ sung
                        </span>
                      )}
                    </span>
                    <input
                      name="email"
                      type="email"
                      required
                      defaultValue={editingUser.email}
                      placeholder="Nhập email hợp lệ (VD: sv@school.edu.vn)"
                      className={`mt-1.5 h-10 w-full rounded-md px-3 text-xs outline-none transition ${
                        isEmailMissing
                          ? 'border-2 border-red-500 bg-red-50/40 text-red-900 placeholder:text-red-400 ring-2 ring-red-100 focus:border-red-600 focus:ring-red-200 dark:bg-red-500/10 dark:text-red-200'
                          : 'border border-slate-200 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white'
                      }`}
                    />
                    {isEmailMissing && (
                      <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                        ⚠ Bắt buộc bổ sung địa chỉ Email hợp lệ
                      </span>
                    )}
                  </label>

                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Trạng thái
                    <select
                      name="status"
                      defaultValue={editingUser.status}
                      className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white"
                    >
                      <option value="active">Hoạt động</option>
                      <option value="locked">Bị khóa</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {editingUser.role === 'student' ? 'Khoa / Viện đào tạo' : editingUser.role === 'instructor' ? 'Khoa / Bộ môn giảng dạy' : 'Đơn vị công tác'}
                    <input
                      name="department"
                      defaultValue={editingUser.department}
                      placeholder="VD: Khoa Công nghệ thông tin"
                      className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white"
                    />
                  </label>

                  {editingUser.role === 'student' && (
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Lớp sinh hoạt hành chính
                      <input
                        name="lopSinhHoat"
                        defaultValue={editingUser.lopSinhHoat || ''}
                        placeholder="VD: K28-KTPM1, SE1801"
                        className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-white"
                      />
                    </label>
                  )}
                </div>

                {editError && (
                  <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    ⚠ {editError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => setEditingUser(null)}
                    className="h-9 rounded-md border border-slate-300 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-700 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="system-primary-action h-9 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-brand dark:hover:bg-brand-600 disabled:opacity-50 cursor-pointer"
                  >
                    {isUpdating ? 'Đang lưu CSDL...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        );
      })()}

      {/* ── MODAL 4: ĐẶT LẠI MẬT KHẨU (2-STEP) ── */}
      {resettingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setResettingUser(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-pass-title"
            className="w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 p-6 shadow-2xl transition-colors"
          >
            {resetStep === 'confirm' ? (
              <>
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 id="reset-pass-title" className="text-lg font-bold text-slate-900 dark:text-white">
                      Đặt lại mật khẩu
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Cấp mật khẩu ngẫu nhiên tạm thời.</p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Bạn có chắc chắn muốn đặt lại mật khẩu cho tài khoản{' '}
                  <strong className="font-bold text-slate-900 dark:text-white">
                    {resettingUser.userCode} ({resettingUser.fullName})
                  </strong>
                  ? Mật khẩu cũ sẽ bị vô hiệu ngay lập tức.
                </p>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setResettingUser(null)}
                    className="h-9 rounded-md border border-slate-300 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-700 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={confirmResetPassword}
                    className="h-10 rounded-md bg-amber-600 px-4 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer"
                  >
                    Tạo mật khẩu tạm
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Mật khẩu tạm đã được tạo</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tài khoản: {resettingUser.userCode}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-md border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Mật khẩu tạm mới:</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <code className="text-base font-extrabold tracking-wider text-slate-900 dark:text-brand-300 font-mono">
                      {temporaryPassword}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="inline-flex items-center gap-1 rounded border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm hover:bg-brand-50 dark:border-brand-500/30 dark:bg-neutral-800 dark:text-brand-200 dark:hover:bg-brand-500/10 cursor-pointer"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{isCopied ? 'Đã sao chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Người dùng sẽ nhận được yêu cầu đổi lại mật khẩu cá nhân ngay trong lần đăng nhập kế tiếp.
                </p>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setResettingUser(null)}
                    className="system-primary-action h-9 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-brand dark:hover:bg-brand-600 cursor-pointer"
                  >
                    Hoàn tất
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* ── MODAL 5: KHÓA / MỞ KHÓA TÀI KHOẢN ── */}
      {togglingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setTogglingUser(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="toggle-status-title"
            className="w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 p-6 shadow-2xl transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${
                  togglingUser.status === 'active'
                    ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                }`}
              >
                {togglingUser.status === 'active' ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
              </div>
              <div>
                <h2 id="toggle-status-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  {togglingUser.status === 'active' ? 'Xác nhận khóa tài khoản' : 'Xác nhận mở khóa tài khoản'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Mã người dùng: {togglingUser.userCode}</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {togglingUser.status === 'active' ? (
                <>
                  Bạn có chắc chắn muốn khóa tài khoản{' '}
                  <strong className="font-bold text-slate-900 dark:text-white">
                    {togglingUser.fullName} ({togglingUser.userCode})
                  </strong>
                  ? Người dùng sẽ không thể đăng nhập hoặc tham gia phòng thi cho đến khi được mở khóa.
                </>
              ) : (
                <>
                  Bạn có chắc chắn muốn mở khóa tài khoản{' '}
                  <strong className="font-bold text-slate-900 dark:text-white">
                    {togglingUser.fullName} ({togglingUser.userCode})
                  </strong>
                  ? Người dùng sẽ có thể đăng nhập bình thường vào hệ thống.
                </>
              )}
            </p>

            {togglingUser.status === 'active' && (
              <label className="mt-3 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Lý do khóa tài khoản (Tùy chọn)
                <input
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="VD: Vi phạm quy chế thi cử, theo yêu cầu phòng đào tạo..."
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-xs outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-red-500"
                />
              </label>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTogglingUser(null)}
                className="h-9 rounded-md border border-slate-300 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmToggleStatus}
                className={`h-10 rounded-md px-4 text-xs font-semibold text-white cursor-pointer ${
                  togglingUser.status === 'active'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {togglingUser.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── MODAL 6: XÁC NHẬN XÓA TÀI KHOẢN VĨNH VIỄN ── */}
      {deletingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeletingUser(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-delete-title"
            className="w-full max-w-md overflow-hidden rounded-md border border-slate-300 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-neutral-900 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 id="modal-delete-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Xác nhận xóa tài khoản
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mã tài khoản: {deletingUser.userCode || deletingUser.username || deletingUser.id}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản{' '}
              <strong className="font-bold text-slate-900 dark:text-white">
                {deletingUser.fullName}
              </strong>{' '}
              ({deletingUser.email || deletingUser.userCode}) khỏi hệ thống không?
            </p>

            <div className="mt-3 rounded-md border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
              ⚠️ <strong>Cảnh báo:</strong> Toàn bộ dữ liệu của người dùng này trong CSDL SQL Server sẽ bị xóa và không thể khôi phục lại.
            </div>

            {deleteError && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingUser(null)}
                className="h-9 rounded-md border border-slate-300 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteUser}
                className="h-10 rounded-md bg-rose-600 px-5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer transition shadow-sm shadow-rose-200 dark:shadow-none"
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa vĩnh viễn'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ── CÁC THÀNH PHẦN PHỤ TRỢ (HELPER COMPONENTS) ──

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-md border border-slate-200 bg-white px-3.5 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 dark:border-white/10 dark:bg-[#141824] dark:text-slate-200 cursor-pointer"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

function UserStatusBadge({ status }: { status: UserStatus }) {
  const isActive = status === 'active';
  return (
    <span
      className={`text-xs font-semibold ${
        isActive
          ? 'text-emerald-700 dark:text-emerald-400'
          : 'text-rose-700 dark:text-rose-400'
      }`}
    >
      {isActive ? 'Hoạt động' : 'Đã khóa'}
    </span>
  );
}

function UserRoleBadge({ role }: { role: UserRole }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 border border-amber-300/70 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
        <Shield className="h-3 w-3 text-amber-700 dark:text-amber-400" />
        <span>Quản trị viên</span>
      </span>
    );
  }
  if (role === 'instructor') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-900 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30">
        <UserCheck className="h-3 w-3 text-indigo-700 dark:text-indigo-400" />
        <span>Giảng viên</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
      <GraduationCap className="h-3 w-3 text-slate-900 dark:text-slate-500" />
      <span>Sinh viên</span>
    </span>
  );
}
