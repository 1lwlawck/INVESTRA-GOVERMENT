"""
Utility to convert snake_case dict keys to camelCase in API responses.
"""

from __future__ import annotations

import re

_SNAKE_RE = re.compile(r"_([a-z0-9])")


def snakeToCamel(name: str) -> str:
    """Convert a snake_case string to camelCase.

    Examples:
        >>> snakeToCamel("total_provinces")
        'totalProvinces'
        >>> snakeToCamel("pdrb_per_kapita")
        'pdrbPerKapita'
        >>> snakeToCamel("id")
        'id'
    """
    return _SNAKE_RE.sub(lambda m: m.group(1).upper(), name)


def camelize(obj: object) -> object:
    """Recursively convert all dict keys from snake_case to camelCase.

    - Dicts: keys are converted, values are recursed.
    - Lists/tuples: each element is recursed.
    - Other types: returned as-is.
    """
    if isinstance(obj, dict):
        return {snakeToCamel(k): camelize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [camelize(item) for item in obj]
    return obj
