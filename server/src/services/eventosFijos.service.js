import admin from 'firebase-admin';
import { getDb } from './firebase.service.js';
import { ahoraAR, FECHA_RE } from './reservas.service.js';
import { planSerie, idGenerado } from './eventosFijos.js';

// Series de eventos fijos (selvaggio_eventos_fijos) → eventos por fecha en
// selvaggio_eventos. Ver eventosFijos.js y docs/superpowers/specs/2026-11-13-eventos-fijos-design.md.
const SERIES = 'selvaggio_eventos_fijos';
const EVENTOS = 'selvaggio_eventos';
const UN_DIA_MS = 24 * 60 * 60 * 1000;

const CAMPOS_TEXTO = ['titulo', 'horaInicio', 'horaFin', 'descripcion', 'infoBot', 'imagen', 'ctaTexto', 'ctaLink', 'precio', 'sena', 'alias'];

const httpError = (status, message) => Object.assign(new Error(message), { status });

/** Valida y normaliza lo que manda el panel. Tira 400 con mensaje para mostrar. */
export function limpiarSerie(body = {}, { parcial = false } = {}) {
  const s = {};
  for (const k of CAMPOS_TEXTO) if (body[k] !== undefined) s[k] = String(body[k] ?? '').trim();
  if (body.visible !== undefined) s.visible = body.visible !== false;
  if (body.activo !== undefined) s.activo = body.activo !== false;
  if (body.esPago !== undefined && body.esPago !== null) s.esPago = body.esPago === true;
  if (body.diaSemana !== undefined) s.diaSemana = Number(body.diaSemana);
  if (body.desde !== undefined) s.desde = String(body.desde || '');
  if (body.hasta !== undefined) s.hasta = String(body.hasta || '');

  if (!parcial || s.titulo !== undefined) if (!s.titulo) throw httpError(400, 'Falta el título');
  if (!parcial || s.diaSemana !== undefined) {
    if (!Number.isInteger(s.diaSemana) || s.diaSemana < 0 || s.diaSemana > 6) throw httpError(400, 'Elegí el día de la semana');
  }
  if (!parcial && !s.desde) s.desde = ahoraAR().fecha;
  if (s.desde && !FECHA_RE.test(s.desde)) throw httpError(400, 'Fecha "desde" inválida');
  if (s.hasta && !FECHA_RE.test(s.hasta)) throw httpError(400, 'Fecha "hasta" inválida');
  if (s.hasta && s.desde && s.hasta < s.desde) throw httpError(400, '"Hasta" no puede ser antes de "desde"');
  if (!parcial) {
    s.visible ??= true;
    s.activo ??= true;
  }
  return s;
}

export async function listarSeries() {
  const snap = await getDb().collection(SERIES).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.diaSemana - b.diaSemana) || String(a.titulo).localeCompare(String(b.titulo)));
}

async function obtenerSerie(id) {
  const doc = await getDb().collection(SERIES).doc(String(id)).get();
  if (!doc.exists) throw httpError(404, 'Evento fijo no encontrado');
  return { id: doc.id, ...doc.data() };
}

/** Escribe/borra los eventos por fecha de una serie (o de una serie que ya no existe: `serie = null`). */
async function aplicarSerie(serieId, serie) {
  const db = getDb();
  const hoy = ahoraAR().fecha;
  const futuros = (await db.collection(EVENTOS).where('fecha', '>=', hoy).get()).docs.map(d => ({ id: d.id, ...d.data() }));
  const existentes = futuros.filter(e => e.serieId === serieId);
  const sueltos = futuros.filter(e => !e.serieId);
  const { upserts, borrar } = serie
    ? planSerie(serie, existentes, { hoy, sueltos })
    : planSerie({ id: serieId, activo: false }, existentes, { hoy });

  const ahora = new Date().toISOString();
  const ops = [
    ...upserts.map(u => b => b.set(db.collection(EVENTOS).doc(u.id), { ...u.data, actualizadoEn: ahora }, { merge: true })),
    ...borrar.map(id => b => b.delete(db.collection(EVENTOS).doc(id))),
  ];
  for (let i = 0; i < ops.length; i += 450) {
    const batch = db.batch();
    ops.slice(i, i + 450).forEach(op => op(batch));
    await batch.commit();
  }
  return { generados: upserts.length, borrados: borrar.length };
}

export async function sincronizarSerie(id) {
  return aplicarSerie(id, await obtenerSerie(id));
}

export async function sincronizarTodas() {
  const series = await listarSeries();
  for (const s of series) {
    try {
      const r = await aplicarSerie(s.id, s);
      if (r.generados || r.borrados) console.log(`[eventos-fijos] "${s.titulo}": ${r.generados} al día, ${r.borrados} borrados`);
    } catch (err) {
      console.error(`[eventos-fijos] Error con "${s.titulo}":`, err.message);
    }
  }
}

export async function crearSerie(body) {
  const data = { ...limpiarSerie(body), excluidas: [], creadoEn: new Date().toISOString() };
  const ref = await getDb().collection(SERIES).add(data);
  await sincronizarSerie(ref.id);
  return { id: ref.id, ...data };
}

export async function actualizarSerie(id, body) {
  const cambios = limpiarSerie(body, { parcial: true });
  const actual = await obtenerSerie(id);
  const desde = cambios.desde ?? actual.desde;
  const hasta = cambios.hasta ?? actual.hasta;
  if (hasta && desde && hasta < desde) throw httpError(400, '"Hasta" no puede ser antes de "desde"');
  await getDb().collection(SERIES).doc(id).update({ ...cambios, actualizadoEn: new Date().toISOString() });
  await sincronizarSerie(id);
  return obtenerSerie(id);
}

export async function borrarSerie(id) {
  await obtenerSerie(id);
  await getDb().collection(SERIES).doc(id).delete();
  return aplicarSerie(id, null);
}

/** Saca una fecha de la serie (feriado, no se hace ese día): no se vuelve a generar. */
export async function excluirFecha(id, fecha) {
  if (!FECHA_RE.test(String(fecha))) throw httpError(400, 'Fecha inválida');
  await obtenerSerie(id);
  const db = getDb();
  await db.collection(SERIES).doc(id).update({ excluidas: admin.firestore.FieldValue.arrayUnion(fecha) });
  await db.collection(EVENTOS).doc(idGenerado(id, fecha)).delete();
}

let timer = null;
export function iniciarJobEventosFijos() {
  const correr = () => sincronizarTodas().catch(err => console.error('[eventos-fijos] Job:', err.message));
  correr();
  if (!timer) timer = setInterval(correr, UN_DIA_MS);
}
