import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useToast } from '../../components/Toast';
import './TabsShared.css';

function PostulacionesTab() {
  const [postulaciones, setPostulaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todas'); // todas, pendiente, revisada, contactada
  const toast = useToast();

  useEffect(() => {
    cargarPostulaciones();
  }, []);

  const cargarPostulaciones = async () => {
    try {
      const q = query(collection(db, 'selvaggio_postulaciones'), orderBy('fecha', 'desc'));
      const snapshot = await getDocs(q);
      
      const postulacionesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPostulaciones(postulacionesData);
    } catch (error) {
      console.error('Error al cargar postulaciones:', error);
      toast.error('Error al cargar las postulaciones');
    } finally {
      setCargando(false);
    }
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      const postulacionRef = doc(db, 'selvaggio_postulaciones', id);
      await updateDoc(postulacionRef, { estado: nuevoEstado });
      
      setPostulaciones(prev => prev.map(p => 
        p.id === id ? { ...p, estado: nuevoEstado } : p
      ));
      
      toast.success('Estado actualizado');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const eliminarPostulacion = async (id) => {
    if (!confirm('¿Eliminar esta postulación?')) return;

    try {
      await deleteDoc(doc(db, 'selvaggio_postulaciones', id));
      setPostulaciones(prev => prev.filter(p => p.id !== id));
      toast.success('Postulación eliminada');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar');
    }
  };

  const exportarCSV = () => {
    const headers = ['Fecha', 'Nombre', 'Email', 'Teléfono', 'Puesto', 'Mensaje', 'Estado'];
    const rows = postulacionesFiltradas.map(p => [
      p.fecha?.toDate().toLocaleString('es-AR'),
      p.nombre,
      p.email,
      p.telefono || '-',
      p.puesto,
      p.mensaje || '-',
      p.estado || 'pendiente'
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `postulaciones-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV exportado');
  };

  const postulacionesFiltradas = filtro === 'todas' 
    ? postulaciones 
    : postulaciones.filter(p => p.estado === filtro);

  const estadisticas = {
    total: postulaciones.length,
    pendientes: postulaciones.filter(p => p.estado === 'pendiente').length,
    revisadas: postulaciones.filter(p => p.estado === 'revisada').length,
    contactadas: postulaciones.filter(p => p.estado === 'contactada').length
  };

  if (cargando) {
    return <div className="tab-loading">Cargando postulaciones...</div>;
  }

  return (
    <div className="tab-content-inner">
      <div className="tab-header">
        <div>
          <h2>Postulaciones de Trabajo</h2>
          <p>Gestiona las postulaciones recibidas</p>
        </div>
        <button onClick={exportarCSV} className="btn-export">
          📊 Exportar CSV
        </button>
      </div>

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{estadisticas.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{estadisticas.pendientes}</div>
          <div className="stat-label">Pendientes</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{estadisticas.revisadas}</div>
          <div className="stat-label">Revisadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{estadisticas.contactadas}</div>
          <div className="stat-label">Contactadas</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <button 
          className={`filter-btn ${filtro === 'todas' ? 'active' : ''}`}
          onClick={() => setFiltro('todas')}
        >
          Todas ({postulaciones.length})
        </button>
        <button 
          className={`filter-btn ${filtro === 'pendiente' ? 'active' : ''}`}
          onClick={() => setFiltro('pendiente')}
        >
          Pendientes ({estadisticas.pendientes})
        </button>
        <button 
          className={`filter-btn ${filtro === 'revisada' ? 'active' : ''}`}
          onClick={() => setFiltro('revisada')}
        >
          Revisadas ({estadisticas.revisadas})
        </button>
        <button 
          className={`filter-btn ${filtro === 'contactada' ? 'active' : ''}`}
          onClick={() => setFiltro('contactada')}
        >
          Contactadas ({estadisticas.contactadas})
        </button>
      </div>

      {/* Lista de postulaciones */}
      <div className="postulaciones-lista">
        {postulacionesFiltradas.length === 0 ? (
          <div className="empty-state">
            <p>No hay postulaciones {filtro !== 'todas' ? `en estado "${filtro}"` : ''}</p>
          </div>
        ) : (
          postulacionesFiltradas.map(postulacion => (
            <div key={postulacion.id} className="postulacion-card">
              <div className="postulacion-header">
                <div>
                  <h3>{postulacion.nombre}</h3>
                  <span className="postulacion-puesto">{postulacion.puesto}</span>
                </div>
                <span className={`estado-badge ${postulacion.estado || 'pendiente'}`}>
                  {postulacion.estado || 'pendiente'}
                </span>
              </div>

              <div className="postulacion-info">
                <div className="info-item">
                  <strong>Email:</strong> 
                  <a href={`mailto:${postulacion.email}`}>{postulacion.email}</a>
                </div>
                {postulacion.telefono && (
                  <div className="info-item">
                    <strong>Teléfono:</strong> 
                    <a href={`https://wa.me/${postulacion.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                      {postulacion.telefono}
                    </a>
                  </div>
                )}
                <div className="info-item">
                  <strong>Fecha:</strong> {postulacion.fecha?.toDate().toLocaleString('es-AR')}
                </div>
              </div>

              {postulacion.mensaje && (
                <div className="postulacion-mensaje">
                  <strong>Mensaje:</strong>
                  <p>{postulacion.mensaje}</p>
                </div>
              )}

              <div className="postulacion-acciones">
                <select 
                  value={postulacion.estado || 'pendiente'}
                  onChange={(e) => cambiarEstado(postulacion.id, e.target.value)}
                  className="estado-select"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="revisada">Revisada</option>
                  <option value="contactada">Contactada</option>
                  <option value="descartada">Descartada</option>
                </select>
                <button 
                  onClick={() => eliminarPostulacion(postulacion.id)}
                  className="btn-delete"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PostulacionesTab;
