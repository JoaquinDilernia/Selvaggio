// Exporta el resumen del período y la tendencia de La Cava a un CSV que
// abre bien en Excel (BOM UTF-8 y punto y coma, como usa Excel en es-AR).

const METRICAS = [
  ['interesCava', 'Interés en La Cava (web + chat)'],
  ['toquesCava', "Toques en 'Reservar La Cava'"],
  ['consultasChatCava', 'Consultas por La Cava en el chat'],
  ['visitasCava', 'Visitas a la página de La Cava'],
  ['reservasCava', 'Reservas de La Cava'],
  ['personasCava', 'Personas en reservas de La Cava'],
  ['tasaCierreCava', 'Tasa de cierre (%)'],
  ['senasCava', 'Señas cobradas ($)'],
  ['facturacionCava', 'Facturación estimada ($)'],
  ['anticipacionDias', 'Anticipación promedio (días)'],
  ['conversaciones', 'Conversaciones del chat'],
  ['conversacionesNuevas', 'Conversaciones nuevas'],
];

const celda = (v) => {
  if (v == null) return '';
  const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const fila = (...cs) => cs.map(celda).join(';');

export function armarCsv(data) {
  const { actual, anterior } = data.resumen;
  const lineas = [
    fila(`Analytics Selvaggio del ${data.desde} al ${data.hasta}`),
    '',
    fila('Métrica', 'Período', 'Período anterior'),
    ...METRICAS.map(([k, label]) => fila(label, actual[k], anterior[k])),
    '',
    fila(`La Cava ${data.tendenciaCava.paso === 'dia' ? 'por día' : 'por semana'}`),
    fila('Desde', 'Hasta', 'Web', 'Chat', 'Interés total', 'Interés período anterior', 'Reservas'),
    ...data.tendenciaCava.tramos.map(t => fila(t.desde, t.hasta, t.web, t.chat, t.web + t.chat, t.interesAnterior, t.reservas)),
    '',
    fila('Viernes y sábados libres (próximos 60 días)'),
    ...data.ocupacionCava.findesLibres.map(f => fila(f)),
  ];
  return '﻿' + lineas.join('\r\n');
}

export function descargarCsv(data) {
  const blob = new Blob([armarCsv(data)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics-selvaggio_${data.desde}_${data.hasta}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
