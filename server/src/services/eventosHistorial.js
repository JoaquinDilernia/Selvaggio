// Memoria de eventos pasados (lógica pura; la parte de Firestore está en
// eventosHistorial.service.js).
//
// El equipo borra de la web los eventos que ya pasaron, así que el bot no
// tenía cómo saber que "Astronight" existe y se repite: decía "no tenemos ese
// evento". Guardamos nuestra propia copia de cada fecha (bot-selvaggio_eventos_historial)
// y la completamos con las reservas viejas que dicen "Evento: <título>", para
// que el bot pueda contestar "lo hacemos cada tanto, la última fue el X y
// todavía no hay nueva fecha".

const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const UN_DIA_MS = 24 * 60 * 60 * 1000;

/** "Cata de vino ´+ Menú de pasos" y "Cata de vino - menú de pasos" → misma clave. "Astro night" = "Astronight". */
export function claveEvento(titulo) {
  return String(titulo || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export const idHistorial = (fecha, clave) => `${fecha}_${clave}`.slice(0, 200);

const diaDe = (fecha) => NOMBRES_DIA[new Date(`${fecha}T12:00:00Z`).getUTCDay()];

function diasEntre(a, b) {
  return Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / UN_DIA_MS);
}

/** Doc de historial para un evento de selvaggio_eventos. */
export function docDesdeEvento(e) {
  const clave = claveEvento(e.titulo);
  if (!clave || !/^\d{4}-\d{2}-\d{2}$/.test(e.fecha || '')) return null;
  return {
    id: idHistorial(e.fecha, clave),
    data: {
      titulo: String(e.titulo).trim(),
      clave,
      fecha: e.fecha,
      horario: [e.horaInicio, e.horaFin].filter(Boolean).join(' a ') || null,
      descripcion: e.descripcion ? String(e.descripcion).replace(/\s+/g, ' ').trim().slice(0, 400) : null,
      fuente: 'agenda',
      eventoId: e.id,
      ...(e.visible === false && { oculto: true }),
    },
  };
}

/**
 * Qué escribir/borrar en el historial.
 * - Cada evento de la agenda (pasado o futuro) queda copiado.
 * - Una fecha FUTURA que desapareció de la agenda se cancela: se borra.
 *   Las pasadas no se borran nunca (el equipo limpia la web después del evento).
 * - Reservas pasadas con "Evento: <título conocido>" suman fechas que ya no
 *   están en la agenda (solo si se pasa `reservas`).
 */
export function planHistorial({ eventos = [], existentes = [], reservas = null, hoy }) {
  const upserts = new Map();
  for (const e of eventos) {
    const d = docDesdeEvento(e);
    if (d) upserts.set(d.id, d);
  }

  const idsAgenda = new Set(eventos.map(e => e.id));
  const borrar = existentes
    .filter(h => h.fuente === 'agenda' && h.fecha >= hoy && !idsAgenda.has(h.eventoId) && !upserts.has(h.id))
    .map(h => h.id);

  if (reservas) {
    // Títulos conocidos (agenda + historial), los más largos primero para que
    // "Cata de vino + menú de pasos" gane sobre un posible "Cata de vino".
    const titulos = new Map();
    for (const x of [...existentes, ...[...upserts.values()].map(u => u.data)]) {
      if (x.clave && !titulos.has(x.clave)) titulos.set(x.clave, x.titulo);
    }
    const claves = [...titulos.keys()].sort((a, b) => b.length - a.length);
    const yaEsta = new Set([...existentes.map(h => h.id), ...upserts.keys()]);
    for (const r of reservas) {
      if (!r.fecha || r.fecha >= hoy) continue;
      const m = String(r.comentarios || '').match(/evento\s*:\s*(.+)/i);
      if (!m) continue;
      const texto = claveEvento(m[1]);
      const clave = claves.find(c => texto.startsWith(c));
      if (!clave) continue;
      const id = idHistorial(r.fecha, clave);
      if (yaEsta.has(id)) continue;
      yaEsta.add(id);
      upserts.set(id, { id, data: { titulo: titulos.get(clave), clave, fecha: r.fecha, fuente: 'reservas' } });
    }
  }

  return { upserts: [...upserts.values()], borrar };
}

function frecuenciaAprox(fechas) {
  if (fechas.length < 2) return null;
  const ordenadas = [...fechas].sort();
  const gaps = ordenadas.slice(1).map((f, i) => diasEntre(ordenadas[i], f)).sort((a, b) => a - b);
  const mediana = gaps[Math.floor(gaps.length / 2)];
  if (mediana <= 8) return 'más o menos todas las semanas';
  if (mediana <= 17) return 'más o menos cada dos semanas';
  if (mediana <= 45) return 'más o menos una vez por mes';
  return `cada tanto (aprox. cada ${Math.round(mediana / 30)} meses)`;
}

/**
 * Eventos que ya hicimos y hoy no tienen fecha en la agenda, agrupados por
 * título. `excluirTitulos`: los que sí tienen próxima fecha (ya los ve el bot).
 */
export function resumenAnteriores(docs, { hoy, excluirTitulos = [], max = 25 } = {}) {
  const excluir = new Set(excluirTitulos.map(claveEvento));
  const grupos = new Map();
  for (const d of docs) {
    if (!d.clave || !d.fecha || d.fecha >= hoy || d.oculto || excluir.has(d.clave)) continue;
    const g = grupos.get(d.clave) || [];
    g.push(d);
    grupos.set(d.clave, g);
  }
  return [...grupos.values()].map(g => {
    g.sort((a, b) => b.fecha.localeCompare(a.fecha));
    const ultima = g[0];
    const conDatos = g.find(x => x.descripcion || x.horario) || ultima;
    const fechas = [...new Set(g.map(x => x.fecha))];
    return {
      titulo: ultima.titulo,
      ultimaFecha: ultima.fecha,
      dia: diaDe(ultima.fecha),
      vecesQueLoHicimos: fechas.length,
      fechasAnteriores: fechas.slice(0, 5),
      ...(frecuenciaAprox(fechas) && { frecuencia: frecuenciaAprox(fechas) }),
      ...(conDatos.horario && { horario: conDatos.horario }),
      ...(conDatos.descripcion && { descripcion: conDatos.descripcion }),
      proximaFecha: 'todavía no hay',
    };
  }).sort((a, b) => b.ultimaFecha.localeCompare(a.ultimaFecha)).slice(0, max);
}
