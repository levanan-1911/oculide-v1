'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { fetchWithAuth } from '@/services/apiClient';
import {
  BookOpen,
  Download,
  AlertTriangle,
  CheckCircle2,
  Search,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Layers,
  Lock,
  Unlock,
  Sparkles,
  UserCheck,
  Clock,
  CalendarDays,
  Users,
  BarChart3,
  GraduationCap,
} from 'lucide-react';
import ReviewViolationModal, {
  StudentReportRecord,
  StudentViolationIncident,
} from '@/components/instructor/reports/ReviewViolationModal';

type AttendanceStatus = 'ontime' | 'late' | 'absent' | 'not_arrived';

type AttendanceRecord = {
  studentId: string;
  name: string;
  studentClass: string;
  checkInTime: string | null;
  lateMinutes: number | null;
  status: AttendanceStatus;
};

type ScoreBandDefinition = {
  id: string;
  label: string;
  min: number;
  max: number;
  inclusiveMax?: boolean;
};

const SCORE_BANDS: ScoreBandDefinition[] = [
  { id: '0-2', label: '0 – dưới 2', min: 0, max: 2 },
  { id: '2-4', label: '2 – dưới 4', min: 2, max: 4 },
  { id: '4-6', label: '4 – dưới 6', min: 4, max: 6 },
  { id: '6-8', label: '6 – dưới 8', min: 6, max: 8 },
  { id: '8-9', label: '8 – dưới 9', min: 8, max: 9 },
  { id: '9-10', label: '9 – 10', min: 9, max: 10, inclusiveMax: true },
];

interface ClassItem {
  class_id: number;
  class_code: string;
  class_name: string;
  semester?: string;
  instructor_name?: string;
  student_count?: number;
}

interface EnrolledStudentItem {
  user_id: number;
  student_id?: string;
  username: string;
  full_name: string;
  email?: string;
}

interface RoomOption {
  room_id: number;
  room_code: string;
  title: string;
  room_type: string;
  status: string;
  scheduledAt?: string;
  durationMinutes?: number;
}

