import { getDb } from './firebase.service.js';
import { colEscritura } from './testWrites.js';

// Reservas de mesa y La Cava, del lado del servidor. Replica EXACTAMENTE las
// reglas que hoy aplica la landing en el navegador (src/Reservas/*.jsx) para
// que el bot y la web den la misma disponibilidad:
//   - 4 reservas por horario (cuenta reservas, no personas)
//   - Lunes cerrado; vie/sáb hasta las 02:00; resto hasta las 22:00
//   - selvaggio_calendario/{fecha}: tipo 'cerrar' (todo el día) o 'abrir'
//     con `horarios` propios
//   - La Cava: un evento por día, mínimo 10 personas
//
// MODO: mientras BOT_MODE !== 'live', lo que CREA EL BOT (reservas acá,
// pedidos en takeaway.service) va a colecciones sandbox y no toca lo que usa
// la web. La disponibilidad siempre se calcula con las reservas reales (solo
// lectura) más las del sandbox, así las pruebas se comportan como en producción.

export const LIMITE_POR_SLOT = 4;
export const MINIMO_CAVA = 10;
export const PREFERENCIAS = ['Jardín', 'Living'];
export const CAVA = { precioPersona: 60000, seña: 100000 };

const HORARIOS_BASE = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];
const HORARIOS_FINDE = [...HORARIOS_BASE, '22:30', '23:00', '23:30', '00:00', '00:30', '01:00', '01:30', '02:00'];
const TZ = 'America/Argentina/Buenos_Aires';

const COL = {
  mesas: 'selvaggio_reservas_mesas',
  cava: 'selvaggio_reservas_cava',
  calendario: 'selvaggio_calendario',
  sandboxMesas: 'bot-selvaggio_reservas_sandbox',
};

export function isLive() {
  // RESERVAS_MODE: nombre viejo del mismo interruptor (antes solo reservas).
  return process.env.BOT_MODE === 'live' || process.env.RESERVAS_MODE === 'live';
}

// ── Fechas (siempre hora de Buenos Aires, nunca UTC) ─────────────────────

/** { fecha: 'YYYY-MM-DD', hora: 'HH:MM' } de ahora en Argentina. */
export function ahoraAR(now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now).map(x => [x.type, x.value])
  );
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function diaSemana(fecha) {
  // Mediodía UTC: el día de la semana no cambia por zona horaria.
  return new Date(`${fecha}T12:00:00Z`).getUTCDay();
}

const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Lo de después de medianoche va al final (es la misma noche).
const claveHorario = (h) => (h < '12:00' ? '1' : '0') + h;
const ordenarHorarios = (hs) => [...hs].sort((a, b) => claveHorario(a).localeCompare(claveHorario(b)));

// ── Disponibilidad de mesas ──────────────────────────────────────────────

/** Horarios en que abre el salón ese día (sin mirar cupos). */
export function horariosDelDia(fecha, excepcion = null) {
  if (excepcion?.tipo === 'cerrar') return [];
  if (excepcion?.tipo === 'abrir' && Array.isArray(excepcion.horarios)) return ordenarHorarios(excepcion.horarios);
  const dow = diaSemana(fecha);
  if (dow === 1) return [];
  return dow === 5 || dow === 6 ? HORARIOS_FINDE : HORARIOS_BASE;
}

// Colecciones que ocupan cupo. El sandbox del bot solo cuenta para el bot:
// la web nunca ve (ni pierde lugar por) reservas de prueba.
function colsQueOcupan(incluirSandbox) {
  return [COL.mesas, ...(incluirSandbox && !isLive() ? [COL.sandboxMesas] : [])];
}

async function contarPorHorario(db, fecha, incluirSandbox) {
  const cols = colsQueOcupan(incluirSandbox);
  const snaps = await Promise.all(cols.map(c => db.collection(c).where('fecha', '==', fecha).get()));
  const conteo = {};
  for (const snap of snaps) {
    for (const d of snap.docs) {
      const r = d.data();
      if (r.estado === 'cancelada' || !r.horario) continue;
      conteo[r.horario] = (conteo[r.horario] || 0) + 1;
    }
  }
  return conteo;
}

