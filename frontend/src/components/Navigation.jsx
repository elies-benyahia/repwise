import { useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { profilComplet } from '../lib/profil.js';
import { POSITION_NAVIGATION_PAR_DEFAUT } from '../navigation.js';
import PillNav from './reactbits/PillNav.jsx';

// Les 5 onglets une fois le profil complet (cahier §5). Les programmes sont rangés sous
// Exercices plutôt que d'avoir leur propre onglet — voir aussiActifSur.
const ONGLETS = [
  { href: '/accueil', label: 'Accueil' },
  { href: '/calendrier', label: 'Séances' },
  { href: '/exercices', label: 'Exercices', aussiActifSur: '/programmes' },
  { href: '/journal', label: 'Journal' },
  { href: '/profil', label: 'Profil' },
];

// Avant l'onboarding (invité tout juste créé ou visiteur non connecté) : rien à montrer des 5
// onglets réservés aux comptes complets, juste de quoi repartir vers le calculateur (SEO, reste
// sur "/") ou se connecter.
const ONGLETS_VISITEUR = [
  { href: '/', label: 'Calculateur' },
  { href: '/connexion', label: 'Connexion' },
];

// Pages où la pilule n'a rien d'utile à montrer (onboarding et formulaires d'auth eux-mêmes).
const PAGES_SANS_PILULE = ['/bienvenue', '/connexion', '/inscription'];

// Navigation "PillNav" (React Bits, cahier §7) : logo dans un cercle à gauche, liens en pilules
// avec animation de survol, menu burger sur mobile. Couleurs v4 (fond sombre) : baseColor sombre
// (cercle logo/burger, remplissage qui monte au survol), pilules dans la couleur d'accent au
// repos. Texte toujours clair dans les deux états (pillTextColor = hoveredPillTextColor) plutôt
// que de miser sur l'inversion de couleur par défaut du composant : plus sûr côté contraste, quel
// que soit l'état. Couleurs passées en `var(--xxx)` (et non en hex figé) : PillNav ne fait que les
// injecter dans des custom properties CSS (--base/--pill-bg/...), donc le thème d'accent choisi
// sur /profil (frontend/src/lib/theme.js) s'applique ici automatiquement, sans code spécifique.
export default function Navigation() {
  const { utilisateur, chargement } = useAuth();
  const { pathname } = useLocation();
  if (chargement || PAGES_SANS_PILULE.includes(pathname)) return null;

  const connecte = profilComplet(utilisateur);
  const items = connecte ? ONGLETS : ONGLETS_VISITEUR;

  // aussiActifSur : /programmes* garde l'onglet Exercices actif. PillNav ne compare qu'une
  // égalité stricte sur activeHref, donc on résout nous-mêmes le href "effectif" de la page.
  const depuisProgrammes = items.find((item) => item.aussiActifSur && pathname.startsWith(item.aussiActifSur));
  const activeHref = depuisProgrammes ? depuisProgrammes.href : pathname;

  return (
    <div className="nav-enveloppe" data-position={POSITION_NAVIGATION_PAR_DEFAUT}>
      <PillNav
        logo="/logo.svg"
        logoAlt="Repwise"
        items={items}
        activeHref={activeHref}
        baseColor="var(--surface)"
        pillColor="var(--accent)"
        pillTextColor="var(--texte)"
        hoveredPillTextColor="var(--texte)"
      />
    </div>
  );
}
