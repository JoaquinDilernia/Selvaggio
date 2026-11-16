// Backend de Selvaggio (Railway). La web v2 se identifica con X-Selvaggio-Web: v2;
// mientras el server no tenga WEB_V2_REAL=1, lo que se carga desde acá va a
// colecciones de prueba (Cocina no lo ve).
export const API_URL = import.meta.env.VITE_API_URL || 'https://selvaggio-server-production.up.railway.app';

// Banner "versión de prueba" (VITE_PRUEBA=0 lo saca cuando pase a real).
export const EN_PRUEBA = import.meta.env.VITE_PRUEBA !== '0';

export const WHATSAPP = '5491166864692';
export const waLink = (texto) => `https://wa.me/${WHATSAPP}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;

// body: objeto (va como JSON) o FormData (multipart, para comprobantes).
async function pedir(path, { method = 'GET', body } = {}) {
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
  let res;
  try {
    res = await fetch(`${API_URL}/api/public${path}`, {
      method,
      headers: { 'X-Selvaggio-Web': 'v2', ...(body && !multipart && { 'Content-Type': 'application/json' }) },
      body: body ? (multipart ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new Error('No pudimos conectarnos. Revisá tu conexión y probá de nuevo.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Algo salió mal. Probá de nuevo en un momento.');
  return data;
}

export const api = {
  catalogo: () => pedir('/takeaway/catalogo'),
  horarios: (fecha) => pedir(`/takeaway/horarios?fecha=${encodeURIComponent(fecha)}`),
  cotizar: (body) => pedir('/takeaway/cotizar', { method: 'POST', body }),
  crearPedido: (body) => pedir('/takeaway/pedidos', { method: 'POST', body }),
  // Reservas
  configReservas: () => pedir('/reservas/config'),
  eventos: () => pedir('/eventos'),
  disponibilidad: (fecha, personas) => pedir(`/mesas/disponibilidad?fecha=${encodeURIComponent(fecha)}&personas=${personas}`),
  cavaOcupadas: (desde, hasta) => pedir(`/cava/ocupadas?desde=${desde}&hasta=${hasta}`),
  reservarMesa: (body) => pedir('/reservas/mesas', { method: 'POST', body }),
  reservarCava: (form) => pedir('/reservas/cava', { method: 'POST', body: form }),
  reservarEvento: (body) => pedir('/reservas/evento', { method: 'POST', body }),
  seguimiento: (numero, tel4) => pedir(`/takeaway/seguimiento?numero=${encodeURIComponent(numero)}&tel=${encodeURIComponent(tel4)}`),
};

export const pesos = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');
