import { MARIDAJES } from '../data/maridajes.js';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Vino recomendado según lo que eligió (mismo criterio que el armador del
 * diseño: la cepa que más ingredientes elegidos tiene en su maridaje).
 * Compara por nombre aproximado porque el catálogo real puede escribirlos distinto.
 */
export function vinoPara(nombresElegidos) {
  const elegidos = nombresElegidos.map(norm).filter(Boolean);
  if (!elegidos.length) return null;
  let mejor = null; let puntos = 0;
  for (const m of MARIDAJES) {
    const p = m.i.filter((ing) => {
      const n = norm(ing);
      return elegidos.some((e) => e.includes(n) || n.includes(e) || n.split(' ')[0] === e.split(' ')[0]);
    }).length;
    if (p > puntos) { puntos = p; mejor = m; }
  }
  return mejor ?? MARIDAJES[0];
}
