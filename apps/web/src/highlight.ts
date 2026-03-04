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
  const [x1, y1] = toViewportPoint(viewport, e, f);
  const [x2, y2] = toViewportPoint(viewport, e + pdfWidth, f - pdfHeight);

  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.max(Math.abs(x2 - x1), 1);
  // Use a smaller minimum height; big minimums look like blocks (esp. superscripts/footnotes)
  const height = Math.max(Math.abs(y2 - y1), 6);

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

function mergeLineRects(rects: Rect[]): Rect[] {
  // Merge per-line so highlights look like continuous strips instead of fragmented boxes.
  const sorted = [...rects].sort((a, b) => (a.top === b.top ? a.left - b.left : a.top - b.top));

  const lineTol = 8; // px
  const gapTol = 6; // px

  type Line = { top: number; height: number; rects: Rect[] };
  const lines: Line[] = [];

  for (const r of sorted) {
    const h = Math.max(r.height, 1);
    const line = lines.find((ln) => Math.abs(ln.top - r.top) <= lineTol && Math.abs(ln.height - h) <= 12);
    if (!line) {
      lines.push({ top: r.top, height: h, rects: [r] });
    } else {
      line.rects.push(r);
      // keep a stable representative top/height
      line.top = Math.min(line.top, r.top);
      line.height = Math.max(line.height, h);
    }
  }

  const merged: Rect[] = [];
  for (const ln of lines) {
    const rs = ln.rects.sort((a, b) => a.left - b.left);
    let cur: Rect | null = null;
    for (const r of rs) {
      if (!cur) {
        cur = { ...r };
        continue;
      }
      const curRight = cur.left + cur.width;
      if (r.left <= curRight + gapTol) {
        const newRight = Math.max(curRight, r.left + r.width);
        cur.width = newRight - cur.left;
        cur.top = Math.min(cur.top, r.top);
        cur.height = Math.max(cur.height, r.height);
      } else {
        merged.push(cur);
        cur = { ...r };
      }
    }
    if (cur) merged.push(cur);
  }

  return merged;
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

  const merged = mergeLineRects(rects);
  const padX = 2;
  const padY = 1;

  for (const r of merged) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = `${Math.max(0, r.left - padX)}px`;
    el.style.top = `${Math.max(0, r.top - padY)}px`;
    el.style.width = `${r.width + padX * 2}px`;
    el.style.height = `${r.height + padY * 2}px`;
    el.style.background = 'rgba(255, 230, 0, 0.30)';
    el.style.border = '1px solid rgba(255, 200, 0, 0.35)';
    el.style.borderRadius = '6px';
    layer.appendChild(el);
  }
}
