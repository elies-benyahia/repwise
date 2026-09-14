import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import BarreProgressionEtapes from '../components/BarreProgressionEtapes.jsx';
import ResultatMacros from '../components/ResultatMacros.jsx';
import RouePicker from '../components/RouePicker.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { calculerBesoins } from '../lib/calculs.js';
import { ageDepuisJour, aujourdhui, depuisCle } from '../lib/dates.js';
import {
  niveauActiviteDepuisFrequence, objectifDepuisDeclare, OBJECTIFS_DECLARES,
} from '../lib/onboarding.js';
import { profilComplet } from '../lib/profil.js';
import { ACCUEIL_CONNECTE } from '../navigation.js';

const LIBELLES_ETAPES = ['Ton profil', 'Fréquence et objectif', 'Ton programme', 'Sauvegarder'];
const AGE_MIN = 10;
const AGE_MAX = 100;
const FREQUENCES = [0, 1, 2, 3, 4, 5, 6, 7];

// Refonte post-test utilisateur : onboarding en 4 étapes courtes plutôt qu'un seul grand
// formulaire. Les 3 premières sont locales (aucun appel réseau, donc pas besoin de compte pour
// voir le résultat) ; la 4e propose de créer un compte pour ne rien perdre.
export default function Bienvenue() {
  useTitre('Bienvenue');
  const { utilisateur, chargement } = useAuth();
  const location = useLocation();

  if (chargement) return null;
  if (utilisateur && profilComplet(utilisateur)) {
    return <Navigate to={location.state?.depuis ?? ACCUEIL_CONNECTE} replace />;
  }
  return <AssistantOnboarding utilisateur={utilisateur} depuis={location.state?.depuis} />;
}

