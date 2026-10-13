import { Router } from 'express';
import { avisarPedidoListo } from '../services/comandas.service.js';

// Comandas de Caja → Cocina (sector Cocina del panel).
const router = Router();

router.post('/:id/avisar-listo', async (req, res) => {
  try {
    res.json(await avisarPedidoListo(req.params.id, { sentBy: req.agent.email }));
  } catch (err) {
    if (!err.status) console.error('[comandas]', err);
    res.status(err.status ?? 500).json({ error: err.status ? err.message : 'Error interno' });
  }
});

export default router;
