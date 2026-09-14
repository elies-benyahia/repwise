import { Router } from 'express';
import { exigerConnexion } from '../auth/sessions.js';
import { ErreurHttp } from '../erreurs.js';
import { recalculerRang } from '../rang/depot.js';
import { trouverUtilisateur } from '../utilisateurs/modele.js';
import {
  ajouterEntree, enregistrerObjectif, listerAlimentsRecents, listerEntrees, supprimerEntree, trouverObjectif,
} from './depot.js';
import { lireDate, lireEntree, lireObjectif } from './validation.js';

export const routesJournal = Router();
routesJournal.use(exigerConnexion);

// Déclarée avant /:date pour ne pas être prise pour une date.
routesJournal.get('/aliments-recents', async (req, res) => {
  res.json({ aliments: await listerAlimentsRecents(req.utilisateur.id) });
});

// Tout ce qu'il faut pour afficher une journée : les aliments et l'objectif à atteindre.
routesJournal.get('/:date', async (req, res) => {
  const date = lireDate(req.params.date);
  const [entrees, objectif] = await Promise.all([
    listerEntrees(req.utilisateur.id, date),
    trouverObjectif(req.utilisateur.id, date),
  ]);
  res.json({ entrees, objectif });
});

routesJournal.post('/', async (req, res) => {
  res.status(201).json({ entree: await ajouterEntree(req.utilisateur.id, lireEntree(req.body)) });
});

routesJournal.delete('/entrees/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1 || !(await supprimerEntree(req.utilisateur.id, id))) {
    throw new ErreurHttp(404, 'Aliment introuvable');
  }
  res.status(204).end();
});

export const routesObjectif = Router();
routesObjectif.use(exigerConnexion);

// Enregistre l'objectif calculé et renvoie l'utilisateur à jour (sexe, activité, objectif).
routesObjectif.post('/', async (req, res) => {
  await enregistrerObjectif(req.utilisateur.id, lireObjectif(req.body));
  // Le sexe a pu changer : les repères de force du rang en dépendent.
  await recalculerRang(req.utilisateur.id);
  res.status(201).json({ utilisateur: await trouverUtilisateur(req.utilisateur.id) });
});
