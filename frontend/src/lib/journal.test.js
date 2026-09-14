import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  alimentEchelle, corpsEntree, progression, repasParDefaut, totaux, versAlimentDepuisEntree,
} from './journal.js';

const POULET = { nom: 'Poulet riz', codeBarres: '123', imageUrl: 'https://x/img.jpg', pour100g: { calories: 130, proteines: 9, glucides: 16, lipides: 2.4, sucre: 1 } };

test('un aliment mis à l’échelle (200 g) donne les bonnes valeurs arrondies', () => {
  assert.deepEqual(alimentEchelle(POULET, 200), { calories: 260, proteines: 18, glucides: 32, lipides: 4.8, sucre: 2 });
});

test('corpsEntree assemble le corps attendu par POST /journal', () => {
  const corps = corpsEntree(POULET, { date: '2026-09-13', repas: 'dejeuner', quantite: 150 });
  assert.deepEqual(corps, {
    date: '2026-09-13', repas: 'dejeuner', nomAliment: 'Poulet riz', codeBarres: '123', imageUrl: 'https://x/img.jpg',
    quantite: 150, calories: 195, proteines: 13.5, glucides: 24, lipides: 3.6, sucre: 1.5,
  });
});

test('un aliment sans code-barres ni image (récent ancien format) ne plante pas', () => {
  const corps = corpsEntree({ nom: 'Fait maison', pour100g: { calories: 100, proteines: 5, glucides: 10, lipides: 2, sucre: 0 } }, {
    date: '2026-09-13', repas: 'diner', quantite: 100,
  });
  assert.equal(corps.codeBarres, null);
  assert.equal(corps.imageUrl, null);
});

test('versAlimentDepuisEntree reconstruit un pour100g à partir d’une entrée déjà enregistrée', () => {
  const entree = {
    nomAliment: 'Poulet riz', codeBarres: '123', imageUrl: 'https://x/img.jpg',
    quantite: 200, calories: 260, proteines: 18, glucides: 32, lipides: 4.8, sucre: 2,
  };
  const aliment = versAlimentDepuisEntree(entree);
  assert.deepEqual(aliment.pour100g, { calories: 130, proteines: 9, glucides: 16, lipides: 2.4, sucre: 1 });
  // Aller-retour : remettre à l'échelle d'origine redonne l'entrée de départ.
  assert.deepEqual(alimentEchelle(aliment, entree.quantite), {
    calories: 260, proteines: 18, glucides: 32, lipides: 4.8, sucre: 2,
  });
});

test('repas proposé selon l’heure', () => {
  assert.deepEqual([7, 12, 16, 20, 1].map(repasParDefaut), ['petit_dejeuner', 'dejeuner', 'collation', 'diner', 'collation']);
});

test('totaux de la journée et progression bornée', () => {
  const t = totaux([
    { calories: 650, proteines: 45, glucides: 80.3, lipides: 12 },
    { calories: 120, proteines: 20.1, glucides: 8, lipides: 0 },
  ]);
  assert.deepEqual(t, { calories: 770, proteines: 65.1, glucides: 88.3, lipides: 12 });
  assert.equal(progression(1400, 2800), 0.5);
  assert.equal(progression(3000, 2800), 1);
  assert.equal(progression(100, 0), 0);
});
