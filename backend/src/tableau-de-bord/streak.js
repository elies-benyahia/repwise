// Streak = nombre de jours d'entraînement d'affilée, recalculé à chaque fois depuis les dates
// de séance (pas de compteur stocké : il deviendrait faux si on ajoute ou supprime une séance
// après coup).
//
// Jours de repos tolérés entre deux séances sans casser la série. À 0 (reset strict), un seul
// jour sans séance remet la flamme à zéro — irréaliste en musculation, où l'on s'entraîne
// rarement tous les jours. Le cahier des charges laisse ce choix ouvert.
export const JOURS_DE_REPOS_TOLERES = 1;

const JOUR_MS = 86_400_000;
const ecartEnJours = (avant, apres) => Math.round((Date.parse(apres) - Date.parse(avant)) / JOUR_MS);

// `dates` : dates de séance distinctes ("AAAA-MM-JJ"), triées par ordre croissant, ≤ aujourdhui.
export function calculerStreak(dates, aujourdhui, tolerance = JOURS_DE_REPOS_TOLERES) {
  const ecartMax = tolerance + 1;
  let record = 0;
  let enCours = 0;

  dates.forEach((date, i) => {
    enCours = i > 0 && ecartEnJours(dates[i - 1], date) <= ecartMax ? enCours + 1 : 1;
    record = Math.max(record, enCours);
  });

  // La série est toujours vivante si le jour de repos toléré n'est pas encore dépassé
  // (pas de flamme à 0 le matin simplement parce qu'on ne s'est pas encore entraîné).
  const derniere = dates.at(-1);
  const actuel = derniere && ecartEnJours(derniere, aujourdhui) <= ecartMax ? enCours : 0;
  return { actuel, record, tolerance };
}

// Lundi de la semaine contenant `date` (semaine du lundi au dimanche, comme le calendrier).
export function lundiDe(date) {
  const jour = new Date(`${date}T00:00:00Z`);
  jour.setUTCDate(jour.getUTCDate() - ((jour.getUTCDay() + 6) % 7));
  return jour.toISOString().slice(0, 10);
}

export function ajouterJours(date, n) {
  const jour = new Date(`${date}T00:00:00Z`);
  jour.setUTCDate(jour.getUTCDate() + n);
  return jour.toISOString().slice(0, 10);
}
