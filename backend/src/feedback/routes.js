import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { pool } from '../db/pool.js';
import { ErreurHttp } from '../erreurs.js';

const TYPES = ['suggestion', 'bug'];
const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Formulaire public : on freine le spam sans gêner un utilisateur qui envoie plusieurs retours.
const limiteur = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ erreur: 'Trop de messages envoyés. Réessaie plus tard.' }),
});

export const routesFeedback = Router();

// Sans compte requis ; si une session existe, le retour est rattaché à l'utilisateur.
routesFeedback.post('/', limiteur, async (req, res) => {
  const c = req.body ?? {};
  const champs = {};
  const description = typeof c.description === 'string' ? c.description.trim() : '';
  const emailContact = typeof c.emailContact === 'string' ? c.emailContact.trim().toLowerCase() : '';

  if (!TYPES.includes(c.type)) champs.type = 'Choisis suggestion ou bug';
  if (description.length < 10 || description.length > 2000) champs.description = 'Entre 10 et 2000 caractères';
  if (emailContact && (!FORMAT_EMAIL.test(emailContact) || emailContact.length > 255)) {
    champs.emailContact = 'Adresse email invalide';
  }
  if (Object.keys(champs).length > 0) throw new ErreurHttp(400, 'Vérifie le formulaire', champs);

  await pool.execute(
    'INSERT INTO feedback (utilisateur_id, type, description, email_contact) VALUES (?, ?, ?, ?)',
    [req.utilisateur?.id ?? null, c.type, description, emailContact || null],
  );
  res.status(201).json({ ok: true });
});