function AssistantOnboarding({ utilisateur, depuis }) {
  const navigate = useNavigate();
  const { mettreAJourProfil, enregistrerObjectif } = useAuth();
  const [etape, setEtape] = useState(1);
  const [afficherErreurs, setAfficherErreurs] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [donnees, setDonnees] = useState(() => ({
    pseudo: utilisateur?.pseudo ?? '',
    dateNaissance: '',
    sexe: utilisateur?.sexe ?? 'homme',
    poids: utilisateur?.poids ?? null,
    taille: utilisateur?.taille ?? null,
    frequenceSeances: utilisateur?.frequenceSeances ?? 3,
    objectifDeclare: utilisateur?.objectifDeclare ?? '',
  }));

  const modifier = (champs) => setDonnees((d) => ({ ...d, ...champs }));

  const age = ageDepuisJour(donnees.dateNaissance);
  const erreursEtape1 = {
    pseudo: donnees.pseudo.trim() ? null : 'Choisis un pseudo',
    dateNaissance: age !== null && age >= AGE_MIN && age <= AGE_MAX ? null : `Entre ${AGE_MIN} et ${AGE_MAX} ans`,
    poids: donnees.poids ? null : 'Choisis ton poids',
    taille: donnees.taille ? null : 'Choisis ta taille',
  };
  const etape1Valide = Object.values(erreursEtape1).every((e) => !e);
  const etape2Valide = Boolean(donnees.objectifDeclare);

  // Calculé dès que les données nécessaires existent, pour l'aperçu de l'étape 3.
  const resultat = useMemo(() => {
    if (!etape1Valide || !etape2Valide) return null;
    return calculerBesoins({
      sexe: donnees.sexe,
      poids: donnees.poids,
      taille: donnees.taille,
      age,
      niveauActivite: niveauActiviteDepuisFrequence(donnees.frequenceSeances),
      objectif: objectifDepuisDeclare(donnees.objectifDeclare),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `age` dérive de dateNaissance, déjà suivi.
  }, [etape1Valide, etape2Valide, donnees.sexe, donnees.poids, donnees.taille, donnees.frequenceSeances, donnees.objectifDeclare]);

  function allerA(n) {
    setAfficherErreurs(false);
    setEtape(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function suivant() {
    if (etape === 1 && !etape1Valide) return setAfficherErreurs(true);
    if (etape === 2 && !etape2Valide) return setAfficherErreurs(true);
    allerA(etape + 1);
  }

  // Appelée à la toute fin : `actionCompte` ouvre la session (inscription ou invité) si besoin,
  // puis le profil et l'objectif calculé sont enregistrés dans tous les cas.
  async function finaliser(actionCompte) {
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      if (actionCompte) await actionCompte();
      await mettreAJourProfil({
        pseudo: donnees.pseudo.trim(),
        dateNaissance: donnees.dateNaissance,
        taille: donnees.taille,
        poids: donnees.poids,
        frequenceSeances: donnees.frequenceSeances,
        objectifDeclare: donnees.objectifDeclare,
      });
      await enregistrerObjectif({
        calories: resultat.calories,
        proteines: resultat.proteines,
        glucides: resultat.glucides,
        lipides: resultat.lipides,
        sexe: donnees.sexe,
        niveauActivite: niveauActiviteDepuisFrequence(donnees.frequenceSeances),
        objectif: objectifDepuisDeclare(donnees.objectifDeclare),
      });
      navigate(depuis ?? ACCUEIL_CONNECTE, { replace: true });
    } catch (err) {
      setErreur(err.message);
      setEnvoiEnCours(false);
    }
  }

  return (
    <section className="onboarding">
      <BarreProgressionEtapes etape={etape} total={4} libelles={LIBELLES_ETAPES} />

      {etape === 1 && (
        <EtapeProfil
          donnees={donnees}
          erreurs={afficherErreurs ? erreursEtape1 : {}}
          onChange={modifier}
          onSuivant={suivant}
        />
      )}
      {etape === 2 && (
        <EtapeFrequenceObjectif
          donnees={donnees}
          erreurs={afficherErreurs ? { objectifDeclare: etape2Valide ? null : 'Choisis un objectif' } : {}}
          onChange={modifier}
          onSuivant={suivant}
          onPrecedent={() => allerA(1)}
        />
      )}
      {etape === 3 && resultat && (
        <EtapeProgramme resultat={resultat} poids={donnees.poids} onSuivant={suivant} onPrecedent={() => allerA(2)} />
      )}
      {etape === 4 && resultat && (
        <EtapeCompte
          utilisateur={utilisateur}
          erreur={erreur}
          envoiEnCours={envoiEnCours}
          onFinaliser={finaliser}
          onPrecedent={() => allerA(3)}
        />
      )}
    </section>
  );
}

function EtapeProfil({ donnees, erreurs, onChange, onSuivant }) {
  return (
    <div className="carte formulaire">
      <h1>Parle-nous de toi</h1>

      <div className={`champ${erreurs.pseudo ? ' champ-erreur' : ''}`}>
        <label htmlFor="pseudo">Pseudo</label>
        <input
          id="pseudo"
          type="text"
          maxLength={50}
          autoComplete="nickname"
          placeholder="Comment on t'appelle ?"
          value={donnees.pseudo}
          onChange={(e) => onChange({ pseudo: e.target.value })}
          aria-invalid={Boolean(erreurs.pseudo)}
        />
        {erreurs.pseudo && <p className="message-erreur">{erreurs.pseudo}</p>}
      </div>

      <div className={`champ${erreurs.dateNaissance ? ' champ-erreur' : ''}`}>
        <label htmlFor="dateNaissance">Date de naissance</label>
        <input
          id="dateNaissance"
          type="date"
          max={aujourdhui()}
          value={donnees.dateNaissance}
          onChange={(e) => onChange({ dateNaissance: e.target.value })}
          aria-invalid={Boolean(erreurs.dateNaissance)}
        />
        {erreurs.dateNaissance && <p className="message-erreur">{erreurs.dateNaissance}</p>}
      </div>

      <fieldset className="groupe">
        <legend>Tu es</legend>
        <div className="segmente">
          {[['homme', 'Homme'], ['femme', 'Femme']].map(([valeur, label]) => (
            <label key={valeur} className="segment">
              <input
                type="radio"
                name="sexe"
                value={valeur}
                checked={donnees.sexe === valeur}
                onChange={() => onChange({ sexe: valeur })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="roues">
        <RouePicker
          id="poids" label="Poids" unite="kg" min={30} max={300}
          valeur={donnees.poids} onChange={(v) => onChange({ poids: v })}
        />
        <RouePicker
          id="taille" label="Taille" unite="cm" min={120} max={230}
          valeur={donnees.taille} onChange={(v) => onChange({ taille: v })}
        />
      </div>
      {(erreurs.poids || erreurs.taille) && (
        <p className="message-erreur">{erreurs.poids || erreurs.taille}</p>
      )}

      <button type="button" className="bouton-principal" onClick={onSuivant}>Continuer</button>
    </div>
  );
}

function EtapeFrequenceObjectif({ donnees, erreurs, onChange, onSuivant, onPrecedent }) {
  return (
    <div className="carte formulaire">
      <h1>Ton rythme et ton objectif</h1>

      <fieldset className="groupe">
        <legend>Séances de sport par semaine</legend>
        <div className="frequence-choix" role="radiogroup" aria-label="Séances de sport par semaine">
          {FREQUENCES.map((n) => (
            <label key={n} className="frequence-bouton">
              <input
                type="radio"
                name="frequenceSeances"
                checked={donnees.frequenceSeances === n}
                onChange={() => onChange({ frequenceSeances: n })}
              />
              <span>{n === 7 ? '7+' : n}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={`groupe${erreurs.objectifDeclare ? ' champ-erreur' : ''}`}>
        <legend>Ton objectif</legend>
        <div className="liste-choix">
          {Object.entries(OBJECTIFS_DECLARES).map(([cle, objectif]) => (
            <label key={cle} className="choix">
              <input
                type="radio"
                name="objectifDeclare"
                value={cle}
                checked={donnees.objectifDeclare === cle}
                onChange={() => onChange({ objectifDeclare: cle })}
              />
              <span className="choix-texte">
                <strong>{objectif.label}</strong>
                <small>{objectif.description}</small>
              </span>
            </label>
          ))}
        </div>
        {erreurs.objectifDeclare && <p className="message-erreur">{erreurs.objectifDeclare}</p>}
      </fieldset>

      <div className="barre-etapes-actions">
        <button type="button" className="bouton-secondaire" onClick={onPrecedent}>Retour</button>
        <button type="button" className="bouton-principal" onClick={onSuivant}>Continuer</button>
      </div>
    </div>
  );
}

function EtapeProgramme({ resultat, poids, onSuivant, onPrecedent }) {
  const debut = depuisCle(aujourdhui());
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 30);

  return (
    <div>
      <h1>Ton programme sur 1 mois</h1>
      <p className="auth-sous-titre">
        Calculé à partir de ton profil. Vise ces chiffres chaque jour jusqu'au{' '}
        {fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} — tu pourras les
        recalculer à tout moment.
      </p>

      <ResultatMacros resultat={resultat} poids={poids} titre="Ton programme quotidien" />

      <p className="aide onboarding-programme-note">
        Valable du {debut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au{' '}
        {fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}. Sauvegarde-le à
        l'étape suivante pour le suivre dans ton Journal alimentaire.
      </p>

      <div className="barre-etapes-actions">
        <button type="button" className="bouton-secondaire" onClick={onPrecedent}>Retour</button>
        <button type="button" className="bouton-principal" onClick={onSuivant}>Sauvegarder ce programme</button>
      </div>
    </div>
  );
}

function EtapeCompte({ utilisateur, erreur, envoiEnCours, onFinaliser, onPrecedent }) {
  const { inscription, continuerEnInvite } = useAuth();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [champs, setChamps] = useState({});

  // Un utilisateur (compte ou invité) existe déjà : rien à proposer, on enregistre et c'est tout.
  if (utilisateur) {
    return (
      <div className="carte formulaire">
        <h1>C'est prêt</h1>
        <p className="auth-sous-titre">On enregistre tout ça sur ton profil.</p>
        {erreur && <p className="alerte" role="alert">{erreur}</p>}
        <div className="barre-etapes-actions">
          <button type="button" className="bouton-secondaire" onClick={onPrecedent} disabled={envoiEnCours}>Retour</button>
          <button type="button" className="bouton-principal" onClick={() => onFinaliser()} disabled={envoiEnCours}>
            {envoiEnCours ? 'Enregistrement…' : 'Terminer'}
          </button>
        </div>
      </div>
    );
  }

  async function creerCompte(e) {
    e.preventDefault();
    setChamps({});
    await onFinaliser(async () => {
      try {
        await inscription({ email, motDePasse });
      } catch (err) {
        setChamps(err.champs ?? {});
        throw err;
      }
    });
  }

  return (
    <div>
      <h1>Sauvegarde ton programme</h1>
      <p className="auth-sous-titre">
        Crée un compte pour le retrouver sur tous tes appareils — sans compte, tu le perds si tu
        fermes l'application.
      </p>

      <form className="carte formulaire" onSubmit={creerCompte} noValidate>
        {erreur && !champs.email && !champs.motDePasse && <p className="alerte" role="alert">{erreur}</p>}

        <div className={`champ${champs.email ? ' champ-erreur' : ''}`}>
          <label htmlFor="email">Email</label>
          <input
            id="email" type="email" autoComplete="email" inputMode="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(champs.email)}
          />
          {champs.email && <p className="message-erreur">{champs.email}</p>}
        </div>

        <div className={`champ${champs.motDePasse ? ' champ-erreur' : ''}`}>
          <label htmlFor="motDePasse">Mot de passe</label>
          <input
            id="motDePasse" type="password" autoComplete="new-password" minLength={8} required
            value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
            aria-invalid={Boolean(champs.motDePasse)}
            aria-describedby="motDePasse-aide"
          />
          {champs.motDePasse
            ? <p id="motDePasse-aide" className="message-erreur">{champs.motDePasse}</p>
            : <p id="motDePasse-aide" className="aide">8 caractères minimum</p>}
        </div>

        <button type="submit" className="bouton-principal" disabled={envoiEnCours}>
          {envoiEnCours ? 'Enregistrement…' : 'Créer mon compte et sauvegarder'}
        </button>
      </form>

      <div className="onboarding-invite">
        <p className="aide">Tu préfères tester d'abord ? Tu pourras créer un compte plus tard.</p>
        <button
          type="button"
          className="bouton-secondaire"
          disabled={envoiEnCours}
          onClick={() => onFinaliser(continuerEnInvite)}
        >
          Continuer sans compte
        </button>
        <p className="aide">En mode invité, tu perds ce programme si tu ne sauvegardes pas avant de fermer l'application.</p>
      </div>

      <p className="auth-bascule">
        <button type="button" className="lien" onClick={onPrecedent} disabled={envoiEnCours}>‹ Retour</button>
      </p>
      <p className="auth-bascule">
        Déjà un compte ? <Link to="/connexion">Se connecter</Link>
      </p>
    </div>
  );
}
