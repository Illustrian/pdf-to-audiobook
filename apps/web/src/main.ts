import './style.css';
import { loadPdfFromFile, renderPage } from './pdf';
import { buildTextIndex, mapSentencesToItems } from './sentences';
import { buildSentenceRects, renderHighlightLayer, showSentenceHighlight } from './highlight';
import { ttsHealth } from './ttsClient';
import { SentencePlayer } from './player';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="wrap">
    <h1>PDF → Voice (Piper TTS)</h1>

    <div class="controls">
      <input id="file" type="file" accept="application/pdf" />

      <span class="spacer"></span>

      <button id="prev" disabled>Prev</button>
      <label>Page <input id="pageNo" type="number" min="1" step="1" value="1" size="4" /></label>
      <span id="pageOut" class="pill">-/ -</span>
      <button id="next" disabled>Next</button>

      <span class="spacer"></span>

      <label>TTS URL <input id="ttsUrl" value="" size="28" /></label>
      <label>Token <input id="ttsToken" placeholder="(required)" size="18" /></label>
      <label>Speed <input id="speed" type="number" step="0.1" min="0.5" max="2.0" value="1.0" /></label>
      <label>Prefetch <input id="prefetch" type="number" min="0" max="8" step="1" value="0" /></label>
      <label><input id="autoNextPage" type="checkbox" checked /> Auto-next page</label>

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
  prev: document.querySelector<HTMLButtonElement>('#prev')!,
  next: document.querySelector<HTMLButtonElement>('#next')!,
  pageNo: document.querySelector<HTMLInputElement>('#pageNo')!,
  pageOut: document.querySelector<HTMLSpanElement>('#pageOut')!,
  ttsUrl: document.querySelector<HTMLInputElement>('#ttsUrl')!,
  ttsToken: document.querySelector<HTMLInputElement>('#ttsToken')!,
  speed: document.querySelector<HTMLInputElement>('#speed')!,
  prefetch: document.querySelector<HTMLInputElement>('#prefetch')!,
  autoNextPage: document.querySelector<HTMLInputElement>('#autoNextPage')!,
  health: document.querySelector<HTMLButtonElement>('#health')!,
  healthOut: document.querySelector<HTMLSpanElement>('#healthOut')!,
  play: document.querySelector<HTMLButtonElement>('#play')!,
  stop: document.querySelector<HTMLButtonElement>('#stop')!,
  page: document.querySelector<HTMLDivElement>('#page')!,
  status: document.querySelector<HTMLDivElement>('#status')!,
};

// Default TTS URL:
// - Local mode: 127.0.0.1
// - VPS/demo mode: same hostname as the web page
els.ttsUrl.value = `http://${location.hostname}:17777`;

let pdf: any | null = null;
let numPages = 0;
let currentPage = 1;
let pageModel: Awaited<ReturnType<typeof renderPage>> | null = null;
let sentences: ReturnType<typeof mapSentencesToItems> | null = null;
let highlightLayer: any = null;
let player: SentencePlayer | null = null;
let stopRequested = false;

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

function updatePagerUi() {
  els.pageNo.value = String(currentPage);
  els.pageOut.textContent = numPages ? `${currentPage} / ${numPages}` : '- / -';
  const hasPdf = !!pdf;
  els.prev.disabled = !hasPdf || currentPage <= 1;
  els.next.disabled = !hasPdf || (numPages ? currentPage >= numPages : true);
}

async function loadPage(n: number) {
  if (!pdf) return;
  const target = Math.max(1, Math.min(numPages || 1, Math.floor(n || 1)));
  currentPage = target;
  updatePagerUi();

  els.status.textContent = `Loading page ${currentPage}...`;

  pageModel = await renderPage(pdf, currentPage, { scale: 1.5, container: els.page });

  // Highlight layer overlay
  els.page.style.position = 'relative';
  highlightLayer?.destroy?.();
  highlightLayer?.remove?.();
  highlightLayer = renderHighlightLayer(els.page);

  const idx = buildTextIndex(pageModel.textItems);
  sentences = mapSentencesToItems(idx.fullText, idx.spans);

  els.status.textContent = `Loaded page ${currentPage}. Sentences: ${sentences.length}.`;
  await refreshHealth();
}

async function playFrom(pageNo: number, startSentence: number) {
  if (!pdf) return;
  stopRequested = false;

  await loadPage(pageNo);
  if (!sentences || !pageModel) return;

  player?.stop();
  player = new SentencePlayer({
    tts: ttsOpts(),
    prefetch: Math.max(0, Math.min(8, Number(els.prefetch.value || '0'))),
    speed: Number(els.speed.value || '1.0'),
  });

  els.play.disabled = true;
  els.stop.disabled = false;

  await player.play(sentences, startSentence, {
    onSentenceStart: (i) => {
      const s = sentences![i]!;
      els.status.textContent = `Page ${currentPage}: ${s.text}`;
      if (highlightLayer) {
        const rects = buildSentenceRects(pageModel!.viewport, s, pageModel!.textItems);
        showSentenceHighlight(highlightLayer, rects);
      }
    },
    onError: (e) => {
      els.status.textContent = `Error: ${String((e as any)?.message ?? e)}`;
    },
  });

  if (stopRequested) return;

  // Auto-advance to next page (continuous read)
  if (els.autoNextPage.checked && currentPage < numPages) {
    return playFrom(currentPage + 1, 0);
  }

  els.play.disabled = false;
  els.stop.disabled = true;
  els.status.textContent = 'Done.';
}

els.health.onclick = () => refreshHealth();

els.file.onchange = async () => {
  const f = els.file.files?.[0];
  if (!f) return;

  els.status.textContent = 'Loading PDF...';
  pdf = await loadPdfFromFile(f);
  numPages = Number(pdf?.numPages || 0);
  currentPage = 1;
  updatePagerUi();
  await loadPage(1);
};

els.prev.onclick = async () => {
  if (!pdf) return;
  await loadPage(currentPage - 1);
};

els.next.onclick = async () => {
  if (!pdf) return;
  await loadPage(currentPage + 1);
};

els.pageNo.onchange = async () => {
  if (!pdf) return;
  await loadPage(Number(els.pageNo.value || '1'));
};

els.play.onclick = async () => {
  if (!pdf) return;
  await playFrom(currentPage, 0);
};

els.stop.onclick = () => {
  stopRequested = true;
  player?.stop();
  els.stop.disabled = true;
  els.play.disabled = false;
  els.status.textContent = 'Stopped.';
  if (highlightLayer) highlightLayer.innerHTML = '';
};
