import { randomUUID } from 'node:crypto';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { exigerConnexion } from '../auth/sessions.js';
import { pool } from '../db/pool.js';
import { ErreurHttp } from '../erreurs.js';
import { recalculerRang } from '../rang/depot.js';
import { NIVEAUX_EXPERIENCE, trouverUtilisateur } from './modele.js';
import { niveauActiviteDepuisFrequence, niveauExperienceDepuisFrequence, OBJECTIFS_DECLARES } from './niveaux.js';

const LIMITES = {
  age: { min: 10, max: 100 },
  taille: { min: 120, max: 230 },
  poids: { min: 30, max: 300 },
  frequenceSeances: { min: 0, max: 14 },
};
const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/;

const nombreEntre = (valeur, { min, max }) => typeof valeur === 'number' && valeur >= min && valeur <= max;

function ageValide(dateNaissance) {
  if (typeof dateNaissance !== 'string' || !FORMAT_DATE.test(dateNaissance)) return null;
  const date = new Date(`${dateNaissance}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || dateNaissance !== date.toISOString().slice(0, 10)) return null;
  const ansDepuis = (new Date() - date) / (365.25 * 24 * 60 * 60 * 1000);
  return nombreEntre(ansDepuis, LIMITES.age) ? dateNaissance : null;
}

// Chaque champ est optionnel (PATCH), mais validé s'il est présent.
// Renvoie les colonnes SQL à mettre à jour.
function lireProfil(corps) {
  const colonnes = {};
  const champs = {};

  if (corps.pseudo !== undefined) {
    const pseudo = typeof corps.pseudo === 'string' ? corps.pseudo.trim() : '';
    if (pseudo.length < 1 || pseudo.length > 50) champs.pseudo = 'Entre 1 et 50 caractères';
    else colonnes.pseudo = pseudo;
  }
  if (corps.dateNaissance !== undefined) {
    const date = ageValide(corps.dateNaissance);
    if (!date) champs.dateNaissance = `Entre ${LIMITES.age.min} et ${LIMITES.age.max} ans`;
    else colonnes.date_naissance = date;
  }
  if (corps.taille !== undefined) {
    if (!Number.isInteger(corps.taille) || !nombreEntre(corps.taille, LIMITES.taille)) {
      champs.taille = `Entre ${LIMITES.taille.min} et ${LIMITES.taille.max}`;
    } else colonnes.taille = corps.taille;
  }
  if (corps.poids !== undefined) {
    if (!nombreEntre(corps.poids, LIMITES.poids)) {
      champs.poids = `Entre ${LIMITES.poids.min} et ${LIMITES.poids.max}`;
    } else colonnes.poids_actuel = Math.round(corps.poids * 10) / 10;
  }
  if (corps.niveauExperience !== undefined) {
    if (!NIVEAUX_EXPERIENCE.includes(corps.niveauExperience)) champs.niveauExperience = 'Niveau inconnu';
    else colonnes.niveau_experience = corps.niveauExperience;
  }
  if (corps.frequenceSeances !== undefined) {
    if (!Number.isInteger(corps.frequenceSeances) || !nombreEntre(corps.frequenceSeances, LIMITES.frequenceSeances)) {
      champs.frequenceSeances = `Entre ${LIMITES.frequenceSeances.min} et ${LIMITES.frequenceSeances.max}`;
    } else {
      colonnes.frequence_seances = corps.frequenceSeances;
      // Déduits automatiquement, sauf si explicitement fournis dans la même requête
      // (ex. un futur écran de réglages avancés qui les réglerait à la main).
      if (corps.niveauExperience === undefined) {
        colonnes.niveau_experience = niveauExperienceDepuisFrequence(corps.frequenceSeances);
      }
      if (corps.niveauActivite === undefined) {
        colonnes.niveau_activite = niveauActiviteDepuisFrequence(corps.frequenceSeances);
      }
    }
  }
  if (corps.objectifDeclare !== undefined) {
    if (!OBJECTIFS_DECLARES.includes(corps.objectifDeclare)) champs.objectifDeclare = 'Objectif inconnu';
    else colonnes.objectif_declare = corps.objectifDeclare;
  }
  if (corps.bio !== undefined) {
    const bio = typeof corps.bio === 'string' ? corps.bio.trim() : '';
    if (bio.length > 280) champs.bio = '280 caractères maximum';
    // Chaîne vide acceptée : elle efface la bio (colonne NULL plutôt que "").
    else colonnes.bio = bio || null;
  }
  if (corps.profilPublic !== undefined) {
    if (typeof corps.profilPublic !== 'boolean') champs.profilPublic = 'Vrai ou faux';
    else colonnes.profil_public = corps.profilPublic;
  }

  if (Object.keys(champs).length > 0) {
    throw new ErreurHttp(400, 'Vérifie les champs du formulaire', champs);
  }
  return colonnes;
}

export const routesProfil = Router();

routesProfil.patch('/', exigerConnexion, async (req, res) => {
  const colonnes = lireProfil(req.body ?? {});
  const noms = Object.keys(colonnes);
  if (noms.length > 0) {
    // Les noms de colonnes viennent de lireProfil (liste fermée), jamais de la requête.
    await pool.execute(
      `UPDATE utilisateurs SET ${noms.map((n) => `${n} = ?`).join(', ')} WHERE id = ?`,
      [...Object.values(colonnes), req.utilisateur.id],
    );
  }
  if (colonnes.poids_actuel !== undefined) {
    // Chaque poids saisi alimente la courbe de poids de corps (un relevé par jour, le dernier gagne)
    // et le rang, qui est rapporté au poids de corps.
    await pool.execute(
      `INSERT INTO mesures_poids (utilisateur_id, date, poids) VALUES (?, CURDATE(), ?)
       AS nouveau ON DUPLICATE KEY UPDATE poids = nouveau.poids`,
      [req.utilisateur.id, colonnes.poids_actuel],
    );
    await recalculerRang(req.utilisateur.id);
  }
  res.json({ utilisateur: await trouverUtilisateur(req.utilisateur.id) });
});

// Courbe de poids de corps (page Progression).
routesProfil.get('/poids', exigerConnexion, async (req, res) => {
  const [lignes] = await pool.execute(
    'SELECT date, poids FROM mesures_poids WHERE utilisateur_id = ? ORDER BY date',
    [req.utilisateur.id],
  );
  res.json({ mesures: lignes.map((l) => ({ date: l.date, poids: Number(l.poids) })) });
});

// --- Photo de profil ---
// Stockage sur disque local (VPS/Railway à volume persistant) plutôt qu'un service externe :
// cohérent avec le reste de la stack, qui n'a pas de compte object-storage. En production,
// s'assurer que ce dossier survit aux redéploiements (volume monté), sinon les photos sont perdues.
// UPLOADS_DIR (tests) : dossier jetable, pour ne pas laisser de fichiers derrière les tests.
const DOSSIER_AVATARS = process.env.UPLOADS_DIR
  ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../../uploads/avatars');
await mkdir(DOSSIER_AVATARS, { recursive: true });

const EXTENSIONS_AUTORISEES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const TAILLE_MAX_PHOTO = 2 * 1024 * 1024;
// Une photo de profil n'est jamais affichée plus grande que ça (voir .photo-profil-image et
// consorts dans styles.css) : recadrer et recompresser côté serveur (retour du 21/09, "compresse
// tes images") évite de stocker/servir une photo de 4-8 Mo tout droit sortie d'un téléphone.
const COTE_PHOTO_PROFIL = 512;

// En mémoire plutôt que sur disque : le fichier reçu n'est qu'une étape intermédiaire, on ne
// stocke jamais l'original — seulement le JPEG recadré produit par sharp ci-dessous.
const televersement = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAILLE_MAX_PHOTO },
  fileFilter: (req, file, callback) => callback(null, Boolean(EXTENSIONS_AUTORISEES[file.mimetype])),
});

async function supprimerAncienneFichier(photoUrl) {
  if (!photoUrl) return;
  await unlink(path.join(DOSSIER_AVATARS, path.basename(photoUrl))).catch(() => {});
}

routesProfil.post('/photo', exigerConnexion, (req, res, next) => {
  televersement.single('photo')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new ErreurHttp(400, 'Image trop lourde (2 Mo maximum)'));
    }
    next(err);
  });
}, async (req, res) => {
  if (!req.file) throw new ErreurHttp(400, 'Image invalide (jpeg, png ou webp)', { photo: 'Format non accepté' });

  const nomFichier = `${randomUUID()}.jpg`;
  try {
    await sharp(req.file.buffer)
      .rotate() // applique l'orientation EXIF (photos de téléphone) avant de la perdre au ré-encodage
      .resize(COTE_PHOTO_PROFIL, COTE_PHOTO_PROFIL, { fit: 'cover' })
      .jpeg({ quality: 82 })
      .toFile(path.join(DOSSIER_AVATARS, nomFichier));
  } catch {
    // Le mimetype déclaré par le client passait fileFilter mais les octets ne sont pas une image
    // exploitable (fichier corrompu/renommé) : même message que le cas format non accepté.
    throw new ErreurHttp(400, 'Image invalide (jpeg, png ou webp)', { photo: 'Format non accepté' });
  }

  const [[avant]] = await pool.execute('SELECT photo_url FROM utilisateurs WHERE id = ?', [req.utilisateur.id]);
  const photoUrl = `/uploads/avatars/${nomFichier}`;
  await pool.execute('UPDATE utilisateurs SET photo_url = ? WHERE id = ?', [photoUrl, req.utilisateur.id]);
  await supprimerAncienneFichier(avant?.photo_url);
  res.json({ utilisateur: await trouverUtilisateur(req.utilisateur.id) });
});

routesProfil.delete('/photo', exigerConnexion, async (req, res) => {
  const [[avant]] = await pool.execute('SELECT photo_url FROM utilisateurs WHERE id = ?', [req.utilisateur.id]);
  await pool.execute('UPDATE utilisateurs SET photo_url = NULL WHERE id = ?', [req.utilisateur.id]);
  await supprimerAncienneFichier(avant?.photo_url);
  res.json({ utilisateur: await trouverUtilisateur(req.utilisateur.id) });
});