/**
 * @returns {{ fecha, dia, abierto, motivo?, horarios: {hora, disponible}[] }}
 * No expone datos de otras reservas: solo si cada horario tiene lugar.
 */
export async function disponibilidadMesas(fecha, { now = new Date(), incluirSandbox = false } = {}) {
  if (!FECHA_RE.test(fecha ?? '')) throw Object.assign(new Error('Fecha inválida (formato AAAA-MM-DD)'), { status: 400 });
  const hoy = ahoraAR(now);
  const base = { fecha, dia: NOMBRES_DIA[diaSemana(fecha)] };
  if (fecha < hoy.fecha) return { ...base, abierto: false, motivo: 'fecha pasada', horarios: [] };

  const db = getDb();
  const [excSnap, conteo] = await Promise.all([
    db.collection(COL.calendario).doc(fecha).get(),
    contarPorHorario(db, fecha, incluirSandbox),
  ]);
  const excepcion = excSnap.exists ? excSnap.data() : null;
  // 'cerrar' | 'abrir' | null — la web lo usa para el texto (cerrado / horario especial).
  base.excepcion = excepcion?.tipo ?? null;
  const horas = horariosDelDia(fecha, excepcion);
  if (!horas.length) {
    const motivo = excepcion?.tipo === 'cerrar' ? (excepcion.motivo || 'cerrado ese día') : 'los lunes está cerrado';
    return { ...base, abierto: false, motivo, horarios: [] };
  }

  const yaPaso = (h) => fecha === hoy.fecha && h >= '12:00' && h <= hoy.hora;
  return {
    ...base,
    abierto: true,
    ...(excepcion?.tipo === 'abrir' && { motivo: excepcion.motivo || 'horario especial' }),
    horarios: horas.map(h => {
      const lugares = yaPaso(h) ? 0 : Math.max(0, LIMITE_POR_SLOT - (conteo[h] || 0));
      return { hora: h, disponible: lugares > 0, lugares };
    }),
  };
}

// ── Alta de reserva de mesa ──────────────────────────────────────────────

function limpiar(s, max = 300) {
  return String(s ?? '').trim().slice(0, max);
}

/**
 * Crea una reserva de mesa validando cupo dentro de una transacción (dos
 * personas que piden el último lugar a la vez no pueden pasar las dos).
 * @param {object} datos  nombre, telefono, cantidadPersonas, fecha, horario,
 *                        preferencia, [apellido, email, restricciones, comentarios]
 * @param {object} meta   { origen: 'bot'|'web', contactId? } — lo de la web va
 *                        siempre a la colección real; lo del bot, solo en modo live.
 */
