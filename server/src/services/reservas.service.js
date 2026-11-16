import { getDb } from './firebase.service.js';
import { colEscritura } from './testWrites.js';

// Reservas de mesa y La Cava, del lado del servidor. Replica EXACTAMENTE las
// reglas que hoy aplica la landing en el navegador (src/Reservas/*.jsx) para
// que el bot y la web den la misma disponibilidad:
//   - Cupo de PERSONAS por horario (Gestión → Capacidad del panel)
//   - Lunes cerrado; vie/sáb hasta las 02:00; resto hasta las 22:00
//   - selvaggio_calendario/{fecha}: tipo 'cerrar' (todo el día) o 'abrir'
//     con `horarios` propios
//   - La Cava: un evento por día; mínimo/máximo de personas, precio y seña
//     también salen de Gestión → Capacidad
//
// MODO: mientras BOT_MODE !== 'live', lo que CREA EL BOT (reservas acá,
// pedidos en takeaway.service) va a colecciones sandbox y no toca lo que usa
// la web. La disponibilidad siempre se calcula con las reservas reales (solo
// lectura) más las del sandbox, así las pruebas se comportan como en producción.

// Sectores para mesas (La Cava es un espacio privado con su propia reserva).
export const PREFERENCIAS = ['Pérgola', 'Jardín'];

const HORARIOS_BASE = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];
const HORARIOS_FINDE = [...HORARIOS_BASE, '22:30', '23:00', '23:30', '00:00', '00:30', '01:00', '01:30', '02:00'];
const TZ = 'America/Argentina/Buenos_Aires';

export const COL = {
  mesas: 'selvaggio_reservas_mesas',
  cava: 'selvaggio_reservas_cava',
  calendario: 'selvaggio_calendario',
  sandboxMesas: 'bot-selvaggio_reservas_sandbox',
  // Web v2 en prueba (sin WEB_V2_REAL=1): mesas, eventos y cava van acá, con
  // `tipo`. No ocupan cupo ni los ve el admin de la web.
  pruebaV2: 'bot-selvaggio_v2_reservas_prueba',
};

// ── Capacidad (Gestión → Capacidad del panel) ────────────────────────────

// La landing lee el mismo doc (src/Reservas/*.jsx) con los mismos defaults.
const CONFIG_DOC = ['selvaggio_configuracion', 'reservas'];
const CONFIG_DEFAULT = Object.freeze({
  personasPorHorario: 16,
  mesaMaximo: 9, // personas por mesa
  cavaMinimo: 10,
  cavaMaximo: null, // sin tope
  cavaPrecioPersona: 60000,
  cavaSena: 100000,
});

const enteroPositivo = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Config de capacidad con defaults; descarta lo que no sea un entero > 0. */
export function normalizarConfigReservas(raw) {
  const c = { ...CONFIG_DEFAULT };
  for (const k of ['personasPorHorario', 'mesaMaximo', 'cavaMinimo', 'cavaPrecioPersona', 'cavaSena']) {
    c[k] = enteroPositivo(raw?.[k]) ?? CONFIG_DEFAULT[k];
  }
  const max = enteroPositivo(raw?.cavaMaximo);
  c.cavaMaximo = max && max >= c.cavaMinimo ? max : null;
  return c;
}

export async function configReservas() {
  const snap = await getDb().collection(CONFIG_DOC[0]).doc(CONFIG_DOC[1]).get();
  return normalizarConfigReservas(snap.exists ? snap.data() : null);
}

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

export const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

export function diaSemana(fecha) {
  // Mediodía UTC: el día de la semana no cambia por zona horaria.
  return new Date(`${fecha}T12:00:00Z`).getUTCDay();
}

export const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

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
export function colsQueOcupan(incluirSandbox) {
  return [COL.mesas, ...(incluirSandbox && !isLive() ? [COL.sandboxMesas] : [])];
}

// Personas que ocupa una reserva (las viejas sin cantidad cuentan como 1).
export const personasDe = (r) => enteroPositivo(r.cantidadPersonas) ?? 1;

