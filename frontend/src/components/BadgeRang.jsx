import { useId } from 'react';
import { BARRES_PALIER, COULEURS_RANGS } from '../lib/rangs.js';

// Gemme hexagonale à facettes avec glow (cahier des charges : plus flashy que le reste du site,
// c'est l'endroit où la gamification doit donner envie). Retour utilisateur (images de
// référence, 13/09) : plus proche d'un vrai cristal à pointes façon rang de jeu compétitif —
// ajout d'une "aura" de pointes qui rayonnent depuis chaque sommet de l'hexagone, d'un halo à
// deux couches et de deux éclats supplémentaires, en gardant un SVG procédural (pas d'image
// fournie en fichier, seulement des captures dans le chat — voir README) pour rester léger et
// recolorable par rang sans dupliquer un asset par couleur.
const CENTRE = [32, 31];
const EXTERIEUR = [[32, 2], [58, 16], [58, 46], [32, 60], [6, 46], [6, 16]];
const TABLE = [[32, 16], [45, 23], [45, 39], [32, 46], [19, 39], [19, 23]];
// Éclairage venant d'en haut à gauche : une teinte par facette, dans l'ordre des côtés.
const FACETTES = [
  ['#fff', 0.22], ['#000', 0.12], ['#000', 0.3], ['#000', 0.22], ['#fff', 0.06], ['#fff', 0.4],
];
const points = (liste) => liste.map((p) => p.join(',')).join(' ');

// Pointe fine qui dépasse de chaque sommet de l'hexagone (base = deux points proches du sommet
// le long des arêtes voisines, pointe = le sommet éloigné du centre) — l'"aura" à 6 branches.
const POINTE_FACTEUR = 1.12;
const BASE_FACTEUR = 0.32;
const eloigner = ([x, y], facteur) => [CENTRE[0] + (x - CENTRE[0]) * facteur, CENTRE[1] + (y - CENTRE[1]) * facteur];
const AURA = EXTERIEUR.map((sommet, i) => {
  const precedent = EXTERIEUR[(i + 5) % 6];
  const suivant = EXTERIEUR[(i + 1) % 6];
  const baseGauche = [sommet[0] + (precedent[0] - sommet[0]) * BASE_FACTEUR, sommet[1] + (precedent[1] - sommet[1]) * BASE_FACTEUR];
  const baseDroite = [sommet[0] + (suivant[0] - sommet[0]) * BASE_FACTEUR, sommet[1] + (suivant[1] - sommet[1]) * BASE_FACTEUR];
  return [baseGauche, eloigner(sommet, POINTE_FACTEUR), baseDroite];
});

// Petit éclat en croix (façon étoile à 4 branches), réutilisé à plusieurs endroits.
function Eclat({ x, y, taille = 7, opacite = 0.85 }) {
  const t = taille;
  return (
    <path
      d={`M${x} ${y - t} L${x + t * 0.3} ${y - t * 0.3} L${x + t} ${y} L${x + t * 0.3} ${y + t * 0.3}
          L${x} ${y + t} L${x - t * 0.3} ${y + t * 0.3} L${x - t} ${y} L${x - t * 0.3} ${y - t * 0.3} Z`}
      fill="#fff"
      fillOpacity={opacite}
    />
  );
}

export default function BadgeRang({ rang, taille = 64 }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const couleurs = COULEURS_RANGS[rang.rang];
  const barres = BARRES_PALIER[rang.palier];
  // Le halo grandit avec le rang, sur deux couches (large et diffus + serré et net) pour un
  // vrai effet de glow plutôt qu'une ombre portée plate.
  const haloLarge = 5 + rang.rang * 2.2;
  const haloSerre = 2 + rang.rang * 0.7;

  return (
    <svg
      className="badge-rang"
      width={taille}
      height={taille * (80 / 64)}
      viewBox="0 0 64 80"
      role="img"
      aria-label={`Rang ${rang.nom} ${rang.palier}`}
      style={{
        filter: `drop-shadow(0 0 ${haloLarge}px ${couleurs.base}80) drop-shadow(0 0 ${haloSerre}px ${couleurs.clair}b0)`,
      }}
    >
      <defs>
        <linearGradient id={`${id}-degrade`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={couleurs.clair} />
          <stop offset="0.55" stopColor={couleurs.base} />
          <stop offset="1" stopColor={couleurs.sombre} />
        </linearGradient>
        <linearGradient id={`${id}-aura`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={couleurs.clair} stopOpacity="0.9" />
          <stop offset="1" stopColor={couleurs.base} stopOpacity="0.25" />
        </linearGradient>
      </defs>

      <g transform="translate(0,6)">
        {/* Aura à 6 pointes, sous la gemme principale. */}
        {AURA.map((triangle, i) => (
          <polygon key={i} points={points(triangle)} fill={`url(#${id}-aura)`} stroke={couleurs.clair} strokeOpacity="0.5" strokeWidth="0.5" />
        ))}

        <polygon points={points(EXTERIEUR)} fill={`url(#${id}-degrade)`} />
        {FACETTES.map(([couleur, opacite], i) => {
          const suivant = (i + 1) % 6;
          return (
            <polygon
              key={i}
              points={points([EXTERIEUR[i], EXTERIEUR[suivant], TABLE[suivant], TABLE[i]])}
              fill={couleur}
              fillOpacity={opacite}
            />
          );
        })}
        <polygon points={points(TABLE)} fill="#fff" fillOpacity="0.14" />
        <polygon points={points(EXTERIEUR)} fill="none" stroke={couleurs.clair} strokeOpacity="0.7" strokeWidth="1" />

        {/* Éclats : un principal sur la table, deux plus petits sur des pointes de l'aura. */}
        <Eclat x={24} y={20} taille={4.5} />
        <Eclat x={58} y={16} taille={3} opacite={0.7} />
        <Eclat x={9} y={44} taille={2.5} opacite={0.6} />

        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={20 + i * 9}
            y="66"
            width="7"
            height="4"
            rx="2"
            fill={i < barres ? couleurs.clair : '#2a2f35'}
          />
        ))}
      </g>
    </svg>
  );
}
