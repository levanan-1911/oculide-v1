
"use client";

import { Bell, ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { studentNotifications } from "./student-data";

export default function StudentTopbar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = studentNotifications.filter(
    (notification) => notification.unread,
  ).length;

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Tổng quan</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Không gian thi lập trình trực tuyến
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
          <Search size={17} className="text-slate-400" />
          <input
            type="search"
            placeholder="Tìm kiếm..."
            className="w-36 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Thông báo"
            onClick={() => setShowNotifications((value) => !value)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 z-30 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold text-slate-900">Thông báo</p>
                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
                  {unreadCount} mới
                </span>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto">
                {studentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start gap-2">
                      {notification.unread && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-l border-slate-200 pl-3 sm:pl-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
            SV
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">
              Sinh viên
            </p>
            <p className="text-xs text-slate-500">Student</p>
          </div>
          <ChevronDown size={16} className="hidden text-slate-400 sm:block" />
        </div>
      </div>
    </header>
  );
}
