import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { routesAdmin } from './admin/routes.js';
import { routesAliments } from './alimentation/routes.js';
import { routesAuth } from './auth/routes.js';
import { chargerSession } from './auth/sessions.js';
import { config } from './config.js';
import { gestionnaireErreurs } from './erreurs.js';
import { routesExercices } from './exercices/routes.js';
import { routesFeedback } from './feedback/routes.js';
import { routesGroupes } from './groupes/routes.js';
import { routesJournal, routesObjectif } from './journal/routes.js';
import { routesProgrammes } from './programmes/routes.js';
import { routesProgression } from './progression/routes.js';
import { routesQuetes } from './quetes/routes.js';
import { routesClassement, routesRang } from './rang/routes.js';
import { routesSeances } from './seances/routes.js';
import { routesTableauDeBord } from './tableau-de-bord/routes.js';
import { routesProfil } from './utilisateurs/routes.js';

export function creerApp() {
  const app = express();
  app.set('trust proxy', config.trustProxy);

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(chargerSession);

  // Photos de profil (backend/src/utilisateurs/routes.js). Servi sur le même domaine que l'API
  // (voir vite.config.js / vercel.json), donc pas de souci CORS.
  app.use('/uploads', express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), '../uploads')));

  app.get('/api/sante', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', routesAuth);
  app.use('/api/profil', routesProfil);
  app.use('/api/seances', routesSeances);
  app.use('/api/journal', routesJournal);
  app.use('/api/objectif', routesObjectif);
  app.use('/api/tableau-de-bord', routesTableauDeBord);
  app.use('/api/exercices', routesExercices);
  app.use('/api/programmes', routesProgrammes);
  app.use('/api/feedback', routesFeedback);
  app.use('/api/progression', routesProgression);
  app.use('/api/rang', routesRang);
  app.use('/api/classement', routesClassement);
  app.use('/api/quetes', routesQuetes);
  app.use('/api/admin', routesAdmin);
  app.use('/api/aliments', routesAliments);
  app.use('/api/groupes', routesGroupes);

  app.use('/api', (req, res) => res.status(404).json({ erreur: 'Route introuvable' }));
  app.use(gestionnaireErreurs);
  return app;
}
