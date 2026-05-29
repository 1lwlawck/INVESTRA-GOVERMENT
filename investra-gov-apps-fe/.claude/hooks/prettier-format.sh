#!/bin/sh
# Auto-format edited files with Prettier after each edit batch.
# Mirrors the structure of react-doctor.sh: parse the hook payload with node,
# extract edited file paths, then run prettier --write on the supported ones.
set -u

input_file=$(mktemp "${TMPDIR:-/tmp}/prettier-format-hook.XXXXXX")
trap 'rm -f "$input_file"' EXIT
cat > "$input_file"

script_dir=$(CDPATH= cd "$(dirname "$0")" && pwd)
project_root=${CLAUDE_PROJECT_DIR:-}
if [ -z "$project_root" ]; then
  project_root=$(CDPATH= cd "$script_dir/../.." && pwd)
fi
if ! cd "$project_root"; then
  exit 0
fi

# Prettier must be available locally; skip silently otherwise.
if [ ! -x ./node_modules/.bin/prettier ]; then
  exit 0
fi
if ! command -v node >/dev/null 2>&1; then
  exit 0
fi

# Extract edited file paths from the hook payload (PostToolBatch or single tool use).
# Only emit paths with Prettier-supported extensions that live under this project.
files=$(node - "$input_file" "$project_root" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const inputPath = process.argv[2];
const projectRoot = process.argv[3];
const editTools = new Set(['Edit', 'Write', 'MultiEdit', 'ApplyPatch']);
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.md', '.html']);

let input;
try {
  input = JSON.parse(fs.readFileSync(inputPath, 'utf8') || '{}');
} catch {
  process.exit(0);
}

const calls = [];
if (Array.isArray(input.tool_calls)) {
  for (const c of input.tool_calls) calls.push(c);
} else {
  calls.push({ tool_name: input.tool_name || input.tool, tool_input: input.tool_input });
}

const out = new Set();
for (const c of calls) {
  if (!editTools.has(c.tool_name)) continue;
  const fp = c.tool_input && (c.tool_input.file_path || c.tool_input.path);
  if (!fp) continue;
  const abs = path.resolve(projectRoot, fp);
  // stay inside the project and only known extensions
  if (!abs.startsWith(projectRoot)) continue;
  if (!exts.has(path.extname(abs).toLowerCase())) continue;
  if (!fs.existsSync(abs)) continue;
  out.add(abs);
}
process.stdout.write(Array.from(out).join('\n'));
NODE
)

if [ -z "$files" ]; then
  exit 0
fi

# Run prettier --write on each edited file. --ignore-unknown skips files
# prettier has no parser for; --no-error-on-unmatched-pattern keeps it quiet.
printf '%s\n' "$files" | while IFS= read -r f; do
  [ -n "$f" ] || continue
  ./node_modules/.bin/prettier --write --ignore-unknown "$f" >/dev/null 2>&1 || true
done

exit 0
