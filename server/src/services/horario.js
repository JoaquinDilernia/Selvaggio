// Horario de atención: sale de `businessHours.schedule` (lo que se edita en
// Configuración del panel). BOT-BASE leía otros campos que nadie editaba
// (businessHoursStart/End/Days) y caía siempre en lun-vie 9 a 18.
const DIAS_SCHEDULE = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const aMinutos = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + (m || 0); };

function franjasDelDia(schedule, dow) {
  const d = schedule?.[DIAS_SCHEDULE[dow]];
  if (!d?.active || !d.open || !d.close) return null;
  return { open: aMinutos(d.open), close: aMinutos(d.close), openStr: d.open, closeStr: d.close };
}

// true si ahora (hora de Argentina) estamos dentro del horario. Soporta
// horarios que cruzan la medianoche (ej. 18:00 a 02:00).
export function isWithinBusinessHours(botConfig = {}) {
  const bh = botConfig.businessHours;
  if (!bh?.enabled) return true; // sin horario configurado: siempre "en horario"
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const day = now.getDay();
  const t = now.getHours() * 60 + now.getMinutes();

  const hoy = franjasDelDia(bh.schedule, day);
  if (hoy) {
    if (hoy.close > hoy.open) { if (t >= hoy.open && t < hoy.close) return true; }
    else if (t >= hoy.open) return true; // cruza medianoche: desde la apertura hasta las 24
  }
  const ayer = franjasDelDia(bh.schedule, (day + 6) % 7);
  return !!(ayer && ayer.close <= ayer.open && t < ayer.close); // cola de la noche anterior
}

// "martes a jueves y domingo de 18:00 a 00:00, viernes y sábado de 18:00 a 02:00"
export function describirHorario(botConfig = {}) {
  const sched = botConfig.businessHours?.schedule;
  if (!botConfig.businessHours?.enabled || !sched) return null;
  const grupos = new Map();
  for (const dow of [1, 2, 3, 4, 5, 6, 0]) { // de lunes a domingo
    const f = franjasDelDia(sched, dow);
    if (!f) continue;
    const k = `${f.openStr} a ${f.closeStr}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(dow);
  }
  const nombrar = (dias) => {
    const orden = [1, 2, 3, 4, 5, 6, 0];
    const idx = dias.map(d => orden.indexOf(d));
    const tramos = [];
    for (let i = 0; i < idx.length; i++) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1] === idx[j] + 1) j++;
      tramos.push(j - i >= 2 ? `${DIAS_ES[dias[i]]} a ${DIAS_ES[dias[j]]}` : dias.slice(i, j + 1).map(d => DIAS_ES[d]).join(' y '));
      i = j;
    }
    return tramos.length > 1 ? `${tramos.slice(0, -1).join(', ')} y ${tramos.at(-1)}` : tramos[0];
  };
  return [...grupos.entries()].map(([h, dias]) => `${nombrar(dias)} de ${h}`).join('; ');
}
