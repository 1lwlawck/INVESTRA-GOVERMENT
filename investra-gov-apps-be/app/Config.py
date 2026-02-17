"""Application Configuration"""

import os
from urllib.parse import quote_plus, urlparse


def _envInt(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _envBool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _buildDatabaseUrl() -> str | None:
    """Resolve DATABASE_URL with Docker-aware fallback."""
    direct = (os.getenv("DATABASE_URL") or "").strip()
    host = (os.getenv("POSTGRES_HOST") or "").strip()
    port = (os.getenv("POSTGRES_PORT") or "5432").strip() or "5432"
    user = (os.getenv("POSTGRES_USER") or "").strip()
    password = os.getenv("POSTGRES_PASSWORD") or ""
    dbName = (os.getenv("POSTGRES_DB") or "").strip()

    canBuildFromParts = bool(host and user and dbName)
    if not canBuildFromParts:
        return direct or None

    # If host parts are present (e.g. in Docker), build a canonical URL.
    fromParts = (
        f"postgresql://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{quote_plus(dbName)}"
    )

    if not direct:
        return fromParts

    try:
        parsed = urlparse(direct)
        # If DATABASE_URL points to localhost but docker host is provided,
        # prefer docker host so in-container scripts don't fail.
        if parsed.hostname in {"localhost", "127.0.0.1"} and host not in {
            "localhost",
            "127.0.0.1",
        }:
            return fromParts
    except Exception:
        # If direct URL is malformed, fallback to composed URL.
        return fromParts

    return direct


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = _buildDatabaseUrl()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    JWT_EXPIRES_HOURS = _envInt("JWT_EXPIRES_HOURS", 12)
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    CORS_SUPPORTS_CREDENTIALS = _envBool("CORS_SUPPORTS_CREDENTIALS", False)
    MAX_CONTENT_LENGTH = max(1024 * 1024, _envInt("MAX_CONTENT_LENGTH", 10 * 1024 * 1024))
    HSTS_SECONDS = max(0, _envInt("HSTS_SECONDS", 31536000))


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}
