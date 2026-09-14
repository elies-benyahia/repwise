export class ErreurApi extends Error {
  constructor(statut, message, champs = {}) {
    super(message);
    this.statut = statut;
    this.champs = champs;
  }
}

// L'API est servie sous /api sur le même domaine que le site (proxy Vite en dev,
// rewrite Vercel en prod) : le cookie de session reste first-party.
export async function appelerApi(chemin, { methode = 'GET', corps } = {}) {
  let reponse;
  try {
    reponse = await fetch(`/api${chemin}`, {
      method: methode,
      headers: corps ? { 'Content-Type': 'application/json' } : undefined,
      body: corps ? JSON.stringify(corps) : undefined,
    });
  } catch {
    throw new ErreurApi(0, 'Impossible de joindre le serveur. Vérifie ta connexion.');
  }

  return lireReponse(reponse);
}

async function lireReponse(reponse) {
  if (reponse.status === 204) return null;
  const donnees = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    throw new ErreurApi(reponse.status, donnees?.erreur ?? 'Une erreur est survenue', donnees?.champs);
  }
  return donnees;
}

// Envoi d'un fichier (photo de profil) : pas de Content-Type manuel, le navigateur pose la
// bonne frontière multipart lui-même à partir du FormData.
export async function envoyerFichier(chemin, { champ, fichier, methode = 'POST' } = {}) {
  let reponse;
  try {
    const corps = new FormData();
    if (fichier) corps.append(champ, fichier);
    reponse = await fetch(`/api${chemin}`, { method: methode, body: fichier ? corps : undefined });
  } catch {
    throw new ErreurApi(0, 'Impossible de joindre le serveur. Vérifie ta connexion.');
  }
  return lireReponse(reponse);
}
