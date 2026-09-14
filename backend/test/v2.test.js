import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { demarrerServeurDeTest } from './outils.js';

// Feedback, recommandations, progression, rang et classement.
const { appeler, pool, arreter } = await demarrerServeurDeTest('repwise_test_v2');
after(arreter);

// Dates relatives à aujourd'hui : le rang ne compte que les 6 dernières semaines.
const ilYA = (jours) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - jours);
  return d.toISOString().slice(0, 10);
};

function dateIlYAAns(ans) {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - ans);
  return d.toISOString().slice(0, 10);
}

async function nouvelUtilisateur({ poids = 80, compte = false, pseudo = 'Léa' } = {}) {
  let r;
  if (compte) {
    r = await appeler('/auth/inscription', {
      methode: 'POST', corps: { email: `u${Date.now()}${Math.random()}@exemple.fr`, motDePasse: 'mot-de-passe' },
    });
  } else {
    r = await appeler('/auth/invite', { methode: 'POST' });
  }
  await appeler('/profil', {
    methode: 'PATCH', cookie: r.cookie, corps: { pseudo, dateNaissance: dateIlYAAns(25), taille: 180, poids, niveauExperience: 'confirme' },
  });
  return r.cookie;
}

const seance = (date, exercices) => ({
  date,
  typeSeance: 'full_body',
  exercices: exercices.map(([nomExercice, series]) => ({
    nomExercice, series: series.map(([repetitions, poids]) => ({ repetitions, poids })),
  })),
});

async function logger(cookie, date, exercices) {
  const r = await appeler('/seances', { methode: 'POST', cookie, corps: seance(date, exercices) });
  assert.equal(r.statut, 201, JSON.stringify(r.corps));
  return r.corps.seance;
}

test('feedback sans compte, rattaché à la session si elle existe', async () => {
  const anonyme = await appeler('/feedback', {
    methode: 'POST', corps: { type: 'bug', description: 'Le bouton ne marche pas sur iPhone', emailContact: 'Moi@Exemple.fr' },
  });
  assert.equal(anonyme.statut, 201);

  const cookie = await nouvelUtilisateur();
  await appeler('/feedback', { methode: 'POST', cookie, corps: { type: 'suggestion', description: 'Un mode sombre plus contrasté' } });

  const [lignes] = await pool.execute('SELECT type, email_contact, utilisateur_id, statut FROM feedback ORDER BY id');
  assert.deepEqual(lignes.map((l) => [l.type, l.email_contact, l.utilisateur_id !== null, l.statut]), [
    ['bug', 'moi@exemple.fr', false, 'nouveau'],
    ['suggestion', null, true, 'nouveau'],
  ]);

  const invalide = await appeler('/feedback', { methode: 'POST', corps: { type: 'avis', description: 'court', emailContact: 'x' } });
  assert.deepEqual(Object.keys(invalide.corps.champs).sort(), ['description', 'emailContact', 'type']);
});

test('chaque poids saisi alimente la courbe de poids (un relevé par jour)', async () => {
  const cookie = await nouvelUtilisateur({ poids: 80 });
  await appeler('/profil', { methode: 'PATCH', cookie, corps: { poids: 79.4 } });
  const r = await appeler('/profil/poids', { cookie });
  assert.equal(r.corps.mesures.length, 1);
  assert.equal(r.corps.mesures[0].poids, 79.4);
});

test('dernière fois et suggestion de progression', async () => {
  const cookie = await nouvelUtilisateur();
  await logger(cookie, ilYA(10), [['Développé couché', [[8, 75], [8, 75]]]]);
  await logger(cookie, ilYA(3), [['Développé couché', [[8, 80], [8, 80], [8, 80]]]]);

  const r = await appeler(`/progression/derniere-fois?nom=${encodeURIComponent('développé COUCHÉ')}&avant=${ilYA(0)}`, { cookie });
  assert.equal(r.corps.derniereFois.date, ilYA(3));
  assert.deepEqual(r.corps.suggestion, { type: 'charge', poids: 82.5, repetitions: 8 });

  // En éditant la séance d'il y a 3 jours, la "dernière fois" est celle d'avant.
  const avant = await appeler(`/progression/derniere-fois?nom=D%C3%A9velopp%C3%A9%20couch%C3%A9&avant=${ilYA(3)}`, { cookie });
  assert.equal(avant.corps.derniereFois.date, ilYA(10));

  const jamais = await appeler(`/progression/derniere-fois?nom=Squat&avant=${ilYA(0)}`, { cookie });
  assert.deepEqual(jamais.corps, { derniereFois: null, suggestion: null });
});

