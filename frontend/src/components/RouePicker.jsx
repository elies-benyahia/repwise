import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

const HAUTEUR_LIGNE = 40;
const LIGNES_VISIBLES = 5;

// Sélecteur "molette" (poids, taille) : défilement à encoches, la valeur centrée est la valeur
// choisie. Une saisie manuelle est proposée en complément, mais n'accepte que des chiffres —
// c'est la roue qui reste la source de vérité, la saisie ne fait que la faire défiler.
export default function RouePicker({ id, label, unite, min, max, step = 1, valeur, onChange }) {
  const ref = useRef(null);
  const valeurs = useMemo(() => {
    const liste = [];
    for (let v = min; v <= max; v += step) liste.push(Math.round(v * 100) / 100);
    return liste;
  }, [min, max, step]);
  const index = valeur == null ? -1 : valeurs.indexOf(valeur);

  // Repositionne la roue quand la valeur change de l'extérieur (préremplissage, saisie manuelle).
  useLayoutEffect(() => {
    if (index < 0 || !ref.current) return;
    ref.current.scrollTop = index * HAUTEUR_LIGNE;
  }, [index]);

  useEffect(() => {
    const conteneur = ref.current;
    if (!conteneur) return undefined;
    let ras = null;
    // Un seul écouteur passif, throttlé par requestAnimationFrame : le scroll d'une roue
    // déclenche beaucoup d'événements, pas la peine de recalculer à chaque pixel.
    function surScroll() {
      if (ras) return;
      ras = requestAnimationFrame(() => {
        ras = null;
        const i = Math.round(conteneur.scrollTop / HAUTEUR_LIGNE);
        const v = valeurs[Math.min(Math.max(i, 0), valeurs.length - 1)];
        if (v !== undefined && v !== valeur) onChange(v);
      });
    }
    conteneur.addEventListener('scroll', surScroll, { passive: true });
    return () => {
      conteneur.removeEventListener('scroll', surScroll);
      if (ras) cancelAnimationFrame(ras);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- valeurs/onChange stables en pratique (voir composant appelant)
  }, [valeurs]);

  function surSaisieManuelle(e) {
    const chiffres = e.target.value.replace(/\D/g, '');
    const nombre = chiffres === '' ? NaN : Number(chiffres);
    if (Number.isFinite(nombre)) onChange(Math.min(Math.max(nombre, min), max));
  }

  const idListe = `${id}-liste`;

  return (
    <div className="roue-champ">
      <label htmlFor={idListe}>{label}</label>
      <div className="roue" style={{ height: HAUTEUR_LIGNE * LIGNES_VISIBLES }}>
        <div className="roue-surbrillance" aria-hidden="true" style={{ height: HAUTEUR_LIGNE }} />
        <div
          id={idListe}
          ref={ref}
          className="roue-liste"
          role="listbox"
          aria-label={label}
          tabIndex={0}
          style={{ scrollPaddingBlock: (HAUTEUR_LIGNE * (LIGNES_VISIBLES - 1)) / 2 }}
        >
          <div style={{ height: HAUTEUR_LIGNE * Math.floor(LIGNES_VISIBLES / 2) }} aria-hidden="true" />
          {valeurs.map((v) => (
            <div
              key={v}
              role="option"
              aria-selected={v === valeur}
              className={`roue-ligne${v === valeur ? ' choisie' : ''}`}
              style={{ height: HAUTEUR_LIGNE }}
              onClick={() => onChange(v)}
            >
              {v}
            </div>
          ))}
          <div style={{ height: HAUTEUR_LIGNE * Math.floor(LIGNES_VISIBLES / 2) }} aria-hidden="true" />
        </div>
      </div>
      <div className="roue-manuel">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={`${label}, saisie directe`}
          placeholder="…"
          value={valeur ?? ''}
          onChange={surSaisieManuelle}
        />
        <span className="unite">{unite}</span>
      </div>
    </div>
  );
}
