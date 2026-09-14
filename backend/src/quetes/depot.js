import { pool } from '../db/pool.js';
import { trouverObjectif } from '../journal/depot.js';
import { recalculerRang } from '../rang/depot.js';
import {
  TOLERANCE_OBJECTIF_CALORIQUE, definirHebdomadaire, definirQuotidiennes, groupeDuJour, semaineIso,
} from './calcul.js';

// Matérialise les 3 quêtes quotidiennes d'une date si elles n'existent pas déjà (première
// personne à consulter /api/quetes ce jour-là les crée pour tout le monde). INSERT IGNORE plutôt
// qu'un SELECT préalable : la contrainte unique (cle, date_debut) encaisse la course entre deux
// requêtes concurrentes sans erreur.
async function assurerQuotidiennes(dateIso) {
  const definitions = definirQuotidiennes(dateIso);
  for (const d of definitions) {
    await pool.execute(
      `INSERT IGNORE INTO quetes (type, cle, description, points, date_debut, date_fin)
       VALUES ('quotidienne', ?, ?, ?, ?, ?)`,
      [d.cle, d.description, d.points, dateIso, dateIso],
    );
  }
  // date_debut/date_fin reviennent en "AAAA-MM-JJ" (dateStrings: ['DATE'] dans db/pool.js).
  const [lignes] = await pool.execute(
    `SELECT id, cle, description, points, date_debut, date_fin FROM quetes
     WHERE type = 'quotidienne' AND date_debut = ? ORDER BY FIELD(cle, 'seance_du_jour', 'objectif_calorique', 'groupe_musculaire')`,
    [dateIso],
  );
  return lignes;
}

async function assurerHebdomadaire(dateIso) {
  const { debut, fin } = semaineIso(dateIso);
  const d = definirHebdomadaire();
  await pool.execute(
    `INSERT IGNORE INTO quetes (type, cle, description, points, date_debut, date_fin)
     VALUES ('hebdomadaire', ?, ?, ?, ?, ?)`,
    [d.cle, d.description, d.points, debut, fin],
  );
  const [[ligne]] = await pool.execute(
    `SELECT id, cle, description, points, date_debut, date_fin FROM quetes WHERE type = 'hebdomadaire' AND date_debut = ?`,
    [debut],
  );
  return ligne;
}

async function seanceLogueeCeJour(utilisateurId, dateIso) {
  const [[{ n }]] = await pool.execute(
    'SELECT COUNT(*) AS n FROM seances WHERE utilisateur_id = ? AND date = ?',
    [utilisateurId, dateIso],
  );
  return n > 0;
}

async function objectifCaloriqueAtteint(utilisateurId, dateIso) {
  const objectif = await trouverObjectif(utilisateurId, dateIso);
  if (!objectif) return false;
  const [[{ calories }]] = await pool.execute(
    'SELECT COALESCE(SUM(calories), 0) AS calories FROM entrees_alimentaires WHERE utilisateur_id = ? AND date = ?',
    [utilisateurId, dateIso],
  );
  const consomme = Number(calories);
  const ecart = Math.abs(consomme - objectif.calories) / objectif.calories;
  return consomme > 0 && ecart <= TOLERANCE_OBJECTIF_CALORIQUE;
}

async function groupeTravailleCeJour(utilisateurId, dateIso) {
  const [[{ n }]] = await pool.execute(
    `SELECT COUNT(*) AS n
     FROM seances s
     JOIN exercices_effectues e ON e.seance_id = s.id
     JOIN bibliotheque_exercices b ON b.id = e.exercice_id
     WHERE s.utilisateur_id = ? AND s.date = ? AND b.groupe_musculaire = ?`,
    [utilisateurId, dateIso, groupeDuJour(dateIso)],
  );
  return n > 0;
}

async function troisSeancesCetteSemaine(utilisateurId, debut, fin) {
  const [[{ n }]] = await pool.execute(
    'SELECT COUNT(DISTINCT date) AS n FROM seances WHERE utilisateur_id = ? AND date BETWEEN ? AND ?',
    [utilisateurId, debut, fin],
  );
  return n >= 3;
}

const VERIFICATEURS = {
  seance_du_jour: (utilisateurId, quete) => seanceLogueeCeJour(utilisateurId, quete.date_debut),
  objectif_calorique: (utilisateurId, quete) => objectifCaloriqueAtteint(utilisateurId, quete.date_debut),
  groupe_musculaire: (utilisateurId, quete) => groupeTravailleCeJour(utilisateurId, quete.date_debut),
  trois_seances_semaine: (utilisateurId, quete) => troisSeancesCetteSemaine(utilisateurId, quete.date_debut, quete.date_fin),
};

// Vérifie et enregistre la complétion d'une quête si ce n'est pas déjà fait ; renvoie true si
// complète (déjà enregistrée ou tout juste réussie). Ne recalcule le rang que sur une complétion
// TOUTE NEUVE, pour ne pas refaire ce calcul à chaque simple consultation de la page.
async function verifierEtEnregistrer(utilisateurId, quete) {
  const [[dejaFaite]] = await pool.execute(
    'SELECT 1 FROM quetes_utilisateur WHERE utilisateur_id = ? AND quete_id = ?',
    [utilisateurId, quete.id],
  );
  if (dejaFaite) return true;

  const reussie = await VERIFICATEURS[quete.cle](utilisateurId, quete);
  if (!reussie) return false;

  await pool.execute(
    'INSERT IGNORE INTO quetes_utilisateur (utilisateur_id, quete_id, points_gagnes) VALUES (?, ?, ?)',
    [utilisateurId, quete.id, quete.points],
  );
  await recalculerRang(utilisateurId);
  return true;
}

// { quotidiennes: [{id, description, points, complete}], hebdomadaire: {...} }
export async function listerQuetes(utilisateurId, dateIso) {
  const quotidiennes = await assurerQuotidiennes(dateIso);
  const hebdomadaire = await assurerHebdomadaire(dateIso);

  const quotidiennesAvecEtat = await Promise.all(
    quotidiennes.map(async (q) => ({
      id: q.id,
      description: q.description,
      points: q.points,
      complete: await verifierEtEnregistrer(utilisateurId, q),
    })),
  );
  const hebdomadaireAvecEtat = {
    id: hebdomadaire.id,
    description: hebdomadaire.description,
    points: hebdomadaire.points,
    complete: await verifierEtEnregistrer(utilisateurId, hebdomadaire),
  };

  return { quotidiennes: quotidiennesAvecEtat, hebdomadaire: hebdomadaireAvecEtat };
}
