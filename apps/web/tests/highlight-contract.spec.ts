import { test, expect } from '@playwright/test';

test('highlight module exports stable contract and renders something', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const m: any = await import('/src/highlight.ts');

    if (typeof m.renderHighlightLayer !== 'function') return { ok: false, error: 'missing renderHighlightLayer' };
    if (typeof m.showSentenceHighlight !== 'function') return { ok: false, error: 'missing showSentenceHighlight' };

    const host = document.createElement('div');
    host.style.position = 'relative';
    host.style.width = '800px';
    host.style.height = '600px';
    document.body.appendChild(host);

    const layer = m.renderHighlightLayer(host);
    if (!(layer instanceof HTMLElement)) return { ok: false, error: 'renderHighlightLayer must return HTMLElement' };

    // empty should not throw
    m.showSentenceHighlight(layer, []);

    // render a basic rect
    m.showSentenceHighlight(layer, [{ left: 10, top: 20, width: 100, height: 12 }]);

    return { ok: true, childCount: layer.childElementCount };
  });

  expect(result.ok).toBeTruthy();
  expect(result.childCount).toBeGreaterThan(0);
});
