// Refonte onboarding : le niveau d'activité (calculateur) et le niveau d'expérience (tri des
// exercices) ne sont plus demandés séparément — trop de questions d'affilée en un seul test
// utilisateur. Les deux sont déduits du nombre de séances par semaine (étape 2 de l'onboarding).
// Approximation assumée : elle ignore l'activité physique hors muscu (métier physique, etc.),
// mais reste modifiable ensuite (le calculateur permet de changer niveau_activite directement).
export function niveauActiviteDepuisFrequence(frequence) {
  if (frequence <= 0) return 'sedentaire';
  if (frequence <= 2) return 'leger';
  if (frequence <= 4) return 'modere';
  if (frequence <= 6) return 'actif';
  return 'tres_actif';
}

export function niveauExperienceDepuisFrequence(frequence) {
  if (frequence <= 2) return 'debutant';
  if (frequence <= 4) return 'intermediaire';
  return 'confirme';
}

// Les 6 objectifs "parlants" de l'onboarding, mappés vers les 4 catégories techniques du
// calculateur de macros (Mifflin-St Jeor ne connaît que prise_de_masse/perte_de_gras/
// recomposition/maintien). "Cardio" et "pratique libre" visent le maintien : ce ne sont pas
// des objectifs de composition corporelle.
export const OBJECTIFS_DECLARES = [
  'prise_de_masse', 'perte_de_poids', 'prise_de_muscle',
  'perte_de_poids_stabilisation', 'cardio_marathon', 'pratique_libre',
];

const CORRESPONDANCE_OBJECTIF = {
  prise_de_masse: 'prise_de_masse',
  perte_de_poids: 'perte_de_gras',
  prise_de_muscle: 'recomposition',
  perte_de_poids_stabilisation: 'perte_de_gras',
  cardio_marathon: 'maintien',
  pratique_libre: 'maintien',
};

export const objectifDepuisDeclare = (objectifDeclare) => CORRESPONDANCE_OBJECTIF[objectifDeclare];
