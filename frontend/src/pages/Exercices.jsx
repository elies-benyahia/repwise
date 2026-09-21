import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import CarteCorps from '../components/CarteCorps.jsx';
import { CarteSquelette } from '../components/Squelette.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';
import { aujourdhui } from '../lib/dates.js';
import { GROUPES_MUSCULAIRES, ZONES, trierPourNiveau, vueDe } from '../lib/muscles.js';
import { NIVEAUX_EXPERIENCE } from '../lib/profil.js';

// Carte du corps : muscle choisi → meilleurs exercices, à ajouter à la séance du jour ou à un programme.
export default function Exercices() {
  useTitre('Exercices');
  const [parametres, setParametres] = useSearchParams();
  const muscle = GROUPES_MUSCULAIRES[parametres.get('muscle')] ? parametres.get('muscle') : null;
  const vue = ['avant', 'arriere'].includes(parametres.get('vue'))
    ? parametres.get('vue')
    : muscle ? vueDe(muscle) : 'avant';
  const refListe = useRef(null);

  // Programmes chargés une fois pour tous les formulaires "Ajouter à mon programme".
  const [programmes, setProgrammes] = useState(null);
  useEffect(() => {
    appelerApi('/programmes').then((d) => setProgrammes(d.programmes)).catch(() => setProgrammes([]));
  }, []);

  function choisir(groupe) {
    setParametres({ vue, muscle: groupe }, { replace: true });
    requestAnimationFrame(() => refListe.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  return (
    <section className={`exercices${muscle ? ' avec-panneau' : ''}`}>
      {/* Sur desktop, ce bloc reste la colonne principale et se décale pour laisser la place
          au panneau d'exercices qui glisse depuis le côté (voir .panneau-exercices en CSS,
          `:has()` fait le lien sans JS). Sur mobile, la liste reste simplement en dessous. */}
      <div className="exercices-corps">
        <div className="entete-page">
          <h1>Exercices</h1>
          <Link to="/programmes" className="bouton-discret">Mes programmes</Link>
        </div>
        <p className="auth-sous-titre">Touche un muscle pour voir les meilleurs exercices.</p>

        <div className="segmente" role="group" aria-label="Face de la silhouette">
          {[['avant', 'Face'], ['arriere', 'Dos']].map(([cle, label]) => (
            <label key={cle} className="segment">
              <input
                type="radio"
                name="vue"
                value={cle}
                checked={vue === cle}
                onChange={() => setParametres(muscle ? { vue: cle, muscle } : { vue: cle }, { replace: true })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <CarteCorps vue={vue} selection={muscle} onChoisir={choisir} />

        <div className="puces puces-muscles" role="group" aria-label="Choisir un muscle">
          {ZONES[vue].map(([groupe]) => (
            <button
              key={groupe}
              type="button"
              className={`puce-bouton${groupe === muscle ? ' active' : ''}`}
              aria-pressed={groupe === muscle}
              onClick={() => choisir(groupe)}
            >
              {GROUPES_MUSCULAIRES[groupe]}
            </button>
          ))}
        </div>
      </div>

      {/* Toujours monté (même sans muscle choisi) pour que la glissade ait quelque chose à
          animer dès le premier choix, plutôt qu'une apparition brute. */}
      <div ref={refListe} className={`panneau-exercices${muscle ? ' ouvert' : ''}`}>
        {muscle && (
          <ListeExercices
            key={muscle}
            groupe={muscle}
            programmes={programmes}
            onProgrammesModifies={setProgrammes}
          />
        )}
      </div>
    </section>
  );
}

function ListeExercices({ groupe, programmes, onProgrammesModifies }) {
  const { utilisateur } = useAuth();
  const [exercices, setExercices] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    appelerApi(`/exercices?groupe=${groupe}`)
      .then((d) => setExercices(trierPourNiveau(d.exercices, utilisateur.niveauExperience)))
      .catch((err) => setErreur(err.message));
  }, [groupe, utilisateur.niveauExperience]);

  return (
    <div className="liste-exercices">
      <h2>{GROUPES_MUSCULAIRES[groupe]}</h2>
      {erreur && <p className="alerte" role="alert">{erreur}</p>}
      {!exercices && !erreur && (
        <>
          <CarteSquelette lignes={1} />
          <CarteSquelette lignes={1} />
          <CarteSquelette lignes={1} />
        </>
      )}
      {exercices?.map((exercice) => (
        <CarteExerciceBibliotheque
          key={exercice.id}
          exercice={exercice}
          programmes={programmes}
          onProgrammesModifies={onProgrammesModifies}
        />
      ))}
    </div>
  );
}

function CarteExerciceBibliotheque({ exercice, programmes, onProgrammesModifies }) {
  const navigate = useNavigate();
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [erreur, setErreur] = useState(null);

  // La séance du jour si elle existe (la plus récente), sinon une nouvelle séance datée d'aujourd'hui.
  async function ajouterASeance() {
    setErreur(null);
    const jour = aujourdhui();
    try {
      const { seances } = await appelerApi(`/seances?debut=${jour}&fin=${jour}`);
      const nom = encodeURIComponent(exercice.nom);
      navigate(seances.length > 0
        ? `/seance/${seances.at(-1).id}?exercice=${nom}`
        : `/seance/nouvelle?date=${jour}&exercice=${nom}`);
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <article className="carte carte-biblio">
      {/* image_ou_gif : renseignée pour 56/68 exercices (photos wger.de, cahier §10) — affichée
          en grand en bandeau plutôt qu'en petite vignette pour que le mouvement soit lisible.
          Repli générique (icône, petite) pour les 12 exercices sans photo (voir README). */}
      {exercice.imageUrl && (
        <img src={exercice.imageUrl} alt="" className="carte-biblio-photo" />
      )}
      <div className="carte-biblio-entete">
        <div className="carte-biblio-titre">
          {!exercice.imageUrl && (
            <span className="carte-biblio-image" aria-hidden="true">
              <IconeExerciceGenerique />
            </span>
          )}
          <h3>{exercice.nom}</h3>
        </div>
        <span className={`badge-niveau niveau-${exercice.niveauDifficulte}`}>
          {NIVEAUX_EXPERIENCE[exercice.niveauDifficulte].label}
        </span>
      </div>
      {exercice.plusAvance && <p className="carte-biblio-note">Plus avancé que ton niveau actuel</p>}
      <p className="aide">{exercice.description}</p>
      {erreur && <p className="alerte" role="alert">{erreur}</p>}
      <div className="carte-biblio-actions">
        <button type="button" className="bouton-discret bouton-discret-accent" onClick={ajouterASeance}>
          Ajouter à ma séance
        </button>
        <button
          type="button"
          className="bouton-discret"
          onClick={() => setAjoutOuvert((o) => !o)}
          aria-expanded={ajoutOuvert}
        >
          Ajouter à mon programme
        </button>
      </div>
      {ajoutOuvert && (
        <AjoutProgramme
          exercice={exercice}
          programmes={programmes}
          onProgrammesModifies={onProgrammesModifies}
        />
      )}
    </article>
  );
}

// Repli générique tant qu'aucune image/vidéo de démonstration n'existe pour un exercice donné.
function IconeExerciceGenerique() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M6 8v8M4 10v4M20 8v8M18 10v4M6 12h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NOUVEAU = 'nouveau';

function AjoutProgramme({ exercice, programmes, onProgrammesModifies }) {
  const [cible, setCible] = useState(() => (programmes?.length ? String(programmes[0].id) : NOUVEAU));
  const [nomProgramme, setNomProgramme] = useState('');
  const [series, setSeries] = useState('3');
  const [repetitions, setRepetitions] = useState('10');
  const [etat, setEtat] = useState({ statut: 'saisie' }); // saisie | envoi | fait | erreur
  const idBase = `ajout-${exercice.id}`;

  async function ajouter(e) {
    e.preventDefault();
    const seriesCibles = Number(series);
    const repetitionsCibles = Number(repetitions);
    if (cible === NOUVEAU && !nomProgramme.trim()) {
      setEtat({ statut: 'erreur', message: 'Donne un nom à ton programme' });
      return;
    }
    if (!Number.isInteger(seriesCibles) || seriesCibles < 1 || seriesCibles > 20
      || !Number.isInteger(repetitionsCibles) || repetitionsCibles < 1 || repetitionsCibles > 100) {
      setEtat({ statut: 'erreur', message: 'Séries entre 1 et 20, répétitions entre 1 et 100' });
      return;
    }

    setEtat({ statut: 'envoi' });
    try {
      let id = Number(cible);
      if (cible === NOUVEAU) {
        ({ programme: { id } } = await appelerApi('/programmes', { methode: 'POST', corps: { nom: nomProgramme } }));
      }
      const { programme } = await appelerApi(`/programmes/${id}/exercices`, {
        methode: 'POST',
        corps: { exerciceId: exercice.id, seriesCibles, repetitionsCibles },
      });
      const resume = { id: programme.id, nom: programme.nom, nbExercices: programme.exercices.length };
      onProgrammesModifies((liste) => [resume, ...(liste ?? []).filter((p) => p.id !== programme.id)]);
      setEtat({ statut: 'fait', programme: resume });
    } catch (err) {
      setEtat({ statut: 'erreur', message: err.message });
    }
  }

  if (etat.statut === 'fait') {
    return (
      <p className="info" role="status">
        Ajouté à « {etat.programme.nom} ». <Link to={`/programmes/${etat.programme.id}`}>Voir le programme</Link>
      </p>
    );
  }

  return (
    <form className="ajout-programme" onSubmit={ajouter} noValidate>
      {etat.statut === 'erreur' && <p className="alerte" role="alert">{etat.message}</p>}
      <div className="champ">
        <label htmlFor={`${idBase}-programme`}>Programme</label>
        <select id={`${idBase}-programme`} value={cible} onChange={(e) => setCible(e.target.value)}>
          {(programmes ?? []).map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          <option value={NOUVEAU}>+ Nouveau programme</option>
        </select>
      </div>
      {cible === NOUVEAU && (
        <div className="champ">
          <label htmlFor={`${idBase}-nom`}>Nom du programme</label>
          <input
            id={`${idBase}-nom`}
            type="text"
            maxLength={100}
            placeholder="Ex. Push A"
            value={nomProgramme}
            onChange={(e) => setNomProgramme(e.target.value)}
          />
        </div>
      )}
      <div className="ajout-programme-cibles">
        <div className="champ">
          <label htmlFor={`${idBase}-series`}>Séries</label>
          <input id={`${idBase}-series`} type="text" inputMode="numeric" value={series} onChange={(e) => setSeries(e.target.value)} />
        </div>
        <span aria-hidden="true">×</span>
        <div className="champ">
          <label htmlFor={`${idBase}-reps`}>Reps</label>
          <input id={`${idBase}-reps`} type="text" inputMode="numeric" value={repetitions} onChange={(e) => setRepetitions(e.target.value)} />
        </div>
        <button type="submit" className="bouton-principal" disabled={etat.statut === 'envoi'}>
          {etat.statut === 'envoi' ? '…' : 'Ajouter'}
        </button>
      </div>
    </form>
  );
}
