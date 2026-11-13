import { getDb } from './firebase.service.js';
import { getInstagramContactName } from './meta.service.js';

// Las conversaciones de IG viejas quedaron como "Cliente" (antes no se pedía
// el perfil a Meta). Al arrancar se completan las que siguen sin nombre; las
// nuevas ya entran con "Nombre (@usuario)" desde el webhook.
export async function completarNombresInstagram() {
  const db = getDb();
  const snap = await db.collection('bot-selvaggio_conversations').where('channel', '==', 'instagram').get();
  let ok = 0;
  for (const doc of snap.docs) {
    const actual = doc.data().contactName;
    if (actual && actual !== 'Cliente') continue;
    const nombre = await getInstagramContactName(doc.id);
    if (!nombre) continue;
    await doc.ref.update({ contactName: nombre });
    const cust = db.collection('bot-selvaggio_customers').doc(doc.id);
    const c = await cust.get();
    if (c.exists && (!c.data().contactName || c.data().contactName === 'Cliente')) await cust.update({ contactName: nombre });
    ok++;
  }
  if (ok) console.log(`[ig] Nombres de Instagram completados: ${ok}`);
}
