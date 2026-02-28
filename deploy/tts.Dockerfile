# VPS demo TTS container: FastAPI wrapper + bundled Piper binary + one English voice.
# Avoids committing binaries to git by downloading at build time.

FROM python:3.13-slim

WORKDIR /app

# System deps for curl + audio libs (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

# Copy local TTS service code
COPY apps/tts-local/ /app/

# Install uv
RUN pip install --no-cache-dir uv

# Install python deps (uses uv.lock)
RUN uv sync --no-dev

# Download Piper binary release (x86_64)
RUN mkdir -p /opt/piper \
 && curl -fsSL -o /tmp/piper.tgz \
    https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz \
 && tar -xzf /tmp/piper.tgz -C /opt/piper --strip-components=1 \
 && rm -f /tmp/piper.tgz

# Download one reasonable English voice (lessac medium)
RUN mkdir -p /opt/voices \
 && curl -fsSL -o /opt/voices/en_US-lessac-medium.onnx \
    https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx \
 && curl -fsSL -o /opt/voices/en_US-lessac-medium.onnx.json \
    https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json

EXPOSE 17777

CMD ["uv", "run", "uvicorn", "tts_local.server:app", "--host", "0.0.0.0", "--port", "17777"]
