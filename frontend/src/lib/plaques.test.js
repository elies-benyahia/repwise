import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerPlaques } from './plaques.js';

test('100 kg sur une barre de 20 : 40 kg par côté, du plus lourd au plus léger', () => {
  const r = calculerPlaques(100);
  assert.equal(r.parCote, 40);
  assert.deepEqual(r.plaques, [{ poids: 25, quantite: 1 }, { poids: 15, quantite: 1 }]);
  assert.equal(r.resteNonChargeable, 0);
});

test('poids qui tombe pile sur une seule taille de plaque', () => {
  assert.deepEqual(calculerPlaques(60).plaques, [{ poids: 20, quantite: 1 }]); // 20 kg/côté
});

test('poids trop léger pour être chargé (barre seule suffit ou dépasse)', () => {
  assert.equal(calculerPlaques(20), null);
  assert.equal(calculerPlaques(15), null);
});

test('barre différente (ex. 15 kg, barre EZ)', () => {
  const r = calculerPlaques(55, 15);
  assert.equal(r.parCote, 20);
  assert.deepEqual(r.plaques, [{ poids: 20, quantite: 1 }]);
});

test('petits écarts (2.5 kg) bien pris en compte', () => {
  const r = calculerPlaques(42.5);
  assert.equal(r.parCote, 11.25);
  assert.deepEqual(r.plaques, [{ poids: 10, quantite: 1 }, { poids: 1.25, quantite: 1 }]);
});
