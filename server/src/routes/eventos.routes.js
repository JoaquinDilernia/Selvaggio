import { Router } from 'express';
import {
  crearEvento, actualizarEvento, eliminarEvento, listarPapelera, restaurarEvento, listarLog,
} from '../services/eventosAuditoria.service.js';

// Contenido → Eventos (sueltos): el panel escribe por acá para que quede
// quién hizo cada cambio y lo borrado vaya a la papelera.
const router = Router();

function handle(fn) {
  return async (req, res) => {
    try {
      res.json(await fn(req));
    } catch (err) {
      if (!err.status) console.error('[eventos]', err);
      res.status(err.status ?? 500).json({ error: err.message });
    }
  };
}

router.get('/papelera', handle(async () => ({ papelera: await listarPapelera() })));
router.post('/papelera/:id/restaurar', handle(async (req) => ({ evento: await restaurarEvento(req.params.id, req.agent) })));
router.get('/historial', handle(async (req) => ({ historial: await listarLog({ eventoId: req.query.eventoId, limite: req.query.limite }) })));
router.post('/', handle(async (req) => ({ evento: await crearEvento(req.body, req.agent) })));
router.put('/:id', handle(async (req) => ({ evento: await actualizarEvento(req.params.id, req.body, req.agent) })));
router.delete('/:id', handle(async (req) => eliminarEvento(req.params.id, req.agent)));

export default router;
