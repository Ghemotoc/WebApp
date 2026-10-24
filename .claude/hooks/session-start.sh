#!/usr/bin/env bash
# Claude Code SessionStart hook: gets a cloud session ready to run every check (story S1-E1-01;
# Node 24 and Docker added by "Tooling: Node 24 and Docker on every session start", 18 Oct 2026).
#
# Who runs it: Claude Code, when a session starts or resumes (.claude/settings.json, "SessionStart").
# What it does, in order:
#   1. Puts Node 24 first on PATH (decided 17 Oct 2026, 13:18: Node 24 LTS everywhere, .nvmrc), for
#      this hook and, through CLAUDE_ENV_FILE, for every Bash command Claude runs later in the
#      session. The image puts /opt/node22/bin early on PATH, so without this `node` is 22.
#   2. Points Playwright at the Chromium the cloud image ships, through CLAUDE_ENV_FILE, when it is
#      there and PLAYWRIGHT_CHROMIUM_PATH isn't set already ("Tooling: session-start hook points
#      Playwright at the pre-installed Chromium", 24 Oct 2026). The image's browser build can be
#      older than the one @playwright/test asks for, and `npm run test:e2e` then can't start one.
#   3. Starts the Docker daemon if it isn't running; the local Supabase stack needs it. Containers
#      lose the daemon on every restart, so this runs on every start and resume, not just once.
#      A pid file left behind by the old container is trusted only when the process it names is
#      really dockerd ("Tooling: session-start hook checks the pid file points at dockerd",
#      23 Oct 2026: after a restart the file named PID 192, which an unrelated process then had).
#   4. Installs npm packages only when package-lock.json changed: after a successful install it
#      stores the sha256 of package-lock.json in node_modules/.package-lock.sha256 and skips while
#      it matches. Deleting node_modules always triggers a fresh install.
# Safe to run any number of times. Errors: a missing Node 24 or a failed `npm ci` stops the hook
# with a non-zero exit code and a plain message. Docker is only needed for the database checks,
# so a Docker problem is a warning, and everything else still gets set up.
# Tests: scripts/session-start-hook.test.ts sources this file (which runs nothing) and calls the
# pid file functions with DOCKER_PID_FILE pointing at a file of its own, and the Chromium step
# with PREINSTALLED_CHROMIUM and CLAUDE_ENV_FILE pointing at files of its own.
set -euo pipefail

readonly NODE_MAJOR=24
readonly NVM_DIR="${NVM_DIR:-/opt/nvm}"
readonly DOCKER_LOG=/tmp/dockerd.log
# Where dockerd writes its process number. Tests point this at a temporary file.
readonly DOCKER_PID_FILE="${DOCKER_PID_FILE:-/var/run/docker.pid}"
readonly DOCKER_WAIT_SECONDS=60
# Where the cloud image keeps its Chromium (a link to the browser). Tests point this elsewhere.
readonly PREINSTALLED_CHROMIUM="${PREINSTALLED_CHROMIUM:-/opt/pw-browsers/chromium}"

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

# Step 2: tells every later Bash command to run the end-to-end tests in the image's Chromium.
# Why: on 23 Oct 2026 the image shipped Chromium build 1194 while @playwright/test 1.64 asked for
# 1248, so `npm run test:e2e` failed with "Executable doesn't exist" until someone set
# PLAYWRIGHT_CHROMIUM_PATH by hand. playwright.config.ts launches that browser when it is set.
# Does nothing when the variable is already set (someone chose a browser on purpose) or when
# there is no runnable Chromium at PREINSTALLED_CHROMIUM (on a laptop Playwright's own download is
# used, as before). Never fails: the end-to-end tests are the only thing that needs it.
use_preinstalled_chromium() {
  # A value that is already set wins: never overwrite someone's choice.
  if [ -n "${PLAYWRIGHT_CHROMIUM_PATH:-}" ]; then
    log "PLAYWRIGHT_CHROMIUM_PATH is already set ($PLAYWRIGHT_CHROMIUM_PATH), leaving it."
    return 0
  fi
  # -x is true only for a file that exists and can be run; a broken link fails it too.
  if [ ! -x "$PREINSTALLED_CHROMIUM" ]; then
    return 0
  fi
  # Without CLAUDE_ENV_FILE there is nowhere to put it for later commands, so say what to do.
  if [ -z "${CLAUDE_ENV_FILE:-}" ]; then
    log "warning: CLAUDE_ENV_FILE isn't set; run e2e tests with PLAYWRIGHT_CHROMIUM_PATH=$PREINSTALLED_CHROMIUM."
    return 0
  fi
  # Same as the PATH line in step 1: append, and the grep keeps a resume from adding it twice.
  local chromium_line="export PLAYWRIGHT_CHROMIUM_PATH=\"$PREINSTALLED_CHROMIUM\""
  grep -qxF "$chromium_line" "$CLAUDE_ENV_FILE" 2>/dev/null || echo "$chromium_line" >>"$CLAUDE_ENV_FILE"
  log "end-to-end tests will use the pre-installed Chromium ($PREINSTALLED_CHROMIUM)."
}

