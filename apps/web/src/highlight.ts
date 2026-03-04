import type { Sentence } from './sentences';

export type Rect = { left: number; top: number; width: number; height: number };

export type HighlightOptions = {
  /** Background color (CSS color value). Default: rgba(255, 230, 0, 0.35) */
  color?: string;
  /** Border radius in pixels. Default: 3 */
  borderRadius?: number;
  /** Horizontal padding in pixels. Default: 2 */
  padX?: number;
  /** Vertical padding in pixels. Default: 1 */
  padY?: number;
  /** Height multiplier for highlight (0-1). Default: 0.6 */
  heightMultiplier?: number;
  /** Animation duration in milliseconds. Default: 150 */
  animationDurationMs?: number;
  /** Whether to animate highlight appearance. Default: true */
  animate?: boolean;
  /** Whether to scroll active highlight into view. Default: true */
  scrollIntoView?: boolean;
  /** Scroll behavior: 'smooth' or 'auto'. Default: 'smooth' */
  scrollBehavior?: ScrollBehavior;
  /** CSS z-index for highlight layer. Default: 100 */
  zIndex?: number;
};

type PdfViewport = {
  transform: number[];
  scale: number;
  convertToViewportPoint?: (x: number, y: number) => [number, number];
};

const DEFAULT_OPTIONS: Required<HighlightOptions> = {
  color: 'rgba(255, 230, 0, 0.35)',
  borderRadius: 3,
  padX: 2,
  padY: 1,
  heightMultiplier: 0.6,
  animationDurationMs: 150,
  animate: true,
  scrollIntoView: true,
  scrollBehavior: 'smooth',
  zIndex: 100,
};

function toViewportPoint(viewport: PdfViewport, x: number, y: number): [number, number] {
  if (typeof viewport.convertToViewportPoint === 'function') {
    return viewport.convertToViewportPoint(x, y);
  }
  const t = viewport.transform;
  const vx = t[0]! * x + t[2]! * y + t[4]!;
  const vy = t[1]! * x + t[3]! * y + t[5]!;
  return [vx, vy];
}

// Convert PDF.js text item geometry into viewport-space highlight rect.
export function itemToRect(
  viewport: PdfViewport,
  item: { transform: number[]; width: number; height: number }
): Rect {
  const [, , , d, e, f] = item.transform;

  const pdfWidth = Math.max(item.width, 0);
  const pdfHeight = Math.max(Math.abs(item.height || (d as number)), 0);

  // PDF origin is bottom-left; PDF.js uses transform (e,f) as text baseline origin.
  // Convert the item bounds to viewport-space using PDF.js helpers when available.
  const [x1, y1] = toViewportPoint(viewport, e as number, f as number);
  const [x2, y2] = toViewportPoint(viewport, (e as number) + pdfWidth, (f as number) - pdfHeight);

  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.max(Math.abs(x2 - x1), 1);
  const height = Math.max(Math.abs(y2 - y1), 10);

  return { left, top, width, height };
}

// Check if two rects are on the same line (similar vertical position)
function sameLine(r1: Rect, r2: Rect, threshold: number): boolean {
  return Math.abs(r1.top - r2.top) < threshold;
}

