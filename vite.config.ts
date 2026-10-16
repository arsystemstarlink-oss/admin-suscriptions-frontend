import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

const API_PATH = '/api'
const MAX_API_REQUEST_SIZE = 1024 * 1024

function apiFailoverProxy(localApiUrl: string, fallbackApiUrl: string): Plugin {
  return {
    name: 'api-failover-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = req.url
        if (!requestUrl) {
          next()
          return
        }

        const parsedUrl = new URL(requestUrl, 'http://localhost')
        if (parsedUrl.pathname !== API_PATH && !parsedUrl.pathname.startsWith(`${API_PATH}/`)) {
          next()
          return
        }

        let requestBody: Buffer
        try {
          const chunks: Buffer[] = []
          let size = 0
          for await (const chunk of req) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            size += buffer.length
            if (size > MAX_API_REQUEST_SIZE) {
              res.statusCode = 413
              res.end(JSON.stringify({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo de la solicitud excede 1 MB.' } }))
              return
            }
            chunks.push(buffer)
          }
          requestBody = Buffer.concat(chunks)
        } catch (error) {
          console.error('[api-proxy] No se pudo leer el cuerpo de la solicitud.', error)
          res.statusCode = 400
          res.end(JSON.stringify({ error: { code: 'INVALID_REQUEST', message: 'No se pudo leer la solicitud.' } }))
          return
        }

        const apiPath = `${parsedUrl.pathname.slice(API_PATH.length)}${parsedUrl.search}`
        const headers = new Headers()
        for (const [key, value] of Object.entries(req.headers)) {
          if (value && !['connection', 'content-length', 'host', 'transfer-encoding'].includes(key.toLowerCase())) {
            headers.set(key, Array.isArray(value) ? value.join(', ') : value)
          }
        }

        const forwardRequest = async (apiUrl: string) => {
          const target = `${apiUrl.replace(/\/+$/, '')}${apiPath || '/'}`
          return fetch(target, {
            method: req.method,
            headers,
            body: ['GET', 'HEAD'].includes(req.method ?? '') ? undefined : requestBody,
          })
        }

        let upstreamResponse: Response
        try {
          upstreamResponse = await forwardRequest(localApiUrl)
        } catch (localError) {
          console.warn('[api-proxy] Local API unavailable; retrying the fallback API.', localError)
          try {
            upstreamResponse = await forwardRequest(fallbackApiUrl)
          } catch (fallbackError) {
            console.error('[api-proxy] Both the local and fallback APIs are unavailable.', fallbackError)
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: {
                code: 'API_UNAVAILABLE',
                message: 'No se pudo conectar con la API local ni con la API de respaldo.',
              },
            }))
            return
          }
        }

        try {
          const responseBody = Buffer.from(await upstreamResponse.arrayBuffer())
          res.statusCode = upstreamResponse.status
          upstreamResponse.headers.forEach((value, key) => {
            if (!['connection', 'content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
              res.setHeader(key, value)
            }
          })
          res.end(responseBody)
        } catch (error) {
          console.error('[api-proxy] Failed to read the API response.', error)
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            error: {
              code: 'API_RESPONSE_UNAVAILABLE',
              message: 'La API no pudo completar la respuesta.',
            },
          }))
        }
      })
    },
  }
}

function spaFallback() {
  return {
    name: 'spa-fallback',
    closeBundle: async () => {
      const { copyFile, writeFile } = await import('node:fs/promises')
      const dist = path.resolve(__dirname, 'dist')
      try {
        await copyFile(path.join(dist, 'index.html'), path.join(dist, '404.html'))
        await writeFile(path.join(dist, '.nojekyll'), '')
      } catch {}
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const localApiUrl = env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  const fallbackApiUrl =
    env.VITE_API_FALLBACK_URL ||
    'https://admin-suscriptions-backend-production.up.railway.app/api'

  return {
    base: process.env.VITE_BASE_PATH ?? '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        devOptions: {
          enabled: false,
        },
        includeAssets: ['favicon.svg', 'favicon.ico', 'pwa-192.png', 'pwa-512.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'A|R SYSTEM',
          short_name: 'A|R SYSTEM',
          description: 'A|R SYSTEM - Administración de suscripciones',
          theme_color: '#142C6B',
          background_color: '#ffffff',
          display: 'standalone',
          scope: './',
          start_url: './',
          id: './',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
        },
      }),
      apiFailoverProxy(localApiUrl, fallbackApiUrl),
      spaFallback(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
