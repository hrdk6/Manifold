import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** Hash of everything that shapes the assistant's built-in lesson index, so it re-indexes when lessons change. */
function contentVersion() {
  const h = createHash('sha1')
  const walk = (p: string) => {
    if (statSync(p).isDirectory()) for (const f of readdirSync(p).sort()) walk(join(p, f))
    else h.update(readFileSync(p))
  }
  for (const p of ['src/content', 'src/rag/course.ts', 'src/rag/chunk.ts', 'src/rag/parse/text.ts', 'src/rag/models.ts']) walk(p)
  return h.digest('hex').slice(0, 12)
}

// Cross-origin isolation lets the in-browser search models use several CPU threads.
// `credentialless` keeps third-party fonts and model downloads working.
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __CONTENT_VERSION__: JSON.stringify(contentVersion()),
  },
  server: { headers: isolation },
  preview: { headers: isolation },
  worker: { format: 'es' },
  optimizeDeps: {
    // ships its own WebAssembly runtime; pre-bundling breaks its asset paths
    exclude: ['@huggingface/transformers'],
  },
  build: {
    // three.js is lazy-loaded on the home page only; the search models load in a worker
    chunkSizeWarningLimit: 900,
  },
})
