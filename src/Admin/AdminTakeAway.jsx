import { useState, useEffect, useRef } from 'react';
import {
  collection, getDocs, addDoc, deleteDoc, doc, getDoc, setDoc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import './AdminTakeAway.css';

const ESTADO_LABEL = {
  pendiente: 'Pendiente', preparando: 'Preparando',
  listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado',
};
const ESTADO_NEXT = {
  pendiente:  { estado: 'preparando', label: 'Marcar preparando' },
  preparando: { estado: 'listo',      label: 'Marcar listo' },
  listo:      { estado: 'entregado',  label: 'Marcar entregado' },
};
const PAGO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta' };
const fmt = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`atw__toast atw__toast--${type}`} onClick={onClose}>
      <span>{type === 'success' ? '✓' : '✕'}</span><span>{message}</span>
    </div>
  );
}

/* ══════════════════════════════════
   PEDIDOS
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
      setPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const tb = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return tb - ta;
        }));
    } catch {}
    finally { if (!silent) setLoading(false); }
  };

  const cambiarEstado = async (pedidoId, nuevoEstado) => {
    try {
      await updateDoc(doc(db, 'selvaggio_takeaway_pedidos', pedidoId), { estado: nuevoEstado });
      setToast({ message: `Estado → ${ESTADO_LABEL[nuevoEstado]}`, type: 'success' });
      fetchPedidos(true);
    } catch { setToast({ message: 'Error al actualizar', type: 'error' }); }
  };

  const eliminar = async (pedidoId, num) => {
    if (!confirm(`¿Eliminar el pedido ${num}?`)) return;
    try {
      await deleteDoc(doc(db, 'selvaggio_takeaway_pedidos', pedidoId));
      setToast({ message: 'Pedido eliminado', type: 'success' });
      fetchPedidos(true);
    } catch { setToast({ message: 'Error al eliminar', type: 'error' }); }
  };

  const abrirWpp = (p) => {
    let tel = p.telefono?.replace(/\D/g, '') || '';
    // Normalizar número argentino: quitar 0 inicial o 54 duplicado
    if (tel.startsWith('54')) tel = tel.slice(2);
    if (tel.startsWith('0')) tel = tel.slice(1);
    let msg = p.estado === 'listo'
      ? `Hola ${p.nombre}! 🎉 Tu pedido ${p.numeroPedido} de Selvaggio está listo para retirar. Te esperamos en Av. Fondo de la Legua 59, Las Lomas de San Isidro.`
      : p.estado === 'preparando'
      ? `Hola ${p.nombre}! Tu pedido ${p.numeroPedido} de Selvaggio está siendo preparado. En breve te avisamos cuando esté listo.`
      : `Hola ${p.nombre}! Te contactamos desde Selvaggio por tu pedido ${p.numeroPedido}.`;
    window.open(`https://wa.me/54${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const fmtFecha = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const fmtFechaRetiro = (fechaStr, horaStr) => {
    if (!fechaStr) return null;
    const [y, m, d] = fechaStr.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const diaStr = DIAS[fecha.getDay()] + ' ' + String(d).padStart(2,'0') + '/' + String(m).padStart(2,'0');
    return horaStr ? diaStr + ' ' + horaStr + ' hs.' : diaStr;
  };

  const ACTIVOS = ['pendiente', 'preparando', 'listo'];
  const filtrados = pedidos.filter(p => {
    if (filtro === 'activos')   return ACTIVOS.includes(p.estado);
    if (filtro === 'historial') return ['entregado', 'cancelado'].includes(p.estado);
    return p.estado === filtro;
  });
  const countActivos = pedidos.filter(p => ACTIVOS.includes(p.estado)).length;

  return (
    <div>
      <div className="atw__toolbar">
        {[
          { id: 'activos',    label: `Activos${countActivos ? ` (${countActivos})` : ''}` },
          { id: 'pendiente',  label: 'Pendientes' },
          { id: 'preparando', label: 'Preparando' },
          { id: 'listo',      label: 'Listos' },
          { id: 'historial',  label: 'Historial' },
        ].map(f => (
          <button key={f.id}
            className={`atw__filter-btn${filtro === f.id ? ' atw__filter-btn--on' : ''}`}
            onClick={() => setFiltro(f.id)}>{f.label}</button>
        ))}
        <button className="atw__refresh" onClick={() => fetchPedidos()}>↻ Actualizar</button>
      </div>

      {loading ? <p className="atw__loading">Cargando pedidos…</p>
        : filtrados.length === 0 ? <p className="atw__empty">No hay pedidos en esta categoría.</p>
        : (
          <div className="atw__grid">
            {filtrados.map(p => {
              const siguiente = ESTADO_NEXT[p.estado];
              return (
                <div key={p.id} className="atw__card">
                  <div className="atw__card-head">
                    <div>
                      <span className="atw__card-num">{p.numeroPedido}</span>
                      <span className="atw__card-meta">{fmtFecha(p.createdAt)}</span>
                    </div>
                    <span className={`atw__badge atw__badge--${p.estado}`}>{ESTADO_LABEL[p.estado] || p.estado}</span>
                  </div>
                  <div className="atw__card-body">
                    <div className="atw__card-cliente">
                      <span className="atw__card-nombre">{p.nombre} {p.apellido}</span>
                      <span className="atw__card-contacto">{p.telefono} · {p.email}</span>
                    </div>
                    <div className="atw__items">
                      {(p.items || []).map((item, i) => (
                        <div key={i} className="atw__item-block">
                          <div className="atw__item-row">
                            <span className="atw__item-qty">{item.cantidad}×</span>
                            <span className="atw__item-nombre">{item.nombre}</span>
                            <span className="atw__item-precio">{fmt(item.subtotal || item.precio * item.cantidad)}</span>
                          </div>
                          {item.selecciones && Object.values(item.selecciones).map((sec, si) =>
                            sec.items && sec.items.length > 0 ? (
                              <div key={si} className="atw__item-selec">
                                <span className="atw__item-selec-sec">{sec.nombre}:</span>
                                <span className="atw__item-selec-items">{sec.items.map(i => i.nombre).join(', ')}</span>
                              </div>
                            ) : null
                          )}
                        </div>
                      ))}
                      {p.descuento > 0 && (
                        <div className="atw__total atw__total--desc">
                          <span>Desc. efectivo 10%</span><span>−{fmt(p.descuento)}</span>
                        </div>
                      )}
                      <div className="atw__total">
                        <span>Total{p.descuento > 0 ? ' a cobrar' : ''}</span>
                        <span>{fmt(p.total)}</span>
                      </div>
                    </div>
                    <div className="atw__card-info-row"><span>Pago:</span><span>{PAGO_LABEL[p.metodoPago] || p.metodoPago || '—'}</span></div>
                    {fmtFechaRetiro(p.fechaRetiro, p.horaRetiro) && (
                      <div className="atw__card-info-row atw__card-info-row--retiro"><span>Retiro:</span><span>{fmtFechaRetiro(p.fechaRetiro, p.horaRetiro)}</span></div>
                    )}
                    {p.comentarios && <p className="atw__card-comentario">"{p.comentarios}"</p>}
                  </div>
                  <div className="atw__card-actions">
                    {siguiente && (
                      <button className="atw__btn atw__btn--next" onClick={() => cambiarEstado(p.id, siguiente.estado)}>
                        {siguiente.label}
                      </button>
                    )}
                    <button className="atw__btn atw__btn--wpp" onClick={() => abrirWpp(p)}>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style={{verticalAlign:'middle',marginRight:4}}>
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      WhatsApp
                    </button>
                    {!['cancelado','entregado'].includes(p.estado) && (
                      <button className="atw__btn atw__btn--cancel" onClick={() => cambiarEstado(p.id, 'cancelado')}>Cancelar</button>
                    )}
                    <button className="atw__btn atw__btn--delete atw__btn--ml" onClick={() => eliminar(p.id, p.numeroPedido)}>Eliminar</button>
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
   INGREDIENTES
══════════════════════════════════ */
const ING_EMPTY = { nombre: '', categoria: '', descripcion: '', disponible: true };

