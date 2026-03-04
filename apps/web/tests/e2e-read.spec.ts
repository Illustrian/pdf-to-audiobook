import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

function makeWavSilence(ms = 200): Buffer {
  // 16-bit PCM mono @ 16000Hz
  const sampleRate = 16000;
  const numSamples = Math.floor((sampleRate * ms) / 1000);
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  // data is already zeros => silence
  return buf;
}

test('loads a PDF and highlights while playing (TTS mocked)', async ({ page }) => {
  // Make audio playback deterministic + fast
  await page.addInitScript(() => {
    // @ts-ignore
    HTMLMediaElement.prototype.play = function () {
      const el = this;
      setTimeout(() => {
        // @ts-ignore
        el.onended && el.onended(new Event('ended'));
        el.dispatchEvent(new Event('ended'));
      }, 10);
      return Promise.resolve();
    };
  });

  // Mock TTS endpoints regardless of base URL
  await page.route('**/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, version: 'test' }),
    });
  });

  await page.route('**/tts', async (route) => {
    const wav = makeWavSilence(120);
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
      },
      body: wav,
    });
  });

  await page.goto('/');

  // Upload fixture PDF
  const pdfPath = fileURLToPath(new URL('./fixtures/hello.pdf', import.meta.url));
  await page.setInputFiles('input#file', pdfPath);

  // Wait until sentences are computed
  await expect(page.locator('#status')).toContainText('Sentences:', { timeout: 30_000 });

  // Trigger a health check (should become ok)
  await page.click('button#health');
  await expect(page.locator('#healthOut')).toContainText('ok');

  // Play
  await page.click('button#play');

  // Highlight layer should get children quickly
  const highlighted = await page.waitForFunction(() => {
    const pageEl = document.querySelector('#page');
    if (!pageEl) return false;
    const layers = Array.from(pageEl.querySelectorAll('div')).filter((d) =>
      (d as HTMLElement).style.pointerEvents === 'none'
    );
    const layer = layers[layers.length - 1] as HTMLElement | undefined;
    return !!layer && layer.childElementCount > 0;
  }, undefined, { timeout: 30_000 });

  expect(await highlighted.jsonValue()).toBeTruthy();
});
