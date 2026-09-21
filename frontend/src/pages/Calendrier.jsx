import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import Celebration from '../components/Celebration.jsx';
import { LigneSquelette } from '../components/Squelette.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';
import {
  aujourdhui, decalerMois, estJourValide, estMoisValide, formaterJour, formaterMois, grilleMois, moisDe,
} from '../lib/dates.js';
import { libelleCourt, libelleSeance } from '../lib/seances.js';

const JOURS_SEMAINE = [
  ['L', 'Lundi'], ['M', 'Mardi'], ['M', 'Mercredi'], ['J', 'Jeudi'], ['V', 'Vendredi'], ['S', 'Samedi'], ['D', 'Dimanche'],
];

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export default function Calendrier() {
  useTitre('Calendrier');
  // Mois et jour dans l'URL : le bouton retour et le retour depuis une séance retrouvent la même vue.
  const [parametres, setParametres] = useSearchParams();
  const jourCourant = aujourdhui();
  const mois = estMoisValide(parametres.get('mois')) ? parametres.get('mois') : moisDe(jourCourant);
  const jourDemande = parametres.get('jour');
  const jourSelectionne = estJourValide(jourDemande)
    ? jourDemande
    : mois === moisDe(jourCourant) ? jourCourant : null;

  const grille = useMemo(() => grilleMois(mois), [mois]);
  const [seances, setSeances] = useState([]);
  const [etat, setEtat] = useState('chargement');
  const [tentative, setTentative] = useState(0);

  // Retour du 21/09 : célébration transmise par Seance.jsx via l'état de navigation à la
  // création d'une séance (nouveau rang, palier de streak, record). Effacée du state une fois
  // fermée, pour ne pas réapparaître à un retour arrière du navigateur.
  const location = useLocation();
  const navigate = useNavigate();
  const [celebrations, setCelebrations] = useState(location.state?.celebrations ?? null);
  const fermerCelebration = () => {
    setCelebrations(null);
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
  };

  useEffect(() => {
    let abandonne = false;
    setEtat('chargement');
    appelerApi(`/seances?debut=${grille[0]}&fin=${grille.at(-1)}`)
      .then(({ seances }) => {
        if (abandonne) return;
        setSeances(seances);
        setEtat('pret');
      })
      .catch(() => !abandonne && setEtat('erreur'));
    return () => {
      abandonne = true;
    };
  }, [grille, tentative]);

  const seancesParJour = useMemo(() => {
    const parJour = new Map();
    for (const seance of seances) parJour.set(seance.date, [...(parJour.get(seance.date) ?? []), seance]);
    return parJour;
  }, [seances]);
  const nbSeancesDuMois = seances.filter((s) => moisDe(s.date) === mois).length;

  const allerAuMois = (nouveauMois) => setParametres({ mois: nouveauMois });
  const choisirJour = (jour) => setParametres({ mois: moisDe(jour), jour }, { replace: true });

  return (
    <section className="calendrier">
      <div className="calendrier-entete">
        <button type="button" className="bouton-icone" onClick={() => allerAuMois(decalerMois(mois, -1))} aria-label="Mois précédent">‹</button>
        <h1>{formaterMois(mois)}</h1>
        <button type="button" className="bouton-icone" onClick={() => allerAuMois(decalerMois(mois, 1))} aria-label="Mois suivant">›</button>
      </div>

      <div className="calendrier-statut">
        {etat === 'erreur' ? (
          <p className="alerte" role="alert">
            Impossible de charger tes séances.{' '}
            <button type="button" className="lien" onClick={() => setTentative((n) => n + 1)}>Réessayer</button>
          </p>
        ) : (
          <p className="resume-mois">
            {etat === 'chargement' ? <LigneSquelette largeur="9ch" hauteur={12} /> : `${pluriel(nbSeancesDuMois, 'séance')} ce mois-ci`}
          </p>
        )}
        {mois !== moisDe(jourCourant) && (
          <button type="button" className="lien" onClick={() => setParametres({})}>Aujourd'hui</button>
        )}
      </div>

      <div className="grille-calendrier">
        {JOURS_SEMAINE.map(([initiale, nom], i) => (
          <abbr key={i} title={nom} className="jour-semaine">{initiale}</abbr>
        ))}
        {grille.map((jour) => {
          const duJour = seancesParJour.get(jour) ?? [];
          const classes = [
            'case-jour',
            moisDe(jour) !== mois && 'hors-mois',
            jour === jourCourant && 'aujourdhui',
            jour === jourSelectionne && 'selectionne',
            duJour.length > 0 && 'avec-seance',
          ].filter(Boolean).join(' ');
          return (
            <button
              key={jour}
              type="button"
              className={classes}
              onClick={() => choisirJour(jour)}
              aria-pressed={jour === jourSelectionne}
              aria-label={`${formaterJour(jour)}${duJour.length ? `, ${pluriel(duJour.length, 'séance')}` : ''}`}
            >
              <span className="case-numero">{Number(jour.slice(8))}</span>
              {duJour.length > 0 && (
                <span className="case-seance">
                  {libelleCourt(duJour[0])}{duJour.length > 1 && ` +${duJour.length - 1}`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {jourSelectionne && (
        <PanneauJour
          jour={jourSelectionne}
          seances={seancesParJour.get(jourSelectionne) ?? []}
          futur={jourSelectionne > jourCourant}
          chargement={etat === 'chargement'}
        />
      )}

      <Celebration celebrations={celebrations} onFermer={fermerCelebration} />
    </section>
  );
}

function PanneauJour({ jour, seances, futur, chargement }) {
  return (
    <div className="panneau-jour">
      <h2>{formaterJour(jour)}</h2>
      {!chargement && seances.length > 0 && (
        <ul className="liste-seances">
          {seances.map((seance) => (
            <li key={seance.id}>
              <Link to={`/seance/${seance.id}`} className="carte-seance">
                <span className="carte-seance-titre">{libelleSeance(seance)}</span>
                <span className="carte-seance-detail">{pluriel(seance.nbExercices, 'exercice')}</span>
                <span className="carte-seance-fleche" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {futur ? (
        <p className="aide">Ce jour n'est pas encore arrivé : tu pourras y logger ta séance le moment venu.</p>
      ) : (
        <>
          {!chargement && seances.length === 0 && <p className="aide">Aucune séance ce jour-là.</p>}
          <Link to={`/seance/nouvelle?date=${jour}`} className="bouton-principal">
            {seances.length > 0 ? 'Ajouter une autre séance' : 'Logger une séance'}
          </Link>
        </>
      )}
    </div>
  );
}
