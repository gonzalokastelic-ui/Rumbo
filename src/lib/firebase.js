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

// App Check (opcional): con una clave de reCAPTCHA v3, Firebase solo acepta pedidos
// que vienen de esta app publicada. Los scripts de afuera quedan rechazados.
const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

let cached = null;

export async function initFirebase() {
  if (cached) return cached;
  const [{ initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
  const app = initializeApp(config);
  if (recaptchaKey) {
    const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
    // En desarrollo local Firebase entrega un token de depuracion que se registra en la consola
    if (import.meta.env.DEV) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(recaptchaKey), isTokenAutoRefreshEnabled: true });
  }
  cached = { app, auth: getAuth(app), db: getFirestore(app) };
  return cached;
}
