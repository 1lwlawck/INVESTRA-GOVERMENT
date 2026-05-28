"""Codemod: convert each `class XxxController:` (only @staticmethod members)
into module-level functions. Updates all usages too.

Drops only the static method shell — preserves docstrings and module logic.
"""

from __future__ import annotations

import re
from pathlib import Path

import libcst as cst
from libcst import CSTTransformer, RemovalSentinel

CONTROLLER_DIR = Path("app/controllers")


def _is_static_method(node: cst.FunctionDef) -> bool:
    return any(
        isinstance(d.decorator, cst.Name) and d.decorator.value == "staticmethod"
        for d in node.decorators
    )


def _strip_decorator(method: cst.FunctionDef, name: str) -> cst.FunctionDef:
    new_decorators = [
        d
        for d in method.decorators
        if not (isinstance(d.decorator, cst.Name) and d.decorator.value == name)
    ]
    return method.with_changes(decorators=tuple(new_decorators))


class FlattenControllerClass(CSTTransformer):
    """Promote class body @staticmethod methods to module-level functions."""

    def __init__(self) -> None:
        self.controller_class_name: str | None = None
        self.found_class = False

    def leave_ClassDef(  # noqa: N802 - libcst API
        self,
        original_node: cst.ClassDef,
        updated_node: cst.ClassDef,
    ) -> cst.BaseStatement | cst.FlattenSentinel | RemovalSentinel:
        # Only target *Controller classes whose members are all @staticmethod
        # AND that don't carry class-level constants we depend on (those stay).
        if not original_node.name.value.endswith("Controller"):
            return updated_node

        body = original_node.body.body
        # Separate @staticmethod methods from non-static stuff (class attrs, etc.)
        static_methods: list[cst.FunctionDef] = []
        keep_in_class: list[cst.BaseStatement] = []
        for stmt in body:
            if isinstance(stmt, cst.FunctionDef) and _is_static_method(stmt):
                static_methods.append(_strip_decorator(stmt, "staticmethod"))
            else:
                keep_in_class.append(stmt)

        if not static_methods:
            return updated_node

        # If anything else stays (class attributes, methods that aren't static),
        # we keep the class for those AND emit hoisted module functions for the
        # static methods. The static method calls will route to module level.
        flattened: list[cst.BaseStatement] = []
        if keep_in_class:
            new_class_body = original_node.body.with_changes(body=tuple(keep_in_class))
            flattened.append(updated_node.with_changes(body=new_class_body))
        # Hoist static methods as plain module functions.
        flattened.extend(static_methods)

        self.controller_class_name = original_node.name.value
        self.found_class = True
        return cst.FlattenSentinel(flattened)


def _rewrite_call_sites(source: str, class_name: str) -> str:
    """Replace `ClassName.method(...)` with `method(...)` everywhere.

    Preserves access to class-level attributes (e.g. ClassName.REQUIRED_COLUMNS)
    by leaving uppercase identifiers (constants) alone.
    """
    pattern = re.compile(rf"\b{re.escape(class_name)}\.([a-z][a-zA-Z0-9_]*)\b")
    return pattern.sub(r"\1", source)


def main() -> int:
    py_files = sorted(Path(".").rglob("*.py"))
    py_files = [
        p
        for p in py_files
        if not any(part in {".venv", "scripts", "migrations"} for part in p.parts)
    ]

    classes_flattened: list[str] = []

    # First pass: flatten controller classes in app/controllers/*
    for path in CONTROLLER_DIR.glob("*_controller.py"):
        source = path.read_text(encoding="utf-8")
        module = cst.parse_module(source)
        transformer = FlattenControllerClass()
        modified = module.visit(transformer)
        if transformer.found_class:
            path.write_text(modified.code, encoding="utf-8")
            classes_flattened.append(transformer.controller_class_name or "?")
            print(f"  flattened: {path}")

    # Second pass: rewrite call sites everywhere
    for path in py_files:
        source = path.read_text(encoding="utf-8")
        new = source
        for cls in classes_flattened:
            new = _rewrite_call_sites(new, cls)
        if new != source:
            path.write_text(new, encoding="utf-8")
            print(f"  rewrote calls: {path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
