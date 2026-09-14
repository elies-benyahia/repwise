import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import BadgeRang from '../components/BadgeRang.jsx';
import FormulaireProfil from '../components/FormulaireProfil.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi, envoyerFichier } from '../lib/api.js';
import { ajouterJours, aujourdhui, formaterJour } from '../lib/dates.js';
import { NIVEAUX_EXPERIENCE } from '../lib/profil.js';
import { libelleRang } from '../lib/rangs.js';
import { libelleSeance } from '../lib/seances.js';
import { THEMES_COULEUR } from '../lib/theme.js';
import { useThemeCouleur } from '../theme/ThemeCouleurContext.jsx';

const LIENS = [
  ['/rang', 'Mon rang', 'Progression, quêtes du jour et de la semaine'],
  ['/progression', 'Ma progression', 'Poids de corps et charges soulevées (toujours privé)'],
  ['/programmes', 'Mes programmes', 'Tes séances types'],
  ['/classement', 'Classement', 'Le top 100 des GOAT'],
  ['/', 'Recalculer mon objectif', 'Calories et macros, à refaire quand ton poids change'],
  ['/feedback', 'Une idée, un bug ?', 'Écris-nous'],
];

export default function Profil() {
  useTitre('Profil');
  const { utilisateur, deconnexion } = useAuth();
  const [enregistre, setEnregistre] = useState(false);
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false);

  async function seDeconnecter() {
    setDeconnexionEnCours(true);
    try {
      await deconnexion();
    } finally {
      setDeconnexionEnCours(false);
    }
  }

  return (
    <section className="profil">
      <div className="carte profil-entete">
        <PhotoProfil utilisateur={utilisateur} />
        {utilisateur.rang && <BadgeRang rang={utilisateur.rang} taille={44} />}
        <div>
          <h1>{utilisateur.pseudo}</h1>
          <p className="aide">
            {utilisateur.rang ? `Rang ${libelleRang(utilisateur.rang)} · ` : ''}
            Niveau déclaré : {NIVEAUX_EXPERIENCE[utilisateur.niveauExperience]?.label}
          </p>
          <p className="aide">{utilisateur.estInvite ? 'Mode invité' : utilisateur.email}</p>
        </div>
      </div>

      <div className="profil-grille">
        <div className="profil-colonne">
          <h2 className="titre-section">Mes infos</h2>
          {enregistre && <p className="info" role="status">Profil enregistré.</p>}
          <FormulaireProfil
            utilisateur={utilisateur}
            libelleBouton="Enregistrer"
            onEnregistre={() => setEnregistre(true)}
          />
          <p className="aide">Chaque poids enregistré s'ajoute à ta courbe de poids de corps.</p>

          <ThemeCouleurSelecteur />
          <BioEtVisibilite utilisateur={utilisateur} />
        </div>

        <div className="profil-colonne">
          <SeancesRecentes />

          <ul className="liste-liens">
            {LIENS.map(([vers, titre, detail]) => (
              <li key={vers}>
                <Link to={vers} className="carte-seance">
                  <span className="carte-seance-titre">{titre}</span>
                  <span className="carte-seance-detail">{detail}</span>
                  <span className="carte-seance-fleche" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
            {utilisateur.role === 'admin' && (
              <li>
                <Link to="/admin" className="carte-seance">
                  <span className="carte-seance-titre">Administration</span>
                  <span className="carte-seance-detail">Utilisateurs, rangs, feedbacks</span>
                  <span className="carte-seance-fleche" aria-hidden="true">›</span>
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>

      <h2 className="titre-section">Compte</h2>
      {utilisateur.estInvite ? (
        <div className="carte appel-compte">
          <p>Tu es en mode invité : tes données sont liées à ce navigateur.</p>
          <Link to="/inscription" className="bouton-principal">Sauvegarder mon historique</Link>
        </div>
      ) : (
        <button type="button" className="bouton-secondaire" onClick={seDeconnecter} disabled={deconnexionEnCours}>
          Se déconnecter
        </button>
      )}
    </section>
  );
}

function PhotoProfil({ utilisateur }) {
  const { rafraichir } = useAuth();
  const refFichier = useRef(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function choisir(e) {
    const fichier = e.target.files?.[0];
    e.target.value = ''; // permet de resélectionner le même fichier ensuite
    if (!fichier) return;
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await envoyerFichier('/profil/photo', { champ: 'photo', fichier });
      await rafraichir();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function retirer() {
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await appelerApi('/profil/photo', { methode: 'DELETE' });
      await rafraichir();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div className="photo-profil">
      <button
        type="button"
        className="photo-profil-bouton"
        onClick={() => refFichier.current?.click()}
        disabled={envoiEnCours}
        aria-label="Changer ma photo de profil"
      >
        {utilisateur.photoUrl
          ? <img src={utilisateur.photoUrl} alt="" className="photo-profil-image" />
          : <span className="photo-profil-vide" aria-hidden="true">{utilisateur.pseudo?.[0]?.toUpperCase()}</span>}
      </button>
      <input
        ref={refFichier}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="visuellement-cache"
        onChange={choisir}
      />
      {utilisateur.photoUrl && (
        <button type="button" className="bouton-texte" onClick={retirer} disabled={envoiEnCours}>Retirer la photo</button>
      )}
      {erreur && <p className="message-erreur">{erreur}</p>}
    </div>
  );
}

// Choix de couleur d'accent (cahier, demandé le 14/09 : "changer la couleur de fond et de la
// nav bar") — ne touche que la teinte d'accent (CTA, liens, nav, glow du fond animé), voir
// frontend/src/lib/theme.js. Purement cosmétique/client (localStorage), pas de compte requis.
function ThemeCouleurSelecteur() {
  const { theme, definirTheme } = useThemeCouleur();
  return (
    <div className="carte">
      <h2 className="titre-section titre-section-rapproche">Couleur du site</h2>
      <p className="aide">S'applique aux boutons, à la navigation et au fond animé.</p>
      <div className="liste-themes-couleur">
        {Object.entries(THEMES_COULEUR).map(([id, { label, swatch }]) => (
          <button
            key={id}
            type="button"
            className="theme-couleur-bouton"
            aria-pressed={theme === id}
            onClick={() => definirTheme(id)}
          >
            <span className="theme-couleur-pastille" style={{ background: swatch }} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BioEtVisibilite({ utilisateur }) {
  const { mettreAJourProfil } = useAuth();
  const [bio, setBio] = useState(utilisateur.bio ?? '');
  const [profilPublic, setProfilPublic] = useState(utilisateur.profilPublic);
  const [etat, setEtat] = useState('repos'); // repos | envoi | enregistre
  const [erreur, setErreur] = useState(null);

  async function enregistrer(e) {
    e.preventDefault();
    setErreur(null);
    setEtat('envoi');
    try {
      await mettreAJourProfil({ bio, profilPublic });
      setEtat('enregistre');
    } catch (err) {
      setErreur(err.message);
      setEtat('repos');
    }
  }

  return (
    <form className="carte formulaire formulaire-bio" onSubmit={enregistrer}>
      <h2 className="titre-section titre-section-rapproche">Bio et visibilité</h2>
      {erreur && <p className="alerte" role="alert">{erreur}</p>}
      {etat === 'enregistre' && <p className="info" role="status">Enregistré.</p>}

      <div className="champ champ-notes">
        <label htmlFor="bio">Ta bio</label>
        <textarea
          id="bio"
          rows={3}
          maxLength={280}
          placeholder="Quelques mots sur toi, tes objectifs, ta salle…"
          value={bio}
          onChange={(e) => { setBio(e.target.value); setEtat('repos'); }}
        />
        <p className="aide">{bio.length} / 280</p>
      </div>

      <label className="case-visibilite">
        <input
          type="checkbox"
          checked={profilPublic}
          onChange={(e) => { setProfilPublic(e.target.checked); setEtat('repos'); }}
        />
        <span>
          <strong>Rendre mes séances récentes visibles</strong>
          <small>
            Si tu atteins un jour le rang GOAT, d'autres pourront voir ton profil dans le
            classement. Ce réglage décide si tes séances récentes y apparaissent — ton poids et
            tes courbes de charge, eux, restent toujours privés, quoi qu'il arrive.
          </small>
        </span>
      </label>

      <button type="submit" className="bouton-secondaire" disabled={etat === 'envoi'}>
        {etat === 'envoi' ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  );
}

// Recap privé : toujours visible par son propriétaire, quel que soit le réglage de visibilité
// (qui ne concerne que ce que les AUTRES voient sur le profil public du classement).
function SeancesRecentes() {
  const [seances, setSeances] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    const fin = aujourdhui();
    const debut = ajouterJours(fin, -30);
    appelerApi(`/seances?debut=${debut}&fin=${fin}`)
      .then((d) => setSeances([...d.seances].reverse().slice(0, 5)))
      .catch((err) => setErreur(err.message));
  }, []);

  return (
    <div>
      <h2 className="titre-section">Mes séances récentes</h2>
      {erreur && <p className="alerte" role="alert">{erreur}</p>}
      {!seances && !erreur && <p className="aide">Chargement…</p>}
      {seances?.length === 0 && <p className="aide">Aucune séance ces 30 derniers jours.</p>}
      {seances?.length > 0 && (
        <ul className="liste-seances">
          {seances.map((s) => (
            <li key={s.id}>
              <Link to={`/seance/${s.id}`} className="carte-seance">
                <span className="carte-seance-titre">{libelleSeance(s)}</span>
                <span className="carte-seance-detail">{formaterJour(s.date)}</span>
                <span className="carte-seance-fleche" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
