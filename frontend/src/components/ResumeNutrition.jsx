import { Link } from 'react-router';
import { formaterNombre } from '../lib/format.js';
import { MACROS, progression } from '../lib/journal.js';

// Calories et macros consommées face à l'objectif. Utilisé par le journal et le dashboard.
export default function ResumeNutrition({ total, objectif, lien }) {
  if (!objectif) {
    return (
      <div className="carte resume-journee">
        <EnTete titre="Consommé" lien={lien} />
        <p className="calories">
          <span className="calories-valeur">{formaterNombre(total.calories)}</span>
          <span className="calories-unite">kcal</span>
        </p>
        <p className="info">
          Pas encore d'objectif. <Link to="/">Calcule tes besoins</Link> puis enregistre-les pour suivre ta journée.
        </p>
      </div>
    );
  }

  const ecart = objectif.calories - total.calories;
  return (
    <div className="carte resume-journee">
      <EnTete titre="Calories" lien={lien} />
      <p className="calories">
        <span className="calories-valeur">{formaterNombre(total.calories)}</span>
        <span className="calories-unite">/ {formaterNombre(objectif.calories)} kcal</span>
      </p>
      <BarreProgression valeur={progression(total.calories, objectif.calories)} depasse={ecart < 0} />
      <p className={`calories-contexte${ecart < 0 ? ' depasse' : ''}`}>
        {ecart >= 0
          ? `Il te reste ${formaterNombre(ecart)} kcal`
          : `${formaterNombre(-ecart)} kcal au-dessus de ton objectif`}
      </p>

      <ul className="macros-journee">
        {Object.entries(MACROS).map(([cle, macro]) => (
          <li key={cle}>
            <div className="macro-ligne">
              <span className="macro-nom">{macro.label}</span>
              <span className="macro-valeurs">
                {formaterNombre(total[cle])} <span className="texte-doux">/ {objectif[cle]} g</span>
              </span>
            </div>
            <BarreProgression valeur={progression(total[cle], objectif[cle])} classe={`macro-${cle}`} fine />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EnTete({ titre, lien }) {
  return (
    <div className="carte-entete">
      <p className="surtitre">{titre}</p>
      {lien && <Link to={lien.vers} className="lien lien-petit">{lien.texte} ›</Link>}
    </div>
  );
}

function BarreProgression({ valeur, depasse = false, classe = '', fine = false }) {
  return (
    <div className={`barre-progression${fine ? ' fine' : ''}`} aria-hidden="true">
      <span className={`${classe}${depasse ? ' depasse' : ''}`} style={{ width: `${valeur * 100}%` }} />
    </div>
  );
}
