import { Router } from 'express';
import {
  disponibilidadMesas, crearReservaMesa, cavaOcupada, seguimientoTakeaway, listarReservasBot,
} from '../services/reservas.service.js';

// ── Público (Etapa B): lo que hoy la landing lee directo de Firestore ────
// Devuelven solo lo mínimo (cupos, días ocupados, estado de un pedido), sin
// datos personales de otras reservas. Todavía NO los usa la web en
// producción: se conectan cuando se suba la landing de la rama etapa-b.

export const publicReservasRouter = Router();

// 60 consultas por minuto por IP: alcanza de sobra para un humano que
// navega el calendario y corta el scraping del seguimiento por número.
const hits = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const arr = (hits.get(req.ip) ?? []).filter(t => now - t < 60_000);
  if (arr.length >= 60) return res.status(429).json({ error: 'Demasiadas consultas, probá en un minuto' });
  arr.push(now); hits.set(req.ip, arr);
  next();
}
publicReservasRouter.use(rateLimit);

// Altas: 5 cada 10 minutos por IP (una familia reservando dos veces pasa;
// un script llenando cupos, no).
const altas = new Map();
function altaRateLimit(req, res, next) {
  const now = Date.now();
  const arr = (altas.get(req.ip) ?? []).filter(t => now - t < 10 * 60_000);
  if (arr.length >= 5) return res.status(429).json({ error: 'Demasiadas reservas seguidas, probá en unos minutos' });
  arr.push(now); altas.set(req.ip, arr);
  next();
}

function handle(fn) {
  return async (req, res) => {
    try { res.json(await fn(req)); }
    catch (err) { res.status(err.status ?? 500).json({ error: err.status ? err.message : 'Error interno' }); if (!err.status) console.error('[reservas]', err); }
  };
}

publicReservasRouter.get('/mesas/disponibilidad', handle(req => disponibilidadMesas(req.query.fecha)));
// Alta de reserva de mesa desde la web (reemplaza el addDoc directo).
publicReservasRouter.post('/reservas/mesas', altaRateLimit, handle(async req => {
  const reserva = await crearReservaMesa(req.body ?? {}, { origen: 'web' });
  return { ok: true, id: reserva.id, fecha: reserva.fecha, horario: reserva.horario };
}));
publicReservasRouter.get('/cava/ocupadas', handle(async req => ({ ocupadas: await cavaOcupada(req.query.desde, req.query.hasta) })));
publicReservasRouter.get('/takeaway/seguimiento', handle(async req => {
  const pedido = await seguimientoTakeaway(req.query.numero, req.query.tel);
  if (!pedido) throw Object.assign(new Error('No encontramos un pedido con esos datos'), { status: 404 });
  return { pedido };
}));

// ── Panel: reservas tomadas por el bot ───────────────────────────────────

export const reservasRouter = Router();
reservasRouter.get('/bot', handle(() => listarReservasBot()));
