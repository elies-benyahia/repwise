import { Navigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import RouteProtegee from './RouteProtegee.jsx';

// Page réservée au rôle admin (cahier §3/§5) : d'abord les mêmes règles que RouteProtegee
// (compte/invité + onboarding terminé), puis le rôle. Renvoie au dashboard plutôt qu'à
// l'onboarding si la personne est bien connectée mais n'est simplement pas admin.
export default function RouteAdmin({ children }) {
  const { utilisateur, chargement } = useAuth();
  if (chargement) return null;
  return (
    <RouteProtegee>
      {utilisateur?.role === 'admin' ? children : <Navigate to="/accueil" replace />}
    </RouteProtegee>
  );
}
