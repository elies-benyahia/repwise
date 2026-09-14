// Couleurs des badges de rang, du terne au précieux (cahier des charges §3).
// base = teinte principale ; clair / sombre = faces éclairées et ombrées de la gemme.
export const COULEURS_RANGS = {
  1: { nom: 'Rookie', base: '#7d8590', clair: '#b8bfc7', sombre: '#454b53' },
  2: { nom: 'Grinder', base: '#b87333', clair: '#e6a46b', sombre: '#6e421b' },
  3: { nom: 'Fighter', base: '#2fa866', clair: '#7fe3aa', sombre: '#17623a' },
  4: { nom: 'Beast', base: '#2f7fe0', clair: '#8cbcff', sombre: '#17478a' },
  5: { nom: 'Savage', base: '#8b4fe0', clair: '#c7a6ff', sombre: '#502490' },
  6: { nom: 'Monster', base: '#d6452a', clair: '#ff8f70', sombre: '#861f10' },
  7: { nom: 'Legend', base: '#c3ced8', clair: '#ffffff', sombre: '#7b8894' },
  8: { nom: 'GOAT', base: '#f5b82e', clair: '#ffe690', sombre: '#a86d06' },
};

// III = entrée du rang (1 barre allumée), I = sommet (3 barres).
export const BARRES_PALIER = { III: 1, II: 2, I: 3 };

export const libelleRang = (rang) => `${rang.nom} ${rang.palier}`;
