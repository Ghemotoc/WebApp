#!/usr/bin/env bash
# Claude Code SessionStart hook: installs npm packages only when package-lock.json changed
# (story S1-E1-01), so a cloud session starts ready to run the checks without a slow `npm ci` every time.
#
# Who runs it: Claude Code, when a session starts or resumes (.claude/settings.json, "SessionStart").
# How it decides: after a successful install it stores the sha256 of package-lock.json in
# node_modules/.package-lock.sha256. Next time, if node_modules exists and the stored hash matches,
# it skips. Deleting node_modules always triggers a fresh install.
# Errors: a failed `npm ci` stops the hook with a non-zero exit code and npm's own message.
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

lock_file="package-lock.json"
hash_file="node_modules/.package-lock.sha256"

# Step 1: nothing to install in a checkout without a lock file.
if [ ! -f "$lock_file" ]; then
  echo "session-start: no $lock_file, nothing to install."
  exit 0
fi

# Step 2: warn (don't fail) when Node isn't 24, the version the project pins (decided 17 Oct 2026, 13:18).
node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo none)"
if [ "$node_major" != "24" ]; then
  echo "session-start: warning: Node $node_major is running; this project expects Node 24 (.nvmrc)."
fi

# Step 3: skip when the installed packages already match the lock file.
current_hash="$(sha256sum "$lock_file" | cut -d ' ' -f 1)"
if [ -d node_modules ] && [ -f "$hash_file" ] && [ "$(cat "$hash_file")" = "$current_hash" ]; then
  echo "session-start: $lock_file unchanged, skipping npm ci."
  exit 0
fi

# Step 4: install exactly what the lock file lists, then remember the lock file's hash.
echo "session-start: $lock_file changed or packages missing, running npm ci..."
npm ci --no-audit --no-fund
echo "$current_hash" > "$hash_file"
echo "session-start: packages installed."
