"""Seed CLI: create or update the superadmin account interactively.

Usage:
    flask seed-superadmin

The command will prompt for username, email, full name, and password.
Password input is hidden and confirmed twice.
"""

from __future__ import annotations

import click
from flask.cli import with_appcontext

from app.controllers.auth_controller import validate_password_strength
from app.extensions import db
from app.models.user import User


def _validate_identity(username: str, email: str, full_name: str) -> None:
    if not username:
        raise ValueError("Username tidak boleh kosong.")
    if not email or "@" not in email:
        raise ValueError("Email tidak valid.")
    if not full_name:
        raise ValueError("Full name tidak boleh kosong.")


def create_or_update_super_admin(
    username: str,
    email: str,
    full_name: str,
    password: str,
) -> tuple[User, bool]:
    """Idempotent superadmin upsert.

    Returns:
        (user, is_created)
    """
    by_username = User.query.filter_by(username=username).first()
    by_email = User.query.filter_by(email=email).first()

    if by_username and by_email and by_username.id != by_email.id:
        raise ValueError("Konflik data: username dan email menunjuk ke dua user berbeda.")

    user = by_username or by_email
    created = user is None

    if created:
        user = User(
            username=username,
            email=email,
            full_name=full_name,
            role="superadmin",
            is_active=True,
        )
        user.ensure_public_identifiers()
    else:
        assert user is not None
        user.username = username
        user.email = email
        user.full_name = full_name
        user.role = "superadmin"
        user.is_active = True
        user.ensure_public_identifiers()

    pw_error = validate_password_strength(password)
    if pw_error:
        raise ValueError(f"Password tidak memenuhi kebijakan: {pw_error}")
    user.set_password(password)

    if created:
        db.session.add(user)
    db.session.commit()
    return user, created


@click.command("seed-superadmin")
@click.option(
    "--username",
    prompt="Username",
    default="superadmin",
    show_default=True,
    help="Superadmin username.",
)
@click.option(
    "--email",
    prompt="Email",
    default="superadmin@investra.go.id",
    show_default=True,
    help="Superadmin email.",
)
@click.option(
    "--full-name",
    prompt="Full name",
    default="Super Administrator",
    show_default=True,
    help="Superadmin full name.",
)
@click.option(
    "--password",
    prompt="Password",
    confirmation_prompt="Confirm password",
    hide_input=True,
    help="Superadmin password (must contain upper, lower, digit; min 8 chars).",
)
@with_appcontext
def seed_superadmin_command(
    username: str,
    email: str,
    full_name: str,
    password: str,
) -> None:
    """Create or update the superadmin account (idempotent)."""
    username = (username or "").strip()
    email = (email or "").strip()
    full_name = (full_name or "").strip()

    try:
        _validate_identity(username, email, full_name)
    except ValueError as exc:
        raise click.ClickException(str(exc)) from exc

    try:
        user, created = create_or_update_super_admin(
            username=username,
            email=email,
            full_name=full_name,
            password=password,
        )
    except ValueError as exc:
        db.session.rollback()
        raise click.ClickException(str(exc)) from exc
    except Exception as exc:
        db.session.rollback()
        raise click.ClickException(f"Gagal membuat/memperbarui superadmin: {exc}") from exc

    action = "Created" if created else "Updated"
    click.echo(
        f"[ok] {action} superadmin id={user.id or '-'} "
        f"code={user.code or '-'} username='{user.username}'"
    )
