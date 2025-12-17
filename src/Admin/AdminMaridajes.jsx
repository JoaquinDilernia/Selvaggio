import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, where, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useToast } from '../components/Toast';
import './AdminMaridajes.css';

function AdminMaridajes() {
  const toast = useToast();
  const [maridajes, setMaridajes] = useState([]);
  const [vinos, setVinos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null);
  
  // Campos para selección o manual
  const [modoProducto, setModoProducto] = useState('seleccionar'); // 'seleccionar' o 'manual'
  const [modoVino, setModoVino] = useState('seleccionar'); // 'seleccionar' o 'manual'
  
  const [nuevoMaridaje, setNuevoMaridaje] = useState({
    producto: '',
    tipo: 'Queso',
    vino: '',
    varietal: '',
    descripcion: '',
    orden: 0
  });

  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    await Promise.all([
      cargarMaridajes(),
      cargarVinos(),
      cargarProductos()
    ]);
  };

  const cargarVinos = async () => {
    try {
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
    }
  };

  const cargarProductos = async () => {
    try {
      const productosRef = collection(db, 'selvaggio_productos');
      const snapshot = await getDocs(productosRef);
      const productosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      productosData.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setProductos(productosData);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const cargarMaridajes = async () => {
    try {
      setCargando(true);
      const maridajesRef = collection(db, 'selvaggio_maridajes');
      const snapshot = await getDocs(maridajesRef);
      
      const maridajesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      maridajesData.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setMaridajes(maridajesData);
    } catch (error) {
      console.error('Error al cargar maridajes:', error);
      toast.error('Error al cargar maridajes');
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!nuevoMaridaje.producto || !nuevoMaridaje.vino) {
      toast.warning('El producto y el vino son obligatorios');
      return;
    }

    setGuardando(true);

    try {
      if (editando) {
        // Actualizar existente
        const maridajeRef = doc(db, 'selvaggio_maridajes', editando);
        await updateDoc(maridajeRef, {
          ...nuevoMaridaje,
          fechaModificacion: serverTimestamp()
        });
        toast.success('Maridaje actualizado exitosamente');
      } else {
        // Crear nuevo
        await addDoc(collection(db, 'selvaggio_maridajes'), {
          ...nuevoMaridaje,
          fechaCreacion: serverTimestamp()
        });
        toast.success('Maridaje creado exitosamente');
      }

      // Reset form
      setNuevoMaridaje({
        producto: '',
        tipo: 'Queso',
        vino: '',
        varietal: '',
        descripcion: '',
        orden: 0
      });
      setEditando(null);
      cargarMaridajes();
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar el maridaje');
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = (maridaje) => {
    setNuevoMaridaje({
      producto: maridaje.producto || '',
      tipo: maridaje.tipo || 'Queso',
      vino: maridaje.vino || '',
      varietal: maridaje.varietal || '',
      descripcion: maridaje.descripcion || '',
      orden: maridaje.orden || 0
    });
    setEditando(maridaje.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este maridaje?')) return;

    try {
      await deleteDoc(doc(db, 'selvaggio_maridajes', id));
      toast.success('Maridaje eliminado');
      cargarMaridajes();
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar el maridaje');
    }
  };

  const handleCancelar = () => {
    setNuevoMaridaje({
      producto: '',
      tipo: 'Queso',
      vino: '',
      varietal: '',
      descripcion: '',
      orden: 0
    });
    setEditando(null);
    setModoProducto('seleccionar');
    setModoVino('seleccionar');
  };

  const handleProductoChange = (e) => {
    const valor = e.target.value;
    if (valor === 'OTRO') {
      setModoProducto('manual');
      setNuevoMaridaje({...nuevoMaridaje, producto: '', tipo: 'Queso'});
    } else {
      const productoSeleccionado = productos.find(p => p.id === valor);
      if (productoSeleccionado) {
        setNuevoMaridaje({
          ...nuevoMaridaje, 
          producto: productoSeleccionado.nombre,
          tipo: productoSeleccionado.categoria || 'Queso'
        });
      }
    }
  };

  const handleVinoChange = (e) => {
    const valor = e.target.value;
    if (valor === 'OTRO') {
      setModoVino('manual');
      setNuevoMaridaje({...nuevoMaridaje, vino: '', varietal: ''});
    } else {
      const vinoSeleccionado = vinos.find(v => v.id === valor);
      if (vinoSeleccionado) {
        setNuevoMaridaje({
          ...nuevoMaridaje, 
          vino: vinoSeleccionado.nombre,
          varietal: vinoSeleccionado.varietal || vinoSeleccionado.bodega || ''
        });
      }
    }
  };

  return (
    <div className="admin-maridajes">
      <div className="admin-header">
        <h1>Administrar Maridajes</h1>
        <p>Gestiona las combinaciones de quesos/fiambres con vinos que se muestran en la landing</p>
      </div>

      {/* Formulario */}
      <div className="form-section">
        <h2>{editando ? 'Editar Maridaje' : 'Nuevo Maridaje'}</h2>
        <form onSubmit={handleSubmit} className="maridaje-form">
          <div className="form-grid">
            {/* Selector de Producto */}
            <div className="form-group">
              <label>Producto (Queso/Fiambre) *</label>
              {modoProducto === 'seleccionar' ? (
                <div className="selector-con-switch">
                  <select onChange={handleProductoChange} value="">
                    <option value="">Selecciona un producto...</option>
                    {productos.filter(p => ['Quesos', 'Fiambres'].includes(p.categoria)).map(producto => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre} ({producto.categoria})
                      </option>
                    ))}
                    <option value="OTRO">--- Ingresar otro ---</option>
                  </select>
                  {nuevoMaridaje.producto && (
                    <div className="valor-seleccionado">
                      ✓ {nuevoMaridaje.producto}
                    </div>
                  )}
                </div>
              ) : (
                <div className="manual-input-group">
                  <input
                    type="text"
                    value={nuevoMaridaje.producto}
                    onChange={(e) => setNuevoMaridaje({...nuevoMaridaje, producto: e.target.value})}
                    placeholder="Ej: Roquefort, Jamón Crudo, etc."
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      setModoProducto('seleccionar');
                      setNuevoMaridaje({...nuevoMaridaje, producto: ''});
                    }}
                    className="btn-volver-selector"
                  >
                    ← Volver a selector
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Tipo *</label>
              <select
                value={nuevoMaridaje.tipo}
                onChange={(e) => setNuevoMaridaje({...nuevoMaridaje, tipo: e.target.value})}
                required
              >
                <option value="Queso">Queso</option>
                <option value="Fiambre">Fiambre</option>
                <option value="Pan">Pan</option>
                <option value="Conserva">Conserva</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Selector de Vino */}
            <div className="form-group">
              <label>Vino Recomendado *</label>
              {modoVino === 'seleccionar' ? (
                <div className="selector-con-switch">
                  <select onChange={handleVinoChange} value="">
                    <option value="">Selecciona un vino...</option>
                    {vinos.map(vino => (
                      <option key={vino.id} value={vino.id}>
                        {vino.nombre} - {vino.varietal || vino.bodega}
                      </option>
                    ))}
                    <option value="OTRO">--- Ingresar otro ---</option>
                  </select>
                  {nuevoMaridaje.vino && (
                    <div className="valor-seleccionado">
                      ✓ {nuevoMaridaje.vino}
                    </div>
                  )}
                </div>
              ) : (
                <div className="manual-input-group">
                  <input
                    type="text"
                    value={nuevoMaridaje.vino}
                    onChange={(e) => setNuevoMaridaje({...nuevoMaridaje, vino: e.target.value})}
                    placeholder="Ej: Malbec Reserva, Chardonnay, etc."
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      setModoVino('seleccionar');
                      setNuevoMaridaje({...nuevoMaridaje, vino: '', varietal: ''});
                    }}
                    className="btn-volver-selector"
                  >
                    ← Volver a selector
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Varietal / Bodega</label>
              <input
                type="text"
                value={nuevoMaridaje.varietal}
                onChange={(e) => setNuevoMaridaje({...nuevoMaridaje, varietal: e.target.value})}
                placeholder="Ej: Malbec, Bodega XYZ"
              />
            </div>

            <div className="form-group full-width">
              <label>Descripción (opcional)</label>
              <textarea
                value={nuevoMaridaje.descripcion}
                onChange={(e) => setNuevoMaridaje({...nuevoMaridaje, descripcion: e.target.value})}
                placeholder="Por qué funciona este maridaje, notas de sabor, etc."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Orden</label>
              <input
                type="number"
                value={nuevoMaridaje.orden}
                onChange={(e) => setNuevoMaridaje({...nuevoMaridaje, orden: parseInt(e.target.value) || 0})}
                min="0"
              />
              <small>Número más bajo aparece primero</small>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={guardando} className="btn-primary">
              {guardando ? 'Guardando...' : (editando ? 'Actualizar' : 'Crear Maridaje')}
            </button>
            {editando && (
              <button type="button" onClick={handleCancelar} className="btn-secondary">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de maridajes */}
      <div className="lista-section">
        <h2>Maridajes Publicados ({maridajes.length})</h2>
        
        {cargando ? (
          <p>Cargando maridajes...</p>
        ) : maridajes.length === 0 ? (
          <p className="empty-state">No hay maridajes creados. Crea el primero!</p>
        ) : (
          <div className="maridajes-lista">
            {maridajes.map((maridaje) => (
              <div key={maridaje.id} className="maridaje-item">
                <div className="maridaje-item-header">
                  <div>
                    <h3>{maridaje.producto}</h3>
                    <span className="badge">{maridaje.tipo}</span>
                  </div>
                  <span className="orden-badge">Orden: {maridaje.orden || 0}</span>
                </div>
                
                <div className="maridaje-item-body">
                  <div className="maridaje-vino">
                    <strong>🍷 {maridaje.vino}</strong>
                    {maridaje.varietal && <span className="varietal-badge">{maridaje.varietal}</span>}
                  </div>
                  
                  {maridaje.descripcion && (
                    <p className="maridaje-desc">{maridaje.descripcion}</p>
                  )}
                </div>

                <div className="maridaje-item-actions">
                  <button onClick={() => handleEditar(maridaje)} className="btn-edit">
                    Editar
                  </button>
                  <button onClick={() => handleEliminar(maridaje.id)} className="btn-delete">
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

export default AdminMaridajes;
