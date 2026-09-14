import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { config } from '../config.js';

// Exécutés dans cet ordre ; chacun est rejouable sans risque :
// schéma (CREATE TABLE IF NOT EXISTS), bibliothèque (ON DUPLICATE KEY UPDATE),
// repères de force du rang (UPDATE), images de démonstration (UPDATE), aliments courants
// (ON DUPLICATE KEY UPDATE).
const FICHIERS = [
  'schema.sql', 'bibliotheque.sql', 'bibliotheque-rang.sql', 'bibliotheque-images.sql', 'aliments.sql',
].map((nom) => new URL(`../../../database/${nom}`, import.meta.url));

export async function initialiserBase({ reinitialiser = false } = {}) {
  const { database, ...connexion } = config.db;
  if (!/^\w+$/.test(database)) {
    throw new Error(`Nom de base invalide : ${database}`);
  }

  const scripts = await Promise.all(FICHIERS.map((fichier) => readFile(fichier, 'utf8')));
  const db = await mysql.createConnection({ ...connexion, multipleStatements: true });
  try {
    if (reinitialiser) await db.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await db.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await db.query(`USE \`${database}\``);
    for (const script of scripts) await db.query(script);
  } finally {
    await db.end();
  }
}
