import { useTitre } from '../hooks/useTitre.js';
import { CREDITS_IMAGES_EXERCICES } from '../lib/credits.js';

// Attribution exigée par les licences CC BY-SA/CC0/CC-BY des images de la bibliothèque
// d'exercices (cahier §3/§10, voir database/bibliotheque-images.sql) — toutes viennent de
// wger.de, projet de suivi de musculation open source.
export default function Credits() {
  useTitre('Crédits');
  return (
    <section className="credits">
      <h1>Crédits</h1>
      <p className="aide">
        Les images de démonstration de la bibliothèque d'exercices viennent de{' '}
        <a href="https://wger.de" target="_blank" rel="noreferrer">wger.de</a>, un projet open
        source de suivi de musculation, sous licence Creative Commons (attribution ci-dessous par
        exercice, comme l'exige chaque licence).
      </p>
      <ul className="liste-credits">
        {CREDITS_IMAGES_EXERCICES.map((c) => (
          <li key={c.nom}>
            <span className="credits-nom">{c.nom}</span>
            <span className="aide">
              {c.auteur} · {c.licence} ·{' '}
              <a href={c.sourceUrl} target="_blank" rel="noreferrer">source</a>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
