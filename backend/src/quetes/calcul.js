import { GROUPES_MUSCULAIRES } from '../exercices/routes.js';

// Le reste du backend ne travaille qu'avec les clés ENUM ; ce module est le seul à avoir besoin
// d'un texte affichable pour la description des quêtes.
const LIBELLES_GROUPES = {
  pectoraux: 'les pectoraux',
  epaules: 'les épaules',
  biceps: 'les biceps',
  triceps: 'les triceps',
  avant_bras: 'les avant-bras',
  abdominaux: 'les abdominaux',
  obliques: 'les obliques',
  trapezes: 'les trapèzes',
  dos: 'le dos',
  lombaires: 'les lombaires',
  fessiers: 'les fessiers',
  quadriceps: 'les quadriceps',
  ischio_jambiers: 'les ischio-jambiers',
  mollets: 'les mollets',
};

// "Types exacts à définir avec Claude Code" (cahier §3) : 3 quêtes quotidiennes fixes plutôt
// qu'un grand pool tiré au hasard — plus simple à comprendre et à tester, et déjà varié grâce au
// groupe musculaire qui tourne chaque jour. Points modestes : voir POINTS_VERS_SCORE dans
// rang/calcul.js pour l'impact réel sur le score (un bonus, jamais suffisant à lui seul).
export const POINTS_QUOTIDIENNE = 5;
export const POINTS_HEBDOMADAIRE = 20;
export const SEANCES_CIBLES_SEMAINE = 3;
// Tolérance sur l'objectif calorique : personne n'atteint jamais un chiffre pile, la quête doit
// rester atteignable pour qui suit sérieusement son objectif, pas seulement au gramme près.
export const TOLERANCE_OBJECTIF_CALORIQUE = 0.15;

const UN_JOUR_MS = 24 * 60 * 60 * 1000;

// Groupe musculaire "du jour" : le même pour tout le monde, qui tourne sur les 14 groupes au fil
// de l'année — pas d'aléatoire ni d'état par utilisateur à stocker, recalculable à tout moment
// depuis la seule date (voir groupeDuJour ci-dessous, utilisé aussi bien pour générer la quête
// que pour vérifier sa complétion).
export function groupeDuJour(dateIso) {
  const date = new Date(`${dateIso}T00:00:00Z`);
  const debutAnnee = Date.UTC(date.getUTCFullYear(), 0, 1);
  const jourDeLannee = Math.floor((date.getTime() - debutAnnee) / UN_JOUR_MS);
  return GROUPES_MUSCULAIRES[jourDeLannee % GROUPES_MUSCULAIRES.length];
}

// Définitions des 3 quêtes quotidiennes pour une date donnée (AAAA-MM-JJ) — une instance par
// jour, matérialisée dans la table `quetes` par quetes/depot.js.
export function definirQuotidiennes(dateIso) {
  const groupe = groupeDuJour(dateIso);
  return [
    { cle: 'seance_du_jour', description: "Logger une séance aujourd'hui", points: POINTS_QUOTIDIENNE },
    { cle: 'objectif_calorique', description: 'Atteindre ton objectif calorique du jour', points: POINTS_QUOTIDIENNE },
    { cle: 'groupe_musculaire', description: `Travailler ${LIBELLES_GROUPES[groupe]} aujourd'hui`, points: POINTS_QUOTIDIENNE },
  ];
}

export function definirHebdomadaire() {
  return {
    cle: 'trois_seances_semaine',
    description: `Compléter ${SEANCES_CIBLES_SEMAINE} séances cette semaine`,
    points: POINTS_HEBDOMADAIRE,
  };
}

// Lundi → dimanche de la semaine ISO contenant `dateIso`, en AAAA-MM-JJ.
export function semaineIso(dateIso) {
  const date = new Date(`${dateIso}T00:00:00Z`);
  const jour = (date.getUTCDay() + 6) % 7; // 0 = lundi
  const lundi = new Date(date.getTime() - jour * UN_JOUR_MS);
  const dimanche = new Date(lundi.getTime() + 6 * UN_JOUR_MS);
  const versIso = (d) => d.toISOString().slice(0, 10);
  return { debut: versIso(lundi), fin: versIso(dimanche) };
}
