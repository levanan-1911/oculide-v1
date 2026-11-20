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
    <header className="flex h-[68px] w-full shrink-0 items-center justify-between border-b border-slate-300 bg-white px-6 lg:px-8 dark:border-white/10 dark:bg-neutral-900 transition-colors z-40 relative">
      {/* Tiêu đề thanh Topbar bên trái */}
      <h1 className="font-serif text-[17px] font-bold tracking-tight text-[#2A282D] dark:text-white truncate pr-4">
        {title}
      </h1>

      {/* Cụm Tìm kiếm + Đổi theme sáng/tối + Chuông + Avatar bên phải */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* 1. THANH TÌM KIẾM TOÀN CỤC */}
        <div ref={searchRef} className="relative">
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 dark:text-[#9F9690]" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isSearchOpen) setIsSearchOpen(true);
              }}
              placeholder="Tìm lớp, lịch, tài khoản..."
              className="h-9 w-[240px] md:w-[290px] rounded-md border border-slate-300 bg-slate-50 pl-9 pr-8 text-xs text-[#2A282D] placeholder-slate-400 transition-colors focus:border-slate-900 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-neutral-950 dark:text-[#E8E6E8] dark:placeholder-[#9F9690] dark:focus:border-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#2A282D] dark:hover:text-white p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* DROPDOWN KẾT QUẢ TÌM KIẾM */}
          {isSearchOpen && (
            <div className="absolute left-0 sm:left-auto sm:right-0 top-11 z-50 w-[300px] sm:w-[380px] max-h-[460px] overflow-y-auto rounded-md border border-slate-300 bg-white p-2 shadow-xl transition-all dark:border-white/10 dark:bg-neutral-900 text-xs">
              {searchQuery.trim() === '' ? (
                // Khi chưa gõ: Hiện gợi ý & lối tắt nhanh
                <div className="p-2 space-y-3">
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#9F9690] px-2 mb-1.5">
                      Lối tắt thao tác nhanh
                    </p>
                    <div className="space-y-1">
                      <Link
                        href="/admin/users"
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[#5A5555] hover:bg-slate-900/5 hover:text-slate-900 dark:text-[#E8E6E8] dark:hover:bg-white/5 transition"
                      >
                        <Users className="h-4 w-4 text-slate-900 dark:text-[#f0c2cf]" />
                        <span>Thêm & quản lý tài khoản người dùng</span>
                      </Link>
                      <Link
                        href="/admin/classes"
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[#5A5555] hover:bg-slate-900/5 hover:text-slate-900 dark:text-[#E8E6E8] dark:hover:bg-white/5 transition"
                      >
                        <BookOpen className="h-4 w-4 text-slate-900 dark:text-[#f0c2cf]" />
                        <span>Quản lý danh sách lớp học phần</span>
                      </Link>
                      <Link
                        href="/admin/schedules"
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[#5A5555] hover:bg-slate-900/5 hover:text-slate-900 dark:text-[#E8E6E8] dark:hover:bg-white/5 transition"
                      >
                        <Calendar className="h-4 w-4 text-slate-900 dark:text-[#f0c2cf]" />
                        <span>Theo dõi lịch & ca thi trực tiếp</span>
                      </Link>
                      <Link
                        href="/admin/system"
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[#5A5555] hover:bg-slate-900/5 hover:text-slate-900 dark:text-[#E8E6E8] dark:hover:bg-white/5 transition"
                      >
                        <Settings className="h-4 w-4 text-slate-900 dark:text-[#f0c2cf]" />
                        <span>Kiểm tra tải máy chủ & Docker Sandbox</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : isSearching ? (
                <div className="p-6 text-center text-slate-500">
                  <div className="h-5 w-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p>Đang tìm kiếm trong hệ thống...</p>
                </div>
              ) : searchResults.length > 0 ? (
                // Danh sách kết quả tìm thấy từ CSDL thật
                <div className="divide-y divide-slate-300 dark:divide-white/5">
                  <div className="p-2 text-[11px] font-semibold text-slate-500">
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
                        className="flex items-center gap-3 p-2.5 rounded-md hover:bg-slate-50 dark:hover:bg-white/5 transition group"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[#2A282D] dark:text-white truncate group-hover:text-slate-900 dark:group-hover:text-[#f0c2cf]">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:translate-x-0.5 transition" />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500">
                  <Search className="h-7 w-7 mx-auto mb-2 text-slate-500 opacity-60" />
                  <p>Không tìm thấy kết quả nào cho &ldquo;<strong className="text-[#2A282D] dark:text-[#E8E6E8]">{searchQuery}</strong>&rdquo;</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. NÚT CHUYỂN ĐỔI SÁNG / TỐI */}
        {mounted ? (
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            aria-label="Chuyển đổi giao diện Sáng / Tối"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-[#2A282D] shadow-2xs transition-colors hover:bg-stone-50 dark:border-white/10 dark:bg-neutral-950 dark:text-amber-400 dark:hover:bg-white/5 cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-[#5A5555]" />
            )}
          </button>
        ) : (
          <div className="h-9 w-9 rounded-md bg-slate-50 dark:bg-white/5 opacity-50" />
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
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-brand-300 bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200 dark:hover:bg-brand-500/20 cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 font-mono text-[9px] font-bold text-white shadow-xs ring-2 ring-white dark:ring-[#1C1820]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* DROPDOWN THÔNG BÁO */}
          {isNotifOpen && (
            <div className="absolute right-0 top-11 z-50 w-[320px] sm:w-[360px] rounded-md border border-slate-300 bg-white shadow-xl transition-all dark:border-white/10 dark:bg-neutral-900 overflow-hidden text-xs">
              <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 px-4 py-3 bg-slate-50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-[#2A282D] dark:text-white">Thông báo hệ thống</span>
                  {unreadCount > 0 && (
                    <span className="rounded bg-brand-50 px-2 py-0.5 font-mono text-[10px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    title="Đánh dấu tất cả đã đọc"
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-[#f0c2cf] p-1 cursor-pointer"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearNotifications}
                    title="Xóa tất cả"
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-[#e5a9b9] p-1 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-300 dark:divide-white/5">
                {notifications.length > 0 ? (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3.5 transition cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 ${
                        !item.read ? 'bg-brand-50 dark:bg-brand-500/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          {item.type === 'danger' && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                              <ShieldAlert className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {item.type === 'warning' && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {item.type === 'success' && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {item.type === 'info' && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-stone-100 text-[#5A5555] dark:bg-white/10 dark:text-stone-300">
                              <Info className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-bold text-[#2A282D] dark:text-white truncate">
                              {item.title}
                            </p>
                            {!item.read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-brand dark:bg-brand-300 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#5A5555] dark:text-[#9F9690] leading-relaxed mt-0.5">
                            {item.desc}
                          </p>
                          <span className="font-mono text-[10px] text-slate-500 mt-1 block">
                            {item.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-slate-500 opacity-60" />
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
            className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-xs font-serif font-bold text-white shadow-2xs hover:bg-brand-600 cursor-pointer"
          >
            LP
          </button>

          {/* DROPDOWN PROFILE USER MENU */}
          {isProfileOpen && (
            <div className="absolute right-0 top-11 z-50 w-64 rounded-md border border-slate-300 bg-white p-1.5 shadow-xl transition-all dark:border-white/10 dark:bg-neutral-900 text-xs">
              {/* Header profile info */}
              <div className="p-3 border-b border-slate-300 dark:border-white/10 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-serif font-bold text-white shadow-xs">
                  LP
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#2A282D] dark:text-white truncate text-sm">
                    {userProfile.name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate font-mono">
                    {userProfile.email}
                  </p>
                  <span className="mt-1 inline-block rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-serif font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
                    Quản trị viên hệ thống
                  </span>
                </div>
              </div>

              {/* Menu điều hướng */}
              <div className="py-1">
                <Link
                  href="/admin/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[#5A5555] hover:bg-slate-900/5 hover:text-slate-900 dark:text-[#9F9690] dark:hover:bg-white/5 transition"
                >
                  <User className="h-4 w-4 text-slate-500" />
                  <span>Hồ sơ cá nhân</span>
                </Link>
              </div>

              {/* Divider & Nút Đăng xuất */}
              <div className="pt-1 border-t border-slate-300 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-semibold text-slate-800 hover:bg-slate-900/10 dark:text-[#e5a9b9] dark:hover:bg-white/5 transition cursor-pointer"
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
