import { useState } from 'react';
import { collection, writeBatch, doc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useToast } from '../components/Toast';
import * as XLSX from 'xlsx';

function ImportarProductosExcel() {
  const toast = useToast();
  const [importando, setImportando] = useState(false);
  const [preview, setPreview] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const eliminarTodosLosProductos = async () => {
    if (!confirm('⚠️ ¿ELIMINAR TODOS los productos y vinos existentes? Esta acción NO se puede deshacer.')) {
      return;
    }

    setEliminando(true);
    try {
      let totalEliminados = 0;

      // Eliminar todos los vinos
      const vinosSnapshot = await getDocs(collection(db, 'selvaggio_vinos'));
      const deleteVinosPromises = vinosSnapshot.docs.map(docSnap => 
        deleteDoc(doc(db, 'selvaggio_vinos', docSnap.id))
      );
      await Promise.all(deleteVinosPromises);
      totalEliminados += vinosSnapshot.size;

      // Eliminar todos los productos
      const productosSnapshot = await getDocs(collection(db, 'selvaggio_productos'));
      const deleteProductosPromises = productosSnapshot.docs.map(docSnap => 
        deleteDoc(doc(db, 'selvaggio_productos', docSnap.id))
      );
      await Promise.all(deleteProductosPromises);
      totalEliminados += productosSnapshot.size;

      toast.success(`🗑️ ${totalEliminados} productos eliminados exitosamente`);
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar productos');
    } finally {
      setEliminando(false);
    }
  };

  const normalizarCategoria = (categoria) => {
    const mapeo = {
      'VINO': 'Vinos',
      'QUESOS': 'Quesos',
      'FIAMBRES': 'Fiambres',
      'CONSERVAS': 'Conservas',
      'PANES': 'Panes',
      'CERVEZAS': 'Bebidas',
      'AGUA': 'Bebidas',
      'GASEOSAS': 'Bebidas',
      'EN COPA': 'Vinos',
      'CAFETERIA': 'Otros'
    };
    return mapeo[categoria] || 'Otros';
  };

  const detectarCategoriaVino = (nombre) => {
    const nombreLower = nombre.toLowerCase();
    
    // Espumantes y champagnes
    if (nombreLower.includes('chandon') || nombreLower.includes('extra brut') || 
        nombreLower.includes('brut') || nombreLower.includes('espumante') || 
        nombreLower.includes('pet nat')) {
      return 'Espumantes';
    }
    
    // Rosados y rosé
    if (nombreLower.includes('rosado') || nombreLower.includes('rose') || nombreLower.includes('rosé')) {
      return 'Rosados';
    }
    
    // Blancos
    if (nombreLower.includes('blanco') || nombreLower.includes('blanc') || 
        nombreLower.includes('chardonnay') || nombreLower.includes('sauvignon blanc') ||
        nombreLower.includes('torrontes') || nombreLower.includes('viognier') ||
        nombreLower.includes('naranjo')) {
      return 'Blancos';
    }
    
    // Por defecto tintos
    return 'Tintos';
  };

  const handleLeerExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Procesar datos
      const productosParseados = [];
      jsonData.forEach((row, index) => {
        // Saltar la primera fila si es encabezado
        if (index === 0 && row.Productos === 'Categoría') return;

        const categoria = row.Productos || '';
        const nombre = row.__EMPTY || '';
        const precioStr = row.__EMPTY_1 || '';

        if (!nombre || !categoria) return;

        const producto = {
          nombre: nombre.trim(),
          categoria: normalizarCategoria(categoria.toUpperCase()),
          categoriaOriginal: categoria,
          precio: precioStr ? parseFloat(precioStr) : null,
          origen: '',
          descripcion: '',
          orden: productosParseados.length,
          visible: true
        };

        productosParseados.push(producto);
      });

      setPreview(productosParseados);
      toast.success(`${productosParseados.length} productos listos para importar`);
    } catch (error) {
      console.error('Error al leer Excel:', error);
      toast.error('Error al leer el archivo Excel');
    }
  };

  const handleImportar = async () => {
    if (!preview || preview.length === 0) {
      toast.warning('No hay productos para importar');
      return;
    }

    if (!confirm(`¿Importar ${preview.length} productos a Firebase?`)) return;

    setImportando(true);
    try {
      // Determinar qué colección usar según la categoría
      const productosVinos = preview.filter(p => p.categoria === 'Vinos');
      const productosOtros = preview.filter(p => p.categoria !== 'Vinos');

      let contador = 0;

      // Importar vinos a selvaggio_vinos
      if (productosVinos.length > 0) {
        const batch = writeBatch(db);
        const vinosRef = collection(db, 'selvaggio_vinos');

        productosVinos.forEach(producto => {
          const nuevoDocRef = doc(vinosRef);
          batch.set(nuevoDocRef, {
            nombre: producto.nombre,
            bodega: '',
            varietal: '',
            origen: '',
            precio: producto.precio,
            descripcion: '',
            orden: producto.orden,
            visible: true,
            categoria: detectarCategoriaVino(producto.nombre),
            tipo: producto.categoriaOriginal === 'EN COPA' ? 'Copa' : 'Botella'
          });
          contador++;
        });

        await batch.commit();
      }

      // Importar otros productos a selvaggio_productos
      if (productosOtros.length > 0) {
        const batch = writeBatch(db);
        const productosRef = collection(db, 'selvaggio_productos');

        productosOtros.forEach(producto => {
          const nuevoDocRef = doc(productosRef);
          batch.set(nuevoDocRef, {
            nombre: producto.nombre,
            categoria: producto.categoria,
            origen: '',
            descripcion: '',
            precio: producto.precio,
            orden: producto.orden,
            visible: true
          });
          contador++;
        });

        await batch.commit();
      }

      toast.success(`✅ ${contador} productos importados exitosamente`);
      setPreview(null);
      document.getElementById('excel-import-custom').value = '';
    } catch (error) {
      console.error('Error al importar:', error);
      toast.error('Error al importar productos');
    } finally {
      setImportando(false);
    }
  };

  const handleCancelar = () => {
    setPreview(null);
    document.getElementById('excel-import-custom').value = '';
  };

  return (
    <div className="admin-maridajes">
      <div className="admin-header">
        <h1>📊 Importar Productos desde Excel</h1>
        <p>Sube el archivo products-today.xlsx para cargar todos los productos automáticamente</p>
      </div>

      <div className="form-section">
        <h2>Seleccionar Archivo</h2>
        <div className="import-section">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleLeerExcel}
            id="excel-import-custom"
            style={{display: 'none'}}
          />
          <label htmlFor="excel-import-custom" className="btn-primary">
            📁 Seleccionar products-today.xlsx
          </label>
          
          <div style={{marginTop: '20px', padding: '15px', background: 'rgba(168, 140, 181, 0.1)', borderRadius: '8px'}}>
            <button 
              onClick={eliminarTodosLosProductos}
              disabled={eliminando}
              className="btn-delete"
              style={{width: '100%'}}
            >
              {eliminando ? '🗑️ Eliminando...' : '🗑️ Eliminar TODOS los Productos y Vinos'}
            </button>
            <small style={{display: 'block', marginTop: '8px', color: '#a88cb5'}}>
              Usa esto antes de importar para limpiar todos los datos de prueba
            </small>
          </div>
        </div>
      </div>

      {preview && (
        <>
          <div className="form-section">
            <h2>Vista Previa ({preview.length} productos)</h2>
            <div style={{marginBottom: '20px'}}>
              <p><strong>Distribución por categoría:</strong></p>
              <ul style={{marginLeft: '20px', color: '#a88cb5'}}>
                <li>Vinos: {preview.filter(p => p.categoria === 'Vinos').length}</li>
                <li>Quesos: {preview.filter(p => p.categoria === 'Quesos').length}</li>
                <li>Fiambres: {preview.filter(p => p.categoria === 'Fiambres').length}</li>
                <li>Conservas: {preview.filter(p => p.categoria === 'Conservas').length}</li>
                <li>Panes: {preview.filter(p => p.categoria === 'Panes').length}</li>
                <li>Bebidas: {preview.filter(p => p.categoria === 'Bebidas').length}</li>
                <li>Otros: {preview.filter(p => p.categoria === 'Otros').length}</li>
              </ul>
            </div>

            <div style={{maxHeight: '400px', overflowY: 'auto', border: '1px solid rgba(168, 140, 181, 0.3)', borderRadius: '8px', padding: '15px'}}>
              {preview.slice(0, 20).map((prod, idx) => (
                <div key={idx} style={{padding: '8px', borderBottom: '1px solid rgba(168, 140, 181, 0.2)', display: 'flex', justifyContent: 'space-between'}}>
                  <div>
                    <strong>{prod.nombre}</strong>
                    <span style={{marginLeft: '10px', color: '#a88cb5', fontSize: '0.9em'}}>({prod.categoria})</span>
                  </div>
                  {prod.precio && <span>${prod.precio.toLocaleString()}</span>}
                </div>
              ))}
              {preview.length > 20 && (
                <p style={{textAlign: 'center', padding: '10px', color: '#a88cb5'}}>
                  ... y {preview.length - 20} productos más
                </p>
              )}
            </div>
          </div>

          <div className="form-section">
            <div className="form-actions">
              <button 
                onClick={handleImportar} 
                disabled={importando} 
                className="btn-primary"
              >
                {importando ? '⏳ Importando...' : `✅ Importar ${preview.length} Productos`}
              </button>
              <button 
                onClick={handleCancelar} 
                disabled={importando}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ImportarProductosExcel;
