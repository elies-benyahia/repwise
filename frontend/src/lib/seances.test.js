import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ajouterExerciceNomme, appliquerProgramme, depuisApi, exerciceVide, nouvelleSeance, preparerSeance, serieSuivante,
} from './seances.js';

test("ajouter un exercice depuis la carte du corps remplace l'exercice vide d'une nouvelle séance", () => {
  const { etat, cle } = ajouterExerciceNomme(nouvelleSeance('2026-09-12'), 'Squat');
  assert.deepEqual(etat.exercices.map((e) => e.nomExercice), ['Squat']);
  assert.equal(etat.exercices[0].cle, cle);

  const { etat: suite } = ajouterExerciceNomme(etat, 'Presse à cuisses');
  assert.deepEqual(suite.exercices.map((e) => e.nomExercice), ['Squat', 'Presse à cuisses']);
});

test('lancer une séance depuis un programme pré-remplit séries et répétitions cibles', () => {
  const etat = appliquerProgramme(nouvelleSeance('2026-09-12'), {
    nom: 'Push A',
    exercices: [
      { nom: 'Développé couché', seriesCibles: 3, repetitionsCibles: 8, poidsCible: 82.5 },
      { nom: 'Dips', seriesCibles: 2, repetitionsCibles: 12, poidsCible: null },
    ],
  });
  assert.equal(etat.typeSeance, 'personnalise');
  assert.equal(etat.typePersonnalise, 'Push A');
  assert.deepEqual(
    etat.exercices.map((e) => [e.nomExercice, e.series.map((s) => `${s.repetitions}x${s.poids}`)]),
    [['Développé couché', ['8x82,5', '8x82,5', '8x82,5']], ['Dips', ['12x', '12x']]],
  );
  const { erreurs } = preparerSeance(etat);
  assert.deepEqual(erreurs, {});
});

const serie = (repetitions, poids = '') => ({ cle: Math.random(), repetitions, poids });
const exercice = (nomExercice, series, tempsRepos = '') => ({ cle: Math.random(), nomExercice, tempsRepos, series });

test('une séance correcte devient le corps attendu par l’API', () => {
  const { erreurs, corps } = preparerSeance({
    date: '2026-09-10',
    typeSeance: 'push',
    typePersonnalise: 'ignoré',
    notes: '  RAS  ',
    exercices: [
      exercice('  Développé couché ', [serie('8', '80'), serie('6', '82,5')], '120'),
      exercice('Dips', [serie('12')]),
    ],
  });
  assert.deepEqual(erreurs, {});
  assert.deepEqual(corps, {
    date: '2026-09-10',
    typeSeance: 'push',
    typePersonnalise: null,
    notes: 'RAS',
    exercices: [
      { nomExercice: 'Développé couché', tempsRepos: 120, series: [{ repetitions: 8, poids: 80 }, { repetitions: 6, poids: 82.5 }] },
      { nomExercice: 'Dips', tempsRepos: null, series: [{ repetitions: 12, poids: 0 }] },
    ],
  });
});

test('les exercices et séries laissés vides sont ignorés', () => {
  const { erreurs, corps } = preparerSeance({
    ...nouvelleSeance('2026-09-10'),
    typeSeance: 'legs',
    exercices: [exercice('Squat', [serie('5', '100'), serie('', '')]), exerciceVide()],
  });
  assert.deepEqual(erreurs, {});
  assert.equal(corps.exercices.length, 1);
  assert.equal(corps.exercices[0].series.length, 1);
});

test('les erreurs pointent vers les index affichés', () => {
  const { erreurs } = preparerSeance({
    date: '2099-01-01',
    typeSeance: 'personnalise',
    typePersonnalise: ' ',
    notes: '',
    exercices: [
      exerciceVide(),
      exercice('', [serie('0', '-5')], '90s'),
      exercice('Curl', [serie('', '')]),
    ],
  });
  assert.deepEqual(Object.keys(erreurs).sort(), [
    'date',
    'exercices.1.nomExercice',
    'exercices.1.series.0.poids',
    'exercices.1.series.0.repetitions',
    'exercices.1.tempsRepos',
    'exercices.2.series',
    'typePersonnalise',
  ]);
});

test('le type de séance est obligatoire', () => {
  assert.ok(preparerSeance(nouvelleSeance('2026-09-10')).erreurs.typeSeance);
});

test('une nouvelle série reprend les valeurs de la précédente', () => {
  const precedente = serie('10', '60');
  const suivante = serieSuivante([precedente]);
  assert.equal(suivante.repetitions, '10');
  assert.equal(suivante.poids, '60');
  assert.notEqual(suivante.cle, precedente.cle);
});

test('relire une séance de l’API donne des champs éditables', () => {
  const etat = depuisApi({
    date: '2026-09-10',
    typeSeance: 'pull',
    typePersonnalise: null,
    notes: null,
    exercices: [{ nomExercice: 'Tractions', tempsRepos: null, series: [{ repetitions: 8, poids: 0 }, { repetitions: 6, poids: 12.5 }] }],
  });
  assert.equal(etat.notes, '');
  assert.equal(etat.exercices[0].tempsRepos, '');
  assert.deepEqual(etat.exercices[0].series.map(({ repetitions, poids }) => [repetitions, poids]), [['8', ''], ['6', '12,5']]);
});
