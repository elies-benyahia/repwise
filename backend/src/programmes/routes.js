import { Router } from 'express';
import { exigerConnexion } from '../auth/sessions.js';
import { pool } from '../db/pool.js';
import { ErreurHttp } from '../erreurs.js';

const introuvable = () => new ErreurHttp(404, 'Programme introuvable');
const entierEntre = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

function lireId(parametre, erreur = introuvable) {
  const id = Number(parametre);
  if (!Number.isInteger(id) || id < 1) throw erreur();
  return id;
}

function lireNom(corps) {
  const nom = typeof corps?.nom === 'string' ? corps.nom.trim() : '';
  if (!nom || nom.length > 100) {
    throw new ErreurHttp(400, 'Vérifie le nom du programme', { nom: 'Nom requis (100 caractères max)' });
  }
  return nom;
}

function lireExercice(corps) {
  const c = corps ?? {};
  const champs = {};
  if (!entierEntre(c.exerciceId, 1, 2 ** 31)) champs.exerciceId = 'Exercice inconnu';
  if (!entierEntre(c.seriesCibles, 1, 20)) champs.seriesCibles = 'Entre 1 et 20 séries';
  if (!entierEntre(c.repetitionsCibles, 1, 100)) champs.repetitionsCibles = 'Entre 1 et 100 répétitions';
  const poidsCible = c.poidsCible ?? null;
  if (poidsCible !== null && !(typeof poidsCible === 'number' && poidsCible >= 0 && poidsCible <= 999)) {
    champs.poidsCible = 'Entre 0 et 999 kg';
  }
  if (Object.keys(champs).length > 0) throw new ErreurHttp(400, "Vérifie l'exercice", champs);
  return {
    exerciceId: c.exerciceId,
    seriesCibles: c.seriesCibles,
    repetitionsCibles: c.repetitionsCibles,
    poidsCible: poidsCible === null ? null : Math.round(poidsCible * 100) / 100,
  };
}

// Programme complet, ou null s'il n'appartient pas à l'utilisateur.
async function lireProgramme(utilisateurId, id) {
  const [[programme]] = await pool.execute(
    'SELECT id, nom_programme FROM programmes WHERE id = ? AND utilisateur_id = ?',
    [id, utilisateurId],
  );
  if (!programme) return null;
  const [exercices] = await pool.execute(
    `SELECT pe.id, pe.exercice_id, b.nom, b.groupe_musculaire, pe.series_cibles, pe.repetitions_cibles, pe.poids_cible
     FROM programme_exercices pe
     JOIN bibliotheque_exercices b ON b.id = pe.exercice_id
     WHERE pe.programme_id = ?
     ORDER BY pe.ordre`,
    [id],
  );
  return {
    id: programme.id,
    nom: programme.nom_programme,
    exercices: exercices.map((e) => ({
      id: e.id,
      exerciceId: e.exercice_id,
      nom: e.nom,
      groupeMusculaire: e.groupe_musculaire,
      seriesCibles: e.series_cibles,
      repetitionsCibles: e.repetitions_cibles,
      poidsCible: e.poids_cible === null ? null : Number(e.poids_cible),
    })),
  };
}

export const routesProgrammes = Router();
routesProgrammes.use(exigerConnexion);

routesProgrammes.get('/', async (req, res) => {
  const [lignes] = await pool.execute(
    `SELECT p.id, p.nom_programme, COUNT(pe.id) AS nb_exercices
     FROM programmes p
     LEFT JOIN programme_exercices pe ON pe.programme_id = p.id
     WHERE p.utilisateur_id = ?
     GROUP BY p.id
     ORDER BY p.date_creation DESC, p.id DESC`,
    [req.utilisateur.id],
  );
  res.json({ programmes: lignes.map((l) => ({ id: l.id, nom: l.nom_programme, nbExercices: l.nb_exercices })) });
});

routesProgrammes.post('/', async (req, res) => {
  const [resultat] = await pool.execute(
    'INSERT INTO programmes (utilisateur_id, nom_programme) VALUES (?, ?)',
    [req.utilisateur.id, lireNom(req.body)],
  );
  res.status(201).json({ programme: await lireProgramme(req.utilisateur.id, resultat.insertId) });
});

routesProgrammes.get('/:id', async (req, res) => {
  const programme = await lireProgramme(req.utilisateur.id, lireId(req.params.id));
  if (!programme) throw introuvable();
  res.json({ programme });
});

routesProgrammes.delete('/:id', async (req, res) => {
  const [resultat] = await pool.execute(
    'DELETE FROM programmes WHERE id = ? AND utilisateur_id = ?',
    [lireId(req.params.id), req.utilisateur.id],
  );
  if (resultat.affectedRows === 0) throw introuvable();
  res.status(204).end();
});

routesProgrammes.post('/:id/exercices', async (req, res) => {
  const id = lireId(req.params.id);
  const exercice = lireExercice(req.body);
  if (!(await lireProgramme(req.utilisateur.id, id))) throw introuvable();

  try {
    // Ajouté en fin de programme.
    await pool.execute(
      `INSERT INTO programme_exercices (programme_id, exercice_id, ordre, series_cibles, repetitions_cibles, poids_cible)
       SELECT ?, ?, COALESCE(MAX(ordre), 0) + 1, ?, ?, ? FROM programme_exercices WHERE programme_id = ?`,
      [id, exercice.exerciceId, exercice.seriesCibles, exercice.repetitionsCibles, exercice.poidsCible, id],
    );
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      throw new ErreurHttp(400, "Vérifie l'exercice", { exerciceId: 'Exercice inconnu' });
    }
    throw err;
  }
  res.status(201).json({ programme: await lireProgramme(req.utilisateur.id, id) });
});

routesProgrammes.delete('/:id/exercices/:ligne', async (req, res) => {
  const [resultat] = await pool.execute(
    `DELETE pe FROM programme_exercices pe
     JOIN programmes p ON p.id = pe.programme_id
     WHERE pe.id = ? AND pe.programme_id = ? AND p.utilisateur_id = ?`,
    [lireId(req.params.ligne), lireId(req.params.id), req.utilisateur.id],
  );
  if (resultat.affectedRows === 0) throw new ErreurHttp(404, 'Exercice introuvable dans ce programme');
  res.status(204).end();
});
