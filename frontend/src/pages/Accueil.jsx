import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import BadgeRang from '../components/BadgeRang.jsx';
import EtatVide from '../components/EtatVide.jsx';
import Flamme from '../components/Flamme.jsx';
import { CarteSquelette } from '../components/Squelette.jsx';
import DotGrid from '../components/reactbits/DotGrid.jsx';
import ResumeNutrition from '../components/ResumeNutrition.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';
import { aujourdhui, derniersJours, formaterJour, formaterRelatif, initialeJour } from '../lib/dates.js';
import { formaterNombre } from '../lib/format.js';
import { GROUPES_MUSCULAIRES } from '../lib/muscles.js';
import { COULEURS_RANGS, libelleRang } from '../lib/rangs.js';
import { libelleSeance } from '../lib/seances.js';

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

// Dashboard : ce qu'on veut savoir en ouvrant l'app, et les deux actions les plus fréquentes.
export default function Accueil() {
  useTitre('Accueil');
  const { utilisateur } = useAuth();
  const jour = aujourdhui();
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(false);
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    let abandonne = false;
    setErreur(false);
    appelerApi(`/tableau-de-bord?aujourdhui=${jour}`)
      .then((d) => !abandonne && setDonnees(d))
      .catch(() => !abandonne && setErreur(true));
    return () => {
      abandonne = true;
    };
  }, [jour, tentative]);

  return (
    <section className="accueil">
      <div className="accueil-entete">
        {/* Décor React Bits (cahier §7), purement visuel — masqué aux lecteurs d'écran. */}
        <div className="accueil-fond" aria-hidden="true">
          <DotGrid dotSize={3} gap={18} baseColor="#232a1c" activeColor="#5aab27" proximity={90} />
        </div>
        <p className="surtitre">{formaterJour(jour)}</p>
        <h1>Salut {utilisateur.pseudo}</h1>
      </div>

      <div className="actions-rapides">
        <Link to={`/seance/nouvelle?date=${jour}`} className="bouton-principal">Logger une séance</Link>
        <Link to="/journal" className="bouton-secondaire">Ajouter un repas</Link>
      </div>

      {erreur && (
        <p className="alerte" role="alert">
          Impossible de charger ton tableau de bord.{' '}
          <button type="button" className="lien" onClick={() => setTentative((n) => n + 1)}>Réessayer</button>
        </p>
      )}
      {!donnees && !erreur && (
        <div className="accueil-grille">
          <CarteSquelette lignes={2} />
          <CarteSquelette lignes={1} />
          <CarteSquelette lignes={3} />
          <CarteSquelette lignes={2} />
        </div>
      )}

      {donnees && (
        <div className="accueil-grille">
          <CarteRegularite streak={donnees.streak} derniers={donnees.derniersJours} jour={jour} />
          <CarteRang rang={donnees.rang} />
          <ResumeNutrition
            total={donnees.nutrition.consomme}
            objectif={donnees.nutrition.objectif}
            lien={{ vers: '/journal', texte: 'Journal' }}
          />
          <CarteDerniereSeance seance={donnees.derniereSeance} jour={jour} />
          <CarteATravailler groupes={donnees.aTravailler} />
        </div>
      )}
    </section>
  );
}

