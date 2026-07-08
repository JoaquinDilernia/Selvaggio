import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const SESSION_KEY = 'selvaggio_session_id';

const generarUUID = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// UUID anónimo por navegador — no contiene datos personales
export const getSessionId = () => {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generarUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

// Escritura "fire and forget": nunca interrumpe la UX si falla
export const trackEvento = (tipo, categoria, valor = null) => {
  addDoc(collection(db, 'selvaggio_analytics_eventos'), {
    tipo,
    categoria,
    sessionId: getSessionId(),
    pagina: window.location.pathname,
    valor,
    timestamp: serverTimestamp(),
  }).catch(() => {});
};
