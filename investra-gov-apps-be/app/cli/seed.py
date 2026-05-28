"""Seed CLI: create or update the superadmin account.

Usage:
    flask seed-superadmin --password "<YOUR_STRONG_PASSWORD>"
    flask seed-superadmin --username root --email root@investra.go.id \\
        --full-name "Root Admin" --password "<YOUR_STRONG_PASSWORD>"

Falls back to env vars (SUPERADMIN_USERNAME, SUPERADMIN_EMAIL,
SUPERADMIN_FULL_NAME, SUPERADMIN_PASSWORD / SEED_SUPERADMIN_PASSWORD)
when flags are omitted.
"""

from __future__ import annotations

import os
import secrets
import string

import click
from flask.cli import with_appcontext

from app.controllers.auth_controller import validate_password_strength
from app.extensions import db
from app.models.user import User


def _env(name: str, default: str | None = None) -> str | None:
    raw = os.getenv(name)
    if raw is None:
        return default
    value = raw.strip()
    return value or default


def _generate_strong_password(length: int = 20) -> str:
    length = max(length, 12)

    lowers = string.ascii_lowercase
    uppers = string.ascii_uppercase
    digits = string.digits
    all_chars = lowers + uppers + digits

    chars = [
        secrets.choice(lowers),
        secrets.choice(uppers),
        secrets.choice(digits),
    ]
    chars.extend(secrets.choice(all_chars) for _ in range(length - 3))
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)


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
    password: str | None,
) -> tuple[User, bool, str | None]:
    """Idempotent superadmin upsert.

    Returns:
        (user, is_created, generated_password_or_none)
    """
    by_username = User.query.filter_by(username=username).first()
    by_email = User.query.filter_by(email=email).first()

    if by_username and by_email and by_username.id != by_email.id:
        raise ValueError(
            "Konflik data: username dan email menunjuk ke dua user berbeda."
        )

    user = by_username or by_email
    created = user is None
    generated_password: str | None = None

    if created:
        user = User(
            username=username,
            email=email,
            full_name=full_name,
            role="superadmin",
            is_active=True,
        )
        user.ensure_public_identifiers()
        if not password:
            generated_password = _generate_strong_password()
            password = generated_password
    else:
        assert user is not None
        user.username = username
        user.email = email
        user.full_name = full_name
        user.role = "superadmin"
        user.is_active = True
        user.ensure_public_identifiers()

    if password:
        pw_error = validate_password_strength(password)
        if pw_error:
            raise ValueError(f"Password tidak memenuhi kebijakan: {pw_error}")
        user.set_password(password)

    if created:
        db.session.add(user)
    db.session.commit()
    return user, created, generated_password


@click.command("seed-superadmin")
@click.option(
    "--username",
    default=lambda: _env("SUPERADMIN_USERNAME", "superadmin"),
    show_default=True,
    help="Superadmin username (env: SUPERADMIN_USERNAME).",
)
@click.option(
    "--email",
    default=lambda: _env("SUPERADMIN_EMAIL", "superadmin@investra.go.id"),
    show_default=True,
    help="Superadmin email (env: SUPERADMIN_EMAIL).",
)
@click.option(
    "--full-name",
    default=lambda: _env("SUPERADMIN_FULL_NAME", "Super Administrator"),
    show_default=True,
    help="Superadmin full name (env: SUPERADMIN_FULL_NAME).",
)
@click.option(
    "--password",
    default=lambda: _env("SUPERADMIN_PASSWORD") or _env("SEED_SUPERADMIN_PASSWORD"),
    help=(
        "Superadmin password. If empty when creating a new user, a strong "
        "random password will be generated and printed."
    ),
)
@with_appcontext
def seed_superadmin_command(
    username: str,
    email: str,
    full_name: str,
    password: str | None,
) -> None:
    """Create or update the superadmin account (idempotent)."""
    username = (username or "").strip()
    email = (email or "").strip()
    full_name = (full_name or "").strip()
    password = password.strip() if password else None

    try:
        _validate_identity(username, email, full_name)
    except ValueError as exc:
        raise click.ClickException(str(exc)) from exc

    try:
        user, created, generated_password = create_or_update_super_admin(
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
    if generated_password:
        click.echo("[ok] Generated password (simpan dengan aman):")
        click.echo(generated_password)
    elif password:
        click.echo("[ok] Password diset sesuai input.")
    else:
        click.echo("[ok] Password tidak diubah (menggunakan password lama).")
