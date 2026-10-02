import { getDb } from './firebase.service.js';
import { toWaContactId } from './phone.js';

// Clientes que carga la LANDING (reservas de mesa/cava y take away) en
// `selvaggio_clientes`. Ese doc lo escribe el front directo contra Firestore,
// con el EMAIL como ID y el teléfono tal cual lo tipeó la persona — por eso
// acá se indexa por teléfono normalizado con el mismo `toWaContactId` que usa
// el bot como ID de contacto, y así un contacto de WhatsApp se cruza con su
// historial de la landing sin tocar ninguna de las dos colecciones.
//
// SOLO LECTURA: la landing sigue siendo la dueña de esta colección.

const COLLECTION = 'selvaggio_clientes';

// Índice en memoria (teléfono canónico → cliente). Se pide en cada mensaje
// entrante del bot, así que sin cache cada mensaje sería un scan completo de
// la colección. 5 min de demora para ver una reserva nueva es aceptable.
let _index = { at: 0, byPhone: null };
const INDEX_TTL_MS = 5 * 60 * 1000;

function mapClient(id, data) {
  return {
    id,
    nombre: data.nombre || null,
    email: data.email || id,
    telefono: data.telefono || null,
    fechaNacimiento: data.fechaNacimiento || null,
    totalReservas: data.totalReservas ?? 0,
    totalPedidos: data.totalPedidos ?? 0,
    ultimaReserva: data.ultimaReserva || null,
    ultimoPedido: data.ultimoPedido || null,
    creado: data.creado || null,
  };
}

// Si el mismo teléfono aparece en varios docs (misma persona con dos mails),
// se suman los contadores y se queda con los datos del más reciente.
function mergeClients(a, b) {
  const last = (x) => [x.ultimaReserva, x.ultimoPedido, x.creado].filter(Boolean).sort().pop() || '';
  const [newer, older] = last(b) > last(a) ? [b, a] : [a, b];
  return {
    ...older,
    ...Object.fromEntries(Object.entries(newer).filter(([, v]) => v !== null && v !== '')),
    emails: [...new Set([...(a.emails ?? [a.email]), ...(b.emails ?? [b.email])])],
    totalReservas: a.totalReservas + b.totalReservas,
    totalPedidos: a.totalPedidos + b.totalPedidos,
  };
}

async function getIndex() {
  if (_index.byPhone && Date.now() - _index.at < INDEX_TTL_MS) return _index.byPhone;
  const snap = await getDb().collection(COLLECTION).get();
  const byPhone = new Map();
  for (const doc of snap.docs) {
    const client = mapClient(doc.id, doc.data());
    const key = toWaContactId(client.telefono);
    if (!key) continue;
    byPhone.set(key, byPhone.has(key) ? mergeClients(byPhone.get(key), client) : client);
  }
  _index = { at: Date.now(), byPhone };
  return byPhone;
}

/** Cliente de la landing con el mismo teléfono que el contacto, o null. */
export async function findLandingClient(contactId) {
  const key = toWaContactId(contactId);
  if (!key) return null;
  try {
    return (await getIndex()).get(key) ?? null;
  } catch (err) {
    // Nunca romper el bot por esto: es contexto extra, no algo crítico.
    console.error('[landing-clients] Error leyendo selvaggio_clientes:', err.message);
    return null;
  }
}

export { mergeClients as _mergeClientsForTest };
