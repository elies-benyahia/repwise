import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { demarrerServeurDeTest } from './outils.js';

const { appeler, arreter } = await demarrerServeurDeTest('repwise_test_tableau');
after(arreter);

async function nouvelInvite() {
  return (await appeler('/auth/invite', { methode: 'POST' })).cookie;
}

const seance = (date, typeSeance, noms = ['Squat']) => ({
  date,
  typeSeance,
  exercices: noms.map((nomExercice) => ({ nomExercice, series: [{ repetitions: 5, poids: 100 }] })),
});

async function creerSeance(cookie, corps) {
  const r = await appeler('/seances', { methode: 'POST', corps, cookie });
  assert.equal(r.statut, 201, JSON.stringify(r.corps));
}

const tableau = async (cookie, aujourdhui = '2026-09-12') =>
  appeler(`/tableau-de-bord?aujourdhui=${aujourdhui}`, { cookie });

test('nouvel utilisateur : tableau de bord vide', async () => {
  const r = await tableau(await nouvelInvite());
  assert.equal(r.statut, 200);
  assert.deepEqual(r.corps, {
    nutrition: { consomme: { calories: 0, proteines: 0, glucides: 0, lipides: 0 }, objectif: null },
    derniereSeance: null,
    derniersJours: [],
    streak: { actuel: 0, record: 0, tolerance: 1 },
    rang: null,
    aTravailler: [],
  });
});

test('dernière séance, semaine en cours et streak', async () => {
  const cookie = await nouvelInvite();
  await creerSeance(cookie, seance('2026-09-05', 'legs'));
  await creerSeance(cookie, seance('2026-09-08', 'push'));
  await creerSeance(cookie, seance('2026-09-10', 'pull'));
  await creerSeance(cookie, seance('2026-09-11', 'legs', ['Squat', 'Presse', 'Mollets']));
  // 2 séances le même jour.
  await creerSeance(cookie, { ...seance('2026-09-11', 'personnalise'), typePersonnalise: 'Abdos' });
  const r = await tableau(cookie);

  // La plus récente : même jour, créée en dernier.
  assert.equal(r.corps.derniereSeance.date, '2026-09-11');
  assert.equal(r.corps.derniereSeance.typeSeance, 'personnalise');
  // 7 derniers jours : du 6 au 12 septembre (le 5 en est exclu).
  assert.deepEqual(r.corps.derniersJours, ['2026-09-08', '2026-09-10', '2026-09-11']);
  // Seul le groupe "quadriceps" (Squat, Presse…) a été travaillé : on suggère d'autres groupes.
  assert.equal(r.corps.aTravailler.length, 2);
  assert.ok(r.corps.aTravailler.every((g) => g.groupe !== 'quadriceps'));
  // 05 → 08 : deux jours de repos, la série repart ; 08 → 10 → 11 : 3 jours d'entraînement.
  assert.deepEqual(r.corps.streak, { actuel: 3, record: 3, tolerance: 1 });
});

test("« aujourd'hui » vient du client : les séances postérieures sont ignorées", async () => {
  const cookie = await nouvelInvite();
  await creerSeance(cookie, seance('2026-09-10', 'push', ['Développé couché', 'Dips']));
  await creerSeance(cookie, seance('2026-09-11', 'legs'));

  const r = await tableau(cookie, '2026-09-10');
  assert.equal(r.corps.derniereSeance.date, '2026-09-10');
  assert.deepEqual(r.corps.derniereSeance.exercices, ['Développé couché', 'Dips']);
  assert.equal(r.corps.streak.actuel, 1);
});

test('nutrition du jour : totaux et objectif', async () => {
  const cookie = await nouvelInvite();
  await appeler('/objectif', { methode: 'POST', cookie, corps: { calories: 2500, proteines: 150, glucides: 300, lipides: 70 } });
  for (const [calories, proteines] of [[650, 45.5], [120, 20]]) {
    await appeler('/journal', {
      methode: 'POST',
      cookie,
      corps: { date: '2026-09-12', repas: 'dejeuner', nomAliment: 'x', calories, proteines, glucides: 10, lipides: 2 },
    });
  }
  const r = await tableau(cookie);
  assert.deepEqual(r.corps.nutrition, {
    consomme: { calories: 770, proteines: 65.5, glucides: 20, lipides: 4 },
    objectif: { calories: 2500, proteines: 150, glucides: 300, lipides: 70 },
  });
});

test("les données d'un autre utilisateur ne comptent pas", async () => {
  const a = await nouvelInvite();
  await creerSeance(a, seance('2026-09-11', 'push'));
  const r = await tableau(await nouvelInvite());
  assert.equal(r.corps.derniereSeance, null);
  assert.equal(r.corps.streak.actuel, 0);
});

test('paramètre aujourdhui validé, session exigée', async () => {
  const cookie = await nouvelInvite();
  assert.equal((await appeler('/tableau-de-bord', { cookie })).statut, 400);
  assert.equal((await tableau(cookie, '2099-01-01')).statut, 400);
  assert.equal((await appeler('/tableau-de-bord?aujourdhui=2026-09-12')).statut, 401);
});
