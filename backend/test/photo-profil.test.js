import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { demarrerServeurDeTest } from './outils.js';

// Dossier jetable : les photos de test ne polluent pas backend/uploads/avatars, et l'existence
// d'un fichier se vérifie directement sur disque plutôt que via express.static (qui sert
// toujours le vrai dossier de prod, indépendant de ce réglage réservé aux tests).
const dossierUploads = await mkdtemp(path.join(tmpdir(), 'repwise-uploads-'));
process.env.UPLOADS_DIR = dossierUploads;

const { urlBase, arreter } = await demarrerServeurDeTest('repwise_test_photo');
after(async () => {
  await arreter();
  await rm(dossierUploads, { recursive: true, force: true });
});

const existeSurDisque = (photoUrl) => access(path.join(dossierUploads, path.basename(photoUrl))).then(() => true, () => false);

async function nouvelInvite() {
  const r = await fetch(`${urlBase}/auth/invite`, { method: 'POST' });
  return { cookie: r.headers.getSetCookie()[0].split(';')[0], corps: await r.json() };
}

// 1x1 PNG rouge, le plus petit fichier PNG valide qui soit.
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

async function envoyerPhoto(cookie, { octets = PIXEL_PNG, nom = 'photo.png', type = 'image/png' } = {}) {
  const formulaire = new FormData();
  formulaire.append('photo', new Blob([octets], { type }), nom);
  return fetch(`${urlBase}/profil/photo`, { method: 'POST', headers: { Cookie: cookie }, body: formulaire });
}

test('téléverser une photo de profil puis la remplacer', async () => {
  const { cookie } = await nouvelInvite();
  const r = await envoyerPhoto(cookie);
  assert.equal(r.status, 200);
  const { utilisateur } = await r.json();
  // Retour du 21/09 ("compresse tes images") : toujours ré-encodé en JPEG, quel que soit le
  // format d'origine (recadrage + compression via sharp) — voir utilisateurs/routes.js.
  assert.match(utilisateur.photoUrl, /^\/uploads\/avatars\/[\w-]+\.jpg$/);
  assert.equal(await existeSurDisque(utilisateur.photoUrl), true);

  // Remplacer la photo supprime l'ancien fichier.
  const ancienChemin = utilisateur.photoUrl;
  const r2 = await envoyerPhoto(cookie, { nom: 'autre.png' });
  const { utilisateur: apres } = await r2.json();
  assert.notEqual(apres.photoUrl, ancienChemin);
  assert.equal(await existeSurDisque(apres.photoUrl), true);
  assert.equal(await existeSurDisque(ancienChemin), false);
});

test('la photo est recadrée en carré et recompressée en JPEG', async () => {
  const { cookie } = await nouvelInvite();
  // Image 2000×1000 (rectangulaire, volontairement plus grande que la cible) pour vérifier le
  // recadrage carré, pas juste une réduction proportionnelle.
  const grande = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: { r: 200, g: 50, b: 50 } } })
    .png()
    .toBuffer();
  const r = await envoyerPhoto(cookie, { octets: grande, nom: 'grande.png' });
  assert.equal(r.status, 200);
  const { utilisateur } = await r.json();

  const metadonnees = await sharp(path.join(dossierUploads, path.basename(utilisateur.photoUrl))).metadata();
  assert.equal(metadonnees.format, 'jpeg');
  assert.equal(metadonnees.width, 512);
  assert.equal(metadonnees.height, 512);
});

test('un format non accepté est refusé', async () => {
  const { cookie } = await nouvelInvite();
  const r = await envoyerPhoto(cookie, { octets: Buffer.from('pas une image'), nom: 'x.txt', type: 'text/plain' });
  assert.equal(r.status, 400);
});

test('une image trop lourde est refusée', async () => {
  const { cookie } = await nouvelInvite();
  const r = await envoyerPhoto(cookie, { octets: Buffer.alloc(3 * 1024 * 1024) });
  assert.equal(r.status, 400);
});

test('supprimer sa photo', async () => {
  const { cookie } = await nouvelInvite();
  const { utilisateur } = await (await envoyerPhoto(cookie)).json();
  const r = await fetch(`${urlBase}/profil/photo`, { method: 'DELETE', headers: { Cookie: cookie } });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).utilisateur.photoUrl, null);
  assert.equal(await existeSurDisque(utilisateur.photoUrl), false);
});

test('la route photo exige une session', async () => {
  const r = await envoyerPhoto('');
  assert.equal(r.status, 401);
});
