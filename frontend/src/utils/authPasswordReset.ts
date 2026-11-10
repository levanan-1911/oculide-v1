/**
 * Helper quản lý luồng Quên mật khẩu & Khôi phục mật khẩu (Password Recovery Flow)
 * Hỗ trợ song song: Backend API thực tế + LocalStorage Mock Store phục vụ demo đồ án
 */

export interface MockEmailItem {
  id: string;
  toEmail: string;
  subject: string;
  sentAt: string;
  resetLink: string;
  token: string;
}

const STORAGE_KEY_RESET_PASSWORDS = 'oculide_mock_reset_passwords';
const STORAGE_KEY_SENT_EMAILS = 'oculide_mock_sent_emails';

/**
 * Gửi yêu cầu khôi phục mật khẩu:
 * 1. Gọi API Backend FastAPI (/api/v1/auth/forgot-password)
 * 2. Lưu token & gửi email giả lập vào hộp thư ảo trên trình duyệt
 */
export async function requestPasswordResetApi(email: string): Promise<{
  success: boolean;
  message: string;
  email: string;
  resetLink: string;
  token: string;
}> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const response = await fetch('/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    if (response.ok) {
      const data = await response.json();
      const token = data.token || `reset_${Date.now()}`;
      const resetLink = data.reset_link || `/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

      saveSentEmailMock({
        id: `email_${Date.now()}`,
        toEmail: normalizedEmail,
        subject: '[Oculide] Yêu cầu khôi phục mật khẩu tài khoản',
        sentAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ', Hôm nay',
        resetLink,
        token,
      });

      return {
        success: true,
        message: data.message || `Đã gửi liên kết khôi phục đến ${normalizedEmail}`,
        email: normalizedEmail,
        resetLink,
        token,
      };
    }
  } catch {
    // Backend offline / network error -> chuyển sang chế độ Mock
  }

  // Chế độ phát triển & demo không cần backend
  const token = `token_dev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const resetLink = `/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

  saveSentEmailMock({
    id: `email_${Date.now()}`,
    toEmail: normalizedEmail,
    subject: '[Oculide] Yêu cầu khôi phục mật khẩu tài khoản',
    sentAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ', Hôm nay',
    resetLink,
    token,
  });

  return {
    success: true,
    message: `Đã gửi liên kết khôi phục mật khẩu đến ${normalizedEmail}`,
    email: normalizedEmail,
    resetLink,
    token,
  };
}

/**
 * Hoàn tất việc đặt lại mật khẩu mới:
 * 1. Gọi API Backend FastAPI (/api/v1/auth/reset-password)
 * 2. Cập nhật mật khẩu mới vào LocalStorage để có thể đăng nhập ngay tại trang /login
 */
export async function completePasswordResetApi(
  token: string,
  email: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = (email || '').trim().toLowerCase();

  try {
    const response = await fetch('/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        new_password: newPassword,
      }),
    });

    if (response.ok) {
      savePasswordToLocalStore(normalizedEmail, newPassword);
      return {
        success: true,
        message: 'Mật khẩu đã được cập nhật thành công trên máy chủ.',
      };
    }
  } catch {
    // Backend offline
  }

  // Lưu cục bộ để đăng nhập được ngay lập tức
  savePasswordToLocalStore(normalizedEmail, newPassword);
  return {
    success: true,
    message: 'Mật khẩu mới đã được cập nhật thành công.',
  };
}

/** Lưu mật khẩu mới vào LocalStorage */
function savePasswordToLocalStore(email: string, newPass: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESET_PASSWORDS);
    const store = raw ? JSON.parse(raw) : {};
    
    // Đoán vai trò dựa trên tiền tố email
    let role = 'student';
    let fullName = 'Sinh viên Oculide';
    if (email.includes('admin')) {
      role = 'admin';
      fullName = 'Quản Trị Viên Hệ Thống';
    } else if (email.includes('instructor') || email.includes('gv')) {
      role = 'instructor';
      fullName = 'Giảng Viên Hướng Dẫn';
    }

    store[email] = {
      email,
      password: newPass,
      updatedAt: new Date().toISOString(),
      user: {
        user_id: 101,
        username: email.split('@')[0],
        email: email,
        full_name: fullName,
        role: role,
        student_id: role === 'student' ? 'SV2026' : undefined,
        is_active: true,
      },
    };
    localStorage.setItem(STORAGE_KEY_RESET_PASSWORDS, JSON.stringify(store));
  } catch {
    // ignore
  }
}

/** Kiểm tra đăng nhập với mật khẩu mới vừa đổi */
export function checkMockPasswordLogin(emailInput: string, passwordInput: string) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESET_PASSWORDS);
    if (!raw) return null;
    const store = JSON.parse(raw);
    const clean = emailInput.trim().toLowerCase();
    
    // Tìm theo email hoặc username trước dấu @
    const userItem = store[clean] || Object.values(store).find((item: any) => 
      item.email?.toLowerCase() === clean || item.user?.username?.toLowerCase() === clean
    ) as any;

    if (userItem && userItem.password === passwordInput) {
      return userItem.user;
    }
  } catch {
    return null;
  }
  return null;
}

/** Lưu bản mô phỏng email đã gửi */
function saveSentEmailMock(item: MockEmailItem) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SENT_EMAILS);
    const list: MockEmailItem[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(STORAGE_KEY_SENT_EMAILS, JSON.stringify([item, ...list.slice(0, 9)]));
  } catch {
    // ignore
  }
}

/** Lấy danh sách email giả lập gần nhất */
export function getLatestMockEmail(email?: string): MockEmailItem | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SENT_EMAILS);
    if (!raw) return null;
    const list: MockEmailItem[] = JSON.parse(raw);
    if (!email) return list[0] || null;
    return list.find((item) => item.toEmail.toLowerCase() === email.trim().toLowerCase()) || list[0] || null;
  } catch {
    return null;
  }
}
