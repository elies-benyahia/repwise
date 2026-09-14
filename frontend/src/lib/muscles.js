// Clés identiques à l'ENUM bibliotheque_exercices.groupe_musculaire.
export const GROUPES_MUSCULAIRES = {
  pectoraux: 'Pectoraux',
  epaules: 'Épaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  avant_bras: 'Avant-bras',
  abdominaux: 'Abdominaux',
  obliques: 'Obliques',
  trapezes: 'Trapèzes',
  dos: 'Dos',
  lombaires: 'Lombaires',
  fessiers: 'Fessiers',
  quadriceps: 'Quadriceps',
  ischio_jambiers: 'Ischio-jambiers',
  mollets: 'Mollets',
};

// Silhouette stylisée, viewBox 0 0 200 420. Chaque tracé décrit la moitié gauche du dessin
// (x ≤ 100) ; le composant la duplique en miroir pour obtenir le côté droit.
export const DEMI_SILHOUETTE = `M100 50 L91 51 L90 60 C78 63 66 64 58 70 C48 76 45 88 44 100 C42 118 40 134 38 150
  C36 168 32 186 30 206 C29 214 28 222 30 230 C26 238 26 248 32 250 C38 250 40 242 40 232 C42 222 44 212 46 204
  C50 186 54 168 56 150 C58 138 60 128 62 116 L64 108 C64 130 66 150 70 172 C72 184 70 196 68 208
  C64 224 64 240 66 256 C66 290 70 316 74 336 C74 350 72 368 74 384 C76 396 78 404 78 410 C72 414 70 420 76 420
  L96 420 C96 412 94 406 94 400 C96 380 96 360 94 340 C96 320 98 290 98 262 L100 262 Z`;

const EPAULE = 'M60 70 C50 74 46 86 45 98 C50 104 56 104 60 100 C62 90 66 80 72 74 C68 70 64 69 60 70 Z';
const BRAS = 'M46 104 C43 118 41 132 41 144 C45 150 52 150 56 144 C58 132 60 120 60 106 C56 102 50 102 46 104 Z';
const AVANT_BRAS = 'M40 156 C36 172 33 188 32 204 C36 210 42 210 45 204 C48 188 52 172 54 156 C50 152 44 152 40 156 Z';

// Ordre = ordre de dessin (les derniers passent au-dessus).
export const ZONES = {
  avant: [
    ['epaules', EPAULE],
    ['pectoraux', 'M99 72 L78 70 C70 74 66 84 66 96 C70 108 80 114 92 112 C97 110 99 106 99 100 Z'],
    ['biceps', BRAS],
    ['avant_bras', AVANT_BRAS],
    ['obliques', 'M87 116 C78 118 70 124 68 134 C68 152 70 170 74 188 C78 194 84 196 88 194 C86 168 85 140 87 116 Z'],
    ['abdominaux', 'M99 116 L90 116 C88 140 88 168 90 196 C93 200 96 202 99 202 Z'],
    ['quadriceps', 'M70 244 C66 270 68 300 74 326 C80 334 90 334 95 326 C98 300 98 276 97 256 C90 250 80 244 70 244 Z'],
    ['mollets', 'M76 344 C73 360 74 378 78 396 C82 400 88 400 91 396 C94 378 94 360 92 344 C86 338 80 338 76 344 Z'],
  ],
  arriere: [
    ['dos', 'M66 82 C64 100 66 122 72 146 C78 162 88 172 98 176 L98 150 C92 132 90 110 92 96 C84 86 74 80 66 82 Z'],
    ['trapezes', 'M99 52 L92 53 C88 60 78 64 66 68 C76 74 86 84 92 100 L99 112 Z'],
    ['epaules', EPAULE],
    ['triceps', BRAS],
    ['avant_bras', AVANT_BRAS],
    ['lombaires', 'M98 180 C92 178 86 180 82 186 C80 196 82 206 86 212 L98 214 Z'],
    ['fessiers', 'M99 218 C88 214 74 218 68 230 C66 244 70 256 80 262 C90 264 97 260 99 252 Z'],
    ['ischio_jambiers', 'M70 268 C68 290 70 312 76 330 C82 336 91 336 95 328 C98 306 98 286 97 266 C88 262 78 264 70 268 Z'],
    ['mollets', 'M75 340 C71 356 72 374 78 390 C83 396 89 394 92 388 C95 370 95 354 92 340 C86 334 80 334 75 340 Z'],
  ],
};

// Vue où un muscle est visible (pour afficher la bonne face quand on arrive via un lien).
export const vueDe = (groupe) => (ZONES.avant.some(([g]) => g === groupe) ? 'avant' : 'arriere');

const ORDRE_NIVEAUX = { debutant: 0, intermediaire: 1, confirme: 2 };

// Le niveau déclaré à l'onboarding sert à personnaliser les premières recommandations : les
// exercices à sa portée passent en premier (en gardant l'ordre de recommandation), les plus
// avancés ensuite, marqués comme tels.
export function trierPourNiveau(exercices, niveau) {
  const max = ORDRE_NIVEAUX[niveau] ?? ORDRE_NIVEAUX.confirme;
  const annotes = exercices.map((e) => ({ ...e, plusAvance: ORDRE_NIVEAUX[e.niveauDifficulte] > max }));
  return [...annotes.filter((e) => !e.plusAvance), ...annotes.filter((e) => e.plusAvance)];
}
