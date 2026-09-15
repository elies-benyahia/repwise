import { Router } from 'express';
import { exigerConnexion } from '../auth/sessions.js';
import { pool } from '../db/pool.js';
import { ErreurHttp } from '../erreurs.js';
import { calculerStreak } from '../tableau-de-bord/streak.js';
import { RANGS, SCORE_GOAT } from './calcul.js';
import { recalculerRang } from './depot.js';

export const TAILLE_CLASSEMENT = 100;
const RANG_GOAT = RANGS.length;
// Nombre de séances récentes montrées sur un profil public (si son propriétaire l'autorise).
const NB_SEANCES_RECENTES = 5;

export const routesRang = Router();
routesRang.use(exigerConnexion);

routesRang.get('/', async (req, res) => {
  res.json({ rang: await recalculerRang(req.utilisateur.id) });
});

// Exportée : réutilisée par groupes/routes.js (mini-classement de groupe) pour ne pas dupliquer
// la requête + le calcul de streak.
export async function streakDe(utilisateurId, aujourdhui) {
  const [lignes] = await pool.execute(
    'SELECT DISTINCT date FROM seances WHERE utilisateur_id = ? AND date <= ? ORDER BY date',
    [utilisateurId, aujourdhui],
  );
  return calculerStreak(lignes.map((l) => l.date), aujourdhui);
}

// Ordre du classement : score décroissant, puis le premier arrivé à ce score devant, puis
// l'identifiant (départage stable). positionDe applique exactement le même ordre.
const CONDITION_CLASSE = 'r.rang = ? AND NOT u.est_invite';

// Position d'un GOAT parmi tous les GOAT ayant un compte (même au-delà du top 100).
async function positionDe(utilisateurId) {
  const [[ligne]] = await pool.execute(
    `SELECT COUNT(*) + 1 AS position
     FROM rangs_utilisateur r
     JOIN utilisateurs u ON u.id = r.utilisateur_id
     JOIN rangs_utilisateur moi ON moi.utilisateur_id = ?
     WHERE ${CONDITION_CLASSE}
       AND (r.score_performance > moi.score_performance
         OR (r.score_performance = moi.score_performance AND r.date_derniere_maj < moi.date_derniere_maj)
         OR (r.score_performance = moi.score_performance AND r.date_derniere_maj = moi.date_derniere_maj
             AND r.utilisateur_id < moi.utilisateur_id))`,
    [utilisateurId, RANG_GOAT],
  );
  return ligne.position;
}

const aujourdhuiUtc = () => new Date().toISOString().slice(0, 10);

// Top 100 des GOAT, par score. Seuls les comptes apparaissent (pas les invités) et seul le
// pseudo est affiché (jamais le vrai prénom si distinct — le pseudo est déjà ce que
// l'utilisateur a choisi de montrer).
export const routesClassement = Router();
routesClassement.use(exigerConnexion);

routesClassement.get('/', async (req, res) => {
  const [lignes] = await pool.execute(
    `SELECT r.utilisateur_id, u.pseudo, r.palier, r.score_performance
     FROM rangs_utilisateur r
     JOIN utilisateurs u ON u.id = r.utilisateur_id
     WHERE ${CONDITION_CLASSE}
     ORDER BY r.score_performance DESC, r.date_derniere_maj, r.utilisateur_id
     LIMIT ${TAILLE_CLASSEMENT}`,
    [RANG_GOAT],
  );
  const aujourdhui = aujourdhuiUtc();
  const classement = await Promise.all(lignes.map(async (l, i) => ({
    id: l.utilisateur_id,
    position: i + 1,
    pseudo: l.pseudo,
    palier: l.palier,
    score: Number(l.score_performance),
    streak: (await streakDe(l.utilisateur_id, aujourdhui)).actuel,
    estMoi: l.utilisateur_id === req.utilisateur.id,
  })));

  const moi = await recalculerRang(req.utilisateur.id);
  const classable = moi?.rang === RANG_GOAT && !req.utilisateur.estInvite;
  res.json({
    classement,
    moi,
    // Utile quand on est GOAT mais au-delà du top 100.
    maPosition: classable ? await positionDe(req.utilisateur.id) : null,
    scoreGoat: SCORE_GOAT,
  });
});

// Profil public d'un joueur du classement : uniquement les GOAT ayant un compte, et uniquement
// ce qui est déjà visible dans le classement (pseudo, rang, score) plus sa régularité, sa bio,
// sa photo, et ses séances récentes SI ce joueur a choisi de les rendre visibles. Le poids de
// corps et les courbes de charge ne sont jamais renvoyés par cette route, quel que soit le réglage.
routesClassement.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const introuvable = new ErreurHttp(404, 'Ce profil ne fait pas partie du classement');
  if (!Number.isInteger(id) || id < 1) throw introuvable;

  const [[joueur]] = await pool.execute(
    `SELECT u.pseudo, u.bio, u.photo_url, u.profil_public, r.rang, r.palier, r.score_performance
     FROM rangs_utilisateur r
     JOIN utilisateurs u ON u.id = r.utilisateur_id
     WHERE r.utilisateur_id = ? AND ${CONDITION_CLASSE}`,
    [id, RANG_GOAT],
  );
  if (!joueur) throw introuvable;

  // Compteur (30 jours) toujours visible, inchangé depuis la première version du classement.
  // La LISTE détaillée des séances récentes, elle, respecte le réglage de visibilité du joueur.
  const [[{ seances }]] = await pool.execute(
    'SELECT COUNT(*) AS seances FROM seances WHERE utilisateur_id = ? AND date >= CURDATE() - INTERVAL 30 DAY',
    [id],
  );
  const estMoi = id === req.utilisateur.id;
  const montrerSeances = estMoi || Boolean(joueur.profil_public);
  let seancesRecentes = null;
  if (montrerSeances) {
    const [lignes] = await pool.execute(
      `SELECT date, type_seance, type_personnalise FROM seances
       WHERE utilisateur_id = ? ORDER BY date DESC, id DESC LIMIT ${NB_SEANCES_RECENTES}`,
      [id],
    );
    seancesRecentes = lignes.map((l) => ({ date: l.date, typeSeance: l.type_seance, typePersonnalise: l.type_personnalise }));
  }

  const streak = await streakDe(id, aujourdhuiUtc());
  res.json({
    joueur: {
      pseudo: joueur.pseudo,
      bio: joueur.bio,
      photoUrl: joueur.photo_url,
      rang: { rang: joueur.rang, nom: RANGS[joueur.rang - 1], palier: joueur.palier },
      score: Number(joueur.score_performance),
      position: await positionDe(id),
      streak: { actuel: streak.actuel, record: streak.record },
      seancesTrenteJours: seances,
      seancesRecentes,
      profilPublic: Boolean(joueur.profil_public),
      estMoi,
    },
  });
});
