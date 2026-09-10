from celery import Celery
from kombu import Queue
from core.config import settings

# Xây dựng Redis Broker URL an toàn (hỗ trợ xác thực mật khẩu nếu có)
if settings.REDIS_PASSWORD:
    broker_url = f"redis://:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"
else:
    broker_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"

celery_app = Celery(
    "oculide_tasks",
    broker=broker_url,
    backend=broker_url,
    include=[
        "tasks.grading_tasks",
        "tasks.cleanup_tasks",
        "tasks.ai_proctoring_tasks",
    ]
)

# Cấu hình kiến trúc hàng đợi phân tán chuẩn Enterprise
celery_app.conf.update(
    # Định tuyến hàng đợi chuyên biệt (Dedicated Task Queues)
    task_queues=[
        Queue("grading", routing_key="grading.#"),
        Queue("proctoring", routing_key="proctoring.#"),
        Queue("maintenance", routing_key="maintenance.#"),
        Queue("default", routing_key="default.#"),
    ],
    task_default_queue="default",
    task_routes={
        "tasks.grading_tasks.*": {"queue": "grading"},
        "tasks.ai_proctoring_tasks.*": {"queue": "proctoring"},
        "tasks.cleanup_tasks.*": {"queue": "maintenance"},
    },
    
    # Bảo đảm tính toàn vẹn (Zero Lost Tasks)
    task_acks_late=True,                  # Chỉ xác nhận khi task đã thực thi xong
    task_reject_on_worker_lost=True,      # Đẩy lại vào hàng đợi nếu worker bị chết đột ngột
    worker_prefetch_multiplier=1,         # Mỗi worker chỉ nhận 1 task tại một thời điểm (tránh nghẽn hàng đợi)
    
    # Định dạng dữ liệu an toàn
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Ho_Chi_Minh",
    enable_utc=True,
    result_expires=3600,                  # Kết quả lưu trữ trong Redis 1 giờ
    broker_connection_retry_on_startup=True,
    
    # Tác vụ bảo trì định kỳ (Celery Beat Schedule)
    beat_schedule={
        "auto-close-expired-rooms-every-minute": {
            "task": "tasks.cleanup_tasks.auto_close_expired_rooms",
            "schedule": 60.0,             # Chạy mỗi 60 giây
        },
        "terminate-abandoned-sessions-every-5-mins": {
            "task": "tasks.cleanup_tasks.terminate_abandoned_sessions",
            "schedule": 300.0,            # Chạy mỗi 5 phút
        },
        "prune-old-snapshots-daily": {
            "task": "tasks.cleanup_tasks.prune_old_snapshots",
            "schedule": 86400.0,          # Chạy mỗi 24 giờ
        },
    }
)

# Nạp sẵn các module task đã khai báo trong include
celery_app.loader.import_default_modules()

