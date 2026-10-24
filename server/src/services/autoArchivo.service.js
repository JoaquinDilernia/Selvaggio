// Archiva solas las charlas que atendió el bot y quedaron quietas: en un
// restó la charla típica termina con la reserva confirmada y el cliente no
// vuelve a escribir, así que el [CERRAR] casi nunca llega. Sin esto quedaban
// abiertas para siempre y no contaban como "resolvió el bot".
// Si el cliente vuelve a escribir, bot.service la reabre como siempre.
import { getDb } from './firebase.service.js';

const COLLECTION = 'bot-selvaggio_conversations';
export const INACTIVIDAD_MS = 12 * 60 * 60 * 1000;
const CADA_MS = 30 * 60 * 1000;

const toMs = (v) => (v?.toMillis ? v.toMillis() : v ? new Date(v).getTime() : null);

/** true si la charla está en manos del bot, quieta y con el bot como último en hablar. */
export function debeArchivarse(conv, now = Date.now()) {
  if ((conv.status ?? 'bot') !== 'bot' || conv.humanMode) return false;
  const last = toMs(conv.updatedAt);
  if (!last || now - last < INACTIVIDAD_MS) return false;
  const msgs = conv.messages ?? [];
  if (!msgs.length) return false;
  // Si lo último es del cliente, el bot no contestó (falló algo): que la vea alguien.
  return msgs[msgs.length - 1].role !== 'user';
}

export async function archivarInactivas(now = Date.now()) {
  const db = getDb();
  const snap = await db.collection(COLLECTION).where('status', '==', 'bot').get();
  const docs = snap.docs.filter(d => debeArchivarse(d.data(), now));
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    for (const d of docs.slice(i, i + 400)) {
      // resolvedAt = última actividad (no "ahora"): así las estadísticas la
      // cuentan el día que terminó la charla.
      const last = new Date(toMs(d.data().updatedAt));
      batch.update(d.ref, { status: 'bot_archived', resolvedAt: last, resolvedBy: null, waitingSince: null, archivadaAuto: true });
    }
    await batch.commit();
  }
  if (docs.length) console.log(`[conversaciones] ${docs.length} charla(s) del bot archivadas por inactividad`);
  return docs.length;
}

export function iniciarAutoArchivo() {
  // Con SELVAGGIO_TEST_WRITES (pruebas locales) no se toca la base real.
  if (process.env.SELVAGGIO_TEST_WRITES === '1') return;
  const correr = () => archivarInactivas().catch(e => console.error('[conversaciones] archivo automático:', e.message));
  setTimeout(correr, 2 * 60 * 1000);
  setInterval(correr, CADA_MS);
}
