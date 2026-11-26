import { getDb } from './firebase.service.js';
import { limpiarEvento, camposCambiados, describirCambios, quien } from './eventosAuditoria.js';

// Eventos sueltos (Contenido → Eventos) con rastro y papelera.
// - El panel crea/edita/borra por acá (no directo a Firestore): queda quién y cuándo.
// - Borrar no elimina: el evento pasa a la papelera y se puede restaurar.
// - Un vigía escucha selvaggio_eventos: si algo cambia o desaparece por otro
//   camino (el admin viejo de la web, la consola), también queda registrado
//   y lo borrado va a la papelera, aunque no sepamos quién fue.
// Con SELVAGGIO_EVENTOS_PRUEBA=1 (sólo pruebas locales) todo va a colecciones de prueba.
const PRUEBA = process.env.SELVAGGIO_EVENTOS_PRUEBA === '1';
const EVENTOS = PRUEBA ? 'bot-selvaggio_test_eventos' : 'selvaggio_eventos';
const LOG = PRUEBA ? 'bot-selvaggio_test_eventos_log' : 'bot-selvaggio_eventos_log';
const PAPELERA = PRUEBA ? 'bot-selvaggio_test_eventos_papelera' : 'bot-selvaggio_eventos_papelera';
export const COLECCIONES_EVENTOS = { EVENTOS, LOG, PAPELERA };

const httpError = (status, message) => Object.assign(new Error(message), { status });
const ahora = () => new Date().toISOString();

// Cambios que vamos a hacer nosotros (panel o sistema): el vigía no los
// registra otra vez como "por fuera del panel". Cada marca cubre UN cambio
// (el siguiente que llegue de ese id), así un borrado por fuera justo después
// de guardar desde el panel igual se detecta. Vence al minuto por si la
// escritura no llegó a cambiar nada.
const propios = new Map(); // id -> { n, vence }
const PROPIO_MS = 60_000;
export function marcarPropio(ids) {
  const vence = Date.now() + PROPIO_MS;
  for (const id of [].concat(ids)) propios.set(id, { n: (propios.get(id)?.n ?? 0) + 1, vence });
}
function esPropio(id) {
  const p = propios.get(id);
  if (!p) return false;
  if (p.vence < Date.now()) { propios.delete(id); return false; }
  if (--p.n <= 0) propios.delete(id);
  return true;
}

export async function registrar({ eventoId, titulo = '', fecha = '', accion, detalle = '', por = null, origen = 'panel' }) {
  try {
    await getDb().collection(LOG).add({ eventoId, titulo, fecha, accion, detalle, por: por ?? quien(null), origen, en: ahora() });
  } catch (err) {
    console.error('[eventos-log] No se pudo registrar:', err.message);
  }
}

async function obtener(id) {
  const doc = await getDb().collection(EVENTOS).doc(String(id)).get();
  if (!doc.exists) throw httpError(404, 'El evento ya no existe (puede que lo hayan borrado: fijate en la papelera)');
  return { id: doc.id, ...doc.data() };
}

// Un solo evento puede ser el popup de la web.
async function sacarOtrosPopups(exceptoId, por) {
  const db = getDb();
  const snap = await db.collection(EVENTOS).where('esPopup', '==', true).get();
  for (const d of snap.docs) {
    if (d.id === exceptoId) continue;
    marcarPropio(d.id);
    await d.ref.update({ esPopup: false, actualizadoEn: ahora(), editadoPor: por });
  }
}

export async function crearEvento(body, agent) {
  const datos = limpiarEvento(body);
  const por = quien(agent);
  const db = getDb();
  const ref = db.collection(EVENTOS).doc();
  marcarPropio(ref.id);
  if (datos.esPopup) await sacarOtrosPopups(ref.id, por);
  const t = ahora();
  const evento = { visible: true, esPopup: false, ...datos, creadoEn: t, actualizadoEn: t, creadoPor: por };
  await ref.set(evento);
  await registrar({ eventoId: ref.id, titulo: evento.titulo, fecha: evento.fecha, accion: 'creado', por });
  return { id: ref.id, ...evento };
}

export async function actualizarEvento(id, body, agent) {
  const cambios = limpiarEvento(body, { parcial: true });
  const antes = await obtener(id);
  const por = quien(agent);
  const campos = camposCambiados(antes, cambios);
  if (!campos.length) return antes;
  marcarPropio(id);
  if (cambios.esPopup) await sacarOtrosPopups(id, por);
  const update = { ...cambios, actualizadoEn: ahora(), editadoPor: por };
  // Una fecha de un evento fijo tocada a mano ya no la pisa la serie; si sólo
  // se ocultó/mostró, se respeta la visibilidad sin congelar la fecha.
  if (antes.serieId) {
    if (campos.every(k => k === 'visible')) update.visibleManual = cambios.visible;
    else update.editadoManual = true;
  }
  await getDb().collection(EVENTOS).doc(id).update(update);
  const despues = { ...antes, ...update };
  const accion = campos.length === 1 && campos[0] === 'visible' ? (cambios.visible ? 'mostrado' : 'ocultado') : 'editado';
  await registrar({ eventoId: id, titulo: despues.titulo, fecha: despues.fecha, accion, detalle: accion === 'editado' ? describirCambios(campos) : '', por });
  return despues;
}

