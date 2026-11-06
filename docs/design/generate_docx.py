import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_document():
    doc = docx.Document()
    
    # Page setup - Margins
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Document Styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(12)
    normal_style.font.color.rgb = RGBColor(0x1F, 0x29, 0x37) # slate-800
    normal_style.paragraph_format.line_spacing = 1.25
    normal_style.paragraph_format.space_after = Pt(4)

    # Title
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = p_sub.add_run("DỰ ÁN NGHIÊN CỨU KHOA HỌC / ĐỒ ÁN TỐT NGHIỆP 2026\nHỆ THỐNG OCULIDE - AI PROCTORING & ONLINE LAB LMS")
    run_sub.font.size = Pt(11)
    run_sub.font.bold = True
    run_sub.font.color.rgb = RGBColor(0x25, 0x63, 0xEB) # Blue-600

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(8)
    p_title.paragraph_format.space_after = Pt(18)
    run_title = p_title.add_run("BẢN THUYẾT MINH THIẾT KẾ CƠ SỞ DỮ LIỆU\n(DATABASE DESIGN SPECIFICATION)")
    run_title.font.size = Pt(18)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A) # Slate-900

    # Intro quote
    p_intro = doc.add_paragraph()
    p_intro.paragraph_format.space_after = Pt(12)
    r_intro = p_intro.add_run("Tài liệu này đặc tả chi tiết kiến trúc cơ sở dữ liệu quan hệ (RDBMS) gồm 18 bảng chuẩn hóa 3NF của nền tảng Oculide, phục vụ khép kín toàn bộ luồng nghiệp vụ giữa 3 vai trò: Quản trị viên (Admin), Giảng viên (Instructor), và Sinh viên (Student).")
    r_intro.font.italic = True

    # Chapter 1
    h1 = doc.add_heading("CHƯƠNG 1: TỔNG QUAN KIẾN TRÚC CSDL", level=1)
    h1.style.font.color.rgb = RGBColor(0x1D, 0x4E, 0xD8)
    
    doc.add_paragraph("Hệ thống cơ sở dữ liệu Oculide được tổ chức thành 4 phân hệ (cụm nghiệp vụ) có mối liên hệ logic chặt chẽ:")
    
    clusters = [
        ("Cụm 1: Quản trị Đào tạo & Người dùng (Core Identity & Academic)", "Bao gồm 3 bảng (Users, Classes, ClassStudents). Đảm nhiệm quản lý danh tính tài khoản, phân quyền RBAC và phân bổ danh sách sinh viên theo từng lớp học phần."),
        ("Cụm 2: Ngân hàng Đề thi & Bộ kiểm thử tự động (Assessment Engine)", "Bao gồm 4 bảng (Questions, TestCases, ExamTemplates, TemplateQuestions). Đảm nhiệm việc lưu trữ kho câu hỏi lập trình, bộ test case công khai/ẩn và cấu trúc đề thi đa bài toán."),
        ("Cụm 3: Điều phối Phòng thi & Phiên làm bài (Exam Rooms & Proctoring)", "Bao gồm 3 bảng (Rooms, RoomProctors, Sessions). Quản lý việc lập lịch ca thi, mã PIN truy cập, phân công cán bộ coi thi và theo dõi phiên thi của từng thí sinh."),
        ("Cụm 4: Chấm điểm Sandbox, AI Proctoring & Hỗ trợ (Execution & Security)", "Bao gồm 8 bảng (CodeDrafts, Submissions, GradingResults, DeviceChecks, Violations, SupportRequests, Messages, SystemLogs). Đảm nhiệm việc lưu nháp tự động mỗi 30s, chấm điểm Docker Sandbox, giám sát gian lận qua AI và ghi nhật ký kiểm toán hệ thống.")
    ]
    for title, desc in clusters:
        p = doc.add_paragraph(style='List Bullet')
        r1 = p.add_run(f"{title}: ")
        r1.bold = True
        p.add_run(desc)

    # Chapter 2
    h2 = doc.add_heading("CHƯƠNG 2: ĐẶC TẢ CHI TIẾT 18 BẢNG DỮ LIỆU", level=1)
    h2.style.font.color.rgb = RGBColor(0x1D, 0x4E, 0xD8)

    tables_data = [
        # Table 1
        {
            "name": "1. Bảng Users (Tài khoản & Người dùng)",
            "desc": "Lưu trữ thông tin xác thực, phân quyền và danh tính của 3 vai trò: Admin, Instructor, Student.",
            "cols": [
                ("user_id", "INT", "PK, Identity(1,1)", "Khóa chính tự tăng định danh người dùng."),
                ("username", "VARCHAR(50)", "UNIQUE, NOT NULL", "Tên tài khoản đăng nhập (hoặc MSSV)."),
                ("password_hash", "VARCHAR(255)", "NOT NULL", "Mật khẩu mã hóa bằng thuật toán Bcrypt."),
                ("email", "VARCHAR(100)", "UNIQUE, NOT NULL", "Địa chỉ email định danh nhận thông báo."),
                ("full_name", "NVARCHAR(100)", "NOT NULL", "Họ và tên đầy đủ của người dùng."),
                ("role", "VARCHAR(20)", "CHECK (admin, instructor, student)", "Phân quyền vai trò trong hệ thống."),
                ("student_id", "VARCHAR(20)", "NULL", "Mã số sinh viên chính thức (SE184801)."),
                ("major", "NVARCHAR(100)", "NULL", "Chuyên ngành đào tạo (Kỹ thuật phần mềm, ATTT)."),
                ("device_fingerprint", "VARCHAR(100)", "NULL", "Mã vân tay phần cứng máy tính chống thi hộ."),
                ("is_active", "BIT", "DEFAULT 1", "Trạng thái kích hoạt tài khoản."),
                ("created_at", "DATETIME2", "DEFAULT GETDATE()", "Thời điểm tạo tài khoản.")
            ]
        },
        # Table 2
        {
            "name": "2. Bảng Classes (Lớp học phần)",
            "desc": "Quản lý danh mục lớp học phần theo học kỳ, năm học do Giảng viên phụ trách.",
            "cols": [
                ("class_id", "VARCHAR(30)", "PK, NOT NULL", "Mã định danh lớp học (VD: PRJ301_FA26_SE1804)."),
                ("class_name", "NVARCHAR(150)", "NOT NULL", "Tên lớp học phần hiển thị đầy đủ."),
                ("subject_code", "VARCHAR(20)", "NOT NULL", "Mã học phần môn học (CS101, PRJ301, CSD201)."),
                ("semester", "VARCHAR(20)", "NOT NULL", "Học kỳ (FALL2026, SPRING2026, SUMMER2026)."),
                ("academic_year", "VARCHAR(20)", "NOT NULL", "Năm học đào tạo (VD: 2025-2026)."),
                ("instructor_id", "INT", "FK -> Users(user_id)", "Giảng viên phụ trách giảng dạy chính."),
                ("status", "VARCHAR(20)", "DEFAULT 'Chưa mở'", "Trạng thái lớp (Chưa mở, Đang mở, Đã kết thúc)."),
                ("created_at", "DATETIME2", "DEFAULT GETDATE()", "Thời điểm khởi tạo lớp học phần.")
            ]
        },
        # Table 3
        {
            "name": "3. Bảng ClassStudents (Sinh viên trong lớp học)",
            "desc": "Bảng liên kết Nhiều - Nhiều (N-N) xác thực danh sách sinh viên được quyền tham gia thi của lớp.",
            "cols": [
                ("id", "INT", "PK, Identity(1,1)", "Khóa chính tự tăng."),
                ("class_id", "VARCHAR(30)", "FK -> Classes(class_id)", "Mã lớp học phần."),
                ("student_id", "INT", "FK -> Users(user_id)", "Mã người dùng của sinh viên trong lớp."),
                ("joined_at", "DATETIME2", "DEFAULT GETDATE()", "Thời điểm sinh viên được import/thêm vào lớp."),
                ("status", "VARCHAR(20)", "DEFAULT 'active'", "Trạng thái học tập (active, dropped, suspended).")
            ]
        },
        # Table 4
        {
            "name": "4. Bảng Questions (Ngân hàng câu hỏi lập trình)",
            "desc": "Lưu trữ nội dung đề bài toán lập trình và thông số giới hạn thực thi do Giảng viên biên soạn.",
            "cols": [
                ("question_id", "INT", "PK, Identity(1,1)", "Khóa chính định danh bài toán."),
                ("problem_code", "VARCHAR(50)", "UNIQUE, NOT NULL", "Mã bài toán ngắn gọn (VD: CPP_ARR_002)."),
                ("title", "NVARCHAR(200)", "NOT NULL", "Tiêu đề bài toán lập trình."),
                ("description_markdown", "NVARCHAR(MAX)", "NOT NULL", "Nội dung đề bài chi tiết (Markdown + LaTeX math)."),
                ("difficulty", "VARCHAR(20)", "CHECK (easy, medium, hard)", "Mức độ khó của bài toán."),
                ("supported_languages", "VARCHAR(100)", "NOT NULL", "Ngôn ngữ hỗ trợ (cpp, java, python)."),
                ("time_limit_ms", "INT", "DEFAULT 1000", "Giới hạn thời gian thực thi (mili-giây, 1s = 1000ms)."),
                ("memory_limit_mb", "INT", "DEFAULT 128", "Giới hạn dung lượng bộ nhớ RAM (MB)."),
                ("initial_code", "NVARCHAR(MAX)", "NULL", "Mã khung khởi tạo sẵn trên IDE sinh viên."),
                ("created_by", "INT", "FK -> Users(user_id)", "Giảng viên biên soạn câu hỏi.")
            ]
        },
        # Table 5
        {
            "name": "5. Bảng TestCases (Dữ liệu kiểm thử tự động)",
            "desc": "Các bộ test Input/Output phục vụ chấm tự động qua Docker Sandbox.",
            "cols": [
                ("test_case_id", "INT", "PK, Identity(1,1)", "Khóa chính bộ test."),
                ("question_id", "INT", "FK -> Questions(question_id)", "Liên kết tới bài toán tương ứng."),
                ("input_data", "NVARCHAR(MAX)", "NOT NULL", "Dữ liệu đầu vào truyền qua standard input (stdin)."),
                ("expected_output", "NVARCHAR(MAX)", "NOT NULL", "Kết quả đầu ra chuẩn mong đợi (stdout)."),
                ("score_weight", "DECIMAL(5,2)", "DEFAULT 1.0", "Trọng số điểm của test case này."),
                ("is_sample", "BIT", "DEFAULT 0", "1 = Test case ví dụ hiển thị công khai trên đề bài."),
                ("explanation", "NVARCHAR(MAX)", "NULL", "Giải thích vì sao test case mẫu cho ra kết quả đó."),
                ("is_hidden", "BIT", "DEFAULT 0", "1 = Test case ẩn chấm ngầm chống hardcode.")
            ]
        },
        # Table 6
        {
            "name": "6. Bảng ExamTemplates (Bộ đề thi tổng hợp)",
            "desc": "Đóng gói nhiều câu hỏi lập trình thành một đề thi hoàn chỉnh (Đề giữa kỳ, Đề cuối kỳ).",
            "cols": [
                ("template_id", "VARCHAR(50)", "PK, NOT NULL", "Mã bộ đề thi (VD: TPL-PRJ-FINAL-01)."),
                ("title", "NVARCHAR(200)", "NOT NULL", "Tên đề thi tổng hợp."),
                ("total_duration_minutes", "INT", "NOT NULL", "Thời lượng làm bài quy định (phút)."),
                ("total_points", "DECIMAL(5,2)", "DEFAULT 100.0", "Thang điểm chuẩn tổng cộng của đề."),
                ("created_by", "INT", "FK -> Users(user_id)", "Giảng viên/Trưởng bộ môn tạo bộ đề.")
            ]
        },
        # Table 7
        {
            "name": "7. Bảng TemplateQuestions (Chi tiết câu hỏi trong đề)",
            "desc": "Bảng liên kết Nhiều - Nhiều xác định thứ tự và thang điểm từng bài trong đề thi.",
            "cols": [
                ("id", "INT", "PK, Identity(1,1)", "Khóa chính tự tăng."),
                ("template_id", "VARCHAR(50)", "FK -> ExamTemplates", "Mã bộ đề thi."),
                ("question_id", "INT", "FK -> Questions", "Mã bài toán được chọn vào đề."),
                ("order_index", "INT", "NOT NULL", "Thứ tự câu hỏi trong đề: Bài 1, Bài 2, Bài 3..."),
                ("points", "DECIMAL(5,2)", "NOT NULL", "Điểm số phân bổ cho bài toán này (VD: 30đ, 30đ, 40đ).")
            ]
        },
        # Table 8
        {
            "name": "8. Bảng Rooms (Phòng thi & Buổi thực hành Lab)",
            "desc": "Không gian ca thi trực tuyến hoặc buổi lab thực hành do Giảng viên mở.",
            "cols": [
                ("room_id", "INT", "PK, Identity(1,1)", "Khóa chính tự tăng của phòng thi."),
                ("room_code", "VARCHAR(50)", "UNIQUE, NOT NULL", "Mã phòng thi cho sinh viên tham gia (OCL-J002)."),
                ("passcode", "VARCHAR(50)", "NOT NULL", "Mật khẩu PIN bảo mật vào phòng (VD: 481920)."),
                ("title", "NVARCHAR(200)", "NOT NULL", "Tiêu đề ca thi hoặc buổi thực hành."),
                ("room_type", "VARCHAR(20)", "CHECK (exam, lab, practice)", "Phân loại ca thi kết thúc môn hay thực hành lab."),
                ("class_id", "VARCHAR(30)", "FK -> Classes(class_id)", "Lớp học phần tham gia ca thi này."),
                ("template_id", "VARCHAR(50)", "FK -> ExamTemplates", "Bộ đề thi được phát cho phòng."),
                ("scheduled_date", "DATE", "NOT NULL", "Ngày tổ chức ca thi."),
                ("start_time", "TIME", "NOT NULL", "Thời gian bắt đầu ca thi."),
                ("end_time", "TIME", "NOT NULL", "Thời gian kết thúc ca thi."),
                ("duration_minutes", "INT", "NOT NULL", "Thời gian làm bài thi (phút)."),
                ("status", "VARCHAR(20)", "DEFAULT 'waiting'", "Trạng thái phòng (waiting, in_progress, ended)."),
                ("proctoring_config", "NVARCHAR(MAX)", "NOT NULL", "JSON lưu cấu hình phạt AI (Face, Fullscreen, Tab)."),
                ("created_by", "INT", "FK -> Users(user_id)", "Giảng viên tạo phòng thi.")
            ]
        },
        # Table 9
        {
            "name": "9. Bảng RoomProctors (Cán bộ giám thị phòng thi)",
            "desc": "Phân công nhiều cán bộ giám thị (Giám thị chính, Giám thị hỗ trợ) cùng coi một phòng thi.",
            "cols": [
                ("id", "INT", "PK, Identity(1,1)", "Khóa chính tự tăng."),
                ("room_id", "INT", "FK -> Rooms(room_id)", "Phòng thi được phân công coi thi."),
                ("instructor_id", "INT", "FK -> Users(user_id)", "Cán bộ giảng viên coi thi."),
                ("role_in_room", "VARCHAR(20)", "DEFAULT 'chief_proctor'", "Vai trò giám thị (chief_proctor, assistant).")
            ]
        },
        # Table 10
        {
            "name": "10. Bảng Sessions (Phiên làm bài thi trực tiếp)",
            "desc": "Theo dõi trạng thái, hiện diện và kết nối video của từng thí sinh trong suốt ca thi.",
            "cols": [
                ("session_id", "INT", "PK, Identity(1,1)", "Khóa chính phiên thi."),
                ("room_id", "INT", "FK -> Rooms(room_id)", "Phòng thi thí sinh tham gia."),
                ("student_id", "INT", "FK -> Users(user_id)", "Thí sinh tham gia ca thi."),
                ("joined_at", "DATETIME2", "DEFAULT GETDATE()", "Thời điểm thí sinh bước vào phòng thi."),
                ("submitted_at", "DATETIME2", "NULL", "Thời điểm nộp bài chính thức."),
                ("current_status", "VARCHAR(20)", "DEFAULT 'doing'", "Trạng thái (doing, locked_by_ai, submitted, kicked)."),
                ("extended_minutes", "INT", "DEFAULT 0", "Số phút được giám thị gia hạn thêm giờ."),
                ("ip_address", "VARCHAR(45)", "NULL", "Địa chỉ IPv4/IPv6 máy trạm của thí sinh."),
                ("livekit_participant_id", "VARCHAR(100)", "NULL", "ID stream webcam kết nối LiveKit SFU.")
            ]
        },
        # Table 11
        {
            "name": "11. Bảng CodeDrafts (Bản nháp tự động lưu)",
            "desc": "Cứ mỗi 30 giây tự động lưu mã nguồn đang gõ của sinh viên để phòng chống mất điện, rớt mạng.",
            "cols": [
                ("draft_id", "INT", "PK, Identity(1,1)", "Khóa chính bản nháp."),
                ("session_id", "INT", "FK -> Sessions(session_id)", "Thuộc phiên thi của thí sinh."),
                ("question_id", "INT", "FK -> Questions(question_id)", "Thuộc bài toán đang làm dở."),
                ("draft_code", "NVARCHAR(MAX)", "NOT NULL", "Mã nguồn đang soạn thảo dở dang."),
                ("language", "VARCHAR(20)", "NOT NULL", "Ngôn ngữ lập trình đang viết (cpp, java, python)."),
                ("updated_at", "DATETIME2", "DEFAULT GETDATE()", "Thời điểm lưu nháp gần nhất.")
            ]
        },
        # Table 12
        {
            "name": "12. Bảng Submissions (Bài nộp chính thức)",
            "desc": "Lưu trữ bài nộp hoàn chỉnh của sinh viên và kết quả chấm tổng thể từ Docker Sandbox.",
            "cols": [
                ("submission_id", "VARCHAR(50)", "PK, NOT NULL", "Mã bài nộp duy nhất (VD: SUB-2026-1001)."),
                ("session_id", "INT", "FK -> Sessions(session_id)", "Phiên thi của thí sinh."),
                ("question_id", "INT", "FK -> Questions(question_id)", "Bài nộp cho câu hỏi nào."),
                ("source_code", "NVARCHAR(MAX)", "NOT NULL", "Toàn bộ mã nguồn chính thức được sinh viên submit."),
                ("language", "VARCHAR(20)", "NOT NULL", "Ngôn ngữ lập trình nộp bài (cpp20, java17, python3)."),
                ("submission_status", "VARCHAR(20)", "NOT NULL", "Kết quả tổng hợp (accepted, failed, compilation_error)."),
                ("total_score", "DECIMAL(5,2)", "DEFAULT 0.0", "Điểm số đạt được (VD: 8.5 / 10.0 điểm)."),
                ("max_runtime_ms", "INT", "NULL", "Thời gian chạy lớn nhất trong các test case (ms)."),
                ("max_memory_kb", "INT", "NULL", "Dung lượng RAM tiêu thụ lớn nhất (KB)."),
                ("compiler_message", "NVARCHAR(MAX)", "NULL", "Thông báo lỗi nếu gặp lỗi biên dịch CE."),
                ("submitted_at", "DATETIME2", "DEFAULT GETDATE()", "Thời điểm sinh viên bấm nộp bài.")
            ]
        },
        # Table 13
        {
            "name": "13. Bảng GradingResults (Chi tiết điểm số từng Test Case)",
            "desc": "Lưu kết quả so khớp chi tiết của từng Test Case phục vụ trang /student/submissions/[id].",
            "cols": [
                ("result_id", "INT", "PK, Identity(1,1)", "Khóa chính kết quả test."),
                ("submission_id", "VARCHAR(50)", "FK -> Submissions", "Bài nộp tương ứng."),
                ("test_case_id", "INT", "FK -> TestCases", "Test case được mang ra kiểm thử."),
                ("status", "VARCHAR(10)", "NOT NULL", "Trạng thái (AC - Đúng, WA - Sai, TLE - Quá giờ, MLE - Tràn RAM)."),
                ("actual_output", "NVARCHAR(MAX)", "NULL", "Kết quả thực tế do chương trình sinh viên in ra."),
                ("runtime_ms", "INT", "NULL", "Thời gian chạy test này (mili-giây)."),
                ("memory_kb", "INT", "NULL", "Bộ nhớ RAM tiêu thụ (KB)."),
                ("score_earned", "DECIMAL(5,2)", "NOT NULL", "Điểm số đạt được ở test case này.")
            ]
        },
        # Table 14
        {
            "name": "14. Bảng DeviceChecks (Biên bản kiểm tra thiết bị)",
            "desc": "Lưu trữ kết quả kiểm tra phần cứng và nhận diện khuôn mặt Face ID trước khi vào thi.",
            "cols": [
                ("check_id", "INT", "PK, Identity(1,1)", "Khóa chính biên bản kiểm tra."),
                ("session_id", "INT", "FK -> Sessions(session_id)", "Phiên thi tương ứng."),
                ("camera_status", "VARCHAR(20)", "NOT NULL", "Trạng thái camera (passed, failed)."),
                ("microphone_status", "VARCHAR(20)", "NOT NULL", "Trạng thái micro (passed, failed)."),
                ("network_latency_ms", "INT", "NOT NULL", "Độ trễ ping kết nối mạng (ms)."),
                ("face_match_confidence", "DECIMAL(5,2)", "NOT NULL", "Độ tin cậy khớp khuôn mặt Face ID (VD: 0.98)."),
                ("captured_face_snapshot", "VARCHAR(255)", "NULL", "Đường dẫn lưu ảnh chụp khuôn mặt lúc check."),
                ("created_at", "DATETIME2", "DEFAULT GETDATE()", "Thời điểm hoàn thành kiểm tra thiết bị.")
            ]
        },
        # Table 15
        {
            "name": "15. Bảng Violations (Nhật ký vi phạm AI phát hiện)",
            "desc": "Lưu lại toàn bộ hành vi bất thường do mô hình YOLOv8 & MediaPipe phát hiện kèm cơ chế duyệt phạt.",
            "cols": [
                ("violation_id", "INT", "PK, Identity(1,1)", "Khóa chính vi phạm."),
                ("session_id", "INT", "FK -> Sessions(session_id)", "Phiên thi của thí sinh vi phạm."),
                ("violation_type", "VARCHAR(50)", "NOT NULL", "Loại vi phạm (tab_switch, copy_paste, phone, multiple_faces)."),
                ("severity", "VARCHAR(20)", "NOT NULL", "Mức độ nghiêm trọng (warning, critical)."),
                ("confidence_score", "DECIMAL(5,2)", "NOT NULL", "Độ tin cậy của mô hình AI (VD: 0.95 = 95%)."),
                ("snapshot_url", "VARCHAR(255)", "NULL", "Đường dẫn ảnh chụp webcam làm bằng chứng vi phạm."),
                ("review_status", "VARCHAR(20)", "DEFAULT 'pending'", "Trạng thái duyệt (pending, confirmed, dismissed)."),
                ("reviewer_id", "INT", "FK -> Users(user_id) NULL", "Giảng viên xác nhận hoặc bác bỏ vi phạm."),
                ("created_at", "DATETIME2", "DEFAULT GETDATE()", "Thời điểm xảy ra hành vi bất thường.")
            ]
        },
        # Table 16
        {
            "name": "16. Bảng SupportRequests (Tín hiệu Cầu cứu SOS)",
            "desc": "Cho phép thí sinh gửi yêu cầu trợ giúp kỹ thuật khẩn cấp trực tiếp tới Giám thị phòng thi.",
            "cols": [
                ("request_id", "INT", "PK, Identity(1,1)", "Khóa chính yêu cầu hỗ trợ."),
                ("session_id", "INT", "FK -> Sessions(session_id)", "Phiên thi gửi yêu cầu."),
                ("issue_category", "VARCHAR(50)", "NOT NULL", "Phân loại sự cố (network, hardware, bug, other)."),
                ("message", "NVARCHAR(500)", "NOT NULL", "Nội dung thí sinh mô tả sự cố khẩn cấp."),
                ("status", "VARCHAR(20)", "DEFAULT 'open'", "Trạng thái giải quyết (open, in_progress, resolved)."),
                ("resolved_by", "INT", "FK -> Users(user_id) NULL", "Giám thị tiếp nhận và giải quyết."),
                ("created_at", "DATETIME2", "DEFAULT GETDATE()", "Thời điểm thí sinh bấm gửi tín hiệu SOS.")
            ]
        },
        # Table 17
        {
            "name": "17. Bảng Messages (Kênh Chat & Thông báo phòng thi)",
            "desc": "Kênh trao đổi thời gian thực giữa Giám thị và thí sinh trong suốt thời gian diễn ra ca thi.",
            "cols": [
                ("message_id", "INT", "PK, Identity(1,1)", "Khóa chính tin nhắn."),
                ("room_id", "INT", "FK -> Rooms(room_id)", "Phòng thi diễn ra cuộc trò chuyện."),
                ("sender_id", "INT", "FK -> Users(user_id)", "Người gửi tin nhắn (Giảng viên hoặc Thí sinh)."),
                ("recipient_id", "INT", "FK -> Users(user_id) NULL", "Người nhận (NULL = Thông báo chung toàn phòng thi)."),
                ("content", "NVARCHAR(1000)", "NOT NULL", "Nội dung tin nhắn trao đổi."),
                ("created_at", "DATETIME2", "DEFAULT GETDATE()", "Thời điểm phát tin nhắn.")
            ]
        },
        # Table 18
        {
            "name": "18. Bảng SystemLogs (Audit Log cho Quản trị viên)",
            "desc": "Nhật ký kiểm toán hệ thống ghi lại mọi hành động kỹ thuật phục vụ màn hình Dark Terminal /admin/system.",
            "cols": [
                ("log_id", "INT", "PK, Identity(1,1)", "Khóa chính bản ghi nhật ký."),
                ("user_id", "INT", "NULL", "Người dùng thực hiện thao tác (nếu có)."),
                ("level", "VARCHAR(20)", "CHECK (INFO, WARNING, ERROR, SECURITY)", "Mức độ cảnh báo của nhật ký."),
                ("action", "VARCHAR(100)", "NOT NULL", "Hành động (LOGIN, CREATE_ROOM, CHANGE_ROLE...)."),
                ("ip_address", "VARCHAR(45)", "NULL", "Địa chỉ IP thực hiện thao tác."),
                ("detail_json", "NVARCHAR(MAX)", "NULL", "Chi tiết kỹ thuật định dạng JSON."),
                ("created_at", "DATETIME2", "DEFAULT GETDATE()", "Thời điểm ghi nhận sự kiện hệ thống.")
            ]
        }
    ]

    for t in tables_data:
        h3 = doc.add_heading(t["name"], level=2)
        h3.style.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        
        p_desc = doc.add_paragraph()
        r = p_desc.add_run(f"Mục đích: {t['desc']}")
        r.font.italic = True
        
        # Add table
        cols_meta = [("Tên trường", 1.8), ("Kiểu dữ liệu", 1.3), ("Ràng buộc", 1.8), ("Ý nghĩa nghiệp vụ", 2.6)]
        tbl = doc.add_table(rows=1, cols=4)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        # Style Header
        hdr_cells = tbl.rows[0].cells
        for i, (name, width) in enumerate(cols_meta):
            hdr_cells[i].text = name
            hdr_cells[i].width = Inches(width)
            set_cell_background(hdr_cells[i], '1D4ED8') # Blue-700
            set_cell_margins(hdr_cells[i], top=120, bottom=120, left=150, right=150)
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.font.bold = True
                r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                r.font.size = Pt(10.5)

        # Populate rows
        for row_data in t["cols"]:
            row_cells = tbl.add_row().cells
            for idx, text in enumerate(row_data):
                row_cells[idx].text = text
                row_cells[idx].width = Inches(cols_meta[idx][1])
                set_cell_margins(row_cells[idx], top=80, bottom=80, left=120, right=120)
                p = row_cells[idx].paragraphs[0]
                if idx in (0, 1):
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    for r in p.runs:
                        r.font.name = 'Consolas'
                        r.font.size = Pt(9.5)
                        r.font.bold = (idx == 0)
                elif idx == 2:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    for r in p.runs:
                        r.font.size = Pt(9.5)
                        r.font.color.rgb = RGBColor(0xB9, 0x1C, 0x1C) if 'PK' in text or 'FK' in text else RGBColor(0x4B, 0x55, 0x63)
                else:
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    for r in p.runs:
                        r.font.size = Pt(10)

        doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Chapter 3
    h3_chap = doc.add_heading("CHƯƠNG 3: CÁC CƠ CHẾ NGHIỆP VỤ ĐẶC THÙ", level=1)
    h3_chap.style.font.color.rgb = RGBColor(0x1D, 0x4E, 0xD8)

    doc.add_heading("1. Cơ chế Lưu bài đa tầng (Fault-Tolerant Submission)", level=2)
    doc.add_paragraph("Hệ thống bảo vệ bài làm của thí sinh qua 3 cấp độ:")
    doc.add_paragraph("• Cấp độ 1 (Bản nháp tự động): Trong suốt quá trình code trên Monaco IDE, cứ sau 30 giây toàn bộ mã nguồn được gửi về bảng CodeDrafts. Nếu gặp sự cố mất điện hay tải lại trang, thí sinh không bị mất một dòng code nào.")
    doc.add_paragraph("• Cấp độ 2 (Bài nộp chính thức): Khi kết thúc ca thi hoặc bấm 'Nộp bài ngay', mã nguồn được đóng gói gửi về bảng Submissions kèm mốc thời gian chính xác và phân loại ngôn ngữ.")
    doc.add_paragraph("• Cấp độ 3 (Chi tiết kết quả chấm): Bộ chấm Docker Sandbox so khớp với bảng TestCases và lưu kết quả chi tiết từng test case vào bảng GradingResults phục vụ việc xem lại và phúc khảo.")

    doc.add_heading("2. Cơ chế Giám sát AI có sự kiểm soát của con người (Human-in-the-Loop)", level=2)
    doc.add_paragraph("Mọi cảnh báo vi phạm trong bảng Violations do mô hình YOLOv8 hoặc MediaPipe phát hiện đều được lưu kèm ảnh chụp bằng chứng (snapshot_url) và tỷ lệ tin cậy (confidence_score). Giảng viên có toàn quyền xem lại và thẩm định (review_status: confirmed hoặc dismissed), tránh tình trạng AI nhận diện sai gây thiệt hại cho thí sinh.")

    output_path = r"d:\Oculide_NCKH\oculide-v1\docs\design\Thuyet_Minh_Thiet_Ke_CSDL_Oculide.docx"
    doc.save(output_path)
    print("SUCCESS: Document created at", output_path)

if __name__ == '__main__':
    create_document()

