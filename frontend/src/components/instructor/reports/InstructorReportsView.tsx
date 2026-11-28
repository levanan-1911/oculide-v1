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

export default function InstructorReportsView() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classRooms, setClassRooms] = useState<RoomOption[]>([]);
  const [classRoomsClassId, setClassRoomsClassId] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | 'all'>('all');
  const [sessionTypeFilter, setSessionTypeFilter] = useState<'all' | 'lab' | 'exam'>('all');
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudentItem[]>([]);

  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'attendance' | 'scores' | 'violations'>('overview');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | AttendanceStatus>('all');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [selectedScoreBand, setSelectedScoreBand] = useState('all');
  const [scoreRangeFilter, setScoreRangeFilter] = useState<'all' | '0-4.9' | '5-7.9' | '8-10'>('all');
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
            let initialClassId = clsList[0].class_id;
            if (typeof window !== 'undefined') {
              const urlParams = new URLSearchParams(window.location.search);
              const paramClassId = urlParams.get('class_id');
              if (paramClassId) {
                const found = clsList.find((c) => c.class_id === Number(paramClassId));
                if (found) initialClassId = found.class_id;
              }
              const paramTab = urlParams.get('tab');
              if (paramTab === 'results' || paramTab === 'attendance' || paramTab === 'scores' || paramTab === 'overview') {
                setActiveReportTab(paramTab as typeof activeReportTab);
              }
            }
            setSelectedClassId(initialClassId);
          } else {
            setSelectedClassId(-1);
          }
        } else {
          setSelectedClassId(-1);
        }
      } catch {
        setSelectedClassId(-1);
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
        if (selectedClassId === -1) {
          const allRooms = await fetchWithAuth<Array<Record<string, unknown>>>('/api/v1/rooms');
          if (cancelled) return;
          const unassignedRooms = (Array.isArray(allRooms) ? allRooms : [])
            .filter((r) => !r.class_id)
            .map((r) => ({
              room_id: Number(r.room_id),
              room_code: String(r.room_code || ''),
              title: String(r.room_name || 'Phiên tự do'),
              room_type: String(r.room_type || '').toLowerCase() === 'exam' ? 'exam' : 'practice',
              status: String(r.status || ''),
              scheduledAt: String(r.start_time || ''),
              durationMinutes: Number(r.duration_minutes || 90),
            }));
          setEnrolledStudents([]);
          setClassRooms(unassignedRooms);
          setSelectedRoomId(unassignedRooms.length > 0 ? unassignedRooms[0].room_id : 'all');
          setClassRoomsClassId(selectedClassId);
          return;
        }

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
          ].sort((a, b) => b.room_id - a.room_id);
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

      const scopedRooms =
        sessionTypeFilter === 'all'
          ? classRooms
          : classRooms.filter((r) =>
              sessionTypeFilter === 'exam' ? r.room_type === 'exam' : r.room_type !== 'exam'
            );

      const activeRoomsToFetch =
        selectedRoomId === 'all'
          ? scopedRooms
          : scopedRooms.filter((r) => r.room_id === selectedRoomId);

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

        const publishStateByRoom = new Map<number, {
          results_published: boolean;
          published_student_ids: string[];
          hidden_student_ids: string[];
        }>();

        for (const r of activeRoomsToFetch) {
          const [sbRes, vioRes, sessRes, subRes, pubRes] = await Promise.allSettled([
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
            fetchWithAuth<{
              room_id: number;
              results_published: boolean;
              published_student_ids: string[];
              hidden_student_ids: string[];
            }>(`/api/v1/rooms/${r.room_id}/publish`),
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
          if (pubRes.status === 'fulfilled' && pubRes.value) {
            publishStateByRoom.set(r.room_id, {
              results_published: Boolean(pubRes.value.results_published),
              published_student_ids: (pubRes.value.published_student_ids || []).map(String),
              hidden_student_ids: (pubRes.value.hidden_student_ids || []).map(String),
            });
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

        const violationLabelMap: Record<string, string> = {
          no_face_detected: 'Không thấy khuôn mặt',
          multiple_faces: 'Phát hiện nhiều người',
          multiple_people: 'Phát hiện nhiều người',
          phone_detected: 'Phát hiện điện thoại',
          suspicious_object: 'Vật thể đáng ngờ',
          camera_blocked: 'Camera bị che khuất',
          looking_away: 'Cúi xuống / Nhìn đi chỗ khác',
          tab_switch: 'Chuyển tab / Mất tiêu điểm',
          copy_paste: 'Sao chép / Dán (Ctrl+V)',
          fullscreen_exit: 'Thoát toàn màn hình',
        };

        const mapViolationsForStudent = (studentId: number, roomLabel: string): StudentViolationIncident[] =>
          allViolations
            .filter((v) => v.student_id === studentId)
            .map((v) => {
              const vLabel = violationLabelMap[v.violation_type] || v.violation_type;
              return {
                id: String(v.violation_id),
                type: vLabel,
                timestamp: new Date(v.detected_at).toLocaleTimeString('vi-VN'),
                severity: (v.severity === 'critical'
                  ? 'critical'
                  : v.severity === 'high'
                  ? 'high'
                  : 'medium') as 'medium' | 'high' | 'critical',
                confidence: 95,
                description: v.description || `Hệ thống giám sát ghi nhận: ${vLabel}`,
                snapshot_url: v.snapshot_url || undefined,
                evidenceSnapshot: {
                  webcamLabel: 'Giám sát Oculide Proctoring',
                  detectedObject: vLabel,
                  screenState: roomLabel,
                },
                status: v.review_status || 'pending',
                penaltyApplied: 0,
              };
            });

        // 1. Thêm từ Scoreboard (những bạn đã vào làm bài)
        const resolveIsPublished = (roomIdVal: number | undefined, studentIdVal: number, studentKey: string, roomTypeVal?: string) => {
          const pubCfg = roomIdVal ? publishStateByRoom.get(roomIdVal) : undefined;
          if (!pubCfg) return roomTypeVal === 'practice';
          const sidStr = String(studentIdVal);
          if (pubCfg.published_student_ids.includes(sidStr) || pubCfg.published_student_ids.includes(studentKey)) return true;
          if (pubCfg.hidden_student_ids.includes(sidStr) || pubCfg.hidden_student_ids.includes(studentKey)) return false;
          return pubCfg.results_published;
        };

        for (const row of allScoreboards) {
          const score10 = Number((row.score_scale_10 ?? row.total_score ?? 0).toFixed(1));
          const maxPts = row.max_room_points && row.max_room_points > 0 ? row.max_room_points : null;
          const studentVios = mapViolationsForStudent(row.student_id, row.room_code || className);

          // Tính điểm chính thức trừ điểm vi phạm
          const confirmedPenalty = studentVios
            .filter((v) => v.status === 'confirmed')
            .reduce((sum, v) => sum + (v.penaltyApplied || 0), 0);
          const finalScore = Math.max(0, Number((score10 - confirmedPenalty).toFixed(1)));
          const studentKey = row.student_code || `SV-${row.student_id}`;

          studentMap.set(row.student_id, {
            id: studentKey,
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
            isPublished: resolveIsPublished(row.room_id ?? primaryRoom?.room_id, row.student_id, studentKey, primaryRoom?.room_type),
            violations: studentVios,
          });
        }

        // 2. Thêm các sinh viên ghi danh trong lớp nhưng chưa có bài nộp
        for (const st of enrolledStudents) {
          if (!studentMap.has(st.user_id)) {
            const studentVios = mapViolationsForStudent(st.user_id, primaryRoom?.room_code || className);
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
              violations: studentVios,
            });
          }
        }

        setRecords(Array.from(studentMap.values()));

        // Xây dựng danh sách chuyên cần
        const hasAnyStartedOrEndedRoom = activeRoomsToFetch.some((r) => {
          const st = String(r.status || '').toLowerCase();
          return (
            st.includes('đang') ||
            st.includes('kết thúc') ||
            st === 'in_progress' ||
            st === 'dang_dien_ra' ||
            st === 'completed' ||
            st === 'ended' ||
            st === 'da_dong'
          );
        });

        const resolveAttendanceStatus = (
          sess: { status?: string } | undefined,
          hasSub: boolean
        ): AttendanceStatus => {
          if (sess) {
            const s = String(sess.status || '').toLowerCase();
            if (s === 'late' || s === 'muon' || s === 'diem_danh_muon') return 'late';
            return 'ontime';
          }
          if (hasSub) return 'ontime';
          return hasAnyStartedOrEndedRoom ? 'absent' : 'not_arrived';
        };

        const attendanceList: AttendanceRecord[] = enrolledStudents.map((st) => {
          const sess = allSessions.find((s) => s.student_id === st.user_id);
          const hasSubmitted = allSubmissions.some((sub) => sub.student_id === st.user_id);
          const attStatus = resolveAttendanceStatus(sess, hasSubmitted);
          return {
            studentId: st.student_id || st.username || `SV-${st.user_id}`,
            name: st.full_name || st.username,
            studentClass: className,
            checkInTime: sess ? new Date(sess.started_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null,
            lateMinutes: attStatus === 'late' ? 1 : sess ? 0 : null,
            status: attStatus,
          };
        });

        // Nếu danh sách ghi danh rỗng nhưng có sinh viên trong scoreboard
        if (attendanceList.length === 0 && allScoreboards.length > 0) {
          allScoreboards.forEach((sb) => {
            const sess = allSessions.find((s) => s.student_id === sb.student_id);
            const hasSub = (sb.total_submissions ?? 0) > 0 || allSubmissions.some((sub) => sub.student_id === sb.student_id);
            const attStatus = resolveAttendanceStatus(sess, hasSub);
            attendanceList.push({
              studentId: sb.student_code || `SV-${sb.student_id}`,
              name: sb.student_name,
              studentClass: className,
              checkInTime: sess ? new Date(sess.started_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null,
              lateMinutes: attStatus === 'late' ? 1 : sess ? 0 : null,
              status: attStatus,
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
  }, [selectedClassId, classRoomsClassId, selectedRoomId, sessionTypeFilter, classRooms, enrolledStudents, classes]);

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

  // Công bố điểm toàn bộ lớp (lưu xuống SQL Server)
  const handleTogglePublishAll = async () => {
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

    const targetRoomIds =
      selectedRoomId === 'all'
        ? classRooms.map((r) => r.room_id)
        : [selectedRoomId];
    await Promise.allSettled(
      targetRoomIds.map((rid) =>
        fetchWithAuth(`/api/v1/rooms/${rid}/publish`, {
          method: 'PATCH',
          body: JSON.stringify({ results_published: nextState }),
        })
      )
    );

    showToast(
      nextState
        ? `Đã CÔNG BỐ ĐIỂM cho toàn bộ sinh viên lớp ${selectedClass?.class_code}! Sinh viên đã có thể xem điểm.`
        : `Đã ẨN ĐIỂM lớp ${selectedClass?.class_code}. Sinh viên tạm thời không xem được điểm.`
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
              Kết quả &amp; Báo cáo vi phạm
            </h1>
            {selectedClass && (
              <span className="rounded-md bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-800 dark:bg-white/10 dark:border-white/10 dark:text-white">
                {selectedClass.class_code}
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Quản lý chuyên cần, phổ điểm, bảng điểm chính thức và thẩm định biên bản vi phạm AI theo từng lớp học phần.
          </p>
        </div>

        {(activeReportTab === 'scores' || activeReportTab === 'violations') && (
          <div className="flex flex-wrap items-center gap-2.5">
            {activeReportTab === 'scores' && (
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
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3.5 text-xs font-serif font-bold text-slate-700 hover:bg-slate-100 border border-slate-300 cursor-pointer shadow-2xs dark:bg-slate-900 dark:text-slate-200 dark:border-white/10 dark:hover:bg-slate-800"
              title="Tải về file Excel/CSV chuẩn UTF-8"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{activeReportTab === 'violations' ? 'Xuất Báo Cáo Vi Phạm (CSV)' : 'Xuất Bảng Điểm Excel (CSV)'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ── BỘ CHỌN LỚP HỌC PHẦN & CA LÀM BÀI (RÕ RÀNG THEO TỪNG LỚP) ── */}
      <div className="grid grid-cols-1 gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900 md:grid-cols-2 items-end">
        <div className="flex flex-col gap-2">
          <div className="flex min-h-[28px] items-center justify-between gap-2">
            <label htmlFor="reports-class-select" className="flex items-center gap-1.5 text-xs font-serif font-bold text-slate-700 dark:text-slate-300">
              <GraduationCap className="h-4 w-4 text-brand-700 dark:text-[#e5a9b9]" />
              Lớp học phần quản lý:
            </label>
          </div>
          <select
            id="reports-class-select"
            value={selectedClassId ?? ''}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
          >
            <option value={-1}>Buổi học / Buổi thi tự do (Không gắn lớp)</option>
            {classes.map((cls) => (
              <option key={cls.class_id} value={cls.class_id}>
                {cls.class_code} — {cls.class_name} {cls.semester ? `(${cls.semester})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex min-h-[28px] items-center justify-between gap-2">
            <label htmlFor="reports-room-select" className="flex items-center gap-1.5 text-xs font-serif font-bold text-slate-700 dark:text-slate-300">
              <Layers className="h-4 w-4 text-brand-700 dark:text-[#e5a9b9]" />
              Buổi học / Buổi thi:
            </label>
            <select
              aria-label="Lọc loại buổi"
              value={sessionTypeFilter}
              onChange={(e) => {
                setSessionTypeFilter(e.target.value as 'all' | 'lab' | 'exam');
                setSelectedRoomId('all');
              }}
              className="h-7 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-brand dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="all">Tất cả loại buổi</option>
              <option value="lab">Buổi học</option>
              <option value="exam">Buổi thi</option>
            </select>
          </div>
          <select
            id="reports-room-select"
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 dark:border-white/10 dark:bg-slate-800 dark:text-white"
          >
            {(() => {
              const filteredRooms =
                sessionTypeFilter === 'all'
                  ? classRooms
                  : classRooms.filter((r) =>
                      sessionTypeFilter === 'exam' ? r.room_type === 'exam' : r.room_type !== 'exam'
                    );
              if (filteredRooms.length === 0) {
                return <option value="all">Chưa có buổi học / thi nào phù hợp</option>;
              }
              return (
                <>
                  <option value="all">Tất cả các buổi ({filteredRooms.length} buổi)</option>
                  {filteredRooms.map((room) => (
                    <option key={room.room_id} value={room.room_id}>
                      [{room.room_type === 'exam' ? 'BUỔI THI' : 'BUỔI HỌC'}] {room.room_code} — {room.title} ({room.status})
                    </option>
                  ))}
                </>
              );
            })()}
          </select>
        </div>

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
                <span>
                  Thời gian:{' '}
                  <strong className="font-mono text-slate-800 dark:text-white">
                    {selectedRoom.scheduledAt
                      ? `${selectedRoom.scheduledAt.includes('T') ? new Date(selectedRoom.scheduledAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : selectedRoom.scheduledAt} (${selectedRoom.durationMinutes || 90} phút)`
                      : `${selectedRoom.durationMinutes || 90} phút`}
                  </strong>
                </span>
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
          { id: 'scores', label: 'Bảng điểm & Phổ điểm', icon: BarChart3 },
          { id: 'violations', label: 'Quản lý vi phạm', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setActiveReportTab(tab.id as typeof activeReportTab);
                setStatusFilter('all');
              }}
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

      {/* ── 2. THỐNG KÊ NHANH ── */}
      {activeReportTab === 'violations' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
          <div className="flex flex-col justify-between rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                SV có nghi vấn chờ duyệt
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white">{stats.studentsWithPendingViolations}</span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">/ {stats.total} SV</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Cần giảng viên thẩm định</p>
          </div>

          <div className="flex flex-col justify-between rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cảnh báo AI chờ duyệt
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white">{stats.aiPending}</span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">lỗi</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Đang chờ xác nhận / bác bỏ</p>
          </div>

          <div className="flex flex-col justify-between rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Đã lập biên bản
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white">{stats.aiConfirmed}</span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">vi phạm</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Đã xác nhận vi phạm quy chế</p>
          </div>

          <div className="flex flex-col justify-between rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-serif font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Đã bác bỏ lỗi AI
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white">{stats.aiRejected}</span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">cảnh báo</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">AI nhận diện nhầm / hợp lệ</p>
          </div>
        </div>
      ) : activeReportTab === 'overview' && (
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

      {/* Bảng điểm được sắp xếp theo điểm chính thức từ cao xuống thấp (Tổng quan) */}
      {activeReportTab === 'overview' && (
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
                  <th className="px-5 py-3 text-center">Vi phạm AI</th>
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
                  const pendingCount = student.violations.filter((violation) => violation.status === 'pending').length;
                  const rejectedCount = student.violations.filter((violation) => violation.status === 'rejected').length;

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
                          <button
                            type="button"
                            onClick={() => setReviewingStudent(student)}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300 cursor-pointer"
                          >
                            {confirmedCount} đã xác nhận{pendingCount > 0 ? ` (+${pendingCount} chờ)` : ''}
                          </button>
                        ) : pendingCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => setReviewingStudent(student)}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300 cursor-pointer"
                          >
                            {pendingCount} chờ thẩm định
                          </button>
                        ) : rejectedCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => setReviewingStudent(student)}
                            className="inline-flex rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600 hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-slate-300 cursor-pointer"
                          >
                            Đã bác bỏ ({rejectedCount})
                          </button>
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
              <div
                key={item.id}
                className="rounded-md border border-slate-200 bg-white dark:bg-slate-900 dark:border-white/10 p-4 text-left shadow-2xs"
              >
                <span className="text-xs font-serif font-semibold text-slate-500 dark:text-slate-400">{item.label}</span>
                <span className="mt-2 block text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white">{item.count}</span>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div>
              <h2 className="text-sm font-serif font-bold text-slate-900 dark:text-white">Danh sách chuyên cần</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Theo dõi sự hiện diện của sinh viên theo danh sách lớp học phần.</p>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={attendanceSearch}
                  onChange={(event) => setAttendanceSearch(event.target.value)}
                  placeholder="Tìm MSSV, tên..."
                  className="h-9 w-full rounded-md border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-brand-600 dark:border-white/10 dark:bg-slate-800 dark:text-white sm:w-64"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <select
                  aria-label="Lọc trạng thái chuyên cần"
                  value={attendanceFilter}
                  onChange={(event) => setAttendanceFilter(event.target.value as typeof attendanceFilter)}
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 cursor-pointer dark:border-white/10 dark:bg-neutral-950 dark:text-slate-200"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="ontime">Đúng giờ</option>
                  <option value="late">Đi muộn</option>
                  <option value="absent">Vắng</option>
                  <option value="not_arrived">Chưa vào phòng</option>
                </select>
                <button
                  type="button"
                  onClick={handleExportAttendanceCsv}
                  disabled={attendanceRecords.length === 0}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-white px-3.5 text-xs font-serif font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 border border-slate-300 dark:bg-slate-800 dark:text-white dark:border-white/10 cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Xuất chuyên cần CSV
                </button>
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

      {/* Tab Bảng điểm & Phổ điểm (Trái: Bảng điểm SV, Phải: Biểu đồ cột Phổ điểm) */}
      {activeReportTab === 'scores' && (() => {
        const q = searchQuery.trim().toLowerCase();
        const scoreTableRows = selectedScoreStudents.filter((st) => {
          if (scoreRangeFilter === '0-4.9' && !(st.finalScore >= 0 && st.finalScore < 5)) return false;
          if (scoreRangeFilter === '5-7.9' && !(st.finalScore >= 5 && st.finalScore < 8)) return false;
          if (scoreRangeFilter === '8-10' && !(st.finalScore >= 8 && st.finalScore <= 10)) return false;
          if (!q) return true;
          return st.name.toLowerCase().includes(q) || st.id.toLowerCase().includes(q);
        });
        const maxCount = Math.max(...scoreDistribution.map((item) => item.count), 1);

        return (
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

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
              {/* BÊN TRÁI (7/12): DANH SÁCH BẢNG ĐIỂM SINH VIÊN */}
              <div className="xl:col-span-7 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-md border border-slate-200 bg-white p-3 shadow-2xs dark:border-white/10 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <div className="relative flex-1 min-w-[180px] max-w-xs">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm MSSV hoặc Tên..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-9 w-full rounded-md border border-slate-300 bg-slate-50 pl-8 pr-3 text-xs text-slate-900 outline-none transition-all focus:border-slate-800 focus:bg-white placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    {selectedScoreBandInfo && (
                      <button
                        type="button"
                        onClick={() => setSelectedScoreBand('all')}
                        className="rounded-md bg-slate-100 px-2.5 py-1.5 text-[11px] font-serif font-bold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 cursor-pointer whitespace-nowrap"
                      >
                        Phổ {selectedScoreBandInfo.label} ✕
                      </button>
                    )}
                  </div>

                  <select
                    aria-label="Lọc theo khoảng điểm"
                    value={scoreRangeFilter}
                    onChange={(e) => setScoreRangeFilter(e.target.value as typeof scoreRangeFilter)}
                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/20 cursor-pointer dark:border-white/10 dark:bg-neutral-950 dark:text-slate-200 sm:ml-auto"
                  >
                    <option value="all">Tất cả khoảng điểm ({selectedScoreStudents.length})</option>
                    <option value="0-4.9">0 – 4.9 điểm</option>
                    <option value="5-7.9">5.0 – 7.9 điểm</option>
                    <option value="8-10">8.0 – 10 điểm</option>
                  </select>
                </div>

                <div className="rounded-md border border-slate-200 bg-white overflow-hidden shadow-2xs dark:border-white/10 dark:bg-slate-900">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                      <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[10px] font-mono font-bold uppercase text-slate-600 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3">MSSV</th>
                          <th className="px-4 py-3">Họ và Tên</th>
                          <th className="px-4 py-3 text-center">Điểm</th>
                          <th className="px-4 py-3 text-center">Công bố</th>
                          <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                        {scoreTableRows.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                              Không có sinh viên nào phù hợp.
                            </td>
                          </tr>
                        ) : (
                          scoreTableRows.map((st) => {
                            const hasSub = submissions.some((s) => (s.student_code || `SV-${s.student_id}`) === st.id);
                            return (
                              <tr key={st.id} className="transition hover:bg-slate-50/70 dark:hover:bg-white/[0.03]">
                                <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">{st.id}</td>
                                <td className="px-4 py-3 font-serif font-bold text-slate-900 dark:text-white text-xs whitespace-nowrap">
                                  {st.name}
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                  <span className="rounded px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10">
                                    {st.finalScore.toFixed(1)} / 10
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-serif font-bold border ${
                                      st.isPublished
                                        ? 'system-selected-module border-transparent'
                                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10'
                                    }`}
                                  >
                                    {st.isPublished ? '✓ Đã công bố' : 'Chưa công bố'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  {hasSub ? (
                                    <button
                                      type="button"
                                      onClick={() => setInspectingStudentKey(st.id)}
                                      className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-serif font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                    >
                                      <Eye className="h-3 w-3 shrink-0" />
                                      <span>Xem code</span>
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">Chưa nộp</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* BÊN PHẢI (5/12): BIỂU ĐỒ CỘT PHỔ ĐIỂM */}
              <div className="xl:col-span-5 rounded-md border border-slate-200 bg-white p-5 shadow-2xs dark:border-white/10 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-serif font-bold text-slate-900 dark:text-white">Biểu đồ Phổ điểm</h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Bấm vào từng cột để lọc bảng điểm bên trái.</p>
                  </div>
                  {selectedScoreBand !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedScoreBand('all')}
                      className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-serif font-bold text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 cursor-pointer shrink-0"
                    >
                      Bỏ lọc
                    </button>
                  )}
                </div>

                {records.length === 0 ? (
                  <p className="py-16 text-center text-xs text-slate-400 dark:text-slate-500">Chưa có dữ liệu điểm cho phiên này.</p>
                ) : (
                  <div className="mt-6">
                    <div className="flex h-56 items-end justify-between gap-2 border-b border-slate-200 dark:border-white/10 px-1 pb-2">
                      {scoreDistribution.map((band) => {
                        const selected = selectedScoreBand === band.id;
                        const heightPct = band.count > 0 ? Math.max(12, Math.round((band.count / maxCount) * 100)) : 4;
                        return (
                          <button
                            key={band.id}
                            type="button"
                            onClick={() => setSelectedScoreBand(selected ? 'all' : band.id)}
                            title={`${band.label} điểm: ${band.count} SV`}
                            className="group flex flex-1 h-full flex-col items-center justify-end gap-1.5 cursor-pointer"
                          >
                            <span className={`font-mono text-[11px] font-bold ${selected ? 'text-brand dark:text-[#e5a9b9]' : 'text-slate-700 dark:text-slate-300'}`}>
                              {band.count}
                            </span>
                            <div className="flex w-full flex-1 items-end justify-center px-1">
                              <div
                                style={{ height: `${heightPct}%` }}
                                className={`w-full max-w-[44px] rounded-t-md transition-all ${
                                  band.count === 0
                                    ? 'bg-slate-100 dark:bg-slate-800'
                                    : selected
                                    ? 'bg-brand shadow-sm ring-2 ring-brand/30'
                                    : 'bg-slate-700 group-hover:bg-brand/80 dark:bg-slate-400 dark:group-hover:bg-brand'
                                }`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 px-1">
                      {scoreDistribution.map((band) => {
                        const selected = selectedScoreBand === band.id;
                        return (
                          <span
                            key={band.id}
                            className={`flex-1 text-center font-mono text-[10px] leading-tight ${
                              selected ? 'font-bold text-brand dark:text-[#e5a9b9]' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {band.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── 3. BỘ LỌC & BẢNG QUẢN LÝ VI PHẠM AI ── */}
      {activeReportTab === 'violations' && (() => {
        const isViolationsTab = true;
        return (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-serif font-bold text-slate-500 dark:text-slate-400 mr-1">Lọc:</span>
              {(isViolationsTab
                ? [
                    { id: 'all', label: `Tất cả (${records.length})` },
                    { id: 'needs-review', label: `Chờ duyệt AI (${stats.studentsWithPendingViolations})` },
                    { id: 'confirmed', label: 'Đã xác nhận phạt' },
                  ]
                : [
                    { id: 'all', label: `Tất cả (${records.length})` },
                    { id: 'perfect', label: `Điểm 10 (${records.filter((r) => r.finalScore === 10).length})` },
                  ]
              ).map((tab) => (
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

          {/* ── 4. BẢNG CHI TIẾT ── */}
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono font-bold text-[10px] tracking-wider dark:bg-slate-800/60 dark:border-white/10 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">MSSV</th>
                    <th className="px-5 py-3.5">Họ và Tên</th>
                    <th className="px-5 py-3.5 text-center">Nộp bài</th>
                    {!isViolationsTab && <th className="px-5 py-3.5 text-center">Test Cases</th>}
                    {!isViolationsTab && <th className="px-5 py-3.5 text-center">Điểm Chính Thức</th>}
                    {isViolationsTab && <th className="px-5 py-3.5">Cảnh báo Vi Phạm AI</th>}
                    {!isViolationsTab && <th className="px-5 py-3.5 text-center">Trạng Thái Công Bố</th>}
                    <th className="px-5 py-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={isViolationsTab ? 5 : 7} className="py-12 text-center text-slate-400 dark:text-slate-500">
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

                          {/* Cột 4: Test case (chỉ ở tab Bảng điểm) */}
                          {!isViolationsTab && (
                            <td className="px-5 py-4 text-center">
                              <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {st.passedCases}
                              </span>
                            </td>
                          )}

                          {/* Cột 5: Điểm chính thức (chỉ ở tab Bảng điểm) */}
                          {!isViolationsTab && (
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
                          )}

                          {/* Cột 6: Báo cáo Vi phạm AI (chỉ ở tab Quản lý vi phạm) */}
                          {isViolationsTab && (
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
                                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-[10.5px] font-serif font-bold text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                                  <ShieldAlert className="h-3 w-3 shrink-0 text-slate-600 dark:text-slate-400" />
                                  <span>Đã xác nhận phạt ({confirmedViolations.length} lỗi)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-[10.5px] font-serif font-bold text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                                  <ShieldCheck className="h-3 w-3 shrink-0 text-slate-600 dark:text-slate-400" />
                                  <span>Đã bác bỏ lỗi AI ({rejectedViolations.length})</span>
                                </span>
                              )}
                            </td>
                          )}

                          {/* Cột 7: Trạng thái công bố (chỉ ở tab Bảng điểm) */}
                          {!isViolationsTab && (
                            <td className="px-4 py-4 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-1 text-[10.5px] font-serif font-bold border ${
                                  st.isPublished
                                    ? 'system-selected-module border-transparent'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10'
                                }`}
                              >
                                {st.isPublished ? '✓ Đã công bố' : 'Chưa công bố'}
                              </span>
                            </td>
                          )}

                          {/* Cột 8: Thao tác */}
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2 justify-end">
                              {!isViolationsTab && submissions.some((s) => (s.student_code || `SV-${s.student_id}`) === st.id) && (
                                <button
                                  type="button"
                                  onClick={() => setInspectingStudentKey(st.id)}
                                  className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md border border-slate-300 bg-white px-3 text-xs font-serif font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                >
                                  <Eye className="h-3.5 w-3.5 shrink-0" />
                                  <span>Xem code</span>
                                </button>
                              )}
                              {isViolationsTab ? (
                                st.violations.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => setReviewingStudent(st)}
                                    className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-3 text-xs font-serif font-bold transition cursor-pointer shadow-2xs border ${
                                      hasPending
                                        ? 'system-selected-module'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-300 dark:border-white/10 dark:hover:bg-white/20'
                                    }`}
                                  >
                                    <Eye className="h-3.5 w-3.5 shrink-0" />
                                    <span>{hasPending ? 'Thẩm định AI' : 'Xem lại'}</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Hợp lệ</span>
                                )
                              ) : (
                                !submissions.some((s) => (s.student_code || `SV-${s.student_id}`) === st.id) && (
                                  <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Chưa nộp bài</span>
                                )
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
        );
      })()}

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
