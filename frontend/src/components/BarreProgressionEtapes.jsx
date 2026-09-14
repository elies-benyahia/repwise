// Barre de progression de l'onboarding (retour de test utilisateur : "trop d'informations
// demandées d'un coup" → 4 étapes courtes, avec ce repère visuel de where-am-I.
export default function BarreProgressionEtapes({ etape, total, libelles }) {
  return (
    <div className="barre-etapes" role="group" aria-label={`Étape ${etape} sur ${total}`}>
      <ol className="barre-etapes-segments" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
          <li key={n} className={n <= etape ? 'faite' : undefined} />
        ))}
      </ol>
      <p className="barre-etapes-libelle">Étape {etape} sur {total}{libelles?.[etape - 1] ? ` · ${libelles[etape - 1]}` : ''}</p>
    </div>
  );
}
