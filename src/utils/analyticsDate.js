// Helpers de fecha/hora en la zona horaria del negocio (Argentina), para que
// el corte de "día" nunca dependa de la hora local del navegador que abre
// el panel de Admin.
const TZ = 'America/Argentina/Buenos_Aires';
const DIAS_SEMANA = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; // Lunes=0 … Domingo=6

const toDate = (timestamp) => {
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp?.toDate === 'function') return timestamp.toDate();
  return new Date(timestamp);
};

// 'YYYY-MM-DD' del timestamp en TZ Argentina
export const claveDiaAR = (timestamp) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(toDate(timestamp));

// 0-6 (Lunes=0 … Domingo=6) del timestamp en TZ Argentina
export const diaSemanaAR = (timestamp) => {
  const nombre = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(toDate(timestamp));
  return DIAS_SEMANA.indexOf(nombre);
};

// Argentina no tiene horario de verano desde 2009: el offset -03:00 es fijo
// todo el año, así que se puede anclar directo en el string ISO en vez de
// derivarlo dinámicamente.
export const inicioDiaAR = (date) => {
  const clave = typeof date === 'string' ? date : claveDiaAR(date);
  return new Date(`${clave}T00:00:00.000-03:00`);
};

export const finDiaAR = (date) => {
  const clave = typeof date === 'string' ? date : claveDiaAR(date);
  return new Date(`${clave}T23:59:59.999-03:00`);
};
