import { getDb } from './firebase.service.js';
import { ahoraAR } from './reservas.service.js';

// Archiva solas las reservas de días que ya pasaron (mesas, La Cava e
// invitaciones), lo mismo que hacía el equipo a mano con "Archivar" en el
// admin. Se marcan con archivadaAuto para distinguirlas; "Desarchivar" sigue
// funcionando igual. El día se cierra a las 06:00 de Argentina: vie/sáb se
// atiende hasta las 02:00 y esas reservas no tienen que desaparecer en medio
// del servicio.

const HORA_CIERRE = '06:00';
const DIAS_HACIA_ATRAS = 60; // cubre de sobra un server caído varios días
const INTERVALO_MS = 60 * 60 * 1000;

const COLECCIONES = [
  ['selvaggio_reservas_mesas', 'fecha'],
  ['selvaggio_reservas_cava', 'fecha'],
  ['selvaggio_invitaciones', 'dia'],
];

function sumarDias(fecha, n) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Primer día que todavía NO se archiva (todo lo anterior ya pasó). */
export function primerDiaVigente(now = new Date()) {
  const { fecha, hora } = ahoraAR(now);
  return hora < HORA_CIERRE ? sumarDias(fecha, -1) : fecha;
}

export async function archivarReservasPasadas(now = new Date()) {
  const db = getDb();
  const hasta = primerDiaVigente(now);
  const desde = sumarDias(hasta, -DIAS_HACIA_ATRAS);
  let total = 0;
  for (const [col, campo] of COLECCIONES) {
    const snap = await db.collection(col).where(campo, '>=', desde).where(campo, '<', hasta).get();
    const pendientes = snap.docs.filter(d => !d.data().archivada);
    for (let i = 0; i < pendientes.length; i += 400) {
      const batch = db.batch();
      for (const d of pendientes.slice(i, i + 400)) {
        batch.update(d.ref, { archivada: true, archivadaAuto: true });
      }
      await batch.commit();
    }
    total += pendientes.length;
  }
  if (total) console.log(`[reservas] ${total} reserva(s) de días pasados archivadas`);
  return total;
}

export function iniciarArchivoReservas() {
  // Con SELVAGGIO_TEST_WRITES (pruebas locales) no se toca la base real.
  if (process.env.SELVAGGIO_TEST_WRITES === '1') return;
  const correr = () => archivarReservasPasadas().catch(e => console.error('[reservas] archivo automático:', e.message));
  setTimeout(correr, 20_000);
  setInterval(correr, INTERVALO_MS).unref();
}
