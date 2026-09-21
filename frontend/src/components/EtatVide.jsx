// Retour du 21/09 ("états vides illustrés") : petite icône + un texte plus chaleureux qu'une
// simple ligne d'aide grise, pour les moments où il n'y a encore rien à montrer (premier jour,
// premier groupe...). Mêmes icônes traits (stroke, currentColor) que .hero-avatar dans styles.css,
// pour rester dans le même vocabulaire visuel que le reste du site plutôt que d'importer un style
// d'illustration différent.
const ICONES = {
  seance: (
    <>
      <rect x="2" y="10" width="3" height="4" rx="1" />
      <rect x="6" y="7" width="2.5" height="10" rx="1" />
      <path d="M8.5 12h7" />
      <rect x="15.5" y="7" width="2.5" height="10" rx="1" />
      <rect x="19" y="10" width="3" height="4" rx="1" />
    </>
  ),
  repas: (
    <>
      <path d="M5 3v7a2 2 0 0 0 2 2v9" />
      <path d="M5 3v5M8 3v5" />
      <path d="M17 3c-1.7 0-3 2.1-3 5s1.3 5 3 5v9" />
    </>
  ),
  groupe: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" />
      <circle cx="18" cy="9" r="2.4" />
      <path d="M15.5 14.3c2.6.4 4.5 2.5 4.5 5.7" />
    </>
  ),
  calendrier: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  classement: (
    <>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v6a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5" />
    </>
  ),
};

export default function EtatVide({ icone, titre, texte, action }) {
  return (
    <div className="etat-vide">
      <span className="etat-vide-icone" aria-hidden="true">
        <svg viewBox="0 0 24 24">{ICONES[icone]}</svg>
      </span>
      {titre && <p className="etat-vide-titre">{titre}</p>}
      {texte && <p className="aide">{texte}</p>}
      {action}
    </div>
  );
}
