"""Flask CLI commands."""

from __future__ import annotations

from flask import Flask


def register_cli(app: Flask) -> None:
    from app.cli.seed import seed_superadmin_command

    app.cli.add_command(seed_superadmin_command)
