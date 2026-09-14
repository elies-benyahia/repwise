// Les jours circulent partout sous forme de clés "AAAA-MM-JJ" (comme en base) et les mois
// sous forme "AAAA-MM". Les Date JS ne servent qu'aux calculs, toujours en heure locale,
// pour éviter les décalages de fuseau d'un toISOString().

const deuxChiffres = (n) => String(n).padStart(2, '0');

export const versCle = (date) =>
  `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;

export function depuisCle(cle) {
  const [annee, mois, jour] = cle.split('-').map(Number);
  return new Date(annee, mois - 1, jour);
}

export const aujourdhui = () => versCle(new Date());

export function ajouterJours(cle, n) {
  const date = depuisCle(cle);
  date.setDate(date.getDate() + n);
  return versCle(date);
}
export const moisDe = (cle) => cle.slice(0, 7);
export const estMoisValide = (texte) => typeof texte === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(texte);
export const estJourValide = (texte) =>
  typeof texte === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(texte) && versCle(depuisCle(texte)) === texte;

// Âge en années pleines à une date de naissance (onboarding). Le serveur recalcule et revalide
// de son côté (backend/src/utilisateurs/modele.js) ; ceci ne sert qu'à l'aperçu immédiat.
export function ageDepuisJour(dateNaissance) {
  if (!estJourValide(dateNaissance)) return null;
  const naissance = depuisCle(dateNaissance);
  const aujourdhuiDate = new Date();
  let age = aujourdhuiDate.getFullYear() - naissance.getFullYear();
  const pasEncoreAnniversaire = (aujourdhuiDate.getMonth() < naissance.getMonth())
    || (aujourdhuiDate.getMonth() === naissance.getMonth() && aujourdhuiDate.getDate() < naissance.getDate());
  if (pasEncoreAnniversaire) age -= 1;
  return age;
}

export function decalerMois(mois, delta) {
  const [annee, m] = mois.split('-').map(Number);
  const date = new Date(annee, m - 1 + delta, 1);
  return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}`;
}

// Semaines complètes du lundi au dimanche couvrant le mois : 4, 5 ou 6 lignes de 7 jours.
export function grilleMois(mois) {
  const [annee, m] = mois.split('-').map(Number);
  const decalage = (new Date(annee, m - 1, 1).getDay() + 6) % 7; // lundi = 0
  const joursDansMois = new Date(annee, m, 0).getDate();
  const nbCases = Math.ceil((decalage + joursDansMois) / 7) * 7;
  return Array.from({ length: nbCases }, (_, i) => versCle(new Date(annee, m - 1, 1 - decalage + i)));
}

// Les 7 jours (lundi → dimanche) de la semaine contenant `cle`.
export function semaineDe(cle) {
  const date = depuisCle(cle);
  const decalage = (date.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) =>
    versCle(new Date(date.getFullYear(), date.getMonth(), date.getDate() - decalage + i)));
}

// Les `n` derniers jours, du plus ancien à `cle` inclus.
export function derniersJours(cle, n = 7) {
  const date = depuisCle(cle);
  return Array.from({ length: n }, (_, i) =>
    versCle(new Date(date.getFullYear(), date.getMonth(), date.getDate() - (n - 1) + i)));
}

// "L", "M", "M", "J", "V", "S", "D".
export const initialeJour = (cle) => 'DLMMJVS'[depuisCle(cle).getDay()];

const majuscule = (texte) => texte.charAt(0).toUpperCase() + texte.slice(1);

// "Septembre 2026"
export const formaterMois = (mois) =>
  majuscule(depuisCle(`${mois}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));

// "Samedi 12 septembre"
export const formaterJour = (cle) =>
  majuscule(depuisCle(cle).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));

// "Aujourd'hui", "Hier", "Il y a 3 jours", puis la date complète au-delà d'une semaine.
export function formaterRelatif(cle, reference = aujourdhui()) {
  // Math.round absorbe les jours de 23 h / 25 h du changement d'heure.
  const jours = Math.round((depuisCle(reference) - depuisCle(cle)) / 86_400_000);
  if (jours === 0) return "Aujourd'hui";
  if (jours === 1) return 'Hier';
  if (jours > 1 && jours < 7) return `Il y a ${jours} jours`;
  return formaterJour(cle);
}
