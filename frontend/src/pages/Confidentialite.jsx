import { useTitre } from '../hooks/useTitre.js';

// Contenu à faire relire (toi, ou un professionnel si tu veux être sûr) avant la mise en ligne —
// décrit fidèlement ce que le code fait réellement à ce jour (audit du 14/09), mais les
// placeholders [crochets] doivent être complétés. Voir README « Checklist avant mise en ligne ».
export default function Confidentialite() {
  useTitre('Politique de confidentialité');
  return (
    <section className="page-legale">
      <h1>Politique de confidentialité</h1>
      <p className="aide">Dernière mise à jour : [date de mise en ligne]</p>

      <h2>Qui contacter</h2>
      <p>
        Pour toute question sur tes données ou pour exercer tes droits, écris-nous via la page{' '}
        <a href="/feedback">Feedback</a> ou à [ton email de contact].
      </p>

      <h2>Données collectées</h2>
      <p>Selon ce que tu utilises dans l'app :</p>
      <ul>
        <li>Compte : email, mot de passe (jamais stocké en clair, voir plus bas)</li>
        <li>Profil : pseudo, date de naissance, sexe, poids, taille, niveau d'activité/expérience, objectif, bio, photo de profil</li>
        <li>Séances de musculation : exercices, séries, répétitions, charges, notes</li>
        <li>Journal alimentaire : aliments saisis, quantités</li>
        <li>Ce que tu écris dans le formulaire de feedback (email optionnel)</li>
      </ul>
      <p>
        Un compte invité fonctionne sans email ni mot de passe : les mêmes données de profil/séances
        sont alors liées à ton navigateur plutôt qu'à un email.
      </p>

      <h2>Pourquoi ces données</h2>
      <p>
        Uniquement pour faire fonctionner l'app : calculer tes besoins caloriques, afficher ton
        historique, ton rang et tes graphiques de progression. Rien de tout ça (compte, séances,
        journal, mesures) n'est vendu ni transmis à Google ou à qui que ce soit à des fins
        publicitaires — voir « Publicité » ci-dessous pour ce que Google reçoit séparément si tu
        acceptes les cookies publicitaires sur la page calculateur.
      </p>

      <h2>Qui peut voir quoi</h2>
      <p>
        Ton poids, tes courbes de charge et ton email ne sont <strong>jamais</strong> visibles par
        les autres utilisateurs. Si tu actives « Rendre mes séances récentes visibles » (réglage
        dans ton profil) et que tu atteins le rang GOAT, ton pseudo, ta bio, ta photo et tes
        séances récentes deviennent visibles dans le classement public — réglage que tu contrôles
        et peux désactiver à tout moment.
      </p>

      <h2>Services tiers utilisés</h2>
      <ul>
        <li>
          <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">Open Food Facts</a> :
          quand tu cherches un aliment, ton terme de recherche leur est transmis (pas ton identité).
        </li>
        <li>Vercel (hébergement du site) et Render (hébergement de l'API et de la base de données).</li>
        <li>
          [Si activé] Resend, pour l'envoi de l'email de réinitialisation de mot de passe : ton
          adresse email leur est transmise uniquement au moment de cet envoi.
        </li>
        <li>
          Google AdSense, uniquement sur la page calculateur et uniquement si tu as accepté les
          cookies publicitaires (bandeau affiché à ta première visite) — voir « Publicité »
          ci-dessous.
        </li>
      </ul>

      <h2>Publicité (Google AdSense)</h2>
      <p>
        La page calculateur (accessible sans compte) affiche des publicités Google AdSense, qui
        financent la gratuité du site. Elles ne s'affichent que si tu cliques « Accepter » sur le
        bandeau de consentement présenté à ta première visite — sans ce choix, aucun script
        publicitaire ne se charge et aucun cookie publicitaire n'est posé. Si tu acceptes, Google
        peut poser ses propres cookies et traiter certaines données (adresse IP approximative,
        pages vues) pour choisir et mesurer les annonces affichées, selon sa propre politique de
        confidentialité (<a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">policies.google.com/privacy</a>).
        Tu peux retirer ton consentement à tout moment en effaçant les données de ce site dans ton
        navigateur (le bandeau réapparaîtra), et gérer la personnalisation des annonces Google sur{' '}
        <a href="https://adssettings.google.com" target="_blank" rel="noreferrer">adssettings.google.com</a>.
      </p>

      <h2>Cookies</h2>
      <p>
        Le cookie de session (indispensable, garde ta connexion active 30 jours) n'est ni
        publicitaire ni utilisé pour te pister ailleurs. Les seuls cookies publicitaires possibles
        sont ceux de Google AdSense, posés uniquement si tu les as acceptés — voir « Publicité »
        ci-dessus.
      </p>

      <h2>Sécurité</h2>
      <p>
        Ton mot de passe n'est jamais stocké en clair (hachage scrypt). Ta session est un jeton
        aléatoire dont seule une empreinte est conservée en base.
      </p>

      <h2>Durée de conservation</h2>
      <p>
        Tes données sont conservées tant que ton compte existe. Un compte invité resté inactif est
        supprimé automatiquement au bout d'un moment. Tu peux demander la suppression de ton compte
        à tout moment en nous écrivant.
      </p>

      <h2>Tes droits</h2>
      <p>
        Conformément au RGPD, tu peux demander l'accès, la rectification, la suppression ou
        l'export de tes données en nous écrivant (voir « Qui contacter » ci-dessus). Tu peux aussi
        déposer une réclamation auprès de la CNIL (cnil.fr).
      </p>
    </section>
  );
}
