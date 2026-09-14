-- Bibliothèque d'exercices (carte du corps). Rejouable : met à jour les exercices existants
-- (clé : nom), ajoute les nouveaux. Exécuté par backend/scripts/init-db.js après schema.sql.
-- Un exercice est rangé sous son muscle principal ; priorite = ordre de recommandation.

INSERT INTO bibliotheque_exercices (nom, groupe_musculaire, niveau_difficulte, priorite, description) VALUES
-- Pectoraux
('Développé couché', 'pectoraux', 'intermediaire', 1, 'Allongé sur le banc, omoplates serrées, descends la barre au milieu des pectoraux puis pousse.'),
('Développé incliné haltères', 'pectoraux', 'intermediaire', 2, 'Banc à 30°, descends les haltères de chaque côté du haut des pectoraux, puis pousse en les rapprochant.'),
('Pompes', 'pectoraux', 'debutant', 3, 'Mains un peu plus larges que les épaules, corps gainé, amène la poitrine près du sol puis repousse.'),
('Développé couché haltères', 'pectoraux', 'debutant', 4, 'Plus d''amplitude qu''à la barre : descends les haltères sous le niveau de la poitrine en contrôlant.'),
('Dips', 'pectoraux', 'intermediaire', 5, 'Buste penché en avant, descends jusqu''à ce que les épaules passent sous les coudes, puis remonte.'),
('Écarté à la poulie vis-à-vis', 'pectoraux', 'debutant', 6, 'Bras légèrement fléchis, ramène les poignées devant la poitrine en contractant les pectoraux.'),
-- Dos
('Tractions', 'dos', 'intermediaire', 1, 'Prise pronation largeur d''épaules, tire la poitrine vers la barre en abaissant les coudes.'),
('Rowing barre', 'dos', 'intermediaire', 2, 'Buste penché à 45°, dos plat, tire la barre vers le nombril en serrant les omoplates.'),
('Tirage vertical', 'dos', 'debutant', 3, 'Tire la barre vers le haut de la poitrine, coudes vers le bas, sans balancer le buste.'),
('Rowing haltère un bras', 'dos', 'debutant', 4, 'Un genou et une main sur le banc, tire l''haltère vers la hanche en gardant le dos plat.'),
('Tirage horizontal à la poulie', 'dos', 'debutant', 5, 'Assis, dos droit, tire la poignée vers le ventre en rapprochant les omoplates.'),
('Pull-over à la poulie', 'dos', 'intermediaire', 6, 'Bras tendus, ramène la barre de la hauteur des yeux jusqu''aux cuisses en contractant les dorsaux.'),
-- Trapèzes
('Shrugs à la barre', 'trapezes', 'debutant', 1, 'Bras tendus, hausse les épaules vers les oreilles, marque une pause, redescends lentement.'),
('Shrugs haltères', 'trapezes', 'debutant', 2, 'Haltères le long du corps, monte les épaules droit vers le haut sans rouler.'),
('Face pull', 'trapezes', 'debutant', 3, 'Corde à hauteur du visage, tire vers le front en écartant les mains, coudes hauts.'),
('Rowing menton', 'trapezes', 'intermediaire', 4, 'Prise moyenne, monte la barre le long du corps jusqu''au bas de la poitrine, coudes au-dessus des mains.'),
('Farmer walk', 'trapezes', 'debutant', 5, 'Marche avec une charge lourde dans chaque main, épaules basses, buste droit.'),
-- Lombaires
('Soulevé de terre', 'lombaires', 'confirme', 1, 'Barre contre les tibias, dos plat, pousse dans le sol pour te redresser en gardant la barre près du corps.'),
('Extensions lombaires au banc', 'lombaires', 'debutant', 2, 'Hanches calées, descends le buste puis remonte jusqu''à l''alignement, sans cambrer.'),
('Good morning', 'lombaires', 'intermediaire', 3, 'Barre sur les trapèzes, genoux légèrement fléchis, penche le buste en poussant les hanches en arrière.'),
('Superman', 'lombaires', 'debutant', 4, 'Allongé sur le ventre, décolle bras et jambes du sol et tiens deux secondes.'),
-- Épaules
('Développé militaire', 'epaules', 'intermediaire', 1, 'Debout, gainé, pousse la barre au-dessus de la tête depuis le haut de la poitrine.'),
('Élévations latérales', 'epaules', 'debutant', 2, 'Bras légèrement fléchis, monte les haltères sur les côtés jusqu''à hauteur d''épaules.'),
('Développé haltères assis', 'epaules', 'debutant', 3, 'Dos calé contre le dossier, pousse les haltères au-dessus de la tête sans les cogner.'),
('Oiseau', 'epaules', 'debutant', 4, 'Buste penché, écarte les haltères sur les côtés pour cibler l''arrière de l''épaule.'),
('Arnold press', 'epaules', 'intermediaire', 5, 'Pars paumes vers toi, pivote les poignets en poussant pour finir paumes vers l''avant.'),
-- Biceps
('Curl barre', 'biceps', 'debutant', 1, 'Coudes fixes le long du corps, monte la barre sans balancer le buste.'),
('Curl haltères alterné', 'biceps', 'debutant', 2, 'Un bras après l''autre, tourne la paume vers le haut en montant.'),
('Curl marteau', 'biceps', 'debutant', 3, 'Prise neutre, pouces vers le haut, monte les haltères sans bouger les coudes.'),
('Curl incliné', 'biceps', 'intermediaire', 4, 'Assis sur un banc incliné, bras pendants, fléchis en gardant les coudes en arrière.'),
('Curl pupitre', 'biceps', 'intermediaire', 5, 'Bras posés sur le pupitre, descends jusqu''à presque tendre les bras, remonte sans décoller.'),
-- Triceps
('Barre au front', 'triceps', 'intermediaire', 1, 'Allongé, descends la barre vers le front en gardant les coudes fixes, puis tends les bras.'),
('Extension à la poulie haute', 'triceps', 'debutant', 2, 'Coudes collés au corps, pousse la corde vers le bas en écartant les mains en fin de mouvement.'),
('Dips buste droit', 'triceps', 'intermediaire', 3, 'Buste vertical, descends jusqu''à 90° aux coudes puis pousse jusqu''à tendre les bras.'),
('Développé couché prise serrée', 'triceps', 'intermediaire', 4, 'Mains largeur d''épaules, coudes près du corps, descends la barre bas sur la poitrine.'),
('Extension nuque haltère', 'triceps', 'debutant', 5, 'Haltère tenu à deux mains derrière la tête, tends les bras vers le plafond.'),
-- Avant-bras
('Curl inversé', 'avant_bras', 'debutant', 1, 'Prise pronation, monte la barre en gardant les poignets alignés avec les avant-bras.'),
('Curl poignets', 'avant_bras', 'debutant', 2, 'Avant-bras posés sur le banc, paumes vers le haut, fléchis uniquement les poignets.'),
('Suspension à la barre', 'avant_bras', 'debutant', 3, 'Suspends-toi à la barre, bras tendus, le plus longtemps possible.'),
('Enrouleur de poignet', 'avant_bras', 'intermediaire', 4, 'Bras tendus devant toi, enroule la corde et son poids en tournant les poignets, puis déroule lentement.'),
-- Abdominaux
('Gainage planche', 'abdominaux', 'debutant', 1, 'Sur les avant-bras, corps aligné des épaules aux talons, sans laisser tomber le bassin.'),
('Relevé de jambes suspendu', 'abdominaux', 'intermediaire', 2, 'Suspendu à la barre, monte les jambes sans balancer, en enroulant le bassin.'),
('Crunch', 'abdominaux', 'debutant', 3, 'Allongé, genoux fléchis, enroule le haut du dos en rapprochant les côtes du bassin.'),
('Crunch à la poulie', 'abdominaux', 'intermediaire', 4, 'À genoux face à la poulie, enroule le buste vers le sol en contractant les abdos.'),
('Roue abdominale', 'abdominaux', 'confirme', 5, 'À genoux, roule vers l''avant en gardant le dos neutre, puis reviens en contractant les abdos.'),
-- Obliques
('Gainage latéral', 'obliques', 'debutant', 1, 'Sur un avant-bras, corps aligné, hanches hautes.'),
('Woodchopper à la poulie', 'obliques', 'intermediaire', 2, 'Tire la poignée en diagonale en pivotant le buste, bras tendus.'),
('Russian twist', 'obliques', 'debutant', 3, 'Assis, buste incliné, pieds décollés, tourne le buste d''un côté à l''autre.'),
('Flexion latérale haltère', 'obliques', 'debutant', 4, 'Haltère dans une main, incline le buste sur le côté puis remonte en contractant l''oblique opposé.'),
('Relevé de genoux obliques suspendu', 'obliques', 'confirme', 5, 'Suspendu, monte les genoux en diagonale vers une épaule, puis l''autre.'),
-- Fessiers
('Hip thrust', 'fessiers', 'debutant', 1, 'Haut du dos sur le banc, barre sur les hanches, pousse le bassin vers le haut et serre les fessiers.'),
('Squat bulgare', 'fessiers', 'intermediaire', 2, 'Pied arrière sur un banc, descends sur la jambe avant en gardant le buste droit.'),
('Fentes marchées', 'fessiers', 'debutant', 3, 'Grand pas en avant, genou arrière près du sol, enchaîne avec l''autre jambe.'),
('Pont fessier', 'fessiers', 'debutant', 4, 'Allongé, pieds au sol, monte le bassin en serrant les fessiers, sans cambrer.'),
('Kickback à la poulie', 'fessiers', 'debutant', 5, 'Sangle à la cheville, pousse la jambe vers l''arrière sans bouger le bassin.'),
-- Quadriceps
('Squat', 'quadriceps', 'intermediaire', 1, 'Barre sur les trapèzes, descends hanches en arrière jusqu''à passer la parallèle, dos plat.'),
('Presse à cuisses', 'quadriceps', 'debutant', 2, 'Pieds largeur d''épaules, descends jusqu''à 90° aux genoux sans décoller le bas du dos.'),
('Hack squat', 'quadriceps', 'intermediaire', 3, 'Dos calé contre le dossier, descends profondément en gardant les talons au sol.'),
('Leg extension', 'quadriceps', 'debutant', 4, 'Tends les jambes jusqu''en haut, marque une pause, redescends lentement.'),
('Front squat', 'quadriceps', 'confirme', 5, 'Barre sur l''avant des épaules, coudes hauts, descends en gardant le buste vertical.'),
-- Ischio-jambiers
('Soulevé de terre roumain', 'ischio_jambiers', 'intermediaire', 1, 'Jambes presque tendues, descends la barre le long des cuisses en poussant les hanches en arrière, dos plat.'),
('Leg curl allongé', 'ischio_jambiers', 'debutant', 2, 'Ramène les talons vers les fessiers sans décoller les hanches du banc.'),
('Leg curl assis', 'ischio_jambiers', 'debutant', 3, 'Cuisses bloquées, fléchis les genoux au maximum puis remonte lentement.'),
('Nordic curl', 'ischio_jambiers', 'confirme', 4, 'À genoux, chevilles bloquées, descends le buste vers l''avant le plus lentement possible.'),
-- Mollets
('Mollets debout', 'mollets', 'debutant', 1, 'Monte sur la pointe des pieds le plus haut possible, pause, redescends en étirement complet.'),
('Mollets assis', 'mollets', 'debutant', 2, 'Genoux à 90°, monte les talons en contractant, redescends lentement.'),
('Mollets à la presse', 'mollets', 'debutant', 3, 'Pointes de pieds en bas de la plateforme, pousse avec les chevilles, jambes presque tendues.'),
('Mollets unilatéral', 'mollets', 'intermediaire', 4, 'Sur une marche, une jambe à la fois, amplitude complète, haltère dans la main du même côté.')
AS nouveau
ON DUPLICATE KEY UPDATE
  groupe_musculaire = nouveau.groupe_musculaire,
  niveau_difficulte = nouveau.niveau_difficulte,
  priorite = nouveau.priorite,
  description = nouveau.description;