async function personasPorHorario(db, fecha, incluirSandbox) {
  const cols = colsQueOcupan(incluirSandbox);
  const snaps = await Promise.all(cols.map(c => db.collection(c).where('fecha', '==', fecha).get()));
  const conteo = {};
  for (const snap of snaps) {
    for (const d of snap.docs) {
      const r = d.data();
      if (r.estado === 'cancelada' || !r.horario) continue;
      conteo[r.horario] = (conteo[r.horario] || 0) + personasDe(r);
    }
  }
  return conteo;
}

/**
 * Lugares (personas) que quedan en cada horario. Un horario está disponible
 * si entran las `personas` pedidas.
 */
export function calcularHorarios({ horas, personasPorHorario: ocupadas, cupo, personas = 1, yaPaso }) {
  return horas.map(h => {
    const lugares = yaPaso(h) ? 0 : Math.max(0, cupo - (ocupadas[h] || 0));
    return { hora: h, disponible: lugares > 0 && lugares >= personas, lugares };
  });
}

/**
 * @param {object} opts  personas: tamaño del grupo (marca disponible solo
 *                       donde entra); config: la de configReservas() si ya se leyó.
 * @returns {{ fecha, dia, abierto, motivo?, horarios: {hora, disponible, lugares}[] }}
 * No expone datos de otras reservas: solo cuántos lugares quedan.
 */
