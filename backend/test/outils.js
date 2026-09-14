// node --test lance chaque fichier dans son propre processus, en parallèle :
// chaque fichier utilise donc sa propre base, recréée à vide.
export async function demarrerServeurDeTest(nomBase) {
  process.env.DB_NAME = nomBase;
  const { initialiserBase } = await import('../src/db/initialiser.js');
  const { creerApp } = await import('../src/app.js');
  const { pool } = await import('../src/db/pool.js');

  await initialiserBase({ reinitialiser: true });
  const serveur = creerApp().listen(0);
  await new Promise((r) => serveur.once('listening', r));
  const urlBase = `http://127.0.0.1:${serveur.address().port}/api`;

  async function appeler(chemin, { methode = 'GET', corps, cookie } = {}) {
    const reponse = await fetch(urlBase + chemin, {
      method: methode,
      headers: {
        ...(corps && { 'Content-Type': 'application/json' }),
        ...(cookie && { Cookie: cookie }),
      },
      body: corps && JSON.stringify(corps),
    });
    const setCookie = reponse.headers.getSetCookie().at(-1);
    return {
      statut: reponse.status,
      corps: reponse.status === 204 ? null : await reponse.json(),
      setCookie,
      cookie: setCookie?.split(';')[0],
    };
  }

  async function arreter() {
    serveur.close();
    await pool.end();
  }

  return { appeler, pool, urlBase, arreter };
}
