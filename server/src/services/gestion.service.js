import { getDb } from './firebase.service.js';
import { ahoraAR } from './reservas.service.js';

// Vistas de SOLO LECTURA sobre los datos que hoy carga la landing (reservas,
// take away, comandas, clientes, mensajes, eventos, cupones, invitaciones,
// reseñas) para mostrarlos dentro del panel. No escribe nada.

const toPlain = (v) => {
  if (v?.toDate) return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(toPlain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toPlain(x)]));
  return v;
};
const docs = (snap) => snap.docs.map(d => ({ id: d.id, ...toPlain(d.data()) }));

function sumarDias(fecha, n) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Cache corto: el panel pide estas listas al navegar entre pestañas.
const cache = new Map();
async function cacheado(key, ms, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ms) return hit.value;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

// ── Reservas ─────────────────────────────────────────────────────────────

export async function reservas({ desde, hasta } = {}) {
  const hoy = ahoraAR().fecha;
  desde = /^\d{4}-\d{2}-\d{2}$/.test(desde || '') ? desde : hoy;
  hasta = /^\d{4}-\d{2}-\d{2}$/.test(hasta || '') ? hasta : sumarDias(desde, 30);
  const db = getDb();
  const [mesas, cava] = await Promise.all([
    db.collection('selvaggio_reservas_mesas').where('fecha', '>=', desde).where('fecha', '<=', hasta).get(),
    db.collection('selvaggio_reservas_cava').where('fecha', '>=', desde).where('fecha', '<=', hasta).get(),
  ]);
  const orden = (a, b) => `${a.fecha} ${a.horario || ''}`.localeCompare(`${b.fecha} ${b.horario || ''}`);
  return {
    desde, hasta,
    mesas: docs(mesas).filter(r => !r.archivada).sort(orden),
    cava: docs(cava).sort(orden),
  };
}

// ── Take away y comandas ─────────────────────────────────────────────────

export async function pedidosTakeaway({ limit = 150 } = {}) {
  const snap = await getDb().collection('selvaggio_takeaway_pedidos').orderBy('createdAt', 'desc').limit(limit).get();
  return { pedidos: docs(snap) };
}

export async function comandas({ limit = 150 } = {}) {
  const snap = await getDb().collection('selvaggio_pedidos').orderBy('pedido_creado', 'desc').limit(limit).get();
  return { comandas: docs(snap) };
}

// ── Mensajes, eventos, cupones, invitaciones, reseñas ────────────────────

export async function mensajes() {
  const db = getDb();
  const [contacto, postulaciones] = await Promise.all([
    db.collection('selvaggio_contacto').orderBy('fecha', 'desc').limit(150).get(),
    db.collection('selvaggio_postulaciones').orderBy('fecha', 'desc').limit(150).get(),
  ]);
  return { contacto: docs(contacto), postulaciones: docs(postulaciones) };
}

export async function coleccion(nombre) {
  const COLS = {
    eventos: ['selvaggio_eventos', (a, b) => (b.fecha || '').localeCompare(a.fecha || '')],
    cupones: ['selvaggio_cupones', (a, b) => Number(b.activo) - Number(a.activo)],
    invitaciones: ['selvaggio_invitaciones', (a, b) => (b.dia || '').localeCompare(a.dia || '')],
    resenas: ['selvaggio_reseñas', (a, b) => (a.orden ?? 99) - (b.orden ?? 99)],
  };
  const def = COLS[nombre];
  if (!def) throw Object.assign(new Error('Colección desconocida'), { status: 404 });
  return { items: docs(await getDb().collection(def[0]).get()).sort(def[1]) };
}

// ── Resumen ──────────────────────────────────────────────────────────────

export async function resumen() {
  return cacheado('resumen', 30_000, async () => {
    const db = getDb();
    const hoy = ahoraAR().fecha;
    const en7 = sumarDias(hoy, 7);
    const count = async (q) => (await q.count().get()).data().count;
    const [
      clientes, mesasProx, cavaProx, mesasHoy, takeawayPend, takeawayTotal,
      comandasTotal, contactoNoLeidos, postulaciones, invitaciones, conversaciones, proximas,
    ] = await Promise.all([
      count(db.collection('bot-selvaggio_customers')), // lista única (web + WhatsApp)
      count(db.collection('selvaggio_reservas_mesas').where('fecha', '>=', hoy).where('fecha', '<=', en7)),
      count(db.collection('selvaggio_reservas_cava').where('fecha', '>=', hoy)),
      count(db.collection('selvaggio_reservas_mesas').where('fecha', '==', hoy)),
      count(db.collection('selvaggio_takeaway_pedidos').where('estado', '==', 'pendiente')),
      count(db.collection('selvaggio_takeaway_pedidos')),
      count(db.collection('selvaggio_pedidos')),
      count(db.collection('selvaggio_contacto').where('leido', '==', false)),
      count(db.collection('selvaggio_postulaciones')),
      count(db.collection('selvaggio_invitaciones')),
      count(db.collection('bot-selvaggio_conversations')),
      reservas({ desde: hoy, hasta: en7 }),
    ]);
    return {
      hoy,
      kpis: { clientes, mesasHoy, mesasProx7: mesasProx, cavaProximas: cavaProx, takeawayPendientes: takeawayPend,
        takeawayTotal, comandasTotal, contactoNoLeidos, postulaciones, invitaciones, conversacionesBot: conversaciones },
      proximas: [
        ...proximas.mesas.filter(r => r.estado !== 'cancelada').map(r => ({ ...r, tipo: 'Mesa' })),
        ...proximas.cava.map(r => ({ ...r, tipo: 'La Cava' })),
      ].sort((a, b) => `${a.fecha} ${a.horario}`.localeCompare(`${b.fecha} ${b.horario}`)).slice(0, 25),
    };
  });
}
