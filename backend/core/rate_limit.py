import time
import logging
from collections import defaultdict, deque
from typing import Dict, Tuple
from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("oculide.ratelimit")

SENSITIVE_PATH_LIMITS: Dict[str, Tuple[int, int]] = {
    "/auth/login": (15, 60),
    "/auth/register": (10, 60),
    "/auth/forgot-password": (5, 60),
    "/rooms/join": (20, 60),
    "/violations/verify-face": (20, 60),
}
GLOBAL_LIMIT: Tuple[int, int] = (180, 60)

_memory_buckets: Dict[str, deque] = defaultdict(deque)


def _extract_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _match_limit(path: str) -> Tuple[str, int, int]:
    for suffix, (max_req, window_s) in SENSITIVE_PATH_LIMITS.items():
        if path.endswith(suffix):
            return f"sensitive:{suffix}", max_req, window_s
    return "global", GLOBAL_LIMIT[0], GLOBAL_LIMIT[1]


def _check_memory_limit(key: str, max_req: int, window_s: int) -> bool:
    now = time.monotonic()
    q = _memory_buckets[key]
    cutoff = now - window_s
    while q and q[0] < cutoff:
        q.popleft()
    if len(q) >= max_req:
        return False
    q.append(now)
    return True


async def rate_limit_middleware(request: Request, call_next):
    path = request.url.path
    if request.method == "OPTIONS" or path.startswith("/health") or path in ("/docs", "/redoc", "/openapi.json"):
        return await call_next(request)

    bucket_name, max_req, window_s = _match_limit(path)
    client_ip = _extract_ip(request)
    rate_key = f"rl:{bucket_name}:{client_ip}"

    allowed = True
    redis_client = getattr(request.app.state, "redis_client", None)
    if redis_client is not None:
        try:
            count = await redis_client.incr(rate_key)
            if count == 1:
                await redis_client.expire(rate_key, window_s)
            if count > max_req:
                allowed = False
        except Exception:
            allowed = _check_memory_limit(rate_key, max_req, window_s)
    else:
        allowed = _check_memory_limit(rate_key, max_req, window_s)

    if not allowed:
        logger.warning("Rate limit exceeded: key=%s limit=%s/%ss", rate_key, max_req, window_s)
        return JSONResponse(
            status_code=429,
            content={
                "success": False,
                "errorCode": "RATE_LIMIT_EXCEEDED",
                "message": "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.",
                "detail": "Too Many Requests",
            },
        )

    return await call_next(request)
