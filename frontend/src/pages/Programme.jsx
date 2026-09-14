import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';
import { aujourdhui } from '../lib/dates.js';
import { formaterNombre } from '../lib/format.js';
import { GROUPES_MUSCULAIRES } from '../lib/muscles.js';

export default function Programme() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [programme, setProgramme] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  useTitre(programme?.nom ?? 'Programme');

  useEffect(() => {
    appelerApi(`/programmes/${id}`)
      .then((d) => setProgramme(d.programme))
      .catch((err) => setErreur(err.statut === 404 ? 'Ce programme est introuvable.' : err.message));
  }, [id]);

  async function retirer(ligne) {
    setErreur(null);
    try {
      await appelerApi(`/programmes/${id}/exercices/${ligne}`, { methode: 'DELETE' });
      setProgramme((p) => ({ ...p, exercices: p.exercices.filter((e) => e.id !== ligne) }));
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer le programme « ${programme.nom} » ?`)) return;
    setEnvoiEnCours(true);
    try {
      await appelerApi(`/programmes/${id}`, { methode: 'DELETE' });
      navigate('/programmes', { replace: true });
    } catch (err) {
      setErreur(err.message);
      setEnvoiEnCours(false);
    }
  }

  return (
    <section className="programmes">
      <Link to="/programmes" className="lien lien-retour">‹ Mes programmes</Link>
      {erreur && <p className="alerte" role="alert">{erreur}</p>}
      {!programme && !erreur && <p className="aide">Chargement…</p>}

      {programme && (
        <>
          <h1>{programme.nom}</h1>

          {programme.exercices.length === 0 ? (
            <p className="aide">
              Ce programme est vide. Ajoute des exercices depuis la <Link to="/exercices" className="lien">carte du corps</Link>.
            </p>
          ) : (
            <ol className="liste-programme">
              {programme.exercices.map((ex) => (
                <li key={ex.id} className="ligne-aliment">
                  <div>
                    <span className="aliment-nom">{ex.nom}</span>
                    <span className="aliment-detail">
                      {ex.seriesCibles} × {ex.repetitionsCibles}
                      {ex.poidsCible !== null && ` · ${formaterNombre(ex.poidsCible)} kg`}
                      {' · '}{GROUPES_MUSCULAIRES[ex.groupeMusculaire]}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="bouton-icone bouton-icone-petit"
                    onClick={() => retirer(ex.id)}
                    aria-label={`Retirer ${ex.nom} du programme`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          )}

          {programme.exercices.length > 0 && (
            <Link to={`/seance/nouvelle?date=${aujourdhui()}&programme=${programme.id}`} className="bouton-principal">
              Lancer une séance
            </Link>
          )}
          <Link to="/exercices" className="bouton-secondaire">+ Ajouter des exercices</Link>
          <button type="button" className="bouton-danger" onClick={supprimer} disabled={envoiEnCours}>
            Supprimer le programme
          </button>
        </>
      )}
    </section>
  );
}
