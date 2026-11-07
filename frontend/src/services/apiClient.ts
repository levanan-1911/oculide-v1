/**
 * Oculide API Client & Services
 * ==============================================================================
 * Centralized HTTP Client and typed API service definitions for Oculide v1.
 * Supports token injection, auto-refresh headers, and standard error handling.
 */

const API_BASE_URL = 
  process.env.NEXT_PUBLIC_API_URL 
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api/v1`
    : '/api/v1';

// ─── Token Management ─────────────────────────────────────────────────────────

export const TOKEN_KEYS = {
  ACCESS: 'oculide_token',
  REFRESH: 'oculide_refresh_token',
  USER: 'oculide_user',
};

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEYS.ACCESS);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEYS.REFRESH);
}

export function getStoredUser(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredSession(accessToken: string, user: any, refreshToken?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
  localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
  if (refreshToken) {
    localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
  }
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  localStorage.removeItem(TOKEN_KEYS.REFRESH);
  localStorage.removeItem(TOKEN_KEYS.USER);
}

// ─── Core Request Wrapper ─────────────────────────────────────────────────────

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, skipAuth = false, headers: customHeaders, ...fetchOptions } = options;

  let url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += `${url.includes('?') ? '&' : '?'}${qs}`;
    }
  }

  const headers = new Headers(customHeaders);
  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  if (!skipAuth) {
    const token = getStoredAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  let data: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message = (data && typeof data === 'object' && (data.detail || data.message)) 
      ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))
      : `HTTP ${response.status}: Yêu cầu máy chủ thất bại`;

    if (response.status === 401 && !skipAuth && typeof window !== 'undefined') {
      clearStoredSession();
      // Chuyển hướng nhẹ nhàng nếu phiên hết hạn
      if (!window.location.pathname.includes('/login')) {
        window.location.href = `/login?expired=1&from=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

// ─── Shorthand HTTP Verbs ─────────────────────────────────────────────────────

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

// ─── 1. AUTHENTICATION SERVICE ────────────────────────────────────────────────

export interface LoginPayload {
  username: string; // Accepts username or email
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    user_id: number;
    username: string;
    email: string;
    full_name: string;
    role: 'admin' | 'instructor' | 'student';
    student_id?: string | null;
    is_active: boolean;
    created_at?: string;
    last_login?: string | null;
    must_change_password?: boolean;
  };
}

export const authApi = {
  login: async (credentials: LoginPayload): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>('/auth/login', credentials, { skipAuth: true });
  },

  getCurrentUser: async (): Promise<any> => {
    return apiClient.get('/auth/me');
  },

  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>('/auth/refresh', { refresh_token: refreshToken }, { skipAuth: true });
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<any> => {
    return apiClient.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post('/auth/forgot-password', { email }, { skipAuth: true });
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post('/auth/reset-password', { token, new_password: newPassword }, { skipAuth: true });
  },

  logout: () => {
    clearStoredSession();
  },
};

// ─── 2. INSTRUCTOR / CLASSES SERVICE ──────────────────────────────────────────

export interface CreateClassPayload {
  class_code: string;
  class_name: string;
  semester?: string;
  academic_year?: string;
  description?: string;
}

export const classesApi = {
  getClasses: async (params?: { page?: number; limit?: number; search?: string }): Promise<any[]> => {
    return apiClient.get('/classes', { params });
  },

  getClassById: async (classId: number): Promise<any> => {
    return apiClient.get(`/classes/${classId}`);
  },

  createClass: async (payload: CreateClassPayload): Promise<any> => {
    return apiClient.post('/classes', payload);
  },

  updateClass: async (classId: number, payload: Partial<CreateClassPayload>): Promise<any> => {
    return apiClient.put(`/classes/${classId}`, payload);
  },

  deleteClass: async (classId: number): Promise<any> => {
    return apiClient.delete(`/classes/${classId}`);
  },

  getClassStudents: async (classId: number): Promise<any[]> => {
    return apiClient.get(`/classes/${classId}/students`);
  },

  importStudents: async (classId: number, students: Array<{ student_code: string; full_name: string; email: string }>): Promise<any> => {
    return apiClient.post(`/classes/${classId}/students/import`, { students });
  },
};

// ─── 3. QUESTIONS & TEST CASES SERVICE ────────────────────────────────────────

export interface CreateQuestionPayload {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  time_limit_ms?: number;
  memory_limit_mb?: number;
  allowed_languages?: string[];
}

export const questionsApi = {
  getQuestions: async (params?: { difficulty?: string; search?: string }): Promise<any[]> => {
    return apiClient.get('/questions', { params });
  },

  getQuestionById: async (questionId: number): Promise<any> => {
    return apiClient.get(`/questions/${questionId}`);
  },

  createQuestion: async (payload: CreateQuestionPayload): Promise<any> => {
    return apiClient.post('/questions', payload);
  },

  getTestCases: async (questionId: number): Promise<any[]> => {
    return apiClient.get(`/questions/${questionId}/test-cases`);
  },

  createTestCase: async (questionId: number, testCase: { input: string; expected_output: string; is_hidden?: boolean; score?: number }): Promise<any> => {
    return apiClient.post(`/questions/${questionId}/test-cases`, testCase);
  },
};

// ─── 4. ROOMS / EXAMS SERVICE ─────────────────────────────────────────────────

export interface CreateRoomPayload {
  room_code: string;
  room_name: string;
  room_type?: 'exam' | 'classroom';
  description?: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  passcode?: string;
}

export const roomsApi = {
  getRooms: async (params?: { status?: string; search?: string }): Promise<any[]> => {
    return apiClient.get('/rooms', { params });
  },

  getRoomById: async (roomId: number): Promise<any> => {
    return apiClient.get(`/rooms/${roomId}`);
  },

  createRoom: async (payload: CreateRoomPayload): Promise<any> => {
    return apiClient.post('/rooms', payload);
  },
};
