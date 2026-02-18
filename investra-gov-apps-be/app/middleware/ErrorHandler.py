"""Error-handling middleware: registers global error handlers on the app."""

import logging

from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.Extensions import db
from app.utils.ApiResponse import errorResponse

logger = logging.getLogger(__name__)


def registerErrorHandlers(app):
    """Attach standard JSON error handlers to the Flask app."""

    @app.errorhandler(400)
    def badRequest(e):
        return errorResponse(str(e.description), "BAD_REQUEST", 400)

    @app.errorhandler(401)
    def unauthorized(_e):
        return errorResponse("Unauthorized", "UNAUTHORIZED", 401)

    @app.errorhandler(403)
    def forbidden(_e):
        return errorResponse("Forbidden", "FORBIDDEN", 403)

    @app.errorhandler(404)
    def notFound(_e):
        return errorResponse("Resource tidak ditemukan", "NOT_FOUND", 404)

    @app.errorhandler(405)
    def methodNotAllowed(_e):
        return errorResponse("Method not allowed", "METHOD_NOT_ALLOWED", 405)

    @app.errorhandler(409)
    def conflict(e):
        return errorResponse(str(e.description), "CONFLICT", 409)

    @app.errorhandler(413)
    def payloadTooLarge(_e):
        return errorResponse("Ukuran request terlalu besar", "PAYLOAD_TOO_LARGE", 413)

    @app.errorhandler(415)
    def unsupportedMediaType(_e):
        return errorResponse(
            "Content-Type tidak didukung",
            "UNSUPPORTED_MEDIA_TYPE",
            415,
        )

    @app.errorhandler(422)
    def unprocessable(e):
        return errorResponse(str(e.description), "UNPROCESSABLE", 422)

    @app.errorhandler(429)
    def rateLimited(_e):
        return errorResponse(
            "Terlalu banyak permintaan. Coba lagi nanti.",
            "RATE_LIMITED",
            429,
        )

    @app.errorhandler(500)
    def internalError(e):
        db.session.rollback()
        logger.exception("Internal server error: %s", e)
        return errorResponse("Internal server error", "INTERNAL_ERROR", 500)

    @app.errorhandler(IntegrityError)
    def databaseIntegrityError(e):
        db.session.rollback()
        logger.warning("Database integrity error: %s", e)
        return errorResponse("Data conflict", "DB_INTEGRITY_ERROR", 409)

    @app.errorhandler(SQLAlchemyError)
    def databaseError(e):
        db.session.rollback()
        logger.exception("Database error: %s", e)
        return errorResponse("Database error", "DB_ERROR", 500)

    @app.errorhandler(Exception)
    def unhandledException(e):
        db.session.rollback()
        logger.exception("Unhandled exception: %s", e)
        return errorResponse("Internal server error", "INTERNAL_ERROR", 500)

