import { useState, useEffect, useRef } from 'react';
import {
  collection, getDocs, addDoc, deleteDoc, doc, getDoc, setDoc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import './AdminTakeAway.css';

const CATEGORIAS = ['Vinos', 'Picadas', 'Combos', 'Bebidas', 'Otros'];

const ESTADO_LABEL = {
  pendiente:  'Pendiente',
  preparando: 'Preparando',
  listo:      'Listo',
  entregado:  'Entregado',
  cancelado:  'Cancelado',
};

const ESTADO_NEXT = {
  pendiente:  { estado: 'preparando', label: 'Marcar preparando' },
  preparando: { estado: 'listo',      label: 'Marcar listo' },
  listo:      { estado: 'entregado',  label: 'Marcar entregado' },
};

const PAGO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta' };

const formatPrecio = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

/* ─── Simple toast ─── */
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`atw__toast atw__toast--${type}`} onClick={onClose}>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      <span>{message}</span>
    </div>
  );
}

/* ══════════════════════════════════
   PEDIDOS TAB
══════════════════════════════════ */
function PedidosTW() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [filtro, setFiltro] = useState('activos');

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(() => fetchPedidos(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPedidos = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'selvaggio_takeaway_pedidos'));
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const tb = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return tb - ta;
        });
      setPedidos(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const cambiarEstado = async (pedidoId, nuevoEstado) => {
    try {
      await updateDoc(doc(db, 'selvaggio_takeaway_pedidos', pedidoId), { estado: nuevoEstado });
      setToast({ message: `Estado → ${ESTADO_LABEL[nuevoEstado]}`, type: 'success' });
      fetchPedidos(true);
    } catch {
      setToast({ message: 'Error al actualizar', type: 'error' });
    }
  };

  const eliminar = async (pedidoId, numPedido) => {
    if (!confirm(`¿Eliminar el pedido ${numPedido}?`)) return;
    try {
      await deleteDoc(doc(db, 'selvaggio_takeaway_pedidos', pedidoId));
      setToast({ message: 'Pedido eliminado', type: 'success' });
      fetchPedidos(true);
    } catch {
      setToast({ message: 'Error al eliminar', type: 'error' });
    }
  };

  const abrirWpp = (pedido) => {
    const tel = pedido.telefono?.replace(/\D/g, '') || '';
    let msg = '';
    if (pedido.estado === 'listo') {
      msg = `Hola ${pedido.nombre}! 🎉 Tu pedido ${pedido.numeroPedido} de Selvaggio está listo para retirar. Te esperamos en Av. Fondo de la Legua 59, Las Lomas de San Isidro.`;
    } else if (pedido.estado === 'preparando') {
      msg = `Hola ${pedido.nombre}! Tu pedido ${pedido.numeroPedido} de Selvaggio está siendo preparado. En breve te avisamos cuando esté listo.`;
    } else {
      msg = `Hola ${pedido.nombre}! Te contactamos desde Selvaggio por tu pedido ${pedido.numeroPedido}.`;
    }
    window.open(`https://wa.me/54${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const formatFecha = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const ACTIVOS = ['pendiente', 'preparando', 'listo'];
  const HIST    = ['entregado', 'cancelado'];

  const filtrados = pedidos.filter(p => {
    if (filtro === 'activos')    return ACTIVOS.includes(p.estado);
    if (filtro === 'historial')  return HIST.includes(p.estado);
    return p.estado === filtro;
  });

  const countActivos = pedidos.filter(p => ACTIVOS.includes(p.estado)).length;

  const FILTROS = [
    { id: 'activos',    label: `Activos${countActivos ? ` (${countActivos})` : ''}` },
    { id: 'pendiente',  label: 'Pendientes' },
    { id: 'preparando', label: 'Preparando' },
    { id: 'listo',      label: 'Listos' },
    { id: 'historial',  label: 'Historial' },
  ];

  return (
    <div>
      <div className="atw__toolbar">
        {FILTROS.map(f => (
          <button key={f.id}
            className={`atw__filter-btn${filtro === f.id ? ' atw__filter-btn--on' : ''}`}
            onClick={() => setFiltro(f.id)}>
            {f.label}
          </button>
        ))}
        <button className="atw__refresh" onClick={() => fetchPedidos()}>↻ Actualizar</button>
      </div>

      {loading ? (
        <p className="atw__loading">Cargando pedidos…</p>
      ) : filtrados.length === 0 ? (
        <p className="atw__empty">No hay pedidos en esta categoría.</p>
      ) : (
        <div className="atw__grid">
          {filtrados.map(p => {
            const siguiente = ESTADO_NEXT[p.estado];
            return (
              <div key={p.id} className="atw__card">
                {/* Head */}
                <div className="atw__card-head">
                  <div>
                    <span className="atw__card-num">{p.numeroPedido}</span>
                    <span className="atw__card-meta">{formatFecha(p.createdAt)}</span>
                  </div>
                  <span className={`atw__badge atw__badge--${p.estado}`}>
                    {ESTADO_LABEL[p.estado] || p.estado}
                  </span>
                </div>

                {/* Body */}
                <div className="atw__card-body">
                  <div className="atw__card-cliente">
                    <span className="atw__card-nombre">{p.nombre} {p.apellido}</span>
                    <span className="atw__card-contacto">{p.telefono} · {p.email}</span>
                  </div>

                  {/* Items */}
                  <div className="atw__items">
                    {(p.items || []).map((item, i) => (
                      <div key={i} className="atw__item-row">
                        <span className="atw__item-qty">{item.cantidad}×</span>
                        <span className="atw__item-nombre">{item.nombre}</span>
                        <span className="atw__item-precio">{formatPrecio(item.subtotal || item.precio * item.cantidad)}</span>
                      </div>
                    ))}
                    <div className="atw__total">
                      <span>Total</span>
                      <span>{formatPrecio(p.total)}</span>
                    </div>
                  </div>

                  <div className="atw__card-info-row">
                    <span>Pago:</span>
                    <span>{PAGO_LABEL[p.metodoPago] || p.metodoPago || '—'}</span>
                  </div>

                  {p.comentarios && (
                    <p className="atw__card-comentario">"{p.comentarios}"</p>
                  )}
                </div>

                {/* Actions */}
                <div className="atw__card-actions">
                  {siguiente && (
                    <button className="atw__btn atw__btn--next"
                      onClick={() => cambiarEstado(p.id, siguiente.estado)}>
                      {siguiente.label}
                    </button>
                  )}
                  <button className="atw__btn atw__btn--wpp" onClick={() => abrirWpp(p)}
                    title="Contactar por WhatsApp">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style={{verticalAlign:'middle',marginRight:4}}>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </button>
                  {p.estado !== 'cancelado' && p.estado !== 'entregado' && (
                    <button className="atw__btn atw__btn--cancel"
                      onClick={() => cambiarEstado(p.id, 'cancelado')}>
                      Cancelar
                    </button>
                  )}
                  <button className="atw__btn atw__btn--delete atw__btn--ml"
                    onClick={() => eliminar(p.id, p.numeroPedido)}>
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ══════════════════════════════════
   PRODUCTOS TAB
══════════════════════════════════ */
const PROD_EMPTY = {
  nombre: '', descripcion: '', precio: '', categoria: 'Picadas',
  imagen: '', disponible: true, orden: 0, unidad: '',
};

function ProductosTW() {
  const [productos, setProductos] = useState([]);
  const [loading, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(PROD_EMPTY);
  const [toast, setToast] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null); // 0-100 | null
  const [imagenPreview, setImagenPreview] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => { fetchProductos(); }, []);

  const fetchProductos = async () => {
    setCargando(true);
    try {
      const snap = await getDocs(collection(db, 'selvaggio_takeaway_productos'));
      setProductos(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      );
    } catch {}
    finally { setCargando(false); }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImagenFile = (file) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setImagenPreview(preview);
    const storageRef = ref(storage, `takeaway_productos/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(storageRef, file);
    setUploadProgress(0);
    task.on('state_changed',
      (snap) => setUploadProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      () => { setToast({ message: 'Error al subir la imagen', type: 'error' }); setUploadProgress(null); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setForm(p => ({ ...p, imagen: url }));
        setUploadProgress(null);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.precio) {
      setToast({ message: 'Nombre y precio son obligatorios', type: 'error' }); return;
    }
    setGuardando(true);
    try {
      const data = {
        ...form,
        precio: parseFloat(form.precio) || 0,
        unidad: form.unidad.trim(),
        orden: parseInt(form.orden) || 0,
      };
      if (editandoId) {
        await updateDoc(doc(db, 'selvaggio_takeaway_productos', editandoId), { ...data, updatedAt: serverTimestamp() });
        setToast({ message: 'Producto actualizado', type: 'success' });
      } else {
        await addDoc(collection(db, 'selvaggio_takeaway_productos'), { ...data, createdAt: serverTimestamp() });
        setToast({ message: 'Producto creado', type: 'success' });
      }
      setForm(PROD_EMPTY);
      setEditandoId(null);
      setMostrarForm(false);
      setImagenPreview('');
      setUploadProgress(null);
      fetchProductos();
    } catch {
      setToast({ message: 'Error al guardar', type: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const startEdit = (prod) => {
    setForm({
      nombre: prod.nombre || '',
      descripcion: prod.descripcion || '',
      precio: prod.precio || '',
      categoria: prod.categoria || 'Picadas',
      imagen: prod.imagen || '',
      disponible: prod.disponible !== false,
      orden: prod.orden || 0,
      unidad: prod.unidad || '',
    });
    setImagenPreview(prod.imagen || '');
    setUploadProgress(null);
    setEditandoId(prod.id);
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleDisponible = async (prod) => {
    try {
      await updateDoc(doc(db, 'selvaggio_takeaway_productos', prod.id), {
        disponible: !prod.disponible,
        updatedAt: serverTimestamp(),
      });
      setToast({ message: prod.disponible ? 'Producto desactivado' : 'Producto activado', type: 'success' });
      fetchProductos();
    } catch {
      setToast({ message: 'Error al actualizar', type: 'error' });
    }
  };

  const eliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
      await deleteDoc(doc(db, 'selvaggio_takeaway_productos', id));
      setToast({ message: 'Producto eliminado', type: 'success' });
      fetchProductos();
    } catch {
      setToast({ message: 'Error al eliminar', type: 'error' });
    }
  };

  const cancelEdit = () => {
    setForm(PROD_EMPTY);
    setEditandoId(null);
    setMostrarForm(false);
    setImagenPreview('');
    setUploadProgress(null);
  };

  const prodPorCategoria = CATEGORIAS.reduce((acc, cat) => {
    acc[cat] = productos.filter(p => p.categoria === cat);
    return acc;
  }, {});
  const sinCategoria = productos.filter(p => !CATEGORIAS.includes(p.categoria));

  return (
    <div>
      {/* Header + new button */}
      <div className="atw__prod-header">
        <h3 className="atw__prod-title">Productos ({productos.length})</h3>
        {!mostrarForm && (
          <button className="atw__add-btn" onClick={() => setMostrarForm(true)}>
            + Nuevo producto
          </button>
        )}
      </div>

      {/* Form */}
      {mostrarForm && (
        <div className="atw__form">
          <p className="atw__form-title">{editandoId ? 'Editar producto' : 'Nuevo producto'}</p>
          <form onSubmit={handleSubmit}>
            <div className="atw__form-row">
              <div className="atw__form-group" style={{ gridColumn: '1/-1' }}>
                <label>Nombre *</label>
                <input type="text" name="nombre" value={form.nombre} onChange={handleFormChange}
                  required placeholder="Ej: Tabla premium de quesos" />
              </div>
            </div>
            <div className="atw__form-row atw__form-row--3">
              <div className="atw__form-group">
                <label>Precio *</label>
                <input type="number" name="precio" value={form.precio} onChange={handleFormChange}
                  required placeholder="15000" min="0" step="0.01" />
              </div>
              <div className="atw__form-group">
                <label>Unidad (opcional)</label>
                <input type="text" name="unidad" value={form.unidad} onChange={handleFormChange}
                  placeholder="100g, paquete, botella…" />
              </div>
              <div className="atw__form-group">
                <label>Orden</label>
                <input type="number" name="orden" value={form.orden} onChange={handleFormChange}
                  min="0" placeholder="0" />
              </div>
            </div>
            <div className="atw__form-row">
              <div className="atw__form-group" style={{ gridColumn: '1/-1' }}>
                <label>Categoría</label>
                <input type="text" name="categoria" value={form.categoria} onChange={handleFormChange}
                  placeholder="Fiambres, Quesos, Vinos…" list="categorias-list" />
                <datalist id="categorias-list">
                  {[...new Set([...CATEGORIAS, ...productos.map(p => p.categoria).filter(Boolean)])].map(c =>
                    <option key={c} value={c} />
                  )}
                </datalist>
              </div>
            </div>
            <div className="atw__form-row">
              <div className="atw__form-group" style={{ gridColumn: '1/-1' }}>
                <label>Descripción</label>
                <textarea name="descripcion" value={form.descripcion} onChange={handleFormChange}
                  rows="2" placeholder="Breve descripción del producto" />
              </div>
            </div>
            <div className="atw__form-row">
              <div className="atw__form-group" style={{ gridColumn: '1/-1' }}>
                <label>Imagen (opcional)</label>
                <div className="atw__img-upload">
                  {(imagenPreview || form.imagen) && (
                    <div className="atw__img-preview">
                      <img src={imagenPreview || form.imagen} alt="preview" />
                      <button type="button" className="atw__img-remove"
                        onClick={() => { setForm(p => ({ ...p, imagen: '' })); setImagenPreview(''); }}>
                        ✕
                      </button>
                    </div>
                  )}
                  {uploadProgress !== null ? (
                    <div className="atw__upload-bar">
                      <div className="atw__upload-bar__fill" style={{ width: `${uploadProgress}%` }} />
                      <span className="atw__upload-bar__label">{uploadProgress}%</span>
                    </div>
                  ) : (
                    <button type="button" className="atw__img-pick"
                      onClick={() => fileInputRef.current?.click()}>
                      {form.imagen ? '↻ Cambiar imagen' : '↑ Subir imagen'}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => handleImagenFile(e.target.files[0])}
                  />
                </div>
              </div>
            </div>
            <div className="atw__toggle-wrap" style={{ marginBottom: 12 }}>
              <input type="checkbox" id="disponible" name="disponible"
                checked={form.disponible} onChange={handleFormChange} />
              <label htmlFor="disponible">Disponible para pedir</label>
            </div>
            <div className="atw__form-actions">
              <button type="submit" className="atw__form-submit" disabled={guardando || uploadProgress !== null}>
                {uploadProgress !== null ? `Subiendo imagen ${uploadProgress}%…` : guardando ? 'Guardando…' : editandoId ? 'Actualizar' : 'Crear producto'}
              </button>
              <button type="button" className="atw__form-cancel" onClick={cancelEdit}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Productos por categoría */}
      {loading ? (
        <p className="atw__loading">Cargando productos…</p>
      ) : productos.length === 0 ? (
        <p className="atw__empty">No hay productos. Creá el primero con el botón de arriba.</p>
      ) : (
        <>
          {[...CATEGORIAS, '_otros'].map(cat => {
            const items = cat === '_otros' ? sinCategoria : prodPorCategoria[cat];
            if (!items || items.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: 28 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8a7e76', marginBottom: 12 }}>
                  {cat === '_otros' ? 'Sin categoría' : cat} ({items.length})
                </h4>
                <div className="atw__prod-grid">
                  {items.map(prod => (
                    <div key={prod.id} className={`atw__prod-card${prod.disponible === false ? ' atw__prod-card--off' : ''}`}>
                      {prod.imagen && (
                        <img src={prod.imagen} alt={prod.nombre} className="atw__prod-card__img" loading="lazy" />
                      )}
                      <div className="atw__prod-card__body">
                        <span className="atw__prod-card__cat">{prod.categoria}</span>
                        <p className="atw__prod-card__nombre">
                          {prod.nombre}
                          <span className={prod.disponible !== false ? 'atw__prod-badge--on' : 'atw__prod-badge--off'}>
                            {prod.disponible !== false ? 'Activo' : 'Inactivo'}
                          </span>
                        </p>
                        {prod.descripcion && <p className="atw__prod-card__desc">{prod.descripcion}</p>}
                        <span className="atw__prod-card__precio">
                          {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(prod.precio || 0)}
                          {prod.unidad && <span style={{ fontSize: 11, marginLeft: 6, color: '#8a7e76' }}>· {prod.unidad}</span>}
                        </span>
                        <div className="atw__prod-card__actions">
                          <button className="atw__btn" onClick={() => startEdit(prod)}>Editar</button>
                          <button className="atw__btn"
                            onClick={() => toggleDisponible(prod)}
                            style={prod.disponible !== false ? { color: '#9a6510' } : { color: '#1e6b3a' }}>
                            {prod.disponible !== false ? 'Desactivar' : 'Activar'}
                          </button>
                          <button className="atw__btn atw__btn--delete" onClick={() => eliminar(prod.id, prod.nombre)}>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ══════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════ */
function AdminTakeAway() {
  const [subTab, setSubTab] = useState('pedidos');
  const [activo, setActivo] = useState(null); // null = cargando
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'selvaggio_configuracion', 'takeaway_config'))
      .then(snap => setActivo(snap.exists() ? snap.data().activo !== false : false))
      .catch(() => setActivo(false));
  }, []);

  const toggleActivo = async () => {
    const nuevoEstado = !activo;
    setToggling(true);
    try {
      await setDoc(doc(db, 'selvaggio_configuracion', 'takeaway_config'),
        { activo: nuevoEstado }, { merge: true });
      setActivo(nuevoEstado);
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="atw">
      <div className="atw__header">
        <h2 className="atw__title">Take Away</h2>
        <div className="atw__status-wrap">
          {activo !== null && (
            <>
              <span className={`atw__status-dot${activo ? ' atw__status-dot--on' : ''}`} />
              <span className="atw__status-label">{activo ? 'Activo' : 'Inactivo'}</span>
              <button
                className={`atw__toggle-btn${activo ? ' atw__toggle-btn--on' : ''}`}
                onClick={toggleActivo}
                disabled={toggling}
              >
                {toggling ? '…' : activo ? 'Desactivar' : 'Activar'}
              </button>
            </>
          )}
        </div>
      </div>

      {activo === false && (
        <div className="atw__inactive-banner">
          El Take Away está desactivado. Los botones no aparecen en la web y la página muestra un aviso.
        </div>
      )}

      <div className="atw__subtabs">
        <button className={`atw__stab${subTab === 'pedidos' ? ' atw__stab--on' : ''}`}
          onClick={() => setSubTab('pedidos')}>
          Pedidos
        </button>
        <button className={`atw__stab${subTab === 'productos' ? ' atw__stab--on' : ''}`}
          onClick={() => setSubTab('productos')}>
          Productos
        </button>
      </div>
      {subTab === 'pedidos' ? <PedidosTW /> : <ProductosTW />}
    </div>
  );
}

export default AdminTakeAway;