function IngredientesTW() {
  const [ingredientes, setIngredientes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(ING_EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);
  const [modalCats, setModalCats] = useState(false);
  const [nuevaCat, setNuevaCat] = useState('');
  const [guardandoCats, setGuardandoCats] = useState(false);

  useEffect(() => { fetchIngredientes(); fetchCategorias(); }, []);

  const fetchIngredientes = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'selvaggio_tw_ingredientes'));
      setIngredientes(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.categoria || '').localeCompare(b.categoria || '') || (a.nombre || '').localeCompare(b.nombre || '')));
    } catch {}
    finally { setLoading(false); }
  };

  const fetchCategorias = async () => {
    try {
      const snap = await getDoc(doc(db, 'selvaggio_configuracion', 'tw_ingrediente_cats'));
      setCategorias(snap.exists() ? snap.data().lista || [] : []);
    } catch {}
  };

  const guardarCategorias = async (lista) => {
    setGuardandoCats(true);
    try {
      await setDoc(doc(db, 'selvaggio_configuracion', 'tw_ingrediente_cats'), { lista }, { merge: true });
      setCategorias(lista);
    } catch { setToast({ message: 'Error al guardar categorías', type: 'error' }); }
    finally { setGuardandoCats(false); }
  };

  const agregarCategoria = async () => {
    const nueva = nuevaCat.trim();
    if (!nueva || categorias.includes(nueva)) return;
    await guardarCategorias([...categorias, nueva]);
    setNuevaCat('');
  };

  const eliminarCategoria = async (cat) => {
    if (!confirm(`¿Eliminar categoría "${cat}"?`)) return;
    await guardarCategorias(categorias.filter(c => c !== cat));
  };

  const todasCats = [...new Set([...categorias, ...ingredientes.map(i => i.categoria).filter(Boolean)])];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre) { setToast({ message: 'El nombre es obligatorio', type: 'error' }); return; }
    setGuardando(true);
    try {
      if (editandoId) {
        await updateDoc(doc(db, 'selvaggio_tw_ingredientes', editandoId), { ...form, updatedAt: serverTimestamp() });
        setToast({ message: 'Ingrediente actualizado', type: 'success' });
      } else {
        await addDoc(collection(db, 'selvaggio_tw_ingredientes'), { ...form, createdAt: serverTimestamp() });
        setToast({ message: 'Ingrediente creado', type: 'success' });
      }
      setForm(ING_EMPTY); setEditandoId(null); setMostrarForm(false);
      fetchIngredientes();
    } catch { setToast({ message: 'Error al guardar', type: 'error' }); }
    finally { setGuardando(false); }
  };

  const startEdit = (ing) => {
    setForm({ nombre: ing.nombre || '', categoria: ing.categoria || '', descripcion: ing.descripcion || '', disponible: ing.disponible !== false });
    setEditandoId(ing.id); setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleDisponible = async (ing) => {
    try {
      await updateDoc(doc(db, 'selvaggio_tw_ingredientes', ing.id), { disponible: !ing.disponible, updatedAt: serverTimestamp() });
      fetchIngredientes();
    } catch {}
  };

  const eliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
      await deleteDoc(doc(db, 'selvaggio_tw_ingredientes', id));
      setToast({ message: 'Ingrediente eliminado', type: 'success' });
      fetchIngredientes();
    } catch { setToast({ message: 'Error al eliminar', type: 'error' }); }
  };

  const ingPorCategoria = todasCats.reduce((acc, cat) => {
    acc[cat] = ingredientes.filter(i => i.categoria === cat);
    return acc;
  }, {});
  const sinCat = ingredientes.filter(i => !i.categoria);

  return (
    <div>
      {/* Modal categorías */}
      {modalCats && (
        <div className="atw__modal-overlay" onClick={() => setModalCats(false)}>
          <div className="atw__modal" onClick={e => e.stopPropagation()}>
            <div className="atw__modal-head">
              <span className="atw__modal-title">Categorías de ingredientes</span>
              <button className="atw__modal-close" onClick={() => setModalCats(false)}>✕</button>
            </div>
            <div className="atw__modal-body">
              <div className="atw__cats-list">
                {categorias.length === 0 && <p className="atw__cats-empty">No hay categorías.</p>}
                {categorias.map((cat, i) => (
                  <div key={cat} className="atw__cat-row">
                    <span className="atw__cat-name">{cat}</span>
                    <span className="atw__cat-count">{ingredientes.filter(ing => ing.categoria === cat).length} ing.</span>
                    <div className="atw__cat-actions">
                      <button onClick={() => guardarCategorias([...categorias.slice(0,i-1), cat, categorias[i-1], ...categorias.slice(i+1)])} disabled={i===0||guardandoCats}>↑</button>
                      <button onClick={() => guardarCategorias([...categorias.slice(0,i), categorias[i+1], cat, ...categorias.slice(i+2)])} disabled={i===categorias.length-1||guardandoCats}>↓</button>
                      <button className="atw__cat-del" onClick={() => eliminarCategoria(cat)} disabled={guardandoCats}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="atw__cats-add">
                <input type="text" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}
                  placeholder="Nueva categoría…" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarCategoria())} />
                <button onClick={agregarCategoria} disabled={!nuevaCat.trim() || guardandoCats}>Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="atw__prod-header">
        <h3 className="atw__prod-title">Ingredientes ({ingredientes.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="atw__cats-btn" onClick={() => setModalCats(true)}>⊞ Categorías</button>
          {!mostrarForm && <button className="atw__add-btn" onClick={() => setMostrarForm(true)}>+ Nuevo</button>}
        </div>
      </div>

      {mostrarForm && (
        <div className="atw__form" style={{ marginBottom: 20 }}>
          <p className="atw__form-title">{editandoId ? 'Editar ingrediente' : 'Nuevo ingrediente'}</p>
          <form onSubmit={handleSubmit}>
            <div className="atw__form-row atw__form-row--3">
              <div className="atw__form-group" style={{ gridColumn: '1/3' }}>
                <label>Nombre *</label>
                <input type="text" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  required placeholder="Ej: Jamón Crudo" />
              </div>
              <div className="atw__form-group">
                <label>Categoría</label>
                <input type="text" value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                  placeholder="Fiambres, Quesos…" list="ing-cats-list" />
                <datalist id="ing-cats-list">{todasCats.map(c => <option key={c} value={c} />)}</datalist>
              </div>
            </div>
            <div className="atw__form-row">
              <div className="atw__form-group" style={{ gridColumn: '1/-1' }}>
                <label>Descripción (opcional)</label>
                <input type="text" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Detalle opcional…" />
              </div>
            </div>
            <div className="atw__toggle-wrap" style={{ marginBottom: 12 }}>
              <input type="checkbox" id="ing-disp" checked={form.disponible} onChange={e => setForm(p => ({ ...p, disponible: e.target.checked }))} />
              <label htmlFor="ing-disp">Disponible</label>
            </div>
            <div className="atw__form-actions">
              <button type="submit" className="atw__form-submit" disabled={guardando}>
                {guardando ? 'Guardando…' : editandoId ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" className="atw__form-cancel" onClick={() => { setForm(ING_EMPTY); setEditandoId(null); setMostrarForm(false); }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <p className="atw__loading">Cargando…</p>
        : ingredientes.length === 0 ? <p className="atw__empty">No hay ingredientes. Creá los primeros para poder armar picadas.</p>
        : (
          <>
            {[...todasCats, sinCat.length > 0 ? '_otros' : null].filter(Boolean).map(cat => {
              const items = cat === '_otros' ? sinCat : ingPorCategoria[cat];
              if (!items || items.length === 0) return null;
              return (
                <div key={cat} style={{ marginBottom: 20 }}>
                  <h4 className="atw__ing-cat-header">{cat === '_otros' ? 'Sin categoría' : cat} ({items.length})</h4>
                  <div className="atw__ings-list">
                    {items.map(ing => (
                      <div key={ing.id} className={`atw__ing-row${ing.disponible === false ? ' atw__ing-row--off' : ''}`}>
                        <span className="atw__ing-nombre">{ing.nombre}</span>
                        {ing.descripcion && <span className="atw__ing-desc">{ing.descripcion}</span>}
                        <div className="atw__ing-actions">
                          <button className="atw__btn" onClick={() => toggleDisponible(ing)}
                            style={ing.disponible !== false ? { color: '#9a6510' } : { color: '#1e6b3a' }}>
                            {ing.disponible !== false ? 'Desactivar' : 'Activar'}
                          </button>
                          <button className="atw__btn" onClick={() => startEdit(ing)}>Editar</button>
                          <button className="atw__btn atw__btn--delete" onClick={() => eliminar(ing.id, ing.nombre)}>Eliminar</button>
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
   EDITOR DE SECCIÓN (helper)
══════════════════════════════════ */
function SeccionEditor({ seccion, onChange, onDelete, ingredientes }) {
  const categorias = [...new Set(ingredientes.map(i => i.categoria).filter(Boolean))];
  const sinCat = ingredientes.filter(i => !i.categoria);

  const toggleIng = (id) => {
    const ids = seccion.ingredienteIds || [];
    onChange({ ...seccion, ingredienteIds: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] });
  };

  const renderGroup = (items) => (
    <div className="atw__seccion-pills">
      {items.map(ing => (
        <button type="button" key={ing.id}
          className={`atw__seccion-pill${(seccion.ingredienteIds || []).includes(ing.id) ? ' atw__seccion-pill--on' : ''}${ing.disponible === false ? ' atw__seccion-pill--off' : ''}`}
          onClick={() => toggleIng(ing.id)}>
          {ing.nombre}
        </button>
      ))}
    </div>
  );

  return (
    <div className="atw__seccion">
      <div className="atw__seccion-head">
        <input type="text" className="atw__seccion-nombre-input" value={seccion.nombre}
          onChange={e => onChange({ ...seccion, nombre: e.target.value })}
          placeholder="Nombre de la sección (ej: Quesos)" />
        <div className="atw__seccion-config">
          <label>
            Elegir
            <input type="number" min="1" max="20" value={seccion.limite}
              onChange={e => onChange({ ...seccion, limite: Math.max(1, parseInt(e.target.value) || 1) })} />
          </label>
          <label className="atw__seccion-opt">
            <input type="checkbox" checked={seccion.opcional || false}
              onChange={e => onChange({ ...seccion, opcional: e.target.checked })} />
            Opcional
          </label>
        </div>
        <button type="button" className="atw__seccion-del" onClick={onDelete} title="Eliminar sección">✕</button>
      </div>
      <div className="atw__seccion-body">
        {ingredientes.length === 0
          ? <p className="atw__seccion-empty">Primero creá ingredientes en la pestaña Ingredientes.</p>
          : (
            <>
              {categorias.map(cat => {
                const items = ingredientes.filter(i => i.categoria === cat);
                return (
                  <div key={cat} className="atw__seccion-group">
                    <span className="atw__seccion-cat">{cat}</span>
                    {renderGroup(items)}
                  </div>
                );
              })}
              {sinCat.length > 0 && (
                <div className="atw__seccion-group">
                  {categorias.length > 0 && <span className="atw__seccion-cat">Otros</span>}
                  {renderGroup(sinCat)}
                </div>
              )}
            </>
          )}
        <div className="atw__seccion-count-info">
          {(seccion.ingredienteIds || []).length} ingrediente{(seccion.ingredienteIds || []).length !== 1 ? 's' : ''} en esta sección
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   PICADAS
══════════════════════════════════ */
const PICADA_EMPTY = {
  nombre: '', descripcion: '', precio: '', imagen: '', orden: 0, disponible: true, secciones: [],
};

const crearSeccion = () => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  nombre: '', limite: 1, opcional: false, ingredienteIds: [],
});

function PicadasTW() {
  const [picadas, setPicadas] = useState([]);
  const [ingredientes, setIngredientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(PICADA_EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [imagenPreview, setImagenPreview] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => { fetchPicadas(); fetchIngredientes(); }, []);

  const fetchPicadas = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'selvaggio_tw_picadas'));
      setPicadas(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.orden||0)-(b.orden||0)));
    } catch {}
    finally { setLoading(false); }
  };

  const fetchIngredientes = async () => {
    try {
      const snap = await getDocs(collection(db, 'selvaggio_tw_ingredientes'));
      setIngredientes(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(i => i.disponible !== false)
        .sort((a,b) => (a.categoria||'').localeCompare(b.categoria||'') || (a.nombre||'').localeCompare(b.nombre||'')));
    } catch {}
  };

  const handleImagenFile = (file) => {
    if (!file) return;
    setImagenPreview(URL.createObjectURL(file));
    const storageRef = ref(storage, `tw_picadas/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(storageRef, file);
    setUploadProgress(0);
    task.on('state_changed',
      snap => setUploadProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      () => { setToast({ message: 'Error al subir imagen', type: 'error' }); setUploadProgress(null); },
      async () => { const url = await getDownloadURL(task.snapshot.ref); setForm(p => ({ ...p, imagen: url })); setUploadProgress(null); }
    );
  };

  const updateSeccion = (idx, seccion) => {
    setForm(p => {
      const secciones = [...p.secciones];
      secciones[idx] = seccion;
      return { ...p, secciones };
    });
  };

  const deleteSeccion = (idx) => {
    setForm(p => ({ ...p, secciones: p.secciones.filter((_, i) => i !== idx) }));
  };

  const moverSeccion = (idx, dir) => {
    setForm(p => {
      const s = [...p.secciones];
      const swap = idx + dir;
      if (swap < 0 || swap >= s.length) return p;
      [s[idx], s[swap]] = [s[swap], s[idx]];
      return { ...p, secciones: s };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.precio) {
      setToast({ message: 'Nombre y precio son obligatorios', type: 'error' }); return;
    }
    if (uploadProgress !== null) {
      setToast({ message: 'Esperá que termine de subir la imagen', type: 'error' }); return;
    }
    setGuardando(true);
    try {
      const data = {
        ...form,
        precio: parseFloat(form.precio) || 0,
        orden: parseInt(form.orden) || 0,
        secciones: form.secciones,
      };
      if (editandoId) {
        await updateDoc(doc(db, 'selvaggio_tw_picadas', editandoId), { ...data, updatedAt: serverTimestamp() });
        setToast({ message: 'Picada actualizada', type: 'success' });
      } else {
        await addDoc(collection(db, 'selvaggio_tw_picadas'), { ...data, createdAt: serverTimestamp() });
        setToast({ message: 'Picada creada', type: 'success' });
      }
      setForm(PICADA_EMPTY); setEditandoId(null); setMostrarForm(false);
      setImagenPreview(''); setUploadProgress(null);
      fetchPicadas();
    } catch { setToast({ message: 'Error al guardar', type: 'error' }); }
    finally { setGuardando(false); }
  };

  const startEdit = (p) => {
    setForm({
      nombre: p.nombre || '', descripcion: p.descripcion || '', precio: p.precio || '',
      imagen: p.imagen || '', orden: p.orden || 0, disponible: p.disponible !== false,
      secciones: p.secciones || [],
    });
    setImagenPreview(p.imagen || ''); setUploadProgress(null);
    setEditandoId(p.id); setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setForm(PICADA_EMPTY); setEditandoId(null); setMostrarForm(false);
    setImagenPreview(''); setUploadProgress(null);
  };

  const toggleDisponible = async (p) => {
    try {
      await updateDoc(doc(db, 'selvaggio_tw_picadas', p.id), { disponible: !p.disponible, updatedAt: serverTimestamp() });
      fetchPicadas();
    } catch {}
  };

  const eliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
      await deleteDoc(doc(db, 'selvaggio_tw_picadas', id));
      setToast({ message: 'Picada eliminada', type: 'success' });
      fetchPicadas();
    } catch { setToast({ message: 'Error al eliminar', type: 'error' }); }
  };

  const fmtPrecio = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

  return (
    <div>
      <div className="atw__prod-header">
        <h3 className="atw__prod-title">Picadas ({picadas.length})</h3>
        {!mostrarForm && <button className="atw__add-btn" onClick={() => setMostrarForm(true)}>+ Nueva picada</button>}
      </div>

      {mostrarForm && (
        <div className="atw__form">
          <p className="atw__form-title">{editandoId ? 'Editar picada' : 'Nueva picada'}</p>
          <form onSubmit={handleSubmit}>
            {/* Básico */}
            <div className="atw__form-row">
              <div className="atw__form-group" style={{ gridColumn: '1/-1' }}>
                <label>Nombre *</label>
                <input type="text" value={form.nombre} onChange={e => setForm(p=>({...p,nombre:e.target.value}))}
                  required placeholder="Ej: Picada Degustación" />
              </div>
            </div>
            <div className="atw__form-row atw__form-row--3">
              <div className="atw__form-group">
                <label>Precio *</label>
                <input type="number" value={form.precio} onChange={e => setForm(p=>({...p,precio:e.target.value}))}
                  required min="0" placeholder="25000" />
              </div>
              <div className="atw__form-group">
                <label>Orden</label>
                <input type="number" value={form.orden} onChange={e => setForm(p=>({...p,orden:e.target.value}))} min="0" />
              </div>
              <div className="atw__form-group" style={{ justifyContent: 'flex-end' }}>
                <div className="atw__toggle-wrap" style={{ marginTop: 24 }}>
                  <input type="checkbox" id="pic-disp" checked={form.disponible} onChange={e => setForm(p=>({...p,disponible:e.target.checked}))} />
                  <label htmlFor="pic-disp">Disponible</label>
                </div>
              </div>
            </div>
            <div className="atw__form-row">
              <div className="atw__form-group" style={{ gridColumn: '1/-1' }}>
                <label>Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm(p=>({...p,descripcion:e.target.value}))}
                  rows="2" placeholder="Breve descripción…" />
              </div>
            </div>

            {/* Imagen */}
            <div className="atw__form-row">
              <div className="atw__form-group" style={{ gridColumn: '1/-1' }}>
                <label>Imagen (opcional)</label>
                <div className="atw__img-upload">
                  {(imagenPreview || form.imagen) && (
                    <div className="atw__img-preview">
                      <img src={imagenPreview || form.imagen} alt="preview" />
                      <button type="button" className="atw__img-remove"
                        onClick={() => { setForm(p=>({...p,imagen:''})); setImagenPreview(''); }}>✕</button>
                    </div>
                  )}
                  {uploadProgress !== null ? (
                    <div className="atw__upload-bar">
                      <div className="atw__upload-bar__fill" style={{ width: `${uploadProgress}%` }} />
                      <span className="atw__upload-bar__label">{uploadProgress}%</span>
                    </div>
                  ) : (
                    <button type="button" className="atw__img-pick" onClick={() => fileInputRef.current?.click()}>
                      {form.imagen ? '↻ Cambiar imagen' : '↑ Subir imagen'}
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => handleImagenFile(e.target.files[0])} />
                </div>
              </div>
            </div>

            {/* Secciones */}
            <div className="atw__secciones-header">
              <span className="atw__secciones-title">Secciones de la picada</span>
              <span className="atw__secciones-hint">Definí qué elige el cliente dentro de esta picada</span>
            </div>

            {form.secciones.length === 0 && (
              <p className="atw__empty" style={{ margin: '8px 0 16px', fontSize: 13 }}>
                Sin secciones. Agregá al menos una para que el cliente pueda armar su picada.
              </p>
            )}

            {form.secciones.map((sec, idx) => (
              <div key={sec.id} className="atw__seccion-wrap">
                <div className="atw__seccion-order">
                  <button type="button" onClick={() => moverSeccion(idx, -1)} disabled={idx === 0}>↑</button>
                  <button type="button" onClick={() => moverSeccion(idx, 1)} disabled={idx === form.secciones.length - 1}>↓</button>
                </div>
                <SeccionEditor
                  seccion={sec}
                  onChange={s => updateSeccion(idx, s)}
                  onDelete={() => deleteSeccion(idx)}
                  ingredientes={ingredientes}
                />
              </div>
            ))}

            <button type="button" className="atw__add-seccion-btn" onClick={() => setForm(p => ({ ...p, secciones: [...p.secciones, crearSeccion()] }))}>
              + Agregar sección
            </button>

            <div className="atw__form-actions" style={{ marginTop: 20 }}>
              <button type="submit" className="atw__form-submit" disabled={guardando || uploadProgress !== null}>
                {uploadProgress !== null ? `Subiendo ${uploadProgress}%…` : guardando ? 'Guardando…' : editandoId ? 'Actualizar picada' : 'Crear picada'}
              </button>
              <button type="button" className="atw__form-cancel" onClick={cancelEdit}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <p className="atw__loading">Cargando picadas…</p>
        : picadas.length === 0 && !mostrarForm ? (
          <p className="atw__empty">No hay picadas. Creá la primera con el botón de arriba.</p>
        ) : (
          <div className="atw__prod-grid">
            {picadas.map(p => (
              <div key={p.id} className={`atw__prod-card${p.disponible === false ? ' atw__prod-card--off' : ''}`}>
                {p.imagen && <img src={p.imagen} alt={p.nombre} className="atw__prod-card__img" loading="lazy" />}
                <div className="atw__prod-card__body">
                  <p className="atw__prod-card__nombre">
                    {p.nombre}
                    <span className={p.disponible !== false ? 'atw__prod-badge--on' : 'atw__prod-badge--off'}>
                      {p.disponible !== false ? 'Activa' : 'Inactiva'}
                    </span>
                  </p>
                  {p.descripcion && <p className="atw__prod-card__desc">{p.descripcion}</p>}
                  <span className="atw__prod-card__precio">{fmtPrecio(p.precio)}</span>
                  <div className="atw__picada-secs">
                    {(p.secciones || []).map(s => (
                      <span key={s.id} className="atw__picada-sec-tag">
                        {s.nombre} ({s.ingredienteIds?.length || 0} op. · elegí {s.limite}{s.opcional ? ' opt.' : ''})
                      </span>
                    ))}
                    {(!p.secciones || p.secciones.length === 0) && <span className="atw__picada-sec-tag atw__picada-sec-tag--empty">Sin secciones</span>}
                  </div>
                  <div className="atw__prod-card__actions">
                    <button className="atw__btn" onClick={() => startEdit(p)}>Editar</button>
                    <button className="atw__btn" onClick={() => toggleDisponible(p)}
                      style={p.disponible !== false ? { color: '#9a6510' } : { color: '#1e6b3a' }}>
                      {p.disponible !== false ? 'Desactivar' : 'Activar'}
                    </button>
                    <button className="atw__btn atw__btn--delete" onClick={() => eliminar(p.id, p.nombre)}>Eliminar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ══════════════════════════════════
   ADICIONALES
══════════════════════════════════ */
const ADIC_EMPTY = { nombre: '', descripcion: '', precio: '', disponible: true };

function AdicionalestTW() {
  const [adicionales, setAdicionales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(ADIC_EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchAdicionales(); }, []);

  const fetchAdicionales = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'selvaggio_tw_adicionales'));
      setAdicionales(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.orden || 0) - (b.orden || 0) || (a.nombre || '').localeCompare(b.nombre || '')));
    } catch {}
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre) { setToast({ message: 'El nombre es obligatorio', type: 'error' }); return; }
    if (form.precio === '' || isNaN(Number(form.precio))) { setToast({ message: 'Ingresá un precio válido', type: 'error' }); return; }
    setGuardando(true);
    try {
      const data = { nombre: form.nombre, descripcion: form.descripcion, precio: Number(form.precio), disponible: form.disponible };
      if (editandoId) {
        await updateDoc(doc(db, 'selvaggio_tw_adicionales', editandoId), { ...data, updatedAt: serverTimestamp() });
        setToast({ message: 'Adicional actualizado', type: 'success' });
      } else {
        await addDoc(collection(db, 'selvaggio_tw_adicionales'), { ...data, orden: adicionales.length, createdAt: serverTimestamp() });
        setToast({ message: 'Adicional creado', type: 'success' });
      }
      setForm(ADIC_EMPTY); setEditandoId(null); setMostrarForm(false);
      fetchAdicionales();
    } catch { setToast({ message: 'Error al guardar', type: 'error' }); }
    finally { setGuardando(false); }
  };

  const startEdit = (adic) => {
    setForm({ nombre: adic.nombre || '', descripcion: adic.descripcion || '', precio: adic.precio?.toString() || '0', disponible: adic.disponible !== false });
    setEditandoId(adic.id); setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleDisponible = async (adic) => {
    try {
      await updateDoc(doc(db, 'selvaggio_tw_adicionales', adic.id), { disponible: !adic.disponible, updatedAt: serverTimestamp() });
      fetchAdicionales();
    } catch {}
  };

  const eliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar «${nombre}»?`)) return;
    try {
      await deleteDoc(doc(db, 'selvaggio_tw_adicionales', id));
      setToast({ message: 'Adicional eliminado', type: 'success' });
      fetchAdicionales();
    } catch { setToast({ message: 'Error al eliminar', type: 'error' }); }
  };

  return (
    <div>
      <div className="atw__prod-header">
        <h3 className="atw__prod-title">Adicionales con costo ({adicionales.length})</h3>
        {!mostrarForm && <button className="atw__add-btn" onClick={() => setMostrarForm(true)}>+ Nuevo</button>}
      </div>
      <p style={{ fontSize: 13, color: '#8a7e76', marginBottom: 16, marginTop: -4 }}>
        Productos opcionales que el cliente puede sumar al pedido con un costo adicional.
      </p>

      {mostrarForm && (
        <div className="atw__form" style={{ marginBottom: 20 }}>
          <p className="atw__form-title">{editandoId ? 'Editar adicional' : 'Nuevo adicional'}</p>
          <form onSubmit={handleSubmit}>
            <div className="atw__form-row atw__form-row--3">
              <div className="atw__form-group" style={{ gridColumn: '1/3' }}>
                <label>Nombre *</label>
                <input type="text" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  required placeholder="Ej: Pan de campo, Tabla de quesos extra…" />
              </div>
              <div className="atw__form-group">
                <label>Precio *</label>
                <input type="number" min={0} value={form.precio} onChange={e => setForm(p => ({ ...p, precio: e.target.value }))}
                  required placeholder="0" />
              </div>
            </div>
            <div className="atw__form-row">
              <div className="atw__form-group" style={{ gridColumn: '1/-1' }}>
                <label>Descripción (opcional)</label>
                <input type="text" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Detalle que ve el cliente…" />
              </div>
            </div>
            <div className="atw__toggle-wrap" style={{ marginBottom: 12 }}>
              <input type="checkbox" id="adic-disp" checked={form.disponible} onChange={e => setForm(p => ({ ...p, disponible: e.target.checked }))} />
              <label htmlFor="adic-disp">Disponible para los clientes</label>
            </div>
            <div className="atw__form-actions">
              <button type="submit" className="atw__form-submit" disabled={guardando}>
                {guardando ? 'Guardando…' : editandoId ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" className="atw__form-cancel" onClick={() => { setForm(ADIC_EMPTY); setEditandoId(null); setMostrarForm(false); }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <p className="atw__loading">Cargando…</p>
        : adicionales.length === 0 ? (
          <p className="atw__empty">No hay adicionales. Creá el primero para que los clientes puedan sumarlo al pedido.</p>
        ) : (
          <div className="atw__ings-list">
            {adicionales.map(adic => (
              <div key={adic.id} className={`atw__ing-row${adic.disponible === false ? ' atw__ing-row--off' : ''}`}>
                <span className="atw__ing-nombre">{adic.nombre}</span>
                {adic.descripcion && <span className="atw__ing-desc">{adic.descripcion}</span>}
                <span className="atw__ing-precio atw__ing-precio--adic">{fmt(adic.precio)}</span>
                <div className="atw__ing-actions">
                  <button className="atw__ing-disp" onClick={() => toggleDisponible(adic)}>
                    {adic.disponible !== false ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button className="atw__ing-edit" onClick={() => startEdit(adic)}>Editar</button>
                  <button className="atw__ing-del" onClick={() => eliminar(adic.id, adic.nombre)}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ══════════════════════════════════
   MAIN
══════════════════════════════════ */
function AdminTakeAway() {
  const [subTab, setSubTab] = useState('pedidos');
  const [activo, setActivo] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [horarioDesde, setHorarioDesde] = useState(18);
  const [horarioHasta, setHorarioHasta] = useState(23);
  const [diasAbiertos, setDiasAbiertos] = useState([2, 3, 4, 5, 6]);
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'selvaggio_configuracion', 'takeaway_config'))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setActivo(data.activo !== false);
          if (data.horarioDesde !== undefined) setHorarioDesde(data.horarioDesde);
          if (data.horarioHasta !== undefined) setHorarioHasta(data.horarioHasta);
          if (data.diasAbiertos !== undefined) setDiasAbiertos(data.diasAbiertos);
        } else {
          setActivo(false);
        }
      })
      .catch(() => setActivo(false));
  }, []);

  const guardarConfig = async () => {
    setGuardandoConfig(true);
    try {
      await setDoc(
        doc(db, 'selvaggio_configuracion', 'takeaway_config'),
        { horarioDesde, horarioHasta, diasAbiertos },
        { merge: true }
      );
    } catch {}
    finally { setGuardandoConfig(false); }
  };

  const toggleDia = (idx) => {
    setDiasAbiertos(prev =>
      prev.includes(idx)
        ? prev.filter(d => d !== idx)
        : [...prev, idx].sort((a, b) => a - b)
    );
  };

  const toggleActivo = async () => {
    const nuevoEstado = !activo;
    setToggling(true);
    try {
      await setDoc(doc(db, 'selvaggio_configuracion', 'takeaway_config'), { activo: nuevoEstado }, { merge: true });
      setActivo(nuevoEstado);
    } catch {}
    finally { setToggling(false); }
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
              <button className={`atw__toggle-btn${activo ? ' atw__toggle-btn--on' : ''}`}
                onClick={toggleActivo} disabled={toggling}>
                {toggling ? '…' : activo ? 'Desactivar' : 'Activar'}
              </button>
            </>
          )}
        </div>
      </div>

      {activo === false && (
        <div className="atw__inactive-banner">
          El Take Away está desactivado. El botón sigue visible en la web pero no se pueden hacer pedidos.
        </div>
      )}

      <div className="atw__config">
        <div className="atw__config-row">
          <span className="atw__config-label">Días:</span>
          <div className="atw__dias">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d, i) => (
              <button
                key={i}
                type="button"
                className={`atw__dia-chip${diasAbiertos.includes(i) ? ' atw__dia-chip--on' : ''}`}
                onClick={() => toggleDia(i)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="atw__config-row">
          <span className="atw__config-label">Horario:</span>
          <span className="atw__config-text">desde</span>
          <input
            type="number" min={0} max={23}
            className="atw__hora-input"
            value={horarioDesde}
            onChange={e => setHorarioDesde(Number(e.target.value))}
          />
          <span className="atw__config-text">hs hasta</span>
          <input
            type="number" min={1} max={24}
            className="atw__hora-input"
            value={horarioHasta}
            onChange={e => setHorarioHasta(Number(e.target.value))}
          />
          <span className="atw__config-text">hs</span>
          {diasAbiertos.length === 0 && (
            <span className="atw__config-warn">Seleccioná al menos un día</span>
          )}
          <button
            className="atw__save-config-btn"
            onClick={guardarConfig}
            disabled={guardandoConfig || diasAbiertos.length === 0}
          >
            {guardandoConfig ? '…' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="atw__subtabs">
        {[['pedidos','Pedidos'],['picadas','Picadas'],['ingredientes','Ingredientes'],['adicionales','Adicionales']].map(([id, label]) => (
          <button key={id} className={`atw__stab${subTab === id ? ' atw__stab--on' : ''}`}
            onClick={() => setSubTab(id)}>{label}</button>
        ))}
      </div>

      {subTab === 'pedidos'      && <PedidosTW />}
      {subTab === 'picadas'      && <PicadasTW />}
      {subTab === 'ingredientes' && <IngredientesTW />}
      {subTab === 'adicionales' && <AdicionalestTW />}
    </div>
  );
}

export default AdminTakeAway;
