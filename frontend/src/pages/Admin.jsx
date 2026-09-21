import { useEffect, useState } from 'react';
import { CarteSquelette } from '../components/Squelette.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';
import { formaterNombre } from '../lib/format.js';
import { BARRES_PALIER, COULEURS_RANGS } from '../lib/rangs.js';

const STATUTS = [
  ['nouveau', 'Nouveau'],
  ['en_cours', 'En cours'],
  ['traite', 'Traité'],
];

// Page Admin (cahier §3/§5, réservée au rôle admin) : liste des utilisateurs avec correction
// manuelle du rang ("corriger une anomalie de calcul ou faire une démo"), et lecture des
// feedbacks reçus. Pas de flux d'inscription admin : premier compte promu à la main (README).
export default function Admin() {
  useTitre('Admin');
  const [statistiques, setStatistiques] = useState(null);
  const [utilisateurs, setUtilisateurs] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [edition, setEdition] = useState(null);

  async function charger() {
    try {
      const [s, u, f] = await Promise.all([
        appelerApi('/admin/statistiques'),
        appelerApi('/admin/utilisateurs'),
        appelerApi('/admin/feedback'),
      ]);
      setStatistiques(s);
      setUtilisateurs(u.utilisateurs);
      setFeedback(f.feedback);
    } catch (err) {
      setErreur(err.message);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  async function enregistrerRang(id) {
    try {
      await appelerApi(`/admin/utilisateurs/${id}/rang`, {
        methode: 'PATCH',
        corps: { rang: Number(edition.rang), palier: edition.palier, score: Number(edition.score) },
      });
      setEdition(null);
      await charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function changerStatut(id, statut) {
    try {
      await appelerApi(`/admin/feedback/${id}`, { methode: 'PATCH', corps: { statut } });
      await charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <section className="admin-page">
      <h1>Administration</h1>
      {erreur && <p className="alerte" role="alert">{erreur}</p>}

      <h2 className="titre-section">Statistiques d'usage</h2>
      {!statistiques && !erreur && <CarteSquelette lignes={3} />}
      {statistiques && (
        <div className="grille-stats-admin">
          <div className="carte stat-admin">
            <span className="stat-admin-valeur">{formaterNombre(statistiques.utilisateurs.total)}</span>
            <span className="aide">
              Utilisateurs ({formaterNombre(statistiques.utilisateurs.comptes)} comptes,{' '}
              {formaterNombre(statistiques.utilisateurs.invites)} invités)
            </span>
          </div>
          <div className="carte stat-admin">
            <span className="stat-admin-valeur">{formaterNombre(statistiques.activite7j.utilisateursActifs)}</span>
            <span className="aide">Actifs cette semaine ({formaterNombre(statistiques.activite7j.seances)} séances)</span>
          </div>
          <div className="carte stat-admin">
            <span className="stat-admin-valeur">{formaterNombre(statistiques.feedbackNouveau)}</span>
            <span className="aide">Feedback non traité</span>
          </div>
          <div className="carte stat-admin">
            <span className="stat-admin-valeur">{statistiques.repartitionRangs.length}</span>
            <span className="aide">
              Rangs distincts atteints
              {statistiques.repartitionRangs.length > 0 && (
                <> · le plus courant :{' '}
                  {[...statistiques.repartitionRangs].sort((a, b) => b.total - a.total)[0].nom}
                </>
              )}
            </span>
          </div>
        </div>
      )}

      <h2 className="titre-section">Utilisateurs</h2>
      {!utilisateurs && !erreur && <CarteSquelette lignes={2} />}
      {utilisateurs && (
        <div className="tableau-scroll">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Pseudo</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Rang</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {utilisateurs.map((u) => (
                <tr key={u.id}>
                  <td>{u.pseudo || '—'}{u.estInvite && <span className="texte-doux"> (invité)</span>}</td>
                  <td>{u.email || '—'}</td>
                  <td>{u.role}</td>
                  <td>
                    {edition?.id === u.id ? (
                      <div className="admin-edition-rang">
                        <select value={edition.rang} onChange={(e) => setEdition({ ...edition, rang: e.target.value })}>
                          {Object.entries(COULEURS_RANGS).map(([n, { nom }]) => (
                            <option key={n} value={n}>{nom}</option>
                          ))}
                        </select>
                        <select value={edition.palier} onChange={(e) => setEdition({ ...edition, palier: e.target.value })}>
                          {Object.keys(BARRES_PALIER).map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input
                          type="number" step="0.01" min="0" max="100" value={edition.score}
                          onChange={(e) => setEdition({ ...edition, score: e.target.value })}
                        />
                        <button type="button" className="bouton-discret-accent" onClick={() => enregistrerRang(u.id)}>OK</button>
                        <button type="button" className="bouton-discret" onClick={() => setEdition(null)}>Annuler</button>
                      </div>
                    ) : (
                      <>
                        {u.rang ? `${COULEURS_RANGS[u.rang.rang].nom} ${u.rang.palier} (${formaterNombre(u.rang.score)})` : 'Non classé'}
                        {' '}
                        <button
                          type="button"
                          className="lien"
                          onClick={() => setEdition({
                            id: u.id, rang: u.rang?.rang ?? 1, palier: u.rang?.palier ?? 'III', score: u.rang?.score ?? 0,
                          })}
                        >
                          Corriger
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="titre-section">Feedback</h2>
      {feedback && feedback.length === 0 && <p className="aide">Aucun retour pour l'instant.</p>}
      {feedback && feedback.length > 0 && (
        <ul className="liste-feedback-admin">
          {feedback.map((f) => (
            <li key={f.id}>
              <p className="feedback-admin-description">{f.description}</p>
              <p className="aide">
                {f.type === 'bug' ? 'Bug' : 'Suggestion'} · {f.pseudo || f.emailContact || 'anonyme'} ·{' '}
                {new Date(f.dateEnvoi).toLocaleDateString('fr-FR')}
              </p>
              <select value={f.statut} onChange={(e) => changerStatut(f.id, e.target.value)}>
                {STATUTS.map(([valeur, libelle]) => <option key={valeur} value={valeur}>{libelle}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
