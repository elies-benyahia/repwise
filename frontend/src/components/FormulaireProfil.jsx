import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { ageDepuisJour, aujourdhui } from '../lib/dates.js';
import { versNombre } from '../lib/format.js';
import { NIVEAUX_EXPERIENCE } from '../lib/profil.js';
import ChampNumerique from './ChampNumerique.jsx';

const AGE_MIN = 10;
const AGE_MAX = 100;

// Pseudo, date de naissance, taille, poids et niveau déclaré. Utilisé par la page Profil
// (réglages) pour corriger ce que l'onboarding a rempli.
export default function FormulaireProfil({ utilisateur, libelleBouton, onEnregistre }) {
  const { mettreAJourProfil } = useAuth();

  const [saisie, setSaisie] = useState(() => ({
    pseudo: utilisateur.pseudo ?? '',
    dateNaissance: utilisateur.dateNaissance ?? '',
    taille: utilisateur.taille != null ? String(utilisateur.taille) : '',
    poids: utilisateur.poids != null ? String(utilisateur.poids).replace('.', ',') : '',
    niveauExperience: utilisateur.niveauExperience ?? '',
  }));
  const [afficherErreurs, setAfficherErreurs] = useState(false);
  const [erreursServeur, setErreursServeur] = useState({});
  const [erreurGenerale, setErreurGenerale] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const age = ageDepuisJour(saisie.dateNaissance);
  const profil = {
    pseudo: saisie.pseudo.trim(),
    dateNaissance: saisie.dateNaissance,
    taille: Math.round(versNombre(saisie.taille)),
    poids: versNombre(saisie.poids),
    niveauExperience: saisie.niveauExperience,
  };
  const erreursLocales = {
    ...(!profil.pseudo && { pseudo: 'Indique ton pseudo' }),
    ...(!(age >= AGE_MIN && age <= AGE_MAX) && { dateNaissance: `Entre ${AGE_MIN} et ${AGE_MAX} ans` }),
    ...(!(profil.taille >= 120 && profil.taille <= 230) && { taille: 'Entre 120 et 230 cm' }),
    ...(!(profil.poids >= 30 && profil.poids <= 300) && { poids: 'Entre 30 et 300 kg' }),
    ...(!profil.niveauExperience && { niveauExperience: 'Choisis ton niveau' }),
  };
  const erreurs = afficherErreurs ? { ...erreursServeur, ...erreursLocales } : erreursServeur;

  const modifier = (champ) => (e) => {
    setSaisie((s) => ({ ...s, [champ]: e.target.value }));
    setErreursServeur(({ [champ]: _, ...autres }) => autres);
  };

  async function soumettre(e) {
    e.preventDefault();
    setErreurGenerale(null);
    if (Object.keys(erreursLocales).length > 0) {
      setAfficherErreurs(true);
      return;
    }
    setEnvoiEnCours(true);
    try {
      await mettreAJourProfil(profil);
      await onEnregistre?.();
    } catch (err) {
      setErreursServeur(err.champs ?? {});
      if (!err.champs) setErreurGenerale(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <form className="carte formulaire" onSubmit={soumettre} noValidate>
      {erreurGenerale && <p className="alerte" role="alert">{erreurGenerale}</p>}

      <div className={`champ${erreurs.pseudo ? ' champ-erreur' : ''}`}>
        <label htmlFor="pseudo">Pseudo</label>
        <input
          id="pseudo"
          type="text"
          autoComplete="nickname"
          maxLength={50}
          value={saisie.pseudo}
          onChange={modifier('pseudo')}
          aria-invalid={Boolean(erreurs.pseudo)}
          aria-describedby={erreurs.pseudo ? 'pseudo-erreur' : undefined}
        />
        {erreurs.pseudo && <p id="pseudo-erreur" className="message-erreur">{erreurs.pseudo}</p>}
      </div>

      <div className={`champ${erreurs.dateNaissance ? ' champ-erreur' : ''}`}>
        <label htmlFor="dateNaissance">Date de naissance</label>
        <input
          id="dateNaissance"
          type="date"
          max={aujourdhui()}
          value={saisie.dateNaissance}
          onChange={modifier('dateNaissance')}
          aria-invalid={Boolean(erreurs.dateNaissance)}
        />
        {erreurs.dateNaissance && <p className="message-erreur">{erreurs.dateNaissance}</p>}
      </div>

      <div className="champs-mesures champs-mesures-2">
        <ChampNumerique
          id="taille" label="Taille" unite="cm" inputMode="numeric"
          valeur={saisie.taille} onChange={modifier('taille')} erreur={erreurs.taille}
        />
        <ChampNumerique
          id="poids" label="Poids" unite="kg" inputMode="decimal"
          valeur={saisie.poids} onChange={modifier('poids')} erreur={erreurs.poids}
        />
      </div>

      <fieldset className="groupe" aria-describedby={erreurs.niveauExperience ? 'niveau-erreur' : undefined}>
        <legend>Depuis combien de temps tu fais de la muscu ?</legend>
        <div className="liste-choix">
          {Object.entries(NIVEAUX_EXPERIENCE).map(([cle, niveau]) => (
            <label key={cle} className="choix">
              <input
                type="radio"
                name="niveauExperience"
                value={cle}
                checked={saisie.niveauExperience === cle}
                onChange={modifier('niveauExperience')}
              />
              <span className="choix-texte">
                <strong>{niveau.label}</strong>
                <small>{niveau.duree}</small>
              </span>
            </label>
          ))}
        </div>
        {erreurs.niveauExperience && (
          <p id="niveau-erreur" className="message-erreur">{erreurs.niveauExperience}</p>
        )}
      </fieldset>

      <button type="submit" className="bouton-principal" disabled={envoiEnCours}>
        {envoiEnCours ? 'Enregistrement…' : libelleBouton}
      </button>
    </form>
  );
}
