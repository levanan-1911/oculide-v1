'use client';

import { useMemo, useState } from "react";
import InstructorSidebar from "../components/InstructorSidebar";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Copy,
  GraduationCap,
  LockKeyhole,
  PencilLine,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import RoomForm from "./components/RoomForm";
import EnrollmentTable from "./components/EnrollmentTable";
import type { Room, RoomFormValues, RoomMode, StudentEnrollment } from "./types";

type Screen = "list" | "form" | "students";
type FormMode = "create" | "edit";
type StatusFilter = "all" | "scheduled" | "open" | "closed";
type ModeFilter = "all" | RoomMode;

function inHours(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

const initialRooms: Room[] = [
  {
    roomId: 101,
    roomCode: "OCLIDE-PY-01",
    roomName: "Lập trình Python — Nhóm 01",
    mode: "practice",
    description: "Không gian thực hành Python, nộp bài và xem kết quả chạy test case.",
    startTime: inHours(2),
    endTime: inHours(26),
    durationMinutes: 90,
    maxAttempts: 3,
    passcode: "PY2026",
    isActive: true,
    status: "scheduled",
  },
  {
    roomId: 102,
    roomCode: "OCLIDE-EX-02",
    roomName: "Kiểm tra giữa kỳ — Cấu trúc dữ liệu",
    mode: "exam",
    description: "Phòng thi giữa kỳ có giám sát.",
    startTime: inHours(-2),
    endTime: inHours(2),
    durationMinutes: 60,
    maxAttempts: 1,
    passcode: "EXAM2026",
    isActive: true,
    status: "open",
  },
  {
    roomId: 103,
    roomCode: "OCLIDE-JS-03",
    roomName: "Thực hành JavaScript",
    mode: "practice",
    description: "Luyện tập JavaScript cơ bản.",
    startTime: inHours(-48),
    endTime: inHours(-24),
    durationMinutes: 45,
    maxAttempts: 5,
    passcode: "",
    isActive: false,
    status: "closed",
  },
];

const initialStudents: StudentEnrollment[] = [
  { studentId: 2001, studentCode: "29201125101", fullName: "Nguyễn Minh Anh", email: "minhanh.nguyen@example.edu.vn", className: "K29TPM1", status: "active", enrolledAt: "2026-10-12T08:30:00+07:00" },
  { studentId: 2002, studentCode: "29201125102", fullName: "Trần Quốc Bảo", email: "quocbao.tran@example.edu.vn", className: "K29TPM1", status: "completed", enrolledAt: "2026-10-12T08:35:00+07:00" },
  { studentId: 2003, studentCode: "29201125103", fullName: "Lê Thu Hà", email: "thuha.le@example.edu.vn", className: "K29TPM2", status: "not_started", enrolledAt: "2026-10-13T09:10:00+07:00" },
  { studentId: 2004, studentCode: "29201125104", fullName: "Phạm Đức Huy", email: "duchuy.pham@example.edu.vn", className: "K29TPM1", status: "enrolled", enrolledAt: "2026-10-14T13:20:00+07:00" },
  { studentId: 2005, studentCode: "29201125105", fullName: "Võ Ngọc Linh", email: "ngoclinh.vo@example.edu.vn", className: "K29TPM3", status: "completed", enrolledAt: "2026-10-15T14:05:00+07:00" },
  { studentId: 2006, studentCode: "29201125106", fullName: "Đặng Hoàng Nam", email: "hoangnam.dang@example.edu.vn", className: "K29TPM2", status: "enrolled", enrolledAt: "2026-10-16T10:45:00+07:00" },
];

const blankRoom: Room = {
  roomId: 0,
  roomCode: "",
  roomName: "",
  mode: "practice",
  description: "",
  startTime: inHours(1),
  endTime: inHours(25),
  durationMinutes: 60,
  maxAttempts: 1,
  passcode: "",
  isActive: false,
  status: "scheduled",
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa thiết lập";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
}

const statusLabels = {
  scheduled: "Sắp diễn ra",
  open: "Đang mở",
  closed: "Đã đóng",
} as const;

const statusStyles = {
  scheduled: "bg-amber-50 text-amber-700 ring-amber-200",
  open: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  closed: "bg-slate-100 text-slate-600 ring-slate-200",
} as const;

export default function InstructorRoomManagementPage() {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [students] = useState<StudentEnrollment[]>(initialStudents);
  const [screen, setScreen] = useState<Screen>("list");
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingRoom, setEditingRoom] = useState<Room>(blankRoom);
  const [selectedRoomId, setSelectedRoomId] = useState<number>(initialRooms[0].roomId);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedRoom = rooms.find((room) => room.roomId === selectedRoomId) ?? rooms[0];
  const filteredRooms = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi-VN");
    return rooms.filter((room) => {
      const matchesSearch = !query || [room.roomName, room.roomCode, room.description]
        .some((value) => value.toLocaleLowerCase("vi-VN").includes(query));
      return matchesSearch
        && (modeFilter === "all" || room.mode === modeFilter)
        && (statusFilter === "all" || room.status === statusFilter);
    });
  }, [rooms, search, modeFilter, statusFilter]);

  function openCreateForm() {
    setFormMode("create");
    setEditingRoom({ ...blankRoom, startTime: inHours(1), endTime: inHours(25) });
    setNotice("");
    setScreen("form");
  }

  function openEditForm(room: Room) {
    setFormMode("edit");
    setEditingRoom(room);
    setSelectedRoomId(room.roomId);
    setNotice("");
    setScreen("form");
  }

  async function handleSave(values: RoomFormValues): Promise<void> {
    setIsSaving(true);
    setNotice("");
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 350));
      if (formMode === "create") {
        const duplicate = rooms.some((room) => room.roomCode.toLowerCase() === values.roomCode.toLowerCase());
        if (duplicate) {
          throw new Error("Mã phòng đã tồn tại. Hãy chọn mã phòng khác rồi nhấn lưu lại.");
        }
        const newRoom: Room = {
          ...values,
          roomId: Math.max(0, ...rooms.map((room) => room.roomId)) + 1,
          isActive: true,
          status: "scheduled",
        };
        setRooms((current) => [newRoom, ...current]);
        setSelectedRoomId(newRoom.roomId);
        setNotice("Đã tạo phòng mới trong phiên xem thử.");
      } else {
        setRooms((current) => current.map((room) => room.roomId === editingRoom.roomId
          ? { ...room, ...values }
          : room));
        setSelectedRoomId(editingRoom.roomId);
        setNotice("Đã cập nhật cấu hình phòng trong phiên xem thử.");
      }
      setScreen("list");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleRoom(room: Room) {
    const nextStatus = room.status === "open" ? "closed" : "open";
    setRooms((current) => current.map((item) => item.roomId === room.roomId
      ? { ...item, status: nextStatus, isActive: nextStatus === "open" }
      : item));
    setNotice(nextStatus === "open" ? `Đã chuyển "${room.roomName}" sang trạng thái đang mở trong bản xem thử.` : `Đã đóng "${room.roomName}" trong bản xem thử.`);
  }

  function deleteRoom(room: Room) {
    const confirmed = window.confirm(`Bạn có chắc muốn xóa phòng "${room.roomName}" khỏi bản xem thử?`);
    if (!confirmed) return;
    const remaining = rooms.filter((item) => item.roomId !== room.roomId);
    setRooms(remaining);
    setSelectedRoomId(remaining[0]?.roomId ?? 0);
    setNotice("Đã xóa phòng khỏi danh sách xem thử.");
  }

  async function copyRoomCode(room: Room) {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setNotice(`Đã sao chép mã phòng ${room.roomCode}.`);
    } catch {
      setNotice(`Mã phòng: ${room.roomCode} (trình duyệt không cho phép sao chép tự động).`);
    }
  }

  const totalStudents = students.length;
  const openRooms = rooms.filter((room) => room.status === "open").length;

  return (
    <main className="min-h-screen bg-[#f3f8f7] text-slate-900">
      <div className="flex min-h-screen">
      <InstructorSidebar activePage="room" />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">Quản lý đào tạo</p>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {screen === "form" ? (formMode === "create" ? "Tạo phòng mới" : "Chỉnh sửa phòng") : screen === "students" ? "Danh sách sinh viên" : "Quản lý phòng thi & lớp học"}
                </h1>
                <p className="mt-1 text-[13px] text-slate-500">
                  {screen === "form" ? "Nhập thông tin và cấu hình hoạt động của phòng." : screen === "students" ? `Danh sách sinh viên trong phòng ${selectedRoom?.roomName ?? ""}.` : "Theo dõi phòng luyện tập, phòng thi và danh sách sinh viên tham gia."}
                </p>
              </div>
              {screen === "list" ? (
                <button type="button" onClick={openCreateForm} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:self-auto">
                  <Plus className="h-4 w-4" />Tạo phòng mới
                </button>
              ) : (
                <button type="button" onClick={() => { setScreen("list"); setNotice(""); }} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                  <ArrowLeft className="h-4 w-4" />Quay lại danh sách
                </button>
              )}
            </header>

            {notice && (
              <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] text-blue-800">
                <span>{notice}</span>
                <button type="button" onClick={() => setNotice("")} aria-label="Đóng thông báo"><X className="h-4 w-4" /></button>
              </div>
            )}

            <section aria-label="Thống kê phòng" className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <Metric icon={<BookOpen className="h-5 w-5" />} label="Tổng số phòng" value={rooms.length} tone="blue" />
              <Metric icon={<CheckCircle2 className="h-5 w-5" />} label="Phòng đang mở" value={openRooms} tone="green" />
              <Metric icon={<GraduationCap className="h-5 w-5" />} label="Tổng sinh viên mẫu" value={totalStudents} tone="purple" />
            </section>

            {screen === "form" && (
              <div className="mx-auto max-w-4xl">
                <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] text-blue-800">
                  {formMode === "create" ? "Sau khi lưu, phòng sẽ xuất hiện trong bảng danh sách." : "Sau khi lưu, thông tin mới sẽ được cập nhật trong bảng danh sách."}
                </div>
                <RoomForm key={`${formMode}-${editingRoom.roomId}`} initialRoom={editingRoom} onSubmit={handleSave} isSaving={isSaving} />
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={() => { setScreen("list"); setNotice("Đã hủy thao tác, không lưu thay đổi."); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">Hủy thao tác</button>
                </div>
              </div>
            )}

            {screen === "list" && (
              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
                <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-slate-900">Danh sách phòng</h2>
                        <p className="mt-1 text-[13px] text-slate-500">{filteredRooms.length} phòng phù hợp · Chọn một phòng để xem sinh viên</p>
                      </div>
                      <ClipboardList className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(180px,1fr)_180px_160px]">
                      <label className="relative block">
                        <span className="sr-only">Tìm phòng</span>
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã phòng hoặc tên phòng..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                      </label>
                      <select aria-label="Lọc theo chế độ" value={modeFilter} onChange={(event) => setModeFilter(event.target.value as ModeFilter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                        <option value="all">Tất cả chế độ</option><option value="practice">Luyện tập</option><option value="exam">Thi cử</option>
                      </select>
                      <select aria-label="Lọc theo trạng thái" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                        <option value="all">Tất cả trạng thái</option><option value="scheduled">Sắp diễn ra</option><option value="open">Đang mở</option><option value="closed">Đã đóng</option>
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-[13px]">
                      <thead className="bg-[#f7fbfa] text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>{["Phòng học", "Chế độ", "Thời gian", "Thời lượng", "Trạng thái", "Thao tác"].map((label) => <th key={label} className="px-4 py-3 font-bold">{label}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRooms.map((room) => (
                          <tr key={room.roomId} onClick={() => setSelectedRoomId(room.roomId)} className={`cursor-pointer transition hover:bg-blue-50/50 ${selectedRoomId === room.roomId ? "bg-blue-50/70" : "bg-white"}`}>
                            <td className="px-4 py-4">
                              <div className="flex items-start gap-2">
                                {selectedRoomId === room.roomId && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800">{room.roomName}</p>
                                  <p className="mt-1 text-xs text-slate-500">{room.roomCode}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4"><span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${room.mode === "exam" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}>{room.mode === "exam" ? "Thi cử" : "Luyện tập"}</span></td>
                            <td className="px-4 py-4 text-xs leading-5 text-slate-600"><span className="block">{formatDateTime(room.startTime)}</span><span className="block text-slate-400">đến {formatDateTime(room.endTime)}</span></td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-600"><Clock3 className="mr-1 inline h-3.5 w-3.5" />{room.durationMinutes} phút</td>
                            <td className="px-4 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[room.status]}`}>{statusLabels[room.status]}</span></td>
                            <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                              <div className="flex items-center gap-1.5">
                                <button type="button" title="Chỉnh sửa phòng" aria-label={`Chỉnh sửa ${room.roomName}`} onClick={() => openEditForm(room)} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"><PencilLine className="h-4 w-4" /></button>
                                <button type="button" title="Sao chép mã phòng" aria-label={`Sao chép mã ${room.roomCode}`} onClick={() => void copyRoomCode(room)} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"><Copy className="h-4 w-4" /></button>
                                <button type="button" title={room.status === "open" ? "Đóng phòng" : "Mở phòng"} onClick={() => toggleRoom(room)} className="whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">{room.status === "open" ? "Đóng" : "Mở"}</button>
                                <button type="button" title="Xóa phòng khỏi bản xem thử" aria-label={`Xóa ${room.roomName}`} onClick={() => deleteRoom(room)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredRooms.length === 0 && <div className="px-6 py-12 text-center"><Search className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">Không tìm thấy phòng</p><p className="mt-1 text-[13px] text-slate-500">Hãy đổi từ khóa hoặc bộ lọc.</p><button type="button" onClick={() => { setSearch(""); setModeFilter("all"); setStatusFilter("all"); }} className="mt-3 text-[13px] font-semibold text-blue-700 hover:underline">Xóa bộ lọc</button></div>}
                  </div>
                </section>

                {selectedRoom ? (
                  <aside className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-bold text-slate-900">Thông tin phòng đang chọn</p>
                        <p className="mt-1 break-all text-xs text-blue-700">{selectedRoom.roomCode}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{students.length} SV</span>
                    </div>
                    <h3 className="mt-4 text-[14px] font-bold text-slate-900">{selectedRoom.roomName}</h3>
                    <p className="mt-2 text-[13px] leading-6 text-slate-500">{selectedRoom.description || "Chưa có mô tả."}</p>
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-[13px]">
                      <InfoRow icon={<CalendarClock className="h-4 w-4" />} label="Thời gian mở" value={formatDateTime(selectedRoom.startTime)} />
                      <InfoRow icon={<Clock3 className="h-4 w-4" />} label="Thời lượng" value={`${selectedRoom.durationMinutes} phút`} />
                      <InfoRow icon={<LockKeyhole className="h-4 w-4" />} label="Mã truy cập" value={selectedRoom.passcode ? "Đã thiết lập" : "Không yêu cầu"} />
                      <InfoRow icon={<Users className="h-4 w-4" />} label="Số lượt làm tối đa" value={`${selectedRoom.maxAttempts} lượt`} />
                    </div>
                    {selectedRoom.mode === "exam" && <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">Phòng thi cần được kiểm tra đề thi, danh sách thí sinh và cấu hình giám sát trước khi tổ chức chính thức.</p>}
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => openEditForm(selectedRoom)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><PencilLine className="h-3.5 w-3.5" />Chỉnh sửa</button>
                      <button type="button" onClick={() => { setScreen("students"); setNotice(""); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"><Users className="h-3.5 w-3.5" />Xem sinh viên</button>
                    </div>
                  </aside>
                ) : (
                  <aside className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-[13px] text-slate-500">Chọn một phòng trong bảng để xem chi tiết.</aside>
                )}
              </div>
            )}

            {screen === "students" && selectedRoom && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-[13px] text-slate-500">Phòng đang xem</p><h2 className="mt-1 font-bold text-slate-900">{selectedRoom.roomName}</h2><p className="mt-1 text-xs text-slate-500">Mã phòng: {selectedRoom.roomCode}</p></div>
                  <button type="button" onClick={() => openEditForm(selectedRoom)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"><PencilLine className="h-4 w-4" />Chỉnh sửa phòng</button>
                </div>
                <EnrollmentTable students={students} />
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mx-auto max-w-[1440px] px-4 pb-5 text-xs leading-5 text-slate-400 sm:px-6 lg:px-8">Bản giao diện hiện dùng dữ liệu mẫu trong trình duyệt. Các thao tác tạo, sửa, mở/đóng và xóa chưa lưu vào máy chủ hoặc cơ sở dữ liệu.</p>
    </main>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "blue" | "green" | "purple" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    purple: "bg-violet-50 text-violet-700",
  };
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span><div><p className="text-xs text-slate-500">{label}</p><p className="mt-0.5 text-xl font-bold leading-none text-slate-900">{value}</p></div></div>;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-start gap-2.5"><span className="mt-0.5 text-slate-400">{icon}</span><div className="min-w-0 flex-1"><p className="text-xs text-slate-500">{label}</p><p className="mt-0.5 break-words text-[13px] font-medium text-slate-800">{value}</p></div></div>;
}
