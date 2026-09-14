import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ajouterJours, calculerStreak, lundiDe } from '../src/tableau-de-bord/streak.js';

const AUJOURDHUI = '2026-09-12';

test('aucune séance : 0', () => {
  assert.deepEqual(calculerStreak([], AUJOURDHUI), { actuel: 0, record: 0, tolerance: 1 });
});

test('un jour de repos entre deux séances ne casse pas la série', () => {
  const dates = ['2026-09-06', '2026-09-08', '2026-09-09', '2026-09-11'];
  assert.equal(calculerStreak(dates, AUJOURDHUI).actuel, 4);
});

test('deux jours de repos d’affilée cassent la série', () => {
  const dates = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-06', '2026-09-07'];
  const streak = calculerStreak(dates, '2026-09-07');
  assert.equal(streak.actuel, 2);
  assert.equal(streak.record, 3);
});

test('la série reste vivante pendant le jour de repos toléré, puis tombe à 0', () => {
  const dates = ['2026-09-09', '2026-09-10'];
  assert.equal(calculerStreak(dates, '2026-09-11').actuel, 2); // hier : séance
  assert.equal(calculerStreak(dates, '2026-09-12').actuel, 2); // jour de repos toléré
  assert.equal(calculerStreak(dates, '2026-09-13').actuel, 0); // deux jours sans séance
});

test('mode strict (tolérance 0) : chaque jour compte', () => {
  const dates = ['2026-09-08', '2026-09-10', '2026-09-11'];
  assert.equal(calculerStreak(dates, AUJOURDHUI, 0).actuel, 2);
  assert.equal(calculerStreak(dates, '2026-09-13', 0).actuel, 0);
});

test('semaine du lundi au dimanche', () => {
  assert.equal(lundiDe('2026-09-12'), '2026-09-07'); // samedi → lundi
  assert.equal(lundiDe('2026-09-07'), '2026-09-07'); // lundi
  assert.equal(lundiDe('2026-09-13'), '2026-09-07'); // dimanche
  assert.equal(ajouterJours('2026-09-07', 6), '2026-09-13');
  assert.equal(ajouterJours('2026-12-31', 1), '2027-01-01');
});
