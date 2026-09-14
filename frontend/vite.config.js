import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Mêmes chemins qu'en production (rewrite Vercel) : le cookie de session reste first-party,
// et les photos de profil (/uploads) se chargent sans souci CORS.
const proxy = { '/api': 'http://localhost:3000', '/uploads': 'http://localhost:3000' };

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
});
