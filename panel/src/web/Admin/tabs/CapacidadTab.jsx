import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './TabsShared.css';

// Capacidad de reservas. La leen la web (src/utils/configReservas.js) y el
// bot (server/src/services/reservas.service.js), con estos mismos defaults.
const DEFAULT = {
  personasPorHorario: 16,
  mesaMaximo: 9,
  cavaMinimo: 10,
  cavaMaximo: null,
  cavaPrecioPersona: 60000,
  cavaSena: 100000,
};

const aTexto = (c) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v == null ? '' : String(v)]));

function CapacidadTab() {
  const [form, setForm] = useState(aTexto(DEFAULT));
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    getDoc(doc(db, 'selvaggio_configuracion', 'reservas'))
      .then(snap => { if (snap.exists()) setForm(aTexto({ ...DEFAULT, ...snap.data() })); })
      .catch(err => console.error('Error cargando capacidad:', err))
      .finally(() => setCargando(false));
  }, []);

  const set = (k) => (e) => { setForm(prev => ({ ...prev, [k]: e.target.value })); setAviso(null); };

  const validar = () => {
    const n = (k) => Number(form[k]);
    const entero = (k) => Number.isInteger(n(k)) && n(k) > 0;
    if (!entero('personasPorHorario')) return 'Personas por horario tiene que ser un número mayor a 0';
    if (!entero('mesaMaximo')) return 'El máximo por mesa tiene que ser un número mayor a 0';
    if (!entero('cavaMinimo') || n('cavaMinimo') < 2) return 'El mínimo de La Cava tiene que ser 2 o más';
    if (form.cavaMaximo !== '' && (!entero('cavaMaximo') || n('cavaMaximo') < n('cavaMinimo'))) return 'El máximo de La Cava tiene que ser mayor o igual al mínimo (o dejalo vacío)';
    if (!entero('cavaPrecioPersona')) return 'El precio por persona tiene que ser un número mayor a 0';
    if (!entero('cavaSena')) return 'La seña tiene que ser un número mayor a 0';
    return null;
  };

  const guardar = async () => {
    const error = validar();
    if (error) { setAviso({ tipo: 'error', texto: error }); return; }
    setGuardando(true);
    try {
      await setDoc(doc(db, 'selvaggio_configuracion', 'reservas'), {
        personasPorHorario: Number(form.personasPorHorario),
        mesaMaximo: Number(form.mesaMaximo),
        cavaMinimo: Number(form.cavaMinimo),
        cavaMaximo: form.cavaMaximo === '' ? null : Number(form.cavaMaximo),
        cavaPrecioPersona: Number(form.cavaPrecioPersona),
        cavaSena: Number(form.cavaSena),
        actualizadoEn: new Date().toISOString(),
      });
      setAviso({ tipo: 'ok', texto: 'Guardado. La web y el bot ya usan los valores nuevos.' });
    } catch (err) {
      console.error('Error guardando capacidad:', err);
      setAviso({ tipo: 'error', texto: 'No se pudo guardar' });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <p style={{ color: '#6b635a', textAlign: 'center', padding: 40 }}>Cargando…</p>;

  // Grupos que no entran en una mesa y tampoco llegan al mínimo de La Cava.
  const hueco = Number(form.mesaMaximo) + 1 < Number(form.cavaMinimo)
    ? [Number(form.mesaMaximo) + 1, Number(form.cavaMinimo) - 1] : null;

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>👥 Capacidad</h2>
        <p>Cupos de mesas y condiciones de La Cava. Aplica a la web y al bot de WhatsApp.</p>
      </div>

      <div className="cal-form" style={{ marginBottom: 24 }}>
        <h3 className="cal-form__title">🍷 Mesas</h3>
        <div className="cal-form__row">
        <div className="cal-form__field">
          <label>Personas por horario</label>
          <input type="number" min="1" value={form.personasPorHorario} onChange={set('personasPorHorario')} />
          <p style={{ fontSize: 12, color: '#8a8279', margin: '4px 0 0' }}>
            Total de personas que se pueden reservar en cada horario (18:00, 18:30…). Una reserva de 6 ocupa 6 lugares.
          </p>
        </div>
        <div className="cal-form__field">
          <label>Máximo de personas por mesa</label>
          <input type="number" min="1" value={form.mesaMaximo} onChange={set('mesaMaximo')} />
          <p style={{ fontSize: 12, color: '#8a8279', margin: '4px 0 0' }}>
            Grupos más grandes no pueden reservar mesa; la web los manda a La Cava.
          </p>
        </div>
        </div>
        {hueco && (
          <p style={{ fontSize: 13, color: '#b26a00', margin: '8px 0 0' }}>
            Ojo: grupos de {hueco[0] === hueco[1] ? hueco[0] : `${hueco[0]} a ${hueco[1]}`} personas no van a poder reservar ni mesa ni La Cava.
          </p>
        )}
      </div>

      <div className="cal-form" style={{ marginBottom: 24 }}>
        <h3 className="cal-form__title">🥂 La Cava</h3>
        <div className="cal-form__row">
          <div className="cal-form__field">
            <label>Mínimo de personas</label>
            <input type="number" min="2" value={form.cavaMinimo} onChange={set('cavaMinimo')} />
          </div>
          <div className="cal-form__field">
            <label>Máximo de personas</label>
            <input type="number" min="1" value={form.cavaMaximo} onChange={set('cavaMaximo')} placeholder="Sin tope" />
          </div>
        </div>
        <div className="cal-form__row">
          <div className="cal-form__field">
            <label>Precio por persona ($)</label>
            <input type="number" min="1" value={form.cavaPrecioPersona} onChange={set('cavaPrecioPersona')} />
          </div>
          <div className="cal-form__field">
            <label>Seña ($)</label>
            <input type="number" min="1" value={form.cavaSena} onChange={set('cavaSena')} />
          </div>
        </div>
      </div>

      {aviso && (
        <p style={{ margin: '0 0 12px', fontSize: 14, color: aviso.tipo === 'ok' ? '#2e7d32' : '#c62828' }}>{aviso.texto}</p>
      )}
      <button className="btn-action" onClick={guardar} disabled={guardando}>
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  );
}

export default CapacidadTab;
