"""Logging configuration."""

from __future__ import annotations

import logging

from flask import Flask


def configure_logging(app: Flask) -> None:
    logging.basicConfig(
        level=logging.DEBUG if app.config.get("DEBUG") else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
