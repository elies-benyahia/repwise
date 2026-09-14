import { createContext, useContext, useState } from 'react';
import { ecrireConsentementPub, lireConsentementPub } from '../lib/consentement.js';

const ConsentementPubContext = createContext(null);

// État partagé entre le bandeau (affiché tant qu'aucun choix n'est fait) et la page Calculateur
// (qui charge AdSense seulement si le choix est 'accepte'). Même patron que ThemeCouleurContext.
export function ConsentementPubProvider({ children }) {
  const [consentement, setConsentementState] = useState(() => lireConsentementPub());

  function definirConsentement(valeur) {
    setConsentementState(valeur);
    ecrireConsentementPub(valeur);
  }

  return (
    <ConsentementPubContext.Provider value={{ consentement, definirConsentement }}>
      {children}
    </ConsentementPubContext.Provider>
  );
}

export function useConsentementPub() {
  const contexte = useContext(ConsentementPubContext);
  if (!contexte) throw new Error('useConsentementPub doit être utilisé sous ConsentementPubProvider');
  return contexte;
}
