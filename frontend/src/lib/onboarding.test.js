import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  niveauActiviteDepuisFrequence, niveauExperienceDepuisFrequence, objectifDepuisDeclare, OBJECTIFS_DECLARES,
} from './onboarding.js';

test('niveau d’activité déduit de la fréquence de séances', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 10].map(niveauActiviteDepuisFrequence), [
    'sedentaire', 'leger', 'leger', 'modere', 'modere', 'actif', 'actif', 'tres_actif', 'tres_actif',
  ]);
});

test('niveau d’expérience déduit de la fréquence de séances', () => {
  assert.deepEqual([0, 2, 3, 4, 5, 10].map(niveauExperienceDepuisFrequence), [
    'debutant', 'debutant', 'intermediaire', 'intermediaire', 'confirme', 'confirme',
  ]);
});

test('chaque objectif déclaré se ramène à un objectif du calculateur', () => {
  for (const cle of Object.keys(OBJECTIFS_DECLARES)) {
    assert.ok(['prise_de_masse', 'perte_de_gras', 'recomposition', 'maintien'].includes(objectifDepuisDeclare(cle)), cle);
  }
});
