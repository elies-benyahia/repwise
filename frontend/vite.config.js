import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Mêmes chemins qu'en production (rewrite Vercel) : le cookie de session reste first-party,
// et les photos de profil (/uploads) se chargent sans souci CORS.
const proxy = { '/api': 'http://localhost:3000', '/uploads': 'http://localhost:3000' };

export default defineConfig({
  plugins: [
    react(),
    // Retour du 21/09 ("mode hors-ligne / PWA") : installable sur l'écran d'accueil, sert
    // l'app shell (JS/CSS/icônes) depuis le cache si le réseau tombe — les données elles-mêmes
    // (séances, journal...) passent par /api et restent en ligne uniquement, ce plugin ne fait
    // que du cache d'assets statiques (registerType 'autoUpdate' : jamais bloqué sur une
    // ancienne version, se met à jour tout seul en tâche de fond).
    VitePWA({
      registerType: 'autoUpdate',
      // /api et /uploads jamais mis en cache par le service worker : toujours du réseau frais,
      // la donnée métier ne doit jamais être servie périmée depuis le cache.
      workbox: {
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
      },
      manifest: {
        name: 'Repwise',
        short_name: 'Repwise',
        description: 'Calculateur de calories et macros, séances, journal alimentaire et progression pour la musculation.',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b0d09',
        theme_color: '#0b0d09',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { proxy },
  preview: { proxy },
});
