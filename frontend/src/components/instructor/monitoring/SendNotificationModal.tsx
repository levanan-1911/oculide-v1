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
  studentsList?: Array<{ id: string; name: string }>;
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
    type: 'info' as const,
    label: '📢 Nhắc chuẩn bị vào thi',
    text: 'Chào các em, ca học / ca thi sẽ bắt đầu trong ít phút nữa. Các em hãy giữ nguyên màn hình phòng chờ để hệ thống tự động phát đề.',
  },
  {
    type: 'warning' as const,
    label: '📹 Nhắc kiểm tra camera',
    text: 'Vui lòng kiểm tra lại thiết bị camera và micro. Đảm bảo khuôn mặt hiển thị rõ ràng trước khi giảng viên mở đề.',
  },
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
];

export default function SendNotificationModal({
  isOpen,
  onClose,
  studentsList,
  defaultTarget,
  onSend,
}: SendNotificationModalProps) {
  const activeStudents = (studentsList && studentsList.length > 0) ? studentsList : ALL_STUDENTS;
  const [targetType, setTargetType] = useState<'all' | 'group' | 'individual'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>(PREDEFINED_GROUPS[0].id);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(activeStudents[0]?.id || 'SE184801');
  const [noticeType, setNoticeType] = useState<'info' | 'warning' | 'time' | 'urgent'>('info');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (activeStudents.length > 0 && !activeStudents.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(activeStudents[0].id);
    }
  }, [activeStudents, selectedStudentId]);

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

    let targetLabel = `Toàn bộ sinh viên (${activeStudents.length} SV)`;
    let studentId: string | undefined = undefined;

    if (targetType === 'group') {
      const g = PREDEFINED_GROUPS.find((grp) => grp.id === selectedGroup);
      targetLabel = g ? g.label : 'Nhóm sinh viên được chọn';
    } else if (targetType === 'individual') {
      const s = activeStudents.find((st) => st.id === selectedStudentId) || activeStudents[0];
      targetLabel = s ? `Sinh viên: ${s.name} (${s.id})` : selectedStudentId;
      studentId = s ? s.id : selectedStudentId;
    }

    onSend(targetType, targetLabel, message.trim(), noticeType, studentId);
    setMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-md border border-slate-300 bg-white p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto dark:border-white/10 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-300 pb-4 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-rose-200">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                Gửi thông báo tới thí sinh
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Thông báo sẽ xuất hiện trực tiếp trên màn hình làm bài của sinh viên
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5 hover:text-stone-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Chọn phạm vi người nhận: Toàn phòng / Nhóm / Cá nhân */}
          <div>
            <label className="block text-xs font-serif font-bold text-stone-700 dark:text-stone-300 mb-2">
              Đối tượng nhận thông báo
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('all')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-md p-3 text-xs font-serif font-bold transition cursor-pointer ${
                  targetType === 'all'
                    ? 'border-2 border-brand bg-brand-50 text-brand-700 dark:text-rose-200 dark:bg-brand-500/10 shadow-2xs'
                    : 'border border-slate-300 bg-stone-50 text-stone-600 hover:bg-stone-100 dark:border-white/10 dark:bg-stone-900/50 dark:text-stone-300 dark:hover:bg-white/5'
                }`}
              >
                <Globe className="h-4 w-4" />
                <span>Toàn phòng thi</span>
                <span className="text-[10px] font-mono font-normal text-stone-400">46 SV</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('group')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-md p-3 text-xs font-serif font-bold transition cursor-pointer ${
                  targetType === 'group'
                    ? 'border-2 border-brand bg-brand-50 text-brand-700 dark:text-rose-200 dark:bg-brand-500/10 shadow-2xs'
                    : 'border border-slate-300 bg-stone-50 text-stone-600 hover:bg-stone-100 dark:border-white/10 dark:bg-stone-900/50 dark:text-stone-300 dark:hover:bg-white/5'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Nhóm sinh viên</span>
                <span className="text-[10px] font-mono font-normal text-stone-400">Theo bộ lọc</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('individual')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-md p-3 text-xs font-serif font-bold transition cursor-pointer ${
                  targetType === 'individual'
                    ? 'border-2 border-brand bg-brand-50 text-brand-700 dark:text-rose-200 dark:bg-brand-500/10 shadow-2xs'
                    : 'border border-slate-300 bg-stone-50 text-stone-600 hover:bg-stone-100 dark:border-white/10 dark:bg-stone-900/50 dark:text-stone-300 dark:hover:bg-white/5'
                }`}
              >
                <User className="h-4 w-4" />
                <span>Cá nhân</span>
                <span className="text-[10px] font-mono font-normal text-stone-400">Nhắc nhở riêng</span>
              </button>
            </div>
          </div>

          {/* Nếu chọn Nhóm: Dropdown nhóm */}
          {targetType === 'group' && (
            <div>
              <label className="block text-xs font-serif font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Chọn nhóm sinh viên mục tiêu
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-stone-800 outline-none transition focus:border-brand-600 dark:border-white/10 dark:bg-neutral-950 dark:text-stone-100"
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
              <label className="block text-xs font-serif font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Chọn sinh viên nhận cảnh báo / nhắc nhở
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-serif font-bold text-stone-800 outline-none transition focus:border-brand-600 dark:border-white/10 dark:bg-neutral-950 dark:text-stone-100"
              >
                {activeStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Phân loại mức độ thông báo */}
          <div>
            <label className="block text-xs font-serif font-bold text-stone-700 dark:text-stone-300 mb-2">
              Mức độ &amp; Loại thông báo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'warning', label: 'Cảnh báo', icon: AlertTriangle, color: 'text-stone-800 border-slate-300 bg-slate-50 dark:bg-white/10 dark:text-stone-200 dark:border-white/10' },
                { id: 'urgent', label: 'Khẩn cấp', icon: ShieldAlert, color: 'text-slate-800 border-slate-800/30 bg-slate-800/10 dark:text-rose-300 dark:border-slate-800' },
                { id: 'time', label: 'Thời gian', icon: Clock, color: 'text-brand-700 border-brand-300 bg-brand-50 dark:text-rose-200 dark:border-brand-500/30 dark:bg-brand-500/10' },
                { id: 'info', label: 'Hướng dẫn', icon: Info, color: 'text-stone-700 border-slate-300 bg-stone-50 dark:text-stone-300 dark:border-white/10 dark:bg-stone-900/50' },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = noticeType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNoticeType(t.id as any)}
                    className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-serif font-bold transition cursor-pointer ${
                      isSelected
                        ? `${t.color} ring-2 ring-slate-900`
                        : 'border-slate-300 bg-white text-stone-600 hover:bg-stone-50 dark:border-white/10 dark:bg-neutral-950 dark:text-stone-300 dark:hover:bg-white/5'
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
              <span className="text-xs font-serif font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-brand-600 dark:text-rose-300" />
                Mẫu câu soạn sẵn (Gợi ý nhanh):
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="rounded-md border border-slate-300 bg-stone-50 p-2 text-left text-[11px] font-medium text-stone-700 hover:border-brand-400 hover:bg-brand-50 transition cursor-pointer dark:border-white/10 dark:bg-stone-900/40 dark:text-stone-300 dark:hover:bg-white/5"
                >
                  <p className="font-serif font-bold text-stone-900 dark:text-stone-100">{tmpl.label}</p>
                  <p className="line-clamp-1 text-stone-500 dark:text-stone-400 mt-0.5">{tmpl.text}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Nội dung thông báo */}
          <div>
            <label className="block text-xs font-serif font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              Nội dung thông báo chi tiết
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập nội dung muốn thông báo hoặc chọn mẫu gợi ý phía trên..."
              className="w-full rounded-md border border-slate-300 bg-white p-3.5 text-xs text-stone-800 outline-none transition focus:border-brand-600 focus:ring-1 focus:ring-brand-600 dark:border-white/10 dark:bg-neutral-950 dark:text-stone-100"
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-300 pt-4 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition cursor-pointer dark:border-white/10 dark:text-stone-300 dark:hover:bg-white/5"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="system-primary-action inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-5 py-2 text-xs font-serif font-bold text-white shadow-2xs hover:bg-slate-800 transition cursor-pointer"
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

