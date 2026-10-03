import { Router } from 'express';
import {
  resumen, reservas, pedidosTakeaway, comandas, clientes, mensajes, coleccion,
} from '../services/gestion.service.js';

// Gestión (solo lectura) de los datos de la landing dentro del panel.
const router = Router();

function handle(fn) {
  return async (req, res) => {
    try { res.json(await fn(req)); }
    catch (err) {
      if (!err.status) console.error('[gestion]', err);
      res.status(err.status ?? 500).json({ error: err.status ? err.message : 'Error interno' });
    }
  };
}

router.get('/resumen', handle(() => resumen()));
router.get('/reservas', handle(req => reservas({ desde: req.query.desde, hasta: req.query.hasta })));
router.get('/takeaway', handle(() => pedidosTakeaway()));
router.get('/comandas', handle(() => comandas()));
router.get('/clientes', handle(req => clientes({ q: req.query.q })));
router.get('/mensajes', handle(() => mensajes()));
router.get('/coleccion/:nombre', handle(req => coleccion(req.params.nombre)));

export default router;
