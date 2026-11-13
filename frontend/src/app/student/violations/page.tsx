"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  Clock,
  Info,
  LoaderCircle,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { fetchWithAuth } from "@/services/apiClient";

type ViolationStatus = "pending" | "rejected" | "confirmed";

interface ApiViolation {
  violation_id: number;
  session_id: number;
  student_id: number;
  room_id?: number | null;
  room_code?: string | null;
  room_name?: string | null;
  violation_type: string;
  severity: string;
  description?: string | null;
  snapshot_url?: string | null;
  detected_at: string;
  is_reviewed?: boolean;
  review_status?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
}

interface ViolationItem {
  id: number;
  examTitle: string;
  timestamp: string;
  type: string;
  typeName: string;
  severity: string;
  status: ViolationStatus;
  statusText: string;
  statusClass: string;
  evidenceNote: string;
  snapshotUrl?: string | null;
}

const VIOLATION_TYPE_NAMES: Record<string, string> = {
  tab_switch: "Rời khỏi cửa sổ thi (Chuyển Tab)",
  TAB_SWITCH: "Rời khỏi cửa sổ thi (Chuyển Tab)",
  copy_paste: "Thao tác sao chép / dán code trái phép",
  COPY_PASTE: "Thao tác sao chép / dán code trái phép",
  no_face_detected: "Không phát hiện khuôn mặt trước camera",
  multiple_faces: "Phát hiện nhiều người trước camera",
  multiple_people: "Phát hiện nhiều người trước camera",
  phone_detected: "Phát hiện sử dụng điện thoại di động",
  suspicious_object: "Phát hiện tài liệu / vật thể bất thường",
  looking_away: "Quay mặt khỏi màn hình thi",
  head_pose: "Quay mặt khỏi camera > 10s",
  HEAD_POSE: "Quay mặt khỏi camera > 10s",
  camera_blocked: "Camera giám sát bị che khuất",
  fullscreen_exit: "Thoát chế độ toàn màn hình",
};

function formatViolationTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return isoStr;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return isoStr;
  }
}