test('progression par exercice : un point par jour avec le meilleur 1RM estimé', async () => {
  const cookie = await nouvelUtilisateur();
  await logger(cookie, ilYA(14), [['Squat', [[5, 100], [5, 100]]]]);
  await logger(cookie, ilYA(7), [['squat', [[5, 105], [15, 60]]], ['Tractions', [[10, 0]]]]);

  const liste = await appeler('/progression/exercices', { cookie });
  assert.deepEqual(liste.corps.exercices.map((e) => [e.nom, e.nbSeances]), [['Squat', 2], ['Tractions', 1]]);

  const squat = await appeler('/progression/exercice?nom=Squat', { cookie });
  assert.deepEqual(squat.corps.points.map((p) => [p.date, p.meilleur1RM, p.chargeMax]), [
    [ilYA(14), 116.7, 100],
    [ilYA(7), 122.5, 105], // la série à 15 reps n'est pas prise pour l'estimation
  ]);
  const tractions = await appeler('/progression/exercice?nom=Tractions', { cookie });
  assert.deepEqual(tractions.corps.points.map((p) => [p.meilleur1RM, p.repetitionsMax]), [[null, 10]]);
});

test('le rang se calcule sur les exercices de référence et apparaît dans la session', async () => {
  const cookie = await nouvelUtilisateur({ poids: 80 });
  assert.equal((await appeler('/rang', { cookie })).corps.rang, null);

  // 1RM estimés au repère intermédiaire sur 4 groupes → score 1 → Beast I.
  await logger(cookie, ilYA(2), [
    ['Développé couché', [[1, 80]]],
    ['Squat', [[1, 108]]],
    ['Soulevé de terre', [[1, 132]]],
    ['Rowing barre', [[1, 72]]],
    ['Curl haltères alterné', [[10, 14]]], // sans repère : ne compte pas
  ]);
  const { rang } = (await appeler('/rang', { cookie })).corps;
  assert.deepEqual([rang.nom, rang.palier, rang.score, rang.groupes], ['Beast', 'I', 1, 4]);

  const session = await appeler('/auth/session', { cookie });
  assert.deepEqual(session.corps.utilisateur.rang, { rang: 4, nom: 'Beast', palier: 'I' });

  const tableau = await appeler(`/tableau-de-bord?aujourdhui=${ilYA(0)}`, { cookie });
  assert.equal(tableau.corps.rang.nom, 'Beast');
});

test('les séances hors de la fenêtre de 6 semaines ne comptent pas', async () => {
  const cookie = await nouvelUtilisateur();
  await logger(cookie, ilYA(60), [['Développé couché', [[1, 200]]]]);
  assert.equal((await appeler('/rang', { cookie })).corps.rang, null);
});

test('supprimer la séance fait redescendre le rang', async () => {
  const cookie = await nouvelUtilisateur();
  const { id } = await logger(cookie, ilYA(1), [['Développé couché', [[1, 80]]]]);
  assert.ok((await appeler('/rang', { cookie })).corps.rang);
  await appeler(`/seances/${id}`, { methode: 'DELETE', cookie });
  const session = await appeler('/auth/session', { cookie });
  assert.equal(session.corps.utilisateur.rang, null);
});

