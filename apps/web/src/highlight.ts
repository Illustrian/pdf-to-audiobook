import type { Sentence } from './sentences';

export type Rect = { left: number; top: number; width: number; height: number };

type PdfViewport = {
  transform: number[];
  scale: number;
  convertToViewportPoint?: (x: number, y: number) => [number, number];
};

const MIN_RECT_WIDTH = 1;
const MIN_RECT_HEIGHT = 8;
const PAD_X = 1.5;
const PAD_Y = 1;
const LINE_TOLERANCE = 4;
const GAP_TOLERANCE = 16;

function toViewportPoint(viewport: PdfViewport, x: number, y: number): [number, number] {
  if (typeof viewport.convertToViewportPoint === 'function') {
    return viewport.convertToViewportPoint(x, y);
  }
  const t = viewport.transform;
  const vx = t[0] * x + t[2] * y + t[4];
  const vy = t[1] * x + t[3] * y + t[5];
  return [vx, vy];
}

function normalizeRect(rect: Rect): Rect | null {
  if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top)) return null;
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return null;

  const width = Math.max(rect.width, MIN_RECT_WIDTH);
  const height = Math.max(rect.height, MIN_RECT_HEIGHT);

  return {
    left: rect.left,
    top: rect.top,
    width,
    height,
  };
}

function padRect(rect: Rect): Rect {
  return {
    left: rect.left - PAD_X,
    top: rect.top - PAD_Y,
    width: rect.width + PAD_X * 2,
    height: rect.height + PAD_Y * 2,
  };
}

function sameLine(a: Rect, b: Rect): boolean {
  const aBottom = a.top + a.height;
  const bBottom = b.top + b.height;
  return Math.abs(a.top - b.top) <= LINE_TOLERANCE && Math.abs(aBottom - bBottom) <= LINE_TOLERANCE;
}

function mergeRects(rects: Rect[]): Rect[] {
  if (rects.length <= 1) return rects.slice();

  const sorted = rects.slice().sort((a, b) => (a.top === b.top ? a.left - b.left : a.top - b.top));
  const merged: Rect[] = [];
  let current = { ...sorted[0]! };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]!;
    const currentRight = current.left + current.width;

    if (sameLine(current, next) && next.left <= currentRight + GAP_TOLERANCE) {
      const right = Math.max(currentRight, next.left + next.width);
      const top = Math.min(current.top, next.top);
      const bottom = Math.max(current.top + current.height, next.top + next.height);

      current.left = Math.min(current.left, next.left);
      current.top = top;
      current.width = right - current.left;
      current.height = bottom - top;
      continue;
    }

    merged.push(current);
    current = { ...next };
  }

  merged.push(current);
  return merged
    .map(normalizeRect)
    .filter((r): r is Rect => r !== null);
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
  const width = Math.max(Math.abs(x2 - x1), MIN_RECT_WIDTH);
  const height = Math.max(Math.abs(y2 - y1), MIN_RECT_HEIGHT);

  return { left, top, width, height };
}

export function buildSentenceRects(
  viewport: PdfViewport,
  sentence: Sentence,
  items: Array<{ transform: number[]; width: number; height: number }>
): Rect[] {
  const rects: Rect[] = [];

  for (const sp of sentence.spans) {
    const item = items[sp.itemIndex];
    if (!item) continue;

    const normalized = normalizeRect(padRect(itemToRect(viewport, item)));
    if (!normalized) continue;
    rects.push(normalized);
  }

  return mergeRects(rects);
}

export function renderHighlightLayer(container: HTMLElement): HTMLElement {
  const layer = document.createElement('div');
  layer.className = 'sentence-highlight-layer';
  layer.style.position = 'absolute';
  layer.style.left = '0';
  layer.style.top = '0';
  layer.style.right = '0';
  layer.style.bottom = '0';
  layer.style.pointerEvents = 'none';
  container.appendChild(layer);
  return layer;
}

function applyHighlightStyle(el: HTMLDivElement, rect: Rect): void {
  el.style.position = 'absolute';
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.top}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.style.background = 'linear-gradient(90deg, rgba(255, 236, 153, 0.38), rgba(255, 213, 79, 0.50))';
  el.style.border = '1px solid rgba(181, 137, 0, 0.45)';
  el.style.borderRadius = '4px';
  el.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.22) inset, 0 2px 6px rgba(120, 90, 0, 0.18)';
  el.style.backdropFilter = 'saturate(1.06)';
}

export function showSentenceHighlight(layer: HTMLElement, rects: Rect[]): void {
  layer.replaceChildren();

  const merged = mergeRects(
    rects
      .map(normalizeRect)
      .filter((r): r is Rect => r !== null)
  );

  if (!merged.length) return;

  const fragment = document.createDocumentFragment();
  for (const rect of merged) {
    const el = document.createElement('div');
    el.className = 'sentence-highlight highlight-box';
    applyHighlightStyle(el, rect);
    fragment.appendChild(el);
  }

  layer.appendChild(fragment);
}
