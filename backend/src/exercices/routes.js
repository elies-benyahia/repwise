import { Router } from 'express';
import { pool } from '../db/pool.js';
import { ErreurHttp } from '../erreurs.js';

// Clés identiques à l'ENUM bibliotheque_exercices.groupe_musculaire.
export const GROUPES_MUSCULAIRES = [
  'pectoraux', 'dos', 'trapezes', 'lombaires', 'epaules', 'biceps', 'triceps',
  'avant_bras', 'abdominaux', 'obliques', 'fessiers', 'quadriceps', 'ischio_jambiers', 'mollets',
];

// Bibliothèque publique (pas de donnée personnelle) : lisible sans session.
export const routesExercices = Router();

// GET /api/exercices?groupe=pectoraux — sans groupe : toute la bibliothèque (autocomplétion).
routesExercices.get('/', async (req, res) => {
  const { groupe } = req.query;
  if (groupe !== undefined && !GROUPES_MUSCULAIRES.includes(groupe)) {
    throw new ErreurHttp(400, 'Groupe musculaire inconnu');
  }
  const [lignes] = await pool.execute(
    `SELECT id, nom, groupe_musculaire, description, niveau_difficulte, image_ou_gif
     FROM bibliotheque_exercices
     ${groupe ? 'WHERE groupe_musculaire = ?' : ''}
     ORDER BY groupe_musculaire, priorite, nom`,
    groupe ? [groupe] : [],
  );
  res.json({
    exercices: lignes.map((l) => ({
      id: l.id,
      nom: l.nom,
      groupeMusculaire: l.groupe_musculaire,
      description: l.description,
      niveauDifficulte: l.niveau_difficulte,
      // Aucun visuel fourni pour les 68 exercices (cahier §4) : reste NULL pour l'instant, le
      // front affiche un repli générique par groupe musculaire — voir README.
      imageUrl: l.image_ou_gif,
    })),
  });
});
