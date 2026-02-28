import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import type { TextItem } from './sentences';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export type PdfPageModel = {
  pageNumber: number;
  viewport: any;
  canvas: HTMLCanvasElement;
  textItems: TextItem[];
};

export async function loadPdfFromFile(file: File): Promise<any> {
  const buf = await file.arrayBuffer();
  return await pdfjsLib.getDocument({ data: buf }).promise;
}

export async function renderPage(
  pdf: any,
  pageNumber: number,
  opts: { scale: number; container: HTMLElement }
): Promise<PdfPageModel> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: opts.scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.display = 'block';

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  opts.container.innerHTML = '';
  opts.container.appendChild(canvas);

  await page.render({ canvasContext: ctx, viewport }).promise;

  const textContent = await page.getTextContent();
  const items: TextItem[] = (textContent.items as any[])
    .filter((it) => typeof it.str === 'string')
    .map((it) => ({
      str: it.str as string,
      transform: it.transform as number[],
      width: Number(it.width ?? 0),
      height: Number(it.height ?? 0),
    }));

  return { pageNumber, viewport, canvas, textItems: items };
}
