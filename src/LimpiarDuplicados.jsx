import { useState } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase/config';

function LimpiarDuplicados() {
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState('');
  const [resultados, setResultados] = useState(null);

  const limpiarColeccion = async (nombreColeccion, campoNombre = 'nombre') => {
    const coleccionRef = collection(db, nombreColeccion);
    const snapshot = await getDocs(coleccionRef);
    
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Agrupar por nombre
    const grupos = {};
    items.forEach(item => {
      const nombre = item[campoNombre];
      if (!grupos[nombre]) {
        grupos[nombre] = [];
      }
      grupos[nombre].push(item);
    });

    // Encontrar duplicados
    let eliminados = 0;
    for (const nombre in grupos) {
      const duplicados = grupos[nombre];
      if (duplicados.length > 1) {
        // Ordenar por fecha de creación (el más antiguo primero)
        duplicados.sort((a, b) => {
          const fechaA = a.fechaCreacion?.toDate?.() || new Date(0);
          const fechaB = b.fechaCreacion?.toDate?.() || new Date(0);
          return fechaA - fechaB;
        });

        // Eliminar todos excepto el primero
        for (let i = 1; i < duplicados.length; i++) {
          await deleteDoc(doc(db, nombreColeccion, duplicados[i].id));
          eliminados++;
        }
      }
    }

    return {
      total: items.length,
      unicos: Object.keys(grupos).length,
      eliminados
    };
  };

  const limpiarTodo = async () => {
    setCargando(true);
    setProgreso('');
    setResultados(null);

    try {
      const stats = {};

      // Limpiar vinos
      setProgreso('🍷 Limpiando vinos duplicados...');
      stats.vinos = await limpiarColeccion('selvaggio_vinos', 'nombre');
      await new Promise(r => setTimeout(r, 500));

      // Limpiar productos
      setProgreso('🧀 Limpiando productos duplicados...');
      stats.productos = await limpiarColeccion('selvaggio_productos', 'nombre');
      await new Promise(r => setTimeout(r, 500));

      // Limpiar maridajes
      setProgreso('✨ Limpiando maridajes duplicados...');
      stats.maridajes = await limpiarColeccion('selvaggio_maridajes', 'producto');
      await new Promise(r => setTimeout(r, 500));

      // Limpiar galería
      setProgreso('📸 Limpiando galería duplicada...');
      stats.galeria = await limpiarColeccion('selvaggio_galeria', 'titulo');
      await new Promise(r => setTimeout(r, 500));

      // Limpiar reseñas
      setProgreso('⭐ Limpiando reseñas duplicadas...');
      stats.reseñas = await limpiarColeccion('selvaggio_reseñas', 'nombre');
      await new Promise(r => setTimeout(r, 500));

      // Limpiar prensa
      setProgreso('📰 Limpiando prensa duplicada...');
      stats.prensa = await limpiarColeccion('selvaggio_prensa', 'titulo');

      setResultados(stats);
      setProgreso('✅ Limpieza completada!');
    } catch (error) {
      console.error('Error:', error);
      setProgreso(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{
      maxWidth: '700px',
      margin: '50px auto',
      padding: '30px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      fontFamily: 'system-ui'
    }}>
      <h1 style={{ color: '#e74c3c', marginBottom: '20px' }}>
        🧹 Limpiar Duplicados
      </h1>
      
      <div style={{ marginBottom: '25px', color: '#666', lineHeight: '1.6', background: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffc107' }}>
        <p style={{ margin: 0 }}><strong>⚠️ Atención:</strong></p>
        <p style={{ margin: '8px 0 0' }}>
          Esta herramienta elimina items duplicados (mismo nombre) de todas las colecciones.
          <br/>Se queda con el más antiguo y elimina los demás.
        </p>
      </div>

      <button
        onClick={limpiarTodo}
        disabled={cargando}
        style={{
          width: '100%',
          padding: '15px',
          background: cargando ? '#999' : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: cargando ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {cargando ? 'Limpiando...' : '🧹 Eliminar Duplicados'}
      </button>

      {progreso && (
        <div style={{
          padding: '15px',
          background: resultados ? '#e8f5e9' : '#f5f5f5',
          borderRadius: '8px',
          color: resultados ? '#2e7d32' : '#333',
          marginBottom: '20px'
        }}>
          {progreso}
        </div>
      )}

      {resultados && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Resultados:</h3>
          
          {Object.entries(resultados).map(([coleccion, stats]) => (
            <div key={coleccion} style={{
              padding: '12px',
              background: 'white',
              borderRadius: '6px',
              marginBottom: '10px',
              border: '1px solid #e9ecef'
            }}>
              <strong style={{ textTransform: 'capitalize' }}>{coleccion}:</strong>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                Total: {stats.total} → Únicos: {stats.unicos} 
                {stats.eliminados > 0 && (
                  <span style={{ color: '#e74c3c', fontWeight: '600', marginLeft: '10px' }}>
                    ❌ Eliminados: {stats.eliminados}
                  </span>
                )}
                {stats.eliminados === 0 && (
                  <span style={{ color: '#27ae60', fontWeight: '600', marginLeft: '10px' }}>
                    ✓ Sin duplicados
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LimpiarDuplicados;
