import { useState } from 'react';
import { Link } from 'react-router';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';

// Toujours le même message de succès, que l'email existe ou non côté serveur (cohérent avec
// /auth/mot-de-passe-oublie qui répond pareil dans les deux cas — pas d'énumération de comptes).
export default function MotDePasseOublie() {
  useTitre('Mot de passe oublié');
  const [email, setEmail] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await appelerApi('/auth/mot-de-passe-oublie', { methode: 'POST', corps: { email } });
      setEnvoye(true);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (envoye) {
    return (
      <section className="auth">
        <h1>Vérifie tes emails</h1>
        <p className="auth-sous-titre">
          Si un compte existe avec l'adresse <strong>{email}</strong>, un lien pour choisir un
          nouveau mot de passe vient de t'être envoyé. Le lien expire dans une heure.
        </p>
        <p className="auth-bascule">
          <Link to="/connexion">Retour à la connexion</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="auth">
      <h1>Mot de passe oublié</h1>
      <p className="auth-sous-titre">Indique ton email : on t'envoie un lien pour en choisir un nouveau.</p>

      <form className="carte formulaire" onSubmit={soumettre} noValidate>
        {erreur && <p className="alerte" role="alert">{erreur}</p>}
        <div className="champ">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" className="bouton-principal" disabled={envoiEnCours}>
          {envoiEnCours ? 'Envoi…' : 'Envoyer le lien'}
        </button>
      </form>

      <p className="auth-bascule">
        <Link to="/connexion">Retour à la connexion</Link>
      </p>
    </section>
  );
}
