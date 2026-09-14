// Page d'arrivée après connexion ou onboarding : le dashboard. Le calculateur reste sur "/"
// pour le référencement.
export const ACCUEIL_CONNECTE = '/accueil';

// Position de la barre d'onglets. Réglage utilisateur prévu (haut/bas/gauche/droite) via la
// page Paramètres, pas encore construite — en attendant, seul "haut" (nouveau défaut, refonte
// post-test) est branché, mais le composant Navigation et son CSS savent déjà lire cette
// constante plutôt qu'une valeur en dur, pour que le futur réglage n'ait qu'à la faire varier.
export const POSITION_NAVIGATION_PAR_DEFAUT = 'haut';
