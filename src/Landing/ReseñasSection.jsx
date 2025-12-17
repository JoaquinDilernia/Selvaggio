import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { SkeletonList } from '../components/SkeletonLoader'
import './ReseñasSection.css'

function ReseñasSection() {
  const [reseñas, setReseñas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarReseñas()
  }, [])

  const cargarReseñas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'selvaggio_reseñas'))
      const datos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Filtrar solo visibles y ordenar destacadas primero
      const visibles = datos
        .filter(r => r.visible !== false)
        .sort((a, b) => {
          // Destacadas primero
          if (a.destacada && !b.destacada) return -1
          if (!a.destacada && b.destacada) return 1
          // Luego por calificación descendente
          return (b.calificacion || 0) - (a.calificacion || 0)
        })
      
      setReseñas(visibles)
    } catch (error) {
      console.error('Error al cargar reseñas:', error)
    } finally {
      setCargando(false)
    }
  }

  const renderEstrellas = (calificacion) => {
    const estrellas = []
    for (let i = 1; i <= 5; i++) {
      if (i <= calificacion) {
        estrellas.push(<span key={i} className="estrella llena">★</span>)
      } else {
        estrellas.push(<span key={i} className="estrella vacia">☆</span>)
      }
    }
    return estrellas
  }

  if (cargando) {
    return (
      <section className="reseñas-section">
        <div className="container">
          <h2 className="section-title">Lo Que Dicen Nuestros Clientes</h2>
          <SkeletonList count={3} />
        </div>
      </section>
    )
  }

  if (reseñas.length === 0) {
    return null
  }

  return (
    <section className="reseñas-section">
      <div className="container">
        <h2 className="section-title">Lo Que Dicen Nuestros Clientes</h2>
        <p className="reseñas-intro">
          Experiencias auténticas de quienes nos visitaron
        </p>

        <div className="reseñas-grid">
          {reseñas.map(reseña => (
            <div 
              key={reseña.id} 
              className={`reseña-card ${reseña.destacada ? 'destacada' : ''}`}
            >
              {reseña.destacada && (
                <div className="badge-destacada">⭐ Destacada</div>
              )}
              
              <div className="reseña-header">
                <div className="estrellas">
                  {renderEstrellas(reseña.calificacion || 5)}
                </div>
                <div className="reseña-fecha">
                  {new Date(reseña.fecha).toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: 'long'
                  })}
                </div>
              </div>

              <p className="reseña-comentario">"{reseña.comentario}"</p>

              <div className="reseña-autor">
                <div className="autor-avatar">
                  {reseña.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="autor-nombre">{reseña.nombre}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ReseñasSection
