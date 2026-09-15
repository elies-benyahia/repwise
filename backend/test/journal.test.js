import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { demarrerServeurDeTest } from './outils.js';

const { appeler, pool, arreter } = await demarrerServeurDeTest('repwise_test_journal');
after(arreter);

async function nouvelInvite() {
  const r = await appeler('/auth/invite', { methode: 'POST' });
  return { cookie: r.cookie, id: r.corps.utilisateur.id };
}

const POULET = {
  date: '2026-09-10', repas: 'dejeuner', nomAliment: 'Poulet riz', calories: 650, proteines: 45, glucides: 80.25, lipides: 12,
};

async function ajouter(cookie, entree = POULET) {
  const r = await appeler('/journal', { methode: 'POST', corps: entree, cookie });
  assert.equal(r.statut, 201, JSON.stringify(r.corps));
  return r.corps.entree;
}

test('ajouter des aliments puis relire la journée', async () => {
  const { cookie } = await nouvelInvite();
  const entree = await ajouter(cookie);
  assert.equal(entree.glucides, 80.3); // arrondi au dixième
  await ajouter(cookie, { ...POULET, repas: 'collation', nomAliment: 'Skyr', calories: 120, proteines: 20, glucides: 8, lipides: 0 });
  await ajouter(cookie, { ...POULET, date: '2026-09-09' });

  const r = await appeler('/journal/2026-09-10', { cookie });
  assert.equal(r.statut, 200);
  assert.deepEqual(r.corps.entrees.map((e) => [e.repas, e.nomAliment, e.calories]), [
    ['dejeuner', 'Poulet riz', 650],
    ['collation', 'Skyr', 120],
  ]);
  assert.equal(r.corps.objectif, null);
});

test('un aliment venu de la recherche (code-barres, image, quantité, sucre) est conservé tel quel', async () => {
  const { cookie } = await nouvelInvite();
  const entree = await ajouter(cookie, {
    ...POULET,
    nomAliment: 'Yaourt nature',
    codeBarres: '3760020509821',
    imageUrl: 'https://images.openfoodfacts.org/exemple.jpg',
    quantite: 125,
    sucre: 4.5,
  });
  assert.equal(entree.codeBarres, '3760020509821');
  assert.equal(entree.imageUrl, 'https://images.openfoodfacts.org/exemple.jpg');
  assert.equal(entree.quantite, 125);
  assert.equal(entree.sucre, 4.5);

  // Sans ces champs (test manuel/anciens clients) : valeurs par défaut sûres, jamais d'erreur.
  const minimal = await ajouter(cookie, { ...POULET, nomAliment: 'Sans code-barres' });
  assert.equal(minimal.codeBarres, null);
  assert.equal(minimal.imageUrl, null);
  assert.equal(minimal.quantite, 100);
  assert.equal(minimal.sucre, 0);
});

test("l'objectif enregistré s'applique au journal et complète le profil", async () => {
  const { cookie } = await nouvelInvite();
  const r = await appeler('/objectif', {
    methode: 'POST',
    cookie,
    corps: { calories: 2800, proteines: 150, glucides: 350, lipides: 78, sexe: 'femme', niveauActivite: 'actif', objectif: 'prise_de_masse' },
  });
  assert.equal(r.statut, 201);
  assert.equal(r.corps.utilisateur.sexe, 'femme');
  assert.equal(r.corps.utilisateur.niveauActivite, 'actif');
  assert.equal(r.corps.utilisateur.objectif, 'prise_de_masse');

  const journal = await appeler('/journal/2099-01-01', { cookie });
  assert.deepEqual(journal.corps.objectif, { calories: 2800, proteines: 150, glucides: 350, lipides: 78 });
});

test("le journal utilise l'objectif en vigueur à la date consultée", async () => {
  const { cookie, id } = await nouvelInvite();
  const inserer = (date, calories) => pool.execute(
    `INSERT INTO objectifs_caloriques (utilisateur_id, date_calcul, calories_cibles, proteines_cibles, glucides_cibles, lipides_cibles)
     VALUES (?, ?, ?, 150, 300, 70)`,
    [id, date, calories],
  );
  await inserer('2026-08-01 10:00:00', 2500);
  await inserer('2026-09-01 10:00:00', 2200);

  const calories = async (date) => (await appeler(`/journal/${date}`, { cookie })).corps.objectif.calories;
  assert.equal(await calories('2026-08-15'), 2500);
  assert.equal(await calories('2026-09-01'), 2200);
  assert.equal(await calories('2026-09-20'), 2200);
  // Avant le tout premier objectif : on affiche ce premier objectif plutôt que rien.
  assert.equal(await calories('2026-07-01'), 2500);
});

test('supprimer un aliment, seulement le sien', async () => {
  const proprietaire = await nouvelInvite();
  const intrus = await nouvelInvite();
  const { id } = await ajouter(proprietaire.cookie);

  assert.equal((await appeler(`/journal/entrees/${id}`, { methode: 'DELETE', cookie: intrus.cookie })).statut, 404);
  assert.equal((await appeler(`/journal/entrees/${id}`, { methode: 'DELETE', cookie: proprietaire.cookie })).statut, 204);
  assert.deepEqual((await appeler('/journal/2026-09-10', { cookie: proprietaire.cookie })).corps.entrees, []);
});

