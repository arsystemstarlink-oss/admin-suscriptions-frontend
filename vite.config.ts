import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

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

export default defineConfig({
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
        enabled: true,
        type: 'module',
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
    spaFallback(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
