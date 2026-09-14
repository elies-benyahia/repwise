import { aujourdhui, estJourValide } from './dates.js';
import { formaterNombre, versNombre } from './format.js';

// Clés identiques à l'ENUM seances.type_seance.
export const TYPES_SEANCE = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper',
  lower: 'Lower',
  full_body: 'Full body',
  personnalise: 'Personnalisé',
};

export const libelleSeance = (seance) =>
  seance.typeSeance === 'personnalise' ? seance.typePersonnalise : TYPES_SEANCE[seance.typeSeance];

// Pour les cases du calendrier, où la place manque.
export const libelleCourt = (seance) => (seance.typeSeance === 'full_body' ? 'Full' : libelleSeance(seance));

// --- État du formulaire ---
// Les champs restent des chaînes pendant la saisie (virgule décimale, champ vide) ;
// la conversion en nombres se fait une seule fois, dans preparerSeance.

let derniereCle = 0;
const nouvelleCle = () => ++derniereCle;

export const serieVide = () => ({ cle: nouvelleCle(), repetitions: '', poids: '' });

// À la salle, on enchaîne souvent la même série : la nouvelle reprend les valeurs de la précédente.
export function serieSuivante(series) {
  const derniere = series.at(-1);
  return derniere ? { ...derniere, cle: nouvelleCle() } : serieVide();
}

export const exerciceVide = () => ({ cle: nouvelleCle(), nomExercice: '', tempsRepos: '', series: [serieVide()] });

export const nouvelleSeance = (date) => ({
  date,
  typeSeance: '',
  typePersonnalise: '',
  notes: '',
  exercices: [exerciceVide()],
});

const versChamp = (nombre) => (nombre ? formaterNombre(nombre) : '');

export function depuisApi(seance) {
  return {
    date: seance.date,
    typeSeance: seance.typeSeance,
    typePersonnalise: seance.typePersonnalise ?? '',
    notes: seance.notes ?? '',
    exercices: seance.exercices.map((exercice) => ({
      cle: nouvelleCle(),
      nomExercice: exercice.nomExercice,
      tempsRepos: exercice.tempsRepos == null ? '' : String(exercice.tempsRepos),
      series: exercice.series.map((serie) => ({
        cle: nouvelleCle(),
        repetitions: String(serie.repetitions),
        // 0 = poids du corps : champ laissé vide.
        poids: versChamp(serie.poids),
      })),
    })),
  };
}

const serieRemplie = (serie) => serie.repetitions.trim() !== '' || serie.poids.trim() !== '';
const exerciceRempli = (exercice) =>
  exercice.nomExercice.trim() !== '' || exercice.tempsRepos.trim() !== '' || exercice.series.some(serieRemplie);

// "Ajouter à ma séance" depuis la carte du corps. Remplace l'exercice vide d'une nouvelle
// séance plutôt que d'en laisser un inutile au-dessus. Renvoie aussi la clé, pour le focus.
export function ajouterExerciceNomme(etat, nomExercice) {
  const exercice = { ...exerciceVide(), nomExercice };
  const seulementUnVide = etat.exercices.length === 1 && !exerciceRempli(etat.exercices[0]);
  return {
    etat: { ...etat, exercices: seulementUnVide ? [exercice] : [...etat.exercices, exercice] },
    cle: exercice.cle,
  };
}

// "Lancer une séance" depuis un programme : ses exercices, avec les séries et répétitions cibles
// pré-remplies (à ajuster à ce qui a réellement été fait).
export function appliquerProgramme(etat, programme) {
  return {
    ...etat,
    typeSeance: 'personnalise',
    typePersonnalise: programme.nom.slice(0, 50),
    exercices: programme.exercices.map((ex) => ({
      cle: nouvelleCle(),
      nomExercice: ex.nom,
      tempsRepos: '',
      series: Array.from({ length: ex.seriesCibles }, () => ({
        cle: nouvelleCle(),
        repetitions: String(ex.repetitionsCibles),
        poids: versChamp(ex.poidsCible),
      })),
    })),
  };
}

// Valide la saisie et construit le corps attendu par l'API. Les exercices et séries laissés
// entièrement vides sont ignorés (on peut ajouter une ligne "au cas où" sans être bloqué).
// Les clés d'erreur utilisent les index affichés à l'écran : "exercices.1.series.0.poids".
export function preparerSeance(etat) {
  const erreurs = {};

  if (!estJourValide(etat.date)) erreurs.date = 'Date invalide';
  else if (etat.date > aujourdhui()) erreurs.date = 'Tu ne peux pas logger une séance dans le futur';

  if (!TYPES_SEANCE[etat.typeSeance]) erreurs.typeSeance = 'Choisis le type de séance';
  const typePersonnalise = etat.typePersonnalise.trim();
  if (etat.typeSeance === 'personnalise' && !typePersonnalise) {
    erreurs.typePersonnalise = 'Donne un nom à ta séance';
  }

  const exercices = [];
  etat.exercices.forEach((exercice, i) => {
    if (!exerciceRempli(exercice)) return;
    const chemin = `exercices.${i}`;

    const nomExercice = exercice.nomExercice.trim();
    if (!nomExercice) erreurs[`${chemin}.nomExercice`] = "Nom de l'exercice requis";

    let tempsRepos = null;
    if (exercice.tempsRepos.trim() !== '') {
      tempsRepos = versNombre(exercice.tempsRepos);
      if (!Number.isInteger(tempsRepos) || tempsRepos < 0 || tempsRepos > 3600) {
        erreurs[`${chemin}.tempsRepos`] = 'En secondes, 3600 max';
      }
    }

    const series = [];
    exercice.series.forEach((serie, j) => {
      if (!serieRemplie(serie)) return;
      const cheminSerie = `${chemin}.series.${j}`;
      const repetitions = versNombre(serie.repetitions);
      if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 999) {
        erreurs[`${cheminSerie}.repetitions`] = 'Reps ?';
      }
      const poids = serie.poids.trim() === '' ? 0 : versNombre(serie.poids);
      if (!Number.isFinite(poids) || poids < 0 || poids > 999) erreurs[`${cheminSerie}.poids`] = 'Poids ?';
      series.push({ repetitions, poids });
    });
    if (series.length === 0) erreurs[`${chemin}.series`] = 'Ajoute au moins une série';

    exercices.push({ nomExercice, tempsRepos, series });
  });

  return {
    erreurs,
    corps: {
      date: etat.date,
      typeSeance: etat.typeSeance,
      typePersonnalise: etat.typeSeance === 'personnalise' ? typePersonnalise : null,
      notes: etat.notes.trim(),
      exercices,
    },
  };
}
