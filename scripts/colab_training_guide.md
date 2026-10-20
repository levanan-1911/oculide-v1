# 🚀 Hướng Dẫn Huấn Luyện YOLOv8 Chuyên Dụng Trên Google Colab (Miễn Phí)

Tài liệu này hướng dẫn cách huấn luyện mô hình **YOLOv8 Nano** để phát hiện 5 vật thể gian lận phòng thi:
1. `cell_phone`: Điện thoại di động
2. `earphone`: Tai nghe Bluetooth / AirPods
3. `smartwatch`: Đồng hồ thông minh
4. `book`: Sách vở, tài liệu, phao thi
5. `laptop`: Màn hình phụ

> **Ưu điểm khi chạy trên Google Colab:**
> - Sử dụng GPU Tesla T4 hoàn toàn **miễn phí** của Google.
> - Thời gian huấn luyện chỉ mất khoảng **15 - 20 phút**.
> - **Không tốn dung lượng 4G hay tài nguyên máy tính cá nhân**.

---

### Bước 1: Mở Google Colab
1. Truy cập: [https://colab.research.google.com/](https://colab.research.google.com/)
2. Bấm **New notebook** (Sổ tay mới).
3. Vào menu **Runtime** > **Change runtime type** (Thay đổi loại phần cứng) > Chọn **T4 GPU** > Bấm **Save**.

---

### Bước 2: Cài đặt môi trường
Tạo một ô code mới trên Colab và chạy lệnh:
```bash
!pip install -q ultralytics roboflow
```

---

### Bước 3: Tải Dataset Mẫu hoặc Dataset Roboflow
Nếu bạn có API Key từ Roboflow (tìm kiếm các dataset miễn phí với từ khóa *"cheating exam detection"* hoặc *"phone earphone detection"*):
```python
from roboflow import Roboflow
rf = Roboflow(api_key="YOUR_ROBOFLOW_API_KEY")
project = rf.workspace("workspace-name").project("exam-proctoring")
version = project.version(1)
dataset = version.download("yolov8")
```

Hoặc sử dụng file cấu hình tạo sẵn từ script:
```python
# Tải script từ GitHub hoặc tạo trực tiếp
!git clone https://github.com/levanan-1911/oculide-v1.git
%cd oculide-v1/scripts
```

---

### Bước 4: Chạy Huấn Luyện (Training)
```bash
!python train_exam_yolo.py --epochs 50 --batch 16 --imgsz 640
```

---

### Bước 5: Tải Trọng Số `best.pt` Về Dự Án
Sau khi quá trình huấn luyện hoàn tất (mAP50 đạt $> 0.85$):
1. Nhìn vào thanh quản lý tệp tin bên trái Colab, tìm thư mục:
   `oculide_exam_model/train_run/weights/best.pt` (~6 MB).
2. Click chuột phải vào `best.pt` và chọn **Download** (Tải về).
3. Copy file `best.pt` này đặt vào thư mục dự án trên máy bạn:
   `d:\oculide-v1\ai_workers\models\best.pt`.
4. Trong [ai_workers/detector.py](file:///d:/oculide-v1/ai_workers/detector.py), hệ thống sẽ tự động ưu tiên nạp file trọng số chuyên dụng này!
