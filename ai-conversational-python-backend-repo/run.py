import uvicorn

from app.core.config import get_settings


if __name__ == "__main__":
    settings = get_settings()
    # Reload is opt-in so background Windows runs do not fail on multiprocessing pipe permissions.
    uvicorn.run("app.main:app", host=settings.app_host, port=settings.app_port, reload=settings.app_reload)
