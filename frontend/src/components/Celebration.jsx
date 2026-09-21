import { useEffect } from 'react';
import BadgeRang from './BadgeRang.jsx';
import Flamme from './Flamme.jsx';
import { formaterNombre } from '../lib/format.js';
import { libelleRang } from '../lib/rangs.js';

// Retour du 21/09 ("petits moments de célébration") : affichée juste après avoir loggé une
// séance qui a fait franchir quelque chose (nouveau rang, palier de streak, record personnel) —
// voir seances/celebrations.js côté backend pour la détection. Fermeture au clic sur le fond,
// sur "Continuer", ou automatique après quelques secondes (jamais bloquante).
export default function Celebration({ celebrations, onFermer }) {
  useEffect(() => {
    if (!celebrations) return undefined;
    const minuterie = setTimeout(onFermer, 6000);
    return () => clearTimeout(minuterie);
  }, [celebrations, onFermer]);

  if (!celebrations) return null;

  return (
    <div className="celebration-fond" role="dialog" aria-label="Félicitations" onClick={onFermer}>
      <div className="celebration-carte" onClick={(e) => e.stopPropagation()}>
        <span className="celebration-confettis" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => <span key={i} className={`confetti confetti-${i % 7}`} />)}
        </span>

        {celebrations.nouveauRang && (
          <div className="celebration-item">
            <BadgeRang rang={celebrations.nouveauRang} taille={64} />
            <p className="celebration-titre">Nouveau rang !</p>
            <p className="celebration-texte">{libelleRang(celebrations.nouveauRang)}</p>
          </div>
        )}

        {celebrations.streak && (
          <div className="celebration-item">
            <Flamme allumee taille={44} />
            <p className="celebration-titre">{celebrations.streak} jours d'affilée !</p>
          </div>
        )}

        {celebrations.records?.map((r) => (
          <div key={r.nom} className="celebration-item">
            <p className="celebration-titre">Nouveau record 💪</p>
            <p className="celebration-texte">{r.nom} — {formaterNombre(r.poids)} kg × {r.repetitions}</p>
          </div>
        ))}

        <button type="button" className="bouton-principal" onClick={onFermer}>Continuer</button>
      </div>
    </div>
  );
}
