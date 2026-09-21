// Calculateur de plaques (retour du 21/09) : jeu de plaques olympiques courant en salle
// (25/20/15/10/5/2.5/1.25 kg), barre à 20 kg par défaut. Glouton du plus lourd au plus léger,
// en quantité illimitée par plaque (on suppose la salle bien fournie plutôt que de demander
// l'inventaire exact de chacun).
export const PLAQUES_DISPONIBLES = [25, 20, 15, 10, 5, 2.5, 1.25];
export const POIDS_BARRE_DEFAUT = 20;

const arrondi2 = (n) => Math.round(n * 100) / 100;

// null si le poids demandé est trop léger pour être chargé (poids <= poids de la barre).
// resteNonChargeable > 0 si les plaques disponibles ne tombent pas juste (ex. 0.5 kg restant
// avec un jeu qui commence à 1.25) — rare avec ce jeu de plaques, mais honnête si ça arrive.
export function calculerPlaques(poidsTotal, poidsBarre = POIDS_BARRE_DEFAUT) {
  const parCote = arrondi2((poidsTotal - poidsBarre) / 2);
  if (parCote <= 0) return null;

  let reste = parCote;
  const plaques = [];
  for (const plaque of PLAQUES_DISPONIBLES) {
    let quantite = 0;
    while (reste >= plaque - 1e-9) {
      reste = arrondi2(reste - plaque);
      quantite += 1;
    }
    if (quantite > 0) plaques.push({ poids: plaque, quantite });
  }
  return { parCote, plaques, resteNonChargeable: reste > 0 ? reste : 0 };
}
