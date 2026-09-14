import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decalerMois, derniersJours, estJourValide, formaterJour, formaterMois, formaterRelatif, grilleMois, initialeJour,
  semaineDe,
} from './dates.js';

test('semaine du lundi au dimanche', () => {
  assert.deepEqual(semaineDe('2026-09-12'), [
    '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13',
  ]);
  assert.equal(semaineDe('2026-09-07')[0], '2026-09-07');
  assert.equal(semaineDe('2027-01-01')[0], '2026-12-28'); // à cheval sur deux années
});

test('7 derniers jours et initiales', () => {
  const jours = derniersJours('2026-09-12');
  assert.deepEqual([jours[0], jours.at(-1), jours.length], ['2026-09-06', '2026-09-12', 7]);
  assert.deepEqual(jours.map(initialeJour).join(''), 'DLMMJVS');
  assert.equal(derniersJours('2026-03-02', 3)[0], '2026-02-28');
});

test('dates relatives', () => {
  const ref = '2026-09-12';
  assert.equal(formaterRelatif('2026-09-12', ref), "Aujourd'hui");
  assert.equal(formaterRelatif('2026-09-11', ref), 'Hier');
  assert.equal(formaterRelatif('2026-09-08', ref), 'Il y a 4 jours');
  assert.equal(formaterRelatif('2026-09-01', ref), 'Mardi 1 septembre');
  assert.equal(formaterRelatif('2026-10-26', '2026-10-27'), 'Hier'); // lendemain du changement d'heure
});

test('la grille commence un lundi et couvre tout le mois', () => {
  const septembre = grilleMois('2026-09'); // 1er septembre 2026 = mardi
  assert.equal(septembre.length, 35);
  assert.equal(septembre[0], '2026-08-31');
  assert.equal(septembre.at(-1), '2026-10-04');
});

test('grille sur 4 et 6 semaines', () => {
  const fevrier = grilleMois('2027-02'); // commence un lundi, 28 jours
  assert.equal(fevrier.length, 28);
  assert.deepEqual([fevrier[0], fevrier.at(-1)], ['2027-02-01', '2027-02-28']);

  const aout = grilleMois('2026-08'); // commence un samedi, 31 jours
  assert.equal(aout.length, 42);
  assert.equal(aout[0], '2026-07-27');
});

test('la grille traverse le changement d’heure sans sauter ni doubler de jour', () => {
  const octobre = grilleMois('2026-10'); // passage à l'heure d'hiver le 25 octobre
  const i = octobre.indexOf('2026-10-25');
  assert.deepEqual(octobre.slice(i - 1, i + 2), ['2026-10-24', '2026-10-25', '2026-10-26']);
});

test('navigation entre mois, y compris le changement d’année', () => {
  assert.equal(decalerMois('2026-12', 1), '2027-01');
  assert.equal(decalerMois('2026-01', -1), '2025-12');
});

test('validation et formatage des jours', () => {
  assert.equal(estJourValide('2026-02-29'), false);
  assert.equal(estJourValide('2028-02-29'), true);
  assert.equal(formaterMois('2026-09'), 'Septembre 2026');
  assert.equal(formaterJour('2026-09-12'), 'Samedi 12 septembre');
});
