import { getDb } from './firebase.service.js';
import { isLive } from './reservas.service.js';
import { invalidateCustomersCache } from './customer.service.js';

// Cumpleaños de los clientes, para la promo de cumpleaños. Se guarda en el
// contacto del bot (`cumpleanos` = 'MM-DD', y `fechaNacimiento` si dieron el
// año). En modo live también completa la ficha de la web (selvaggio_clientes)
// si le falta — en sandbox no se toca nada que vea la web.

const CUSTOMERS = 'bot-selvaggio_customers';

function fechaValida(y, m, d) {
  const f = new Date(Date.UTC(y ?? 2000, m - 1, d)); // 2000 es bisiesto: 29/02 válido sin año
  return f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

/**
 * Acepta 'AAAA-MM-DD', 'MM-DD', 'DD/MM', 'DD/MM/AAAA', 'DD-MM-AAAA'.
 * @returns {{ cumpleanos: 'MM-DD', fechaNacimiento: 'AAAA-MM-DD' | '' } | null}
 */
export function normalizarCumple(raw, { anioActual = new Date().getFullYear() } = {}) {
  const s = String(raw ?? '').trim();
  let y = null; let m; let d;
  let r;
  if ((r = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [, y, m, d] = r.map(Number);
  else if ((r = s.match(/^(\d{1,2})-(\d{1,2})$/))) [, m, d] = r.map(Number);
  else if ((r = s.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/))) {
    d = +r[1]; m = +r[2];
    if (r[3]) y = r[3].length === 2 ? (+r[3] > anioActual % 100 ? 1900 : 2000) + +r[3] : +r[3];
  } else return null;
  if (!m || !d || m > 12 || !fechaValida(y, m, d)) return null;
  // Un año imposible (futuro, o menos de 10 años) se descarta y queda solo día/mes.
  if (y && (y < 1920 || y > anioActual - 10)) y = null;
  const mmdd = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { cumpleanos: mmdd, fechaNacimiento: y ? `${y}-${mmdd}` : '' };
}

/**
 * Qué sabemos del cumpleaños de un contacto (contacto del bot + ficha web).
 * Las fechas de la web con año actual/futuro se toman como dudosas: mucha
 * gente no cambió el año en el selector, así que conviene volver a preguntar.
 * @returns {{ estado: 'conocido'|'desconocido'|'no_quiere', mmdd?: string, fuente?: string }}
 */
export function cumpleDelCliente(customer, { anioActual = new Date().getFullYear() } = {}) {
  if (customer?.cumpleanos) return { estado: 'conocido', mmdd: customer.cumpleanos, fuente: 'whatsapp' };
  const web = customer?.landingClient?.fechaNacimiento;
  if (/^\d{4}-\d{2}-\d{2}$/.test(web || '') && +web.slice(0, 4) >= 1920 && +web.slice(0, 4) <= anioActual - 10) {
    return { estado: 'conocido', mmdd: web.slice(5), fuente: 'web' };
  }
  if (customer?.cumpleanosNoQuiere) return { estado: 'no_quiere' };
  return { estado: 'desconocido' };
}

export const formatearCumple = (mmdd) => mmdd ? mmdd.split('-').reverse().join('/') : '';

/** Guarda el cumpleaños (o que prefirió no darlo) en el contacto. */
export async function guardarCumple(contactId, { fecha, noQuiere = false, landingClient = null }) {
  const db = getDb();
  const ref = db.collection(CUSTOMERS).doc(contactId);

  if (noQuiere) {
    await ref.set({ cumpleanosNoQuiere: true, updatedAt: new Date() }, { merge: true });
    invalidateCustomersCache();
    return { ok: true, guardado: 'no quiere darlo (no volver a preguntar)' };
  }

  const n = normalizarCumple(fecha);
  if (!n) return { error: 'No entendí la fecha. Pedile día y mes (ej. 15/03).' };
  await ref.set({
    cumpleanos: n.cumpleanos,
    ...(n.fechaNacimiento && { fechaNacimiento: n.fechaNacimiento }),
    cumpleanosFuente: 'whatsapp',
    cumpleanosNoQuiere: false,
    updatedAt: new Date(),
  }, { merge: true });
  invalidateCustomersCache();

  // Ficha de la web: solo en modo live, solo si tenemos el año (la web guarda
  // fecha completa) y solo si la ficha no tiene una fecha válida.
  let web = 'sin cambios';
  if (isLive() && n.fechaNacimiento && landingClient?.id) {
    const actual = landingClient.fechaNacimiento;
    const actualValida = /^\d{4}-\d{2}-\d{2}$/.test(actual || '') && +actual.slice(0, 4) <= new Date().getFullYear() - 10;
    if (!actualValida) {
      await db.collection('selvaggio_clientes').doc(landingClient.id).set({ fechaNacimiento: n.fechaNacimiento }, { merge: true });
      web = 'ficha web actualizada';
    }
  }
  return { ok: true, cumpleanos: formatearCumple(n.cumpleanos), conAnio: !!n.fechaNacimiento, web };
}
