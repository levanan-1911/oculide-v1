import pytest
from services.docker_sandbox_service import sandbox_service
from celery_app import celery_app

def test_normalize_and_compare_output():
    # 1. Chuẩn hóa khoảng trắng và ngắt dòng
    assert sandbox_service.compare_output("hello world\n", "hello world") is True
    assert sandbox_service.compare_output("line1\r\nline2\r\n", "line1\nline2") is True
    assert sandbox_service.compare_output("  42  \n\n", "42") is True
    
    # 2. So khớp số học sai số thực (Float Tolerance <= 1e-4)
    assert sandbox_service.compare_output("3.14159", "3.1416") is True
    assert sandbox_service.compare_output("100.0000", "100.0") is True
    assert sandbox_service.compare_output("3.14", "3.15") is False
    
    # 3. So khớp dạng token phân cách bởi khoảng trắng / dòng
    assert sandbox_service.compare_output("1  2 \n 3", "1 2 3") is True
    assert sandbox_service.compare_output("1.00 2.50\n", "1.0 2.50005") is True
    assert sandbox_service.compare_output("hello world", "hello earth") is False

def test_python_code_execution_ac():
    code = """
a = int(input())
b = int(input())
print(a + b)
"""
    result = sandbox_service.execute_code(code, "python", stdin_data="15\n27\n", time_limit=5)
    assert result["status"] == "AC"
    assert result["is_passed"] is True
    assert result["stdout"].strip() == "42"
    assert result["error"] is None
    assert result["execution_ms"] > 0

def test_python_runtime_error():
    code = "print(1 / 0)"
    result = sandbox_service.execute_code(code, "python", time_limit=5)
    assert result["status"] == "RTE"
    assert result["is_passed"] is False
    assert "ZeroDivisionError" in result["stderr"]

def test_python_time_limit_exceeded():
    code = "import time\ntime.sleep(5)"
    # Giới hạn 1 giây
    result = sandbox_service.execute_code(code, "python", time_limit=1)
    assert result["status"] == "TLE"
    assert result["is_passed"] is False

def test_cpp_code_execution():
    code = """
#include <iostream>
int main() {
    int x;
    if (std::cin >> x) {
        std::cout << x * 2;
    }
    return 0;
}
"""
    result = sandbox_service.execute_code(code, "cpp", stdin_data="21", time_limit=10)
    assert result["status"] == "AC"
    assert result["is_passed"] is True
    assert result["stdout"].strip() == "42"

def test_cpp_compilation_error():
    code = """
#include <iostream>
int main() {
    invalid_syntax_symbol_here;
    return 0;
}
"""
    result = sandbox_service.execute_code(code, "cpp", time_limit=5)
    assert result["status"] == "CE"
    assert result["is_passed"] is False
    assert result["error"] is not None

def test_celery_task_registration():
    # Kiểm tra Celery App đã đăng ký các tác vụ phân tán
    registered_tasks = celery_app.tasks.keys()
    assert "tasks.grading_tasks.grade_submission" in registered_tasks
    assert "tasks.cleanup_tasks.auto_close_expired_rooms" in registered_tasks
    assert "tasks.cleanup_tasks.terminate_abandoned_sessions" in registered_tasks
    assert "tasks.cleanup_tasks.prune_old_snapshots" in registered_tasks
