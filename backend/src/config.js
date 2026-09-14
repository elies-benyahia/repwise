const env = process.env;

// Nombre de proxys de confiance devant l'API (Vercel, Railway…) pour lire la vraie IP
// du client dans X-Forwarded-For. 0 en local.
const trustProxy = Number(env.TRUST_PROXY ?? 0);

export const config = {
  port: Number(env.PORT ?? 3000),
  production: env.NODE_ENV === 'production',
  trustProxy,
  db: {
    host: env.DB_HOST ?? '127.0.0.1',
    port: Number(env.DB_PORT ?? 3306),
    user: env.DB_USER ?? 'root',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME ?? 'repwise',
  },
};
