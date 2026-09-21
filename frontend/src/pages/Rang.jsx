import { useEffect, useState } from 'react';
import BadgeRang from '../components/BadgeRang.jsx';
import { CarteSquelette } from '../components/Squelette.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';
import { formaterNombre } from '../lib/format.js';
import { libelleRang } from '../lib/rangs.js';

// Nouvelle page (cahier §5) : rang + barre de progression vers le palier suivant, quêtes du
// jour/de la semaine, et un "Récap" du score par exercice. Le classement (top 100 GOAT) reste
// sur /classement — cette page est le pendant "perso", pas de comparaison aux autres ici.
export default function Rang() {
  useTitre('Rang');
  const [rang, setRang] = useState(undefined);
  const [quetes, setQuetes] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    Promise.all([appelerApi('/rang'), appelerApi('/quetes')])
      .then(([r, q]) => {
        setRang(r.rang);
        setQuetes(q);
      })
      .catch((err) => setErreur(err.message));
  }, []);

  return (
    <section className="rang-page">
      <h1>Ton rang</h1>

      {erreur && <p className="alerte" role="alert">{erreur}</p>}
      {rang === undefined && !erreur && <CarteSquelette lignes={2} />}

      {rang === null && (
        <div className="carte mon-rang">
          <div className="mon-rang-texte">
            <p className="surtitre">Ton rang</p>
            <p className="mon-rang-nom">Non classé</p>
            <p className="aide">
              Logge un exercice de référence (squat, développé couché, tractions…) pour obtenir ton rang.
            </p>
          </div>
        </div>
      )}

      {rang && (
        <div className="carte rang-actuel">
          <BadgeRang rang={rang} taille={72} />
          <div className="rang-actuel-texte">
            <p className="rang-actuel-nom">{libelleRang(rang)}</p>
            {rang.scoreProchainPalier !== null ? (
              <>
                <div className="barre-progression" aria-hidden="true">
                  <span style={{ width: `${rang.progression * 100}%` }} />
                </div>
                <p className="aide">
                  Score {formaterNombre(rang.score)} · encore {formaterNombre(rang.scoreProchainPalier - rang.score)} point
                  {rang.scoreProchainPalier - rang.score >= 2 ? 's' : ''} pour le palier suivant
                </p>
              </>
            ) : (
              <p className="aide">Palier maximum atteint — score {formaterNombre(rang.score)}</p>
            )}
            {rang.bonusPoints > 0 && (
              <p className="aide rang-bonus">
                Dont <strong>+{formaterNombre(rang.score - rang.scoreBrut)}</strong> grâce à tes quêtes réussies
                ({rang.bonusPoints} points sur les 6 dernières semaines)
              </p>
            )}
          </div>
        </div>
      )}

      {quetes && (
        <div className="carte quetes-carte">
          <h2>Quêtes du jour</h2>
          <ul className="liste-quetes">
            {quetes.quotidiennes.map((q) => (
              <li key={q.id} className={q.complete ? 'complete' : undefined}>
                <span aria-hidden="true" className="quete-coche">{q.complete ? '✓' : ''}</span>
                <span className="quete-description">{q.description}</span>
                <span className="quete-points">+{q.points}</span>
              </li>
            ))}
          </ul>
          <h2>Quête de la semaine</h2>
          <ul className="liste-quetes">
            <li className={quetes.hebdomadaire.complete ? 'complete' : undefined}>
              <span aria-hidden="true" className="quete-coche">{quetes.hebdomadaire.complete ? '✓' : ''}</span>
              <span className="quete-description">{quetes.hebdomadaire.description}</span>
              <span className="quete-points">+{quetes.hebdomadaire.points}</span>
            </li>
          </ul>
        </div>
      )}

      {rang?.parExercice?.length > 0 && (
        <div className="carte recap-carte">
          <h2>Récap</h2>
          <p className="aide">Ton score vient du meilleur exercice de chaque groupe musculaire travaillé récemment.</p>
          <ul className="liste-recap">
            {rang.parExercice.map((e) => (
              <li key={e.exerciceId}>
                <span>{e.nom}</span>
                <span className="texte-doux">score {formaterNombre(e.score)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
