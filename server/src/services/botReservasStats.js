// Estadísticas de lo que tomó el bot: reservas de mesa (y de eventos de la
// agenda) y pedidos de take away, comparado con lo que entró por la web.
// Funciones puras: la ruta (/api/stats/reservas) trae los documentos.

const MARCA_BOT = 'Por WhatsApp (bot)'; // misma marca que reservas.service

const toMs = (v) => {
  if (!v) return null;
  if (typeof v.toMillis === 'function') return v.toMillis();
  const ms = new Date(v).getTime();
  return Number.isNaN(ms) ? null : ms;
};

const cancelada = (estado) => /cancel/i.test(String(estado ?? ''));

export function esReservaDelBot(r) {
  return r.origen === 'bot' || String(r.comentarios ?? '').startsWith(MARCA_BOT);
}

function enRango(doc, startMs, endMs) {
  const ms = toMs(doc.createdAt);
  return ms !== null && ms >= startMs && ms <= endMs;
}

/**
 * @param {object[]} mesas    docs de selvaggio_reservas_mesas
 * @param {object[]} pedidos  docs de selvaggio_takeaway_pedidos
 */
export function resumirReservasBot(mesas, pedidos, { startMs, endMs }) {
  const ms = mesas.filter(r => enRango(r, startMs, endMs));
  const tw = pedidos.filter(p => enRango(p, startMs, endMs));

  const mesasBot = ms.filter(esReservaDelBot);
  const mesasBotOk = mesasBot.filter(r => !cancelada(r.estado));
  const mesasWebOk = ms.filter(r => !esReservaDelBot(r) && !cancelada(r.estado));

  const twBot = tw.filter(p => p.origen === 'bot');
  const twBotOk = twBot.filter(p => !cancelada(p.estado));
  const twWebOk = tw.filter(p => p.origen !== 'bot' && !cancelada(p.estado));
  const suma = (arr) => arr.reduce((acc, p) => acc + (Number(p.total) || 0), 0);

  const share = (bot, web) => (bot + web > 0 ? Math.round((bot / (bot + web)) * 100) : 0);

  return {
    mesas: {
      bot: mesasBotOk.length,
      web: mesasWebOk.length,
      sharePct: share(mesasBotOk.length, mesasWebOk.length),
      personasBot: mesasBotOk.reduce((acc, r) => acc + (parseInt(r.cantidadPersonas, 10) || 0), 0),
      eventosBot: mesasBotOk.filter(r => r.evento || r.eventoId).length,
      canceladasBot: mesasBot.length - mesasBotOk.length,
    },
    takeaway: {
      bot: twBotOk.length,
      web: twWebOk.length,
      sharePct: share(twBotOk.length, twWebOk.length),
      totalBot: suma(twBotOk),
      totalWeb: suma(twWebOk),
      canceladosBot: twBot.length - twBotOk.length,
    },
    recientes: [
      ...mesasBot.map(r => ({
        tipo: r.evento || r.eventoId ? 'evento' : 'mesa',
        id: r.id,
        createdAt: new Date(toMs(r.createdAt)).toISOString(),
        nombre: r.nombre ?? '',
        contactId: r.contactId ?? null,
        detalle: [r.evento, r.fecha, r.horario, r.cantidadPersonas ? `${r.cantidadPersonas} pers.` : null].filter(Boolean).join(' · '),
        estado: r.estado ?? 'confirmada',
      })),
      ...twBot.map(p => ({
        tipo: 'takeaway',
        id: p.id,
        createdAt: new Date(toMs(p.createdAt)).toISOString(),
        nombre: p.nombre ?? '',
        contactId: p.contactId ?? null,
        detalle: [p.numeroPedido, p.fechaRetiro, p.horaRetiro].filter(Boolean).join(' · '),
        total: Number(p.total) || 0,
        estado: p.estado ?? 'pendiente',
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}
