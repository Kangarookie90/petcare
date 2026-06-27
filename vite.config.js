import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' = non aggiorna in automatico: aspetta che l'utente
      // confermi dal banner mostrato in app (vedi UpdateBanner.jsx)
      registerType: 'prompt',

      // Usiamo il manifest.json statico già presente in /public,
      // quindi disabilitiamo la generazione automatica per evitare duplicati.
      manifest: false,
      includeManifestIcons: false,

      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Il nuovo SW resta "in attesa" finché l'utente non clicca "Aggiorna"
        skipWaiting: false,
        clientsClaim: false,
        navigateFallbackDenylist: [/^\/api\//],
      },

      devOptions: {
        enabled: false, // niente service worker durante `npm run dev`
      },
    }),
  ],
})