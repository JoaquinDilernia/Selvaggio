import { Router } from 'express';
import { listarSeries, crearSerie, actualizarSerie, borrarSerie, excluirFecha } from '../services/eventosFijos.service.js';

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
router.post('/', handle(async (req) => ({ serie: await crearSerie(req.body) })));
router.put('/:id', handle(async (req) => ({ serie: await actualizarSerie(req.params.id, req.body) })));
router.delete('/:id', handle(async (req) => ({ ok: true, ...(await borrarSerie(req.params.id)) })));
router.post('/:id/excluir', handle(async (req) => {
  await excluirFecha(req.params.id, req.body?.fecha);
  return { ok: true };
}));

export default router;
