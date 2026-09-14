import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { demarrerServeurDeTest } from './outils.js';

const { appeler, pool, arreter } = await demarrerServeurDeTest('repwise_test_programmes');
after(arreter);

async function nouvelInvite() {
  return (await appeler('/auth/invite', { methode: 'POST' })).cookie;
}

async function idExercice(nom) {
  const [[ligne]] = await pool.execute('SELECT id FROM bibliotheque_exercices WHERE nom = ?', [nom]);
  return ligne.id;
}

test('la bibliothèque couvre les 14 groupes musculaires et se lit sans session', async () => {
  const r = await appeler('/exercices');
  assert.equal(r.statut, 200);
  const groupes = new Set(r.corps.exercices.map((e) => e.groupeMusculaire));
  assert.equal(groupes.size, 14);
  assert.ok(r.corps.exercices.length >= 60);
});

test('exercices d’un groupe, dans l’ordre de recommandation', async () => {
  const r = await appeler('/exercices?groupe=pectoraux');
  assert.equal(r.corps.exercices[0].nom, 'Développé couché');
  assert.ok(r.corps.exercices.every((e) => e.groupeMusculaire === 'pectoraux' && e.description));
  assert.equal((await appeler('/exercices?groupe=nuque')).statut, 400);
});

test('créer un programme, y ajouter des exercices puis en retirer un', async () => {
  const cookie = await nouvelInvite();
  const creation = await appeler('/programmes', { methode: 'POST', cookie, corps: { nom: '  Push A  ' } });
  assert.equal(creation.statut, 201);
  const { id } = creation.corps.programme;
  assert.equal(creation.corps.programme.nom, 'Push A');

  const couche = await idExercice('Développé couché');
  const dips = await idExercice('Dips');
  await appeler(`/programmes/${id}/exercices`, {
    methode: 'POST', cookie, corps: { exerciceId: couche, seriesCibles: 4, repetitionsCibles: 8, poidsCible: 80 },
  });
  const ajout = await appeler(`/programmes/${id}/exercices`, {
    methode: 'POST', cookie, corps: { exerciceId: dips, seriesCibles: 3, repetitionsCibles: 12 },
  });
  assert.equal(ajout.statut, 201);
  assert.deepEqual(
    ajout.corps.programme.exercices.map(({ nom, seriesCibles, repetitionsCibles, poidsCible, groupeMusculaire }) =>
      [nom, groupeMusculaire, seriesCibles, repetitionsCibles, poidsCible]),
    [['Développé couché', 'pectoraux', 4, 8, 80], ['Dips', 'pectoraux', 3, 12, null]],
  );

  const liste = await appeler('/programmes', { cookie });
  assert.deepEqual(liste.corps.programmes, [{ id, nom: 'Push A', nbExercices: 2 }]);

  const ligne = ajout.corps.programme.exercices[0].id;
  assert.equal((await appeler(`/programmes/${id}/exercices/${ligne}`, { methode: 'DELETE', cookie })).statut, 204);
  const apres = await appeler(`/programmes/${id}`, { cookie });
  assert.deepEqual(apres.corps.programme.exercices.map((e) => e.nom), ['Dips']);

  // Un exercice retiré puis rajouté repasse en fin de programme.
  const rajout = await appeler(`/programmes/${id}/exercices`, {
    methode: 'POST', cookie, corps: { exerciceId: couche, seriesCibles: 4, repetitionsCibles: 8 },
  });
  assert.deepEqual(rajout.corps.programme.exercices.map((e) => e.nom), ['Dips', 'Développé couché']);

  assert.equal((await appeler(`/programmes/${id}`, { methode: 'DELETE', cookie })).statut, 204);
  assert.equal((await appeler(`/programmes/${id}`, { cookie })).statut, 404);
});

test('validation des programmes', async () => {
  const cookie = await nouvelInvite();
  assert.equal((await appeler('/programmes', { methode: 'POST', cookie, corps: { nom: ' ' } })).statut, 400);
  const { id } = (await appeler('/programmes', { methode: 'POST', cookie, corps: { nom: 'Legs' } })).corps.programme;

  const invalide = await appeler(`/programmes/${id}/exercices`, {
    methode: 'POST', cookie, corps: { exerciceId: 'abc', seriesCibles: 0, repetitionsCibles: 500, poidsCible: -1 },
  });
  assert.deepEqual(Object.keys(invalide.corps.champs).sort(), ['exerciceId', 'poidsCible', 'repetitionsCibles', 'seriesCibles']);

  const inconnu = await appeler(`/programmes/${id}/exercices`, {
    methode: 'POST', cookie, corps: { exerciceId: 999999, seriesCibles: 3, repetitionsCibles: 10 },
  });
  assert.equal(inconnu.statut, 400);
  assert.ok(inconnu.corps.champs.exerciceId);
});

test("les programmes d'un autre utilisateur sont inaccessibles", async () => {
  const proprietaire = await nouvelInvite();
  const intrus = await nouvelInvite();
  const { id } = (await appeler('/programmes', { methode: 'POST', cookie: proprietaire, corps: { nom: 'Pull' } })).corps.programme;
  const tractions = await idExercice('Tractions');
  const { corps } = await appeler(`/programmes/${id}/exercices`, {
    methode: 'POST', cookie: proprietaire, corps: { exerciceId: tractions, seriesCibles: 3, repetitionsCibles: 8 },
  });
  const ligne = corps.programme.exercices[0].id;

  assert.equal((await appeler(`/programmes/${id}`, { cookie: intrus })).statut, 404);
  assert.equal((await appeler(`/programmes/${id}/exercices`, {
    methode: 'POST', cookie: intrus, corps: { exerciceId: tractions, seriesCibles: 3, repetitionsCibles: 8 },
  })).statut, 404);
  assert.equal((await appeler(`/programmes/${id}/exercices/${ligne}`, { methode: 'DELETE', cookie: intrus })).statut, 404);
  assert.equal((await appeler(`/programmes/${id}`, { methode: 'DELETE', cookie: intrus })).statut, 404);
  assert.deepEqual((await appeler('/programmes', { cookie: intrus })).corps.programmes, []);
  assert.equal((await appeler('/programmes')).statut, 401);
});

test('une séance relie ses exercices à la bibliothèque par le nom (casse et accents ignorés)', async () => {
  const cookie = await nouvelInvite();
  const r = await appeler('/seances', {
    methode: 'POST',
    cookie,
    corps: {
      date: '2026-09-10',
      typeSeance: 'push',
      exercices: [
        { nomExercice: 'developpe couche', series: [{ repetitions: 8, poids: 80 }] },
        { nomExercice: 'Mon exercice maison', series: [{ repetitions: 10 }] },
      ],
    },
  });
  assert.equal(r.statut, 201);
  const [lignes] = await pool.execute(
    'SELECT nom_exercice, exercice_id FROM exercices_effectues WHERE seance_id = ? ORDER BY ordre',
    [r.corps.seance.id],
  );
  assert.equal(lignes[0].exercice_id, await idExercice('Développé couché'));
  assert.equal(lignes[1].exercice_id, null);
  // Le nom saisi par l'utilisateur est conservé tel quel.
  assert.equal(lignes[0].nom_exercice, 'developpe couche');
});
