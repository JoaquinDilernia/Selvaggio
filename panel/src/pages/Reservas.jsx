import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch, BASE_URL } from '../lib/api';
import styles from './Reservas.module.css';

// Todas las reservas de mesa (web + bot, igual que el admin de la web) con
// marca de cuáles tomó el bot, y los pedidos de take away que tomó el bot.

function hoyAR() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
}
function sumarDias(fecha, n) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatFecha(f) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  const dia = new Date(`${f}T12:00:00Z`).toLocaleDateString('es-AR', { weekday: 'short', timeZone: 'UTC' });
  return `${dia} ${d}/${m}/${y.slice(2)}`;
}

const ESTADO_LABEL = {
  pendiente: 'Pendiente', preparando: 'Preparando', listo: 'Listo para retirar',
  entregado: 'Entregado', cancelado: 'Cancelado',
};
const CERRADOS = ['entregado', 'cancelado'];

function tituloDia(f) {
  const hoy = hoyAR();
  const larga = new Date(`${f}T12:00:00Z`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  if (f === hoy) return `Hoy · ${larga}`;
  if (f === sumarDias(hoy, 1)) return `Mañana · ${larga}`;
  if (f === sumarDias(hoy, -1)) return `Ayer · ${larga}`;
  return larga.charAt(0).toUpperCase() + larga.slice(1);
}

function resumenDia(rs) {
  const personas = rs.reduce((s, r) => s + (Number(r.cantidadPersonas) || 0), 0);
  return `${rs.length} ${rs.length === 1 ? 'reserva' : 'reservas'} · ${personas} personas`;
}

export default function Reservas() {
  const navigate = useNavigate();
  const [reservas, setReservas] = useState(null);
  const [error, setError] = useState('');
  const [pedidos, setPedidos] = useState(null);
  const [vista, setVista] = useState('proximas'); // proximas | pasadas
  const [soloBot, setSoloBot] = useState(false);
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);

  useEffect(() => {
    const hoy = hoyAR();
    const qs = vista === 'proximas' ? `desde=${hoy}` : `desde=${sumarDias(hoy, -30)}&hasta=${sumarDias(hoy, -1)}`;
    setReservas(null);
    setError('');
    authFetch(BASE_URL + `/api/reservas/mesas?${qs}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error);
        const d = await r.json();
        // Pasadas: la más reciente primero.
        setReservas(vista === 'pasadas' ? [...d.reservas].reverse() : d.reservas);
      })
      .catch(err => setError(err.message));
  }, [vista]);

  useEffect(() => {
    authFetch(BASE_URL + '/api/reservas/bot-pedidos')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setPedidos(d?.pedidos ?? []))
      .catch(() => setPedidos([]));
  }, []);

  const visibles = (reservas ?? []).filter(r => (!soloBot || r.origen === 'bot') && (verArchivadas || vista === 'pasadas' || !r.archivada));
  // Take away: en curso primero (el retiro más próximo arriba); el historial,
  // lo último arriba.
  const pedidosActivos = (pedidos ?? []).filter(p => !CERRADOS.includes(p.estado))
    .sort((a, b) => `${a.fechaRetiro} ${a.horaRetiro}`.localeCompare(`${b.fechaRetiro} ${b.horaRetiro}`));
  const pedidosVisibles = verHistorial ? (pedidos ?? []).filter(p => CERRADOS.includes(p.estado)) : pedidosActivos;

  const delBot = (reservas ?? []).filter(r => r.origen === 'bot' && !r.archivada).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reservas</h1>
        <p className={styles.subtitle}>Todas las reservas de mesa (las de la web y las que tomó el bot por WhatsApp) y los pedidos de take away del bot.</p>
      </header>

      <div className={styles.body}>
        <div className={styles.toolbar}>
          <h2 className={styles.h2}>Reservas de mesa</h2>
          <div className={styles.tabs}>
            <button className={vista === 'proximas' ? styles.tabActive : styles.tab} onClick={() => setVista('proximas')}>Próximas</button>
            <button className={vista === 'pasadas' ? styles.tabActive : styles.tab} onClick={() => setVista('pasadas')}>Últimos 30 días</button>
          </div>
          <label className={styles.check}>
            <input type="checkbox" checked={soloBot} onChange={e => setSoloBot(e.target.checked)} />
            Solo las del bot{delBot ? ` (${delBot})` : ''}
          </label>
          {vista === 'proximas' && (
            <label className={styles.check}>
              <input type="checkbox" checked={verArchivadas} onChange={e => setVerArchivadas(e.target.checked)} />
              Ver archivadas
            </label>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {!reservas && !error && <p className={styles.muted}>Cargando…</p>}
        {reservas && visibles.length === 0 && <p className={styles.muted}>No hay reservas{soloBot ? ' del bot' : ''} en este período.</p>}
        {reservas && visibles.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th><th>Hora</th><th>Personas</th><th>Ubicación / evento</th><th>Nombre</th><th>Teléfono</th>
                  <th>Restricciones / comentarios</th><th>Origen</th><th></th>
                </tr>
              </thead>
              <tbody>
                {visibles.flatMap((r, i) => [
                  ...(i === 0 || visibles[i - 1].fecha !== r.fecha ? [
                    <tr key={`dia-${r.fecha}`} className={styles.dayRow}>
                      <td colSpan={9}>
                        {tituloDia(r.fecha)}
                        <span className={styles.dayCount}>
                          {resumenDia(visibles.filter(x => x.fecha === r.fecha))}
                        </span>
                      </td>
                    </tr>,
                  ] : []),
                  <tr key={r.id} className={r.archivada ? styles.rowArchived : undefined}>
                    <td>{formatFecha(r.fecha)}</td>
                    <td>{r.horario}</td>
                    <td>{r.cantidadPersonas}</td>
                    <td>{r.evento ? <strong>{r.evento}</strong> : (r.preferencia || '—')}</td>
                    <td>{[r.nombre, r.apellido].filter(Boolean).join(' ')}</td>
                    <td>{r.telefono || '—'}</td>
                    <td className={styles.muted}>{[r.restricciones, r.evento ? String(r.comentarios || '').replace(`Evento: ${r.evento}`, '').replace(/^\s*·\s*|\s*·\s*$/g, '') : r.comentarios].filter(Boolean).join(' · ') || '—'}</td>
                    <td>
                      <span className={r.origen === 'bot' ? styles.badgeBot : styles.badgeWeb}>{r.origen === 'bot' ? 'Bot' : 'Web'}</span>
                      {r.archivada && <span className={styles.muted}> · archivada</span>}
                    </td>
                    <td>
                      {r.contactId && (
                        <button className={styles.link} onClick={() => navigate(`/conversations?contact=${r.contactId}`)}>
                          Ver chat
                        </button>
                      )}
                    </td>
                  </tr>,
                ])}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.toolbar}>
          <h2 className={styles.h2}>Pedidos de take away (por WhatsApp)</h2>
          <div className={styles.tabs}>
            <button className={!verHistorial ? styles.tabActive : styles.tab} onClick={() => setVerHistorial(false)}>
              En curso{pedidosActivos.length ? ` (${pedidosActivos.length})` : ''}
            </button>
            <button className={verHistorial ? styles.tabActive : styles.tab} onClick={() => setVerHistorial(true)}>Entregados y cancelados</button>
          </div>
        </div>
        {!pedidos && <p className={styles.muted}>Cargando…</p>}
        {pedidos && pedidosVisibles.length === 0 && (
          <p className={styles.muted}>{verHistorial ? 'Todavía no hay pedidos entregados o cancelados.' : 'No hay pedidos en curso.'}</p>
        )}
        {pedidos && pedidosVisibles.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr><th>Pedido</th><th>Retiro</th><th>Cliente</th><th>Ítems</th><th>Pago</th><th>Total</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {pedidosVisibles.map(p => (
                <tr key={p.id}>
                  <td>{p.numeroPedido}</td>
                  <td>{formatFecha(p.fechaRetiro)} {p.horaRetiro}</td>
                  <td>{[p.nombre, p.apellido].filter(Boolean).join(' ')}</td>
                  <td className={styles.muted}>{(p.items || []).map(i => `${i.cantidad}× ${i.nombre}`).join(', ')}</td>
                  <td>{p.metodoPago}</td>
                  <td>{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(p.total || 0)}</td>
                  <td><span className={`${styles.estado} ${styles['estado_' + p.estado] ?? ''}`}>{ESTADO_LABEL[p.estado] ?? p.estado}</span></td>
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
