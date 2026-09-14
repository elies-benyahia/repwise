import { test } from 'node:test';
import assert from 'node:assert/strict';
import { musclesATravailler, suggererProgression } from '../src/recommandations/regles.js';

const s = (repetitions, poids) => ({ repetitions, poids });

test('toutes les séries réussies : +2,5 kg', () => {
  assert.deepEqual(suggererProgression([s(8, 80), s(8, 80), s(8, 80)]), { type: 'charge', poids: 82.5, repetitions: 8 });
});

test('charges légères : +1 kg', () => {
  assert.deepEqual(suggererProgression([s(12, 12), s(12, 12)]), { type: 'charge', poids: 13, repetitions: 12 });
});

test('répétitions perdues en route : on consolide la charge', () => {
  assert.deepEqual(suggererProgression([s(8, 80), s(8, 80), s(6, 80)]), { type: 'consolider', poids: 80, repetitions: 8 });
});

test('charges différentes entre séries : on consolide à la plus lourde', () => {
  assert.deepEqual(suggererProgression([s(10, 60), s(8, 70)]), { type: 'consolider', poids: 70, repetitions: 10 });
});

test('poids du corps : +1 répétition si tout est passé', () => {
  assert.deepEqual(suggererProgression([s(10, 0), s(10, 0)]), { type: 'repetitions', poids: 0, repetitions: 11 });
  assert.deepEqual(suggererProgression([s(10, 0), s(7, 0)]), { type: 'consolider', poids: 0, repetitions: 10 });
});

test('pas d’historique : pas de suggestion', () => {
  assert.equal(suggererProgression([]), null);
});

test('muscles à travailler : jamais travaillés d’abord, puis les plus anciens (≥ 7 jours)', () => {
  const dernieres = new Map([
    ['pectoraux', '2026-09-11'], ['dos', '2026-09-01'], ['epaules', '2026-09-10'], ['quadriceps', '2026-08-20'],
    ['ischio_jambiers', '2026-09-10'], ['fessiers', '2026-09-10'], ['biceps', '2026-09-10'], ['triceps', '2026-09-10'],
  ]);
  assert.deepEqual(musclesATravailler(dernieres, '2026-09-12', 3), [
    { groupe: 'abdominaux', joursDepuis: null },
    { groupe: 'quadriceps', joursDepuis: 23 },
    { groupe: 'dos', joursDepuis: 11 },
  ]);
});

test('tout travaillé récemment : rien à signaler', () => {
  const dernieres = new Map(
    ['pectoraux', 'dos', 'epaules', 'quadriceps', 'ischio_jambiers', 'fessiers', 'biceps', 'triceps', 'abdominaux']
      .map((g) => [g, '2026-09-10']),
  );
  assert.deepEqual(musclesATravailler(dernieres, '2026-09-12'), []);
});
