import { getDb } from './firebase.service.js';

const COLLECTION = 'bot-selvaggio_labels';

// Etiquetas del restaurante con las que el bot clasifica cada conversación.
// Se crean solas al arrancar si faltan (no pisan color ni descripción si
// alguien las editó). La descripción es lo que lee el bot para elegir.
export const ETIQUETAS_BASE = [
  { name: 'Reserva de mesa', color: '#22c55e', description: 'Quiere reservar, cambiar o cancelar una mesa (hasta 9 personas).' },
  { name: 'Take away', color: '#f97316', description: 'Pedido para llevar o con envío, o pregunta por un pedido ya hecho.' },
  { name: 'Evento / Presupuesto', color: '#8b5cf6', description: 'Evento PRIVADO o a medida: La Cava (siempre), cumpleaños, evento corporativo, grupo de 10 o más personas, o pide presupuesto. No para los eventos publicados en la agenda.' },
  { name: 'Cava', color: '#ef4444', description: 'Pregunta específicamente por La Cava (va junto con Evento / Presupuesto).' },
  { name: 'Evento de agenda', color: '#ec4899', description: 'Consulta, entradas o reserva de lugar para un evento publicado en la agenda (catas, menú de pasos, Astrovinito, Vino y vinilos, etc.).' },
  { name: 'Consulta', color: '#6b7280', description: 'Info general: horarios, ubicación, carta, estacionamiento, mascotas, menores. Solo si no aplica otra más específica.' },
  { name: 'Reclamo', color: '#dc2626', description: 'Queja o mala experiencia.' },
  { name: 'Reseña', color: '#eab308', description: 'Comentario positivo, agradecimiento u opinión después de venir.' },
  { name: 'Proveedor', color: '#14b8a6', description: 'Ofrece vinos, productos gastronómicos u otros servicios.' },
  { name: 'Influencer / Canje', color: '#3b82f6', description: 'Colaboraciones, canjes, creadores de contenido o prensa.' },
  { name: 'Trabajo / CV', color: '#a16207', description: 'Busca trabajo o manda su CV.' },
];

// Colores para las etiquetas que crea el bot (rotan para que no queden todas grises).
const COLORES_NUEVAS = ['#0ea5e9', '#84cc16', '#d946ef', '#f43f5e', '#06b6d4', '#a855f7', '#65a30d', '#e11d48'];

/** Clave de comparación: sin mayúsculas, tildes ni espacios de más. "evento/presupuesto" = "Evento / Presupuesto". */
export function claveEtiqueta(name) {
  return String(name ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();
}

/** Busca una etiqueta existente equivalente; null si no hay. */
export function resolverEtiqueta(name, labels) {
  const k = claveEtiqueta(name);
  return labels.find(l => claveEtiqueta(l.name) === k) ?? null;
}

export async function getAllLabels() {
  const db = getDb();
  const snap = await db.collection(COLLECTION).get();
  const labels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  labels.sort((a, b) => a.name.localeCompare(b.name));
  return labels;
}

export async function createLabel(name, color, description = '') {
  const db = getDb();
  const clean = String(name).replace(/\s+/g, ' ').trim().slice(0, 30);
  const existente = resolverEtiqueta(clean, await getAllLabels());
  if (existente) return existente;
  if (!color) {
    const n = (await db.collection(COLLECTION).count().get()).data().count;
    color = COLORES_NUEVAS[n % COLORES_NUEVAS.length];
  }
  const data = { name: clean, color, description: String(description ?? '').slice(0, 200), createdAt: new Date() };
  const ref = await db.collection(COLLECTION).add(data);
  return { id: ref.id, ...data };
}

export async function updateLabel(id, { color, description }) {
  const patch = {};
  if (color) patch.color = color;
  if (description !== undefined) patch.description = String(description).slice(0, 200);
  await getDb().collection(COLLECTION).doc(id).update(patch);
}

export async function deleteLabel(id) {
  const db = getDb();
  await db.collection(COLLECTION).doc(id).delete();
}

/** Crea las etiquetas base que falten y completa la descripción de las que no tengan. */
export async function ensureBaseLabels() {
  const labels = await getAllLabels();
  for (const base of ETIQUETAS_BASE) {
    const existente = resolverEtiqueta(base.name, labels);
    if (!existente) {
      await getDb().collection(COLLECTION).add({ ...base, createdAt: new Date() });
    } else if (!existente.description) {
      await getDb().collection(COLLECTION).doc(existente.id).update({ description: base.description });
    }
  }
}
