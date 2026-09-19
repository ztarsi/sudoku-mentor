#!/usr/bin/env bash
# Deploy the staging branch on the staging server.
#
# Run from a cron job or a systemd timer every few minutes, as a normal user
# (never root), from anywhere:
#
#   */3 * * * * /home/you/sudoku-mentor/scripts/deploy-staging.sh
#
# What it does, in order: fetch origin/staging; stop if it has not moved
# since the last successful build; reset the working tree to it; npm ci;
# npm run build. Every line it logs carries a timestamp. Any failure exits
# non-zero and leaves the previous build in dist/ untouched (the build goes
# to a temporary folder first and is swapped in only when it succeeds).
#
# Environment (all optional):
#   REPO_DIR   the clone to deploy (default: the repository this script is in)
#   LOG_FILE   where to append the log (default: $REPO_DIR/../deploy-staging.log)
#   BRANCH     the branch to track (default: staging)
#   FORCE=1    build even when the branch has not moved
#   ALLOW_ROOT=1  skip the non-root guard (for tests in throwaway containers only)

set -u -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${REPO_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
LOG_FILE="${LOG_FILE:-$(dirname "$REPO_DIR")/deploy-staging.log}"
BRANCH="${BRANCH:-staging}"
STAMP_FILE="$REPO_DIR/.deployed-commit"
LOCK_DIR="$REPO_DIR/.deploy-staging.lock"

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG_FILE"
}

fail() {
  log "FAILED: $*"
  exit 1
}

if [ "$(id -u)" -eq 0 ] && [ "${ALLOW_ROOT:-0}" != "1" ]; then
  fail "refusing to run as root; run this as the user that owns $REPO_DIR"
fi

# One deploy at a time. mkdir is atomic; a stale lock older than an hour is
# removed so a crashed run cannot block deploys for good.
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  if [ -n "$(find "$LOCK_DIR" -maxdepth 0 -mmin +60 2>/dev/null)" ]; then
    log "removing a stale lock"
    rmdir "$LOCK_DIR" 2>/dev/null || true
    mkdir "$LOCK_DIR" 2>/dev/null || fail "another deploy is running"
  else
    log "another deploy is running; skipping"
    exit 0
  fi
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null' EXIT

cd "$REPO_DIR" || fail "cannot cd to $REPO_DIR"

log "fetching origin/$BRANCH"
git fetch --quiet origin "$BRANCH" || fail "git fetch"
TARGET="$(git rev-parse "origin/$BRANCH")" || fail "origin/$BRANCH not found"
LAST="$(cat "$STAMP_FILE" 2>/dev/null || true)"

if [ "${FORCE:-0}" != "1" ] && [ "$TARGET" = "$LAST" ] && [ -f dist/index.html ]; then
  log "up to date at ${TARGET:0:7}; nothing to do"
  exit 0
fi

log "deploying ${TARGET:0:7} (previous: ${LAST:0:7})"
git reset --hard --quiet "$TARGET" || fail "git reset"
git clean -fdq -e .deployed-commit -e node_modules -e dist || fail "git clean"

log "npm ci"
npm ci --no-audit --no-fund 2>&1 | tee -a "$LOG_FILE" || fail "npm ci"

# Build into a scratch folder so a broken build never replaces a good one.
rm -rf dist.next
log "npm run build"
npm run build -- --outDir dist.next 2>&1 | tee -a "$LOG_FILE" || fail "npm run build"
[ -f dist.next/index.html ] || fail "build produced no index.html"

rm -rf dist.previous
[ -d dist ] && mv dist dist.previous
mv dist.next dist || fail "could not move the new build into place"
rm -rf dist.previous

printf '%s\n' "$TARGET" > "$STAMP_FILE"
log "deployed ${TARGET:0:7}"
