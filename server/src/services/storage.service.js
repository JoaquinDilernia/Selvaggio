import admin from 'firebase-admin';
import { randomUUID } from 'crypto';

// Subidas a Firebase Storage desde el backend. El bucket es el compartido de
// pedidos-lett-2, así que todo lo de Selvaggio va bajo `selvaggio/` (las
// carpetas viejas en la raíz — comprobantes/, galeria/… — no se pueden cerrar
// por nombre sin riesgo de pisar otros proyectos).

export const PREFIJO = 'selvaggio';

function bucket() {
  const name = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
  return admin.storage().bucket(name);
}

const seguro = (s) => String(s || 'archivo').normalize('NFD').replace(/[^\w.-]+/g, '_').slice(-80);

/**
 * Sube un archivo y devuelve una URL de descarga con token (el mismo formato
 * que `getDownloadURL` del SDK web), que es lo que guarda y abre el admin.
 * @param {Buffer} buffer
 * @param {string} carpeta  p.ej. 'comprobantes' → selvaggio/comprobantes/<ts>_<nombre>
 */
export async function subirArchivo(buffer, { carpeta, nombre, contentType, cacheControl = 'private, max-age=0' }) {
  const path = `${PREFIJO}/${carpeta}/${Date.now()}_${seguro(nombre)}`;
  const token = randomUUID();
  const b = bucket();
  await b.file(path).save(buffer, {
    resumable: false,
    metadata: { contentType, cacheControl, metadata: { firebaseStorageDownloadTokens: token } },
  });
  const url = `https://firebasestorage.googleapis.com/v0/b/${b.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  return { path, url };
}

/** Borra un archivo subido con subirArchivo. Solo dentro de selvaggio/: nunca toca otros proyectos del bucket. */
export async function borrarArchivo(path) {
  if (!path || !path.startsWith(`${PREFIJO}/`)) return;
  await bucket().file(path).delete({ ignoreNotFound: true });
}
