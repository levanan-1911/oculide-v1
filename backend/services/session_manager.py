import json
import os
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

HEARTBEAT_TIMEOUT_SECONDS = 60
SESSIONS_FILE = Path(__file__).resolve().parent.parent / "data" / "active_sessions.json"
_LOCK = threading.Lock()


def parse_device_info(user_agent: str, client_ip: str = "") -> str:
    ua = (user_agent or "").lower()
    browser = "Trình duyệt"
    if "edg/" in ua:
        browser = "Edge"
    elif "chrome/" in ua and "safari/" in ua:
        browser = "Chrome"
    elif "firefox/" in ua:
        browser = "Firefox"
    elif "safari/" in ua:
        browser = "Safari"

    os_name = "Thiết bị"
    if "windows" in ua:
        os_name = "Windows"
    elif "mac os" in ua or "macintosh" in ua:
        os_name = "macOS"
    elif "android" in ua:
        os_name = "Android"
    elif "iphone" in ua or "ipad" in ua:
        os_name = "iOS"
    elif "linux" in ua:
        os_name = "Linux"

    ip_part = f" ({client_ip})" if client_ip else ""
    return f"{browser} / {os_name}{ip_part}"


class SessionManager:
    """Quản lý Strict Single Active Session (First-In-Wins) cho mỗi tài khoản."""

    @classmethod
    def _load_all(cls) -> Dict[str, Dict[str, Any]]:
        SESSIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
        if not SESSIONS_FILE.exists():
            return {}
        try:
            with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    @classmethod
    def _save_all(cls, data: Dict[str, Dict[str, Any]]) -> None:
        SESSIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
        tmp = SESSIONS_FILE.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, SESSIONS_FILE)

    @classmethod
    def get_session(cls, user_id: int) -> Optional[Dict[str, Any]]:
        with _LOCK:
            data = cls._load_all()
            return data.get(str(user_id))

    @classmethod
    def is_session_alive(cls, session: Optional[Dict[str, Any]]) -> bool:
        if not session or not session.get("activeSessionId"):
            return False
        last_hb = float(session.get("lastHeartbeatAt") or 0)
        return (time.time() - last_hb) < HEARTBEAT_TIMEOUT_SECONDS

    @classmethod
    def create_session(
        cls,
        user_id: int,
        device_info: str,
        is_locked_in_exam: bool = False,
    ) -> Dict[str, Any]:
        with _LOCK:
            data = cls._load_all()
            record = {
                "activeSessionId": str(uuid.uuid4()),
                "lastHeartbeatAt": time.time(),
                "deviceInfo": device_info,
                "isLockedInExam": bool(is_locked_in_exam),
            }
            data[str(user_id)] = record
            cls._save_all(data)
            return record

    @classmethod
    def touch_heartbeat(
        cls,
        user_id: int,
        session_id: str,
        is_locked_in_exam: Optional[bool] = None,
    ) -> bool:
        if not session_id:
            return False
        with _LOCK:
            data = cls._load_all()
            record = data.get(str(user_id))
            if not record or record.get("activeSessionId") != session_id:
                return False
            record["lastHeartbeatAt"] = time.time()
            if is_locked_in_exam is not None:
                record["isLockedInExam"] = bool(is_locked_in_exam)
            data[str(user_id)] = record
            cls._save_all(data)
            return True

    @classmethod
    def clear_session(cls, user_id: int) -> None:
        with _LOCK:
            data = cls._load_all()
            if str(user_id) in data:
                del data[str(user_id)]
                cls._save_all(data)

    @classmethod
    def list_active_sessions(cls) -> Dict[str, Dict[str, Any]]:
        with _LOCK:
            data = cls._load_all()
            now = time.time()
            result: Dict[str, Dict[str, Any]] = {}
            for uid, rec in data.items():
                last_hb = float(rec.get("lastHeartbeatAt") or 0)
                is_online = bool(rec.get("activeSessionId")) and (now - last_hb) < HEARTBEAT_TIMEOUT_SECONDS
                result[uid] = {
                    **rec,
                    "isOnline": is_online,
                }
            return result
