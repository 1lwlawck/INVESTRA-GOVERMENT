"""
Create or update a superadmin account (idempotent).

Examples:
  python GenerateSuperAdmin.py --password "<YOUR_STRONG_PASSWORD>"
  python GenerateSuperAdmin.py --username root --email root@investra.go.id --full-name "Root Admin" --password "<YOUR_STRONG_PASSWORD>"
"""

from __future__ import annotations

import argparse
import os
import secrets
import string
import sys

from app import createApp
from app.Extensions import db
from app.controllers.AuthController import validatePasswordStrength
from app.models.User import User


def _env(name: str, default: str | None = None) -> str | None:
    raw = os.getenv(name)
    if raw is None:
        return default
    value = raw.strip()
    return value if value else default


def _generateStrongPassword(length: int = 20) -> str:
    if length < 12:
        length = 12

    lowers = string.ascii_lowercase
    uppers = string.ascii_uppercase
    digits = string.digits
    allChars = lowers + uppers + digits

    # Guarantee policy compliance: at least one lower, upper, and digit.
    chars = [
        secrets.choice(lowers),
        secrets.choice(uppers),
        secrets.choice(digits),
    ]
    chars.extend(secrets.choice(allChars) for _ in range(length - 3))
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)


def _parseArgs() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create or update superadmin account.")
    parser.add_argument(
        "--username",
        default=_env("SUPERADMIN_USERNAME", "superadmin"),
        help="Username superadmin (default: SUPERADMIN_USERNAME or 'superadmin').",
    )
    parser.add_argument(
        "--email",
        default=_env("SUPERADMIN_EMAIL", "superadmin@investra.go.id"),
        help="Email superadmin (default: SUPERADMIN_EMAIL).",
    )
    parser.add_argument(
        "--full-name",
        default=_env("SUPERADMIN_FULL_NAME", "Super Administrator"),
        help="Nama lengkap superadmin (default: SUPERADMIN_FULL_NAME).",
    )
    parser.add_argument(
        "--password",
        default=_env("SUPERADMIN_PASSWORD") or _env("SEED_SUPERADMIN_PASSWORD"),
        help=(
            "Password superadmin. "
            "Jika kosong saat create user baru, password random kuat akan digenerate."
        ),
    )
    return parser.parse_args()


def _validateIdentity(username: str, email: str, fullName: str) -> None:
    if not username:
        raise ValueError("Username tidak boleh kosong.")
    if not email or "@" not in email:
        raise ValueError("Email tidak valid.")
    if not fullName:
        raise ValueError("Full name tidak boleh kosong.")


def createOrUpdateSuperAdmin(
    username: str,
    email: str,
    fullName: str,
    password: str | None,
) -> tuple[User, bool, str | None]:
    """
    Returns:
      (user, isCreated, generatedPasswordOrNone)
    """
    byUsername = User.query.filter_by(username=username).first()
    byEmail = User.query.filter_by(email=email).first()

    if byUsername and byEmail and byUsername.id != byEmail.id:
        raise ValueError(
            "Konflik data: username dan email menunjuk ke dua user berbeda."
        )

    user = byUsername or byEmail
    created = user is None
    generatedPassword: str | None = None

    if created:
        user = User(
            username=username,
            email=email,
            full_name=fullName,
            role="superadmin",
            is_active=True,
        )
        user.ensurePublicIdentifiers()
        if not password:
            generatedPassword = _generateStrongPassword()
            password = generatedPassword
    else:
        assert user is not None
        user.username = username
        user.email = email
        user.full_name = fullName
        user.role = "superadmin"
        user.is_active = True
        user.ensurePublicIdentifiers()

    if password:
        pwError = validatePasswordStrength(password)
        if pwError:
            raise ValueError(f"Password tidak memenuhi kebijakan: {pwError}")
        user.setPassword(password)

    if created:
        db.session.add(user)
    db.session.commit()
    return user, created, generatedPassword


def main() -> int:
    args = _parseArgs()
    username = str(args.username or "").strip()
    email = str(args.email or "").strip()
    fullName = str(args.full_name or "").strip()
    password = str(args.password).strip() if args.password else None

    try:
        _validateIdentity(username, email, fullName)
    except ValueError as exc:
        print(f"[error] {exc}")
        return 2

    app = createApp()
    userId: str | None = None
    userCode: str | None = None
    finalUsername: str | None = None

    with app.app_context():
        try:
            user, created, generatedPassword = createOrUpdateSuperAdmin(
                username=username,
                email=email,
                fullName=fullName,
                password=password,
            )
            userId = user.uuid
            userCode = user.code
            finalUsername = user.username
        except ValueError as exc:
            print(f"[error] {exc}")
            db.session.rollback()
            return 2
        except Exception as exc:
            print(f"[error] Gagal membuat/memperbarui superadmin: {exc}")
            db.session.rollback()
            return 1

    action = "Created" if created else "Updated"
    print(
        f"[ok] {action} superadmin id={userId if userId is not None else '-'} "
        f"code={userCode if userCode is not None else '-'} "
        f"username='{finalUsername or username}'"
    )
    if generatedPassword:
        print("[ok] Generated password (simpan dengan aman):")
        print(generatedPassword)
    elif password:
        print("[ok] Password diset sesuai input.")
    else:
        print("[ok] Password tidak diubah (menggunakan password lama).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
