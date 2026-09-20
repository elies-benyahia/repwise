import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { ACCUEIL_CONNECTE } from '../navigation.js';

// Retour du 21/09 ("page 404 personnalisée") : route catch-all (voir App.jsx, dernière <Route>).
// Renvoie vers le tableau de bord si connecté, vers le calculateur public sinon — jamais un lien
// mort vers une page qui exigerait elle-même une connexion.
export default function PageIntrouvable() {
  useTitre('Page introuvable');
  const { utilisateur, chargement } = useAuth();
  if (chargement) return null;

  return (
    <section className="page-introuvable">
      <p className="page-introuvable-code" aria-hidden="true">404</p>
      <h1>Cette page n'existe pas</h1>
      <p className="aide">Le lien est peut-être périmé, ou l'adresse a été mal recopiée.</p>
      <Link to={utilisateur ? ACCUEIL_CONNECTE : '/'} className="bouton-principal">
        {utilisateur ? "Retour à l'accueil" : 'Retour au calculateur'}
      </Link>
    </section>
  );
}
