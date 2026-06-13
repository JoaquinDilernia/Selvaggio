import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  collection, getDocs, addDoc, getDoc, doc, setDoc, increment, Timestamp, runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import Toast from '../components/Toast';
import './TakeAway.css';

const METODOS_PAGO = [
  { id: 'efectivo',       label: 'Efectivo',       desc: 'Pagás al retirar' },
  { id: 'transferencia',  label: 'Transferencia',  desc: 'Al retirar' },
  { id: 'tarjeta',        label: 'Tarjeta',        desc: 'Débito / crédito' },
];

const formatPrecio = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

/* ─── Success screen ─── */
function SuccessScreen({ pedidoNum }) {
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
          Estamos preparando tu pedido. Te avisamos cuando esté listo para retirar.
        </p>
        <div className="tw-success__num">
          <span className="tw-success__num-label">Tu número de pedido</span>
          <span className="tw-success__num-val">{pedidoNum}</span>
        </div>
        <Link to={`/take-away/seguimiento?id=${pedidoNum}`} className="tw-success__btn">
          Seguir mi pedido →
        </Link>
        <Link to="/" className="tw-success__volver">← Volver al inicio</Link>
      </div>
    </div>
  );
}

/* ─── Checkout step ─── */
function CheckoutScreen({ carrito, onVolver, onConfirmar, loading }) {
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', email: '', telefono: '',
    metodoPago: 'efectivo', comentarios: ''
  });
  const [toast, setToast] = useState(null);

  const total = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (carrito.length === 0) { setToast({ message: 'El carrito está vacío', type: 'error' }); return; }
    onConfirmar(formData);
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
            <div key={item.productoId} className="tw-resumen__row">
              <span className="tw-resumen__qty">{item.cantidad}×</span>
              <span className="tw-resumen__nombre">
                {item.nombre}
                {item.unidad && <span className="tw-resumen__unidad"> · {item.unidad}</span>}
              </span>
              <span className="tw-resumen__precio">{formatPrecio(item.precio * item.cantidad)}</span>
            </div>
          ))}
          <div className="tw-resumen__total">
            <span>Total</span>
            <span>{formatPrecio(total)}</span>
          </div>
          <p className="tw-resumen__nota">El pago se realiza al momento de retirar en el local.</p>
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
            <label className="tw-label tw-label--req">Método de pago</label>
            <p className="tw-pago-nota">Todos los pagos se realizan al retirar en el local.</p>
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

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ─── Main catalog ─── */
function TakeAway() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [carrito, setCarrito] = useState([]);
  const [carritoOpen, setCarritoOpen] = useState(false);
  const [step, setStep] = useState('catalogo');
  const [pedidoNum, setPedidoNum] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [takeawayActivo, setTakeawayActivo] = useState(null); // null = cargando

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
      .then(snap => setTakeawayActivo(snap.exists() ? snap.data().activo === true : false))
      .catch(() => setTakeawayActivo(false));

    getDocs(collection(db, 'selvaggio_takeaway_productos'))
      .then(snap => {
        setProductos(
          snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.disponible !== false)
            .sort((a, b) => (a.orden || 0) - (b.orden || 0))
        );
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.productoId === producto.id);
      if (existe) return prev.map(i => i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        unidad: producto.unidad || '',
        cantidad: 1,
      }];
    });
  };

  const cambiarCantidad = (productoId, delta) => {
    setCarrito(prev =>
      prev
        .map(i => i.productoId === productoId ? { ...i, cantidad: Math.max(0, i.cantidad + delta) } : i)
        .filter(i => i.cantidad > 0)
    );
  };

  const cantidadEnCarrito = (productoId) => carrito.find(i => i.productoId === productoId)?.cantidad || 0;
  const totalCarrito = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const cantidadItems = carrito.reduce((acc, i) => acc + i.cantidad, 0);

  const categorias = ['Todos', ...new Set(productos.map(p => p.categoria).filter(Boolean))];
  const productosFiltrados = categoriaActiva === 'Todos'
    ? productos
    : productos.filter(p => p.categoria === categoriaActiva);

  const handleConfirmar = async (formData) => {
    setLoading(true);
    try {
      const counterRef = doc(db, 'selvaggio_configuracion', 'takeaway_counter');
      const n = await runTransaction(db, async (t) => {
        const snap = await t.get(counterRef);
        const num = (snap.exists() ? snap.data().ultimo || 0 : 0) + 1;
        t.set(counterRef, { ultimo: num }, { merge: true });
        return num;
      });
      const numStr = `TW-${String(n).padStart(4, '0')}`;

      await addDoc(collection(db, 'selvaggio_takeaway_pedidos'), {
        numeroPedido: numStr,
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        telefono: formData.telefono,
        items: carrito.map(i => ({ ...i, subtotal: i.precio * i.cantidad })),
        total: totalCarrito,
        metodoPago: formData.metodoPago,
        comentarios: formData.comentarios,
        estado: 'pendiente',
        createdAt: Timestamp.now(),
      });

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
            nombre: nombreCompleto,
            email: clienteId,
            telefono: formData.telefono || '',
            totalReservas: 0,
            totalPedidos: 1,
            ultimoPedido: new Date().toISOString(),
            creado: new Date().toISOString(),
          });
        }
      }

      setPedidoNum(numStr);
      setCarrito([]);
      localStorage.removeItem('selvaggio_tw_carrito');
      setStep('exito');
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al procesar el pedido. Intentá nuevamente.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (takeawayActivo === null) return (
    <div className="tw-page">
      <nav className="tw-nav">
        <Link to="/" className="tw-nav__logo">
          <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="tw-nav__logo-img" />
        </Link>
        <span className="tw-nav__title">Take Away</span>
        <span />
      </nav>
    </div>
  );

  if (takeawayActivo === false) return (
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="tw-unavailable__title">Take Away no disponible</h1>
        <p className="tw-unavailable__sub">
          Por el momento no estamos recibiendo pedidos online.<br />
          Podés contactarnos directamente o volver a intentarlo más tarde.
        </p>
        <Link to="/" className="tw-success__btn">← Volver al inicio</Link>
      </div>
    </div>
  );

  if (step === 'exito') return <SuccessScreen pedidoNum={pedidoNum} />;

  if (step === 'checkout') {
    return (
      <CheckoutScreen
        carrito={carrito}
        onVolver={() => setStep('catalogo')}
        onConfirmar={handleConfirmar}
        loading={loading}
      />
    );
  }

  return (
    <div className="tw-page">
      <nav className="tw-nav">
        <Link to="/" className="tw-nav__logo">
          <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="tw-nav__logo-img" />
        </Link>
        <span className="tw-nav__title">Take Away</span>
        <Link to="/" className="tw-nav__back">← Inicio</Link>
      </nav>

      <div className="tw-hero">
        <span className="tw-hero__eyebrow">Selvaggio · Wine Bar & Delicatessen</span>
        <h1 className="tw-hero__title">Elegí, pedí, <em>retirá.</em></h1>
        <p className="tw-hero__sub">Armá tu pedido online y pasá a buscarlo cuando esté listo.</p>
        <Link to="/take-away/seguimiento" className="tw-hero__seguimiento">
          ¿Tenés un pedido? Seguilo →
        </Link>
      </div>

      <div className="tw-cats">
        <div className="tw-cats__inner">
          {categorias.map(cat => (
            <button key={cat}
              className={`tw-cat-btn${categoriaActiva === cat ? ' tw-cat-btn--on' : ''}`}
              onClick={() => setCategoriaActiva(cat)}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="tw-catalog">
        {cargando ? (
          <div className="tw-catalog__loading">Cargando productos…</div>
        ) : productosFiltrados.length === 0 ? (
          <div className="tw-catalog__empty">
            {productos.length === 0
              ? 'No hay productos disponibles por el momento.'
              : 'No hay productos en esta categoría.'}
          </div>
        ) : (
          <div className="tw-grid">
            {productosFiltrados.map(producto => {
              const qty = cantidadEnCarrito(producto.id);
              return (
                <div key={producto.id} className="tw-card">
                  {producto.imagen && (
                    <div className="tw-card__img-wrap">
                      <img src={producto.imagen} alt={producto.nombre} className="tw-card__img" loading="lazy" />
                    </div>
                  )}
                  <div className="tw-card__body">
                    <span className="tw-card__cat">{producto.categoria}</span>
                    <h3 className="tw-card__nombre">{producto.nombre}</h3>
                    {producto.descripcion && <p className="tw-card__desc">{producto.descripcion}</p>}
                    <div className="tw-card__foot">
                      <div className="tw-card__precio-wrap">
                        <span className="tw-card__precio">{formatPrecio(producto.precio)}</span>
                        {producto.unidad && <span className="tw-card__unidad">/ {producto.unidad}</span>}
                      </div>
                      {qty === 0 ? (
                        <button className="tw-card__add" onClick={() => agregarAlCarrito(producto)}>
                          + Agregar
                        </button>
                      ) : (
                        <div className="tw-card__qty">
                          <button className="tw-card__qty-btn" onClick={() => cambiarCantidad(producto.id, -1)}>−</button>
                          <span className="tw-card__qty-val">{qty}</span>
                          <button className="tw-card__qty-btn" onClick={() => cambiarCantidad(producto.id, 1)}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
                <div key={item.productoId} className="tw-drawer__item">
                  <div className="tw-drawer__item-info">
                    <span className="tw-drawer__item-nombre">
                      {item.nombre}
                      {item.unidad && <span className="tw-drawer__item-unidad"> · {item.unidad}</span>}
                    </span>
                    <span className="tw-drawer__item-precio">
                      {formatPrecio(item.precio)} × {item.cantidad} = {formatPrecio(item.precio * item.cantidad)}
                    </span>
                  </div>
                  <div className="tw-drawer__item-qty">
                    <button onClick={() => cambiarCantidad(item.productoId, -1)}>−</button>
                    <span>{item.cantidad}</span>
                    <button onClick={() => cambiarCantidad(item.productoId, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
            {carrito.length > 0 && (
              <div className="tw-drawer__foot">
                <div className="tw-drawer__total">
                  <span>Total</span>
                  <span>{formatPrecio(totalCarrito)}</span>
                </div>
                <button className="tw-drawer__checkout"
                  onClick={() => { setCarritoOpen(false); setStep('checkout'); }}>
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

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default TakeAway;
