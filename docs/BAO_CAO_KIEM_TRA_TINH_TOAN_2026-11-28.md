# Báo cáo rà soát tĩnh toàn diện Oculide

- Ngày rà soát: 2026-11-28
- Phạm vi: Backend FastAPI, frontend Next.js, CSDL SQL Server, API, bảo mật, kiến trúc, theme, dữ liệu tĩnh và UI/UX
- Loại rà soát: Rà soát tĩnh read-only
- Kết luận: Không chạy unit test, integration test, script kiểm thử hoặc build; không chỉnh sửa mã nguồn ứng dụng

## 1. Tổng quan kiến trúc

### 1.1 Kiến trúc chung

Hệ thống gồm ba lớp chính:

- Frontend Next.js trong `frontend/src`
- Backend FastAPI trong `backend`
- CSDL Microsoft SQL Server theo schema trong `database/schema.sql`

Luồng dữ liệu chính:

```text
Frontend (Next.js)
  -> fetchWithAuth
  -> FastAPI API Routers
  -> Services / Database modules
  -> SQL Server
  -> Pydantic response model hoặc JSON dict
```

Luồng giám sát và chấm bài bổ sung Redis, LiveKit, Celery và Docker Sandbox.

### 1.2 Phân tách module

Backend được tổ chức tương đối rõ theo các nhóm:

- `backend/api`: HTTP routes
- `backend/schemas`: request/response Pydantic models
- `backend/database`: truy vấn và truy cập SQL
- `backend/services`: nghiệp vụ
- `backend/tasks`: Celery/Docker/AI workers
- `backend/core`: cấu hình, JWT, kết nối CSDL và quyền hạn
- `backend/websocket`: quản lý realtime
- `frontend/src/app`: trang theo route
- `frontend/src/components`: component theo nghiệp vụ
- `frontend/src/services`: API client chung

### 1.3 Tình trạng tổng thể

Ưu điểm:

- Có RBAC qua dependency của FastAPI
- Có Pydantic validation ở nhiều request
- Có response model ở nhiều endpoint
- Có cleanup interval/timer trong nhiều `useEffect`
- Có phân trang trong một số API và truy vấn CSDL
- Có ownership check cho nhiều lớp, session, submission và room

Hạn chế:

- Secret fallback và secret repository có mức rủi ro cao
- Một số route giảng viên chưa kiểm tra quyền sở hữu tài nguyên
- JWT tin claim role thay vì trạng thái role trong CSDL
- Một số response contract chưa thống nhất
- Có router legacy song song với API v1
- Có God files ở frontend và backend
- Thiếu rate limiting API tập trung
- Composite index thiếu ở một số workload quan trọng

## 2. Kiến trúc và bản đồ API

### 2.1 Cấu trúc route

Các router chính được mount tại `backend/main.py:278-299` dưới `/api/v1`.

Các router được mount lại dưới `/api/...` làm tiền tố tương thích ngược tại `backend/main.py:301-322`.

Nhóm API chính:

| Nhóm API | Prefix | Vai trò chính |
|---|---|---|
| Authentication | `/api/v1/auth` | Đăng ký, đăng nhập, refresh, profile, password, maintenance, logout |
| Admin | `/api/v1/admin` | Quản lý người dùng, hệ thống, backup, log, lịch thi, evidence |
| Rooms | `/api/v1/rooms` | Tạo/sửa/xóa/tham gia phòng, scoreboard, exam content |
| Classes | `/api/v1/classes` | Quản lý lớp học và ghi danh |
| Sessions | `/api/v1/sessions` | Quản lý phiên làm bài |
| Submissions | `/api/v1/submissions` | Nộp bài, chạy code, xem bài nộp, plagiarism |
| Questions | `/api/v1/questions` | Quản lý câu hỏi |
| Test cases | `/api/v1/test-cases` | Quản lý test case |
| Violations | `/api/v1/violations` | Giám sát AI, vi phạm, review |
| Snapshots | `/api/v1/snapshots` | Ảnh webcam bằng chứng |
| Device checks | `/api/v1/device-checks` | Kiểm tra thiết bị |
| Chat | `/api/v1/chat` | Chat phòng và hội thoại |
| LiveKit | `/api/v1/livekit` | Tạo room/token, webhook |
| System logs | `/api/v1/system-logs` | Nhật ký và export CSV |
| Users | `/api/v1/users` | Tra cứu, cập nhật, khóa/mở khóa session |
| Templates | `/api/v1/templates` | Bộ đề thi |
| Notifications | `/api/v1/notifications` | Thông báo |
| Support | `/api/v1/support` | Yêu cầu hỗ trợ |
| Drafts | `/api/v1/drafts` | Tự lưu code |
| Grading results | `/api/v1/grading-results` | Kết quả từng test case |
| Enrollments | `/api/v1/enrollments` | Ghi danh vào room |