export async function disponibilidadMesas(fecha, { now = new Date(), incluirSandbox = false, personas = 1, config = null } = {}) {
  if (!FECHA_RE.test(fecha ?? '')) throw Object.assign(new Error('Fecha inválida (formato AAAA-MM-DD)'), { status: 400 });
  const hoy = ahoraAR(now);
  const base = { fecha, dia: NOMBRES_DIA[diaSemana(fecha)] };
  if (fecha < hoy.fecha) return { ...base, abierto: false, motivo: 'fecha pasada', horarios: [] };

  const db = getDb();
  const [excSnap, conteo, cfg] = await Promise.all([
    db.collection(COL.calendario).doc(fecha).get(),
    personasPorHorario(db, fecha, incluirSandbox),
    config ?? configReservas(),
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
    horarios: calcularHorarios({
      horas, personasPorHorario: conteo, cupo: cfg.personasPorHorario,
      personas: enteroPositivo(personas) ?? 1, yaPaso,
    }),
  };
}

// ── Alta de reserva de mesa ──────────────────────────────────────────────

function limpiar(s, max = 300) {
  return String(s ?? '').trim().slice(0, max);
}

/**
 * Reserva vigente del mismo contacto entre `reservas` (ya filtradas por fecha
 * y horario, o por evento). El modelo a veces vuelve a llamar a la tool de
 * crear en los mensajes que siguen a la confirmación ("si si", el
 * cumpleaños…) y cada llamada creaba otra reserva: con esto la segunda
 * devuelve la que ya existe en vez de duplicarla.
 */
export function reservaDelMismoContacto(reservas, { contactId, telefono }) {
  return reservas.find(x => x.estado !== 'cancelada'
    && ((contactId && x.contactId === contactId) || (telefono && x.telefono === telefono))) ?? null;
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
    fechaNacimiento: /^\d{4}-\d{2}-\d{2}$/.test(datos.fechaNacimiento ?? '') ? datos.fechaNacimiento : '',
  };
  const esWeb = meta.origen === 'web';
  const real = isLive() || esWeb;

  const cfg = await configReservas();
  const errores = [];
  if (!r.nombre) errores.push('falta el nombre');
  if (!r.telefono) errores.push('falta el teléfono');
  if (!Number.isInteger(r.cantidadPersonas) || r.cantidadPersonas < 1) errores.push('cantidad de personas inválida');
  else if (r.cantidadPersonas > cfg.mesaMaximo) errores.push(`las mesas son de hasta ${cfg.mesaMaximo} personas (La Cava es desde ${cfg.cavaMinimo})`);
  if (!PREFERENCIAS.includes(r.preferencia)) errores.push(`la preferencia tiene que ser ${PREFERENCIAS.join(' o ')}`);
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) errores.push('email inválido');
  if (errores.length) throw Object.assign(new Error(errores.join('; ')), { status: 400 });

  const db = getDb();
  const prueba = esWeb && meta.pruebaV2 === true;
  const destino = prueba ? COL.pruebaV2 : real ? colEscritura(COL.mesas) : COL.sandboxMesas;
  const quien = { contactId: meta.contactId, telefono: r.telefono };

  // Antes del chequeo de cupo: la reserva repetida ya ocupa su lugar y, si no,
  // el segundo intento respondería "no hay lugar" sobre su propia reserva.
  if (!esWeb) {
    const snap = await db.collection(destino).where('fecha', '==', r.fecha).where('horario', '==', r.horario).get();
    const previa = reservaDelMismoContacto(snap.docs.map(d => ({ id: d.id, ...d.data() })), quien);
    if (previa) return { ...previa, sandbox: !real, yaExistia: true };
  }

  const disp = await disponibilidadMesas(r.fecha, { now, incluirSandbox: !esWeb, personas: r.cantidadPersonas, config: cfg });
  if (!disp.abierto) throw Object.assign(new Error(`Ese día no se puede reservar (${disp.motivo})`), { status: 409 });
  const slot = disp.horarios.find(h => h.hora === r.horario);
  if (!slot) throw Object.assign(new Error(`El horario ${r.horario} no existe ese día. Horarios: ${disp.horarios.map(h => h.hora).join(', ')}`), { status: 409 });

  const ref = db.collection(destino).doc();
  let previa = null;

  await db.runTransaction(async (tx) => {
    // Re-chequeo del cupo adentro de la transacción.
    const cols = colsQueOcupan(!esWeb);
    let ocupadas = 0;
    for (const c of cols) {
      const snap = await tx.get(db.collection(c).where('fecha', '==', r.fecha).where('horario', '==', r.horario));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Mismo chequeo que arriba, por si dos mensajes llegan casi juntos.
      if (!esWeb && c === destino) previa = reservaDelMismoContacto(docs, quien);
      if (previa) return;
      ocupadas += docs.filter(x => x.estado !== 'cancelada').reduce((s, x) => s + personasDe(x), 0);
    }
    if (!slot.disponible) {
      throw Object.assign(new Error(slot.lugares > 0
        ? `A las ${r.horario} quedan ${slot.lugares} lugares, no entran ${r.cantidadPersonas} personas`
        : 'Ese horario ya no está disponible'), { status: 409 });
    }
    if (ocupadas + r.cantidadPersonas > cfg.personasPorHorario) throw Object.assign(new Error('Ese horario se acaba de completar'), { status: 409 });

    tx.set(ref, {
      ...r,
      // El admin de la web no lee "origen": la marca en comentarios es lo que
      // le muestra al equipo que esta reserva la tomó el bot.
      ...(meta.origen !== 'web' && { comentarios: [marcaBot(meta), r.comentarios].filter(Boolean).join(' · ') }),
      // Igual que la web: la reserva de mesa queda confirmada al instante.
      estado: 'confirmada',
      origen: meta.origen ?? 'bot',
      ...(prueba && { tipo: 'mesa', webV2: true }),
      ...(meta.contactId && { contactId: meta.contactId }),
      ...camposCanal(meta),
      createdAt: new Date().toISOString(),
    });
  });
  if (previa) return { ...previa, sandbox: !real, yaExistia: true };

  // El upsert de selvaggio_clientes (por email, como hace la web) solo en
  // modo live: en sandbox no se toca nada que vea la web.
  if (real && !prueba && r.email) await upsertCliente(r).catch(err => console.error('[reservas] upsert cliente:', err.message));

  return { id: ref.id, sandbox: !real, ...r, estado: 'confirmada' };
}

export const MARCA_BOT = 'Por WhatsApp (bot)';
export const MARCA_BOT_IG = 'Por Instagram (bot)';
/** Marca de comentarios según el canal por donde la tomó el bot. */
export const marcaBot = (meta = {}) => (meta.instagramId ? MARCA_BOT_IG : MARCA_BOT);
/** Campos que dejan registrado que la reserva/pedido vino por Instagram. */
export const camposCanal = (meta = {}) => (meta.instagramId ? { canal: 'instagram', instagramId: meta.instagramId } : {});
const MARCA_RE = /^\s*Por (WhatsApp|Instagram) \(bot\)/;

