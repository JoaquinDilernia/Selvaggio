import crypto from 'crypto';
import axios from 'axios';
import admin from 'firebase-admin';
import { PREFIJO } from './storage.service.js';

// Copia propia de los archivos de Instagram. WhatsApp guarda el media en Meta
// y lo pedimos por mediaId cuando hace falta; Instagram solo manda una URL de
// CDN que vence a los pocos días, así que sin copia el panel deja de mostrar
// la foto/audio. Los envíos del panel a IG también pasan por acá: la API de IG
// solo acepta adjuntos por URL pública, y le damos una firmada.
export const MEDIA_PREFIX = `${PREFIJO}/ig-media/`;

function bucket() {
  const name = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
  return admin.storage().bucket(name);
}

const EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/webm': 'webm',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'application/pdf': 'pdf',
};

// Solo rutas nuestras: el proxy del panel no puede servir otra cosa del bucket.
export function isOwnMediaPath(path) {
  return typeof path === 'string' && path.startsWith(MEDIA_PREFIX) && !path.includes('..');
}

export async function saveMedia(buffer, mimeType = 'application/octet-stream', fileName = null) {
  const type = String(mimeType).split(';')[0].trim() || 'application/octet-stream';
  const ext = EXT[type] ?? (/\.([a-z0-9]{1,5})$/i.exec(fileName ?? '')?.[1]?.toLowerCase() || 'bin');
  const path = `${MEDIA_PREFIX}${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  await bucket().file(path).save(buffer, { contentType: type, resumable: false });
  return path;
}

// Baja la URL de CDN de Instagram y la guarda. Devuelve { path, buffer,
// mimeType } (el buffer se reutiliza para mandarle la imagen a Claude o
// transcribir el audio) o null si no se pudo.
export async function persistRemoteMedia(url) {
  if (!url) return null;
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000, maxContentLength: 50 * 1024 * 1024 });
    const buffer = Buffer.from(res.data);
    const mimeType = String(res.headers['content-type'] ?? 'application/octet-stream').split(';')[0].trim();
    const path = await saveMedia(buffer, mimeType);
    return { path, buffer, mimeType };
  } catch (err) {
    console.error('[media] No se pudo guardar el adjunto de Instagram:', err.message);
    return null;
  }
}

export async function streamStoredMedia(path, res) {
  const file = bucket().file(path);
  const [meta] = await file.getMetadata();
  res.setHeader('Content-Type', meta.contentType ?? 'application/octet-stream');
  if (meta.size) res.setHeader('Content-Length', meta.size);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  await new Promise((resolve, reject) => {
    file.createReadStream().on('error', reject).on('end', resolve).pipe(res);
  });
}

// URL temporal para que Meta descargue el adjunto al enviarlo.
export async function signedMediaUrl(path, ttlMs = 24 * 60 * 60 * 1000) {
  const [url] = await bucket().file(path).getSignedUrl({ action: 'read', expires: Date.now() + ttlMs });
  return url;
}
