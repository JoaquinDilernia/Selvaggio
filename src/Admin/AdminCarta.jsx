import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useToast } from '../components/Toast';
import './AdminMaridajes.css';

function AdminCarta() {
  const toast = useToast();
  const [cartaActual, setCartaActual] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    cargarCarta();
  }, []);

  const cargarCarta = async () => {
    try {
      setCargando(true);
      const cartaRef = doc(db, 'selvaggio_configuracion', 'carta');
      const cartaDoc = await getDoc(cartaRef);
      
      if (cartaDoc.exists()) {
        setCartaActual(cartaDoc.data());
      }
    } catch (error) {
      console.error('Error al cargar carta:', error);
      toast.error('Error al cargar la carta');
    } finally {
      setCargando(false);
    }
  };

  const handleSubirPDF = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar que sea PDF
    if (file.type !== 'application/pdf') {
      toast.error('Por favor seleccioná un archivo PDF');
      return;
    }

    // Validar tamaño (máx 15MB)
    if (file.size > 15 * 1024 * 1024) {
      toast.error('El PDF no puede pesar más de 15MB');
      return;
    }

    setSubiendo(true);

    try {
      // Subir nuevo PDF
      const timestamp = Date.now();
      const fileName = `carta/carta-selvaggio-${timestamp}.pdf`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Guardar en Firestore
      const cartaRef = doc(db, 'selvaggio_configuracion', 'carta');
      const nuevaCarta = {
        url,
        nombre: file.name,
        fechaActualizacion: new Date().toISOString(),
        tamaño: file.size
      };

      await setDoc(cartaRef, nuevaCarta);

      // Eliminar PDF anterior si existe
      if (cartaActual?.url) {
        try {
          const oldRef = ref(storage, cartaActual.url);
          await deleteObject(oldRef);
        } catch (error) {
          console.log('No se pudo eliminar el archivo anterior:', error);
        }
      }

      setCartaActual(nuevaCarta);
      toast.success('Carta actualizada exitosamente');
    } catch (error) {
      console.error('Error al subir PDF:', error);
      toast.error('Error al subir la carta');
    } finally {
      setSubiendo(false);
    }
  };

  const handleEliminarCarta = async () => {
    if (!confirm('¿Estás seguro de eliminar la carta actual?')) return;

    try {
      // Eliminar archivo de Storage
      if (cartaActual?.url) {
        const storageRef = ref(storage, cartaActual.url);
        await deleteObject(storageRef);
      }

      // Eliminar de Firestore
      const cartaRef = doc(db, 'selvaggio_configuracion', 'carta');
      await setDoc(cartaRef, { eliminada: true, fechaEliminacion: new Date().toISOString() });

      setCartaActual(null);
      toast.success('Carta eliminada');
    } catch (error) {
      console.error('Error al eliminar carta:', error);
      toast.error('Error al eliminar la carta');
    }
  };

  const formatearTamaño = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (cargando) {
    return (
      <div className="admin-maridajes">
        <div className="loading">
          <div className="spinner-grande"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-maridajes">
      <div className="admin-header">
        <h1>Carta Digital (PDF)</h1>
        <p>Sube el PDF de la carta que se mostrará en la web</p>
      </div>

      <div className="form-section">
        <div className="maridaje-form" style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          {/* Carta actual */}
          {cartaActual && !cartaActual.eliminada && (
            <div style={{ 
              background: 'rgba(76, 175, 80, 0.1)', 
              border: '2px solid #4CAF50', 
              borderRadius: '12px', 
              padding: '20px', 
              marginBottom: '30px' 
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#4CAF50' }}>📄 Carta Actual</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                <p style={{ margin: 0 }}><strong>Nombre:</strong> {cartaActual.nombre}</p>
                <p style={{ margin: 0 }}><strong>Tamaño:</strong> {formatearTamaño(cartaActual.tamaño)}</p>
                <p style={{ margin: 0 }}>
                  <strong>Última actualización:</strong>{' '}
                  {new Date(cartaActual.fechaActualizacion).toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                  <a 
                    href={cartaActual.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ textDecoration: 'none', display: 'inline-block', padding: '10px 20px' }}
                  >
                    Ver Carta
                  </a>
                  <button 
                    onClick={handleEliminarCarta}
                    className="btn-secondary"
                    style={{ background: '#ff6b6b', color: 'white' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subir nueva carta */}
          <div style={{
            border: '3px dashed #ddd',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.5)'
          }}>
            <h3 style={{ marginTop: 0 }}>
              {cartaActual && !cartaActual.eliminada ? 'Reemplazar Carta' : 'Subir Nueva Carta'}
            </h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Seleccioná el archivo PDF de la carta (máximo 15MB)
            </p>
            
            <input
              type="file"
              accept=".pdf"
              onChange={handleSubirPDF}
              disabled={subiendo}
              style={{ display: 'none' }}
              id="pdf-upload"
            />
            
            <label 
              htmlFor="pdf-upload" 
              className="btn-primary"
              style={{ 
                cursor: subiendo ? 'not-allowed' : 'pointer',
                opacity: subiendo ? 0.6 : 1,
                display: 'inline-block',
                padding: '15px 40px',
                fontSize: '16px'
              }}
            >
              {subiendo ? '⏳ Subiendo...' : '📁 Seleccionar PDF'}
            </label>

            <div style={{ marginTop: '20px', fontSize: '14px', color: '#999' }}>
              <p>• Formato: PDF</p>
              <p>• Tamaño máximo: 15 MB</p>
              <p>• La carta anterior será reemplazada</p>
            </div>
          </div>

          {/* Instrucciones */}
          <div style={{
            marginTop: '30px',
            padding: '20px',
            background: 'rgba(183, 148, 199, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(183, 148, 199, 0.3)'
          }}>
            <h4 style={{ marginTop: 0, color: '#916faa' }}>💡 Importante</h4>
            <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
              <li>El PDF se mostrará en la sección de carta de la web</li>
              <li>Asegurate de que el PDF esté optimizado para web</li>
              <li>Se recomienda usar un tamaño A4 vertical</li>
              <li>El archivo anterior será eliminado automáticamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminCarta;
