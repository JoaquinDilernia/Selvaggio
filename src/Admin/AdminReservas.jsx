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

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchReservasCava(),
        fetchReservasMesas(),
        fetchInvitaciones()
      ]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReservasCava = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'selvaggio_reservas_cava'));
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordenamiento en el cliente
      data = data.sort((a, b) => {
        if (!a.fecha || !b.fecha) return 0;
        const fechaA = new Date(a.fecha + 'T00:00:00');
        const fechaB = new Date(b.fecha + 'T00:00:00');
        return fechaA - fechaB;
      });
      
      setReservasCava(data);
    } catch (error) {
      console.error('Error al cargar reservas de cava:', error);
      setReservasCava([]); // Asegurar que siempre se establece un valor
    }
  };

  const fetchReservasMesas = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'selvaggio_reservas_mesas'));
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordenamiento en el cliente
      data = data.sort((a, b) => {
        if (!a.fecha || !b.fecha) return 0;
        const fechaA = new Date(a.fecha + 'T00:00:00');
        const fechaB = new Date(b.fecha + 'T00:00:00');
        return fechaA - fechaB;
      });
      
      setReservasMesas(data);
    } catch (error) {
      console.error('Error al cargar reservas de mesas:', error);
      setReservasMesas([]); // Asegurar que siempre se establece un valor
    }
  };

  const fetchInvitaciones = async () => {
    try {
      // Intentar primero sin orderBy para evitar problemas de índices
      const snapshot = await getDocs(collection(db, 'selvaggio_invitaciones'));
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordenamiento en el cliente
      data = data.sort((a, b) => {
        if (!a.dia || !b.dia) return 0;
        const fechaA = new Date(a.dia + 'T00:00:00');
        const fechaB = new Date(b.dia + 'T00:00:00');
        return fechaA - fechaB;
      });
      
      setInvitaciones(data);
    } catch (error) {
      console.error('Error al cargar invitaciones:', error);
      setInvitaciones([]); // Asegurar que siempre se establece un valor
    }
  };

  const archivarReservaCava = async (id) => {
    try {
      await updateDoc(doc(db, 'selvaggio_reservas_cava', id), {
        archivada: true
      });
      setToast({ message: 'Reserva archivada', type: 'success' });
      fetchReservasCava();
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al archivar', type: 'error' });
    }
  };

  const deleteReservaCava = async (id) => {
    if (!confirm('¿Eliminar esta reserva de cava?')) return;
    
    try {
      await deleteDoc(doc(db, 'selvaggio_reservas_cava', id));
      setToast({ message: 'Reserva de cava eliminada exitosamente', type: 'success' });
      fetchReservasCava();
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al eliminar', type: 'error' });
    }
  };

  const archivarReservaMesa = async (id) => {
    try {
      await updateDoc(doc(db, 'selvaggio_reservas_mesas', id), {
        archivada: true
      });
      setToast({ message: 'Reserva archivada', type: 'success' });
      fetchReservasMesas();
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al archivar', type: 'error' });
    }
  };

  const deleteReservaMesa = async (id) => {
    if (!confirm('¿Eliminar esta reserva de mesa?')) return;
    
    try {
      await deleteDoc(doc(db, 'selvaggio_reservas_mesas', id));
      setToast({ message: 'Reserva de mesa eliminada exitosamente', type: 'success' });
      fetchReservasMesas();
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al eliminar', type: 'error' });
    }
  };

  const updateEstadoMesa = async (id, nuevoEstado) => {
    try {
      await updateDoc(doc(db, 'selvaggio_reservas_mesas', id), {
        estado: nuevoEstado
      });
      setToast({ message: 'Estado actualizado exitosamente', type: 'success' });
      fetchReservasMesas();
    } catch (error) {
      console.error('Error:', error);
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

  const archivarInvitacion = async (id) => {
    try {
      await updateDoc(doc(db, 'selvaggio_invitaciones', id), {
        archivada: true
      });
      setToast({ message: 'Invitación archivada', type: 'success' });
      fetchInvitaciones();
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al archivar', type: 'error' });
    }
  };

  const deleteInvitacion = async (id) => {
    if (!confirm('¿Eliminar esta invitación?')) return;
    
    try {
      await deleteDoc(doc(db, 'selvaggio_invitaciones', id));
      setToast({ message: 'Invitación eliminada exitosamente', type: 'success' });
      fetchInvitaciones();
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Error al eliminar', type: 'error' });
    }
  };

  return (
    <div className="admin-reservas-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Gestión de Reservas</h2>
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
                    <div key={reserva.id} className="reserva-card cava-card">
                      <div className="reserva-header">
                        <h3>{reserva.nombre}</h3>
                        <span className="badge confirmada">{reserva.archivada ? 'Archivada' : 'Confirmada'}</span>
                      </div>
                      
                      <div className="reserva-details">
                        <p><strong>📅 Fecha:</strong> {new Date(reserva.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</p>
                        <p><strong>�️ Creada:</strong> {new Date(reserva.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        <p><strong>�📞 Teléfono:</strong> {reserva.telefono}</p>
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

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        {!reserva.archivada && (
                          <button
                            onClick={() => archivarReservaCava(reserva.id)}
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
                        <h3>{reserva.nombre}</h3>
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
                        {reserva.comentarios && (
                          <p><strong>💬 Comentarios:</strong> {reserva.comentarios}</p>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        {!reserva.archivada && (
                          <button
                            onClick={() => archivarReservaMesa(reserva.id)}
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

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        {!inv.archivada && (
                          <button
                            onClick={() => archivarInvitacion(inv.id)}
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