export default function StudentViolationsPage() {
  const [violations, setViolations] = useState<ViolationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedEvidence, setSelectedEvidence] = useState<ViolationItem | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadViolations() {
      setLoading(true);
      try {
        let studentId: number | null = null;
        try {
          const stored = localStorage.getItem("oculide_user");
          if (stored) {
            const parsed = JSON.parse(stored);
            const idVal = Number(parsed.user_id || parsed.id);
            if (!Number.isNaN(idVal) && idVal > 0) studentId = idVal;
          }
        } catch {
          // ignore
        }

        if (!studentId) {
          const me = await fetchWithAuth<{ user_id: number }>("/api/v1/auth/me");
          if (me && me.user_id) studentId = me.user_id;
        }

        if (studentId) {
          const data = await fetchWithAuth<ApiViolation[]>(
            `/api/v1/violations/student/${studentId}`
          );
          if (isMounted && Array.isArray(data)) {
            const mapped: ViolationItem[] = data.map((v) => {
              const rawStatus = (v.review_status || "pending").toLowerCase();
              let status: ViolationStatus = "pending";
              let statusText = "Đang chờ GV xem xét";
              let statusClass = "bg-amber-50 text-amber-700 border-amber-200/80";

              if (rawStatus === "rejected") {
                status = "rejected";
                statusText = "Đã hủy (Không tính vi phạm)";
                statusClass = "bg-slate-100 text-slate-600 border-slate-200";
              } else if (rawStatus === "confirmed" || rawStatus === "approved") {
                status = "confirmed";
                statusText = "Đã xác nhận vi phạm";
                statusClass = "bg-rose-50 text-rose-700 border-rose-200/80";
              }

              const examTitle =
                v.room_name && v.room_code
                  ? `${v.room_code} • ${v.room_name}`
                  : v.room_name || v.room_code || `Phiên thi #${v.session_id}`;

              const typeName =
                VIOLATION_TYPE_NAMES[v.violation_type] ||
                v.violation_type.replace(/_/g, " ").toUpperCase();

              return {
                id: v.violation_id,
                examTitle,
                timestamp: formatViolationTime(v.detected_at),
                type: v.violation_type,
                typeName,
                severity: v.severity || "medium",
                status,
                statusText,
                statusClass,
                evidenceNote:
                  v.description ||
                  `Hệ thống phát hiện hành vi ${typeName.toLowerCase()} trong ca thi.`,
                snapshotUrl: v.snapshot_url,
              };
            });
            setViolations(mapped);
          }
        }
      } catch {
        if (isMounted) setViolations([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadViolations();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredViolations = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return violations.filter((v) => {
      const matchesSearch =
        !keyword ||
        v.examTitle.toLowerCase().includes(keyword) ||
        v.typeName.toLowerCase().includes(keyword) ||
        v.evidenceNote.toLowerCase().includes(keyword);

      const matchesStatus =
        filterStatus === "all" || v.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [search, filterStatus, violations]);

  const counts = useMemo(
    () => ({
      all: violations.length,
      pending: violations.filter((v) => v.status === "pending").length,
      rejected: violations.filter((v) => v.status === "rejected").length,
      confirmed: violations.filter((v) => v.status === "confirmed").length,
    }),
    [violations]
  );

  return (
    <main className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Navigation & Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/student" className="hover:text-blue-600 transition">
                Sinh viên
              </Link>
              <span>/</span>
              <span className="text-blue-600 font-semibold">Nhật ký cảnh báo AI</span>
            </nav>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Nhật ký cảnh báo AI &amp; Vi phạm cá nhân
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Minh bạch toàn bộ sự kiện cảnh báo từ hệ thống AI giám sát webcam và màn hình.
            </p>
          </div>

          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 border border-blue-200/80 shadow-2xs">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            Chính sách đạo đức AI Oculide
          </div>
        </header>

        {/* Banner Thông báo Đạo đức AI */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5 flex items-start gap-3.5">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed space-y-1">
            <p>
              <strong className="font-bold">Lưu ý quan trọng:</strong> Hệ thống AI chỉ tự động ghi nhận các khoảnh khắc bất thường ở trạng thái tạm thời (<code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[11px] font-bold border border-blue-200/60 text-blue-800">Chờ GV xem xét</code>).
            </p>
            <p className="text-blue-800/90">
              AI <strong>không bao giờ</strong> tự ý trừ điểm bài thi của bạn. Quyết định cuối cùng luôn do chính Giảng viên bộ môn xem xét bằng chứng video/ảnh chụp và phê duyệt.
            </p>
          </div>
        </div>

        {/* Thẻ Thống Kê Tổng Quan */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-medium text-slate-500">Tổng ghi nhận cảnh báo</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{counts.all}</p>
              <p className="mt-1 text-[11px] text-slate-400">Tất cả bài thi</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldAlert size={22} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-medium text-slate-500">Đang chờ GV xem xét</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{counts.pending}</p>
              <p className="mt-1 text-[11px] text-slate-400">Trạng thái tạm thời</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock size={22} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-medium text-slate-500">Đã miễn vi phạm (Đã hủy)</p>
              <p className="mt-2 text-3xl font-bold text-slate-700">{counts.rejected}</p>
              <p className="mt-1 text-[11px] text-slate-400">GV đã xác nhận hợp lệ</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </section>

        {/* Filter Controls */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Danh sách nhật ký vi phạm</h2>
              <p className="text-xs text-slate-500">Tìm kiếm và tra cứu chi tiết ảnh chụp bằng chứng AI</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative sm:w-72">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm tên môn, loại hành vi..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                    filterStatus === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Tất cả ({counts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("pending")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                    filterStatus === "pending"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Chờ xem xét ({counts.pending})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("rejected")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                    filterStatus === "rejected"
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Đã hủy ({counts.rejected})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("confirmed")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                    filterStatus === "confirmed"
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Đã xác nhận ({counts.confirmed})
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Table & Cards */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin text-blue-600" />
              Đang tải nhật ký cảnh báo và vi phạm từ hệ thống...
            </div>
          ) : filteredViolations.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase font-semibold text-[11px] tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Ca thi / Bài Lab</th>
                      <th className="px-6 py-3.5">Thời gian ghi nhận</th>
                      <th className="px-6 py-3.5">Loại hành vi cảnh báo</th>
                      <th className="px-6 py-3.5">Mức độ</th>
                      <th className="px-6 py-3.5">Trạng thái xử lý</th>
                      <th className="px-6 py-3.5 text-right">Chi tiết Bằng chứng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredViolations.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                          {item.examTitle}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500">
                          {item.timestamp}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-800">
                            {item.typeName}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {item.evidenceNote}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              item.severity === "high" || item.severity === "critical"
                                ? "bg-rose-100 text-rose-700"
                                : item.severity === "medium"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.statusClass}`}
                          >
                            {item.statusText}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedEvidence(item)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Camera size={14} className="text-slate-400" />
                            Xem bằng chứng
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="space-y-3 p-4 md:hidden">
                {filteredViolations.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200/80 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">
                        {item.examTitle}
                      </h3>
                      <span
                        className={`inline-block shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${item.statusClass}`}
                      >
                        {item.statusText}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-slate-800">{item.typeName}</p>
                      <p className="text-slate-500 text-[11px]">{item.evidenceNote}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                      <span className="font-mono">{item.timestamp}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">
                        {item.severity}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedEvidence(item)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Camera size={14} className="text-slate-400" />
                      Xem ảnh chụp bằng chứng
                    </button>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="px-6 py-14 text-center">
              <ShieldAlert size={32} className="mx-auto text-slate-300" />
              <h3 className="mt-3 font-semibold text-slate-900 text-sm">
                Không tìm thấy ghi nhận cảnh báo
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Không có sự kiện vi phạm nào phù hợp với từ khóa hoặc bộ lọc.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterStatus("all");
                }}
                className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition cursor-pointer"
              >
                <RotateCcw size={12} /> Xóa bộ lọc
              </button>
            </div>
          )}
        </section>

        {/* Modal Xem Bằng Chứng */}
        {selectedEvidence && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">Chi tiết bằng chứng cảnh báo AI</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvidence(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400">Ca thi:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedEvidence.examTitle}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400">Thời gian:</span>
                    <p className="font-mono font-semibold text-slate-700 mt-0.5">
                      {selectedEvidence.timestamp}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Trạng thái duyệt:</span>
                    <p className="mt-0.5">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${selectedEvidence.statusClass}`}>
                        {selectedEvidence.statusText}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Hành vi phát hiện:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedEvidence.typeName}</p>
                  <p className="text-slate-500 text-[11px] mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {selectedEvidence.evidenceNote}
                  </p>
                </div>

                {selectedEvidence.snapshotUrl ? (
                  <div>
                    <span className="text-slate-400 mb-1.5 block">Ảnh chụp bằng chứng:</span>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-black flex items-center justify-center max-h-56">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedEvidence.snapshotUrl}
                        alt="Bằng chứng vi phạm"
                        className="object-contain max-h-56 w-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-slate-400">
                    <Camera className="mx-auto h-6 w-6 text-slate-300 mb-1" />
                    Sự kiện nhật ký từ trình duyệt (Tab switch / Blur / Copy-paste) - Không yêu cầu ảnh chụp webcam.
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedEvidence(null)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="pt-2 text-center text-xs text-slate-400">
          Oculide · Hệ thống thi lập trình trực tuyến
        </footer>
      </div>
    </main>
  );
}
