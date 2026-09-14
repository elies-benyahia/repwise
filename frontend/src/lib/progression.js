import { formaterJour } from './dates.js';
import { formaterNombre } from './format.js';

// "8 · 8 · 6 × 80 kg", "12 · 10 reps (poids du corps)", "8 × 60 · 8 × 70 kg" (charges différentes).
export function resumerSeries(series) {
  if (series.length === 0) return '';
  const poids = series[0].poids;
  if (series.every((s) => s.poids === poids)) {
    const reps = series.map((s) => s.repetitions).join(' · ');
    return poids === 0 ? `${reps} reps (poids du corps)` : `${reps} × ${formaterNombre(poids)} kg`;
  }
  return `${series.map((s) => `${s.repetitions} × ${formaterNombre(s.poids)}`).join(' · ')} kg`;
}

// Suggestion renvoyée par /api/progression/derniere-fois → phrase à afficher.
export function texteSuggestion(suggestion) {
  if (!suggestion) return null;
  const { type, poids, repetitions } = suggestion;
  if (type === 'charge') return `Toutes tes séries sont passées : essaie ${formaterNombre(poids)} kg × ${repetitions}`;
  if (type === 'repetitions') return `Toutes tes séries sont passées : vise ${repetitions} répétitions`;
  return poids > 0
    ? `Consolide : ${formaterNombre(poids)} kg et ${repetitions} répétitions sur chaque série`
    : `Consolide : ${repetitions} répétitions sur chaque série`;
}

// Texte partagé (Web Share ou presse-papiers). Les notes restent privées : elles peuvent
// parler de douleurs ou de ressenti.
export function texteDePartage({ titre, date, exercices }) {
  const lignes = exercices
    .filter((e) => e.series.length > 0)
    .map((e) => `• ${e.nomExercice} : ${resumerSeries(e.series)}`);
  return [`${titre} — ${formaterJour(date)}`, ...lignes, '', 'Loggé avec Repwise'].join('\n');
}
