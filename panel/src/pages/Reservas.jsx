import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch, BASE_URL } from '../lib/api';
import styles from './Reservas.module.css';

// Reservas de mesa que tomó el bot. Mientras el backend esté en modo sandbox
// (RESERVAS_MODE != 'live') quedan en una colección aparte que la web no ve.

function formatFecha(f) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  const dia = new Date(`${f}T12:00:00Z`).toLocaleDateString('es-AR', { weekday: 'short', timeZone: 'UTC' });
  return `${dia} ${d}/${m}/${y.slice(2)}`;
}

export default function Reservas() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [pedidos, setPedidos] = useState(null);

  useEffect(() => {
    authFetch(BASE_URL + '/api/reservas/bot')
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error);
        setData(await r.json());
      })
      .catch(err => setError(err.message));
    authFetch(BASE_URL + '/api/reservas/bot-pedidos')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setPedidos(d?.pedidos ?? []))
      .catch(() => setPedidos([]));
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reservas y pedidos del bot</h1>
        <p className={styles.subtitle}>Mesas y pedidos de take away tomados por WhatsApp. Quedan pendientes hasta que el equipo los confirme.</p>
      </header>

      {data?.sandbox && (
        <div className={styles.sandbox}>
          <strong>Modo prueba.</strong> Estas reservas y pedidos se guardan aparte y <u>no</u> aparecen en el admin de la web
          ni ocupan lugar para la web (ni suman usos a los cupones). Sí respetan cupos, precios y horarios reales.
          Se pasa a modo real con{' '}<code>BOT_MODE=live</code> en el backend.
        </div>
      )}

      <div className={styles.body}>
        {error && <p className={styles.error}>{error}</p>}
        {!data && !error && <p className={styles.muted}>Cargando…</p>}
        <h2 className={styles.h2}>Reservas de mesa</h2>
        {data && data.reservas.length === 0 && <p className={styles.muted}>Todavía no hay reservas tomadas por el bot.</p>}
        {data && data.reservas.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th><th>Hora</th><th>Personas</th><th>Ubicación</th><th>Nombre</th>
                <th>Restricciones</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {data.reservas.map(r => (
                <tr key={r.id}>
                  <td>{formatFecha(r.fecha)}</td>
                  <td>{r.horario}</td>
                  <td>{r.cantidadPersonas}</td>
                  <td>{r.preferencia}</td>
                  <td>{[r.nombre, r.apellido].filter(Boolean).join(' ')}</td>
                  <td className={styles.muted}>{r.restricciones || '—'}</td>
                  <td><span className={styles.badge}>{r.estado}</span></td>
                  <td>
                    {r.contactId && (
                      <button className={styles.link} onClick={() => navigate(`/conversations?contact=${r.contactId}`)}>
                        Ver chat
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2 className={styles.h2}>Pedidos de take away</h2>
        {!pedidos && <p className={styles.muted}>Cargando…</p>}
        {pedidos && pedidos.length === 0 && <p className={styles.muted}>Todavía no hay pedidos tomados por el bot.</p>}
        {pedidos && pedidos.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr><th>Pedido</th><th>Retiro</th><th>Cliente</th><th>Ítems</th><th>Pago</th><th>Total</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {pedidos.map(p => (
                <tr key={p.id}>
                  <td>{p.numeroPedido}</td>
                  <td>{formatFecha(p.fechaRetiro)} {p.horaRetiro}</td>
                  <td>{[p.nombre, p.apellido].filter(Boolean).join(' ')}</td>
                  <td className={styles.muted}>{(p.items || []).map(i => `${i.cantidad}× ${i.nombre}`).join(', ')}</td>
                  <td>{p.metodoPago}</td>
                  <td>{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(p.total || 0)}</td>
                  <td><span className={styles.badge}>{p.estado}</span></td>
                  <td>{p.contactId && <button className={styles.link} onClick={() => navigate(`/conversations?contact=${p.contactId}`)}>Ver chat</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