test('classement : seuls les GOAT avec un compte, par score', async () => {
  const eliteSeances = (facteur) => [
    ['Développé couché', [[1, 80 * facteur]]],
    ['Squat', [[1, 108 * facteur]]],
    ['Soulevé de terre', [[1, 132 * facteur]]],
    ['Rowing barre', [[1, 72 * facteur]]],
  ];
  const alice = await nouvelUtilisateur({ compte: true, pseudo: 'Alice' });
  const bruno = await nouvelUtilisateur({ compte: true, pseudo: 'Bruno' });
  const invite = await nouvelUtilisateur({ pseudo: 'Invité' });
  const moyen = await nouvelUtilisateur({ compte: true, pseudo: 'Moyen' });
  await logger(alice, ilYA(1), eliteSeances(2));
  await logger(bruno, ilYA(1), eliteSeances(2.2));
  await logger(invite, ilYA(1), eliteSeances(3)); // GOAT mais invité : absent
  await logger(moyen, ilYA(1), eliteSeances(1)); // pas GOAT : absent

  const r = await appeler('/classement', { cookie: alice });
  assert.equal(r.statut, 200);
  assert.deepEqual(r.corps.classement.map((l) => [l.position, l.pseudo, l.estMoi, l.streak]), [
    [1, 'Bruno', false, 1],
    [2, 'Alice', true, 1],
  ]);
  assert.equal(r.corps.moi.nom, 'GOAT');
  assert.equal(r.corps.maPosition, 2);
  assert.equal(r.corps.scoreGoat, 1.89);

  // Pas GOAT ou invité : pas de position.
  assert.equal((await appeler('/classement', { cookie: moyen })).corps.maPosition, null);
  assert.equal((await appeler('/classement', { cookie: invite })).corps.maPosition, null);
  assert.equal((await appeler('/classement')).statut, 401);

  // Profil public d'un joueur du classement. Sans profil_public, ses séances récentes restent
  // cachées (seul le compteur 30 jours, déjà public, reste visible), mais sa bio et sa photo
  // sont renvoyées telles quelles (elles ne sont pas soumises au même réglage).
  const idBruno = r.corps.classement[0].id;
  await appeler('/profil', { methode: 'PATCH', cookie: bruno, corps: { bio: 'Je soulève des trucs lourds.' } });
  const profil = await appeler(`/classement/${idBruno}`, { cookie: moyen });
  assert.equal(profil.statut, 200);
  assert.deepEqual(
    (({ pseudo, position, estMoi, seancesTrenteJours, seancesRecentes, bio, streak }) =>
      ({ pseudo, position, estMoi, seancesTrenteJours, seancesRecentes, bio, streak }))(profil.corps.joueur),
    { pseudo: 'Bruno', position: 1, estMoi: false, seancesTrenteJours: 1, seancesRecentes: null, bio: 'Je soulève des trucs lourds.', streak: { actuel: 1, record: 1 } },
  );
  assert.equal(profil.corps.joueur.rang.nom, 'GOAT');
  // Rien sur l'email ni les données personnelles.
  assert.equal(profil.corps.joueur.email, undefined);
  assert.equal(profil.corps.joueur.poids, undefined);

  // Bruno active la visibilité : ses séances récentes apparaissent désormais pour les autres.
  await appeler('/profil', { methode: 'PATCH', cookie: bruno, corps: { profilPublic: true } });
  const apresActivation = await appeler(`/classement/${idBruno}`, { cookie: moyen });
  assert.equal(apresActivation.corps.joueur.seancesRecentes.length, 1);
  assert.equal(apresActivation.corps.joueur.seancesRecentes[0].typeSeance, 'full_body');

  // Bruno lui-même voit toujours ses séances, même sans avoir activé la visibilité publique.
  await appeler('/profil', { methode: 'PATCH', cookie: bruno, corps: { profilPublic: false } });
  const vuParLuiMeme = await appeler(`/classement/${idBruno}`, { cookie: bruno });
  assert.equal(vuParLuiMeme.corps.joueur.estMoi, true);
  assert.equal(vuParLuiMeme.corps.joueur.seancesRecentes.length, 1);
});

test('le profil public est réservé aux GOAT ayant un compte', async () => {
  const [lignes] = await pool.execute(
    `SELECT u.id, u.pseudo FROM utilisateurs u JOIN rangs_utilisateur r ON r.utilisateur_id = u.id
     WHERE u.pseudo IN ('Invité', 'Moyen')`,
  );
  const cookie = await nouvelUtilisateur();
  for (const { id } of lignes) {
    assert.equal((await appeler(`/classement/${id}`, { cookie })).statut, 404);
  }
  assert.equal(lignes.length, 2);
  assert.equal((await appeler('/classement/abc', { cookie })).statut, 404);
});
