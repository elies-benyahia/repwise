import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { exigerConnexion } from '../auth/sessions.js';
import { pool } from '../db/pool.js';
import { ErreurHttp } from '../erreurs.js';
import { RANGS } from '../rang/calcul.js';
import { streakDe } from '../rang/routes.js';

// Groupes d'entraînement (cahier, demande du 15/09 : "suivre leur progression... s'envoyer des
// messages"). Décision (voir docs/cahier-des-charges.md §3) : pas de messagerie libre pour
// l'instant — fil d'activité (séances loggées par les membres, lues directement depuis `seances`,
// jamais stockées à part) + encouragements rapides façon Strava, sur le modèle du reste du site
// (rang/streak déjà recalculés à la volée, jamais un compteur qui pourrait devenir faux).
const NOM_MAX = 60;
// Sans 0/O/1/I/l (ambigus à dicter/recopier).
const ALPHABET_CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LONGUEUR_CODE = 8;
const NB_ACTIVITES = 30;

function limiteur({ minutes, tentatives }) {
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    limit: tentatives,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ erreur: 'Trop de tentatives. Réessaie dans quelques minutes.' }),
  });
}

// Créer un groupe reste rare (pas un flux à haut volume) ; rejoindre mérite d'être plus limité,
// un code à 8 caractères reste devinable en masse sans ce frein.
const limiteurCreation = limiteur({ minutes: 60, tentatives: 20 });
const limiteurRejoindre = limiteur({ minutes: 15, tentatives: 15 });

function genererCodeInvitation() {
  const octets = randomBytes(LONGUEUR_CODE);
  return Array.from(octets, (o) => ALPHABET_CODE[o % ALPHABET_CODE.length]).join('');
}

async function estMembre(groupeId, utilisateurId) {
  const [[ligne]] = await pool.execute(
    'SELECT 1 FROM groupes_membres WHERE groupe_id = ? AND utilisateur_id = ?',
    [groupeId, utilisateurId],
  );
  return Boolean(ligne);
}

const aujourdhuiUtc = () => new Date().toISOString().slice(0, 10);
const introuvable = () => new ErreurHttp(404, 'Groupe introuvable');

export const routesGroupes = Router();
routesGroupes.use(exigerConnexion);

// GET /api/groupes — mes groupes, avec le nombre de membres.
routesGroupes.get('/', async (req, res) => {
  const [lignes] = await pool.execute(
    `SELECT g.id, g.nom, (SELECT COUNT(*) FROM groupes_membres WHERE groupe_id = g.id) AS nombre_membres
     FROM groupes g
     JOIN groupes_membres gm ON gm.groupe_id = g.id AND gm.utilisateur_id = ?
     ORDER BY g.date_creation DESC`,
    [req.utilisateur.id],
  );
  res.json({ groupes: lignes.map((l) => ({ id: l.id, nom: l.nom, nombreMembres: l.nombre_membres })) });
});

// POST /api/groupes { nom } — crée le groupe, le créateur en devient membre.
routesGroupes.post('/', limiteurCreation, async (req, res) => {
  const nom = typeof req.body?.nom === 'string' ? req.body.nom.trim() : '';
  if (!nom || nom.length > NOM_MAX) {
    throw new ErreurHttp(400, 'Vérifie le nom du groupe', { nom: `Entre 1 et ${NOM_MAX} caractères` });
  }

  let groupeId;
  // Collision sur le code : improbable (36^8) mais on retente proprement plutôt que de planter.
  for (let tentative = 0; !groupeId && tentative < 5; tentative += 1) {
    try {
      const [resultat] = await pool.execute(
        'INSERT INTO groupes (nom, code_invitation, createur_id) VALUES (?, ?, ?)',
        [nom, genererCodeInvitation(), req.utilisateur.id],
      );
      groupeId = resultat.insertId;
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
    }
  }
  if (!groupeId) throw new ErreurHttp(500, 'Impossible de créer le groupe, réessaie');

  await pool.execute('INSERT INTO groupes_membres (groupe_id, utilisateur_id) VALUES (?, ?)', [groupeId, req.utilisateur.id]);
  const [[groupe]] = await pool.execute('SELECT id, nom, code_invitation FROM groupes WHERE id = ?', [groupeId]);
  res.status(201).json({ groupe: { id: groupe.id, nom: groupe.nom, codeInvitation: groupe.code_invitation, nombreMembres: 1 } });
});

// POST /api/groupes/rejoindre { code } — idempotent : rejoindre un groupe dont on est déjà membre
// ne fait rien de plus que le renvoyer (évite une erreur gênante si on reclique le lien reçu).
routesGroupes.post('/rejoindre', limiteurRejoindre, async (req, res) => {
  const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
  if (!code) throw new ErreurHttp(400, 'Code d\'invitation requis');

  const [[groupe]] = await pool.execute('SELECT id, nom FROM groupes WHERE code_invitation = ?', [code]);
  if (!groupe) throw new ErreurHttp(404, 'Aucun groupe avec ce code');

  await pool.execute(
    'INSERT IGNORE INTO groupes_membres (groupe_id, utilisateur_id) VALUES (?, ?)',
    [groupe.id, req.utilisateur.id],
  );
  res.status(201).json({ groupe: { id: groupe.id, nom: groupe.nom } });
});

