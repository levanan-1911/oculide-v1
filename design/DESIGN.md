# Design System: Oculide

## 1. Color Palette (Semantic Tokens)
- **Primary / Brand**: Blue Palette
  - `brand-primary`: `#2563eb` (`blue-600`) - Nút chính, hành động quan trọng, liên kết kích hoạt.
  - `brand-hover`: `#1d4ed8` (`blue-700`).
  - `brand-subtle`: `#eff6ff` (`blue-50`) - Nền thẻ chọn, badge thông tin nhẹ.
  - `brand-border`: `#bfdbfe` (`blue-200`).
- **Neutrals / Surfaces**: Slate Palette
  - `surface-app`: `#f4f7f9` - Nền chính toàn trang.
  - `surface-card`: `#ffffff` - Nền card/panel dữ liệu.
  - `surface-subtle`: `#f8fafc` (`slate-50`) - Nền header bảng, ô input mặc định.
  - `border-default`: `#e2e8f0` (`slate-200`) - Đường viền tiêu chuẩn cho card và bảng.
  - `border-divider`: `#f1f5f9` (`slate-100`) - Đường phân tách các dòng trong bảng.
  - `text-primary`: `#0f172a` (`slate-900`) - Tiêu đề, số liệu KPI quan trọng.
  - `text-secondary`: `#334155` (`slate-700`) - Nội dung chính, nhãn form.
  - `text-muted`: `#64748b` (`slate-500`) - Chú thích phụ, metadata, timestamp.
- **Semantic Status Accents**:
  - `Live / Ongoing`: Red Palette (`#dc2626` / `red-600`, nền `red-50`, viền `red-200`).
  - `Scheduled / Upcoming`: Blue Palette (`#2563eb` / `blue-600`, nền `blue-50`, viền `blue-200`).
  - `Completed`: Emerald Palette (`#059669` / `emerald-600`, nền `emerald-50`, viền `emerald-200`).
  - `Warning / Attention`: Amber Palette (`#d97706` / `amber-600`, nền `amber-50`, viền `amber-200`).

## 2. Typography Scale (Tailwind 3.4 Standards)
- **Font Stack**:
  - `UI Body`: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
  - `Code / Identifiers`: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`
- **Scale**:
  - `Title Screen`: `text-2xl` (`1.5rem`), font-black hoặc font-extrabold, tracking-tight.
  - `Card Header / Section`: `text-base` hoặc `text-sm`, font-bold.
  - `Body / Cell Text`: `text-xs` (`0.8125rem`) đến `text-sm` (`0.875rem`), font-medium.
  - `Sub-caption / Badge`: `text-[11px]` hoặc `text-xs`, font-semibold.
  - `Mã định danh (Code, PIN, MSSV)`: `font-mono`, `tabular-nums`.

## 3. Spatial System & Density
- **Control Heights (Quy chuẩn chiều cao nút bấm & input)**:
  - Form inputs, search boxes, dropdowns chính: Chuẩn `h-10` (`40px`) hoặc `h-11` (`44px`).
  - Action buttons trong dòng bảng: `h-8` (`32px`) hoặc `h-9` (`36px`).
- **Border Radius**:
  - Container / Card lớn: `rounded-2xl` (`16px`).
  - Input, Button, Modal: `rounded-xl` (`12px`).
  - Badge, Tag: `rounded-lg` (`8px`) hoặc `rounded-full`.
- **Card-in-Card Elimination**:
  - Hạn chế viền xám lồng viền xám. Thay vào đó, phân biệt khối nội dung con bằng màu nền nhẹ (`bg-slate-50` hoặc `bg-blue-50/40`) mà không cần thêm lớp `border` phụ.

