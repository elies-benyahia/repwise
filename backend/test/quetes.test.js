import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { demarrerServeurDeTest } from './outils.js';

const { appeler, arreter } = await demarrerServeurDeTest('repwise_test_quetes');
after(arreter);

const ilYA = (jours) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - jours);
  return d.toISOString().slice(0, 10);
};

function dateIlYAAns(ans) {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - ans);
  return d.toISOString().slice(0, 10);
}

async function nouvelUtilisateur({ poids = 80 } = {}) {
  const r = await appeler('/auth/invite', { methode: 'POST' });
  await appeler('/profil', {
    methode: 'PATCH', cookie: r.cookie,
    corps: { pseudo: 'Léa', dateNaissance: dateIlYAAns(25), taille: 180, poids, niveauExperience: 'confirme' },
  });
  return r.cookie;
}

const seance = (date, exercices) => ({
  date,
  typeSeance: 'full_body',
  exercices: exercices.map(([nomExercice, series]) => ({
    nomExercice, series: series.map(([repetitions, poids]) => ({ repetitions, poids })),
  })),
});

async function logger(cookie, date, exercices) {
  const r = await appeler('/seances', { methode: 'POST', cookie, corps: seance(date, exercices) });
  assert.equal(r.statut, 201, JSON.stringify(r.corps));
  return r.corps.seance;
}

test('les 3 quêtes quotidiennes et la quête hebdomadaire se génèrent, incomplètes au départ', async () => {
  const cookie = await nouvelUtilisateur();
  const r = await appeler('/quetes', { cookie });
  assert.equal(r.statut, 200);
  assert.equal(r.corps.quotidiennes.length, 3);
  assert.ok(r.corps.quotidiennes.every((q) => q.complete === false));
  assert.equal(r.corps.hebdomadaire.complete, false);

  // Un second appel réutilise les mêmes instances (mêmes id) plutôt que d'en recréer.
  const encore = await appeler('/quetes', { cookie });
  assert.deepEqual(encore.corps.quotidiennes.map((q) => q.id), r.corps.quotidiennes.map((q) => q.id));
});

test('logger une séance aujourd’hui complète la quête du jour et bonifie le rang', async () => {
  const cookie = await nouvelUtilisateur({ poids: 80 });
  // Score de base = 1 (repère intermédiaire pile atteint sur 4 groupes).
  await logger(cookie, ilYA(0), [
    ['Développé couché', [[1, 80]]],
    ['Squat', [[1, 108]]],
    ['Soulevé de terre', [[1, 132]]],
    ['Rowing barre', [[1, 72]]],
  ]);
  const avant = (await appeler('/rang', { cookie })).corps.rang;
  assert.equal(avant.score, 1);
  assert.equal(avant.bonusPoints, 0);

  const quetes = await appeler('/quetes', { cookie });
  const seanceQuete = quetes.corps.quotidiennes.find((q) => q.description.startsWith('Logger une séance'));
  assert.equal(seanceQuete.complete, true);
  // Selon le jour, la quête "groupe musculaire du jour" (qui tourne sur 14 groupes) peut aussi
  // être réussie par les mêmes exercices — le bonus attendu est donc la somme des quêtes
  // réellement complètes, pas une valeur figée.
  const bonusAttendu = quetes.corps.quotidiennes.filter((q) => q.complete).reduce((s, q) => s + q.points, 0);
  assert.ok(bonusAttendu >= 5);

  const apres = (await appeler('/rang', { cookie })).corps.rang;
  assert.equal(apres.bonusPoints, bonusAttendu);
  // scoreBrut inchangé (même perf), le score public (avec bonus) est légèrement plus haut.
  assert.equal(apres.scoreBrut, 1);
  assert.ok(apres.score > avant.score);

  // Les quêtes restent marquées réussies même interrogées à nouveau (pas de double comptage).
  const uneTroisiemeFois = (await appeler('/rang', { cookie })).corps.rang;
  assert.equal(uneTroisiemeFois.bonusPoints, bonusAttendu);
});

test('sans exercice de référence loggé, les quêtes ne suffisent pas à sortir de "Non classé"', async () => {
  // Poids non renseigné à l'inscription : calculerScore renvoie toujours null, quel que soit le
  // nombre de quêtes réussies (cahier : les points "s'ajoutent au score de performance", ils ne
  // le remplacent pas).
  const r = await appeler('/auth/invite', { methode: 'POST' });
  await appeler('/profil', {
    methode: 'PATCH', cookie: r.cookie, corps: { pseudo: 'Sans poids', dateNaissance: dateIlYAAns(25), taille: 180 },
  });
  await logger(r.cookie, ilYA(0), [['Développé couché', [[1, 80]]]]);
  await appeler('/quetes', { cookie: r.cookie });
  const rang = (await appeler('/rang', { cookie: r.cookie })).corps.rang;
  assert.equal(rang, null);
});
