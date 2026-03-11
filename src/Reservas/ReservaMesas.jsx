import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import Toast from '../components/Toast';
import './ReservaMesas.css';

const LIMITE_POR_SLOT = 4;

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

  useEffect(() => {
    if (formData.fecha) fetchDisponibilidad(formData.fecha);
  }, [formData.fecha]);

  const fetchDisponibilidad = async (fecha) => {
    try {
      const snapshot = await getDocs(collection(db, 'selvaggio_reservas_mesas'));
      const conteo = {};
      snapshot.docs
        .map(d => d.data())
        .filter(r => r.fecha === fecha && r.estado !== 'cancelada')
        .forEach(r => { if (r.horario) conteo[r.horario] = (conteo[r.horario] || 0) + 1; });
      setReservasPorHorario(conteo);
    } catch {}
  };

  const isLleno = (h) => (reservasPorHorario[h] || 0) >= LIMITE_POR_SLOT;

  const getMinDate = () => new Date().toISOString().split('T')[0];

  const getHorarios = () => {
    if (!formData.fecha) return [];
    const dow = new Date(formData.fecha + 'T00:00:00').getDay();
    if (dow === 1) return [];
    const base = ['18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'];
    if (dow === 5 || dow === 6)
      return [...base, '22:30','23:00','23:30','00:00','00:30','01:00','01:30','02:00'];
    return base;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'cantidadPersonas' ? parseInt(value) || 1 : value }));
  };

  const changePersonas = (delta) => {
    setFormData(prev => ({ ...prev, cantidadPersonas: Math.max(1, prev.cantidadPersonas + delta) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.preferencia) {
      setToast({ message: 'Seleccioná una preferencia de ubicación', type: 'error' }); return;
    }
    if (!formData.horario) {
      setToast({ message: 'Seleccioná un horario', type: 'error' }); return;
    }
    const fechaSel = new Date(formData.fecha + 'T00:00:00');
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    if (fechaSel < hoy) {
      setToast({ message: 'No podés reservar una fecha pasada', type: 'error' }); return;
    }
    if (isLleno(formData.horario)) {
      setToast({ message: 'Ese horario ya está completo. Elegí otro.', type: 'error' }); return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'selvaggio_reservas_mesas'), {
        ...formData, estado: 'pendiente', createdAt: new Date().toISOString()
      });
      setFechaReservada(formData.fecha);
      setReservaExitosa(true);
    } catch {
      setToast({ message: 'Error al procesar la reserva. Intentá nuevamente.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const dow = formData.fecha ? new Date(formData.fecha + 'T00:00:00').getDay() : null;
  const horarios = getHorarios();
  const esFinde = dow === 5 || dow === 6;

  /* ── Success ── */
  if (reservaExitosa) {
    return (
      <div className="rf-page">
        <div className="rf-success">
          <div className="rf-success__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="rf-success__title">Reserva recibida</h1>
          <p className="rf-success__sub">Gracias, {formData.nombre || ''}. Te confirmamos por WhatsApp a la brevedad.</p>
          {fechaReservada && (
            <div className="rf-success__detail">
              {new Date(fechaReservada + 'T00:00:00').toLocaleDateString('es-AR', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </div>
          )}
          <Link to="/" className="rf-success__btn">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div className="rf-page">
      <nav className="rf-nav">
        <Link to="/" className="rf-nav__logo">Selvaggio</Link>
        <span className="rf-nav__title">Reservar mesa</span>
        <Link to="/" className="rf-nav__back">← Inicio</Link>
      </nav>

      <main className="rf-main">
        <div className="rf-header">
          <p className="rf-eyebrow">Selvaggio · Wine Bar</p>
          <h1 className="rf-title">Reservá tu mesa</h1>
          <p className="rf-subtitle">Miércoles a domingo desde las 18:00 hs</p>
        </div>

        <form onSubmit={handleSubmit} className="rf-form">

          {/* Nombre + Apellido */}
          <div className="rf-row">
            <div className="rf-field">
              <label className="rf-label rf-label--req">Nombre</label>
              <input className="rf-input" type="text" name="nombre" value={formData.nombre}
                onChange={handleChange} required placeholder="Tu nombre" />
            </div>
            <div className="rf-field">
              <label className="rf-label rf-label--req">Apellido</label>
              <input className="rf-input" type="text" name="apellido" value={formData.apellido}
                onChange={handleChange} required placeholder="Tu apellido" />
            </div>
          </div>

          {/* Teléfono */}
          <div className="rf-field">
            <label className="rf-label rf-label--req">WhatsApp / Teléfono</label>
            <input className="rf-input" type="tel" name="telefono" value={formData.telefono}
              onChange={handleChange} required placeholder="Ej: 11 6686 4692" />
          </div>

          {/* Personas */}
          <div className="rf-field">
            <label className="rf-label rf-label--req">Cantidad de personas</label>
            <div className="rf-number-ctrl">
              <button type="button" className="rf-number-btn" onClick={() => changePersonas(-1)}
                disabled={formData.cantidadPersonas <= 1}>−</button>
              <span className="rf-number-val">{formData.cantidadPersonas}</span>
              <button type="button" className="rf-number-btn" onClick={() => changePersonas(1)}>+</button>
            </div>
          </div>

          {/* Fecha */}
          <div className="rf-field">
            <label className="rf-label rf-label--req">Fecha</label>
            <input className="rf-input" type="date" name="fecha" value={formData.fecha}
              onChange={handleChange} min={getMinDate()} required />
          </div>

          {/* Horario */}
          <div className="rf-field">
            <label className="rf-label rf-label--req">Horario</label>
            {!formData.fecha ? (
              <p className="rf-horarios-hint">Seleccioná una fecha para ver los horarios disponibles</p>
            ) : dow === 1 ? (
              <div className="rf-closed-note">Los lunes estamos cerrados — elegí otro día.</div>
            ) : (
              <>
                <div className="rf-horarios-grid">
                  {horarios.map(h => {
                    const lleno = isLleno(h);
                    const disp = LIMITE_POR_SLOT - (reservasPorHorario[h] || 0);
                    return (
                      <button key={h} type="button"
                        className={`rf-chip${formData.horario === h ? ' rf-chip--on' : ''}${lleno ? ' rf-chip--lleno' : ''}`}
                        onClick={() => !lleno && setFormData(p => ({ ...p, horario: h }))}
                        title={lleno ? 'Completo' : `${disp} ${disp === 1 ? 'lugar' : 'lugares'}`}>
                        {h}
                      </button>
                    );
                  })}
                </div>
                <p className="rf-horarios-hint">
                  {esFinde ? 'Viernes y sábado: hasta las 02:00 hs' : 'Último horario: 22:00 hs'}
                </p>
              </>
            )}
          </div>

          {/* Preferencia */}
          <div className="rf-field">
            <label className="rf-label rf-label--req">Preferencia de ubicación</label>
            <div className="rf-pref-grid">
              {['Adentro / Living', 'Pérgola / La Galería'].map(op => (
                <button key={op} type="button"
                  className={`rf-pref-btn${formData.preferencia === op ? ' rf-pref-btn--on' : ''}`}
                  onClick={() => setFormData(p => ({ ...p, preferencia: op }))}>
                  {op}
                </button>
              ))}
            </div>
          </div>

          <p className="rf-section-label">Opcional</p>

          {/* Comentarios */}
          <div className="rf-field">
            <label className="rf-label">Comentarios o solicitudes especiales</label>
            <textarea className="rf-textarea" name="comentarios" value={formData.comentarios}
              onChange={handleChange} rows="3" placeholder="Celebración, cumpleaños, etc." />
          </div>

          {/* Restricciones */}
          <div className="rf-field">
            <label className="rf-label">Restricciones alimentarias o alergias</label>
            <textarea className="rf-textarea" name="restricciones" value={formData.restricciones}
              onChange={handleChange} rows="2" placeholder="Celíaco, vegetariano, alergia frutos secos, etc." />
          </div>

          <button type="submit" className="rf-submit" disabled={loading}>
            {loading ? 'Enviando…' : 'Solicitar reserva'}
          </button>
        </form>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default ReservaMesas;
