from __future__ import annotations

import hashlib
import os
import subprocess
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response

APP_VERSION = "0.1.0"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 17777

CACHE_DIR = Path(os.environ.get("TTS_CACHE_DIR", ".cache"))
CACHE_DIR.mkdir(parents=True, exist_ok=True)

PIPER_BIN = os.environ.get("PIPER_BIN", "piper")
PIPER_MODEL = os.environ.get("PIPER_MODEL", "")

TOKEN = os.environ.get("TTS_TOKEN", "")

app = FastAPI(title="Local Piper TTS", version=APP_VERSION)


def _require_token(x_oc_tts_token: Optional[str]) -> None:
    if not TOKEN:
        raise HTTPException(status_code=500, detail="Server misconfigured: TTS_TOKEN not set")
    if x_oc_tts_token != TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")


def _cache_key(text: str, voice: str, speed: float) -> str:
    h = hashlib.sha256()
    h.update(text.encode("utf-8"))
    h.update(b"\n")
    h.update(voice.encode("utf-8"))
    h.update(b"\n")
    h.update(str(speed).encode("utf-8"))
    return h.hexdigest()


@app.get("/health")
def health(x_oc_tts_token: Optional[str] = Header(default=None)):
    _require_token(x_oc_tts_token)
    return {
        "ok": True,
        "version": APP_VERSION,
        "piper_bin": PIPER_BIN,
        "model_configured": bool(PIPER_MODEL),
    }


@app.post("/tts")
def tts(
    payload: dict,
    x_oc_tts_token: Optional[str] = Header(default=None),
):
    _require_token(x_oc_tts_token)

    text = str(payload.get("text", "")).strip()
    if not text:
        raise HTTPException(status_code=400, detail="Missing text")

    speed = float(payload.get("speed", 1.0))
    if speed <= 0:
        raise HTTPException(status_code=400, detail="Invalid speed")

    # Voice is currently mapped to a Piper model path. Keep explicit.
    voice = str(payload.get("voice", "default"))

    if not PIPER_MODEL:
        raise HTTPException(status_code=500, detail="PIPER_MODEL is not set")

    key = _cache_key(text, voice, speed)
    out_path = CACHE_DIR / f"{key}.wav"

    if out_path.exists() and out_path.stat().st_size > 44:
        data = out_path.read_bytes()
        return Response(content=data, media_type="audio/wav")

    # Piper usage: echo "text" | piper --model <model> --output_file <wav>
    # Speed control differs by build; we keep it explicit and optional.
    cmd = [PIPER_BIN, "--model", PIPER_MODEL, "--output_file", str(out_path)]

    try:
        subprocess.run(
            cmd,
            input=text.encode("utf-8"),
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"Piper binary not found: {PIPER_BIN}")
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Piper failed: {e.stderr.decode('utf-8', errors='ignore')}")

    if not out_path.exists() or out_path.stat().st_size <= 44:
        raise HTTPException(status_code=500, detail="Piper produced empty output")

    data = out_path.read_bytes()
    return Response(content=data, media_type="audio/wav")
