import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { SkeletonGrid } from '../components/SkeletonLoader';

function ProductosSection() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const productosRef = collection(db, 'selvaggio_productos');
      const snapshot = await getDocs(productosRef);
      
      const productosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(producto => producto.visible !== false); // Solo mostrar productos visibles

      // Ordenar manualmente
      productosData.sort((a, b) => (a.orden || 0) - (b.orden || 0));

      // Agrupar por categoría (Quesos, Fiambres, Panes, etc)
      const agrupadosPorCategoria = productosData.reduce((acc, prod) => {
        const cat = prod.categoria || 'Otros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(prod);
        return acc;
      }, {});

      setProductos(agrupadosPorCategoria);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <section className="productos-section">
        <div className="section-content">
          <h2 className="section-title">Productos Gourmet</h2>
          <SkeletonGrid count={6} />
        </div>
      </section>
    );
  }

  const categorias = Object.keys(productos);

  if (categorias.length === 0) {
    return null;
  }

  const categoriasOrdenadas = ['Quesos', 'Fiambres', 'Conservas', 'Panes y Regalos', 'Otros'].filter(cat => categorias.includes(cat));
  const otrasCateg = categorias.filter(cat => !categoriasOrdenadas.includes(cat));
  const todasCategorias = [...categoriasOrdenadas, ...otrasCateg];

  return (
    <section id="productos" className="productos-section">
      <div className="section-content">
        <h2 className="section-title animate-on-scroll">Quesos, Fiambres & Más</h2>
        <p className="productos-intro animate-on-scroll">
          Armá tu tabla ideal con nuestra selección premium de productos artesanales.
        </p>
        
        <div className="productos-categorias">
          {todasCategorias.map((categoria) => (
            <div key={categoria} className="producto-categoria animate-on-scroll">
              <h3 className="categoria-title">{categoria}</h3>
              <div className="productos-grid">
                {productos[categoria].map((producto) => (
                  <div key={producto.id} className="producto-item">
                    <div className="producto-header">
                      <h4>{producto.nombre}</h4>
                      {producto.precio && (
                        <span className="producto-precio">
                          ${producto.precio.toLocaleString()}
                          {(categoria === 'Quesos' || categoria === 'Fiambres' || categoria === 'Conservas') ? '/100g' : ''}
                        </span>
                      )}
                    </div>
                    {producto.origen && (
                      <p className="producto-origen">{producto.origen}</p>
                    )}
                    {producto.descripcion && (
                      <p className="producto-descripcion">{producto.descripcion}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ProductosSection;
