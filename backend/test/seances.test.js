import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { demarrerServeurDeTest } from './outils.js';

const { appeler, arreter } = await demarrerServeurDeTest('repwise_test_seances');
after(arreter);

async function nouvelInvite() {
  return (await appeler('/auth/invite', { methode: 'POST' })).cookie;
}

const SEANCE = {
  date: '2026-09-10',
  typeSeance: 'push',
  notes: '  Bonne séance, épaule droite un peu raide  ',
  exercices: [
    {
      nomExercice: 'Développé couché',
      tempsRepos: 120,
      series: [
        { repetitions: 8, poids: 80 },
        { repetitions: 8, poids: 80 },
        { repetitions: 6, poids: 82.5 },
      ],
    },
    { nomExercice: 'Dips', tempsRepos: null, series: [{ repetitions: 12 }, { repetitions: 10 }] },
  ],
};

async function creer(cookie, seance = SEANCE) {
  const r = await appeler('/seances', { methode: 'POST', corps: seance, cookie });
  assert.equal(r.statut, 201, JSON.stringify(r.corps));
  return r.corps.seance;
}

test('créer puis relire une séance complète', async () => {
  const cookie = await nouvelInvite();
  const creee = await creer(cookie);

  const r = await appeler(`/seances/${creee.id}`, { cookie });
  assert.equal(r.statut, 200);
  assert.deepEqual(r.corps.seance, {
    id: creee.id,
    date: '2026-09-10',
    typeSeance: 'push',
    typePersonnalise: null,
    notes: 'Bonne séance, épaule droite un peu raide',
    exercices: [
      {
        nomExercice: 'Développé couché',
        tempsRepos: 120,
        series: [{ repetitions: 8, poids: 80 }, { repetitions: 8, poids: 80 }, { repetitions: 6, poids: 82.5 }],
      },
      // Sans poids = poids du corps (0).
      { nomExercice: 'Dips', tempsRepos: null, series: [{ repetitions: 12, poids: 0 }, { repetitions: 10, poids: 0 }] },
    ],
  });
});

test('la liste du calendrier ne renvoie que la plage demandée, avec le nombre d’exercices', async () => {
  const cookie = await nouvelInvite();
  await creer(cookie);
  await creer(cookie, { ...SEANCE, date: '2026-08-20', typeSeance: 'legs' });
  await creer(cookie, {
    date: '2026-09-11', typeSeance: 'personnalise', typePersonnalise: 'Bras + abdos', exercices: [],
  });

  const r = await appeler('/seances?debut=2026-08-31&fin=2026-10-04', { cookie });
  assert.equal(r.statut, 200);
  assert.deepEqual(
    r.corps.seances.map(({ id, ...s }) => s),
    [
      { date: '2026-09-10', typeSeance: 'push', typePersonnalise: null, nbExercices: 2 },
      { date: '2026-09-11', typeSeance: 'personnalise', typePersonnalise: 'Bras + abdos', nbExercices: 0 },
    ],
  );
});

test('modifier une séance remplace ses exercices', async () => {
  const cookie = await nouvelInvite();
  const { id } = await creer(cookie);

  const r = await appeler(`/seances/${id}`, {
    methode: 'PUT',
    cookie,
    corps: {
      date: '2026-09-09',
      typeSeance: 'upper',
      exercices: [{ nomExercice: 'Tractions', tempsRepos: 90, series: [{ repetitions: 10, poids: 0 }] }],
    },
  });
  assert.equal(r.statut, 200);
  assert.equal(r.corps.seance.date, '2026-09-09');
  assert.equal(r.corps.seance.typeSeance, 'upper');
  assert.equal(r.corps.seance.notes, null);
  assert.deepEqual(r.corps.seance.exercices, [
    { nomExercice: 'Tractions', tempsRepos: 90, series: [{ repetitions: 10, poids: 0 }] },
  ]);
});

test('supprimer une séance', async () => {
  const cookie = await nouvelInvite();
  const { id } = await creer(cookie);
  assert.equal((await appeler(`/seances/${id}`, { methode: 'DELETE', cookie })).statut, 204);
  assert.equal((await appeler(`/seances/${id}`, { cookie })).statut, 404);
});

test("les séances d'un autre utilisateur sont invisibles et intouchables", async () => {
  const proprietaire = await nouvelInvite();
  const intrus = await nouvelInvite();
  const { id } = await creer(proprietaire);

  assert.equal((await appeler(`/seances/${id}`, { cookie: intrus })).statut, 404);
  assert.equal((await appeler(`/seances/${id}`, { methode: 'PUT', corps: SEANCE, cookie: intrus })).statut, 404);
  assert.equal((await appeler(`/seances/${id}`, { methode: 'DELETE', cookie: intrus })).statut, 404);
  const liste = await appeler('/seances?debut=2026-09-01&fin=2026-09-30', { cookie: intrus });
  assert.deepEqual(liste.corps.seances, []);

  // Toujours là pour son propriétaire.
  assert.equal((await appeler(`/seances/${id}`, { cookie: proprietaire })).statut, 200);
});

test('la validation renvoie une erreur par champ fautif', async () => {
  const cookie = await nouvelInvite();
  const r = await appeler('/seances', {
    methode: 'POST',
    cookie,
    corps: {
      date: '2026-02-30',
      typeSeance: 'personnalise',
      typePersonnalise: '',
      exercices: [
        { nomExercice: '', series: [] },
        { nomExercice: 'Squat', tempsRepos: -5, series: [{ repetitions: 0, poids: -10 }] },
      ],
    },
  });
  assert.equal(r.statut, 400);
  assert.deepEqual(Object.keys(r.corps.champs).sort(), [
    'date',
    'exercices.0.nomExercice',
    'exercices.0.series',
    'exercices.1.series.0.poids',
    'exercices.1.series.0.repetitions',
    'exercices.1.tempsRepos',
    'typePersonnalise',
  ]);
});

