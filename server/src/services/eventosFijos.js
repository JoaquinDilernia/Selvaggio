// Eventos fijos (semanales): una "serie" (todos los viernes, Pintura y Vino)
// se materializa en eventos normales de selvaggio_eventos, uno por fecha, para
// que la web, el bot, el calendario y las reservas los lean sin cambios.
// Este módulo es puro: decide qué crear/actualizar/borrar. Firestore vive en
// eventosFijos.service.js.

export const HORIZONTE_DIAS = 56;

const CAMPOS = ['titulo', 'horaInicio', 'horaFin', 'descripcion', 'infoBot', 'imagen', 'ctaTexto', 'ctaLink', 'visible'];

const sumarDias = (fecha, n) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const diaSemana = (fecha) => new Date(`${fecha}T12:00:00Z`).getUTCDay();

export const idGenerado = (serieId, fecha) => `fijo_${serieId}_${fecha}`;

const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Fechas (YYYY-MM-DD) en que cae la serie dentro del horizonte. */
export function fechasDeSerie(serie, { hoy, dias = HORIZONTE_DIAS }) {
  if (serie.activo === false) return [];
  const inicio = serie.desde && serie.desde > hoy ? serie.desde : hoy;
  let fin = sumarDias(hoy, dias - 1);
  if (serie.hasta && serie.hasta < fin) fin = serie.hasta;
  const excluidas = new Set(serie.excluidas ?? []);
  const out = [];
  let f = sumarDias(inicio, (Number(serie.diaSemana) - diaSemana(inicio) + 7) % 7);
  for (; f <= fin; f = sumarDias(f, 7)) if (!excluidas.has(f)) out.push(f);
  return out;
}

/** Documento de selvaggio_eventos para una fecha de la serie. */
export function docGenerado(serie, fecha) {
  const d = { fecha, serieId: serie.id, generado: true, esPopup: false };
  for (const k of CAMPOS) d[k] = k === 'visible' ? serie.visible !== false : (serie[k] ?? '');
  return d;
}

/**
 * Qué escribir para dejar la serie al día.
 * @param existentes generados de esta serie con fecha >= hoy ({id, fecha, editadoManual?})
 * @param sueltos eventos cargados a mano (sin serieId), {fecha, titulo}: si uno
 *   tiene el mismo título esa fecha, no se genera otro encima.
 */
export function planSerie(serie, existentes, { hoy, dias = HORIZONTE_DIAS, sueltos = [] }) {
  const titulo = normalizar(serie.titulo);
  const tapadas = new Set(sueltos.filter(s => normalizar(s.titulo) === titulo).map(s => s.fecha));
  const fechas = fechasDeSerie(serie, { hoy, dias }).filter(f => !tapadas.has(f));
  const manuales = new Set(existentes.filter(e => e.editadoManual).map(e => e.fecha));
  const quedan = new Set(fechas);
  return {
    upserts: fechas.filter(f => !manuales.has(f)).map(f => ({ id: idGenerado(serie.id, f), data: docGenerado(serie, f) })),
    borrar: existentes.filter(e => !e.editadoManual && !quedan.has(e.fecha)).map(e => e.id),
  };
}
