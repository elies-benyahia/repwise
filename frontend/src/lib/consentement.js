// Consentement RGPD pour les cookies publicitaires (Google AdSense, cahier §8 — compte créé le
// 14/09). Purement cosmétique/client (localStorage), comme le thème de couleur : pas de compte
// requis, marche pour les invités. Trois états : null (jamais demandé, bandeau affiché),
// 'accepte', 'refuse'.
const CLE_STOCKAGE = 'repwise-consentement-pub';

export function lireConsentementPub() {
  try {
    const valeur = localStorage.getItem(CLE_STOCKAGE);
    return valeur === 'accepte' || valeur === 'refuse' ? valeur : null;
  } catch {
    return null;
  }
}

export function ecrireConsentementPub(valeur) {
  try {
    localStorage.setItem(CLE_STOCKAGE, valeur);
  } catch {
    // Stockage indisponible : le choix reste actif pour la session en cours (état React),
    // simplement pas mémorisé à la prochaine visite — le bandeau réapparaîtra alors.
  }
}
