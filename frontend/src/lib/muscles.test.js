import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GROUPES_MUSCULAIRES, ZONES, trierPourNiveau, vueDe } from './muscles.js';

test('chaque groupe musculaire est cliquable sur au moins une face', () => {
  const dessines = new Set([...ZONES.avant, ...ZONES.arriere].map(([groupe]) => groupe));
  assert.deepEqual([...dessines].sort(), Object.keys(GROUPES_MUSCULAIRES).sort());
});

test('face affichée pour un muscle', () => {
  assert.equal(vueDe('pectoraux'), 'avant');
  assert.equal(vueDe('fessiers'), 'arriere');
  assert.equal(vueDe('epaules'), 'avant'); // visible des deux côtés : face avant par défaut
});

test('les exercices à la portée du niveau déclaré passent en premier', () => {
  const exercices = [
    { nom: 'Soulevé de terre', niveauDifficulte: 'confirme' },
    { nom: 'Rowing barre', niveauDifficulte: 'intermediaire' },
    { nom: 'Tirage vertical', niveauDifficulte: 'debutant' },
  ];
  const pourDebutant = trierPourNiveau(exercices, 'debutant');
  assert.deepEqual(pourDebutant.map((e) => [e.nom, e.plusAvance]), [
    ['Tirage vertical', false],
    ['Soulevé de terre', true],
    ['Rowing barre', true],
  ]);
  assert.deepEqual(trierPourNiveau(exercices, 'confirme').map((e) => e.nom), exercices.map((e) => e.nom));
  assert.ok(trierPourNiveau(exercices, null).every((e) => !e.plusAvance));
});
