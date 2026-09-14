import { pool } from '../db/pool.js';
import { RANGS } from '../rang/calcul.js';

export const NIVEAUX_EXPERIENCE = ['debutant', 'intermediaire', 'confirme'];

// Clés identiques aux ENUM de la table utilisateurs.
export const SEXES = ['homme', 'femme'];
export const NIVEAUX_ACTIVITE = ['sedentaire', 'leger', 'modere', 'actif', 'tres_actif'];
export const OBJECTIFS = ['prise_de_masse', 'perte_de_gras', 'recomposition', 'maintien'];

const COLONNES = [
  'id', 'email', 'est_invite', 'pseudo', 'date_naissance', 'poids_actuel', 'taille',
  'niveau_experience', 'sexe', 'niveau_activite', 'objectif', 'frequence_seances',
  'objectif_declare', 'bio', 'photo_url', 'profil_public', 'role',
];
// À utiliser avec l'alias `u` pour utilisateurs et JOINTURE_RANG (alias `r`).
export const SELECTION_UTILISATEUR = `${COLONNES.map((c) => `u.${c}`).join(', ')}, r.rang, r.palier`;
export const JOINTURE_RANG = 'LEFT JOIN rangs_utilisateur r ON r.utilisateur_id = u.id';

// Âge en années pleines à partir d'une date de naissance (plus précis qu'une simple différence
// d'années, qui se tromperait d'un an avant l'anniversaire de la personne).
export function ageDepuisDateNaissance(dateNaissance) {
  if (!dateNaissance) return null;
  const naissance = new Date(`${dateNaissance}T00:00:00Z`);
  const aujourdhui = new Date();
  let age = aujourdhui.getUTCFullYear() - naissance.getUTCFullYear();
  const pasEncoreAnniversaire = (aujourdhui.getUTCMonth() < naissance.getUTCMonth())
    || (aujourdhui.getUTCMonth() === naissance.getUTCMonth() && aujourdhui.getUTCDate() < naissance.getUTCDate());
  if (pasEncoreAnniversaire) age -= 1;
  return age;
}

export function versUtilisateurPublic(ligne) {
  return {
    id: ligne.id,
    email: ligne.email,
    estInvite: Boolean(ligne.est_invite),
    pseudo: ligne.pseudo,
    dateNaissance: ligne.date_naissance,
    age: ageDepuisDateNaissance(ligne.date_naissance),
    // mysql2 renvoie les DECIMAL sous forme de chaîne.
    poids: ligne.poids_actuel === null ? null : Number(ligne.poids_actuel),
    taille: ligne.taille,
    niveauExperience: ligne.niveau_experience,
    // Renseignés quand l'utilisateur enregistre un objectif depuis le calculateur.
    sexe: ligne.sexe,
    niveauActivite: ligne.niveau_activite,
    objectif: ligne.objectif,
    frequenceSeances: ligne.frequence_seances,
    objectifDeclare: ligne.objectif_declare,
    bio: ligne.bio,
    photoUrl: ligne.photo_url,
    profilPublic: Boolean(ligne.profil_public),
    role: ligne.role,
    // Dernier rang calculé (null tant qu'aucun exercice de référence n'a été loggé).
    rang: ligne.rang ? { rang: ligne.rang, nom: RANGS[ligne.rang - 1], palier: ligne.palier } : null,
  };
}

export async function trouverUtilisateur(id) {
  const [[ligne]] = await pool.execute(
    `SELECT ${SELECTION_UTILISATEUR} FROM utilisateurs u ${JOINTURE_RANG} WHERE u.id = ?`,
    [id],
  );
  return ligne ? versUtilisateurPublic(ligne) : null;
}

// Un invité sans session valide ne peut plus jamais retrouver ses données : on les supprime
// (les séances, repas… suivent grâce aux ON DELETE CASCADE).
export async function supprimerInvitesAbandonnes() {
  const [resultat] = await pool.execute(
    `DELETE FROM utilisateurs
     WHERE est_invite
       AND NOT EXISTS (
         SELECT 1 FROM sessions s
         WHERE s.utilisateur_id = utilisateurs.id AND s.date_expiration > NOW()
       )`,
  );
  return resultat.affectedRows;
}