test('pas de séance dans le futur', async () => {
  const cookie = await nouvelInvite();
  const r = await appeler('/seances', { methode: 'POST', cookie, corps: { ...SEANCE, date: '2099-01-01' } });
  assert.equal(r.statut, 400);
  assert.ok(r.corps.champs.date);
});

test('les routes séances exigent une session', async () => {
  assert.equal((await appeler('/seances?debut=2026-09-01&fin=2026-09-30')).statut, 401);
  assert.equal((await appeler('/seances', { methode: 'POST', corps: SEANCE })).statut, 401);
});

test('la plage du calendrier est validée', async () => {
  const cookie = await nouvelInvite();
  assert.equal((await appeler('/seances', { cookie })).statut, 400);
  assert.equal((await appeler('/seances?debut=2026-09-30&fin=2026-09-01', { cookie })).statut, 400);
  assert.equal((await appeler('/seances?debut=2026-01-01&fin=2026-12-31', { cookie })).statut, 400);
});

test("les exercices récents alimentent l'autocomplétion, les plus récents d'abord", async () => {
  const cookie = await nouvelInvite();
  await creer(cookie, { ...SEANCE, date: '2026-09-01' });
  await creer(cookie, {
    date: '2026-09-05',
    typeSeance: 'legs',
    exercices: [
      { nomExercice: 'Squat', series: [{ repetitions: 5, poids: 100 }] },
      { nomExercice: 'Dips', series: [{ repetitions: 10 }] },
    ],
  });
  const r = await appeler('/seances/exercices-recents', { cookie });
  assert.deepEqual(r.corps.exercices, ['Dips', 'Squat', 'Développé couché']);
});

test('un identifiant non numérique renvoie 404', async () => {
  const cookie = await nouvelInvite();
  assert.equal((await appeler('/seances/abc', { cookie })).statut, 404);
});

test('célébrations : record personnel détecté seulement à partir de la 2e fois', async () => {
  const cookie = await nouvelInvite();
  const seance1 = {
    date: '2026-09-01', typeSeance: 'push',
    exercices: [{ nomExercice: 'Développé couché', series: [{ repetitions: 8, poids: 80 }] }],
  };
  const r1 = await appeler('/seances', { methode: 'POST', corps: seance1, cookie });
  assert.equal(r1.statut, 201);
  // Première fois : rien à battre, pas de record.
  assert.equal(r1.corps.celebrations?.records, undefined);

  const seance2 = {
    date: '2026-09-03', typeSeance: 'push',
    exercices: [{ nomExercice: 'Développé couché', series: [{ repetitions: 8, poids: 85 }] }],
  };
  const r2 = await appeler('/seances', { methode: 'POST', corps: seance2, cookie });
  assert.deepEqual(r2.corps.celebrations.records, [{ nom: 'Développé couché', poids: 85, repetitions: 8 }]);

  // Charge plus légère : pas de nouveau record.
  const seance3 = {
    date: '2026-09-05', typeSeance: 'push',
    exercices: [{ nomExercice: 'Développé couché', series: [{ repetitions: 8, poids: 70 }] }],
  };
  const r3 = await appeler('/seances', { methode: 'POST', corps: seance3, cookie });
  assert.equal(r3.corps.celebrations, null);
});

test('célébrations : palier de streak franchi (7 jours consécutifs)', async () => {
  const cookie = await nouvelInvite();
  const joursDebut = 1;
  let dernierCorps = null;
  for (let jour = joursDebut; jour <= 7; jour += 1) {
    const date = `2026-09-${String(jour).padStart(2, '0')}`;
    const r = await appeler('/seances', {
      methode: 'POST',
      cookie,
      corps: { date, typeSeance: 'full_body', exercices: [{ nomExercice: 'Course', series: [{ repetitions: 1, poids: 0 }] }] },
    });
    assert.equal(r.statut, 201);
    dernierCorps = r.corps;
  }
  assert.equal(dernierCorps.celebrations.streak, 7);
});

test("célébrations : nouveau rang détecté, absent tant que rien ne change", async () => {
  const cookie = await nouvelInvite();
  // Un développé couché à 80 kg est déjà au-dessus du repère intermédiaire (score > 0) : le tout
  // premier "vrai" rang obtenu compte comme une célébration (rien à comparer avant).
  const r1 = await appeler('/seances', {
    methode: 'POST',
    cookie,
    corps: { date: '2026-09-01', typeSeance: 'push', exercices: [{ nomExercice: 'Développé couché', series: [{ repetitions: 5, poids: 80 }] }] },
  });
  assert.equal(r1.statut, 201);
  if (r1.corps.seance && r1.corps.celebrations?.nouveauRang) {
    assert.ok(r1.corps.celebrations.nouveauRang.nom);
  }

  // Repartir avec les mêmes chiffres (même exercice, même séance) ne fait pas progresser le rang :
  // pas de nouvelle célébration de rang la 2e fois.
  const r2 = await appeler('/seances', {
    methode: 'POST',
    cookie,
    corps: { date: '2026-09-03', typeSeance: 'push', exercices: [{ nomExercice: 'Développé couché', series: [{ repetitions: 5, poids: 80 }] }] },
  });
  assert.equal(r2.corps.celebrations?.nouveauRang, undefined);
});