### 2.2 Chuẩn API

Các endpoint sử dụng FastAPI đúng phương thức HTTP tương đối nhất quán:

- `GET`: truy vấn dữ liệu
- `POST`: tạo tài nguyên và hành động
- `PUT`: cập nhật tài nguyên
- `PATCH`: cập nhật một phần/trạng thái
- `DELETE`: xóa tài nguyên

Hạn chế:

- Không có một response envelope thống nhất cho toàn hệ thống.
- Một số endpoint trả response model Pydantic; một số trả dict nguyên thủy.
- Một số endpoint trả cả `{success, message, data}` và một số endpoint chỉ trả object nghiệp vụ.
- Không có `errorCode` thống nhất; frontend chủ yếu phụ thuộc `detail`, `message`, `status`.

### 2.3 Đồng bộ frontend-backend

API client chung nằm tại `frontend/src/services/apiClient.ts:1-132`.

Điểm phù hợp:

- Frontend dùng `/api/v1/*` cho hầu hết endpoint chính
- JWT được gắn qua header `Authorization: Bearer`
- Refresh token gọi đúng `/api/v1/auth/refresh`
- 401 và maintenance 503 có xử lý phía frontend

Điểm cần cải thiện:

- Backend hỗ trợ cả snake_case và camelCase ở một số payload
- Frontend có mapping thủ công cho nhiều field khác nhau
- Một số endpoint trả HTTP 204 nhưng client luôn gọi `.json()` tại `frontend/src/services/apiClient.ts:82-83`
- Prefix legacy `/api/*` vẫn tồn tại, làm contract khó kiểm soát

## 3. Báo cáo bảo mật API

### 3.1. Lỗ hổng JWT và secret nghiêm trọng

#### CRITICAL - Secret repository

Các secret thật được lưu trực tiếp trong `backend/.env:5-38`, gồm database password, JWT key, LiveKit key/secret và SMTP password.

Đề xuất:

- Rotate tất cả credential đã xuất hiện trong repository
- Loại `backend/.env` khỏi Git/history
- Thêm `backend/.env` vào `.gitignore`
- Inject secret bằng secret manager hoặc CI/CD environment

#### CRITICAL - JWT fallback

JWT secret có fallback cố định tại `backend/core/config.py:35-51` và `backend/core/config.py:90-106`.

Database password, LiveKit key và LiveKit secret cũng có fallback cứng.

Đề xuất:

- Không có fallback secret trong production
- Startup phải fail nếu secret bắt buộc chưa được cấu hình
- Cấu hình JWT key riêng cho từng môi trường

#### HIGH - JWT role claim

`backend/core/permissions.py:11-40` xác thực JWT, trích role claim rồi truyền role cho `require_roles`.

Hệ thống không truy vấn role hiện tại trong CSDL mỗi lần authorize.

Rủi ro:

- Sau khi user bị đổi role hoặc vô hiệu hóa, JWT cũ có thể vẫn giữ quyền cũ trong thời hạn access token

Đề xuất:

- Đối chiếu role/user state từ CSDL
- Hoặc dùng version claim/session record
- Thu hồi access token ngay khi đổi role, khóa tài khoản hoặc logout

### 3.2. Thiếu resource ownership

#### HIGH - Dashboard giám sát phòng

`backend/api/rooms.py:760-789`

`GET /rooms/{room_id}/dashboard` yêu cầu role giảng viên/Admin nhưng không kiểm tra giảng viên sở hữu hoặc được chỉ định proctor cho room.

