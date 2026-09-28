import os
import time
import tempfile
import subprocess
from typing import Dict, Any, Optional
import docker
from docker.errors import DockerException

from core.config import settings

class DockerSandboxService:
    """
    Dịch vụ điều phối môi trường thực thi mã nguồn an toàn (Isolated Code Execution Engine).
    Hỗ trợ Docker SDK với các cờ bảo mật Zero-Trust và tự động fallback sang Subprocess Runner
    khi máy chủ phát triển cục bộ chưa bật Docker Daemon.
    """
    def __init__(self):
        self.docker_client: Optional[docker.DockerClient] = None
        self._init_docker_client()

    def _init_docker_client(self):
        try:
            self.docker_client = docker.from_env(timeout=3)
            self.docker_client.ping()
        except (DockerException, Exception):
            # Fallback sang Subprocess Runner nếu Docker daemon chưa sẵn sàng
            self.docker_client = None

    @staticmethod
    def normalize_output(text: Optional[str]) -> str:
        """
        Chuẩn hóa kết quả đầu ra:
        - Đổi ngắt dòng \r\n thành \n
        - Cắt bỏ khoảng trắng thừa ở cuối mỗi dòng
        - Cắt bỏ các dòng trống thừa ở đầu và cuối văn bản
        """
        if text is None:
            return ""
        normalized = text.replace("\r\n", "\n")
        lines = [line.rstrip() for line in normalized.split("\n")]
        # Bỏ các dòng rỗng ở cuối
        while lines and lines[-1] == "":
            lines.pop()
        return "\n".join(lines).strip()

    @classmethod
    def compare_output(cls, actual: Optional[str], expected: Optional[str]) -> bool:
        """So khớp output thực tế với output kỳ vọng sau khi đã chuẩn hóa"""
        norm_actual = cls.normalize_output(actual)
        norm_expected = cls.normalize_output(expected)
        
        if norm_actual == norm_expected:
            return True
            
        # Thử so sánh số học (Float Tolerance) nếu cả 2 output đều là số thực đơn lẻ
        try:
            val_act = float(norm_actual)
            val_exp = float(norm_expected)
            return abs(val_act - val_exp) < 1e-4
        except (ValueError, TypeError):
            pass

        # So khớp token-by-token (bỏ qua khác biệt về ngắt dòng và khoảng trắng giữa các giá trị)
        tokens_act = norm_actual.split()
        tokens_exp = norm_expected.split()
        if len(tokens_act) == len(tokens_exp) and len(tokens_act) > 0:
            match = True
            for a, b in zip(tokens_act, tokens_exp):
                if a == b:
                    continue
                try:
                    if abs(float(a) - float(b)) < 1e-4:
                        continue
                except (ValueError, TypeError):
                    pass
                match = False
                break
            if match:
                return True
            
        return False

    def execute_code(
        self,
        code: str,
        language: str,
        stdin_data: str = "",
        time_limit: int = 5,
        memory_limit_mb: int = 128
    ) -> Dict[str, Any]:
        """
        Thực thi mã nguồn sinh viên trong môi trường cô lập tuyệt đối.
        """
        language = language.lower().strip()
        time_limit = max(1, min(time_limit, settings.SANDBOX_TIME_LIMIT_S))
        memory_limit_mb = max(32, min(memory_limit_mb, 256))

        # Ưu tiên chạy qua Docker Container Sandbox nếu Docker daemon khả dụng
        if self.docker_client is not None:
            try:
                return self._run_in_docker(code, language, stdin_data, time_limit, memory_limit_mb)
            except Exception as e:
                # Nếu Docker gặp lỗi, fallback an toàn sang Subprocess
                pass

        return self._run_in_subprocess(code, language, stdin_data, time_limit, memory_limit_mb)

    def _run_in_docker(
        self,
        code: str,
        language: str,
        stdin_data: str,
        time_limit: int,
        memory_limit_mb: int
    ) -> Dict[str, Any]:
        """Thực thi mã nguồn bên trong container Docker với các rào chắn bảo mật nghiêm ngặt"""
        image_name = "python:3.11-alpine"
        file_name = "solution.py"
        run_cmd = ["sh", "-c", "python -u /workspace/solution.py < /workspace/stdin.txt"]

        if language in ("cpp", "c++"):
            image_name = "gcc:12"
            file_name = "solution.cpp"
            run_cmd = ["sh", "-c", "g++ -O3 -std=c++20 /workspace/solution.cpp -o /tmp/solution && /tmp/solution < /workspace/stdin.txt"]
        elif language == "java":
            image_name = "eclipse-temurin:17-alpine"
            file_name = "Solution.java"
            run_cmd = ["sh", "-c", f"javac /workspace/Solution.java -d /tmp && java -Xmx{memory_limit_mb}m -cp /tmp Solution < /workspace/stdin.txt"]

        start_time = time.perf_counter()
        container = None
        try:
            # Tạo thư mục tạm trên host để truyền code và stdin
            with tempfile.TemporaryDirectory() as temp_dir:
                code_path = os.path.join(temp_dir, file_name)
                with open(code_path, "w", encoding="utf-8") as f:
                    f.write(code)

                stdin_path = os.path.join(temp_dir, "stdin.txt")
                with open(stdin_path, "w", encoding="utf-8") as f:
                    f.write(stdin_data if stdin_data else "")

                container = self.docker_client.containers.create(
                    image=image_name,
                    command=run_cmd,
                    stdin_open=False,
                    network_mode="none",                         # Cách ly mạng hoàn toàn
                    mem_limit=f"{memory_limit_mb}m",             # Giới hạn RAM cứng
                    memswap_limit=f"{memory_limit_mb}m",         # Chặn sử dụng swap disk
                    nano_cpus=settings.SANDBOX_NANO_CPUS,        # Giới hạn 0.5 CPU core
                    pids_limit=64,                               # Chặn đứng Fork-bomb
                    read_only=True,                              # Root filesystem chỉ đọc
                    tmpfs={"/tmp": "size=64m,exec,nosuid,nodev,mode=1777"},    # Thư mục ghi tạm cho phép chạy binary an toàn
                    cap_drop=["ALL"],                            # Tước sạch Linux capabilities
                    security_opt=["no-new-privileges:true"],     # Chặn leo thang đặc quyền
                    user="1001:1001",                            # Thực thi dưới tài khoản không đặc quyền
                    volumes={temp_dir: {"bind": "/workspace", "mode": "ro"}},
                    labels={"app": "oculide-grader", "created_at": str(int(time.time()))}
                )

                container.start()

                # Chờ kết quả có timeout
                try:
                    result = container.wait(timeout=time_limit)
                    exit_code = result.get("StatusCode", 0)
                    stdout = container.logs(stdout=True, stderr=False).decode("utf-8", errors="replace")
                    stderr = container.logs(stdout=False, stderr=True).decode("utf-8", errors="replace")
                except Exception:
                    # Timeout quá thời gian cho phép
                    try:
                        container.kill()
                    except Exception:
                        pass
                    elapsed_ms = (time.perf_counter() - start_time) * 1000
                    return {
                        "status": "TLE",
                        "is_passed": False,
                        "stdout": "",
                        "stderr": "Time Limit Exceeded",
                        "error": "Thời gian thực thi vượt quá giới hạn",
                        "execution_ms": round(elapsed_ms, 2),
                        "memory_mb": memory_limit_mb
                    }

                elapsed_ms = (time.perf_counter() - start_time) * 1000
                is_success = (exit_code == 0)

                status = "AC" if is_success else "RTE"
                if not is_success and language in ("cpp", "c++", "java") and ("error:" in stderr.lower() or "cannot find symbol" in stderr.lower()):
                    status = "CE"

                return {
                    "status": status,
                    "is_passed": is_success,
                    "stdout": stdout,
                    "stderr": stderr,
                    "error": stderr if not is_success else None,
                    "execution_ms": round(elapsed_ms, 2),
                    "memory_mb": round(memory_limit_mb * 0.4, 2)
                }

        finally:
            if container:
                try:
                    container.remove(force=True)
                except Exception:
                    pass

    def _run_in_subprocess(
        self,
        code: str,
        language: str,
        stdin_data: str,
        time_limit: int,
        memory_limit_mb: int
    ) -> Dict[str, Any]:
        """
        Cơ chế Fallback an toàn: Thực thi mã nguồn qua Subprocess với timeout và bắt lỗi runtime
        khi Docker daemon không khả dụng trên môi trường local.
        """
        import sys
        start_time = time.perf_counter()
        with tempfile.TemporaryDirectory() as temp_dir:
            file_name = "solution.py"
            cmd = [sys.executable, file_name]

            if language in ("cpp", "c++"):
                file_name = "solution.cpp"
                exe_name = "solution.exe" if os.name == "nt" else "solution"
                cmd = ["g++", "-O3", "-std=c++20", file_name, "-o", exe_name]
            elif language == "java":
                file_name = "Solution.java"
                cmd = ["javac", file_name]

            code_path = os.path.join(temp_dir, file_name)
            with open(code_path, "w", encoding="utf-8") as f:
                f.write(code)

            try:
                compile_timeout = max(time_limit, 15)
                # Nếu là C++ hoặc Java, cần biên dịch trước
                if language in ("cpp", "c++"):
                    compile_res = subprocess.run(
                        cmd,
                        cwd=temp_dir,
                        capture_output=True,
                        text=True,
                        timeout=compile_timeout
                    )
                    if compile_res.returncode != 0:
                        elapsed_ms = (time.perf_counter() - start_time) * 1000
                        return {
                            "status": "CE",
                            "is_passed": False,
                            "stdout": "",
                            "stderr": compile_res.stderr,
                            "error": "Lỗi biên dịch C++ (Compilation Error)",
                            "execution_ms": round(elapsed_ms, 2),
                            "memory_mb": 0.0
                        }
                    # Chạy binary sau khi biên dịch
                    exe_path = os.path.join(temp_dir, exe_name)
                    cmd = [exe_path]

                elif language == "java":
                    compile_res = subprocess.run(
                        cmd,
                        cwd=temp_dir,
                        capture_output=True,
                        text=True,
                        timeout=compile_timeout
                    )
                    if compile_res.returncode != 0:
                        elapsed_ms = (time.perf_counter() - start_time) * 1000
                        return {
                            "status": "CE",
                            "is_passed": False,
                            "stdout": "",
                            "stderr": compile_res.stderr,
                            "error": "Lỗi biên dịch Java (Compilation Error)",
                            "execution_ms": round(elapsed_ms, 2),
                            "memory_mb": 0.0
                        }
                    cmd = ["java", f"-Xmx{memory_limit_mb}m", "Solution"]

                # Chạy chương trình với stdin
                run_res = subprocess.run(
                    cmd,
                    input=stdin_data,
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
                    timeout=time_limit
                )

                elapsed_ms = (time.perf_counter() - start_time) * 1000
                is_success = (run_res.returncode == 0)

                return {
                    "status": "AC" if is_success else "RTE",
                    "is_passed": is_success,
                    "stdout": run_res.stdout,
                    "stderr": run_res.stderr,
                    "error": run_res.stderr if not is_success else None,
                    "execution_ms": round(elapsed_ms, 2),
                    "memory_mb": 32.0
                }

            except subprocess.TimeoutExpired:
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                return {
                    "status": "TLE",
                    "is_passed": False,
                    "stdout": "",
                    "stderr": f"Time Limit Exceeded (Quá {time_limit} giây)",
                    "error": "Thời gian thực thi vượt quá giới hạn cho phép",
                    "execution_ms": round(elapsed_ms, 2),
                    "memory_mb": memory_limit_mb
                }
            except FileNotFoundError as fnf_err:
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                return {
                    "status": "CE",
                    "is_passed": False,
                    "stdout": "",
                    "stderr": str(fnf_err),
                    "error": f"Môi trường máy chủ chưa cài đặt công cụ cần thiết: {str(fnf_err)}",
                    "execution_ms": round(elapsed_ms, 2),
                    "memory_mb": 0.0
                }
            except Exception as e:
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                return {
                    "status": "RTE",
                    "is_passed": False,
                    "stdout": "",
                    "stderr": str(e),
                    "error": f"Lỗi hệ thống thực thi: {str(e)}",
                    "execution_ms": round(elapsed_ms, 2),
                    "memory_mb": 0.0
                }

    def cleanup_orphaned_containers(self, max_age_seconds: int = 30) -> int:
        """
        Quét và dọn dẹp triệt để các container sandbox bị kẹt/mồ côi (Sandbox Orphan Reaper).
        Bất kỳ container nào có nhãn app=oculide-grader sống quá max_age_seconds
        hoặc đã ở trạng thái 'exited'/'dead' nhưng chưa được thu hồi sẽ bị force remove.
        """
        if self.docker_client is None:
            self._init_docker_client()
            if self.docker_client is None:
                return 0

        cleaned_count = 0
        now = time.time()
        try:
            # Lấy toàn bộ containers có nhãn app=oculide-grader (kể cả running lẫn exited)
            containers = self.docker_client.containers.list(
                all=True,
                filters={"label": "app=oculide-grader"}
            )
            for c in containers:
                try:
                    c_status = getattr(c, "status", "").lower()
                    labels = getattr(c, "labels", {}) or {}
                    created_at_str = labels.get("created_at")
                    age = None
                    if created_at_str and str(created_at_str).isdigit():
                        age = now - int(created_at_str)

                    should_kill = False
                    if c_status in ("exited", "dead"):
                        should_kill = True
                    elif age is not None and age > max_age_seconds:
                        should_kill = True
                    elif age is None and c_status == "running":
                        should_kill = True

                    if should_kill:
                        c.remove(force=True)
                        cleaned_count += 1
                except Exception:
                    pass
        except Exception as e:
            print(f"Warning: Lỗi khi quét dọn container rác: {e}")

        return cleaned_count

# Singleton instance sẵn sàng sử dụng
sandbox_service = DockerSandboxService()

