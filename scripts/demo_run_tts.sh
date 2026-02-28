#!/bin/bash
cd ../apps/tts-local
pip install uv

uv sync

uv run python test_server.py --host 0.0.0.0 --port 8000
