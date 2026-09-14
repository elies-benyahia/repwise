import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { ACCUEIL_CONNECTE } from '../navigation.js';
import { profilComplet } from '../lib/profil.js';

const TEXTES = {
  connexion: {
    titre: 'Connexion',
    sousTitre: 'Content de te revoir. Connecte-toi pour retrouver tes séances.',
    bouton: 'Se connecter',
    enCours: 'Connexion…',
    autoCompleteMotDePasse: 'current-password',
    bascule: { texte: 'Pas encore de compte ?', lien: '/inscription', action: 'Créer un compte' },
  },
  inscription: {
    titre: 'Créer un compte',
    sousTitre: 'Gratuit. Retrouve tes séances, ton journal alimentaire et tes objectifs partout.',
    bouton: 'Créer mon compte',
    enCours: 'Création…',
    autoCompleteMotDePasse: 'new-password',
    bascule: { texte: 'Déjà un compte ?', lien: '/connexion', action: 'Se connecter' },
  },
};

// Un invité qui s'inscrit garde tout ce qu'il a saisi : on le lui dit.
const TEXTES_INSCRIPTION_INVITE = {
  ...TEXTES.inscription,
  titre: 'Sauvegarder mes données',
  sousTitre: 'Ajoute un email et un mot de passe : tout ce que tu as saisi en invité est conservé.',
};

export default function Authentification({ mode }) {
  const { utilisateur, connexion, inscription } = useAuth();
  const estInvite = Boolean(utilisateur?.estInvite);
  const textes = mode === 'inscription' && estInvite ? TEXTES_INSCRIPTION_INVITE : TEXTES[mode];
  useTitre(textes.titre);
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // Passage de /connexion à /inscription : on repart d'un formulaire sans erreur.
  useEffect(() => setErreur(null), [mode]);

  // Un invité peut rester ici (pour sauvegarder ou changer de compte) ; un compte est redirigé.
  if (utilisateur && !estInvite) {
    return profilComplet(utilisateur)
      ? <Navigate to={location.state?.depuis ?? ACCUEIL_CONNECTE} replace />
      : <Navigate to="/bienvenue/profil" state={location.state} replace />;
  }

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      // En cas de succès, `utilisateur` est renseigné et le <Navigate> ci-dessus prend le relais.
      await (mode === 'connexion' ? connexion : inscription)({ email, motDePasse });
    } catch (err) {
      setErreur(err);
      setEnvoiEnCours(false);
    }
  }

  const erreurChamp = (champ) => erreur?.champs?.[champ];
  const erreurGenerale = erreur && !erreurChamp('email') && !erreurChamp('motDePasse') ? erreur.message : null;

  return (
    <section className="auth">
      <h1>{textes.titre}</h1>
      <p className="auth-sous-titre">{textes.sousTitre}</p>

      <form className="carte formulaire" onSubmit={soumettre} noValidate>
        {erreurGenerale && <p className="alerte" role="alert">{erreurGenerale}</p>}
        {mode === 'connexion' && estInvite && (
          <p className="info">
            Tu es en mode invité. Si tu te connectes à un compte existant, les données saisies en invité ne
            seront pas reprises. Pour les garder, <Link to="/inscription">crée plutôt un compte</Link>.
          </p>
        )}

        <div className={`champ${erreurChamp('email') ? ' champ-erreur' : ''}`}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(erreurChamp('email'))}
            aria-describedby={erreurChamp('email') ? 'email-erreur' : undefined}
          />
          {erreurChamp('email') && <p id="email-erreur" className="message-erreur">{erreurChamp('email')}</p>}
        </div>

        <div className={`champ${erreurChamp('motDePasse') ? ' champ-erreur' : ''}`}>
          <label htmlFor="motDePasse">Mot de passe</label>
          <div className="champ-saisie">
            <input
              id="motDePasse"
              type={motDePasseVisible ? 'text' : 'password'}
              autoComplete={textes.autoCompleteMotDePasse}
              required
              minLength={mode === 'inscription' ? 8 : undefined}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              aria-invalid={Boolean(erreurChamp('motDePasse'))}
              aria-describedby="motDePasse-aide"
            />
            <button
              type="button"
              className="bouton-afficher"
              onClick={() => setMotDePasseVisible((v) => !v)}
              aria-pressed={motDePasseVisible}
            >
              {motDePasseVisible ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          {erreurChamp('motDePasse') ? (
            <p id="motDePasse-aide" className="message-erreur">{erreurChamp('motDePasse')}</p>
          ) : (
            mode === 'inscription' && <p id="motDePasse-aide" className="aide">8 caractères minimum</p>
          )}
        </div>

        <button type="submit" className="bouton-principal" disabled={envoiEnCours}>
          {envoiEnCours ? textes.enCours : textes.bouton}
        </button>
      </form>

      <p className="auth-bascule">
        {textes.bascule.texte}{' '}
        <Link to={textes.bascule.lien} state={location.state}>{textes.bascule.action}</Link>
      </p>
    </section>
  );
}
