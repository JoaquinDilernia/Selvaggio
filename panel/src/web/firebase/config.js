// Firebase del panel para las pantallas que vinieron del admin de la landing
// (reservas, take away, cupones, contenido, caja, cocina…): hablan directo con
// Firestore/Storage. La sesión de Firebase Auth se abre con el mismo usuario
// del panel: el backend devuelve un custom token con el claim `selvaggioRole`
// (lo que miran las reglas) y con eso se hace signInWithCustomToken.
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { authFetch, BASE_URL } from '../../lib/api';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

let pendiente = null;

/** Abre (o reutiliza) la sesión de Firebase del usuario logueado en el panel. */
export function ensureFirebaseSession(agent) {
  if (!agent) return Promise.reject(new Error('Sin sesión'));
  const uid = `selvaggio:${agent.id}`;
  if (pendiente) return pendiente;
  pendiente = (async () => {
    await auth.authStateReady();
    const user = auth.currentUser;
    if (user?.uid === uid) {
      const { claims } = await user.getIdTokenResult();
      if (claims.selvaggioRole === agent.role) return;
    }
    const r = await authFetch(`${BASE_URL}/api/auth/firebase-token`, { method: 'POST' });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'No se pudo iniciar sesión en Firebase');
    await signInWithCustomToken(auth, data.firebaseToken);
  })().finally(() => { pendiente = null; });
  return pendiente;
}

export function cerrarFirebase() {
  return signOut(auth).catch(() => {});
}
