import asyncio
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.config import get_db_connection
from main import app
from schemas.template import TemplateCreateRequest, TemplateUpdateRequest
from schemas.room import RoomCreateRequest
from schemas.submission import SubmissionCreateRequest
from api.templates import (
    create_exam_template,
    get_exam_template_detail,
    update_exam_template,
    delete_exam_template,
)
from api.rooms import create_new_room, get_room_exam_content, remove_room
from api.submissions import create_submission_endpoint


async def run_exam_templates_e2e():
    print("=" * 70)
    print("🚀 E2E TEST: EXAM TEMPLATES, QUESTIONS, EXAM CONTENT & SUBMISSIONS")
    print("=" * 70)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT TOP 1 ma_giang_vien FROM LopHoc WHERE ma_lop = 5")
    inst_row = cursor.fetchone()
    instructor_id = inst_row[0] if inst_row else 1

    cursor.execute("""
        SELECT TOP 1 u.ma_nguoi_dung, u.ho_va_ten
        FROM SinhVienLopHoc svl
        JOIN NguoiDung u ON svl.ma_sinh_vien = u.ma_nguoi_dung
        WHERE svl.ma_lop = 5
    """)
    stu_row = cursor.fetchone()
    assert stu_row is not None, "Cần có ít nhất 1 sinh viên trong lớp 5"
    student_id = stu_row[0]
    conn.close()

    instructor_user = {"user_id": instructor_id, "role": "instructor"}
    student_user = {"user_id": student_id, "role": "student"}

    tpl_id = "E2E-TPL-999"
    room_code = "E2E-EXAM-999"
    created_room_id = None

    try:
        # Cleanup any leftover from previous interrupted run
        try:
            await delete_exam_template(tpl_id, current_user=instructor_user)
        except Exception:
            pass

        # 1. Instructor creates a template with 2 questions (one has a hidden test case)
        create_payload = TemplateCreateRequest(
            code=tpl_id,
            title="Bộ đề E2E Kiểm thử Hệ thống",
            type="exam",
            duration_minutes=45,
            questions=[
                {
                    "id": "E2E-Q1",
                    "title": "Tính tổng hai số",
                    "description": "Nhập hai số nguyên a, b và in ra a + b.",
                    "difficulty": "Dễ",
                    "programming_language": "python",
                    "max_points": 50,
                    "test_cases": [
                        {
                            "id": "tc-vis-1",
                            "input_data": "2 3",
                            "expected_output": "5",
                            "is_hidden": False,
                            "points": 20,
                        },
                        {
                            "id": "tc-hid-1",
                            "input_data": "100 250",
                            "expected_output": "350",
                            "is_hidden": True,
                            "points": 30,
                        },
                    ],
                },
                {
                    "id": "E2E-Q2",
                    "title": "In Hello Oculide",
                    "description": "In ra chuỗi Hello Oculide.",
                    "difficulty": "Dễ",
                    "programming_language": "python",
                    "max_points": 50,
                    "test_cases": [
                        {
                            "id": "tc-vis-2",
                            "input_data": "",
                            "expected_output": "Hello Oculide",
                            "is_hidden": False,
                            "points": 50,
                        }
                    ],
                },
            ],
        )
        created_tpl = await create_exam_template(create_payload, current_user=instructor_user)
        assert created_tpl["id"] == tpl_id
        assert created_tpl["questionCount"] == 2
        print(f"✅ 1. Instructor tạo bộ đề '{tpl_id}' thành công (2 câu hỏi)")

        # 2. Instructor fetches template detail (must include hidden test cases for instructor)
        detail = await get_exam_template_detail(tpl_id, current_user=instructor_user)
        assert len(detail["questions"][0]["testCases"]) == 2
        print("✅ 2. Instructor xem chi tiết bộ đề thấy đủ cả test ẩn & test hiện")

        # 3. Instructor updates template title
        update_payload = TemplateUpdateRequest(
            title="Bộ đề E2E Đã Cập Nhật",
            type="exam",
            duration_minutes=45,
            questions=create_payload.questions,
        )
        updated_tpl = await update_exam_template(tpl_id, update_payload, current_user=instructor_user)
        assert updated_tpl["title"] == "Bộ đề E2E Đã Cập Nhật"
        print("✅ 3. Instructor cập nhật bộ đề thành công")

        # 4. Instructor creates a room linked to this template
        now = datetime.now()
        room_payload = RoomCreateRequest(
            room_code=room_code,
            room_name="Phòng thi E2E Template",
            room_type="exam",
            duration_minutes=45,
            class_id=5,
            template_id=tpl_id,
            start_time=now - timedelta(minutes=5),
            end_time=now + timedelta(minutes=60),
        )
        created_room = await create_new_room(room_payload, current_user=instructor_user)
        created_room_id = created_room["room_id"]
        print(f"✅ 4. Instructor tạo phòng thi '{room_code}' (room_id={created_room_id}) gắn bộ đề '{tpl_id}'")

        # 5. Student fetches exam-content (hidden test cases MUST be stripped!)
        exam_content = await get_room_exam_content(created_room_id, current_user=student_user)
        assert len(exam_content["questions"]) == 2
        q1 = exam_content["questions"][0]
        assert len(q1["test_cases"]) == 1, f"Expected only 1 visible test case, got {len(q1['test_cases'])}"
        assert q1["test_cases"][0]["isHidden"] is False
        print("✅ 5. Student lấy đề thi từ /exam-content thành công & đã ẩn test case bí mật (la_test_an=1)")

        # 6. Student submits code for template-linked question
        sub_payload = SubmissionCreateRequest(
            room_id=created_room_id,
            question_id=q1["question_id"],
            attempt_number=1,
            code_content="a, b = map(int, input().split())\nprint(a + b)",
            language="python",
        )
        sub_data = await create_submission_endpoint(sub_payload, current_user=student_user)
        assert sub_data["question_id"] == q1["question_id"]
        print(f"✅ 6. Student nộp bài thành công vào BaiNop (submission_id={sub_data['submission_id']})")

        print("\n🎉 TẤT CẢ 6 BƯỚC E2E ĐỀU PASS!")
    finally:
        if created_room_id:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM BaiNop WHERE ma_phong = ?", (created_room_id,))
            conn.commit()
            conn.close()
            try:
                await remove_room(created_room_id, current_user=instructor_user)
            except Exception:
                pass
        try:
            await delete_exam_template(tpl_id, current_user=instructor_user)
        except Exception:
            pass


if __name__ == "__main__":
    asyncio.run(run_exam_templates_e2e())
