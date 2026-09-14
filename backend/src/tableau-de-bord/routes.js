import { Router } from 'express';
import { exigerConnexion } from '../auth/sessions.js';
import { estDansLeFutur, estDateValide } from '../dates.js';
import { pool } from '../db/pool.js';
import { ErreurHttp } from '../erreurs.js';
import { trouverObjectif } from '../journal/depot.js';
import { recalculerRang } from '../rang/depot.js';
import { musclesATravailler } from '../recommandations/regles.js';
import { ajouterJours, calculerStreak } from './streak.js';

async function totauxDuJour(utilisateurId, date) {
  const [[ligne]] = await pool.execute(
    `SELECT COALESCE(SUM(calories), 0) AS calories, COALESCE(SUM(proteines), 0) AS proteines,
            COALESCE(SUM(glucides), 0) AS glucides, COALESCE(SUM(lipides), 0) AS lipides
     FROM entrees_alimentaires
     WHERE utilisateur_id = ? AND date = ?`,
    [utilisateurId, date],
  );
  // SUM renvoie des DECIMAL, donc des chaînes avec mysql2.
  return {
    calories: Number(ligne.calories),
    proteines: Number(ligne.proteines),
    glucides: Number(ligne.glucides),
    lipides: Number(ligne.lipides),
  };
}

async function derniereSeance(utilisateurId, aujourdhui) {
  const [[seance]] = await pool.execute(
    `SELECT id, date, type_seance, type_personnalise FROM seances
     WHERE utilisateur_id = ? AND date <= ?
     ORDER BY date DESC, id DESC
     LIMIT 1`,
    [utilisateurId, aujourdhui],
  );
  if (!seance) return null;
  const [exercices] = await pool.execute(
    'SELECT nom_exercice FROM exercices_effectues WHERE seance_id = ? ORDER BY ordre',
    [seance.id],
  );
  return {
    id: seance.id,
    date: seance.date,
    typeSeance: seance.type_seance,
    typePersonnalise: seance.type_personnalise,
    exercices: exercices.map((e) => e.nom_exercice),
  };
}

async function datesDeSeance(utilisateurId, aujourdhui) {
  const [lignes] = await pool.execute(
    'SELECT DISTINCT date FROM seances WHERE utilisateur_id = ? AND date <= ? ORDER BY date',
    [utilisateurId, aujourdhui],
  );
  return lignes.map((l) => l.date);
}

// Dernière date à laquelle chaque groupe musculaire a été travaillé (exercices reliés à la bibliothèque).
async function derniereDateParGroupe(utilisateurId, aujourdhui) {
  const [lignes] = await pool.execute(
    `SELECT b.groupe_musculaire, MAX(s.date) AS derniere
     FROM seances s
     JOIN exercices_effectues e ON e.seance_id = s.id
     JOIN bibliotheque_exercices b ON b.id = e.exercice_id
     WHERE s.utilisateur_id = ? AND s.date <= ?
     GROUP BY b.groupe_musculaire`,
    [utilisateurId, aujourdhui],
  );
  return new Map(lignes.map((l) => [l.groupe_musculaire, l.derniere]));
}

export const routesTableauDeBord = Router();
routesTableauDeBord.use(exigerConnexion);

// Le « aujourd'hui » vient du navigateur : c'est le jour local de l'utilisateur qui compte
// (à 1 h du matin à Paris, le serveur en UTC est encore la veille).
routesTableauDeBord.get('/', async (req, res) => {
  const { aujourdhui } = req.query;
  if (!estDateValide(aujourdhui) || estDansLeFutur(aujourdhui)) {
    throw new ErreurHttp(400, 'Paramètre aujourdhui requis (AAAA-MM-JJ)');
  }
  const id = req.utilisateur.id;

  const [consomme, objectif, seance, dates, dernieresParGroupe, rang] = await Promise.all([
    totauxDuJour(id, aujourdhui),
    trouverObjectif(id, aujourdhui),
    derniereSeance(id, aujourdhui),
    datesDeSeance(id, aujourdhui),
    derniereDateParGroupe(id, aujourdhui),
    recalculerRang(id),
  ]);

  const ilYASixJours = ajouterJours(aujourdhui, -6);
  res.json({
    nutrition: { consomme, objectif },
    derniereSeance: seance,
    // Les 7 derniers jours (aujourd'hui compris), comme le demande le cahier des charges.
    derniersJours: dates.filter((d) => d >= ilYASixJours),
    streak: calculerStreak(dates, aujourdhui),
    rang,
    // Rien à suggérer tant qu'aucune séance n'est loggée : le dashboard invite déjà à commencer.
    aTravailler: dates.length > 0 ? musclesATravailler(dernieresParGroupe, aujourdhui) : [],
  });
});
