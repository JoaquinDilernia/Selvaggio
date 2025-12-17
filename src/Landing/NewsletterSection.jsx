import { useState } from 'react'
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import './NewsletterSection.css'

function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !nombre) {
      setMensaje({ texto: 'Por favor completá todos los campos', tipo: 'error' })
      return
    }

    setEnviando(true)
    setMensaje({ texto: '', tipo: '' })

    try {
      // Verificar si el email ya existe
      const q = query(collection(db, 'newsletter'), where('email', '==', email.toLowerCase()))
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        setMensaje({ texto: '¡Ya estás suscrito a nuestro newsletter!', tipo: 'info' })
        setEnviando(false)
        return
      }

      // Agregar nueva suscripción
      await addDoc(collection(db, 'newsletter'), {
        email: email.toLowerCase(),
        nombre: nombre,
        fecha: new Date().toISOString(),
        activo: true
      })

      setMensaje({ 
        texto: '¡Gracias por suscribirte! Te mantendremos informado.', 
        tipo: 'success' 
      })
      setEmail('')
      setNombre('')
    } catch (error) {
      console.error('Error al suscribir:', error)
      setMensaje({ 
        texto: 'Hubo un error. Por favor intentá nuevamente.', 
        tipo: 'error' 
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="newsletter-section">
      <div className="newsletter-container">
        <div className="newsletter-content">
          <h2 className="newsletter-title">Enterate de Todo</h2>
          <p className="newsletter-subtitle">
            Eventos exclusivos, nuevas etiquetas, degustaciones especiales y promociones.
            <br/>Suscribite a nuestro newsletter.
          </p>

          <form onSubmit={handleSubmit} className="newsletter-form">
            <div className="form-row">
              <input
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="newsletter-input"
                disabled={enviando}
              />
              <input
                type="email"
                placeholder="Tu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="newsletter-input"
                disabled={enviando}
              />
              <button 
                type="submit" 
                className="newsletter-btn"
                disabled={enviando}
              >
                {enviando ? (
                  <>
                    <span className="spinner"></span>
                    Enviando...
                  </>
                ) : (
                  'Suscribirme'
                )}
              </button>
            </div>

            {mensaje.texto && (
              <div className={`newsletter-mensaje ${mensaje.tipo}`}>
                {mensaje.texto}
              </div>
            )}
          </form>

          <p className="newsletter-disclaimer">
            No spam. Podés desuscribirte cuando quieras.
          </p>
        </div>
      </div>
    </section>
  )
}

export default NewsletterSection
