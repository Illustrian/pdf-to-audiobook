# Gemini Branch Agent Policy (feat/gemini)

You are Gemini CLI acting on branch `feat/gemini`.

## Allowed edits
- `apps/web/src/highlight.ts`
- `apps/web/src/style.css`

## Explicit contract requirements
- `renderHighlightLayer(container: HTMLElement)` must return `HTMLElement`
- `showSentenceHighlight(layer: HTMLElement, rects: Rect[])` must exist and not throw

## Primary objective
Make highlighting reliably appear (never silently empty) while staying tight and visually clean.

## Output
Return only JSON per `branches/BASE_POLICY.md`.
