#!/usr/bin/env bash
# Run the TTS server for VPS demo (Docker or local mode)
#
# Usage:
#   # Docker mode (recommended for VPS):
#   export TTS_TOKEN=$(openssl rand -hex 32)
#   export PIPER_MODEL=/path/to/model.onnx
#   ./scripts/demo_run_tts.sh docker
#
#   # Local mode (development):
#   export TTS_TOKEN=dev-token
#   export PIPER_MODEL=/path/to/model.onnx
#   ./scripts/demo_run_tts.sh local

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TTS_DIR="$REPO_ROOT/apps/tts-local"
MODE="${1:-docker}"

# Validate required environment variables
if [[ -z "${TTS_TOKEN:-}" ]]; then
    echo "Error: TTS_TOKEN environment variable must be set" >&2
    echo "Generate one with: openssl rand -hex 32" >&2
    exit 1
fi

if [[ -z "${PIPER_MODEL:-}" ]]; then
    echo "Error: PIPER_MODEL environment variable must be set" >&2
    echo "Example: export PIPER_MODEL=/path/to/en_US-lessac-medium.onnx" >&2
    exit 1
fi

if [[ ! -f "$PIPER_MODEL" ]]; then
    echo "Error: Piper model file not found: $PIPER_MODEL" >&2
    exit 1
fi

echo "=== TTS Server for VPS Demo ==="
echo "Mode: $MODE"
echo "Model: $PIPER_MODEL"
echo "Token: ${TTS_TOKEN:0:8}... (hidden)"

if [[ "$MODE" == "docker" ]]; then
    echo ""
    echo "Building TTS Docker image..."
    cd "$REPO_ROOT"
    docker build -f deploy/Dockerfile.tts -t pdf-to-voice-tts:latest "$TTS_DIR"
    
    echo ""
    echo "Starting TTS container..."
    docker run -d \
        --name pdf-to-voice-tts \
        -p "${TTS_PORT:-17777}:17777" \
        -e TTS_TOKEN="$TTS_TOKEN" \
        -e PIPER_MODEL=/app/model/model.onnx \
        -e TTS_CACHE_DIR=/app/cache \
        -v "$(dirname "$PIPER_MODEL"):/app/model:ro" \
        -v tts-cache:/app/cache \
        --restart unless-stopped \
        pdf-to-voice-tts:latest
    
    echo ""
    echo "TTS container started. Check logs with:"
    echo "  docker logs -f pdf-to-voice-tts"
    echo ""
    echo "Test health endpoint:"
    echo "  curl -H 'X-OC-TTS-TOKEN: $TTS_TOKEN' http://localhost:${TTS_PORT:-17777}/health"

elif [[ "$MODE" == "local" ]]; then
    echo ""
    echo "Running TTS server locally..."
    cd "$TTS_DIR"
    
    # Check for uv
    if ! command -v uv &>/dev/null; then
        echo "Error: uv not found. Install from https://github.com/astral-sh/uv" >&2
        exit 1
    fi
    
    # Check for piper
    if ! command -v piper &>/dev/null; then
        echo "Error: piper binary not found in PATH" >&2
        exit 1
    fi
    
    # Install dependencies
    echo "Installing dependencies..."
    uv sync
    
    # Run server (bind to 0.0.0.0 for VPS access)
    echo ""
    echo "Starting server on 0.0.0.0:${TTS_PORT:-17777}..."
    export TTS_HOST="${TTS_HOST:-0.0.0.0}"
    export TTS_PORT="${TTS_PORT:-17777}"
    exec uv run uvicorn tts_local.server:app --host "$TTS_HOST" --port "$TTS_PORT"
else
    echo "Error: Unknown mode '$MODE'" >&2
    echo "Usage: $0 [docker|local]" >&2
    exit 1
fi
