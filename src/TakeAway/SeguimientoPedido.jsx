import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './TakeAway.css';
import './Seguimiento.css';

const ESTADOS = [
  { id: 'pendiente',   label: 'Recibido',           desc: 'Tu pedido fue recibido y está en espera.' },
  { id: 'preparando',  label: 'En preparación',      desc: 'Estamos preparando tu pedido.' },
  { id: 'listo',       label: 'Listo para retirar',  desc: '¡Tu pedido está listo! Podés pasar a buscarlo.' },
  { id: 'entregado',   label: 'Entregado',           desc: 'Pedido entregado. ¡Gracias por elegirnos!' },
];

const PAGO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta' };

function getEstadoIndex(estado) {
  if (estado === 'cancelado') return -1;
  return ESTADOS.findIndex(e => e.id === estado);
}

const formatPrecio = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

function SeguimientoPedido() {
  const [searchParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState(searchParams.get('id') || '');
  const [pedido, setPedido] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const unsubRef = useRef(null);

  // Auto-search if ID in URL
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) buscarPedido(id);
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, []);

  const suscribirPedido = (docId) => {
    if (unsubRef.current) unsubRef.current();
    const unsub = onSnapshot(doc(db, 'selvaggio_takeaway_pedidos', docId), (snap) => {
      if (snap.exists()) setPedido({ id: snap.id, ...snap.data() });
    });
    unsubRef.current = unsub;
  };

  const buscarPedido = async (numero) => {
    const num = (numero || busqueda).trim().toUpperCase();
    if (!num) return;
    setCargando(true);
    setError('');
    setPedido(null);
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    try {
      const q = query(
        collection(db, 'selvaggio_takeaway_pedidos'),
        where('numeroPedido', '==', num)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setError('No encontramos un pedido con ese número. Verificá que esté bien escrito (ej: TW-0001).');
      } else {
        const d = snap.docs[0];
        setPedido({ id: d.id, ...d.data() });
        suscribirPedido(d.id); // real-time updates
      }
    } catch {
      setError('Error al buscar. Intentá nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    buscarPedido();
  };

  const estadoIdx = pedido ? getEstadoIndex(pedido.estado) : -1;
  const cancelado = pedido?.estado === 'cancelado';

  return (
    <div className="tw-page">
      <nav className="tw-nav">
        <Link to="/" className="tw-nav__logo">
          <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="tw-nav__logo-img" />
        </Link>
        <span className="tw-nav__title">Seguimiento</span>
        <Link to="/take-away" className="tw-nav__back">← Volver</Link>
      </nav>

      <div className="sg-main">
        <div className="sg-header">
          <span className="sg-eyebrow">Selvaggio · Take Away</span>
          <h1 className="sg-title">Seguí tu pedido</h1>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="sg-search">
          <input
            className="sg-search__input"
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value.toUpperCase())}
            placeholder="Ej: TW-0001"
            maxLength={10}
          />
          <button type="submit" className="sg-search__btn" disabled={cargando || !busqueda.trim()}>
            {cargando ? '…' : 'Buscar'}
          </button>
        </form>

        {error && <p className="sg-error">{error}</p>}

        {pedido && (
          <div className="sg-pedido">
            {/* Header */}
            <div className="sg-pedido__head">
              <div>
                <span className="sg-pedido__num">{pedido.numeroPedido}</span>
                <span className="sg-pedido__nombre">{pedido.nombre} {pedido.apellido}</span>
              </div>
              <span className={`sg-badge sg-badge--${pedido.estado}`}>
                {cancelado ? 'Cancelado' : ESTADOS[Math.max(0, estadoIdx)]?.label}
              </span>
            </div>

            {/* Timeline */}
            {cancelado ? (
              <div className="sg-cancelado">
                <p>Tu pedido fue cancelado. Comunicáte con nosotros por WhatsApp.</p>
                <a
                  href="https://wa.me/5491166864692"
                  target="_blank" rel="noopener noreferrer"
                  className="sg-wpp-btn">
                  Contactar por WhatsApp
                </a>
              </div>
            ) : (
              <div className="sg-timeline">
                {ESTADOS.map((est, i) => {
                  const done = i < estadoIdx;
                  const active = i === estadoIdx;
                  return (
                    <div key={est.id} className={`sg-step${done ? ' sg-step--done' : ''}${active ? ' sg-step--active' : ''}`}>
                      <div className="sg-step__indicator">
                        <div className="sg-step__dot">
                          {done && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="2 6 5 9 10 3" />
                            </svg>
                          )}
                          {active && <div className="sg-step__pulse" />}
                        </div>
                        {i < ESTADOS.length - 1 && <div className="sg-step__line" />}
                      </div>
                      <div className="sg-step__content">
                        <span className="sg-step__label">{est.label}</span>
                        {active && <span className="sg-step__desc">{est.desc}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Detalle del pedido */}
            <div className="sg-detalle">
              <h4 className="sg-detalle__title">Detalle</h4>
              {(pedido.items || []).map((item, i) => (
                <div key={i} className="sg-detalle__row">
                  <span className="sg-detalle__qty">{item.cantidad}×</span>
                  <span className="sg-detalle__nombre">{item.nombre}</span>
                  <span className="sg-detalle__precio">{formatPrecio(item.subtotal || item.precio * item.cantidad)}</span>
                </div>
              ))}
              <div className="sg-detalle__total">
                <span>Total</span>
                <span>{formatPrecio(pedido.total)}</span>
              </div>
              {pedido.metodoPago && (
                <div className="sg-detalle__pago">
                  <span>Pago:</span>
                  <span>{PAGO_LABEL[pedido.metodoPago] || pedido.metodoPago}</span>
                </div>
              )}
              {pedido.comentarios && (
                <div className="sg-detalle__comentario">
                  <span>Nota:</span> {pedido.comentarios}
                </div>
              )}
            </div>

            {/* CTA cuando está listo */}
            {pedido.estado === 'listo' && (
              <div className="sg-listo-banner">
                <span>🎉</span>
                <div>
                  <strong>¡Tu pedido está listo!</strong>
                  <p>Podés pasar a retirarlo. Av. Fondo de la Legua 59, Las Lomas de San Isidro.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SeguimientoPedido;
