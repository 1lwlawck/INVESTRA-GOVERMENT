"""Backwards-compatible shim: ``python generate_super_admin.py`` now delegates to
the Flask CLI command ``flask seed-superadmin``.

Prefer the CLI directly:

    flask seed-superadmin --password "<YOUR_STRONG_PASSWORD>"

This file remains so that existing automation and documentation continue to work.
"""

from __future__ import annotations

import sys

from app import create_app
from app.cli.seed import seed_superadmin_command


def main() -> int:
    app = create_app()
    args = sys.argv[1:]
    runner = app.test_cli_runner()
    result = runner.invoke(seed_superadmin_command, args)
    if result.output:
        print(result.output, end="")
    return result.exit_code or 0


if __name__ == "__main__":
    raise SystemExit(main())
