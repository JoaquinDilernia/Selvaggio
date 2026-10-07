import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import webhookRoutes from './routes/webhook.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
import conversationRoutes from './routes/conversation.routes.js';
import configRoutes from './routes/config.routes.js';
import customerRoutes from './routes/customer.routes.js';
import testRoutes from './routes/test.routes.js';
import authRoutes from './routes/auth.routes.js';
import labelRoutes from './routes/label.routes.js';
import statsRoutes from './routes/stats.routes.js';
import quickReplyRoutes from './routes/quickreply.routes.js';
import templateRoutes from './routes/template.routes.js';
import costsRoutes from './routes/costs.routes.js';
import { initFirebase } from './services/firebase.service.js';
import areaRoutes from './routes/area.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import redirectRoutes from './routes/redirect.routes.js';
import { publicReservasRouter, reservasRouter } from './routes/reservas.routes.js';
import gestionRoutes from './routes/gestion.routes.js';
import { iniciarSyncClientes } from './services/clientesSync.service.js';
import { ensureBaseLabels } from './services/label.service.js';
import { seedAgentsIfNeeded } from './services/auth.service.js';
import { seedAreasIfNeeded } from './services/area.service.js';
import { requireAuth, requireAtLeastAtencionCliente, requireBotAccess } from './middleware/requireAuth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Railway pone un proxy delante: sin esto `req.ip` es siempre la IP del proxy
// y el rate-limit del login por IP no discrimina.
app.set('trust proxy', 1);

// Init Firebase
initFirebase();
seedAgentsIfNeeded().catch(err => console.error('[seed] Error seeding agents:', err));
seedAreasIfNeeded().catch(err => console.error('[seed] Error seeding areas:', err));
// Lista única de clientes: copia los clientes de la web a los contactos (cada 15 min).
iniciarSyncClientes();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000', // landing en dev (login de admin/caja/cocina)
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(s => s.trim()) : []),
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('CORS not allowed'));
  },
  credentials: true,
}));
app.use(morgan('dev'));

// Raw body para validación de firma Meta (debe ir antes del JSON parser)
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Routes (public)
app.use('/api/webhook', webhookRoutes);
app.use('/api/auth', authRoutes);
// Redirect de links cortos de difusiones — lo clickea el destinatario final
// desde WhatsApp, no un agente logueado, así que va sin requireAuth.
app.use('/r', redirectRoutes);
app.use('/api/public', publicReservasRouter);

// Routes (protected)
// Operador can access: conversations (filtered), labels
// atencion_cliente + admin: all of the below
app.use('/api/conversations', requireAuth, requireBotAccess, conversationRoutes);
app.use('/api/labels', requireAuth, requireBotAccess, labelRoutes);

// Requires at least atencion_cliente
app.use('/api/knowledge',     requireAuth, requireBotAccess, requireAtLeastAtencionCliente, knowledgeRoutes);
app.use('/api/config',        requireAuth, requireBotAccess, requireAtLeastAtencionCliente, configRoutes);
// Un operador que atiende una conversación derivada necesita ver el perfil
// del cliente (contacto, notas) y poder actualizarlo — no es una acción de
// administración global como el resto de este bloque.
app.use('/api/customers',     requireAuth, requireBotAccess, customerRoutes);
app.use('/api/test',          requireAuth, requireBotAccess, requireAtLeastAtencionCliente, testRoutes);
app.use('/api/stats',         requireAuth, requireBotAccess, requireAtLeastAtencionCliente, statsRoutes);
app.use('/api/quick-replies', requireAuth, requireBotAccess, requireAtLeastAtencionCliente, quickReplyRoutes);
// Los operadores necesitan leer templates: Conversations.jsx los usa para el
// modal de "nueva conversación" (disponible para cualquier rol) — la
// restricción de escritura (crear/sincronizar/borrar) vive dentro del router.
app.use('/api/templates',     requireAuth, requireBotAccess, templateRoutes);
app.use('/api/costs',         requireAuth, requireBotAccess, requireAtLeastAtencionCliente, costsRoutes);
// El propio router ya restringe crear/editar/borrar a requireAdmin —
// la lectura la necesita cualquier operador para derivar conversaciones.
app.use('/api/areas',         requireAuth, requireBotAccess, areaRoutes);
app.use('/api/reservas',      requireAuth, requireBotAccess, requireAtLeastAtencionCliente, reservasRouter);
app.use('/api/gestion',       requireAuth, requireBotAccess, requireAtLeastAtencionCliente, gestionRoutes);
app.use('/api/campaigns',     requireAuth, requireBotAccess, requireAtLeastAtencionCliente, campaignRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', service: 'selvaggio' });
});

app.listen(PORT, () => {
  console.log(`[server] Selvaggio server corriendo en puerto ${PORT}`);
  ensureBaseLabels().catch(err => console.error('[labels] No se pudieron crear las etiquetas base:', err.message));
});

export default app;
