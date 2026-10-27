import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'screenshot-wide.png', 'screenshot-narrow.png'],
      devOptions: {
        enabled: true, // generate + register the SW under `npm run dev` too, not just build
        type: 'module',
      },
      manifest: {
        id: '/',
        name: 'KC Agency',
        short_name: 'KC Agency',
        description: 'Multi-branch, role-based POS + distributor billing system',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F7F5FF',
        theme_color: '#351442',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          {
            src: '/screenshot-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'KC Agency Dashboard Desktop View'
          },
          {
            src: '/screenshot-narrow.png',
            sizes: '412x915',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'KC Agency Dashboard Mobile View'
          }
        ],
      },
      workbox: {
        // App-shell + static-asset caching only. POS billing is NOT cached
        // offline-first — invoice numbering, stock, and payments all need a
        // live server round-trip, so every /api/* call bypasses the SW
        // (NetworkOnly) rather than risking a stale/queued write. True
        // offline billing is a deliberate non-goal for now — see README.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
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
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
});
