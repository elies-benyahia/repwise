import { Router } from 'express';
import { exigerConnexion } from '../auth/sessions.js';
import { listerQuetes } from './depot.js';

export const routesQuetes = Router();
routesQuetes.use(exigerConnexion);

const aujourdhuiUtc = () => new Date().toISOString().slice(0, 10);

// GET /api/quetes — les 3 quêtes du jour + la quête de la semaine en cours, avec leur état.
// Les matérialise si besoin (premier appel du jour/de la semaine, cf. quetes/depot.js).
routesQuetes.get('/', async (req, res) => {
  res.json(await listerQuetes(req.utilisateur.id, aujourdhuiUtc()));
});
