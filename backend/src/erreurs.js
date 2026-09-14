export class ErreurHttp extends Error {
  constructor(statut, message, champs) {
    super(message);
    this.statut = statut;
    this.champs = champs;
  }
}

// Express reconnaît un gestionnaire d'erreurs à ses 4 paramètres : `next` doit rester.
export function gestionnaireErreurs(err, req, res, next) {
  if (err instanceof ErreurHttp) {
    return res.status(err.statut).json({ erreur: err.message, champs: err.champs });
  }
  // Erreurs du parseur JSON (corps mal formé, trop gros…).
  if (err.expose && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ erreur: 'Requête invalide' });
  }
  console.error(err);
  res.status(500).json({ erreur: 'Erreur interne du serveur' });
}
