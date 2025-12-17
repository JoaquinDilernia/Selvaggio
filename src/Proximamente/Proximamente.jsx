import { useState } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Proximamente.css';

function Proximamente() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [mostrarMensaje, setMostrarMensaje] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setMensaje('');

    try {
      // Verificar si el email ya existe
      const q = query(collection(db, 'selvaggio_newsletter'), where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setMensaje('Ya estás registrado en nuestra lista ✨');
        setMostrarMensaje(true);
        setEmail('');
        setTimeout(() => {
          setMostrarMensaje(false);
          setMensaje('');
        }, 3000);
        return;
      }

      // Guardar nuevo email
      await addDoc(collection(db, 'selvaggio_newsletter'), {
        email: email,
        fecha: serverTimestamp()
      });

      setMensaje('¡Gracias! Te avisaremos cuando abramos 🍷');
      setMostrarMensaje(true);
      setEmail('');

      setTimeout(() => {
        setMostrarMensaje(false);
        setMensaje('');
      }, 4000);

    } catch (error) {
      console.error('Error al guardar:', error);
      setMensaje('Hubo un error. Por favor intenta de nuevo.');
      setMostrarMensaje(true);
      setTimeout(() => {
        setMostrarMensaje(false);
        setMensaje('');
      }, 4000);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="proximamente-container">
      <div className="proximamente-content">
        {/* Logo */}
        <div className="logo-container fade-in">
          <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="logo-proximamente" />
        </div>

        {/* Mensaje principal */}
        <div className="mensaje-principal fade-in-delay-1">
          <h1>Próximamente.</h1>
          <p className="texto-grande">
            Un espacio donde vos elegís tu vino,<br />
            armás tu picada y creás tu propio momento.
          </p>
        </div>

        {/* Mensaje secundario */}
        <div className="mensaje-secundario fade-in-delay-2">
          <p>
            A punto de abrir.<br />
            Una nueva forma de disfrutar vino + picada, a tu manera.
          </p>
        </div>

        {/* Newsletter */}
        <div className="newsletter-section fade-in-delay-3">
          <h3>Enterate cuando abramos</h3>
          <form onSubmit={handleSubmit} className="newsletter-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              disabled={enviando}
              className="newsletter-input"
            />
            <button type="submit" disabled={enviando} className="newsletter-btn">
              {enviando ? 'Enviando...' : 'Avisame'}
            </button>
          </form>
          
          {mostrarMensaje && (
            <div className={`newsletter-mensaje ${mensaje.includes('error') ? 'error' : 'success'}`}>
              {mensaje}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="info-contacto fade-in-delay-4">
          <div className="info-item">
            <span className="icono">📍</span>
            <span>Buenos Aires, Argentina</span>
          </div>
          <div className="info-item">
            <span className="icono">📸</span>
            <a href="https://www.instagram.com/selvaggio.ba?igsh=MW1lbnVkcjdzcWUyeQ==" target="_blank" rel="noopener noreferrer">
              @selvaggio.ba
            </a>
          </div>
          <div className="info-item">
            <span className="icono">💬</span>
            <a href="https://wa.me/5491156864692" target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="footer-proximamente fade-in-delay-5">
          <p>© 2025 Selvaggio Wine Bar</p>
        </footer>
      </div>
    </div>
  );
}

export default Proximamente;
