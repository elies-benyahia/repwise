import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { demarrerServeurDeTest } from './outils.js';

const { appeler, arreter } = await demarrerServeurDeTest('repwise_test_mdp_oublie');
after(arreter);

// Sans RESEND_API_KEY (jamais définie en test), envoyerEmail() se contente d'un console.log
// contenant le lien complet — on le capture plutôt que de mocker le module, pour tester le vrai
// chemin bout en bout (génération du jeton, hachage, expiration) sans dépendance réseau.
async function demanderEtRecupererJeton(appelerFn, email) {
  const logs = [];
  const original = console.log;
  console.log = (msg) => logs.push(String(msg));
  let reponse;
  try {
    reponse = await appelerFn('/auth/mot-de-passe-oublie', { methode: 'POST', corps: { email } });
  } finally {
    console.log = original;
  }
  const trouve = logs.join('\n').match(/jeton=([\w-]+)/);
  return { reponse, jeton: trouve?.[1] ?? null };
}

test('mot de passe oublié → réinitialisation change le mot de passe et coupe les sessions ouvertes', async () => {
  const email = 'reset@exemple.fr';
  const inscription = await appeler('/auth/inscription', { methode: 'POST', corps: { email, motDePasse: 'ancien-mdp-123' } });
  assert.equal(inscription.statut, 201);
  const ancienneSession = inscription.cookie;

  const { reponse: demande, jeton } = await demanderEtRecupererJeton(appeler, email);
  assert.equal(demande.statut, 200);
  assert.ok(jeton, 'jeton de réinitialisation introuvable dans les logs');

  const reinit = await appeler('/auth/reinitialiser-mot-de-passe', {
    methode: 'POST', corps: { jeton, motDePasse: 'nouveau-mdp-456' },
  });
  assert.equal(reinit.statut, 200);

  assert.equal(
    (await appeler('/auth/connexion', { methode: 'POST', corps: { email, motDePasse: 'ancien-mdp-123' } })).statut,
    401,
  );
  assert.equal(
    (await appeler('/auth/connexion', { methode: 'POST', corps: { email, motDePasse: 'nouveau-mdp-456' } })).statut,
    200,
  );

  // Sécurité : une session ouverte AVANT la réinitialisation ne doit plus fonctionner après.
  const session = await appeler('/auth/session', { cookie: ancienneSession });
  assert.equal(session.corps.utilisateur, null);

  // Jeton à usage unique : le rejouer échoue.
  const rejoue = await appeler('/auth/reinitialiser-mot-de-passe', {
    methode: 'POST', corps: { jeton, motDePasse: 'encore-un-mdp-789' },
  });
  assert.equal(rejoue.statut, 400);
});

test("la demande répond pareil pour un email connu ou inconnu (pas d'énumération)", async () => {
  const connu = await appeler('/auth/mot-de-passe-oublie', { methode: 'POST', corps: { email: 'reset@exemple.fr' } });
  const inconnu = await appeler('/auth/mot-de-passe-oublie', { methode: 'POST', corps: { email: 'jamais-vu@exemple.fr' } });
  assert.equal(connu.statut, 200);
  assert.deepEqual(connu.corps, inconnu.corps);
});

test('un jeton invalide, un email mal formé ou un mot de passe trop court sont refusés', async () => {
  assert.equal((await appeler('/auth/mot-de-passe-oublie', { methode: 'POST', corps: { email: 'pas-un-email' } })).statut, 400);
  assert.equal(
    (await appeler('/auth/reinitialiser-mot-de-passe', { methode: 'POST', corps: { jeton: 'invente', motDePasse: 'quelconque-123' } })).statut,
    400,
  );
  const email = 'court@exemple.fr';
  await appeler('/auth/inscription', { methode: 'POST', corps: { email, motDePasse: 'un-mdp-valide-123' } });
  const { jeton } = await demanderEtRecupererJeton(appeler, email);
  assert.ok(jeton);
  assert.equal(
    (await appeler('/auth/reinitialiser-mot-de-passe', { methode: 'POST', corps: { jeton, motDePasse: 'court' } })).statut,
    400,
  );
});
