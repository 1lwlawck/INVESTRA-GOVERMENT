#!/bin/sh
# PreToolUse guard: block edits to secret/credential files.
# Exit code 2 tells Claude Code to deny the tool call; the stderr message
# is surfaced to the agent. Anything else allows the call through.
set -u

input_file=$(mktemp "${TMPDIR:-/tmp}/secret-guard-hook.XXXXXX")
trap 'rm -f "$input_file"' EXIT
cat > "$input_file"

if ! command -v node >/dev/null 2>&1; then
  exit 0
fi

# Decide whether the targeted file path is a protected secret file.
# Matches: .env and .env.* (but allows .env.example / .env.template / .env.sample),
# plus common credential/key file names and extensions.
node - "$input_file" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const inputPath = process.argv[2];
const editTools = new Set(['Edit', 'Write', 'MultiEdit', 'ApplyPatch', 'NotebookEdit']);

let input;
try {
  input = JSON.parse(fs.readFileSync(inputPath, 'utf8') || '{}');
} catch {
  process.exit(0);
}

const toolName = input.tool_name || input.tool;
if (!editTools.has(toolName)) process.exit(0);

const fp = input.tool_input && (input.tool_input.file_path || input.tool_input.path);
if (!fp) process.exit(0);

const base = path.basename(fp).toLowerCase();

// Allowlisted example/template env files — safe to edit.
const allowed = /\.env\.(example|template|sample|dist)$/;
if (allowed.test(base)) process.exit(0);

// Blocked patterns.
const blocked =
  base === '.env' ||
  /^\.env(\.|$)/.test(base) ||       // .env, .env.local, .env.production, ...
  base.endsWith('.env') ||           // foo.env
  base === 'credentials' ||
  base === 'credentials.json' ||
  base === 'secrets.json' ||
  base.endsWith('.pem') ||
  base.endsWith('.key') ||
  base.endsWith('.p12') ||
  base.endsWith('.pfx') ||
  base.endsWith('.keystore') ||
  base === 'id_rsa' ||
  base === 'id_ed25519';

if (blocked) {
  process.stderr.write(
    `Blocked edit to "${path.basename(fp)}" — this looks like a secret/credential file.\n` +
      `If you really intend to change it, edit it manually outside the agent, ` +
      `or use a .env.example / .env.template instead.\n`,
  );
  process.exit(2); // deny the tool call
}

process.exit(0);
NODE
