const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Hoy en Argentina como AAAA-MM-DD (el server valida con la misma zona). */
export function hoyAR() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
}

const diaSemana = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay();

/** Próximos días con retiro (hasta 28 días, como valida el server). */
export function fechasRetiro(diasAbiertos, cantidad = 10) {
  const out = [];
  const base = new Date(`${hoyAR()}T12:00:00Z`);
  for (let i = 0; i <= 28 && out.length < cantidad; i++) {
    const d = new Date(base); d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    if (!diasAbiertos.length || diasAbiertos.includes(diaSemana(iso))) out.push(iso);
  }
  return out;
}

export function etiquetaFecha(iso) {
  const hoy = hoyAR();
  const manana = new Date(`${hoy}T12:00:00Z`); manana.setUTCDate(manana.getUTCDate() + 1);
  const d = new Date(`${iso}T12:00:00Z`);
  const corto = `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
  if (iso === hoy) return { dia: 'Hoy', fecha: corto };
  if (iso === manana.toISOString().slice(0, 10)) return { dia: 'Mañana', fecha: corto };
  return { dia: DIAS[d.getUTCDay()], fecha: corto };
}

export const NOMBRES_DIA = DIAS;
