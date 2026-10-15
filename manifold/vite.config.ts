import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

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

/**
 * Serves /api/groq while developing, using the same handler Vercel runs in production.
 * The key is read from .env (here or one folder up) and never reaches the browser bundle.
 */
function groqDevApi(mode: string): Plugin {
  const env = { ...loadEnv(mode, '..', ''), ...loadEnv(mode, '.', '') }
  // tolerate the common typo GROQ_API-KEY
  const key = env.GROQ_API_KEY ?? env['GROQ_API-KEY'] ?? process.env.GROQ_API_KEY
  return {
    name: 'groq-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/groq', async (req, res) => {
        const { handleGroq } = (await server.ssrLoadModule('/api/_groq.ts')) as { handleGroq: (r: Request, key: string | undefined) => Promise<Response> }
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const host = req.headers.host ?? 'localhost'
        const request = new Request(`http://${host}/api/groq`, {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: ['GET', 'HEAD'].includes(req.method ?? 'GET') ? undefined : Buffer.concat(chunks),
        })
        const out = await handleGroq(request, key)
        res.statusCode = out.status
        out.headers.forEach((v: string, k: string) => res.setHeader(k, v))
        if (!out.body) return res.end()
        const reader = out.body.getReader()
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          res.write(value)
        }
        res.end()
      })
    },
  }
}

// Cross-origin isolation lets the in-browser search models use several CPU threads.
// `credentialless` keeps third-party fonts and model downloads working.
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), groqDevApi(mode)],
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
}))
