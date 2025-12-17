import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import './PrensaSection.css'

function PrensaSection() {
  const [prensa, setPrensa] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarPrensa()
  }, [])

  const cargarPrensa = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'selvaggio_prensa'))
      const datos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Filtrar solo visibles y ordenar por fecha descendente
      const visibles = datos
        .filter(p => p.visible !== false)
        .sort((a, b) => {
          const fechaA = new Date(a.fecha)
          const fechaB = new Date(b.fecha)
          return fechaB - fechaA
        })
      
      setPrensa(visibles)
    } catch (error) {
      console.error('Error al cargar prensa:', error)
    } finally {
      setCargando(false)
    }
  }

  if (cargando) {
    return null
  }

  if (prensa.length === 0) {
    return null
  }

  return (
    <section className="prensa-section">
      <div className="container">
        <h2 className="section-title">En los Medios</h2>
        <p className="prensa-intro">
          Reconocimientos y menciones en medios especializados
        </p>

        <div className="prensa-grid">
          {prensa.map(nota => (
            <div key={nota.id} className="prensa-card">
              {nota.imagen && (
                <div className="prensa-imagen">
                  <img src={nota.imagen} alt={nota.titulo} loading="lazy" />
                </div>
              )}

              <div className="prensa-contenido">
                <div className="prensa-medio">{nota.medio}</div>
                
                <h3 className="prensa-titulo">{nota.titulo}</h3>
                
                {nota.descripcion && (
                  <p className="prensa-descripcion">{nota.descripcion}</p>
                )}

                <div className="prensa-footer">
                  <div className="prensa-fecha">
                    {new Date(nota.fecha).toLocaleDateString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>

                  {nota.url && (
                    <a 
                      href={nota.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="prensa-link"
                    >
                      Leer artículo →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PrensaSection
