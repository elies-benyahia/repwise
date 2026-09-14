import { config } from '../src/config.js';
import { initialiserBase } from '../src/db/initialiser.js';

// --reinitialiser supprime la base et toutes ses données avant de la recréer.
const reinitialiser = process.argv.includes('--reinitialiser');
await initialiserBase({ reinitialiser });
console.log(`Base "${config.db.database}" ${reinitialiser ? 'recréée à vide' : 'prête'}.`);
