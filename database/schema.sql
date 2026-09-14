-- Schéma MySQL 8 — Repwise
-- Unités stockées : kg, cm, secondes, kcal, grammes. La conversion (lb…) se fait côté front.
-- La base elle-même est créée par backend/scripts/init-db.js (npm run db:init).

-- Un invité est un vrai utilisateur sans email ni mot de passe : toutes les fonctionnalités
-- marchent pareil, et créer un compte plus tard complète simplement la ligne (historique conservé).
CREATE TABLE IF NOT EXISTS utilisateurs (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email             VARCHAR(255) NULL,
  mot_de_passe_hash VARCHAR(255) NULL,
  est_invite        BOOLEAN NOT NULL DEFAULT FALSE,
  -- Renommé depuis `prenom` (refonte onboarding) : affiché partout, y compris dans le
  -- classement public, donc pas le vrai prénom. Pas d'unicité imposée (non demandée).
  pseudo            VARCHAR(50) NULL,
  -- Renommé depuis `annee_naissance` : l'onboarding demande maintenant la date de naissance
  -- exacte (sélecteur natif), donc on la stocke telle quelle plutôt qu'une simple année.
  date_naissance    DATE NULL,
  poids_actuel      DECIMAL(5,2) NULL,
  taille            SMALLINT UNSIGNED NULL,
  -- Niveau déclaré. Distinct du rang calculé (rangs_utilisateur). Depuis la refonte, déduit
  -- automatiquement de frequence_seances (voir backend/src/utilisateurs/niveaux.js) plutôt que
  -- demandé explicitement, mais reste modifiable (ex. futurs réglages avancés).
  niveau_experience ENUM('debutant', 'intermediaire', 'confirme') NULL,
  sexe              ENUM('homme', 'femme') NULL,
  -- Idem : déduit de frequence_seances à l'onboarding, mais reste réglable directement
  -- depuis le calculateur (qui garde ses 5 niveaux d'activité classiques).
  niveau_activite   ENUM('sedentaire', 'leger', 'modere', 'actif', 'tres_actif') NULL,
  -- Objectif "technique" utilisé par le calculateur de macros (4 valeurs).
  objectif          ENUM('prise_de_masse', 'perte_de_gras', 'recomposition', 'maintien') NULL,
  -- Nombre de séances de sport par semaine, demandé à l'onboarding (étape 2). Sert à déduire
  -- niveau_activite et niveau_experience, et s'affiche tel quel sur le profil.
  frequence_seances TINYINT UNSIGNED NULL,
  -- Objectif "déclaré" à l'onboarding (6 choix, plus parlants que les 4 du calculateur) ;
  -- mappé vers `objectif` au moment de l'enregistrement. Affichage seulement.
  objectif_declare  ENUM(
    'prise_de_masse', 'perte_de_poids', 'prise_de_muscle',
    'perte_de_poids_stabilisation', 'cardio_marathon', 'pratique_libre'
  ) NULL,
  bio               VARCHAR(280) NULL,
  photo_url         VARCHAR(255) NULL,
  -- Visibilité de la section "séances récentes" sur le profil public (classement). Le poids de
  -- corps et les courbes de charge, eux, ne sont JAMAIS publics, quel que soit ce réglage.
  profil_public     BOOLEAN NOT NULL DEFAULT FALSE,
  unite_poids       ENUM('kg', 'lb') NOT NULL DEFAULT 'kg',
  -- Rôle admin (page /admin) : voir tous les utilisateurs, corriger un rang manuellement, lire
  -- les feedbacks. Pas d'inscription admin : premier compte admin promu à la main en base
  -- (UPDATE utilisateurs SET role = 'admin' WHERE id = ... — voir README).
  role              ENUM('utilisateur', 'admin') NOT NULL DEFAULT 'utilisateur',
  date_creation     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Plusieurs NULL sont autorisés par un index UNIQUE : pas de conflit entre invités.
  UNIQUE KEY uq_utilisateurs_email (email),
  CONSTRAINT chk_utilisateurs_identifiants
    CHECK (est_invite OR (email IS NOT NULL AND mot_de_passe_hash IS NOT NULL))
) ENGINE=InnoDB;

-- Sessions de connexion. Le jeton brut ne vit que dans le cookie httpOnly du navigateur :
-- on ne stocke que son empreinte SHA-256, donc une fuite de la base ne permet pas d'usurper un compte.
CREATE TABLE IF NOT EXISTS sessions (
  id              CHAR(64) PRIMARY KEY,
  utilisateur_id  INT UNSIGNED NOT NULL,
  date_creation   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_expiration DATETIME NOT NULL,
  CONSTRAINT fk_sessions_utilisateur FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs(id) ON DELETE CASCADE,
  KEY idx_sessions_utilisateur (utilisateur_id),
  KEY idx_sessions_expiration (date_expiration)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS seances (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id    INT UNSIGNED NOT NULL,
  date              DATE NOT NULL,
  type_seance       ENUM('push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'personnalise') NOT NULL,
  -- Libellé libre, utilisé seulement quand type_seance = 'personnalise'.
  type_personnalise VARCHAR(50) NULL,
  notes             TEXT NULL,
  date_creation     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_seances_utilisateur FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs(id) ON DELETE CASCADE,
  -- Vue calendrier : toutes les séances d'un utilisateur sur un mois.
  KEY idx_seances_utilisateur_date (utilisateur_id, date)
) ENGINE=InnoDB;

-- Alimente la carte du corps (clic sur un muscle → exercices) et l'aide à la saisie.
CREATE TABLE IF NOT EXISTS bibliotheque_exercices (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom               VARCHAR(100) NOT NULL,
  groupe_musculaire ENUM(
    'pectoraux', 'dos', 'trapezes', 'lombaires', 'epaules', 'biceps', 'triceps',
    'avant_bras', 'abdominaux', 'obliques', 'fessiers', 'quadriceps', 'ischio_jambiers', 'mollets'
  ) NOT NULL,
  description       TEXT NULL,
  -- Mêmes valeurs que utilisateurs.niveau_experience, pour filtrer les suggestions.
  niveau_difficulte ENUM('debutant', 'intermediaire', 'confirme') NOT NULL,
  image_ou_gif      VARCHAR(255) NULL,
  -- Ordre de recommandation au sein d'un groupe musculaire (1 = le plus recommandé).
  priorite          TINYINT UNSIGNED NOT NULL DEFAULT 100,
  -- Rang : 1RM estimé / poids de corps attendu chez un pratiquant intermédiaire (homme).
  -- Sans ce repère, un curl et un squat ne sont pas comparables : les exercices sans
  -- ratio (haltères, isolation légère, gainage) ne comptent pas dans le score.
  ratio_reference   DECIMAL(4,2) NULL,
  -- Exercice au poids du corps (tractions, dips) : charge = poids de corps + lest saisi.
  poids_du_corps    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY uq_bibliotheque_nom (nom),
  KEY idx_bibliotheque_groupe (groupe_musculaire, priorite)
) ENGINE=InnoDB;

-- Base d'aliments courants (retour du 14/09 : "il manque l'autocomplétion pour les aliments" —
-- Open Food Facts seul est une base de produits À CODE-BARRES, pauvre sur les aliments bruts
-- comme "poulet" ou "banane"). Sert de première source de recherche, avant repli sur Open Food
-- Facts pour les produits de marque — voir backend/src/alimentation/routes.js. Valeurs pour
-- 100 g, moyennes de référence (type CIQUAL/USDA) plutôt que la fiche exacte d'un produit
-- précis : approximatives par nature, contrairement aux valeurs Open Food Facts qui viennent de
-- l'emballage réel d'un produit.
CREATE TABLE IF NOT EXISTS bibliotheque_aliments (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom         VARCHAR(100) NOT NULL,
  categorie   ENUM(
    'viande', 'poisson', 'oeuf_laitier', 'legume', 'fruit', 'feculent_cereale',
    'legumineuse', 'matiere_grasse', 'sucrerie_dessert', 'snack_apero', 'boisson', 'plat_prepare'
  ) NOT NULL,
  calories    SMALLINT UNSIGNED NOT NULL,
  proteines   DECIMAL(4,1) UNSIGNED NOT NULL,
  glucides    DECIMAL(4,1) UNSIGNED NOT NULL,
  lipides     DECIMAL(4,1) UNSIGNED NOT NULL,
  sucre       DECIMAL(4,1) UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_bibliotheque_aliments_nom (nom),
  KEY idx_bibliotheque_aliments_categorie (categorie)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS exercices_effectues (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seance_id     INT UNSIGNED NOT NULL,
  -- Renseigné quand l'exercice vient de la bibliothèque (carte du corps, suggestions) ;
  -- nom_exercice reste la référence pour les exercices saisis librement.
  exercice_id   INT UNSIGNED NULL,
  nom_exercice  VARCHAR(100) NOT NULL,
  ordre         TINYINT UNSIGNED NOT NULL,
  CONSTRAINT fk_exercices_seance FOREIGN KEY (seance_id)
    REFERENCES seances(id) ON DELETE CASCADE,
  CONSTRAINT fk_exercices_bibliotheque FOREIGN KEY (exercice_id)
    REFERENCES bibliotheque_exercices(id) ON DELETE SET NULL,
  UNIQUE KEY uq_exercices_seance_ordre (seance_id, ordre),
  -- Graphiques de progression (V2) : historique d'un exercice donné.
  KEY idx_exercices_nom (nom_exercice)
) ENGINE=InnoDB;

-- Table séparée plutôt que JSON : la progression de charge automatique et les
-- graphiques (V2) ont besoin de requêter poids et répétitions en SQL.
CREATE TABLE IF NOT EXISTS series (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  exercice_effectue_id INT UNSIGNED NOT NULL,
  numero_serie         TINYINT UNSIGNED NOT NULL,
  repetitions          SMALLINT UNSIGNED NOT NULL,
  poids                DECIMAL(6,2) NOT NULL DEFAULT 0,
  temps_repos          SMALLINT UNSIGNED NULL,
  CONSTRAINT fk_series_exercice FOREIGN KEY (exercice_effectue_id)
    REFERENCES exercices_effectues(id) ON DELETE CASCADE,
  UNIQUE KEY uq_series_exercice_numero (exercice_effectue_id, numero_serie)
) ENGINE=InnoDB;

-- Revenu sur la limite volontaire initiale (plus de saisie manuelle) : chaque entrée vient
-- maintenant d'une recherche dans Open Food Facts (code_barres = code-barres OFF, nullable pour
-- les tout premiers essais/tests manuels). calories/proteines/glucides/lipides/sucre restent les
-- valeurs POUR LA QUANTITÉ saisie (déjà mises à l'échelle), pas les valeurs pour 100g — le reste
-- du code (totaux du jour, objectif) n'a donc rien à changer.
CREATE TABLE IF NOT EXISTS entrees_alimentaires (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT UNSIGNED NOT NULL,
  date           DATE NOT NULL,
  repas          ENUM('petit_dejeuner', 'dejeuner', 'diner', 'collation') NULL,
  nom_aliment    VARCHAR(150) NOT NULL,
  code_barres    VARCHAR(64) NULL,
  image_url      VARCHAR(500) NULL,
  quantite       DECIMAL(6,1) NOT NULL DEFAULT 100,
  calories       SMALLINT UNSIGNED NOT NULL,
  proteines      DECIMAL(6,1) NOT NULL DEFAULT 0,
  glucides       DECIMAL(6,1) NOT NULL DEFAULT 0,
  lipides        DECIMAL(6,1) NOT NULL DEFAULT 0,
  sucre          DECIMAL(6,1) NOT NULL DEFAULT 0,
  date_creation  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_entrees_utilisateur FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs(id) ON DELETE CASCADE,
  KEY idx_entrees_utilisateur_date (utilisateur_id, date)
) ENGINE=InnoDB;

-- Historique des calculs : l'objectif en vigueur est la ligne la plus récente.
CREATE TABLE IF NOT EXISTS objectifs_caloriques (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id   INT UNSIGNED NOT NULL,
  date_calcul      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  calories_cibles  SMALLINT UNSIGNED NOT NULL,
  proteines_cibles SMALLINT UNSIGNED NOT NULL,
  glucides_cibles  SMALLINT UNSIGNED NOT NULL,
  lipides_cibles   SMALLINT UNSIGNED NOT NULL,
  CONSTRAINT fk_objectifs_utilisateur FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs(id) ON DELETE CASCADE,
  KEY idx_objectifs_utilisateur_date (utilisateur_id, date_calcul)
) ENGINE=InnoDB;

-- Ajout par rapport au cahier des charges : nécessaire pour le graphique
-- d'évolution du poids corporel (V2). utilisateurs.poids_actuel reste la valeur courante.
CREATE TABLE IF NOT EXISTS mesures_poids (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT UNSIGNED NOT NULL,
  date           DATE NOT NULL,
  poids          DECIMAL(5,2) NOT NULL,
  CONSTRAINT fk_mesures_utilisateur FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs(id) ON DELETE CASCADE,
  UNIQUE KEY uq_mesures_utilisateur_date (utilisateur_id, date)
) ENGINE=InnoDB;

-- Modèles de séance réutilisables ("Ajouter à mon programme" depuis la carte du corps).
CREATE TABLE IF NOT EXISTS programmes (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT UNSIGNED NOT NULL,
  nom_programme  VARCHAR(100) NOT NULL,
  date_creation  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_programmes_utilisateur FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs(id) ON DELETE CASCADE,
  KEY idx_programmes_utilisateur (utilisateur_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS programme_exercices (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  programme_id       INT UNSIGNED NOT NULL,
  -- Un programme se compose uniquement d'exercices de la bibliothèque (carte du corps).
  exercice_id        INT UNSIGNED NOT NULL,
  ordre              TINYINT UNSIGNED NOT NULL,
  series_cibles      TINYINT UNSIGNED NOT NULL,
  repetitions_cibles SMALLINT UNSIGNED NOT NULL,
  poids_cible        DECIMAL(6,2) NULL,
  CONSTRAINT fk_programme_exercices_programme FOREIGN KEY (programme_id)
    REFERENCES programmes(id) ON DELETE CASCADE,
  -- RESTRICT : on ne peut pas retirer de la bibliothèque un exercice utilisé dans un programme.
  CONSTRAINT fk_programme_exercices_bibliotheque FOREIGN KEY (exercice_id)
    REFERENCES bibliotheque_exercices(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_programme_exercices_ordre (programme_id, ordre)
) ENGINE=InnoDB;

-- Rang courant (V2), une ligne par utilisateur. C'est un cache recalculé à partir des
-- séries loggées : il sert surtout à trier le classement top 100 sans tout recalculer.
-- Rangs 1 à 8 : Rookie, Grinder, Fighter, Beast, Savage, Monster, Legend, GOAT.
-- Paliers : III (entrée du rang) → II → I (sommet du rang).
CREATE TABLE IF NOT EXISTS rangs_utilisateur (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id    INT UNSIGNED NOT NULL,
  rang              TINYINT UNSIGNED NOT NULL,
  palier            ENUM('III', 'II', 'I') NOT NULL,
  score_performance DECIMAL(8,2) NOT NULL,
  date_derniere_maj DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rangs_utilisateur FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT chk_rangs_rang CHECK (rang BETWEEN 1 AND 8),
  UNIQUE KEY uq_rangs_utilisateur (utilisateur_id),
  -- Classement : WHERE rang = 8 ORDER BY score_performance DESC LIMIT 100.
  KEY idx_rangs_classement (rang, score_performance)
) ENGINE=InnoDB;

-- Pas de table `streaks` (écart volontaire au cahier des charges) : la streak est calculée à la
-- volée depuis seances (index utilisateur_id + date). Un compteur stocké deviendrait faux dès
-- qu'on logge une séance oubliée dans le calendrier ou qu'on en supprime une.

-- Instances de quête (une ligne par jour pour les 3 quotidiennes, une par semaine ISO pour
-- l'hebdomadaire) : générées à la volée au premier accès à /api/quetes pour cette période
-- (backend/src/quetes/depot.js), pas par un cron. Partagées par tous les utilisateurs (même
-- énoncé pour tout le monde un jour donné) ; quetes_utilisateur ne stocke que qui les a réussies.
CREATE TABLE IF NOT EXISTS quetes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type          ENUM('quotidienne', 'hebdomadaire') NOT NULL,
  -- Identifie la définition (backend/src/quetes/calcul.js) sans dépendre du texte affiché.
  cle           VARCHAR(50) NOT NULL,
  description   VARCHAR(150) NOT NULL,
  points        SMALLINT UNSIGNED NOT NULL,
  date_debut    DATE NOT NULL,
  date_fin      DATE NOT NULL,
  UNIQUE KEY uq_quetes_cle_periode (cle, date_debut)
) ENGINE=InnoDB;

-- Les points gagnés s'ajoutent au score de performance (1RM, rang/calcul.js) au moment du
-- recalcul du rang : ils bonifient, ils ne remplacent jamais un score déjà nul (pas de rang sans
-- au moins un exercice de référence loggé, quêtes ou pas — voir recalculerRang).
CREATE TABLE IF NOT EXISTS quetes_utilisateur (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id   INT UNSIGNED NOT NULL,
  quete_id         INT UNSIGNED NOT NULL,
  date_completion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  points_gagnes    SMALLINT UNSIGNED NOT NULL,
  CONSTRAINT fk_quetes_utilisateur_utilisateur FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_quetes_utilisateur_quete FOREIGN KEY (quete_id)
    REFERENCES quetes(id) ON DELETE CASCADE,
  UNIQUE KEY uq_quetes_utilisateur (utilisateur_id, quete_id),
  KEY idx_quetes_utilisateur_date (utilisateur_id, date_completion)
) ENGINE=InnoDB;

-- Envoyable sans compte. Si l'auteur supprime son compte, son retour est conservé (SET NULL).
CREATE TABLE IF NOT EXISTS feedback (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT UNSIGNED NULL,
  type           ENUM('suggestion', 'bug') NOT NULL,
  description    TEXT NOT NULL,
  email_contact  VARCHAR(255) NULL,
  date_envoi     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  statut         ENUM('nouveau', 'en_cours', 'traite') NOT NULL DEFAULT 'nouveau',
  CONSTRAINT fk_feedback_utilisateur FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs(id) ON DELETE SET NULL,
  KEY idx_feedback_statut (statut, date_envoi)
) ENGINE=InnoDB;
