import { pool } from '../db/pool.js';

// Toutes les fonctions filtrent sur utilisateur_id : une séance d'un autre utilisateur
// est traitée exactement comme une séance inexistante.

async function enTransaction(travail) {
  const connexion = await pool.getConnection();
  try {
    await connexion.beginTransaction();
    const resultat = await travail(connexion);
    await connexion.commit();
    return resultat;
  } catch (err) {
    await connexion.rollback();
    throw err;
  } finally {
    connexion.release();
  }
}

// Comme la collation MySQL utf8mb4_unicode_ci : casse et accents ignorés.
const cleNom = (nom) => nom.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Un exercice dont le nom correspond à la bibliothèque y est relié : ça servira aux graphiques
// et au rang, sans que le front ait à gérer d'identifiant.
async function idsBibliotheque(connexion, exercices) {
  const noms = [...new Set(exercices.map((e) => e.nomExercice))];
  if (noms.length === 0) return new Map();
  const [lignes] = await connexion.query('SELECT id, nom FROM bibliotheque_exercices WHERE nom IN (?)', [noms]);
  return new Map(lignes.map((l) => [cleNom(l.nom), l.id]));
}

async function insererExercices(connexion, seanceId, exercices) {
  const bibliotheque = await idsBibliotheque(connexion, exercices);
  for (const [index, exercice] of exercices.entries()) {
    const [resultat] = await connexion.execute(
      'INSERT INTO exercices_effectues (seance_id, exercice_id, nom_exercice, ordre) VALUES (?, ?, ?, ?)',
      [seanceId, bibliotheque.get(cleNom(exercice.nomExercice)) ?? null, exercice.nomExercice, index + 1],
    );
    const lignes = exercice.series.map((serie, numero) => [
      resultat.insertId, numero + 1, serie.repetitions, serie.poids, exercice.tempsRepos,
    ]);
    // query (et non execute) pour l'insertion groupée "VALUES ?".
    await connexion.query(
      'INSERT INTO series (exercice_effectue_id, numero_serie, repetitions, poids, temps_repos) VALUES ?',
      [lignes],
    );
  }
}

export async function listerSeances(utilisateurId, { debut, fin }) {
  const [lignes] = await pool.execute(
    `SELECT s.id, s.date, s.type_seance, s.type_personnalise, COUNT(e.id) AS nb_exercices
     FROM seances s
     LEFT JOIN exercices_effectues e ON e.seance_id = s.id
     WHERE s.utilisateur_id = ? AND s.date BETWEEN ? AND ?
     GROUP BY s.id
     ORDER BY s.date, s.id`,
    [utilisateurId, debut, fin],
  );
  return lignes.map((l) => ({
    id: l.id,
    date: l.date,
    typeSeance: l.type_seance,
    typePersonnalise: l.type_personnalise,
    nbExercices: l.nb_exercices,
  }));
}

export async function lireSeanceComplete(utilisateurId, id) {
  const [[seance]] = await pool.execute(
    'SELECT id, date, type_seance, type_personnalise, notes FROM seances WHERE id = ? AND utilisateur_id = ?',
    [id, utilisateurId],
  );
  if (!seance) return null;

  const [series] = await pool.execute(
    `SELECT e.id AS exercice_id, e.nom_exercice, s.repetitions, s.poids, s.temps_repos
     FROM exercices_effectues e
     LEFT JOIN series s ON s.exercice_effectue_id = e.id
     WHERE e.seance_id = ?
     ORDER BY e.ordre, s.numero_serie`,
    [id],
  );

  const exercices = new Map();
  for (const ligne of series) {
    if (!exercices.has(ligne.exercice_id)) {
      exercices.set(ligne.exercice_id, { nomExercice: ligne.nom_exercice, tempsRepos: ligne.temps_repos, series: [] });
    }
    if (ligne.repetitions !== null) {
      // mysql2 renvoie les DECIMAL sous forme de chaîne.
      exercices.get(ligne.exercice_id).series.push({ repetitions: ligne.repetitions, poids: Number(ligne.poids) });
    }
  }

  return {
    id: seance.id,
    date: seance.date,
    typeSeance: seance.type_seance,
    typePersonnalise: seance.type_personnalise,
    notes: seance.notes,
    exercices: [...exercices.values()],
  };
}

export async function creerSeance(utilisateurId, seance) {
  return enTransaction(async (connexion) => {
    const [resultat] = await connexion.execute(
      'INSERT INTO seances (utilisateur_id, date, type_seance, type_personnalise, notes) VALUES (?, ?, ?, ?, ?)',
      [utilisateurId, seance.date, seance.typeSeance, seance.typePersonnalise, seance.notes],
    );
    await insererExercices(connexion, resultat.insertId, seance.exercices);
    return resultat.insertId;
  });
}

// Le formulaire renvoie toujours la séance entière : on remplace ses exercices plutôt que
// de calculer un diff (les séries suivent via ON DELETE CASCADE).
export async function remplacerSeance(utilisateurId, id, seance) {
  return enTransaction(async (connexion) => {
    const [[existante]] = await connexion.execute(
      'SELECT id FROM seances WHERE id = ? AND utilisateur_id = ? FOR UPDATE',
      [id, utilisateurId],
    );
    if (!existante) return false;

    await connexion.execute(
      'UPDATE seances SET date = ?, type_seance = ?, type_personnalise = ?, notes = ? WHERE id = ?',
      [seance.date, seance.typeSeance, seance.typePersonnalise, seance.notes, id],
    );
    await connexion.execute('DELETE FROM exercices_effectues WHERE seance_id = ?', [id]);
    await insererExercices(connexion, id, seance.exercices);
    return true;
  });
}

export async function supprimerSeance(utilisateurId, id) {
  const [resultat] = await pool.execute(
    'DELETE FROM seances WHERE id = ? AND utilisateur_id = ?',
    [id, utilisateurId],
  );
  return resultat.affectedRows > 0;
}

// Pour l'autocomplétion du nom d'exercice : les plus récemment pratiqués d'abord.
export async function listerExercicesRecents(utilisateurId) {
  const [lignes] = await pool.execute(
    `SELECT e.nom_exercice
     FROM exercices_effectues e
     JOIN seances s ON s.id = e.seance_id
     WHERE s.utilisateur_id = ?
     GROUP BY e.nom_exercice
     ORDER BY MAX(s.date) DESC, MAX(e.id) DESC
     LIMIT 100`,
    [utilisateurId],
  );
  return lignes.map((l) => l.nom_exercice);
}
