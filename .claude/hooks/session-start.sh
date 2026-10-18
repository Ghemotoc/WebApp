#!/usr/bin/env bash
# Claude Code SessionStart hook: gets a cloud session ready to run every check (story S1-E1-01;
# Node 24 and Docker added by "Tooling: Node 24 and Docker on every session start", 18 Oct 2026).
#
# Who runs it: Claude Code, when a session starts or resumes (.claude/settings.json, "SessionStart").
# What it does, in order:
#   1. Puts Node 24 first on PATH (decided 17 Oct 2026, 13:18: Node 24 LTS everywhere, .nvmrc), for
#      this hook and, through CLAUDE_ENV_FILE, for every Bash command Claude runs later in the
#      session. The image puts /opt/node22/bin early on PATH, so without this `node` is 22.
#   2. Starts the Docker daemon if it isn't running; the local Supabase stack needs it. Containers
#      lose the daemon on every restart, so this runs on every start and resume, not just once.
#   3. Installs npm packages only when package-lock.json changed: after a successful install it
#      stores the sha256 of package-lock.json in node_modules/.package-lock.sha256 and skips while
#      it matches. Deleting node_modules always triggers a fresh install.
# Safe to run any number of times. Errors: a missing Node 24 or a failed `npm ci` stops the hook
# with a non-zero exit code and a plain message. Docker is only needed for the database checks,
# so a Docker problem is a warning, and everything else still gets set up.
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

readonly NODE_MAJOR=24
readonly NVM_DIR="${NVM_DIR:-/opt/nvm}"
readonly DOCKER_LOG=/tmp/dockerd.log
readonly DOCKER_WAIT_SECONDS=60

log() { echo "session-start: $*"; }
fail() {
  echo "session-start: ERROR: $*" >&2
  exit 1
}

# Finds a Node 24 bin folder: one nvm already installed, the image's /opt/node24, or a fresh
# `nvm install 24` (needs the network). Prints the folder; returns 1 when there is none.
find_node24_bin() {
  local candidate
  for candidate in "$NVM_DIR"/versions/node/v"$NODE_MAJOR".*/bin /opt/node"$NODE_MAJOR"/bin; do
    if [ -x "$candidate/node" ]; then
      echo "$candidate"
      return 0
    fi
  done
  [ -s "$NVM_DIR/nvm.sh" ] || return 1
  # nvm reads unset variables, so `set -u` is relaxed inside this subshell only.
  (
    set +u
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    nvm install "$NODE_MAJOR" >&2 && dirname "$(nvm which "$NODE_MAJOR")"
  )
}

# Step 1: Node 24 first on PATH, here and for the rest of the session.
use_node24() {
  local node24_bin
  node24_bin="$(find_node24_bin)" || fail "Node $NODE_MAJOR isn't installed and nvm couldn't install it."
  export PATH="$node24_bin:$PATH"

  # CLAUDE_ENV_FILE is run as shell code before each later Bash command (Claude Code hooks
  # reference), so prepending here wins over /opt/node22/bin. Append (>>) keeps other hooks' lines,
  # and the grep keeps a resumed session from adding the same line twice.
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    local path_line="export PATH=\"$node24_bin:\$PATH\""
    grep -qxF "$path_line" "$CLAUDE_ENV_FILE" 2>/dev/null || echo "$path_line" >>"$CLAUDE_ENV_FILE"
  else
    log "warning: CLAUDE_ENV_FILE isn't set, so later commands may still find another Node."
  fi

  local running_major
  running_major="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$running_major" = "$NODE_MAJOR" ] || fail "node is still version $running_major after the PATH change."
  log "using Node $(node --version) from $node24_bin."
}

# Step 2a: launches dockerd in the background. Returns 1 when Docker can't be started here (not
# installed, or not root).
start_docker() {
  if ! command -v dockerd >/dev/null 2>&1; then
    log "warning: dockerd isn't installed, so the local Supabase stack can't run."
    return 1
  fi
  if [ "$(id -u)" -ne 0 ]; then
    log "warning: starting dockerd needs root; start Docker by hand."
    return 1
  fi
  # A pid file left by an earlier container makes dockerd refuse to start; remove it only when
  # the process it names is gone.
  if [ -f /var/run/docker.pid ] && ! kill -0 "$(cat /var/run/docker.pid)" 2>/dev/null; then
    rm -f /var/run/docker.pid
  fi
  # `service docker start` fails in these containers (it may not raise a ulimit), so dockerd is
  # started directly. All its output goes to a log: the hooks reference says a background process
  # that keeps the hook's stdout or stderr open blocks Claude Code.
  log "starting dockerd (log: $DOCKER_LOG)."
  nohup dockerd </dev/null >"$DOCKER_LOG" 2>&1 &
}

# Step 2b: waits until the daemon answers, up to DOCKER_WAIT_SECONDS. Warns instead of failing.
wait_for_docker() {
  local waited=0
  until docker info >/dev/null 2>&1; do
    if [ "$waited" -ge "$DOCKER_WAIT_SECONDS" ]; then
      log "warning: Docker didn't answer within ${DOCKER_WAIT_SECONDS}s. Last lines of $DOCKER_LOG:"
      tail -n 10 "$DOCKER_LOG" 2>/dev/null || true
      return 0
    fi
    sleep 2
    waited=$((waited + 2))
  done
  log "Docker is running."
}

# Step 3: installs exactly what the lock file lists when it changed, then remembers its hash.
install_packages_if_needed() {
  local lock_file="package-lock.json"
  local hash_file="node_modules/.package-lock.sha256"
  if [ ! -f "$lock_file" ]; then
    log "no $lock_file, nothing to install."
    return 0
  fi
  local current_hash
  current_hash="$(sha256sum "$lock_file" | cut -d ' ' -f 1)"
  if [ -d node_modules ] && [ -f "$hash_file" ] && [ "$(cat "$hash_file")" = "$current_hash" ]; then
    log "$lock_file unchanged, skipping npm ci."
    return 0
  fi
  log "$lock_file changed or packages missing, running npm ci..."
  npm ci --no-audit --no-fund || fail "npm ci failed (npm's message is above)."
  echo "$current_hash" >"$hash_file"
  log "packages installed."
}

use_node24
# Docker starts in the background while npm installs, then we wait for it.
docker_launched=false
if docker info >/dev/null 2>&1; then
  log "Docker is already running."
elif start_docker; then
  docker_launched=true
fi
install_packages_if_needed
if [ "$docker_launched" = true ]; then
  wait_for_docker
fi
