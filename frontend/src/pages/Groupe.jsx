import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import BadgeRang from '../components/BadgeRang.jsx';
import EtatVide from '../components/EtatVide.jsx';
import Flamme from '../components/Flamme.jsx';
import { CarteSquelette } from '../components/Squelette.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';
import { formaterRelatif } from '../lib/dates.js';
import { formaterNombre } from '../lib/format.js';
import { libelleRang } from '../lib/rangs.js';
import { libelleSeance } from '../lib/seances.js';

export default function Groupe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [codeCopie, setCodeCopie] = useState(false);
  useTitre(donnees ? donnees.groupe.nom : 'Groupe');

  function charger() {
    appelerApi(`/groupes/${id}`)
      .then(setDonnees)
      .catch((err) => setErreur(err.statut === 404 ? "Ce groupe n'existe pas (ou plus), ou tu n'en fais pas partie." : err.message));
  }
  useEffect(charger, [id]);

  async function basculerEncouragement(seanceId) {
    // Optimiste : l'API répond vite, mais pas d'attente visible sur un simple bouton "j'encourage".
    setDonnees((d) => ({
      ...d,
      activites: d.activites.map((a) => (a.seanceId !== seanceId ? a : {
        ...a,
        jaiEncourage: !a.jaiEncourage,
        nombreEncouragements: a.nombreEncouragements + (a.jaiEncourage ? -1 : 1),
      })),
    }));
    try {
      await appelerApi(`/groupes/${id}/seances/${seanceId}/encouragement`, { methode: 'POST' });
    } catch {
      charger(); // repli simple en cas d'échec : on resynchronise avec le serveur.
    }
  }

  async function copierCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopie(true);
      setTimeout(() => setCodeCopie(false), 2000);
    } catch {
      // Presse-papier indisponible (permission refusée, contexte non sécurisé...) : le code
      // reste affiché à l'écran, copiable à la main.
    }
  }

  async function quitter() {
    if (!window.confirm(`Quitter « ${donnees.groupe.nom} » ?`)) return;
    try {
      await appelerApi(`/groupes/${id}/membres/moi`, { methode: 'DELETE' });
      navigate('/groupes');
    } catch (err) {
      setErreur(err.message);
    }
  }

  if (erreur) return <section className="groupe"><p className="alerte" role="alert">{erreur}</p></section>;
  if (!donnees) {
    return (
      <section className="groupe">
        <CarteSquelette lignes={1} />
        <CarteSquelette lignes={2} />
        <CarteSquelette lignes={2} />
      </section>
    );
  }

  const { groupe, membres, activites } = donnees;

  return (
    <section className="groupe">
      <Link to="/groupes" className="lien-retour">‹ Mes groupes</Link>
      <h1>{groupe.nom}</h1>

      <div className="carte code-invitation">
        <p className="aide">Code d'invitation — partage-le pour inviter quelqu'un</p>
        <div className="code-invitation-valeur">
          <strong>{groupe.codeInvitation}</strong>
          <button type="button" className="bouton-discret" onClick={() => copierCode(groupe.codeInvitation)}>
            {codeCopie ? 'Copié !' : 'Copier'}
          </button>
        </div>
      </div>

      <h2 className="titre-section">Membres</h2>
      <ol className="liste-membres-groupe">
        {membres.map((m) => (
          <li key={m.id} className={m.estMoi ? 'moi' : undefined}>
            {m.photoUrl
              ? <img src={m.photoUrl} alt="" className="photo-membre-groupe" />
              : <span className="photo-membre-groupe photo-membre-groupe-vide" aria-hidden="true">{m.pseudo?.[0]?.toUpperCase()}</span>}
            <span className="membre-groupe-nom">
              {m.pseudo}{m.estMoi && ' (toi)'}
              <small>{m.rang ? `${libelleRang(m.rang)} · score ${formaterNombre(m.rang.score)}` : 'Non classé'}</small>
            </span>
            <span className="membre-groupe-streak">
              <Flamme allumee={m.streak > 0} taille={16} />
              <span>{m.streak}</span>
            </span>
            {m.rang && <BadgeRang rang={m.rang} taille={32} />}
          </li>
        ))}
      </ol>

      <h2 className="titre-section">Activité récente</h2>
      {activites.length === 0 && (
        <EtatVide icone="seance" texte="Personne n'a encore loggé de séance dans ce groupe." />
      )}
      {activites.length > 0 && (
        <ul className="liste-activites-groupe">
          {activites.map((a) => (
            <li key={a.seanceId} className="carte activite-groupe">
              {a.photoUrl
                ? <img src={a.photoUrl} alt="" className="photo-membre-groupe" />
                : <span className="photo-membre-groupe photo-membre-groupe-vide" aria-hidden="true">{a.pseudo?.[0]?.toUpperCase()}</span>}
              <div className="activite-groupe-texte">
                <p>
                  <strong>{a.pseudo}</strong> a loggé une séance{' '}
                  <strong>{libelleSeance({ typeSeance: a.typeSeance, typePersonnalise: a.typePersonnalise })}</strong>
                </p>
                <p className="aide">{formaterRelatif(a.date)}</p>
              </div>
              <button
                type="button"
                className={`bouton-encouragement${a.jaiEncourage ? ' actif' : ''}`}
                onClick={() => basculerEncouragement(a.seanceId)}
                aria-pressed={a.jaiEncourage}
                aria-label={a.jaiEncourage ? 'Retirer mon encouragement' : 'Encourager'}
              >
                👏 {a.nombreEncouragements > 0 && a.nombreEncouragements}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="bouton-texte bouton-quitter-groupe" onClick={quitter}>
        Quitter le groupe
      </button>
    </section>
  );
}
