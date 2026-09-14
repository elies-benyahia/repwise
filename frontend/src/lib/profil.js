// Niveau déclaré. Depuis la refonte de l'onboarding, déduit automatiquement du nombre de
// séances par semaine (voir lib/onboarding.js) plutôt que demandé explicitement — mais reste
// modifiable ici. À ne pas confondre avec le rang calculé à partir des performances (V2 :
// Rookie → GOAT). Clés identiques à l'ENUM utilisateurs.niveau_experience.
export const NIVEAUX_EXPERIENCE = {
  debutant: { label: 'Débutant', duree: "Moins d'1 an de muscu" },
  intermediaire: { label: 'Intermédiaire', duree: '1 à 3 ans de muscu' },
  confirme: { label: 'Confirmé', duree: 'Plus de 3 ans de muscu' },
};

export function profilComplet(utilisateur) {
  return Boolean(
    utilisateur?.pseudo && utilisateur.age && utilisateur.taille && utilisateur.poids && utilisateur.niveauExperience,
  );
}
