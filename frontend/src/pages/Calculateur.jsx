import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import ChampNumerique from '../components/ChampNumerique.jsx';
import TextLoop from '../components/reactbits/TextLoop.jsx';
import ResultatMacros from '../components/ResultatMacros.jsx';
import { useConsentementPub } from '../consentement/ConsentementPubContext.jsx';
import { chargerAdSense } from '../lib/adsense.js';
import { NIVEAUX_ACTIVITE, OBJECTIFS, calculerBesoins, validerProfil } from '../lib/calculs.js';
import { formaterNombre, versNombre } from '../lib/format.js';
import { profilComplet } from '../lib/profil.js';

const CLE_STOCKAGE = 'calculateur:profil';

const PROFIL_PAR_DEFAUT = {
  sexe: 'homme',
  age: '',
  poids: '',
  taille: '',
  niveauActivite: 'modere',
  objectif: 'prise_de_masse',
};

function chargerProfil() {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    return brut ? { ...PROFIL_PAR_DEFAUT, ...JSON.parse(brut) } : PROFIL_PAR_DEFAUT;
  } catch {
    return PROFIL_PAR_DEFAUT;
  }
}

const versChamp = (nombre) => (nombre == null ? '' : formaterNombre(nombre));

export default function Calculateur() {
  const { utilisateur } = useAuth();
  const [profil, setProfil] = useState(chargerProfil);
  const [afficherErreurs, setAfficherErreurs] = useState(false);
  const [resultatDemande, setResultatDemande] = useState(false);
  const resultatRef = useRef(null);

  // Monétisation (cahier §8) : AdSense seulement ici (page publique à fort trafic), et seulement
  // si l'utilisateur a accepté les cookies publicitaires (BandeauConsentement) — jamais avant.
  const { consentement } = useConsentementPub();
  useEffect(() => {
    if (consentement === 'accepte') chargerAdSense();
  }, [consentement]);

  // Profil : pré-remplit les mesures encore vides, sans écraser une saisie en cours. Sexe, activité
  // et objectif reprennent ceux du dernier objectif enregistré (ces choix ont toujours une valeur).
  useEffect(() => {
    if (!utilisateur) return;
    setProfil((p) => ({
      ...p,
      age: p.age || versChamp(utilisateur.age),
      poids: p.poids || versChamp(utilisateur.poids),
      taille: p.taille || versChamp(utilisateur.taille),
      sexe: utilisateur.sexe ?? p.sexe,
      niveauActivite: utilisateur.niveauActivite ?? p.niveauActivite,
      objectif: utilisateur.objectif ?? p.objectif,
    }));
  }, [utilisateur]);

  useEffect(() => {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(profil));
    } catch {
      // Stockage indisponible (navigation privée) : le calculateur marche quand même.
    }
  }, [profil]);

  const donnees = {
    ...profil,
    age: versNombre(profil.age),
    poids: versNombre(profil.poids),
    taille: versNombre(profil.taille),
  };
  const erreurs = validerProfil(donnees);
  const valide = Object.keys(erreurs).length === 0;
  const resultat = resultatDemande && valide ? calculerBesoins(donnees) : null;

  const modifier = (champ) => (e) => setProfil((p) => ({ ...p, [champ]: e.target.value }));

  function soumettre(e) {
    e.preventDefault();
    if (!valide) {
      setAfficherErreurs(true);
      return;
    }
    setResultatDemande(true);
    requestAnimationFrame(() => resultatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  return (
    <>
      <HeroPublic />

      <form className="carte formulaire" onSubmit={soumettre} noValidate>
        <fieldset className="groupe">
          <legend>Sexe</legend>
          <div className="segmente">
            {[['homme', 'Homme'], ['femme', 'Femme']].map(([valeur, label]) => (
              <label key={valeur} className="segment">
                <input
                  type="radio"
                  name="sexe"
                  value={valeur}
                  checked={profil.sexe === valeur}
                  onChange={modifier('sexe')}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="champs-mesures">
          <ChampNumerique
            id="age" label="Âge" unite="ans" inputMode="numeric"
            valeur={profil.age} onChange={modifier('age')} erreur={afficherErreurs && erreurs.age}
          />
          <ChampNumerique
            id="poids" label="Poids" unite="kg" inputMode="decimal"
            valeur={profil.poids} onChange={modifier('poids')} erreur={afficherErreurs && erreurs.poids}
          />
          <ChampNumerique
            id="taille" label="Taille" unite="cm" inputMode="numeric"
            valeur={profil.taille} onChange={modifier('taille')} erreur={afficherErreurs && erreurs.taille}
          />
        </div>

        <fieldset className="groupe">
          <legend>Niveau d'activité</legend>
          <div className="liste-choix">
            {Object.entries(NIVEAUX_ACTIVITE).map(([cle, niveau]) => (
              <label key={cle} className="choix">
                <input
                  type="radio"
                  name="niveauActivite"
                  value={cle}
                  checked={profil.niveauActivite === cle}
                  onChange={modifier('niveauActivite')}
                />
                <span className="choix-texte">
                  <strong>{niveau.label}</strong>
                  <small>{niveau.description}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="groupe">
          <legend>Objectif</legend>
          <div className="grille-objectifs">
            {Object.entries(OBJECTIFS).map(([cle, objectif]) => (
              <label key={cle} className="choix choix-carte">
                <input
                  type="radio"
                  name="objectif"
                  value={cle}
                  checked={profil.objectif === cle}
                  onChange={modifier('objectif')}
                />
                <span className="choix-texte">
                  <strong>{objectif.label}</strong>
                  <small>{objectif.description}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" className="bouton-principal">Calculer mes besoins</button>
      </form>

      <div ref={resultatRef} className="ancre-resultat">
        {resultat && (
          <>
            <ResultatMacros resultat={resultat} poids={donnees.poids} />
            {/* key : si le calcul change, le bouton redevient "Enregistrer". */}
            <EnregistrerObjectif
              key={`${resultat.calories}-${resultat.proteines}-${resultat.glucides}-${resultat.lipides}`}
              resultat={resultat}
              profil={profil}
            />
          </>
        )}
      </div>

      <Explications />
    </>
  );
}

const NOMBRE_AVATARS = 4;

// Hero de la page publique (cahier §7, structure façon "Sparkdesign") : badge, titre + accroche
// (repris tels quels du <h1>/<p> historiques du calculateur — le bénéfice SEO ne doit pas
// changer), CTA vers l'onboarding, rangée d'avatars génériques (pas de vrais utilisateurs ni de
// témoignages : Repwise n'a pas encore lancé, ce serait fabriquer un faux signal social), et à
// droite une carte d'aperçu de l'app stylisée (pas une vraie capture d'écran automatisée).
function HeroPublic() {
  return (
    <section className="hero">
      {/* Le fond animé (GhostFibers) est maintenant global — voir App.jsx — plutôt que propre à
          ce hero (retour utilisateur : l'effet plaisait, il fallait le généraliser au site). */}
      <div className="hero-boucle-fond" aria-hidden="true">
        <TextLoop
          text="Repwise"
          shape="wave"
          curviness={40}
          speed={40}
          fontSize={40}
          fontWeight={800}
          letterSpacing={3}
          color="#1c2016"
          ribbon={false}
          pauseOnHover={false}
        />
      </div>

      <div className="hero-grille">
        <div className="hero-texte">
          <span className="hero-badge">
            100% gratuit au lancement <span aria-hidden="true">↗</span>
          </span>
          <h1>Calculateur de calories et macros pour la musculation</h1>
          <p>Tes calories et tes macros du jour en 30 secondes, selon ton objectif : prise de masse, sèche ou recomposition.</p>

          <div className="hero-social">
            <div className="hero-avatars" aria-hidden="true">
              {Array.from({ length: NOMBRE_AVATARS }, (_, i) => (
                <span key={i} className="hero-avatar">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
                  </svg>
                </span>
              ))}
            </div>
            <p className="hero-social-texte">Pour la manière dont tu t'entraînes. Seul ou en groupe.</p>
          </div>
        </div>

        <div className="hero-apercu" aria-hidden="true">
          <div className="hero-carte">
            <span className="hero-etiquette hero-etiquette-haut-gauche">Suivi quotidien</span>
            <span className="hero-etiquette hero-etiquette-haut-droite">100% gratuit</span>

            <div className="hero-apercu-contenu">
              <div className="hero-apercu-flamme">
                <span>🔥</span>
                <strong>4</strong>
              </div>
              <div className="hero-apercu-barre" style={{ width: '82%' }} />
              <div className="hero-apercu-barre" style={{ width: '58%' }} />
              <div className="hero-apercu-barre" style={{ width: '70%' }} />
            </div>

            <div className="hero-bulle">Séance loggée ✓</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Connecté : enregistre le résultat comme objectif du journal alimentaire.
// Visiteur : c'est le moment d'inviter à créer un compte (le calculateur est la porte d'entrée SEO).
function EnregistrerObjectif({ resultat, profil }) {
  const { utilisateur, enregistrerObjectif } = useAuth();
  const [etat, setEtat] = useState('initial'); // initial | envoi | enregistre
  const [erreur, setErreur] = useState(null);

  if (!profilComplet(utilisateur)) {
    return (
      <div className="carte appel-compte">
        <p>Enregistre cet objectif et compare-le chaque jour à ce que tu manges.</p>
        <Link to="/bienvenue" state={{ depuis: '/journal' }} className="bouton-principal">Suivre mes repas gratuitement</Link>
      </div>
    );
  }

  async function enregistrer() {
    setErreur(null);
    setEtat('envoi');
    try {
      await enregistrerObjectif({
        calories: resultat.calories,
        proteines: resultat.proteines,
        glucides: resultat.glucides,
        lipides: resultat.lipides,
        sexe: profil.sexe,
        niveauActivite: profil.niveauActivite,
        objectif: profil.objectif,
      });
      setEtat('enregistre');
    } catch (err) {
      setErreur(err.message);
      setEtat('initial');
    }
  }

  return (
    <div className="enregistrer-objectif">
      {erreur && <p className="alerte" role="alert">{erreur}</p>}
      {etat === 'enregistre' ? (
        <p className="info" role="status">
          Objectif enregistré. <Link to="/journal">Ouvrir mon journal alimentaire</Link>
        </p>
      ) : (
        <button type="button" className="bouton-principal" onClick={enregistrer} disabled={etat === 'envoi'}>
          {etat === 'envoi' ? 'Enregistrement…' : 'Enregistrer comme mon objectif'}
        </button>
      )}
    </div>
  );
}

function Explications() {
  return (
    <section className="explications">
      <h2>Comment tes besoins sont calculés</h2>
      <ol className="etapes">
        <li>
          <strong>Métabolisme de base.</strong> L'énergie que ton corps dépense au repos, estimée
          avec la formule de Mifflin-St Jeor à partir de ton poids, ta taille, ton âge et ton sexe.
        </li>
        <li>
          <strong>Maintenance.</strong> Le métabolisme de base multiplié par un facteur d'activité
          (de 1,2 pour sédentaire à 1,9 pour très actif) : c'est ce que tu brûles sur une journée.
        </li>
        <li>
          <strong>Objectif.</strong> +10 % pour une prise de masse propre, −20 % pour la perte de
          gras, −5 % pour la recomposition.
        </li>
        <li>
          <strong>Macros.</strong> Protéines d'abord (1,8 à 2,2 g/kg selon l'objectif), lipides à
          25 % des calories (0,7 g/kg minimum), et le reste en glucides pour l'énergie à
          l'entraînement.
        </li>
      </ol>

      <h2>Questions fréquentes</h2>
      <details>
        <summary>Combien de calories pour une prise de masse ?</summary>
        <p>
          Vise environ 10 % au-dessus de ta maintenance. Un surplus plus gros fait surtout prendre
          du gras. Si ton poids ne bouge pas après 2 à 3 semaines, ajoute 100 à 200 kcal.
        </p>
      </details>
      <details>
        <summary>Combien de protéines par jour en musculation ?</summary>
        <p>
          Entre 1,6 et 2,2 g par kg de poids de corps. Monte vers le haut de la fourchette en
          sèche pour préserver ta masse musculaire.
        </p>
      </details>
      <details>
        <summary>Le résultat est-il exact ?</summary>
        <p>
          C'est une estimation de départ, fiable à environ 10 % près pour la plupart des gens.
          Suis ton poids pendant 2 semaines et ajuste selon l'évolution réelle.
        </p>
      </details>
    </section>
  );
}
