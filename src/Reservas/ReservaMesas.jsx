import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import Toast from '../components/Toast';
import './ReservaMesas.css';

const LIMITE_MESAS_POR_SLOT = 4; // Máximo 4 mesas cada 15 minutos

// Agrupar horarios en slots de 15 minutos
const getSlotKey = (horario) => {
  // Cada horario ya viene en intervalos de 30 min, así que mapeamos a su slot de 15 min
  return horario; // Usamos el horario directo como slot key
};

function ReservaMesas() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    cantidadPersonas: 2,
    fecha: '',
    horario: '',
    preferencia: '',
    restricciones: '',
    comentarios: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [reservaExitosa, setReservaExitosa] = useState(false);
  const [fechaReservada, setFechaReservada] = useState('');
  const [reservasPorHorario, setReservasPorHorario] = useState({});

  // Cargar reservas existentes cuando cambia la fecha
  useEffect(() => {
    if (formData.fecha) {
      fetchReservasPorFecha(formData.fecha);
    }
  }, [formData.fecha]);

  const fetchReservasPorFecha = async (fecha) => {
    try {
      const snapshot = await getDocs(collection(db, 'selvaggio_reservas_mesas'));
      const reservas = snapshot.docs
        .map(doc => doc.data())
        .filter(r => r.fecha === fecha && r.estado !== 'cancelada');
      
      // Contar reservas por horario
      const conteo = {};
      reservas.forEach(r => {
        if (r.horario) {
          conteo[r.horario] = (conteo[r.horario] || 0) + 1;
        }
      });
      setReservasPorHorario(conteo);
    } catch (error) {
      console.error('Error al cargar disponibilidad:', error);
    }
  };

  const isHorarioLleno = (horario) => {
    return (reservasPorHorario[horario] || 0) >= LIMITE_MESAS_POR_SLOT;
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getAvailableHorarios = () => {
    if (!formData.fecha) {
      return [];
    }
    
    const selectedDate = new Date(formData.fecha + 'T00:00:00');
    const dayOfWeek = selectedDate.getDay(); // 0 = Domingo, 1 = Lunes, 5 = Viernes, 6 = Sábado
    
    // No se acepta reservas los lunes
    if (dayOfWeek === 1) {
      return [];
    }
    
    // Horarios base (18:00 a 00:00)
    const baseHorarios = [
      '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
      '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00'
    ];
    
    // Viernes (5) y Sábado (6) tienen horarios extendidos hasta 2:00 AM
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      return [...baseHorarios, '00:30', '01:00', '01:30', '02:00'];
    }
    
    return baseHorarios;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'cantidadPersonas') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.cantidadPersonas < 1) {
      setToast({ message: 'Debe haber al menos 1 persona', type: 'error' });
      return;
    }
    
    // Validar que la fecha no sea pasada
    const fechaSeleccionada = new Date(formData.fecha + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    if (fechaSeleccionada < hoy) {
      setToast({ message: 'No puedes reservar una fecha pasada', type: 'error' });
      return;
    }

    // Validar límite de reservas por horario
    if (isHorarioLleno(formData.horario)) {
      setToast({ message: 'Este horario ya está completo. Por favor elegí otro.', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const reservaData = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        telefono: formData.telefono,
        cantidadPersonas: formData.cantidadPersonas,
        fecha: formData.fecha,
        horario: formData.horario,
        preferencia: formData.preferencia,
        restricciones: formData.restricciones,
        comentarios: formData.comentarios,
        estado: 'pendiente',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'selvaggio_reservas_mesas'), reservaData);

      setFechaReservada(formData.fecha);
      setReservaExitosa(true);
      
      // Reset form
      setFormData({
        nombre: '',
        apellido: '',
        telefono: '',
        cantidadPersonas: 2,
        fecha: '',
        horario: '',
        preferencia: '',
        restricciones: '',
        comentarios: ''
      });

    } catch (error) {
      console.error('Error al crear reserva:', error);
      setToast({ message: 'Error al procesar la reserva. Intenta nuevamente', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Si la reserva fue exitosa, mostrar pantalla de confirmación
  if (reservaExitosa) {
    return (
      <div className="reserva-mesas-container">
        <div className="reserva-exitosa-content">
          <div className="exito-icon">✓</div>
          <h1>¡Reserva Confirmada!</h1>
          <p className="exito-mensaje">
            Tu reserva ha sido confirmada exitosamente.
            <br />
            ¡Te esperamos!
          </p>
          <div className="exito-info">
            <p>✅ Reserva confirmada</p>
            <p>📅 Fecha: {new Date(fechaReservada + 'T00:00:00').toLocaleDateString('es-AR')}</p>
          </div>
          <Link to="/" className="btn-volver-home">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reserva-mesas-container">
      <div className="reserva-mesas-content">
        <h1>Reservá tu Mesa</h1>
        <p className="reserva-subtitle">Anticipá tu visita</p>

        <div className="reserva-info">
          <p>Completá el formulario para confirmar tu reserva</p>
        </div>

        <form onSubmit={handleSubmit} className="reserva-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre *</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="apellido">Apellido *</label>
            <input
              type="text"
              id="apellido"
              name="apellido"
              value={formData.apellido}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="telefono">Teléfono *</label>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="cantidadPersonas">Cantidad de personas *</label>
            <input
              type="number"
              id="cantidadPersonas"
              name="cantidadPersonas"
              value={formData.cantidadPersonas}
              onChange={handleChange}
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="fecha">Fecha deseada *</label>
            <input
              type="date"
              id="fecha"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              min={getMinDate()}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="horario">Horario aproximado *</label>
            <select
              id="horario"
              name="horario"
              value={formData.horario}
              onChange={handleChange}
              required
              disabled={!formData.fecha || (formData.fecha && new Date(formData.fecha + 'T00:00:00').getDay() === 1)}
            >
              <option value="">Seleccionar horario</option>
              {getAvailableHorarios().map(horario => {
                const lleno = isHorarioLleno(horario);
                const disponibles = LIMITE_MESAS_POR_SLOT - (reservasPorHorario[horario] || 0);
                return (
                  <option key={horario} value={horario} disabled={lleno}>
                    {horario} {lleno ? '(completo)' : `(${disponibles} ${disponibles === 1 ? 'mesa disponible' : 'mesas disponibles'})`}
                  </option>
                );
              })}
            </select>
            {formData.fecha && new Date(formData.fecha + 'T00:00:00').getDay() === 1 && (
              <p style={{ color: '#ff6b6b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Los lunes no atendemos. Por favor elegí otro día.
              </p>
            )}
            {formData.fecha && getAvailableHorarios().length > 0 && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {new Date(formData.fecha + 'T00:00:00').getDay() === 5 || new Date(formData.fecha + 'T00:00:00').getDay() === 6
                  ? 'Viernes y sábado: hasta 2:00 AM'
                  : 'Martes a domingo: hasta 00:00 hs'}
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="preferencia">Preferencia de ubicación *</label>
            <select
              id="preferencia"
              name="preferencia"
              value={formData.preferencia}
              onChange={handleChange}
              required
            >
              <option value="">Seleccionar preferencia</option>
              <option value="Adentro / Living">Adentro / Living</option>
              <option value="Pérgola / La Galería">Pérgola / La Galería</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="comentarios">Comentarios o solicitudes especiales</label>
            <textarea
              id="comentarios"
              name="comentarios"
              value={formData.comentarios}
              onChange={handleChange}
              rows="3"
              placeholder="Ocasión especial, etc."
            />
          </div>

          <div className="form-group">
            <label htmlFor="restricciones">¿Tienen restricciones alimentarias o alergias?</label>
            <textarea
              id="restricciones"
              name="restricciones"
              value={formData.restricciones}
              onChange={handleChange}
              rows="2"
              placeholder="Celíaco, vegetariano, alergia a frutos secos, etc."
            />
          </div>

          <button 
            type="submit" 
            className="btn-submit-reserva"
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Solicitar Reserva'}
          </button>
        </form>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default ReservaMesas;