/**
 * Reserva de lugar para un evento publicado en la agenda (Cerámica y vino,
 * cata con menú de pasos…). Queda CONFIRMADA al instante, sin cupo, en la
 * misma colección que las mesas (a la hora de inicio del evento) para que el
 * equipo la vea en el admin de la web y en el panel junto con el resto.
 * @param {object} datos { eventoId, nombre, apellido?, cantidadPersonas, restricciones?, comentarios?, telefono }
 * @param {object} meta  { contactId }
 */
export async function crearReservaEvento(datos, meta = {}, { now = new Date() } = {}) {
  const db = getDb();
  const evDoc = await db.collection('selvaggio_eventos').doc(String(datos.eventoId || '')).get();
  const ev = evDoc.exists ? evDoc.data() : null;
  if (!ev || ev.visible === false) throw Object.assign(new Error('Ese evento no existe o ya no está publicado'), { status: 404 });
  if (ev.fecha < ahoraAR(now).fecha) throw Object.assign(new Error('Ese evento ya pasó'), { status: 409 });

  const esWeb = meta.origen === 'web';
  const prueba = esWeb && meta.pruebaV2 === true;
  const r = {
    nombre: limpiar(datos.nombre, 80),
    apellido: limpiar(datos.apellido, 80),
    telefono: limpiar(datos.telefono, 40),
    cantidadPersonas: parseInt(datos.cantidadPersonas, 10),
    restricciones: limpiar(datos.restricciones),
    ...(esWeb && {
      email: limpiar(datos.email, 120).toLowerCase(),
      fechaNacimiento: FECHA_RE.test(datos.fechaNacimiento ?? '') ? datos.fechaNacimiento : '',
    }),
  };
  const errores = [];
  if (!r.nombre) errores.push('falta el nombre');
  if (!r.telefono) errores.push('falta el teléfono');
  if (!Number.isInteger(r.cantidadPersonas) || r.cantidadPersonas < 1 || r.cantidadPersonas > 60) errores.push('cantidad de personas inválida');
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) errores.push('email inválido');
  // Desde la web, el evento pago se reserva con el comprobante de la seña.
  if (esWeb && ev.esPago === true && !meta.comprobanteUrl) errores.push('adjuntá el comprobante de la seña');
  if (errores.length) throw Object.assign(new Error(errores.join('; ')), { status: 400 });

  const destino = prueba ? COL.pruebaV2 : colEscritura(COL.mesas);
  // Igual que en mesas: la tool repetida (o el doble click en la web)
  // devuelve la reserva que ya tenía.
  const yaHay = await db.collection(destino).where('eventoId', '==', evDoc.id).get();
  const previa = reservaDelMismoContacto(yaHay.docs.map(d => ({ id: d.id, ...d.data() })), { contactId: meta.contactId, telefono: r.telefono });
  if (previa) return { ...previa, yaExistia: true };

  const sena = ev.esPago === true ? String(ev.sena ?? '').trim() : '';
  const notaSena = !sena && !meta.comprobanteUrl ? ''
    : meta.comprobanteUrl ? `SEÑA: comprobante adjunto (verificar)${sena ? ` · ${sena}` : ''}` : `SEÑA PENDIENTE ${sena}`;
  const ref = db.collection(destino).doc();
  const reserva = {
    ...r,
    email: r.email ?? '',
    fecha: ev.fecha,
    horario: ev.horaInicio || '',
    preferencia: '',
    comentarios: [!esWeb && marcaBot(meta), `Evento: ${ev.titulo}`, notaSena, limpiar(datos.comentarios)].filter(Boolean).join(' · '),
    evento: ev.titulo,
    eventoId: evDoc.id,
    ...(sena && !meta.comprobanteUrl && { senaPendiente: sena }),
    ...(meta.comprobanteUrl && { comprobanteUrl: meta.comprobanteUrl, comprobantePath: meta.comprobantePath }),
    estado: 'confirmada',
    origen: esWeb ? 'web' : 'bot',
    ...(prueba && { tipo: 'evento', webV2: true }),
    ...(meta.contactId && { contactId: meta.contactId }),
    ...camposCanal(meta),
    createdAt: new Date().toISOString(),
  };
  await ref.set(reserva);
  if (esWeb && !prueba && r.email) await upsertCliente(r).catch(err => console.error('[reservas] upsert cliente evento:', err.message));
  return { id: ref.id, ...reserva };
}

