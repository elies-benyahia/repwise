import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { demarrerServeurDeTest } from './outils.js';

const { appeler, arreter } = await demarrerServeurDeTest('repwise_test_aliments');
after(arreter);

async function nouvelInvite() {
  const r = await appeler('/auth/invite', { methode: 'POST' });
  return { cookie: r.cookie };
}

// La recherche fusionne bibliotheque_aliments (local, instantané) et Open Food Facts (réseau,
// non mocké ici) : on ne vérifie que la partie locale, qui doit marcher même si OFF est lent ou
// indisponible (rechercherOFF se replie sur un tableau vide plutôt que de faire échouer la route).
test('la recherche trouve un aliment courant dans la bibliothèque locale, sans dépendre du réseau', async () => {
  const { cookie } = await nouvelInvite();
  const r = await appeler('/aliments/recherche?q=poulet', { cookie });
  assert.equal(r.statut, 200);
  const local = r.corps.aliments.find((a) => a.nom === 'Blanc de poulet');
  assert.ok(local, `"Blanc de poulet" absent des résultats : ${JSON.stringify(r.corps.aliments)}`);
  assert.equal(local.codeBarres, null);
  assert.equal(local.pour100g.calories, 165);
  assert.equal(local.pour100g.proteines, 31);
});

test('recherche insensible à la casse et aux accents courants', async () => {
  const { cookie } = await nouvelInvite();
  const r = await appeler('/aliments/recherche?q=BANANE', { cookie });
  assert.equal(r.statut, 200);
  assert.ok(r.corps.aliments.some((a) => a.nom === 'Banane'));
});

test('la recherche exige une session et un terme suffisant', async () => {
  assert.equal((await appeler('/aliments/recherche?q=riz')).statut, 401);
  const { cookie } = await nouvelInvite();
  assert.equal((await appeler('/aliments/recherche?q=a', { cookie })).statut, 400);
});