test('modifier la quantité (et le repas) recalcule les macros', async () => {
  const { cookie } = await nouvelInvite();
  const { id } = await ajouter(cookie); // 650 kcal / 45 p / 80.3 g / 12 l pour 100 g (par défaut)

  const r = await appeler(`/journal/entrees/${id}`, {
    methode: 'PATCH',
    cookie,
    corps: { repas: 'collation', quantite: 200, calories: 1300, proteines: 90, glucides: 160.6, lipides: 24, sucre: 0 },
  });
  assert.equal(r.statut, 200);
  assert.equal(r.corps.entree.repas, 'collation');
  assert.equal(r.corps.entree.quantite, 200);
  assert.equal(r.corps.entree.calories, 1300);
  assert.equal(r.corps.entree.proteines, 90);

  const journal = await appeler('/journal/2026-09-10', { cookie });
  assert.deepEqual(journal.corps.entrees.map((e) => [e.repas, e.calories]), [['collation', 1300]]);
});

test('modifier un aliment, seulement le sien, et seulement s\'il existe', async () => {
  const proprietaire = await nouvelInvite();
  const intrus = await nouvelInvite();
  const { id } = await ajouter(proprietaire.cookie);
  const corps = { repas: 'diner', quantite: 150, calories: 500, proteines: 30, glucides: 50, lipides: 10, sucre: 0 };

  assert.equal((await appeler(`/journal/entrees/${id}`, { methode: 'PATCH', cookie: intrus.cookie, corps })).statut, 404);
  assert.equal((await appeler('/journal/entrees/999999', { methode: 'PATCH', cookie: proprietaire.cookie, corps })).statut, 404);
  assert.equal((await appeler(`/journal/entrees/${id}`, { methode: 'PATCH', cookie: proprietaire.cookie, corps })).statut, 200);
});

test('validation de la modification (quantité et repas notamment)', async () => {
  const { cookie } = await nouvelInvite();
  const { id } = await ajouter(cookie);

  const r = await appeler(`/journal/entrees/${id}`, {
    methode: 'PATCH',
    cookie,
    corps: { repas: 'brunch', quantite: 0, calories: 650, proteines: 45, glucides: 80, lipides: 12 },
  });
  assert.equal(r.statut, 400);
  assert.deepEqual(Object.keys(r.corps.champs).sort(), ['quantite', 'repas']);
});

test("les aliments d'un autre utilisateur n'apparaissent pas", async () => {
  const a = await nouvelInvite();
  const b = await nouvelInvite();
  await ajouter(a.cookie);
  assert.deepEqual((await appeler('/journal/2026-09-10', { cookie: b.cookie })).corps.entrees, []);
  assert.deepEqual((await appeler('/journal/aliments-recents', { cookie: b.cookie })).corps.aliments, []);
});

test('aliments récents : un par nom, avec les dernières valeurs saisies', async () => {
  const { cookie } = await nouvelInvite();
  await ajouter(cookie, { ...POULET, calories: 600 });
  await ajouter(cookie, { ...POULET, nomAliment: 'Banane', calories: 90, proteines: 1, glucides: 23, lipides: 0 });
  await ajouter(cookie, { ...POULET, calories: 700 });

  const r = await appeler('/journal/aliments-recents', { cookie });
  assert.deepEqual(r.corps.aliments.map((a) => [a.nomAliment, a.calories]), [['Poulet riz', 700], ['Banane', 90]]);
});

test('validation des aliments et des objectifs', async () => {
  const { cookie } = await nouvelInvite();
  const aliment = await appeler('/journal', {
    methode: 'POST',
    cookie,
    corps: { date: '2099-01-01', repas: 'brunch', nomAliment: ' ', calories: 12.5, proteines: -1, glucides: 600 },
  });
  assert.equal(aliment.statut, 400);
  assert.deepEqual(Object.keys(aliment.corps.champs).sort(), ['calories', 'date', 'glucides', 'nomAliment', 'proteines', 'repas']);

  const objectif = await appeler('/objectif', {
    methode: 'POST', cookie, corps: { calories: 300, proteines: 150, glucides: 200, lipides: 60, sexe: 'autre' },
  });
  assert.equal(objectif.statut, 400);
  assert.deepEqual(Object.keys(objectif.corps.champs).sort(), ['calories', 'sexe']);

  assert.equal((await appeler('/journal/2026-13-01', { cookie })).statut, 400);
});

test('le journal exige une session', async () => {
  assert.equal((await appeler('/journal/2026-09-10')).statut, 401);
  assert.equal((await appeler('/objectif', { methode: 'POST', corps: {} })).statut, 401);
  assert.equal((await appeler('/journal/entrees/1', { methode: 'PATCH', corps: {} })).statut, 401);
});
