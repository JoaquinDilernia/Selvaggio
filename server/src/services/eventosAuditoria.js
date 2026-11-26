// Rastro y papelera de los eventos (Contenido → Eventos). Módulo puro: qué se
// guarda y cómo se describe un cambio. Firestore vive en eventosAuditoria.service.js.

export const CAMPOS_EVENTO = [
  'titulo', 'fecha', 'horaInicio', 'horaFin', 'descripcion', 'infoBot', 'imagen',
  'visible', 'esPopup', 'popupImagen', 'ctaTexto', 'ctaLink', 'esPago', 'precio', 'sena', 'alias',
];

// Nombre legible de cada campo para el historial.
export const NOMBRE_CAMPO = {
  titulo: 'título', fecha: 'fecha', horaInicio: 'hora de inicio', horaFin: 'hora de fin',
  descripcion: 'descripción', infoBot: 'info para el bot', imagen: 'imagen', visible: 'visible',
  esPopup: 'popup', popupImagen: 'imagen del popup', ctaTexto: 'texto del botón', ctaLink: 'link del botón',
  esPago: 'pago', precio: 'precio', sena: 'seña', alias: 'alias',
};

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const httpError = (status, message) => Object.assign(new Error(message), { status });

/** Valida y normaliza lo que manda el panel para un evento suelto. */
export function limpiarEvento(body = {}, { parcial = false } = {}) {
  const e = {};
  for (const k of CAMPOS_EVENTO) {
    if (body[k] === undefined) continue;
    if (k === 'visible' || k === 'esPopup') e[k] = body[k] === true;
    else if (k === 'esPago') e[k] = body[k] === true ? true : body[k] === false ? false : null;
    else e[k] = String(body[k] ?? '').trim();
  }
  if (!parcial || e.titulo !== undefined) if (!e.titulo) throw httpError(400, 'Falta el título');
  if (!parcial || e.fecha !== undefined) if (!FECHA_RE.test(e.fecha ?? '')) throw httpError(400, 'Falta la fecha');
  if (e.esPago === true && e.precio !== undefined && !e.precio) throw httpError(400, 'Si el evento es pago, cargá el precio');
  return e;
}

const igual = (a, b) => (a ?? '') === (b ?? '') || JSON.stringify(a ?? '') === JSON.stringify(b ?? '');

/** Campos que cambian de `antes` a `despues` (sólo los que vienen en `despues`). */
export function camposCambiados(antes = {}, despues = {}) {
  return CAMPOS_EVENTO.filter(k => k in despues && !igual(antes[k], despues[k]));
}

/** Texto corto del cambio para el historial: "título, fecha y precio". */
export function describirCambios(campos) {
  const n = campos.map(k => NOMBRE_CAMPO[k] ?? k);
  if (n.length <= 1) return n.join('');
  return `${n.slice(0, -1).join(', ')} y ${n.at(-1)}`;
}

/** Quién hizo el cambio, a partir del usuario del panel. */
export function quien(agent) {
  if (!agent) return { nombre: 'Sistema', email: null };
  return { nombre: agent.name || agent.email || 'Usuario', email: agent.email ?? null };
}
