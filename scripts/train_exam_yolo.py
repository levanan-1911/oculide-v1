"""
Oculide-v1: Script Huấn Luyện Mô Hình YOLOv8 Chuyên Dụng Cho Phòng Thi
======================================================================
Mục tiêu: Huấn luyện Transfer Learning mô hình YOLOv8 Nano trên tập dữ liệu vật thể cấm:
1. cell_phone: Điện thoại di động
2. earphone: Tai nghe có dây, tai nghe Bluetooth / AirPods
3. smartwatch: Đồng hồ thông minh
4. book: Sách, tài liệu, phao thi thu nhỏ
5. laptop: Màn hình / laptop phụ thứ hai

Hướng dẫn chạy trên Google Colab (GPU Tesla T4 Miễn Phí):
---------------------------------------------------------
1. Mở https://colab.research.google.com
2. Chọn Runtime > Change runtime type > T4 GPU
3. Chạy lệnh: !pip install ultralytics roboflow
4. Tải file này lên và chạy: python train_exam_yolo.py
"""

import os
import argparse
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("OculideYOLOTrainer")

def create_sample_data_yaml(yaml_path: str = "exam_dataset.yaml"):
    """Tạo file cấu hình dataset chuẩn cho bài toán giám sát phòng thi"""
    content = """# Oculide-v1 Exam Proctoring Dataset Configuration
path: ./dataset
train: images/train
val: images/val
test: images/test

# 5 lớp vật thể cấm trọng tâm
names:
  0: cell_phone
  1: earphone
  2: smartwatch
  3: book
  4: laptop
"""
    with open(yaml_path, "w", encoding="utf-8") as f:
        f.write(content)
    logger.info(f"Đã tạo file cấu hình dataset tại: {yaml_path}")

def train_model(
    data_yaml: str = "exam_dataset.yaml",
    base_model: str = "yolov8n.pt",
    epochs: int = 50,
    imgsz: int = 640,
    batch_size: int = 16,
    project_name: str = "oculide_exam_model",
    export_onnx: bool = True
):
    try:
        from ultralytics import YOLO
    except ImportError:
        logger.error("Thư viện 'ultralytics' chưa được cài đặt. Hãy chạy: pip install ultralytics")
        return

    logger.info(f"Bắt đầu huấn luyện mô hình dựa trên: {base_model}")
    logger.info(f"Cấu hình: Epochs={epochs}, ImageSize={imgsz}, BatchSize={batch_size}")

    # 1. Nạp mô hình pre-trained
    model = YOLO(base_model)

    # 2. Huấn luyện mô hình
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch_size,
        patience=15,             # Dừng sớm nếu không cải thiện sau 15 epochs
        save=True,
        save_period=10,
        project=project_name,
        name="train_run",
        verbose=True,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        dropout=0.1
    )

    logger.info("Huấn luyện hoàn tất!")

    # 3. Đánh giá chất lượng mô hình trên tập kiểm thử (Validation)
    metrics = model.val()
    logger.info(f"Kết quả mAP50: {metrics.box.map50:.4f}")
    logger.info(f"Kết quả mAP50-95: {metrics.box.map:.4f}")

    # 4. Xuất mô hình sang ONNX phục vụ chạy CPU tốc độ cao
    if export_onnx:
        logger.info("Đang xuất mô hình sang định dạng ONNX...")
        onnx_path = model.export(format="onnx", dynamic=False, simplify=True)
        logger.info(f"Mô hình ONNX đã xuất tại: {onnx_path}")

    logger.info(f"Trọng số tối ưu nhất được lưu tại: {project_name}/train_run/weights/best.pt")
    logger.info("Bạn có thể copy file 'best.pt' này vào thư mục 'ai_workers/models/best.pt' của dự án Oculide-v1.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Oculide YOLOv8 Training Script")
    parser.add_argument("--data", type=str, default="exam_dataset.yaml", help="Đường dẫn file data.yaml")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Trọng số gốc (yolov8n.pt hoặc yolov8s.pt)")
    parser.add_argument("--epochs", type=int, default=50, help="Số lượt huấn luyện (Epochs)")
    parser.add_argument("--batch", type=int, default=16, help="Kích thước batch")
    parser.add_argument("--imgsz", type=int, default=640, help="Kích thước ảnh")
    parser.add_argument("--create-yaml", action="store_true", help="Tự động tạo file mẫu exam_dataset.yaml")

    args = parser.parse_args()

    if args.create_yaml or not os.path.exists(args.data):
        create_sample_data_yaml(args.data)

    train_model(
        data_yaml=args.data,
        base_model=args.model,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch_size=args.batch
    )
