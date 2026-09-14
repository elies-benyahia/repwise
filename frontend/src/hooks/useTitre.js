import { useEffect } from 'react';
import { NOM_APP } from '../identite.js';

// Titre d'onglet par page ; la page d'accueil (calculateur) garde celui d'index.html, optimisé SEO.
export function useTitre(titre) {
  useEffect(() => {
    const titrePrecedent = document.title;
    document.title = `${titre} — ${NOM_APP}`;
    return () => {
      document.title = titrePrecedent;
    };
  }, [titre]);
}
