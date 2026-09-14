// Clés identiques à l'ENUM entrees_alimentaires.repas, dans l'ordre de la journée.
export const REPAS = {
  petit_dejeuner: 'Petit-déjeuner',
  dejeuner: 'Déjeuner',
  diner: 'Dîner',
  collation: 'Collation',
};

export const MACROS = {
  proteines: { label: 'Protéines', court: 'P' },
  glucides: { label: 'Glucides', court: 'G' },
  lipides: { label: 'Lipides', court: 'L' },
};

// Repas proposé par défaut selon l'heure : un clic de moins à chaque saisie.
export function repasParDefaut(heure) {
  if (heure >= 5 && heure < 11) return 'petit_dejeuner';
  if (heure >= 11 && heure < 15) return 'dejeuner';
  if (heure >= 18 && heure < 23) return 'diner';
  return 'collation';
}

const arrondi1 = (n) => Math.round(n * 10) / 10;

// Aliment choisi (résultat de recherche Open Food Facts, ou un "récent" déjà mangé — voir
// versAlimentDepuisEntree) mis à l'échelle d'une quantité en grammes : sert à la fois à
// l'aperçu live pendant la saisie et au corps envoyé à POST /journal.
export function alimentEchelle(aliment, quantite) {
  const echelle = quantite / 100;
  return {
    calories: Math.round(aliment.pour100g.calories * echelle),
    proteines: arrondi1(aliment.pour100g.proteines * echelle),
    glucides: arrondi1(aliment.pour100g.glucides * echelle),
    lipides: arrondi1(aliment.pour100g.lipides * echelle),
    sucre: arrondi1(aliment.pour100g.sucre * echelle),
  };
}

export function corpsEntree(aliment, { date, repas, quantite }) {
  return {
    date,
    repas,
    nomAliment: aliment.nom,
    codeBarres: aliment.codeBarres ?? null,
    imageUrl: aliment.imageUrl ?? null,
    quantite,
    ...alimentEchelle(aliment, quantite),
  };
}

// Une entrée déjà enregistrée est déjà mise à l'échelle (pas un "pour 100g") : pour rejouer un
// "récent" à une quantité différente, on reconstruit son pour100g d'origine par simple règle de
// trois — approximatif à l'arrondi près, largement suffisant pour un raccourci de saisie.
export function versAlimentDepuisEntree(entree) {
  const echelle = entree.quantite / 100;
  return {
    nom: entree.nomAliment,
    codeBarres: entree.codeBarres,
    imageUrl: entree.imageUrl,
    pour100g: {
      calories: Math.round(entree.calories / echelle),
      proteines: arrondi1(entree.proteines / echelle),
      glucides: arrondi1(entree.glucides / echelle),
      lipides: arrondi1(entree.lipides / echelle),
      sucre: arrondi1(entree.sucre / echelle),
    },
  };
}

export function totaux(entrees) {
  const somme = { calories: 0, proteines: 0, glucides: 0, lipides: 0 };
  for (const entree of entrees) {
    for (const cle of Object.keys(somme)) somme[cle] += entree[cle];
  }
  return {
    calories: Math.round(somme.calories),
    proteines: arrondi1(somme.proteines),
    glucides: arrondi1(somme.glucides),
    lipides: arrondi1(somme.lipides),
  };
}

// Part de l'objectif atteinte, bornée à 100 % pour la barre (le dépassement est affiché en texte).
export const progression = (consomme, cible) => (cible > 0 ? Math.min(consomme / cible, 1) : 0);
