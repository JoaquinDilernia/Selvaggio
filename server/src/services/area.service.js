import { getDb } from './firebase.service.js';
import admin from 'firebase-admin';

const COLLECTION = 'bot-selvaggio_areas';
const AGENTS_COLLECTION = 'bot-selvaggio_agents';

const SEED_AREAS = [
  {
    id: 'ventas',
    name: 'Reservas y eventos',
    description: 'Eventos privados y corporativos, La Cava, grupos grandes, cumpleaños, propuestas especiales o cualquier reserva que el bot no pueda resolver solo.',
    active: true,
    order: 1,
  },
  {
    id: 'soporte',
    name: 'Atención al cliente',
    description: 'Pedidos de take away ya hechos, cambios o cancelaciones de reservas, reclamos, objetos olvidados y consultas que necesitan a una persona del equipo.',
    active: true,
    order: 2,
  },
];

export async function seedAreasIfNeeded() {
  const db = getDb();
  const snap = await db.collection(COLLECTION).limit(1).get();
  if (!snap.empty) return;
  const batch = db.batch();
  for (const area of SEED_AREAS) {
    batch.set(db.collection(COLLECTION).doc(area.id), { ...area, createdAt: new Date() });
  }
  await batch.commit();
  console.log('[areas] Seed inicial completado');
}

export async function getAllAreas() {
  const db = getDb();
  const snap = await db.collection(COLLECTION).orderBy('order').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getActiveAreas() {
  const db = getDb();
  // Orden en memoria: where + orderBy necesita un índice compuesto que no
  // existe en pedidos-lett-2, y el error dejaba al bot sin áreas (todas las
  // derivaciones quedaban "sin asignar").
  const snap = await db.collection(COLLECTION).where('active', '==', true).get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export async function createArea({ name, description, active = true }) {
  const db = getDb();
  const snap = await db.collection(COLLECTION).orderBy('order', 'desc').limit(1).get();
  const lastOrder = snap.empty ? 0 : snap.docs[0].data().order ?? 0;
  const id = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const existing = await db.collection(COLLECTION).doc(id).get();
  if (existing.exists) throw new Error('Ya existe un área con ese nombre');
  const area = { id, name, description, active, order: lastOrder + 1, createdAt: new Date() };
  await db.collection(COLLECTION).doc(id).set(area);
  return area;
}

export async function updateArea(id, { name, description, active }) {
  const db = getDb();
  const update = { updatedAt: new Date() };
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (active !== undefined) update.active = active;
  await db.collection(COLLECTION).doc(id).update(update);
  const doc = await db.collection(COLLECTION).doc(id).get();
  return { id: doc.id, ...doc.data() };
}

export async function deleteArea(id) {
  const db = getDb();
  await db.collection(COLLECTION).doc(id).delete();

  // Clean up: strip this area id from every agent's areaIds array.
  const agentsSnap = await db.collection(AGENTS_COLLECTION).where('areaIds', 'array-contains', id).get();
  if (!agentsSnap.empty) {
    const batch = db.batch();
    for (const doc of agentsSnap.docs) {
      batch.update(doc.ref, { areaIds: admin.firestore.FieldValue.arrayRemove(id) });
    }
    await batch.commit();
  }
}
