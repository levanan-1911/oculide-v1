# BỘ QUY CHUẨN KỸ THUẬT & KỸ NĂNG PHÁT TRIỂN DỰ ÁN OCULIDE V1
**Dự án Capstone 1 (C1SE.16) - Chương trình CMU, Trường Quốc tế, Đại học Duy Tân**

---

> **Tên đề tài chính thức**:  
> *Tiếng Việt*: **Oculide: Ứng dụng thị giác máy tính và học sâu trong giám sát gian lận phòng thi lập trình trực tuyến**  
> *Tiếng Anh*: **Oculide: Application of Computer Vision and Deep Learning in Online Programming Exam Proctoring**  
> **Giảng viên hướng dẫn**: TS. Huỳnh Bá Diệu  
> **Đơn vị**: Khoa Công nghệ Thông tin - Đại học Duy Tân (DTU)

---

## MỤC LỤC
1. [Tổng Quan & 5 Nguyên Tắc Vàng](#1-tổng-quan--5-nguyên-tắc-vàng)
2. [Skill 1: Kỹ Năng Git Flow & CI/CD Chuyên Nghiệp](#2-skill-1-kỹ-năng-git-flow--cicd-chuyên-nghiệp)
3. [Skill 2: Kỹ Năng Frontend Next.js 14 & Tái Sử Dụng UI](#3-skill-2-kỹ-năng-frontend-nextjs-14--tái-sử-dụng-ui)
4. [Skill 3: Kỹ Năng Backend FastAPI, Database & Celery Sandbox](#4-skill-3-kỹ-năng-backend-fastapi-database--celery-sandbox)
5. [Skill 4: Kỹ Năng Thiết Kế Đề Thi & Dữ Liệu Kiểm Thử (Test Input)](#5-skill-4-kỹ-năng-thiết-kế-đề-thi--dữ-liệu-kiểm-thử-test-input)
6. [Skill 5: Kỹ Năng Kiểm Thử Phần Mềm & Đảm Bảo Chất Lượng (QA)](#6-skill-5-kỹ-năng-kiểm-thử-phần-mềm--đảm-bảo-chất-lượng-qa)
7. [Bản Đồ Kỹ Năng & Checklist Cho Từng Thành Viên](#7-bản-đồ-kỹ-năng--checklist-cho-từng-thành-viên)
8. [Quy Trình Phối Hợp Nhóm Agile & Giải Quyết Xung Đột](#8-quy-trình-phối-hợp-nhóm-agile--giải-quyết-xung-đột)

---

## 1. TỔNG QUAN & 5 NGUYÊN TẮC VÀNG

Để đảm bảo toàn bộ 5 thành viên trong nhóm làm việc đồng bộ, hạn chế tối đa lỗi xung đột mã nguồn (merge conflict), không làm gãy pipeline tự động (CI/CD) và đáp ứng chuẩn chất lượng quốc tế của đồ án tốt nghiệp CMU, mọi thành viên **bắt buộc tuân thủ 5 nguyên tắc vàng** sau:

1. **Tuyệt đối không push trực tiếp vào branch `main`**: Mọi tính năng, sửa lỗi hay thêm testcase đều phải thực hiện trên branch riêng và tạo Pull Request (PR).
2. **Tuân thủ nghiêm ngặt chuẩn Conventional Commits**: Cả commit message và tiêu đề Pull Request phải có định dạng chuẩn `<type>(<scope>): <subject>` (toàn bộ chữ thường, không dấu chấm ở cuối). GitHub bot sẽ tự động từ chối nếu sai định dạng.
3. **Kiểm tra cục bộ (Local Check) trước khi tạo PR**:
   - Frontend: chạy `npm run lint` và `npm run build` không được có cảnh báo hoặc lỗi type.
   - Backend: chạy `pytest tests/` đảm bảo 100% testcases đều pass.
4. **Không hardcode thông tin cấu hình và URL**: Tất cả URL API, secret key, credential phải được đọc từ biến môi trường (`.env` thông qua `process.env.NEXT_PUBLIC_...` hoặc `os.getenv`).
5. **Đảm bảo an toàn cách ly Sandbox**: Trình biên dịch/thực thi code của sinh viên phải luôn bị cô lập mạng (`network_disabled: true`), giới hạn RAM (tối đa 128MB), giới hạn CPU và timeout tối đa 10s.

---

## 2. SKILL 1: KỸ NĂNG GIT FLOW & CI/CD CHUYÊN NGHIỆP

### 2.1. Quy tắc đặt tên Branch
Khi bắt đầu một công việc mới từ `main`, hãy kéo mã nguồn mới nhất và rẽ nhánh theo cú pháp:
```bash
git checkout main
git pull origin main
git checkout -b <prefix>/<ten-tinh-nang>
```
Trong đó `<prefix>` bao gồm:
- `feat/`: Tính năng mới (ví dụ: `feat/exam-workspace-ui`, `feat/proctor-livekit-grid`).
- `fix/`: Sửa lỗi (ví dụ: `fix/auth-token-refresh`, `fix/submission-tle-error`).
- `test/`: Viết bộ kiểm thử (ví dụ: `test/grader-sandbox`, `test/exam-autosave`).
- `docs/`: Cập nhật tài liệu kỹ thuật (ví dụ: `docs/test-input-specifications`).

### 2.2. Chuẩn Conventional Commits (Tránh trượt CI bot)
Cú pháp commit chuẩn:
```text
<type>(<scope>): <mô tả ngắn bằng chữ thường, không dấu chấm cuối>
```
- **Type hợp lệ**:
  - `feat`: Tính năng mới cho người dùng.
  - `fix`: Sửa lỗi hệ thống.
  - `docs`: Cập nhật tài liệu.
  - `style`: Định dạng code (whitespace, format), không đổi logic.
  - `refactor`: Tái cấu trúc code (không thêm tính năng, không sửa bug).
  - `test`: Thêm hoặc bổ sung bài kiểm thử.
  - `chore`: Cấu hình Docker, build, package.
- **Scope hợp lệ**: `exam`, `proctor`, `instructor`, `auth`, `admin`, `grader`, `ai`, `db`, `api`.

**Ví dụ đúng (Pass CI)**:
- `feat(exam): integrate monaco editor with auto save draft`
- `feat(proctor): implement livekit multi video panoptic grid`
- `fix(auth): handle token expiration 401 redirect`
- `test(grader): add memory limit stress test cases`

**Ví dụ sai (Bị GitHub Bot Reject)**:
- `Fix bug login` *(Thiếu type chuẩn, viết hoa đầu dòng)*
- `feat: update code.` *(Có dấu chấm ở cuối, thiếu mô tả rõ ràng)*
- `WIP exam` *(Không đúng chuẩn Conventional Commits)*

### 2.3. Quy trình 5 bước tạo Pull Request (PR)
1. **Bước 1**: Cập nhật nhánh nhánh tính năng của bạn từ `main` mới nhất:
   ```bash
   git fetch origin
   git merge origin/main
   ```
2. **Bước 2**: Chạy kiểm thử cục bộ:
   - Frontend: `cd frontend && npm run lint && npm run build`
   - Backend: `cd backend && pytest tests/`
3. **Bước 3**: Push nhánh lên GitHub:
   ```bash
   git push origin feat/<tên-nhánh>
   ```
4. **Bước 4**: Mở Pull Request trên giao diện GitHub:
   - Tiêu đề PR phải tuân thủ Conventional Commits (ví dụ: `feat(exam): add problem description markdown viewer`).
   - Ghi mô tả ngắn gọn: Tính năng đã làm, ảnh chụp màn hình (nếu là UI), các bước kiểm thử.
5. **Bước 5**: Tag Tech Lead (Lê Văn An) hoặc Scrum Master (Trần Thị Yến Nhi) để review. Sau khi pass CI và được chấp thuận (Approve), mới được merge vào `main`.

---

## 3. SKILL 2: KỸ NĂNG FRONTEND NEXT.JS 14 & TÁI SỬ DỤNG UI

### 3.1. Cấu trúc thư mục chuẩn `frontend/src`
```text
frontend/src/
├── app/                      # App Router (Next.js 14)
│   ├── (auth)/               # Route nhóm xác thực
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── admin/                # Phân hệ Admin
│   ├── exam/                 # Phân hệ Làm bài thi (Nhi phụ trách)
│   ├── instructor/           # Phân hệ Giảng viên (Trang phụ trách)
│   ├── proctor/              # Phân hệ Giám thị (Lộc phụ trách)
│   └── layout.tsx
├── components/               # UI Components dùng chung & theo module
│   ├── auth/                 # Component đăng nhập, form xác thực
│   ├── exam/                 # MonacoEditor, ProblemViewer, TestcasePanel
│   ├── proctor/              # LiveKitVideoGrid, ViolationLogTable
│   ├── instructor/           # ExamBuilder, StudentScoreList
│   └── ui/                   # Button, Modal, Badge, Toast, Spinner
├── hooks/                    # Custom React Hooks
│   ├── useEventTracker.ts    # Giám sát chuyển tab, copy-paste
│   └── useLiveKitRoom.ts     # Quản lý kết nối WebRTC LiveKit
├── store/                    # Zustand Store quản lý trạng thái
│   ├── authStore.ts          # Lưu trữ thông tin đăng nhập, token
│   └── examStore.ts          # Lưu trữ code nháp, trạng thái phòng thi
└── utils/                    # Helper functions & API Client
    ├── apiClient.ts          # Axios Interceptor gắn JWT Token
    └── formatters.ts         # Format thời gian, điểm số
```

### 3.2. Quy tắc Server Components vs Client Components
- **Client Component (`'use client'`)**: Đặt ở dòng đầu tiên của file khi component có sử dụng:
  - React Hooks (`useState`, `useEffect`, `useCallback`, `useRef`).
  - Lắng nghe sự kiện người dùng (`onClick`, `onChange`, `onKeyDown`).
  - Tương tác với Browser API (`localStorage`, `window.addEventListener`, Monaco Editor, WebRTC).
- **Server Component**: Mặc định cho các component layout tĩnh hoặc fetch dữ liệu ban đầu từ server nhằm tối ưu SEO và thời gian tải trang.

### 3.3. Hướng dẫn tái sử dụng tài nguyên từ dự án mẫu (`D:\Oculide`)
Trong thư mục dự án mẫu `D:\Oculide\frontend\src`, nhóm có sẵn các module đã hoàn thiện, các thành viên cần chủ động sao chép và tinh chỉnh:
- **Trần Thị Yến Nhi (Làm bài thi)**:
  - Sao chép `MonacoEditor.tsx` từ `D:\Oculide` vào `frontend/src/components/exam/MonacoEditor.tsx`. Bổ sung chọn ngôn ngữ (Python, C++, Java), đổi theme (Dark/Light).
  - Tái sử dụng `useEventTracker.ts` để bắt sự kiện sinh viên chuyển tab (`visibilitychange`), mất focus (`blur`), chụp màn hình hoặc dùng phím tắt copy/paste.
- **Nguyễn Đình Lộc (Giám thị)**:
  - Sao chép `LiveKitVideo.tsx` vào `frontend/src/components/proctor/LiveKitVideo.tsx` để dựng lưới camera đa thí sinh (Panoptic Grid).
  - Tích hợp WebSocket nhận cảnh báo gian lận thời gian thực từ AI worker.
- **Huỳnh Trần Ngọc Trang (Giảng viên)**:
  - Tham khảo `instructor/page.tsx` từ `D:\Oculide` để dựng giao diện tạo phòng thi, nhập danh sách sinh viên và cấu hình thời gian thi.

### 3.4. Chuẩn hóa API Client (Axios Interceptor)
Mọi cuộc gọi API từ Frontend đến Backend BẮT BUỘC đi qua file trung tâm `frontend/src/utils/apiClient.ts`:
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động gắn Bearer Token vào Header
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Bắt lỗi tập trung (401 hết phiên đăng nhập)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      window.location.href = '/login?expired=1';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 4. SKILL 3: KỸ NĂNG BACKEND FASTAPI, DATABASE & CELERY SANDBOX

### 4.1. Kiến trúc phân tầng 3 lớp (Layered Architecture)
Để code backend dễ bảo trì, mở rộng và viết unit test, cấu trúc backend tuân thủ nghiêm ngặt 3 tầng:
1. **Tầng Router (`backend/routers/`)**:
   - Chỉ chịu trách nhiệm tiếp nhận HTTP request, xác thực quyền hạn (Authentication/Authorization) và kiểm tra định dạng dữ liệu đầu vào thông qua Pydantic schema.
   - **Tuyệt đối không** viết các câu lệnh truy vấn cơ sở dữ liệu hoặc xử lý thuật toán phức tạp tại đây.
2. **Tầng Nghiệp vụ (`backend/services/`)**:
   - Chứa logic nghiệp vụ chính của hệ thống (ví dụ: tính toán điểm bài thi, mã hóa mật khẩu, kiểm tra điều kiện vào phòng thi, điều phối chấm code).
3. **Tầng Dữ liệu (`backend/database/` - DAL / Repositories)**:
   - Đảm nhiệm việc kết nối và thao tác trực tiếp với cơ sở dữ liệu SQL Server (13 bảng).
   - Mọi truy vấn phải sử dụng tham số hóa (Parameterized Queries) hoặc ORM để triệt tiêu hoàn toàn nguy cơ tấn công SQL Injection.

### 4.2. Nguyên tắc xử lý tác vụ nặng bất đồng bộ (Celery Workers)
- **Tác vụ chấm code sinh viên**:
  - Không bao giờ thực thi code trực tiếp trong luồng chính của FastAPI (sẽ làm nghẽn toàn bộ server).
  - Đẩy tác vụ vào Celery queue `celery_grading`. Worker sẽ kích hoạt Docker Sandbox để biên dịch và chạy code an toàn.
- **Tác vụ phân tích video AI**:
  - Khung hình hoặc video stream gửi từ client được đẩy vào Celery queue `celery_proctoring` hoặc luồng xử lý AI riêng biệt.
  - Sau khi MediaPipe/YOLO phát hiện vi phạm (quay mặt, vắng mặt, phát hiện điện thoại), kết quả sẽ được ghi vào database và bắn thông báo qua WebSocket đến màn hình Giám thị.

### 4.3. Tiêu chuẩn an toàn bảo mật Sandbox (Docker Execution)
Mã nguồn thí sinh nộp lên tiềm ẩn nguy cơ thực thi lệnh độc hại (xóa file hệ thống, tạo kết nối ra ngoài, tiêu tốn tài nguyên). Do đó, container Docker Sandbox BẮT BUỘC phải thiết lập:
- `network_disabled: true` (Không cho phép container truy cập Internet).
- `mem_limit: 128m` (Giới hạn tối đa 128MB RAM, vượt quá sẽ dính mã lỗi `Memory Limit Exceeded - MLE`).
- `cpus: 1.0` (Giới hạn 1 nhân CPU).
- `timeout: 10s` (Giới hạn thời gian chạy tối đa 10 giây, vượt quá sẽ dính mã lỗi `Time Limit Exceeded - TLE`).
- Chạy dưới tài khoản không đặc quyền (`non-root user`).

---

## 5. SKILL 4: KỸ NĂNG THIẾT KẾ ĐỀ THI & DỮ LIỆU KIỂM THỬ (TEST INPUT)
*(Phụ trách chính: Huỳnh Trần Ngọc Trang; phối hợp: Trần Thị Yến Nhi)*

### 5.1. Tiêu chuẩn cấu trúc một đề bài lập trình
Một bài tập hợp chuẩn phải được soạn thảo bằng định dạng Markdown với đầy đủ 7 mục sau:
1. **Tiêu đề bài toán & Mã bài** (Ví dụ: `PROB01 - Đảo Ngược Chuỗi Con`).
2. **Độ khó & Giới hạn**: Dễ / Trung bình / Khó; Thời gian chạy: 1000ms; Bộ nhớ: 128MB.
3. **Mô tả bài toán (Problem Statement)**: Đặt vấn đề rõ ràng, thực tế, mạch lạc.
4. **Quy cách Dữ liệu vào (Input Specification)**: Định dạng từng dòng của file input.
5. **Quy cách Dữ liệu ra (Output Specification)**: Định dạng kết quả cần in ra màn hình.
6. **Ràng buộc dữ liệu (Constraints)**: Ví dụ $1 \le N \le 10^5$, $-10^9 \le A[i] \le 10^9$.
7. **Ví dụ mẫu (Sample Input / Output)**: Tối thiểu 2 ví dụ kèm giải thích chi tiết từng bước.

### 5.2. Quy chuẩn bộ Testcases (4 Cấp độ kiểm thử)
Mỗi bài toán phải có tối thiểu **10 - 20 bộ testcases** bao gồm đầy đủ 4 cấp độ:
- **Cấp độ 1 - Sample Tests (2-3 tests)**: Test công khai trong đề bài để thí sinh tự bấm nút "Chạy thử nghiệm" (Run Code).
- **Cấp độ 2 - Normal Tests (5-8 tests)**: Các dữ liệu thông thường trong phạm vi bài toán để kiểm tra thuật toán cơ bản.
- **Cấp độ 3 - Boundary & Edge Cases (3-5 tests)**:
  - Mảng rỗng hoặc $N = 0, N = 1$.
  - Dữ liệu chứa số âm, số $0$, số nguyên lớn chạm ngưỡng tràn số 32-bit ($> 2 \times 10^9$).
  - Chuỗi chỉ toàn khoảng trắng hoặc ký tự đặc biệt.
- **Cấp độ 4 - Stress & Performance Tests (2-4 tests)**:
  - Dữ liệu cực đại ($N = 10^5$ hoặc $N = 10^6$) nhằm phát hiện và loại bỏ các bài nộp dùng thuật toán vét cạn có độ phức tạp thời gian quá lớn ($O(N^2)$ hoặc $O(2^N)$).

### 5.3. Định dạng lưu trữ và Nạp tự động (Seed Data)
Dữ liệu đề bài và testcases phải được lưu dưới dạng file JSON hoặc SQL script trong thư mục `database/seeds/problems/` theo mẫu:
```json
{
  "problem_code": "TWO_SUM",
  "title": "Tìm Cặp Số Có Tổng Bằng K",
  "difficulty": "EASY",
  "time_limit_ms": 1000,
  "memory_limit_mb": 128,
  "description": "Cho mảng số nguyên A gồm N phần tử và số nguyên K...",
  "testcases": [
    { "input": "4 9\n2 7 11 15", "output": "0 1", "is_sample": true },
    { "input": "3 6\n3 2 4", "output": "1 2", "is_sample": true },
    { "input": "1 5\n5", "output": "-1", "is_sample": false },
    { "input": "100000 1000000000\n...", "output": "...", "is_sample": false }
  ]
}
```

---

## 6. SKILL 5: KỸ NĂNG KIỂM THỬ PHẦN MỀM & ĐẢM BẢO CHẤT LƯỢNG (QA)
*(Phụ trách chính: Phạm Văn Long; phối hợp: Trần Thị Yến Nhi & Nguyễn Đình Lộc)*

### 6.1. Kỹ năng viết Unit Test Backend (`pytest`)
- Tất cả các endpoint API mới phải có tối thiểu 2 kịch bản test:
  1. **Happy Case**: Dữ liệu gửi lên hợp lệ, trả về status code `200` hoặc `201`.
  2. **Error Case**: Dữ liệu thiếu trường, token sai quyền, tài nguyên không tồn tại, trả về status code `400`, `401`, `403` hoặc `404`.
- Sử dụng fixture mock database và redis để test chạy độc lập, không phụ thuộc vào hạ tầng thật bên ngoài.

### 6.2. Kỹ năng xây dựng Ma trận Kiểm thử Chức năng (Functional Test Matrix)
Long chịu trách nhiệm tạo bảng ma trận kiểm thử chi tiết bao gồm:
- **ID Test Case**: Ví dụ `TC_EXAM_001`.
- **Phân hệ**: `Auth`, `Exam`, `Instructor`, `Proctor`, `Admin`.
- **Mô tả kịch bản**: "Sinh viên nộp bài thi bằng ngôn ngữ Python khi hết giờ".
- **Dữ liệu đầu vào**: Token sinh viên, mã bài làm, code giải thuật.
- **Kết quả kỳ vọng**: Hệ thống khóa khung soạn thảo, tự động submit code hiện tại, thông báo bài thi đã nộp thành công.
- **Trạng thái thực tế**: `Passed`, `Failed`, `Blocked`.

### 6.3. Kiểm thử phân quyền truy cập theo vai trò (RBAC Testing)
Bảo đảm tính toàn vẹn của hệ thống bằng cách kiểm thử nghiêm ngặt các rào cản phân quyền:
- Thí sinh (`STUDENT`) không thể gọi API tạo đề của Giảng viên (`INSTRUCTOR`) hoặc truy cập danh sách phòng thi của Giám thị (`PROCTOR`).
- Giám thị (`PROCTOR`) chỉ có quyền xem camera và nhật ký vi phạm, không có quyền sửa đổi điểm số hay đề bài.
- Người dùng chưa đăng nhập (`GUEST`) bị chặn tại trang `/app/...` và tự động điều hướng về `/login`.

### 6.4. Kiểm thử khả năng chịu lỗi và thời gian thực (Resilience Testing)
- **Mất mạng đột ngột**: Thử ngắt Wi-Fi khi đang làm bài thi. Code trên Monaco Editor phải được tự động lưu tạm vào `localStorage` và đồng bộ lại ngay khi có mạng.
- **Đứt kết nối WebSocket/WebRTC**: Giám sát viên tắt tab hoặc mất kết nối camera, hệ thống phải tự kích hoạt cơ chế `reconnect` tự động trong 5 giây mà không làm sập giao diện.

---

## 7. BẢN ĐỒ KỸ NĂNG & CHECKLIST CHO TỪNG THÀNH VIÊN

### 7.1. Lê Văn An (Tech Lead - AI & Core Backend)
- [ ] Tối ưu hóa mô hình MediaPipe Iris (nhận diện hướng nhìn mắt) và YOLOv8 (phát hiện điện thoại, người thứ 2).
- [ ] Đóng gói container Docker Sandbox bảo mật, giới hạn CPU/RAM/Timeout chuẩn xác.
- [ ] Duy trì Celery worker chấm bài và AI proctoring hoạt động ổn định trên nền Docker Compose.
- [ ] Quản trị hệ thống CI/CD trên GitHub Actions, review và phê duyệt các Pull Request của nhóm.

### 7.2. Trần Thị Yến Nhi (Scrum Master - Frontend Exam & Backend Submissions)
- [ ] Xây dựng hoàn thiện không gian làm bài thi `/app/exam` (tích hợp Monaco Editor, chuyển đổi ngôn ngữ, auto-save).
- [ ] Tích hợp `useEventTracker.ts` để bắt các hành vi khả nghi: Chuyển tab, mất focus, thu nhỏ trình duyệt, copy-paste.
- [ ] Xây dựng và hoàn thiện API chấm điểm bài nộp (Submissions API) kết nối với Celery Grader.
- [ ] Điều phối tiến độ hằng ngày (Daily Standup), hỗ trợ giải quyết blocker cho các thành viên.

### 7.3. Huỳnh Trần Ngọc Trang (Frontend Instructor & Test Input)
- [ ] Dựng giao diện Cổng Giảng viên `/app/instructor` (Quản lý đề thi, cấu hình phòng thi, cấp mã PIN, xem danh sách điểm).
- [ ] Biên soạn bộ dữ liệu chuẩn gồm **15 - 20 bài toán lập trình** với đầy đủ mô tả Markdown, ràng buộc và lời giải mẫu.
- [ ] Xây dựng tối thiểu **10 - 20 testcases** cho mỗi bài toán (gồm sample, normal, edge cases và TLE tests).
- [ ] Viết script nạp dữ liệu đề thi vào cơ sở dữ liệu (`database/seeds/`).

### 7.4. Nguyễn Đình Lộc (Frontend Proctor & Realtime Testing)
- [ ] Xây dựng giao diện Bảng điều khiển Giám thị `/app/proctor` hiển thị lưới camera thời gian thực (Panoptic Video Grid).
- [ ] Tích hợp LiveKit WebRTC client để hiển thị video stream mượt mà, độ trễ thấp (< 500ms).
- [ ] Xây dựng bảng hiển thị nhật ký cảnh báo vi phạm thời gian thực qua WebSocket.
- [ ] Tiến hành kiểm thử độ trễ truyền hình ảnh và độ ổn định của luồng video đa thí sinh.

### 7.5. Phạm Văn Long (Frontend Auth/Admin & Lead QA)
- [ ] Hoàn thiện các giao diện Xác thực: Đăng ký (`/register`), Quản trị người dùng (`/admin`).
- [ ] Thiết lập phân quyền bảo vệ route trên Frontend (Next.js Middleware kiểm tra Token và Role).
- [ ] Lập Bảng Ma trận Kiểm thử Toàn diện (QA Test Matrix) cho tất cả các luồng người dùng.
- [ ] Thực hiện kiểm thử phân quyền RBAC và kiểm thử độ bền hệ thống khi mất kết nối mạng.

---

## 8. QUY TRÌNH PHỐI HỢP NHÓM AGILE & GIẢI QUYẾT XUNG ĐỘT

### 8.1. Nhịp điệu làm việc Agile Scrum
- **Họp Daily Standup (10 - 15 phút mỗi sáng / tối)**:
  - 1. Hôm qua bạn đã làm được gì?
  - 2. Hôm nay bạn dự định làm gì?
  - 3. Bạn có gặp khó khăn hay vướng mắc kỹ thuật (blocker) nào cần cả nhóm hỗ trợ không?
- **Sprint Review & Demo (Cuối tuần)**:
  - Cả nhóm họp trực tiếp hoặc trực tuyến, trình chiếu tính năng vừa hoàn thiện trên môi trường local.
  - Tech Lead tổng hợp code, kiểm tra tính tương thích và chốt bản build của tuần.

### 8.2. Quy trình giải quyết xung đột mã nguồn (Merge Conflict Resolution)
Nếu xảy ra xung đột mã nguồn khi pull từ `main`:
1. Tuyệt đối không bấm tự động giải quyết (Resolve) trên giao diện GitHub nếu chưa hiểu rõ đoạn code thay đổi.
2. Thực hiện pull và merge dưới local:
   ```bash
   git checkout feat/<nhánh-của-bạn>
   git pull origin main
   ```
3. Mở VS Code, so sánh từng dòng xung đột giữa `Current Change` và `Incoming Change`.
4. Trao đổi trực tiếp với thành viên viết đoạn code đó để thống nhất phương án giữ lại.
5. Chạy lại `npm run build` hoặc `pytest` để đảm bảo code hoạt động bình thường trước khi commit lại.

---

**LƯU Ý**: Tài liệu này là cơ sở kỹ thuật bắt buộc của dự án Oculide v1. Mọi thành viên vui lòng đọc kỹ, tuân thủ và tham chiếu thường xuyên trong suốt quá trình phát triển để đạt kết quả xuất sắc trong kỳ bảo vệ Capstone 1.
