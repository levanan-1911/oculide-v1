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
            # 1. Cảnh báo SOS khẩn cấp chưa xử lý từ sinh viên
            cursor.execute("""
                SELECT TOP 5 
                    s.request_id, 
                    s.issue_category, 
                    s.message, 
                    s.created_at,
                    COALESCE(p.title, N'Phòng thi') AS ten_phong,
                    COALESCE(u.full_name, u.username, N'Sinh viên') AS ten_sinh_vien
                FROM SupportRequests s
                LEFT JOIN Rooms p ON s.room_id = p.room_id
                LEFT JOIN Users u ON s.student_id = u.user_id
                WHERE s.status IN ('pending', 'cho_xu_ly')
                ORDER BY s.created_at DESC
            """)
            for row in cursor.fetchall():
                nid = f"sos-{row[0]}"
                notifications.append(NotificationItem(
                    id=nid,
                    title=f"Yêu cầu SOS: {row[1] or 'Sự cố phòng thi'}",
                    desc=f"{row[5]} ({row[4]}): {row[2] or 'Cần trợ giúp khẩn cấp'}",
                    time=_format_relative_time(row[3]),
                    type="danger",
                    read=nid in read_set,
                    link="/admin/schedules"
                ))

            # 2. Cảnh báo vi phạm AI mức độ nghiêm trọng
            cursor.execute("""
                SELECT TOP 5 
                    v.violation_id, 
                    v.severity, 
                    v.violation_type, 
                    v.description, 
                    v.detected_at,
                    COALESCE(p.title, N'Phòng thi') AS ten_phong,
                    COALESCE(u.full_name, u.username, N'Sinh viên') AS ten_sinh_vien
                FROM Violations v
                LEFT JOIN Rooms p ON v.room_id = p.room_id
                LEFT JOIN Users u ON v.student_id = u.user_id
                WHERE v.severity IN ('high', 'critical', 'nghiem_trong')
                  AND v.review_status = 'pending'
                ORDER BY v.detected_at DESC
            """)
            for row in cursor.fetchall():
                nid = f"violation-{row[0]}"
                notifications.append(NotificationItem(
                    id=nid,
                    title=f"Vi phạm AI: {row[2] or 'Bất thường'}",
                    desc=f"{row[6]} tại {row[5]}: {row[3] or 'Phát hiện hành vi bất thường'}",
                    time=_format_relative_time(row[4]),
                    type="warning",
                    read=nid in read_set,
                    link="/admin/dashboard"
                ))

            # 3. Nhật ký hệ thống mức cảnh báo hoặc lỗi
            cursor.execute("""
                SELECT TOP 5 
                    log_id, 
                    log_level, 
                    module, 
                    message, 
                    created_at
                FROM SystemAuditLogs
                WHERE log_level IN ('warning', 'error', 'danger')
                ORDER BY created_at DESC
            """)
            for row in cursor.fetchall():
                nid = f"log-{row[0]}"
                muc_do = (row[1] or "").lower()
                n_type = "danger" if muc_do in ('error', 'danger') else "warning"
                notifications.append(NotificationItem(
                    id=nid,
                    title=f"Hệ thống: {row[2] or 'Nhật ký bảo mật'}",
                    desc=row[3] or 'Phát hiện sự kiện đáng chú ý trên hệ thống.',
                    time=_format_relative_time(row[4]),
                    type=n_type,
                    read=nid in read_set,
                    link="/admin/logs"
                ))

        elif role == "instructor":
            # Giảng viên nhận thông báo vi phạm và SOS thuộc các phòng do chính mình tạo
            cursor.execute("""
                SELECT TOP 8 
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
                WHERE p.instructor_id = ? AND v.review_status = 'pending'
                ORDER BY v.detected_at DESC
            """, (user_id,))
            for row in cursor.fetchall():
                nid = f"ins-vio-{row[0]}"
                notifications.append(NotificationItem(
                    id=nid,
                    title=f"Cảnh báo AI: {row[2]}",
                    desc=f"Thí sinh {row[6]} trong phòng {row[5]}: {row[3]}",
                    time=_format_relative_time(row[4]),
                    type="danger" if row[1] in ('high', 'critical', 'nghiem_trong') else "warning",
                    read=nid in read_set,
                    link=f"/instructor/monitoring?room={row[5]}"
                ))

            # Yêu cầu SOS trong phòng của giảng viên
            cursor.execute("""
                SELECT TOP 5 
                    s.request_id, 
                    s.issue_category, 
                    s.message, 
                    s.created_at,
                    p.room_code,
                    COALESCE(u.full_name, u.username, N'Sinh viên') AS ten_sinh_vien
                FROM SupportRequests s
                INNER JOIN Rooms p ON s.room_id = p.room_id
                LEFT JOIN Users u ON s.student_id = u.user_id
                WHERE p.instructor_id = ? AND s.status IN ('pending', 'cho_xu_ly')
                ORDER BY s.created_at DESC
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

        elif role == "student":
            # Sinh viên nhận thông báo ca thi đang diễn ra hoặc sắp tới
            cursor.execute("""
                SELECT TOP 5 
                    p.room_id, 
                    p.room_code, 
                    p.title, 
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
