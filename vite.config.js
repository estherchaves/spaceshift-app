import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // No GitHub Pages a app fica em /<repositório>/; o workflow de publicação
  // passa esse caminho em BASE_PATH. Localmente e no Vercel é a raiz.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    // PWA: instalável e usável sem internet. Não há servidor, por isso basta
    // guardar em cache os ficheiros da app (incluindo o módulo 3D e as
    // fontes); os projetos já ficam no próprio aparelho. Com 'prompt', a
    // versão nova só entra quando a pessoa aceita (nada muda a meio de um projeto).
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'SpaceShift',
        short_name: 'SpaceShift',
        description: 'Desenhe uma divisão, coloque móveis à escala e veja se tudo cabe, em 2D e 3D.',
        lang: 'pt-PT',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f3f2ef',
        theme_color: '#f3f2ef',
        categories: ['design', 'productivity', 'lifestyle'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // O módulo 3D tem ~1 MB; o limite por omissão (2 MB) chega, mas fica explícito.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    // A cena 3D (Three.js + R3F + Drei, ~1 MB) é um chunk à parte, carregado
    // só quando se abre a vista 3D; o editor 2D inicial fica em ~300 kB.
    chunkSizeWarningLimit: 1100,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    css: false,
  },
})
