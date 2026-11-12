import asyncio
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.config import get_db_connection
from schemas.template import TemplateCreateRequest
from schemas.room import RoomCreateRequest
from schemas.submission import SubmissionCreateRequest
from api.templates import create_exam_template, delete_exam_template
from api.rooms import create_new_room, get_room_exam_content, remove_room
from api.submissions import (
    create_submission_endpoint,
    get_submission,
    get_submissions_by_student_endpoint,
    get_submissions_by_room_endpoint,
)
from api.grading_results import list_submission_grading_results
from database.scoreboard_db import get_room_scoreboard


async def run_grading_and_scoreboard_e2e():
    print("=" * 70)
    print("🚀 E2E TEST: AUTO GRADING, ATTEMPT INCREMENT, HIDDEN MASKING & SCOREBOARD")
    print("=" * 70)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT TOP 1 ma_giang_vien FROM LopHoc WHERE ma_lop = 5")
    inst_row = cursor.fetchone()
    instructor_id = inst_row[0] if inst_row else 1

    cursor.execute("""
        SELECT TOP 1 u.ma_nguoi_dung
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

    tpl_id = "E2E-GRADE-TPL-01"
    room_code = "E2E-GRADE-ROOM-01"
    created_room_id = None

    try:
        try:
            await delete_exam_template(tpl_id, current_user=instructor_user)
        except Exception:
            pass

        # 1. Create template with 1 Python question (20pt visible + 30pt hidden = 50pt)
        tpl_payload = TemplateCreateRequest(
            code=tpl_id,
            title="Bộ đề E2E Chấm điểm",
            type="lab",
            duration_minutes=45,
            questions=[
                {
                    "id": "E2E-GQ1",
                    "title": "Cộng hai số",
                    "description": "In ra a + b",
                    "difficulty": "Dễ",
                    "programming_language": "python",
                    "max_points": 50,
                    "test_cases": [
                        {
                            "id": "tc-g1",
                            "input_data": "2 3",
                            "expected_output": "5",
                            "is_hidden": False,
                            "points": 20,
                        },
                        {
                            "id": "tc-g2",
                            "input_data": "10 15",
                            "expected_output": "25",
                            "is_hidden": True,
                            "points": 30,
                        },
                    ],
                }
            ],
        )
        await create_exam_template(tpl_payload, current_user=instructor_user)

        now = datetime.now()
        room = await create_new_room(
            RoomCreateRequest(
                room_code=room_code,
                room_name="Phòng Lab E2E Chấm điểm",
                room_type="lab",
                duration_minutes=45,
                class_id=5,
                template_id=tpl_id,
                start_time=now - timedelta(minutes=5),
                end_time=now + timedelta(minutes=60),
            ),
            current_user=instructor_user,
        )
        created_room_id = room["room_id"]
        exam_content = await get_room_exam_content(created_room_id, current_user=student_user)
        q_id = exam_content["questions"][0]["question_id"]
        print(f"✅ 1. Tạo đề & phòng '{room_code}' (room_id={created_room_id}, q_id={q_id})")

        # 2. Attempt 1: Wrong code (0 points)
        sub1 = await create_submission_endpoint(
            SubmissionCreateRequest(
                room_id=created_room_id,
                question_id=q_id,
                attempt_number=1,
                code_content="print(0)",
                language="python",
            ),
            current_user=student_user,
        )
        assert sub1["attempt_number"] == 1
        assert sub1["status"] == "completed", f"Expected completed, got {sub1['status']}"
        assert sub1["total_points"] == 0.0, f"Expected 0.0, got {sub1['total_points']}"
        print("✅ 2. Nộp lần 1 (code sai) -> tự động chấm 'completed', 0.0 điểm")

        # 3. Attempt 2: Correct code (auto-increment attempt_number -> 2, full 50.0 points)
        sub2 = await create_submission_endpoint(
            SubmissionCreateRequest(
                room_id=created_room_id,
                question_id=q_id,
                attempt_number=1,  # intentionally pass 1 to verify backend auto-increments
                code_content="a, b = map(int, input().split())\nprint(a + b)",
                language="python",
            ),
            current_user=student_user,
        )
        assert sub2["attempt_number"] == 2, f"Expected attempt 2, got {sub2['attempt_number']}"
        assert sub2["status"] == "completed"
        assert sub2["total_points"] == 50.0, f"Expected 50.0, got {sub2['total_points']}"
        assert sub2["score_percentage"] == 100.0
        print("✅ 3. Nộp lần 2 (code đúng) -> attempt_number tự tăng thành 2, đạt 50.0/50.0 điểm (100%)")

        # 4. Verify hidden test case masking & public test case details for Student vs Instructor
        stu_detail = await get_submission(sub2["submission_id"], current_user=student_user)
        public_gr = [gr for gr in stu_detail["grading_results"] if not gr["is_hidden"]]
        assert len(public_gr) == 1
        assert public_gr[0]["input_data"] == "2 3"
        assert public_gr[0]["expected_output"] == "5"
        hidden_gr = [gr for gr in stu_detail["grading_results"] if gr["is_hidden"]]
        assert len(hidden_gr) == 1
        assert hidden_gr[0]["actual_output"] == "[Test case ẩn]"
        assert hidden_gr[0]["input_data"] == "[Test case ẩn]"
        assert hidden_gr[0]["expected_output"] == "[Test case ẩn]"

        inst_gr = await list_submission_grading_results(sub2["submission_id"], current_user=instructor_user)
        inst_hidden = [gr for gr in inst_gr if gr["is_hidden"]]
        assert (inst_hidden[0]["actual_output"] or "").strip() == "25"
        print("✅ 4. Bảo mật test ẩn & hiển thị Input/Output test công khai chính xác")

        # 5. Verify student history, room submissions & scoreboard (best score = 50.0, scale 10 = 10.0)
        stu_history = await get_submissions_by_student_endpoint(student_id, room_id=created_room_id, current_user=student_user)
        assert len(stu_history) == 2
        assert stu_history[0]["question_title"] == "Cộng hai số"

        room_subs = await get_submissions_by_room_endpoint(created_room_id, current_user=instructor_user)
        assert len(room_subs) == 2

        scoreboard = get_room_scoreboard(created_room_id)
        stu_sb = next((r for r in scoreboard if r["student_id"] == student_id), None)
        assert stu_sb is not None, "Sinh viên phải có mặt trong scoreboard"
        assert stu_sb["total_score"] == 50.0, f"Expected best score 50.0, got {stu_sb['total_score']}"
        assert stu_sb["max_room_points"] == 50.0
        assert stu_sb["score_scale_10"] == 10.0
        assert stu_sb["solved_questions"] == 1
        assert stu_sb["total_submissions"] == 2
        print("✅ 5. Scoreboard & Quy đổi thang 10 chính xác (50.0/50.0đ -> 10.0/10, 2 lần nộp)")

        print("\n🎉 TẤT CẢ 5 BƯỚC E2E CHẤM BÀI & BẢNG ĐIỂM ĐỀU PASS!")
    finally:
        if created_room_id:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM KetQuaChamDiem WHERE ma_bai_nop IN (SELECT ma_bai_nop FROM BaiNop WHERE ma_phong = ?)",
                (created_room_id,),
            )
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
    asyncio.run(run_grading_and_scoreboard_e2e())
