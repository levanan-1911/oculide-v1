"""
Script tự động nạp dữ liệu mẫu thực tế cho BoDeMau (Bộ đề mẫu) và Phong (Phòng/Ca thi)
kết nối chặt chẽ với CSDL SQL Server ExamSystem (21 bảng thật, không dùng mock).
"""
import sys
import os
from datetime import datetime, timedelta

# Thêm đường dẫn backend vào sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import get_db_connection
from database.template_db import create_template_full, list_templates_full
from database.room_db import create_room, get_all_rooms

def seed():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. Tìm giảng viên hợp lệ trong hệ thống
        cursor.execute("SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ma_vai_tro = 2")
        row_gv = cursor.fetchone()
        instructor_id = row_gv[0] if row_gv else 1

        # 2. Tìm lớp học phần hợp lệ
        cursor.execute("SELECT TOP 1 ma_lop FROM LopHoc")
        row_lop = cursor.fetchone()
        class_id = row_lop[0] if row_lop else None

        # 3. Tạo Bộ đề mẫu nếu chưa có
        cursor.execute("SELECT COUNT(*) FROM BoDeMau")
        count_templates = cursor.fetchone()[0]

        tpl1 = None
        tpl2 = None

        if count_templates == 0:
            print("🚀 Bắt đầu nạp Bộ đề mẫu vào SQL Server...")
            tpl1 = create_template_full(
                instructor_id=instructor_id,
                data={
                    "code": "TPL-LAB-01",
                    "title": "Lab 01: Cấu trúc dữ liệu & Thuật toán cơ bản",
                    "type": "lab",
                    "category": "Lập trình C++ / Python",
                    "language": "C++ / Python",
                    "duration_minutes": 90,
                    "description": "Bài thực hành Lab ôn tập mảng, chuỗi ký tự, thuật toán tìm kiếm và xử lý ngoại lệ.",
                    "questions": [
                        {
                            "title": "Tìm cặp số có tổng bằng Target (Two Sum)",
                            "difficulty": "Dễ",
                            "description": "Cho mảng số nguyên nums và một số nguyên target. Tìm chỉ số hai số có tổng bằng target.",
                            "programming_language": "C++ / Python",
                            "max_points": 5.0,
                            "test_cases": [
                                {"input_data": "4 9\n2 7 11 15", "expected_output": "0 1", "is_hidden": False, "points": 2.5},
                                {"input_data": "3 6\n3 2 4", "expected_output": "1 2", "is_hidden": True, "points": 2.5}
                            ]
                        },
                        {
                            "title": "Kiểm tra chuỗi đối xứng (Valid Palindrome)",
                            "difficulty": "Trung bình",
                            "description": "Kiểm tra xem một chuỗi ký tự có phải là palindrome hay không sau khi chuẩn hóa.",
                            "programming_language": "C++ / Python",
                            "max_points": 5.0,
                            "test_cases": [
                                {"input_data": "race a car", "expected_output": "false", "is_hidden": False, "points": 2.5},
                                {"input_data": "A man, a plan, a canal: Panama", "expected_output": "true", "is_hidden": True, "points": 2.5}
                            ]
                        }
                    ]
                }
            )

            tpl2 = create_template_full(
                instructor_id=instructor_id,
                data={
                    "code": "TPL-EXAM-01",
                    "title": "Kiểm tra Cuối kỳ: Lập trình Hệ thống & Cấu trúc Dữ liệu Nâng cao",
                    "type": "exam",
                    "category": "Kiểm tra & Đánh giá",
                    "language": "C++ / Java",
                    "duration_minutes": 90,
                    "description": "Đề thi chính thức kết thúc học phần, có giám sát tự động AI và chống gian lận.",
                    "questions": [
                        {
                            "title": "Tìm mảng con có tổng lớn nhất (Maximum Subarray)",
                            "difficulty": "Khó",
                            "description": "Tìm đoạn con liên tiếp có tổng các phần tử lớn nhất bằng thuật toán Kadane.",
                            "programming_language": "C++ / Java",
                            "max_points": 5.0,
                            "test_cases": [
                                {"input_data": "9\n-2 1 -3 4 -1 2 1 -5 4", "expected_output": "6", "is_hidden": False, "points": 2.5},
                                {"input_data": "5\n5 4 -1 7 8", "expected_output": "23", "is_hidden": True, "points": 2.5}
                            ]
                        },
                        {
                            "title": "Hợp nhất hai danh sách liên kết có thứ tự",
                            "difficulty": "Trung bình",
                            "description": "Cho đầu vào 2 danh sách liên kết đã sắp xếp tăng dần, hãy hợp nhất thành 1 danh sách duy nhất.",
                            "programming_language": "C++ / Java",
                            "max_points": 5.0,
                            "test_cases": [
                                {"input_data": "3 3\n1 2 4\n1 3 4", "expected_output": "1 1 2 3 4 4", "is_hidden": False, "points": 2.5},
                                {"input_data": "0 1\n0", "expected_output": "0", "is_hidden": True, "points": 2.5}
                            ]
                        }
                    ]
                }
            )
            print("✅ Đã tạo 2 Bộ đề mẫu chuẩn vào BoDeMau.")
        else:
            templates = list_templates_full()
            if templates:
                tpl1 = templates[0]
                tpl2 = templates[1] if len(templates) > 1 else templates[0]

        # 4. Tạo Ca thi trong bảng Phong nếu chưa có
        cursor.execute("SELECT COUNT(*) FROM Phong")
        count_rooms = cursor.fetchone()[0]

        if count_rooms == 0:
            print("🚀 Bắt đầu nạp Ca thi & Phòng máy vào bảng Phong...")
            now = datetime.now()
            
            # Ca 1: Đang diễn ra (Live)
            create_room(
                room_code="PRJ301-MID-01",
                room_name="Kiểm tra Giữa kỳ • Lập trình Ứng dụng Web",
                room_type="exam",
                instructor_id=instructor_id,
                description="Ca thi giữa kỳ chính thức dành cho sinh viên lớp học phần.",
                start_time=now - timedelta(minutes=25),
                end_time=now + timedelta(minutes=65),
                duration_minutes=90,
                max_attempts=3,
                passcode="884125",
                livekit_room_name="room_PRJ301-MID-01",
                class_id=class_id,
                template_id=tpl2["template_id"] if tpl2 else None,
                proctoring_config='{"webcam":"required","screenShare":"required","clipboard":"block","tabSwitchLimit":2}',
                status="dang_dien_ra"
            )

            # Ca 2: Đã lên lịch (Sắp diễn ra)
            create_room(
                room_code="LAB01-8841",
                room_name="Thực hành Lab 01 • Cấu trúc dữ liệu",
                room_type="lab",
                instructor_id=instructor_id,
                description="Buổi thực hành trên máy phòng LAB-302.",
                start_time=now + timedelta(days=1, hours=2),
                end_time=now + timedelta(days=1, hours=3, minutes=30),
                duration_minutes=90,
                max_attempts=10,
                passcode="123456",
                livekit_room_name="room_LAB01-8841",
                class_id=class_id,
                template_id=tpl1["template_id"] if tpl1 else None,
                proctoring_config='{"webcam":"optional","screenShare":"optional","clipboard":"warn","tabSwitchLimit":5}',
                status="chua_mo"
            )

            # Ca 3: Đã kết thúc
            create_room(
                room_code="CS252-PRE-01",
                room_name="Kiểm tra Quá trình • C++ Cơ bản",
                room_type="exam",
                instructor_id=instructor_id,
                description="Ca kiểm tra đánh giá quá trình tuần 4.",
                start_time=now - timedelta(days=2, hours=3),
                end_time=now - timedelta(days=2, hours=1, minutes=30),
                duration_minutes=90,
                max_attempts=3,
                passcode="654321",
                livekit_room_name="room_CS252-PRE-01",
                class_id=class_id,
                template_id=tpl1["template_id"] if tpl1 else None,
                proctoring_config='{"webcam":"required","screenShare":"required","clipboard":"block","tabSwitchLimit":2}',
                status="da_dong"
            )
            print("✅ Đã tạo 3 ca thi thực tế (Đang diễn ra, Đã lên lịch, Đã kết thúc) vào Phong.")
        else:
            print(f"ℹ️ Đã có sẵn {count_rooms} phòng thi trong bảng Phong.")

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    seed()
