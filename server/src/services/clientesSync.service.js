import { getDb } from './firebase.service.js';
import { clientesWebPorTelefono } from './landingClients.service.js';
import { invalidateCustomersCache } from './customer.service.js';

// Lista ÚNICA de clientes: los clientes que carga la web (selvaggio_clientes,
// por email) se copian a los contactos del bot (bot-selvaggio_customers, por
// teléfono). Así Contactos/Clientes, difusiones y la promo de cumpleaños usan
// una sola lista, y quien reservó por la web y escribió por WhatsApp es UNA
// ficha. Solo LEE la colección de la web; escribe en la del bot.
//
// Reglas del merge (nunca pisa lo que cargó el equipo o el bot):
//  - nombre/email: solo si el contacto no tiene
//  - `web`: snapshot de la ficha web (reservas, pedidos, fechas, emails)
//  - cumpleaños: solo si el contacto no tiene uno y la fecha web es creíble
//  - etiqueta 'Cliente web' se agrega una vez

const CUSTOMERS = 'bot-selvaggio_customers';
const TAG_WEB = 'Cliente web';
const INTERVALO_MS = 15 * 60 * 1000;

let ultima = { at: 0, resultado: null };
let enCurso = null;

const fechaCreible = (f) => /^\d{4}-\d{2}-\d{2}$/.test(f || '')
  && +f.slice(0, 4) >= 1920 && +f.slice(0, 4) <= new Date().getFullYear() - 10;

// Firestore no conserva el orden de las claves de un map: comparar ordenado.
const estable = (o) => JSON.stringify(o, Object.keys(o ?? {}).sort());

function snapshotWeb(c) {
  return {
    ids: c.emails ?? [c.id],
    nombre: c.nombre || null,
    totalReservas: c.totalReservas || 0,
    totalPedidos: c.totalPedidos || 0,
    ultimaReserva: c.ultimaReserva || null,
    ultimoPedido: c.ultimoPedido || null,
    creado: c.creado || null,
    fechaNacimiento: c.fechaNacimiento || null,
  };
}

async function sincronizar() {
  const db = getDb();
  const [web, botSnap] = await Promise.all([clientesWebPorTelefono(), db.collection(CUSTOMERS).get()]);
  const bot = new Map(botSnap.docs.map(d => [d.id, d.data()]));

  let creados = 0; let actualizados = 0;
  let batch = db.batch(); let ops = 0;
  const flush = async () => { if (ops) { await batch.commit(); batch = db.batch(); ops = 0; } };

  for (const [tel, c] of web) {
    const actual = bot.get(tel);
    const snap = snapshotWeb(c);
    if (actual?.web && estable(actual.web) === estable(snap)) continue; // sin cambios

    const update = { web: snap, updatedAt: new Date() };
    if (!actual?.contactName && c.nombre) update.contactName = c.nombre;
    if (!actual?.email && c.email) update.email = c.email;
    if (!actual?.cumpleanos && fechaCreible(c.fechaNacimiento)) {
      update.cumpleanos = c.fechaNacimiento.slice(5);
      update.fechaNacimiento = c.fechaNacimiento;
      update.cumpleanosFuente = 'web';
    }
    const tags = actual?.tags ?? [];
    if (!tags.includes(TAG_WEB)) update.tags = [...tags, TAG_WEB];

    if (!actual) {
      Object.assign(update, {
        contactId: tel, channel: 'whatsapp', source: 'web', agentNotes: '',
        firstContactAt: null, lastContactAt: null, createdAt: new Date(),
      });
      creados++;
    } else actualizados++;

    batch.set(db.collection(CUSTOMERS).doc(tel), update, { merge: true });
    if (++ops >= 400) await flush();
  }
  await flush();
  if (creados || actualizados) invalidateCustomersCache();
  return { clientesWeb: web.size, creados, actualizados, at: new Date().toISOString() };
}

/** Corre la sincronización (una a la vez). `forzar` ignora el intervalo. */
export async function sincronizarClientesWeb({ forzar = false } = {}) {
  if (!forzar && ultima.resultado && Date.now() - ultima.at < INTERVALO_MS) return ultima.resultado;
  if (!enCurso) {
    enCurso = sincronizar()
      .then(r => { ultima = { at: Date.now(), resultado: r }; console.log('[clientes-sync]', JSON.stringify(r)); return r; })
      .finally(() => { enCurso = null; });
  }
  return enCurso;
}

/** Arranque + cada 15 minutos. */
export function iniciarSyncClientes() {
  setTimeout(() => sincronizarClientesWeb({ forzar: true }).catch(e => console.error('[clientes-sync]', e.message)), 15_000);
  setInterval(() => sincronizarClientesWeb({ forzar: true }).catch(e => console.error('[clientes-sync]', e.message)), INTERVALO_MS).unref();
}