export async function crearReservaMesa(datos, meta = {}, { now = new Date() } = {}) {
  const r = {
    nombre: limpiar(datos.nombre, 80),
    apellido: limpiar(datos.apellido, 80),
    email: limpiar(datos.email, 120).toLowerCase(),
    telefono: limpiar(datos.telefono, 40),
    cantidadPersonas: parseInt(datos.cantidadPersonas, 10),
    fecha: limpiar(datos.fecha, 10),
    horario: limpiar(datos.horario, 5),
    preferencia: limpiar(datos.preferencia, 20),
    restricciones: limpiar(datos.restricciones),
    comentarios: limpiar(datos.comentarios),
    fechaNacimiento: /^d{4}-d{2}-d{2}$/.test(datos.fechaNacimiento ?? '') ? datos.fechaNacimiento : '',
  };
  const esWeb = meta.origen === 'web';
  const real = isLive() || esWeb;

  const errores = [];
  if (!r.nombre) errores.push('falta el nombre');
  if (!r.telefono) errores.push('falta el teléfono');
  if (!Number.isInteger(r.cantidadPersonas) || r.cantidadPersonas < 1) errores.push('cantidad de personas inválida');
  // La web no tiene tope (hoy permite cualquier cantidad); el bot deriva los
  // grupos grandes a La Cava.
  if (meta.origen === 'bot' && r.cantidadPersonas >= MINIMO_CAVA) errores.push(`para ${MINIMO_CAVA} o más personas se reserva La Cava, no una mesa`);
  if (!PREFERENCIAS.includes(r.preferencia)) errores.push(`la preferencia tiene que ser ${PREFERENCIAS.join(' o ')}`);
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) errores.push('email inválido');
  if (errores.length) throw Object.assign(new Error(errores.join('; ')), { status: 400 });

  const disp = await disponibilidadMesas(r.fecha, { now, incluirSandbox: !esWeb });
  if (!disp.abierto) throw Object.assign(new Error(`Ese día no se puede reservar (${disp.motivo})`), { status: 409 });
  const slot = disp.horarios.find(h => h.hora === r.horario);
  if (!slot) throw Object.assign(new Error(`El horario ${r.horario} no existe ese día. Horarios: ${disp.horarios.map(h => h.hora).join(', ')}`), { status: 409 });

  const db = getDb();
  const destino = real ? colEscritura(COL.mesas) : COL.sandboxMesas;
  const ref = db.collection(destino).doc();

  await db.runTransaction(async (tx) => {
    // Re-chequeo del cupo adentro de la transacción.
    const cols = colsQueOcupan(!esWeb);
    let ocupados = 0;
    for (const c of cols) {
      const snap = await tx.get(db.collection(c).where('fecha', '==', r.fecha).where('horario', '==', r.horario));
      ocupados += snap.docs.filter(d => d.data().estado !== 'cancelada').length;
    }
    if (ocupados >= LIMITE_POR_SLOT) throw Object.assign(new Error('Ese horario se acaba de completar'), { status: 409 });
    if (!slot.disponible) throw Object.assign(new Error('Ese horario ya no está disponible'), { status: 409 });

    tx.set(ref, {
      ...r,
      estado: 'pendiente',
      origen: meta.origen ?? 'bot',
      ...(meta.contactId && { contactId: meta.contactId }),
      createdAt: new Date().toISOString(),
    });
  });

  // El upsert de selvaggio_clientes (por email, como hace la web) solo en
  // modo live: en sandbox no se toca nada que vea la web.
  if (real && r.email) await upsertCliente(r).catch(err => console.error('[reservas] upsert cliente:', err.message));

  return { id: ref.id, sandbox: !real, ...r, estado: 'pendiente' };
}

async function upsertCliente(r) {
  const db = getDb();
  const ref = db.collection(colEscritura('selvaggio_clientes')).doc(r.email);
  const nombre = r.nombre + (r.apellido ? ' ' + r.apellido : '');
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const ahora = new Date().toISOString();
    if (snap.exists) {
      tx.set(ref, {
        nombre,
        telefono: r.telefono || snap.data().telefono || '',
        ...(r.fechaNacimiento && { fechaNacimiento: r.fechaNacimiento }),
        totalReservas: (snap.data().totalReservas || 0) + 1,
        ultimaReserva: ahora,
      }, { merge: true });
    } else {
      tx.set(ref, {
        nombre, email: r.email, telefono: r.telefono || '', fechaNacimiento: r.fechaNacimiento || '',
        totalReservas: 1, totalPedidos: 0, ultimaReserva: ahora, creado: ahora,
      });
    }
  });
}

/** Reservas que creó el bot (sandbox o live), más nuevas primero. */
export async function listarReservasBot({ limit = 100 } = {}) {
  const db = getDb();
  const col = isLive() ? COL.mesas : COL.sandboxMesas;
  const snap = await db.collection(col).where('origen', '==', 'bot').get();
  return {
    sandbox: !isLive(),
    reservas: snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, limit),
  };
}

// ── La Cava ──────────────────────────────────────────────────────────────

