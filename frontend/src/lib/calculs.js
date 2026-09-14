// Calcul des besoins caloriques : Mifflin-St Jeor × facteur d'activité, puis
// ajustement selon l'objectif. Les clés correspondent aux ENUM de la base.

export const NIVEAUX_ACTIVITE = {
  sedentaire: { facteur: 1.2, label: 'Sédentaire', description: 'Travail assis, peu ou pas de sport' },
  leger: { facteur: 1.375, label: 'Légèrement actif', description: '1 à 3 séances par semaine' },
  modere: { facteur: 1.55, label: 'Modérément actif', description: '3 à 5 séances par semaine' },
  actif: { facteur: 1.725, label: 'Actif', description: '6 à 7 séances par semaine' },
  tres_actif: { facteur: 1.9, label: 'Très actif', description: 'Travail physique + entraînement quotidien' },
};

export const OBJECTIFS = {
  prise_de_masse: {
    label: 'Prise de masse',
    description: 'Surplus modéré pour limiter la prise de gras',
    ajustement: 0.1,
    proteinesParKg: 1.8,
  },
  perte_de_gras: {
    label: 'Perte de gras',
    description: 'Déficit qui préserve le muscle',
    ajustement: -0.2,
    proteinesParKg: 2.2,
  },
  recomposition: {
    label: 'Recomposition',
    description: 'Léger déficit, protéines élevées',
    ajustement: -0.05,
    proteinesParKg: 2.2,
  },
  maintien: {
    label: 'Maintien',
    description: 'Garder ton poids actuel',
    ajustement: 0,
    proteinesParKg: 1.8,
  },
};

export const LIMITES = {
  age: { min: 15, max: 100 },
  poids: { min: 30, max: 300 },
  taille: { min: 120, max: 230 },
};

// Part des calories allouée aux lipides, avec un minimum par kg pour l'équilibre hormonal.
const PART_LIPIDES = 0.25;
const LIPIDES_MIN_PAR_KG = 0.7;

// Seuils couramment admis en dessous desquels on ne descend pas sans suivi médical.
const CALORIES_MIN = { homme: 1500, femme: 1200 };

export function validerProfil({ age, poids, taille }) {
  const erreurs = {};
  for (const [champ, valeur] of Object.entries({ age, poids, taille })) {
    const { min, max } = LIMITES[champ];
    if (!Number.isFinite(valeur) || valeur < min || valeur > max) {
      erreurs[champ] = `Entre ${min} et ${max}`;
    }
  }
  return erreurs;
}

export function calculerMetabolismeBase({ sexe, poids, taille, age }) {
  const base = 10 * poids + 6.25 * taille - 5 * age;
  return sexe === 'homme' ? base + 5 : base - 161;
}

export function calculerBesoins(profil) {
  const { sexe, poids, niveauActivite, objectif } = profil;
  const { ajustement, proteinesParKg } = OBJECTIFS[objectif];

  const metabolismeBase = calculerMetabolismeBase(profil);
  const maintenance = metabolismeBase * NIVEAUX_ACTIVITE[niveauActivite].facteur;
  const caloriesBrutes = maintenance * (1 + ajustement);
  const plancher = CALORIES_MIN[sexe];
  const calories = Math.round(Math.max(caloriesBrutes, plancher));

  const proteines = Math.round(poids * proteinesParKg);
  const lipides = Math.round(Math.max((calories * PART_LIPIDES) / 9, poids * LIPIDES_MIN_PAR_KG));
  const glucides = Math.max(0, Math.round((calories - proteines * 4 - lipides * 9) / 4));

  return {
    metabolismeBase: Math.round(metabolismeBase),
    maintenance: Math.round(maintenance),
    ajustement,
    calories,
    plancherApplique: caloriesBrutes < plancher,
    proteines,
    glucides,
    lipides,
    proteinesParKg,
  };
}
