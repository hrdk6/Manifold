/** Transcribe scanned pages and photos with a vision-capable model, then re-index the document. */
import * as db from './db';
import { getDoc, reprocess } from './kb';
import { complete } from './llm';
import { TRANSCRIBE } from './prompts';
import { hasModel, settings } from './settings';

async function blobToJpeg(blob: Blob, maxSide = 1800): Promise<string> {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas.toDataURL('image/jpeg', 0.88);
}

export async function transcribeDoc(docId: string, onProgress: (done: number, total: number, words?: number) => void, signal: AbortSignal) {
  const s = settings.get();
  if (!hasModel(s)) throw new Error('Connect a model in Assistant settings first.');
  const doc = getDoc(docId);
  const file = await db.get('files', docId);
  if (!doc || !file) throw new Error('The original file is missing.');
  const texts = (await db.get('texts', docId)) ?? { id: docId, pages: [] };
  const ocr: Record<number, string> = { ...(texts.ocr ?? {}) };
  const todo = (doc.scanned ?? []).filter((p) => !ocr[p]);
  const pdf = doc.kind === 'pdf' ? await (await import('./parse/pdf')).openPdf(await file.blob.arrayBuffer()) : null;
  try {
    for (let i = 0; i < todo.length; i++) {
      if (signal.aborted) break;
      onProgress(i, todo.length);
      const p = todo[i];
      let url: string;
      if (pdf) {
        const page = await pdf.getPage(p);
        const v1 = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 1600 / Math.max(v1.width, v1.height) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        url = canvas.toDataURL('image/jpeg', 0.86);
      } else url = await blobToJpeg(file.blob);
      const r = await complete(s, {
        system: TRANSCRIBE,
        messages: [{ role: 'user', content: `Transcribe page ${p} of "${doc.title}".`, images: [url] }],
        maxTokens: 8000,
        effort: 'low',
        signal,
        onText: (t) => onProgress(i, todo.length, Math.round(t.length / 6)),
      });
      ocr[p] = r.text.trim();
      await db.put('texts', { ...texts, ocr });
    }
  } finally {
    await pdf?.loadingTask.destroy();
  }
  onProgress(todo.length, todo.length);
  reprocess(docId);
}
