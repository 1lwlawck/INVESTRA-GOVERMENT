"""Per-request hooks: request id + DB session lifecycle + duration timing."""

from __future__ import annotations

import time
import uuid

from flask import Flask, g, request

from app.extensions import db


def register_request_hooks(app: Flask) -> None:
    @app.before_request
    def attach_request_context():
        incoming_request_id = request.headers.get("X-Request-ID", "").strip()
        request_id = incoming_request_id[:128] if incoming_request_id else uuid.uuid4().hex
        g.request_id = request_id
        g.request_started_at = time.perf_counter()

    @app.teardown_request
    def cleanup_db_session(exception):
        if exception is not None:
            db.session.rollback()
        db.session.remove()
