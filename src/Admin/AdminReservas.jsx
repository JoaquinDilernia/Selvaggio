import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './AdminReservas.css';

// Componente Toast simple para AdminReservas
function SimpleToast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div 
      className={`toast toast-${type}`} 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '250px'
      }}
    >
      <span style={{ fontSize: '20px' }}>{icons[type]}</span>
      <span>{message}</span>
      <button 
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          marginLeft: 'auto'
        }}
      >
        ×
      </button>
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
  
  // Estado para edición
  const [editingReserva, setEditingReserva] = useState(null); // { id, tipo: 'cava'|'mesa', ...data }
  const [editForm, setEditForm] = useState({});
  
  // Form para crear invitación influencer
  const [showInfluForm, setShowInfluForm] = useState(false);
  const [influForm, setInfluForm] = useState({
    nombreCompleto: '',
    dia: '',
    horario: '',
    redesSociales: '',
    tipo: 'Influencer',
    categoria: 'Lifestyle',
    cantidadPersonas: 1,
    invitadoPor: 'Sofi',
    planCanje: '1',
    contenidoAcordado: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true); // silent refresh
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      await Promise.all([
        fetchReservasCava(),
        fetchReservasMesas(),
        fetchInvitaciones()
      ]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchReservasCava = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'selvaggio_reservas_cava'));
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordenar por fecha + horario
      data = data.sort((a, b) => {
        if (!a.fecha || !b.fecha) return 0;
        const fechaA = a.fecha + (a.horario || '00:00');
        const fechaB = b.fecha + (b.horario || '00:00');
        return fechaA.localeCompare(fechaB);
      });
      
      setReservasCava(data);
    } catch (error) {
      console.error('Error al cargar reservas de cava:', error);
      setReservasCava([]);
    }
  };

  const fetchReservasMesas = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'selvaggio_reservas_mesas'));
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordenar por fecha + horario
      data = data.sort((a, b) => {
        if (!a.fecha || !b.fecha) return 0;
        const fechaA = a.fecha + (a.horario || '00:00');
        const fechaB = b.fecha + (b.horario || '00:00');
        return fechaA.localeCompare(fechaB);
      });
      
      setReservasMesas(data);
    } catch (error) {
      console.error('Error al cargar reservas de mesas:', error);
      setReservasMesas([]);
    }
  };

  const fetchInvitaciones = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'selvaggio_invitaciones'));
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      data = data.sort((a, b) => {
        if (!a.dia || !b.dia) return 0;
        const fechaA = a.dia + (a.horario || '00:00');
        const fechaB = b.dia + (b.horario || '00:00');
        return fechaA.localeCompare(fechaB);
      });
      
      setInvitaciones(data);
    } catch (error) {
      console.error('Error al cargar invitaciones:', error);
      setInvitaciones([]);
    }
  };

  // ===== ARCHIVAR / DESARCHIVAR =====
  const toggleArchivarCava = async (id, archivar) => {
    try {
      await updateDoc(doc(db, 'selvaggio_reservas_cava', id), { archivada: archivar });
      setToast({ message: archivar ? 'Reserva archivada' : 'Reserva desarchivada', type: 'success' });
      fetchReservasCava();
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al actualizar', type: 'error' });
    }
  };

  const toggleArchivarMesa = async (id, archivar) => {
    try {
      await updateDoc(doc(db, 'selvaggio_reservas_mesas', id), { archivada: archivar });
      setToast({ message: archivar ? 'Reserva archivada' : 'Reserva desarchivada', type: 'success' });
      fetchReservasMesas();
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al actualizar', type: 'error' });
    }
  };

  const toggleArchivarInvitacion = async (id, archivar) => {
    try {
      await updateDoc(doc(db, 'selvaggio_invitaciones', id), { archivada: archivar });
      setToast({ message: archivar ? 'Invitación archivada' : 'Invitación desarchivada', type: 'success' });
      fetchInvitaciones();
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al actualizar', type: 'error' });
    }
  };

  // ===== ELIMINAR =====
  const deleteReservaCava = async (id) => {
    if (!confirm('¿Eliminar esta reserva de cava?')) return;
    try {
      await deleteDoc(doc(db, 'selvaggio_reservas_cava', id));
      setToast({ message: 'Reserva de cava eliminada', type: 'success' });
      fetchReservasCava();
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al eliminar', type: 'error' });
    }
  };

  const deleteReservaMesa = async (id) => {
    if (!confirm('¿Eliminar esta reserva de mesa?')) return;
    try {
      await deleteDoc(doc(db, 'selvaggio_reservas_mesas', id));
      setToast({ message: 'Reserva de mesa eliminada', type: 'success' });
      fetchReservasMesas();
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al eliminar', type: 'error' });
    }
  };

  const deleteInvitacion = async (id) => {
    if (!confirm('¿Eliminar esta invitación?')) return;
    try {
      await deleteDoc(doc(db, 'selvaggio_invitaciones', id));
      setToast({ message: 'Invitación eliminada', type: 'success' });
      fetchInvitaciones();
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al eliminar', type: 'error' });
    }
  };

  // ===== ESTADO MESA =====
  const updateEstadoMesa = async (id, nuevoEstado) => {
    try {
      await updateDoc(doc(db, 'selvaggio_reservas_mesas', id), { estado: nuevoEstado });
      setToast({ message: 'Estado actualizado', type: 'success' });
      fetchReservasMesas();
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al actualizar', type: 'error' });
    }
  };

  // ===== EDICIÓN =====
  const startEditCava = (reserva) => {
    setEditingReserva({ ...reserva, tipo: 'cava' });
    setEditForm({
      nombre: reserva.nombre || '',
      telefono: reserva.telefono || '',
      cantidadPersonas: reserva.cantidadPersonas || 10,
      traeTorta: reserva.traeTorta || false,
      fecha: reserva.fecha || '',
      horario: reserva.horario || ''
    });
  };

  const startEditMesa = (reserva) => {
    setEditingReserva({ ...reserva, tipo: 'mesa' });
    setEditForm({
      nombre: reserva.nombre || '',
      apellido: reserva.apellido || '',
      telefono: reserva.telefono || '',
      cantidadPersonas: reserva.cantidadPersonas || 2,
      fecha: reserva.fecha || '',
      horario: reserva.horario || '',
      preferencia: reserva.preferencia || '',
      restricciones: reserva.restricciones || '',
      comentarios: reserva.comentarios || ''
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setEditForm(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'cantidadPersonas') {
      setEditForm(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const saveEdit = async () => {
    if (!editingReserva) return;
    
    try {
      const { tipo, id } = editingReserva;
      const collectionName = tipo === 'cava' ? 'selvaggio_reservas_cava' : 'selvaggio_reservas_mesas';
      
      const updateData = { ...editForm };
      
      // Recalcular total para cava
      if (tipo === 'cava') {
        updateData.total = updateData.cantidadPersonas * 50000;
        updateData.precioPersona = 50000;
      }
      
      await updateDoc(doc(db, collectionName, id), updateData);
      
      setToast({ message: 'Reserva actualizada exitosamente', type: 'success' });
      setEditingReserva(null);
      setEditForm({});
      
      if (tipo === 'cava') fetchReservasCava();
      else fetchReservasMesas();
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al actualizar reserva', type: 'error' });
    }
  };

  const cancelEdit = () => {
    setEditingReserva(null);
    setEditForm({});
  };

  // ===== INFLUENCERS =====
  const handleInfluFormChange = (e) => {
    const { name, value } = e.target;
    setInfluForm(prev => ({
      ...prev,
      [name]: name === 'cantidadPersonas' ? parseInt(value) || 1 : value
    }));
  };

  const submitInfluencer = async (e) => {
    e.preventDefault();
    
    if (loading) return; // Prevenir doble submit
    
    setLoading(true);
    
    try {
      await addDoc(collection(db, 'selvaggio_invitaciones'), {
        ...influForm,
        createdAt: new Date().toISOString()
      });
      
      setToast({ message: 'Invitación creada exitosamente', type: 'success' });
      setShowInfluForm(false);
      setInfluForm({
        nombreCompleto: '',
        dia: '',
        horario: '',
        redesSociales: '',
        tipo: 'Influencer',
        categoria: 'Lifestyle',
        cantidadPersonas: 1,
        invitadoPor: 'Sofi',
        planCanje: '1',
        contenidoAcordado: ''
      });
      fetchInvitaciones();
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al crear invitación', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-reservas-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2>Gestión de Reservas</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={() => fetchData()}
            style={{ background: 'transparent', border: '1px solid rgba(183, 148, 199, 0.5)', color: '#b794c7', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            🔄 Actualizar
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={mostrarArchivadas}
              onChange={(e) => setMostrarArchivadas(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Mostrar archivadas</span>
          </label>
        </div>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '15px' }}>Se actualiza automáticamente cada 30 segundos</p>

      <div className="tabs-reservas">
        <button
          className={activeTab === 'cava' ? 'active' : ''}
          onClick={() => setActiveTab('cava')}
        >
          Reservas Cava ({reservasCava.filter(r => !r.archivada).length})
        </button>
        <button
          className={activeTab === 'mesas' ? 'active' : ''}
          onClick={() => setActiveTab('mesas')}
        >
          Reservas Mesas ({reservasMesas.filter(r => !r.archivada).length})
        </button>
        <button
          className={activeTab === 'influencers' ? 'active' : ''}
          onClick={() => setActiveTab('influencers')}
        >
          Invitaciones ({invitaciones.filter(i => !i.archivada).length})
        </button>
      </div>

      {loading ? (
        <div className="loading-reservas">Cargando...</div>
      ) : (
        <>
          {/* RESERVAS DE CAVA */}
          {activeTab === 'cava' && (
            <div className="reservas-section">
              {reservasCava.filter(r => mostrarArchivadas || !r.archivada).length === 0 ? (
                <p className="no-data">No hay reservas de cava</p>
              ) : (
                <div className="reservas-grid">
                  {reservasCava.filter(r => mostrarArchivadas || !r.archivada).map(reserva => (
                    <div key={reserva.id} className={`reserva-card cava-card ${reserva.esNueva ? 'nueva-reserva' : ''}`}>
                      <div className="reserva-header">
                        <h3>{reserva.nombre}</h3>
                        <span className="badge confirmada">{reserva.archivada ? 'Archivada' : 'Confirmada'}</span>
                      </div>
                      
                      <div className="reserva-details">
                        <p><strong>📅 Fecha:</strong> {new Date(reserva.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</p>
                        {reserva.horario && <p><strong>⏰ Horario:</strong> {reserva.horario}</p>}
                        <p><strong>🗓️ Creada:</strong> {new Date(reserva.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        <p><strong>📞 Teléfono:</strong> {reserva.telefono}</p>
                        <p><strong>👥 Personas:</strong> {reserva.cantidadPersonas}</p>
                        <p><strong>🎂 Trae torta:</strong> {reserva.traeTorta ? 'Sí' : 'No'}</p>
                        <p><strong>💰 Total:</strong> ${reserva.total?.toLocaleString('es-AR')}</p>
                        <p><strong>💵 Seña:</strong> $100.000</p>
                      </div>

                      {reserva.comprobanteUrl && (
                        <a
                          href={reserva.comprobanteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ver-comprobante"
                        >
                          Ver Comprobante
                        </a>
                      )}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => startEditCava(reserva)}
                          className="btn-editar"
                        >
                          ✏️ Editar
                        </button>
                        {reserva.archivada ? (
                          <button
                            onClick={() => toggleArchivarCava(reserva.id, false)}
                            className="btn-desarchivar"
                          >
                            📤 Desarchivar
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleArchivarCava(reserva.id, true)}
                            className="btn-archivar"
                            style={{ flex: 1, background: '#6c757d', color: 'white', border: 'none', padding: '8px', borderRadius: '5px', cursor: 'pointer' }}
                          >
                            Archivar
                          </button>
                        )}
                        <button
                          onClick={() => deleteReservaCava(reserva.id)}
                          className="btn-delete"
                          style={{ flex: 1 }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RESERVAS DE MESAS */}
          {activeTab === 'mesas' && (
            <div className="reservas-section">
              {reservasMesas.filter(r => mostrarArchivadas || !r.archivada).length === 0 ? (
                <p className="no-data">No hay reservas de mesas</p>
              ) : (
                <div className="reservas-grid">
                  {reservasMesas.filter(r => mostrarArchivadas || !r.archivada).map(reserva => (
                    <div key={reserva.id} className="reserva-card mesa-card">
                      <div className="reserva-header">
                        <h3>{reserva.nombre} {reserva.apellido && reserva.apellido}</h3>
                        {reserva.archivada ? (
                          <span className="badge archivada" style={{ background: '#6c757d' }}>Archivada</span>
                        ) : (
                          <select
                            value={reserva.estado}
                            onChange={(e) => updateEstadoMesa(reserva.id, e.target.value)}
                            className={`badge ${reserva.estado}`}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="confirmada">Confirmada</option>
                            <option value="cancelada">Cancelada</option>
                          </select>
                        )}
                      </div>
                      
                      <div className="reserva-details">
                        <p><strong>📅 Fecha:</strong> {new Date(reserva.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</p>
                        <p><strong>🗓️ Creada:</strong> {new Date(reserva.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        <p><strong>⏰ Horario:</strong> {reserva.horario}</p>
                        <p><strong>📞 Teléfono:</strong> {reserva.telefono}</p>
                        <p><strong>👥 Personas:</strong> {reserva.cantidadPersonas}</p>
                        {reserva.preferencia && (
                          <p><strong>📍 Ubicación:</strong> {reserva.preferencia}</p>
                        )}
                        {reserva.restricciones && (
                          <p><strong>⚠️ Restricciones/Alergias:</strong> {reserva.restricciones}</p>
                        )}
                        {reserva.comentarios && (
                          <p><strong>💬 Comentarios:</strong> {reserva.comentarios}</p>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => startEditMesa(reserva)}
                          className="btn-editar"
                        >
                          ✏️ Editar
                        </button>
                        {reserva.archivada ? (
                          <button
                            onClick={() => toggleArchivarMesa(reserva.id, false)}
                            className="btn-desarchivar"
                          >
                            📤 Desarchivar
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleArchivarMesa(reserva.id, true)}
                            className="btn-archivar"
                            style={{ flex: 1, background: '#6c757d', color: 'white', border: 'none', padding: '8px', borderRadius: '5px', cursor: 'pointer' }}
                          >
                            Archivar
                          </button>
                        )}
                        <button
                          onClick={() => deleteReservaMesa(reserva.id)}
                          className="btn-delete"
                          style={{ flex: 1 }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INVITACIONES INFLUENCERS */}
          {activeTab === 'influencers' && (
            <div className="reservas-section">
              <button
                onClick={() => setShowInfluForm(!showInfluForm)}
                className="btn-add-influ"
              >
                {showInfluForm ? 'Cancelar' : '+ Nueva Invitación'}
              </button>

              {showInfluForm && (
                <form onSubmit={submitInfluencer} className="influ-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nombre completo *</label>
                      <input
                        type="text"
                        name="nombreCompleto"
                        value={influForm.nombreCompleto}
                        onChange={handleInfluFormChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Día *</label>
                      <input
                        type="date"
                        name="dia"
                        value={influForm.dia}
                        onChange={handleInfluFormChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Horario *</label>
                      <input
                        type="time"
                        name="horario"
                        value={influForm.horario}
                        onChange={handleInfluFormChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Redes sociales *</label>
                      <input
                        type="text"
                        name="redesSociales"
                        value={influForm.redesSociales}
                        onChange={handleInfluFormChange}
                        placeholder="@usuario"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Tipo *</label>
                      <select
                        name="tipo"
                        value={influForm.tipo}
                        onChange={handleInfluFormChange}
                        required
                      >
                        <option value="Prensa">Prensa</option>
                        <option value="Creadora de contenido">Creadora de contenido</option>
                        <option value="Influencer">Influencer</option>
                        <option value="Tiktoker">Tiktoker</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Categoría *</label>
                      <select
                        name="categoria"
                        value={influForm.categoria}
                        onChange={handleInfluFormChange}
                        required
                      >
                        <option value="Lifestyle">Lifestyle</option>
                        <option value="Foodie">Foodie</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Cantidad de personas *</label>
                      <input
                        type="number"
                        name="cantidadPersonas"
                        value={influForm.cantidadPersonas}
                        onChange={handleInfluFormChange}
                        min="1"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Invitado por *</label>
                      <select
                        name="invitadoPor"
                        value={influForm.invitadoPor}
                        onChange={handleInfluFormChange}
                        required
                      >
                        <option value="Agencia">Agencia</option>
                        <option value="Redes">Redes</option>
                        <option value="Sofi">Sofi</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Plan de canje *</label>
                      <select
                        name="planCanje"
                        value={influForm.planCanje}
                        onChange={handleInfluFormChange}
                        required
                      >
                        <option value="1">Plan 1</option>
                        <option value="2">Plan 2</option>
                        <option value="3">Plan 3</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Contenido acordado *</label>
                    <textarea
                      name="contenidoAcordado"
                      value={influForm.contenidoAcordado}
                      onChange={handleInfluFormChange}
                      rows="3"
                      placeholder="Descripción del contenido que se acordó..."
                      required
                    />
                  </div>

                  <button type="submit" className="btn-submit-influ" disabled={loading}>
                    {loading ? 'Creando...' : 'Crear Invitación'}
                  </button>
                </form>
              )}

              {invitaciones.filter(i => mostrarArchivadas || !i.archivada).length === 0 ? (
                <p className="no-data">No hay invitaciones registradas</p>
              ) : (
                <div className="reservas-grid">
                  {invitaciones.filter(i => mostrarArchivadas || !i.archivada).map(inv => (
                    <div key={inv.id} className="reserva-card influ-card">
                      <div className="reserva-header">
                        <h3>{inv.nombreCompleto}</h3>
                        <span className={`badge ${inv.archivada ? 'archivada' : 'tipo-' + inv.tipo.toLowerCase().replace(/ /g, '-')}`} style={inv.archivada ? { background: '#6c757d' } : {}}>
                          {inv.archivada ? 'Archivada' : inv.tipo}
                        </span>
                      </div>
                      
                      <div className="reserva-details">
                        <p><strong>📅 Día:</strong> {new Date(inv.dia + 'T00:00:00').toLocaleDateString('es-AR')}</p>
                        <p><strong>🗓️ Creada:</strong> {new Date(inv.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        <p><strong>⏰ Horario:</strong> {inv.horario}</p>
                        <p><strong>📱 Redes:</strong> {inv.redesSociales}</p>
                        <p><strong>🏷️ Categoría:</strong> {inv.categoria}</p>
                        <p><strong>👥 Personas:</strong> {inv.cantidadPersonas}</p>
                        <p><strong>👤 Invitado por:</strong> {inv.invitadoPor}</p>
                        <p><strong>🎁 Plan:</strong> {inv.planCanje}</p>
                        <p><strong>📝 Contenido:</strong> {inv.contenidoAcordado}</p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {inv.archivada ? (
                          <button
                            onClick={() => toggleArchivarInvitacion(inv.id, false)}
                            className="btn-desarchivar"
                          >
                            📤 Desarchivar
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleArchivarInvitacion(inv.id, true)}
                            className="btn-archivar"
                            style={{ flex: 1, background: '#6c757d', color: 'white', border: 'none', padding: '8px', borderRadius: '5px', cursor: 'pointer' }}
                          >
                            Archivar
                          </button>
                        )}
                        <button
                          onClick={() => deleteInvitacion(inv.id)}
                          className="btn-delete"
                          style={{ flex: 1 }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL DE EDICIÓN */}
      {editingReserva && (
        <div className="edit-modal-overlay" onClick={cancelEdit}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Editar Reserva {editingReserva.tipo === 'cava' ? 'de Cava' : 'de Mesa'}</h3>
            
            <div className="edit-form">
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" name="nombre" value={editForm.nombre} onChange={handleEditFormChange} />
              </div>
              
              {editingReserva.tipo === 'mesa' && (
                <div className="form-group">
                  <label>Apellido</label>
                  <input type="text" name="apellido" value={editForm.apellido} onChange={handleEditFormChange} />
                </div>
              )}
              
              <div className="form-group">
                <label>Teléfono</label>
                <input type="tel" name="telefono" value={editForm.telefono} onChange={handleEditFormChange} />
              </div>
              
              <div className="form-group">
                <label>Cantidad de personas</label>
                <input type="number" name="cantidadPersonas" value={editForm.cantidadPersonas} onChange={handleEditFormChange} min={editingReserva.tipo === 'cava' ? 10 : 1} />
              </div>
              
              <div className="form-group">
                <label>Fecha</label>
                <input type="date" name="fecha" value={editForm.fecha} onChange={handleEditFormChange} />
              </div>
              
              <div className="form-group">
                <label>Horario</label>
                {editingReserva.tipo === 'cava' ? (
                  <select name="horario" value={editForm.horario} onChange={handleEditFormChange}>
                    <option value="">Seleccionar horario</option>
                    <option value="12:00">12:00</option>
                    <option value="12:30">12:30</option>
                    <option value="13:00">13:00</option>
                    <option value="13:30">13:30</option>
                    <option value="14:00">14:00</option>
                    <option value="18:00">18:00</option>
                    <option value="18:30">18:30</option>
                    <option value="19:00">19:00</option>
                    <option value="19:30">19:30</option>
                    <option value="20:00">20:00</option>
                    <option value="20:30">20:30</option>
                    <option value="21:00">21:00</option>
                    <option value="21:30">21:30</option>
                    <option value="22:00">22:00</option>
                  </select>
                ) : (
                  <select name="horario" value={editForm.horario} onChange={handleEditFormChange}>
                    <option value="">Seleccionar horario</option>
                    <option value="18:00">18:00</option>
                    <option value="18:30">18:30</option>
                    <option value="19:00">19:00</option>
                    <option value="19:30">19:30</option>
                    <option value="20:00">20:00</option>
                    <option value="20:30">20:30</option>
                    <option value="21:00">21:00</option>
                    <option value="21:30">21:30</option>
                    <option value="22:00">22:00</option>
                    <option value="22:30">22:30</option>
                    <option value="23:00">23:00</option>
                    <option value="23:30">23:30</option>
                    <option value="00:00">00:00</option>
                    <option value="00:30">00:30</option>
                    <option value="01:00">01:00</option>
                    <option value="01:30">01:30</option>
                    <option value="02:00">02:00</option>
                  </select>
                )}
              </div>
              
              {editingReserva.tipo === 'cava' && (
                <div className="form-group checkbox-group">
                  <label>
                    <input type="checkbox" name="traeTorta" checked={editForm.traeTorta} onChange={handleEditFormChange} />
                    ¿Trae torta?
                  </label>
                </div>
              )}
              
              {editingReserva.tipo === 'mesa' && (
                <>
                  <div className="form-group">
                    <label>Preferencia de ubicación</label>
                    <select name="preferencia" value={editForm.preferencia} onChange={handleEditFormChange}>
                      <option value="">Sin preferencia</option>
                      <option value="Adentro / Living">Adentro / Living</option>
                      <option value="Pérgola / La Galería">Pérgola / La Galería</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Restricciones alimentarias / Alergias</label>
                    <textarea name="restricciones" value={editForm.restricciones} onChange={handleEditFormChange} rows="2" />
                  </div>
                  
                  <div className="form-group">
                    <label>Comentarios</label>
                    <textarea name="comentarios" value={editForm.comentarios} onChange={handleEditFormChange} rows="2" />
                  </div>
                </>
              )}

              {editingReserva.tipo === 'cava' && (
                <div className="edit-total-preview">
                  <strong>Total: ${(editForm.cantidadPersonas * 50000).toLocaleString('es-AR')}</strong>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button onClick={saveEdit} className="btn-save-edit">
                  Guardar Cambios
                </button>
                <button onClick={cancelEdit} className="btn-cancel-edit">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <SimpleToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default AdminReservas;
