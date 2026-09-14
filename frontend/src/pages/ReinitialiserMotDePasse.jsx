import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';

export default function ReinitialiserMotDePasse() {
  useTitre('Nouveau mot de passe');
  const [parametres] = useSearchParams();
  const jeton = parametres.get('jeton') ?? '';
  const navigate = useNavigate();

  const [motDePasse, setMotDePasse] = useState('');
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  if (!jeton) {
    return (
      <section className="auth">
        <h1>Lien invalide</h1>
        <p className="auth-sous-titre">Ce lien de réinitialisation est incomplet ou mal copié.</p>
        <p className="auth-bascule"><Link to="/mot-de-passe-oublie">Redemander un lien</Link></p>
      </section>
    );
  }

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await appelerApi('/auth/reinitialiser-mot-de-passe', { methode: 'POST', corps: { jeton, motDePasse } });
      navigate('/connexion', { state: { motDePasseReinitialise: true } });
    } catch (err) {
      setErreur(err);
      setEnvoiEnCours(false);
    }
  }

  return (
    <section className="auth">
      <h1>Choisis un nouveau mot de passe</h1>

      <form className="carte formulaire" onSubmit={soumettre} noValidate>
        {erreur && <p className="alerte" role="alert">{erreur.message}</p>}
        <div className="champ">
          <label htmlFor="motDePasse">Nouveau mot de passe</label>
          <div className="champ-saisie">
            <input
              id="motDePasse"
              type={motDePasseVisible ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
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
          <p id="motDePasse-aide" className="aide">8 caractères minimum</p>
        </div>
        <button type="submit" className="bouton-principal" disabled={envoiEnCours}>
          {envoiEnCours ? 'Enregistrement…' : 'Choisir ce mot de passe'}
        </button>
      </form>
    </section>
  );
}
