#!/usr/bin/env bash
# Build production web assets for the VPS demo.
# Run from repo root: ./scripts/demo_build_web.sh
set -euo pipefail

WEB_DIR="$(dirname "$0")/../web"
DIST_DIR="$WEB_DIR/dist"

if [[ ! -d "$WEB_DIR" ]]; then
  echo "[demo_build_web] Web directory not found: $WEB_DIR" >&2
  exit 1
fi

echo "[demo_build_web] Installing dependencies…"
cd "$WEB_DIR"

# Prefer pnpm if available, else fallback to npm
tool="npm"
command -v pnpm >/dev/null 2>&1 && tool="pnpm"

$tool install --frozen-lockfile

echo "[demo_build_web] Building…"
$tool run build

echo "[demo_build_web] Build finished → $DIST_DIR"
