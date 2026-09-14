import { formaterNombre } from '../lib/format.js';

// Résultat du calculateur de calories/macros (extrait pour être réutilisé par l'onboarding,
// étape 3 : "ton programme alimentaire sur 1 mois" s'appuie sur ce même calcul).
export default function ResultatMacros({ resultat, poids, titre = 'Ton objectif quotidien' }) {
  const { calories, metabolismeBase, maintenance, ajustement, plancherApplique } = resultat;
  const macros = [
    { cle: 'proteines', label: 'Protéines', grammes: resultat.proteines, kcalParGramme: 4,
      detail: `${formaterNombre(resultat.proteinesParKg)} g/kg` },
    { cle: 'glucides', label: 'Glucides', grammes: resultat.glucides, kcalParGramme: 4,
      detail: `${formaterNombre(Math.round((resultat.glucides / poids) * 10) / 10)} g/kg` },
    { cle: 'lipides', label: 'Lipides', grammes: resultat.lipides, kcalParGramme: 9,
      detail: `${formaterNombre(Math.round((resultat.lipides / poids) * 10) / 10)} g/kg` },
  ].map((m) => ({ ...m, kcal: m.grammes * m.kcalParGramme }));
  const totalKcal = macros.reduce((somme, m) => somme + m.kcal, 0);

  const pourcentageAjustement = Math.round(ajustement * 100);
  const libelleAjustement = pourcentageAjustement === 0
    ? 'maintenance'
    : `${pourcentageAjustement > 0 ? '+' : '−'}${Math.abs(pourcentageAjustement)} % vs maintenance`;

  return (
    <section className="carte resultat" aria-live="polite">
      <p className="surtitre">{titre}</p>
      <p className="calories">
        <span className="calories-valeur">{formaterNombre(calories)}</span>
        <span className="calories-unite">kcal</span>
      </p>
      <p className="calories-contexte">{libelleAjustement}</p>

      {plancherApplique && (
        <p className="avertissement">
          Le calcul donnait moins que le minimum conseillé : on l'a relevé. Pour un déficit plus
          agressif, fais-toi accompagner par un professionnel de santé.
        </p>
      )}

      <div className="barre-macros" role="img" aria-label="Répartition des calories entre les macros">
        {macros.map((m) => (
          <span key={m.cle} className={`segment-macro macro-${m.cle}`} style={{ flexGrow: m.kcal }} />
        ))}
      </div>

      <ul className="liste-macros">
        {macros.map((m) => (
          <li key={m.cle}>
            <span className={`pastille macro-${m.cle}`} aria-hidden="true" />
            <span className="macro-nom">{m.label}</span>
            <span className="macro-grammes">{m.grammes} g</span>
            <span className="macro-detail">
              {Math.round((m.kcal / totalKcal) * 100)} % · {m.detail}
            </span>
          </li>
        ))}
      </ul>

      <dl className="details-calcul">
        <div>
          <dt>Métabolisme de base</dt>
          <dd>{formaterNombre(metabolismeBase)} kcal</dd>
        </div>
        <div>
          <dt>Maintenance</dt>
          <dd>{formaterNombre(maintenance)} kcal</dd>
        </div>
      </dl>
    </section>
  );
}
