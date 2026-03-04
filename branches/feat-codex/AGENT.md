# Codex Branch Agent Policy (feat/codex)

You are Codex CLI acting on branch `feat/codex`.

## Allowed edits
- `apps/web/src/highlight.ts`
- `apps/web/src/style.css`

## Explicit contract requirements
- `renderHighlightLayer(container: HTMLElement)` must return `HTMLElement`
- `showSentenceHighlight(layer: HTMLElement, rects: Rect[])` must exist and not throw
- If you add helpers, keep them file-local.

## Highlight quality goals
- Merge adjacent text-item rects into a single line-strip highlight.
- Avoid huge blocks; highlight should be tight to glyph area.
- Must work with rotated/scaled PDFs.

## Output
Return only JSON per `branches/BASE_POLICY.md`.
