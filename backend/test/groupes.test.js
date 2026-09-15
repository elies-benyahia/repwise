import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { demarrerServeurDeTest } from './outils.js';

const { appeler, arreter } = await demarrerServeurDeTest('repwise_test_groupes');
after(arreter);

function dateIlYAAns(ans) {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - ans);
  return d.toISOString().slice(0, 10);
}

async function nouvelUtilisateur(pseudo) {
  const r = await appeler('/auth/invite', { methode: 'POST' });
  await appeler('/profil', {
    methode: 'PATCH', cookie: r.cookie,
    corps: { pseudo, dateNaissance: dateIlYAAns(25), taille: 180, poids: 80 },
  });
  const { corps } = await appeler('/auth/session', { cookie: r.cookie });
  return { cookie: r.cookie, id: corps.utilisateur.id };
}

async function logger(cookie, date) {
  const r = await appeler('/seances', {
    methode: 'POST', cookie, corps: { date, typeSeance: 'push', exercices: [] },
  });
  assert.equal(r.statut, 201, JSON.stringify(r.corps));
  return r.corps.seance.id;
}

const aujourdhui = () => new Date().toISOString().slice(0, 10);

test('créer un groupe en fait membre le créateur, avec un code à 8 caractères', async () => {
  const { cookie } = await nouvelUtilisateur('Léa');
  const r = await appeler('/groupes', { methode: 'POST', cookie, corps: { nom: 'Les Costauds' } });
  assert.equal(r.statut, 201);
  assert.equal(r.corps.groupe.nom, 'Les Costauds');
  assert.equal(r.corps.groupe.nombreMembres, 1);
  assert.match(r.corps.groupe.codeInvitation, /^[A-Z0-9]{8}$/);

  const liste = await appeler('/groupes', { cookie });
  assert.deepEqual(liste.corps.groupes.map((g) => g.nom), ['Les Costauds']);
});

test('un nom vide ou trop long est refusé', async () => {
  const { cookie } = await nouvelUtilisateur('Marc');
  assert.equal((await appeler('/groupes', { methode: 'POST', cookie, corps: { nom: '  ' } })).statut, 400);
  assert.equal((await appeler('/groupes', { methode: 'POST', cookie, corps: { nom: 'x'.repeat(61) } })).statut, 400);
});

test('rejoindre par code ajoute comme membre, de façon idempotente ; un mauvais code échoue', async () => {
  const createur = await nouvelUtilisateur('Léa2');
  const { corps } = await appeler('/groupes', { methode: 'POST', cookie: createur.cookie, corps: { nom: 'Salle du coin' } });
  const { codeInvitation } = corps.groupe;

  const rejoignant = await nouvelUtilisateur('Marc2');
  const r1 = await appeler('/groupes/rejoindre', { methode: 'POST', cookie: rejoignant.cookie, corps: { code: codeInvitation } });
  assert.equal(r1.statut, 201);
  const r2 = await appeler('/groupes/rejoindre', { methode: 'POST', cookie: rejoignant.cookie, corps: { code: codeInvitation } });
  assert.equal(r2.statut, 201); // rejoindre deux fois ne casse rien

  const detail = await appeler(`/groupes/${corps.groupe.id}`, { cookie: createur.cookie });
  assert.equal(detail.corps.membres.length, 2);

  assert.equal((await appeler('/groupes/rejoindre', { methode: 'POST', cookie: rejoignant.cookie, corps: { code: 'AAAAAAAA' } })).statut, 404);
});

test("un non-membre ne peut pas voir le détail d'un groupe (même erreur qu'un groupe inexistant)", async () => {
  const createur = await nouvelUtilisateur('Léa3');
  const { corps } = await appeler('/groupes', { methode: 'POST', cookie: createur.cookie, corps: { nom: 'Privé' } });
  const etranger = await nouvelUtilisateur('Etranger');

  const vrai = await appeler(`/groupes/${corps.groupe.id}`, { cookie: etranger.cookie });
  const faux = await appeler('/groupes/999999', { cookie: etranger.cookie });
  assert.equal(vrai.statut, 404);
  assert.equal(faux.statut, 404);
  assert.equal(vrai.corps.erreur, faux.corps.erreur);
});

