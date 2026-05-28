"""Application Configuration"""

import os
from urllib.parse import quote_plus, urlparse


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _build_database_url() -> str | None:
    """Resolve DATABASE_URL with Docker-aware fallback."""
    direct = (os.getenv("DATABASE_URL") or "").strip()
    host = (os.getenv("POSTGRES_HOST") or "").strip()
    port = (os.getenv("POSTGRES_PORT") or "5432").strip() or "5432"
    user = (os.getenv("POSTGRES_USER") or "").strip()
    password = os.getenv("POSTGRES_PASSWORD") or ""
    db_name = (os.getenv("POSTGRES_DB") or "").strip()

    can_build_from_parts = bool(host and user and db_name)
    if not can_build_from_parts:
        return direct or None

    # If host parts are present (e.g. in Docker), build a canonical URL.
    from_parts = (
        f"postgresql://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{quote_plus(db_name)}"
    )

    if not direct:
        return from_parts

    try:
        parsed = urlparse(direct)
        # If DATABASE_URL points to localhost but docker host is provided,
        # prefer docker host so in-container scripts don't fail.
        if parsed.hostname in {"localhost", "127.0.0.1"} and host not in {
            "localhost",
            "127.0.0.1",
        }:
            return from_parts
    except Exception:
        # If direct URL is malformed, fallback to composed URL.
        return from_parts

    return direct


def _build_engine_options(database_url: str | None) -> dict:
    """Build SQLAlchemy engine options with sensible production defaults."""
    options: dict = {"pool_pre_ping": True}

    if database_url and database_url.startswith("sqlite"):
        return options

    pool_size = max(1, _env_int("DB_POOL_SIZE", 10))
    max_overflow = max(0, _env_int("DB_MAX_OVERFLOW", 20))
    pool_timeout = max(1, _env_float("DB_POOL_TIMEOUT", 30.0))
    pool_recycle = max(30, _env_int("DB_POOL_RECYCLE", 1800))

    options.update(
        {
            "pool_size": pool_size,
            "max_overflow": max_overflow,
            "pool_timeout": pool_timeout,
            "pool_recycle": pool_recycle,
        }
    )

    if database_url and database_url.startswith("postgresql"):
        statement_timeout_ms = max(1000, _env_int("DB_STATEMENT_TIMEOUT_MS", 30000))
        lock_timeout_ms = max(100, _env_int("DB_LOCK_TIMEOUT_MS", 5000))
        idle_txn_timeout_ms = max(
            1000, _env_int("DB_IDLE_IN_TRANSACTION_TIMEOUT_MS", 15000)
        )
        application_name = (os.getenv("DB_APPLICATION_NAME") or "investra-api").strip()
        application_name = application_name.replace(" ", "_") or "investra-api"
        options["connect_args"] = {
            "options": (
                f"-c statement_timeout={statement_timeout_ms} "
                f"-c lock_timeout={lock_timeout_ms} "
                f"-c idle_in_transaction_session_timeout={idle_txn_timeout_ms} "
                f"-c application_name={application_name}"
            )
        }

    return options


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    _SQLALCHEMY_DATABASE_URI = _build_database_url()
    SQLALCHEMY_DATABASE_URI = _SQLALCHEMY_DATABASE_URI
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = _build_engine_options(_SQLALCHEMY_DATABASE_URI)
    JWT_EXPIRES_HOURS = _env_int("JWT_EXPIRES_HOURS", 12)
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    CORS_SUPPORTS_CREDENTIALS = _env_bool("CORS_SUPPORTS_CREDENTIALS", False)
    MAX_CONTENT_LENGTH = max(1024 * 1024, _env_int("MAX_CONTENT_LENGTH", 10 * 1024 * 1024))
    HSTS_SECONDS = max(0, _env_int("HSTS_SECONDS", 31536000))


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
