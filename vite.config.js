import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Supabase (REST, Storage signed URLs, Realtime), the Google Maps embed of the route map, and photos
// held as data URLs until upload. Inline styles stay allowed: screens set widths and colors with style="".
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' data: https://*.supabase.co wss://*.supabase.co",
  "media-src 'self' blob: mediastream:",
  'frame-src https://www.google.com',
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

export default defineConfig(({ mode }) => ({
  server: {
    port: 5173,
    open: false,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  base: './',
  plugins: [
    // Build only: the dev server injects inline scripts and its own websocket.
    {
      name: 'content-security-policy',
      apply: 'build',
      transformIndexHtml: () => [{
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy },
        injectTo: 'head-prepend'
      }]
    },
    // Web build only: lets phones install the field panel from the browser (Vercel).
    // The APK already ships its files, so it gets no service worker.
    VitePWA({
      disable: mode === 'android',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Ruta Cero • Campo',
        short_name: 'Ruta Cero',
        description: 'Operación en campo de las rutas de recolección de Ruta Cero.',
        lang: 'es',
        start_url: './?mode=field',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Precache the app and its fonts so it opens without signal; Supabase calls stay network-only.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ]
}));
