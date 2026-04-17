import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './AdminReservas.css';

function SimpleToast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`ar-toast ar-toast--${type}`} onClick={onClose}>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      <span>{message}</span>
    </div>
  );
}

function AdminReservas() {
  const [activeTab, setActiveTab] = useState('cava');
  const [reservasCava, setReservasCava] = useState([]);
  const [reservasMesas, setReservasMesas] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [mostrarArchivadas, setMostrarArchivadas] = useState(false);
  const [editingReserva, setEditingReserva] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showInfluForm, setShowInfluForm] = useState(false);
  const [influForm, setInfluForm] = useState({
    nombreCompleto: '', dia: '', horario: '', redesSociales: '',
    tipo: 'Influencer', categoria: 'Lifestyle', cantidadPersonas: 1,
    invitadoPor: 'Sofi', planCanje: '1', contenidoAcordado: ''
  });

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      await Promise.all([fetchReservasCava(), fetchReservasMesas(), fetchInvitaciones()]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const sortByFecha = (data, campoFecha = 'fecha') =>
    data.sort((a, b) => {
      if (!a[campoFecha] || !b[campoFecha]) return 0;
      return (a[campoFecha] + (a.horario || '00:00')).localeCompare(b[campoFecha] + (b.horario || '00:00'));
    });

  const fetchReservasCava = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'selvaggio_reservas_cava'));
      setReservasCava(sortByFecha(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
    } catch (error) { setReservasCava([]); }
  };

  const fetchReservasMesas = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'selvaggio_reservas_mesas'));
      setReservasMesas(sortByFecha(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
    } catch (error) { setReservasMesas([]); }
  };

  const fetchInvitaciones = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'selvaggio_invitaciones'));
      setInvitaciones(sortByFecha(snapshot.docs.map(d => ({ id: d.id, ...d.data() })), 'dia'));
    } catch (error) { setInvitaciones([]); }
  };

  const toggleArchivar = async (coleccion, id, archivar) => {
    try {
      await updateDoc(doc(db, coleccion, id), { archivada: archivar });
      setToast({ message: archivar ? 'Archivada' : 'Desarchivada', type: 'success' });
      fetchData(true);
    } catch (error) {
      setToast({ message: 'Error al actualizar', type: 'error' });
    }
  };

  const eliminar = async (coleccion, id, label) => {
    if (!confirm(`¿Eliminar esta ${label}?`)) return;
    try {
      await deleteDoc(doc(db, coleccion, id));
      setToast({ message: `${label} eliminada`, type: 'success' });
      fetchData(true);
    } catch (error) {
      setToast({ message: 'Error al eliminar', type: 'error' });
    }
  };

  const startEditCava = (r) => {
    setEditingReserva({ ...r, tipo: 'cava' });
    setEditForm({
      nombre: r.nombre || '', telefono: r.telefono || '',
      cantidadPersonas: r.cantidadPersonas || 10,
      traeTorta: r.traeTorta || false, fecha: r.fecha || '', horario: r.horario || ''
    });
  };

  const startEditMesa = (r) => {
    setEditingReserva({ ...r, tipo: 'mesa' });
    setEditForm({
      nombre: r.nombre || '', apellido: r.apellido || '',
      telefono: r.telefono || '', cantidadPersonas: r.cantidadPersonas || 2,
      fecha: r.fecha || '', horario: r.horario || '',
      preferencia: r.preferencia || '', restricciones: r.restricciones || '',
      comentarios: r.comentarios || ''
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'cantidadPersonas' ? (parseInt(value) || 0) : value
    }));
  };

  const saveEdit = async () => {
    if (!editingReserva) return;
    try {
      const { tipo, id } = editingReserva;
      const col = tipo === 'cava' ? 'selvaggio_reservas_cava' : 'selvaggio_reservas_mesas';
      await updateDoc(doc(db, col, id), { ...editForm });
      setToast({ message: 'Reserva actualizada', type: 'success' });
      setEditingReserva(null);
      setEditForm({});
      fetchData(true);
    } catch (error) {
      setToast({ message: 'Error al actualizar', type: 'error' });
    }
  };

  const handleInfluFormChange = (e) => {
    const { name, value } = e.target;
    setInfluForm(prev => ({
      ...prev,
      [name]: name === 'cantidadPersonas' ? parseInt(value) || 1 : value
    }));
  };

  const submitInfluencer = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'selvaggio_invitaciones'), {
        ...influForm, createdAt: new Date().toISOString()
      });
      setToast({ message: 'Invitación creada', type: 'success' });
      setShowInfluForm(false);
      setInfluForm({
        nombreCompleto: '', dia: '', horario: '', redesSociales: '',
        tipo: 'Influencer', categoria: 'Lifestyle', cantidadPersonas: 1,
        invitadoPor: 'Sofi', planCanje: '1', contenidoAcordado: ''
      });
      fetchInvitaciones();
    } catch (error) {
      setToast({ message: 'Error al crear', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  };

  const formatCreada = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  const filtrar = (arr) => arr.filter(r => mostrarArchivadas || !r.archivada);

  return (
    <div className="ar">
      <div className="ar__header">
        <h2 className="ar__title">Reservas</h2>
        <div className="ar__actions">
          <button onClick={() => fetchData()} className="ar__btn-refresh">↻ Actualizar</button>
          <label className="ar__check">
            <input type="checkbox" checked={mostrarArchivadas} onChange={(e) => setMostrarArchivadas(e.target.checked)} />
            <span>Archivadas</span>
          </label>
        </div>
      </div>

      <div className="ar__tabs">
        {[
          { id: 'cava', label: 'Cava', count: reservasCava.filter(r => !r.archivada).length },
          { id: 'mesas', label: 'Mesas', count: reservasMesas.filter(r => !r.archivada).length },
          { id: 'influencers', label: 'Invitaciones', count: invitaciones.filter(i => !i.archivada).length }
        ].map(t => (
          <button key={t.id} className={`ar__tab ${activeTab === t.id ? 'ar__tab--active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label} <span className="ar__tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="ar__loading">Cargando...</p>
      ) : (
        <>
          {activeTab === 'cava' && (
            filtrar(reservasCava).length === 0 ? <p className="ar__empty">No hay reservas de cava</p> : (
              <div className="ar__grid">
                {filtrar(reservasCava).map(r => (
                  <div key={r.id} className={`ar__card ${r.archivada ? 'ar__card--archived' : ''}`}>
                    <div className="ar__card-top">
                      <div>
                        <h3 className="ar__card-name">{r.nombre}</h3>
                        <p className="ar__card-date">{formatFecha(r.fecha)} · {r.horario || '—'}</p>
                      </div>
                      <span className="ar__badge ar__badge--cava">{r.archivada ? 'Archivada' : 'Cava'}</span>
                    </div>
                    <div className="ar__card-body">
                      <div className="ar__card-row"><span className="ar__card-label">Personas</span><span>{r.cantidadPersonas}</span></div>
                      <div className="ar__card-row"><span className="ar__card-label">Teléfono</span><span>{r.telefono}</span></div>
                      <div className="ar__card-row"><span className="ar__card-label">Torta</span><span>{r.traeTorta ? 'Sí' : 'No'}</span></div>
                      <div className="ar__card-row"><span className="ar__card-label">Seña</span><span>$100.000</span></div>
                      <div className="ar__card-row"><span className="ar__card-label">Creada</span><span>{formatCreada(r.createdAt)}</span></div>
                    </div>
                    {r.comprobanteUrl && (
                      <a href={r.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="ar__link">Ver comprobante ↗</a>
                    )}
                    <div className="ar__card-actions">
                      <button onClick={() => startEditCava(r)} className="ar__btn ar__btn--edit">Editar</button>
                      <button onClick={() => toggleArchivar('selvaggio_reservas_cava', r.id, !r.archivada)} className="ar__btn ar__btn--archive">
                        {r.archivada ? 'Desarchivar' : 'Archivar'}
                      </button>
                      <button onClick={() => eliminar('selvaggio_reservas_cava', r.id, 'reserva de cava')} className="ar__btn ar__btn--delete">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'mesas' && (
            filtrar(reservasMesas).length === 0 ? <p className="ar__empty">No hay reservas de mesas</p> : (
              <div className="ar__grid">
                {filtrar(reservasMesas).map(r => (
                  <div key={r.id} className={`ar__card ${r.archivada ? 'ar__card--archived' : ''}`}>
                    <div className="ar__card-top">
                      <div>
                        <h3 className="ar__card-name">{r.nombre} {r.apellido}</h3>
                        <p className="ar__card-date">{formatFecha(r.fecha)} · {r.horario || '—'}</p>
                      </div>
                      <span className="ar__badge ar__badge--mesa">{r.archivada ? 'Archivada' : 'Mesa'}</span>
                    </div>
                    <div className="ar__card-body">
                      <div className="ar__card-row"><span className="ar__card-label">Personas</span><span>{r.cantidadPersonas}</span></div>
                      <div className="ar__card-row"><span className="ar__card-label">Teléfono</span><span>{r.telefono}</span></div>
                      {r.preferencia && <div className="ar__card-row"><span className="ar__card-label">Espacio</span><span>{r.preferencia}</span></div>}
                      {r.restricciones && <div className="ar__card-row"><span className="ar__card-label">Restricciones</span><span>{r.restricciones}</span></div>}
                      {r.comentarios && <div className="ar__card-row"><span className="ar__card-label">Comentarios</span><span>{r.comentarios}</span></div>}
                      <div className="ar__card-row"><span className="ar__card-label">Creada</span><span>{formatCreada(r.createdAt)}</span></div>
                    </div>
                    <div className="ar__card-actions">
                      <button onClick={() => startEditMesa(r)} className="ar__btn ar__btn--edit">Editar</button>
                      <button onClick={() => toggleArchivar('selvaggio_reservas_mesas', r.id, !r.archivada)} className="ar__btn ar__btn--archive">
                        {r.archivada ? 'Desarchivar' : 'Archivar'}
                      </button>
                      <button onClick={() => eliminar('selvaggio_reservas_mesas', r.id, 'reserva de mesa')} className="ar__btn ar__btn--delete">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'influencers' && (
            <div>
              <button onClick={() => setShowInfluForm(!showInfluForm)} className="ar__btn-new">
                {showInfluForm ? 'Cancelar' : '+ Nueva invitación'}
              </button>

              {showInfluForm && (
                <form onSubmit={submitInfluencer} className="ar__form">
                  <div className="ar__form-row">
                    <div className="ar__form-group"><label>Nombre completo</label><input type="text" name="nombreCompleto" value={influForm.nombreCompleto} onChange={handleInfluFormChange} required /></div>
                    <div className="ar__form-group"><label>Día</label><input type="date" name="dia" value={influForm.dia} onChange={handleInfluFormChange} required /></div>
                    <div className="ar__form-group"><label>Horario</label><input type="time" name="horario" value={influForm.horario} onChange={handleInfluFormChange} required /></div>
                  </div>
                  <div className="ar__form-row">
                    <div className="ar__form-group"><label>Redes sociales</label><input type="text" name="redesSociales" value={influForm.redesSociales} onChange={handleInfluFormChange} placeholder="@usuario" required /></div>
                    <div className="ar__form-group">
                      <label>Tipo</label>
                      <select name="tipo" value={influForm.tipo} onChange={handleInfluFormChange}>
                        <option value="Prensa">Prensa</option>
                        <option value="Creadora de contenido">Creadora de contenido</option>
                        <option value="Influencer">Influencer</option>
                        <option value="Tiktoker">Tiktoker</option>
                      </select>
                    </div>
                    <div className="ar__form-group">
                      <label>Categoría</label>
                      <select name="categoria" value={influForm.categoria} onChange={handleInfluFormChange}>
                        <option value="Lifestyle">Lifestyle</option>
                        <option value="Foodie">Foodie</option>
                      </select>
                    </div>
                  </div>
                  <div className="ar__form-row">
                    <div className="ar__form-group"><label>Personas</label><input type="number" name="cantidadPersonas" value={influForm.cantidadPersonas} onChange={handleInfluFormChange} min="1" required /></div>
                    <div className="ar__form-group">
                      <label>Invitado por</label>
                      <select name="invitadoPor" value={influForm.invitadoPor} onChange={handleInfluFormChange}>
                        <option value="Agencia">Agencia</option>
                        <option value="Redes">Redes</option>
                        <option value="Sofi">Sofi</option>
                      </select>
                    </div>
                    <div className="ar__form-group">
                      <label>Plan de canje</label>
                      <select name="planCanje" value={influForm.planCanje} onChange={handleInfluFormChange}>
                        <option value="1">Plan 1</option>
                        <option value="2">Plan 2</option>
                        <option value="3">Plan 3</option>
                      </select>
                    </div>
                  </div>
                  <div className="ar__form-group">
                    <label>Contenido acordado</label>
                    <textarea name="contenidoAcordado" value={influForm.contenidoAcordado} onChange={handleInfluFormChange} rows="3" placeholder="Descripción del contenido..." required />
                  </div>
                  <button type="submit" className="ar__btn-submit" disabled={loading}>
                    {loading ? 'Creando...' : 'Crear invitación'}
                  </button>
                </form>
              )}

              {filtrar(invitaciones).length === 0 ? <p className="ar__empty">No hay invitaciones</p> : (
                <div className="ar__grid">
                  {filtrar(invitaciones).map(inv => (
                    <div key={inv.id} className={`ar__card ${inv.archivada ? 'ar__card--archived' : ''}`}>
                      <div className="ar__card-top">
                        <div>
                          <h3 className="ar__card-name">{inv.nombreCompleto}</h3>
                          <p className="ar__card-date">{formatFecha(inv.dia)} · {inv.horario || '—'}</p>
                        </div>
                        <span className={`ar__badge ar__badge--${inv.tipo?.toLowerCase().replace(/ /g, '-') || 'influ'}`}>
                          {inv.archivada ? 'Archivada' : inv.tipo}
                        </span>
                      </div>
                      <div className="ar__card-body">
                        <div className="ar__card-row"><span className="ar__card-label">Redes</span><span>{inv.redesSociales}</span></div>
                        <div className="ar__card-row"><span className="ar__card-label">Categoría</span><span>{inv.categoria}</span></div>
                        <div className="ar__card-row"><span className="ar__card-label">Personas</span><span>{inv.cantidadPersonas}</span></div>
                        <div className="ar__card-row"><span className="ar__card-label">Invitado por</span><span>{inv.invitadoPor}</span></div>
                        <div className="ar__card-row"><span className="ar__card-label">Plan</span><span>{inv.planCanje}</span></div>
                        {inv.contenidoAcordado && <div className="ar__card-row"><span className="ar__card-label">Contenido</span><span>{inv.contenidoAcordado}</span></div>}
                        <div className="ar__card-row"><span className="ar__card-label">Creada</span><span>{formatCreada(inv.createdAt)}</span></div>
                      </div>
                      <div className="ar__card-actions">
                        <button onClick={() => toggleArchivar('selvaggio_invitaciones', inv.id, !inv.archivada)} className="ar__btn ar__btn--archive">
                          {inv.archivada ? 'Desarchivar' : 'Archivar'}
                        </button>
                        <button onClick={() => eliminar('selvaggio_invitaciones', inv.id, 'invitación')} className="ar__btn ar__btn--delete">Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {editingReserva && (
        <div className="ar__overlay" onClick={() => { setEditingReserva(null); setEditForm({}); }}>
          <div className="ar__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ar__modal-title">Editar reserva de {editingReserva.tipo === 'cava' ? 'cava' : 'mesa'}</h3>
            <div className="ar__modal-form">
              <div className="ar__form-group"><label>Nombre</label><input type="text" name="nombre" value={editForm.nombre} onChange={handleEditFormChange} /></div>
              {editingReserva.tipo === 'mesa' && (
                <div className="ar__form-group"><label>Apellido</label><input type="text" name="apellido" value={editForm.apellido} onChange={handleEditFormChange} /></div>
              )}
              <div className="ar__form-group"><label>Teléfono</label><input type="tel" name="telefono" value={editForm.telefono} onChange={handleEditFormChange} /></div>
              <div className="ar__form-group"><label>Personas</label><input type="number" name="cantidadPersonas" value={editForm.cantidadPersonas} onChange={handleEditFormChange} min={editingReserva.tipo === 'cava' ? 10 : 1} /></div>
              <div className="ar__form-group"><label>Fecha</label><input type="date" name="fecha" value={editForm.fecha} onChange={handleEditFormChange} /></div>
              <div className="ar__form-group">
                <label>Horario</label>
                {editingReserva.tipo === 'cava' ? (
                  <select name="horario" value={editForm.horario} onChange={handleEditFormChange}>
                    <option value="">Seleccionar</option>
                    {['12:00','12:30','13:00','13:30','14:00','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'].map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                ) : (
                  <select name="horario" value={editForm.horario} onChange={handleEditFormChange}>
                    <option value="">Seleccionar</option>
                    {['18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00','23:30','00:00','00:30','01:00','01:30','02:00'].map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                )}
              </div>
              {editingReserva.tipo === 'cava' && (
                <label className="ar__checkbox"><input type="checkbox" name="traeTorta" checked={editForm.traeTorta} onChange={handleEditFormChange} /> ¿Trae torta?</label>
              )}
              {editingReserva.tipo === 'mesa' && (
                <>
                  <div className="ar__form-group">
                    <label>Espacio</label>
                    <select name="preferencia" value={editForm.preferencia} onChange={handleEditFormChange}>
                      <option value="">Sin preferencia</option>
                      <option value="Adentro / Living">Adentro / Living</option>
                      <option value="Pérgola / La Galería">Pérgola / La Galería</option>
                    </select>
                  </div>
                  <div className="ar__form-group"><label>Restricciones</label><textarea name="restricciones" value={editForm.restricciones} onChange={handleEditFormChange} rows="2" /></div>
                  <div className="ar__form-group"><label>Comentarios</label><textarea name="comentarios" value={editForm.comentarios} onChange={handleEditFormChange} rows="2" /></div>
                </>
              )}
              <div className="ar__modal-actions">
                <button onClick={saveEdit} className="ar__btn ar__btn--save">Guardar</button>
                <button onClick={() => { setEditingReserva(null); setEditForm({}); }} className="ar__btn ar__btn--cancel">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <SimpleToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default AdminReservas;
