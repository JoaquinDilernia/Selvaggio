import admin from 'firebase-admin';
import { getDb } from './firebase.service.js';
import { hadActivityInRange, toDate } from './statsAggregate.js';
import { ahoraAR, diaSemana, configReservas } from './reservas.service.js';

// Analytics de Gestión: eventos de la web (selvaggio_analytics_eventos), las
// reservas de La Cava y el interés por La Cava en el chat del bot.
//
// Se lee desde el backend (no desde el navegador) porque las reglas de
// Firestore solo dejan leer analytics al rol admin, y el bot vive en
// colecciones `bot-selvaggio_*` que el navegador no puede leer nunca.

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DIAS = 366;
const DIA_MS = 86_400_000;
const CAVA_RE = /\bcava\b/i;
const DIAS_OCUPACION = 60;

// Argentina no tiene horario de verano: el offset -03:00 es fijo.
export const inicioDiaAR = (fecha) => new Date(`${fecha}T00:00:00.000-03:00`);
export const finDiaAR = (fecha) => new Date(`${fecha}T23:59:59.999-03:00`);
const claveDiaAR = (msUtc) => new Date(msUtc - 3 * 3_600_000).toISOString().slice(0, 10);
const sumarDias = (fecha, n) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Rango actual y anterior (mismo largo, justo antes) para días 'YYYY-MM-DD' en AR. */
export function rangosPeriodo(desde, hasta) {
  if (!FECHA_RE.test(desde || '') || !FECHA_RE.test(hasta || '')) {
    throw Object.assign(new Error('Fechas inválidas (usar YYYY-MM-DD)'), { status: 400 });
  }
  if (desde > hasta) [desde, hasta] = [hasta, desde];
  const startMs = inicioDiaAR(desde).getTime();
  const endMs = finDiaAR(hasta).getTime();
  if ((endMs - startMs) / DIA_MS > MAX_DIAS) {
    throw Object.assign(new Error(`El período no puede superar ${MAX_DIAS} días`), { status: 400 });
  }
  const largo = endMs - startMs + 1;
  return { desde, hasta, startMs, endMs, prevStartMs: startMs - largo, prevEndMs: startMs - 1, dias: Math.round(largo / DIA_MS) };
}

const ms = (v) => toDate(v)?.getTime() ?? NaN;
const enRango = (v, a, b) => { const t = ms(v); return t >= a && t <= b; };
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const textoMsg = (m) => (typeof m?.content === 'string' ? m.content : typeof m?.text === 'string' ? m.text : '');

/**
 * Momento (ms) en que la conversación mostró interés por La Cava dentro del
 * rango, o null. Cuenta si el cliente nombró "cava" en ese rango, o si la
 * charla tiene la etiqueta "Cava" y arrancó en ese rango.
 */
export function interesCavaEnChat(conv, startMs, endMs) {
  for (const m of conv.messages ?? []) {
    if (m.role !== 'user') continue;
    const t = ms(m.timestamp);
    if (t >= startMs && t <= endMs && CAVA_RE.test(textoMsg(m))) return t;
  }
  const etiquetada = (conv.labels ?? []).some(l => /^cava$/i.test(String(l).trim()));
  if (etiquetada && enRango(conv.createdAt, startMs, endMs)) return ms(conv.createdAt);
  return null;
}

const reservaValida = (r) => r.estado !== 'cancelada';

/** Métricas del período, a partir de los datos crudos. */
export function resumirPeriodo({ eventos = [], reservasCava = [], conversaciones = [], precioPersonaCava = 0 }, startMs, endMs) {
  const reservas = reservasCava.filter(r => reservaValida(r) && enRango(r.createdAt, startMs, endMs));
  const toquesCava = eventos.filter(e => e.tipo === 'click_reservar_cava' && e.t >= startMs && e.t <= endMs).length;
  const visitasCava = eventos.filter(e => e.tipo === 'page_view' && e.categoria === 'cava' && e.t >= startMs && e.t <= endMs).length;
  const consultasChatCava = conversaciones.filter(c => interesCavaEnChat(c, startMs, endMs) !== null).length;
  const interesCava = toquesCava + consultasChatCava;

  const anticipaciones = reservas
    .map(r => (Date.parse(`${r.fecha}T12:00:00Z`) - Date.parse(`${claveDiaAR(ms(r.createdAt))}T12:00:00Z`)) / DIA_MS)
    .filter(d => Number.isFinite(d) && d >= 0);

  return {
    reservasCava: reservas.length,
    personasCava: reservas.reduce((s, r) => s + num(r.cantidadPersonas), 0),
    senasCava: reservas.reduce((s, r) => s + num(r.seña), 0),
    // Las reservas no guardan el total: se estima con el precio por persona actual.
    facturacionCava: reservas.reduce((s, r) => s + (num(r.total) || num(r.cantidadPersonas) * (num(r.precioPersona) || precioPersonaCava)), 0),
    anticipacionDias: anticipaciones.length ? Math.round(anticipaciones.reduce((a, b) => a + b, 0) / anticipaciones.length) : null,
    toquesCava,
    visitasCava,
    consultasChatCava,
    interesCava,
    tasaCierreCava: interesCava ? Math.round((reservas.length / interesCava) * 1000) / 10 : null,
    conversaciones: conversaciones.filter(c => hadActivityInRange(c, startMs, endMs)).length,
    conversacionesNuevas: conversaciones.filter(c => enRango(c.createdAt, startMs, endMs)).length,
  };
}

