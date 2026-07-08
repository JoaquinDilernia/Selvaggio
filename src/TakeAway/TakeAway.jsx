import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  collection, getDocs, addDoc, getDoc, doc, setDoc, increment, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import Toast from '../components/Toast';
import { trackTakeAwayInicio, trackTakeAwayPedido, trackViewContent } from '../utils/metaPixel';
import { enviarNotificacionPedidoTakeAway, enviarCodigoVerificacion } from '../utils/emailService';
import './TakeAway.css';

const METODOS_PAGO = [
  { id: 'efectivo',      label: 'Efectivo',      desc: '10% de descuento' },
  { id: 'transferencia', label: 'Transferencia',  desc: 'Al retirar' },
  { id: 'tarjeta',       label: 'Tarjeta',        desc: 'Débito / crédito' },
];

const formatPrecio = n =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

/* ─── Success screen ─── */
function SuccessScreen({ pedidoNum, retiroLabel }) {
  return (
    <div className="tw-page">
      <nav className="tw-nav">
        <Link to="/" className="tw-nav__logo">
          <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="tw-nav__logo-img" />
        </Link>
        <span className="tw-nav__title">Take Away</span>
        <span />
      </nav>
      <div className="tw-success">
        <div className="tw-success__icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="tw-success__title">¡Pedido recibido!</h1>
        <p className="tw-success__sub">
          {retiroLabel
            ? <>Tu retiro está agendado para el <strong>{retiroLabel}</strong>. ¡Te avisamos cuando esté listo!</>
            : 'Estamos preparando tu pedido. Te avisamos cuando esté listo para retirar.'}
        </p>
        <div className="tw-success__num">
          <span className="tw-success__num-label">Tu número de pedido</span>
          <span className="tw-success__num-val">{pedidoNum}</span>
        </div>
        <Link to={`/take-away/seguimiento?id=${pedidoNum}`} className="tw-success__btn">Seguir mi pedido →</Link>
        <Link to="/" className="tw-success__volver">← Volver al inicio</Link>
      </div>
    </div>
  );
}

