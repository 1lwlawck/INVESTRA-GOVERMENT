"""Public identifier helpers (UUID + human-readable codes)."""

from __future__ import annotations

from collections.abc import Iterable
from uuid import UUID, uuid4


def generate_uuid() -> str:
    return str(uuid4())


def is_valid_uuid(value: object) -> bool:
    if not isinstance(value, str):
        return False
    try:
        UUID(value)
        return True
    except (ValueError, TypeError):
        return False


def next_code(
    existing_codes: Iterable[str | None],
    *,
    prefix: str,
    sequence_width: int,
    suffix: str = "",
) -> str:
    """
    Generate next sequential code.

    Example:
      prefix=USR, width=2, suffix=2026 -> USR012026
      prefix=DTS, width=3, suffix=""   -> DTS001
    """
    max_seq = 0
    for code in existing_codes:
        if not code or not isinstance(code, str):
            continue
        if not code.startswith(prefix):
            continue
        body = code[len(prefix):]
        if suffix:
            if not body.endswith(suffix):
                continue
            body = body[: -len(suffix)]
        if not body.isdigit():
            continue
        seq = int(body)
        if seq > max_seq:
            max_seq = seq

    next_seq = max_seq + 1
    return f"{prefix}{next_seq:0{sequence_width}d}{suffix}"

