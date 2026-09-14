// Accepte la virgule décimale ("72,5"), courante sur les claviers français.
export const versNombre = (valeur) => (valeur.trim() === '' ? NaN : Number(valeur.replace(',', '.')));

export const formaterNombre = (n) => n.toLocaleString('fr-FR');