Đề xuất:

- Kiểm tra `room.instructor_id == current_user.user_id`
- Hoặc kiểm tra bảng `RoomProctors`

#### HIGH - Review vi phạm

`backend/api/violations.py:353-358`

Endpoint review chỉ yêu cầu `instructor_required`, sau đó cập nhật theo `violation_id` mà không xác minh room/class thuộc giảng viên.

Đề xuất:

- Resolve violation kèm room
- Kiểm tra room owner hoặc proctor assignment
- Admin mới được review trên toàn hệ thống

#### MEDIUM - Unlock session của người dùng

`backend/api/users.py:162-170`

Mọi giảng viên có thể mở khóa session của tài khoản bất kỳ bằng `user_id`.

Đề xuất:

- Giảng viên chỉ được unlock sinh viên trong lớp/phòng mình quản lý
- Giữ quyền mở khóa toàn hệ thống cho Admin

#### MEDIUM - Unlock session qua room

`backend/api/sessions.py:131-139`

Endpoint unlock theo `room_id/student_id` yêu cầu giảng viên/Admin nhưng chưa có đoạn kiểm tra quyền sở hữu room trong function.

Đề xuất:

- Resolve room
- Kiểm tra owner/proctor trước khi gửi unlock

#### MEDIUM - Phòng và bài nộp

Các endpoint sau cần ownership check đồng nhất:

- `backend/api/submissions.py:162-175`: plagiarism theo room
- `backend/api/submissions.py:217-246`: bài nộp theo room/question
- `backend/api/sessions.py:68-75`: session theo room
- `backend/api/support.py:57-68`: support request theo room
- `backend/api/violations.py:402-429`: statistics và AI metrics theo room

### 3.3. IDOR đã được xử lý ở một số vị trí

Các kiểm tra sau được nhận diện là hợp lệ:

- `backend/api/sessions.py:79-118`: sinh viên không xem/can thiệp session của người khác
- `backend/api/submissions.py:126-158`: sinh viên không xem submission/result của người khác
- `backend/api/submissions.py:228-246`: sinh viên không xem bài nộp theo student_id khác
- `backend/api/violations.py:291-313`: sinh viên bị giới hạn ở session/my violations
- `backend/api/users.py:206-225`: user chỉ xem/sửa hồ sơ của chính mình
- `backend/api/classes.py:148-210`: update/delete class có kiểm tra instructor owner
- `backend/api/rooms.py:559-743`: update/delete/publish room có kiểm tra instructor owner

Vẫn còn rủi ro khi giảng viên được quyền truy cập tài nguyên của giảng viên khác thông qua route role-only hoặc thiếu owner check.

### 3.4. Face verification

`backend/api/violations.py:136-217`

Endpoint xác thực khuôn mặt hiện chỉ kiểm tra:

- Có 1 người
- Có 1 khuôn mặt
- Camera không che

Endpoint không đối chiếu khuôn mặt với ảnh hồ sơ hoặc identity enrollment.

Đề xuất:

- Thêm enrolled face embedding
- Liveness check
- Confidence threshold
- Ghi nhận snapshot và audit event
- Không mô tả API là identity verification nếu chỉ làm face presence

### 3.5. CSV formula injection

`backend/api/system_logs.py:68-114`

CSV export ghi trực tiếp các field actor và message vào CSV mà không neutralize giá trị bắt đầu bằng `=`, `+`, `-`, `@`.

Đề xuất:

- Escape mọi ô export
- Prefix ký tự công thức bằng dấu nháy hoặc tab
- Dùng thư viện CSV được kiểm chứng trong Excel-safe mode

### 3.6. CORS và rate limiting

CORS được cấu hình tại `backend/main.py:200-207`.

Điểm tích cực:

- Tùy chỉnh origin cụ thể và devtunnels
- Cho credentials

Điểm cần cải thiện:

- `allow_methods=["*"]`
- `allow_headers=["*"]`
- Không thấy `TrustedHostMiddleware`
- Không thấy global API rate limit

Đề xuất:

