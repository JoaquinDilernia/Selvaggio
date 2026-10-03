import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiGet } from '../utils/api';
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
  // Últimos 4 del teléfono: el número de pedido solo es adivinable, así que
  // el backend pide los dos datos (y no devuelve teléfono ni dirección).
  const [tel4, setTel4] = useState((searchParams.get('tel') || '').replace(/\D/g, '').slice(-4));
  const [pedido, setPedido] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  // Auto-search si vienen los datos en la URL (link de la pantalla de éxito)
  useEffect(() => {
    if (searchParams.get('id') && tel4.length === 4) buscarPedido();
    return () => clearInterval(pollRef.current);
  }, []);

  const consultar = (num, tel) =>
    apiGet('/api/public/takeaway/seguimiento', { numero: num, tel }).then(r => r.pedido);

  // Antes era onSnapshot directo a Firestore; ahora se refresca cada 30 s
  // mientras el pedido siga en curso.
  const seguirActualizando = (num, tel) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (document.hidden) return;
      try {
        const p = await consultar(num, tel);
        setPedido(p);
        if (['entregado', 'cancelado'].includes(p.estado)) clearInterval(pollRef.current);
      } catch { /* se reintenta en el próximo ciclo */ }
    }, 30_000);
  };

  const buscarPedido = async () => {
    const num = busqueda.trim().toUpperCase();
    if (!num || tel4.length !== 4) return;
    setCargando(true);
    setError('');
    setPedido(null);
    clearInterval(pollRef.current);
    try {
      const p = await consultar(num, tel4);
      setPedido(p);
      if (!['entregado', 'cancelado'].includes(p.estado)) seguirActualizando(num, tel4);
    } catch (err) {
      setError(err.status === 404
        ? 'No encontramos un pedido con esos datos. Revisá el número (ej: TW-AB12CD) y los últimos 4 dígitos del teléfono que dejaste.'
        : err.status === 429 ? err.message : 'Error al buscar. Intentá nuevamente.');
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
            placeholder="Nº de pedido"
            aria-label="Número de pedido"
            maxLength={10}
          />
          <input
            className="sg-search__input sg-search__input--tel"
            type="text"
            inputMode="numeric"
            value={tel4}
            onChange={e => setTel4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="Últ. 4 del tel."
            aria-label="Últimos 4 dígitos del teléfono"
            maxLength={4}
          />
          <button type="submit" className="sg-search__btn" disabled={cargando || !busqueda.trim() || tel4.length !== 4}>
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