# Says whether the Docker pid file names a dockerd process that is running right now.
# A process number alone proves nothing after a container restart: numbers are handed out again,
# so the old file can name an unrelated process that happens to be alive. Linux keeps each
# process's program name in /proc/<pid>/comm, so we check that it reads "dockerd".
# Returns 0 for a live dockerd; 1 when the file is missing, empty, not a number, or names a
# process that is gone or isn't dockerd.
docker_pid_file_is_live() {
  local pid
  [ -f "$DOCKER_PID_FILE" ] || return 1
  # The file holds one number; drop the newline and any spaces around it.
  pid="$(tr -d '[:space:]' <"$DOCKER_PID_FILE")"
  # Anything other than digits (or nothing at all) can't be a process number.
  case "$pid" in
    '' | *[!0-9]*) return 1 ;;
  esac
  # No /proc entry means no process with that number is running.
  [ -r "/proc/$pid/comm" ] || return 1
  [ "$(cat "/proc/$pid/comm")" = "dockerd" ]
}

# Removes the Docker pid file when it doesn't name a running dockerd. dockerd refuses to start
# while the file names a live process, so a stale file would keep Docker down for the session.
# Leaves a file that names a live dockerd alone. Never fails: nothing to remove is fine.
remove_stale_docker_pid_file() {
  [ -f "$DOCKER_PID_FILE" ] || return 0
  if docker_pid_file_is_live; then
    return 0
  fi
  log "removing a stale $DOCKER_PID_FILE (PID $(tr -d '[:space:]' <"$DOCKER_PID_FILE") isn't dockerd)."
  rm -f "$DOCKER_PID_FILE"
}

# Step 3a: launches dockerd in the background, or notices one that is still starting. Returns 1
# when Docker can't be started here (not installed, or not root).
start_docker() {
  if ! command -v dockerd >/dev/null 2>&1; then
    log "warning: dockerd isn't installed, so the local Supabase stack can't run."
    return 1
  fi
  if [ "$(id -u)" -ne 0 ]; then
    log "warning: starting dockerd needs root; start Docker by hand."
    return 1
  fi
  # A dockerd that is running but not answering yet is still starting: wait for it instead of
  # launching a second one, which would refuse to start anyway.
  if docker_pid_file_is_live; then
    log "dockerd is already starting (PID $(tr -d '[:space:]' <"$DOCKER_PID_FILE")), waiting for it."
    return 0
  fi
  remove_stale_docker_pid_file
  # `service docker start` fails in these containers (it may not raise a ulimit), so dockerd is
  # started directly. All its output goes to a log: the hooks reference says a background process
  # that keeps the hook's stdout or stderr open blocks Claude Code.
  log "starting dockerd (log: $DOCKER_LOG)."
  nohup dockerd </dev/null >"$DOCKER_LOG" 2>&1 &
}

# Step 3b: waits until the daemon answers, up to DOCKER_WAIT_SECONDS. Warns instead of failing.
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

# Step 4: installs exactly what the lock file lists when it changed, then remembers its hash.
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

# Runs the four steps in order. Docker starts in the background while npm installs, then we
# wait for it.
main() {
  cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"
  use_node24
  use_preinstalled_chromium
  local docker_launched=false
  if docker info >/dev/null 2>&1; then
    log "Docker is already running."
  elif start_docker; then
    docker_launched=true
  fi
  install_packages_if_needed
  if [ "$docker_launched" = true ]; then
    wait_for_docker
  fi
}

# Run only when Claude Code executes the file; when a test sources it, just define the functions.
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
