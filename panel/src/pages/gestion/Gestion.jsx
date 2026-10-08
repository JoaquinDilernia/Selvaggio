import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch, BASE_URL } from '../../lib/api';
import styles from './Gestion.module.css';

// Resumen de Gestión (KPIs leídos por el backend). Las demás pantallas de
// Gestión son las de edición que vinieron de la landing (src/web/).

// ── Helpers ──────────────────────────────────────────────────────────────

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
function fechaCorta(f) {
  if (!f || !/^\d{4}-\d{2}-\d{2}/.test(f)) return f || '—';
  const [y, m, d] = f.slice(0, 10).split('-');
  return `${DIAS[new Date(`${f.slice(0, 10)}T12:00:00Z`).getUTCDay()]} ${d}/${m}${y !== String(new Date().getFullYear()) ? '/' + y.slice(2) : ''}`;
}

function useGestion(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let vivo = true;
    setError('');
    authFetch(BASE_URL + path)
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; })
      .then(j => vivo && setData(j))
      .catch(e => vivo && setError(e.message || 'No se pudo cargar'));
    return () => { vivo = false; };
  }, [path]);
  return { data, error };
}

const ESTADO_CLASE = {
  pendiente: 'warn', confirmada: 'ok', confirmado: 'ok', listo: 'ok', entregado: 'muted', preparando: 'info',
  cancelada: 'bad', cancelado: 'bad', activo: 'ok', inactivo: 'muted', nuevo: 'info',
};
function Badge({ children }) {
  const k = String(children ?? '').toLowerCase();
  return <span className={`${styles.badge} ${styles['badge_' + (ESTADO_CLASE[k] || 'muted')]}`}>{children ?? '—'}</span>;
}

// ── Piezas ───────────────────────────────────────────────────────────────

function Pagina({ titulo, subtitulo, children }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{titulo}</h1>
          {subtitulo && <p className={styles.subtitle}>{subtitulo}</p>}
        </div>
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  );
}

function Estado({ data, error, children }) {
  if (error) return <p className={styles.error}>{error}</p>;
  if (!data) return <div className={styles.loading}>{[200, 140, 260, 180].map((w, i) => <span key={i} style={{ width: w }} />)}</div>;
  return children;
}

function Tabla({ columnas, filas, vacio = 'No hay datos.' }) {
  if (!filas.length) return <p className={styles.muted}>{vacio}</p>;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr>{columnas.map(c => <th key={c.label} className={c.num ? styles.num : ''}>{c.label}</th>)}</tr></thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f.id ?? i}>
              {columnas.map(c => (
                <td key={c.label} className={`${c.num ? styles.num : ''} ${c.wrap ? styles.wrap : ''}`}>
                  {c.render ? c.render(f) : (f[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Resumen ──────────────────────────────────────────────────────────────

export function Resumen() {
  const { data, error } = useGestion('/api/gestion/resumen');
  const navigate = useNavigate();
  const k = data?.kpis ?? {};
  const cards = [
    { label: 'Reservas hoy', valor: k.mesasHoy, to: '/gestion/reservas' },
    { label: 'Reservas próximos 7 días', valor: k.mesasProx7, to: '/gestion/reservas' },
    { label: 'La Cava: eventos próximos', valor: k.cavaProximas, to: '/gestion/reservas' },
    { label: 'Take away pendientes', valor: k.takeawayPendientes, to: '/gestion/takeaway', alerta: k.takeawayPendientes > 0 },
    { label: 'Clientes', valor: k.clientes, to: '/gestion/clientes' },
    { label: 'Comandas del salón', valor: k.comandasTotal, to: '/gestion/comandas' },
    { label: 'Mensajes sin leer', valor: k.contactoNoLeidos, to: '/gestion/mensajes', alerta: k.contactoNoLeidos > 0 },
    { label: 'Postulaciones', valor: k.postulaciones, to: '/gestion/postulaciones' },
    { label: 'Invitaciones', valor: k.invitaciones, to: '/gestion/reservas' },
    { label: 'Conversaciones del bot', valor: k.conversacionesBot, to: '/conversations' },
  ];
  return (
    <Pagina titulo="Resumen" subtitulo={data ? `Selvaggio hoy, ${fechaCorta(data.hoy)}` : 'Selvaggio hoy'}>
      <Estado data={data} error={error}>
        <div className={styles.kpis}>
          {cards.map(c => (
            <button key={c.label} className={`${styles.kpi} ${c.alerta ? styles.kpiAlerta : ''}`} onClick={() => navigate(c.to)}>
              <span className={styles.kpiValor}>{(c.valor ?? 0).toLocaleString('es-AR')}</span>
              <span className={styles.kpiLabel}>{c.label}</span>
            </button>
          ))}
        </div>
        <h2 className={styles.h2}>Próximas reservas (7 días)</h2>
        <Tabla
          filas={data?.proximas ?? []}
          vacio="No hay reservas en los próximos 7 días."
          columnas={[
            { label: 'Día', render: r => fechaCorta(r.fecha) },
            { label: 'Hora', key: 'horario' },
            { label: 'Tipo', key: 'tipo' },
            { label: 'Nombre', render: r => [r.nombre, r.apellido].filter(Boolean).join(' ') },
            { label: 'Personas', key: 'cantidadPersonas', num: true },
            { label: 'Ubicación', render: r => r.preferencia || (r.tipo === 'La Cava' ? 'La Cava' : '—') },
            { label: 'Estado', render: r => <Badge>{r.estado}</Badge> },
          ]}
        />
      </Estado>
    </Pagina>
  );
}
