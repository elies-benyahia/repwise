import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// scrypt est intégré à Node (aucune dépendance native à compiler). Paramètres recommandés
// par l'OWASP : N=2^15, r=8, p=3, soit ~32 Mo par hachage, raisonnable pour un petit serveur.
const PARAMETRES = { log2N: 15, r: 8, p: 3 };
const LONGUEUR_CLE = 64;

async function deriver(motDePasse, sel, { log2N, r, p }) {
  const N = 2 ** log2N;
  return scryptAsync(motDePasse.normalize('NFKC'), sel, LONGUEUR_CLE, {
    N, r, p, maxmem: 256 * N * r,
  });
}

// Format stocké : scrypt$log2N$r$p$sel$empreinte. Les paramètres sont gardés avec chaque
// hachage pour pouvoir les durcir plus tard sans casser les comptes existants.
export async function hacherMotDePasse(motDePasse) {
  const sel = randomBytes(16);
  const cle = await deriver(motDePasse, sel, PARAMETRES);
  const { log2N, r, p } = PARAMETRES;
  return ['scrypt', log2N, r, p, sel.toString('base64'), cle.toString('base64')].join('$');
}

let hachageFactice;

// `hachage` peut être null (email inconnu) : on calcule quand même un scrypt pour que le temps
// de réponse ne révèle pas si le compte existe.
export async function verifierMotDePasse(motDePasse, hachage) {
  hachageFactice ??= hacherMotDePasse('mot-de-passe-factice');
  const [, log2N, r, p, sel, attendu] = (hachage ?? (await hachageFactice)).split('$');
  const cle = await deriver(motDePasse, Buffer.from(sel, 'base64'), {
    log2N: Number(log2N), r: Number(r), p: Number(p),
  });
  return hachage !== null && timingSafeEqual(cle, Buffer.from(attendu, 'base64'));
}
