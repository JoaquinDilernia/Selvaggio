// Qué parte del historial ve Claude: solo la charla actual. Antes iban los
// últimos 10 mensajes aunque fueran de hace semanas, y el bot arrancaba con
// "Para confirmar tu lugar en Astronight…" o "Seguimos con el Take Away"
// cuando el cliente escribía por otra cosa. Una pausa de 12 h (lo mismo que
// tarda en archivarse sola) corta la charla.
export const SESSION_GAP_MS = 12 * 60 * 60 * 1000;
export const HISTORY_MAX = 10;

const toMs = (v) => (v?.toMillis ? v.toMillis() : v ? new Date(v).getTime() : NaN);

export function sessionHistory(history = [], now = Date.now()) {
  const recent = history.slice(-HISTORY_MAX);
  let next = now;
  let start = recent.length;
  for (let i = recent.length - 1; i >= 0; i--) {
    const t = toMs(recent[i].timestamp);
    if (Number.isFinite(t) && next - t > SESSION_GAP_MS) break;
    if (Number.isFinite(t)) next = t;
    start = i;
  }
  return recent.slice(start);
}
