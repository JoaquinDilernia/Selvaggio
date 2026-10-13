// Celular argentino → 549 + área + abonado (13 dígitos), o null si no es
// válido. Misma regla que telefonoComanda() en server/src/services/comandas.service.js
// (que usa toWaContactId de phone.js): si cambia allá, cambiarla acá.
export function celularWhatsApp(raw) {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  d = d.replace(/^9+/, '');
  if (d.length === 12) {
    const m = d.match(/^(\d{2,4})15(\d{6,8})$/);
    if (m && m[1].length + m[2].length === 10) d = m[1] + m[2];
  } else if (d.length === 10 && d.startsWith('15')) {
    d = `11${d.slice(2)}`;
  }
  return d.length === 10 ? `549${d}` : null;
}

// 5491155667788 → "+54 9 11 5566-7788" (solo para mostrar)
export function formatearCelular(wa) {
  const d = wa.slice(3);
  return `+54 9 ${d.slice(0, d.length - 8)} ${d.slice(-8, -4)}-${d.slice(-4)}`;
}