test("le fil d'activité montre les séances des membres (jamais les charges) et le mini-classement le rang/streak", async () => {
  const a = await nouvelUtilisateur('Alice');
  const { corps } = await appeler('/groupes', { methode: 'POST', cookie: a.cookie, corps: { nom: 'Team' } });
  const b = await nouvelUtilisateur('Bob');
  await appeler('/groupes/rejoindre', { methode: 'POST', cookie: b.cookie, corps: { code: corps.groupe.codeInvitation } });

  const jour = aujourdhui();
  const seanceId = await logger(a.cookie, jour);

  const detail = await appeler(`/groupes/${corps.groupe.id}`, { cookie: b.cookie });
  assert.equal(detail.statut, 200);
  assert.equal(detail.corps.activites.length, 1);
  assert.deepEqual(
    [detail.corps.activites[0].pseudo, detail.corps.activites[0].typeSeance, detail.corps.activites[0].date],
    ['Alice', 'push', jour],
  );
  assert.equal(detail.corps.activites[0].nombreEncouragements, 0);
  assert.equal('poids' in detail.corps.activites[0], false);

  assert.equal(detail.corps.membres.length, 2);
  const alice = detail.corps.membres.find((m) => m.pseudo === 'Alice');
  assert.equal(alice.streak, 1);
  assert.equal(alice.rang, null); // pas d'exercice de référence loggé (exercices: [])

  return seanceId;
});

test("encourager une séance bascule (ajoute puis retire), mais seulement pour une séance d'un membre du même groupe", async () => {
  const a = await nouvelUtilisateur('Alice2');
  const { corps } = await appeler('/groupes', { methode: 'POST', cookie: a.cookie, corps: { nom: 'Team2' } });
  const b = await nouvelUtilisateur('Bob2');
  await appeler('/groupes/rejoindre', { methode: 'POST', cookie: b.cookie, corps: { code: corps.groupe.codeInvitation } });
  const seanceId = await logger(a.cookie, aujourdhui());

  const ajout = await appeler(`/groupes/${corps.groupe.id}/seances/${seanceId}/encouragement`, { methode: 'POST', cookie: b.cookie });
  assert.equal(ajout.statut, 200);
  assert.equal(ajout.corps.encourage, true);

  const apresAjout = await appeler(`/groupes/${corps.groupe.id}`, { cookie: a.cookie });
  assert.equal(apresAjout.corps.activites[0].nombreEncouragements, 1);
  assert.equal(apresAjout.corps.activites[0].jaiEncourage, false); // Alice n'a pas encouragé sa propre séance
  const vuParBob = await appeler(`/groupes/${corps.groupe.id}`, { cookie: b.cookie });
  assert.equal(vuParBob.corps.activites[0].jaiEncourage, true);

  const retrait = await appeler(`/groupes/${corps.groupe.id}/seances/${seanceId}/encouragement`, { methode: 'POST', cookie: b.cookie });
  assert.equal(retrait.corps.encourage, false);

  // Une séance en dehors du groupe (Etranger n'en fait pas partie) reste hors d'atteinte.
  const etranger = await nouvelUtilisateur('Etranger2');
  const seanceEtrangere = await logger(etranger.cookie, aujourdhui());
  const horsGroupe = await appeler(`/groupes/${corps.groupe.id}/seances/${seanceEtrangere}/encouragement`, { methode: 'POST', cookie: a.cookie });
  assert.equal(horsGroupe.statut, 404);
});

test('quitter un groupe retire son accès', async () => {
  const a = await nouvelUtilisateur('Alice3');
  const { corps } = await appeler('/groupes', { methode: 'POST', cookie: a.cookie, corps: { nom: 'Team3' } });

  const depart = await appeler(`/groupes/${corps.groupe.id}/membres/moi`, { methode: 'DELETE', cookie: a.cookie });
  assert.equal(depart.statut, 204);
  assert.equal((await appeler(`/groupes/${corps.groupe.id}`, { cookie: a.cookie })).statut, 404);
  assert.equal((await appeler(`/groupes/${corps.groupe.id}/membres/moi`, { methode: 'DELETE', cookie: a.cookie })).statut, 404);
});

test('les routes groupes exigent une session', async () => {
  assert.equal((await appeler('/groupes')).statut, 401);
  assert.equal((await appeler('/groupes', { methode: 'POST', corps: { nom: 'x' } })).statut, 401);
});
