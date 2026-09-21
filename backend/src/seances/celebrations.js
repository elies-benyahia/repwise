import { pool } from '../db/pool.js';
import { epley, REPS_MAX_ESTIMATION } from '../rang/calcul.js';
import { streakDe } from '../rang/routes.js';

// Retour du 21/09 ("petits moments de célébration") : détecte, au moment où une séance est
// créée, ce qui mérite d'être marqué — nouveau rang, palier de streak franchi (7/30/100 jours),
// record personnel sur un exercice. Uniquement à la création (pas à la modification d'une
// séance passée : corriger un chiffre après coup ne "vient" de rien, contrairement à finir sa
// séance du jour).
const PALIERS_STREAK = [7, 30, 100];

// Rang mis en cache avant la séance (table rangs_utilisateur) — à lire AVANT d'appeler
// recalculerRang, qui l'écraserait avec le nouveau résultat.
export async function rangAvant(utilisateurId) {
  const [[ligne]] = await pool.execute(
    'SELECT rang FROM rangs_utilisateur WHERE utilisateur_id = ?',
    [utilisateurId],
  );
  return ligne ?? null;
}

// Streak telle qu'elle était avant la séance qu'on est en train de logger — à appeler AVANT de
// l'insérer (streakDe ne compte que les séances déjà en base à cette date).
export const streakAvant = streakDe;

// À appeler APRÈS recalculerRang et l'insertion de la séance.
export async function detecterCelebrations({
  utilisateurId, seanceId, date, rangAvant: avantRang, streakAvant: avantStreak, rangApres,
}) {
  const celebrations = {};

  if (rangApres && (!avantRang || rangApres.rang > avantRang.rang)) {
    celebrations.nouveauRang = { rang: rangApres.rang, nom: rangApres.nom, palier: rangApres.palier };
  }

  const apresStreak = (await streakDe(utilisateurId, date)).actuel;
  const paliersFranchis = PALIERS_STREAK.filter((p) => avantStreak.actuel < p && apresStreak >= p);
  if (paliersFranchis.length > 0) {
    celebrations.streak = Math.max(...paliersFranchis);
  }

  const [noms] = await pool.execute(
    'SELECT DISTINCT nom_exercice FROM exercices_effectues WHERE seance_id = ?',
    [seanceId],
  );
  if (noms.length > 0) {
    // .query() (pas .execute()) : seul .query() développe un tableau pour IN (?) dans ce projet
    // (voir seances/depot.js, même patron pour la même situation).
    const [lignes] = await pool.query(
      `SELECT e.nom_exercice AS nom, e.seance_id, se.poids, se.repetitions
       FROM exercices_effectues e
       JOIN series se ON se.exercice_effectue_id = e.id
       JOIN seances s ON s.id = e.seance_id
       WHERE s.utilisateur_id = ? AND e.nom_exercice IN (?)`,
      [utilisateurId, noms.map((n) => n.nom_exercice)],
    );
    const parExercice = new Map();
    for (const l of lignes) {
      if (!(l.poids > 0 && l.repetitions <= REPS_MAX_ESTIMATION)) continue;
      const groupe = parExercice.get(l.nom) ?? { cetteFois: null, avant: null };
      const estimation = epley(Number(l.poids), l.repetitions);
      const cible = l.seance_id === seanceId ? 'cetteFois' : 'avant';
      if (groupe[cible] === null || estimation > groupe[cible].estimation) {
        groupe[cible] = { estimation, poids: Number(l.poids), repetitions: l.repetitions };
      }
      parExercice.set(l.nom, groupe);
    }
    // avant obligatoire : la toute première fois qu'on fait un exercice n'est pas un "record"
    // (rien à battre), juste une première série de données.
    const records = [];
    for (const [nom, { cetteFois, avant }] of parExercice) {
      if (cetteFois && avant && cetteFois.estimation > avant.estimation) {
        records.push({ nom, poids: cetteFois.poids, repetitions: cetteFois.repetitions });
      }
    }
    if (records.length > 0) celebrations.records = records;
  }

  return Object.keys(celebrations).length > 0 ? celebrations : null;
}
