import { MARIDAJES } from '../data/maridajes.js';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const GENERICAS = new Set(['queso', 'quesos', 'reserva', 'con', 'jamon', 'para']);
// Palabras que identifican cada ingrediente del juego ("Jamón crudo reserva" → "crudo").
const claves = (ing) => norm(ing).split(/[^a-z]+/).filter((w) => w.length >= 4 && !GENERICAS.has(w));

/**
 * Cepa recomendada para lo que lleva la picada (mismo criterio que el juego
 * de maridaje del diseño: gana la cepa con más ingredientes en común).
 * `texto` es todo lo que se sabe de la picada: descripción + opciones elegidas.
 */
/** Cepas ordenadas por afinidad con la comida (solo las que suman algo). */
export function cepasPara(texto) {
  const t = norm(texto);
  if (!t.trim()) return [];
  return MARIDAJES
    .map((m, i) => ({ m, i, p: m.i.filter((ing) => claves(ing).some((w) => t.includes(w))).length }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p || a.i - b.i)
    .map((x) => x.m);
}

export const cepaPara = (texto) => cepasPara(texto)[0] ?? null;

export const esSeccionVino = (sec) => /vino/i.test(sec.nombre);

/** Opción de la sección "Vino" que coincide con la cepa (las opciones son "Cepa / Bodega"). */
export function opcionDeCepa(sec, cepa) {
  if (!cepa) return null;
  const c = norm(cepa.n);
  const alias = { rose: ['rose', 'rosado'], espumante: ['espumante', 'extra brut', 'brut', 'champ'] }[c.replace(/[^a-z]/g, '')] ?? [c];
  return sec.opciones.find((o) => alias.some((a) => norm(o.nombre).includes(a))) ?? null;
}