/**
 * Tendencia de La Cava: interés por la web, por el chat y reservas, por día
 * (períodos de hasta 31 días) o por semana de 7 días contados desde el
 * inicio. Cada tramo lleva el total de interés del tramo equivalente del
 * período anterior, para comparar.
 */
export function tendenciaCava(datos, r) {
  const paso = r.dias <= 31 ? 1 : 7;
  const tramos = [];
  for (let i = 0; i * paso < r.dias; i++) {
    const desde = sumarDias(r.desde, i * paso);
    const hasta = sumarDias(r.desde, Math.min(r.dias, (i + 1) * paso) - 1);
    const a = inicioDiaAR(desde).getTime();
    const b = finDiaAR(hasta).getTime();
    const largo = r.endMs - r.startMs + 1;
    const actual = resumirPeriodo(datos, a, b);
    const previo = resumirPeriodo(datos, a - largo, b - largo);
    tramos.push({
      desde, hasta,
      web: actual.toquesCava,
      chat: actual.consultasChatCava,
      reservas: actual.reservasCava,
      interesAnterior: previo.interesCava,
    });
  }
  return { paso: paso === 1 ? 'dia' : 'semana', tramos };
}

/** Fechas tomadas de La Cava y viernes/sábados libres en los próximos días. */
export function ocupacionCava({ reservasFuturas = [], cerrados = [] }, hoy, dias = DIAS_OCUPACION) {
  const tomadas = new Set(reservasFuturas.filter(reservaValida).map(r => r.fecha));
  const cerradas = new Set(cerrados);
  const hasta30 = sumarDias(hoy, 29);
  const hasta = sumarDias(hoy, dias - 1);
  const findesLibres = [];
  let findes30 = 0, findesTomados30 = 0;
  for (let i = 0; i < dias; i++) {
    const f = sumarDias(hoy, i);
    const dow = diaSemana(f);
    if (dow !== 5 && dow !== 6) continue;
    if (cerradas.has(f)) continue;
    if (f <= hasta30) { findes30++; if (tomadas.has(f)) findesTomados30++; }
    if (!tomadas.has(f)) findesLibres.push(f);
  }
  const fechas = [...tomadas].filter(f => f >= hoy && f <= hasta).sort();
  return {
    hoy, hasta,
    tomadas30: fechas.filter(f => f <= hasta30).length,
    tomadas60: fechas.length,
    findes30, findesTomados30,
    fechasTomadas: fechas,
    findesLibres,
  };
}

export async function analyticsPeriodo({ desde, hasta }, { now = new Date() } = {}) {
  const r = rangosPeriodo(desde, hasta);
  const db = getDb();
  const ts = (x) => admin.firestore.Timestamp.fromMillis(x);
  const hoy = ahoraAR(now).fecha;
  const finOcupacion = sumarDias(hoy, DIAS_OCUPACION - 1);

  const [evSnap, cavaSnap, convSnap, futurasSnap, calSnap, cfg] = await Promise.all([
    db.collection('selvaggio_analytics_eventos')
      .where('timestamp', '>=', ts(r.prevStartMs)).where('timestamp', '<=', ts(r.endMs))
      .select('tipo', 'categoria', 'timestamp').get(),
    // createdAt de las reservas es un string ISO (UTC): se compara como texto.
    db.collection('selvaggio_reservas_cava')
      .where('createdAt', '>=', new Date(r.prevStartMs).toISOString())
      .where('createdAt', '<=', new Date(r.endMs).toISOString())
      .select('createdAt', 'estado', 'fecha', 'cantidadPersonas', 'precioPersona', 'seña', 'total').get(),
    // Mismo criterio que Estadísticas del bot: actividad dentro del período.
    db.collection('bot-selvaggio_conversations')
      .where('updatedAt', '>=', ts(r.prevStartMs))
      .select('createdAt', 'escalatedAt', 'resolvedAt', 'messages', 'labels').get(),
    db.collection('selvaggio_reservas_cava')
      .where('fecha', '>=', hoy).where('fecha', '<=', finOcupacion)
      .select('fecha', 'estado').get(),
    db.collection('selvaggio_calendario')
      .where('fecha', '>=', hoy).where('fecha', '<=', finOcupacion).get(),
    configReservas(),
  ]);

  const eventos = evSnap.docs
    .map(d => { const e = d.data(); return { tipo: e.tipo, categoria: e.categoria, t: ms(e.timestamp) }; })
    .filter(e => Number.isFinite(e.t));
  const datos = {
    eventos,
    reservasCava: cavaSnap.docs.map(d => d.data()),
    conversaciones: convSnap.docs.map(d => d.data()),
    precioPersonaCava: cfg.cavaPrecioPersona,
  };

  return {
    desde: r.desde,
    hasta: r.hasta,
    inicioActualMs: r.startMs,
    precioPersonaCava: cfg.cavaPrecioPersona,
    // Los page_view solo se usan para el resumen (y son la mayoría): no viajan.
    eventos: eventos.filter(e => e.tipo !== 'page_view'),
    resumen: {
      actual: resumirPeriodo(datos, r.startMs, r.endMs),
      anterior: resumirPeriodo(datos, r.prevStartMs, r.prevEndMs),
    },
    tendenciaCava: tendenciaCava(datos, r),
    ocupacionCava: ocupacionCava({
      reservasFuturas: futurasSnap.docs.map(d => d.data()),
      cerrados: calSnap.docs.map(d => d.data()).filter(c => c.tipo === 'cerrar').map(c => c.fecha),
    }, hoy),
  };
}
