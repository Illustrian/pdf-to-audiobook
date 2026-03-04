# Local Piper TTS service (VPS-friendly)

This is an HTTP wrapper around Piper. For VPS use, run it bound to 0.0.0.0 and protect it with TTS_TOKEN.

## Requirements
- `uv`
- `piper` binary available on PATH (or set `PIPER_BIN`)
- A Piper voice model `.onnx` file (set `PIPER_MODEL`)

## Run

```bash
cd apps/tts-local
export TTS_TOKEN="<random-string>"   # required
export PIPER_MODEL="/path/to/en_US-*.onnx"  # required
./run_local_tts.sh
```

It binds to `0.0.0.0:17777` by default (set TTS_HOST to override).

## API
- `GET /health` (requires `X-OC-TTS-TOKEN`)
- `POST /tts` with JSON `{ "text": "...", "speed": 1.0 }` → `audio/wav`
