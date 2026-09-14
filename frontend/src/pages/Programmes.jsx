import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export default function Programmes() {
  useTitre('Mes programmes');
  const navigate = useNavigate();
  const [programmes, setProgrammes] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [nom, setNom] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
    appelerApi('/programmes').then((d) => setProgrammes(d.programmes)).catch((err) => setErreur(err.message));
  }, []);

  async function creer(e) {
    e.preventDefault();
    if (!nom.trim()) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const { programme } = await appelerApi('/programmes', { methode: 'POST', corps: { nom } });
      navigate(`/programmes/${programme.id}`);
    } catch (err) {
      setErreur(err.message);
      setEnvoiEnCours(false);
    }
  }

  return (
    <section className="programmes">
      <Link to="/exercices" className="lien lien-retour">‹ Exercices</Link>
      <h1>Mes programmes</h1>
      <p className="auth-sous-titre">Des séances types à relancer en un tap, remplies depuis la carte du corps.</p>

      {erreur && <p className="alerte" role="alert">{erreur}</p>}
      {!programmes && !erreur && <p className="aide">Chargement…</p>}

      {programmes?.length === 0 && (
        <p className="aide">Aucun programme pour l'instant. Crée-en un ci-dessous, puis ajoute-lui des exercices.</p>
      )}
      {programmes?.length > 0 && (
        <ul className="liste-seances">
          {programmes.map((p) => (
            <li key={p.id}>
              <Link to={`/programmes/${p.id}`} className="carte-seance">
                <span className="carte-seance-titre">{p.nom}</span>
                <span className="carte-seance-detail">{pluriel(p.nbExercices, 'exercice')}</span>
                <span className="carte-seance-fleche" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form className="carte formulaire" onSubmit={creer}>
        <div className="champ">
          <label htmlFor="nouveau-programme">Nouveau programme</label>
          <input
            id="nouveau-programme"
            type="text"
            maxLength={100}
            placeholder="Ex. Push A, Full body débutant…"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>
        <button type="submit" className="bouton-principal" disabled={envoiEnCours || !nom.trim()}>Créer</button>
      </form>
    </section>
  );
}
