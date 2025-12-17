import { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useToast } from '../components/Toast';

function TrabajaForm() {
  const toast = useToast();
  const [enviando, setEnviando] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    puesto: '',
    mensaje: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.email || !formData.puesto) {
      toast.warning('Por favor completá los campos obligatorios');
      return;
    }

    setEnviando(true);

    try {
      await addDoc(collection(db, 'selvaggio_postulaciones'), {
        ...formData,
        fecha: Timestamp.now(),
        estado: 'pendiente'
      });

      toast.success('¡Postulación enviada! Nos contactaremos pronto');
      
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        puesto: '',
        mensaje: ''
      });

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al enviar. Por favor intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section id="trabaja-con-nosotros" className="trabaja-section">
      <div className="section-content">
        <h2 className="section-title animate-on-scroll">Trabajá con nosotros</h2>
        <p className="trabaja-intro animate-on-scroll">
          Buscamos personas apasionadas por el vino, la gastronomía y la atención al cliente. 
          Si querés ser parte del equipo Selvaggio, dejanos tus datos.
        </p>

        <form onSubmit={handleSubmit} className="trabaja-form animate-on-scroll">
          <div className="form-row">
            <div className="form-group">
              <label>Nombre completo *</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                placeholder="Tu nombre y apellido"
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="+54 9 11 1234-5678"
              />
            </div>

            <div className="form-group">
              <label>Puesto de interés *</label>
              <select
                name="puesto"
                value={formData.puesto}
                onChange={handleChange}
                required
              >
                <option value="">Seleccioná un puesto</option>
                <option value="Sommelier/Bartender">Sommelier/Bartender</option>
                <option value="Cocina">Cocina</option>
                <option value="Atención al público">Atención al público</option>
                <option value="Limpieza">Limpieza</option>
                <option value="Administración">Administración</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Mensaje / Experiencia</label>
            <textarea
              name="mensaje"
              value={formData.mensaje}
              onChange={handleChange}
              rows="5"
              placeholder="Contanos sobre tu experiencia, disponibilidad horaria, y por qué te gustaría trabajar con nosotros..."
            ></textarea>
          </div>

          <button type="submit" className="btn-enviar-trabaja" disabled={enviando}>
            {enviando ? (
              <>
                <span className="spinner"></span>
                Enviando...
              </>
            ) : (
              '📩 Enviar postulación'
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

export default TrabajaForm;
