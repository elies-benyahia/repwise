import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ecrireConsentementPub, lireConsentementPub } from './consentement.js';

// Pas de `localStorage` dans l'environnement de test (node:test, sans DOM) : mêmes garanties que
// theme.js — repli silencieux plutôt qu'une exception (navigation privée, quota...).
test('lireConsentementPub et ecrireConsentementPub ne plantent pas sans localStorage', () => {
  assert.equal(lireConsentementPub(), null);
  assert.doesNotThrow(() => ecrireConsentementPub('accepte'));
});
