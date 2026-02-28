# VPS Demo Deployment

This directory contains Docker-based deployment configurations for running the PDF-to-Voice demo on a VPS.

## Architecture

- **Web UI** (`web` service): Static Vite app served via nginx on port 80
- **TTS API** (`tts` service): Piper-based FastAPI server on port 17777
- **Security**: Token-based authentication required for all TTS endpoints

## Prerequisites

- Docker and Docker Compose installed on VPS
- A Piper voice model file (`.onnx`)
- Domain name (optional, but recommended for HTTPS via reverse proxy)

## Quick Start

1. **Download a Piper voice model** (if you don't have one):
   bash
   mkdir -p ~/models
   cd ~/models
   wget https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx
   export PIPER_MODEL="$HOME/models/en_US-lessac-medium.onnx"
   

2. **Set environment variables**:
   bash
   export TTS_TOKEN=$(openssl rand -hex 32)
   export PIPER_MODEL=/path/to/your/model.onnx
   # Optional: customize ports
   export WEB_PORT=8080
   export TTS_PORT=17777
   

3. **Start the services**:
   bash
   cd /path/to/repo
   docker compose -f deploy/docker-compose.demo.yml up -d
   

4. **Get the token for sharing**:
   bash
   echo "TTS Token: $TTS_TOKEN"
   

5. **Access the demo**:
   - Web UI: `http://your-vps-ip` (or port 8080 if set)
   - TTS API: `http://your-vps-ip:17777`

6. **Stop the services**:
   bash
   docker compose -f deploy/docker-compose.demo.yml down
   

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `TTS_TOKEN` | (required) | Secret token for TTS API access |
| `PIPER_MODEL` | (required) | Path to Piper `.onnx` model file |
| `WEB_PORT` | 80 | Port for web UI |
| `TTS_PORT` | 17777 | Port for TTS API |

## Security Considerations

⚠️ **Important**: This setup exposes the TTS API publicly with token authentication.

- Keep `TTS_TOKEN` secret and use a strong random value
- Use HTTPS in production (via reverse proxy)
- Consider IP whitelisting or VPN for additional security
- The TTS API has CORS enabled for browser access

## Using with a Reverse Proxy (Recommended)

For HTTPS and better security, use nginx, Caddy, or Traefik:

### Example: Caddy

Caddyfile
pdf-demo.example.com {
    reverse_proxy localhost:8080
}

tts-demo.example.com {
    reverse_proxy localhost:17777
}


## Troubleshooting

### Check service status
bash
docker compose -f deploy/docker-compose.demo.yml ps
docker compose -f deploy/docker-compose.demo.yml logs -f


### Test TTS API directly
bash
curl -H "X-OC-TTS-TOKEN: $TTS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "speed": 1.0}' \
  http://localhost:17777/tts --output test.wav


### Rebuild after code changes
bash
docker compose -f deploy/docker-compose.demo.yml up -d --build


## Files

| File | Purpose |
|------|---------|
| `docker-compose.demo.yml` | Main orchestration for VPS demo |
| `Dockerfile.web` | Web UI container build |
| `Dockerfile.tts` | TTS server container build |
| `README.md` | This file |
