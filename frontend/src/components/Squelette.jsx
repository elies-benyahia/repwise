// Retour du 21/09 ("squelettes de chargement") : remplace le texte "Chargement…" par des blocs
// qui pulsent doucement, à la forme du contenu réel (carte, ligne, cercle) — attend moins abrupt
// qu'un texte brut. Composants ultra simples volontairement : pas un squelette par page, juste
// quelques briques combinées au cas par cas dans chaque page.
export function LigneSquelette({ largeur = '100%', hauteur = 14 }) {
  return <span className="squelette squelette-ligne" style={{ width: largeur, height: hauteur }} aria-hidden="true" />;
}

export function CercleSquelette({ taille = 40 }) {
  return <span className="squelette squelette-cercle" style={{ width: taille, height: taille }} aria-hidden="true" />;
}

export function CarteSquelette({ lignes = 2 }) {
  return (
    <div className="carte squelette-carte" aria-hidden="true">
      <LigneSquelette largeur="40%" hauteur={11} />
      {Array.from({ length: lignes }, (_, i) => (
        <LigneSquelette key={i} largeur={i === lignes - 1 ? '65%' : '90%'} />
      ))}
    </div>
  );
}
