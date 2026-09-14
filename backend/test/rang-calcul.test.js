import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerScore, epley, rangDepuisScore } from '../src/rang/calcul.js';

const serie = (groupe, ratioReference, poids, repetitions, extra = {}) => ({
  exerciceId: groupe, groupe, ratioReference, poidsDuCorps: false, poids, repetitions, ...extra,
});

test('formule d’Epley', () => {
  assert.equal(epley(100, 1), 100);
  assert.equal(epley(100, 10), 100 * (1 + 10 / 30));
});

test('pratiquant pile au repère intermédiaire sur 4 groupes : score 1', () => {
  // Poids de corps 80 kg, 1RM estimés = repère × 80 kg.
  const r = calculerScore([
    serie('pectoraux', 1.0, 80, 1),
    serie('quadriceps', 1.35, 108, 1),
    serie('lombaires', 1.65, 132, 1),
    serie('dos', 0.9, 72, 1),
  ], { poidsCorps: 80 });
  assert.equal(r.score, 1);
  assert.equal(r.groupes, 4);
  // parExercice : détail par exercice pour la page Rang ("Récap"), pas testé ligne à ligne ici.
  assert.equal(r.parExercice.length, 4);
  assert.ok(r.parExercice.every((e) => e.score === 1));
});

test('seule la meilleure série compte : empiler des séries légères ne monte pas le score', () => {
  const lourd = [serie('pectoraux', 1, 80, 1)];
  const avecSeriesLegeres = [...lourd, ...Array.from({ length: 20 }, () => serie('pectoraux', 1, 40, 10))];
  const opts = { poidsCorps: 80 };
  assert.equal(calculerScore(avecSeriesLegeres, opts).score, calculerScore(lourd, opts).score);
});

test('un seul groupe travaillé : score réduit (couverture 1/4)', () => {
  assert.equal(calculerScore([serie('pectoraux', 1, 80, 1)], { poidsCorps: 80 }).score, 0.25);
});

test('meilleur score par groupe, puis moyenne entre groupes', () => {
  const r = calculerScore([
    serie('pectoraux', 1, 80, 1), // 1
    serie('pectoraux', 1, 40, 1), // 0,5 : ignoré, le groupe garde son meilleur
    serie('dos', 1, 40, 1), // 0,5
    serie('quadriceps', 1, 80, 1),
    serie('lombaires', 1, 80, 1),
  ], { poidsCorps: 80 });
  assert.equal(r.score, 0.875);
});

test('poids du corps : la charge inclut le poids de corps (tractions lestées)', () => {
  const r = calculerScore([serie('dos', 1.25, 20, 1, { poidsDuCorps: true })], { poidsCorps: 80 });
  // (80 + 20) / 80 / 1,25 = 1 → couverture 1/4.
  assert.equal(r.score, 0.25);
});

test('séries au-delà de 12 répétitions ignorées ; repères adaptés pour les femmes', () => {
  assert.equal(calculerScore([serie('pectoraux', 1, 60, 15)], { poidsCorps: 60 }), null);
  const femme = calculerScore([serie('pectoraux', 1, 42, 1)], { poidsCorps: 60, sexe: 'femme' });
  assert.equal(femme.score, 0.25); // 42/60 = 0,7 = repère × 0,7
});

test('sans poids de corps ni série exploitable : pas de score', () => {
  assert.equal(calculerScore([serie('pectoraux', 1, 80, 1)], { poidsCorps: null }), null);
  assert.equal(calculerScore([], { poidsCorps: 80 }), null);
});

test('score → rang et palier', () => {
  assert.deepEqual(rangDepuisScore(0), {
    rang: 1, nom: 'Rookie', palier: 'III', niveau: 0, progression: 0, scoreProchainPalier: 0.09,
  });
  assert.equal(rangDepuisScore(0.09).palier, 'II');
  const intermediaire = rangDepuisScore(1);
  assert.deepEqual([intermediaire.nom, intermediaire.palier], ['Beast', 'I']);
  const goat = rangDepuisScore(1.89);
  assert.deepEqual([goat.nom, goat.palier], ['GOAT', 'III']);
  const max = rangDepuisScore(5);
  assert.deepEqual([max.nom, max.palier, max.progression, max.scoreProchainPalier], ['GOAT', 'I', 1, null]);
});
