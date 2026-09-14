import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumerSeries, texteDePartage, texteSuggestion } from './progression.js';

test('résumé des séries', () => {
  assert.equal(resumerSeries([{ repetitions: 8, poids: 80 }, { repetitions: 6, poids: 80 }]), '8 · 6 × 80 kg');
  assert.equal(resumerSeries([{ repetitions: 12, poids: 0 }, { repetitions: 10, poids: 0 }]), '12 · 10 reps (poids du corps)');
  assert.equal(resumerSeries([{ repetitions: 8, poids: 60 }, { repetitions: 8, poids: 72.5 }]), '8 × 60 · 8 × 72,5 kg');
});

test('phrases de suggestion', () => {
  assert.equal(texteSuggestion({ type: 'charge', poids: 82.5, repetitions: 8 }), 'Toutes tes séries sont passées : essaie 82,5 kg × 8');
  assert.equal(texteSuggestion({ type: 'repetitions', poids: 0, repetitions: 11 }), 'Toutes tes séries sont passées : vise 11 répétitions');
  assert.equal(texteSuggestion({ type: 'consolider', poids: 80, repetitions: 8 }), 'Consolide : 80 kg et 8 répétitions sur chaque série');
  assert.equal(texteSuggestion(null), null);
});

test('texte de partage, sans les notes', () => {
  const texte = texteDePartage({
    titre: 'Push',
    date: '2026-09-12',
    exercices: [
      { nomExercice: 'Développé couché', series: [{ repetitions: 8, poids: 80 }] },
      { nomExercice: 'Vide', series: [] },
    ],
  });
  assert.equal(texte, 'Push — Samedi 12 septembre\n• Développé couché : 8 × 80 kg\n\nLoggé avec Repwise');
});
