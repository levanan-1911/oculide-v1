from contextvars import ContextVar, Token
from typing import Optional, Tuple
from fastapi import Request

_client_ip_ctx: ContextVar[Optional[str]] = ContextVar("oculide_client_ip", default=None)
_user_agent_ctx: ContextVar[Optional[str]] = ContextVar("oculide_user_agent", default=None)


def normalize_ip(raw_ip: Optional[str]) -> Optional[str]:
    if not raw_ip:
        return None
    ip = raw_ip.strip()
    if not ip:
        return None
    if ip == "::1":
        return "127.0.0.1"
    if ip.startswith("::ffff:"):
        return ip[7:]
    return ip


def extract_request_ip(request: Request) -> Optional[str]:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        first = xff.split(",")[0].strip()
        if first:
            return normalize_ip(first)
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        return normalize_ip(x_real_ip)
    if request.client and request.client.host:
        return normalize_ip(request.client.host)
    return None


def set_request_context(ip: Optional[str], user_agent: Optional[str]) -> Tuple[Token, Token]:
    t1 = _client_ip_ctx.set(normalize_ip(ip))
    t2 = _user_agent_ctx.set((user_agent or "").strip()[:512] or None)
    return t1, t2


def reset_request_context(tokens: Tuple[Token, Token]) -> None:
    t1, t2 = tokens
    _client_ip_ctx.reset(t1)
    _user_agent_ctx.reset(t2)


def get_request_ip() -> Optional[str]:
    return _client_ip_ctx.get()


def get_request_user_agent() -> Optional[str]:
    return _user_agent_ctx.get()
