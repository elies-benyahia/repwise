// Système de rang : 8 rangs × 3 paliers, calculé à partir du meilleur 1RM estimé récent.
// Toutes les constantes réglables sont ici.

export const RANGS = ['Rookie', 'Grinder', 'Fighter', 'Beast', 'Savage', 'Monster', 'Legend', 'GOAT'];
export const PALIERS = ['III', 'II', 'I']; // III = entrée du rang, I = sommet

// Fenêtre de performances prises en compte (le cahier des charges proposait 4 à 6 semaines).
export const FENETRE_JOURS = 42;
// Au-delà, la formule d'Epley surestime trop le 1RM : ces séries ne comptent pas.
export const REPS_MAX_ESTIMATION = 12;
// Nombre de groupes musculaires à travailler pour un score complet : on ne devient pas GOAT
// avec seulement des curls.
export const GROUPES_POUR_SCORE_COMPLET = 4;
// Les repères de force (bibliotheque-rang.sql) sont ceux d'un homme intermédiaire.
export const FACTEUR_REPERE_FEMME = 0.7;
// Score 1 = niveau intermédiaire sur tous ses exercices. Chaque palier vaut 0,09 point :
// intermédiaire ≈ Beast I (11e niveau sur 24), GOAT III à partir de 1,89.
export const SCORE_PAR_NIVEAU = 0.09;
// Score d'entrée dans le rang GOAT (palier III) : la porte du classement.
export const SCORE_GOAT = Math.round((RANGS.length - 1) * PALIERS.length * SCORE_PAR_NIVEAU * 1000) / 1000;

export const epley = (charge, repetitions) => (repetitions === 1 ? charge : charge * (1 + repetitions / 30));

// `series` : séries récentes des exercices ayant un repère, chacune
// { exerciceId, nom, groupe, ratioReference, poidsDuCorps, poids, repetitions }.
// Score d'un exercice = (meilleur 1RM estimé / poids de corps) / repère.
// Score global = moyenne des meilleurs scores par groupe musculaire (un groupe travaillé avec
// cinq variantes ne pèse pas cinq fois plus), réduite si moins de GROUPES_POUR_SCORE_COMPLET groupes.
export function calculerScore(series, { poidsCorps, sexe }) {
  if (!poidsCorps) return null;
  const facteur = sexe === 'femme' ? FACTEUR_REPERE_FEMME : 1;

  const meilleurParGroupe = new Map();
  // Détail par exercice pour la page Rang ("Récap : points gagnés, ventilés par exercice") —
  // n'entre pas directement dans le score du groupe (qui ne garde que le meilleur), juste
  // affiché pour comprendre d'où vient le score.
  const meilleurParExercice = new Map();
  for (const s of series) {
    if (s.repetitions < 1 || s.repetitions > REPS_MAX_ESTIMATION) continue;
    const charge = s.poidsDuCorps ? poidsCorps + s.poids : s.poids;
    if (charge <= 0) continue;
    const score = epley(charge, s.repetitions) / poidsCorps / (s.ratioReference * facteur);
    meilleurParGroupe.set(s.groupe, Math.max(meilleurParGroupe.get(s.groupe) ?? 0, score));
    const precedent = meilleurParExercice.get(s.exerciceId);
    if (!precedent || score > precedent.score) meilleurParExercice.set(s.exerciceId, { nom: s.nom, score });
  }

  const scores = [...meilleurParGroupe.values()];
  if (scores.length === 0) return null;
  const moyenne = scores.reduce((a, b) => a + b, 0) / scores.length;
  const couverture = Math.min(1, scores.length / GROUPES_POUR_SCORE_COMPLET);
  const parExercice = [...meilleurParExercice.entries()]
    .map(([exerciceId, { nom, score }]) => ({ exerciceId, nom, score: Math.round(score * 1000) / 1000 }))
    .sort((a, b) => b.score - a.score);
  return { score: Math.round(moyenne * couverture * 1000) / 1000, groupes: scores.length, parExercice };
}

// Conversion des points de quêtes (backend/src/quetes) en score de rang : bonus, jamais le
// moteur principal. À fond de quêtes réussies tous les jours sur la fenêtre de 6 semaines
// (3 quotidiennes × 5 pts + 1 hebdo × 20 pts ≈ 750 pts max), le bonus plafonne autour de +0,375,
// soit ~4 paliers — significatif mais jamais suffisant pour atteindre GOAT sans vraie perf.
export const POINTS_VERS_SCORE = 0.0005;

const NIVEAU_MAX = RANGS.length * PALIERS.length - 1;

// Score → rang (1 à 8), palier et progression (0 à 1) vers le palier suivant.
export function rangDepuisScore(score) {
  const niveau = Math.min(NIVEAU_MAX, Math.max(0, Math.floor(score / SCORE_PAR_NIVEAU + 1e-9)));
  const rang = Math.floor(niveau / PALIERS.length) + 1;
  const palier = PALIERS[niveau % PALIERS.length];
  const progression = niveau === NIVEAU_MAX
    ? 1
    : Math.min(1, (score - niveau * SCORE_PAR_NIVEAU) / SCORE_PAR_NIVEAU);
  return {
    rang,
    nom: RANGS[rang - 1],
    palier,
    niveau,
    progression: Math.round(progression * 100) / 100,
    scoreProchainPalier: niveau === NIVEAU_MAX ? null : Math.round((niveau + 1) * SCORE_PAR_NIVEAU * 1000) / 1000,
  };
}
