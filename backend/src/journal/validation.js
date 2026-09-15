import { estDansLeFutur, estDateValide } from '../dates.js';
import { ErreurHttp } from '../erreurs.js';
import { NIVEAUX_ACTIVITE, OBJECTIFS, SEXES } from '../utilisateurs/modele.js';

// Clés identiques à l'ENUM entrees_alimentaires.repas.
export const REPAS = ['petit_dejeuner', 'dejeuner', 'diner', 'collation'];

const texte = (valeur) => (typeof valeur === 'string' ? valeur.trim() : '');
const entierEntre = (valeur, min, max) => Number.isInteger(valeur) && valeur >= min && valeur <= max;
const nombreEntre = (valeur, min, max) => typeof valeur === 'number' && valeur >= min && valeur <= max;
const unDecimal = (n) => Math.round(n * 10) / 10;

export function lireDate(date) {
  if (!estDateValide(date)) throw new ErreurHttp(400, 'Date invalide (AAAA-MM-JJ)');
  return date;
}

export function lireEntree(corps) {
  const c = corps ?? {};
  const champs = {};

  if (!estDateValide(c.date)) champs.date = 'Date invalide';
  else if (estDansLeFutur(c.date)) champs.date = 'Pas de saisie dans le futur';
  if (!REPAS.includes(c.repas)) champs.repas = 'Repas inconnu';

  const nomAliment = texte(c.nomAliment);
  if (!nomAliment || nomAliment.length > 150) champs.nomAliment = 'Nom requis (150 caractères max)';

  if (!entierEntre(c.calories, 0, 5000)) champs.calories = 'Entre 0 et 5000 kcal';
  for (const macro of ['proteines', 'glucides', 'lipides', 'sucre']) {
    if (!nombreEntre(c[macro] ?? 0, 0, 500)) champs[macro] = 'Entre 0 et 500 g';
  }
  // Quantité en grammes (base 100g d'Open Food Facts) : 1 à 5000g, large pour couvrir un plat
  // complet saisi en une fois plutôt qu'aliment par aliment.
  if (!nombreEntre(c.quantite ?? 100, 1, 5000)) champs.quantite = 'Entre 1 et 5000 g';

  const codeBarres = c.codeBarres !== undefined && c.codeBarres !== null ? texte(c.codeBarres) : null;
  if (codeBarres && codeBarres.length > 64) champs.codeBarres = '64 caractères max';
  const imageUrl = c.imageUrl !== undefined && c.imageUrl !== null ? texte(c.imageUrl) : null;
  if (imageUrl && imageUrl.length > 500) champs.imageUrl = '500 caractères max';

  if (Object.keys(champs).length > 0) throw new ErreurHttp(400, "Vérifie les champs de l'aliment", champs);
  return {
    date: c.date,
    repas: c.repas,
    nomAliment,
    codeBarres: codeBarres || null,
    imageUrl: imageUrl || null,
    quantite: unDecimal(c.quantite ?? 100),
    calories: c.calories,
    proteines: unDecimal(c.proteines ?? 0),
    glucides: unDecimal(c.glucides ?? 0),
    lipides: unDecimal(c.lipides ?? 0),
    sucre: unDecimal(c.sucre ?? 0),
  };
}

// Modification d'une entrée déjà enregistrée (retour du 15/09, "on peut pas changer le nombre
// de grammes") : mêmes bornes que lireEntree, mais sans date/nomAliment/codeBarres/imageUrl —
// ces champs identifient l'aliment choisi et ne changent pas, seuls repas/quantité/macros bougent.
export function lireModificationEntree(corps) {
  const c = corps ?? {};
  const champs = {};

  if (!REPAS.includes(c.repas)) champs.repas = 'Repas inconnu';
  if (!entierEntre(c.calories, 0, 5000)) champs.calories = 'Entre 0 et 5000 kcal';
  for (const macro of ['proteines', 'glucides', 'lipides', 'sucre']) {
    if (!nombreEntre(c[macro] ?? 0, 0, 500)) champs[macro] = 'Entre 0 et 500 g';
  }
  if (!nombreEntre(c.quantite, 1, 5000)) champs.quantite = 'Entre 1 et 5000 g';

  if (Object.keys(champs).length > 0) throw new ErreurHttp(400, "Vérifie les champs de l'aliment", champs);
  return {
    repas: c.repas,
    quantite: unDecimal(c.quantite),
    calories: c.calories,
    proteines: unDecimal(c.proteines ?? 0),
    glucides: unDecimal(c.glucides ?? 0),
    lipides: unDecimal(c.lipides ?? 0),
    sucre: unDecimal(c.sucre ?? 0),
  };
}

// Objectif issu du calculateur. Les paramètres du calcul (sexe, activité, objectif) sont
// optionnels ; s'ils sont fournis, ils sont aussi enregistrés sur le profil.
export function lireObjectif(corps) {
  const c = corps ?? {};
  const champs = {};

  if (!entierEntre(c.calories, 800, 10000)) champs.calories = 'Entre 800 et 10000 kcal';
  for (const macro of ['proteines', 'glucides', 'lipides']) {
    if (!entierEntre(c[macro], 0, 1000)) champs[macro] = 'Entre 0 et 1000 g';
  }
  if (c.sexe !== undefined && !SEXES.includes(c.sexe)) champs.sexe = 'Sexe inconnu';
  if (c.niveauActivite !== undefined && !NIVEAUX_ACTIVITE.includes(c.niveauActivite)) {
    champs.niveauActivite = "Niveau d'activité inconnu";
  }
  if (c.objectif !== undefined && !OBJECTIFS.includes(c.objectif)) champs.objectif = 'Objectif inconnu';

  if (Object.keys(champs).length > 0) throw new ErreurHttp(400, "Vérifie l'objectif", champs);
  return {
    calories: c.calories,
    proteines: c.proteines,
    glucides: c.glucides,
    lipides: c.lipides,
    profil: {
      ...(c.sexe && { sexe: c.sexe }),
      ...(c.niveauActivite && { niveau_activite: c.niveauActivite }),
      ...(c.objectif && { objectif: c.objectif }),
    },
  };
}
