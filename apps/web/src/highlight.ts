import type { Sentence } from './sentences';

export type Rect = { left: number; top: number; width: number; height: number };

type PdfViewport = {
  transform: number[];
  scale: number;
  convertToViewportPoint?: (x: number, y: number) => [number, number];
};

function toViewportPoint(viewport: PdfViewport, x: number, y: number): [number, number] {
  if (typeof viewport.convertToViewportPoint === 'function') {
    return viewport.convertToViewportPoint(x, y);
  }
  const t = viewport.transform;
  const vx = t[0] * x + t[2] * y + t[4];
  const vy = t[1] * x + t[3] * y + t[5];
  return [vx, vy];
}

// Convert PDF.js text item geometry into viewport-space highlight rect.
export function itemToRect(viewport: PdfViewport, item: { transform: number[]; width: number; height: number }): Rect {
  const [, , , d, e, f] = item.transform;

  const pdfWidth = Math.max(item.width, 0);
  const pdfHeight = Math.max(Math.abs(item.height || d), 0);

  // PDF origin is bottom-left; PDF.js uses transform (e,f) as text baseline origin.
  // Convert the item bounds to viewport-space using PDF.js helpers when available.
  const [x1, y1] = toViewportPoint(viewport, e, f);
  const [x2, y2] = toViewportPoint(viewport, e + pdfWidth, f - pdfHeight);

  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.max(Math.abs(x2 - x1), 1);
  const height = Math.max(Math.abs(y2 - y1), 10);

  return { left, top, width, height };
}

export function buildSentenceRects(
  viewport: PdfViewport,
  sentence: Sentence,
  items: Array<{ transform: number[]; width: number; height: number }>
): Rect[] {
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
