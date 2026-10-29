'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  X,
  Users,
  User,
  Globe,
  AlertTriangle,
  Clock,
  Info,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTarget?: {
    type: 'all' | 'group' | 'individual';
    studentId?: string;
    studentName?: string;
  };
  onSend: (
    targetType: 'all' | 'group' | 'individual',
    targetLabel: string,
    message: string,
    type: 'info' | 'warning' | 'time' | 'urgent',
    studentId?: string
  ) => void;
}

const ALL_STUDENTS = [
  { id: 'SE184801', name: 'Nguyễn Văn An' },
  { id: 'SE184802', name: 'Trần Thị Bình' },
  { id: 'SE184803', name: 'Lê Hoàng Cường' },
  { id: 'SE184804', name: 'Phạm Minh Châu' },
  { id: 'SE184805', name: 'Đặng Tuấn Dương' },
  { id: 'SE184806', name: 'Vũ Hải Yến' },
];

const PREDEFINED_GROUPS = [
  { id: 'ai-alert', label: 'Nhóm sinh viên có cảnh báo AI' },
  { id: 'unsubmitted', label: 'Nhóm sinh viên chưa nộp bài' },
  { id: 'submitted', label: 'Nhóm sinh viên đã nộp bài thành công' },
  { id: 'support-needed', label: 'Nhóm sinh viên cần hỗ trợ' },
];

const TEMPLATES = [
  {
    type: 'time' as const,
    label: '⏱️ Nhắc còn 15 phút',
    text: 'Còn 15 phút là hết giờ làm bài! Các em hãy kiểm tra lại code, chạy thử test cases và bấm Nộp bài.',
  },
  {
    type: 'warning' as const,
    label: '⚠️ Cảnh báo quay mặt',
    text: 'Cảnh báo vi phạm: Bạn đang quay mặt khỏi khung hình camera quá lâu. Vui lòng nhìn thẳng vào màn hình làm bài.',
  },
  {
    type: 'urgent' as const,
    label: '🚨 Cảnh báo thiết bị di động',
    text: 'Cảnh báo nghiêm trọng: Hệ thống phát hiện thiết bị di động trong khu vực làm bài. Vui lòng cất ngay điện thoại nếu không sẽ bị lập biên bản đình chỉ thi.',
  },
  {
    type: 'warning' as const,
    label: '🔒 Cảnh báo thoát Fullscreen',
    text: 'Cảnh báo: Bạn vừa cố ý thao tác phím tắt thoát chế độ khóa toàn màn hình. Hãy tập trung làm bài thi trên ứng dụng Oculide.',
  },
  {
    type: 'info' as const,
    label: 'ℹ️ Hướng dẫn webcam',
    text: 'Vui lòng điều chỉnh lại góc webcam để khuôn mặt và bàn làm việc hiển thị rõ ràng trong khung hình giám sát.',
  },
];

export default function SendNotificationModal({
  isOpen,
  onClose,
  defaultTarget,
  onSend,
}: SendNotificationModalProps) {
  const [targetType, setTargetType] = useState<'all' | 'group' | 'individual'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>(PREDEFINED_GROUPS[0].id);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(ALL_STUDENTS[0].id);
  const [noticeType, setNoticeType] = useState<'info' | 'warning' | 'time' | 'urgent'>('warning');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (defaultTarget) {
      setTargetType(defaultTarget.type);
      if (defaultTarget.studentId) {
        setSelectedStudentId(defaultTarget.studentId);
      }
    }
  }, [defaultTarget]);

  if (!isOpen) return null;

  const handleApplyTemplate = (tmpl: typeof TEMPLATES[0]) => {
    setMessage(tmpl.text);
    setNoticeType(tmpl.type);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    let targetLabel = 'Toàn bộ sinh viên phòng thi (46 SV)';
    let studentId: string | undefined = undefined;

    if (targetType === 'group') {
      const g = PREDEFINED_GROUPS.find((grp) => grp.id === selectedGroup);
      targetLabel = g ? g.label : 'Nhóm sinh viên được chọn';
    } else if (targetType === 'individual') {
      const s = ALL_STUDENTS.find((st) => st.id === selectedStudentId);
      targetLabel = s ? `Sinh viên: ${s.name} (${s.id})` : selectedStudentId;
      studentId = selectedStudentId;
    }

    onSend(targetType, targetLabel, message.trim(), noticeType, studentId);
    setMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Gửi thông báo tới thí sinh
              </h2>
              <p className="text-xs text-slate-500">
                Thông báo sẽ xuất hiện trực tiếp trên màn hình làm bài của sinh viên
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Chọn phạm vi người nhận: Toàn phòng / Nhóm / Cá nhân */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Đối tượng nhận thông báo
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('all')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-xs font-bold transition cursor-pointer ${
                  targetType === 'all'
                    ? 'border-2 border-blue-600 bg-blue-50/70 text-blue-700 shadow-xs'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Globe className="h-4 w-4" />
                <span>Toàn phòng thi</span>
                <span className="text-[10px] font-normal text-slate-400">46 SV</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('group')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-xs font-bold transition cursor-pointer ${
                  targetType === 'group'
                    ? 'border-2 border-blue-600 bg-blue-50/70 text-blue-700 shadow-xs'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Nhóm sinh viên</span>
                <span className="text-[10px] font-normal text-slate-400">Theo bộ lọc</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('individual')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-xs font-bold transition cursor-pointer ${
                  targetType === 'individual'
                    ? 'border-2 border-blue-600 bg-blue-50/70 text-blue-700 shadow-xs'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <User className="h-4 w-4" />
                <span>Cá nhân</span>
                <span className="text-[10px] font-normal text-slate-400">Nhắc nhở riêng</span>
              </button>
            </div>
          </div>

          {/* Nếu chọn Nhóm: Dropdown nhóm */}
          {targetType === 'group' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Chọn nhóm sinh viên mục tiêu
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-600"
              >
                {PREDEFINED_GROUPS.map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    {grp.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nếu chọn Cá nhân: Dropdown danh sách SV */}
          {targetType === 'individual' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Chọn sinh viên nhận cảnh báo / nhắc nhở
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-blue-600"
              >
                {ALL_STUDENTS.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Phân loại mức độ thông báo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Mức độ &amp; Loại thông báo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'warning', label: 'Cảnh báo', icon: AlertTriangle, color: 'text-amber-700 border-amber-200 bg-amber-50' },
                { id: 'urgent', label: 'Khẩn cấp', icon: ShieldAlert, color: 'text-red-700 border-red-200 bg-red-50' },
                { id: 'time', label: 'Thời gian', icon: Clock, color: 'text-blue-700 border-blue-200 bg-blue-50' },
                { id: 'info', label: 'Hướng dẫn', icon: Info, color: 'text-slate-700 border-slate-200 bg-slate-50' },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = noticeType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNoticeType(t.id as any)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? `${t.color} ring-2 ring-blue-600`
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mẫu soạn sẵn (Quick Templates) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Mẫu câu soạn sẵn (Gợi ý nhanh):
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-left text-[11px] font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 transition cursor-pointer"
                >
                  <p className="font-bold text-slate-900">{tmpl.label}</p>
                  <p className="line-clamp-1 text-slate-500 mt-0.5">{tmpl.text}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Nội dung thông báo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nội dung thông báo chi tiết
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập nội dung muốn thông báo hoặc chọn mẫu gợi ý phía trên..."
              className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs text-slate-800 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
            >
              <Send className="h-4 w-4" />
              Gửi thông báo ngay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

