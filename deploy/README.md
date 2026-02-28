# VPS-Only Public Demo (Option A)

These instructions publish the **PDF-to-Voice** demo on any vanilla Linux VPS using only Docker Compose. It exposes:

* **Web UI** – `http://<VPS-IP>:18080`
* **TTS API** – `http://<VPS-IP>:17777`

> ⚠️  No SSL termination is included; use an external reverse-proxy/Caddy if you need HTTPS.

---

## 1 · Prerequisites

1. Docker ≥ 23 and Docker Compose v2 (`docker compose version`).
2. ~2 GB free disk for voice model cache.
3. An optional **Piper download token** if Rhasspy rate-limits anonymous pulls.

```bash
sudo apt update && sudo apt install -y docker docker-compose-plugin
sudo usermod -aG docker $USER   # log out/in afterward
```

---

## 2 · Build static web bundle

```bash
./scripts/demo_build_web.sh
```

This produces `web/dist/` which is mounted read-only by Nginx.

---

## 3 · Start services

```bash
# (optional) export PIPER_DOWNLOAD_TOKEN="<temp-token>"
cd deploy

docker compose -f docker-compose.demo.yml pull   # grab latest images
docker compose -f docker-compose.demo.yml up -d  # launch demo
```

Logs:

```bash
docker compose -f docker-compose.demo.yml logs -f web
docker compose -f docker-compose.demo.yml logs -f tts
```

---

## 4 · Check it works

1. Open `http://<VPS-IP>:18080` – the UI should load.
2. TTS probe:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world"}' \
  http://<VPS-IP>:17777/api/tts | head -c 32
```

---

## 5 · Updating

```bash
./scripts/demo_build_web.sh && \
 docker compose -f deploy/docker-compose.demo.yml build --pull web && \
 docker compose -f deploy/docker-compose.demo.yml up -d
```

---

## 6 · Stopping & Cleanup

```bash
cd deploy
docker compose -f docker-compose.demo.yml down --volumes
```

Voice models remain in volume `pdfvoice_tts_cache`. Remove it with:

```bash
docker volume rm pdfvoice_tts_cache
```
