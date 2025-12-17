import { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Caja.css';

function Caja() {
  const [formData, setFormData] = useState({
    numeroPedido: '',
    nombre: '',
    telefono: '',
    observaciones: ''
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
    
    if (!formData.numeroPedido || !formData.nombre || !formData.telefono) {
      setMensaje({ tipo: 'error', texto: 'Por favor completá los campos obligatorios' });
      return;
    }

    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      await addDoc(collection(db, 'selvaggio_pedidos'), {
        numeroPedido: formData.numeroPedido.trim(),
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        observaciones: formData.observaciones.trim(),
        pedido_creado: Timestamp.now(),
        pedido_listo: null,
        estado: 'pendiente'
      });

      setMensaje({ tipo: 'success', texto: `Pedido #${formData.numeroPedido} registrado correctamente ✓` });
      
      // Scroll al mensaje
      setTimeout(() => {
        document.querySelector('.mensaje')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      
      // Limpiar mensaje después de 5 segundos
      setTimeout(() => {
        setMensaje({ tipo: '', texto: '' });
      }, 5000);
      
      // Limpiar formulario
      setFormData({
        numeroPedido: '',
        nombre: '',
        telefono: '',
        observaciones: ''
      });

    } catch (error) {
      console.error('Error al guardar pedido:', error);
      setMensaje({ tipo: 'error', texto: 'Error al registrar el pedido. Intentá de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="caja-container">
      <div className="caja-header">
        <h1>🧾 Caja - Registro de Pedidos</h1>
        <p>Ingresá los datos del pedido del cliente</p>
      </div>

      <div className="caja-form-container">
        <form onSubmit={handleSubmit} className="caja-form">
          <div className="form-group">
            <label htmlFor="numeroPedido">N° Pedido *</label>
            <input
              type="text"
              id="numeroPedido"
              name="numeroPedido"
              value={formData.numeroPedido}
              onChange={handleChange}
              placeholder="Ej: 001, 002..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="nombre">Nombre del cliente *</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Nombre completo"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="telefono">Teléfono (con código de área) *</label>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="Ej: 1155667788"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="observaciones">Observaciones</label>
            <textarea
              id="observaciones"
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              placeholder="Pedidos especiales, alergias, etc..."
              rows="3"
            />
          </div>

          {mensaje.texto && (
            <div className={`mensaje ${mensaje.tipo}`}>
              {mensaje.texto}
            </div>
          )}

          <button type="submit" className="btn-registrar" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar Pedido'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Caja;
