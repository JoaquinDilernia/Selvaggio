// Login del staff (admin / caja / cocina) para las pantallas internas de la
// landing. Los usuarios son los mismos del panel (panel.selvaggio.com.ar) y
// viven en el backend: acá se valida email+contraseña contra el backend, que
// devuelve un custom token de Firebase con el claim `selvaggioRole`, y con eso
// se abre la sesión de Firebase Auth (la misma que usa Firestore para las
// reglas). Antes esto era una contraseña única embebida en el bundle.
//
// Este módulo se importa de forma dinámica desde ProtectedRoute para que
// firebase/auth no se descargue en las páginas públicas.
import { getAuth, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { app } from './config';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const auth = getAuth(app);

async function post(path, body, token) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo conectar con el servidor');
  return data;
}

export async function loginStaff(email, password) {
  const { token } = await post('/api/auth/login', { email: email.trim(), password });
  const { firebaseToken } = await post('/api/auth/firebase-token', {}, token);
  await signInWithCustomToken(auth, firebaseToken);
}

export function logoutStaff() {
  return signOut(auth);
}

/** Llama a `cb({ email, role })` con la sesión actual, o `cb(null)`. */
export function onStaffChange(cb) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return cb(null);
    const { claims } = await user.getIdTokenResult();
    cb({ email: user.uid.replace(/^selvaggio:/, ''), role: claims.selvaggioRole ?? null });
  });
}
