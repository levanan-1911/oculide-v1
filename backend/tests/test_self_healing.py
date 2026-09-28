import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from main import app
from core.database import ping_database
from services.docker_sandbox_service import sandbox_service
from tasks.cleanup_tasks import reap_stuck_submissions, reap_orphaned_sandbox_containers

client = TestClient(app)

def test_health_liveness_endpoint():
    """Kiểm tra Liveness probe trả về HTTP 200 OK ngay lập tức"""
    response = client.get("/health/liveness")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"

def test_health_readiness_endpoint():
    """Kiểm tra Readiness probe phản ánh chính xác trạng thái sẵn sàng của CSDL"""
    with patch("core.database.ping_database") as mock_ping:
        # Giả lập CSDL sẵn sàng
        mock_ping.return_value = {"status": "up", "latency_ms": 1.5}
        resp = client.get("/health/readiness")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ready"

        # Giả lập CSDL bị ngắt kết nối
        mock_ping.return_value = {"status": "down", "error": "Connection reset", "latency_ms": 500.0}
        resp = client.get("/health/readiness")
        assert resp.status_code == 503
        assert resp.json()["status"] == "not_ready"

def test_health_deep_check_endpoint():
    """Kiểm tra endpoint /health trả về chi tiết các thành phần hệ thống"""
    with patch("core.database.ping_database") as mock_db, \
         patch("redis.asyncio.Redis.ping") as mock_redis:
        mock_db.return_value = {"status": "up", "latency_ms": 2.1}
        mock_redis.return_value = True

        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("healthy", "degraded")
        assert "components" in data
        assert "database" in data["components"]
        assert "redis" in data["components"]

def test_sandbox_cleanup_orphaned_containers_mock():
    """Kiểm tra Sandbox Reaper quét và tiêu diệt container rác theo nhãn và tuổi thọ"""
    mock_docker_client = MagicMock()
    
    # Giả lập 2 container: 1 cái đang chạy nhưng đã sống 60s, 1 cái đã exited
    c1 = MagicMock()
    c1.status = "running"
    c1.labels = {"app": "oculide-grader", "created_at": "1000"}  # Quá cũ
    
    c2 = MagicMock()
    c2.status = "exited"
    c2.labels = {"app": "oculide-grader", "created_at": "2000"}
    
    mock_docker_client.containers.list.return_value = [c1, c2]
    
    with patch.object(sandbox_service, "docker_client", mock_docker_client), \
         patch("time.time", return_value=1200): # Tuổi của c1 = 200s (> 30s)
        cleaned = sandbox_service.cleanup_orphaned_containers(max_age_seconds=30)
        assert cleaned == 2
        assert c1.remove.called
        assert c2.remove.called

def test_reap_orphaned_sandbox_containers_task():
    """Kiểm tra Celery task reap_orphaned_sandbox_containers ghi log đúng quy trình"""
    with patch.object(sandbox_service, "cleanup_orphaned_containers", return_value=3), \
         patch("tasks.cleanup_tasks.create_system_log") as mock_log:
        result = reap_orphaned_sandbox_containers(max_age_seconds=30)
        assert result == 3
        assert mock_log.called

def test_reap_stuck_submissions_redispatch():
    """Kiểm tra Worker Watchdog phát hiện bài nộp kẹt và re-dispatch khi chưa vượt ngưỡng retry"""
    mock_stuck = [
        {
            "submission_id": 9999,
            "room_id": 1,
            "student_id": 10,
            "question_id": 1,
            "code_content": "print('hello')",
            "language": "python"
        }
    ]
    with patch("database.submission_db.get_stuck_submissions", return_value=mock_stuck), \
         patch("database.submission_db.update_submission_status") as mock_update_status, \
         patch("tasks.grading_tasks.grade_submission.delay") as mock_delay, \
         patch("redis.Redis") as mock_redis_cls:
        
        mock_redis = MagicMock()
        mock_redis.incr.return_value = 1  # Lần retry thứ 1 (<= 2)
        mock_redis_cls.return_value = mock_redis
        
        reaped = reap_stuck_submissions(timeout_seconds=120, max_retries=2)
        assert reaped == 1
        mock_update_status.assert_called_with(9999, "pending")
        mock_delay.assert_called_once_with(
            submission_id=9999,
            question_id=1,
            code_content="print('hello')",
            language="python"
        )

def test_reap_stuck_submissions_max_retries_fail():
    """Kiểm tra Worker Watchdog đánh dấu failed và báo lỗi khi bài nộp vượt quá số lần retry"""
    mock_stuck = [
        {
            "submission_id": 8888,
            "room_id": 1,
            "student_id": 10,
            "question_id": 1,
            "code_content": "while True: pass",
            "language": "python"
        }
    ]
    with patch("database.submission_db.get_stuck_submissions", return_value=mock_stuck), \
         patch("database.submission_db.mark_submission_failed") as mock_mark_failed, \
         patch("redis.Redis") as mock_redis_cls:
        
        mock_redis = MagicMock()
        mock_redis.incr.return_value = 3  # Lần retry thứ 3 (> 2)
        mock_redis_cls.return_value = mock_redis
        
        reaped = reap_stuck_submissions(timeout_seconds=120, max_retries=2)
        assert reaped == 1
        assert mock_mark_failed.called
        assert mock_redis.publish.called  # Bắn event thông báo failed qua ws_updates
