import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { SkeletonGallery } from '../components/SkeletonLoader';
import './GaleriaSection.css';

function GaleriaSection() {
  const [fotos, setFotos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');

  useEffect(() => {
    cargarFotos();
  }, []);

  const cargarFotos = async () => {
    try {
      const fotosRef = collection(db, 'selvaggio_galeria');
      const snapshot = await getDocs(fotosRef);
      
      const fotosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(foto => foto.visible !== false);

      fotosData.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setFotos(fotosData);
    } catch (error) {
      console.error('Error al cargar galería:', error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <section className="galeria-section">
        <div className="section-content">
          <h2 className="section-title">Galería</h2>
          <SkeletonGallery count={8} />
        </div>
      </section>
    );
  }

  if (fotos.length === 0) {
    return null;
  }

  const categorias = ['Todas', ...new Set(fotos.map(f => f.categoria))];
  const fotosFiltradas = categoriaActiva === 'Todas' 
    ? fotos 
    : fotos.filter(f => f.categoria === categoriaActiva);

  return (
    <section id="galeria" className="galeria-section">
      <div className="section-content">
        <h2 className="section-title">Momentos Selvaggio</h2>
        <p className="galeria-intro">
          Un vistazo a nuestra propuesta
        </p>

        {/* Filtros de categoría */}
        <div className="galeria-filtros">
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaActiva(cat)}
              className={`filtro-btn ${categoriaActiva === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid de fotos */}
        <div className="galeria-grid">
          {fotosFiltradas.map((foto) => (
            <div key={foto.id} className="galeria-item">
              <div className="galeria-image">
                <img src={foto.url} alt={foto.titulo} loading="lazy" />
              </div>
              <div className="galeria-info">
                <h3>{foto.titulo}</h3>
                {foto.descripcion && <p>{foto.descripcion}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default GaleriaSection;
