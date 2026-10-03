import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../utils/api';
import Toast from '../components/Toast';
import { enviarConfirmacionMesas } from '../utils/emailService';
import { trackViewContent, trackInitiateCheckout, trackLead } from '../utils/metaPixel';
import { trackEvento } from '../utils/nativeAnalytics';
import './ReservaMesas.css';

function ReservaMesas() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    fechaNacimiento: '',
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
  // { fecha, dia, abierto, motivo?, excepcion, horarios: [{ hora, disponible, lugares }] }
  const [disponibilidad, setDisponibilidad] = useState(null);

  useEffect(() => {
    trackViewContent('Reserva Mesa', 'Reservas');
    trackEvento('view_content', 'mesa');
  }, []);

  const checkoutTracked = useRef(false);
  const handleFirstFocus = () => {
    if (!checkoutTracked.current) {
      checkoutTracked.current = true;
      trackInitiateCheckout('mesa');
      trackEvento('checkout_iniciado', 'mesa');
    }
  };

  useEffect(() => {
    if (formData.fecha) fetchDisponibilidad(formData.fecha);
  }, [formData.fecha]);

  // El backend calcula horarios y cupos (antes se bajaban TODAS las reservas
  // de Firestore al navegador). Las reglas son las mismas: ver
  // server/src/services/reservas.service.js.
  const fetchDisponibilidad = async (fecha) => {
    setDisponibilidad(null);
    try {
      setDisponibilidad(await apiGet('/api/public/mesas/disponibilidad', { fecha }));
    } catch {
      setDisponibilidad({ fecha, abierto: false, error: true, horarios: [] });
    }
  };

  const excepcionDia = disponibilidad?.excepcion
    ? { tipo: disponibilidad.excepcion, motivo: disponibilidad.motivo }
    : null;
  const slot = (h) => disponibilidad?.horarios.find(x => x.hora === h);
  const isLleno = (h) => !slot(h)?.disponible;

  // Fecha local (toISOString usa UTC y después de las 21 hs ya marca el día siguiente)
  const getMinDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getHorarios = () => {
    if (!formData.fecha || disponibilidad?.fecha !== formData.fecha) return [];
    return disponibilidad.horarios.map(h => h.hora);
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
      // El backend vuelve a validar el cupo (en una transacción) y hace el
      // upsert de selvaggio_clientes.
      await apiPost('/api/public/reservas/mesas', formData);

      trackLead();
      trackEvento('conversion', 'mesa');
      setFechaReservada(formData.fecha);
      setReservaExitosa(true);
      enviarConfirmacionMesas(formData);
    } catch (err) {
      // 409: el horario se llenó mientras completaba el form → refrescar cupos
      if (err.status === 409) fetchDisponibilidad(formData.fecha);
      setToast({
        message: err.status === 409 || err.status === 400 || err.status === 429
          ? err.message
          : 'Error al procesar la reserva. Intentá nuevamente.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const dow = formData.fecha ? new Date(formData.fecha + 'T00:00:00').getDay() : null;
  const horarios = getHorarios();
  const esFinde = dow === 5 || dow === 6;
  const cargandoHorarios = formData.fecha && disponibilidad?.fecha !== formData.fecha;
  const diaCerrado = horarios.length === 0 && formData.fecha && !cargandoHorarios;

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
          <h1 className="rf-success__title">¡Reserva confirmada!</h1>
          <p className="rf-success__sub">Gracias, {formData.nombre || ''}. ¡Te esperamos!</p>
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
        <Link to="/" className="rf-nav__logo"><img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="rf-nav__logo-img" /></Link>
        <span className="rf-nav__title">Reservar mesa</span>
        <Link to="/" className="rf-nav__back">← Inicio</Link>
      </nav>

      <main className="rf-main">
        <div className="rf-header">
          <p className="rf-eyebrow">Selvaggio · Wine Bar</p>
          <h1 className="rf-title">Reservá tu mesa</h1>
          <p className="rf-subtitle">Martes a domingos desde las 18:00 hs</p>
        </div>

        <form onSubmit={handleSubmit} className="rf-form">

          {/* Nombre + Apellido */}
          <div className="rf-row">
            <div className="rf-field">
              <label className="rf-label rf-label--req">Nombre</label>
              <input className="rf-input" type="text" name="nombre" value={formData.nombre}
                onChange={handleChange} onFocus={handleFirstFocus} required placeholder="Tu nombre" />
            </div>
            <div className="rf-field">
              <label className="rf-label rf-label--req">Apellido</label>
              <input className="rf-input" type="text" name="apellido" value={formData.apellido}
                onChange={handleChange} required placeholder="Tu apellido" />
            </div>
          </div>

          {/* Email + Teléfono */}
          <div className="rf-row">
            <div className="rf-field">
              <label className="rf-label rf-label--req">Email</label>
              <input className="rf-input" type="email" name="email" value={formData.email}
                onChange={handleChange} required placeholder="tu@email.com" />
            </div>
            <div className="rf-field">
              <label className="rf-label rf-label--req">WhatsApp / Teléfono</label>
              <input className="rf-input" type="tel" name="telefono" value={formData.telefono}
                onChange={handleChange} required placeholder="Ej: 11 6686 4692" />
            </div>
          </div>

          {/* Fecha de nacimiento */}
          <div className="rf-field">
            <label className="rf-label">Fecha de nacimiento</label>
            <input className="rf-input" type="date" name="fechaNacimiento" value={formData.fechaNacimiento}
              onChange={handleChange} />
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
            ) : cargandoHorarios ? (
              <p className="rf-horarios-hint">Buscando horarios disponibles…</p>
            ) : disponibilidad?.error ? (
              <div className="rf-closed-note">No pudimos cargar los horarios. Revisá tu conexión e intentá de nuevo.</div>
            ) : diaCerrado ? (
              <div className="rf-closed-note">
                {excepcionDia?.motivo
                  ? `Cerrado: ${excepcionDia.motivo}`
                  : 'Este día estamos cerrados — elegí otro día.'}
              </div>
            ) : (
              <>
                <div className="rf-horarios-grid">
                  {horarios.map(h => {
                    const lleno = isLleno(h);
                    const disp = slot(h)?.lugares ?? 0;
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
                  {excepcionDia?.tipo === 'abrir'
                    ? `Horario especial: de ${horarios[0]} a ${horarios[horarios.length - 1]} hs`
                    : esFinde ? 'Viernes y sábado: hasta las 02:00 hs' : 'Último horario: 22:00 hs'}
                </p>
              </>
            )}
          </div>

          {/* Preferencia */}
          <div className="rf-field">
            <label className="rf-label rf-label--req">Preferencia de ubicación</label>
            <div className="rf-pref-grid">
              {['Jardín', 'Living'].map(op => (
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
