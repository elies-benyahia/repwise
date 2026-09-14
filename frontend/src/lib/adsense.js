// Google AdSense (cahier §8, compte créé le 14/09 : ca-pub-9846502233003678). Chargé à la demande
// (pas dans index.html) plutôt qu'au chargement du site entier : seulement sur le calculateur
// (page publique à fort trafic visée par le cahier), et seulement si l'utilisateur a consenti aux
// cookies publicitaires (frontend/src/lib/consentement.js) — jamais avant, pour rester conforme
// RGPD. Auto ads (juste le script, pas d'emplacement <ins> manuel) : Google choisit lui-même où
// placer les annonces sur la page.
const CLIENT_ID = 'ca-pub-9846502233003678';

let demarre = false;

export function chargerAdSense() {
  if (demarre || document.querySelector('script[data-adsense]')) return;
  demarre = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
  script.crossOrigin = 'anonymous';
  script.dataset.adsense = 'true';
  document.head.appendChild(script);
}
