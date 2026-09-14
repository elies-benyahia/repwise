import { Router } from 'express';
import { exigerConnexion } from '../auth/sessions.js';
import { pool } from '../db/pool.js';
import { ErreurHttp } from '../erreurs.js';

// Revenu sur la limite volontaire initiale du journal (cahier §3) : recherche dans Open Food
// Facts plutôt qu'une saisie manuelle, pour avoir une image et de vraies valeurs nutritionnelles.
// Passe par le backend (pas d'appel direct depuis le front) : évite le CORS, cache la clé d'appel
// User-Agent exigée par OFF, et laisse la place à un futur cache/rate-limit sans toucher au front.
//
// Retour du 14/09 ("il manque l'autocomplétion pour les aliments") : Open Food Facts est une base
// de produits À CODE-BARRES, pauvre sur les aliments bruts (un "poulet" ou une "banane" n'ont pas
// d'emballage). `bibliotheque_aliments` (database/aliments.sql, ~150 aliments courants) est donc
// interrogée EN PREMIER — résultats instantanés, sans réseau — puis complétée par Open Food Facts
// pour les produits de marque. Les deux sources sont fusionnées (locale d'abord) plutôt que l'une
// remplaçant l'autre : dédoublonnées par nom (insensible à la casse).
const URL_RECHERCHE = 'https://world.openfoodfacts.org/cgi/search.pl';
const DELAI_MAX_MS = 6000;
const TAILLE_PAGE = 20;
const LIMITE_LOCALE = 8;

export const routesAliments = Router();
routesAliments.use(exigerConnexion);

async function rechercherLocal(terme) {
  const [lignes] = await pool.execute(
    `SELECT nom, calories, proteines, glucides, lipides, sucre
     FROM bibliotheque_aliments WHERE nom LIKE ? ORDER BY nom LIMIT ${LIMITE_LOCALE}`,
    [`%${terme}%`],
  );
  return lignes.map((l) => ({
    codeBarres: null,
    nom: l.nom,
    imageUrl: null,
    pour100g: {
      calories: l.calories,
      proteines: Number(l.proteines),
      glucides: Number(l.glucides),
      lipides: Number(l.lipides),
      sucre: Number(l.sucre),
    },
  }));
}

function versAliment(produit) {
  const nutriments = produit.nutriments ?? {};
  const calories = nutriments['energy-kcal_100g'];
  // Sans calories/nom, l'aliment n'est pas exploitable dans le journal — on le filtre.
  if (!produit.product_name || typeof calories !== 'number') return null;
  return {
    codeBarres: produit.code ?? null,
    nom: produit.product_name,
    imageUrl: produit.image_front_small_url || produit.image_url || null,
    pour100g: {
      calories: Math.round(calories),
      proteines: Number(nutriments.proteins_100g) || 0,
      glucides: Number(nutriments.carbohydrates_100g) || 0,
      lipides: Number(nutriments.fat_100g) || 0,
      sucre: Number(nutriments.sugars_100g) || 0,
    },
  };
}

// Contrairement à rechercherLocal (qui doit remonter une vraie erreur si la base est en panne),
// Open Food Facts est une source complémentaire : indisponible ou lente, elle ne doit jamais
// empêcher d'afficher au moins les résultats locaux — d'où le tableau vide en repli plutôt qu'une
// exception qui remonterait jusqu'à la route.
async function rechercherOFF(terme) {
  const url = new URL(URL_RECHERCHE);
  url.searchParams.set('search_terms', terme);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', String(TAILLE_PAGE));
  url.searchParams.set(
    'fields',
    'code,product_name,image_front_small_url,image_url,nutriments',
  );

  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), DELAI_MAX_MS);
  try {
    const reponse = await fetch(url, {
      signal: controleur.signal,
      // OFF exige un User-Agent identifiable (leurs conditions d'usage de l'API).
      headers: { 'User-Agent': 'Repwise/1.0 (contact via page feedback du site)' },
    });
    if (!reponse.ok) return [];
    const donnees = await reponse.json();
    return (donnees.products ?? []).map(versAliment).filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(minuterie);
  }
}

// GET /api/aliments/recherche?q=poulet — fusionne bibliotheque_aliments (instantané, aliments
// bruts) et Open Food Facts (produits de marque), locale d'abord, dédoublonné par nom.
routesAliments.get('/recherche', async (req, res) => {
  const terme = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (terme.length < 2) throw new ErreurHttp(400, 'Recherche trop courte (2 caractères minimum)');

  const [locaux, off] = await Promise.all([rechercherLocal(terme), rechercherOFF(terme)]);
  const nomsLocaux = new Set(locaux.map((a) => a.nom.toLowerCase()));
  const aliments = [...locaux, ...off.filter((a) => !nomsLocaux.has(a.nom.toLowerCase()))].slice(0, TAILLE_PAGE);
  res.json({ aliments });
});
