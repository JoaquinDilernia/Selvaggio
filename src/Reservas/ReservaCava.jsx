import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import Toast from '../components/Toast';
import './ReservaCava.css';

function ReservaCava() {
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    fechaNacimiento: '',
    cantidadPersonas: 10,
    traeTorta: false,
    fecha: '',
    horario: '',
    comprobante: null
  });

  const [reservedDates, setReservedDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [reservaExitosa, setReservaExitosa] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => { fetchReservedDates(); }, []);

  const fetchReservedDates = async () => {
    try {
      const snap = await getDocs(collection(db, 'selvaggio_reservas_cava'));
      setReservedDates(snap.docs.map(d => d.data().fecha));
    } catch {}
  };

  const isReserved = (d) => reservedDates.includes(d);

  const generateDays = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);
    const days = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const date = new Date(year, month, d);
      days.push({ d, dateStr, isPast: date < today, isReserved: isReserved(dateStr) });
    }
    return days;
  };

  const changeMonth = (dir) => {
    const m = new Date(selectedMonth);
    m.setMonth(m.getMonth() + dir);
    setSelectedMonth(m);
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') setFormData(p => ({ ...p, [name]: files[0] }));
    else if (type === 'checkbox') setFormData(p => ({ ...p, [name]: checked }));
    else if (name === 'cantidadPersonas') setFormData(p => ({ ...p, [name]: parseInt(value) || 10 }));
    else setFormData(p => ({ ...p, [name]: value }));
  };

  const changePersonas = (delta) => {
    setFormData(p => ({ ...p, cantidadPersonas: Math.max(10, p.cantidadPersonas + delta) }));
  };

  const uploadComprobante = async (file) => {
    setUploading(true);
    try {
      const storageRef = ref(storage, `comprobantes/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setUploading(false);
      return url;
    } catch (err) {
      setUploading(false);
      throw err;
    }
  };

  const horarios = ['19:00','19:30','20:00','20:30','21:00','21:30','22:00'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.cantidadPersonas < 10) {
      setToast({ message: 'Mínimo 10 personas', type: 'error' }); return;
    }
    if (!formData.fecha) {
      setToast({ message: 'Seleccioná una fecha', type: 'error' }); return;
    }
    if (isReserved(formData.fecha)) {
      setToast({ message: 'Esa fecha ya está reservada', type: 'error' }); return;
    }
    const fechaSel = new Date(formData.fecha + 'T00:00:00');
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    if (fechaSel < hoy) {
      setToast({ message: 'No podés reservar una fecha pasada', type: 'error' }); return;
    }
    if (!formData.comprobante) {
      setToast({ message: 'Adjuntá el comprobante de la seña', type: 'error' }); return;
    }
    setLoading(true);
    try {
      const comprobanteUrl = await uploadComprobante(formData.comprobante);
      await addDoc(collection(db, 'selvaggio_reservas_cava'), {
        nombre: formData.nombre,
        telefono: formData.telefono,
        email: formData.email,
        fechaNacimiento: formData.fechaNacimiento,
        cantidadPersonas: formData.cantidadPersonas,
        traeTorta: formData.traeTorta,
        fecha: formData.fecha,
        horario: formData.horario,
        comprobanteUrl,
        estado: 'confirmada',
        precioPersona: 50000,
        seña: 100000,
        total: formData.cantidadPersonas * 50000,
        createdAt: new Date().toISOString()
      });
      setReservaExitosa(true);
      fetchReservedDates();
    } catch {
      setToast({ message: 'Error al procesar la reserva. Intentá nuevamente.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const total = formData.cantidadPersonas * 50000;
  const now = new Date();
  const isCurrentMonth = selectedMonth.getMonth() === now.getMonth() && selectedMonth.getFullYear() === now.getFullYear();

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
          <h1 className="rf-success__title">Reserva confirmada</h1>
          <p className="rf-success__sub">Recibimos tu reserva y el comprobante de la seña. ¡Nos vemos pronto!</p>
          <div className="rf-success__detail">
            {new Date(formData.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </div>
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
        <span className="rf-nav__title">Reservar La Cava</span>
        <Link to="/" className="rf-nav__back">← Inicio</Link>
      </nav>

      <main className="rf-main">
        <div className="rf-header">
          <p className="rf-eyebrow">Selvaggio · Eventos privados</p>
          <h1 className="rf-title">Reservá La Cava</h1>
          <p className="rf-subtitle">Eventos, cumpleaños y celebraciones privadas</p>
        </div>

        {/* Info precio */}
        <div className="rf-cava-info">
          <p className="rf-cava-info__price"><span>$</span>50.000<span> / persona</span></p>
          <p className="rf-cava-info__desc">Degustación completa con maridaje libre hasta las 00:00 hs, panera artesanal y agua.</p>
          <p className="rf-cava-info__detail">Selección de charcuterie premium, quesos especialmente curados, conservas y acompañamientos.</p>
          <span className="rf-cava-info__seña">Seña de $100.000 por transferencia</span>
        </div>

        <form onSubmit={handleSubmit} className="rf-form">

          {/* Nombre + Teléfono */}
          <div className="rf-row">
            <div className="rf-field">
              <label className="rf-label rf-label--req">Nombre completo</label>
              <input className="rf-input" type="text" name="nombre" value={formData.nombre}
                onChange={handleChange} required placeholder="Tu nombre" />
            </div>
            <div className="rf-field">
              <label className="rf-label rf-label--req">WhatsApp</label>
              <input className="rf-input" type="tel" name="telefono" value={formData.telefono}
                onChange={handleChange} required placeholder="11 6686 4692" />
            </div>
          </div>

          {/* Email + Fecha nacimiento */}
          <div className="rf-row">
            <div className="rf-field">
              <label className="rf-label rf-label--req">Email</label>
              <input className="rf-input" type="email" name="email" value={formData.email}
                onChange={handleChange} required placeholder="tu@email.com" />
            </div>
            <div className="rf-field">
              <label className="rf-label">Fecha de nacimiento</label>
              <input className="rf-input" type="date" name="fechaNacimiento" value={formData.fechaNacimiento}
                onChange={handleChange} />
            </div>
          </div>

          {/* Personas */}
          <div className="rf-field">
            <label className="rf-label rf-label--req">Cantidad de personas (mínimo 10)</label>
            <div className="rf-number-ctrl">
              <button type="button" className="rf-number-btn" onClick={() => changePersonas(-1)}
                disabled={formData.cantidadPersonas <= 10}>−</button>
              <span className="rf-number-val">{formData.cantidadPersonas}</span>
              <button type="button" className="rf-number-btn" onClick={() => changePersonas(1)}>+</button>
            </div>
          </div>

          {/* Trae torta */}
          <div className="rf-field">
            <label className="rf-label">¿Traerás torta?</label>
            <label className="rf-checkbox" onClick={() => setFormData(p => ({ ...p, traeTorta: !p.traeTorta }))}>
              <span className={`rf-checkbox__box${formData.traeTorta ? ' rf-checkbox__box--on' : ''}`}>
                {formData.traeTorta && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                )}
              </span>
              <span className="rf-checkbox__text">Sí, trae torta</span>
            </label>
          </div>

          {/* Horario */}
          <div className="rf-field">
            <label className="rf-label rf-label--req">Horario de ingreso</label>
            <div className="rf-horarios-grid">
              {horarios.map(h => (
                <button key={h} type="button"
                  className={`rf-chip${formData.horario === h ? ' rf-chip--on' : ''}`}
                  onClick={() => setFormData(p => ({ ...p, horario: h }))}>
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha */}
          <div className="rf-field">
            <label className="rf-label rf-label--req">Fecha del evento</label>
            <div className="rf-cal">
              {/* Header */}
              <div className="rf-cal-head">
                <button type="button" className="rf-cal-nav" onClick={() => changeMonth(-1)} disabled={isCurrentMonth}>‹</button>
                <span className="rf-cal-month">
                  {selectedMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                </span>
                <button type="button" className="rf-cal-nav" onClick={() => changeMonth(1)}>›</button>
              </div>
              {/* Weekdays */}
              <div className="rf-cal-weekdays">
                {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
                  <div key={d} className="rf-cal-wd">{d}</div>
                ))}
              </div>
              {/* Days */}
              <div className="rf-cal-grid">
                {generateDays().map((info, i) => {
                  if (!info) return <div key={`e-${i}`} className="rf-cal-day is-empty" />;
                  const disabled = info.isPast || info.isReserved;
                  const cls = [
                    'rf-cal-day',
                    info.isPast ? 'is-past' : '',
                    info.isReserved ? 'is-reserved' : '',
                    formData.fecha === info.dateStr ? 'is-selected' : ''
                  ].filter(Boolean).join(' ');
                  return (
                    <button key={info.dateStr} type="button" className={cls}
                      disabled={disabled}
                      title={info.isReserved ? 'Ya reservado' : info.isPast ? 'Fecha pasada' : 'Disponible'}
                      onClick={() => !disabled && setFormData(p => ({ ...p, fecha: info.dateStr }))}>
                      {info.d}
                    </button>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="rf-cal-legend">
                <span className="rf-cal-legend-item"><span className="rf-cal-dot rf-cal-dot--avail" />Disponible</span>
                <span className="rf-cal-legend-item"><span className="rf-cal-dot rf-cal-dot--rsvd" />Reservado</span>
                <span className="rf-cal-legend-item"><span className="rf-cal-dot rf-cal-dot--sel" />Seleccionado</span>
              </div>
            </div>
            {formData.fecha && (
              <p className="rf-date-selected">
                📅 {new Date(formData.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            )}
          </div>

          {/* Total */}
          <div className="rf-total">
            <span className="rf-total__label">Total estimado</span>
            <span className="rf-total__amount">${total.toLocaleString('es-AR')}</span>
          </div>

          {/* Datos transferencia */}
          <div className="rf-transfer">
            <p className="rf-transfer__title">Seña · $100.000 por transferencia</p>
            <div className="rf-transfer__row">
              <span className="rf-transfer__key">Alias</span>
              <span className="rf-transfer__val">selvaggio.ba</span>
            </div>
            <div className="rf-transfer__row">
              <span className="rf-transfer__key">CVU</span>
              <span className="rf-transfer__val">0000003100080434358834</span>
            </div>
            <div className="rf-transfer__row">
              <span className="rf-transfer__key">Titular</span>
              <span className="rf-transfer__val">Tomas Laureano Molina</span>
            </div>
          </div>

          {/* Comprobante */}
          <div className="rf-field">
            <label className="rf-label rf-label--req">Comprobante de transferencia</label>
            <div className="rf-file-wrap">
              <input className="rf-file-input" type="file" name="comprobante"
                onChange={handleChange} accept="image/*,.pdf" required />
              <div className="rf-file-trigger">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b635a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>{formData.comprobante ? formData.comprobante.name : 'Adjuntar imagen o PDF'}</span>
              </div>
            </div>
            {uploading && <p className="rf-uploading">Subiendo archivo…</p>}
          </div>

          <button type="submit" className="rf-submit" disabled={loading || uploading}>
            {loading ? 'Procesando…' : 'Confirmar reserva'}
          </button>
        </form>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default ReservaCava;
