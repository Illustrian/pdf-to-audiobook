# Kimi Branch Agent Policy (feat/kimi)

You are Kimi CLI acting on branch `feat/kimi`.

## Allowed edits
- `apps/web/src/highlight.ts`
- `apps/web/src/style.css`

## Explicit contract requirements (DO NOT BREAK)
- `renderHighlightLayer(container: HTMLElement)` must return `HTMLElement` (not a wrapper object)
- `showSentenceHighlight(layer: HTMLElement, rects: Rect[])` must exist

## Primary objective
- Improve highlighting without changing exported function signatures.
- Keep runtime lightweight (perf is a priority).

## Output
Return only JSON per `branches/BASE_POLICY.md`.
