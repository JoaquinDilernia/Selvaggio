import { Router } from 'express';
import multer from 'multer';
import admin from 'firebase-admin';
import {
  disponibilidadMesas, crearReservaMesa, cavaOcupada, seguimientoTakeaway, listarReservasBot, crearReservaCava,
} from '../services/reservas.service.js';
import { previewCupon, crearPedidoTakeaway, listarPedidosBot } from '../services/takeaway.service.js';
import { subirArchivo } from '../services/storage.service.js';

// Comprobantes: imagen (ya comprimida en el navegador) o PDF, hasta 10 MB.
const uploadComprobante = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype) || file.mimetype === 'application/pdf'),
});

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

// Alta de La Cava con el comprobante de la seña (multipart: campos + `comprobante`).
// Si el día se ocupó mientras subía, se borra el archivo que ya se había subido.
publicReservasRouter.post('/reservas/cava', altaRateLimit, uploadComprobante.single('comprobante'), handle(async req => {
  if (!req.file) throw Object.assign(new Error('Adjuntá el comprobante de la seña (imagen o PDF, hasta 10 MB)'), { status: 400 });
  const { url, path } = await subirArchivo(req.file.buffer, {
    carpeta: 'comprobantes', nombre: req.file.originalname, contentType: req.file.mimetype,
  });
  try {
    const reserva = await crearReservaCava(req.body ?? {}, { comprobanteUrl: url, comprobantePath: path });
    return { ok: true, id: reserva.id, fecha: reserva.fecha };
  } catch (e) {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
    await admin.storage().bucket(bucketName).file(path).delete().catch(() => {});
    throw e;
  }
}));

// ── Take away ────────────────────────────────────────────────────────────
// El navegador manda solo qué eligió (ids y cantidades); precios, descuentos
// y cupón se calculan acá con el catálogo.
publicReservasRouter.post('/takeaway/cupon', handle(req => previewCupon(req.body ?? {})));
publicReservasRouter.post('/takeaway/pedidos', altaRateLimit, handle(req => crearPedidoTakeaway(req.body ?? {})));
publicReservasRouter.get('/takeaway/seguimiento', handle(async req => {
  const pedido = await seguimientoTakeaway(req.query.numero, req.query.tel);
  if (!pedido) throw Object.assign(new Error('No encontramos un pedido con esos datos'), { status: 404 });
  return { pedido };
}));

// Errores de multer (archivo > 10 MB, más de un archivo) y JSON mal formado:
// respuesta JSON con mensaje para la persona en vez del 500 en HTML de Express.
// eslint-disable-next-line no-unused-vars
publicReservasRouter.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'El comprobante pesa más de 10 MB. Mandá una foto o un PDF más liviano.'
      : 'No se pudo leer el archivo adjunto';
    return res.status(400).json({ error: msg });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Datos inválidos' });
  console.error('[public]', err);
  res.status(500).json({ error: 'Error interno' });
});

// ── Panel: reservas tomadas por el bot ───────────────────────────────────

export const reservasRouter = Router();
reservasRouter.get('/bot', handle(() => listarReservasBot()));
reservasRouter.get('/bot-pedidos', handle(() => listarPedidosBot()));
