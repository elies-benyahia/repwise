const env = process.env;

// Nombre de proxys de confiance devant l'API (Vercel, Railway…) pour lire la vraie IP
// du client dans X-Forwarded-For. 0 en local.
const trustProxy = Number(env.TRUST_PROXY ?? 0);

export const config = {
  port: Number(env.PORT ?? 3000),
  production: env.NODE_ENV === 'production',
  trustProxy,
  // Sert à construire le lien dans l'email de réinitialisation de mot de passe (auth/routes.js) :
  // le backend ne connaît pas son propre nom de domaine public, ni celui du frontend qui l'appelle.
  urlFrontend: env.URL_FRONTEND ?? 'http://localhost:5173',
  db: {
    host: env.DB_HOST ?? '127.0.0.1',
    port: Number(env.DB_PORT ?? 3306),
    user: env.DB_USER ?? 'root',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME ?? 'repwise',
  },
};
