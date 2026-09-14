import { pool } from '../db/pool.js';
import { FENETRE_JOURS, POINTS_VERS_SCORE, calculerScore, rangDepuisScore } from './calcul.js';

// Somme des points de quêtes gagnés dans la même fenêtre que le score de performance (cohérent
// avec le reste du système : un bonus vieux de plusieurs mois ne doit pas peser indéfiniment).
async function pointsQuetesRecents(utilisateurId) {
  const [[{ total }]] = await pool.execute(
    `SELECT COALESCE(SUM(points_gagnes), 0) AS total FROM quetes_utilisateur
     WHERE utilisateur_id = ? AND date_completion >= CURDATE() - INTERVAL ${FENETRE_JOURS} DAY`,
    [utilisateurId],
  );
  return Number(total);
}

// Recalcule le rang depuis les séries récentes et met à jour rangs_utilisateur (qui ne sert
// que de cache pour le classement). Appelé après chaque écriture qui peut le changer :
// séance créée/modifiée/supprimée, poids de corps ou sexe modifiés — et chaque nuit, pour
// que les performances sorties de la fenêtre ne comptent plus.
export async function recalculerRang(utilisateurId) {
  const [[utilisateur]] = await pool.execute(
    'SELECT poids_actuel, sexe FROM utilisateurs WHERE id = ?',
    [utilisateurId],
  );
  if (!utilisateur) return null;

  const [series] = await pool.execute(
    `SELECT b.id AS exercice_id, b.nom, b.groupe_musculaire, b.ratio_reference, b.poids_du_corps,
            se.poids, se.repetitions
     FROM seances s
     JOIN exercices_effectues e ON e.seance_id = s.id
     JOIN bibliotheque_exercices b ON b.id = e.exercice_id
     JOIN series se ON se.exercice_effectue_id = e.id
     WHERE s.utilisateur_id = ? AND s.date >= CURDATE() - INTERVAL ${FENETRE_JOURS} DAY
       AND b.ratio_reference IS NOT NULL`,
    [utilisateurId],
  );

  const resultat = calculerScore(
    series.map((s) => ({
      exerciceId: s.exercice_id,
      nom: s.nom,
      groupe: s.groupe_musculaire,
      ratioReference: Number(s.ratio_reference),
      poidsDuCorps: Boolean(s.poids_du_corps),
      poids: Number(s.poids),
      repetitions: s.repetitions,
    })),
    { poidsCorps: utilisateur.poids_actuel === null ? null : Number(utilisateur.poids_actuel), sexe: utilisateur.sexe },
  );

  // Bonus de quêtes : s'ajoute à un score déjà existant, ne fait jamais sortir du "Non classé"
  // à lui seul (cf. cahier : "s'ajoute au score de performance, ne le remplace pas").
  if (!resultat) {
    await pool.execute('DELETE FROM rangs_utilisateur WHERE utilisateur_id = ?', [utilisateurId]);
    return null;
  }
  const bonusPoints = await pointsQuetesRecents(utilisateurId);
  const scoreAvecBonus = Math.round((resultat.score + bonusPoints * POINTS_VERS_SCORE) * 1000) / 1000;
  const rang = rangDepuisScore(scoreAvecBonus);
  await pool.execute(
    `INSERT INTO rangs_utilisateur (utilisateur_id, rang, palier, score_performance) VALUES (?, ?, ?, ?)
     AS nouveau
     ON DUPLICATE KEY UPDATE rang = nouveau.rang, palier = nouveau.palier, score_performance = nouveau.score_performance`,
    [utilisateurId, rang.rang, rang.palier, scoreAvecBonus],
  );
  return {
    ...rang,
    score: scoreAvecBonus,
    scoreBrut: resultat.score,
    bonusPoints,
    groupes: resultat.groupes,
    parExercice: resultat.parExercice,
  };
}

export async function recalculerTousLesRangs() {
  const [lignes] = await pool.execute('SELECT utilisateur_id FROM rangs_utilisateur');
  for (const { utilisateur_id: id } of lignes) await recalculerRang(id);
  return lignes.length;
}
