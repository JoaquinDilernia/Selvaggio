import { getDb } from './firebase.service.js';
import { ahoraAR, COL } from './reservas.service.js';
import { planHistorial, resumenAnteriores } from './eventosHistorial.js';

// Copia propia de los eventos (ver eventosHistorial.js). Cada hora copia la
// agenda; una vez por día además repasa las reservas viejas "Evento: X".
const HISTORIAL = 'bot-selvaggio_eventos_historial';
const EVENTOS = 'selvaggio_eventos';
const DIAS_RESERVAS = 400;
const INTERVALO_MS = 60 * 60 * 1000;
const CADA_RESERVAS_MS = 24 * 60 * 60 * 1000;
const CACHE_MS = 10 * 60 * 1000;

let ultimaPasadaReservas = 0;
let cache = null; // { at, docs }

function sumarDias(fecha, n) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function sincronizarHistorial({ conReservas = false, now = new Date() } = {}) {
  const db = getDb();
  const hoy = ahoraAR(now).fecha;
  const [ev, hist, res] = await Promise.all([
    db.collection(EVENTOS).get(),
    db.collection(HISTORIAL).get(),
    conReservas
      ? db.collection(COL.mesas).where('fecha', '>=', sumarDias(hoy, -DIAS_RESERVAS)).where('fecha', '<', hoy).get()
      : null,
  ]);
  const { upserts, borrar } = planHistorial({
    eventos: ev.docs.map(d => ({ id: d.id, ...d.data() })),
    existentes: hist.docs.map(d => ({ id: d.id, ...d.data() })),
    reservas: res ? res.docs.map(d => d.data()) : null,
    hoy,
  });
  const ahora = new Date().toISOString();
  const ops = [
    ...upserts.map(u => b => b.set(db.collection(HISTORIAL).doc(u.id), { ...u.data, actualizadoEn: ahora }, { merge: true })),
    ...borrar.map(id => b => b.delete(db.collection(HISTORIAL).doc(id))),
  ];
  for (let i = 0; i < ops.length; i += 400) {
    const batch = db.batch();
    ops.slice(i, i + 400).forEach(op => op(batch));
    await batch.commit();
  }
  cache = null;
  const nuevos = upserts.filter(u => u.data.fuente === 'reservas').length;
  if (borrar.length || nuevos) console.log(`[eventos-historial] ${upserts.length} copiado(s), ${nuevos} desde reservas, ${borrar.length} cancelado(s)`);
  return { upserts: upserts.length, borrados: borrar.length };
}

/** Para consultar_agenda: eventos que hicimos y hoy no tienen fecha. */
export async function eventosAnteriores({ excluirTitulos = [], now = new Date() } = {}) {
  const hoy = ahoraAR(now).fecha;
  if (!cache || Date.now() - cache.at > CACHE_MS) {
    const snap = await getDb().collection(HISTORIAL).where('fecha', '>=', sumarDias(hoy, -DIAS_RESERVAS)).get();
    cache = { at: Date.now(), docs: snap.docs.map(d => d.data()) };
  }
  return resumenAnteriores(cache.docs, { hoy, excluirTitulos });
}

export function iniciarHistorialEventos() {
  if (process.env.SELVAGGIO_TEST_WRITES === '1') return;
  const correr = () => {
    const conReservas = Date.now() - ultimaPasadaReservas > CADA_RESERVAS_MS;
    return sincronizarHistorial({ conReservas })
      .then(() => { if (conReservas) ultimaPasadaReservas = Date.now(); })
      .catch(e => console.error('[eventos-historial]', e.message));
  };
  setTimeout(correr, 25_000);
  setInterval(correr, INTERVALO_MS).unref();
}
