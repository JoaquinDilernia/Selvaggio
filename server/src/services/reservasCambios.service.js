import { getDb } from './firebase.service.js';
import { colEscritura } from './testWrites.js';
import { toWaContactId } from './phone.js';
import {
  COL, FECHA_RE, NOMBRES_DIA, PREFERENCIAS,
  ahoraAR, diaSemana, colsQueOcupan, personasDe, configReservas, disponibilidadMesas, isLive,
} from './reservas.service.js';

// Ver, cambiar y cancelar desde WhatsApp las reservas de mesa del propio
// cliente (las que tomó el bot y las que hizo en la web con ese teléfono).
// Antes el bot derivaba todo esto al equipo: era el motivo de derivación
// más común después de los eventos privados.
//
// Cancelar BORRA la reserva de selvaggio_reservas_mesas, igual que el botón
// del admin de la web (que no muestra el campo "estado": una reserva marcada
// cancelada seguiría apareciendo como si nada). La copia queda en
// bot-selvaggio_reservas_canceladas para no perder el registro.

const COL_CANCELADAS = 'bot-selvaggio_reservas_canceladas';

const err = (msg, status = 400) => Object.assign(new Error(msg), { status });

/** La reserva es de este contacto (por contactId o por el teléfono que cargó en la web). */
export function esDelContacto(r, contactId) {
  if (!contactId || !r) return false;
  return r.contactId === contactId || toWaContactId(r.telefono) === contactId;
}

/** true si la reserva ya pasó (o es de hoy y su horario ya llegó). */
export function yaPaso(r, hoy) {
  if (r.fecha < hoy.fecha) return true;
  if (r.fecha > hoy.fecha) return false;
  // Lo de después de medianoche (01:00) es de la misma noche: todavía no pasó.
  return r.horario >= '12:00' && r.horario <= hoy.hora;
}

