import { Router } from 'express';
import { exigerConnexion } from '../auth/sessions.js';
import { ErreurHttp } from '../erreurs.js';
import { recalculerRang } from '../rang/depot.js';
import {
  creerSeance,
  lireSeanceComplete,
  listerExercicesRecents,
  listerSeances,
  remplacerSeance,
  supprimerSeance,
} from './depot.js';
import { lirePlage, lireSeance } from './validation.js';

const introuvable = () => new ErreurHttp(404, 'Séance introuvable');

function lireId(parametre) {
  const id = Number(parametre);
  if (!Number.isInteger(id) || id < 1) throw introuvable();
  return id;
}

export const routesSeances = Router();
routesSeances.use(exigerConnexion);

// GET /api/seances?debut=2026-08-31&fin=2026-10-04 : résumé pour la grille du calendrier.
routesSeances.get('/', async (req, res) => {
  const plage = lirePlage(req.query);
  res.json({ seances: await listerSeances(req.utilisateur.id, plage) });
});

// Déclarée avant /:id pour ne pas être prise pour un identifiant.
routesSeances.get('/exercices-recents', async (req, res) => {
  res.json({ exercices: await listerExercicesRecents(req.utilisateur.id) });
});

routesSeances.get('/:id', async (req, res) => {
  const seance = await lireSeanceComplete(req.utilisateur.id, lireId(req.params.id));
  if (!seance) throw introuvable();
  res.json({ seance });
});

// Chaque écriture peut changer le rang (meilleurs 1RM récents) : il est recalculé aussitôt.
routesSeances.post('/', async (req, res) => {
  const id = await creerSeance(req.utilisateur.id, lireSeance(req.body));
  await recalculerRang(req.utilisateur.id);
  res.status(201).json({ seance: await lireSeanceComplete(req.utilisateur.id, id) });
});

routesSeances.put('/:id', async (req, res) => {
  const id = lireId(req.params.id);
  const seance = lireSeance(req.body);
  if (!(await remplacerSeance(req.utilisateur.id, id, seance))) throw introuvable();
  await recalculerRang(req.utilisateur.id);
  res.json({ seance: await lireSeanceComplete(req.utilisateur.id, id) });
});

routesSeances.delete('/:id', async (req, res) => {
  if (!(await supprimerSeance(req.utilisateur.id, lireId(req.params.id)))) throw introuvable();
  await recalculerRang(req.utilisateur.id);
  res.status(204).end();
});
