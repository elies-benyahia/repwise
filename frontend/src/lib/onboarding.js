// Refonte onboarding (4 étapes) : ces mappings existent aussi côté backend
// (backend/src/utilisateurs/niveaux.js). Duplication volontaire — le front en a besoin tout de
// suite pour l'aperçu du programme (étape 3), avant le moindre appel réseau ; le serveur reste
// la source de vérité (il revalide et recalcule tout à l'enregistrement).

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

// Clés identiques à l'ENUM utilisateurs.objectif_declare.
export const OBJECTIFS_DECLARES = {
  prise_de_masse: { label: 'Prise de masse', description: 'Manger plus, grossir en muscle et un peu en gras' },
  perte_de_poids: { label: 'Perte de poids', description: 'Un déficit calorique pour perdre du poids' },
  prise_de_muscle: { label: 'Prise de muscle', description: 'Se muscler sans forcément prendre de poids' },
  perte_de_poids_stabilisation: { label: 'Perte de poids et stabilisation', description: 'Perdre du poids puis se maintenir' },
  cardio_marathon: { label: 'Cardio (préparation marathon)', description: 'Endurance et préparation à une course' },
  pratique_libre: { label: 'Pratique libre', description: 'Rester actif et préserver sa masse musculaire' },
};

const CORRESPONDANCE_OBJECTIF = {
  prise_de_masse: 'prise_de_masse',
  perte_de_poids: 'perte_de_gras',
  prise_de_muscle: 'recomposition',
  perte_de_poids_stabilisation: 'perte_de_gras',
  cardio_marathon: 'maintien',
  pratique_libre: 'maintien',
};

export const objectifDepuisDeclare = (objectifDeclare) => CORRESPONDANCE_OBJECTIF[objectifDeclare];
