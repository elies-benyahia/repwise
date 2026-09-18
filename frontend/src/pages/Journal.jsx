import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import ChampNumerique from '../components/ChampNumerique.jsx';
import ResumeNutrition from '../components/ResumeNutrition.jsx';
import { useTitre } from '../hooks/useTitre.js';
import { appelerApi } from '../lib/api.js';
import { aujourdhui, depuisCle, estJourValide, formaterJour, versCle } from '../lib/dates.js';
import { formaterNombre, versNombre } from '../lib/format.js';
import {
  MACROS, REPAS, alimentEchelle, corpsEntree, repasParDefaut, totaux, versAlimentDepuisEntree,
} from '../lib/journal.js';

const decalerJour = (jour, delta) => {
  const date = depuisCle(jour);
  date.setDate(date.getDate() + delta);
  return versCle(date);
};

export default function Journal() {
  useTitre('Journal alimentaire');
  // Jour dans l'URL (?date=), borné à aujourd'hui : on ne remplit pas le journal à l'avance.
  const [parametres, setParametres] = useSearchParams();
  const jourCourant = aujourdhui();
  const demande = parametres.get('date');
  const date = estJourValide(demande) && demande <= jourCourant ? demande : jourCourant;

  const [journee, setJournee] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [tentative, setTentative] = useState(0);
  const [recents, setRecents] = useState([]);
  // Retour du 15/09 ("on peut pas changer le nombre de grammes") : édition d'une entrée déjà
  // enregistrée, via le même formulaire que l'ajout (reconstruit son pour100g d'origine).
  const [edition, setEdition] = useState(null); // { id, aliment, quantite, repas } | null
  const [erreurEdition, setErreurEdition] = useState(null);
  const [envoiEditionEnCours, setEnvoiEditionEnCours] = useState(false);

  useEffect(() => {
    let abandonne = false;
    setJournee(null);
    setErreur(null);
    appelerApi(`/journal/${date}`)
      .then((donnees) => !abandonne && setJournee(donnees))
      .catch(() => !abandonne && setErreur('Impossible de charger ton journal.'));
    return () => {
      abandonne = true;
    };
  }, [date, tentative]);

  function chargerRecents() {
    appelerApi('/journal/aliments-recents')
      .then(({ aliments }) => setRecents(aliments))
      .catch(() => {}); // Raccourcis seulement : la recherche reste possible sans ça.
  }
  useEffect(chargerRecents, []);

  async function ajouter(corps) {
    const { entree } = await appelerApi('/journal', { methode: 'POST', corps });
    setJournee((j) => ({ ...j, entrees: [...j.entrees, entree] }));
    chargerRecents();
  }

  async function supprimer(id) {
    await appelerApi(`/journal/entrees/${id}`, { methode: 'DELETE' });
    setJournee((j) => ({ ...j, entrees: j.entrees.filter((e) => e.id !== id) }));
  }

  function ouvrirEdition(entree) {
    setErreurEdition(null);
    setEdition({ id: entree.id, aliment: versAlimentDepuisEntree(entree), quantite: entree.quantite, repas: entree.repas });
  }

  async function confirmerEdition() {
    setErreurEdition(null);
    setEnvoiEditionEnCours(true);
    try {
      const corps = { repas: edition.repas, quantite: edition.quantite, ...alimentEchelle(edition.aliment, edition.quantite) };
      const { entree } = await appelerApi(`/journal/entrees/${edition.id}`, { methode: 'PATCH', corps });
      setJournee((j) => ({ ...j, entrees: j.entrees.map((e) => (e.id === entree.id ? entree : e)) }));
      setEdition(null);
    } catch (err) {
      setErreurEdition(err.message);
    } finally {
      setEnvoiEditionEnCours(false);
    }
  }

  const allerAuJour = (jour) => setParametres(jour === jourCourant ? {} : { date: jour });

  return (
    <section className="journal">
      <div className="calendrier-entete">
        <button type="button" className="bouton-icone" onClick={() => allerAuJour(decalerJour(date, -1))} aria-label="Jour précédent">‹</button>
        <h1>{date === jourCourant ? "Aujourd'hui" : formaterJour(date)}</h1>
        <button
          type="button"
          className="bouton-icone"
          onClick={() => allerAuJour(decalerJour(date, 1))}
          disabled={date === jourCourant}
          aria-label="Jour suivant"
        >
          ›
        </button>
      </div>

      {erreur && (
        <p className="alerte" role="alert">
          {erreur}{' '}
          <button type="button" className="lien" onClick={() => setTentative((n) => n + 1)}>Réessayer</button>
        </p>
      )}
      {!journee && !erreur && <p className="aide">Chargement…</p>}

      {journee && (
        <>
          <ResumeNutrition total={totaux(journee.entrees)} objectif={journee.objectif} />
          <ListeRepas entrees={journee.entrees} onSupprimer={supprimer} onModifier={ouvrirEdition} />
          {edition ? (
            <SelectionAliment
              selection={edition}
              onChange={setEdition}
              onConfirmer={confirmerEdition}
              onAnnuler={() => setEdition(null)}
              erreur={erreurEdition}
              envoiEnCours={envoiEditionEnCours}
              edition
            />
          ) : (
            // key : recherche neuve à chaque changement de jour.
            <RechercheAliment key={date} date={date} recents={recents} onAjouter={ajouter} />
          )}
        </>
      )}
    </section>
  );
}

