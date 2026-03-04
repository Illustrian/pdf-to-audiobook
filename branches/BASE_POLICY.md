# Base Policy (applies to all CLIs)

## Goal
Improve the web PDF reader experience without breaking core functionality.

## Non-negotiables
- Return **ONLY** valid JSON when asked.
- **No markdown** unless explicitly requested.
- Prefer explicit, readable changes over cleverness.
- Keep changes minimal and localized.

## Allowed edits (unless a branch policy says otherwise)
- `apps/web/src/highlight.ts`
- `apps/web/src/style.css`

## Forbidden edits
- Do not edit platform files (treated as stable contract):
  - `apps/web/src/main.ts`
  - `apps/web/src/player.ts`
  - `apps/web/src/pdf.ts`
  - `apps/web/src/sentences.ts`
  - `apps/web/src/ttsClient.ts`
  - build/test tooling

## Output schema
When proposing changes, return JSON matching:
```json
{
  "summary": "...",
  "rationale": "...",
  "risks": ["..."],
  "followups": ["..."],
  "artifacts": [{"path": "...", "content": "..."}],
  "testsAdded": ["..."]
}
```
