// Recommandations à règles simples, comme prévu par le cahier des charges.

// Palier d'augmentation de charge : 2,5 kg (barre), 1 kg sous 20 kg (haltères légers).
export const INCREMENT_KG = 2.5;
export const INCREMENT_KG_LEGER = 1;
const SEUIL_CHARGE_LEGERE = 20;

// Progression de charge d'après la dernière fois où l'exercice a été fait.
// Série "réussie" = toutes les séries à la même charge, sans perte de répétitions par rapport à
// la première. Réussi → on monte la charge (ou +1 répétition au poids du corps) ; sinon on
// consolide : même charge, viser les mêmes répétitions sur toutes les séries.
export function suggererProgression(series) {
  if (series.length === 0) return null;
  const cible = series[0].repetitions;
  const poidsMax = Math.max(...series.map((s) => s.poids));
  const memeCharge = series.every((s) => s.poids === poidsMax);
  const reussi = memeCharge && series.every((s) => s.repetitions >= cible);

  if (poidsMax === 0) {
    return reussi
      ? { type: 'repetitions', poids: 0, repetitions: cible + 1 }
      : { type: 'consolider', poids: 0, repetitions: cible };
  }
  if (!reussi) return { type: 'consolider', poids: poidsMax, repetitions: cible };
  const increment = poidsMax < SEUIL_CHARGE_LEGERE ? INCREMENT_KG_LEGER : INCREMENT_KG;
  return { type: 'charge', poids: Math.round((poidsMax + increment) * 100) / 100, repetitions: cible };
}

// Grands groupes musculaires surveillés pour l'équilibre de l'entraînement.
export const GROUPES_SUIVIS = [
  'pectoraux', 'dos', 'epaules', 'quadriceps', 'ischio_jambiers', 'fessiers', 'biceps', 'triceps', 'abdominaux',
];
export const JOURS_AVANT_RAPPEL = 7;

const ecartEnJours = (avant, apres) => Math.round((Date.parse(apres) - Date.parse(avant)) / 86_400_000);

// `derniereParGroupe` : Map groupe → dernière date travaillée. Renvoie les groupes pas travaillés
// depuis au moins une semaine (jamais travaillés d'abord, puis les plus anciens).
export function musclesATravailler(derniereParGroupe, aujourdhui, nombre = 2) {
  return GROUPES_SUIVIS
    .map((groupe) => {
      const derniere = derniereParGroupe.get(groupe);
      return { groupe, joursDepuis: derniere ? ecartEnJours(derniere, aujourdhui) : null };
    })
    .filter((g) => g.joursDepuis === null || g.joursDepuis >= JOURS_AVANT_RAPPEL)
    .sort((a, b) => (b.joursDepuis ?? Infinity) - (a.joursDepuis ?? Infinity))
    .slice(0, nombre);
}
