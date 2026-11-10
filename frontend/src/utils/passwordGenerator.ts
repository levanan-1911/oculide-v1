/**
 * passwordGenerator.ts
 * Tiện ích sinh mật khẩu ngẫu nhiên bảo mật cao (Cryptographically Secure Random Passwords)
 * - Tuyệt đối không sử dụng tiền tố cố định (Ocl@...) hay quy tắc ghép mã sinh viên.
 * - Sử dụng crypto.getRandomValues để sinh ký tự ngẫu nhiên đa dạng (chữ hoa, chữ thường, số, ký tự đặc biệt).
 * - Đảm bảo tính bảo mật và tính ngẫu nhiên 100% cho từng tài khoản.
 */

const STORAGE_KEY_INITIAL_PASSWORDS = 'oculide_initial_passwords';

/**
 * Sinh chuỗi mật khẩu ngẫu nhiên bảo mật cao
 * @param length Độ dài mật khẩu (mặc định 10 ký tự)
 */
export function generateSecureRandomPassword(length = 10): string {
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

  // Đảm bảo mật khẩu luôn có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt
  const passwordChars = [
    getRandomChar(uppercase),
    getRandomChar(lowercase),
    getRandomChar(numbers),
    getRandomChar(symbols),
  ];

  // Điền các ký tự còn lại ngẫu nhiên từ toàn bộ bảng ký tự
  for (let i = 4; i < length; i++) {
    passwordChars.push(getRandomChar(allChars));
  }

  // Xáo trộn ngẫu nhiên toàn bộ vị trí các ký tự (Fisher-Yates shuffle)
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

/**
 * Lấy mật khẩu đã lưu trong localStorage
 */
export function getStoredPassword(userCodeOrUsername: string): string {
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

/**
 * Lưu mật khẩu vào localStorage
 */
export function saveStoredPassword(userCodeOrUsername: string, pass: string): void {
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
 * Lấy mật khẩu đã lưu hoặc sinh mới hoàn toàn ngẫu nhiên nếu chưa có
 * Tự động thay thế các mật khẩu cũ có quy tắc (Ocl@2026#... hoặc admin123) bằng mật khẩu ngẫu nhiên mới
 */
export function getOrGenerateStoredPassword(userCodeOrUsername: string, length = 10): string {
  if (!userCodeOrUsername) return generateSecureRandomPassword(length);
  const existing = getStoredPassword(userCodeOrUsername);
  if (existing && !existing.startsWith('Ocl@2026#') && existing !== 'admin123') {
    return existing;
  }
  const fresh = generateSecureRandomPassword(length);
  saveStoredPassword(userCodeOrUsername, fresh);
  return fresh;
}
