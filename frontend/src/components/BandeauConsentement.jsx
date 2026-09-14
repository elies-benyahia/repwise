import { Link } from 'react-router';
import { useConsentementPub } from '../consentement/ConsentementPubContext.jsx';

// RGPD (cahier §8 : "bannière de consentement cookies obligatoire en France pour la pub Google") :
// affiché tant qu'aucun choix n'est enregistré. Sans "Accepter", le script AdSense n'est jamais
// chargé (frontend/src/lib/adsense.js) — aucun cookie publicitaire n'est donc posé par défaut.
export default function BandeauConsentement() {
  const { consentement, definirConsentement } = useConsentementPub();
  if (consentement) return null;

  return (
    <div className="bandeau-consentement" role="dialog" aria-label="Consentement cookies publicitaires">
      <p>
        Ce site utilise des cookies publicitaires (Google AdSense) sur la page calculateur pour
        financer Repwise, gratuit pour tout le monde. <Link to="/confidentialite">En savoir plus</Link>.
      </p>
      <div className="bandeau-consentement-actions">
        <button type="button" className="bouton-secondaire" onClick={() => definirConsentement('refuse')}>
          Refuser
        </button>
        <button type="button" className="bouton-principal" onClick={() => definirConsentement('accepte')}>
          Accepter
        </button>
      </div>
    </div>
  );
}
