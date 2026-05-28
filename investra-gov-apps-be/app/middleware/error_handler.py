"""Error-handling middleware: registers global error handlers on the app."""

import logging

from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.extensions import db
from app.utils.api_response import error_response

logger = logging.getLogger(__name__)


def register_error_handlers(app):
    """Attach standard JSON error handlers to the Flask app."""

    @app.errorhandler(400)
    def bad_request(e):
        return error_response(str(e.description), "BAD_REQUEST", 400)

    @app.errorhandler(401)
    def unauthorized(_e):
        return error_response("Unauthorized", "UNAUTHORIZED", 401)

    @app.errorhandler(403)
    def forbidden(_e):
        return error_response("Forbidden", "FORBIDDEN", 403)

    @app.errorhandler(404)
    def not_found(_e):
        return error_response("Resource tidak ditemukan", "NOT_FOUND", 404)

    @app.errorhandler(405)
    def method_not_allowed(_e):
        return error_response("Method not allowed", "METHOD_NOT_ALLOWED", 405)

    @app.errorhandler(409)
    def conflict(e):
        return error_response(str(e.description), "CONFLICT", 409)

    @app.errorhandler(413)
    def payload_too_large(_e):
        return error_response("Ukuran request terlalu besar", "PAYLOAD_TOO_LARGE", 413)

    @app.errorhandler(415)
    def unsupported_media_type(_e):
        return error_response(
            "Content-Type tidak didukung",
            "UNSUPPORTED_MEDIA_TYPE",
            415,
        )

    @app.errorhandler(422)
    def unprocessable(e):
        return error_response(str(e.description), "UNPROCESSABLE", 422)

    @app.errorhandler(429)
    def rate_limited(_e):
        return error_response(
            "Terlalu banyak permintaan. Coba lagi nanti.",
            "RATE_LIMITED",
            429,
        )

    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()
        logger.exception("Internal server error: %s", e)
        return error_response("Internal server error", "INTERNAL_ERROR", 500)

    @app.errorhandler(IntegrityError)
    def database_integrity_error(e):
        db.session.rollback()
        logger.warning("Database integrity error: %s", e)
        return error_response("Data conflict", "DB_INTEGRITY_ERROR", 409)

    @app.errorhandler(SQLAlchemyError)
    def database_error(e):
        db.session.rollback()
        logger.exception("Database error: %s", e)
        return error_response("Database error", "DB_ERROR", 500)

    @app.errorhandler(Exception)
    def unhandled_exception(e):
        db.session.rollback()
        logger.exception("Unhandled exception: %s", e)
        return error_response("Internal server error", "INTERNAL_ERROR", 500)

