import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def create_document():
    doc = docx.Document()

    # 1. Page Margins (Nghị định 30/2020/NĐ-CP: Top 2cm, Bottom 2cm, Left 3cm, Right 2cm)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.79)      # 20mm
        section.bottom_margin = Inches(0.79)   # 20mm
        section.left_margin = Inches(1.18)     # 30mm
        section.right_margin = Inches(0.79)    # 20mm

    # 2. Base Style
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(13)
    normal_style.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(4)

    # Header / University Title
    p_dtu = doc.add_paragraph()
    p_dtu.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1 = p_dtu.add_run("ĐẠI HỌC DUY TÂN - TRƯỜNG QUỐC TẾ\n")
    r1.font.bold = True
    r1.font.size = Pt(12)
    r2 = p_dtu.add_run("KHOA CÔNG NGHỆ THÔNG TIN - CHƯƠNG TRÌNH CMU\n")
    r2.font.bold = True
    r2.font.size = Pt(12)
    r3 = p_dtu.add_run("ĐỒ ÁN TỐT NGHIỆP CAPSTONE 1 (C1SE.16) - HỌC KỲ I")
    r3.font.italic = True
    r3.font.size = Pt(11)

    p_div = doc.add_paragraph()
    p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_div = p_div.add_run("--------------------***--------------------")
    r_div.font.color.rgb = RGBColor(0x9C, 0xA3, 0xAF)

    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("BỘ QUY CHUẨN KỸ THUẬT & KỸ NĂNG PHÁT TRIỂN\nDỰ ÁN OCULIDE V1")
    r_title.font.bold = True
    r_title.font.size = Pt(16)
    r_title.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run("Sổ tay hướng dẫn kỹ thuật, quy chuẩn Git, phân tách module và kiểm thử dành cho nhóm phát triển")
    r_sub.font.italic = True
    r_sub.font.size = Pt(12)
    r_sub.font.color.rgb = RGBColor(0x4B, 0x55, 0x63)

    # Info Box Table
    info_table = doc.add_table(rows=4, cols=2)
    info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    info_data = [
        ("Tên đề tài tiếng Việt:", "Oculide: Ứng dụng thị giác máy tính và học sâu trong giám sát gian lận phòng thi lập trình trực tuyến"),
        ("Tên đề tài tiếng Anh:", "Oculide: Application of Computer Vision and Deep Learning in Online Programming Exam Proctoring"),
        ("Giảng viên hướng dẫn:", "TS. Huỳnh Bá Diệu"),
        ("Thành viên nhóm (5):", "Lê Văn An (Tech Lead), Trần Thị Yến Nhi (Scrum Master), Huỳnh Trần Ngọc Trang, Nguyễn Đình Lộc, Phạm Văn Long")
    ]
    for i, (k, v) in enumerate(info_data):
        row = info_table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(4.3)
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.bold = True
        r0.font.size = Pt(11)
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.size = Pt(11)
        set_cell_margins(c0, 60, 60, 100, 100)
        set_cell_margins(c1, 60, 60, 100, 100)
        set_cell_shading(c0, "F3F4F6")
        set_cell_shading(c1, "F9FAFB")

    doc.add_paragraph()

    # Section 1: Golden Rules
    h1 = doc.add_paragraph()
    rh1 = h1.add_run("1. TỔNG QUAN & 5 NGUYÊN TẮC VÀNG CỦA DỰ ÁN")
    rh1.font.bold = True
    rh1.font.size = Pt(14)
    rh1.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    p_intro = doc.add_paragraph()
    p_intro.add_run(
        "Nhằm xây dựng sản phẩm đạt chuẩn đồ án quốc tế (CMU), vận hành trơn tru và hoàn toàn tự động hóa quy trình kiểm thử (CI/CD), "
        "tất cả 5 thành viên trong nhóm phát triển bắt buộc ghi nhớ và tuân thủ tuyệt đối 5 nguyên tắc vàng:"
    )

    rules = [
        ("Nguyên tắc 1 (Zero Direct Push to Main): ", "Tuyệt đối không bao giờ push code trực tiếp vào nhánh main. Mọi công việc từ nhỏ đến lớn đều phải rẽ nhánh riêng (feat/, fix/, test/) và tạo Pull Request (PR) để review."),
        ("Nguyên tắc 2 (Strict Conventional Commits): ", "Commit message và tiêu đề PR bắt buộc tuân theo định dạng chuẩn quốc tế <type>(<scope>): <subject> (toàn bộ chữ thường, không chấm ở cuối). GitHub PR Lint bot sẽ tự động từ chối nếu sai cú pháp."),
        ("Nguyên tắc 3 (Pre-flight Local Verification): ", "Luôn kiểm tra cục bộ trước khi push: Frontend phải chạy npm run lint và npm run build; Backend phải chạy pytest tests/ đạt 100% pass."),
        ("Nguyên tắc 4 (No Hardcoded Secrets/URLs): ", "Tuyệt đối không ghi cứng địa chỉ IP, localhost, URL hoặc secret key vào mã nguồn. Tất cả phải được nạp thông qua biến môi trường (.env / process.env / os.getenv)."),
        ("Nguyên tắc 5 (Strict Sandbox Isolation): ", "Hộp cát thực thi code của thí sinh (Docker Sandbox) phải bị ngắt kết nối mạng hoàn toàn (network_disabled: true), giới hạn RAM tối đa 128MB, 1 CPU và timeout tối đa 10s.")
    ]
    for r_title, r_body in rules:
        p_r = doc.add_paragraph(style='List Bullet')
        run_t = p_r.add_run(r_title)
        run_t.font.bold = True
        run_t.font.color.rgb = RGBColor(0xB9, 0x1C, 0x1C)
        p_r.add_run(r_body)

    # Section 2: Git Flow
    h2 = doc.add_paragraph()
    rh2 = h2.add_run("2. SKILL 1: KỸ NĂNG GIT FLOW & CI/CD CHUYÊN NGHIỆP")
    rh2.font.bold = True
    rh2.font.size = Pt(14)
    rh2.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    p_git = doc.add_paragraph()
    p_git.add_run("Quản trị mã nguồn là kỹ năng sống còn giúp nhóm 5 người làm việc song song mà không dẫm chân lên nhau. Quy trình rẽ nhánh và commit chuẩn hóa như sau:")

    doc.add_paragraph("A. Quy ước đặt tên nhánh (Branch Naming):", style='Normal').runs[0].font.bold = True
    branches = [
        ("feat/<tên-tính-năng>: ", "Dành cho việc phát triển tính năng mới. Ví dụ: feat/exam-monaco-editor, feat/proctor-livekit-grid."),
        ("fix/<tên-lỗi>: ", "Dành cho việc vá lỗi phát sinh. Ví dụ: fix/auth-token-refresh, fix/grader-memory-leak."),
        ("test/<tên-module>: ", "Dành cho việc bổ sung kịch bản kiểm thử. Ví dụ: test/submission-api, test/exam-autosave."),
        ("docs/<tên-tài-liệu>: ", "Dành cho việc viết tài liệu. Ví dụ: docs/test-input-specifications.")
    ]
    for b_title, b_desc in branches:
        p_b = doc.add_paragraph(style='List Bullet')
        p_b.add_run(b_title).font.bold = True
        p_b.add_run(b_desc)

    doc.add_paragraph("B. Bảng tra cứu cú pháp Conventional Commits:", style='Normal').runs[0].font.bold = True
    
    commit_table = doc.add_table(rows=6, cols=3)
    commit_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Loại (Type)", "Phạm vi (Scope)", "Ví dụ thực tế hợp lệ (Pass CI)"]
    for j, h in enumerate(headers):
        cell = commit_table.rows[0].cells[j]
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(11)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_shading(cell, "1E3A8A")
        set_cell_margins(cell, 80, 80, 100, 100)

    rows_data = [
        ("feat", "exam / proctor", "feat(exam): integrate monaco editor with auto save draft"),
        ("fix", "auth / grader", "fix(auth): handle token expiration 401 redirect"),
        ("test", "grader / api", "test(grader): add memory limit stress test cases"),
        ("refactor", "database / ui", "refactor(database): optimize submission query with index"),
        ("chore", "docker / deps", "chore(docker): optimize celery container build dependencies")
    ]
    for i, row in enumerate(rows_data):
        for j, val in enumerate(row):
            cell = commit_table.rows[i+1].cells[j]
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(10)
            if j == 2:
                r.font.name = 'Consolas'
                r.font.color.rgb = RGBColor(0x06, 0x5F, 0x46)
            set_cell_margins(cell, 60, 60, 100, 100)
            set_cell_shading(cell, "F9FAFB" if i % 2 == 0 else "FFFFFF")

    doc.add_paragraph()

    # Section 3: Frontend
    h3 = doc.add_paragraph()
    rh3 = h3.add_run("3. SKILL 2: KỸ NĂNG FRONTEND NEXT.JS 14 & TÁI SỬ DỤNG GIAO DIỆN")
    rh3.font.bold = True
    rh3.font.size = Pt(14)
    rh3.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    p_fe = doc.add_paragraph()
    p_fe.add_run("Frontend dự án sử dụng Next.js 14 App Router, TypeScript (chế độ strict), Tailwind CSS và Lucide Icons. Các thành viên phụ trách Frontend (Nhi, Trang, Lộc, Long) cần tuân thủ:")

    fe_points = [
        ("Phân tách Server & Client Components: ", "Các màn hình có tương tác người dùng, state (useState, useEffect), lắng nghe sự kiện hoặc dùng Monaco/LiveKit bắt buộc phải khai báo 'use client' ở ngay dòng đầu tiên của file."),
        ("Tái sử dụng linh kiện từ dự án mẫu D:\\Oculide: ", "Dự án cũ đã có sẵn các thành phần rất công phu: MonacoEditor.tsx (bộ soạn thảo code đa ngôn ngữ), useEventTracker.ts (hook giám sát chuyển tab, copy-paste, blur), LiveKitVideo.tsx (stream camera thời gian thực). Các thành viên cần lấy và tinh chỉnh vào frontend/src/."),
        ("Chuẩn hóa Axios Interceptor: ", "Mọi kết nối API phải đi qua frontend/src/utils/apiClient.ts để tự động đính kèm Bearer Token và tự động chuyển hướng về /login khi token hết hạn (mã lỗi 401)."),
        ("Thiết kế giao diện 4 trạng thái: ", "Mỗi màn hình bắt buộc phải xử lý đủ 4 trạng thái: Loading (Skeleton/Spinner), Empty Data (thông báo chưa có dữ liệu), Error (báo lỗi thân thiện) và Success.")
    ]
    for pt, pd in fe_points:
        p = doc.add_paragraph(style='List Bullet')
        p.add_run(pt).font.bold = True
        p.add_run(pd)

    # Section 4: Backend
    h4 = doc.add_paragraph()
    rh4 = h4.add_run("4. SKILL 3: KỸ NĂNG BACKEND FASTAPI, DATABASE & CELERY SANDBOX")
    rh4.font.bold = True
    rh4.font.size = Pt(14)
    rh4.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    p_be = doc.add_paragraph()
    p_be.add_run("Backend là trái tim xử lý nghiệp vụ, lưu trữ và điều phối mô hình AI:")

    be_points = [
        ("Kiến trúc 3 tầng phân lập (Layered Architecture): ", "Router (tiếp nhận HTTP, validate dữ liệu với Pydantic) -> Service (xử lý logic nghiệp vụ, tính điểm, tạo token) -> Database DAL (thao tác trực tiếp với SQL Server qua Parameterized Queries). Tuyệt đối không viết câu lệnh SQL trong Router."),
        ("Xử lý tác vụ nặng qua Celery: ", "Tác vụ biên dịch chấm code được chuyển vào hàng đợi celery_grading. Tác vụ xử lý khung hình/video AI được chuyển vào celery_proctoring. Router trả về mã task_id ngay lập tức, không để luồng FastAPI bị treo."),
        ("Bảo mật tuyệt đối cho Docker Sandbox: ", "Container thực thi code sinh viên phải cách ly hoàn toàn mạng (network_disabled: true), giới hạn bộ nhớ RAM 128MB, CPU 1 core và đặt timeout 10 giây để triệt tiêu tấn công DoS hoặc chiếm quyền điều khiển server.")
    ]
    for pt, pd in be_points:
        p = doc.add_paragraph(style='List Bullet')
        p.add_run(pt).font.bold = True
        p.add_run(pd)

    # Section 5: Test Input
    h5 = doc.add_paragraph()
    rh5 = h5.add_run("5. SKILL 4: KỸ NĂNG THIẾT KẾ ĐỀ THI & DỮ LIỆU KIỂM THỬ (TEST INPUT)")
    rh5.font.bold = True
    rh5.font.size = Pt(14)
    rh5.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    p_ti = doc.add_paragraph()
    p_ti.add_run("Đề thi và bộ dữ liệu kiểm thử là thước đo chất lượng của hệ thống chấm bài trực tuyến. Bạn Huỳnh Trần Ngọc Trang phụ trách chính, phối hợp cùng Trần Thị Yến Nhi:")

    ti_points = [
        ("Cấu trúc đề thi chuẩn Markdown: ", "Mỗi bài toán phải có mã bài, tên bài, mức độ (Dễ, Trung bình, Khó), giới hạn thời gian (1000ms), giới hạn bộ nhớ (128MB), mô tả bài toán, quy cách dữ liệu vào/ra, ràng buộc (constraints) và ít nhất 2 ví dụ mẫu có giải thích."),
        ("Quy chuẩn bộ Testcases (4 cấp độ): ", "Mỗi bài tối thiểu 10 - 20 testcases gồm: Sample Tests (2-3 tests công khai), Normal Tests (5-8 tests cơ bản), Edge Cases (3-5 tests góc/biên như N=0, N=1, mảng rỗng, số âm, tràn số 32-bit), và Stress/TLE Tests (2-4 tests dữ liệu lớn N=10^5 để bắt thuật toán chưa tối ưu)."),
        ("Script nạp dữ liệu tự động (Seed Data): ", "Soạn thảo dữ liệu theo file JSON chuẩn và sử dụng script nạp vào cơ sở dữ liệu SQL Server tự động (database/seeds/).")
    ]
    for pt, pd in ti_points:
        p = doc.add_paragraph(style='List Bullet')
        p.add_run(pt).font.bold = True
        p.add_run(pd)

    # Section 6: QA Testing
    h6 = doc.add_paragraph()
    rh6 = h6.add_run("6. SKILL 5: KỸ NĂNG KIỂM THỬ PHẦN MỀM & ĐẢM BẢO CHẤT LƯỢNG (QA)")
    rh6.font.bold = True
    rh6.font.size = Pt(14)
    rh6.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    p_qa = doc.add_paragraph()
    p_qa.add_run("Bạn Phạm Văn Long phụ trách Trưởng nhóm QA, phối hợp cùng Nguyễn Đình Lộc và Trần Thị Yến Nhi:")

    qa_points = [
        ("Unit Testing Backend với Pytest: ", "Tất cả các API mới phải có bài test phủ cả 2 trường hợp: Happy Case (status 200/201) và Error Case (status 400, 401, 403, 404). Sử dụng mock fixture để chạy test độc lập."),
        ("Xây dựng Ma trận Kiểm thử Chức năng (Test Matrix): ", "Lập bảng ma trận chi tiết các ca kiểm thử cho từng vai trò: Thí sinh làm bài thi, Giám thị giám sát, Giảng viên tạo đề và Admin quản trị."),
        ("Kiểm thử bảo mật & phân quyền (RBAC): ", "Kiểm tra sinh viên có thể can thiệp vào API giảng viên hay xem lén camera của phòng khác không. Đảm bảo token và quyền hạn được kiểm soát đa lớp."),
        ("Kiểm thử độ bền mạng (Resilience): ", "Kiểm thử các tình huống rớt mạng: ngắt Wi-Fi giữa chừng khi làm bài thi (hệ thống tự lưu draft vào localStorage), tự động kết nối lại WebSocket và WebRTC khi có mạng trở lại.")
    ]
    for pt, pd in qa_points:
        p = doc.add_paragraph(style='List Bullet')
        p.add_run(pt).font.bold = True
        p.add_run(pd)

    # Section 7: Individual Checklist
    h7 = doc.add_paragraph()
    rh7 = h7.add_run("7. BẢN ĐỒ KỸ NĂNG & CHECKLIST CÔNG VIỆC TỪNG THÀNH VIÊN")
    rh7.font.bold = True
    rh7.font.size = Pt(14)
    rh7.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    table_members = doc.add_table(rows=6, cols=3)
    table_members.alignment = WD_TABLE_ALIGNMENT.CENTER
    m_headers = ["Thành viên & Vai trò", "Kỹ năng trọng tâm", "Nhiệm vụ & Sản phẩm bàn giao"]
    for j, h in enumerate(m_headers):
        cell = table_members.rows[0].cells[j]
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(11)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_shading(cell, "1E3A8A")
        set_cell_margins(cell, 80, 80, 100, 100)

    member_data = [
        ("Lê Văn An\n(Tech Lead)", "Computer Vision, PyTorch, MediaPipe, Celery, Docker Sandbox", "• Tối ưu mô hình MediaPipe Iris & YOLOv8\n• Đóng gói Docker Sandbox cách ly\n• Quản trị hệ thống CI/CD & review PR nhóm"),
        ("Trần Thị Yến Nhi\n(Scrum Master)", "Next.js 14, Monaco Editor, Zustand, FastAPI Submissions", "• Hoàn thiện giao diện làm bài thi (/app/exam)\n• Tích hợp useEventTracker bắt gian lận\n• Xây dựng Submissions API kết nối Grader"),
        ("Huỳnh Trần Ngọc Trang\n(Member)", "Next.js 14, UI Forms, Competitive Programming, Data Seeding", "• Dựng giao diện Giảng viên (/app/instructor)\n• Biên soạn 15-20 đề bài chuẩn Markdown\n• Xây dựng bộ 10-20 testcases cho mỗi bài"),
        ("Nguyễn Đình Lộc\n(Member)", "Next.js 14, LiveKit WebRTC, WebSocket, Latency Testing", "• Dựng màn hình Giám thị (/app/proctor)\n• Hiển thị lưới video đa camera (Panoptic Grid)\n• Nhận cảnh báo vi phạm thời gian thực"),
        ("Phạm Văn Long\n(Lead QA)", "Next.js 14, NextAuth, Pytest, QA Test Matrix, RBAC", "• Hoàn thiện UI Đăng ký & Admin (/admin)\n• Lập bảng Ma trận kiểm thử QA toàn diện\n• Kiểm thử phân quyền RBAC & chịu lỗi mạng")
    ]
    for i, row in enumerate(member_data):
        for j, val in enumerate(row):
            cell = table_members.rows[i+1].cells[j]
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(10)
            if j == 0:
                r.font.bold = True
            set_cell_margins(cell, 60, 60, 100, 100)
            set_cell_shading(cell, "F9FAFB" if i % 2 == 0 else "FFFFFF")

    doc.add_paragraph()

    # Section 8: Agile & Collaboration
    h8 = doc.add_paragraph()
    rh8 = h8.add_run("8. QUY TRÌNH PHỐI HỢP NHÓM AGILE & XỬ LÝ SỰ CỐ")
    rh8.font.bold = True
    rh8.font.size = Pt(14)
    rh8.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    agile_points = [
        ("Nhịp điệu Daily Standup (10-15 phút): ", "Mỗi ngày, các thành viên cập nhật 3 câu hỏi cốt lõi: 1. Hôm qua đã làm được gì? 2. Hôm nay dự định làm gì? 3. Có vướng mắc hay blocker kỹ thuật nào cần hỗ trợ không?"),
        ("Sprint Review cuối tuần: ", "Thứ 7 hoặc Chủ Nhật hằng tuần, cả nhóm họp demo tính năng chạy thực tế trên máy cục bộ, chốt bản build và lên kế hoạch cho tuần kế tiếp."),
        ("Xử lý xung đột code (Merge Conflict): ", "Khi bị conflict lúc pull main, tuyệt đối không tự ý xóa code trên web GitHub. Hãy fetch về máy, dùng VS Code so sánh trực tiếp hai đoạn code, trao đổi với người liên quan trước khi merge và chạy lại test để đảm bảo an toàn.")
    ]
    for pt, pd in agile_points:
        p = doc.add_paragraph(style='List Bullet')
        p.add_run(pt).font.bold = True
        p.add_run(pd)

    # Signatures
    doc.add_paragraph()
    p_date = doc.add_paragraph()
    p_date.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r_date = p_date.add_run("Đà Nẵng, ngày 21 tháng 10 năm 2026\n")
    r_date.font.italic = True
    r_date.font.size = Pt(12)

    sign_table = doc.add_table(rows=1, cols=2)
    sign_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_left, c_right = sign_table.rows[0].cells[0], sign_table.rows[0].cells[1]
    c_left.width = Inches(3.2)
    c_right.width = Inches(3.2)

    p_l = c_left.paragraphs[0]
    p_l.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rl1 = p_l.add_run("XÁC NHẬN CỦA NHÓM TRƯỞNG / TECH LEAD\n\n\n\n")
    rl1.font.bold = True
    rl2 = p_l.add_run("Lê Văn An")
    rl2.font.bold = True

    p_r = c_right.paragraphs[0]
    p_r.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rr1 = p_r.add_run("ĐẠI DIỆN SCRUM MASTER\n\n\n\n")
    rr1.font.bold = True
    rr2 = p_r.add_run("Trần Thị Yến Nhi")
    rr2.font.bold = True

    output_path = r"d:\oculide-v1\docs\Bo_Quy_Chuan_Ky_Nang_Oculide_v1.docx"
    doc.save(output_path)
    print(f"Document created successfully at: {output_path}")

if __name__ == "__main__":
    create_document()
