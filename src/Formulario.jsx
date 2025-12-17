import { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase/config';
import { useToast } from './components/Toast';
import './Formulario.css';

function Formulario() {
  const toast = useToast();
  const [enviando, setEnviando] = useState(false);
  const [formData, setFormData] = useState({
    turno: '',
    comoViniste: '',
    comoVinisteOtro: '',
    entendioExperiencia: '',
    sentisteComodo: '',
    porqueIncomodo: '',
    gustoGeneral: '',
    volverias: '',
    recomendarias: '',
    faltoComer: '',
    queAgregarias: '',
    musicaVivo: '',
    cumpleanios: '',
    costoLlegar: '',
    problemaEstacionar: '',
    comentarios: '',
    contacto: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.turno || !formData.comoViniste || !formData.gustoGeneral || !formData.recomendarias) {
      toast.warning('Por favor completá las preguntas obligatorias');
      return;
    }

    setEnviando(true);

    try {
      await addDoc(collection(db, 'selvaggio'), {
        ...formData,
        fecha: Timestamp.now()
      });

      toast.success('¡Gracias por tu feedback! 🍷');
      
      // Limpiar formulario
      setFormData({
        turno: '', comoViniste: '', comoVinisteOtro: '', entendioExperiencia: '',
        sentisteComodo: '', porqueIncomodo: '', gustoGeneral: '', volverias: '',
        recomendarias: '', faltoComer: '', queAgregarias: '', musicaVivo: '',
        cumpleanios: '', costoLlegar: '', problemaEstacionar: '', comentarios: '', contacto: ''
      });

      // Redirigir a página de gracias después de 2 segundos
      setTimeout(() => {
        window.location.href = '/#/gracias';
      }, 2000);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al enviar. Por favor intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="formulario-container">
      <div className="formulario-header">
        <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="formulario-logo" />
        <h1>¿Cómo fue tu experiencia?</h1>
        <p>Tu opinión nos ayuda a mejorar</p>
      </div>

      <form onSubmit={handleSubmit} className="formulario">
        {/* Turno */}
        <div className="form-question">
          <label>¿En qué turno viniste? *</label>
          <div className="radio-group">
            {['19 hs', '20 hs', '21 hs'].map(op => (
              <label key={op} className="radio-option">
                <input type="radio" name="turno" value={op} checked={formData.turno === op} onChange={handleChange} required />
                <span>{op}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Cómo viniste */}
        <div className="form-question">
          <label>¿Cómo viniste? *</label>
          <div className="radio-group">
            {['Pareja', 'Grupo mixto', 'Grupo mujeres', 'Grupo hombres', 'Otro'].map(op => (
              <label key={op} className="radio-option">
                <input type="radio" name="comoViniste" value={op} checked={formData.comoViniste === op} onChange={handleChange} required />
                <span>{op}</span>
              </label>
            ))}
          </div>
          {formData.comoViniste === 'Otro' && (
            <input
              type="text"
              name="comoVinisteOtro"
              value={formData.comoVinisteOtro}
              onChange={handleChange}
              placeholder="Especificá..."
              className="text-input"
            />
          )}
        </div>

        {/* Entendió experiencia */}
        <div className="form-question">
          <label>¿Entendiste la experiencia?</label>
          <div className="radio-group">
            {['Sí', 'Más o menos', 'No'].map(op => (
              <label key={op} className="radio-option">
                <input type="radio" name="entendioExperiencia" value={op} checked={formData.entendioExperiencia === op} onChange={handleChange} />
                <span>{op}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Cómodo en el espacio */}
        <div className="form-question">
          <label>¿Te sentiste cómodo en el espacio?</label>
          <div className="radio-group">
            {['Sí', 'Más o menos', 'No'].map(op => (
              <label key={op} className="radio-option">
                <input type="radio" name="sentisteComodo" value={op} checked={formData.sentisteComodo === op} onChange={handleChange} />
                <span>{op}</span>
              </label>
            ))}
          </div>
          {(formData.sentisteComodo === 'Más o menos' || formData.sentisteComodo === 'No') && (
            <textarea
              name="porqueIncomodo"
              value={formData.porqueIncomodo}
              onChange={handleChange}
              placeholder="¿Por qué? ¿Qué cambiarías?"
              className="textarea-input"
              rows="3"
            />
          )}
        </div>

        {/* Gusto general */}
        <div className="form-question">
          <label>¿Te gustó la experiencia en general? * (1-5)</label>
          <div className="scale-group">
            {[1, 2, 3, 4, 5].map(num => (
              <label key={num} className="scale-option">
                <input type="radio" name="gustoGeneral" value={num} checked={formData.gustoGeneral == num} onChange={handleChange} required />
                <span className="scale-num">{num}</span>
              </label>
            ))}
          </div>
          <div className="scale-labels">
            <span>Muy mal</span>
            <span>Excelente</span>
          </div>
        </div>

        {/* Volverías */}
        <div className="form-question">
          <label>¿Volverías a venir?</label>
          <div className="radio-group">
            {['Sí', 'Tal vez', 'No'].map(op => (
              <label key={op} className="radio-option">
                <input type="radio" name="volverias" value={op} checked={formData.volverias === op} onChange={handleChange} />
                <span>{op}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Recomendarías */}
        <div className="form-question">
          <label>¿Recomendarías Selvaggio? * (1-10)</label>
          <div className="scale-group wide">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <label key={num} className="scale-option">
                <input type="radio" name="recomendarias" value={num} checked={formData.recomendarias == num} onChange={handleChange} required />
                <span className="scale-num">{num}</span>
              </label>
            ))}
          </div>
          <div className="scale-labels">
            <span>Para nada</span>
            <span>Definitivamente</span>
          </div>
        </div>

        {/* Faltó algo */}
        <div className="form-question">
          <label>¿Te faltó algo para tomar o comer?</label>
          <div className="radio-group">
            {['No', 'Un poco', 'Sí'].map(op => (
              <label key={op} className="radio-option">
                <input type="radio" name="faltoComer" value={op} checked={formData.faltoComer === op} onChange={handleChange} />
                <span>{op}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Qué agregarías */}
        <div className="form-question">
          <label>¿Qué agregarías o mejorarías del menú?</label>
          <textarea
            name="queAgregarias"
            value={formData.queAgregarias}
            onChange={handleChange}
            placeholder="Sugerencias..."
            className="textarea-input"
            rows="3"
          />
        </div>

        {/* Música en vivo */}
        <div className="form-question">
          <label>¿Te gustaría música en vivo?</label>
          <div className="radio-group">
            {['Sí', 'A veces', 'No'].map(op => (
              <label key={op} className="radio-option">
                <input type="radio" name="musicaVivo" value={op} checked={formData.musicaVivo === op} onChange={handleChange} />
                <span>{op}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Cumpleaños */}
        <div className="form-question">
          <label>¿Festejarías tu cumple en un espacio privado dentro del lugar?</label>
          <div className="radio-group">
            {['Sí', 'Tal vez', 'No'].map(op => (
              <label key={op} className="radio-option">
                <input type="radio" name="cumpleanios" value={op} checked={formData.cumpleanios === op} onChange={handleChange} />
                <span>{op}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Costó llegar */}
        <div className="form-question">
          <label>¿Te costó llegar?</label>
          <div className="radio-group">
            {['No', 'Un poco', 'Sí'].map(op => (
              <label key={op} className="radio-option">
                <input type="radio" name="costoLlegar" value={op} checked={formData.costoLlegar === op} onChange={handleChange} />
                <span>{op}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Problemas estacionar */}
        <div className="form-question">
          <label>¿Tuviste problemas para estacionar?</label>
          <div className="radio-group">
            {['No', 'Un poco', 'Sí', 'Vine sin auto'].map(op => (
              <label key={op} className="radio-option">
                <input type="radio" name="problemaEstacionar" value={op} checked={formData.problemaEstacionar === op} onChange={handleChange} />
                <span>{op}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Comentarios finales */}
        <div className="form-question">
          <label>Comentarios finales</label>
          <textarea
            name="comentarios"
            value={formData.comentarios}
            onChange={handleChange}
            placeholder="Contanos lo que quieras..."
            className="textarea-input"
            rows="4"
          />
        </div>

        {/* Contacto */}
        <div className="form-question">
          <label>Instagram o email (opcional)</label>
          <input
            type="text"
            name="contacto"
            value={formData.contacto}
            onChange={handleChange}
            placeholder="@usuario o email@ejemplo.com"
            className="text-input"
          />
        </div>

        <button type="submit" className="btn-enviar" disabled={enviando}>
          {enviando ? (
            <>
              <span className="spinner"></span>
              Enviando...
            </>
          ) : (
            '✓ Enviar Feedback'
          )}
        </button>
      </form>

      <div className="formulario-footer">
        <a href="/#/landing" className="link-volver">← Volver al inicio</a>
      </div>
    </div>
  );
}

export default Formulario;
