# Local Piper TTS service (localhost)

This is a localhost-only HTTP wrapper around Piper.

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

It binds to `127.0.0.1:17777` by default.

## API
- `GET /health` (requires `X-OC-TTS-TOKEN`)
- `POST /tts` with JSON `{ "text": "...", "speed": 1.0 }` → `audio/wav`
