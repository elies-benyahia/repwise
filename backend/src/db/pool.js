import mysql from 'mysql2/promise';
import { config } from '../config.js';

export const pool = mysql.createPool({
  ...config.db,
  connectionLimit: 10,
  // Les colonnes DATE (jour de séance, jour du journal) restent des chaînes "AAAA-MM-JJ" :
  // les convertir en Date JS les décalerait selon le fuseau du serveur.
  dateStrings: ['DATE'],
});
