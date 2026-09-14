import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import BadgeRang from '../components/BadgeRang.jsx';
import Flamme from '../components/Flamme.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';
import { formaterNombre } from '../lib/format.js';
import { COULEURS_RANGS, libelleRang } from '../lib/rangs.js';

const RANG_GOAT = 8;
const rangGoat = (palier) => ({ rang: RANG_GOAT, nom: 'GOAT', palier });

// Les 8 rangs (cahier §3), un badge représentatif par rang (palier I, le plus flatteur) pour le
// panneau "Tous les classements" — pas les 24 variantes, juste de quoi montrer la progression
// Rookie → GOAT en un coup d'œil.
const TOUS_LES_RANGS = Object.entries(COULEURS_RANGS).map(([rang, { nom }]) => ({
  rang: Number(rang),
  nom,
  palier: 'I',
}));

export default function Classement() {
  useTitre('Classement');
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [tousOuverts, setTousOuverts] = useState(false);

  useEffect(() => {
    appelerApi('/classement').then(setDonnees).catch((err) => setErreur(err.message));
  }, []);

  // Podium pour les trois premiers dès qu'ils existent, liste pour la suite.
  const podium = donnees?.classement.length >= 3 ? donnees.classement.slice(0, 3) : [];
  const suite = donnees ? donnees.classement.slice(podium.length) : [];

  return (
    <section className="classement">
      <h1>Classement</h1>
      <p className="auth-sous-titre">Le top 100 des pratiquants au rang GOAT, départagés par leur score.</p>
      {erreur && <p className="alerte" role="alert">{erreur}</p>}
      {!donnees && !erreur && <p className="aide">Chargement…</p>}

      {donnees && (
        <>
          <MonRang moi={donnees.moi} maPosition={donnees.maPosition} scoreGoat={donnees.scoreGoat} total={donnees.classement.length} />

          <button
            type="button"
            className="bouton-discret bouton-tous-rangs"
            onClick={() => setTousOuverts((v) => !v)}
            aria-expanded={tousOuverts}
            aria-controls="tous-les-rangs"
          >
            Tous les classements
            <span aria-hidden="true" className={`chevron${tousOuverts ? ' ouvert' : ''}`}>⌄</span>
          </button>
          <div id="tous-les-rangs" className="tous-rangs-enveloppe" data-ouvert={tousOuverts}>
            <ol className="tous-rangs-liste">
              {TOUS_LES_RANGS.map((rang) => (
                <li key={rang.rang}>
                  <BadgeRang rang={rang} taille={40} />
                  <span>{rang.nom}</span>
                </li>
              ))}
            </ol>
          </div>

          {donnees.classement.length === 0 && (
            <p className="aide classement-vide">Personne n'a encore atteint le rang GOAT. La place est libre.</p>
          )}

          {podium.length > 0 && (
            <ol className="podium" aria-label="Podium">
              {/* Ordre visuel 2e, 1er, 3e ; l'ordre de lecture reste 1er, 2e, 3e grâce à CSS order. */}
              {podium.map((joueur) => (
                <li key={joueur.id} className={`marche marche-${joueur.position}`}>
                  <Link to={`/classement/${joueur.id}`} className="marche-lien">
                    <BadgeRang rang={rangGoat(joueur.palier)} taille={joueur.position === 1 ? 64 : 48} />
                    <span className="marche-position">{joueur.position}</span>
                    <span className="marche-nom">{joueur.pseudo}{joueur.estMoi && ' (toi)'}</span>
                    <span className="marche-score">{formaterNombre(joueur.score)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}

          {suite.length > 0 && (
            <ol className="liste-classement" start={podium.length + 1}>
              {suite.map((joueur) => (
                <li key={joueur.id} className={joueur.estMoi ? 'moi' : undefined}>
                  <Link to={`/classement/${joueur.id}`} className="ligne-classement">
                    <span className="classement-position">{joueur.position}</span>
                    <span className="classement-nom">
                      {joueur.pseudo}{joueur.estMoi && ' (toi)'}
                      <small>GOAT {joueur.palier} · score {formaterNombre(joueur.score)}</small>
                    </span>
                    <span className="classement-streak">
                      <Flamme allumee={joueur.streak > 0} taille={18} />
                      <span>{joueur.streak}</span>
                      <span className="visuellement-cache"> jours d'entraînement d'affilée</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

function MonRang({ moi, maPosition, scoreGoat, total }) {
  const { utilisateur } = useAuth();

  if (!moi) {
    return (
      <div className="carte mon-rang">
        <div className="mon-rang-texte">
          <p className="surtitre">Ton rang</p>
          <p className="mon-rang-nom">Non classé</p>
          <p className="aide">
            Logge un exercice de référence (squat, développé couché, tractions…) pour obtenir ton rang.
          </p>
        </div>
      </div>
    );
  }

  const estGoat = moi.rang === RANG_GOAT;
  const manque = Math.max(0, Math.round((scoreGoat - moi.score) * 100) / 100);
  return (
    <div className="carte mon-rang">
      <BadgeRang rang={moi} taille={48} />
      <div className="mon-rang-texte">
        <p className="surtitre">Ton rang</p>
        <p className="mon-rang-nom">{libelleRang(moi)}</p>
        {!estGoat && (
          <>
            <div className="barre-progression fine" aria-hidden="true">
              <span style={{ width: `${Math.min(1, moi.score / scoreGoat) * 100}%`, background: COULEURS_RANGS[moi.rang].base }} />
            </div>
            <p className="aide">
              Score {formaterNombre(moi.score)} · encore {formaterNombre(manque)} point{manque >= 2 ? 's' : ''} pour
              entrer dans le rang GOAT
            </p>
          </>
        )}
        {estGoat && utilisateur.estInvite && (
          <p className="aide">
            Tu as le niveau pour le classement : <Link to="/inscription" className="lien">crée ton compte</Link> pour y apparaître.
          </p>
        )}
        {estGoat && maPosition && (
          <p className="aide">
            Score {formaterNombre(moi.score)} · {maPosition <= total ? `${maPosition}${maPosition === 1 ? 'er' : 'e'} du classement` : `${maPosition}e, hors du top 100`}
          </p>
        )}
      </div>
    </div>
  );
}
