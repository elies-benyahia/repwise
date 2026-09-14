import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { demarrerServeurDeTest } from './outils.js';

const { appeler, pool, arreter } = await demarrerServeurDeTest('repwise_test_invite');
after(arreter);

const { supprimerInvitesAbandonnes } = await import('../src/utilisateurs/modele.js');

// Date de naissance donnant un âge exact de `ans` années aujourd'hui (même jour, ans plus tôt).
function dateIlYA(ans) {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - ans);
  return d.toISOString().slice(0, 10);
}

const PROFIL = { pseudo: 'Léa', dateNaissance: dateIlYA(24), taille: 168, poids: 61.5, niveauExperience: 'intermediaire' };
const PROFIL_COMPLET = {
  email: null, estInvite: true, pseudo: 'Léa', dateNaissance: PROFIL.dateNaissance, age: 24, taille: 168, poids: 61.5,
  niveauExperience: 'intermediaire', sexe: null, niveauActivite: null, objectif: null, frequenceSeances: null,
  objectifDeclare: null, bio: null, photoUrl: null, profilPublic: false, role: 'utilisateur', rang: null,
};

async function nouvelInvite() {
  const r = await appeler('/auth/invite', { methode: 'POST' });
  assert.equal(r.statut, 201);
  return r;
}

test('continuer en invité ouvre une session sans email', async () => {
  const r = await nouvelInvite();
  assert.equal(r.corps.utilisateur.estInvite, true);
  assert.equal(r.corps.utilisateur.email, null);

  const session = await appeler('/auth/session', { cookie: r.cookie });
  assert.equal(session.corps.utilisateur.id, r.corps.utilisateur.id);

  // Un deuxième appel avec la même session ne crée pas un autre invité.
  const encore = await appeler('/auth/invite', { methode: 'POST', cookie: r.cookie });
  assert.equal(encore.statut, 200);
  assert.equal(encore.corps.utilisateur.id, r.corps.utilisateur.id);
});

test("le profil d'onboarding est enregistré et l'âge recalculé depuis la date de naissance", async () => {
  const { cookie } = await nouvelInvite();
  const r = await appeler('/profil', { methode: 'PATCH', corps: PROFIL, cookie });
  assert.equal(r.statut, 200);
  assert.deepEqual({ ...r.corps.utilisateur, id: undefined }, { id: undefined, ...PROFIL_COMPLET });

  const [[ligne]] = await pool.execute('SELECT date_naissance FROM utilisateurs WHERE id = ?', [
    r.corps.utilisateur.id,
  ]);
  assert.equal(ligne.date_naissance, PROFIL.dateNaissance);
});

test('le profil refuse les valeurs hors limites', async () => {
  const { cookie } = await nouvelInvite();
  const r = await appeler('/profil', {
    methode: 'PATCH',
    corps: { pseudo: '  ', dateNaissance: dateIlYA(5), taille: 180.5, poids: 500, niveauExperience: 'legende' },
    cookie,
  });
  assert.equal(r.statut, 400);
  assert.deepEqual(Object.keys(r.corps.champs).sort(), ['dateNaissance', 'niveauExperience', 'poids', 'pseudo', 'taille']);
});

test('le nombre de séances par semaine déduit automatiquement le niveau et l’activité', async () => {
  const { cookie } = await nouvelInvite();
  const debutant = await appeler('/profil', { methode: 'PATCH', cookie, corps: { frequenceSeances: 1 } });
  assert.equal(debutant.corps.utilisateur.niveauExperience, 'debutant');
  assert.equal(debutant.corps.utilisateur.niveauActivite, 'leger');

  const confirme = await appeler('/profil', { methode: 'PATCH', cookie, corps: { frequenceSeances: 6 } });
  assert.equal(confirme.corps.utilisateur.niveauExperience, 'confirme');
  assert.equal(confirme.corps.utilisateur.niveauActivite, 'actif');

  // Une valeur explicite de niveauExperience garde la main sur la déduction automatique.
  const force = await appeler('/profil', { methode: 'PATCH', cookie, corps: { frequenceSeances: 1, niveauExperience: 'confirme' } });
  assert.equal(force.corps.utilisateur.niveauExperience, 'confirme');
  assert.equal(force.corps.utilisateur.niveauActivite, 'leger');

  assert.equal((await appeler('/profil', { methode: 'PATCH', cookie, corps: { frequenceSeances: 15 } })).statut, 400);
});