const ddmm = (fecha) => `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
const describir = (r) => `${NOMBRES_DIA[diaSemana(r.fecha)].slice(0, 3)} ${ddmm(r.fecha)} ${r.horario} · ${personasDe(r)} pers${r.preferencia ? ` · ${r.preferencia}` : ''}`;

/**
 * Valida y arma la reserva con los cambios aplicados (sin tocar la base).
 * Las reservas de eventos de la agenda no cambian de día ni de hora.
 */
export function aplicarCambios(actual, cambios, cfg) {
  const nueva = { ...actual };
  const tocados = [];
  const set = (k, v) => { if (v !== undefined && v !== null && v !== '' && v !== actual[k]) { nueva[k] = v; tocados.push(k); } };

  if (actual.evento && (cambios.fecha || cambios.horario || cambios.preferencia)) {
    throw err(`Es una reserva para el evento "${actual.evento}": no se puede cambiar de día, hora ni ubicación (sí la cantidad de personas)`);
  }
  if (cambios.fecha !== undefined && !FECHA_RE.test(cambios.fecha)) throw err('Fecha inválida (formato AAAA-MM-DD)');
  if (cambios.horario !== undefined && !/^\d{2}:\d{2}$/.test(cambios.horario)) throw err('Horario inválido (HH:MM)');
  set('fecha', cambios.fecha);
  set('horario', cambios.horario);
  if (cambios.cantidadPersonas !== undefined) {
    const n = parseInt(cambios.cantidadPersonas, 10);
    if (!Number.isInteger(n) || n < 1) throw err('Cantidad de personas inválida');
    if (!actual.evento && n > cfg.mesaMaximo) throw err(`Las mesas son de hasta ${cfg.mesaMaximo} personas; para más, derivá al equipo`);
    set('cantidadPersonas', n);
  }
  if (cambios.preferencia !== undefined) {
    if (!PREFERENCIAS.includes(cambios.preferencia)) throw err(`La preferencia tiene que ser ${PREFERENCIAS.join(' o ')}`);
    set('preferencia', cambios.preferencia);
  }
  if (cambios.restricciones !== undefined) set('restricciones', String(cambios.restricciones).trim().slice(0, 300));
  if (!tocados.length) throw err('No hay nada para cambiar: los datos son iguales a los de la reserva');
  return { nueva, tocados };
}

/** Nota para el equipo (va en comentarios, que es lo que muestra el admin de la web). */
export function notaCambio(antes, hoy) {
  return `Modificada por WhatsApp (bot) el ${ddmm(hoy.fecha)} ${hoy.hora}; antes: ${describir(antes)}`;
}

function colsDeBusqueda() {
  // Con SELVAGGIO_TEST_WRITES las altas locales van a otra colección: también se buscan ahí.
  return [...new Set([COL.mesas, colEscritura(COL.mesas), ...(isLive() ? [] : [COL.sandboxMesas])])];
}

const paraBot = (id, r) => ({
  id,
  fecha: r.fecha, dia: NOMBRES_DIA[diaSemana(r.fecha)], horario: r.horario,
  cantidadPersonas: personasDe(r), preferencia: r.preferencia || null,
  nombre: [r.nombre, r.apellido].filter(Boolean).join(' '),
  restricciones: r.restricciones || null,
  evento: r.evento ?? null,
});

/** Próximas reservas de mesa (y de eventos) de este contacto. */
export async function reservasDelContacto(contactId, { now = new Date() } = {}) {
  const hoy = ahoraAR(now);
  const db = getDb();
  const snaps = await Promise.all(colsDeBusqueda().map(c => db.collection(c).where('fecha', '>=', hoy.fecha).get()));
  return snaps.flatMap(s => s.docs.map(d => [d.id, d.data()]))
    .filter(([, r]) => r.estado !== 'cancelada' && esDelContacto(r, contactId) && !yaPaso(r, hoy))
    .map(([id, r]) => paraBot(id, r))
    .sort((a, b) => `${a.fecha} ${a.horario}`.localeCompare(`${b.fecha} ${b.horario}`))
    .slice(0, 5);
}

async function buscarPropia(db, id, contactId, hoy) {
  if (!id) throw err('Falta el id de la reserva (sale de mis_reservas)');
  for (const c of colsDeBusqueda()) {
    const snap = await db.collection(c).doc(String(id)).get();
    if (!snap.exists) continue;
    const r = snap.data();
    // Mismo mensaje si no existe o es de otro: no confirmamos reservas ajenas.
    if (!esDelContacto(r, contactId) || r.estado === 'cancelada') break;
    if (yaPaso(r, hoy)) throw err('Esa reserva ya pasó', 409);
    return { ref: snap.ref, col: c, r };
  }
  throw err('No encontré esa reserva a nombre de este número', 404);
}

/**
 * Cambia día, hora, personas, ubicación o restricciones de una reserva propia.
 * El cupo se re-chequea dentro de una transacción sin contar la propia reserva.
 */
export async function modificarReservaMesa(id, cambios, contactId, { now = new Date() } = {}) {
  const hoy = ahoraAR(now);
  const db = getDb();
  const cfg = await configReservas();
  const { ref, col, r } = await buscarPropia(db, id, contactId, hoy);
  const { nueva, tocados } = aplicarCambios(r, cambios, cfg);

  const cambiaLugar = tocados.some(k => ['fecha', 'horario', 'cantidadPersonas'].includes(k));
  if (cambiaLugar && !r.evento) {
    const disp = await disponibilidadMesas(nueva.fecha, { now, incluirSandbox: true, config: cfg });
    if (!disp.abierto) throw err(`Ese día no se puede reservar (${disp.motivo})`, 409);
    if (!disp.horarios.some(h => h.hora === nueva.horario)) {
      throw err(`El horario ${nueva.horario} no existe ese día. Horarios: ${disp.horarios.map(h => h.hora).join(', ')}`, 409);
    }
    if (yaPaso(nueva, hoy)) throw err('Ese horario ya pasó', 409);
  }

  await db.runTransaction(async (tx) => {
    let ocupadas = 0;
    if (cambiaLugar && !r.evento) {
      for (const c of colsQueOcupan(true)) {
        const snap = await tx.get(db.collection(c).where('fecha', '==', nueva.fecha).where('horario', '==', nueva.horario));
        ocupadas += snap.docs.filter(d => d.id !== ref.id).map(d => d.data())
          .filter(x => x.estado !== 'cancelada').reduce((s, x) => s + personasDe(x), 0);
      }
    }
    const actual = await tx.get(ref);
    if (!actual.exists) throw err('La reserva ya no existe (la pudo haber borrado el equipo)', 409);
    if (cambiaLugar && !r.evento && ocupadas + personasDe(nueva) > cfg.personasPorHorario) {
      const libres = Math.max(0, cfg.personasPorHorario - ocupadas);
      throw err(libres ? `A las ${nueva.horario} quedan ${libres} lugares, no entran ${personasDe(nueva)} personas` : `A las ${nueva.horario} ya no hay lugar`, 409);
    }
    const comentarios = [r.comentarios, notaCambio(r, hoy)].filter(Boolean).join(' · ').slice(-900);
    tx.update(ref, {
      ...Object.fromEntries(tocados.map(k => [k, nueva[k]])),
      comentarios,
      modificadaAt: new Date().toISOString(),
      modificadaPor: 'bot',
    });
  });

  return { ok: true, cambios: tocados, reserva: paraBot(ref.id, nueva) };
}

/** Cancela una reserva propia: la borra de la agenda y guarda la copia. */
export async function cancelarReservaMesa(id, contactId, { motivo = '', now = new Date() } = {}) {
  const hoy = ahoraAR(now);
  const db = getDb();
  const { ref, col, r } = await buscarPropia(db, id, contactId, hoy);
  const copia = db.collection(colEscritura(COL_CANCELADAS)).doc(ref.id);
  const batch = db.batch();
  batch.set(copia, {
    ...r,
    coleccion: col,
    estado: 'cancelada',
    canceladaAt: new Date().toISOString(),
    canceladaPor: 'bot',
    motivoCancelacion: String(motivo || '').trim().slice(0, 300),
  });
  batch.delete(ref);
  await batch.commit();
  return { ok: true, cancelada: paraBot(ref.id, r) };
}

