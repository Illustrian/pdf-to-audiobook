import type { Sentence } from './sentences';

export type Rect = { left: number; top: number; width: number; height: number };

// PDF.js viewport transform helper: convert item transform to DOM-ish rect.
export function itemToRect(viewport: any, item: { transform: number[]; width: number; height: number }): Rect {
  // Based on PDF.js text item transform conventions.
  const [a, _b, _c, d, e, f] = item.transform;
  // Transform point (e,f) using viewport transform.
  const tx = viewport.transform[0] * e + viewport.transform[2] * f + viewport.transform[4];
  const ty = viewport.transform[1] * e + viewport.transform[3] * f + viewport.transform[5];

  // Approximate width/height in viewport units.
  const w = Math.abs(a) * viewport.scale;
  const h = Math.abs(d) * viewport.scale;

  // PDF coordinate origin is bottom-left; viewport already flips Y.
  return { left: tx, top: ty - h, width: Math.max(w, 1), height: Math.max(h, 10) };
}

export function buildSentenceRects(viewport: any, sentence: Sentence, items: Array<{ transform: number[]; width: number; height: number }>): Rect[] {
  const rects: Rect[] = [];
  for (const sp of sentence.spans) {
    const it = items[sp.itemIndex];
    if (!it) continue;
    rects.push(itemToRect(viewport, it));
  }
  return rects;
}

export function renderHighlightLayer(container: HTMLElement): HTMLElement {
  const layer = document.createElement('div');
  layer.style.position = 'absolute';
  layer.style.left = '0';
  layer.style.top = '0';
  layer.style.right = '0';
  layer.style.bottom = '0';
  layer.style.pointerEvents = 'none';
  container.appendChild(layer);
  return layer;
}

export function showSentenceHighlight(layer: HTMLElement, rects: Rect[]): void {
  layer.innerHTML = '';
  for (const r of rects) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = `${r.left}px`;
    el.style.top = `${r.top}px`;
    el.style.width = `${r.width}px`;
    el.style.height = `${r.height}px`;
    el.style.background = 'rgba(255, 230, 0, 0.35)';
    el.style.borderRadius = '3px';
    layer.appendChild(el);
  }
}
