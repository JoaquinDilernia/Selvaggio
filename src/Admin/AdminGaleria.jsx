import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useToast } from '../components/Toast';
import './AdminMaridajes.css';

function AdminGaleria() {
  const toast = useToast();
  const [fotos, setFotos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [editando, setEditando] = useState(null);
  
  const [nuevaFoto, setNuevaFoto] = useState({
    url: '',
    titulo: '',
    descripcion: '',
    categoria: 'Productos',
    orden: 0,
    visible: true
  });

  const [archivoImagen, setArchivoImagen] = useState(null);
  const [previewImagen, setPreviewImagen] = useState('');

  const categorias = ['Productos', 'Ambiente', 'Eventos', 'Clientes', 'Equipo', 'La Cava', 'Baño'];

  useEffect(() => {
    cargarFotos();
  }, []);

  const handleArchivoChange = (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      // Validar que sea imagen
      if (!archivo.type.startsWith('image/')) {
        toast.error('Por favor seleccioná un archivo de imagen');
        return;
      }
      
      // Validar tamaño (máx 5MB)
      if (archivo.size > 5 * 1024 * 1024) {
        toast.error('La imagen es muy pesada. Máximo 5MB');
        return;
      }

      setArchivoImagen(archivo);
      
      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImagen(reader.result);
      };
      reader.readAsDataURL(archivo);
    }
  };

  const subirImagen = async () => {
    if (!archivoImagen) return null;

    setSubiendoImagen(true);
    try {
      // Crear nombre único
      const timestamp = Date.now();
      const nombreArchivo = `galeria/${timestamp}_${archivoImagen.name}`;
      const storageRef = ref(storage, nombreArchivo);
      
      // Subir archivo
      await uploadBytes(storageRef, archivoImagen);
      
      // Obtener URL
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error('Error al subir imagen:', error);
      toast.error('Error al subir la imagen');
      return null;
    } finally {
      setSubiendoImagen(false);
    }
  };

  const cargarFotos = async () => {
    try {
      setCargando(true);
      const fotosRef = collection(db, 'selvaggio_galeria');
      const snapshot = await getDocs(fotosRef);
      
      const fotosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      fotosData.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setFotos(fotosData);
    } catch (error) {
      console.error('Error al cargar galería:', error);
      toast.error('Error al cargar fotos');
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar que tenga imagen (archivo o URL)
    if (!archivoImagen && !nuevaFoto.url && !editando) {
      toast.warning('Debés subir una imagen o ingresar una URL');
      return;
    }

    if (!nuevaFoto.titulo) {
      toast.warning('El título es obligatorio');
      return;
    }

    setGuardando(true);

    try {
      let urlFinal = nuevaFoto.url;

      // Si hay un archivo nuevo, subirlo
      if (archivoImagen) {
        const urlSubida = await subirImagen();
        if (urlSubida) {
          urlFinal = urlSubida;
        } else {
          throw new Error('No se pudo subir la imagen');
        }
      }

      const datosFoto = {
        ...nuevaFoto,
        url: urlFinal
      };

      if (editando) {
        const fotoRef = doc(db, 'selvaggio_galeria', editando);
        await updateDoc(fotoRef, {
          ...datosFoto,
          fechaModificacion: serverTimestamp()
        });
        toast.success('Foto actualizada exitosamente');
      } else {
        await addDoc(collection(db, 'selvaggio_galeria'), {
          ...datosFoto,
          fechaCreacion: serverTimestamp()
        });
        toast.success('Foto agregada exitosamente');
      }

      setNuevaFoto({
        url: '',
        titulo: '',
        descripcion: '',
        categoria: 'Productos',
        orden: 0,
        visible: true
      });
      setArchivoImagen(null);
      setPreviewImagen('');
      setEditando(null);
      cargarFotos();
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar la foto');
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = (foto) => {
    setNuevaFoto({
      url: foto.url || '',
      titulo: foto.titulo || '',
      descripcion: foto.descripcion || '',
      categoria: foto.categoria || 'Productos',
      orden: foto.orden || 0,
      visible: foto.visible !== undefined ? foto.visible : true
    });
    setEditando(foto.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta foto?')) return;

    try {
      await deleteDoc(doc(db, 'selvaggio_galeria', id));
      toast.success('Foto eliminada');
      cargarFotos();
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar la foto');
    }
  };

  const toggleVisibilidad = async (foto) => {
    try {
      const fotoRef = doc(db, 'selvaggio_galeria', foto.id);
      const nuevoEstado = !foto.visible;
      await updateDoc(fotoRef, {
        visible: nuevoEstado,
        fechaModificacion: serverTimestamp()
      });
      toast.success(nuevoEstado ? 'Foto mostrada en galería' : 'Foto oculta de galería');
      cargarFotos();
    } catch (error) {
      console.error('Error al cambiar visibilidad:', error);
      toast.error('Error al cambiar visibilidad');
    }
  };

  const handleCancelar = () => {
    setNuevaFoto({
      url: '',
      titulo: '',
      descripcion: '',
      categoria: 'Productos',
      orden: 0,
      visible: true
    });
    setArchivoImagen(null);
    setPreviewImagen('');
    setEditando(null);
  };

  const fotosPorCategoria = fotos.reduce((acc, foto) => {
    const cat = foto.categoria || 'Productos';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(foto);
    return acc;
  }, {});

  return (
    <div className="admin-maridajes">
      <div className="admin-header">
        <h1>Administrar Galería</h1>
        <p>Gestiona las fotos que se muestran en la landing</p>
      </div>

      {/* Formulario */}
      <div className="form-section">
        <h2>{editando ? 'Editar Foto' : 'Nueva Foto'}</h2>
        <form onSubmit={handleSubmit} className="maridaje-form">
          <div className="form-grid">
            {/* Subir archivo */}
            <div className="form-group full-width">
              <label>Subir Imagen desde tu PC *</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleArchivoChange}
                style={{
                  padding: '12px',
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: '#fafafa'
                }}
              />
              <small>Formatos: JPG, PNG, WebP. Máximo 5MB</small>
            </div>

            {/* Opción alternativa: URL */}
            <div className="form-group full-width">
              <label>O pegar URL de imagen (opcional)</label>
              <input
                type="url"
                value={nuevaFoto.url}
                onChange={(e) => setNuevaFoto({...nuevaFoto, url: e.target.value})}
                placeholder="https://ejemplo.com/imagen.jpg"
                disabled={!!archivoImagen}
              />
              <small>Si preferís usar una imagen de internet</small>
            </div>

            <div className="form-group">
              <label>Título *</label>
              <input
                type="text"
                value={nuevaFoto.titulo}
                onChange={(e) => setNuevaFoto({...nuevaFoto, titulo: e.target.value})}
                placeholder="Ej: Tabla de Quesos Premium"
                required
              />
            </div>

            <div className="form-group">
              <label>Categoría *</label>
              <select
                value={nuevaFoto.categoria}
                onChange={(e) => setNuevaFoto({...nuevaFoto, categoria: e.target.value})}
                required
              >
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Descripción (opcional)</label>
              <textarea
                value={nuevaFoto.descripcion}
                onChange={(e) => setNuevaFoto({...nuevaFoto, descripcion: e.target.value})}
                placeholder="Describe la foto..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Orden</label>
              <input
                type="number"
                value={nuevaFoto.orden}
                onChange={(e) => setNuevaFoto({...nuevaFoto, orden: parseInt(e.target.value) || 0})}
                min="0"
              />
              <small>Número más bajo aparece primero</small>
            </div>
          </div>

          {/* Vista previa */}
          {(previewImagen || nuevaFoto.url) && (
            <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 10px', fontWeight: '600', color: '#666' }}>Vista previa:</p>
              <img 
                src={previewImagen || nuevaFoto.url} 
                alt="Preview" 
                style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              {archivoImagen && (
                <p style={{ marginTop: '10px', fontSize: '13px', color: '#666' }}>
                  📎 {archivoImagen.name} ({(archivoImagen.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" disabled={guardando || subiendoImagen} className="btn-primary">
              {subiendoImagen ? 'Subiendo imagen...' : (guardando ? 'Guardando...' : (editando ? 'Actualizar' : 'Agregar Foto'))}
            </button>
            {editando && (
              <button type="button" onClick={handleCancelar} className="btn-secondary">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de fotos */}
      <div className="lista-section">
        <h2>Fotos en Galería ({fotos.length})</h2>
        
        {cargando ? (
          <p>Cargando galería...</p>
        ) : fotos.length === 0 ? (
          <p className="empty-state">No hay fotos cargadas. ¡Agregá la primera!</p>
        ) : (
          <div className="vinos-por-categoria">
            {categorias.filter(cat => fotosPorCategoria[cat]).map(categoria => (
              <div key={categoria} className="categoria-grupo">
                <h3 className="categoria-grupo-title">{categoria} ({fotosPorCategoria[categoria].length})</h3>
                <div className="galeria-grid">
                  {fotosPorCategoria[categoria].map((foto) => (
                    <div key={foto.id} className={`foto-item ${foto.visible === false ? 'oculto' : ''}`}>
                      <div className="foto-preview">
                        <img src={foto.url} alt={foto.titulo} />
                      </div>
                      <div className="foto-info">
                        <h4>
                          {foto.titulo}
                          {foto.visible === false && <span className="badge-oculto">OCULTO</span>}
                        </h4>
                        {foto.descripcion && <p>{foto.descripcion}</p>}
                        <span className="orden-badge">Orden: {foto.orden || 0}</span>
                      </div>
                      <div className="maridaje-item-actions">
                        <button 
                          onClick={() => toggleVisibilidad(foto)} 
                          className={foto.visible === false ? "btn-mostrar" : "btn-ocultar"}
                        >
                          {foto.visible === false ? '👁️ Mostrar' : '🙈 Ocultar'}
                        </button>
                        <button onClick={() => handleEditar(foto)} className="btn-edit">
                          Editar
                        </button>
                        <button onClick={() => handleEliminar(foto.id)} className="btn-delete">
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

export default AdminGaleria;
