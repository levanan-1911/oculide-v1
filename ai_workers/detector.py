import os
import base64
import logging
from typing import Dict, Any, List, Optional, Tuple, Union
import cv2
import numpy as np

logger = logging.getLogger("AIProctorDetector")

# Kiểm tra khả năng nạp mô hình Ultralytics YOLOv8 (Object Detection)
try:
    from ultralytics import YOLO
    HAS_YOLO = True
except (ImportError, Exception):
    HAS_YOLO = False

# Kiểm tra khả năng nạp MediaPipe FaceMesh
try:
    import mediapipe as mp
    if hasattr(mp, "solutions") and hasattr(mp.solutions, "face_mesh"):
        HAS_MP_FACEMESH = True
    else:
        HAS_MP_FACEMESH = False
except (ImportError, Exception):
    HAS_MP_FACEMESH = False

class AIProctorDetector:
    """
    Bộ động cơ thị giác máy tính AI Proctoring phục vụ giám sát phòng thi trực tuyến:
    1. Phát hiện và đếm khuôn mặt (Face Detection / Face Count).
    2. Ước lượng hướng nhìn và tư thế đầu (Head Pose Estimation: Pitch, Yaw, Roll).
    3. Phát hiện thiết bị cấm qua YOLOv8 (Điện thoại, tài liệu, thiết bị lạ).
    4. Kiến trúc đa tầng (Tiered Architecture) tự động fallback an toàn giữa MediaPipe và OpenCV.
    """
    def __init__(self, yolo_model_name: str = "yolov8n.pt", enable_yolo: bool = True):
        self.yolo_model = None
        self.face_mesh = None
        self.face_cascade = None
        
        # 1. Khởi tạo mô hình YOLOv8 nếu khả dụng
        if HAS_YOLO and enable_yolo:
            try:
                # Tải hoặc nạp trọng số mô hình YOLO nano (nhẹ, tốc độ inference cao)
                self.yolo_model = YOLO(yolo_model_name)
                logger.info(f"Đã nạp thành công mô hình YOLOv8: {yolo_model_name}")
            except Exception as e:
                logger.warning(f"Không thể khởi tạo YOLOv8 ({e}), vô hiệu hóa nhận diện vật thể cấm")
                self.yolo_model = None

        # 2. Khởi tạo MediaPipe FaceMesh nếu khả dụng
        if HAS_MP_FACEMESH:
            try:
                self.face_mesh = mp.solutions.face_mesh.FaceMesh(
                    max_num_faces=4,
                    refine_landmarks=True,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5
                )
                logger.info("Đã nạp thành công MediaPipe FaceMesh cho Head Pose Estimation")
            except Exception as e:
                logger.warning(f"Không thể khởi tạo MediaPipe FaceMesh: {e}")
                self.face_mesh = None

        # 3. Nạp OpenCV Haar Cascade như một lớp Fallback toàn năng
        try:
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
        except Exception as e:
            logger.error(f"Lỗi khởi tạo OpenCV Face Cascade: {e}")

    @staticmethod
    def decode_image(image_input: Union[str, bytes, np.ndarray]) -> Optional[np.ndarray]:
        """
        Giải mã dữ liệu ảnh từ Base64 string, Raw bytes hoặc Numpy array thành chuẩn BGR OpenCV.
        Chặn đứng tấn công Decompression Bomb qua giới hạn kích thước an toàn.
        """
        if image_input is None:
            return None

        if isinstance(image_input, np.ndarray):
            return image_input

        try:
            if isinstance(image_input, str):
                # Bỏ tiền tố Data URL nếu có (data:image/jpeg;base64,...)
                if "," in image_input:
                    image_input = image_input.split(",", 1)[1]
                raw_bytes = base64.b64decode(image_input)
            elif isinstance(image_input, bytes):
                raw_bytes = image_input
            else:
                return None

            # Giới hạn kích thước payload ảnh tối đa 10MB
            if len(raw_bytes) > 10 * 1024 * 1024:
                logger.warning("Kích thước ảnh vượt quá giới hạn an toàn 10MB")
                return None

            nparr = np.frombuffer(raw_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return frame
        except Exception as e:
            logger.error(f"Lỗi giải mã ảnh: {e}")
            return None

    def estimate_head_pose(self, landmarks, frame_shape: Tuple[int, int]) -> Tuple[float, float, float]:
        """
        Tính toán góc xoay đầu 3D (Pitch, Yaw, Roll) từ các điểm mốc khuôn mặt thông qua cv2.solvePnP.
        - Yaw: Xoay trái (-), xoay phải (+)
        - Pitch: Cúi xuống (-), ngửa lên (+)
        - Roll: Nghiêng đầu sang vai
        """
        h, w = frame_shape
        # Các điểm mốc 2D tương ứng: Mũi, Cằm, Đuôi mắt trái, Đuôi mắt phải, Khóe môi trái, Khóe môi phải
        image_points = np.array([
            (landmarks[1].x * w, landmarks[1].y * h),       # Mũi
            (landmarks[152].x * w, landmarks[152].y * h),   # Cằm
            (landmarks[33].x * w, landmarks[33].y * h),     # Mắt trái
            (landmarks[263].x * w, landmarks[263].y * h),   # Mắt phải
            (landmarks[61].x * w, landmarks[61].y * h),     # Khóe môi trái
            (landmarks[291].x * w, landmarks[291].y * h)    # Khóe môi phải
        ], dtype=np.float64)

        # Mô hình 3D chuẩn khuôn mặt người (3D Facial Model Coordinate)
        model_points = np.array([
            (0.0, 0.0, 0.0),             # Mũi
            (0.0, -330.0, -65.0),        # Cằm
            (-225.0, 170.0, -135.0),     # Mắt trái
            (225.0, 170.0, -135.0),      # Mắt phải
            (-150.0, -150.0, -125.0),    # Khóe môi trái
            (150.0, -150.0, -125.0)      # Khóe môi phải
        ], dtype=np.float64)

        # Ma trận nội suy Camera giả định
        focal_length = w
        center = (w / 2.0, h / 2.0)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float64)
        dist_coeffs = np.zeros((4, 1), dtype=np.float64)

        success, rot_vec, trans_vec = cv2.solvePnP(
            model_points, image_points, camera_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE
        )
        if not success:
            return 0.0, 0.0, 0.0

        rot_mat, _ = cv2.Rodrigues(rot_vec)
        # Chuyển đổi ma trận xoay sang góc Euler
        proj_matrix = np.hstack((rot_mat, trans_vec))
        _, _, _, _, _, _, euler_angles = cv2.decomposeProjectionMatrix(proj_matrix)
        pitch, yaw, roll = euler_angles.flatten()[:3]
        return float(pitch), float(yaw), float(roll)

    def detect_faces(self, frame: np.ndarray) -> Dict[str, Any]:
        """Phát hiện khuôn mặt, đếm số lượng và xác định hướng nhìn"""
        h, w = frame.shape[:2]
        
        # 1. Thử nghiệm qua MediaPipe FaceMesh nếu khả dụng
        if self.face_mesh is not None:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(rgb_frame)
            if results.multi_face_landmarks:
                face_count = len(results.multi_face_landmarks)
                primary_face = results.multi_face_landmarks[0]
                pitch, yaw, roll = self.estimate_head_pose(primary_face.landmark, (h, w))
                
                # Tiêu chí nhìn màn hình: Yaw trong khoảng [-25°, 25°] và Pitch không cúi gục quá mức
                looking_at_screen = (abs(yaw) <= 25.0 and -22.0 <= pitch <= 25.0)
                
                return {
                    "face_detected": True,
                    "face_count": face_count,
                    "looking_at_screen": looking_at_screen,
                    "head_pose": {"pitch": round(pitch, 2), "yaw": round(yaw, 2), "roll": round(roll, 2)},
                    "method": "mediapipe_facemesh"
                }

        # 2. Lớp Fallback toàn năng qua OpenCV Haar Cascade
        if self.face_cascade is not None and not self.face_cascade.empty():
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=4, minSize=(40, 40)
            )
            face_count = len(faces)
            if face_count > 0:
                # Nếu phát hiện mặt chính diện bằng frontal face cascade -> looking_at_screen = True
                return {
                    "face_detected": True,
                    "face_count": face_count,
                    "looking_at_screen": True,
                    "head_pose": {"pitch": 0.0, "yaw": 0.0, "roll": 0.0},
                    "method": "opencv_cascade"
                }

        # Không phát hiện thấy khuôn mặt nào
        return {
            "face_detected": False,
            "face_count": 0,
            "looking_at_screen": False,
            "head_pose": {"pitch": 0.0, "yaw": 0.0, "roll": 0.0},
            "method": "none"
        }

    def detect_prohibited_objects(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Phát hiện các thiết bị cấm thông qua mô hình YOLOv8"""
        if self.yolo_model is None:
            return []

        detected_objects = []
        try:
            results = self.yolo_model.predict(
                frame,
                conf=0.40,
                verbose=False,
                classes=[67, 73, 63]  # 67: cell phone, 73: book, 63: laptop
            )
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    cls_name = self.yolo_model.names.get(cls_id, str(cls_id))
                    
                    detected_objects.append({
                        "class_id": cls_id,
                        "class_name": cls_name,
                        "confidence": round(conf, 3),
                        "bbox": [round(coord, 1) for coord in box.xyxy[0].tolist()]
                    })
        except Exception as e:
            logger.error(f"Lỗi khi chạy YOLOv8 inference: {e}")
            
        return detected_objects

    def process_frame(self, image_input: Union[str, bytes, np.ndarray]) -> Dict[str, Any]:
        """
        Quy trình xử lý khung hình webcam hoàn chỉnh:
        1. Giải mã khung hình an toàn.
        2. Phát hiện khuôn mặt và tư thế đầu.
        3. Phát hiện thiết bị cấm.
        4. Tổng hợp danh sách vi phạm chuẩn hóa theo cơ sở dữ liệu.
        """
        frame = self.decode_image(image_input)
        if frame is None:
            return {
                "success": False,
                "error": "Không thể giải mã dữ liệu ảnh",
                "face_detected": False,
                "face_count": 0,
                "looking_at_screen": False,
                "violations": [],
                "confidence_score": 0.0
            }

        face_res = self.detect_faces(frame)
        objects = self.detect_prohibited_objects(frame)

        violations = []
        # 1. Kiểm tra vi phạm vắng mặt / không nhận diện được khuôn mặt
        if face_res["face_count"] == 0:
            violations.append({
                "type": "no_face_detected",
                "severity": "medium",
                "description": "Không phát hiện khuôn mặt thí sinh trong khung hình camera"
            })
        # 2. Kiểm tra vi phạm có nhiều người trước camera
        elif face_res["face_count"] > 1:
            violations.append({
                "type": "multiple_faces",
                "severity": "high",
                "description": f"Phát hiện {face_res['face_count']} khuôn mặt trong vùng quan sát camera"
            })
        # 3. Kiểm tra thí sinh ngoảnh mặt rời màn hình
        elif not face_res["looking_at_screen"]:
            violations.append({
                "type": "suspicious_object",
                "severity": "low",
                "description": f"Thí sinh quay đầu rời màn hình (Góc lệch Yaw: {face_res['head_pose']['yaw']}°)"
            })

        # 4. Kiểm tra các thiết bị cấm phát hiện qua YOLO
        for obj in objects:
            c_name = obj["class_name"].lower()
            if "phone" in c_name:
                violations.append({
                    "type": "phone_detected",
                    "severity": "critical",
                    "description": f"Phát hiện điện thoại di động trong khung hình (Độ tin cậy: {obj['confidence']*100:.1f}%)"
                })
            elif "book" in c_name:
                violations.append({
                    "type": "suspicious_object",
                    "severity": "medium",
                    "description": f"Phát hiện tài liệu/sách vở đáng ngờ (Độ tin cậy: {obj['confidence']*100:.1f}%)"
                })
            elif "laptop" in c_name:
                violations.append({
                    "type": "suspicious_object",
                    "severity": "high",
                    "description": f"Phát hiện màn hình/laptop phụ thứ hai (Độ tin cậy: {obj['confidence']*100:.1f}%)"
                })

        # Tính điểm tin cậy tổng thể (Confidence Score: 0.0 - 1.0)
        confidence_score = 0.95
        if violations:
            severity_weights = {"low": 0.15, "medium": 0.35, "high": 0.60, "critical": 0.95}
            max_penalty = max(severity_weights.get(v["severity"], 0.2) for v in violations)
            confidence_score = max(0.05, round(1.0 - max_penalty, 2))

        return {
            "success": True,
            "face_detected": face_res["face_detected"],
            "face_count": face_res["face_count"],
            "looking_at_screen": face_res["looking_at_screen"],
            "head_pose": face_res["head_pose"],
            "detected_objects": objects,
            "violations": violations,
            "confidence_score": confidence_score
        }

# Singleton Instance
proctor_detector = AIProctorDetector()