/**
 * Eventos de la agenda para la web (próximos 60 días, solo publicados). Sin
 * infoBot (es interno). `linkExterno`: el evento se reserva en otro lado.
 */
export async function eventosPublicos({ now = new Date() } = {}) {
  const hoy = ahoraAR(now).fecha;
  const tope = new Date(`${hoy}T12:00:00Z`); tope.setUTCDate(tope.getUTCDate() + 60);
  const snap = await getDb().collection('selvaggio_eventos')
    .where('fecha', '>=', hoy).where('fecha', '<=', tope.toISOString().slice(0, 10)).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(e => e.visible !== false && e.titulo)
    .sort((a, b) => `${a.fecha} ${a.horaInicio || ''}`.localeCompare(`${b.fecha} ${b.horaInicio || ''}`))
    .map(e => ({
      id: e.id,
      titulo: e.titulo,
      fecha: e.fecha,
      horaInicio: e.horaInicio || null,
      horaFin: e.horaFin || null,
      // El admin a veces pega texto con tiras de espacios (copiado de IG).
      descripcion: String(e.descripcion || '').replace(/[ \t]{2,}/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim(),
      imagen: e.imagen || null,
      esPago: e.esPago === true ? true : e.esPago === false ? false : null,
      ...(e.esPago === true && { precio: String(e.precio ?? '').trim(), sena: String(e.sena ?? '').trim(), alias: String(e.alias ?? '').trim() }),
      ...(e.ctaLink && !esLinkWhatsApp(e.ctaLink) && { linkExterno: e.ctaLink, linkTexto: e.ctaTexto || null }),
    }));
}

/** Lo que la web necesita de la capacidad (Gestión → Capacidad del panel). */
export async function configPublica() {
  const c = await configReservas();
  return {
    mesaMaximo: c.mesaMaximo,
    cavaMinimo: c.cavaMinimo,
    cavaMaximo: c.cavaMaximo,
    cavaPrecioPersona: c.cavaPrecioPersona,
    cavaSena: c.cavaSena,
    horariosCava: HORARIOS_CAVA,
    preferencias: PREFERENCIAS,
    extrasCava: EXTRAS_CAVA,
  };
}

/**
 * Todas las reservas de mesa (web y bot), como las ve el admin de la web,
 * para la página Reservas del panel. Por defecto: de hoy en adelante.
 * @param {{ desde?: string, hasta?: string }} rango AAAA-MM-DD
 */
export async function listarReservasMesas({ desde, hasta } = {}) {
  desde = FECHA_RE.test(desde || '') ? desde : ahoraAR().fecha;
  let q = getDb().collection(COL.mesas).where('fecha', '>=', desde);
  if (FECHA_RE.test(hasta || '')) q = q.where('fecha', '<=', hasta);
  const snap = await q.get();
  return snap.docs
    .map(d => {
      const r = d.data();
      const comentarios = String(r.comentarios || '');
      const porBot = r.origen === 'bot' || MARCA_RE.test(comentarios);
      return {
        id: d.id,
        fecha: r.fecha, horario: r.horario,
        nombre: r.nombre, apellido: r.apellido, telefono: r.telefono, email: r.email,
        cantidadPersonas: r.cantidadPersonas, preferencia: r.preferencia,
        restricciones: r.restricciones,
        comentarios: porBot ? comentarios.replace(MARCA_RE, '').replace(/^\s*·\s*/, '') : comentarios,
        estado: r.estado, archivada: !!r.archivada,
        evento: r.evento ?? null,
        origen: porBot ? 'bot' : 'web',
        contactId: r.contactId ?? null,
        canal: r.canal ?? (porBot ? 'whatsapp' : 'web'),
        createdAt: r.createdAt ?? null,
        confirmacion: r.confirmacionWhatsapp
          ? { estado: r.confirmacionWhatsapp.estado, respuesta: r.confirmacionWhatsapp.respuesta ?? null, error: r.confirmacionWhatsapp.error ?? null }
          : null,
      };
    })
    .sort((a, b) => `${a.fecha} ${a.horario}`.localeCompare(`${b.fecha} ${b.horario}`));
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
// Extras de La Cava (precios del diseño de la web nueva). La seña no cambia:
// se suman al total que se paga el día del evento.
export const EXTRAS_CAVA = [
  { id: 'dj', nombre: 'DJ set en vinilo', detalle: '2 horas', precio: 350000 },
  { id: 'cata', nombre: 'Cata de vinos guiada', detalle: '3 horas', precio: 250000 },
];

/**
 * Alta de reserva de La Cava desde la web, con el comprobante de la seña ya
 * subido (comprobanteUrl). Mismo criterio que src/Reservas/ReservaCava.jsx:
 * queda 'confirmada' al tener comprobante y bloquea el día entero.
 */
/** Datos limpios de una reserva de La Cava o error 400 (reglas de la web). */
export function validarReservaCava(datos, cfg, now = new Date()) {
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
  // Opcionales de la web v2 (el bot y la web vieja no los mandan).
  const apellido = limpiar(datos.apellido, 80);
  if (apellido) r.apellido = apellido;
  for (const k of ['comentarios', 'restricciones']) { const v = limpiar(datos[k]); if (v) r[k] = v; }
  let pedidos = datos.extras;
  if (typeof pedidos === 'string') { try { pedidos = JSON.parse(pedidos); } catch { pedidos = [pedidos]; } }
  const extras = EXTRAS_CAVA.filter(x => Array.isArray(pedidos) && pedidos.includes(x.id)).map(x => ({ id: x.id, nombre: x.nombre, precio: x.precio }));
  if (extras.length) r.extras = extras;
  const errores = [];
  if (!r.nombre) errores.push('falta el nombre');
  if (!r.telefono) errores.push('falta el teléfono');
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) errores.push('email inválido');
  if (!Number.isInteger(r.cantidadPersonas) || r.cantidadPersonas < cfg.cavaMinimo) errores.push(`mínimo ${cfg.cavaMinimo} personas`);
  else if (cfg.cavaMaximo && r.cantidadPersonas > cfg.cavaMaximo) errores.push(`máximo ${cfg.cavaMaximo} personas`);
  if (!FECHA_RE.test(r.fecha)) errores.push('fecha inválida');
  else if (r.fecha < ahoraAR(now).fecha) errores.push('la fecha ya pasó');
  if (!HORARIOS_CAVA.includes(r.horario)) errores.push(`horario inválido (opciones: ${HORARIOS_CAVA.join(', ')})`);
  if (errores.length) throw Object.assign(new Error(errores.join('; ')), { status: 400 });
  return r;
}

export async function crearReservaCava(datos, { comprobanteUrl, comprobantePath, pruebaV2 = false }, { now = new Date() } = {}) {
  const cfg = await configReservas();
  if (!comprobanteUrl) throw Object.assign(new Error('falta el comprobante de la seña'), { status: 400 });
  const r = validarReservaCava(datos, cfg, now);
  if (pruebaV2) r.tipo = 'cava';

  const db = getDb();
  // En prueba igual se chequea el día contra las reservas reales.
  const ref = db.collection(pruebaV2 ? COL.pruebaV2 : colEscritura(COL.cava)).doc();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(db.collection(COL.cava).where('fecha', '==', r.fecha));
    if (snap.docs.some(d => d.data().estado !== 'cancelada')) {
      throw Object.assign(new Error('Ese día La Cava ya está reservada. Elegí otra fecha.'), { status: 409 });
    }
    tx.set(ref, {
      ...r, comprobanteUrl, comprobantePath, estado: 'confirmada', seña: cfg.cavaSena,
      origen: 'web', createdAt: new Date().toISOString(),
    });
  });

  if (r.email && !pruebaV2) await upsertCliente({ ...r, apellido: r.apellido ?? '' }).catch(e => console.error('[reservas] upsert cliente cava:', e.message));
  return { id: ref.id, ...r, estado: 'confirmada' };
}

