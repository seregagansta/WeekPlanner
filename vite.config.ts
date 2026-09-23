import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
// GitHub project Pages lives under /WeekPlanner/. Local development keeps /.
const base = process.env.VITE_BASE_PATH || '/'
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'WeekPlanner — недельный планировщик',
        short_name: 'WeekPlanner',
        description: 'Ваша неделя, задачи и свободное время.',
        lang: 'ru',
        id: base,
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#f7f8fa',
        theme_color: '#287c63',
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          {
            src: `${base}icons/icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
})