// Merge two adjacent rects on the same line into one continuous rect
function mergeRects(r1: Rect, r2: Rect): Rect {
  const left = Math.min(r1.left, r2.left);
  const top = Math.min(r1.top, r2.top);
  const right = Math.max(r1.left + r1.width, r2.left + r2.width);
  const bottom = Math.max(r1.top + r1.height, r2.top + r2.height);
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

// Group rects by line and merge adjacent ones horizontally
function mergeAdjacentRectsOnSameLine(rects: Rect[]): Rect[] {
  if (rects.length === 0) return [];

  // Use a small threshold to determine if rects are on the same line
  // This accounts for slight variations in text baseline
  const lineThreshold = 3;

  // Group rects by line (similar top value)
  const lines: Rect[][] = [];

  for (const rect of rects) {
    let foundLine = false;
    for (const line of lines) {
      if (sameLine(rect, line[0]!, lineThreshold)) {
        line.push(rect);
        foundLine = true;
        break;
      }
    }
    if (!foundLine) {
      lines.push([rect]);
    }
  }

  // For each line, sort by left position and merge adjacent rects
  const merged: Rect[] = [];

  for (const line of lines) {
    // Sort by left position
    line.sort((a, b) => a.left - b.left);

    // Merge adjacent rects (with small gap tolerance)
    const gapThreshold = 5;
    let current = line[0]!;

    for (let i = 1; i < line.length; i++) {
      const next = line[i]!;
      const currentRight = current.left + current.width;

      if (next.left <= currentRight + gapThreshold) {
        // Adjacent or overlapping - merge
        current = mergeRects(current, next);
      } else {
        // Not adjacent - push current and start new
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);
  }

  // Sort by vertical position, then horizontal
  merged.sort((a, b) => {
    const topDiff = a.top - b.top;
    if (Math.abs(topDiff) < lineThreshold) {
      return a.left - b.left;
    }
    return topDiff;
  });

  return merged;
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
  return mergeAdjacentRectsOnSameLine(rects);
}

/** Calculate the bounding box that contains all given rects */
function getBoundingRect(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;

  let minLeft = rects[0]!.left;
  let minTop = rects[0]!.top;
  let maxRight = rects[0]!.left + rects[0]!.width;
  let maxBottom = rects[0]!.top + rects[0]!.height;

  for (let i = 1; i < rects.length; i++) {
    const r = rects[i]!;
    minLeft = Math.min(minLeft, r.left);
    minTop = Math.min(minTop, r.top);
    maxRight = Math.max(maxRight, r.left + r.width);
    maxBottom = Math.max(maxBottom, r.top + r.height);
  }

  return {
    left: minLeft,
    top: minTop,
    width: maxRight - minLeft,
    height: maxBottom - minTop,
  };
}

/** Clamp a value between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Easing function for smooth animations */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface HighlightLayer {
  element: HTMLElement;
  options: Required<HighlightOptions>;
  /** Remove all highlights and clean up */
  clear: () => void;
  /** Destroy the layer and remove from DOM */
  destroy: () => void;
}

/** Helper to clear highlights from a layer element */
export function clearHighlightLayer(layer: HTMLElement): void {
  layer.innerHTML = '';
}

/** Helper to destroy a layer element */
export function destroyHighlightLayer(layer: HTMLElement): void {
  layer.remove();
}

export function renderHighlightLayer(
  container: HTMLElement,
  options: HighlightOptions = {}
): HTMLElement {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const layer = document.createElement('div');
  layer.className = 'highlight-layer';
  layer.style.position = 'absolute';
  layer.style.left = '0';
  layer.style.top = '0';
  layer.style.right = '0';
  layer.style.bottom = '0';
  layer.style.pointerEvents = 'none';
  layer.style.zIndex = String(opts.zIndex);
  layer.style.overflow = 'hidden';

  container.appendChild(layer);

  return layer;
}

/** Animate a highlight element with fade-in effect */
function animateHighlightIn(
  element: HTMLElement,
  durationMs: number,
  targetOpacity: number
): void {
  const startTime = performance.now();
  element.style.opacity = '0';

  const animate = (currentTime: number): void => {
    const elapsed = currentTime - startTime;
    const progress = clamp(elapsed / durationMs, 0, 1);
    const eased = easeOutCubic(progress);

    element.style.opacity = String(eased * targetOpacity);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
}

/** Scroll a rect into view if needed */
function scrollRectIntoView(
  container: HTMLElement,
  rect: Rect,
  behavior: ScrollBehavior
): void {
  // Get container's visible area
  const containerRect = container.getBoundingClientRect();
  const containerScrollTop = container.scrollTop;
  const containerScrollLeft = container.scrollLeft;

  // Calculate rect position relative to container
  const rectTop = rect.top;
  const rectBottom = rect.top + rect.height;
  const rectLeft = rect.left;
  const rectRight = rect.left + rect.width;

  const visibleTop = containerScrollTop;
  const visibleBottom = containerScrollTop + containerRect.height;
  const visibleLeft = containerScrollLeft;
  const visibleRight = containerScrollLeft + containerRect.width;

  // Check if rect is fully visible
  const isVisibleVertically = rectTop >= visibleTop && rectBottom <= visibleBottom;
  const isVisibleHorizontally = rectLeft >= visibleLeft && rectRight <= visibleRight;

  if (isVisibleVertically && isVisibleHorizontally) {
    return; // Already visible, no scrolling needed
  }

  // Calculate scroll target with some padding
  const padding = 50;
  let targetTop = containerScrollTop;
  let targetLeft = containerScrollLeft;

  if (!isVisibleVertically) {
    if (rectTop < visibleTop) {
      targetTop = rectTop - padding;
    } else if (rectBottom > visibleBottom) {
      targetTop = rectBottom - containerRect.height + padding;
    }
  }

  if (!isVisibleHorizontally) {
    if (rectLeft < visibleLeft) {
      targetLeft = rectLeft - padding;
    } else if (rectRight > visibleRight) {
      targetLeft = rectRight - containerRect.width + padding;
    }
  }

  container.scrollTo({
    top: Math.max(0, targetTop),
    left: Math.max(0, targetLeft),
    behavior,
  });
}

export function showSentenceHighlight(
  layer: HTMLElement,
  rects: Rect[],
  options: HighlightOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Clear existing highlights
  layer.innerHTML = '';

  if (rects.length === 0) return;

  // Create highlight elements
  for (const r of rects) {
    const el = document.createElement('div');
    const height = r.height * opts.heightMultiplier;
    const top = r.top + (r.height - height) / 2; // Center vertically

    el.className = 'highlight-rect';
    el.dataset.highlight = 'active';
    el.style.position = 'absolute';
    el.style.left = `${r.left - opts.padX}px`;
    el.style.top = `${top - opts.padY}px`;
    el.style.width = `${r.width + opts.padX * 2}px`;
    el.style.height = `${height + opts.padY * 2}px`;
    el.style.background = opts.color;
    el.style.borderRadius = `${opts.borderRadius}px`;
    el.style.transition = opts.animate
      ? `opacity ${opts.animationDurationMs}ms ease-out, transform ${opts.animationDurationMs}ms ease-out`
      : 'none';
    el.style.willChange = opts.animate ? 'opacity, transform' : 'auto';

    layer.appendChild(el);

    if (opts.animate) {
      animateHighlightIn(el, opts.animationDurationMs, 1);
    }
  }

  // Scroll into view if needed
  if (opts.scrollIntoView) {
    const boundingRect = getBoundingRect(rects);
    if (boundingRect) {
      const container = layer.parentElement;
      if (container) {
        scrollRectIntoView(container, boundingRect, opts.scrollBehavior);
      }
    }
  }
}

/** Show multiple highlights with different styles (e.g., active vs inactive sentences) */
export function showMultiHighlight(
  layer: HTMLElement | HighlightLayer,
  groups: Array<{
    rects: Rect[];
    options?: HighlightOptions;
  }>
): void {
  const element = 'element' in layer ? layer.element : layer;
  const baseOptions = 'options' in layer ? layer.options : DEFAULT_OPTIONS;

  // Clear existing highlights
  element.innerHTML = '';

  for (const group of groups) {
    const opts = { ...baseOptions, ...group.options };

    for (const r of group.rects) {
      const el = document.createElement('div');
      const height = r.height * opts.heightMultiplier;
      const top = r.top + (r.height - height) / 2;

      el.className = 'highlight-rect';
      el.dataset.highlight = opts.scrollIntoView ? 'active' : 'inactive';
      el.style.position = 'absolute';
      el.style.left = `${r.left - opts.padX}px`;
      el.style.top = `${top - opts.padY}px`;
      el.style.width = `${r.width + opts.padX * 2}px`;
      el.style.height = `${height + opts.padY * 2}px`;
      el.style.background = opts.color;
      el.style.borderRadius = `${opts.borderRadius}px`;
      el.style.transition = opts.animate
        ? `opacity ${opts.animationDurationMs}ms ease-out`
        : 'none';

      element.appendChild(el);

      if (opts.animate) {
        animateHighlightIn(el, opts.animationDurationMs, 1);
      }
    }
  }
}

/** Update highlight options for an existing layer */
export function updateHighlightOptions(
  layer: HighlightLayer,
  options: HighlightOptions
): void {
  layer.options = { ...layer.options, ...options };
  layer.element.style.zIndex = String(layer.options.zIndex);
}

/** Fade out and remove all highlights */
export function fadeOutHighlights(
  layer: HTMLElement | HighlightLayer,
  durationMs?: number
): Promise<void> {
  return new Promise((resolve) => {
    const element = 'element' in layer ? layer.element : layer;
    const opts = 'options' in layer ? layer.options : DEFAULT_OPTIONS;
    const duration = durationMs ?? opts.animationDurationMs;

    const highlights = element.querySelectorAll<HTMLElement>('.highlight-rect');
    if (highlights.length === 0) {
      resolve();
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const progress = clamp(elapsed / duration, 0, 1);
      const eased = easeOutCubic(progress);
      const opacity = 1 - eased;

      for (const h of highlights) {
        h.style.opacity = String(opacity);
      }

      if (progress >= 1) {
        element.innerHTML = '';
        resolve();
      } else {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  });
}
