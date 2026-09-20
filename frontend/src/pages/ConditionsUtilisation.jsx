import { useTitre } from '../hooks/useTitre.js';

// Retour du 21/09 ("ajoute une page de CGU") : même patron que MentionsLegales.jsx/Confidentialite.jsx
// — décrit fidèlement ce que l'app fait réellement, placeholders [entre crochets] à compléter
// avec tes vraies infos avant la mise en ligne définitive, jamais inventés.
export default function ConditionsUtilisation() {
  useTitre("Conditions générales d'utilisation");
  return (
    <section className="page-legale">
      <h1>Conditions générales d'utilisation</h1>
      <p className="aide">Dernière mise à jour : [date de mise en ligne]</p>

      <h2>Objet</h2>
      <p>
        Repwise est une application de suivi de musculation et d'alimentation (calculateur de
        calories/macros, journal alimentaire, séances, progression, classement, groupes
        d'entraînement). L'accès au calculateur ne nécessite pas de compte ; les autres
        fonctionnalités nécessitent un compte (avec email) ou un mode invité (sans email, lié à
        ton navigateur). L'utilisation du site implique l'acceptation pleine et entière des
        présentes conditions.
      </p>

      <h2>Compte et mode invité</h2>
      <p>
        Tu es responsable de l'exactitude des informations que tu fournis (âge, poids, taille...)
        et de la confidentialité de ton mot de passe. Un compte invité n'a pas de mot de passe :
        son historique est perdu si tu changes de navigateur ou effaces tes données, sauf si tu
        crées un compte avant (l'historique est alors conservé). L'inscription est ouverte à toute
        personne majeure, ou mineure avec l'autorisation d'un représentant légal.
      </p>

      <h2>Avertissement santé — pas un avis médical</h2>
      <p>
        Les calories, macronutriments, programmes et recommandations affichés sont calculés à
        partir de formules généralistes (ex. Mifflin-St Jeor) et des informations que tu saisis.
        Ce ne sont <strong>ni un avis médical, ni un avis nutritionnel personnalisé</strong>.
        Consulte un professionnel de santé avant de modifier significativement ton alimentation ou
        ton entraînement, en particulier en cas de grossesse, de pathologie ou de traitement en
        cours. Repwise ne peut être tenu responsable des conséquences d'un usage sans avis médical
        adapté à ta situation.
      </p>

      <h2>Bon usage du service</h2>
      <p>Tu t'engages à ne pas :</p>
      <ul>
        <li>Utiliser le site à des fins frauduleuses ou pour nuire à d'autres utilisateurs (harcèlement, usurpation d'identité) ;</li>
        <li>Tenter de contourner les limites techniques (comptes multiples pour fausser un classement, scripts automatisés, tentatives d'accès à des données d'un autre compte) ;</li>
        <li>Partager un code d'invitation de groupe avec des personnes que tu n'as pas l'intention d'inviter réellement ;</li>
        <li>Copier, revendre ou réutiliser le contenu du site sans autorisation.</li>
      </ul>
      <p>
        Un manquement peut entraîner la suspension ou la suppression du compte concerné, à la
        discrétion de l'éditeur.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Voir la page <a href="/mentions-legales">Mentions légales</a> — le contenu que tu saisis
        (séances, notes, mesures) t'appartient ; tu conserves le contrôle et la possibilité de le
        supprimer à tout moment.
      </p>

      <h2>Disponibilité du service</h2>
      <p>
        Repwise est fourni « en l'état », gratuitement au lancement. L'éditeur s'efforce d'assurer
        un accès continu mais ne garantit pas une disponibilité ininterrompue (maintenance,
        panne, incident technique chez un hébergeur tiers). Aucune indemnisation n'est due en cas
        d'indisponibilité temporaire.
      </p>

      <h2>Résiliation</h2>
      <p>
        Tu peux cesser d'utiliser le site et demander la suppression de ton compte à tout moment
        (voir la page <a href="/confidentialite">Politique de confidentialité</a>). L'éditeur peut
        suspendre un compte en cas de manquement grave aux présentes conditions.
      </p>

      <h2>Modification des présentes conditions</h2>
      <p>
        Ces conditions peuvent évoluer avec le site ; la date de mise à jour en haut de page
        reflète la dernière version. Une évolution substantielle sera signalée sur le site.
      </p>

      <h2>Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. Tout litige relève des
        tribunaux compétents, sauf disposition légale contraire applicable aux consommateurs.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question, écris-nous via la page <a href="/feedback">Feedback</a> ou à
        [ton email de contact].
      </p>
    </section>
  );
}
