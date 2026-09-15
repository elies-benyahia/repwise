import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';

// Groupes d'entraînement (cahier, demande du 15/09). Liste + création + rejoindre par code —
// le détail (membres, fil d'activité) vit sur /groupes/:id (Groupe.jsx).
export default function Groupes() {
  useTitre('Groupes');
  const [groupes, setGroupes] = useState(null);
  const [erreur, setErreur] = useState(null);

  function charger() {
    appelerApi('/groupes').then((d) => setGroupes(d.groupes)).catch((err) => setErreur(err.message));
  }
  useEffect(charger, []);

  return (
    <section className="groupes">
      <h1>Groupes</h1>
      <p className="auth-sous-titre">
        Entraîne-toi avec tes proches : suivez vos séances les uns des autres et encouragez-vous.
      </p>
      {erreur && <p className="alerte" role="alert">{erreur}</p>}

      {groupes && groupes.length > 0 && (
        <ul className="liste-groupes">
          {groupes.map((g) => (
            <li key={g.id}>
              <Link to={`/groupes/${g.id}`} className="carte-seance">
                <span className="carte-seance-titre">{g.nom}</span>
                <span className="carte-seance-detail">
                  {g.nombreMembres} membre{g.nombreMembres >= 2 ? 's' : ''}
                </span>
                <span className="carte-seance-fleche" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {groupes && groupes.length === 0 && (
        <p className="aide">Tu ne fais partie d'aucun groupe pour l'instant.</p>
      )}

      <RejoindreGroupe onRejoint={charger} />
      <CreerGroupe onCree={charger} />
    </section>
  );
}

function RejoindreGroupe({ onRejoint }) {
  const [code, setCode] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await appelerApi('/groupes/rejoindre', { methode: 'POST', corps: { code } });
      setCode('');
      onRejoint();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <form className="carte formulaire" onSubmit={soumettre} noValidate>
      <h2 className="titre-section titre-section-rapproche">Rejoindre un groupe</h2>
      {erreur && <p className="alerte" role="alert">{erreur}</p>}
      <div className="champ">
        <label htmlFor="code-groupe">Code d'invitation</label>
        <input
          id="code-groupe"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="Ex. AB3D9F2K"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <button type="submit" className="bouton-secondaire" disabled={envoiEnCours || !code.trim()}>
        {envoiEnCours ? 'Vérification…' : 'Rejoindre'}
      </button>
    </form>
  );
}

function CreerGroupe({ onCree }) {
  const [nom, setNom] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await appelerApi('/groupes', { methode: 'POST', corps: { nom } });
      setNom('');
      onCree();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <form className="carte formulaire" onSubmit={soumettre} noValidate>
      <h2 className="titre-section titre-section-rapproche">Créer un groupe</h2>
      {erreur && <p className="alerte" role="alert">{erreur}</p>}
      <div className="champ">
        <label htmlFor="nom-groupe">Nom du groupe</label>
        <input
          id="nom-groupe"
          type="text"
          maxLength={60}
          placeholder="Ex. Les Costauds du lundi"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
      </div>
      <button type="submit" className="bouton-principal" disabled={envoiEnCours || !nom.trim()}>
        {envoiEnCours ? 'Création…' : 'Créer le groupe'}
      </button>
    </form>
  );
}
