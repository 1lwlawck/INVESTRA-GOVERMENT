"""Public identifier helpers (UUID + human-readable codes)."""

from __future__ import annotations

from typing import Iterable
from uuid import UUID, uuid4


def generateUuid() -> str:
    return str(uuid4())


def isValidUuid(value: object) -> bool:
    if not isinstance(value, str):
        return False
    try:
        UUID(value)
        return True
    except (ValueError, TypeError):
        return False


def nextCode(
    existingCodes: Iterable[str | None],
    *,
    prefix: str,
    sequenceWidth: int,
    suffix: str = "",
) -> str:
    """
    Generate next sequential code.

    Example:
      prefix=USR, width=2, suffix=2026 -> USR012026
      prefix=DTS, width=3, suffix=""   -> DTS001
    """
    maxSeq = 0
    for code in existingCodes:
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
        if seq > maxSeq:
            maxSeq = seq

    nextSeq = maxSeq + 1
    return f"{prefix}{nextSeq:0{sequenceWidth}d}{suffix}"