/**
 * Reserva de La Cava tomada por el bot: sin comprobante todavía. Bloquea el día
 * igual que la de la web y queda con senaPendiente hasta que el equipo verifica
 * el comprobante que el cliente manda por el chat.
 */
export async function crearReservaCavaBot(datos, meta = {}, { now = new Date() } = {}) {
  const cfg = await configReservas();
  const r = validarReservaCava(datos, cfg, now);
  const comentarios = limpiar(datos.comentarios);
  const db = getDb();
  const ref = db.collection(colEscritura(COL.cava)).doc();
  let previa = null;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(db.collection(COL.cava).where('fecha', '==', r.fecha));
    const activas = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.estado !== 'cancelada');
    // La tool repetida devuelve la que ya tenía (no es "ocupado").
    previa = reservaDelMismoContacto(activas, { contactId: meta.contactId, telefono: r.telefono });
    if (previa) return;
    if (activas.length) throw Object.assign(new Error('Ese día La Cava ya está reservada. Ofrecé otra fecha (consultar_fechas_cava).'), { status: 409 });
    tx.set(ref, {
      ...r, comentarios, estado: 'confirmada', seña: cfg.cavaSena, senaPendiente: true,
      origen: 'bot', ...(meta.contactId && { contactId: meta.contactId }), ...camposCanal(meta),
      createdAt: new Date().toISOString(),
    });
  });
  if (previa) return { ...previa, yaExistia: true };
  return { id: ref.id, ...r, estado: 'confirmada', senaPendiente: true, sena: cfg.cavaSena, precioPersona: cfg.cavaPrecioPersona };
}

