# Git Hooks

Pre-commit & pre-push hooks for INVESTRA. Tracked in the repo so they survive clones.

## One-time setup (per clone)

```bash
git config core.hooksPath .githooks
```

That's it. Git will now use `./.githooks/*` instead of `.git/hooks/*`.

On Windows the hooks need execution via the Git for Windows bash that ships with `git.exe`. The shebang `#!/usr/bin/env bash` is honored automatically by git on commit/push.

## What runs

| Hook | When | What |
|---|---|---|
| `pre-commit` | every `git commit` | **BE**: `ruff check` on staged Python files. **FE**: `eslint --max-warnings=0` on staged TS/TSX/JS/JSX files. Skips areas with no staged files. |
| `pre-push` | every `git push` | **BE**: `pytest` (full suite). **FE**: `tsc --noEmit` + `vitest run` (full suite). |

## Bypass (rarely needed)

```bash
git commit --no-verify          # skip pre-commit
git push --no-verify            # skip pre-push
```

## Troubleshooting

**`ruff not found`** — install BE dev deps:
```bash
cd investra-gov-apps-be
.venv/Scripts/activate          # Windows; Linux/macOS: source .venv/bin/activate
pip install -e ".[dev]"
```

**`eslint not found` / FE node_modules missing** — install FE deps:
```bash
cd investra-gov-apps-fe
npm ci
```

**Pytest/vitest fails on push but you need to push the broken state** — use `git push --no-verify` and fix in a follow-up commit.

**Hook not running at all** — check that `core.hooksPath` is set:
```bash
git config --get core.hooksPath
# expected: .githooks
```
