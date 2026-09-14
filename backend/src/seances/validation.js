import { estDansLeFutur, estDateValide } from '../dates.js';
import { ErreurHttp } from '../erreurs.js';

// Clés identiques à l'ENUM seances.type_seance.
export const TYPES_SEANCE = ['push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'personnalise'];

const LIMITES = {
  exercices: 30,
  series: 30,
  repetitions: 999,
  poids: 999.99,
  tempsRepos: 3600,
  notes: 2000,
  nomExercice: 100,
  typePersonnalise: 50,
  plageJours: 100,
};

const texte = (valeur) => (typeof valeur === 'string' ? valeur.trim() : '');
const entierEntre = (valeur, min, max) => Number.isInteger(valeur) && valeur >= min && valeur <= max;

// Le temps de repos est saisi par exercice (c'est ainsi qu'on s'entraîne) et stocké sur chaque série.
// Les erreurs sont indexées par chemin ("exercices.0.series.2.repetitions") pour que le front
// puisse les placer sous le bon champ.
export function lireSeance(corps) {
  const c = corps ?? {};
  const champs = {};

  if (!estDateValide(c.date)) champs.date = 'Date invalide';
  else if (estDansLeFutur(c.date)) champs.date = 'Tu ne peux pas logger une séance dans le futur';

  if (!TYPES_SEANCE.includes(c.typeSeance)) champs.typeSeance = 'Type de séance inconnu';
  const typePersonnalise = texte(c.typePersonnalise);
  if (c.typeSeance === 'personnalise' && (!typePersonnalise || typePersonnalise.length > LIMITES.typePersonnalise)) {
    champs.typePersonnalise = `Donne un nom à ta séance (${LIMITES.typePersonnalise} caractères max)`;
  }

  const notes = texte(c.notes);
  if (notes.length > LIMITES.notes) champs.notes = `${LIMITES.notes} caractères maximum`;

  if (!Array.isArray(c.exercices)) champs.exercices = "Liste d'exercices invalide";
  else if (c.exercices.length > LIMITES.exercices) champs.exercices = `${LIMITES.exercices} exercices maximum`;

  const exercices = (Array.isArray(c.exercices) ? c.exercices : []).slice(0, LIMITES.exercices).map((ex, i) => {
    const chemin = `exercices.${i}`;
    const nomExercice = texte(ex?.nomExercice);
    if (!nomExercice || nomExercice.length > LIMITES.nomExercice) {
      champs[`${chemin}.nomExercice`] = `Nom requis (${LIMITES.nomExercice} caractères max)`;
    }

    const tempsRepos = ex?.tempsRepos ?? null;
    if (tempsRepos !== null && !entierEntre(tempsRepos, 0, LIMITES.tempsRepos)) {
      champs[`${chemin}.tempsRepos`] = `Entre 0 et ${LIMITES.tempsRepos} secondes`;
    }

    const series = Array.isArray(ex?.series) ? ex.series : [];
    if (series.length < 1 || series.length > LIMITES.series) {
      champs[`${chemin}.series`] = `Entre 1 et ${LIMITES.series} séries`;
    }

    return {
      nomExercice,
      tempsRepos,
      series: series.slice(0, LIMITES.series).map((serie, j) => {
        const cheminSerie = `${chemin}.series.${j}`;
        if (!entierEntre(serie?.repetitions, 1, LIMITES.repetitions)) {
          champs[`${cheminSerie}.repetitions`] = `Entre 1 et ${LIMITES.repetitions}`;
        }
        // Poids absent = exercice au poids du corps.
        const poids = serie?.poids ?? 0;
        const poidsValide = typeof poids === 'number' && poids >= 0 && poids <= LIMITES.poids;
        if (!poidsValide) champs[`${cheminSerie}.poids`] = 'Entre 0 et 999 kg';
        return { repetitions: serie?.repetitions, poids: poidsValide ? Math.round(poids * 100) / 100 : 0 };
      }),
    };
  });

  if (Object.keys(champs).length > 0) {
    throw new ErreurHttp(400, 'Vérifie les champs de la séance', champs);
  }
  return {
    date: c.date,
    typeSeance: c.typeSeance,
    typePersonnalise: c.typeSeance === 'personnalise' ? typePersonnalise : null,
    notes: notes || null,
    exercices,
  };
}

export function lirePlage({ debut, fin }) {
  if (!estDateValide(debut) || !estDateValide(fin) || debut > fin) {
    throw new ErreurHttp(400, 'Paramètres debut et fin requis (AAAA-MM-JJ)');
  }
  const jours = (Date.parse(fin) - Date.parse(debut)) / 86_400_000;
  if (jours > LIMITES.plageJours) {
    throw new ErreurHttp(400, `Plage de ${LIMITES.plageJours} jours maximum`);
  }
  return { debut, fin };
}