/** Días ocupados de La Cava entre dos fechas (inclusive). Solo fechas. */
export async function cavaOcupada(desde, hasta) {
  if (!FECHA_RE.test(desde ?? '') || !FECHA_RE.test(hasta ?? '')) {
    throw Object.assign(new Error('Fechas inválidas (formato AAAA-MM-DD)'), { status: 400 });
  }
  const snap = await getDb().collection(COL.cava)
    .where('fecha', '>=', desde).where('fecha', '<=', hasta).get();
  const fechas = new Set(snap.docs.map(d => d.data()).filter(r => r.estado !== 'cancelada').map(r => r.fecha));
  return [...fechas].sort();
}

export const HORARIOS_CAVA = ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];

/**
 * Alta de reserva de La Cava desde la web, con el comprobante de la seña ya
 * subido (comprobanteUrl). Mismo criterio que src/Reservas/ReservaCava.jsx:
 * queda 'confirmada' al tener comprobante y bloquea el día entero.
 */
export async function crearReservaCava(datos, { comprobanteUrl, comprobantePath }, { now = new Date() } = {}) {
  const r = {
    nombre: limpiar(datos.nombre, 80),
    telefono: limpiar(datos.telefono, 40),
    email: limpiar(datos.email, 120).toLowerCase(),
    fechaNacimiento: /^\d{4}-\d{2}-\d{2}$/.test(datos.fechaNacimiento ?? '') ? datos.fechaNacimiento : '',
    cantidadPersonas: parseInt(datos.cantidadPersonas, 10),
    traeTorta: datos.traeTorta === true || datos.traeTorta === 'true',
    fecha: limpiar(datos.fecha, 10),
    horario: limpiar(datos.horario, 5),
  };
  const errores = [];
  if (!r.nombre) errores.push('falta el nombre');
  if (!r.telefono) errores.push('falta el teléfono');
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) errores.push('email inválido');
  if (!Number.isInteger(r.cantidadPersonas) || r.cantidadPersonas < MINIMO_CAVA) errores.push(`mínimo ${MINIMO_CAVA} personas`);
  if (!FECHA_RE.test(r.fecha)) errores.push('fecha inválida');
  else if (r.fecha < ahoraAR(now).fecha) errores.push('la fecha ya pasó');
  if (!HORARIOS_CAVA.includes(r.horario)) errores.push('horario inválido');
  if (!comprobanteUrl) errores.push('falta el comprobante de la seña');
  if (errores.length) throw Object.assign(new Error(errores.join('; ')), { status: 400 });

  const db = getDb();
  const ref = db.collection(colEscritura(COL.cava)).doc();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(db.collection(COL.cava).where('fecha', '==', r.fecha));
    if (snap.docs.some(d => d.data().estado !== 'cancelada')) {
      throw Object.assign(new Error('Ese día La Cava ya está reservada. Elegí otra fecha.'), { status: 409 });
    }
    tx.set(ref, {
      ...r, comprobanteUrl, comprobantePath, estado: 'confirmada', seña: CAVA.seña,
      origen: 'web', createdAt: new Date().toISOString(),
    });
  });

  if (r.email) await upsertCliente({ ...r, apellido: '' }).catch(e => console.error('[reservas] upsert cliente cava:', e.message));
  return { id: ref.id, ...r, estado: 'confirmada' };
}

// ── Seguimiento de take away ─────────────────────────────────────────────

/**
 * Estado de un pedido de take away por número + últimos 4 dígitos del
 * teléfono (el número TW-XXXXXX solo no alcanza: es adivinable). Devuelve
 * únicamente lo que necesita la pantalla de seguimiento.
 */
