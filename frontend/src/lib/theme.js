// Choix de couleur de thème (cahier : "changer la couleur de fond et de la nav bar", demandé le
// 14/09). Ne touche QUE la teinte d'accent (boutons, liens, nav, glow du fond animé) : --fond et
// --surface (le vrai fond quasi-noir) restent fixes, tout comme --donnees et les couleurs macros
// (courbes/graphiques), qui doivent rester les couleurs validées par le skill dataviz — un thème
// d'accent plus flashy ne doit jamais rejaillir sur des couleurs qui encodent des données.
// Purement cosmétique et client : stocké en localStorage (pas de compte requis, marche pour les
// invités), pas de synchronisation entre appareils pour l'instant.
export const THEME_PAR_DEFAUT = 'vert';

export const THEMES_COULEUR = {
  vert: {
    label: 'Vert',
    swatch: '#4a9420',
    ghostFibers: { lineColor: '#1f5c0f', glowColor: '#5aab27' },
  },
  bleu: {
    label: 'Bleu',
    swatch: '#3568c4',
    ghostFibers: { lineColor: '#12305c', glowColor: '#4a86d6' },
  },
  rouge: {
    label: 'Rouge',
    swatch: '#b8382c',
    ghostFibers: { lineColor: '#5c1712', glowColor: '#d65a4a' },
  },
  violet: {
    label: 'Violet',
    swatch: '#7a3fd6',
    ghostFibers: { lineColor: '#3a1a6b', glowColor: '#9c6ae8' },
  },
};

const CLE_STOCKAGE = 'repwise-theme-couleur';

export function themeValide(valeur) {
  return Object.keys(THEMES_COULEUR).includes(valeur) ? valeur : THEME_PAR_DEFAUT;
}

export function lireThemeCouleurStocke() {
  try {
    return themeValide(localStorage.getItem(CLE_STOCKAGE));
  } catch {
    return THEME_PAR_DEFAUT;
  }
}

export function ecrireThemeCouleurStocke(valeur) {
  try {
    localStorage.setItem(CLE_STOCKAGE, themeValide(valeur));
  } catch {
    // Stockage indisponible (navigation privée, quota...) : le thème choisi reste actif pour la
    // session en cours (état React), simplement pas mémorisé à la prochaine visite.
  }
}
