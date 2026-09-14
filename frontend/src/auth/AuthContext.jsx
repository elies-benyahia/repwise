import { createContext, useContext, useEffect, useState } from 'react';
import { appelerApi } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    appelerApi('/auth/session')
      .then(({ utilisateur }) => setUtilisateur(utilisateur))
      // Serveur injoignable : on reste en mode déconnecté, le calculateur marche sans compte.
      .catch(() => setUtilisateur(null))
      .finally(() => setChargement(false));
  }, []);

  // Toutes les actions renvoient l'utilisateur à jour, pour que la page appelante décide où rediriger.
  async function appliquer(chemin, options) {
    const { utilisateur } = await appelerApi(chemin, options);
    setUtilisateur(utilisateur);
    return utilisateur;
  }

  const actions = {
    // Après une écriture qui change des infos affichées ailleurs (rang après une séance).
    rafraichir: () => appliquer('/auth/session'),
    connexion: (identifiants) => appliquer('/auth/connexion', { methode: 'POST', corps: identifiants }),
    // Si une session invité est ouverte, l'API la transforme en compte (historique conservé).
    inscription: (identifiants) => appliquer('/auth/inscription', { methode: 'POST', corps: identifiants }),
    continuerEnInvite: () => appliquer('/auth/invite', { methode: 'POST' }),
    mettreAJourProfil: (profil) => appliquer('/profil', { methode: 'PATCH', corps: profil }),
    // Objectif calculé + paramètres du calcul (sexe, activité, objectif) enregistrés sur le profil.
    enregistrerObjectif: (objectif) => appliquer('/objectif', { methode: 'POST', corps: objectif }),
    async deconnexion() {
      await appelerApi('/auth/deconnexion', { methode: 'POST' });
      setUtilisateur(null);
    },
  };

  return (
    <AuthContext value={{ utilisateur, chargement, ...actions }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
