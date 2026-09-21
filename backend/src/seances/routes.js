import { Router } from 'express';
import { exigerConnexion } from '../auth/sessions.js';
import { ErreurHttp } from '../erreurs.js';
import { recalculerRang } from '../rang/depot.js';
import { detecterCelebrations, rangAvant, streakAvant } from './celebrations.js';
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
// Retour du 21/09 ("moments de célébration") : "avant" est capturé avant l'insertion (sinon la
// séance qu'on vient de logger fausserait sa propre comparaison), uniquement à la création —
// corriger une séance passée n'est pas le même moment que de finir sa séance du jour.
routesSeances.post('/', async (req, res) => {
  const corps = lireSeance(req.body);
  const avantRang = await rangAvant(req.utilisateur.id);
  const avantStreak = await streakAvant(req.utilisateur.id, corps.date);
  const id = await creerSeance(req.utilisateur.id, corps);
  const rangApres = await recalculerRang(req.utilisateur.id);
  const celebrations = await detecterCelebrations({
    utilisateurId: req.utilisateur.id,
    seanceId: id,
    date: corps.date,
    rangAvant: avantRang,
    streakAvant: avantStreak,
    rangApres,
  });
  res.status(201).json({ seance: await lireSeanceComplete(req.utilisateur.id, id), celebrations });
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
