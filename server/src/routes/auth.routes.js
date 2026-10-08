import { Router } from 'express';
import admin from 'firebase-admin';
import {
  validateCredentials, generateToken, updateProfile,
  createUser, listUsers, deleteUser, updateUser, VALID_ROLES, getAgentById,
} from '../services/auth.service.js';
import { requireAuth, requireAdmin, requireAtLeastAtencionCliente } from '../middleware/requireAuth.js';

const router = Router();

// Corta la sesión de Firebase (landing: admin/caja/cocina) de un usuario al
// borrarlo o cambiarle el rol — si no, seguiría entrando con el claim viejo.
async function revokeFirebaseSession(agentId) {
  const uid = `selvaggio:${agentId}`;
  try {
    await admin.auth().revokeRefreshTokens(uid);
  } catch (err) {
    // auth/user-not-found: nunca entró a la landing, no hay sesión que cortar
    if (err.code !== 'auth/user-not-found') console.error('[auth] Error revocando sesión:', err.message);
  }
}

// 8 intentos cada 15 min por IP+email (mismo criterio que BOT-PMCSALUD).
const loginHits = new Map();
function loginRateLimit(req, res, next) {
  const email = (req.body?.email ?? '').toLowerCase().trim();
  const key = `${req.ip}:${email}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const arr = (loginHits.get(key) ?? []).filter(t => now - t < windowMs);
  if (arr.length >= 8) return res.status(429).json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' });
  arr.push(now); loginHits.set(key, arr);
  next();
}

router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    const agent = await validateCredentials(email, password);
    if (!agent) return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    const token = generateToken(agent);
    res.json({ token, agent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ agent: req.agent });
});

// Token de Firebase Auth para las pantallas que todavía viven en la landing
// (admin, contenidos, caja, cocina) y hablan directo con Firestore: la landing
// se loguea contra este backend y con este token hace signInWithCustomToken.
// El claim `selvaggioRole` es lo que miran ProtectedRoute y las reglas.
router.post('/firebase-token', requireAuth, async (req, res) => {
  try {
    const firebaseToken = await admin.auth().createCustomToken(`selvaggio:${req.agent.id}`, {
      selvaggioRole: req.agent.role,
      // Sectores del panel (caja, cocina, gestion, contenido…): lo que miran
      // las reglas para las pantallas que hablan directo con Firestore.
      selvaggioSectores: req.agent.sectores,
    });
    res.json({ firebaseToken, agent: req.agent });
  } catch (err) {
    console.error('[auth] Error creando custom token:', err.message);
    res.status(500).json({ error: 'No se pudo iniciar sesión en Firebase' });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    if (newPassword) {
      const valid = await validateCredentials(req.agent.email, currentPassword);
      if (!valid) return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }
    const updated = await updateProfile(req.agent.id, {
      name: name?.trim() || undefined,
      password: newPassword || undefined,
    });
    const token = generateToken(updated);
    res.json({ agent: updated, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listado de usuarios: cualquier rol autenticado (lo necesita el operador
// para poder derivar a un agente específico desde Conversaciones)
router.get('/users', requireAuth, async (req, res) => {
  try {
    res.json(await listUsers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, name, password, role, areaIds, sectores } = req.body;
    if (!email || !name || !password) return res.status(400).json({ error: 'email, name y password son requeridos' });
    const user = await createUser({ email, name, password, role, areaIds: areaIds ?? [], sectores });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, role, areaIds, sectores } = req.body;
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Rol inválido. Válidos: ${VALID_ROLES.join(', ')}` });
    }
    if (req.params.id === req.agent.id && role && role !== req.agent.role) {
      return res.status(400).json({ error: 'No podés cambiar tu propio rol' });
    }
    const before = await getAgentById(req.params.id);
    const updated = await updateUser(req.params.id, { name, role, areaIds, sectores });
    // Cambió el rol o los sectores: la sesión de Firebase tiene los claims viejos.
    if (before && (before.role !== updated.role || before.sectores.join() !== updated.sectores.join())) {
      await revokeFirebaseSession(req.params.id);
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.agent.id) return res.status(400).json({ error: 'No podés eliminarte a vos mismo' });
    await deleteUser(req.params.id);
    await revokeFirebaseSession(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