export default function InstructorReportsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classRooms, setClassRooms] = useState<RoomOption[]>([]);
  const [classRoomsClassId, setClassRoomsClassId] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | 'all'>('all');
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudentItem[]>([]);

  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'attendance' | 'scores' | 'results'>('overview');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | AttendanceStatus>('all');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [selectedScoreBand, setSelectedScoreBand] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs-review' | 'confirmed' | 'perfect'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewingStudent, setReviewingStudent] = useState<StudentReportRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [records, setRecords] = useState<StudentReportRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [submissions, setSubmissions] = useState<Array<{
    submission_id: number;
    student_id: number;
    student_name?: string;
    student_code?: string;
    question_id: number;
    question_title?: string;
    attempt_number: number;
    language: string;
    code_content: string;
    submitted_at: string;
    status: string;
    total_points?: number;
    max_points?: number;
  }>>([]);
  const [inspectingStudentKey, setInspectingStudentKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Tải danh sách Lớp học phần từ CSDL
  useEffect(() => {
    let cancelled = false;
    async function loadClasses() {
      setIsLoading(true);
      try {
        const clsList = await fetchWithAuth<ClassItem[]>('/api/v1/classes');
        if (cancelled) return;
        if (Array.isArray(clsList)) {
          setClasses(clsList);
          if (clsList.length > 0) {
            setSelectedClassId(clsList[0].class_id);
          }
        }
      } catch {
        // Lỗi kết nối
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadClasses();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Khi chọn Lớp -> Tải danh sách phòng (lab + thi) và sinh viên ghi danh trong lớp
  useEffect(() => {
    if (!selectedClassId) {
      setClassRooms([]);
      setClassRoomsClassId(null);
      setEnrolledStudents([]);
      return;
    }

    let cancelled = false;
    setClassRooms([]);
    setClassRoomsClassId(null);
    setEnrolledStudents([]);
    setSelectedRoomId('all');

    async function loadClassDetails() {
      try {
        const [roomsRes, studentsRes] = await Promise.allSettled([
          fetchWithAuth<{ labs: Array<Record<string, unknown>>; exams: Array<Record<string, unknown>> }>(`/api/v1/classes/${encodeURIComponent(selectedClassId)}/rooms`),
          fetchWithAuth<EnrolledStudentItem[]>(`/api/v1/classes/${encodeURIComponent(selectedClassId)}/students`),
        ]);

        if (cancelled) return;

        if (studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value)) {
          setEnrolledStudents(studentsRes.value);
        } else {
          setEnrolledStudents([]);
        }

        if (roomsRes.status === 'fulfilled' && roomsRes.value) {
          const rawLabs = roomsRes.value.labs || [];
          const rawExams = roomsRes.value.exams || [];
          const mappedRooms: RoomOption[] = [
            ...rawExams.map((e) => ({
              room_id: Number(e.room_id || e.id),
              room_code: String(e.roomCode || e.id || ''),
              title: String(e.title || 'Bài kiểm tra / Thi'),
              room_type: 'exam',
              status: String(e.status || ''),
              scheduledAt: String(e.scheduledAt || ''),
              durationMinutes: Number(e.durationMinutes || 90),
            })),
            ...rawLabs.map((l) => ({
              room_id: Number(l.room_id || l.id),
              room_code: String(l.roomCode || l.id || ''),
              title: String(l.title || 'Bài thực hành Lab'),
              room_type: 'practice',
              status: String(l.status || ''),
              scheduledAt: String(l.startTime || ''),
              durationMinutes: Number(l.durationMinutes || 120),
            })),
          ];
          setClassRooms(mappedRooms);
          if (mappedRooms.length > 0) {
            setSelectedRoomId(mappedRooms[0].room_id);
          } else {
            setSelectedRoomId('all');
          }
        } else {
          setClassRooms([]);
          setSelectedRoomId('all');
        }
        setClassRoomsClassId(selectedClassId);
      } catch {
        if (!cancelled) {
          setClassRooms([]);
          setClassRoomsClassId(selectedClassId);
          setEnrolledStudents([]);
        }
      }
    }

    loadClassDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId]);

  // 3. Tải Báo cáo bài làm, Điểm số, Chuyên cần và Vi phạm AI từ CSDL
  useEffect(() => {
    let cancelled = false;

    async function loadReportData() {
      if (!selectedClassId || classRoomsClassId !== selectedClassId) {
        setRecords([]);
        setAttendanceRecords([]);
        setSubmissions([]);
        return;
      }

      const activeRoomsToFetch =
        selectedRoomId === 'all'
          ? classRooms
          : classRooms.filter((r) => r.room_id === selectedRoomId);

      if (activeRoomsToFetch.length === 0) {
        // Nếu lớp chưa có phòng nào, lập danh sách chuyên cần từ sinh viên ghi danh
        const emptyAttendance: AttendanceRecord[] = enrolledStudents.map((st) => ({
          studentId: st.student_id || st.username || `SV-${st.user_id}`,
          name: st.full_name || st.username,
          studentClass: classes.find((c) => c.class_id === selectedClassId)?.class_code || 'Lớp HP',
          checkInTime: null,
          lateMinutes: null,
          status: 'not_arrived',
        }));
        setRecords([]);
        setAttendanceRecords(emptyAttendance);
        setSubmissions([]);
        return;
      }

      try {
        // Tải dữ liệu cho các phòng được chọn
        const allScoreboards: Array<{
          student_id: number;
          student_name: string;
          student_code?: string;
          total_score: number;
          max_room_points?: number;
          score_scale_10?: number;
          solved_questions: number;
          total_submissions: number;
          last_submission_time?: string | null;
          room_code?: string;
          room_id?: number;
        }> = [];

        const allViolations: Array<{
          violation_id: number;
          student_id: number;
          violation_type: string;
          severity: string;
          description?: string | null;
          snapshot_url?: string | null;
          detected_at: string;
          review_status: 'pending' | 'confirmed' | 'rejected';
        }> = [];

        const allSessions: Array<{
          session_id: number;
          student_id: number;
          started_at: string;
          status: string;
        }> = [];

        const allSubmissions: Array<{
          submission_id: number;
          student_id: number;
          student_name?: string;
          student_code?: string;
          question_id: number;
          question_title?: string;
          attempt_number: number;
          language: string;
          code_content: string;
          submitted_at: string;
          status: string;
          total_points?: number;
          max_points?: number;
        }> = [];

        for (const r of activeRoomsToFetch) {
          const [sbRes, vioRes, sessRes, subRes] = await Promise.allSettled([
            fetchWithAuth<Array<{
              student_id: number;
              student_name: string;
              student_code?: string;
              total_score: number;
              max_room_points?: number;
              score_scale_10?: number;
              solved_questions: number;
              total_submissions: number;
              last_submission_time?: string | null;
            }>>(`/api/v1/rooms/${r.room_id}/scoreboard`),
            fetchWithAuth<Array<{
              violation_id: number;
              student_id: number;
              violation_type: string;
              severity: string;
              description?: string | null;
              snapshot_url?: string | null;
              detected_at: string;
              review_status: 'pending' | 'confirmed' | 'rejected';
            }>>(`/api/v1/violations/room/${r.room_id}`),
            fetchWithAuth<Array<{
              session_id: number;
              student_id: number;
              started_at: string;
              status: string;
            }>>(`/api/v1/sessions/room/${r.room_id}`),
            fetchWithAuth<Array<{
              submission_id: number;
              student_id: number;
              student_name?: string;
              student_code?: string;
              question_id: number;
              question_title?: string;
              attempt_number: number;
              language: string;
              code_content: string;
              submitted_at: string;
              status: string;
              total_points?: number;
              max_points?: number;
            }>>(`/api/v1/submissions/room/${r.room_id}`),
          ]);

          if (sbRes.status === 'fulfilled' && Array.isArray(sbRes.value)) {
            allScoreboards.push(...sbRes.value.map((item) => ({ ...item, room_code: r.room_code, room_id: r.room_id })));
          }
          if (vioRes.status === 'fulfilled' && Array.isArray(vioRes.value)) {
            allViolations.push(...vioRes.value);
          }
          if (sessRes.status === 'fulfilled' && Array.isArray(sessRes.value)) {
            allSessions.push(...sessRes.value);
          }
          if (subRes.status === 'fulfilled' && Array.isArray(subRes.value)) {
            allSubmissions.push(...subRes.value);
          }
        }

        if (cancelled) return;

        setSubmissions(allSubmissions);

        const currentClassInfo = classes.find((c) => c.class_id === selectedClassId);
        const className = currentClassInfo?.class_code || 'Lớp HP';
        const primaryRoom = activeRoomsToFetch[0];

        // Xây dựng danh sách bản ghi kết quả sinh viên
        // Gồm các sinh viên trong scoreboard + sinh viên trong lớp chưa thi
        const studentMap = new Map<number, StudentReportRecord>();

        // 1. Thêm từ Scoreboard (những bạn đã vào làm bài)
        for (const row of allScoreboards) {
          const score10 = Number((row.score_scale_10 ?? row.total_score ?? 0).toFixed(1));
          const maxPts = row.max_room_points && row.max_room_points > 0 ? row.max_room_points : null;
          const studentVios: StudentViolationIncident[] = allViolations
            .filter((v) => v.student_id === row.student_id)
            .map((v) => ({
              id: String(v.violation_id),
              type: v.violation_type,
              timestamp: new Date(v.detected_at).toLocaleTimeString('vi-VN'),
              severity: (v.severity === 'critical'
                ? 'critical'
                : v.severity === 'high'
                ? 'high'
                : 'medium') as 'medium' | 'high' | 'critical',
              confidence: 95,
              description: v.description || `Hệ thống giám sát ghi nhận: ${v.violation_type}`,
              snapshot_url: v.snapshot_url || undefined,
              evidenceSnapshot: {
                webcamLabel: 'Giám sát Oculide Proctoring',
                detectedObject: v.violation_type,
                screenState: row.room_code || className,
              },
              status: v.review_status || 'pending',
              penaltyApplied: v.review_status === 'confirmed' ? 2.0 : 0,
            }));

          // Tính điểm chính thức trừ điểm vi phạm
          const confirmedPenalty = studentVios
            .filter((v) => v.status === 'confirmed')
            .reduce((sum, v) => sum + (v.penaltyApplied || 0), 0);
          const finalScore = Math.max(0, Number((score10 - confirmedPenalty).toFixed(1)));

          studentMap.set(row.student_id, {
            id: row.student_code || `SV-${row.student_id}`,
            name: row.student_name || `Sinh viên #${row.student_id}`,
            studentClass: className,
            examTitle: primaryRoom?.title || `Ca thi ${className}`,
            submitTime: row.last_submission_time
              ? new Date(row.last_submission_time).toLocaleTimeString('vi-VN')
              : 'Đang làm bài',
            testScore: score10,
            finalScore: finalScore,
            passedCases: maxPts
              ? `${row.total_score}/${maxPts}đ · ${row.solved_questions ?? 0} câu (${row.total_submissions ?? 0} lần nộp)`
              : `${row.solved_questions ?? 0} câu đạt (${row.total_submissions ?? 0} lần nộp)`,
            isPublished: primaryRoom?.room_type === 'practice', // Bài thực hành tự động công bố, bài thi giảng viên phê duyệt
            violations: studentVios,
          });
        }

        // 2. Thêm các sinh viên ghi danh trong lớp nhưng chưa có bài nộp
        for (const st of enrolledStudents) {
          if (!studentMap.has(st.user_id)) {
            studentMap.set(st.user_id, {
              id: st.student_id || st.username || `SV-${st.user_id}`,
              name: st.full_name || st.username,
              studentClass: className,
              examTitle: primaryRoom?.title || `Ca thi ${className}`,
              submitTime: 'Chưa nộp bài',
              testScore: 0,
              finalScore: 0,
              passedCases: '0 câu đạt (0 lần nộp)',
              isPublished: false,
              violations: [],
            });
          }
        }

        setRecords(Array.from(studentMap.values()));

        // Xây dựng danh sách chuyên cần
        const attendanceList: AttendanceRecord[] = enrolledStudents.map((st) => {
          const sess = allSessions.find((s) => s.student_id === st.user_id);
          const hasSubmitted = allSubmissions.some((sub) => sub.student_id === st.user_id);
          return {
            studentId: st.student_id || st.username || `SV-${st.user_id}`,
            name: st.full_name || st.username,
            studentClass: className,
            checkInTime: sess ? new Date(sess.started_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null,
            lateMinutes: sess ? 0 : null,
            status: sess ? 'ontime' : hasSubmitted ? 'ontime' : 'absent',
          };
        });

        // Nếu danh sách ghi danh rỗng nhưng có sinh viên trong scoreboard
        if (attendanceList.length === 0 && allScoreboards.length > 0) {
          allScoreboards.forEach((sb) => {
            const sess = allSessions.find((s) => s.student_id === sb.student_id);
            attendanceList.push({
              studentId: sb.student_code || `SV-${sb.student_id}`,
              name: sb.student_name,
              studentClass: className,
              checkInTime: sess ? new Date(sess.started_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null,
              lateMinutes: 0,
              status: sess ? 'ontime' : 'ontime',
            });
          });
        }

        setAttendanceRecords(attendanceList);
      } catch {
        if (!cancelled) {
          setRecords([]);
          setAttendanceRecords([]);
          setSubmissions([]);
        }
      }
    }

    loadReportData();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId, classRoomsClassId, selectedRoomId, classRooms, enrolledStudents, classes]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const selectedClass = useMemo(
    () => classes.find((c) => c.class_id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const selectedRoom = useMemo(
    () => classRooms.find((r) => r.room_id === selectedRoomId) || null,
    [classRooms, selectedRoomId]
  );

  // Thống kê chuyên cần
  const attendanceStats = useMemo(() => ({
    total: attendanceRecords.length,
    ontime: attendanceRecords.filter((item) => item.status === 'ontime').length,
    late: attendanceRecords.filter((item) => item.status === 'late').length,
    absent: attendanceRecords.filter((item) => item.status === 'absent').length,
    notArrived: attendanceRecords.filter((item) => item.status === 'not_arrived').length,
  }), [attendanceRecords]);

  const filteredAttendance = useMemo(() => {
    const query = attendanceSearch.trim().toLowerCase();
    return attendanceRecords.filter((student) => {
      const matchesStatus = attendanceFilter === 'all' || student.status === attendanceFilter;
      const matchesSearch = !query ||
        student.studentId.toLowerCase().includes(query) ||
        student.name.toLowerCase().includes(query) ||
        student.studentClass.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [attendanceRecords, attendanceFilter, attendanceSearch]);

  // Phổ điểm
  const scoreDistribution = useMemo(() => SCORE_BANDS.map((band) => ({
    ...band,
    count: records.filter((student) =>
      student.finalScore >= band.min &&
      (band.inclusiveMax ? student.finalScore <= band.max : student.finalScore < band.max)
    ).length,
  })), [records]);

  const selectedScoreBandInfo = SCORE_BANDS.find((band) => band.id === selectedScoreBand);
  const selectedScoreStudents = useMemo(() => {
    if (!selectedScoreBandInfo) return records;
    return records.filter((student) =>
      student.finalScore >= selectedScoreBandInfo.min &&
      (selectedScoreBandInfo.inclusiveMax
        ? student.finalScore <= selectedScoreBandInfo.max
        : student.finalScore < selectedScoreBandInfo.max)
    );
  }, [records, selectedScoreBandInfo]);

  // Sắp xếp bảng điểm từ cao xuống thấp
  const sortedScoreRecords = useMemo(
    () => [...records].sort((a, b) => b.finalScore - a.finalScore),
    [records]
  );

  // Thống kê tổng hợp KPI
  const stats = useMemo(() => {
    const total = records.length;
    const avgScore =
      total > 0
        ? (records.reduce((acc, r) => acc + r.finalScore, 0) / total).toFixed(1)
        : '0.0';
    const passedCount = records.filter((r) => r.finalScore >= 5.0).length;
    const passRate = total > 0 ? ((passedCount / total) * 100).toFixed(0) : '0';
    const studentsWithPendingViolations = records.filter((r) =>
      r.violations.some((v) => v.status === 'pending')
    ).length;
    const publishedCount = records.filter((r) => r.isPublished).length;
    const allPublished = total > 0 && publishedCount === total;

    let aiConfirmed = 0;
    let aiRejected = 0;
    let aiPending = 0;
    for (const r of records) {
      for (const v of r.violations) {
        if (v.status === 'confirmed') aiConfirmed++;
        else if (v.status === 'rejected') aiRejected++;
        else aiPending++;
      }
    }
    const aiReviewed = aiConfirmed + aiRejected;
    const aiPrecisionPct = aiReviewed > 0 ? Math.round((aiConfirmed / aiReviewed) * 100) : null;

    return {
      total,
      avgScore,
      passedCount,
      passRate,
      studentsWithPendingViolations,
      publishedCount,
      allPublished,
      aiConfirmed,
      aiRejected,
      aiPending,
      aiPrecisionPct,
    };
  }, [records]);

  // Lọc bảng điểm
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (statusFilter === 'needs-review') {
        return r.violations.some((v) => v.status === 'pending');
      }
      if (statusFilter === 'confirmed') {
        return r.violations.some((v) => v.status === 'confirmed');
      }
      if (statusFilter === 'perfect') {
        return r.finalScore === 10.0;
      }
      return true;
    });
  }, [records, searchQuery, statusFilter]);

  // Xử lý thẩm định vi phạm AI (Duyệt từng sự cố)
  const handleResolveViolation = (
    studentId: string,
    violationId: string,
    action: 'confirm' | 'reject',
    penalty: number,
    note: string
  ) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== studentId) return rec;

        const updatedViolations = rec.violations.map((v) => {
          if (v.id === violationId) {
            return {
              ...v,
              status: action === 'confirm' ? ('confirmed' as const) : ('rejected' as const),
              penaltyApplied: penalty,
              resolutionNote: note,
              reviewedAt: new Date().toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            };
          }
          return v;
        });

        const totalPenalty = updatedViolations
          .filter((v) => v.status === 'confirmed')
          .reduce((sum, v) => sum + (v.penaltyApplied || 0), 0);

        const newFinalScore = Math.max(0, rec.testScore - totalPenalty);

        return {
          ...rec,
          finalScore: Number(newFinalScore.toFixed(1)),
          violations: updatedViolations,
        };
      })
    );

    // Đồng bộ lên Backend CSDL
    if (/^\d+$/.test(violationId)) {
      fetchWithAuth(`/api/v1/violations/${violationId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({
          review_status: action === 'confirm' ? 'confirmed' : 'rejected',
        }),
      }).catch(() => {});
    }

    showToast(
      action === 'confirm'
        ? `Đã xác nhận phạt cho sinh viên ${studentId} (Trừ ${penalty}đ)`
        : `Đã bác bỏ cảnh báo AI cho sinh viên ${studentId} (Giữ nguyên điểm)`
    );
  };

  // Thẩm định hàng loạt cho 1 sinh viên
  const handleBatchResolveAll = (
    studentId: string,
    action: 'confirm' | 'reject',
    totalPenalty: number,
    note: string
  ) => {
    const targetRec = records.find((r) => r.id === studentId);
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== studentId) return rec;

        const updatedViolations = rec.violations.map((v) => ({
          ...v,
          status: action === 'confirm' ? ('confirmed' as const) : ('rejected' as const),
          penaltyApplied: action === 'confirm' ? totalPenalty / (rec.violations.length || 1) : 0,
          resolutionNote: note,
          reviewedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        }));

        const newFinalScore = Math.max(0, rec.testScore - (action === 'confirm' ? totalPenalty : 0));

        return {
          ...rec,
          finalScore: Number(newFinalScore.toFixed(1)),
          violations: updatedViolations,
        };
      })
    );

    if (targetRec) {
      for (const v of targetRec.violations) {
        if (v.status === 'pending' && /^\d+$/.test(v.id)) {
          fetchWithAuth(`/api/v1/violations/${v.id}/review`, {
            method: 'PATCH',
            body: JSON.stringify({
              review_status: action === 'confirm' ? 'confirmed' : 'rejected',
            }),
          }).catch(() => {});
        }
      }
    }

    showToast(
      action === 'confirm'
        ? `Đã xác nhận phạt tất cả vi phạm của sinh viên ${studentId}`
        : `Đã bác bỏ tất cả cảnh báo AI của sinh viên ${studentId}`
    );
  };

  // Công bố điểm toàn bộ lớp
  const handleTogglePublishAll = () => {
    if (records.length === 0) {
      showToast('Chưa có dữ liệu điểm cho lớp/ca thi này.');
      return;
    }
    const nextState = !stats.allPublished;
    setRecords((prev) =>
      prev.map((r) => ({
        ...r,
        isPublished: nextState,
      }))
    );

    showToast(
      nextState
        ? `Đã CÔNG BỐ ĐIỂM cho toàn bộ sinh viên lớp ${selectedClass?.class_code}! Sinh viên đã có thể xem điểm.`
        : `Đã ẨN ĐIỂM lớp ${selectedClass?.class_code}. Sinh viên tạm thời không xem được điểm.`
    );
  };

  // Công bố điểm cho từng sinh viên
  const handleTogglePublishSingle = (studentId: string) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id === studentId) {
          const next = !r.isPublished;
          showToast(
            next
              ? `Đã công bố điểm cho thí sinh ${r.name} (${r.id})`
              : `Đã ẩn điểm thí sinh ${r.name} (${r.id})`
          );
          return { ...r, isPublished: next };
        }
        return r;
      })
    );
  };

  // Xuất file Bảng Điểm CSV
  const handleExportCsv = () => {
    if (records.length === 0) {
      showToast('Chưa có dữ liệu điểm để xuất file.');
      return;
    }

    const headers = [
      'MSSV',
      'Họ và Tên',
      'Lớp môn học',
      'Bài thi/Thực hành',
      'Thời gian nộp',
      'Điểm Test Cases',
      'Điểm Trừ Vi Phạm',
      'Điểm Chính Thức',
      'Số Vi Phạm AI',
      'Trạng Thái Duyệt',
      'Công Bố Điểm',
    ];

    const rows = records.map((r) => {
      const penalty = (r.testScore - r.finalScore).toFixed(1);
      const pendingCount = r.violations.filter((v) => v.status === 'pending').length;
      const confirmedCount = r.violations.filter((v) => v.status === 'confirmed').length;

      let reviewStatus = 'Tuân thủ tốt';
      if (pendingCount > 0) reviewStatus = `Chờ duyệt (${pendingCount} vi phạm)`;
      else if (confirmedCount > 0) reviewStatus = `Đã phạt (-${penalty}đ)`;
      else if (r.violations.length > 0) reviewStatus = 'Đã bác bỏ lỗi AI';

      return [
        r.id,
        `"${r.name}"`,
        selectedClass?.class_code || 'Lớp HP',
        `"${r.examTitle}"`,
        r.submitTime,
        r.testScore,
        penalty,
        r.finalScore,
        r.violations.length,
        `"${reviewStatus}"`,
        r.isPublished ? 'Đã công bố' : 'Chưa công bố',
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Bang_Diem_${selectedClass?.class_code || 'Lop'}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast(`Đã xuất bảng điểm lớp ${selectedClass?.class_code}!`);
  };

  // Xuất file Chuyên Cần CSV
  const handleExportAttendanceCsv = () => {
    if (attendanceRecords.length === 0) {
      showToast('Chưa có dữ liệu chuyên cần để xuất file.');
      return;
    }

    const headers = ['MSSV', 'Họ và Tên', 'Lớp', 'Giờ vào phòng', 'Độ trễ (phút)', 'Trạng thái', 'Bài làm'];
    const rows = attendanceRecords.map((student) => {
      const matchingSubmission = records.find((record) => record.id === student.studentId);
      const statusLabel = {
        ontime: 'Đúng giờ',
        late: 'Đi muộn',
        absent: 'Vắng',
        not_arrived: 'Chưa vào phòng',
      }[student.status];
      return [
        student.studentId,
        `"${student.name.replace(/"/g, '""')}"`,
        student.studentClass,
        student.checkInTime ?? '',
        student.lateMinutes ?? '',
        statusLabel,
        matchingSubmission && matchingSubmission.submitTime !== 'Chưa nộp bài' ? 'Đã nộp' : student.status === 'absent' ? 'Chưa nộp' : 'Chưa có bài',
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Chuyen_Can_${selectedClass?.class_code || 'Lop'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Đã xuất danh sách chuyên cần của ${selectedClass?.class_code}.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast thông báo trung tính */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-md border border-slate-300 bg-white px-4 py-3 text-xs shadow-lg dark:border-white/10 dark:bg-slate-900"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-800 shrink-0 dark:bg-white/10 dark:text-white">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-serif text-xs font-bold text-slate-900 dark:text-white">Thông báo hệ thống</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{toastMessage}</p>
          </div>
        </aside>
      )}

      {/* ── 1. HEADER BAR: TIÊU ĐỀ + NÚT CÔNG BỐ ĐIỂM TOÀN LỚP + XUẤT CSV ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-200 dark:border-white/10">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-serif font-bold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
              Báo cáo &amp; Kết quả học phần
            </h1>
            {selectedClass && (
              <span className="rounded-md bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-800 dark:bg-white/10 dark:border-white/10 dark:text-white">
                {selectedClass.class_code}
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Quản lý chuyên cần, đối soát biên bản vi phạm AI và công bố kết quả đánh giá theo từng lớp học phần.
          </p>
        </div>

        {activeReportTab === 'results' && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Nút Công Bố / Ẩn Điểm Toàn Bộ Lớp */}
            <button
              type="button"
              onClick={handleTogglePublishAll}
              className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-xs font-serif font-bold shadow-2xs transition cursor-pointer border ${
                stats.allPublished
                  ? 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 dark:bg-white/5 dark:text-slate-200 dark:border-white/10'
                  : 'system-primary-action bg-slate-900 text-white hover:bg-slate-800 border-slate-900'
              }`}
              title="Quyết định sinh viên có được xem điểm bài thi trên Dashboard hay không"
            >
              {stats.allPublished ? (
                <>
                  <Lock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Ẩn Điểm Toàn Lớp</span>
                </>
              ) : (
                <>
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Công Bố Điểm Toàn Lớp</span>
                </>
              )}
            </button>

            {/* Nút Xuất Bảng Điểm CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3.5 text-xs font-serif font-bold text-slate-700 hover:bg-slate-100 border border-slate-300 cursor-pointer shadow-2xs dark:bg-slate-900 dark:text-slate-200 dark:border-white/10 dark:hover:bg-slate-800"
              title="Tải về file Excel/CSV chuẩn UTF-8"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Xuất Bảng Điểm Excel (CSV)</span>
            </button>
          </div>
        )}
      </div>

      {/* ── BỘ CHỌN LỚP HỌC PHẦN & CA LÀM BÀI (RÕ RÀNG THEO TỪNG LỚP) ── */}
      <div className="grid grid-cols-1 gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-serif font-bold text-slate-700 dark:text-slate-300">
            <GraduationCap className="h-4 w-4" />
            Lớp học phần quản lý:
          </span>
          <select
            value={selectedClassId ?? ''}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-white"
          >
            {classes.length === 0 ? (
              <option value="">(Không có lớp học phần nào)</option>
            ) : (
              classes.map((cls) => (
                <option key={cls.class_id} value={cls.class_id}>
                  {cls.class_code} — {cls.class_name} {cls.semester ? `(${cls.semester})` : ''}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-serif font-bold text-slate-700 dark:text-slate-300">
            <Layers className="h-4 w-4" />
            Ca thi / Phòng thực hành:
          </span>
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-white"
          >
            {classRooms.length === 0 ? (
              <option value="all">Chưa có phiên làm bài nào trong lớp này</option>
            ) : (
              <>
                <option value="all">Tất cả các ca làm bài của lớp ({classRooms.length} ca)</option>
                {classRooms.map((room) => (
                  <option key={room.room_id} value={room.room_id}>
                    [{room.room_type === 'exam' ? 'THI' : 'LAB'}] {room.room_code} — {room.title} ({room.status})
                  </option>
                ))}
              </>
            )}
          </select>
        </label>

        <div className="md:col-span-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>Sĩ số lớp: <strong className="text-slate-800 dark:text-white font-mono">{enrolledStudents.length} sinh viên</strong></span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Học kỳ: <strong className="text-slate-800 dark:text-white">{selectedClass?.semester || 'Hiện hành'}</strong></span>
          </div>
          {selectedRoom && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>Thời gian: {selectedRoom.scheduledAt || `${selectedRoom.durationMinutes || 90} phút`}</span>
              </div>
            </>
          )}
          <span>•</span>
          <div className="flex items-center gap-1" title="Tỷ lệ cảnh báo AI được giám thị xác nhận đúng (Confirmed / (Confirmed + Rejected))">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>
              Độ chính xác AI:{' '}
              <strong className="text-slate-800 dark:text-white font-mono">
                {stats.aiPrecisionPct !== null ? `${stats.aiPrecisionPct}%` : 'Chưa duyệt'}
              </strong>{' '}
              <span className="font-mono">
                ({stats.aiConfirmed} đúng / {stats.aiRejected} bác bỏ / {stats.aiPending} chờ)
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Điều hướng 4 Tab báo cáo */}
      <div className="flex flex-wrap gap-2 rounded-md border border-slate-200 bg-white p-1.5 shadow-2xs dark:border-white/10 dark:bg-slate-900" role="tablist">
        {[
          { id: 'overview', label: 'Tổng quan', icon: Layers },
          { id: 'attendance', label: 'Chuyên cần', icon: UserCheck },
          { id: 'scores', label: 'Phổ điểm', icon: BarChart3 },
          { id: 'results', label: 'Bảng điểm & Vi phạm AI', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveReportTab(tab.id as typeof activeReportTab)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-serif font-bold transition cursor-pointer ${
                active
                  ? 'system-selected-module shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Thông báo nếu lớp chưa có bài làm */}
      {!isLoading && records.length === 0 && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300" role="status">
          Lớp học phần <strong className="text-slate-900 dark:text-white">{selectedClass?.class_code}</strong> hiện chưa có phiên thi/thực hành nào có bài nộp của sinh viên.
        </div>
      )}

      {/* ── 2. THỐNG KÊ NHANH (MÀU TRUNG TÍNH MẶC ĐỊNH HỆ THỐNG) ── */}
      {(activeReportTab === 'overview' || activeReportTab === 'results') && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
          {/* Điểm trung bình */}
          <div className="flex flex-col justify-between rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Điểm trung bình lớp
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white">{stats.avgScore}</span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">/ 10.0</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Chấm tự động &amp; thẩm định</p>
          </div>

          {/* Tỷ lệ Đạt */}
          <div className="flex flex-col justify-between rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tỷ lệ Đạt (≥ 5.0)
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white">{stats.passRate}%</span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                ({stats.passedCount}/{stats.total} SV)
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Đạt chuẩn đánh giá học phần</p>
          </div>

          {/* Cảnh báo AI Chờ Duyệt */}
          <div className="flex flex-col justify-between rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cảnh báo AI cần duyệt
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {stats.studentsWithPendingViolations}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">thí sinh có nghi vấn</span>
            </div>
            <p className="mt-1 text-[11px] font-serif font-semibold text-slate-600 dark:text-slate-300">
              {stats.studentsWithPendingViolations > 0
                ? 'Cần GV thẩm định trước khi công bố'
                : 'Tất cả vi phạm đã được xử lý'}
            </p>
          </div>

          {/* Trạng thái công bố điểm */}
          <div className="flex flex-col justify-between rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Công bố điểm thi
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white">
                {stats.publishedCount}/{stats.total}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">sinh viên đã công bố</span>
            </div>
            <p className="mt-1 text-[11px] font-serif font-semibold text-slate-600 dark:text-slate-300">
              {stats.allPublished ? (
                <span>✓ Đã mở điểm cho cả lớp</span>
              ) : (
                <span>Đang ẩn một phần ({stats.total - stats.publishedCount} SV)</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Tổng quan: chuyên cần + phổ điểm tóm tắt */}
      {activeReportTab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-serif font-bold text-slate-900 dark:text-white">Chuyên cần lớp học phần</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{attendanceStats.total} sinh viên ghi danh trong lớp</p>
              </div>
              <Users className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button type="button" onClick={() => { setAttendanceFilter('ontime'); setActiveReportTab('attendance'); }} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-left dark:border-white/10 dark:bg-white/5 cursor-pointer">
                <span className="text-[11px] font-serif font-semibold text-slate-600 dark:text-slate-400">Đúng giờ</span>
                <span className="mt-1 block text-2xl font-black font-mono text-slate-900 dark:text-white">{attendanceStats.ontime}</span>
              </button>
              <button type="button" onClick={() => { setAttendanceFilter('late'); setActiveReportTab('attendance'); }} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-left dark:border-white/10 dark:bg-white/5 cursor-pointer">
                <span className="text-[11px] font-serif font-semibold text-slate-600 dark:text-slate-400">Đi muộn</span>
                <span className="mt-1 block text-2xl font-black font-mono text-slate-900 dark:text-white">{attendanceStats.late}</span>
              </button>
              <button type="button" onClick={() => { setAttendanceFilter('absent'); setActiveReportTab('attendance'); }} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-left dark:border-white/10 dark:bg-white/5 cursor-pointer">
                <span className="text-[11px] font-serif font-semibold text-slate-600 dark:text-slate-400">Vắng</span>
                <span className="mt-1 block text-2xl font-black font-mono text-slate-900 dark:text-white">{attendanceStats.absent}</span>
              </button>
            </div>
            <div className="mt-4 flex h-2 overflow-hidden rounded bg-slate-200 dark:bg-white/10" aria-label="Tỷ lệ chuyên cần">
              <div className="bg-slate-700 dark:bg-slate-300" style={{ width: `${attendanceStats.total ? attendanceStats.ontime / attendanceStats.total * 100 : 0}%` }} />
              <div className="bg-slate-500 dark:bg-slate-400" style={{ width: `${attendanceStats.total ? attendanceStats.late / attendanceStats.total * 100 : 0}%` }} />
              <div className="bg-slate-400 dark:bg-slate-500" style={{ width: `${attendanceStats.total ? attendanceStats.absent / attendanceStats.total * 100 : 0}%` }} />
            </div>
            <button type="button" onClick={() => setActiveReportTab('attendance')} className="mt-4 text-xs font-serif font-bold text-slate-800 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white cursor-pointer">
              Xem danh sách chuyên cần →
            </button>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-serif font-bold text-slate-900 dark:text-white">Phổ điểm bài thi</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Điểm chính thức của {records.length} bài đã làm</p>
              </div>
              <BarChart3 className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="mt-4 space-y-3">
              {scoreDistribution.map((band) => (
                <button key={band.id} type="button" onClick={() => { setSelectedScoreBand(band.id); setActiveReportTab('scores'); }} className="block w-full text-left cursor-pointer">
                  <div className="mb-1 flex justify-between gap-3 text-[11px]">
                    <span className="text-slate-600 dark:text-slate-300">{band.label}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{band.count} SV</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded bg-slate-700 dark:bg-slate-300 transition-all" style={{ width: `${records.length ? band.count / Math.max(...scoreDistribution.map((item) => item.count), 1) * 100 : 0}%` }} />
                  </div>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setActiveReportTab('scores')} className="mt-4 text-xs font-serif font-bold text-slate-800 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white cursor-pointer">
              Xem phổ điểm chi tiết →
            </button>
          </section>
        </div>
      )}

      {/* Bảng điểm được sắp xếp theo điểm chính thức từ cao xuống thấp */}
      {(activeReportTab === 'overview' || activeReportTab === 'scores') && (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-2xs dark:border-white/10 dark:bg-slate-900">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                <BarChart3 className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-serif font-bold text-slate-900 dark:text-white">Bảng điểm sinh viên</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Điểm chính thức được sắp xếp từ cao xuống thấp sau khi trừ các vi phạm đã xác nhận.
                </p>
              </div>
            </div>
            <span className="inline-flex h-7 items-center self-start rounded-md bg-slate-100 px-2.5 text-[11px] font-mono font-bold text-slate-800 dark:bg-white/10 dark:text-slate-300 sm:self-center">
              {sortedScoreRecords.length} sinh viên
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="w-16 px-5 py-3 text-center">STT</th>
                  <th className="px-5 py-3">Sinh viên</th>
                  <th className="px-5 py-3">Lớp môn học</th>
                  <th className="px-5 py-3 text-center">Test Cases</th>
                  <th className="px-5 py-3 text-right">Điểm chính thức</th>
                  <th className="px-5 py-3 text-center">Vi phạm đã xác nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {sortedScoreRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      Chưa có kết quả cho lớp/phiên này.
                    </td>
                  </tr>
                ) : sortedScoreRecords.map((student, index) => {
                  const confirmedCount = student.violations.filter((violation) => violation.status === 'confirmed').length;

                  return (
                    <tr key={student.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
                      <td className="px-5 py-3.5 text-center font-mono font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-serif font-bold text-slate-900 dark:text-white">{student.name}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">{student.id}</p>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300">{student.studentClass}</td>
                      <td className="px-5 py-3.5 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300">{student.passedCases}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">{student.finalScore.toFixed(1)} / 10</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {confirmedCount > 0 ? (
                          <span className="inline-flex rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">{confirmedCount} lần</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab chuyên cần */}
      {activeReportTab === 'attendance' && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { id: 'all', label: 'Tổng sinh viên', count: attendanceStats.total },
              { id: 'ontime', label: 'Đúng giờ', count: attendanceStats.ontime },
              { id: 'late', label: 'Đi muộn', count: attendanceStats.late },
              { id: 'absent', label: 'Vắng', count: attendanceStats.absent },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAttendanceFilter(item.id as typeof attendanceFilter)}
                className={`rounded-md border bg-white dark:bg-slate-900 p-4 text-left shadow-2xs transition cursor-pointer ${
                  attendanceFilter === item.id ? 'border-slate-800 ring-1 ring-slate-800 dark:border-white dark:ring-white' : 'border-slate-200 dark:border-white/10'
                }`}
              >
                <span className="text-xs font-serif font-semibold text-slate-500 dark:text-slate-400">{item.label}</span>
                <span className="mt-2 block text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white">{item.count}</span>
              </button>
            ))}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-serif font-bold text-slate-900 dark:text-white">Danh sách chuyên cần</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Theo dõi sự hiện diện của sinh viên theo danh sách lớp học phần.</p>
              </div>
              <button
                type="button"
                onClick={handleExportAttendanceCsv}
                disabled={attendanceRecords.length === 0}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-white px-3.5 text-xs font-serif font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 border border-slate-300 dark:bg-slate-800 dark:text-white dark:border-white/10 cursor-pointer"
              >
                <Download className="h-4 w-4" /> Xuất chuyên cần CSV
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'ontime', label: 'Đúng giờ' },
                  { id: 'late', label: 'Đi muộn' },
                  { id: 'absent', label: 'Vắng' },
                  { id: 'not_arrived', label: 'Chưa vào phòng' },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setAttendanceFilter(filter.id as typeof attendanceFilter)}
                    className={`rounded-md px-3 py-1 text-[11px] font-serif font-bold cursor-pointer ${
                      attendanceFilter === filter.id
                        ? 'system-selected-module'
                        : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={attendanceSearch}
                  onChange={(event) => setAttendanceSearch(event.target.value)}
                  placeholder="Tìm MSSV, tên..."
                  className="h-9 w-full rounded-md border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-brand-600 dark:border-white/10 dark:bg-slate-800 dark:text-white sm:w-64"
                />
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-mono font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Sinh viên</th>
                    <th className="px-4 py-3">Lớp</th>
                    <th className="px-4 py-3 text-center">Giờ vào phòng</th>
                    <th className="px-4 py-3 text-center">Độ trễ</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Bài làm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {filteredAttendance.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">Không có sinh viên phù hợp với bộ lọc.</td></tr>
                  ) : filteredAttendance.map((student) => {
                    const submission = records.find((record) => record.id === student.studentId);
                    const statusLabel: Record<AttendanceStatus, string> = { ontime: 'Đúng giờ', late: 'Đi muộn', absent: 'Vắng', not_arrived: 'Chưa vào phòng' };
                    return (
                      <tr key={student.studentId} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">{student.studentId}</div>
                          <div className="mt-0.5 font-serif font-semibold text-slate-800 dark:text-slate-200">{student.name}</div>
                        </td>
                        <td className="px-4 py-3 font-mono">{student.studentClass}</td>
                        <td className="px-4 py-3 text-center font-mono">{student.checkInTime ?? '—'}</td>
                        <td className="px-4 py-3 text-center font-mono">{student.lateMinutes && student.lateMinutes > 0 ? `${student.lateMinutes} phút` : '—'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-mono font-bold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                            {statusLabel[student.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {submission && submission.submitTime !== 'Chưa nộp bài' ? (
                            <span className="font-serif font-bold text-slate-800 dark:text-slate-200">Đã nộp</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">Chưa nộp bài</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Tab phổ điểm */}
      {activeReportTab === 'scores' && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900">
              <p className="text-xs font-serif font-semibold text-slate-500 dark:text-slate-400">Bài có điểm</p>
              <p className="mt-2 text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white">{records.length}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900">
              <p className="text-xs font-serif font-semibold text-slate-500 dark:text-slate-400">Điểm trung bình</p>
              <p className="mt-2 font-mono text-2xl font-black tabular-nums text-slate-900 dark:text-white">{stats.avgScore}/10</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900">
              <p className="text-xs font-serif font-semibold text-slate-500 dark:text-slate-400">Cao nhất</p>
              <p className="mt-2 font-mono text-2xl font-black tabular-nums text-slate-900 dark:text-white">{records.length ? Math.max(...records.map((r) => r.finalScore)).toFixed(1) : '—'}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900">
              <p className="text-xs font-serif font-semibold text-slate-500 dark:text-slate-400">Thấp nhất</p>
              <p className="mt-2 font-mono text-2xl font-black tabular-nums text-slate-900 dark:text-white">{records.length ? Math.min(...records.map((r) => r.finalScore)).toFixed(1) : '—'}</p>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-serif font-bold text-slate-900 dark:text-white">Phân bố điểm chính thức</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Nhấn một khoảng điểm để xem danh sách sinh viên tương ứng.</p>
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Thang điểm 10</span>
            </div>
            {records.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">Chưa có dữ liệu điểm cho phiên này.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {scoreDistribution.map((band) => {
                  const maxCount = Math.max(...scoreDistribution.map((item) => item.count), 1);
                  const selected = selectedScoreBand === band.id;
                  return (
                    <button
                      key={band.id}
                      type="button"
                      onClick={() => setSelectedScoreBand(selected ? 'all' : band.id)}
                      className={`block w-full rounded-md p-2 text-left transition cursor-pointer ${
                        selected ? 'bg-slate-100 ring-1 ring-slate-400 dark:bg-white/10 dark:ring-white/20' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                        <span className={`font-serif font-semibold ${selected ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-300'}`}>{band.label} điểm</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{band.count} SV ({records.length ? Math.round(band.count / records.length * 100) : 0}%)</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded bg-slate-700 dark:bg-slate-300 transition-all" style={{ width: `${band.count / maxCount * 100}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-serif font-bold text-slate-900 dark:text-white">Danh sách sinh viên theo phổ điểm</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{selectedScoreBandInfo ? `Khoảng đang chọn: ${selectedScoreBandInfo.label}` : 'Tất cả sinh viên có điểm'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScoreBand('all')}
                className="rounded-md bg-slate-100 px-3 py-1 text-xs font-serif font-bold text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 cursor-pointer"
              >
                Bỏ lọc
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[10px] font-mono font-bold uppercase text-slate-600 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">MSSV</th>
                    <th className="px-4 py-3">Họ tên</th>
                    <th className="px-4 py-3">Lớp môn học</th>
                    <th className="px-4 py-3 text-right">Điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {selectedScoreStudents.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">Không có sinh viên trong khoảng điểm này.</td></tr>
                  ) : selectedScoreStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{student.id}</td>
                      <td className="px-4 py-3 font-serif font-semibold text-slate-800 dark:text-slate-200">{student.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">{student.studentClass}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">{student.finalScore.toFixed(1)}/10</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── 3. BỘ LỌC BẢNG ĐIỂM & VI PHẠM AI ── */}
      {activeReportTab === 'results' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-serif font-bold text-slate-500 dark:text-slate-400 mr-1">Lọc:</span>
              {[
                { id: 'all', label: `Tất cả (${records.length})` },
                { id: 'needs-review', label: `Chờ duyệt AI (${stats.studentsWithPendingViolations})` },
                { id: 'confirmed', label: 'Đã xác nhận phạt' },
                { id: 'perfect', label: `Điểm 10 (${records.filter((r) => r.finalScore === 10).length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                  className={`rounded-md px-2.5 py-1 text-[11.5px] font-serif font-bold transition cursor-pointer ${
                    statusFilter === tab.id
                      ? 'system-selected-module shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm MSSV hoặc Tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-slate-50 pl-10 pr-3.5 text-xs text-slate-900 outline-none transition-all focus:border-slate-800 focus:bg-white placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-white sm:w-64"
              />
            </div>
          </div>

          {/* ── 4. BẢNG ĐIỂM CHI TIẾT & THẨM ĐỊNH VI PHẠM AI ── */}
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono font-bold text-[10px] tracking-wider dark:bg-slate-800/60 dark:border-white/10 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">MSSV</th>
                    <th className="px-5 py-3.5">Họ và Tên</th>
                    <th className="px-5 py-3.5 text-center">Nộp bài</th>
                    <th className="px-5 py-3.5 text-center">Test Cases</th>
                    <th className="px-5 py-3.5 text-center">Điểm Chính Thức</th>
                    <th className="px-5 py-3.5">Cảnh báo Vi Phạm AI</th>
                    <th className="px-5 py-3.5 text-center">Trạng Thái Công Bố</th>
                    <th className="px-5 py-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        Không tìm thấy sinh viên nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((st) => {
                      const pendingViolations = st.violations.filter((v) => v.status === 'pending');
                      const confirmedViolations = st.violations.filter((v) => v.status === 'confirmed');
                      const rejectedViolations = st.violations.filter((v) => v.status === 'rejected');
                      const hasPending = pendingViolations.length > 0;
                      const penaltyDeducted = (st.testScore - st.finalScore).toFixed(1);

                      return (
                        <tr
                          key={st.id}
                          className="transition hover:bg-slate-50/70 dark:hover:bg-white/[0.03]"
                        >
                          {/* Cột 1: MSSV */}
                          <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white">
                            {st.id}
                          </td>

                          {/* Cột 2: Tên & Lớp */}
                          <td className="px-5 py-4">
                            <div className="font-serif font-bold text-slate-900 dark:text-white text-xs">{st.name}</div>
                            <div className="text-[10.5px] text-slate-500 font-mono">{st.studentClass}</div>
                          </td>

                          {/* Cột 3: Giờ nộp bài */}
                          <td className="px-5 py-4 text-center font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {st.submitTime}
                          </td>

                          {/* Cột 4: Test case */}
                          <td className="px-5 py-4 text-center">
                            <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {st.passedCases}
                            </span>
                          </td>

                          {/* Cột 5: Điểm chính thức */}
                          <td className="px-5 py-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="rounded px-2.5 py-0.5 text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10">
                                {st.finalScore.toFixed(1)} / 10
                              </span>
                              {Number(penaltyDeducted) > 0 && (
                                <span className="mt-0.5 text-[9.5px] font-mono font-bold text-slate-600 dark:text-slate-400">
                                  (Đã trừ {penaltyDeducted}đ)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Cột 6: Báo cáo Vi phạm AI */}
                          <td className="px-5 py-4">
                            {st.violations.length === 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                <CheckCircle2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                                0 vi phạm (Tuân thủ tốt)
                              </span>
                            ) : hasPending ? (
                              <div className="flex flex-col items-start gap-1">
                                <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10.5px] font-serif font-bold text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                                  <AlertTriangle className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                                  {pendingViolations.length} cảnh báo chờ thẩm định
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {pendingViolations[0].type}
                                </span>
                              </div>
                            ) : confirmedViolations.length > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10.5px] font-serif font-bold text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                                <ShieldAlert className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                                Đã xác nhận phạt ({confirmedViolations.length} lỗi)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10.5px] font-serif font-bold text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                                <ShieldCheck className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                                Đã bác bỏ lỗi AI ({rejectedViolations.length})
                              </span>
                            )}
                          </td>

                          {/* Cột 7: Trạng thái công bố */}
                          <td className="px-5 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePublishSingle(st.id)}
                              className={`rounded-md px-2.5 py-0.5 text-[10px] font-serif font-bold transition cursor-pointer border ${
                                st.isPublished
                                  ? 'system-selected-module border-transparent'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10'
                              }`}
                              title="Nhấp để chuyển trạng thái công bố điểm"
                            >
                              {st.isPublished ? '✓ Đã công bố' : 'Chưa công bố'}
                            </button>
                          </td>

                          {/* Cột 8: Thao tác */}
                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {submissions.some((s) => (s.student_code || `SV-${s.student_id}`) === st.id) && (
                                <button
                                  type="button"
                                  onClick={() => setInspectingStudentKey(st.id)}
                                  className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-serif font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>Xem code</span>
                                </button>
                              )}
                              {st.violations.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setReviewingStudent(st)}
                                  className={`inline-flex h-8 items-center gap-1 rounded-md px-3 text-xs font-serif font-bold transition cursor-pointer shadow-2xs border ${
                                    hasPending
                                      ? 'system-selected-module'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-300 dark:border-white/10'
                                  }`}
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>{hasPending ? 'Thẩm định AI' : 'Xem lại'}</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">Hợp lệ</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── MODAL XEM BÀI NỘP CỦA SINH VIÊN ── */}
      {inspectingStudentKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-md border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <div>
                <h3 className="text-base font-serif font-bold text-slate-900 dark:text-white">
                  Bài nộp của thí sinh ({inspectingStudentKey})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Lịch sử các lần nộp bài và mã nguồn thực tế
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingStudentKey(null)}
                className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-serif font-bold text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {submissions
                .filter((s) => (s.student_code || `SV-${s.student_id}`) === inspectingStudentKey)
                .map((sub) => (
                  <div key={sub.submission_id} className="rounded-md border border-slate-200 p-4 space-y-2.5 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-serif font-bold text-slate-900 dark:text-white">
                        {sub.question_title || `Câu #${sub.question_id}`} (Lần nộp {sub.attempt_number})
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-200 px-2 py-0.5 font-mono font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                          {sub.language}
                        </span>
                        <span className="rounded bg-white px-2 py-0.5 font-mono font-bold text-slate-800 border border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10">
                          {sub.total_points ?? 0}/{sub.max_points ?? 10}đ
                        </span>
                        <span className="font-mono text-slate-400 text-[11px]">
                          {new Date(sub.submitted_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                    <pre className="overflow-x-auto rounded bg-slate-950 p-3 text-xs font-mono text-slate-100">
                      {sub.code_content}
                    </pre>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL THẨM ĐỊNH VI PHẠM AI ── */}
      <ReviewViolationModal
        isOpen={Boolean(reviewingStudent)}
        onClose={() => setReviewingStudent(null)}
        record={reviewingStudent}
        onResolveViolation={(studentId, violationId, action, penalty, note) => {
          handleResolveViolation(studentId, violationId, action, penalty, note);
        }}
        onBatchResolveAll={(studentId, action, totalPenalty, note) => {
          handleBatchResolveAll(studentId, action, totalPenalty, note);
        }}
      />
    </div>
  );
}
