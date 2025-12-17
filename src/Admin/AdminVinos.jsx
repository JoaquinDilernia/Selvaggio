import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useToast } from '../components/Toast';
import '../Admin/AdminMaridajes.css';

function AdminVinos() {
  const toast = useToast();
  const [vinos, setVinos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null);
  
  const [nuevoVino, setNuevoVino] = useState({
    nombre: '',
    categoria: 'Tintos',
    bodega: '',
    varietal: '',
    descripcion: '',
    precio: '',
    orden: 0,
    visible: true
  });

  const categorias = ['Tintos', 'Blancos', 'Rosados', 'Espumantes', 'Otros'];

  useEffect(() => {
    cargarVinos();
  }, []);

  const cargarVinos = async () => {
    try {
      setCargando(true);
      const vinosRef = collection(db, 'selvaggio_vinos');
      const snapshot = await getDocs(vinosRef);
      
      const vinosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      vinosData.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setVinos(vinosData);
    } catch (error) {
      console.error('Error al cargar vinos:', error);
      toast.error('Error al cargar vinos');
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!nuevoVino.nombre || !nuevoVino.categoria) {
      toast.warning('El nombre y categoría son obligatorios');
      return;
    }

    setGuardando(true);

    try {
      const vinoData = {
        ...nuevoVino,
        precio: nuevoVino.precio ? parseFloat(nuevoVino.precio) : null
      };

      if (editando) {
        const vinoRef = doc(db, 'selvaggio_vinos', editando);
        await updateDoc(vinoRef, {
          ...vinoData,
          fechaModificacion: serverTimestamp()
        });
        toast.success('Vino actualizado exitosamente');
      } else {
        await addDoc(collection(db, 'selvaggio_vinos'), {
          ...vinoData,
          fechaCreacion: serverTimestamp()
        });
        toast.success('Vino creado exitosamente');
      }

      setNuevoVino({
        nombre: '',
        categoria: 'Tintos',
        bodega: '',
        varietal: '',
        descripcion: '',
        precio: '',
        orden: 0,
        visible: true
      });
      setEditando(null);
      cargarVinos();
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar el vino');
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = (vino) => {
    setNuevoVino({
      nombre: vino.nombre || '',
      categoria: vino.categoria || 'Tintos',
      bodega: vino.bodega || '',
      varietal: vino.varietal || '',
      descripcion: vino.descripcion || '',
      precio: vino.precio || '',
      orden: vino.orden || 0,
      visible: vino.visible !== undefined ? vino.visible : true
    });
    setEditando(vino.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este vino?')) return;

    try {
      await deleteDoc(doc(db, 'selvaggio_vinos', id));
      toast.success('Vino eliminado');
      cargarVinos();
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar el vino');
    }
  };

  const toggleVisibilidad = async (vino) => {
    try {
      const vinoRef = doc(db, 'selvaggio_vinos', vino.id);
      const nuevoEstado = !vino.visible;
      await updateDoc(vinoRef, {
        visible: nuevoEstado,
        fechaModificacion: serverTimestamp()
      });
      toast.success(nuevoEstado ? 'Vino mostrado en la landing' : 'Vino oculto de la landing');
      cargarVinos();
    } catch (error) {
      console.error('Error al cambiar visibilidad:', error);
      toast.error('Error al cambiar visibilidad');
    }
  };

  const handleCancelar = () => {
    setNuevoVino({
      nombre: '',
      categoria: 'Tintos',
      bodega: '',
      varietal: '',
      descripcion: '',
      precio: '',
      orden: 0
    });
    setEditando(null);
  };

  const vinosPorCategoria = vinos.reduce((acc, vino) => {
    const cat = vino.categoria || 'Otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(vino);
    return acc;
  }, {});

  return (
    <div className="admin-maridajes">
      <div className="admin-header">
        <h1>Administrar Vinos</h1>
        <p>Gestiona la carta de vinos que se muestra en la landing</p>
      </div>

      {/* Formulario */}
      <div className="form-section">
        <h2>{editando ? 'Editar Vino' : 'Nuevo Vino'}</h2>
        <form onSubmit={handleSubmit} className="maridaje-form">
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Nombre del Vino *</label>
              <input
                type="text"
                value={nuevoVino.nombre}
                onChange={(e) => setNuevoVino({...nuevoVino, nombre: e.target.value})}
                placeholder="Ej: Catena Zapata Malbec Argentino"
                required
              />
            </div>

            <div className="form-group">
              <label>Categoría *</label>
              <select
                value={nuevoVino.categoria}
                onChange={(e) => setNuevoVino({...nuevoVino, categoria: e.target.value})}
                required
              >
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Bodega</label>
              <input
                type="text"
                value={nuevoVino.bodega}
                onChange={(e) => setNuevoVino({...nuevoVino, bodega: e.target.value})}
                placeholder="Ej: Catena Zapata"
              />
            </div>

            <div className="form-group">
              <label>Varietal</label>
              <input
                type="text"
                value={nuevoVino.varietal}
                onChange={(e) => setNuevoVino({...nuevoVino, varietal: e.target.value})}
                placeholder="Ej: Malbec, Cabernet Sauvignon"
              />
            </div>

            <div className="form-group">
              <label>Precio</label>
              <input
                type="number"
                value={nuevoVino.precio}
                onChange={(e) => setNuevoVino({...nuevoVino, precio: e.target.value})}
                placeholder="Ej: 12500"
                step="0.01"
              />
            </div>

            <div className="form-group full-width">
              <label>Descripción</label>
              <textarea
                value={nuevoVino.descripcion}
                onChange={(e) => setNuevoVino({...nuevoVino, descripcion: e.target.value})}
                placeholder="Valle de Uco, Mendoza • Robusto y elegante con notas de frutos rojos"
                rows="2"
              />
            </div>

            <div className="form-group">
              <label>Orden</label>
              <input
                type="number"
                value={nuevoVino.orden}
                onChange={(e) => setNuevoVino({...nuevoVino, orden: parseInt(e.target.value) || 0})}
                min="0"
              />
              <small>Orden dentro de la categoría</small>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={guardando} className="btn-primary">
              {guardando ? 'Guardando...' : (editando ? 'Actualizar' : 'Crear Vino')}
            </button>
            {editando && (
              <button type="button" onClick={handleCancelar} className="btn-secondary">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de vinos */}
      <div className="lista-section">
        <h2>Vinos Publicados ({vinos.length})</h2>
        
        {cargando ? (
          <p>Cargando vinos...</p>
        ) : vinos.length === 0 ? (
          <p className="empty-state">No hay vinos creados. Crea el primero!</p>
        ) : (
          <div className="vinos-por-categoria">
            {categorias.filter(cat => vinosPorCategoria[cat]).map(categoria => (
              <div key={categoria} className="categoria-grupo">
                <h3 className="categoria-grupo-title">{categoria} ({vinosPorCategoria[categoria].length})</h3>
                <div className="maridajes-lista">
                  {vinosPorCategoria[categoria].map((vino) => (
                    <div key={vino.id} className={`maridaje-item ${vino.visible === false ? 'oculto' : ''}`}>
                      <div className="maridaje-item-header">
                        <div>
                          <h3>
                            {vino.nombre}
                            {vino.visible === false && <span className="badge-oculto">OCULTO</span>}
                          </h3>
                          {vino.precio && <span className="badge">${vino.precio}</span>}
                        </div>
                        <span className="orden-badge">Orden: {vino.orden || 0}</span>
                      </div>
                      
                      <div className="maridaje-item-body">
                        {vino.bodega && (
                          <p className="vino-info-admin"><strong>Bodega:</strong> {vino.bodega}</p>
                        )}
                        {vino.varietal && (
                          <p className="vino-info-admin"><strong>Varietal:</strong> {vino.varietal}</p>
                        )}
                        {vino.descripcion && (
                          <p className="maridaje-desc">{vino.descripcion}</p>
                        )}
                      </div>

                      <div className="maridaje-item-actions">
                        <button 
                          onClick={() => toggleVisibilidad(vino)} 
                          className={vino.visible === false ? "btn-mostrar" : "btn-ocultar"}
                          title={vino.visible === false ? "Mostrar en landing" : "Ocultar de landing"}
                        >
                          {vino.visible === false ? '👁️ Mostrar' : '🙈 Ocultar'}
                        </button>
                        <button onClick={() => handleEditar(vino)} className="btn-edit">
                          Editar
                        </button>
                        <button onClick={() => handleEliminar(vino.id)} className="btn-delete">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminVinos;