- Whitelist method/header theo từng môi trường
- Thêm rate limiting cho login, register, forgot-password, join room và face verification
- Thêm `TrustedHostMiddleware` nếu deploy vào reverse proxy

### 3.7. Validation

Điểm tích cực:

- Auth dùng Pydantic models tại `backend/schemas/auth.py:5-16`
- Admin có role enum pattern tại `backend/schemas/admin.py:11-49`
- Profile có giới hạn độ dài tại `backend/schemas/user.py:17-20`
- Room và class có nhiều check nghiệp vụ

Hạn chế:

- Một số endpoint nhận `Dict[str, Any]` hoặc `Dict[str, str]` thay vì Pydantic model, ví dụ:
  - `backend/api/submissions.py:249-260`
  - `backend/api/rooms.py:604-625`
  - `backend/api/rooms.py:675-713`
- Một số payload JSON còn hỗ trợ cả tên field cũ và mới
- Một số query limit không có ràng buộc ở route

Đề xuất:

- Tạo Pydantic model cho mọi mutating endpoint
- Chuẩn hóa toàn bộ field sang snake_case
- Thêm validator cross-field cho ngày/giờ, status và role

### 3.8. Status code và error handling

Điểm tích cực:

- Phần lớn endpoint dùng `400`, `403`, `404`, `409/410`, `422`, `500/503` hợp lý
- Có 204 cho một số delete endpoint

Hạn chế:

- Một số endpoint catch exception và trả chuỗi DB lỗi cho `500`
- Một số fallback trả mô phỏng thành công thay vì báo lỗi, ví dụ `backend/api/submissions.py:99-123`
- Không thấy global exception handler tiêu chuẩn
- Health readiness có thể trả DB error detail ra response công khai tại `backend/main.py:257-267`

Đề xuất:

- Trả error envelope thống nhất
- Không expose exception text hoặc SQL detail
- Ghi chi tiết lỗi vào log server
- Không mô phỏng kết quả Docker khi sandbox không hoạt động

## 4. Dữ liệu giả và hardcode

### 4.1. Mock storage

| Mức độ | Vị trí | Nội dung | Đề xuất |
|---|---|---|---|
| Cao | `frontend/src/components/instructor/classes/types.ts:183-185` | LocalStorage keys `_mock` cho classes/rooms/schedules | Xóa hoặc đặt mock mode sau feature flag |
| Trung bình | `frontend/src/app/instructor/monitoring/page.tsx:119` | Cập nhật localStorage mock sau khi kết thúc lab | Chỉ cập nhật state sau API thực |
| Trung bình | `frontend/src/components/instructor/questions/InstructorQuestionsManagerView.tsx:304-337` | Data câu hỏi mặc định trong component | Gắn nhãn là seed template; không coi là dữ liệu server |
| Trung bình | `frontend/src/app/admin/users/page.tsx:1356-1363` | CSV sample chứa dữ liệu mẫu | Đặt rõ là template và không import như production data |
| Trung bình | `frontend/src/app/admin/classes/excelParser.ts:801-803` | Template import sinh viên có tên mẫu | Cho phép tải template nhưng không seed database |

### 4.2. Secret và cấu hình hardcode

Các cấu hình nằm trong `backend/core/config.py:35-58` và `backend/core/config.py:90-113`:

- Database server `localhost`
- Database password fallback
- JWT secret fallback
- LiveKit URL/key/secret
- CORS origin
- Redis host/port
- Sandbox resource limits

Các secret thực tế tại `backend/.env:5-38` không được phép commit.

Các cấu hình frontend cứng có thể được tìm thấy trong:

- `frontend/src/utils/websocket.ts:13-37`
- `frontend/src/utils/ipResolver.ts:31-61`
- `frontend/src/app/layout.tsx:14-24`

## 5. Rà soát màu sắc và theme

### 5.1 Design tokens hiện tại

Cấu hình Tailwind tại `frontend/tailwind.config.js:10-58`:

- Primary brand: `#91040A`
- Primary hover: `#7A0308`
- Light background: `#F7F5F4`
- Light foreground: `#343238`
- Dark background: `#141216`
- Dark surface: `#1C1820`

CSS variables tại `frontend/src/app/globals.css:4-19`:

