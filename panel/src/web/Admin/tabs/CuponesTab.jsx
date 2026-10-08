import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './TabsShared.css';

const FORM_INICIAL = {
  codigo: '', tipoDescuento: 'porcentaje', valor: '',
  activo: true, fechaDesde: '', fechaHasta: '', montoMinimo: '',
  limiteUsosTotal: '', limiteUsosPorCliente: '', descripcion: '',
};

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

function CuponesTab() {
  const [cupones, setCupones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null); // id del cupón (código) o null
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [historialDe, setHistorialDe] = useState(null); // id del cupón cuyo historial se está viendo, o null
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setCargando(true);
    try {
      const snap = await getDocs(collection(db, 'selvaggio_cupones'));
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (b.creado?.toMillis?.() || 0) - (a.creado?.toMillis?.() || 0));
      setCupones(items);
    } catch (err) {
      console.error('Error cargando cupones:', err);
    } finally {
      setCargando(false);
    }
  };

  const resetForm = () => { setForm(FORM_INICIAL); setEditando(null); setShowForm(false); };

  const editar = (c) => {
    setForm({
      codigo: c.id,
      tipoDescuento: c.tipoDescuento || 'porcentaje',
      valor: c.valor ?? '',
      activo: c.activo !== false,
      fechaDesde: c.fechaDesde || '',
      fechaHasta: c.fechaHasta || '',
      montoMinimo: c.montoMinimo || '',
      limiteUsosTotal: c.limiteUsosTotal ?? '',
      limiteUsosPorCliente: c.limiteUsosPorCliente ?? '',
      descripcion: c.descripcion || '',
    });
    setEditando(c.id);
    setShowForm(true);
  };

  const guardar = async () => {
    const codigo = form.codigo.toUpperCase().trim().replace(/\s+/g, '');
    if (!codigo || !form.valor) { alert('Completá al menos código y valor del descuento'); return; }

    setGuardando(true);
    try {
      const data = {
        codigo,
        tipoDescuento: form.tipoDescuento,
        valor: Number(form.valor),
        activo: form.activo,
        fechaDesde: form.fechaDesde || '',
        fechaHasta: form.fechaHasta || '',
        montoMinimo: form.montoMinimo ? Number(form.montoMinimo) : 0,
        limiteUsosTotal: form.limiteUsosTotal ? Number(form.limiteUsosTotal) : null,
        limiteUsosPorCliente: form.limiteUsosPorCliente ? Number(form.limiteUsosPorCliente) : null,
        descripcion: form.descripcion || '',
      };

      if (editando) {
        await updateDoc(doc(db, 'selvaggio_cupones', editando), data);
      } else {
        const existente = await getDoc(doc(db, 'selvaggio_cupones', codigo));
        if (existente.exists()) { alert(`Ya existe un cupón con el código "${codigo}"`); setGuardando(false); return; }
        await setDoc(doc(db, 'selvaggio_cupones', codigo), {
          ...data,
          usosTotales: 0,
          montoDescontadoTotal: 0,
          ingresosGenerados: 0,
          creado: Timestamp.now(),
        });
      }
      await cargar();
      resetForm();
    } catch (err) {
      console.error('Error guardando cupón:', err);
      alert('Error al guardar el cupón');
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (c) => {
    try {
      await updateDoc(doc(db, 'selvaggio_cupones', c.id), { activo: !c.activo });
      setCupones(cupones.map(x => x.id === c.id ? { ...x, activo: !x.activo } : x));
    } catch {
      alert('Error al actualizar el cupón');
    }
  };

  const eliminar = async (c) => {
    if (!window.confirm(`¿Eliminar el cupón "${c.id}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, 'selvaggio_cupones', c.id));
      setCupones(cupones.filter(x => x.id !== c.id));
    } catch {
      alert('Error al eliminar el cupón');
    }
  };

  const verHistorial = async (c) => {
    setHistorialDe(c.id);
    setCargandoHistorial(true);
    try {
      const snap = await getDocs(collection(db, 'selvaggio_cupones', c.id, 'usos'));
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (b.fecha?.toMillis?.() || 0) - (a.fecha?.toMillis?.() || 0));
      setHistorial(items);
    } catch (err) {
      console.error('Error cargando historial:', err);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const vigencia = (c) => {
    if (!c.fechaDesde && !c.fechaHasta) return 'Sin límite';
    return `${c.fechaDesde || '…'} → ${c.fechaHasta || '…'}`;
  };

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>🎟️ Cupones</h2>
        <p>Creá y gestioná cupones de descuento para Take Away.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-box highlight"><div className="stat-num">{cupones.filter(c => c.activo).length}</div><div className="stat-label">Activos</div></div>
        <div className="stat-box"><div className="stat-num">{cupones.length}</div><div className="stat-label">Total</div></div>
        <div className="stat-box"><div className="stat-num">{cupones.reduce((a, c) => a + (c.usosTotales || 0), 0)}</div><div className="stat-label">Usos totales</div></div>
        <div className="stat-box"><div className="stat-num">{fmt(cupones.reduce((a, c) => a + (c.montoDescontadoTotal || 0), 0))}</div><div className="stat-label">Descontado</div></div>
      </div>

      {!showForm && <button className="btn-action" onClick={() => setShowForm(true)}>+ Nuevo cupón</button>}

      {showForm && (
        <div className="cal-form" style={{ marginBottom: 28 }}>
          <h3 className="cal-form__title">{editando ? '✏️ Editar cupón' : '🆕 Nuevo cupón'}</h3>

          <div className="cal-form__row">
            <div className="cal-form__field">
              <label>Código *</label>
              <input type="text" value={form.codigo} disabled={!!editando}
                onChange={e => setForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                placeholder="Ej: PROMO10" />
            </div>
            <div className="cal-form__field">
              <label>Tipo de descuento *</label>
              <select value={form.tipoDescuento} onChange={e => setForm(p => ({ ...p, tipoDescuento: e.target.value }))}>
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto_fijo">Monto fijo ($)</option>
              </select>
            </div>
            <div className="cal-form__field">
              <label>Valor *</label>
              <input type="number" min="1" value={form.valor}
                onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
                placeholder={form.tipoDescuento === 'porcentaje' ? 'Ej: 10' : 'Ej: 2000'} />
            </div>
          </div>

          <div className="cal-form__row">
            <div className="cal-form__field">
              <label>Vigente desde</label>
              <input type="date" value={form.fechaDesde} onChange={e => setForm(p => ({ ...p, fechaDesde: e.target.value }))} />
            </div>
            <div className="cal-form__field">
              <label>Vigente hasta</label>
              <input type="date" value={form.fechaHasta} onChange={e => setForm(p => ({ ...p, fechaHasta: e.target.value }))} />
            </div>
            <div className="cal-form__field">
              <label>Compra mínima ($)</label>
              <input type="number" min="0" value={form.montoMinimo} onChange={e => setForm(p => ({ ...p, montoMinimo: e.target.value }))} placeholder="Sin mínimo" />
            </div>
          </div>

          <div className="cal-form__row">
            <div className="cal-form__field">
              <label>Límite de usos totales</label>
              <input type="number" min="1" value={form.limiteUsosTotal} onChange={e => setForm(p => ({ ...p, limiteUsosTotal: e.target.value }))} placeholder="Sin límite" />
            </div>
            <div className="cal-form__field">
              <label>Límite de usos por cliente</label>
              <input type="number" min="1" value={form.limiteUsosPorCliente} onChange={e => setForm(p => ({ ...p, limiteUsosPorCliente: e.target.value }))} placeholder="Sin límite" />
            </div>
          </div>

          <div className="cal-form__field">
            <label>Descripción interna</label>
            <input type="text" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Nota para uso interno, no se muestra al cliente" />
          </div>

          <div className="cal-form__field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.activo} onChange={e => setForm(p => ({ ...p, activo: e.target.checked }))} />
              Activo
            </label>
          </div>

          <div className="cal-form__actions">
            <button className="btn-action" onClick={guardar} disabled={guardando}>{editando ? 'Guardar cambios' : 'Crear cupón'}</button>
            <button className="btn-action btn-danger" onClick={resetForm}>Cancelar</button>
          </div>
        </div>
      )}

      {cargando ? (
        <div className="loading-state">Cargando...</div>
      ) : cupones.length === 0 ? (
        <div className="empty-state">No hay cupones creados aún.</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th><th>Tipo</th><th>Valor</th><th>Activo</th><th>Vigencia</th>
                <th>Usos</th><th>Descontado</th><th>Ingresos</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cupones.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.id}</strong></td>
                  <td>{c.tipoDescuento === 'porcentaje' ? '%' : '$ fijo'}</td>
                  <td>{c.tipoDescuento === 'porcentaje' ? `${c.valor}%` : fmt(c.valor)}</td>
                  <td>
                    <button className="btn-action" onClick={() => toggleActivo(c)}>
                      {c.activo ? '✓ Activo' : '✕ Inactivo'}
                    </button>
                  </td>
                  <td>{vigencia(c)}</td>
                  <td>{c.usosTotales || 0}{c.limiteUsosTotal != null ? ` / ${c.limiteUsosTotal}` : ''}</td>
                  <td>{fmt(c.montoDescontadoTotal)}</td>
                  <td>{fmt(c.ingresosGenerados)}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-action" onClick={() => editar(c)} title="Editar">✏️</button>
                    <button className="btn-action" onClick={() => verHistorial(c)} title="Ver historial de uso">📊</button>
                    <button className="btn-action btn-danger-sm" onClick={() => eliminar(c)} title="Eliminar">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historialDe && (
        <div className="cal-form" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="cal-form__title">Historial de uso — {historialDe}</h3>
            <button className="btn-action btn-danger" onClick={() => setHistorialDe(null)}>Cerrar</button>
          </div>
          {cargandoHistorial ? (
            <div className="loading-state">Cargando...</div>
          ) : historial.length === 0 ? (
            <div className="empty-state">Este cupón todavía no fue usado.</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Fecha</th><th>Cliente</th><th>Pedido</th><th>Descuento</th><th>Total pedido</th></tr>
                </thead>
                <tbody>
                  {historial.map(u => (
                    <tr key={u.id}>
                      <td>{u.fecha?.toDate ? u.fecha.toDate().toLocaleString('es-AR') : '-'}</td>
                      <td>{u.nombre} ({u.email})</td>
                      <td>{u.numeroPedido}</td>
                      <td>{fmt(u.descuentoAplicado)}</td>
                      <td>{fmt(u.totalPedido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CuponesTab;
