import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Min Trener',
        short_name: 'Min Trener',
        description: 'Minimalistisk, sensorbasert intervall- og treningsapp for mobil',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Mikroøkt (Kontor)',
            short_name: 'Mikroøkt',
            description: 'Start en rask 90-sekunders mikroøkt ved skrivebordet',
            url: '/?micro=planke-90',
            icons: [{ src: '/pwa-192x192.svg', sizes: '192x192' }],
          },
          {
            name: 'Tabata 4 min',
            short_name: 'Tabata',
            description: 'Start standard Tabata 20/10 intervalløkt',
            url: '/?tabata=start',
            icons: [{ src: '/pwa-192x192.svg', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,ico,json}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/images/exercises/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'exercise-images-cache-v2',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dager
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // B3 β6 (spec § 5): lydbanken runtime-caches CacheFirst — klippene er
          // immutable, så første nedlasting (preload ved persona-valg eller
          // avspilling) gjør dem varig offline-tilgjengelige. BEVISST utenfor
          // precache (globPatterns har ingen mp3): ~150 persona-klipp + studio-
          // banken ville gjort SW-installasjonen til en ~5 MB obligatorisk
          // nedlasting for alle — runtime + preload gir offline-garantien uten
          // den kostnaden.
          {
            urlPattern: /\/audio\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'persona-audio',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 år — filene er immutable
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          lucide: ['lucide-react'],
        },
      },
    },
  },
  server: {
    host: true,
  },
})
