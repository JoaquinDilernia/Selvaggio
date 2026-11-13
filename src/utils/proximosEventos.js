// Eventos fijos (todos los viernes…) se guardan como un evento por fecha con
// el mismo serieId. En la lista de la web se muestra solo la próxima fecha de
// cada uno; los eventos sueltos pasan todos. Espera la lista ya ordenada.
export function unaFechaPorSerie(eventos) {
  const vistas = new Set();
  return eventos.filter((ev) => {
    if (!ev.serieId) return true;
    if (vistas.has(ev.serieId)) return false;
    vistas.add(ev.serieId);
    return true;
  });
}
