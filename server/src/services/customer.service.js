import { getDb } from './firebase.service.js';
import { findLandingClient } from './landingClients.service.js';
import { cumpleDelCliente, formatearCumple } from './cumpleanos.service.js';

const COLLECTION = 'bot-selvaggio_customers';

export async function getOrCreateCustomer(contactId, channel, contactName = null) {
  const db = getDb();
  const docRef = db.collection(COLLECTION).doc(contactId);
  const doc = await docRef.get();

  if (doc.exists) {
    const updates = { lastContactAt: new Date() };
    if (contactName && !doc.data().contactName) updates.contactName = contactName;
    await docRef.update(updates);
    const landingClient = await findLandingClient(contactId);
    return { id: doc.id, ...doc.data(), ...updates, landingClient };
  }

  const customer = {
    contactId,
    channel,
    contactName: contactName ?? null,
    email: null,
    firstContactAt: new Date(),
    lastContactAt: new Date(),
    agentNotes: '',
    tags: [],
    source: 'bot',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Primer contacto: si ya es cliente de la landing, arrancamos con su nombre.
  const landingClient = await findLandingClient(contactId);
  if (!customer.contactName && landingClient?.nombre) customer.contactName = landingClient.nombre;
  if (landingClient?.email) customer.email = landingClient.email;

  await docRef.set(customer);
  return { id: contactId, ...customer, landingClient };
}

export async function getCustomerProfile(contactId) {
  const db = getDb();
  const doc = await db.collection(COLLECTION).doc(contactId).get();
  if (!doc.exists) return null;
  const landingClient = await findLandingClient(contactId);
  return { id: doc.id, ...doc.data(), landingClient };
}

export async function updateCustomerNotes(contactId, agentNotes) {
  const db = getDb();
  await db.collection(COLLECTION).doc(contactId).update({
    agentNotes: agentNotes ?? '',
    updatedAt: new Date(),
  });
}

export function buildCustomerContext(customer) {
  if (!customer) return null;

  const lines = [];
  if (customer.contactName) lines.push(`Nombre: ${customer.contactName}`);
  lines.push(`Canal: ${customer.channel}`);
  if (customer.firstContactAt) lines.push(`Primera consulta: ${formatDate(customer.firstContactAt)}`);

  const lc = customer.landingClient;
  if (lc) {
    lines.push(`\nYa es cliente de Selvaggio (registrado desde la web):`);
    if (lc.totalReservas) lines.push(`- Reservas hechas: ${lc.totalReservas}${lc.ultimaReserva ? ` (última: ${formatDate(lc.ultimaReserva)})` : ''}`);
    if (lc.totalPedidos) lines.push(`- Pedidos de take away: ${lc.totalPedidos}${lc.ultimoPedido ? ` (último: ${formatDate(lc.ultimoPedido)})` : ''}`);
  }

  // Cumpleaños: el bot lo pide una sola vez si no lo tenemos (ver reservasPrompt).
  const cumple = cumpleDelCliente(customer);
  if (cumple.estado === 'conocido') lines.push(`\nCumpleaños: ${formatearCumple(cumple.mmdd)} (ya lo tenemos, NO lo preguntes)`);
  else if (cumple.estado === 'no_quiere') lines.push('\nCumpleaños: prefirió no darlo (NO lo vuelvas a preguntar)');
  else lines.push('\nCumpleaños: NO LO TENEMOS (pedilo una vez, según las reglas de CUMPLEAÑOS)');

  if (customer.agentNotes) {
    lines.push(`\nNotas del equipo: ${customer.agentNotes}`);
  }

  return lines.join('\n');
}

function formatDate(ts) {
  if (!ts) return '';
  try {
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('es-AR');
  } catch { return ''; }
}

// ─────────────────────────── Contactos (listado + CRUD) ───────────────────
// Mismo criterio que `searchConversations` en conversation.service.js: se
// trae la colección entera y se filtra en memoria — no hay tantos contactos
// como para justificar índices compuestos de Firestore, y así el filtro de
// texto + tags + canal se resuelve con una sola función sin duplicar lógica
// entre server y client.

// Saca acentos para comparar sin distinguir mayúsculas/tildes (mismo criterio
// que Sedes.jsx / doctors.service.js en los otros bots): tras NFD, las tildes
// quedan como marcas combinantes fuera del rango ASCII básico.
function norm(s) {
  return (s ?? '').toString().toLowerCase().normalize('NFD').replace(/[^\x20-\x7e]/g, '');
}

// Lo más reciente entre el último mensaje de WhatsApp y la última reserva o
// pedido de la web (ISO string, para ordenar la lista única).
function ultimaActividad(data) {
  const ms = (ts) => (ts?._seconds ? ts._seconds * 1000 : ts?.toMillis ? ts.toMillis() : ts ? new Date(ts).getTime() : 0) || 0;
  // createdAt solo como último recurso: en los importados de la web es la
  // fecha de la sincronización, no de actividad real del cliente.
  const t = Math.max(ms(data.lastContactAt), ms(data.web?.ultimaReserva), ms(data.web?.ultimoPedido), ms(data.web?.creado)) || ms(data.createdAt);
  return t ? new Date(t).toISOString() : null;
}

function mapCustomerDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    contactId: data.contactId ?? doc.id,
    channel: data.channel ?? null,
    contactName: data.contactName ?? null,
    email: data.email ?? null,
    tags: data.tags ?? [],
    agentNotes: data.agentNotes ?? '',
    cumpleanos: data.cumpleanos ?? null,
    fechaNacimiento: data.fechaNacimiento ?? null,
    cumpleanosNoQuiere: !!data.cumpleanosNoQuiere,
    // Datos de la web (reservas/take away), sincronizados por clientesSync.service
    web: data.web ?? null,
    ultimaActividad: ultimaActividad(data),
    source: data.source ?? 'bot',
    firstContactAt: data.firstContactAt ?? null,
    lastContactAt: data.lastContactAt ?? null,
    createdAt: data.createdAt ?? data.firstContactAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

// Cache en memoria: el panel admin pide esta lista COMPLETA en cada carga y
// en cada cambio de filtro de la pantalla "Clientes" (los filtros se aplican
// acá, en JS, no en la query de Firestore). Sin cache eso es un scan
// completo de la colección de contactos por click — en BOT-ALTORANCHO esto
// generó 1.25M lecturas/día con 10k+ contactos. No se invalida con el touch
// de `lastContactAt` en `getOrCreateCustomer` (pasa en cada mensaje entrante
// — invalidar ahí anularía el cache en la práctica); sí se invalida en las
// altas/bajas/ediciones manuales desde el panel, donde 60s de demora es
// imperceptible.
let _customersCache = { at: 0, docs: null };
const CUSTOMERS_CACHE_MS = 60 * 1000;

export function invalidateCustomersCache() { _customersCache = { at: 0, docs: null }; }

async function fetchAllCustomerDocs() {
  if (_customersCache.docs && Date.now() - _customersCache.at < CUSTOMERS_CACHE_MS) {
    return _customersCache.docs;
  }
  const db = getDb();
  const snap = await db.collection(COLLECTION).get();
  const docs = snap.docs.map(mapCustomerDoc);
  _customersCache = { at: Date.now(), docs };
  return docs;
}

/**
 * @param {object} filters
 * @param {string} [filters.q]        busca en nombre y contactId/teléfono
 * @param {string[]} [filters.tags]   contacto debe tener AL MENOS UNA de estas tags
 * @param {string} [filters.channel]  'whatsapp' | 'instagram'
 */
export async function listCustomers(filters = {}) {
  let docs = await fetchAllCustomerDocs();

  if (filters.channel) docs = docs.filter(c => c.channel === filters.channel);
  if (filters.tags?.length) {
    docs = docs.filter(c => filters.tags.some(t => c.tags.includes(t)));
  }
  const q = norm(filters.q).trim();
  if (q) {
    docs = docs.filter(c => norm(c.contactName).includes(q) || norm(c.contactId).includes(q) || norm(c.email).includes(q)
      || (c.web?.ids ?? []).some(e => norm(e).includes(q)));
  }

  docs.sort((a, b) => (b.ultimaActividad || '').localeCompare(a.ultimaActividad || ''));
  return docs;
}

export async function listAllTags() {
  const docs = await fetchAllCustomerDocs();
  const set = new Set();
  docs.forEach(c => (c.tags ?? []).forEach(t => set.add(t)));
  return [...set].sort((a, b) => norm(a).localeCompare(norm(b)));
}

function tsToMs(ts) {
  if (!ts) return 0;
  if (ts._seconds) return ts._seconds * 1000;
  const d = new Date(ts);
  return isNaN(d) ? 0 : d.getTime();
}

/** Alta manual desde el panel — `contactId` ya viene normalizado (mismo
    formato que usa `/api/conversations/start` para WhatsApp). */
export async function createCustomer({ contactId, channel, contactName, email, tags }) {
  if (!contactId || !channel) {
    const e = new Error('contactId y channel son requeridos');
    e.status = 400;
    throw e;
  }
  const db = getDb();
  const docRef = db.collection(COLLECTION).doc(contactId);
  const existing = await docRef.get();
  if (existing.exists) {
    const e = new Error('Ya existe un contacto con ese identificador/teléfono');
    e.status = 409;
    throw e;
  }
  const customer = {
    contactId,
    channel,
    contactName: contactName?.trim() || null,
    email: email?.trim() || null,
    firstContactAt: null, // sin conversación todavía
    lastContactAt: null,
    agentNotes: '',
    tags: Array.isArray(tags) ? tags : [],
    source: 'manual',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await docRef.set(customer);
  invalidateCustomersCache();
  return { id: contactId, ...customer };
}

export async function updateCustomer(contactId, patch) {
  const db = getDb();
  const update = { updatedAt: new Date() };
  if (patch.contactName !== undefined) update.contactName = patch.contactName?.trim() || null;
  if (patch.email !== undefined) update.email = patch.email?.trim() || null;
  if (patch.tags !== undefined) update.tags = Array.isArray(patch.tags) ? patch.tags : [];
  if (patch.agentNotes !== undefined) update.agentNotes = patch.agentNotes ?? '';
  await db.collection(COLLECTION).doc(contactId).update(update);
  invalidateCustomersCache();
  return getCustomerProfile(contactId);
}

export async function deleteCustomer(contactId) {
  const db = getDb();
  await db.collection(COLLECTION).doc(contactId).delete();
  invalidateCustomersCache();
}

// ─────────────────────────── Import / export CSV ──────────────────────────
// Parser/serializer CSV mínimo (RFC4180: comillas dobles, comas y saltos de
// línea dentro de un campo entre comillas) — no se suma una dependencia
// nueva sólo para esto, el formato de contacto es simple y plano.

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Importa filas ya parseadas con header. Columnas esperadas (case-insensitive):
 * telefono/phone/contactid (requerida), nombre/name, canal/channel (default whatsapp),
 * email, tags (separadas por ; o ,).
 * Upsert por contactId: si ya existe, hace merge de nombre/email (sólo si vacíos)
 * y UNIÓN de tags — así reimportar el mismo CSV no pisa tags cargadas a mano.
 */
export async function importCustomersCsv(rows, { normalizePhone } = {}) {
  if (rows.length === 0) return { created: 0, updated: 0, skipped: 0, errors: [] };
  const header = rows[0].map(h => norm(h).trim());
  const idx = (names) => names.map(n => header.indexOf(n)).find(i => i >= 0) ?? -1;
  const iPhone = idx(['telefono', 'phone', 'contactid', 'celular', 'whatsapp']);
  const iName = idx(['nombre', 'name', 'contactname']);
  const iChannel = idx(['canal', 'channel']);
  const iEmail = idx(['email', 'mail', 'correo']);
  const iTags = idx(['tags', 'etiquetas']);

  if (iPhone === -1) {
    const e = new Error('El CSV necesita una columna "telefono" (o "phone"/"contactId") con el identificador del contacto.');
    e.status = 400;
    throw e;
  }

  const db = getDb();
  let created = 0, updated = 0, skipped = 0;
  const errors = [];

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const rawId = (cols[iPhone] ?? '').trim();
    if (!rawId) { skipped++; continue; }
    const channel = (iChannel >= 0 ? cols[iChannel]?.trim() : '') || 'whatsapp';
    const contactId = channel === 'whatsapp' && normalizePhone ? normalizePhone(rawId) : rawId;
    if (!contactId) { skipped++; continue; }
    const name = iName >= 0 ? cols[iName]?.trim() || null : null;
    const email = iEmail >= 0 ? cols[iEmail]?.trim() || null : null;
    const tags = iTags >= 0
      ? (cols[iTags] ?? '').split(/[;,]/).map(t => t.trim()).filter(Boolean)
      : [];

    try {
      const docRef = db.collection(COLLECTION).doc(contactId);
      const existing = await docRef.get();
      if (existing.exists) {
        const data = existing.data();
        const mergedTags = [...new Set([...(data.tags ?? []), ...tags])];
        await docRef.update({
          ...(name && !data.contactName ? { contactName: name } : {}),
          ...(email && !data.email ? { email } : {}),
          tags: mergedTags,
          updatedAt: new Date(),
        });
        updated++;
      } else {
        await docRef.set({
          contactId, channel, contactName: name, email,
          firstContactAt: null, lastContactAt: null, agentNotes: '',
          tags, source: 'import', createdAt: new Date(), updatedAt: new Date(),
        });
        created++;
      }
    } catch (err) {
      errors.push({ row: r + 1, contactId: rawId, error: err.message });
    }
  }

  invalidateCustomersCache();
  return { created, updated, skipped, errors };
}

export async function exportCustomersCsv() {
  const customers = await listCustomers();
  const header = ['contactId', 'canal', 'nombre', 'email', 'tags', 'primeraConsulta', 'ultimaConsulta'];
  const lines = [header.map(csvCell).join(',')];
  for (const c of customers) {
    lines.push([
      c.contactId, c.channel ?? '', c.contactName ?? '', c.email ?? '',
      (c.tags ?? []).join(';'),
      c.firstContactAt ? formatDate(c.firstContactAt) : '',
      c.lastContactAt ? formatDate(c.lastContactAt) : '',
    ].map(csvCell).join(','));
  }
  return lines.join('\n');
}
