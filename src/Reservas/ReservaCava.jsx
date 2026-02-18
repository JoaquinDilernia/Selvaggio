import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import Toast from '../components/Toast';
import './ReservaCava.css';

function ReservaCava() {
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    cantidadPersonas: 10,
    traeTorta: false,
    fecha: '',
    comprobante: null
  });
  
  const [reservedDates, setReservedDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [reservaExitosa, setReservaExitosa] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    fetchReservedDates();
  }, []);

  const fetchReservedDates = async () => {
    try {
      const q = query(collection(db, 'selvaggio_reservas_cava'));
      const snapshot = await getDocs(q);
      const dates = snapshot.docs.map(doc => doc.data().fecha);
      setReservedDates(dates);
    } catch (error) {
      console.error('Error al cargar fechas reservadas:', error);
    }
  };

  const isDateReserved = (dateString) => {
    return reservedDates.includes(dateString);
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Generar días del calendario
  const generateCalendarDays = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      days.push({
        day,
        dateStr,
        isPast: date < today,
        isReserved: isDateReserved(dateStr)
      });
    }
    
    return days;
  };

  const changeMonth = (direction) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setSelectedMonth(newMonth);
  };

  const selectDate = (dateStr) => {
    if (!isDateReserved(dateStr)) {
      setFormData(prev => ({ ...prev, fecha: dateStr }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'cantidadPersonas') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const uploadComprobante = async (file) => {
    try {
      setUploading(true);
      const timestamp = Date.now();
      const fileName = `comprobantes/${timestamp}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      setUploading(false);
      return url;
    } catch (error) {
      setUploading(false);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (formData.cantidadPersonas < 10) {
      setToast({ message: 'La cantidad mínima de personas es 10', type: 'error' });
      return;
    }

    if (!formData.fecha) {
      setToast({ message: 'Debes seleccionar una fecha', type: 'error' });
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

    if (isDateReserved(formData.fecha)) {
      setToast({ message: 'Esta fecha ya está reservada. Por favor selecciona otra.', type: 'error' });
      return;
    }

    if (!formData.comprobante) {
      setToast({ message: 'Debes cargar el comprobante de la seña', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      // Subir comprobante
      const comprobanteUrl = await uploadComprobante(formData.comprobante);

      // Guardar reserva
      const reservaData = {
        nombre: formData.nombre,
        telefono: formData.telefono,
        cantidadPersonas: formData.cantidadPersonas,
        traeTorta: formData.traeTorta,
        fecha: formData.fecha,
        comprobanteUrl,
        estado: 'confirmada', // Se confirma automáticamente con el comprobante
        precioPersona: 45000,
        seña: 100000,
        total: formData.cantidadPersonas * 45000,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'selvaggio_reservas_cava'), reservaData);

      // Mostrar pantalla de éxito
      setReservaExitosa(true);
      
      // Actualizar fechas reservadas
      fetchReservedDates();

    } catch (error) {
      console.error('Error al crear reserva:', error);
      setToast({ message: 'Error al procesar la reserva. Intenta nuevamente', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const totalAPagar = formData.cantidadPersonas * 45000;

  // Si la reserva fue exitosa, mostrar pantalla de confirmación
  if (reservaExitosa) {
    return (
      <div className="reserva-cava-container">
        <div className="reserva-exitosa-content">
          <div className="exito-icon">✓</div>
          <h1>¡Reserva Confirmada!</h1>
          <p className="exito-mensaje">
            Tu reserva de la cava ha sido confirmada exitosamente.
            <br />
            Te contactaremos pronto por WhatsApp para coordinar los detalles.
          </p>
          <div className="exito-info">
            <p>📱 Te escribiremos por WhatsApp</p>
            <p>✅ Reserva confirmada</p>
          </div>
          <Link to="/" className="btn-volver-home">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reserva-cava-container">
      <div className="reserva-cava-content">
        <h1>Reservá la Cava</h1>
        <p className="reserva-subtitle">Eventos y Cumpleaños</p>

        <div className="reserva-info-destacada">
          <h3>$45.000 por persona</h3>
          <p>Incluye: Degustación completa + Maridaje libre + Panera + Agua</p>
          <p className="degustacion-detalle">Charcuterie premium, quesos seleccionados, conservas y acompañamientos</p>
          <p className="seña-info">Seña de reserva: $100.000 (por transferencia)</p>
        </div>

        <form onSubmit={handleSubmit} className="reserva-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre completo *</label>
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
            <label htmlFor="cantidadPersonas">Cantidad de personas (mínimo 10) *</label>
            <input
              type="number"
              id="cantidadPersonas"
              name="cantidadPersonas"
              value={formData.cantidadPersonas}
              onChange={handleChange}
              min="10"
              required
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="traeTorta"
                checked={formData.traeTorta}
                onChange={handleChange}
              />
              ¿Traerás torta?
            </label>
          </div>

          <div className="form-group">
            <label>Fecha del evento *</label>
            
            <div className="calendario-visual">
              <div className="calendario-header">
                <button 
                  type="button"
                  onClick={() => changeMonth(-1)} 
                  className="btn-mes"
                  disabled={selectedMonth.getMonth() === new Date().getMonth() && selectedMonth.getFullYear() === new Date().getFullYear()}
                >
                  ‹
                </button>
                <h3>
                  {selectedMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                </h3>
                <button type="button" onClick={() => changeMonth(1)} className="btn-mes">›</button>
              </div>

              <div className="calendario-dias-semana">
                <div>Dom</div>
                <div>Lun</div>
                <div>Mar</div>
                <div>Mié</div>
                <div>Jue</div>
                <div>Vie</div>
                <div>Sáb</div>
              </div>

              <div className="calendario-grid">
                {generateCalendarDays().map((dayInfo, index) => {
                  if (!dayInfo) {
                    return <div key={`empty-${index}`} className="calendario-dia empty"></div>;
                  }

                  const isSelected = formData.fecha === dayInfo.dateStr;
                  const isDisabled = dayInfo.isPast || dayInfo.isReserved;

                  return (
                    <button
                      key={dayInfo.dateStr}
                      type="button"
                      className={`calendario-dia ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''} ${dayInfo.isReserved ? 'reserved' : ''}`}
                      onClick={() => !isDisabled && selectDate(dayInfo.dateStr)}
                      disabled={isDisabled}
                      title={dayInfo.isReserved ? 'Ya reservado' : dayInfo.isPast ? 'Fecha pasada' : 'Disponible'}
                    >
                      {dayInfo.day}
                      {dayInfo.isReserved && <span className="reservado-badge">✕</span>}
                    </button>
                  );
                })}
              </div>

              <div className="calendario-leyenda">
                <div className="leyenda-item">
                  <span className="leyenda-cuadro disponible"></span>
                  <span>Disponible</span>
                </div>
                <div className="leyenda-item">
                  <span className="leyenda-cuadro reservado"></span>
                  <span>Reservado</span>
                </div>
                <div className="leyenda-item">
                  <span className="leyenda-cuadro seleccionado"></span>
                  <span>Seleccionado</span>
                </div>
              </div>
            </div>

            {formData.fecha && (
              <p className="fecha-seleccionada">
                Fecha seleccionada: {new Date(formData.fecha + 'T00:00:00').toLocaleDateString('es-AR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            )}
          </div>

          <div className="total-preview">
            <strong>Total: ${totalAPagar.toLocaleString('es-AR')}</strong>
          </div>

          <div className="datos-transferencia">
            <h4>Datos para transferencia de seña ($100.000)</h4>
            <p><strong>Alias:</strong> selvaggio.ba</p>
            <p><strong>CVU:</strong> 0000003100080434358834</p>
            <p><strong>Titular:</strong> Tomas Laureano Molina</p>
          </div>

          <div className="form-group">
            <label htmlFor="comprobante">Comprobante de transferencia *</label>
            <input
              type="file"
              id="comprobante"
              name="comprobante"
              onChange={handleChange}
              accept="image/*,.pdf"
              required
            />
            {uploading && <span className="uploading-text">Subiendo archivo...</span>}
          </div>

          <button 
            type="submit" 
            className="btn-submit-reserva"
            disabled={loading || uploading}
          >
            {loading ? 'Procesando...' : 'Confirmar Reserva'}
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

export default ReservaCava;
