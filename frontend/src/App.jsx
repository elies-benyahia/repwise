import { lazy, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import BandeauConsentement from './components/BandeauConsentement.jsx';
import Navigation from './components/Navigation.jsx';
import RouteAdmin from './components/RouteAdmin.jsx';
import RouteProtegee from './components/RouteProtegee.jsx';
import GhostFibers from './components/reactbits/GhostFibers.jsx';
import GradualBlur from './components/reactbits/GradualBlur.jsx';
import { ConsentementPubProvider } from './consentement/ConsentementPubContext.jsx';
import { ThemeCouleurProvider, useThemeCouleur } from './theme/ThemeCouleurContext.jsx';
import { THEMES_COULEUR } from './lib/theme.js';
// Calculateur reste un import statique : c'est la page d'accueil publique (porte d'entrée SEO),
// elle doit être dans le bundle initial. Tout le reste est chargé à la demande (retour du 18/09,
// "améliore le bundle JS" — un seul chunk de 559 Ko faisait tout charger même pour /calculateur).
import Calculateur from './pages/Calculateur.jsx';

const Accueil = lazy(() => import('./pages/Accueil.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const Authentification = lazy(() => import('./pages/Authentification.jsx'));
const Bienvenue = lazy(() => import('./pages/Bienvenue.jsx'));
const Calendrier = lazy(() => import('./pages/Calendrier.jsx'));
const Classement = lazy(() => import('./pages/Classement.jsx'));
const Confidentialite = lazy(() => import('./pages/Confidentialite.jsx'));
const ConditionsUtilisation = lazy(() => import('./pages/ConditionsUtilisation.jsx'));
const Credits = lazy(() => import('./pages/Credits.jsx'));
const Exercices = lazy(() => import('./pages/Exercices.jsx'));
const Feedback = lazy(() => import('./pages/Feedback.jsx'));
const Groupe = lazy(() => import('./pages/Groupe.jsx'));
const Groupes = lazy(() => import('./pages/Groupes.jsx'));
const JoueurClassement = lazy(() => import('./pages/JoueurClassement.jsx'));
const Journal = lazy(() => import('./pages/Journal.jsx'));
const MentionsLegales = lazy(() => import('./pages/MentionsLegales.jsx'));
const MotDePasseOublie = lazy(() => import('./pages/MotDePasseOublie.jsx'));
const PageIntrouvable = lazy(() => import('./pages/PageIntrouvable.jsx'));
const Profil = lazy(() => import('./pages/Profil.jsx'));
const ReinitialiserMotDePasse = lazy(() => import('./pages/ReinitialiserMotDePasse.jsx'));
const Programme = lazy(() => import('./pages/Programme.jsx'));
const Programmes = lazy(() => import('./pages/Programmes.jsx'));
const Progression = lazy(() => import('./pages/Progression.jsx'));
const Rang = lazy(() => import('./pages/Rang.jsx'));
const PageSeance = lazy(() => import('./pages/Seance.jsx'));

// Pages où le bandeau invité serait redondant avec ce que l'onboarding affiche déjà.
const PAGES_ONBOARDING = ['/bienvenue', '/connexion', '/inscription', '/mot-de-passe-oublie', '/reinitialiser-mot-de-passe'];

const protegee = (page) => <RouteProtegee>{page}</RouteProtegee>;

export default function App() {
  return (
    <BrowserRouter>
      <ThemeCouleurProvider>
        <ConsentementPubProvider>
          <AuthProvider>
            {/* Fond animé (React Bits, cahier §7) : retour utilisateur du hero v4, généralisé à tout
                le site plutôt que gardé propre à la page d'accueil publique — fixed, derrière tout
                (z-index négatif), une seule instance WebGL pour toute l'app. */}
            <FondAnime />
            {/* PillNav (React Bits, cahier §7) flotte en position fixed au-dessus de tout : le logo
                et les onglets sont rendus par Navigation.jsx lui-même, pas ici. */}
            <Navigation />
            {/* Flou de bord discret en haut/bas de page (React Bits, cahier §7) : purement cosmétique.
                zIndex volontairement bas (+100 pour target="page" → 50) pour rester SOUS la pilule de
                navigation (z-index 99) : sinon le flou s'applique aussi à la pilule elle-même. */}
            <GradualBlur preset="page-header" strength={1.2} height="4.5rem" zIndex={-50} />
            <GradualBlur preset="page-footer" strength={1.2} height="4.5rem" zIndex={-50} />
            <div className="contenu-sous-nav">
              <BandeauInvite />
              <main className="conteneur">
                <Suspense fallback={<p className="aide">Chargement…</p>}>
                  <Routes>
                    <Route path="/" element={<Calculateur />} />
                    <Route path="/feedback" element={<Feedback />} />
                    <Route path="/credits" element={<Credits />} />
                    <Route path="/mentions-legales" element={<MentionsLegales />} />
                    <Route path="/confidentialite" element={<Confidentialite />} />
                    <Route path="/conditions-utilisation" element={<ConditionsUtilisation />} />
                    <Route path="/bienvenue" element={<Bienvenue />} />
                    <Route path="/connexion" element={<Authentification mode="connexion" />} />
                    <Route path="/inscription" element={<Authentification mode="inscription" />} />
                    <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
                    <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePasse />} />
                    <Route path="/accueil" element={protegee(<Accueil />)} />
                    <Route path="/calendrier" element={protegee(<Calendrier />)} />
                    <Route path="/seance/nouvelle" element={protegee(<PageSeance />)} />
                    <Route path="/seance/:id" element={protegee(<PageSeance />)} />
                    <Route path="/journal" element={protegee(<Journal />)} />
                    <Route path="/exercices" element={protegee(<Exercices />)} />
                    <Route path="/programmes" element={protegee(<Programmes />)} />
                    <Route path="/programmes/:id" element={protegee(<Programme />)} />
                    <Route path="/profil" element={protegee(<Profil />)} />
                    <Route path="/progression" element={protegee(<Progression />)} />
                    <Route path="/classement" element={protegee(<Classement />)} />
                    <Route path="/classement/:id" element={protegee(<JoueurClassement />)} />
                    <Route path="/rang" element={protegee(<Rang />)} />
                    <Route path="/groupes" element={protegee(<Groupes />)} />
                    <Route path="/groupes/:id" element={protegee(<Groupe />)} />
                    <Route path="/admin" element={<RouteAdmin><Admin /></RouteAdmin>} />
                    <Route path="*" element={<PageIntrouvable />} />
                  </Routes>
                </Suspense>
                <PiedDePage />
              </main>
            </div>
            <BandeauConsentement />
            {/* Vercel Web Analytics (retour du 21/09) : agrégé, sans cookie ni identifiant
                personnel — contrairement à AdSense, ne nécessite pas le consentement de
                BandeauConsentement (voir Confidentialite.jsx). N'a d'effet que si l'analytics est
                activé côté dashboard Vercel pour ce projet. */}
            <Analytics />
          </AuthProvider>
        </ConsentementPubProvider>
      </ThemeCouleurProvider>
    </BrowserRouter>
  );
}

// Couleurs du fond animé pilotées par le thème choisi sur /profil (frontend/src/lib/theme.js) :
// GhostFibers reçoit ses couleurs en props (uniforms WebGL), pas en CSS, donc contrairement au
// reste du site (var(--accent)...) il a besoin d'être ré-alimenté explicitement ici.
function FondAnime() {
  const { theme } = useThemeCouleur();
  const { lineColor, glowColor } = THEMES_COULEUR[theme].ghostFibers;
  return (
    <div className="fond-global" aria-hidden="true">
      <GhostFibers
        lineColor={lineColor}
        glowColor={glowColor}
        speed={0.12}
        scale={2.2}
        rotationSpeed={0.06}
        vignette={0.7}
        brightness={2}
        grain={0.025}
        dpr={1}
        fps={24}
      />
    </div>
  );
}

function BandeauInvite() {
  const { utilisateur } = useAuth();
  const { pathname } = useLocation();
  if (!utilisateur?.estInvite || PAGES_ONBOARDING.includes(pathname)) return null;

  return (
    <div className="bandeau-invite" role="status">
      <span>Mode invité</span>
      <Link to="/inscription">Sauvegarder mon historique</Link>
    </div>
  );
}

function PiedDePage() {
  const { pathname } = useLocation();
  // Masqué sur la page feedback elle-même et dans le formulaire de séance (barre d'action collante).
  if (pathname === '/feedback' || pathname.startsWith('/seance')) return null;
  return (
    <footer className="pied-de-page">
      <Link to="/feedback">Une idée ? Un bug ? Écris-nous</Link>
      <span aria-hidden="true"> · </span>
      <Link to="/credits">Crédits</Link>
      <span aria-hidden="true"> · </span>
      <Link to="/mentions-legales">Mentions légales</Link>
      <span aria-hidden="true"> · </span>
      <Link to="/confidentialite">Confidentialité</Link>
      <span aria-hidden="true"> · </span>
      <Link to="/conditions-utilisation">CGU</Link>
    </footer>
  );
}
