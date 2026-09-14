import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { profilComplet } from '../lib/profil.js';

// Pages réservées aux utilisateurs (compte ou invité) ayant terminé l'onboarding.
// Après l'onboarding, l'utilisateur revient sur la page demandée (state.depuis).
export default function RouteProtegee({ children }) {
  const { utilisateur, chargement } = useAuth();
  const location = useLocation();

  if (chargement) return null;
  const depuis = location.pathname + location.search;
  // Onboarding (compte ou invité + profil) : un seul assistant en 4 étapes, plus de page
  // séparée pour le profil — s'il manque un compte ou des infos de profil, on y renvoie.
  if (!utilisateur || !profilComplet(utilisateur)) return <Navigate to="/bienvenue" state={{ depuis }} replace />;
  return children;
}
