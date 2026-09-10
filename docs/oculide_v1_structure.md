# 📂 Cấu Trúc Thư Mục Khung Dự Án Oculide v1 (IEEE 830 Specification)

Tài liệu này mô tả chi tiết vị trí và chức năng của từng thư mục trong hệ thống **Oculide v1** (`d:\oculide-v1`).

---

## 🌳 Sơ Đồ Thư Mục Dự Án

```text
oculide-v1/
├── 📂 backend/                      # Backend Core API (FastAPI, Python 3.11)
│   ├── 📂 api/                      # REST API Endpoints (auth, admin, rooms, sessions, questions, submissions, violations, chat, livekit)
│   ├── 📂 core/                     # Security, JWT Authentication, RBAC Middleware
│   ├── 📂 models/                   # SQLAlchemy ORM Entities (User, Room, Question, Submission, Violation...)
│   ├── 📂 schemas/                  # Pydantic Request/Response DTO Validation Schemas
│   ├── 📂 database/                 # Layer thao tác CSDL PostgreSQL (Repositories / DAL)
│   ├── 📂 services/                 # Business logic services (LiveKit Integration, Docker SDK)
│   ├── 📂 tasks/                    # Celery Async Background Tasks (AI proctoring, Auto-grading)
│   ├── 📂 websocket/                # WebSocket Connection Manager & Real-time Handlers
│   └── 📂 tests/                    # Backend Unit & Integration Tests
│
├── 📂 frontend/                     # Frontend Web App (Next.js 14, React, TailwindCSS, TypeScript)
│   ├── 📂 public/                   # Static Assets (images, icons, fonts)
│   └── 📂 src/
│       ├── 📂 app/                  # Next.js 14 App Router Pages
│       │   ├── 📂 admin/            # Dashboard Quản trị hệ thống & Phân quyền
│       │   ├── 📂 exam/             # Interface làm bài thi & Monaco Online IDE
│       │   ├── 📂 instructor/       # Portal Giảng viên (Ra đề, Quản lý phòng)
│       │   ├── 📂 join/             # Trang tham gia phòng bằng Room Code
│       │   ├── 📂 login/            # Trang Đăng nhập
│       │   ├── 📂 proctor/          # Dashboard Giám thị (Panoptic Grid & AI Alerts)
│       │   ├── 📂 profile/          # Trang Thông tin cá nhân
│       │   └── 📂 register/         # Trang Đăng ký
│       ├── 📂 components/           # Reusable UI Components
│       │   ├── 📂 ui/               # Base Primitive UI Elements
│       │   └── 📂 common/           # Common Layout & Navigation Components
│       ├── 📂 hooks/                # Custom React Hooks (useAuth, useLiveKit, useWebSocket)
│       ├── 📂 store/                # Global State Management (Zustand / Context)
│       ├── 📂 utils/                # API Client, Constants, Helpers
│       └── 📂 __tests__/            # Frontend Tests
│
├── 📂 ai_workers/                   # AI Proctoring Engine (PyTorch, YOLOv8, MediaPipe, OpenCV)
│   ├── 📂 models/                   # Lưu trữ Pre-trained weights (yolov8n.pt, MediaPipe face landmarker)
│   └── 📂 utils/                    # Preprocessing & Frame conversion utilities
│
├── 📂 sandbox/                      # Isolated Code Execution Engine (Docker Sandbox)
│   └── 📂 runtimes/                 # Cấu hình container runner từng ngôn ngữ
│       ├── 📂 python/               # Runtime môi trường Python
│       ├── 📂 cpp/                  # Runtime môi trường C++ (GCC/G++)
│       └── 📂 java/                 # Runtime môi trường Java (OpenJDK)
│
├── 📂 livekit/                      # WebRTC Real-time Video Streaming Infrastructure
│
├── 📂 database/                     # PostgreSQL Database Schemas & Migration Management
│   ├── 📂 migrations/               # DDL & Schema Migration SQL Scripts
│   └── 📂 seeds/                    # Khởi tạo dữ liệu mẫu (Default Admin, Sample Testcases)
│
├── 📂 nginx/                        # Local & Production Reverse Proxy Routing
│   ├── 📂 conf.d/                   # Cấu hình Nginx routing (API, WebSocket, LiveKit WebRTC, Frontend)
│   └── 📂 ssl/                      # Lưu trữ SSL/TLS Certificates
│
├── 📂 scripts/                      # Utility scripts (Deployment, Database Seed, Backup, Docker helper)
│
├── 📂 docs/                         # Tài liệu hệ thống & IEEE 830 Specification
│   ├── 📂 diagrams/                 # Architecture, BFD, Context & ERD Diagrams
│   └── 📂 api/                      # OpenAPI / Swagger Specifications
│
├── 📂 changelogs/                # Nhật ký phát triển (bổ sung, sửa đổi, thêm/xóa file)
│
└── 📂 .github/
    └── 📂 workflows/                # CI/CD Automated Testing & Deployment Pipelines

├── CHANGELOG.md                     # Tổng kết phiên bản theo chuẩn Keep a Changelog
```

