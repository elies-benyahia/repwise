import { Router } from 'express';
import { exigerConnexion } from '../auth/sessions.js';
import { estDateValide } from '../dates.js';
import { pool } from '../db/pool.js';
import { ErreurHttp } from '../erreurs.js';
import { REPS_MAX_ESTIMATION, epley } from '../rang/calcul.js';
import { suggererProgression } from '../recommandations/regles.js';

function lireNom(nom) {
  const texte = typeof nom === 'string' ? nom.trim() : '';
  if (!texte || texte.length > 100) throw new ErreurHttp(400, "Nom d'exercice requis");
  return texte;
}

// Les noms sont comparés avec la collation MySQL (casse et accents ignorés) : "squat" et
// "Squat" sont le même exercice.
export const routesProgression = Router();
routesProgression.use(exigerConnexion);

// Exercices déjà pratiqués, les plus fréquents d'abord (sélecteur de la page Progression).
routesProgression.get('/exercices', async (req, res) => {
  const [lignes] = await pool.execute(
    `SELECT MIN(e.nom_exercice) AS nom, COUNT(DISTINCT s.id) AS nb_seances, MAX(s.date) AS derniere
     FROM exercices_effectues e
     JOIN seances s ON s.id = e.seance_id
     WHERE s.utilisateur_id = ?
     GROUP BY e.nom_exercice
     ORDER BY nb_seances DESC, derniere DESC`,
    [req.utilisateur.id],
  );
  res.json({ exercices: lignes.map((l) => ({ nom: l.nom, nbSeances: l.nb_seances, derniere: l.derniere })) });
});

// Un point par jour d'entraînement : meilleur 1RM estimé (Epley), charge max, répétitions max.
routesProgression.get('/exercice', async (req, res) => {
  const nom = lireNom(req.query.nom);
  const [lignes] = await pool.execute(
    `SELECT s.date, se.poids, se.repetitions
     FROM exercices_effectues e
     JOIN seances s ON s.id = e.seance_id
     JOIN series se ON se.exercice_effectue_id = e.id
     WHERE s.utilisateur_id = ? AND e.nom_exercice = ?
     ORDER BY s.date`,
    [req.utilisateur.id, nom],
  );

  const parJour = new Map();
  for (const { date, poids: brut, repetitions } of lignes) {
    const poids = Number(brut);
    const point = parJour.get(date) ?? { date, meilleur1RM: null, chargeMax: 0, repetitionsMax: 0 };
    point.chargeMax = Math.max(point.chargeMax, poids);
    point.repetitionsMax = Math.max(point.repetitionsMax, repetitions);
    if (poids > 0 && repetitions <= REPS_MAX_ESTIMATION) {
      point.meilleur1RM = Math.max(point.meilleur1RM ?? 0, Math.round(epley(poids, repetitions) * 10) / 10);
    }
    parJour.set(date, point);
  }
  res.json({ points: [...parJour.values()] });
});

// Dernière fois que l'exercice a été fait avant `avant` (la date de la séance en cours de saisie),
// et la suggestion de progression qui en découle.
routesProgression.get('/derniere-fois', async (req, res) => {
  const nom = lireNom(req.query.nom);
  const { avant } = req.query;
  if (!estDateValide(avant)) throw new ErreurHttp(400, 'Paramètre avant requis (AAAA-MM-JJ)');

  const [[exercice]] = await pool.execute(
    `SELECT e.id, s.date
     FROM exercices_effectues e
     JOIN seances s ON s.id = e.seance_id
     WHERE s.utilisateur_id = ? AND e.nom_exercice = ? AND s.date < ?
     ORDER BY s.date DESC, s.id DESC, e.ordre
     LIMIT 1`,
    [req.utilisateur.id, nom, avant],
  );
  if (!exercice) return res.json({ derniereFois: null, suggestion: null });

  const [lignes] = await pool.execute(
    'SELECT repetitions, poids FROM series WHERE exercice_effectue_id = ? ORDER BY numero_serie',
    [exercice.id],
  );
  const series = lignes.map((l) => ({ repetitions: l.repetitions, poids: Number(l.poids) }));
  res.json({ derniereFois: { date: exercice.date, series }, suggestion: suggererProgression(series) });
});