- `--background`
- `--foreground`
- `--system-primary`
- `--system-primary-hover`
- `--system-primary-foreground`

### 5.2 Sai lệch theme

| Mức độ | Vị trí | Vấn đề | Khuyến nghị |
|---|---|---|---|
| Trung bình | `frontend/src/app/globals.css:188-191` | Tắt toàn bộ `animate-pulse` và `animate-ping` | Bỏ rule toàn cục hoặc scope theo component |
| Trung bình | `frontend/src/app/layout.tsx:20-24` | `colorScheme: light` trong khi hệ thống hỗ trợ dark | Dùng `colorScheme: 'light dark'` |
| Trung bình | `frontend/src/app/globals.css:4-19` | Thiếu token success/warning/danger/info | Thêm semantic color tokens |
| Tối ưu | `frontend/tailwind.config.js:10-58` | Hệ thống trộn brand/burgundy và nhiều màu Tailwind trực tiếp | Chuẩn hóa semantic alias |
| Tối ưu | Hero preview | Dùng pulse và Emerald/Rose trực tiếp thay cho semantic token | Dùng `success`, `danger`, `accent` token |

### 5.3 Khuyến nghị palette semantic

- Primary: `#91040A`
- Primary hover: `#7A0308`
- Light background: `#F7F5F4`
- Dark background: `#141216`
- Card dark: `#1C1820`
- Text primary: `#343238` hoặc `#F5F3F4`
- Success: Emerald `#059669`
- Warning: Amber `#D97706`
- Danger: Rose/Red `#E11D48`
- Info: Sky `#0284C7`

## 6. Rà soát CSDL

### 6.1 Thiết kế schema

Schema có các nhóm chính:

- Authentication, role, user, audit
- Semester, class, enrollment
- Question, test case, template
- Room, proctor, chat
- Session, device check, snapshot
- Draft, support, violation
- Submission và grading result

Điểm tích cực:

- Có primary key cho các bảng
- Có foreign key cho quan hệ quan trọng
- Có unique constraint cho role, username, email, room code, template code
- Có NOT NULL cho field nghiệp vụ quan trọng
- Có cascade delete cho một số bảng con
- Có index cho nhiều foreign key
- Có composite index ở snapshot và violation

### 6.2 Thiếu ràng buộc và index

#### MEDIUM - ExamSessions composite index

Cần tối ưu truy vấn theo:

- `room_id`
- `student_id`
- `status`

Hiện có ba index đơn tại `database/schema.sql:333-338`.

Đề xuất:

```sql
CREATE INDEX IDX_ExamSessions_RoomStudentStatus
ON ExamSessions(room_id, student_id, status);
```

#### MEDIUM - Submissions workload

Chỉ có index:

- `(room_id, student_id)`
- `question_id`
- `grading_status`

Thiếu composite index cho truy vấn theo room/question/student/submitted time tại `database/schema.sql:386-410`.

Đề xuất:

```sql
CREATE INDEX IDX_Submissions_RoomQuestionStudentSubmitted
ON Submissions(room_id, question_id, student_id, submitted_at DESC);
```

#### MEDIUM - Violations workload

Cần index theo room/review/detected time tại `database/schema.sql:364-379`.

```sql
CREATE INDEX IDX_Violations_RoomReviewDetected
ON Violations(room_id, review_status, detected_at DESC);
```

#### MEDIUM - RoomMessages workload

Lịch sử chat nên có index theo:

- `room_id`
- `sent_at`
- `sender_id/receiver_id`

Schema hiện tại tại `database/schema.sql:302-319` chỉ có index room/sender.

### 6.3 Truy vấn kém tối ưu

Các vấn đề tiềm tàng:

- Một số query lấy toàn bộ row từ bảng lớn rồi paging ở application
- Một số danh sách không giới hạn cứng
- Có aggregate scalar/query con trong một số select
- Một số query room lấy nhiều aggregate lồng nhau

Các ví dụ:

- `backend/database/submission_db.py:50-95`
- `backend/database/room_db.py:215-273`
- `backend/database/room_db.py:287-341`
- `backend/database/room_db.py:354-431`

Đề xuất:

