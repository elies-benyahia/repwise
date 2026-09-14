import { creerApp } from './app.js';
import { config } from './config.js';
import { recalculerTousLesRangs } from './rang/depot.js';
import { supprimerInvitesAbandonnes } from './utilisateurs/modele.js';

creerApp().listen(config.port, () => {
  console.log(`API démarrée sur http://localhost:${config.port}`);
});

// Maintenance quotidienne : invités abandonnés, et rangs recalculés pour que les performances
// sorties de la fenêtre de 6 semaines ne comptent plus (y compris dans le classement).
async function maintenance() {
  try {
    const supprimes = await supprimerInvitesAbandonnes();
    if (supprimes > 0) console.log(`${supprimes} compte(s) invité abandonné(s) supprimé(s)`);
    await recalculerTousLesRangs();
  } catch (err) {
    console.error('Maintenance impossible :', err.message);
  }
}

maintenance();
setInterval(maintenance, 24 * 60 * 60 * 1000).unref();
