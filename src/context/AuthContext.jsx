import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { hasFirebase, initFirebase } from '../lib/firebase.js';
import { createMemoryStore } from '../lib/store.memory.js';

const AuthContext = createContext(null);

const normalizar = (u) => ({
  uid: u.uid,
  displayName: u.displayName || (u.email ? u.email.split('@')[0] : 'Viajero'),
  email: u.email || null,
  photoURL: u.photoURL || null,
});

const ERRORES = {
  'auth/invalid-credential': 'El email o la contraseña no coinciden.',
  'auth/wrong-password': 'El email o la contraseña no coinciden.',
  'auth/user-not-found': 'No encontramos una cuenta con ese email.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email. Probá iniciar sesión.',
  'auth/weak-password': 'La contraseña tiene que tener al menos 6 caracteres.',
  'auth/invalid-email': 'El email no es válido.',
  'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar.',
  'auth/cancelled-popup-request': 'Se canceló el inicio de sesión.',
  'auth/network-request-failed': 'No hay conexión. Revisá tu internet e intentá de nuevo.',
  'auth/too-many-requests': 'Demasiados intentos. Esperá un momento y probá de nuevo.',
  'auth/operation-not-allowed': 'Este método de acceso no está habilitado en Firebase.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permití las ventanas emergentes para este sitio.',
};

export const mensajeAuth = (e) => {
  if (e?.code === 'auth/unauthorized-domain') {
    return `Este dominio (${window.location.hostname}) no está autorizado en Firebase. Agregalo en Authentication, Configuración, Dominios autorizados.`;
  }
  if (e?.code && !ERRORES[e.code]) console.error('Error de acceso', e.code, e);
  return ERRORES[e?.code] || `No pudimos completar el acceso (${e?.code || 'error desconocido'}). Intentá de nuevo.`;
};

export function AuthProvider({ children }) {
  const [estado, setEstado] = useState({ listo: false, user: null, store: null });
  const demoStore = useRef(null);
  const fb = useRef(null);

  useEffect(() => {
    if (!hasFirebase) {
      setEstado({ listo: true, user: null, store: null });
      return undefined;
    }
    let cancelado = false;
    let desuscribir = () => {};
    (async () => {
      try {
        const [{ auth, db }, { onAuthStateChanged }, { createFirebaseStore }] = await Promise.all([
          initFirebase(),
          import('firebase/auth'),
          import('../lib/store.firebase.js'),
        ]);
        if (cancelado) return;
        fb.current = { auth };
        const store = createFirebaseStore(db);
        desuscribir = onAuthStateChanged(auth, (u) => {
          setEstado({ listo: true, user: u ? normalizar(u) : null, store });
        });
      } catch (e) {
        console.error('No se pudo iniciar Firebase', e);
        if (!cancelado) setEstado({ listo: true, user: null, store: null, error: true });
      }
    })();
    return () => {
      cancelado = true;
      desuscribir();
    };
  }, []);

  const entrarConGoogle = useCallback(async () => {
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    await signInWithPopup(fb.current.auth, new GoogleAuthProvider());
  }, []);

  const entrarConEmail = useCallback(async (email, password) => {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(fb.current.auth, email, password);
  }, []);

  const crearCuenta = useCallback(async (nombre, email, password) => {
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    const cred = await createUserWithEmailAndPassword(fb.current.auth, email, password);
    if (nombre) await updateProfile(cred.user, { displayName: nombre });
    // onAuthStateChanged ya corrio antes de updateProfile: refrescamos el nombre
    setEstado((s) => ({ ...s, user: normalizar({ ...cred.user, displayName: nombre || cred.user.displayName }) }));
  }, []);

  const entrarDemo = useCallback(() => {
    if (!demoStore.current) demoStore.current = createMemoryStore();
    setEstado({
      listo: true,
      user: { uid: 'demo-user', displayName: 'Viajera demo', email: null, photoURL: null },
      store: demoStore.current,
      demo: true,
    });
  }, []);

  const salir = useCallback(async () => {
    if (!hasFirebase || estado.demo) {
      setEstado({ listo: true, user: null, store: null });
      return;
    }
    const { signOut } = await import('firebase/auth');
    await signOut(fb.current.auth);
  }, [estado.demo]);

  const valor = useMemo(
    () => ({
      ...estado,
      hasFirebase,
      entrarConGoogle,
      entrarConEmail,
      crearCuenta,
      entrarDemo,
      salir,
    }),
    [estado, entrarConGoogle, entrarConEmail, crearCuenta, entrarDemo, salir],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
