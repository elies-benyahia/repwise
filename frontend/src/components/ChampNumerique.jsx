// Champ texte plutôt que type="number" : accepte la virgule et affiche le bon clavier mobile via inputMode.
export default function ChampNumerique({ id, label, unite, inputMode, valeur, onChange, erreur }) {
  return (
    <div className={`champ${erreur ? ' champ-erreur' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="champ-saisie">
        <input
          id={id}
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          value={valeur}
          onChange={onChange}
          aria-invalid={Boolean(erreur)}
          aria-describedby={erreur ? `${id}-erreur` : undefined}
        />
        <span className="unite">{unite}</span>
      </div>
      {erreur && <p id={`${id}-erreur`} className="message-erreur">{erreur}</p>}
    </div>
  );
}