/* ─── Verificación de email ─── */
function VerificacionEmailScreen({ email, nombre, onVerificado, onVolver, onReenviar }) {
  const [codigo, setCodigo] = useState('');
  const [codigoEsperado, setCodigoEsperado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState('');
  const [reenviado, setReenviado] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);

  useEffect(() => {
    enviar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generarCodigo = () => Math.floor(100000 + Math.random() * 900000).toString();

  const enviar = async () => {
    setEnviando(true);
    setError('');
    const nuevo = generarCodigo();
    setCodigoEsperado(nuevo);
    setExpiresAt(Date.now() + 10 * 60 * 1000);
    await enviarCodigoVerificacion(email, nombre, nuevo);
    setEnviando(false);
  };

  const handleReenviar = async () => {
    setReenviado(false);
    await enviar();
    setReenviado(true);
    setCodigo('');
  };

  const handleVerificar = () => {
    if (!codigo.trim()) { setError('Ingresá el código.'); return; }
    if (expiresAt && Date.now() > expiresAt) { setError('El código expiró. Reenviá uno nuevo.'); return; }
    setVerificando(true);
    if (codigo.trim() === codigoEsperado) {
      onVerificado();
    } else {
      setError('Código incorrecto. Revisá tu casilla o reenviá.');
      setVerificando(false);
    }
  };

  return (
    <div className="tw-page">
      <nav className="tw-nav">
        <Link to="/" className="tw-nav__logo">
          <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="tw-nav__logo-img" />
        </Link>
        <span className="tw-nav__title">Verificación</span>
        <button className="tw-nav__back" onClick={onVolver}>← Volver</button>
      </nav>

      <div className="tw-co-main">
        <div className="tw-co-header">
          <span className="tw-co-eyebrow">Selvaggio · Take Away</span>
          <h1 className="tw-co-title">Verificá tu email</h1>
        </div>

        <div className="tw-verif">
          {enviando ? (
            <p className="tw-verif__info">Enviando código a <strong>{email}</strong>…</p>
          ) : (
            <p className="tw-verif__info">
              Te enviamos un código de 6 dígitos a <strong>{email}</strong>. Ingresalo para continuar.
            </p>
          )}

          <div className="tw-field" style={{ marginTop: 24 }}>
            <label className="tw-label tw-label--req">Código de verificación</label>
            <input
              className="tw-input tw-input--code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={codigo}
              onChange={e => { setCodigo(e.target.value.replace(/\D/g, '')); setError(''); }}
              placeholder="123456"
              autoFocus
            />
            {error && <p className="tw-verif__error">{error}</p>}
          </div>

          <button
            className="tw-submit"
            onClick={handleVerificar}
            disabled={verificando || enviando || codigo.length !== 6}
            style={{ marginTop: 16 }}
          >
            {verificando ? 'Verificando…' : 'Confirmar código'}
          </button>

          <button className="tw-verif__reenviar" onClick={handleReenviar} disabled={enviando}>
            {enviando ? 'Enviando…' : reenviado ? '✓ Código reenviado' : '¿No llegó? Reenviar código'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Checkout ─── */
function CheckoutScreen({ carrito, onVolver, onConfirmar, loading, config }) {
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', email: '', telefono: '', metodoPago: 'efectivo', comentarios: '',
    fechaRetiro: '', horaRetiro: '',
    metodoEnvio: 'retiro',
    localidadEnvio: '', direccionEnvio: '', pisoDeptoEnvio: '', referenciaEnvio: '',
  });
  const [toast, setToast] = useState(null);

  const subtotal  = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const esEfectivo = formData.metodoPago === 'efectivo';
  const zonasEnvio = config?.zonasEnvio || [];
  const hayEnvioDisponible = zonasEnvio.length > 0;
  const esEnvio = formData.metodoEnvio === 'envio';
  const descuento = esEfectivo ? Math.round(subtotal * 0.10) : 0;
  const total     = subtotal - descuento;

  const fechasDisponibles = generarFechasRetiro(config?.diasAbiertos, config?.horarioDesde, config?.horarioHasta);
  const horasDisponibles = formData.fechaRetiro
    ? generarHorasRetiro(parseFechaKey(formData.fechaRetiro), config?.horarioDesde, config?.horarioHasta)
    : [];

  const handleChange = e => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = e => {
    e.preventDefault();
    if (carrito.length === 0) { setToast({ message: 'El carrito está vacío', type: 'error' }); return; }
    onConfirmar({ ...formData, subtotal, descuento, totalFinal: total });
  };

  return (
    <div className="tw-page">
      <nav className="tw-nav">
        <Link to="/" className="tw-nav__logo">
          <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="tw-nav__logo-img" />
        </Link>
        <span className="tw-nav__title">Checkout</span>
        <button className="tw-nav__back" onClick={onVolver}>← Volver</button>
      </nav>

      <div className="tw-co-main">
        <div className="tw-co-header">
          <span className="tw-co-eyebrow">Selvaggio · Take Away</span>
          <h1 className="tw-co-title">Tu pedido</h1>
        </div>

        <div className="tw-resumen">
          <h3 className="tw-resumen__title">Resumen</h3>
          {carrito.map(item => (
            <div key={item.cartId} className="tw-resumen__item">
              <div className="tw-resumen__row">
                <span className="tw-resumen__qty">{item.cantidad}×</span>
                <span className="tw-resumen__nombre">{item.nombre}</span>
                <span className="tw-resumen__precio">{formatPrecio(item.precio * item.cantidad)}</span>
              </div>
              {item.selecciones && Object.values(item.selecciones).map((sec, i) =>
                sec.items && sec.items.length > 0 ? (
                  <div key={i} className="tw-resumen__selec">
                    <span className="tw-resumen__selec-sec">{sec.nombre}:</span>
                    <span className="tw-resumen__selec-items">{sec.items.map(x => x.nombre).join(', ')}</span>
                  </div>
                ) : null
              )}
            </div>
          ))}
          {esEfectivo && (
            <>
              <div className="tw-resumen__row tw-resumen__row--sub">
                <span className="tw-resumen__qty" />
                <span className="tw-resumen__nombre" style={{ color: '#8a7e76' }}>Subtotal</span>
                <span className="tw-resumen__precio" style={{ color: '#8a7e76' }}>{formatPrecio(subtotal)}</span>
              </div>
              <div className="tw-resumen__row tw-resumen__row--descuento">
                <span className="tw-resumen__qty">🏷</span>
                <span className="tw-resumen__nombre tw-resumen__descuento-label">10% descuento efectivo</span>
                <span className="tw-resumen__precio tw-resumen__descuento-val">−{formatPrecio(descuento)}</span>
              </div>
            </>
          )}
          {esEnvio && (
            <div className="tw-resumen__row tw-resumen__row--envio">
              <span className="tw-resumen__qty">🚚</span>
              <span className="tw-resumen__nombre">Envío Selvaggio</span>
              <span className="tw-resumen__precio tw-resumen__precio--gratis">Gratis</span>
            </div>
          )}
          <div className="tw-resumen__total">
            <span>Total{esEfectivo ? ' a pagar' : ''}</span>
            <span>{formatPrecio(total)}</span>
          </div>
          <p className="tw-resumen__nota">
            {esEnvio ? 'El pago se realiza al momento de la entrega.' : 'El pago se realiza al momento de retirar en el local.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="tw-form">
          <div className="tw-row">
            <div className="tw-field">
              <label className="tw-label tw-label--req">Nombre</label>
              <input className="tw-input" type="text" name="nombre" value={formData.nombre}
                onChange={handleChange} required placeholder="Tu nombre" />
            </div>
            <div className="tw-field">
              <label className="tw-label tw-label--req">Apellido</label>
              <input className="tw-input" type="text" name="apellido" value={formData.apellido}
                onChange={handleChange} required placeholder="Tu apellido" />
            </div>
          </div>
          <div className="tw-row">
            <div className="tw-field">
              <label className="tw-label tw-label--req">Email</label>
              <input className="tw-input" type="email" name="email" value={formData.email}
                onChange={handleChange} required placeholder="tu@email.com" />
            </div>
            <div className="tw-field">
              <label className="tw-label tw-label--req">WhatsApp</label>
              <input className="tw-input" type="tel" name="telefono" value={formData.telefono}
                onChange={handleChange} required placeholder="11 6686 4692" />
            </div>
          </div>

          <div className="tw-field">
            <label className="tw-label tw-label--req">Método de envío</label>
            <div className={`tw-envio-grid${hayEnvioDisponible ? '' : ' tw-envio-grid--single'}`}>
              <button type="button"
                className={`tw-pago-btn${!esEnvio ? ' tw-pago-btn--on' : ''}`}
                onClick={() => setFormData(p => ({ ...p, metodoEnvio: 'retiro' }))}>
                <span className="tw-pago-btn__label">Retiro en local</span>
                <span className="tw-pago-btn__desc">Pasás a buscarlo vos</span>
              </button>
              {hayEnvioDisponible && (
                <button type="button"
                  className={`tw-pago-btn${esEnvio ? ' tw-pago-btn--on' : ''}`}
                  onClick={() => setFormData(p => ({ ...p, metodoEnvio: 'envio' }))}>
                  <span className="tw-pago-btn__label">Envío Selvaggio</span>
                  <span className="tw-pago-btn__desc tw-pago-btn__desc--free">Envío gratis</span>
                </button>
              )}
            </div>

            {!esEnvio ? (
              <div className="tw-retiro-info">
                <p className="tw-retiro-info__row">📍 Av. Fondo de la Legua 59, Las Lomas de San Isidro</p>
                {config?.diasAbiertos?.length > 0 && (
                  <p className="tw-retiro-info__row">
                    🕐 Retirás {formatDiasAbiertos(config.diasAbiertos)}
                    {config?.horarioDesde !== undefined && config?.horarioHasta !== undefined
                      ? ` de ${config.horarioDesde} a ${config.horarioHasta} hs.`
                      : '.'}
                  </p>
                )}
              </div>
            ) : (
              <div className="tw-envio-fields">
                <div className="tw-field">
                  <label className="tw-label tw-label--req">Localidad</label>
                  <select className="tw-input tw-select" name="localidadEnvio" value={formData.localidadEnvio}
                    onChange={handleChange} required>
                    <option value="">Elegí tu localidad…</option>
                    {zonasEnvio.map(zona => <option key={zona} value={zona}>{zona}</option>)}
                  </select>
                </div>
                <div className="tw-field">
                  <label className="tw-label tw-label--req">Dirección</label>
                  <input className="tw-input" type="text" name="direccionEnvio" value={formData.direccionEnvio}
                    onChange={handleChange} required placeholder="Calle y número" />
                </div>
                <div className="tw-row">
                  <div className="tw-field">
                    <label className="tw-label">Piso/Depto</label>
                    <input className="tw-input" type="text" name="pisoDeptoEnvio" value={formData.pisoDeptoEnvio}
                      onChange={handleChange} placeholder="Opcional" />
                  </div>
                  <div className="tw-field">
                    <label className="tw-label">Referencia</label>
                    <input className="tw-input" type="text" name="referenciaEnvio" value={formData.referenciaEnvio}
                      onChange={handleChange} placeholder="Ej: portón verde" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="tw-field">
            <label className="tw-label tw-label--req">Método de pago</label>
            <p className="tw-pago-nota">
              {esEnvio ? 'Todos los pagos se realizan al momento de la entrega.' : 'Todos los pagos se realizan al retirar en el local.'}
            </p>
            <div className="tw-pago-grid">
              {METODOS_PAGO.map(m => (
                <button key={m.id} type="button"
                  className={`tw-pago-btn${formData.metodoPago === m.id ? ' tw-pago-btn--on' : ''}`}
                  onClick={() => setFormData(p => ({ ...p, metodoPago: m.id }))}>
                  <span className="tw-pago-btn__label">{m.label}</span>
                  <span className="tw-pago-btn__desc">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="tw-retiro-section">
            <div className="tw-field">
              <label className="tw-label tw-label--req">{esEnvio ? 'Fecha de entrega' : 'Fecha de retiro'}</label>
              {fechasDisponibles.length === 0 ? (
                <p className="tw-retiro-no-slots">No hay fechas de retiro configuradas aún.</p>
              ) : (
                <select className="tw-input tw-select" name="fechaRetiro" value={formData.fechaRetiro}
                  onChange={e => setFormData(p => ({ ...p, fechaRetiro: e.target.value, horaRetiro: '' }))} required>
                  <option value="">Elegí el día…</option>
                  {fechasDisponibles.map(fecha => (
                    <option key={fechaAKey(fecha)} value={fechaAKey(fecha)}>
                      {formatFechaRetiroLabel(fecha)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {formData.fechaRetiro && (
              <div className="tw-field">
                <label className="tw-label tw-label--req">{esEnvio ? 'Horario estimado de entrega' : 'Horario de retiro'}</label>
                {horasDisponibles.length === 0 ? (
                  <p className="tw-retiro-no-slots">No hay horarios disponibles para ese día.</p>
                ) : (
                  <select className="tw-input tw-select" name="horaRetiro" value={formData.horaRetiro}
                    onChange={e => setFormData(p => ({ ...p, horaRetiro: e.target.value }))} required>
                    <option value="">Elegí el horario…</option>
                    {horasDisponibles.map(hora => (
                      <option key={hora} value={hora}>{hora} hs.</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <div className="tw-field">
            <label className="tw-label">Comentarios</label>
            <textarea className="tw-textarea" name="comentarios" value={formData.comentarios}
              onChange={handleChange} rows="3" placeholder="¿Alguna solicitud especial?" />
          </div>

          <button type="submit" className="tw-submit" disabled={loading}>
            {loading ? 'Procesando…' : `Confirmar pedido · ${formatPrecio(total)}`}
          </button>
        </form>
      </div>

      {toast && <Toast toast={{ id: 0, ...toast }} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ─── Modal de customización de picada ─── */
function CustomizarModal({ picada, ingredientesMap, onClose, onAgregar }) {
  const [selecciones, setSelecciones] = useState(() => {
    const init = {};
    (picada.secciones || []).forEach(s => { init[s.id] = []; });
    return init;
  });

  const toggleIng = (seccionId, ingId, ingNombre, limite) => {
    setSelecciones(prev => {
      const actual = prev[seccionId] || [];
      const yaEsta = actual.find(i => i.id === ingId);
      if (yaEsta) return { ...prev, [seccionId]: actual.filter(i => i.id !== ingId) };
      if (actual.length >= limite) return prev;
      return { ...prev, [seccionId]: [...actual, { id: ingId, nombre: ingNombre }] };
    });
  };

  const valido = (picada.secciones || []).every(s => {
    if (s.opcional) return true;
    return (selecciones[s.id] || []).length >= 1;
  });

  const handleAgregar = () => {
    const item = {
      cartId: Date.now().toString() + Math.random().toString(36).slice(2),
      picadaId: picada.id,
      nombre: picada.nombre,
      precio: picada.precio,
      cantidad: 1,
      selecciones: {},
    };
    (picada.secciones || []).forEach(s => {
      item.selecciones[s.id] = { nombre: s.nombre, items: selecciones[s.id] || [] };
    });
    onAgregar(item);
    onClose();
  };

  return (
    <div className="tw-modal-overlay" onClick={onClose}>
      <div className="tw-modal" onClick={e => e.stopPropagation()}>
        <div className="tw-modal-head">
          <div>
            <h2 className="tw-modal-nombre">{picada.nombre}</h2>
            <span className="tw-modal-precio">{formatPrecio(picada.precio)}</span>
          </div>
          <button className="tw-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tw-modal-body">
          {picada.descripcion && <p className="tw-modal-desc">{picada.descripcion}</p>}

          {(picada.secciones || []).length === 0 && (
            <p style={{ color: '#8a7e76', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
              Esta picada no tiene secciones configuradas todavía.
            </p>
          )}

          {(picada.secciones || []).map(seccion => {
            const sel = selecciones[seccion.id] || [];
            const ings = (seccion.ingredienteIds || [])
              .map(id => ingredientesMap.get(id))
              .filter(Boolean)
              .filter(i => i.disponible !== false);

            return (
              <div key={seccion.id} className="tw-seccion">
                <div className="tw-seccion-head">
                  <div>
                    <span className="tw-seccion-nombre">{seccion.nombre}</span>
                    {seccion.opcional && <span className="tw-seccion-opt-tag">opcional</span>}
                  </div>
                  <span className={`tw-seccion-count${sel.length === seccion.limite ? ' tw-seccion-count--full' : sel.length > 0 ? ' tw-seccion-count--partial' : ''}`}>
                    {sel.length}/{seccion.limite}
                  </span>
                </div>
                {ings.length === 0 ? (
                  <p className="tw-seccion-empty">No hay opciones disponibles.</p>
                ) : (
                  <div className="tw-seccion-pills">
                    {ings.map(ing => {
                      const selec = !!sel.find(i => i.id === ing.id);
                      const lleno = sel.length >= seccion.limite && !selec;
                      return (
                        <button key={ing.id} type="button"
                          className={`tw-ing-pill${selec ? ' tw-ing-pill--on' : ''}${lleno ? ' tw-ing-pill--disabled' : ''}`}
                          onClick={() => !lleno || selec ? toggleIng(seccion.id, ing.id, ing.nombre, seccion.limite) : null}>
                          {ing.nombre}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="tw-modal-foot">
          {!valido && (
            <p className="tw-modal-hint">Completá todas las secciones requeridas</p>
          )}
          <button className="tw-modal-agregar" onClick={handleAgregar} disabled={!valido}>
            Agregar al pedido · {formatPrecio(picada.precio)}
          </button>
        </div>
      </div>
    </div>
  );
}

const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const formatDiasAbiertos = (dias) => {
  if (!dias || dias.length === 0) return '';
  const nombres = dias.map(d => NOMBRES_DIA[d]);
  if (nombres.length === 1) return nombres[0];
  return nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1];
};

const esDiaAbierto = (diasAbiertos) => {
  if (!diasAbiertos || diasAbiertos.length === 0) return true;
  return diasAbiertos.includes(new Date().getDay());
};

const esDentroDeHorario = (desde, hasta) => {
  const hora = new Date().getHours();
  if (desde !== undefined && hora < desde) return false;
  if (hasta !== undefined && hora >= hasta) return false;
  return true;
};

const generarHorasRetiro = (fecha, desde, hasta, bufferMinutos = 60) => {
  if (desde == null || hasta == null) return [];
  const ahora = new Date();
  const esHoy = fecha.getFullYear() === ahora.getFullYear() &&
    fecha.getMonth() === ahora.getMonth() && fecha.getDate() === ahora.getDate();
  const minimo = esHoy ? new Date(ahora.getTime() + bufferMinutos * 60 * 1000) : null;
  const slots = [];
  for (let h = desde; h < hasta; h++) {
    for (let m = 0; m < 60; m += 30) {
      const slot = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), h, m);
      if (minimo && slot < minimo) continue;
      slots.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
    }
  }
  return slots;
};

const generarFechasRetiro = (diasAbiertos, horarioDesde, horarioHasta, maxDias = 14) => {
  if (!diasAbiertos || diasAbiertos.length === 0) return [];
  const resultado = [];
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  for (let i = 0; resultado.length < maxDias && i < maxDias + 14; i++) {
    const f = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
    if (!diasAbiertos.includes(f.getDay())) continue;
    if (generarHorasRetiro(f, horarioDesde, horarioHasta).length === 0) continue;
    resultado.push(f);
  }
  return resultado;
};

const fechaAKey = f =>
  f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0') + '-' + String(f.getDate()).padStart(2, '0');

const parseFechaKey = key => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatFechaRetiroLabel = (fecha) => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  const dia = NOMBRES_DIA[fecha.getDay()];
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const base = dia + ' ' + dd + '/' + mm;
  if (fecha.getTime() === hoy.getTime()) return 'Hoy · ' + base;
  if (fecha.getTime() === manana.getTime()) return 'Mañana · ' + base;
  return base.charAt(0).toUpperCase() + base.slice(1);
};


/* ─── Catalog ─── */
function TakeAway() {
  const [picadas, setPicadas] = useState([]);
  const [ingredientesMap, setIngredientesMap] = useState(new Map());
  const [adicionales, setAdicionales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [carrito, setCarrito] = useState([]);
  const [carritoOpen, setCarritoOpen] = useState(false);
  const [customizando, setCustomizando] = useState(null);
  const [step, setStep] = useState('catalogo');
  const [pedidoNum, setPedidoNum] = useState('');
  const [retiroLabel, setRetiroLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [toast, setToast] = useState(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('selvaggio_tw_carrito');
      if (saved) setCarrito(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('selvaggio_tw_carrito', JSON.stringify(carrito));
  }, [carrito]);

  useEffect(() => {
    getDoc(doc(db, 'selvaggio_configuracion', 'takeaway_config'))
      .then(snap => setConfig(snap.exists() ? snap.data() : { activo: false }))
      .catch(() => setConfig({ activo: false }));

    trackViewContent('Take Away', 'Take Away');

    Promise.all([
      getDocs(collection(db, 'selvaggio_tw_picadas')),
      getDocs(collection(db, 'selvaggio_tw_ingredientes')),
      getDocs(collection(db, 'selvaggio_tw_adicionales')),
    ]).then(([picSnap, ingSnap, adicSnap]) => {
      setPicadas(
        picSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.disponible !== false)
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      );
      const map = new Map();
      ingSnap.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
      setIngredientesMap(map);
      setAdicionales(
        adicSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(a => a.disponible !== false)
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      );
    }).catch(() => {}).finally(() => setCargando(false));
  }, []);

  const checkoutTracked = useRef(false);
  const agregarAlCarrito = (item) => {
    if (!checkoutTracked.current && carrito.length === 0) {
      checkoutTracked.current = true;
      trackTakeAwayInicio();
    }
    setCarrito(prev => [...prev, item]);
    setToast({ message: `${item.nombre} agregado al pedido`, type: 'success' });
  };

  const cambiarCantidad = (cartId, delta) => {
    setCarrito(prev =>
      prev.map(i => i.cartId === cartId ? { ...i, cantidad: Math.max(0, i.cantidad + delta) } : i)
        .filter(i => i.cantidad > 0)
    );
  };

  const cambiarAdicional = (adic, delta) => {
    setCarrito(prev => {
      const existing = prev.find(i => i.adicionalId === adic.id);
      if (existing) {
        const newQty = existing.cantidad + delta;
        if (newQty <= 0) return prev.filter(i => i.adicionalId !== adic.id);
        return prev.map(i => i.adicionalId === adic.id ? { ...i, cantidad: newQty } : i);
      }
      if (delta > 0) {
        return [...prev, { cartId: 'adic-' + adic.id, adicionalId: adic.id, nombre: adic.nombre, precio: adic.precio, cantidad: 1, tipo: 'adicional' }];
      }
      return prev;
    });
  };

  const cantidadAdicional = (adicId) => (carrito.find(i => i.adicionalId === adicId)?.cantidad || 0);
  const totalCarrito = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const cantidadItems = carrito.reduce((acc, i) => acc + i.cantidad, 0);

  // Deshabilitada temporalmente: EmailJS no puede enviar mails (cuenta de Gmail desconectada)
  const verificacionActiva = false;

  const handleConfirmar = (formData) => {
    setPendingFormData(formData);
    if (verificacionActiva) {
      setStep('verificacion');
    } else {
      handleConfirmarFinalConData(formData);
    }
  };

  // Se llama una vez verificado el email (o directo si la verificación no está activa)
  const handleConfirmarFinalConData = async (formData) => {
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'selvaggio_takeaway_pedidos'), {
        numeroPedido: '',
        nombre: formData.nombre, apellido: formData.apellido,
        email: formData.email, telefono: formData.telefono,
        items: carrito.map(i => ({ ...i, subtotal: i.precio * i.cantidad })),
        subtotal: formData.subtotal,
        descuento: formData.descuento || 0,
        total: formData.totalFinal,
        metodoPago: formData.metodoPago,
        comentarios: formData.comentarios,
        fechaRetiro: formData.fechaRetiro || '',
        horaRetiro: formData.horaRetiro || '',
        metodoEnvio: formData.metodoEnvio || 'retiro',
        localidadEnvio: formData.metodoEnvio === 'envio' ? (formData.localidadEnvio || '') : '',
        direccionEnvio: formData.metodoEnvio === 'envio' ? (formData.direccionEnvio || '') : '',
        pisoDeptoEnvio: formData.metodoEnvio === 'envio' ? (formData.pisoDeptoEnvio || '') : '',
        referenciaEnvio: formData.metodoEnvio === 'envio' ? (formData.referenciaEnvio || '') : '',
        estado: 'pendiente',
        createdAt: Timestamp.now(),
      });
      const numStr = 'TW-' + docRef.id.slice(-6).toUpperCase();
      await setDoc(docRef, { numeroPedido: numStr }, { merge: true });

      if (formData.email) {
        const clienteId = formData.email.toLowerCase().trim();
        const clienteRef = doc(db, 'selvaggio_clientes', clienteId);
        const snap = await getDoc(clienteRef);
        const nombreCompleto = formData.nombre + (formData.apellido ? ' ' + formData.apellido : '');
        if (snap.exists()) {
          await setDoc(clienteRef, {
            nombre: nombreCompleto,
            telefono: formData.telefono || snap.data().telefono || '',
            totalPedidos: increment(1),
            ultimoPedido: new Date().toISOString(),
          }, { merge: true });
        } else {
          await setDoc(clienteRef, {
            nombre: nombreCompleto, email: clienteId,
            telefono: formData.telefono || '',
            totalReservas: 0, totalPedidos: 1,
            ultimoPedido: new Date().toISOString(),
            creado: new Date().toISOString(),
          });
        }
      }

      // Notificar al local apenas entra el pedido
      enviarNotificacionPedidoTakeAway({
        numeroPedido: numStr,
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        telefono: formData.telefono,
        items: carrito,
        subtotal: formData.subtotal,
        descuento: formData.descuento || 0,
        total: formData.totalFinal,
        metodoPago: formData.metodoPago,
        comentarios: formData.comentarios,
        fechaRetiro: formData.fechaRetiro || '',
        horaRetiro: formData.horaRetiro || '',
        metodoEnvio: formData.metodoEnvio || 'retiro',
        localidadEnvio: formData.metodoEnvio === 'envio' ? (formData.localidadEnvio || '') : '',
        direccionEnvio: formData.metodoEnvio === 'envio' ? (formData.direccionEnvio || '') : '',
        pisoDeptoEnvio: formData.metodoEnvio === 'envio' ? (formData.pisoDeptoEnvio || '') : '',
        referenciaEnvio: formData.metodoEnvio === 'envio' ? (formData.referenciaEnvio || '') : '',
      });

      await trackTakeAwayPedido(formData.totalFinal, formData);
      setPedidoNum(numStr);
      if (formData.fechaRetiro && formData.horaRetiro) {
        const [y, m, d] = formData.fechaRetiro.split('-').map(Number);
        const fecha = new Date(y, m - 1, d);
        const diaStr = NOMBRES_DIA[fecha.getDay()] + ' ' + String(d).padStart(2,'0') + '/' + String(m).padStart(2,'0');
        setRetiroLabel(diaStr + ' a las ' + formData.horaRetiro);
      }
      setCarrito([]);
      localStorage.removeItem('selvaggio_tw_carrito');
      setStep('exito');
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al procesar el pedido. Intentá nuevamente.', type: 'error' });
      setStep(verificacionActiva ? 'verificacion' : 'checkout');
    } finally { setLoading(false); }
  };

  const handleConfirmarFinal = () => handleConfirmarFinalConData(pendingFormData);

  // ── Early returns ──
  if (config === null) return (
    <div className="tw-page">
      <nav className="tw-nav">
        <Link to="/" className="tw-nav__logo">
          <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="tw-nav__logo-img" />
        </Link>
        <span className="tw-nav__title">Take Away</span><span />
      </nav>
    </div>
  );

  if (config.activo === false) return (
    <div className="tw-page">
      <nav className="tw-nav">
        <Link to="/" className="tw-nav__logo">
          <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="tw-nav__logo-img" />
        </Link>
        <span className="tw-nav__title">Take Away</span>
        <Link to="/" className="tw-nav__back">← Inicio</Link>
      </nav>
      <div className="tw-unavailable">
        <div className="tw-unavailable__icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1 className="tw-unavailable__title">Take Away no disponible</h1>
        <p className="tw-unavailable__sub">Por el momento no estamos recibiendo pedidos online.<br />Podés contactarnos directamente o volver a intentarlo más tarde.</p>
        <Link to="/" className="tw-success__btn">← Volver al inicio</Link>
      </div>
    </div>
  );

  // 3. Flujo de pedido en curso — ANTES de los gates de horario
  if (step === 'exito') return <SuccessScreen pedidoNum={pedidoNum} retiroLabel={retiroLabel} />;

  if (step === 'verificacion' && pendingFormData) return (
    <>
      <VerificacionEmailScreen
        email={pendingFormData.email}
        nombre={pendingFormData.nombre}
        onVerificado={handleConfirmarFinal}
        onVolver={() => setStep('checkout')}
      />
      {loading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <p style={{ color: '#f5f0e8', fontSize: 16 }}>Procesando pedido…</p>
        </div>
      )}
      {toast && <Toast toast={{ id: 0, ...toast }} onClose={() => setToast(null)} />}
    </>
  );

  if (step === 'checkout') return (
    <>
      <CheckoutScreen carrito={carrito} onVolver={() => setStep('catalogo')}
        onConfirmar={handleConfirmar} loading={loading} config={config} />
      {toast && <Toast toast={{ id: 0, ...toast }} onClose={() => setToast(null)} />}
    </>
  );

  return (
    <div className="tw-page">
      {/* Modal customización */}
      {customizando && (
        <CustomizarModal
          picada={customizando}
          ingredientesMap={ingredientesMap}
          onClose={() => setCustomizando(null)}
          onAgregar={agregarAlCarrito}
        />
      )}

      <nav className="tw-nav">
        <Link to="/" className="tw-nav__logo"><img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="tw-nav__logo-img" /></Link>
        <span className="tw-nav__title">Take Away</span>
        <Link to="/" className="tw-nav__back">← Inicio</Link>
      </nav>

      <div className="tw-hero">
        <span className="tw-hero__eyebrow">Selvaggio · Wine Bar & Delicatessen</span>
        <h1 className="tw-hero__title">Armá tu picada, <em>retirala.</em></h1>
        <p className="tw-hero__sub">Elegí tu picada, personalizá el contenido y pasá a buscarla cuando esté lista.</p>
        <div className="tw-hero__info">
          <span className="tw-hero__info-pill">📍 Retirás en Av. Fondo de la Legua 59, Las Lomas de San Isidro</span>
          {config?.zonasEnvio?.length > 0 && (
            <span className="tw-hero__info-pill tw-hero__info-pill--free">🚚 Envío gratis a zonas seleccionadas</span>
          )}
        </div>
        <Link to="/take-away/seguimiento" className="tw-hero__seguimiento">¿Tenés un pedido? Seguilo →</Link>
      </div>

      <div className="tw-catalog">
        {cargando ? (
          <div className="tw-catalog__loading">Cargando picadas…</div>
        ) : picadas.length === 0 ? (
          <div className="tw-catalog__empty">No hay picadas disponibles por el momento.</div>
        ) : (
          <div className="tw-grid">
            {picadas.map(picada => (
              <div key={picada.id} className="tw-card">
                {picada.imagen && (
                  <div className="tw-card__img-wrap">
                    <img src={picada.imagen} alt={picada.nombre} className="tw-card__img" loading="lazy" />
                  </div>
                )}
                <div className="tw-card__body">
                  <h3 className="tw-card__nombre">{picada.nombre}</h3>
                  {picada.descripcion && <p className="tw-card__desc">{picada.descripcion}</p>}

                  {/* Resumen de secciones */}
                  {(picada.secciones || []).length > 0 && (
                    <div className="tw-card__secs">
                      {picada.secciones.map(s => (
                        <span key={s.id} className="tw-card__sec-tag">
                          {s.nombre} · {s.limite > 1 ? `elegí ${s.limite}` : 'elegí 1'}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="tw-card__foot">
                    <span className="tw-card__precio">{formatPrecio(picada.precio)}</span>
                    <button className="tw-card__add tw-card__add--armar" onClick={() => setCustomizando(picada)}>
                      Armar →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Adicionales */}
      {adicionales.length > 0 && (
        <div className="tw-adicionales">
          <h2 className="tw-adicionales__title">Agregá algo más</h2>
          <div className="tw-adicionales-grid">
            {adicionales.map(adic => {
              const qty = cantidadAdicional(adic.id);
              return (
                <div key={adic.id} className="tw-adic-card">
                  <div className="tw-adic-card__info">
                    <span className="tw-adic-card__nombre">{adic.nombre}</span>
                    {adic.descripcion && <span className="tw-adic-card__desc">{adic.descripcion}</span>}
                    <span className="tw-adic-card__precio">{formatPrecio(adic.precio)}</span>
                  </div>
                  <div className="tw-adic-card__ctrl">
                    {qty === 0 ? (
                      <button className="tw-adic-card__add" onClick={() => cambiarAdicional(adic, 1)}>+ Agregar</button>
                    ) : (
                      <div className="tw-adic-qty">
                        <button className="tw-adic-qty__btn" onClick={() => cambiarAdicional(adic, -1)}>−</button>
                        <span className="tw-adic-qty__val">{qty}</span>
                        <button className="tw-adic-qty__btn" onClick={() => cambiarAdicional(adic, 1)}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Cart drawer */}
      {carritoOpen && (
        <div className="tw-drawer-overlay" onClick={() => setCarritoOpen(false)}>
          <div className="tw-drawer" onClick={e => e.stopPropagation()}>
            <div className="tw-drawer__head">
              <h3>Tu pedido</h3>
              <button className="tw-drawer__close" onClick={() => setCarritoOpen(false)}>✕</button>
            </div>
            <div className="tw-drawer__items">
              {carrito.length === 0 ? (
                <p className="tw-drawer__empty">No agregaste nada todavía.</p>
              ) : carrito.map(item => (
                <div key={item.cartId} className="tw-drawer__item">
                  <div className="tw-drawer__item-info">
                    <span className="tw-drawer__item-nombre">{item.nombre}</span>
                    {item.selecciones && Object.values(item.selecciones).map((sec, i) =>
                      sec.items && sec.items.length > 0 ? (
                        <span key={i} className="tw-drawer__item-selec">
                          {sec.nombre}: {sec.items.map(x => x.nombre).join(', ')}
                        </span>
                      ) : null
                    )}
                    <span className="tw-drawer__item-precio">
                      {formatPrecio(item.precio)} × {item.cantidad} = {formatPrecio(item.precio * item.cantidad)}
                    </span>
                  </div>
                  <div className="tw-drawer__item-qty">
                    <button onClick={() => cambiarCantidad(item.cartId, -1)}>−</button>
                    <span>{item.cantidad}</span>
                    <button onClick={() => cambiarCantidad(item.cartId, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
            {carrito.length > 0 && (
              <div className="tw-drawer__foot">
                <div className="tw-drawer__total"><span>Total</span><span>{formatPrecio(totalCarrito)}</span></div>
                <button className="tw-drawer__checkout" onClick={() => { setCarritoOpen(false); setStep('checkout'); }}>
                  Ir al checkout →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {cantidadItems > 0 && (
        <button className="tw-cart-float" onClick={() => setCarritoOpen(true)}>
          <span className="tw-cart-float__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
          <span className="tw-cart-float__text">Ver pedido · {formatPrecio(totalCarrito)}</span>
          <span className="tw-cart-float__badge">{cantidadItems}</span>
        </button>
      )}

      {toast && <Toast toast={{ id: 0, ...toast }} onClose={() => setToast(null)} />}
    </div>
  );
}

export default TakeAway;
