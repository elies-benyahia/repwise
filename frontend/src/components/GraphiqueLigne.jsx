import { useEffect, useRef, useState } from 'react';
import { depuisCle } from '../lib/dates.js';

// Courbe d'une seule série dans le temps (skill dataviz) : ligne 2 px, lavis à 10 %, grille
// 1 px discrète, valeur annotée en bout de courbe seulement, réticule + info-bulle au survol,
// au doigt et au clavier, et tableau des valeurs pour qui ne lit pas le graphique.
const HAUTEUR = 200;
const MARGE = { haut: 16, droite: 56, bas: 28, gauche: 40 };

const dateCourte = (cle) => depuisCle(cle).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

// Graduations "rondes" (1, 2, 2,5, 5 × 10^n) couvrant [min, max].
function graduations(min, max, cible = 4) {
  const brut = (max - min) / cible || 1;
  const puissance = 10 ** Math.floor(Math.log10(brut));
  const pas = [1, 2, 2.5, 5, 10].map((m) => m * puissance).find((p) => p >= brut);
  const debut = Math.floor(min / pas) * pas;
  const fin = Math.ceil(max / pas) * pas;
  const valeurs = [];
  for (let v = debut; v <= fin + pas / 2; v += pas) valeurs.push(Math.round(v * 100) / 100);
  return valeurs;
}

function useLargeur(ref) {
  const [largeur, setLargeur] = useState(340);
  useEffect(() => {
    const observateur = new ResizeObserver(([entree]) => setLargeur(Math.round(entree.contentRect.width)));
    observateur.observe(ref.current);
    return () => observateur.disconnect();
  }, [ref]);
  return largeur;
}

export default function GraphiqueLigne({ points, formaterValeur, libelleValeur, titre }) {
  const conteneur = useRef(null);
  const largeur = useLargeur(conteneur);
  const [actif, setActif] = useState(null);

  const temps = points.map((p) => Date.parse(p.date));
  let [tMin, tMax] = [Math.min(...temps), Math.max(...temps)];
  if (tMin === tMax) [tMin, tMax] = [tMin - 86_400_000, tMax + 86_400_000];
  const valeurs = points.map((p) => p.valeur);
  const marge = Math.max((Math.max(...valeurs) - Math.min(...valeurs)) * 0.15, 1);
  const ticks = graduations(Math.min(...valeurs) - marge, Math.max(...valeurs) + marge);
  const [vMin, vMax] = [ticks[0], ticks.at(-1)];

  const zone = { gauche: MARGE.gauche, droite: largeur - MARGE.droite, haut: MARGE.haut, bas: HAUTEUR - MARGE.bas };
  const x = (t) => zone.gauche + ((t - tMin) / (tMax - tMin)) * (zone.droite - zone.gauche);
  const y = (v) => zone.bas - ((v - vMin) / (vMax - vMin)) * (zone.bas - zone.haut);
  const coords = points.map((p, i) => [x(temps[i]), y(p.valeur)]);
  const trace = coords.map(([cx, cy], i) => `${i === 0 ? 'M' : 'L'}${cx},${cy}`).join(' ');
  const lavis = `${trace} L${coords.at(-1)[0]},${zone.bas} L${coords[0][0]},${zone.bas} Z`;
  const dernier = coords.at(-1);

  // Le réticule s'aligne sur le point le plus proche en X : on vise une date, pas un trait de 2 px.
  function suivre(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * largeur;
    let meilleur = 0;
    coords.forEach(([cx], i) => {
      if (Math.abs(cx - px) < Math.abs(coords[meilleur][0] - px)) meilleur = i;
    });
    setActif(meilleur);
  }

  function clavier(e) {
    if (e.key === 'ArrowLeft') setActif((i) => Math.max(0, (i ?? points.length) - 1));
    else if (e.key === 'ArrowRight') setActif((i) => Math.min(points.length - 1, (i ?? -1) + 1));
    else return;
    e.preventDefault();
  }

  const pointActif = actif === null ? null : points[actif];
  const xActif = actif === null ? 0 : coords[actif][0];

  return (
    <div className="graphique">
      <div ref={conteneur} className="graphique-zone">
        <svg
          width={largeur}
          height={HAUTEUR}
          role="img"
          aria-label={`${titre} : ${points.length} relevés, dernier ${formaterValeur(points.at(-1).valeur)}`}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className="graphique-grille" x1={zone.gauche} x2={zone.droite} y1={y(t)} y2={y(t)} />
              <text className="graphique-axe" x={zone.gauche - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">
                {t.toLocaleString('fr-FR')}
              </text>
            </g>
          ))}
          <text className="graphique-axe" x={coords[0][0]} y={HAUTEUR - 8} textAnchor="start">{dateCourte(points[0].date)}</text>
          {points.length > 1 && (
            <text className="graphique-axe" x={dernier[0]} y={HAUTEUR - 8} textAnchor="end">{dateCourte(points.at(-1).date)}</text>
          )}

          {points.length > 1 && <path className="graphique-lavis" d={lavis} />}
          {points.length > 1 && <path className="graphique-ligne" d={trace} />}
          <circle className="graphique-point" cx={dernier[0]} cy={dernier[1]} r="4" />
          <text className="graphique-etiquette" x={dernier[0] + 8} y={dernier[1]} dominantBaseline="middle">
            {formaterValeur(points.at(-1).valeur)}
          </text>

          {pointActif && (
            <>
              <line className="graphique-reticule" x1={xActif} x2={xActif} y1={zone.haut} y2={zone.bas} />
              <circle className="graphique-point" cx={xActif} cy={coords[actif][1]} r="5" />
            </>
          )}
          {/* Zone de survol : toute la hauteur du tracé, bien plus grande que les points. */}
          <rect
            className="graphique-survol"
            x={zone.gauche - 8}
            y={0}
            width={zone.droite - zone.gauche + 16}
            height={HAUTEUR}
            tabIndex={0}
            aria-label={`${titre} : flèches gauche et droite pour parcourir les relevés`}
            onPointerMove={suivre}
            onPointerDown={suivre}
            onPointerLeave={() => setActif(null)}
            onFocus={() => setActif(points.length - 1)}
            onBlur={() => setActif(null)}
            onKeyDown={clavier}
          />
        </svg>
        {pointActif && (
          <div
            className="graphique-bulle"
            role="status"
            /* Au-dessus du point survolé, sans jamais sortir du cadre du graphique par le haut. */
            style={{ left: Math.min(Math.max(xActif, 60), largeur - 60), top: Math.max(coords[actif][1] - 12, 44) }}
          >
            <strong>{formaterValeur(pointActif.valeur)}</strong>
            <span>{dateCourte(pointActif.date)}</span>
          </div>
        )}
      </div>

      <details className="graphique-tableau">
        <summary>Voir les valeurs</summary>
        <table>
          <thead>
            <tr><th scope="col">Date</th><th scope="col">{libelleValeur}</th></tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.date}><td>{dateCourte(p.date)}</td><td>{formaterValeur(p.valeur)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
