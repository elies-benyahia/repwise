import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';

const TYPES = [['suggestion', 'Suggestion'], ['bug', 'Bug']];

// Accessible sans compte. Avec une session, le retour est rattaché à l'utilisateur côté API.
export default function Feedback() {
  useTitre('Feedback');
  const { utilisateur } = useAuth();
  const [type, setType] = useState('suggestion');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(utilisateur?.email ?? '');
  const [erreurs, setErreurs] = useState({});
  const [erreurGenerale, setErreurGenerale] = useState(null);
  const [etat, setEtat] = useState('saisie'); // saisie | envoi | envoye
  // Anti-spam (retour du 21/09) : honeypot, jamais rempli par un humain — voir feedback/routes.js.
  const [siteWeb, setSiteWeb] = useState('');

  async function envoyer(e) {
    e.preventDefault();
    setErreurGenerale(null);
    const texte = description.trim();
    if (texte.length < 10) {
      setErreurs({ description: 'Quelques mots de plus (10 caractères minimum)' });
      return;
    }
    setErreurs({});
    setEtat('envoi');
    try {
      await appelerApi('/feedback', { methode: 'POST', corps: { type, description: texte, emailContact: email.trim(), siteWeb } });
      setEtat('envoye');
    } catch (err) {
      setErreurs(err.champs ?? {});
      if (!err.champs) setErreurGenerale(err.message);
      setEtat('saisie');
    }
  }

  if (etat === 'envoye') {
    return (
      <section className="auth">
        <h1>Merci !</h1>
        <p className="auth-sous-titre">
          Ton message est bien arrivé. Chaque retour aide à améliorer Repwise.
        </p>
        <button type="button" className="bouton-secondaire" onClick={() => { setDescription(''); setEtat('saisie'); }}>
          Envoyer un autre message
        </button>
        <p className="auth-bascule"><Link to="/">Retour à l'accueil</Link></p>
      </section>
    );
  }

  return (
    <section className="auth">
      <h1>Une idée ? Un bug ?</h1>
      <p className="auth-sous-titre">Propose une fonctionnalité ou signale un problème. Pas besoin de compte.</p>

      <form className="carte formulaire" onSubmit={envoyer} noValidate>
        {erreurGenerale && <p className="alerte" role="alert">{erreurGenerale}</p>}

        <input
          type="text"
          name="site_web"
          value={siteWeb}
          onChange={(e) => setSiteWeb(e.target.value)}
          className="visuellement-cache"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <fieldset className="groupe">
          <legend>Type de retour</legend>
          <div className="segmente">
            {TYPES.map(([cle, label]) => (
              <label key={cle} className="segment">
                <input type="radio" name="type" value={cle} checked={type === cle} onChange={() => setType(cle)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={`champ champ-notes${erreurs.description ? ' champ-erreur' : ''}`}>
          <label htmlFor="description">{type === 'bug' ? 'Que s’est-il passé ?' : 'Ton idée'}</label>
          <textarea
            id="description"
            rows={6}
            maxLength={2000}
            placeholder={type === 'bug'
              ? 'Sur quelle page, ce que tu as fait, ce que tu attendais…'
              : 'Ce qui te manque, ce qui te ferait gagner du temps…'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={Boolean(erreurs.description)}
            aria-describedby="description-aide"
          />
          <p id="description-aide" className={erreurs.description ? 'message-erreur' : 'aide'}>
            {erreurs.description ?? `${description.trim().length} / 2000`}
          </p>
        </div>

        <div className={`champ${erreurs.emailContact ? ' champ-erreur' : ''}`}>
          <label htmlFor="email-contact">Email (facultatif)</label>
          <input
            id="email-contact"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="Pour qu'on puisse te répondre"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(erreurs.emailContact)}
          />
          {erreurs.emailContact && <p className="message-erreur">{erreurs.emailContact}</p>}
        </div>

        <button type="submit" className="bouton-principal" disabled={etat === 'envoi'}>
          {etat === 'envoi' ? 'Envoi…' : 'Envoyer'}
        </button>
      </form>
    </section>
  );
}
