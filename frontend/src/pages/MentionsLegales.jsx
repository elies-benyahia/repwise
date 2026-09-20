import { useTitre } from '../hooks/useTitre.js';

// Contenu à finaliser avec tes vraies informations avant la mise en ligne (cahier §10bis,
// audit du 14/09) : les champs entre [crochets] sont des placeholders, pas des valeurs par
// défaut à laisser telles quelles — voir README « Checklist avant mise en ligne ». Obligatoire
// pour tout site français (art. 6-III de la LCEN).
export default function MentionsLegales() {
  useTitre('Mentions légales');
  return (
    <section className="page-legale">
      <h1>Mentions légales</h1>

      <h2>Éditeur du site</h2>
      <p>
        Le site Repwise (accessible à l'adresse [nom de domaine]) est édité par [ton nom, ou la
        raison sociale de ta société], [statut : entrepreneur individuel / auto-entrepreneur /
        SASU...] [numéro SIRET si tu en as un], dont le siège est situé [ton adresse].
      </p>
      <p>Contact : [ton email de contact — peut être celui de la page Feedback]</p>
      <p>Directeur de la publication : [ton nom]</p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par [nom de l'hébergeur du frontend, ex. Vercel Inc.] et l'API/la base
        de données par [nom de l'hébergeur du backend, ex. Railway Corp.] — à compléter une fois
        l'hébergement choisi (voir README « Checklist avant mise en ligne »).
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Sauf mention contraire, l'ensemble des contenus de ce site (textes, logo, charte
        graphique) est la propriété de l'éditeur. Les photos de la bibliothèque d'exercices
        proviennent de wger.de sous licence Creative Commons — détail et attribution par exercice
        sur la page <a href="/credits">Crédits</a>.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le traitement des données personnelles est détaillé sur la page{' '}
        <a href="/confidentialite">Politique de confidentialité</a>.
      </p>

      <h2>Conditions d'utilisation</h2>
      <p>
        Les règles d'usage du site sont détaillées sur la page{' '}
        <a href="/conditions-utilisation">Conditions générales d'utilisation</a>.
      </p>
    </section>
  );
}
