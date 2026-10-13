import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Capacidad de reservas que se edita en el panel (Gestión → Capacidad).
// Mismos defaults y validación que server/src/services/reservas.service.js.
export const CONFIG_RESERVAS_DEFAULT = Object.freeze({
  personasPorHorario: 16,
  mesaMaximo: 9, // personas por mesa
  cavaMinimo: 10,
  cavaMaximo: null, // sin tope
  cavaPrecioPersona: 60000,
  cavaSena: 100000,
});

const enteroPositivo = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export function normalizarConfigReservas(raw) {
  const c = { ...CONFIG_RESERVAS_DEFAULT };
  for (const k of ['personasPorHorario', 'mesaMaximo', 'cavaMinimo', 'cavaPrecioPersona', 'cavaSena']) {
    c[k] = enteroPositivo(raw?.[k]) ?? CONFIG_RESERVAS_DEFAULT[k];
  }
  const max = enteroPositivo(raw?.cavaMaximo);
  c.cavaMaximo = max && max >= c.cavaMinimo ? max : null;
  return c;
}

/** Personas que ocupa una reserva (las viejas sin cantidad cuentan como 1). */
export const personasDe = (r) => enteroPositivo(r.cantidadPersonas) ?? 1;

export function useConfigReservas() {
  const [config, setConfig] = useState(CONFIG_RESERVAS_DEFAULT);
  useEffect(() => {
    getDoc(doc(db, 'selvaggio_configuracion', 'reservas'))
      .then(snap => setConfig(normalizarConfigReservas(snap.exists() ? snap.data() : null)))
      .catch(() => {});
  }, []);
  return config;
}

export const formatPesos = (n) => n.toLocaleString('es-AR');
