# VPS Public Demo (Option A: docker-compose port publishing)

This publishes:
- Web UI: `http://<server-ip>:18080`
- TTS HTTP API: `http://<server-ip>:17777` (token required)

## 1) Build the web assets

```bash
cd apps/web
npm ci
npm run build
```

## 2) Create demo env file

```bash
cd deploy
umask 077
cat > .env.demo <<'EOF'
# required
TTS_TOKEN=CHANGE_ME_TO_A_LONG_RANDOM_STRING
EOF
```

## 3) Start

```bash
cd deploy
docker compose --env-file .env.demo -f docker-compose.demo.yml up -d --build
```

## 4) Use

1. Open `http://<server-ip>:18080` in Chrome.
2. Upload a PDF.
3. Paste `TTS_TOKEN` into the UI Token field.
4. Click **Check TTS**, then **Play**.

## Notes / risks
- This is **public HTTP** (no TLS). Don’t reuse tokens.
- The TTS container downloads Piper + a voice model at build time.
- For real usage, put a TLS reverse proxy in front and restrict access.