- Pagination chuẩn hóa với `skip/limit`
- Capping limit tối đa
- Tách aggregate dashboard thành view/query chuyên biệt
- Theo dõi execution plan
- Tránh N+1 bằng JOIN hoặc CTE

### 6.4 Seed data

`database/schema.sql:615-630` tạo tài khoản demo/admin/instructor/student bằng password hash cố định.

Rủi ro:

- Production vô tình giữ account mặc định
- Password ban đầu có thể bị khai thác

Đề xuất:

- Chỉ seed trong development
- Buộc đổi password lần đầu
- Tắt hoặc vô hiệu hóa tài khoản demo ở production

### 6.5 Tích hợp session/submission

`database/schema.sql:386-410` có `Submissions.session_id`, nhưng một số luồng tạo submission không truyền session.

Đề xuất:

- Gắn submission trực tiếp với session
- Enforce uniqueness theo policy nộp lại
- Thêm ràng buộc session sinh viên phải thuộc room/submission

## 7. Rà soát frontend và UI/UX

### 7.1 Bố cục và responsive

Frontend chủ yếu dùng Tailwind breakpoint `sm`, `md`, `lg`.

Điểm tích cực:

- Có responsive grid ở trang chính
- Có overflow/scroll cho editor và bảng
- Có mobile navigation/sidebar fallback
- Có modal và table theo kích thước màn hình

Rủi ro:

- Một số modal/table dùng chiều rộng cố định hoặc overflow ngang
- Một số class dark mode override thay vì design token
- Bố cục phụ thuộc nhiều vào page lớn, khó kiểm soát responsive

### 7.2 Loading, disabled và validation

Điểm tích cực:

- Có `isLoading`, `isSubmitting`, `disabled` trong nhiều form
- Có validation Pydantic phía backend
- Frontend dùng thông báo lỗi và toast

Lỗ hổng UX cần kiểm tra:

- Không phải mọi submit đều khóa tránh double-submit
- Có fallback cảnh báo nhưng thiếu transaction state thống nhất
- Một số form reload dữ liệu nhiều lần

### 7.3 Component và useEffect lifecycle

Điểm tích cực:

- `frontend/src/app/student/device-check/page.tsx:199-205` có cleanup timeout/interval
- `frontend/src/app/student/waiting-room/page.tsx:137-145` có cleanup polling
- `frontend/src/app/student/exam-room/page.tsx:899-915` cleanup countdown
- `frontend/src/app/instructor/monitoring/page.tsx:225-240` cleanup polling

Điểm cần cải thiện:

- `frontend/src/app/student/exam-room/page.tsx:2585 dòng` có rất nhiều polling và state
- `frontend/src/app/admin/users/page.tsx:3483 dòng`
- `frontend/src/app/admin/classes/page.tsx:2469 dòng`
- `frontend/src/components/admin/system/AdminSystemView.tsx:3643 dòng`

Đề xuất:

- Tách thành custom hooks:
  - Camera lifecycle
  - AI polling
  - Room session polling
  - Countdown
  - Telemetry
- Tách table/filter/modal thành component riêng
- Dùng AbortController cho request có thể hủy
- Tránh setTimeout không cleanup trong callback form

### 7.4 Polling duplication

Một số page có nhiều interval cùng phạm vi:

- Camera scan mỗi 3-4 giây
- Room status mỗi 3-10 giây
- Heartbeat mỗi 20 giây
- Notification/topbar polling

Đề xuất:

- Kết hợp state realtime qua WebSocket
- Dùng React Query/SWR hoặc store polling riêng
- Tránh polling trùng trên nhiều page đang mount

### 7.5 Accessibility

Cần rà soát sâu thêm:

- `aria-label`/`aria-describedby` ở icon-only button
- Focus trap trong modal
- Keyboard navigation cho combobox/filter
- Contrast trong badge `slate` trên nền tối
- Reduced motion ở toàn ứng dụng

## 8. Danh sách vấn đề theo mức độ

### 8.1 Nghiêm trọng

