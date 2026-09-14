import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';
import { aujourdhui, depuisCle, estJourValide, formaterJour, moisDe } from '../lib/dates.js';
import { formaterNombre } from '../lib/format.js';
import { resumerSeries, texteDePartage, texteSuggestion } from '../lib/progression.js';
import {
  TYPES_SEANCE, ajouterExerciceNomme, appliquerProgramme, depuisApi, exerciceVide, libelleSeance, nouvelleSeance,
  preparerSeance, serieSuivante, serieVide,
} from '../lib/seances.js';

// /seance/nouvelle?date=AAAA-MM-JJ et /seance/:id, avec en option :
//   ?exercice=Nom   exercice ajouté depuis la carte du corps
//   ?programme=id   (nouvelle séance) exercices et cibles d'un programme
export default function PageSeance() {
  const { id } = useParams();
  const [parametres, setParametres] = useSearchParams();
  const [initial, setInitial] = useState(null);
  const [erreur, setErreur] = useState(null);
  useTitre(id ? 'Modifier la séance' : 'Nouvelle séance');

  useEffect(() => {
    let abandonne = false;
    const date = parametres.get('date');
    const exercice = parametres.get('exercice');
    const programmeId = parametres.get('programme');

    (async () => {
      try {
        let etat = id
          ? depuisApi((await appelerApi(`/seances/${id}`)).seance)
          : nouvelleSeance(estJourValide(date) ? date : aujourdhui());
        if (programmeId && !id) {
          etat = appliquerProgramme(etat, (await appelerApi(`/programmes/${programmeId}`)).programme);
        }
        let cleAFocaliser = null;
        if (exercice) ({ etat, cle: cleAFocaliser } = ajouterExerciceNomme(etat, exercice));
        if (abandonne) return;
        setInitial({ etat, cleAFocaliser });
        // Paramètres consommés : un rechargement de la page ne doit pas rajouter l'exercice.
        if (exercice || programmeId) {
          setParametres((p) => {
            p.delete('exercice');
            p.delete('programme');
            return p;
          }, { replace: true });
        }
      } catch (err) {
        if (!abandonne) setErreur(err.statut === 404 ? 'Séance ou programme introuvable.' : err.message);
      }
    })();
    return () => {
      abandonne = true;
    };
    // Les paramètres ne sont lus qu'à l'ouverture de la page.
  }, [id]);

  if (erreur) {
    return (
      <section className="page-seance">
        <p className="alerte" role="alert">{erreur}</p>
        <Link to="/calendrier" className="lien">‹ Retour au calendrier</Link>
      </section>
    );
  }
  if (!initial) return <p className="aide">Chargement…</p>;
  // key : repartir d'un formulaire neuf si on passe d'une séance à une autre.
  return <FormulaireSeance key={id ?? 'nouvelle'} id={id} initial={initial.etat} cleInitiale={initial.cleAFocaliser} />;
}

