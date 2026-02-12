import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo-camellos.png', 'imagotipo.png', 'icon-192.png', 'icon-512.png', 'icon-180.png', 'favicon-32.png'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Fix #14: NO cachear endpoints de API sensibles
        // Solo cachear assets estaticos, no datos de usuario
        runtimeCaching: [
          {
            // Solo cachear assets estaticos (imagenes, fuentes)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|woff2|woff|ttf)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 dias
              }
            }
          }
          // Fix #14: Eliminado el cache de /api/ - datos de salud NO deben cachearse
          // en el Service Worker por privacidad
        ]
      }
    })
  ],
})