test('objectif déclaré, bio et visibilité du profil', async () => {
  const { cookie } = await nouvelInvite();
  const r = await appeler('/profil', {
    methode: 'PATCH', cookie, corps: { objectifDeclare: 'cardio_marathon', bio: '  Je cours et je soulève.  ', profilPublic: true },
  });
  assert.equal(r.statut, 200);
  assert.equal(r.corps.utilisateur.objectifDeclare, 'cardio_marathon');
  assert.equal(r.corps.utilisateur.bio, 'Je cours et je soulève.');
  assert.equal(r.corps.utilisateur.profilPublic, true);

  const efface = await appeler('/profil', { methode: 'PATCH', cookie, corps: { bio: '' } });
  assert.equal(efface.corps.utilisateur.bio, null);

  const invalide = await appeler('/profil', { methode: 'PATCH', cookie, corps: { objectifDeclare: 'autre', bio: 'x'.repeat(281), profilPublic: 'oui' } });
  assert.equal(invalide.statut, 400);
  assert.deepEqual(Object.keys(invalide.corps.champs).sort(), ['bio', 'objectifDeclare', 'profilPublic']);
});

test('modifier le profil exige une session', async () => {
  const r = await appeler('/profil', { methode: 'PATCH', corps: PROFIL });
  assert.equal(r.statut, 401);
});

test("créer un compte depuis le mode invité garde le même utilisateur et change de jeton", async () => {
  const invite = await nouvelInvite();
  await appeler('/profil', { methode: 'PATCH', corps: PROFIL, cookie: invite.cookie });

  const r = await appeler('/auth/inscription', {
    methode: 'POST',
    corps: { email: 'lea.invite@exemple.fr', motDePasse: 'souleve-de-terre' },
    cookie: invite.cookie,
  });
  assert.equal(r.statut, 201);
  assert.equal(r.corps.utilisateur.id, invite.corps.utilisateur.id);
  assert.equal(r.corps.utilisateur.estInvite, false);
  assert.equal(r.corps.utilisateur.pseudo, PROFIL.pseudo);
  assert.notEqual(r.cookie, invite.cookie);

  assert.equal((await appeler('/auth/session', { cookie: invite.cookie })).corps.utilisateur, null);
  assert.equal((await appeler('/auth/session', { cookie: r.cookie })).corps.utilisateur.email, 'lea.invite@exemple.fr');

  const connexion = await appeler('/auth/connexion', {
    methode: 'POST',
    corps: { email: 'lea.invite@exemple.fr', motDePasse: 'souleve-de-terre' },
  });
  assert.equal(connexion.corps.utilisateur.id, invite.corps.utilisateur.id);
});

test('un compte déjà connecté ne peut pas se réinscrire', async () => {
  const compte = await appeler('/auth/inscription', {
    methode: 'POST',
    corps: { email: 'deja@exemple.fr', motDePasse: 'mot-de-passe' },
  });
  const r = await appeler('/auth/inscription', {
    methode: 'POST',
    corps: { email: 'autre@exemple.fr', motDePasse: 'mot-de-passe' },
    cookie: compte.cookie,
  });
  assert.equal(r.statut, 400);
});

test('se connecter depuis le mode invité ferme la session invité', async () => {
  await appeler('/auth/inscription', {
    methode: 'POST',
    corps: { email: 'max@exemple.fr', motDePasse: 'developpe-militaire' },
  });
  const invite = await nouvelInvite();
  const r = await appeler('/auth/connexion', {
    methode: 'POST',
    corps: { email: 'max@exemple.fr', motDePasse: 'developpe-militaire' },
    cookie: invite.cookie,
  });
  assert.equal(r.statut, 200);
  assert.equal(r.corps.utilisateur.email, 'max@exemple.fr');
  assert.equal((await appeler('/auth/session', { cookie: invite.cookie })).corps.utilisateur, null);
});

test('le nettoyage supprime seulement les invités sans session valide', async () => {
  const actif = await nouvelInvite();
  const abandonne = await nouvelInvite();
  await pool.execute(
    'UPDATE sessions SET date_expiration = NOW() - INTERVAL 1 DAY WHERE utilisateur_id = ?',
    [abandonne.corps.utilisateur.id],
  );

  await supprimerInvitesAbandonnes();

  const [lignes] = await pool.execute('SELECT id FROM utilisateurs WHERE id IN (?, ?)', [
    actif.corps.utilisateur.id,
    abandonne.corps.utilisateur.id,
  ]);
  assert.deepEqual(lignes.map((l) => l.id), [actif.corps.utilisateur.id]);

  // Les comptes (non invités) ne sont jamais concernés, même sans session.
  const [[{ comptes }]] = await pool.execute('SELECT COUNT(*) AS comptes FROM utilisateurs WHERE NOT est_invite');
  assert.ok(comptes >= 2);
});
