// Icône de streak : allumée (orange avec halo) dès qu'une série est en cours.
export default function Flamme({ allumee, taille }) {
  return (
    <svg
      className={`flamme${allumee ? ' allumee' : ''}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={taille ? { width: taille, height: taille } : undefined}
    >
      <path d="M12 2.5c.8 3 3.2 4.6 4.6 7 1.9 3.2.9 7.6-2.4 9.3-3.9 2-8.7-.4-9.2-4.8-.3-2.4.7-4.3 2.2-5.8.1 1.8 1 3 2.4 3.4-.6-3.3.4-6.4 2.4-9.1Z" />
    </svg>
  );
}
