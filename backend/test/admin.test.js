import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { demarrerServeurDeTest } from './outils.js';

const { appeler, pool, arreter } = await demarrerServeurDeTest('repwise_test_admin');
after(arreter);

function dateIlYAAns(ans) {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - ans);
  return d.toISOString().slice(0, 10);
}

async function nouvelUtilisateur(pseudo) {
  const r = await appeler('/auth/invite', { methode: 'POST' });
  await appeler('/profil', {
    methode: 'PATCH', cookie: r.cookie, corps: { pseudo, dateNaissance: dateIlYAAns(25), taille: 180, poids: 75 },
  });
  const { corps } = await appeler('/auth/session', { cookie: r.cookie });
  return { cookie: r.cookie, id: corps.utilisateur.id };
}

test('la page admin est réservée aux comptes admin', async () => {
  const zoe = await nouvelUtilisateur('Zoé');
  const refuse = await appeler('/admin/utilisateurs', { cookie: zoe.cookie });
  assert.equal(refuse.statut, 403);
});

test('un compte promu admin voit tous les utilisateurs et corrige un rang manuellement', async () => {
  const zoe = await nouvelUtilisateur('Zoé');
  const marc = await nouvelUtilisateur('Marc');

  // Pas de flux d'inscription admin (cahier) : promotion directe en base, comme en prod
  // (voir README) — la session de Zoé n'a pas besoin d'être renouvelée, le rôle est relu à
  // chaque requête (chargerSession).
  await pool.execute('UPDATE utilisateurs SET role = ? WHERE id = ?', ['admin', zoe.id]);

  const liste = await appeler('/admin/utilisateurs', { cookie: zoe.cookie });
  assert.equal(liste.statut, 200);
  assert.ok(liste.corps.utilisateurs.some((u) => u.id === marc.id));
  assert.equal(liste.corps.utilisateurs.find((u) => u.id === marc.id).rang, null);

  const correction = await appeler(`/admin/utilisateurs/${marc.id}/rang`, {
    methode: 'PATCH', cookie: zoe.cookie, corps: { rang: 8, palier: 'I', score: 2 },
  });
  assert.equal(correction.statut, 200);

  const [[ligne]] = await pool.execute(
    'SELECT rang, palier, score_performance FROM rangs_utilisateur WHERE utilisateur_id = ?',
    [marc.id],
  );
  assert.deepEqual([ligne.rang, ligne.palier, Number(ligne.score_performance)], [8, 'I', 2]);

  // Toujours bloqué pour Marc lui-même, qui n'est pas admin.
  assert.equal((await appeler('/admin/utilisateurs', { cookie: marc.cookie })).statut, 403);
});

test('les statistiques d\'usage sont réservées aux admins et comptent utilisateurs et invités', async () => {
  const zoe = await nouvelUtilisateur('ZoéStats');
  assert.equal((await appeler('/admin/statistiques', { cookie: zoe.cookie })).statut, 403);

  await pool.execute('UPDATE utilisateurs SET role = ? WHERE id = ?', ['admin', zoe.id]);
  const stats = await appeler('/admin/statistiques', { cookie: zoe.cookie });
  assert.equal(stats.statut, 200);
  assert.ok(stats.corps.utilisateurs.total >= 1);
  assert.equal(stats.corps.utilisateurs.total, stats.corps.utilisateurs.comptes + stats.corps.utilisateurs.invites);
  assert.ok(Array.isArray(stats.corps.repartitionRangs));
  assert.equal(typeof stats.corps.activite7j.seances, 'number');
  assert.equal(typeof stats.corps.feedbackNouveau, 'number');
});

test('la lecture des feedbacks est réservée aux admins et le statut se met à jour', async () => {
  await appeler('/feedback', { methode: 'POST', corps: { type: 'bug', description: 'Un bouton ne répond pas du tout' } });

  const zoe = await nouvelUtilisateur('Zoé2');
  assert.equal((await appeler('/admin/feedback', { cookie: zoe.cookie })).statut, 403);

  await pool.execute('UPDATE utilisateurs SET role = ? WHERE id = ?', ['admin', zoe.id]);
  const liste = await appeler('/admin/feedback', { cookie: zoe.cookie });
  assert.equal(liste.statut, 200);
  assert.ok(liste.corps.feedback.length >= 1);
  const id = liste.corps.feedback[0].id;

  const maj = await appeler(`/admin/feedback/${id}`, { methode: 'PATCH', cookie: zoe.cookie, corps: { statut: 'traite' } });
  assert.equal(maj.statut, 200);
  const [[ligne]] = await pool.execute('SELECT statut FROM feedback WHERE id = ?', [id]);
  assert.equal(ligne.statut, 'traite');
});
