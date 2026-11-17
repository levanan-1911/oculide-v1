'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/services/apiClient';
import {
  Bell,
  Search,
  Sun,
  Moon,
  CheckCheck,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Flame,
  User,
  Settings,
  LogOut,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Calendar,
  Code2,
  Users,
  X,
  ShieldAlert,
} from 'lucide-react';

interface AdminTopbarProps {
  title?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  read: boolean;
  link: string;
}

interface SearchResultItem {
  category: string;
  type: 'user' | 'class' | 'schedule';
  title: string;
  subtitle: string;
  link: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export default function AdminTopbar({
  title = 'Tổng quan quản trị',
}: AdminTopbarProps) {
  const router = useRouter();

  // ── THEME & USER STATE ──
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: 'Lê Phương',
    email: 'admin@school.edu.vn',
    initials: 'LP',
  });

  // ── DROPDOWNS OPEN STATES ──
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // ── NOTIFICATIONS STATE ──
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  // Refs để bắt sự kiện click outside
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Khởi tạo Theme
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('oculide_theme') as 'dark' | 'light' | null;
    const initial = saved || 'dark';
    setTheme(initial);
    applyTheme(initial);

    try {
      const stored = localStorage.getItem('oculide_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = parsed.name || parsed.fullName || parsed.username || 'Lê Phương';
        const email = parsed.email || 'admin@school.edu.vn';
        const words = name.trim().split(' ');
        const initials = words.length >= 2 
          ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase();
        setUserProfile({ name, email, initials });
      }
    } catch {
      // ignore
    }
  }, []);

  const applyTheme = (t: 'dark' | 'light') => {
    const html = document.documentElement;
    if (t === 'dark') {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('oculide_theme', next);
    applyTheme(next);
  };

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tải danh sách thông báo từ API Backend
  useEffect(() => {
    let isSubscribed = true;
    async function loadNotifications() {
      try {
        const data = await fetchWithAuth<NotificationItem[]>('/api/v1/notifications');
        if (isSubscribed && Array.isArray(data)) {
          setNotifications(data);
        }
      } catch {
        if (isSubscribed) setNotifications([]);
      }
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, []);

  // Xử lý đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('oculide_token');
    localStorage.removeItem('oculide_user');
    localStorage.removeItem('oculide_refresh_token');
    document.cookie = 'oculide_token=; path=/; max-age=0';
    document.cookie = 'oculide_role=; path=/; max-age=0';
    window.location.replace('/login');
  };

  // Đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    fetchWithAuth('/api/v1/notifications/read-all', { method: 'PATCH' }).catch(() => {});
  };

  // Xóa toàn bộ thông báo
  const handleClearNotifications = () => {
    setNotifications([]);
    fetchWithAuth('/api/v1/notifications', { method: 'DELETE' }).catch(() => {});
  };

  // Đọc 1 thông báo và điều hướng
  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    fetchWithAuth(`/api/v1/notifications/${encodeURIComponent(item.id)}/read`, { method: 'PATCH' }).catch(() => {});
    setIsNotifOpen(false);
    router.push(item.link);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Tìm kiếm toàn cục tức thời từ API Backend
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await fetchWithAuth<{ total: number; results: SearchResultItem[] }>(
          `/api/v1/admin/search?q=${encodeURIComponent(q)}`
        );
        if (data && Array.isArray(data.results)) {
          setSearchResults(data.results);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  function getSearchIcon(type: string) {
    if (type === 'user') return Users;
    if (type === 'class') return BookOpen;
    if (type === 'schedule') return Calendar;
    return Search;
  }

  return (
    <header className="flex h-[68px] w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-6 lg:px-8 dark:border-white/10 dark:bg-[#0d1017] transition-colors z-40 relative">
      {/* Tiêu đề thanh Topbar bên trái */}
      <h1 className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white truncate pr-4">
        {title}
      </h1>

      {/* Cụm Tìm kiếm + Đổi theme sáng/tối + Chuông + Avatar bên phải */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* 1. THANH TÌM KIẾM TOÀN CỤC */}
        <div ref={searchRef} className="relative">
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isSearchOpen) setIsSearchOpen(true);
              }}
              placeholder="Tìm lớp, lịch, tài khoản..."
              className="h-9 w-[240px] md:w-[290px] rounded-full border border-slate-200/70 bg-[#f4f7f9] pl-9 pr-8 text-xs text-slate-700 placeholder-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-[#141824] dark:text-slate-100 dark:placeholder-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* DROPDOWN KẾT QUẢ TÌM KIẾM */}
          {isSearchOpen && (
            <div className="absolute left-0 sm:left-auto sm:right-0 top-11 z-50 w-[300px] sm:w-[380px] max-h-[460px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl transition-all dark:border-white/10 dark:bg-[#0f131d] text-xs">
              {searchQuery.trim() === '' ? (
                // Khi chưa gõ: Hiện gợi ý & lối tắt nhanh
                <div className="p-2 space-y-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                      Lối tắt thao tác nhanh
                    </p>
                    <div className="space-y-1">
                      <Link
                        href="/admin/users"
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5 transition"
                      >
                        <Users className="h-4 w-4 text-blue-500" />
                        <span>Thêm & quản lý tài khoản người dùng</span>
                      </Link>
                      <Link
                        href="/admin/classes"
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5 transition"
                      >
                        <BookOpen className="h-4 w-4 text-emerald-500" />
                        <span>Quản lý danh sách lớp học phần</span>
                      </Link>
                      <Link
                        href="/admin/schedules"
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5 transition"
                      >
                        <Calendar className="h-4 w-4 text-indigo-500" />
                        <span>Theo dõi lịch & ca thi trực tiếp</span>
                      </Link>
                      <Link
                        href="/admin/system"
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5 transition"
                      >
                        <Settings className="h-4 w-4 text-amber-500" />
                        <span>Kiểm tra tải máy chủ & Docker Sandbox</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : isSearching ? (
                <div className="p-6 text-center text-slate-400">
                  <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p>Đang tìm kiếm trong hệ thống...</p>
                </div>
              ) : searchResults.length > 0 ? (
                // Danh sách kết quả tìm thấy từ CSDL thật
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  <div className="p-2 text-[11px] font-semibold text-slate-400">
                    Tìm thấy {searchResults.length} kết quả phù hợp:
                  </div>
                  {searchResults.map((item, idx) => {
                    const Icon = getSearchIcon(item.type);
                    return (
                      <Link
                        key={idx}
                        href={item.link}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition group"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5 transition" />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400">
                  <Search className="h-7 w-7 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p>Không tìm thấy kết quả nào cho &ldquo;<strong className="text-slate-600 dark:text-slate-300">{searchQuery}</strong>&rdquo;</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. NÚT CHUYỂN ĐỔI SÁNG / TỐI (GIỮ NGUYÊN BÊN NGOÀI BẤM 1 CHẠM NHƯ YÊU CẦU) */}
        {mounted ? (
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            aria-label="Chuyển đổi giao diện Sáng / Tối"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-all hover:scale-105 hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-[#141824] dark:text-amber-400 dark:hover:bg-[#1a2030] cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 transition-transform rotate-0 hover:-rotate-12" />
            )}
          </button>
        ) : (
          <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-white/5 opacity-50" />
        )}

        {/* 3. NÚT CHUÔNG THÔNG BÁO (NOTIFICATION CENTER) */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setIsNotifOpen((prev) => !prev);
              setIsProfileOpen(false);
              setIsSearchOpen(false);
            }}
            aria-label="Thông báo hệ thống"
            title="Trung tâm thông báo & cảnh báo"
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb] transition-all hover:bg-blue-100/80 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-sm ring-2 ring-white dark:ring-[#0d1017] animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* DROPDOWN THÔNG BÁO */}
          {isNotifOpen && (
            <div className="absolute right-0 top-11 z-50 w-[320px] sm:w-[360px] rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-white/10 dark:bg-[#0f131d] overflow-hidden text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 px-4 py-3 bg-slate-50/70 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">Thông báo hệ thống</span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    title="Đánh dấu tất cả đã đọc"
                    className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearNotifications}
                    title="Xóa tất cả"
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                {notifications.length > 0 ? (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3.5 transition cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 ${
                        !item.read ? 'bg-blue-50/30 dark:bg-blue-500/[0.04]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          {item.type === 'danger' && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                              <ShieldAlert className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {item.type === 'warning' && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {item.type === 'success' && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {item.type === 'info' && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                              <Info className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-bold text-slate-800 dark:text-white truncate">
                              {item.title}
                            </p>
                            {!item.read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                            {item.desc}
                          </p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                            {item.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 opacity-60" />
                    <p className="text-xs">Hiện không có thông báo mới</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. NÚT AVATAR (`LP` - LONG PHẠM) */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setIsProfileOpen((prev) => !prev);
              setIsNotifOpen(false);
              setIsSearchOpen(false);
            }}
            aria-label="Tài khoản quản trị"
            title={`${userProfile.name} (Quản trị viên)`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eff6ff] text-xs font-bold text-[#2563eb] transition-all hover:scale-105 hover:bg-blue-100/80 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/25 ring-2 ring-blue-500/20 cursor-pointer"
          >
            LP
          </button>

          {/* DROPDOWN PROFILE USER MENU */}
          {isProfileOpen && (
            <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl transition-all dark:border-white/10 dark:bg-[#0f131d] text-xs">
              {/* Header profile info */}
              <div className="p-3 border-b border-slate-100 dark:border-white/10 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white shadow-sm">
                  LP
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 dark:text-white truncate text-sm">
                    {userProfile.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {userProfile.email}
                  </p>
                  <span className="mt-1 inline-block rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                    Quản trị viên hệ thống
                  </span>
                </div>
              </div>

              {/* Menu điều hướng */}
              <div className="py-1">
                <Link
                  href="/admin/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5 transition"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  <span>Hồ sơ cá nhân</span>
                </Link>
              </div>

              {/* Divider & Nút Đăng xuất */}
              <div className="pt-1 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 transition cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
