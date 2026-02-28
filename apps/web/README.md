# Web PDF Reader

- Opens a local PDF
- Extracts selectable text
- Splits into sentences
- Highlights the sentence being read
- Fetches WAV audio from the local TTS service (Piper)

## Run

```bash
npm install
npm run dev
```

Configure in the UI:
- TTS URL: `http://127.0.0.1:17777`
- Token: from `apps/tts-local/run_local_tts.sh`
