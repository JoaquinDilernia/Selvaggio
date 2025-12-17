import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useToast } from '../components/Toast';
import '../Admin/AdminMaridajes.css';

function AdminPrensa() {
  const toast = useToast();
  const [notas, setNotas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null);
  
  const [nuevaNota, setNuevaNota] = useState({
    medio: '',
    titulo: '',
    url: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    imagen: '',
    orden: 0,
    visible: true
  });

  useEffect(() => {
    cargarNotas();
  }, []);

  const cargarNotas = async () => {
    try {
      setCargando(true);
      const notasRef = collection(db, 'selvaggio_prensa');
      const snapshot = await getDocs(notasRef);
      
      const notasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      notasData.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
      setNotas(notasData);
    } catch (error) {
      console.error('Error al cargar prensa:', error);
      toast.error('Error al cargar notas de prensa');
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!nuevaNota.medio || !nuevaNota.titulo) {
      toast.warning('El medio y el título son obligatorios');
      return;
    }

    setGuardando(true);

    try {
      if (editando) {
        const notaRef = doc(db, 'selvaggio_prensa', editando);
        await updateDoc(notaRef, {
          ...nuevaNota,
          fechaModificacion: serverTimestamp()
        });
        toast.success('Nota actualizada exitosamente');
      } else {
        await addDoc(collection(db, 'selvaggio_prensa'), {
          ...nuevaNota,
          fechaCreacion: serverTimestamp()
        });
        toast.success('Nota agregada exitosamente');
      }

      setNuevaNota({
        medio: '',
        titulo: '',
        url: '',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: '',
        imagen: '',
        orden: 0,
        visible: true
      });
      setEditando(null);
      cargarNotas();
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar la nota');
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = (nota) => {
    setNuevaNota({
      medio: nota.medio || '',
      titulo: nota.titulo || '',
      url: nota.url || '',
      fecha: nota.fecha || new Date().toISOString().split('T')[0],
      descripcion: nota.descripcion || '',
      imagen: nota.imagen || '',
      orden: nota.orden || 0,
      visible: nota.visible !== undefined ? nota.visible : true
    });
    setEditando(nota.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta nota?')) return;

    try {
      await deleteDoc(doc(db, 'selvaggio_prensa', id));
      toast.success('Nota eliminada');
      cargarNotas();
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar la nota');
    }
  };

  const toggleVisibilidad = async (nota) => {
    try {
      const notaRef = doc(db, 'selvaggio_prensa', nota.id);
      const nuevoEstado = !nota.visible;
      await updateDoc(notaRef, {
        visible: nuevoEstado,
        fechaModificacion: serverTimestamp()
      });
      toast.success(nuevoEstado ? 'Nota mostrada en sección prensa' : 'Nota oculta de sección prensa');
      cargarNotas();
    } catch (error) {
      console.error('Error al cambiar visibilidad:', error);
      toast.error('Error al cambiar visibilidad');
    }
  };

  const handleCancelar = () => {
    setNuevaNota({
      medio: '',
      titulo: '',
      url: '',
      fecha: new Date().toISOString().split('T')[0],
      descripcion: '',
      imagen: '',
      orden: 0,
      visible: true
    });
    setEditando(null);
  };

  return (
    <div className="admin-maridajes">
      <div className="admin-header">
        <h1>Administrar Prensa</h1>
        <p>Gestiona las apariciones en medios y menciones de prensa</p>
      </div>

      {/* Formulario */}
      <div className="form-section">
        <h2>{editando ? 'Editar Nota' : 'Nueva Nota de Prensa'}</h2>
        <form onSubmit={handleSubmit} className="maridaje-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Medio de Comunicación *</label>
              <input
                type="text"
                value={nuevaNota.medio}
                onChange={(e) => setNuevaNota({...nuevaNota, medio: e.target.value})}
                placeholder="Ej: La Nación, Clarín, Infobae"
                required
              />
            </div>

            <div className="form-group">
              <label>Fecha de Publicación</label>
              <input
                type="date"
                value={nuevaNota.fecha}
                onChange={(e) => setNuevaNota({...nuevaNota, fecha: e.target.value})}
              />
            </div>

            <div className="form-group full-width">
              <label>Título de la Nota *</label>
              <input
                type="text"
                value={nuevaNota.titulo}
                onChange={(e) => setNuevaNota({...nuevaNota, titulo: e.target.value})}
                placeholder="Ej: Los mejores wine bars de Buenos Aires"
                required
              />
            </div>

            <div className="form-group full-width">
              <label>URL del Artículo</label>
              <input
                type="url"
                value={nuevaNota.url}
                onChange={(e) => setNuevaNota({...nuevaNota, url: e.target.value})}
                placeholder="https://..."
              />
              <small>Link al artículo completo (opcional)</small>
            </div>

            <div className="form-group full-width">
              <label>Imagen (opcional)</label>
              <input
                type="url"
                value={nuevaNota.imagen}
                onChange={(e) => setNuevaNota({...nuevaNota, imagen: e.target.value})}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
              <small>URL de una imagen representativa</small>
            </div>

            <div className="form-group full-width">
              <label>Descripción / Extracto</label>
              <textarea
                value={nuevaNota.descripcion}
                onChange={(e) => setNuevaNota({...nuevaNota, descripcion: e.target.value})}
                placeholder="Resumen de la nota o cita destacada..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Orden</label>
              <input
                type="number"
                value={nuevaNota.orden}
                onChange={(e) => setNuevaNota({...nuevaNota, orden: parseInt(e.target.value) || 0})}
                min="0"
              />
              <small>Número más bajo aparece primero</small>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={guardando} className="btn-primary">
              {guardando ? 'Guardando...' : (editando ? 'Actualizar' : 'Crear Nota')}
            </button>
            {editando && (
              <button type="button" onClick={handleCancelar} className="btn-secondary">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de notas */}
      <div className="lista-section">
        <h2>Apariciones en Prensa ({notas.length})</h2>
        
        {cargando ? (
          <p>Cargando notas...</p>
        ) : notas.length === 0 ? (
          <p className="empty-state">No hay notas cargadas. ¡Agregá la primera!</p>
        ) : (
          <div className="maridajes-lista">
            {notas.map((nota) => (
              <div key={nota.id} className={`maridaje-item ${nota.visible === false ? 'oculto' : ''}`}>
                <div className="maridaje-item-header">
                  <div>
                    <h3>
                      {nota.titulo}
                      {nota.visible === false && <span className="badge-oculto">OCULTO</span>}
                    </h3>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <span className="badge">{nota.medio}</span>
                      {nota.fecha && (
                        <span style={{ fontSize: '13px', color: '#999' }}>
                          {new Date(nota.fecha).toLocaleDateString('es-AR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="orden-badge">Orden: {nota.orden || 0}</span>
                </div>
                
                <div className="maridaje-item-body">
                  {nota.descripcion && (
                    <p className="maridaje-desc">{nota.descripcion}</p>
                  )}
                  {nota.url && (
                    <p style={{ marginTop: '10px' }}>
                      <a href={nota.url} target="_blank" rel="noopener noreferrer" style={{ color: '#4a90e2', textDecoration: 'none' }}>
                        🔗 Ver artículo completo →
                      </a>
                    </p>
                  )}
                  {nota.imagen && (
                    <div style={{ marginTop: '15px' }}>
                      <img src={nota.imagen} alt={nota.titulo} style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>

                <div className="maridaje-item-actions">
                  <button 
                    onClick={() => toggleVisibilidad(nota)} 
                    className={nota.visible === false ? "btn-mostrar" : "btn-ocultar"}
                  >
                    {nota.visible === false ? '👁️ Mostrar' : '🙈 Ocultar'}
                  </button>
                  <button onClick={() => handleEditar(nota)} className="btn-edit">
                    Editar
                  </button>
                  <button onClick={() => handleEliminar(nota.id)} className="btn-delete">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPrensa;
