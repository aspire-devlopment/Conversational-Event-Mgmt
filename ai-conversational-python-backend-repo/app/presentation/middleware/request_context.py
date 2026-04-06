"""HTTP middleware for correlation IDs and request/response logging."""

from __future__ import annotations

import json
import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import redact_sensitive, request_id_context, with_payload


async def _read_request_body(request: Request):
    """Read and safely parse the inbound request body for structured logging."""

    body_bytes = await request.body()
    if not body_bytes:
        return None
    content_type = (request.headers.get("content-type") or "").lower()
    if "application/json" in content_type:
        try:
            return json.loads(body_bytes.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return body_bytes.decode("utf-8", errors="replace")
    return body_bytes.decode("utf-8", errors="replace")


async def _capture_response(response: Response) -> tuple[Response, object]:
    """Capture the response body for logging and rebuild the response stream."""

    if not hasattr(response, "body_iterator") or response.body_iterator is None:
        body = getattr(response, "body", b"") or b""
        return response, _decode_response_body(body, response.media_type)

    body_chunks = [chunk async for chunk in response.body_iterator]
    body = b"".join(body_chunks)
    captured = _decode_response_body(body, response.media_type)
    rebuilt = Response(
        content=body,
        status_code=response.status_code,
        headers=dict(response.headers),
        media_type=response.media_type,
        background=response.background,
    )
    return rebuilt, captured


def _decode_response_body(body: bytes, media_type: str | None):
    if not body:
        return None
    if media_type and "application/json" in media_type.lower():
        try:
            return json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return body.decode("utf-8", errors="replace")
    return body.decode("utf-8", errors="replace")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Add a request id to each request and emit one access log per response."""

    def __init__(self, app, logger_name: str = "app.request") -> None:
        super().__init__(app)
        self.logger = logging.getLogger(logger_name)

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        request.state.trace_id = request_id
        token = request_id_context.set(request_id)
        started_at = time.perf_counter()
        safe_request_body = redact_sensitive(await _read_request_body(request))
        request.state.safe_request_body = safe_request_body

        try:
            response = await call_next(request)
            response, safe_response_body = await _capture_response(response)
            request.state.safe_response_body = redact_sensitive(safe_response_body)
        finally:
            duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
            status_code = getattr(locals().get("response"), "status_code", 500)
            with_payload(
                self.logger,
                logging.INFO,
                "HTTP request completed",
                method=request.method,
                path=request.url.path,
                status_code=status_code,
                duration_ms=duration_ms,
                client_ip=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                request_body=safe_request_body,
                response_body=getattr(request.state, "safe_response_body", None),
            )
            request_id_context.reset(token)

        response.headers["X-Request-ID"] = request_id
        return response
