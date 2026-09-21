import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import GraphiqueLigne from '../components/GraphiqueLigne.jsx';
import { LigneSquelette } from '../components/Squelette.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';
import { depuisCle } from '../lib/dates.js';
import { formaterNombre } from '../lib/format.js';

const kg = (v) => `${formaterNombre(v)} kg`;
const dateLongue = (cle) => depuisCle(cle).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

export default function Progression() {
  useTitre('Progression');
  return (
    <section className="progression">
      <h1>Progression</h1>
      <PoidsDeCorps />
      <ProgressionExercice />
    </section>
  );
}

function PoidsDeCorps() {
  const [mesures, setMesures] = useState(null);
  useEffect(() => {
    appelerApi('/profil/poids').then((d) => setMesures(d.mesures)).catch(() => setMesures([]));
  }, []);

  if (!mesures) {
    return (
      <div className="carte carte-graphique">
        <LigneSquelette largeur="30%" hauteur={18} />
        <LigneSquelette largeur="100%" hauteur={120} />
      </div>
    );
  }
  const premier = mesures[0];
  const dernier = mesures.at(-1);
  const ecart = mesures.length > 1 ? Math.round((dernier.poids - premier.poids) * 10) / 10 : 0;

  return (
    <div className="carte carte-graphique">
      <h2>Poids de corps</h2>
      {mesures.length === 0 ? (
        <p className="aide">Enregistre ton poids depuis ton <Link to="/profil" className="lien">profil</Link> pour suivre son évolution.</p>
      ) : (
        <>
          <p className="aide">
            {mesures.length === 1
              ? `Un seul relevé (${dateLongue(premier.date)}) : mets à jour ton poids dans ton profil pour voir la courbe.`
              : `${ecart > 0 ? '+' : ecart < 0 ? '−' : '±'}${formaterNombre(Math.abs(ecart))} kg depuis le ${dateLongue(premier.date)}`}
          </p>
          <GraphiqueLigne
            titre="Poids de corps"
            libelleValeur="Poids"
            formaterValeur={kg}
            points={mesures.map((m) => ({ date: m.date, valeur: m.poids }))}
          />
        </>
      )}
    </div>
  );
}

function ProgressionExercice() {
  const [exercices, setExercices] = useState(null);
  const [choisi, setChoisi] = useState('');
  const [points, setPoints] = useState(null);

  useEffect(() => {
    appelerApi('/progression/exercices')
      .then((d) => {
        setExercices(d.exercices);
        if (d.exercices.length > 0) setChoisi(d.exercices[0].nom);
      })
      .catch(() => setExercices([]));
  }, []);

  useEffect(() => {
    if (!choisi) return;
    setPoints(null);
    appelerApi(`/progression/exercice?nom=${encodeURIComponent(choisi)}`)
      .then((d) => setPoints(d.points))
      .catch(() => setPoints([]));
  }, [choisi]);

  if (!exercices) return null;
  if (exercices.length === 0) {
    return (
      <div className="carte carte-graphique">
        <h2>Charges soulevées</h2>
        <p className="aide">Logge tes premières séances pour suivre ta progression exercice par exercice.</p>
      </div>
    );
  }

  // Exercice avec charge : 1RM estimé. Au poids du corps : meilleur nombre de répétitions.
  const avecCharge = points?.some((p) => p.meilleur1RM !== null);
  const serie = points
    ? points
      .map((p) => ({ date: p.date, valeur: avecCharge ? p.meilleur1RM : p.repetitionsMax }))
      .filter((p) => p.valeur !== null)
    : [];
  const record = serie.length ? Math.max(...serie.map((p) => p.valeur)) : null;
  const formater = avecCharge ? kg : (v) => `${v} reps`;

  return (
    <div className="carte carte-graphique">
      <h2>{avecCharge ? '1RM estimé' : 'Répétitions max'}</h2>
      <div className="champ">
        <label htmlFor="exercice-suivi" className="visuellement-cache">Exercice</label>
        <select id="exercice-suivi" value={choisi} onChange={(e) => setChoisi(e.target.value)}>
          {exercices.map((e) => (
            <option key={e.nom} value={e.nom}>{e.nom} ({e.nbSeances})</option>
          ))}
        </select>
      </div>
      {!points && <LigneSquelette largeur="100%" hauteur={120} />}
      {points && serie.length > 0 && (
        <>
          <p className="aide">
            {avecCharge
              ? `Meilleure série de chaque séance, convertie en charge max théorique (formule d'Epley). Record : ${kg(record)}.`
              : `Meilleure série de chaque séance. Record : ${record} répétitions.`}
          </p>
          <GraphiqueLigne
            titre={`${choisi}, ${avecCharge ? '1RM estimé' : 'répétitions max'}`}
            libelleValeur={avecCharge ? '1RM estimé' : 'Répétitions'}
            formaterValeur={formater}
            points={serie}
          />
        </>
      )}
    </div>
  );
}
