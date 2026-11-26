import { Router } from 'express';
import { listarSeries, crearSerie, actualizarSerie, borrarSerie, excluirFecha } from '../services/eventosFijos.service.js';
import { registrar } from '../services/eventosAuditoria.service.js';
import { quien } from '../services/eventosAuditoria.js';

const DIAS = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
const deSerie = (s) => `Evento fijo: todos los ${DIAS[s.diaSemana] ?? '?'}${s.hasta ? `, hasta el ${s.hasta}` : ', sin fecha de fin'}`;

// Contenido → Eventos: eventos fijos semanales. El panel escribe por acá (no
// directo a Firestore) para que el server regenere las fechas al guardar.
const router = Router();

function handle(fn) {
  return async (req, res) => {
    try {
      res.json(await fn(req));
    } catch (err) {
      if (!err.status) console.error('[eventos-fijos]', err);
      res.status(err.status ?? 500).json({ error: err.message });
    }
  };
}

router.get('/', handle(async () => ({ series: await listarSeries() })));
router.post('/', handle(async (req) => {
  const serie = await crearSerie(req.body);
  await registrar({ eventoId: `serie:${serie.id}`, titulo: serie.titulo, fecha: serie.desde, accion: 'creado', detalle: deSerie(serie), por: quien(req.agent) });
  return { serie };
}));
router.put('/:id', handle(async (req) => {
  const serie = await actualizarSerie(req.params.id, req.body);
  await registrar({ eventoId: `serie:${serie.id}`, titulo: serie.titulo, fecha: serie.desde, accion: 'editado', detalle: deSerie(serie), por: quien(req.agent) });
  return { serie };
}));
router.delete('/:id', handle(async (req) => {
  const serie = (await listarSeries()).find(s => s.id === req.params.id);
  const r = await borrarSerie(req.params.id);
  await registrar({ eventoId: `serie:${req.params.id}`, titulo: serie?.titulo ?? '', fecha: '', accion: 'eliminado', detalle: `Evento fijo eliminado (${r.borrados ?? 0} fecha(s) próximas borradas)`, por: quien(req.agent) });
  return { ok: true, ...r };
}));
router.post('/:id/excluir', handle(async (req) => {
  const fecha = req.body?.fecha;
  const serie = (await listarSeries()).find(s => s.id === req.params.id);
  const docId = await excluirFecha(req.params.id, fecha, req.body?.eventoId);
  await registrar({ eventoId: docId, titulo: serie?.titulo ?? '', fecha, accion: 'eliminado', detalle: 'Se sacó esta fecha del evento fijo (las demás semanas siguen)', por: quien(req.agent) });
  return { ok: true };
}));

export default router;
