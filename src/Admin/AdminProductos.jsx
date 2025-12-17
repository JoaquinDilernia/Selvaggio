import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useToast } from '../components/Toast';
import * as XLSX from 'xlsx';
import '../Admin/AdminMaridajes.css';

function AdminProductos() {
  const toast = useToast();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [importando, setImportando] = useState(false);
  
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    categoria: 'Quesos',
    origen: '',
    descripcion: '',
    precio: '',
    orden: 0,
    visible: true
  });

  const categorias = ['Quesos', 'Fiambres', 'Panes', 'Conservas', 'Otros'];

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      setCargando(true);
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
      toast.error('Error al cargar productos');
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!nuevoProducto.nombre || !nuevoProducto.categoria) {
      toast.warning('El nombre y categoría son obligatorios');
      return;
    }

    setGuardando(true);

    try {
      const productoData = {
        ...nuevoProducto,
        precio: nuevoProducto.precio ? parseFloat(nuevoProducto.precio) : null
      };

      if (editando) {
        const productoRef = doc(db, 'selvaggio_productos', editando);
        await updateDoc(productoRef, {
          ...productoData,
          fechaModificacion: serverTimestamp()
        });
        toast.success('Producto actualizado exitosamente');
      } else {
        await addDoc(collection(db, 'selvaggio_productos'), {
          ...productoData,
          fechaCreacion: serverTimestamp()
        });
        toast.success('Producto creado exitosamente');
      }

      setNuevoProducto({
        nombre: '',
        categoria: 'Quesos',
        origen: '',
        descripcion: '',
        precio: '',
        orden: 0,
        visible: true
      });
      setEditando(null);
      cargarProductos();
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar el producto');
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = (producto) => {
    setNuevoProducto({
      nombre: producto.nombre || '',
      categoria: producto.categoria || 'Quesos',
      origen: producto.origen || '',
      descripcion: producto.descripcion || '',
      precio: producto.precio || '',
      orden: producto.orden || 0,
      visible: producto.visible !== undefined ? producto.visible : true
    });
    setEditando(producto.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      await deleteDoc(doc(db, 'selvaggio_productos', id));
      toast.success('Producto eliminado');
      cargarProductos();
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar el producto');
    }
  };

  const toggleVisibilidad = async (producto) => {
    try {
      const productoRef = doc(db, 'selvaggio_productos', producto.id);
      const nuevoEstado = !producto.visible;
      await updateDoc(productoRef, {
        visible: nuevoEstado,
        fechaModificacion: serverTimestamp()
      });
      toast.success(nuevoEstado ? 'Producto mostrado en la landing' : 'Producto oculto de la landing');
      cargarProductos();
    } catch (error) {
      console.error('Error al cambiar visibilidad:', error);
      toast.error('Error al cambiar visibilidad');
    }
  };

  const handleCancelar = () => {
    setNuevoProducto({
      nombre: '',
      categoria: 'Quesos',
      origen: '',
      descripcion: '',
      precio: '',
      orden: 0
    });
    setEditando(null);
  };

  const handleImportarExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportando(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Validar que el Excel tenga las columnas necesarias
      if (jsonData.length === 0) {
        toast.error('El archivo está vacío');
        setImportando(false);
        return;
      }

      const primeraFila = jsonData[0];
      const columnasRequeridas = ['nombre', 'categoria'];
      const tieneColumnas = columnasRequeridas.every(col => 
        Object.keys(primeraFila).some(key => key.toLowerCase() === col)
      );

      if (!tieneColumnas) {
        toast.error('El Excel debe tener al menos las columnas: nombre, categoria');
        setImportando(false);
        return;
      }

      // Usar batch para importar múltiples documentos
      const batch = writeBatch(db);
      const productosRef = collection(db, 'selvaggio_productos');
      let contador = 0;

      for (const row of jsonData) {
        // Normalizar las claves del objeto (minúsculas)
        const rowNormalizado = {};
        Object.keys(row).forEach(key => {
          rowNormalizado[key.toLowerCase()] = row[key];
        });

        if (!rowNormalizado.nombre || !rowNormalizado.categoria) {
          continue; // Saltar filas sin nombre o categoría
        }

        const productoData = {
          nombre: rowNormalizado.nombre,
          categoria: rowNormalizado.categoria,
          origen: rowNormalizado.origen || '',
          descripcion: rowNormalizado.descripcion || '',
          precio: rowNormalizado.precio ? parseFloat(rowNormalizado.precio) : null,
          orden: rowNormalizado.orden ? parseInt(rowNormalizado.orden) : 0,
          visible: rowNormalizado.visible !== undefined ? rowNormalizado.visible : true,
          fechaCreacion: serverTimestamp()
        };

        const nuevoDocRef = doc(productosRef);
        batch.set(nuevoDocRef, productoData);
        contador++;

        // Firebase batch tiene límite de 500 operaciones
        if (contador % 500 === 0) {
          await batch.commit();
        }
      }

      // Commit final
      if (contador % 500 !== 0) {
        await batch.commit();
      }

      toast.success(`${contador} productos importados exitosamente`);
      cargarProductos();
      e.target.value = ''; // Reset input
    } catch (error) {
      console.error('Error al importar:', error);
      toast.error('Error al importar productos desde Excel');
    } finally {
      setImportando(false);
    }
  };

  const productosPorCategoria = productos.reduce((acc, prod) => {
    const cat = prod.categoria || 'Otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(prod);
    return acc;
  }, {});

  return (
    <div className="admin-maridajes">
      <div className="admin-header">
        <h1>Administrar Productos</h1>
        <p>Gestiona quesos, fiambres, panes y conservas que se muestran en la landing</p>
      </div>

      {/* Sección de importación masiva */}
      <div className="form-section">
        <h2>📊 Importación Masiva desde Excel</h2>
        <div className="import-section">
          <p style={{marginBottom: '15px', color: '#ac987f'}}>
            Sube un archivo Excel (.xlsx o .xls) con las siguientes columnas:
          </p>
          <ul style={{marginBottom: '15px', marginLeft: '20px', color: '#ac987f'}}>
            <li><strong>nombre</strong> (obligatorio) - Nombre del producto</li>
            <li><strong>categoria</strong> (obligatorio) - Quesos, Fiambres, Panes, Conservas u Otros</li>
            <li><strong>origen</strong> (opcional) - País o región de origen</li>
            <li><strong>descripcion</strong> (opcional) - Descripción del producto</li>
            <li><strong>precio</strong> (opcional) - Precio por 100g</li>
            <li><strong>orden</strong> (opcional) - Orden de visualización (número)</li>
            <li><strong>visible</strong> (opcional) - true/false para mostrar u ocultar</li>
          </ul>
          <div className="import-actions">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportarExcel}
              disabled={importando}
              id="excel-import"
              style={{display: 'none'}}
            />
            <label htmlFor="excel-import" className={`btn-primary ${importando ? 'disabled' : ''}`}>
              {importando ? '⏳ Importando...' : '📁 Seleccionar Excel'}
            </label>
            {importando && <span style={{marginLeft: '10px', color: '#ac987f'}}>Procesando archivo...</span>}
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="form-section">
        <h2>{editando ? 'Editar Producto' : 'Nuevo Producto'}</h2>
        <form onSubmit={handleSubmit} className="maridaje-form">
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Nombre del Producto *</label>
              <input
                type="text"
                value={nuevoProducto.nombre}
                onChange={(e) => setNuevoProducto({...nuevoProducto, nombre: e.target.value})}
                placeholder="Ej: Parmesano Reggiano, Jamón Crudo"
                required
              />
            </div>

            <div className="form-group">
              <label>Categoría *</label>
              <select
                value={nuevoProducto.categoria}
                onChange={(e) => setNuevoProducto({...nuevoProducto, categoria: e.target.value})}
                required
              >
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Origen</label>
              <input
                type="text"
                value={nuevoProducto.origen}
                onChange={(e) => setNuevoProducto({...nuevoProducto, origen: e.target.value})}
                placeholder="Ej: Italia, Argentina, Francia"
              />
            </div>

            <div className="form-group">
              <label>Precio (por 100g)</label>
              <input
                type="number"
                value={nuevoProducto.precio}
                onChange={(e) => setNuevoProducto({...nuevoProducto, precio: e.target.value})}
                placeholder="Ej: 850"
                step="0.01"
              />
            </div>

            <div className="form-group full-width">
              <label>Descripción</label>
              <textarea
                value={nuevoProducto.descripcion}
                onChange={(e) => setNuevoProducto({...nuevoProducto, descripcion: e.target.value})}
                placeholder="Características, sabor, textura, maduración, etc."
                rows="2"
              />
            </div>

            <div className="form-group">
              <label>Orden</label>
              <input
                type="number"
                value={nuevoProducto.orden}
                onChange={(e) => setNuevoProducto({...nuevoProducto, orden: parseInt(e.target.value) || 0})}
                min="0"
              />
              <small>Orden dentro de la categoría</small>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={guardando} className="btn-primary">
              {guardando ? 'Guardando...' : (editando ? 'Actualizar' : 'Crear Producto')}
            </button>
            {editando && (
              <button type="button" onClick={handleCancelar} className="btn-secondary">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de productos */}
      <div className="lista-section">
        <h2>Productos Publicados ({productos.length})</h2>
        
        {cargando ? (
          <p>Cargando productos...</p>
        ) : productos.length === 0 ? (
          <p className="empty-state">No hay productos creados. Crea el primero!</p>
        ) : (
          <div className="vinos-por-categoria">
            {categorias.filter(cat => productosPorCategoria[cat]).map(categoria => (
              <div key={categoria} className="categoria-grupo">
                <h3 className="categoria-grupo-title">{categoria} ({productosPorCategoria[categoria].length})</h3>
                <div className="maridajes-lista">
                  {productosPorCategoria[categoria].map((producto) => (
                    <div key={producto.id} className={`maridaje-item ${producto.visible === false ? 'oculto' : ''}`}>
                      <div className="maridaje-item-header">
                        <div>
                          <h3>
                            {producto.nombre}
                            {producto.visible === false && <span className="badge-oculto">OCULTO</span>}
                          </h3>
                          {producto.precio && <span className="badge">${producto.precio}/100g</span>}
                        </div>
                        <span className="orden-badge">Orden: {producto.orden || 0}</span>
                      </div>
                      
                      <div className="maridaje-item-body">
                        {producto.origen && (
                          <p className="vino-info-admin"><strong>Origen:</strong> {producto.origen}</p>
                        )}
                        {producto.descripcion && (
                          <p className="maridaje-desc">{producto.descripcion}</p>
                        )}
                      </div>

                      <div className="maridaje-item-actions">
                        <button 
                          onClick={() => toggleVisibilidad(producto)} 
                          className={producto.visible === false ? "btn-mostrar" : "btn-ocultar"}
                          title={producto.visible === false ? "Mostrar en landing" : "Ocultar de landing"}
                        >
                          {producto.visible === false ? '👁️ Mostrar' : '🙈 Ocultar'}
                        </button>
                        <button onClick={() => handleEditar(producto)} className="btn-edit">
                          Editar
                        </button>
                        <button onClick={() => handleEliminar(producto.id)} className="btn-delete">
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

export default AdminProductos;