// GET /api/groupes/:id — détail : membres (mini-classement) + fil d'activité. Réservé aux
// membres ; un non-membre reçoit la même 404 qu'un groupe inexistant (pas de fuite d'existence).
routesGroupes.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw introuvable();
  if (!(await estMembre(id, req.utilisateur.id))) throw introuvable();

  const [[groupe]] = await pool.execute('SELECT id, nom, code_invitation FROM groupes WHERE id = ?', [id]);
  if (!groupe) throw introuvable();

  const [lignesMembres] = await pool.execute(
    `SELECT u.id, u.pseudo, u.photo_url, r.rang, r.palier, r.score_performance
     FROM groupes_membres gm
     JOIN utilisateurs u ON u.id = gm.utilisateur_id
     LEFT JOIN rangs_utilisateur r ON r.utilisateur_id = u.id
     WHERE gm.groupe_id = ?
     ORDER BY r.score_performance IS NULL, r.score_performance DESC`,
    [id],
  );
  const aujourdhui = aujourdhuiUtc();
  const membres = await Promise.all(lignesMembres.map(async (l) => ({
    id: l.id,
    pseudo: l.pseudo,
    photoUrl: l.photo_url,
    rang: l.rang ? { rang: l.rang, nom: RANGS[l.rang - 1], palier: l.palier, score: Number(l.score_performance) } : null,
    streak: (await streakDe(l.id, aujourdhui)).actuel,
    estMoi: l.id === req.utilisateur.id,
  })));

  // Fil d'activité : uniquement ce qui est déjà visible dans le calendrier de chacun (date, type)
  // — jamais les charges/répétitions (mêmes règles de confidentialité que le classement public).
  const [lignesActivites] = await pool.execute(
    `SELECT s.id, s.utilisateur_id, u.pseudo, u.photo_url, s.date, s.type_seance, s.type_personnalise
     FROM seances s
     JOIN groupes_membres gm ON gm.utilisateur_id = s.utilisateur_id AND gm.groupe_id = ?
     JOIN utilisateurs u ON u.id = s.utilisateur_id
     ORDER BY s.date_creation DESC
     LIMIT ${NB_ACTIVITES}`,
    [id],
  );

  let encouragementsParSeance = new Map();
  if (lignesActivites.length > 0) {
    const idsSeances = lignesActivites.map((l) => l.id);
    const marqueurs = idsSeances.map(() => '?').join(', ');
    const [lignesEncouragements] = await pool.execute(
      `SELECT seance_id, utilisateur_id FROM encouragements WHERE seance_id IN (${marqueurs})`,
      idsSeances,
    );
    encouragementsParSeance = lignesEncouragements.reduce((acc, l) => {
      if (!acc.has(l.seance_id)) acc.set(l.seance_id, []);
      acc.get(l.seance_id).push(l.utilisateur_id);
      return acc;
    }, new Map());
  }

  const activites = lignesActivites.map((l) => {
    const encourageurs = encouragementsParSeance.get(l.id) ?? [];
    return {
      seanceId: l.id,
      utilisateurId: l.utilisateur_id,
      pseudo: l.pseudo,
      photoUrl: l.photo_url,
      date: l.date,
      typeSeance: l.type_seance,
      typePersonnalise: l.type_personnalise,
      nombreEncouragements: encourageurs.length,
      jaiEncourage: encourageurs.includes(req.utilisateur.id),
    };
  });

  res.json({
    groupe: { id: groupe.id, nom: groupe.nom, codeInvitation: groupe.code_invitation },
    membres,
    activites,
  });
});

// DELETE /api/groupes/:id/membres/moi — quitter le groupe (le créateur peut aussi partir ; le
// groupe reste juste vide, pas de suppression en cascade automatique pour l'instant).
routesGroupes.delete('/:id/membres/moi', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw introuvable();
  const [resultat] = await pool.execute(
    'DELETE FROM groupes_membres WHERE groupe_id = ? AND utilisateur_id = ?',
    [id, req.utilisateur.id],
  );
  if (resultat.affectedRows === 0) throw introuvable();
  res.status(204).end();
});

// POST /api/groupes/:id/seances/:seanceId/encouragement — bascule (ajoute si absent, retire
// sinon). La séance doit appartenir à un membre DU MÊME groupe que moi : empêche d'encourager
// (et donc de découvrir l'existence d') une séance en dehors de ce que ce groupe partage.
routesGroupes.post('/:id/seances/:seanceId/encouragement', async (req, res) => {
  const id = Number(req.params.id);
  const seanceId = Number(req.params.seanceId);
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(seanceId) || seanceId < 1) throw introuvable();
  if (!(await estMembre(id, req.utilisateur.id))) throw introuvable();

  const [[seance]] = await pool.execute(
    `SELECT s.id FROM seances s
     JOIN groupes_membres gm ON gm.utilisateur_id = s.utilisateur_id AND gm.groupe_id = ?
     WHERE s.id = ?`,
    [id, seanceId],
  );
  if (!seance) throw new ErreurHttp(404, 'Séance introuvable dans ce groupe');

  const [[existant]] = await pool.execute(
    'SELECT id FROM encouragements WHERE seance_id = ? AND utilisateur_id = ?',
    [seanceId, req.utilisateur.id],
  );
  if (existant) {
    await pool.execute('DELETE FROM encouragements WHERE id = ?', [existant.id]);
    return res.json({ encourage: false });
  }
  await pool.execute('INSERT INTO encouragements (seance_id, utilisateur_id) VALUES (?, ?)', [seanceId, req.utilisateur.id]);
  res.json({ encourage: true });
});
