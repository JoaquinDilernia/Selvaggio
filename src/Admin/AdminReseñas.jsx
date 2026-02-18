import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useToast } from '../components/Toast';
import './AdminReseñas.css';

function AdminReseñas() {
  const toast = useToast();
  const [reseñas, setReseñas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null);
  
  const [nuevaReseña, setNuevaReseña] = useState({
    nombre: '',
    comentario: '',
    calificacion: 5,
    fecha: new Date().toISOString().split('T')[0],
    destacada: false,
    orden: 0,
    visible: true
  });

  useEffect(() => {
    cargarReseñas();
  }, []);

  const cargarReseñas = async () => {
    try {
      setCargando(true);
      const reseñasRef = collection(db, 'selvaggio_reseñas');
      const snapshot = await getDocs(reseñasRef);
      
      const reseñasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      reseñasData.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setReseñas(reseñasData);
    } catch (error) {
      console.error('Error al cargar reseñas:', error);
      toast.error('Error al cargar reseñas');
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!nuevaReseña.nombre || !nuevaReseña.comentario) {
      toast.warning('El nombre y comentario son obligatorios');
      return;
    }

    setGuardando(true);

    try {
      if (editando) {
        const reseñaRef = doc(db, 'selvaggio_reseñas', editando);
        await updateDoc(reseñaRef, {
          ...nuevaReseña,
          fechaModificacion: serverTimestamp()
        });
        toast.success('Reseña actualizada exitosamente');
      } else {
        await addDoc(collection(db, 'selvaggio_reseñas'), {
          ...nuevaReseña,
          fechaCreacion: serverTimestamp()
        });
        toast.success('Reseña agregada exitosamente');
      }

      setNuevaReseña({
        nombre: '',
        comentario: '',
        calificacion: 5,
        fecha: new Date().toISOString().split('T')[0],
        destacada: false,
        orden: 0,
        visible: true
      });
      setEditando(null);
      cargarReseñas();
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar la reseña');
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = (reseña) => {
    setNuevaReseña({
      nombre: reseña.nombre || '',
      comentario: reseña.comentario || '',
      calificacion: reseña.calificacion || 5,
      fecha: reseña.fecha || new Date().toISOString().split('T')[0],
      destacada: reseña.destacada || false,
      orden: reseña.orden || 0,
      visible: reseña.visible !== undefined ? reseña.visible : true
    });
    setEditando(reseña.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta reseña?')) return;

    try {
      await deleteDoc(doc(db, 'selvaggio_reseñas', id));
      toast.success('Reseña eliminada');
      cargarReseñas();
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar la reseña');
    }
  };

  const toggleVisibilidad = async (reseña) => {
    try {
      const reseñaRef = doc(db, 'selvaggio_reseñas', reseña.id);
      const nuevoEstado = !reseña.visible;
      await updateDoc(reseñaRef, {
        visible: nuevoEstado,
        fechaModificacion: serverTimestamp()
      });
      toast.success(nuevoEstado ? 'Reseña mostrada en landing' : 'Reseña oculta de landing');
      cargarReseñas();
    } catch (error) {
      console.error('Error al cambiar visibilidad:', error);
      toast.error('Error al cambiar visibilidad');
    }
  };

  const toggleDestacada = async (reseña) => {
    try {
      const reseñaRef = doc(db, 'selvaggio_reseñas', reseña.id);
      const nuevoEstado = !reseña.destacada;
      await updateDoc(reseñaRef, {
        destacada: nuevoEstado,
        fechaModificacion: serverTimestamp()
      });
      cargarReseñas();
    } catch (error) {
      console.error('Error al cambiar destacada:', error);
      toast.error('Error al cambiar estado destacada');
    }
  };

  const handleCancelar = () => {
    setNuevaReseña({
      nombre: '',
      comentario: '',
      calificacion: 5,
      fecha: new Date().toISOString().split('T')[0],
      destacada: false,
      orden: 0,
      visible: true
    });
    setEditando(null);
  };

  const renderEstrellas = (calificacion) => {
    return '⭐'.repeat(calificacion);
  };

  return (
    <div className="admin-resenas-container">
      <div className="admin-header">
        <h1>⭐ Administrar Reseñas</h1>
        <p>Gestiona los testimonios y opiniones de clientes</p>
      </div>

      {/* Formulario */}
      <div className="form-section">
        <h2>{editando ? 'Editar Reseña' : 'Nueva Reseña'}</h2>
        <form onSubmit={handleSubmit} className="maridaje-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre del Cliente *</label>
              <input
                type="text"
                value={nuevaReseña.nombre}
                onChange={(e) => setNuevaReseña({...nuevaReseña, nombre: e.target.value})}
                placeholder="Ej: María González"
                required
              />
            </div>

            <div className="form-group">
              <label>Calificación *</label>
              <select
                value={nuevaReseña.calificacion}
                onChange={(e) => setNuevaReseña({...nuevaReseña, calificacion: parseInt(e.target.value)})}
                required
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5 estrellas)</option>
                <option value={4}>⭐⭐⭐⭐ (4 estrellas)</option>
                <option value={3}>⭐⭐⭐ (3 estrellas)</option>
                <option value={2}>⭐⭐ (2 estrellas)</option>
                <option value={1}>⭐ (1 estrella)</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Comentario *</label>
              <textarea
                value={nuevaReseña.comentario}
                onChange={(e) => setNuevaReseña({...nuevaReseña, comentario: e.target.value})}
                placeholder="La experiencia fue increíble, los quesos..."
                rows="4"
                required
              />
            </div>

            <div className="form-group">
              <label>Fecha</label>
              <input
                type="date"
                value={nuevaReseña.fecha}
                onChange={(e) => setNuevaReseña({...nuevaReseña, fecha: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Orden</label>
              <input
                type="number"
                value={nuevaReseña.orden}
                onChange={(e) => setNuevaReseña({...nuevaReseña, orden: parseInt(e.target.value) || 0})}
                min="0"
              />
              <small>Número más bajo aparece primero</small>
            </div>

            <div className="form-group full-width">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={nuevaReseña.destacada}
                  onChange={(e) => setNuevaReseña({...nuevaReseña, destacada: e.target.checked})}
                  style={{ width: 'auto' }}
                />
                <span>Marcar como destacada (aparece en portada)</span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={guardando} className="btn-primary">
              {guardando ? 'Guardando...' : (editando ? 'Actualizar' : 'Crear Reseña')}
            </button>
            {editando && (
              <button type="button" onClick={handleCancelar} className="btn-secondary">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de reseñas */}
      <div className="lista-section">
        <h2>Reseñas Publicadas ({reseñas.length})</h2>
        
        {cargando ? (
          <p>Cargando reseñas...</p>
        ) : reseñas.length === 0 ? (
          <p className="empty-state">No hay reseñas cargadas. ¡Creá la primera!</p>
        ) : (
          <div className="maridajes-lista">
            {reseñas.map((reseña) => (
              <div key={reseña.id} className={`maridaje-item ${reseña.visible === false ? 'oculto' : ''}`}>
                <div className="maridaje-item-header">
                  <div>
                    <h3>
                      {reseña.nombre}
                      {reseña.visible === false && <span className="badge-oculto">OCULTO</span>}
                      {reseña.destacada && <span className="badge" style={{background: '#f39c12'}}>⭐ DESTACADA</span>}
                    </h3>
                    <div style={{ fontSize: '18px', marginTop: '5px' }}>
                      {renderEstrellas(reseña.calificacion)}
                    </div>
                  </div>
                  <span className="orden-badge">Orden: {reseña.orden || 0}</span>
                </div>
                
                <div className="maridaje-item-body">
                  <p className="maridaje-desc">"{reseña.comentario}"</p>
                  {reseña.fecha && (
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                      Fecha: {new Date(reseña.fecha).toLocaleDateString('es-AR')}
                    </p>
                  )}
                </div>

                <div className="maridaje-item-actions">
                  <button 
                    onClick={() => toggleDestacada(reseña)} 
                    className={reseña.destacada ? "btn-edit" : "btn-secondary"}
                    style={{ fontSize: '13px' }}
                  >
                    {reseña.destacada ? '⭐ Destacada' : 'Destacar'}
                  </button>
                  <button 
                    onClick={() => toggleVisibilidad(reseña)} 
                    className={reseña.visible === false ? "btn-mostrar" : "btn-ocultar"}
                  >
                    {reseña.visible === false ? '👁️ Mostrar' : '🙈 Ocultar'}
                  </button>
                  <button onClick={() => handleEditar(reseña)} className="btn-edit">
                    Editar
                  </button>
                  <button onClick={() => handleEliminar(reseña.id)} className="btn-delete">
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

export default AdminReseñas;