function CarteRegularite({ streak, derniers, jour }) {
  const faits = new Set(derniers);
  return (
    <div className="carte regularite">
      <div className="streak">
        <Flamme allumee={streak.actuel > 0} />
        <div>
          <p className="streak-nombre">{streak.actuel}</p>
          <p className="streak-label">
            {streak.actuel === 0
              ? 'Logge une séance pour allumer la flamme'
              : `${streak.actuel > 1 ? "jours d'entraînement" : "jour d'entraînement"} d'affilée`}
          </p>
        </div>
        {streak.record > 0 && <p className="streak-record">Record<br /><strong>{streak.record}</strong></p>}
      </div>

      <ol className="semaine" aria-label="Séances des 7 derniers jours">
        {derniersJours(jour).map((j) => {
          const classes = ['jour-point', faits.has(j) && 'fait', j === jour && 'aujourdhui'].filter(Boolean).join(' ');
          return (
            <li key={j} className={classes}>
              <span className="point" aria-hidden="true" />
              <span className="initiale" aria-hidden="true">{initialeJour(j)}</span>
              <span className="visuellement-cache">
                {formaterJour(j)} : {faits.has(j) ? 'séance' : 'pas de séance'}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="aide">
        {pluriel(derniers.length, 'jour')} d'entraînement sur les 7 derniers · {streak.tolerance === 0
          ? 'chaque jour compte'
          : `${pluriel(streak.tolerance, 'jour')} de repos toléré${streak.tolerance > 1 ? 's' : ''} entre deux séances`}
      </p>
    </div>
  );
}

function CarteDerniereSeance({ seance, jour }) {
  if (!seance) {
    return (
      <div className="carte carte-derniere-seance">
        <p className="surtitre">Dernière séance</p>
        <EtatVide icone="seance" texte="Pas encore de séance loggée. La première, c'est maintenant !" />
      </div>
    );
  }

  const apercu = seance.exercices.slice(0, 3).join(' · ');
  const reste = seance.exercices.length - 3;
  return (
    <Link to={`/seance/${seance.id}`} className="carte carte-derniere-seance carte-lien">
      <div className="carte-entete">
        <p className="surtitre">Dernière séance · {formaterRelatif(seance.date, jour)}</p>
        <span className="carte-seance-fleche" aria-hidden="true">›</span>
      </div>
      <p className="derniere-seance-titre">{libelleSeance(seance)}</p>
      <p className="aide">
        {seance.exercices.length === 0 ? 'Aucun exercice détaillé' : apercu}
        {reste > 0 && ` · +${reste}`}
      </p>
    </Link>
  );
}

function CarteRang({ rang }) {
  if (!rang) {
    return (
      <div className="carte carte-rang">
        <p className="surtitre">Ton rang</p>
        <p className="aide">
          Logge un exercice de référence (squat, développé couché, soulevé de terre, tractions…) pour
          découvrir ton rang, de Rookie à GOAT.
        </p>
      </div>
    );
  }
  const couleur = COULEURS_RANGS[rang.rang].base;
  return (
    <Link to="/rang" className="carte carte-rang carte-lien">
      <BadgeRang rang={rang} taille={52} />
      <div className="carte-rang-texte">
        <div className="carte-entete">
          <p className="surtitre">Ton rang</p>
          <span className="carte-seance-fleche" aria-hidden="true">›</span>
        </div>
        <p className="carte-rang-nom">{libelleRang(rang)}</p>
        <div className="barre-progression fine" aria-hidden="true">
          <span style={{ width: `${rang.progression * 100}%`, background: couleur }} />
        </div>
        <p className="aide">
          Score {formaterNombre(rang.score)}
          {rang.scoreProchainPalier !== null
            ? ` · prochain palier à ${formaterNombre(rang.scoreProchainPalier)}`
            : ' · sommet atteint'}
        </p>
      </div>
    </Link>
  );
}

// Règle simple : les grands groupes pas travaillés depuis au moins une semaine.
function CarteATravailler({ groupes }) {
  if (groupes.length === 0) return null;
  return (
    <div className="carte a-travailler">
      <p className="surtitre">À travailler</p>
      <ul>
        {groupes.map(({ groupe, joursDepuis }) => (
          <li key={groupe}>
            <Link to={`/exercices?muscle=${groupe}`} className="ligne-a-travailler">
              <span className="aliment-nom">{GROUPES_MUSCULAIRES[groupe]}</span>
              <span className="aliment-detail">
                {joursDepuis === null ? 'Pas encore travaillé' : `Pas travaillé depuis ${joursDepuis} jours`}
              </span>
              <span className="carte-seance-fleche" aria-hidden="true">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
