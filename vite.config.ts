import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
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
  plugins: [react(), tailwindcss(), spaFallback()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