// ── Seguimiento de take away ─────────────────────────────────────────────

/**
 * Estado de un pedido de take away por número + últimos 4 dígitos del
 * teléfono (el número TW-XXXXXX solo no alcanza: es adivinable). Devuelve
 * únicamente lo que necesita la pantalla de seguimiento.
 */
export async function seguimientoTakeaway(numeroPedido, ultimos4, { coleccion = 'selvaggio_takeaway_pedidos' } = {}) {
  const numero = String(numeroPedido ?? '').trim().toUpperCase();
  const tel4 = String(ultimos4 ?? '').replace(/\D/g, '');
  if (!numero || tel4.length !== 4) throw Object.assign(new Error('Número de pedido y últimos 4 del teléfono requeridos'), { status: 400 });
  const snap = await getDb().collection(coleccion).where('numeroPedido', '==', numero).limit(5).get();
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
    eventos: ev.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.visible !== false)
      .sort((a, b) => `${a.fecha} ${a.horaInicio || ''}`.localeCompare(`${b.fecha} ${b.horaInicio || ''}`))
      .map(eventoParaBot),
  };
}

/** Un evento de selvaggio_eventos tal como lo ve el bot en consultar_agenda. */
export function eventoParaBot(e) {
  const infoBot = (e.infoBot || '').trim();
  return {
    id: e.id,
    titulo: e.titulo,
    fecha: e.fecha,
    dia: NOMBRES_DIA[diaSemana(e.fecha)],
    horario: [e.horaInicio, e.horaFin].filter(Boolean).join(' a ') || null,
    descripcion: e.descripcion || null,
    // Lo que el admin carga solo para el bot (precio, qué incluye, políticas…);
    // no se muestra en la web.
    ...(infoBot && { infoInterna: infoBot }),
    // Pago: precio, seña y alias que carga el equipo. Sin el dato (eventos
    // viejos) no se dice nada: el bot no inventa si es gratis o pago.
    ...pagoDelEvento(e),
    // El botón "Reservar" de la web suele ser un link a NUESTRO WhatsApp:
    // pasárselo al cliente que ya está en este chat lo trae de vuelta acá.
    ...(e.ctaLink && (esLinkWhatsApp(e.ctaLink) ? { reservaPorEsteChat: true } : { link: e.ctaLink })),
  };
}

function pagoDelEvento(e) {
  if (e.esPago === false) return { gratis: true };
  if (e.esPago !== true) return {};
  const pago = {};
  for (const k of ['precio', 'sena', 'alias']) {
    const v = String(e[k] ?? '').trim();
    if (v) pago[k] = v;
  }
  // Sin precio cargado no hay nada que decir (el bot no tiene que inventarlo).
  return pago.precio ? { pago } : {};
}

export function esLinkWhatsApp(url) {
  return /(^|\/\/|\.)(wa\.me|whatsapp\.com)\b/i.test(String(url));
}
