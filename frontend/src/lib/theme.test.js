import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_PAR_DEFAUT, THEMES_COULEUR, ecrireThemeCouleurStocke, lireThemeCouleurStocke, themeValide,
} from './theme.js';

test('themeValide accepte les thèmes connus et replie le reste sur le défaut', () => {
  assert.equal(themeValide('bleu'), 'bleu');
  assert.equal(themeValide('rouge'), 'rouge');
  assert.equal(themeValide('violet'), 'violet');
  assert.equal(themeValide('vert'), 'vert');
  assert.equal(themeValide('licorne'), THEME_PAR_DEFAUT);
  assert.equal(themeValide(undefined), THEME_PAR_DEFAUT);
  assert.equal(themeValide(null), THEME_PAR_DEFAUT);
});

test('chaque thème a un libellé, une pastille et des couleurs de fond animé', () => {
  for (const theme of Object.values(THEMES_COULEUR)) {
    assert.equal(typeof theme.label, 'string');
    assert.match(theme.swatch, /^#[0-9a-f]{6}$/);
    assert.match(theme.ghostFibers.lineColor, /^#[0-9a-f]{6}$/);
    assert.match(theme.ghostFibers.glowColor, /^#[0-9a-f]{6}$/);
  }
});

// Pas de `localStorage` dans l'environnement de test (node:test, sans DOM) : les deux fonctions
// doivent rester silencieuses (repli sur le défaut en lecture, no-op en écriture) plutôt que
// planter — même comportement qu'un navigateur en navigation privée qui bloque le stockage.
test('lireThemeCouleurStocke et ecrireThemeCouleurStocke ne plantent pas sans localStorage', () => {
  assert.equal(lireThemeCouleurStocke(), THEME_PAR_DEFAUT);
  assert.doesNotThrow(() => ecrireThemeCouleurStocke('bleu'));
});
