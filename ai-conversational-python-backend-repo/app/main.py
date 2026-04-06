"""FastAPI application bootstrap with middleware, CORS, and exception handling."""

import logging
import traceback

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.core.logging import configure_logging, get_logger, with_payload
from app.infrastructure.repositories.log_repository import LogRepository
from app.presentation.middleware.auth_context import AuthContextMiddleware
from app.presentation.middleware.request_context import RequestContextMiddleware
from app.presentation.middleware.security import SecurityHeadersMiddleware
from app.presentation.routes import admin, auth, chat, events
from app.presentation.schemas.common import HealthResponse

settings = get_settings()
configure_logging()
logger = get_logger("app.bootstrap")


def persist_error_log_safely(error_payload: dict) -> None:
    """Persist error logs without letting logging failures break the request flow."""

    try:
        LogRepository.create_error_log(error_payload)
    except Exception as log_exc:  # noqa: BLE001
        with_payload(
            logger,
            logging.ERROR,
            "Failed to persist error log",
            trace_id=error_payload.get("trace_id"),
            original_path=error_payload.get("path"),
            persistence_error=str(log_exc),
        )

app = FastAPI(title=settings.app_name)
if settings.force_https:
    app.add_middleware(HTTPSRedirectMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_host_list or ["*"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(AuthContextMiddleware)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(events.router)
app.include_router(chat.router)


@app.get("/health", response_model=HealthResponse)
async def health():
    return {"status": "ok"}


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    error_payload = {
        "trace_id": getattr(request.state, "trace_id", None),
        "method": request.method,
        "path": request.url.path,
        "status_code": exc.status_code,
        "error_message": exc.message,
        "error_stack": None,
        "request_body": getattr(request.state, "safe_request_body", None),
    }
    with_payload(logger, logging.ERROR, "Application error", **error_payload)
    persist_error_log_safely(error_payload)
    return JSONResponse(status_code=exc.status_code, content={"status": "error", "message": exc.message})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_payload = {
        "trace_id": getattr(request.state, "trace_id", None),
        "method": request.method,
        "path": request.url.path,
        "status_code": 422,
        "error_message": "Validation failed",
        "error_stack": None,
        "request_body": getattr(request.state, "safe_request_body", None),
        "details": exc.errors(),
    }
    with_payload(logger, logging.ERROR, "Validation exception", **error_payload)
    persist_error_log_safely(error_payload)
    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "message": "Validation failed",
            "details": exc.errors(),
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
    error_payload = {
        "trace_id": getattr(request.state, "trace_id", None),
        "method": request.method,
        "path": request.url.path,
        "status_code": exc.status_code,
        "error_message": detail,
        "error_stack": None,
        "request_body": getattr(request.state, "safe_request_body", None),
    }
    with_payload(logger, logging.ERROR, "HTTP exception", **error_payload)
    persist_error_log_safely(error_payload)
    return JSONResponse(status_code=exc.status_code, content={"status": "error", "message": detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    error_payload = {
        "trace_id": getattr(request.state, "trace_id", None),
        "method": request.method,
        "path": request.url.path,
        "status_code": 500,
        "error_message": str(exc),
        "error_stack": "".join(traceback.format_exception(type(exc), exc, exc.__traceback__)),
        "request_body": getattr(request.state, "safe_request_body", None),
        "error_type": type(exc).__name__,
    }
    with_payload(logger, logging.ERROR, "Unhandled application exception", **error_payload)
    persist_error_log_safely(error_payload)
    return JSONResponse(status_code=500, content={"status": "error", "message": "Internal server error"})