function FormulaireSeance({ id, initial, cleInitiale }) {
  const navigate = useNavigate();
  const [seance, setSeance] = useState(initial);
  const [afficherErreurs, setAfficherErreurs] = useState(false);
  const [erreurServeur, setErreurServeur] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [cleAFocaliser, setCleAFocaliser] = useState(cleInitiale);
  const [messagePartage, setMessagePartage] = useState(null);
  const { rafraichir } = useAuth();

  // Autocomplétion : d'abord les exercices déjà pratiqués, puis la bibliothèque.
  // Simple confort : en cas d'échec, la saisie libre reste possible.
  useEffect(() => {
    Promise.all([
      appelerApi('/seances/exercices-recents').then((d) => d.exercices).catch(() => []),
      appelerApi('/exercices').then((d) => d.exercices.map((e) => e.nom)).catch(() => []),
    ]).then(([recents, bibliotheque]) => setSuggestions([...new Set([...recents, ...bibliotheque])]));
  }, []);

  const { erreurs: toutesErreurs, corps } = preparerSeance(seance);
  const erreurs = afficherErreurs ? toutesErreurs : {};
  const retourCalendrier = `/calendrier?mois=${moisDe(seance.date)}&jour=${seance.date}`;

  const modifier = (champ) => (e) => setSeance((s) => ({ ...s, [champ]: e.target.value }));

  function modifierExercice(index, transformation) {
    setSeance((s) => ({
      ...s,
      exercices: s.exercices.map((ex, i) => (i === index ? transformation(ex) : ex)),
    }));
  }

  function ajouterExercice() {
    const exercice = exerciceVide();
    setCleAFocaliser(exercice.cle);
    setSeance((s) => ({ ...s, exercices: [...s.exercices, exercice] }));
  }

  async function enregistrer(e) {
    e.preventDefault();
    setErreurServeur(null);
    if (Object.keys(toutesErreurs).length > 0) {
      setAfficherErreurs(true);
      // Amène la première erreur à l'écran, le formulaire pouvant être long.
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"], .message-erreur')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    setEnvoiEnCours(true);
    try {
      await appelerApi(id ? `/seances/${id}` : '/seances', { methode: id ? 'PUT' : 'POST', corps });
      // Le rang a pu changer : l'en-tête doit l'afficher à jour.
      await rafraichir().catch(() => {});
      navigate(retourCalendrier);
    } catch (err) {
      setErreurServeur(err.message);
      setEnvoiEnCours(false);
    }
  }

  async function partager() {
    const texte = texteDePartage({
      titre: libelleSeance(corps) || 'Séance',
      date: seance.date,
      exercices: corps.exercices,
    });
    setMessagePartage(null);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Ma séance', text: texte });
      } else {
        await navigator.clipboard.writeText(texte);
        setMessagePartage('Résumé copié : colle-le où tu veux.');
      }
    } catch (err) {
      // Partage annulé par l'utilisateur : rien à signaler.
      if (err?.name !== 'AbortError') setMessagePartage('Partage impossible sur ce navigateur.');
    }
  }

  async function supprimer() {
    if (!window.confirm('Supprimer cette séance ? Cette action est définitive.')) return;
    setEnvoiEnCours(true);
    try {
      await appelerApi(`/seances/${id}`, { methode: 'DELETE' });
      await rafraichir().catch(() => {});
      navigate(retourCalendrier);
    } catch (err) {
      setErreurServeur(err.message);
      setEnvoiEnCours(false);
    }
  }

  return (
    <form className="page-seance" onSubmit={enregistrer} noValidate>
      <Link to={retourCalendrier} className="lien lien-retour">‹ Calendrier</Link>
      <div className="entete-page">
        <h1>{id ? 'Modifier la séance' : 'Nouvelle séance'}</h1>
        {id && <button type="button" className="bouton-discret" onClick={partager}>Partager</button>}
      </div>
      {estJourValide(seance.date) && <p className="auth-sous-titre">{formaterJour(seance.date)}</p>}
      {messagePartage && <p className="info" role="status">{messagePartage}</p>}

      {erreurServeur && <p className="alerte" role="alert">{erreurServeur}</p>}

      <div className="carte formulaire">
        <div className={`champ${erreurs.date ? ' champ-erreur' : ''}`}>
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            max={aujourdhui()}
            value={seance.date}
            onChange={modifier('date')}
            aria-invalid={Boolean(erreurs.date)}
          />
          {erreurs.date && <p className="message-erreur">{erreurs.date}</p>}
        </div>

        <fieldset className="groupe">
          <legend>Type de séance</legend>
          <div className="puces">
            {Object.entries(TYPES_SEANCE).map(([cle, label]) => (
              <label key={cle} className="puce">
                <input
                  type="radio"
                  name="typeSeance"
                  value={cle}
                  checked={seance.typeSeance === cle}
                  onChange={modifier('typeSeance')}
                  aria-invalid={Boolean(erreurs.typeSeance)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {erreurs.typeSeance && <p className="message-erreur">{erreurs.typeSeance}</p>}
        </fieldset>

        {seance.typeSeance === 'personnalise' && (
          <div className={`champ${erreurs.typePersonnalise ? ' champ-erreur' : ''}`}>
            <label htmlFor="typePersonnalise">Nom de la séance</label>
            <input
              id="typePersonnalise"
              type="text"
              maxLength={50}
              placeholder="Ex. Bras + abdos"
              value={seance.typePersonnalise}
              onChange={modifier('typePersonnalise')}
              aria-invalid={Boolean(erreurs.typePersonnalise)}
            />
            {erreurs.typePersonnalise && <p className="message-erreur">{erreurs.typePersonnalise}</p>}
          </div>
        )}
      </div>

      <h2 className="titre-section">Exercices</h2>
      <datalist id="exercices-recents">
        {suggestions.map((nom) => <option key={nom} value={nom} />)}
      </datalist>

      {seance.exercices.map((exercice, i) => (
        <CarteExercice
          key={exercice.cle}
          index={i}
          exercice={exercice}
          date={seance.date}
          erreurs={erreurs}
          focaliser={exercice.cle === cleAFocaliser}
          onChange={(transformation) => modifierExercice(i, transformation)}
          onRetirer={() => setSeance((s) => ({ ...s, exercices: s.exercices.filter((_, j) => j !== i) }))}
        />
      ))}

      <button type="button" className="bouton-secondaire" onClick={ajouterExercice}>+ Ajouter un exercice</button>

      <div className="champ champ-notes">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          rows={3}
          maxLength={2000}
          placeholder="Ressenti, énergie, douleur…"
          value={seance.notes}
          onChange={modifier('notes')}
        />
      </div>

      <div className="barre-actions">
        {id && (
          <button type="button" className="bouton-danger" onClick={supprimer} disabled={envoiEnCours}>
            Supprimer
          </button>
        )}
        <button type="submit" className="bouton-principal" disabled={envoiEnCours}>
          {envoiEnCours ? 'Enregistrement…' : 'Enregistrer la séance'}
        </button>
      </div>
    </form>
  );
}

// Réponses de /progression/derniere-fois déjà obtenues, par nom et date de séance.
const cacheDerniereFois = new Map();

// "Dernière fois" pour l'exercice en cours de saisie, chargée après une courte pause de frappe.
function useDerniereFois(nom, date) {
  const [resultat, setResultat] = useState(null);
  useEffect(() => {
    const nomPropre = nom.trim();
    if (nomPropre.length < 2 || !estJourValide(date)) {
      setResultat(null);
      return undefined;
    }
    const cle = `${nomPropre.toLowerCase()}|${date}`;
    if (cacheDerniereFois.has(cle)) {
      setResultat(cacheDerniereFois.get(cle));
      return undefined;
    }
    let abandonne = false;
    const minuterie = setTimeout(() => {
      appelerApi(`/progression/derniere-fois?nom=${encodeURIComponent(nomPropre)}&avant=${date}`)
        .then((d) => {
          cacheDerniereFois.set(cle, d);
          if (!abandonne) setResultat(d);
        })
        .catch(() => !abandonne && setResultat(null));
    }, 400);
    return () => {
      abandonne = true;
      clearTimeout(minuterie);
    };
  }, [nom, date]);
  return resultat;
}

function DerniereFois({ nom, date, seriesVides, onAppliquer }) {
  const resultat = useDerniereFois(nom, date);
  if (!resultat?.derniereFois) return null;
  const { derniereFois, suggestion } = resultat;
  const quand = depuisCle(derniereFois.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  function appliquer() {
    onAppliquer(derniereFois.series.map(() => ({
      ...serieVide(),
      repetitions: String(suggestion.repetitions),
      poids: suggestion.poids > 0 ? formaterNombre(suggestion.poids) : '',
    })));
  }

  return (
    <div className="derniere-fois">
      <p><span className="texte-doux">Dernière fois ({quand}) :</span> {resumerSeries(derniereFois.series)}</p>
      {suggestion && <p className="suggestion">{texteSuggestion(suggestion)}</p>}
      {suggestion && seriesVides && (
        <button type="button" className="bouton-discret" onClick={appliquer}>Pré-remplir les séries</button>
      )}
    </div>
  );
}

function CarteExercice({ index, exercice, date, erreurs, focaliser, onChange, onRetirer }) {
  const chemin = `exercices.${index}`;
  const idNom = `exercice-${exercice.cle}-nom`;
  const idRepos = `exercice-${exercice.cle}-repos`;

  const modifierSerie = (j, champ) => (e) => onChange((ex) => ({
    ...ex,
    series: ex.series.map((s, k) => (k === j ? { ...s, [champ]: e.target.value } : s)),
  }));

  return (
    <div className="carte carte-exercice">
      <div className="carte-exercice-entete">
        <span className="surtitre">Exercice {index + 1}</span>
        <button type="button" className="bouton-texte" onClick={onRetirer} aria-label={`Retirer l'exercice ${index + 1}`}>
          Retirer
        </button>
      </div>

      <div className={`champ${erreurs[`${chemin}.nomExercice`] ? ' champ-erreur' : ''}`}>
        <label htmlFor={idNom} className="visuellement-cache">Nom de l'exercice</label>
        <input
          id={idNom}
          type="text"
          list="exercices-recents"
          maxLength={100}
          autoComplete="off"
          /* Nom déjà rempli (ajout depuis la carte du corps) : le focus va plutôt aux répétitions. */
          autoFocus={focaliser && !exercice.nomExercice}
          placeholder="Ex. Développé couché"
          value={exercice.nomExercice}
          onChange={(e) => onChange((ex) => ({ ...ex, nomExercice: e.target.value }))}
          aria-invalid={Boolean(erreurs[`${chemin}.nomExercice`])}
        />
        {erreurs[`${chemin}.nomExercice`] && <p className="message-erreur">{erreurs[`${chemin}.nomExercice`]}</p>}
      </div>

      <DerniereFois
        nom={exercice.nomExercice}
        date={date}
        seriesVides={exercice.series.every((s) => !s.repetitions.trim() && !s.poids.trim())}
        onAppliquer={(series) => onChange((ex) => ({ ...ex, series }))}
      />

      <div className="tableau-series" role="group" aria-label={`Séries de l'exercice ${index + 1}`}>
        <span className="entete-series" aria-hidden="true">Série</span>
        <span className="entete-series" aria-hidden="true">Reps</span>
        <span className="entete-series" aria-hidden="true">Poids (kg)</span>
        <span aria-hidden="true" />
        {exercice.series.map((serie, j) => {
          const erreurReps = erreurs[`${chemin}.series.${j}.repetitions`];
          const erreurPoids = erreurs[`${chemin}.series.${j}.poids`];
          return (
            <div key={serie.cle} className="ligne-serie">
              <span className="numero-serie">{j + 1}</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoFocus={focaliser && Boolean(exercice.nomExercice) && j === 0}
                aria-label={`Répétitions, série ${j + 1}`}
                value={serie.repetitions}
                onChange={modifierSerie(j, 'repetitions')}
                aria-invalid={Boolean(erreurReps)}
                className={erreurReps ? 'saisie-erreur' : undefined}
              />
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="PDC"
                aria-label={`Poids en kg, série ${j + 1} (vide = poids du corps)`}
                value={serie.poids}
                onChange={modifierSerie(j, 'poids')}
                aria-invalid={Boolean(erreurPoids)}
                className={erreurPoids ? 'saisie-erreur' : undefined}
              />
              <button
                type="button"
                className="bouton-icone bouton-icone-petit"
                onClick={() => onChange((ex) => ({ ...ex, series: ex.series.filter((_, k) => k !== j) }))}
                disabled={exercice.series.length === 1}
                aria-label={`Supprimer la série ${j + 1}`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      {erreurs[`${chemin}.series`] && <p className="message-erreur">{erreurs[`${chemin}.series`]}</p>}

      <div className="carte-exercice-pied">
        <button
          type="button"
          className="bouton-discret"
          onClick={() => onChange((ex) => ({ ...ex, series: [...ex.series, serieSuivante(ex.series)] }))}
        >
          + Série
        </button>
        <div className={`champ champ-repos${erreurs[`${chemin}.tempsRepos`] ? ' champ-erreur' : ''}`}>
          <label htmlFor={idRepos}>Repos</label>
          <div className="champ-saisie">
            <input
              id={idRepos}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="—"
              value={exercice.tempsRepos}
              onChange={(e) => onChange((ex) => ({ ...ex, tempsRepos: e.target.value }))}
              aria-invalid={Boolean(erreurs[`${chemin}.tempsRepos`])}
            />
            <span className="unite">s</span>
          </div>
        </div>
      </div>
      {erreurs[`${chemin}.tempsRepos`] && <p className="message-erreur">{erreurs[`${chemin}.tempsRepos`]}</p>}
    </div>
  );
}
