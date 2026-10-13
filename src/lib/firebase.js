// Configuracion de Firebase. Los valores vienen de las variables de entorno
// VITE_* (ver .env.example). Se importa de forma diferida: la landing publica
// no descarga el SDK hasta que hace falta.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const hasFirebase = Boolean(config.apiKey && config.projectId && config.appId);

let cached = null;

export async function initFirebase() {
  if (cached) return cached;
  const [{ initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
  const app = initializeApp(config);
  cached = { app, auth: getAuth(app), db: getFirestore(app) };
  return cached;
}
