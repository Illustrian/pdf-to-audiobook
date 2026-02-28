#!/usr/bin/env bash
# Thin wrapper to run Piper TTS server identical to docker-compose.demo.yml.
# Useful for local dev without Docker.
set -euo pipefail

VOICE="${PIPER_VOICE:-en_US-lessac}"
PORT="${PIPER_PORT:-17777}"
TOKEN="${PIPER_DOWNLOAD_TOKEN:-}" # optional

if ! command -v piper-server &>/dev/null; then
  echo "piper-server not found. Install Piper or use Docker." >&2
  exit 1
fi

echo "[demo_run_tts] Running Piper voice '$VOICE' on :$PORT"

CMD=(piper-server --port "$PORT" --voice "$VOICE")

[[ -n "$TOKEN" ]] && CMD+=(--download-voices-token "$TOKEN")

exec "${CMD[@]}"