export async function seguimientoTakeaway(numeroPedido, ultimos4) {
  const numero = String(numeroPedido ?? '').trim().toUpperCase();
  const tel4 = String(ultimos4 ?? '').replace(/\D/g, '');
  if (!numero || tel4.length !== 4) throw Object.assign(new Error('Número de pedido y últimos 4 del teléfono requeridos'), { status: 400 });
  const snap = await getDb().collection('selvaggio_takeaway_pedidos').where('numeroPedido', '==', numero).limit(5).get();
  const doc = snap.docs.find(d => String(d.data().telefono ?? '').replace(/\D/g, '').endsWith(tel4));
  if (!doc) return null;
  const p = doc.data();
  // Los mismos campos que muestra src/TakeAway/SeguimientoPedido.jsx; sin
  // teléfono, email ni dirección.
  return {
    numeroPedido: p.numeroPedido,
    estado: p.estado ?? null,
    nombre: p.nombre ?? null,
    apellido: p.apellido ?? null,
    items: p.items ?? [],
    total: p.total ?? null,
    metodoPago: p.metodoPago ?? null,
    comentarios: p.comentarios ?? null,
    fechaRetiro: p.fechaRetiro ?? null,
  };
}

// ── Agenda (para el bot): horario, días especiales y eventos ─────────────

/**
 * Lo que necesita el bot para contestar "¿a qué hora abren?", "¿abren el
 * feriado?" o "¿qué eventos hay?": horario habitual (Configuración del
 * panel), excepciones de selvaggio_calendario y eventos visibles de
 * selvaggio_eventos — los mismos que maneja el admin de la web.
 */
export async function agenda({ desde, hasta, horarioHabitual = null } = {}, { now = new Date() } = {}) {
  const hoy = ahoraAR(now).fecha;
  desde = FECHA_RE.test(desde || '') && desde >= hoy ? desde : hoy;
  const tope = new Date(`${desde}T12:00:00Z`); tope.setUTCDate(tope.getUTCDate() + 90);
  const maximo = tope.toISOString().slice(0, 10);
  hasta = FECHA_RE.test(hasta || '') && hasta >= desde && hasta <= maximo ? hasta : (() => {
    const d = new Date(`${desde}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 45); return d.toISOString().slice(0, 10);
  })();

  const db = getDb();
  const [cal, ev] = await Promise.all([
    db.collection(COL.calendario).where('fecha', '>=', desde).where('fecha', '<=', hasta).get(),
    db.collection('selvaggio_eventos').where('fecha', '>=', desde).where('fecha', '<=', hasta).get(),
  ]);
  return {
    desde, hasta,
    horarioHabitual,
    diasEspeciales: cal.docs.map(d => d.data()).sort((a, b) => a.fecha.localeCompare(b.fecha)).map(e => ({
      fecha: e.fecha,
      dia: NOMBRES_DIA[diaSemana(e.fecha)],
      tipo: e.tipo === 'cerrar' ? 'cerrado todo el día' : 'abierto con horario especial',
      ...(e.tipo === 'abrir' && Array.isArray(e.horarios) && { horariosDeReserva: ordenarHorarios(e.horarios) }),
      ...(e.motivo && { motivo: e.motivo }),
    })),
    eventos: ev.docs.map(d => d.data()).filter(e => e.visible !== false)
      .sort((a, b) => `${a.fecha} ${a.horaInicio || ''}`.localeCompare(`${b.fecha} ${b.horaInicio || ''}`))
      .map(e => ({
        titulo: e.titulo,
        fecha: e.fecha,
        dia: NOMBRES_DIA[diaSemana(e.fecha)],
        horario: [e.horaInicio, e.horaFin].filter(Boolean).join(' a ') || null,
        descripcion: e.descripcion || null,
        // El botón "Reservar" de la web suele ser un link a NUESTRO WhatsApp:
        // pasárselo al cliente que ya está en este chat lo trae de vuelta acá.
        ...(e.ctaLink && (esLinkWhatsApp(e.ctaLink) ? { reservaPorEsteChat: true } : { link: e.ctaLink })),
      })),
  };
}

export function esLinkWhatsApp(url) {
  return /(^|\/\/|\.)(wa\.me|whatsapp\.com)\b/i.test(String(url));
}
