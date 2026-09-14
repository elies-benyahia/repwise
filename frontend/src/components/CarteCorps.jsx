import { DEMI_SILHOUETTE, GROUPES_MUSCULAIRES, ZONES } from '../lib/muscles.js';

const MIROIR = 'translate(200 0) scale(-1 1)';

// Silhouette avant ou arrière ; chaque groupe musculaire est une zone cliquable (souris, doigt
// ou clavier). Les puces sous la carte offrent la même chose pour les petites zones.
export default function CarteCorps({ vue, selection, onChoisir }) {
  return (
    <svg
      className="carte-corps"
      viewBox="0 0 200 420"
      role="group"
      aria-label={`Silhouette vue de ${vue === 'avant' ? 'face' : 'dos'}`}
    >
      <g className="silhouette" aria-hidden="true">
        <ellipse cx="100" cy="30" rx="17" ry="21" />
        <path d={DEMI_SILHOUETTE} />
        <path d={DEMI_SILHOUETTE} transform={MIROIR} />
      </g>
      {ZONES[vue].map(([groupe, trace]) => (
        <g
          key={groupe}
          className={`zone-muscle${groupe === selection ? ' selectionnee' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={GROUPES_MUSCULAIRES[groupe]}
          aria-pressed={groupe === selection}
          onClick={() => onChoisir(groupe)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onChoisir(groupe);
            }
          }}
        >
          <title>{GROUPES_MUSCULAIRES[groupe]}</title>
          <path d={trace} />
          <path d={trace} transform={MIROIR} />
        </g>
      ))}
    </svg>
  );
}
