import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerBesoins, calculerMetabolismeBase, validerProfil } from './calculs.js';

test('métabolisme de base Mifflin-St Jeor', () => {
  assert.equal(calculerMetabolismeBase({ sexe: 'homme', poids: 80, taille: 180, age: 25 }), 1805);
  assert.equal(calculerMetabolismeBase({ sexe: 'femme', poids: 60, taille: 165, age: 30 }), 1320.25);
});

test('homme, prise de masse, modérément actif', () => {
  const r = calculerBesoins({
    sexe: 'homme', poids: 80, taille: 180, age: 25, niveauActivite: 'modere', objectif: 'prise_de_masse',
  });
  assert.equal(r.maintenance, 2798);
  assert.equal(r.calories, 3078);
  assert.equal(r.proteines, 144);
  assert.equal(r.lipides, 86);
  assert.equal(r.glucides, 432);
  assert.equal(r.plancherApplique, false);
});

test('femme, perte de gras : le minimum de lipides par kg prend le relais', () => {
  const r = calculerBesoins({
    sexe: 'femme', poids: 60, taille: 165, age: 30, niveauActivite: 'sedentaire', objectif: 'perte_de_gras',
  });
  assert.equal(r.calories, 1267);
  assert.equal(r.proteines, 132);
  assert.equal(r.lipides, 42);
  assert.equal(r.glucides, 90);
});

test('le plancher calorique est appliqué et signalé', () => {
  const r = calculerBesoins({
    sexe: 'femme', poids: 45, taille: 150, age: 60, niveauActivite: 'sedentaire', objectif: 'perte_de_gras',
  });
  assert.equal(r.calories, 1200);
  assert.equal(r.plancherApplique, true);
});

test('validation des champs', () => {
  assert.deepEqual(validerProfil({ age: 25, poids: 80, taille: 180 }), {});
  assert.deepEqual(Object.keys(validerProfil({ age: 0, poids: NaN, taille: 300 })), ['age', 'poids', 'taille']);
});