async function aPapelera(id, evento, por, origen) {
  await getDb().collection(PAPELERA).doc(id).set({
    evento, titulo: evento.titulo ?? '', fecha: evento.fecha ?? '', eliminadoEn: ahora(), eliminadoPor: por, origen,
  });
}

export async function eliminarEvento(id, agent) {
  const evento = await obtener(id);
  const por = quien(agent);
  const { id: _id, ...datos } = evento;
  marcarPropio(id);
  await aPapelera(id, datos, por, 'panel');
  await getDb().collection(EVENTOS).doc(id).delete();
  await registrar({ eventoId: id, titulo: evento.titulo, fecha: evento.fecha, accion: 'eliminado', detalle: 'Va a la papelera', por });
  return { ok: true };
}

export async function listarPapelera() {
  const snap = await getDb().collection(PAPELERA).orderBy('eliminadoEn', 'desc').limit(100).get();
  return snap.docs.map(d => {
    const x = d.data();
    return { id: d.id, titulo: x.titulo, fecha: x.fecha, eliminadoEn: x.eliminadoEn, eliminadoPor: x.eliminadoPor, origen: x.origen, imagen: x.evento?.imagen ?? '' };
  });
}

export async function restaurarEvento(id, agent) {
  const db = getDb();
  const ref = db.collection(PAPELERA).doc(String(id));
  const doc = await ref.get();
  if (!doc.exists) throw httpError(404, 'Ese evento ya no está en la papelera');
  if ((await db.collection(EVENTOS).doc(id).get()).exists) throw httpError(409, 'Ya hay un evento con ese id: no se restauró para no pisarlo');
  const { evento } = doc.data();
  const por = quien(agent);
  const datos = { ...evento, actualizadoEn: ahora(), restauradoPor: por };
  // Una fecha de evento fijo restaurada queda como editada a mano: si no, la
  // serie la volvería a borrar.
  if (datos.serieId) datos.editadoManual = true;
  if (datos.esPopup) await sacarOtrosPopups(id, por);
  marcarPropio(id);
  await db.collection(EVENTOS).doc(id).set(datos);
  await ref.delete();
  await registrar({ eventoId: id, titulo: datos.titulo, fecha: datos.fecha, accion: 'restaurado', por });
  return { id, ...datos };
}

export async function listarLog({ eventoId = null, limite = 100 } = {}) {
  const n = Math.min(Number(limite) || 100, 300);
  const col = getDb().collection(LOG);
  // Por evento se ordena en memoria (where + orderBy pediría un índice compuesto).
  const snap = eventoId ? await col.where('eventoId', '==', String(eventoId)).get() : await col.orderBy('en', 'desc').limit(n).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.en).localeCompare(String(a.en))).slice(0, n);
}

// ---- vigía -------------------------------------------------------------------

const EXTERNO = { nombre: 'Fuera del panel (no se sabe quién)', email: null };
let vigiaActivo = false;
let cortarVigia = null;

/** Para las pruebas: deja de escuchar. */
export function detenerVigiaEventos() {
  cortarVigia?.();
  cortarVigia = null;
  vigiaActivo = false;
}

/** Escucha selvaggio_eventos y registra lo que cambia por fuera del panel. */
export function iniciarVigiaEventos() {
  if (vigiaActivo || (process.env.SELVAGGIO_TEST_WRITES === '1' && !PRUEBA)) return;
  vigiaActivo = true;
  const ultimo = new Map(); // id -> datos, para saber qué había antes de un cambio
  let primera = true;
  const arrancar = () => {
    cortarVigia = getDb().collection(EVENTOS).onSnapshot((snap) => {
      for (const ch of snap.docChanges()) {
        const id = ch.doc.id;
        const data = ch.doc.data();
        const antes = ultimo.get(id);
        if (ch.type === 'removed') ultimo.delete(id); else ultimo.set(id, data);
        if (primera || esPropio(id)) continue;
        // Las fechas que genera un evento fijo las maneja la serie (tiene su propio registro).
        if (data.generado && !data.editadoManual && ch.type !== 'removed') continue;
        if (ch.type === 'removed') {
          aPapelera(id, data, EXTERNO, 'externo')
            .then(() => registrar({ eventoId: id, titulo: data.titulo, fecha: data.fecha, accion: 'eliminado', detalle: 'Borrado por fuera del panel; quedó una copia en la papelera', por: EXTERNO, origen: 'externo' }))
            .catch(err => console.error('[eventos-vigia] No se pudo guardar en la papelera:', err.message));
          console.warn(`[eventos-vigia] "${data.titulo}" (${data.fecha}) se borró por fuera del panel → papelera`);
        } else if (ch.type === 'added') {
          registrar({ eventoId: id, titulo: data.titulo, fecha: data.fecha, accion: 'creado', detalle: 'Cargado por fuera del panel', por: EXTERNO, origen: 'externo' });
        } else {
          const campos = camposCambiados(antes ?? {}, data);
          if (campos.length) registrar({ eventoId: id, titulo: data.titulo, fecha: data.fecha, accion: 'editado', detalle: `${describirCambios(campos)} (por fuera del panel)`, por: EXTERNO, origen: 'externo' });
        }
      }
      primera = false;
    }, (err) => {
      console.error('[eventos-vigia] Se cortó la escucha, reintento en 1 min:', err.message);
      primera = true;
      setTimeout(() => { if (vigiaActivo) arrancar(); }, 60_000);
    });
  };
  arrancar();
}
