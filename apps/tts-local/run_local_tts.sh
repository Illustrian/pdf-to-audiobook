#!/usr/bin/env bash
set -euo pipefail

# Requires: uv (https://github.com/astral-sh/uv)
# Usage:
#   export TTS_TOKEN=... (required)
#   export PIPER_MODEL=/path/to/en_US-*.onnx (required)
#   ./run_local_tts.sh

cd "$(dirname "$0")"

if ! command -v uv >/dev/null 2>&1; then
  echo "uv not found. Install: curl -LsSf https://astral.sh/uv/install.sh | sh" >&2
  exit 1
fi

uv sync

HOST=${TTS_HOST:-127.0.0.1}
PORT=${TTS_PORT:-17777}

exec uv run uvicorn tts_local.server:app --host "$HOST" --port "$PORT"
