-- Repères de force pour le rang : 1RM estimé / poids de corps d'un pratiquant intermédiaire
-- (homme ; un facteur est appliqué pour les femmes, voir backend/src/rang/calcul.js).
-- Valeurs indicatives, inspirées des standards de force usuels : à ajuster librement.
-- Exécuté après bibliotheque.sql par backend/scripts/init-db.js.

UPDATE bibliotheque_exercices SET ratio_reference = NULL, poids_du_corps = FALSE;

UPDATE bibliotheque_exercices b
JOIN (
  SELECT 'Développé couché' AS nom, 1.00 AS ratio, FALSE AS pdc
  UNION ALL SELECT 'Développé couché prise serrée', 0.85, FALSE
  UNION ALL SELECT 'Dips', 1.35, TRUE
  UNION ALL SELECT 'Dips buste droit', 1.35, TRUE
  UNION ALL SELECT 'Développé militaire', 0.65, FALSE
  UNION ALL SELECT 'Tractions', 1.25, TRUE
  UNION ALL SELECT 'Rowing barre', 0.90, FALSE
  UNION ALL SELECT 'Tirage vertical', 0.90, FALSE
  UNION ALL SELECT 'Tirage horizontal à la poulie', 0.90, FALSE
  UNION ALL SELECT 'Shrugs à la barre', 1.30, FALSE
  UNION ALL SELECT 'Soulevé de terre', 1.65, FALSE
  UNION ALL SELECT 'Squat', 1.35, FALSE
  UNION ALL SELECT 'Front squat', 1.10, FALSE
  UNION ALL SELECT 'Hack squat', 1.30, FALSE
  UNION ALL SELECT 'Presse à cuisses', 2.50, FALSE
  UNION ALL SELECT 'Leg extension', 0.80, FALSE
  UNION ALL SELECT 'Soulevé de terre roumain', 1.20, FALSE
  UNION ALL SELECT 'Leg curl allongé', 0.60, FALSE
  UNION ALL SELECT 'Hip thrust', 1.50, FALSE
  UNION ALL SELECT 'Curl barre', 0.50, FALSE
  UNION ALL SELECT 'Barre au front', 0.45, FALSE
  UNION ALL SELECT 'Mollets debout', 1.20, FALSE
) reperes ON reperes.nom = b.nom
SET b.ratio_reference = reperes.ratio, b.poids_du_corps = reperes.pdc;
