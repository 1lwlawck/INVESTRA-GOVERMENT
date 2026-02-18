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


def _envFloat(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
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


def _buildEngineOptions(databaseUrl: str | None) -> dict:
    """Build SQLAlchemy engine options with sensible production defaults."""
    options: dict = {"pool_pre_ping": True}

    if databaseUrl and databaseUrl.startswith("sqlite"):
        return options

    poolSize = max(1, _envInt("DB_POOL_SIZE", 10))
    maxOverflow = max(0, _envInt("DB_MAX_OVERFLOW", 20))
    poolTimeout = max(1, _envFloat("DB_POOL_TIMEOUT", 30.0))
    poolRecycle = max(30, _envInt("DB_POOL_RECYCLE", 1800))

    options.update(
        {
            "pool_size": poolSize,
            "max_overflow": maxOverflow,
            "pool_timeout": poolTimeout,
            "pool_recycle": poolRecycle,
        }
    )

    if databaseUrl and databaseUrl.startswith("postgresql"):
        statementTimeoutMs = max(1000, _envInt("DB_STATEMENT_TIMEOUT_MS", 30000))
        lockTimeoutMs = max(100, _envInt("DB_LOCK_TIMEOUT_MS", 5000))
        idleTxnTimeoutMs = max(
            1000, _envInt("DB_IDLE_IN_TRANSACTION_TIMEOUT_MS", 15000)
        )
        applicationName = (os.getenv("DB_APPLICATION_NAME") or "investra-api").strip()
        applicationName = applicationName.replace(" ", "_") or "investra-api"
        options["connect_args"] = {
            "options": (
                f"-c statement_timeout={statementTimeoutMs} "
                f"-c lock_timeout={lockTimeoutMs} "
                f"-c idle_in_transaction_session_timeout={idleTxnTimeoutMs} "
                f"-c application_name={applicationName}"
            )
        }

    return options


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    _SQLALCHEMY_DATABASE_URI = _buildDatabaseUrl()
    SQLALCHEMY_DATABASE_URI = _SQLALCHEMY_DATABASE_URI
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = _buildEngineOptions(_SQLALCHEMY_DATABASE_URI)
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
