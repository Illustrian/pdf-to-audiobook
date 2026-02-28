import './style.css';
import { loadPdfFromFile, renderPage } from './pdf';
import { buildTextIndex, mapSentencesToItems } from './sentences';
import { buildSentenceRects, renderHighlightLayer, showSentenceHighlight } from './highlight';
import { ttsHealth } from './ttsClient';
import { SentencePlayer } from './player';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="wrap">
    <h1>PDF → Voice (Local Piper TTS)</h1>
    <div class="controls">
      <input id="file" type="file" accept="application/pdf" />
      <label>TTS URL <input id="ttsUrl" value="http://127.0.0.1:17777" size="28" /></label>
      <label>Token <input id="ttsToken" placeholder="(from local server)" size="18" /></label>
      <label>Speed <input id="speed" type="number" step="0.1" min="0.5" max="2.0" value="1.0" /></label>
      <button id="health">Check TTS</button>
      <span id="healthOut" class="pill">unknown</span>
      <button id="play" disabled>Play</button>
      <button id="stop" disabled>Stop</button>
    </div>
    <div class="stage">
      <div id="page" class="page"></div>
      <div id="status" class="status"></div>
    </div>
  </div>
`;

const els = {
  file: document.querySelector<HTMLInputElement>('#file')!,
  ttsUrl: document.querySelector<HTMLInputElement>('#ttsUrl')!,
  ttsToken: document.querySelector<HTMLInputElement>('#ttsToken')!,
  speed: document.querySelector<HTMLInputElement>('#speed')!,
  health: document.querySelector<HTMLButtonElement>('#health')!,
  healthOut: document.querySelector<HTMLSpanElement>('#healthOut')!,
  play: document.querySelector<HTMLButtonElement>('#play')!,
  stop: document.querySelector<HTMLButtonElement>('#stop')!,
  page: document.querySelector<HTMLDivElement>('#page')!,
  status: document.querySelector<HTMLDivElement>('#status')!,
};

let pdf: any | null = null;
let pageModel: Awaited<ReturnType<typeof renderPage>> | null = null;
let sentences: ReturnType<typeof mapSentencesToItems> | null = null;
let highlightLayer: HTMLElement | null = null;
let player: SentencePlayer | null = null;

function ttsOpts() {
  return {
    baseUrl: els.ttsUrl.value.trim(),
    token: els.ttsToken.value.trim() || undefined,
  };
}

async function refreshHealth() {
  const h = await ttsHealth(ttsOpts());
  els.healthOut.textContent = h.ok ? `ok${h.version ? ` (${h.version})` : ''}` : `down`;
  els.healthOut.className = `pill ${h.ok ? 'ok' : 'bad'}`;
  els.play.disabled = !h.ok || !sentences;
}

els.health.onclick = () => refreshHealth();

els.file.onchange = async () => {
  const f = els.file.files?.[0];
  if (!f) return;

  els.status.textContent = 'Loading PDF...';
  pdf = await loadPdfFromFile(f);
  pageModel = await renderPage(pdf, 1, { scale: 1.5, container: els.page });

  // Highlight layer overlay
  els.page.style.position = 'relative';
  highlightLayer?.remove();
  highlightLayer = renderHighlightLayer(els.page);

  const idx = buildTextIndex(pageModel.textItems);
  sentences = mapSentencesToItems(idx.fullText, idx.spans);

  els.status.textContent = `Loaded page 1. Sentences: ${sentences.length}.`;
  await refreshHealth();
};

els.play.onclick = async () => {
  if (!sentences || !pageModel) return;
  player?.stop();
  player = new SentencePlayer({
    tts: ttsOpts(),
    prefetch: 4,
    speed: Number(els.speed.value || '1.0'),
  });

  els.play.disabled = true;
  els.stop.disabled = false;

  await player.play(sentences, 0, {
    onSentenceStart: (i) => {
      const s = sentences![i]!;
      els.status.textContent = `Reading: ${s.text}`;
      if (highlightLayer) {
        const rects = buildSentenceRects(pageModel!.viewport, s, pageModel!.textItems);
        showSentenceHighlight(highlightLayer, rects);
      }
    },
    onError: (e) => {
      els.status.textContent = `Error: ${String((e as any)?.message ?? e)}`;
    },
  });

  els.play.disabled = false;
  els.stop.disabled = true;
};

els.stop.onclick = () => {
  player?.stop();
  els.stop.disabled = true;
  els.play.disabled = false;
  els.status.textContent = 'Stopped.';
  if (highlightLayer) highlightLayer.innerHTML = '';
};
