const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/;

// "AAAA-MM-JJ" et date réelle (refuse le 31 février).
export function estDateValide(texte) {
  if (typeof texte !== 'string' || !FORMAT_DATE.test(texte)) return false;
  const [annee, mois, jour] = texte.split('-').map(Number);
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  return date.getUTCFullYear() === annee && date.getUTCMonth() === mois - 1 && date.getUTCDate() === jour;
}

// Le serveur est en UTC et l'utilisateur peut être en avance (ex. UTC+2 après minuit) :
// on accepte jusqu'à demain UTC pour ne jamais refuser une saisie du jour.
export function estDansLeFutur(date) {
  const demain = new Date();
  demain.setUTCDate(demain.getUTCDate() + 1);
  return date > demain.toISOString().slice(0, 10);
}
