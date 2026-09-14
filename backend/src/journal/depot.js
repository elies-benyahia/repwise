import { pool } from '../db/pool.js';

// mysql2 renvoie les DECIMAL sous forme de chaîne.
const versEntree = (l) => ({
  id: l.id,
  date: l.date,
  repas: l.repas,
  nomAliment: l.nom_aliment,
  codeBarres: l.code_barres,
  imageUrl: l.image_url,
  quantite: Number(l.quantite),
  calories: l.calories,
  proteines: Number(l.proteines),
  glucides: Number(l.glucides),
  lipides: Number(l.lipides),
  sucre: Number(l.sucre),
});

const NOMS_COLONNES_ENTREE = [
  'id', 'date', 'repas', 'nom_aliment', 'code_barres', 'image_url', 'quantite',
  'calories', 'proteines', 'glucides', 'lipides', 'sucre',
];
const COLONNES_ENTREE = NOMS_COLONNES_ENTREE.join(', ');
const COLONNES_ENTREE_PREFIXEES = NOMS_COLONNES_ENTREE.map((c) => `e.${c}`).join(', ');

const versObjectif = (l) => ({
  calories: l.calories_cibles,
  proteines: l.proteines_cibles,
  glucides: l.glucides_cibles,
  lipides: l.lipides_cibles,
});

export async function listerEntrees(utilisateurId, date) {
  const [lignes] = await pool.execute(
    `SELECT ${COLONNES_ENTREE} FROM entrees_alimentaires WHERE utilisateur_id = ? AND date = ? ORDER BY id`,
    [utilisateurId, date],
  );
  return lignes.map(versEntree);
}

export async function ajouterEntree(utilisateurId, entree) {
  const [resultat] = await pool.execute(
    `INSERT INTO entrees_alimentaires
       (utilisateur_id, date, repas, nom_aliment, code_barres, image_url, quantite, calories, proteines, glucides, lipides, sucre)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [utilisateurId, entree.date, entree.repas, entree.nomAliment, entree.codeBarres, entree.imageUrl,
      entree.quantite, entree.calories, entree.proteines, entree.glucides, entree.lipides, entree.sucre],
  );
  const [[ligne]] = await pool.execute(
    `SELECT ${COLONNES_ENTREE} FROM entrees_alimentaires WHERE id = ?`,
    [resultat.insertId],
  );
  return versEntree(ligne);
}

export async function supprimerEntree(utilisateurId, id) {
  const [resultat] = await pool.execute(
    'DELETE FROM entrees_alimentaires WHERE id = ? AND utilisateur_id = ?',
    [id, utilisateurId],
  );
  return resultat.affectedRows > 0;
}

// Les aliments qu'on mange souvent reviennent : dernière valeur saisie pour chaque nom distinct.
export async function listerAlimentsRecents(utilisateurId) {
  const [lignes] = await pool.execute(
    `SELECT ${COLONNES_ENTREE_PREFIXEES}
     FROM entrees_alimentaires e
     JOIN (
       SELECT MAX(id) AS id FROM entrees_alimentaires
       WHERE utilisateur_id = ?
       GROUP BY nom_aliment
       ORDER BY MAX(id) DESC
       LIMIT 30
     ) recents ON recents.id = e.id
     ORDER BY e.id DESC`,
    [utilisateurId],
  );
  return lignes.map(versEntree);
}

// Objectif en vigueur à une date : le dernier calculé ce jour-là ou avant. Pour une date
// antérieure au tout premier objectif, on prend ce premier objectif plutôt que rien.
export async function trouverObjectif(utilisateurId, date) {
  const [[enVigueur]] = await pool.execute(
    `SELECT calories_cibles, proteines_cibles, glucides_cibles, lipides_cibles, date_calcul
     FROM objectifs_caloriques
     WHERE utilisateur_id = ? AND DATE(date_calcul) <= ?
     ORDER BY date_calcul DESC, id DESC
     LIMIT 1`,
    [utilisateurId, date],
  );
  if (enVigueur) return versObjectif(enVigueur);

  const [[premier]] = await pool.execute(
    `SELECT calories_cibles, proteines_cibles, glucides_cibles, lipides_cibles, date_calcul
     FROM objectifs_caloriques
     WHERE utilisateur_id = ?
     ORDER BY date_calcul, id
     LIMIT 1`,
    [utilisateurId],
  );
  return premier ? versObjectif(premier) : null;
}

export async function enregistrerObjectif(utilisateurId, objectif) {
  const connexion = await pool.getConnection();
  try {
    await connexion.beginTransaction();
    await connexion.execute(
      `INSERT INTO objectifs_caloriques
         (utilisateur_id, calories_cibles, proteines_cibles, glucides_cibles, lipides_cibles)
       VALUES (?, ?, ?, ?, ?)`,
      [utilisateurId, objectif.calories, objectif.proteines, objectif.glucides, objectif.lipides],
    );
    const colonnes = Object.keys(objectif.profil);
    if (colonnes.length > 0) {
      // Noms de colonnes issus de lireObjectif (liste fermée), jamais de la requête.
      await connexion.execute(
        `UPDATE utilisateurs SET ${colonnes.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
        [...Object.values(objectif.profil), utilisateurId],
      );
    }
    await connexion.commit();
  } catch (err) {
    await connexion.rollback();
    throw err;
  } finally {
    connexion.release();
  }
}
