from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Set
from datetime import datetime

from core.permissions import get_current_user
from core.config import get_db_connection
from schemas.notification import NotificationItem, NotificationListResponse

router = APIRouter()

# Bộ nhớ lưu tạm ID các thông báo đã đọc theo ma_nguoi_dung (đảm bảo không tạo bảng mới trong CSDL)
_READ_NOTIFICATION_IDS: Dict[int, Set[str]] = {}

def _format_relative_time(dt: Any) -> str:
    """Định dạng thời gian thân thiện (VD: '5 phút trước', '2 giờ trước', 'Hôm qua')"""
    if not dt or not isinstance(dt, datetime):
        return "Gần đây"
    now = datetime.now()
    diff = now - dt
    total_seconds = int(diff.total_seconds())
    if total_seconds < 60:
        return "Vừa xong"
    elif total_seconds < 3600:
        mins = total_seconds // 60
        return f"{mins} phút trước"
    elif total_seconds < 86400:
        hours = total_seconds // 3600
        return f"{hours} giờ trước"
    elif total_seconds < 172800:
        return "Hôm qua"
    else:
        days = total_seconds // 86400
        return f"{days} ngày trước"

@router.get("", response_model=List[NotificationItem])
async def get_user_notifications(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[NotificationItem]:
    """
    Lấy danh sách thông báo thời gian thực của người dùng dựa trên vai trò (Admin, Giảng viên, Sinh viên).
    Dữ liệu truy vấn trực tiếp từ CSDL: NhatKyHeThong, ViPhamGiamSat, YeuCauTroGiup, Phong.
    Nếu không có thông báo hoặc cảnh báo nào, trả về danh sách rỗng [].
    """
    user_id = current_user.get("user_id")
    role = (current_user.get("role") or "").lower()
    read_set = _READ_NOTIFICATION_IDS.get(user_id, set())

    notifications: List[NotificationItem] = []

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if role == "admin":
            # 1. Thông báo Bảo mật, Đăng nhập & Cảnh báo an ninh hạ tầng
            cursor.execute("""
                SELECT TOP 5 
                    log_id, 
                    log_level, 
                    action, 
                    message, 
                    created_at,
                    ip_address
                FROM SystemAuditLogs
                WHERE log_level IN ('warning', 'error', 'danger', 'critical')
                   OR action IN ('SECURITY', 'AUTH', 'FIREWALL', 'LOGIN_FAILED', 'ACCOUNT_LOCK')
                ORDER BY created_at DESC
            """)
            for row in cursor.fetchall():
                nid = f"sec-{row[0]}"
                lvl = (row[1] or "").lower()
                n_type = "danger" if lvl in ('error', 'danger', 'critical') else "warning"
                notifications.append(NotificationItem(
                    id=nid,
                    title=f"Bảo mật: {row[2] or 'Cảnh báo an ninh'}",
                    desc=f"{row[3] or 'Sự kiện an ninh hệ thống'}" + (f" (IP: {row[5]})" if row[5] else ""),
                    time=_format_relative_time(row[4]),
                    type=n_type,
                    read=nid in read_set,
                    link="/admin/system"
                ))

            # 2. Thông báo Hạ tầng, Sao lưu CSDL & Bảo trì hệ thống
            cursor.execute("""
                SELECT TOP 4 
                    log_id, 
                    log_level, 
                    action, 
                    message, 
                    created_at
                FROM SystemAuditLogs
                WHERE action IN ('BACKUP', 'SYSTEM_SETTINGS', 'MAINTENANCE', 'RESTORE')
                ORDER BY created_at DESC
            """)
            for row in cursor.fetchall():
                nid = f"infra-{row[0]}"
                notifications.append(NotificationItem(
                    id=nid,
                    title=f"Hạ tầng: {row[2] or 'Hệ thống'}",
                    desc=row[3] or "Cập nhật tham số hạ tầng hoặc sao lưu CSDL thành công.",
                    time=_format_relative_time(row[4]),
                    type="info",
                    read=nid in read_set,
                    link="/admin/system"
                ))

            # 3. Thông báo Quản trị Người dùng & Đào tạo (Tạo tài khoản / Import Excel / Tạo lớp)
            cursor.execute("""
                SELECT TOP 3 
                    log_id, 
                    log_level, 
                    action, 
                    message, 
                    created_at
                FROM SystemAuditLogs
                WHERE action IN ('USER_MGMT', 'BATCH_IMPORT', 'CLASS_MGMT')
                ORDER BY created_at DESC
            """)
            for row in cursor.fetchall():
                nid = f"mgmt-{row[0]}"
                is_user = "USER" in (row[2] or "").upper() or "IMPORT" in (row[2] or "").upper()
                notifications.append(NotificationItem(
                    id=nid,
                    title=f"Quản trị: {row[2] or 'Vận hành'}",
                    desc=row[3] or "Thao tác cập nhật danh sách người dùng hoặc lớp học phần.",
                    time=_format_relative_time(row[4]),
                    type="success" if (row[1] or "").lower() == "info" else "warning",
                    read=nid in read_set,
                    link="/admin/users" if is_user else "/admin/classes"
                ))

        elif role == "instructor":
            # 1. Cảnh báo Vi phạm AI phòng thi thuộc các phòng do Giảng viên tạo
            cursor.execute("""
                SELECT TOP 5 
                    v.violation_id, 
                    v.severity, 
                    v.violation_type, 
                    v.description, 
                    v.detected_at,
                    p.room_code,
                    COALESCE(u.full_name, u.username, N'Sinh viên') AS ten_sinh_vien
                FROM Violations v
                INNER JOIN Rooms p ON v.room_id = p.room_id
                LEFT JOIN Users u ON v.student_id = u.user_id
                WHERE p.creator_id = ? AND (v.review_status = 'pending' OR v.review_status IS NULL)
                ORDER BY v.detected_at DESC
            """, (user_id,))
            for row in cursor.fetchall():
                nid = f"ins-vio-{row[0]}"
                notifications.append(NotificationItem(
                    id=nid,
                    title=f"Cảnh báo AI: {row[2]}",
                    desc=f"Thí sinh {row[6]} trong phòng {row[5]}: {row[3]}",
                    time=_format_relative_time(row[4]),
                    type="danger" if (row[1] or '').lower() in ('high', 'critical', 'nghiem_trong') else "warning",
                    read=nid in read_set,
                    link=f"/instructor/monitoring?room={row[5]}"
                ))

            # 2. Yêu cầu hỗ trợ SOS phòng thi trong phòng của giảng viên
            cursor.execute("""
                SELECT TOP 5 
                    s.request_id, 
                    s.issue_type, 
                    s.sos_message, 
                    s.sent_at,
                    p.room_code,
                    COALESCE(u.full_name, u.username, N'Sinh viên') AS ten_sinh_vien
                FROM SupportRequests s
                INNER JOIN Rooms p ON s.room_id = p.room_id
                LEFT JOIN Users u ON s.student_id = u.user_id
                WHERE p.creator_id = ? AND s.status IN ('pending', 'cho_xu_ly', 'open')
                ORDER BY s.sent_at DESC
            """, (user_id,))
            for row in cursor.fetchall():
                nid = f"ins-sos-{row[0]}"
                notifications.append(NotificationItem(
                    id=nid,
                    title=f"SOS khẩn cấp: {row[1]}",
                    desc=f"{row[5]} ({row[4]}): {row[2]}",
                    time=_format_relative_time(row[3]),
                    type="danger",
                    read=nid in read_set,
                    link=f"/instructor/monitoring?room={row[4]}"
                ))

            # 3. Thông báo sinh viên vừa nộp bài thi
            cursor.execute("""
                SELECT TOP 4
                    sub.submission_id,
                    sub.submitted_at,
                    sub.grading_status,
                    p.room_code,
                    p.room_name,
                    COALESCE(u.full_name, u.username, N'Sinh viên') AS ten_sinh_vien
                FROM Submissions sub
                INNER JOIN Rooms p ON sub.room_id = p.room_id
                LEFT JOIN Users u ON sub.student_id = u.user_id
                WHERE p.creator_id = ?
                ORDER BY sub.submitted_at DESC
            """, (user_id,))
            for row in cursor.fetchall():
                nid = f"ins-sub-{row[0]}"
                notifications.append(NotificationItem(
                    id=nid,
                    title="Bài thi mới nộp",
                    desc=f"Thí sinh {row[5]} vừa nộp bài thi tại phòng '{row[4]}' ({row[3]}).",
                    time=_format_relative_time(row[1]),
                    type="info",
                    read=nid in read_set,
                    link=f"/instructor/reports?room={row[3]}"
                ))

        elif role == "student":
            # 1. Ca thi đang diễn ra hoặc sắp tới thuộc các lớp sinh viên tham gia
            cursor.execute("""
                SELECT TOP 5 
                    p.room_id, 
                    p.room_code, 
                    p.room_name, 
                    p.status, 
                    p.start_time
                FROM Rooms p
                INNER JOIN ClassEnrollments svl ON p.class_id = svl.class_id
                WHERE svl.student_id = ?
                  AND (p.status IN ('dang_dien_ra', 'in_progress', 'ongoing') OR (p.status IN ('chua_mo', 'scheduled', 'draft') AND p.start_time > GETDATE()))
                ORDER BY p.start_time ASC
            """, (user_id,))
            for row in cursor.fetchall():
                nid = f"stu-room-{row[0]}"
                is_running = row[3] in ("dang_dien_ra", "in_progress", "ongoing")
                notifications.append(NotificationItem(
                    id=nid,
                    title="Ca thi đang diễn ra" if is_running else "Lịch thi sắp tới",
                    desc=f"Phòng thi '{row[2]}' ({row[1]}) {'đang mở, hãy vào thi ngay' if is_running else 'dự kiến sắp bắt đầu'}.",
                    time="Hiện tại" if is_running else _format_relative_time(row[4]),
                    type="info" if not is_running else "success",
                    read=nid in read_set,
                    link=f"/student/exams?code={row[1]}"
                ))

            # 2. Thông báo bài thi đã được chấm điểm
            cursor.execute("""
                SELECT TOP 3
                    sub.submission_id,
                    sub.total_score,
                    sub.grading_status,
                    sub.submitted_at,
                    p.room_name,
                    p.room_code
                FROM Submissions sub
                LEFT JOIN Rooms p ON sub.room_id = p.room_id
                WHERE sub.student_id = ? AND sub.grading_status IN ('completed', 'graded', 'da_cham')
                ORDER BY sub.submitted_at DESC
            """, (user_id,))
            for row in cursor.fetchall():
                nid = f"stu-score-{row[0]}"
                score_str = f"{row[1]:.1f}" if row[1] is not None else "0.0"
                notifications.append(NotificationItem(
                    id=nid,
                    title="Kết quả bài thi đã công bố",
                    desc=f"Bài thi tại phòng '{row[4] or row[5]}' đã hoàn tất chấm điểm: {score_str} điểm.",
                    time=_format_relative_time(row[3]),
                    type="success",
                    read=nid in read_set,
                    link="/student/submissions"
                ))

            # 3. Lớp học phần mới được thêm vào
            cursor.execute("""
                SELECT TOP 2
                    c.class_id,
                    c.class_code,
                    c.class_name,
                    e.enrolled_at
                FROM ClassEnrollments e
                INNER JOIN Classes c ON e.class_id = c.class_id
                WHERE e.student_id = ?
                ORDER BY e.enrolled_at DESC
            """, (user_id,))
            for row in cursor.fetchall():
                nid = f"stu-class-{row[0]}"
                notifications.append(NotificationItem(
                    id=nid,
                    title="Lớp học phần mới",
                    desc=f"Bạn đã được ghi danh vào lớp '{row[2]}' ({row[1]}).",
                    time=_format_relative_time(row[3]),
                    type="info",
                    read=nid in read_set,
                    link="/student/dashboard"
                ))

        return notifications
    except Exception as e:
        print(f"Lỗi khi truy vấn thông báo cho user {user_id}:", e)
        return []
    finally:
        cursor.close()
        conn.close()

@router.patch("/{notif_id}/read")
async def mark_notification_as_read(
    notif_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Đánh dấu một thông báo đã đọc"""
    user_id = current_user.get("user_id")
    if user_id not in _READ_NOTIFICATION_IDS:
        _READ_NOTIFICATION_IDS[user_id] = set()
    _READ_NOTIFICATION_IDS[user_id].add(notif_id)
    return {"status": "success", "message": f"Đã đánh dấu thông báo {notif_id} là đã đọc"}

@router.patch("/read-all")
async def mark_all_notifications_as_read(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Đánh dấu tất cả thông báo của người dùng hiện tại là đã đọc"""
    user_id = current_user.get("user_id")
    # Lấy toàn bộ ID hiện có và cho vào set
    notifs = await get_user_notifications(current_user)
    if user_id not in _READ_NOTIFICATION_IDS:
        _READ_NOTIFICATION_IDS[user_id] = set()
    for n in notifs:
        _READ_NOTIFICATION_IDS[user_id].add(n.id)
    return {"status": "success", "message": "Đã đánh dấu tất cả thông báo là đã đọc"}

@router.delete("")
async def clear_notifications(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Xóa bộ đệm thông báo của người dùng hiện tại"""
    user_id = current_user.get("user_id")
    if user_id in _READ_NOTIFICATION_IDS:
        _READ_NOTIFICATION_IDS[user_id].clear()
    return {"status": "success", "message": "Đã dọn dẹp thông báo"}
