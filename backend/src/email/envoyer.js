// Envoi d'email transactionnel (réinitialisation de mot de passe, pour l'instant). Décision
// technique (pas demandée explicitement, cahier ne précisait rien) : Resend plutôt qu'une lib
// dédiée — un simple appel `fetch` sur leur API REST suffit (pas de dépendance npm de plus,
// cohérent avec le proxy Open Food Facts déjà fait comme ça), offre gratuite large pour une app
// qui démarre. Nécessite un compte Resend + un domaine d'envoi vérifié (démarche externe,
// impossible à faire à ta place) — voir .env.example et README.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EXPEDITEUR = process.env.EMAIL_EXPEDITEUR ?? 'Repwise <onboarding@resend.dev>';

// Sans clé API (dev local, ou avant que le compte Resend existe) : le lien est juste affiché en
// console plutôt que de faire échouer la fonctionnalité — le flux de réinitialisation reste
// testable de bout en bout sans dépendance externe.
export async function envoyerEmail({ a, sujet, html }) {
  if (!RESEND_API_KEY) {
    console.log(`[email non envoyé — RESEND_API_KEY absente] À : ${a} — ${sujet}\n${html}`);
    return;
  }
  const reponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EXPEDITEUR, to: a, subject: sujet, html }),
  });
  if (!reponse.ok) throw new Error(`Envoi d'email refusé par Resend (${reponse.status})`);
}
