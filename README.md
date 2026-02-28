# pdf-to-audiobook

Parallel-agent workflow scaffold for comparing outputs across:
- OpenClaw sub-agents (sessions_spawn)
- Codex CLI (`@openai/codex`)
- Gemini CLI (`@google/gemini-cli`)
- Kimi CLI (`@jacksontian/kimi-cli`)

## Quick start

```bash
npm ci
cp .env.example .env
# fill in keys when prompted/needed
npm run doctor
npm run compare -- demo-task
```

Reports are written to `reports/<taskId>.md` and `reports/<taskId>.json`.

## Notes
- Strict JSON output contract is enforced.
- Integration tests are optional and should be run only when API keys are present.
