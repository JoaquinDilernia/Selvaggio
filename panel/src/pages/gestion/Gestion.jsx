import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch, BASE_URL } from '../../lib/api';
import styles from './Gestion.module.css';

// Vistas de Gestión: los datos que carga la web (reservas, take away, salón,
// clientes, mensajes, eventos…) leídos por el backend. Por ahora solo lectura;
// la edición sigue en el admin de la landing (botón "Abrir admin").

const LANDING_URL = (import.meta.env.VITE_LANDING_URL ?? '').replace(/\/$/, '');

// ── Helpers ──────────────────────────────────────────────────────────────

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export function fechaCorta(f) {
  if (!f || !/^\d{4}-\d{2}-\d{2}/.test(f)) return f || '—';
  const [y, m, d] = f.slice(0, 10).split('-');
  return `${DIAS[new Date(`${f.slice(0, 10)}T12:00:00Z`).getUTCDay()]} ${d}/${m}${y !== String(new Date().getFullYear()) ? '/' + y.slice(2) : ''}`;
}
export function fechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
export const pesos = (n) => n == null ? '—'
  : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

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

function Pagina({ titulo, subtitulo, adminHash, acciones, children }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{titulo}</h1>
          {subtitulo && <p className={styles.subtitle}>{subtitulo}</p>}
        </div>
        <div className={styles.headerActions}>
          {acciones}
          {adminHash && LANDING_URL && (
            <a className={styles.btnSecondary} href={`${LANDING_URL}/#/${adminHash}`} target="_blank" rel="noopener noreferrer">
              Editar en el admin ↗
            </a>
          )}
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

function Tabla({ columnas, filas, vacio = 'No hay datos.', onFila }) {
  if (!filas.length) return <p className={styles.muted}>{vacio}</p>;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr>{columnas.map(c => <th key={c.label} className={c.num ? styles.num : ''}>{c.label}</th>)}</tr></thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f.id ?? i} className={onFila ? styles.clickable : ''} onClick={onFila ? () => onFila(f) : undefined}>
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

function Tabs({ tabs, activa, onChange }) {
  return (
    <div className={styles.tabs}>
      {tabs.map(t => (
        <button key={t.id} className={`${styles.tab} ${activa === t.id ? styles.tabActive : ''}`} onClick={() => onChange(t.id)}>
          {t.label}{t.n != null && <span className={styles.tabCount}>{t.n}</span>}
        </button>
      ))}
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
    { label: 'Postulaciones', valor: k.postulaciones, to: '/gestion/mensajes' },
    { label: 'Invitaciones', valor: k.invitaciones, to: '/gestion/invitaciones' },
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

// ── Reservas ─────────────────────────────────────────────────────────────

const hoyISO = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
const masDias = (f, n) => { const d = new Date(`${f}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export function Reservas() {
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState(masDias(hoyISO(), 30));
  const [tab, setTab] = useState('mesas');
  const { data, error } = useGestion(`/api/gestion/reservas?desde=${desde}&hasta=${hasta}`);
  const personas = (l) => l.filter(r => r.estado !== 'cancelada').reduce((a, r) => a + (Number(r.cantidadPersonas) || 0), 0);
  return (
    <Pagina
      titulo="Reservas"
      subtitulo="Mesas y La Cava, de la web y del bot."
      adminHash="admin"
      acciones={(
        <div className={styles.rango}>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
          <span>a</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
      )}
    >
      <Estado data={data} error={error}>
        <Tabs
          activa={tab}
          onChange={setTab}
          tabs={[
            { id: 'mesas', label: 'Mesas', n: data?.mesas.length },
            { id: 'cava', label: 'La Cava', n: data?.cava.length },
          ]}
        />
        {tab === 'mesas' ? (
          <>
            <p className={styles.muted}>{personas(data?.mesas ?? [])} personas en total en el rango.</p>
            <Tabla
              filas={data?.mesas ?? []}
              vacio="No hay reservas de mesa en ese rango."
              columnas={[
                { label: 'Día', render: r => fechaCorta(r.fecha) },
                { label: 'Hora', key: 'horario' },
                { label: 'Nombre', render: r => [r.nombre, r.apellido].filter(Boolean).join(' ') },
                { label: 'Teléfono', key: 'telefono' },
                { label: 'Pers.', key: 'cantidadPersonas', num: true },
                { label: 'Ubicación', key: 'preferencia' },
                { label: 'Restricciones / comentarios', wrap: true, render: r => [r.restricciones, r.comentarios].filter(Boolean).join(' · ') || '—' },
                { label: 'Estado', render: r => <Badge>{r.estado}</Badge> },
              ]}
            />
          </>
        ) : (
          <Tabla
            filas={data?.cava ?? []}
            vacio="No hay eventos de La Cava en ese rango."
            columnas={[
              { label: 'Día', render: r => fechaCorta(r.fecha) },
              { label: 'Hora', key: 'horario' },
              { label: 'Nombre', key: 'nombre' },
              { label: 'Teléfono', key: 'telefono' },
              { label: 'Pers.', key: 'cantidadPersonas', num: true },
              { label: 'Torta', render: r => (r.traeTorta ? 'Sí' : '—') },
              { label: 'Seña', render: r => pesos(r.seña), num: true },
              { label: 'Comprobante', render: r => (r.comprobanteUrl ? <a href={r.comprobanteUrl} target="_blank" rel="noopener noreferrer">Ver</a> : '—') },
              { label: 'Estado', render: r => <Badge>{r.estado}</Badge> },
            ]}
          />
        )}
      </Estado>
    </Pagina>
  );
}

// ── Take away ────────────────────────────────────────────────────────────

const resumenItems = (items = []) => items.map(i => `${i.cantidad}× ${i.nombre}`).join(', ');

export function TakeAway() {
  const { data, error } = useGestion('/api/gestion/takeaway');
  const [abierto, setAbierto] = useState(null);
  return (
    <Pagina titulo="Take Away" subtitulo="Últimos pedidos (web y bot)." adminHash="admin">
      <Estado data={data} error={error}>
        <Tabla
          filas={data?.pedidos ?? []}
          vacio="Todavía no hay pedidos."
          onFila={p => setAbierto(abierto?.id === p.id ? null : p)}
          columnas={[
            { label: 'Pedido', key: 'numeroPedido' },
            { label: 'Creado', render: p => fechaHora(p.createdAt) },
            { label: 'Cliente', render: p => [p.nombre, p.apellido].filter(Boolean).join(' ') },
            { label: 'Ítems', wrap: true, render: p => resumenItems(p.items) },
            { label: 'Retiro', render: p => (p.fechaRetiro ? `${fechaCorta(p.fechaRetiro)} ${p.horaRetiro || ''}` : '—') },
            { label: 'Entrega', render: p => (p.metodoEnvio === 'envio' ? `Envío · ${p.localidadEnvio || ''}` : 'Retira') },
            { label: 'Pago', key: 'metodoPago' },
            { label: 'Total', render: p => pesos(p.total), num: true },
            { label: 'Estado', render: p => <Badge>{p.estado}</Badge> },
          ]}
        />
        {abierto && (
          <div className={styles.detalle}>
            <div className={styles.detalleHead}>
              <strong>{abierto.numeroPedido}</strong>
              <button className={styles.link} onClick={() => setAbierto(null)}>Cerrar</button>
            </div>
            {(abierto.items || []).map((i, n) => (
              <div key={n} className={styles.detalleItem}>
                <div><strong>{i.cantidad}× {i.nombre}</strong> <span className={styles.muted}>{pesos(i.subtotal ?? i.precio * i.cantidad)}</span></div>
                {Object.values(i.selecciones || {}).map((s, k) => (
                  <div key={k} className={styles.muted}>{s.nombre}: {(s.items || []).map(x => x.nombre).join(', ') || '—'}</div>
                ))}
              </div>
            ))}
            <div className={styles.detalleTotales}>
              <span>Subtotal {pesos(abierto.subtotal)}</span>
              {abierto.descuento > 0 && <span>Descuentos −{pesos(abierto.descuento)}{abierto.cuponCodigo ? ` (cupón ${abierto.cuponCodigo})` : ''}</span>}
              <strong>Total {pesos(abierto.total)}</strong>
            </div>
            {abierto.metodoEnvio === 'envio' && (
              <p className={styles.muted}>Envío: {[abierto.direccionEnvio, abierto.pisoDeptoEnvio, abierto.localidadEnvio].filter(Boolean).join(', ')}{abierto.referenciaEnvio ? ` — ${abierto.referenciaEnvio}` : ''}</p>
            )}
            {abierto.comentarios && <p className={styles.muted}>Nota: {abierto.comentarios}</p>}
            <p className={styles.muted}>Contacto: {abierto.telefono} {abierto.email ? `· ${abierto.email}` : ''}</p>
          </div>
        )}
      </Estado>
    </Pagina>
  );
}

// ── Salón (comandas de Caja/Cocina) ──────────────────────────────────────

export function Comandas() {
  const { data, error } = useGestion('/api/gestion/comandas');
  return (
    <Pagina titulo="Salón" subtitulo="Comandas cargadas en Caja y despachadas por Cocina (últimas 150)." adminHash="cocina">
      <Estado data={data} error={error}>
        <Tabla
          filas={data?.comandas ?? []}
          columnas={[
            { label: 'Nº', key: 'numeroPedido' },
            { label: 'Creada', render: c => fechaHora(c.pedido_creado) },
            { label: 'Nombre', key: 'nombre' },
            { label: 'Observaciones', wrap: true, render: c => c.observaciones || '—' },
            { label: 'Lista', render: c => fechaHora(c.pedido_listo) },
            { label: 'Estado', render: c => <Badge>{c.estado}</Badge> },
          ]}
        />
      </Estado>
    </Pagina>
  );
}

// ── Clientes ─────────────────────────────────────────────────────────────

export function Clientes() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  useEffect(() => { const t = setTimeout(() => setBusqueda(q), 300); return () => clearTimeout(t); }, [q]);
  const { data, error } = useGestion(`/api/gestion/clientes?q=${encodeURIComponent(busqueda)}`);
  return (
    <Pagina
      titulo="Clientes"
      subtitulo={data ? `${data.total.toLocaleString('es-AR')} clientes registrados desde la web (reservas y take away).` : 'Clientes registrados desde la web.'}
      acciones={<input className={styles.search} placeholder="Buscar nombre, email o teléfono…" value={q} onChange={e => setQ(e.target.value)} />}
    >
      <Estado data={data} error={error}>
        <Tabla
          filas={data?.clientes ?? []}
          vacio="No hay clientes que coincidan."
          columnas={[
            { label: 'Nombre', key: 'nombre' },
            { label: 'Email', key: 'email' },
            { label: 'Teléfono', key: 'telefono' },
            { label: 'Reservas', key: 'totalReservas', num: true },
            { label: 'Pedidos', key: 'totalPedidos', num: true },
            { label: 'Última actividad', render: c => fechaHora(c.ultimaReserva || c.ultimoPedido || c.creado) },
            { label: 'Cumpleaños', render: c => (c.fechaNacimiento ? c.fechaNacimiento.slice(5).split('-').reverse().join('/') : '—') },
            {
              label: 'WhatsApp', render: c => (c.enBot
                ? <button className={styles.link} onClick={() => navigate(`/conversations?contact=${c.contactId}`)}>Ver chat</button>
                : <span className={styles.muted}>—</span>),
            },
          ]}
        />
        {data && data.clientes.length === 300 && <p className={styles.muted}>Se muestran los 300 más recientes. Usá el buscador para encontrar al resto.</p>}
      </Estado>
    </Pagina>
  );
}

// ── Mensajes ─────────────────────────────────────────────────────────────

export function Mensajes() {
  const { data, error } = useGestion('/api/gestion/mensajes');
  const [tab, setTab] = useState('contacto');
  return (
    <Pagina titulo="Mensajes" subtitulo="Formulario de contacto y postulaciones de la web." adminHash="admin">
      <Estado data={data} error={error}>
        <Tabs
          activa={tab}
          onChange={setTab}
          tabs={[
            { id: 'contacto', label: 'Contacto', n: data?.contacto.length },
            { id: 'postulaciones', label: 'Trabajá con nosotros', n: data?.postulaciones.length },
          ]}
        />
        {tab === 'contacto' ? (
          <Tabla
            filas={data?.contacto ?? []}
            columnas={[
              { label: 'Fecha', render: m => fechaHora(m.fecha) },
              { label: 'Nombre', key: 'nombre' },
              { label: 'Email', key: 'email' },
              { label: 'Teléfono', key: 'telefono' },
              { label: 'Mensaje', wrap: true, key: 'mensaje' },
              { label: '', render: m => (m.leido ? <span className={styles.muted}>Leído</span> : <Badge>nuevo</Badge>) },
            ]}
          />
        ) : (
          <Tabla
            filas={data?.postulaciones ?? []}
            columnas={[
              { label: 'Fecha', render: m => fechaHora(m.fecha) },
              { label: 'Nombre', key: 'nombre' },
              { label: 'Puesto', key: 'puesto' },
              { label: 'Email', key: 'email' },
              { label: 'Teléfono', key: 'telefono' },
              { label: 'Mensaje', wrap: true, key: 'mensaje' },
              { label: 'Estado', render: m => <Badge>{m.estado}</Badge> },
            ]}
          />
        )}
      </Estado>
    </Pagina>
  );
}

// ── Colecciones simples ──────────────────────────────────────────────────

const COLECCIONES = {
  eventos: {
    titulo: 'Eventos', subtitulo: 'Agenda publicada en la web.', adminHash: 'admin',
    columnas: [
      { label: 'Fecha', render: e => fechaCorta(e.fecha) },
      { label: 'Horario', render: e => [e.horaInicio, e.horaFin].filter(Boolean).join(' a ') || '—' },
      { label: 'Título', key: 'titulo' },
      { label: 'Descripción', wrap: true, key: 'descripcion' },
      { label: 'Visible', render: e => (e.visible === false ? <Badge>inactivo</Badge> : <Badge>activo</Badge>) },
      { label: 'Pop-up', render: e => (e.esPopup ? 'Sí' : '—') },
    ],
  },
  invitaciones: {
    titulo: 'Invitaciones', subtitulo: 'Influencers, prensa y creadores invitados.', adminHash: 'admin',
    columnas: [
      { label: 'Día', render: i => fechaCorta(i.dia) },
      { label: 'Hora', key: 'horario' },
      { label: 'Nombre', key: 'nombreCompleto' },
      { label: 'Redes', key: 'redesSociales' },
      { label: 'Tipo', key: 'tipo' },
      { label: 'Categoría', key: 'categoria' },
      { label: 'Pers.', key: 'cantidadPersonas', num: true },
      { label: 'Invitado por', key: 'invitadoPor' },
      { label: 'Contenido acordado', wrap: true, key: 'contenidoAcordado' },
    ],
  },
  cupones: {
    titulo: 'Cupones', subtitulo: 'Cupones de descuento del Take Away.', adminHash: 'admin',
    columnas: [
      { label: 'Código', render: c => c.codigo || c.id },
      { label: 'Descuento', render: c => (c.tipoDescuento === 'porcentaje' ? `${c.valor}%` : pesos(c.valor)) },
      { label: 'Vigencia', render: c => [c.fechaDesde, c.fechaHasta].filter(Boolean).map(fechaCorta).join(' a ') || 'Sin límite' },
      { label: 'Mínimo', render: c => (c.montoMinimo ? pesos(c.montoMinimo) : '—'), num: true },
      { label: 'Usos', render: c => `${c.usosTotales || 0}${c.limiteUsosTotal != null ? ` / ${c.limiteUsosTotal}` : ''}`, num: true },
      { label: 'Descontado', render: c => pesos(c.montoDescontadoTotal || 0), num: true },
      { label: 'Ventas', render: c => pesos(c.ingresosGenerados || 0), num: true },
      { label: 'Estado', render: c => <Badge>{c.activo ? 'activo' : 'inactivo'}</Badge> },
    ],
  },
  resenas: {
    titulo: 'Reseñas', subtitulo: 'Reseñas que muestra la web.', adminHash: 'admin-contenidos',
    columnas: [
      { label: 'Nombre', key: 'nombre' },
      { label: 'Calificación', render: r => '★'.repeat(r.calificacion || 0) },
      { label: 'Comentario', wrap: true, key: 'comentario' },
      { label: 'Destacada', render: r => (r.destacada ? 'Sí' : '—') },
      { label: 'Visible', render: r => (r.visible === false ? <Badge>inactivo</Badge> : <Badge>activo</Badge>) },
    ],
  },
};

export function Coleccion({ nombre }) {
  const def = COLECCIONES[nombre];
  const { data, error } = useGestion(`/api/gestion/coleccion/${nombre}`);
  return (
    <Pagina titulo={def.titulo} subtitulo={def.subtitulo} adminHash={def.adminHash}>
      <Estado data={data} error={error}>
        <Tabla filas={data?.items ?? []} columnas={def.columnas} />
      </Estado>
    </Pagina>
  );
}
