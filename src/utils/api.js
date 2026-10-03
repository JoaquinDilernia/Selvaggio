// Cliente del backend de Selvaggio (server/, Railway) para las pantallas
// públicas que dejaron de leer Firestore directo: disponibilidad de mesas,
// días ocupados de La Cava, alta de reserva de mesa y seguimiento de take away.
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'No se pudo conectar con el servidor'), { status: res.status });
  return data;
}

export const apiGet = (path, params = {}) =>
  request(`${path}?${new URLSearchParams(params)}`);

export const apiPost = (path, body) =>
  request(path, { method: 'POST', body: JSON.stringify(body) });
