import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { demarrerServeurDeTest } from './outils.js';

const { appeler, pool, urlBase, arreter } = await demarrerServeurDeTest('repwise_test_auth');
after(arreter);

const IDENTIFIANTS = { email: 'lea@exemple.fr', motDePasse: 'squat-140kg' };

test("l'inscription crée le compte et ouvre une session", async () => {
  const r = await appeler('/auth/inscription', { methode: 'POST', corps: IDENTIFIANTS });
  assert.equal(r.statut, 201);
  assert.equal(r.corps.utilisateur.email, IDENTIFIANTS.email);
  assert.match(r.setCookie, /HttpOnly/);
  assert.match(r.setCookie, /SameSite=Lax/);

  const session = await appeler('/auth/session', { cookie: r.cookie });
  assert.equal(session.corps.utilisateur.email, IDENTIFIANTS.email);

  const [[ligne]] = await pool.execute('SELECT mot_de_passe_hash FROM utilisateurs WHERE email = ?', [
    IDENTIFIANTS.email,
  ]);
  assert.match(ligne.mot_de_passe_hash, /^scrypt\$/);
  assert.ok(!ligne.mot_de_passe_hash.includes(IDENTIFIANTS.motDePasse));
});

test("un email déjà utilisé est refusé, quelle que soit la casse", async () => {
  const r = await appeler('/auth/inscription', {
    methode: 'POST',
    corps: { ...IDENTIFIANTS, email: '  Lea@Exemple.FR ' },
  });
  assert.equal(r.statut, 409);
  assert.ok(r.corps.champs.email);
});

test("l'inscription valide l'email et la longueur du mot de passe", async () => {
  const r = await appeler('/auth/inscription', {
    methode: 'POST',
    corps: { email: 'pas-un-email', motDePasse: 'court' },
  });
  assert.equal(r.statut, 400);
  assert.deepEqual(Object.keys(r.corps.champs).sort(), ['email', 'motDePasse']);
});

test('la connexion refuse un mauvais mot de passe avec le même message qu’un email inconnu', async () => {
  const mauvais = await appeler('/auth/connexion', {
    methode: 'POST',
    corps: { ...IDENTIFIANTS, motDePasse: 'mauvais-mdp' },
  });
  const inconnu = await appeler('/auth/connexion', {
    methode: 'POST',
    corps: { email: 'inconnu@exemple.fr', motDePasse: 'peu-importe' },
  });
  assert.equal(mauvais.statut, 401);
  assert.equal(inconnu.statut, 401);
  assert.equal(mauvais.corps.erreur, inconnu.corps.erreur);
  assert.equal(mauvais.setCookie, undefined);
});

test('connexion puis déconnexion : le jeton ne fonctionne plus ensuite', async () => {
  const connexion = await appeler('/auth/connexion', { methode: 'POST', corps: IDENTIFIANTS });
  assert.equal(connexion.statut, 200);
  assert.equal(connexion.corps.utilisateur.email, IDENTIFIANTS.email);

  const deconnexion = await appeler('/auth/deconnexion', { methode: 'POST', cookie: connexion.cookie });
  assert.equal(deconnexion.statut, 204);

  const session = await appeler('/auth/session', { cookie: connexion.cookie });
  assert.equal(session.corps.utilisateur, null);
});

test('sans cookie ou avec un jeton inventé, pas de session', async () => {
  assert.equal((await appeler('/auth/session')).corps.utilisateur, null);

  const r = await appeler('/auth/session', { cookie: 'session=jeton-invente' });
  assert.equal(r.corps.utilisateur, null);
  assert.match(r.setCookie, /session=;/); // le cookie invalide est effacé
});

test('seule l’empreinte du jeton est stockée en base', async () => {
  const r = await appeler('/auth/connexion', { methode: 'POST', corps: IDENTIFIANTS });
  const jeton = decodeURIComponent(r.cookie.split('=')[1]);
  const [lignes] = await pool.execute('SELECT id FROM sessions WHERE id = ?', [jeton]);
  assert.equal(lignes.length, 0);
});

test('un corps JSON mal formé renvoie 400', async () => {
  const reponse = await fetch(`${urlBase}/auth/connexion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{pas du json',
  });
  assert.equal(reponse.status, 400);
});
