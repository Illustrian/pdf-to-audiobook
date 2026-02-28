from fastapi.testclient import TestClient

from tts_local.server import app


def test_health_requires_token(monkeypatch):
    # TTS_TOKEN is read at import time; we just validate the route rejects missing token.
    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code in (401, 500)
