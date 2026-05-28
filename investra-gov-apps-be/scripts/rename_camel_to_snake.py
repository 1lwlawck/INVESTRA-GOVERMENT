"""LibCST codemod: rename camelCase identifiers in our codebase to snake_case.

Safe by design — only touches `Name` nodes, never string literals.
Reads `rename_map.json` from CWD (a list of [old, new] pairs).

Usage:
    cd investra-gov-apps-be
    .venv/Scripts/python.exe scripts/rename_camel_to_snake.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import libcst as cst
from libcst import CSTTransformer

SKIP_DIRS = {".venv", ".git", "migrations", "build", "dist", "__pycache__", "scripts"}


class RenameTransformer(CSTTransformer):
    def __init__(self, rename_map: dict[str, str]) -> None:
        self.rename_map = rename_map

    def leave_Name(  # noqa: N802 - libcst API
        self,
        original_node: cst.Name,
        updated_node: cst.Name,
    ) -> cst.BaseExpression:
        new_name = self.rename_map.get(original_node.value)
        if new_name is None:
            return updated_node
        return updated_node.with_changes(value=new_name)


def main() -> int:
    rename_path = Path("rename_map.json")
    if not rename_path.exists():
        print(f"[error] {rename_path} not found. Run the rename map builder first.")
        return 2

    pairs = json.loads(rename_path.read_text(encoding="utf-8"))
    rename_map = dict(pairs)
    print(f"Loaded {len(rename_map)} rename pairs")

    py_files: list[Path] = []
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            if f.endswith(".py"):
                py_files.append(Path(root) / f)

    transformer = RenameTransformer(rename_map)
    changed = 0
    for path in py_files:
        try:
            source = path.read_text(encoding="utf-8")
            module = cst.parse_module(source)
        except cst.ParserSyntaxError as e:
            print(f"[warn] cannot parse {path}: {e}")
            continue

        modified = module.visit(transformer)
        if modified.code != source:
            path.write_text(modified.code, encoding="utf-8")
            changed += 1
            print(f"  updated: {path}")

    print(f"\nTotal files updated: {changed}/{len(py_files)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
