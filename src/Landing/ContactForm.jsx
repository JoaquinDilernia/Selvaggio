import { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

function ContactForm() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    mensaje: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.email || !formData.mensaje) {
      setMensaje({ tipo: 'error', texto: 'Por favor completá los campos obligatorios' });
      return;
    }

    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      await addDoc(collection(db, 'selvaggio_contacto'), {
        nombre: formData.nombre.trim(),
        email: formData.email.trim(),
        telefono: formData.telefono.trim(),
        mensaje: formData.mensaje.trim(),
        fecha: Timestamp.now(),
        leido: false
      });

      setMensaje({ tipo: 'success', texto: '¡Mensaje enviado! Te contactaremos pronto ✓' });
      
      // Limpiar formulario
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        mensaje: ''
      });

    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      setMensaje({ tipo: 'error', texto: 'Error al enviar el mensaje. Intentá de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="contact-form">
      <div className="form-row">
        <div className="form-group">
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Nombre completo *"
            required
          />
        </div>
        
        <div className="form-group">
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email *"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <input
          type="tel"
          name="telefono"
          value={formData.telefono}
          onChange={handleChange}
          placeholder="Teléfono (opcional)"
        />
      </div>

      <div className="form-group">
        <textarea
          name="mensaje"
          value={formData.mensaje}
          onChange={handleChange}
          placeholder="Tu consulta o mensaje *"
          rows="5"
          required
        />
      </div>

      {mensaje.texto && (
        <div className={`form-mensaje ${mensaje.tipo}`}>
          {mensaje.texto}
        </div>
      )}

      <button type="submit" className="btn-enviar-contacto" disabled={loading}>
        {loading ? (
          <>
            <span className="spinner"></span>
            Enviando...
          </>
        ) : (
          'Enviar Mensaje'
        )}
      </button>
    </form>
  );
}

export default ContactForm;