| Vấn đề | Vị trí | Hành động |
|---|---|---|
| Secret thật trong repository | `backend/.env:5-38` | Rotate, revoke, loại khỏi Git và secret history |
| JWT/key fallback cố định | `backend/core/config.py:35-51`, `backend/core/config.py:90-106` | Bắt buộc secret môi trường, fail startup nếu thiếu |

### 8.2 Cao

| Vấn đề | Vị trí | Hành động |
|---|---|---|
| Role lấy từ JWT claim | `backend/core/permissions.py:11-40` | Đối chiếu role và trạng thái user trong CSDL |
| Giảng viên truy cập dashboard room người khác | `backend/api/rooms.py:760-789` | Kiểm tra room ownership/proctor |
| Giảng viên review vi phạm không thuộc phòng | `backend/api/violations.py:353-358` | Kiểm tra room ownership trước khi review |
| Unlock account không giới hạn ownership | `backend/api/users.py:162-170` | Chỉ giảng viên trong phòng/lớp được unlock |
| Seed tài khoản mặc định | `database/schema.sql:615-630` | Tách seed production và bắt buộc đổi mật khẩu |

### 8.3 Trung bình

| Vấn đề | Vị trí | Hành động |
|---|---|---|
| Face verification không identity binding | `backend/api/violations.py:136-217` | Enrollment embedding/liveness |
| CSV formula injection | `backend/api/system_logs.py:68-114` | Neutralize spreadsheet formula |
| Thiếu ownership ở một số session/room route | `backend/api/sessions.py:68-75`, `backend/api/submissions.py:162-175` | Resource-level authorization |
| Không có global rate limiting | `backend/main.py:200-207` | Thêm login/public endpoint throttling |
| Response contract không thống nhất | Toàn bộ router | Chuẩn hóa response và error model |
| Mã màu/animation lẫn lộn | `frontend/src/app/globals.css:188-191` | Thêm semantic token và scoped motion |
| Dữ liệu mock/localStorage còn sót | `frontend/src/components/instructor/classes/types.ts:183-185` | Loại bỏ mock khỏi production |
| Component quá lớn | `AdminSystemView`, `admin/users`, `exam-room`, `admin.py` | Tách module/hook/component |

### 8.4 Tối ưu thêm

- Thêm composite DB indexes
- Chuẩn hóa toàn bộ snake_case/camelCase
- Thêm API pagination cho mọi danh sách lớn
- Loại route legacy hoặc đánh dấu sunset
- Tách bảng điểm và dashboard thành query aggregate
- Thêm OpenAPI contract test và schema snapshot
- Thêm request ID và structured logging
- Thêm TrustedHost/CORS strict per environment
- Thêm cache cho public config và setting

## 9. Công việc ưu tiên theo giai đoạn

### Giai đoạn 1 - Sớm nhất

1. Rotate secret và dọn `.env`.
2. Tắt account seed mặc định ở production.
3. Sửa JWT role verification.
4. Thêm ownership check cho room/dashboard/violation/session/submission.
5. Neutralize CSV export.
6. Giới hạn unlock session.

### Giai đoạn 2 - Stabilization

1. Chuẩn hóa Pydantic request/response.
2. Thêm global error envelope.
3. Thêm global rate limit.
4. Tách fallback mô phỏng khỏi production.
5. Thêm composite index và pagination.

### Giai đoạn 3 - Refactor

1. Tách 4-6 God files lớn nhất.
2. Chuẩn hóa theme và semantic colors.
3. Hợp nhất/mock localStorage.
4. Tách polling lifecycle thành hooks.
5. Rà soát accessibility trên mọi modal/form.

## 10. Kết luận

Oculide có kiến trúc backend/frontend rõ ràng, nhiều route và service đã chia theo module, có Pydantic validation và ownership check ở các luồng trọng yếu. Tuy nhiên, mức rủi ro cao tập trung ở secret repository, JWT role claim, ownership check không nhất quán ở tài nguyên phòng thi/vi phạm và thiếu rate limiting.

Hệ thống CSDL đã có khóa ngoại, unique constraint và index cơ bản, nhưng cần composite index và pagination nhất quán hơn. Frontend hoạt động theo module rõ ràng nhưng còn nhiều page/component quá lớn, poll nhiều interval và một số mock/localStorage cần loại khỏi luồng production.