function ListeRepas({ entrees, onSupprimer, onModifier }) {
  const [erreur, setErreur] = useState(null);

  if (entrees.length === 0) return <p className="aide journal-vide">Rien de noté pour ce jour.</p>;

  async function supprimer(id) {
    setErreur(null);
    try {
      await onSupprimer(id);
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div className="liste-repas">
      {erreur && <p className="alerte" role="alert">{erreur}</p>}
      {Object.entries(REPAS).map(([cle, label]) => {
        const duRepas = entrees.filter((e) => e.repas === cle);
        if (duRepas.length === 0) return null;
        return (
          <section key={cle} className="repas">
            <h2>
              <span>{label}</span>
              <span className="repas-total">{formaterNombre(totaux(duRepas).calories)} kcal</span>
            </h2>
            <ul>
              {duRepas.map((entree) => (
                <li key={entree.id} className="ligne-aliment">
                  <button
                    type="button"
                    className="ligne-aliment-bouton"
                    onClick={() => onModifier(entree)}
                    aria-label={`Modifier la quantité de ${entree.nomAliment}`}
                  >
                    {entree.imageUrl && <img src={entree.imageUrl} alt="" className="aliment-image" />}
                    <div>
                      <span className="aliment-nom">{entree.nomAliment} <span className="texte-doux">· {formaterNombre(entree.quantite)} g</span></span>
                      <span className="aliment-detail">
                        {formaterNombre(entree.calories)} kcal
                        {Object.entries(MACROS).map(([m, { court }]) => ` · ${court} ${formaterNombre(entree[m])}`)}
                        {entree.sucre > 0 && ` · sucre ${formaterNombre(entree.sucre)}`}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="bouton-icone bouton-icone-petit"
                    onClick={() => supprimer(entree.id)}
                    aria-label={`Supprimer ${entree.nomAliment}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// Revenu sur la limite volontaire initiale (cahier §3) : recherche dans Open Food Facts
// (backend/src/alimentation) plutôt que saisie manuelle des valeurs — vraies calories/macros et
// une image, pour chaque aliment choisi. "Récents" reste un raccourci direct (ré-ajoute la même
// quantité) ; toucher son nom rouvre la sélection pour ajuster la quantité avant d'ajouter.
function RechercheAliment({ date, recents, onAjouter }) {
  const [terme, setTerme] = useState('');
  const [resultats, setResultats] = useState([]);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [erreurRecherche, setErreurRecherche] = useState(null);
  const [selection, setSelection] = useState(null); // { aliment, quantite, repas }
  const [erreurAjout, setErreurAjout] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  // Retour du 18/09 ("saisie manuelle d'aliment") : secours pour un plat maison absent d'Open Food
  // Facts et de la bibliothèque locale — un simple formulaire pour100g qui rejoint ensuite le même
  // choisir()/SelectionAliment que la recherche, plutôt qu'un flux séparé.
  const [saisieManuelle, setSaisieManuelle] = useState(false);

  useEffect(() => {
    if (terme.trim().length < 2) {
      setResultats([]);
      setErreurRecherche(null);
      return undefined;
    }
    let abandonne = false;
    setRechercheEnCours(true);
    const minuterie = setTimeout(() => {
      appelerApi(`/aliments/recherche?q=${encodeURIComponent(terme.trim())}`)
        .then(({ aliments }) => {
          if (!abandonne) {
            setResultats(aliments);
            setErreurRecherche(aliments.length === 0 ? 'Aucun résultat. Essaie un nom plus simple ou en anglais.' : null);
          }
        })
        .catch((err) => !abandonne && setErreurRecherche(err.message))
        .finally(() => !abandonne && setRechercheEnCours(false));
    }, 350);
    return () => {
      abandonne = true;
      clearTimeout(minuterie);
    };
  }, [terme]);

  function choisir(aliment) {
    setErreurAjout(null);
    setSelection({ aliment, quantite: 100, repas: repasParDefaut(new Date().getHours()) });
  }

  async function confirmerAjout() {
    setErreurAjout(null);
    setEnvoiEnCours(true);
    try {
      await onAjouter(corpsEntree(selection.aliment, { date, repas: selection.repas, quantite: selection.quantite }));
      setSelection(null);
      setTerme('');
      setResultats([]);
    } catch (err) {
      setErreurAjout(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function reajouterRecent(entree) {
    setErreurAjout(null);
    try {
      await onAjouter(corpsEntree(versAlimentDepuisEntree(entree), {
        date, repas: repasParDefaut(new Date().getHours()), quantite: entree.quantite,
      }));
    } catch (err) {
      setErreurAjout(err.message);
    }
  }

  if (selection) {
    return (
      <SelectionAliment
        selection={selection}
        onChange={setSelection}
        onConfirmer={confirmerAjout}
        onAnnuler={() => setSelection(null)}
        erreur={erreurAjout}
        envoiEnCours={envoiEnCours}
      />
    );
  }

  if (saisieManuelle) {
    return (
      <AjoutManuel
        onValider={(aliment) => { setSaisieManuelle(false); choisir(aliment); }}
        onAnnuler={() => setSaisieManuelle(false)}
      />
    );
  }

  return (
    <div className="carte formulaire-aliment">
      <h2>Ajouter un aliment</h2>
      {erreurAjout && <p className="alerte" role="alert">{erreurAjout}</p>}

      {recents.length > 0 && (
        <div className="recents">
          <p className="entete-series">Récents</p>
          <div className="puces">
            {recents.slice(0, 8).map((entree) => (
              <button
                key={entree.id}
                type="button"
                className="bouton-discret"
                onClick={() => reajouterRecent(entree)}
                onContextMenu={(e) => { e.preventDefault(); choisir(versAlimentDepuisEntree(entree)); }}
                title="Clic : ajouter directement. Clic droit : ajuster la quantité."
              >
                {entree.nomAliment}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="champ">
        <label htmlFor="recherche-aliment">Chercher un aliment</label>
        <input
          id="recherche-aliment"
          type="search"
          autoComplete="off"
          placeholder="Ex. yaourt nature, poulet, riz…"
          value={terme}
          onChange={(e) => setTerme(e.target.value)}
        />
        <p className="aide">
          Aliments courants (viandes, poissons, légumes, fruits, snacks…) et produits de marque
          (Open Food Facts) : calories et macros par 100 g.
        </p>
      </div>

      {rechercheEnCours && <p className="aide">Recherche…</p>}
      {!rechercheEnCours && erreurRecherche && (
        <p className="aide">
          {erreurRecherche}{' '}
          <button type="button" className="lien" onClick={() => setSaisieManuelle(true)}>Ajoute-le toi-même</button>
        </p>
      )}

      {resultats.length > 0 && (
        <ul className="resultats-aliments">
          {resultats.map((aliment) => (
            <li key={aliment.codeBarres ?? aliment.nom}>
              <button type="button" className="resultat-aliment" onClick={() => choisir(aliment)}>
                {aliment.imageUrl
                  ? <img src={aliment.imageUrl} alt="" className="aliment-image" />
                  : <span className="aliment-image aliment-image-vide" aria-hidden="true" />}
                <span className="resultat-aliment-texte">
                  <span className="aliment-nom">{aliment.nom}</span>
                  <span className="aide">{formaterNombre(aliment.pour100g.calories)} kcal / 100 g</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Saisie manuelle (retour du 18/09) : valeurs pour 100 g, comme un aliment de la recherche — une
// fois validées, rejoint choisir() et donc le même SelectionAliment (quantité, repas, aperçu).
function AjoutManuel({ onValider, onAnnuler }) {
  const [nom, setNom] = useState('');
  const [calories, setCalories] = useState('');
  const [proteines, setProteines] = useState('');
  const [glucides, setGlucides] = useState('');
  const [lipides, setLipides] = useState('');
  const [afficherErreurs, setAfficherErreurs] = useState(false);

  const nombreValide = (v, max) => {
    const n = versNombre(v);
    return Number.isFinite(n) && n >= 0 && n <= max;
  };
  const erreurs = {
    nom: nom.trim() ? null : 'Nom requis',
    calories: nombreValide(calories, 900) ? null : 'Entre 0 et 900 kcal',
    proteines: nombreValide(proteines, 100) ? null : 'Entre 0 et 100 g',
    glucides: nombreValide(glucides, 100) ? null : 'Entre 0 et 100 g',
    lipides: nombreValide(lipides, 100) ? null : 'Entre 0 et 100 g',
  };
  const valide = Object.values(erreurs).every((e) => !e);

  function valider() {
    if (!valide) return setAfficherErreurs(true);
    onValider({
      nom: nom.trim(),
      codeBarres: null,
      imageUrl: null,
      pour100g: {
        calories: versNombre(calories),
        proteines: versNombre(proteines),
        glucides: versNombre(glucides),
        lipides: versNombre(lipides),
        sucre: 0,
      },
    });
  }

  return (
    <div className="carte formulaire-aliment">
      <h2>Ajouter un aliment personnalisé</h2>
      <p className="aide">
        Pour un plat maison absent de la recherche — valeurs pour 100 g, comme sur un emballage.
      </p>

      <div className={`champ${afficherErreurs && erreurs.nom ? ' champ-erreur' : ''}`}>
        <label htmlFor="nom-manuel">Nom</label>
        <input
          id="nom-manuel" type="text" maxLength={150} autoComplete="off"
          placeholder="Ex. Gratin de courgettes maison"
          value={nom} onChange={(e) => setNom(e.target.value)}
        />
        {afficherErreurs && erreurs.nom && <p className="message-erreur">{erreurs.nom}</p>}
      </div>

      <ChampNumerique
        id="calories-manuel" label="Calories" unite="kcal / 100 g" inputMode="numeric"
        valeur={calories} onChange={(e) => setCalories(e.target.value)}
        erreur={afficherErreurs ? erreurs.calories : null}
      />
      <ChampNumerique
        id="proteines-manuel" label="Protéines" unite="g / 100 g" inputMode="numeric"
        valeur={proteines} onChange={(e) => setProteines(e.target.value)}
        erreur={afficherErreurs ? erreurs.proteines : null}
      />
      <ChampNumerique
        id="glucides-manuel" label="Glucides" unite="g / 100 g" inputMode="numeric"
        valeur={glucides} onChange={(e) => setGlucides(e.target.value)}
        erreur={afficherErreurs ? erreurs.glucides : null}
      />
      <ChampNumerique
        id="lipides-manuel" label="Lipides" unite="g / 100 g" inputMode="numeric"
        valeur={lipides} onChange={(e) => setLipides(e.target.value)}
        erreur={afficherErreurs ? erreurs.lipides : null}
      />

      <div className="selection-aliment-actions">
        <button type="button" className="bouton-secondaire" onClick={onAnnuler}>Annuler</button>
        <button type="button" className="bouton-principal" onClick={valider}>Continuer</button>
      </div>
    </div>
  );
}

function SelectionAliment({ selection, onChange, onConfirmer, onAnnuler, erreur, envoiEnCours, edition = false }) {
  const { aliment, quantite, repas } = selection;
  const quantiteValide = Number.isFinite(quantite) && quantite > 0 && quantite <= 5000;
  const apercu = quantiteValide ? alimentEchelle(aliment, quantite) : null;

  return (
    <div className="carte formulaire-aliment">
      <h2>{aliment.nom}</h2>
      {erreur && <p className="alerte" role="alert">{erreur}</p>}

      <div className="selection-aliment-entete">
        {aliment.imageUrl
          ? <img src={aliment.imageUrl} alt="" className="aliment-image aliment-image-grande" />
          : <span className="aliment-image aliment-image-grande aliment-image-vide" aria-hidden="true" />}
        <p className="aide">{formaterNombre(aliment.pour100g.calories)} kcal / 100 g</p>
      </div>

      <fieldset className="groupe">
        <legend className="visuellement-cache">Repas</legend>
        <div className="puces">
          {Object.entries(REPAS).map(([cle, label]) => (
            <label key={cle} className="puce">
              <input
                type="radio" name="repas" value={cle} checked={repas === cle}
                onChange={() => onChange({ ...selection, repas: cle })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <ChampNumerique
        id="quantite" label="Quantité" unite="g" inputMode="numeric"
        valeur={String(quantite)}
        onChange={(e) => onChange({ ...selection, quantite: versNombre(e.target.value) })}
        erreur={quantiteValide ? null : 'Entre 1 et 5000 g'}
      />

      {apercu && (
        <ul className="apercu-macros">
          <li><strong>{formaterNombre(apercu.calories)}</strong> kcal</li>
          {Object.entries(MACROS).map(([cle, macro]) => (
            <li key={cle}>{macro.court} <strong>{formaterNombre(apercu[cle])}</strong> g</li>
          ))}
          {apercu.sucre > 0 && <li>dont sucre <strong>{formaterNombre(apercu.sucre)}</strong> g</li>}
        </ul>
      )}

      <div className="selection-aliment-actions">
        <button type="button" className="bouton-secondaire" onClick={onAnnuler}>Annuler</button>
        <button type="button" className="bouton-principal" onClick={onConfirmer} disabled={!quantiteValide || envoiEnCours}>
          {edition
            ? (envoiEnCours ? 'Enregistrement…' : 'Enregistrer')
            : (envoiEnCours ? 'Ajout…' : 'Ajouter')}
        </button>
      </div>
    </div>
  );
}
