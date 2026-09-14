import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import BadgeRang from '../components/BadgeRang.jsx';
import Flamme from '../components/Flamme.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';
import { formaterJour } from '../lib/dates.js';
import { formaterNombre } from '../lib/format.js';
import { libelleSeance } from '../lib/seances.js';
import { libelleRang } from '../lib/rangs.js';

const place = (n) => `${n}${n === 1 ? 'er' : 'e'}`;

// Profil public d'un joueur du classement : pseudo, bio, photo, rang, régularité — et ses
// séances récentes seulement s'il a choisi de les rendre visibles (réglage sur son Profil).
// Le poids de corps et les courbes de charge ne sont jamais renvoyés par l'API pour ce profil.
export default function JoueurClassement() {
  const { id } = useParams();
  const [joueur, setJoueur] = useState(null);
  const [erreur, setErreur] = useState(null);
  useTitre(joueur ? joueur.pseudo : 'Classement');

  useEffect(() => {
    appelerApi(`/classement/${id}`)
      .then((d) => setJoueur(d.joueur))
      .catch((err) => setErreur(err.statut === 404 ? 'Ce profil ne fait pas (ou plus) partie du classement.' : err.message));
  }, [id]);

  return (
    <section className="classement">
      <Link to="/classement" className="lien lien-retour">‹ Classement</Link>
      {erreur && <p className="alerte" role="alert">{erreur}</p>}
      {!joueur && !erreur && <p className="aide">Chargement…</p>}

      {joueur && (
        <>
          <div className="carte joueur-entete">
            {joueur.photoUrl
              ? <img src={joueur.photoUrl} alt="" className="joueur-photo" />
              : <BadgeRang rang={joueur.rang} taille={88} />}
            <h1>{joueur.pseudo}</h1>
            <p className="joueur-rang">{libelleRang(joueur.rang)} · {place(joueur.position)} du classement</p>
            {joueur.bio && <p className="joueur-bio">{joueur.bio}</p>}
          </div>

          <dl className="joueur-stats">
            <div className="carte">
              <dt>Score</dt>
              <dd>{formaterNombre(joueur.score)}</dd>
            </div>
            <div className="carte">
              <dt>Streak</dt>
              <dd><Flamme allumee={joueur.streak.actuel > 0} taille={22} /> {joueur.streak.actuel}</dd>
            </div>
            <div className="carte">
              <dt>Record de streak</dt>
              <dd>{joueur.streak.record}</dd>
            </div>
            <div className="carte">
              <dt>Séances (30 jours)</dt>
              <dd>{joueur.seancesTrenteJours}</dd>
            </div>
          </dl>

          <h2 className="titre-section">Séances récentes</h2>
          {joueur.seancesRecentes ? (
            joueur.seancesRecentes.length > 0 ? (
              <ul className="liste-seances">
                {joueur.seancesRecentes.map((s, i) => (
                  <li key={i}>
                    <div className="carte-seance carte-seance-lecture-seule">
                      <span className="carte-seance-titre">{libelleSeance(s)}</span>
                      <span className="carte-seance-detail">{formaterJour(s.date)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="aide">Aucune séance pour l'instant.</p>
            )
          ) : (
            <p className="aide">{joueur.pseudo} n'a pas rendu ses séances visibles.</p>
          )}

          {joueur.estMoi && (
            <p className="info">
              C'est ton profil public : seuls ton pseudo, ta photo, ta bio, ton rang et ta
              régularité sont toujours visibles ; tes séances ne le sont
              {joueur.profilPublic ? '' : ' pas'} (réglable dans ton <Link to="/profil">profil</Link>).
              Ton poids et tes courbes de charge, eux, restent toujours privés.
            </p>
          )}
        </>
      )}
    </section>
  );
}
